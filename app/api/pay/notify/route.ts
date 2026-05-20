import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { verifyPayfmNotify } from "@/lib/payfm";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

type OrderWithProduct = {
  id: string;
  order_no?: string | null;
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

function isMissingOrderNumberColumn(error: { code?: string; message?: string } | null) {
  return error?.code === "42703" || error?.message?.includes("order_no") || false;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function findOrderByPaymentReference(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  paymentReference: string
) {
  const selectWithOrderNo = `
    id,
    order_no,
    status,
    products (
      price
    )
  `;

  const byOrderNo = await supabase
    .from("orders")
    .select(selectWithOrderNo)
    .eq("order_no", paymentReference)
    .maybeSingle();

  if (byOrderNo.data || (!byOrderNo.error && !isMissingOrderNumberColumn(byOrderNo.error))) {
    return {
      data: byOrderNo.data as OrderWithProduct | null,
      error: byOrderNo.error,
    };
  }

  if (!isMissingOrderNumberColumn(byOrderNo.error) && !isUuid(paymentReference)) {
    return {
      data: null,
      error: byOrderNo.error,
    };
  }

  if (!isUuid(paymentReference)) {
    return {
      data: null,
      error: byOrderNo.error,
    };
  }

  const selectFallback = isMissingOrderNumberColumn(byOrderNo.error)
    ? `
      id,
      status,
      products (
        price
      )
    `
    : selectWithOrderNo;

  const byId = await supabase
    .from("orders")
    .select(selectFallback)
    .eq("id", paymentReference)
    .maybeSingle();

  return {
    data: byId.data as OrderWithProduct | null,
    error: byId.error,
  };
}

async function handlePaymentNotify(params: Record<string, string>) {
  const key = process.env.PAYFM_KEY;
  const pid = process.env.PAYFM_PID;

  if (!key || !pid) {
    console.error("Payment notify failed: missing PAYFM env.");
    return new NextResponse("fail");
  }

  const isNativePayfmNotify = Boolean(
    params.merchantNum || params.orderNo || params.state
  );
  let paymentReference = "";
  let paidMoneyCents = NaN;

  if (isNativePayfmNotify) {
    let verified;

    try {
      verified = verifyPayfmNotify(params);
    } catch (error) {
      console.error("Payment notify failed: PayFM config invalid.", error);
      return new NextResponse("fail");
    }

    if (!verified.ok) {
      console.error("Payment notify failed: invalid PayFM native notify.", {
        merchantNum: params.merchantNum,
        orderNo: params.orderNo,
        state: params.state,
        hasSign: Boolean(params.sign),
      });

      return new NextResponse("fail");
    }

    paymentReference = verified.orderNo;
    paidMoneyCents = toCents(verified.amount);
  } else {
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

    paymentReference = params.out_trade_no;
    paidMoneyCents = toCents(params.money);
  }

  if (!paymentReference || Number.isNaN(paidMoneyCents)) {
    console.error("Payment notify failed: invalid order or amount.", {
      paymentReference,
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

  const { data: order, error: orderError } = await findOrderByPaymentReference(
    supabase,
    paymentReference
  );

  if (orderError || !order) {
    console.error("Payment notify failed: order not found.", {
      paymentReference,
      error: orderError,
    });

    return new NextResponse("fail");
  }

  if (order.status === "paid") {
    return new NextResponse("success");
  }

  const typedOrder = order as unknown as OrderWithProduct;
  const orderId = typedOrder.id;
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
