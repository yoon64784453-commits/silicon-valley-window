import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

type OrderWithProduct = {
  id: string;
  status: string | null;
  products:
    | {
        price: number;
      }
    | {
        price: number;
      }[]
    | null;
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

function toCents(value: string | number) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) return NaN;

  return Math.round(numberValue * 100);
}

async function handlePaymentNotify(params: Record<string, string>) {
  const key = process.env.PAYFM_KEY;
  const pid = process.env.PAYFM_PID;

  if (!key || !pid) {
    console.error("Payment notify failed: missing PAYFM env.");
    return new NextResponse("fail");
  }

  const incomingSign = params.sign;
  const calculatedSign = signParams(params, key);

  if (params.pid !== pid || !incomingSign || incomingSign !== calculatedSign) {
    console.error("Payment notify failed: invalid signature.", {
      pid: params.pid,
      hasSign: Boolean(incomingSign),
    });

    return new NextResponse("fail");
  }

  if (params.trade_status !== "TRADE_SUCCESS") {
    console.error("Payment notify ignored: trade not successful.", {
      trade_status: params.trade_status,
    });

    return new NextResponse("fail");
  }

  const orderId = params.out_trade_no;
  const paidMoneyCents = toCents(params.money);

  if (!orderId || Number.isNaN(paidMoneyCents)) {
    console.error("Payment notify failed: invalid order or amount.", {
      orderId,
      money: params.money,
    });

    return new NextResponse("fail");
  }

  let supabase;

  try {
    supabase = createSupabaseAdmin();
  } catch (error) {
    console.error("Payment notify failed: missing Supabase service role key.", error);
    return new NextResponse("fail");
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      `
      id,
      status,
      products (
        price
      )
    `
    )
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    console.error("Payment notify failed: order not found.", {
      orderId,
      error: orderError,
    });

    return new NextResponse("fail");
  }

  if (order.status === "paid") {
    return new NextResponse("success");
  }

  const typedOrder = order as unknown as OrderWithProduct;
  const product = Array.isArray(typedOrder.products)
    ? typedOrder.products[0]
    : typedOrder.products;
  const productPriceCents = toCents(product?.price || 0);

  if (paidMoneyCents !== productPriceCents) {
    console.error("Payment notify failed: amount mismatch.", {
      orderId,
      paidMoney: params.money,
      productPrice: product?.price,
    });

    return new NextResponse("fail");
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (updateError) {
    console.error("Payment notify failed: order update failed.", {
      orderId,
      error: updateError,
    });

    return new NextResponse("fail");
  }

  return new NextResponse("success");
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const params: Record<string, string> = {};

  url.searchParams.forEach((value, name) => {
    params[name] = value;
  });

  return handlePaymentNotify(params);
}

export async function POST(request: NextRequest) {
  const params: Record<string, string> = {};
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));

    Object.entries(body).forEach(([key, value]) => {
      params[key] = String(value);
    });
  } else {
    const formData = await request.formData();

    formData.forEach((value, key) => {
      params[key] = String(value);
    });
  }

  return handlePaymentNotify(params);
}