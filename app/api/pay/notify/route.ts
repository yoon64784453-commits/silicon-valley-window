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

export async function GET(request: NextRequest) {
  const key = process.env.PAYFM_KEY;
  const pid = process.env.PAYFM_PID;

  if (!key || !pid) {
    return new NextResponse("fail");
  }

  const url = new URL(request.url);
  const params: Record<string, string> = {};

  url.searchParams.forEach((value, name) => {
    params[name] = value;
  });

  const incomingSign = params.sign;
  const calculatedSign = signParams(params, key);

  if (params.pid !== pid || incomingSign !== calculatedSign) {
    return new NextResponse("fail");
  }

  if (params.trade_status !== "TRADE_SUCCESS") {
    return new NextResponse("fail");
  }

  const orderId = params.out_trade_no;
  const paidMoney = Number(params.money);

  const { data: order } = await supabase
    .from("orders")
    .select(`
      id,
      status,
      products (
        price
      )
    `)
    .eq("id", orderId)
    .single();

  if (!order) {
    return new NextResponse("fail");
  }

  if (order.status === "paid") {
    return new NextResponse("success");
  }

  const productPrice = Number((order.products as any)?.price || 0);

  if (paidMoney !== productPrice) {
    return new NextResponse("fail");
  }

  const { error } = await supabase
    .from("orders")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) {
    return new NextResponse("fail");
  }

  return new NextResponse("success");
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const formData = await request.formData();

  formData.forEach((value, key) => {
    url.searchParams.set(key, String(value));
  });

  return GET(new NextRequest(url));
}