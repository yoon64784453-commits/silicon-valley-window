import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabase } from "@/lib/supabase";

function signParams(params: Record<string, string>, key: string) {
  const signStr =
    Object.keys(params)
      .filter((k) => k !== "sign" && k !== "sign_type" && params[k] !== "")
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join("&") + key;

  return crypto.createHash("md5").update(signStr).digest("hex");
}

export async function POST(request: NextRequest) {
  const { productId, payType } = await request.json();

  if (!productId) {
    return NextResponse.json({ error: "缺少商品ID" }, { status: 400 });
  }

  const pid = process.env.PAYFM_PID;
  const key = process.env.PAYFM_KEY;
  const gateway = process.env.PAYFM_GATEWAY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!pid || !key || !gateway || !siteUrl) {
    return NextResponse.json({ error: "支付环境变量未配置完整" }, { status: 500 });
  }

  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id,title,price")
    .eq("id", productId)
    .single();

  if (productError || !product) {
    return NextResponse.json({ error: "商品不存在" }, { status: 404 });
  }

  const { data: existingOrder } = await supabase
    .from("orders")
    .select("id,status")
    .eq("user_id", userData.user.id)
    .eq("product_id", productId)
    .in("status", ["pending", "paid"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingOrder?.status === "paid") {
    return NextResponse.json({
      paid: true,
      message: "你已购买过该商品",
    });
  }

  let orderId = existingOrder?.id;

  if (!orderId) {
    const { data: newOrder, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userData.user.id,
        product_id: productId,
        status: "pending",
      })
      .select("id")
      .single();

    if (orderError || !newOrder) {
      return NextResponse.json({ error: "创建订单失败" }, { status: 500 });
    }

    orderId = newOrder.id;
  }

  const params: Record<string, string> = {
    pid,
    type: payType === "wechat" ? "wechat" : "alipay",
    out_trade_no: orderId,
    notify_url: `${siteUrl}/api/pay/notify`,
    return_url: `${siteUrl}/dashboard`,
    name: product.title,
    money: Number(product.price).toFixed(2),
    sitename: "PromptBay",
    sign_type: "MD5",
  };

  params.sign = signParams(params, key);

  const body = new URLSearchParams(params);

  const payResponse = await fetch(gateway, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = await payResponse.json();

  if (data.code !== 1) {
    return NextResponse.json({
      error: data.msg || "支付订单创建失败",
      raw: data,
    });
  }

  return NextResponse.json({
    orderId,
    payUrl: data.payurl,
    tradeNo: data.trade_no,
  });
}