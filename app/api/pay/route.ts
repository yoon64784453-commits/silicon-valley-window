import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createPayfmOrder } from "@/lib/payfm";
import { createSupabaseForToken } from "@/lib/supabase-server";

type PayRequestBody = {
  productId?: unknown;
  payType?: unknown;
};

type ExistingOrder = {
  id: string;
  order_no?: string | null;
  status: string | null;
};

function signParams(params: Record<string, string>, key: string) {
  const signStr =
    Object.keys(params)
      .filter((k) => k !== "sign" && k !== "sign_type" && params[k] !== "")
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join("&") + key;

  return crypto.createHash("md5").update(signStr).digest("hex");
}

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const match = authHeader?.match(/^Bearer\s+(.+)$/i);

  return match?.[1] || null;
}

function isMissingOrderNumberColumn(error: { code?: string; message?: string } | null) {
  return error?.code === "42703" || error?.message?.includes("order_no") || false;
}

async function readExistingOrder(
  supabase: ReturnType<typeof createSupabaseForToken>,
  userId: string,
  productId: string
) {
  const withOrderNumber = await supabase
    .from("orders")
    .select("id,order_no,status")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .in("status", ["pending", "paid"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!isMissingOrderNumberColumn(withOrderNumber.error)) {
    return {
      data: withOrderNumber.data as ExistingOrder | null,
      error: withOrderNumber.error,
      supportsOrderNumber: true,
    };
  }

  const fallback = await supabase
    .from("orders")
    .select("id,status")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .in("status", ["pending", "paid"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    data: fallback.data as ExistingOrder | null,
    error: fallback.error,
    supportsOrderNumber: false,
  };
}

async function createPendingOrder(
  supabase: ReturnType<typeof createSupabaseForToken>,
  userId: string,
  productId: string,
  supportsOrderNumber: boolean
) {
  const selectColumns = supportsOrderNumber ? "id,order_no" : "id";
  const created = await supabase
    .from("orders")
    .insert({
      user_id: userId,
      product_id: productId,
      status: "pending",
    })
    .select(selectColumns)
    .single();

  if (!isMissingOrderNumberColumn(created.error)) {
    return {
      data: created.data as ExistingOrder | null,
      error: created.error,
      supportsOrderNumber,
    };
  }

  const fallback = await supabase
    .from("orders")
    .insert({
      user_id: userId,
      product_id: productId,
      status: "pending",
    })
    .select("id")
    .single();

  return {
    data: fallback.data as ExistingOrder | null,
    error: fallback.error,
    supportsOrderNumber: false,
  };
}

export async function POST(request: NextRequest) {
  let body: PayRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const productId = typeof body.productId === "string" ? body.productId : "";

  if (!productId) {
    return NextResponse.json({ error: "Missing product id." }, { status: 400 });
  }

  const pid = process.env.PAYFM_PID;
  const key = process.env.PAYFM_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const gateway = process.env.PAYFM_GATEWAY;

  if (!pid || !key || !siteUrl || (!gateway && !process.env.PAYFM_API_BASE)) {
    return NextResponse.json(
      { error: "Payment environment variables are incomplete." },
      { status: 500 }
    );
  }

  const token = getBearerToken(request);

  if (!token) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  let supabase;

  try {
    supabase = createSupabaseForToken(token);
  } catch {
    return NextResponse.json(
      { error: "Supabase environment variables are incomplete." },
      { status: 500 }
    );
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData.user) {
    return NextResponse.json(
      { error: "Session expired. Please sign in again." },
      { status: 401 }
    );
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id,title,price")
    .eq("id", productId)
    .single();

  if (productError || !product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const {
    data: existingOrder,
    error: existingOrderError,
    supportsOrderNumber,
  } = await readExistingOrder(supabase, userData.user.id, productId);

  if (existingOrderError) {
    console.error("Failed to read existing order", existingOrderError);
    return NextResponse.json({ error: "Failed to read order." }, { status: 500 });
  }

  if (existingOrder?.status === "paid") {
    return NextResponse.json({
      paid: true,
      message: "Product already purchased.",
    });
  }

  let orderId = existingOrder?.id;
  let orderNo = existingOrder?.order_no || null;

  if (!orderId) {
    const { data: newOrder, error: orderError } = await createPendingOrder(
      supabase,
      userData.user.id,
      productId,
      supportsOrderNumber
    );

    if (orderError || !newOrder) {
      console.error("Failed to create order", orderError);
      return NextResponse.json({ error: "Failed to create order." }, { status: 500 });
    }

    orderId = newOrder.id;
    orderNo = newOrder.order_no || null;
  }

  if (Number(product.price) <= 0) {
    const { error: paidError } = await supabase
      .from("orders")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (paidError) {
      console.error("Failed to unlock free order", paidError);
      return NextResponse.json({ error: "Failed to unlock free product." }, { status: 500 });
    }

    return NextResponse.json({
      paid: true,
      orderId,
      message: "Free product unlocked.",
    });
  }

  const paymentOrderNo = orderNo || orderId;
  const amount = Number(product.price).toFixed(2);
  const payMethod = body.payType === "wechat" ? "wechat" : "alipay";

  try {
    const payfmOrder = await createPayfmOrder({
      orderNo: paymentOrderNo,
      amount,
      payMethod,
      subject: product.title,
    });

    return NextResponse.json({
      orderId,
      orderNo: paymentOrderNo,
      payUrl: payfmOrder.payUrl,
      tradeNo: payfmOrder.platformOrderId,
      provider: "payfm",
    });
  } catch (error) {
    console.error("PayFM normal order creation failed", {
      orderNo: paymentOrderNo,
      error,
    });
  }

  if (!gateway) {
    return NextResponse.json(
      { error: "支付订单创建失败，请检查支付FM接口配置。" },
      { status: 502 }
    );
  }

  const params: Record<string, string> = {
    pid,
    type: payMethod,
    out_trade_no: paymentOrderNo,
    notify_url: `${siteUrl}/api/pay/notify`,
    return_url: `${siteUrl}/dashboard`,
    name: product.title,
    money: amount,
    sitename: "PromptBay",
    sign_type: "MD5",
  };

  params.sign = signParams(params, key);

  const payResponse = await fetch(gateway, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });

  const responseText = await payResponse.text();
  let data: any;

  try {
    data = JSON.parse(responseText);
  } catch {
    console.error("Payment gateway returned non-JSON response", {
      status: payResponse.status,
      body: responseText.slice(0, 500),
    });

    return NextResponse.json(
      { error: "Payment gateway response is invalid." },
      { status: 502 }
    );
  }

  if (!payResponse.ok || data.code !== 1) {
    console.error("Payment order creation failed", {
      status: payResponse.status,
      data,
    });

    return NextResponse.json({
      error: data.msg || "Failed to create payment order.",
      raw: data,
    });
  }

  return NextResponse.json({
    orderId,
    orderNo: paymentOrderNo,
    payUrl: data.payurl,
    tradeNo: data.trade_no,
  });
}
