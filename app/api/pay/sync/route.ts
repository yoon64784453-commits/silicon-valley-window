import { NextRequest, NextResponse } from "next/server";
import { queryPayfmOrder } from "@/lib/payfm";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseForToken } from "@/lib/supabase-server";

type SyncRequestBody = {
  orderId?: unknown;
};

type PendingOrder = {
  id: string;
  order_no: string | null;
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

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const match = authHeader?.match(/^Bearer\s+(.+)$/i);

  return match?.[1] || null;
}

function isMissingOrderNumberColumn(error: { code?: string; message?: string } | null) {
  return error?.code === "42703" || error?.message?.includes("order_no") || false;
}

function toCents(value: string | number | null | undefined) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) return NaN;

  return Math.round(numberValue * 100);
}

function getProductPrice(order: PendingOrder) {
  const product = Array.isArray(order.products) ? order.products[0] : order.products;

  return product?.price ?? null;
}

function parsePaidAt(value: string | null | undefined) {
  if (!value) return new Date().toISOString();

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();

  return parsed.toISOString();
}

export async function POST(request: NextRequest) {
  const token = getBearerToken(request);

  if (!token) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  let body: SyncRequestBody = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  let userSupabase;
  let adminSupabase;

  try {
    userSupabase = createSupabaseForToken(token);
    adminSupabase = createSupabaseAdmin();
  } catch {
    return NextResponse.json(
      { error: "Server environment variables are incomplete." },
      { status: 500 }
    );
  }

  const { data: userData, error: userError } = await userSupabase.auth.getUser(token);

  if (userError || !userData.user) {
    return NextResponse.json(
      { error: "Session expired. Please sign in again." },
      { status: 401 }
    );
  }

  let query = adminSupabase
    .from("orders")
    .select(
      `
      id,
      order_no,
      status,
      products (
        price
      )
    `
    )
    .eq("user_id", userData.user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(10);

  if (typeof body.orderId === "string" && body.orderId) {
    query = query.eq("id", body.orderId);
  }

  const { data, error } = await query;

  if (error) {
    if (isMissingOrderNumberColumn(error)) {
      return NextResponse.json({
        checked: 0,
        updated: 0,
        skipped: 0,
        errors: ["订单编号字段还未迁移，暂时无法主动查单。"],
      });
    }

    return NextResponse.json(
      { error: "读取待同步订单失败：" + error.message },
      { status: 500 }
    );
  }

  const orders = (data as unknown as PendingOrder[]) || [];
  let checked = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const order of orders) {
    if (!order.order_no) {
      skipped += 1;
      continue;
    }

    checked += 1;

    try {
      const result = await queryPayfmOrder(order.order_no);

      if (!result.paid) {
        continue;
      }

      const productPriceCents = toCents(getProductPrice(order));
      const paidAmountCents = toCents(
        result.raw.data?.amount || result.raw.data?.tradeMoney || null
      );

      if (
        Number.isFinite(productPriceCents) &&
        Number.isFinite(paidAmountCents) &&
        productPriceCents !== paidAmountCents
      ) {
        errors.push(`订单 ${order.order_no} 金额不一致，已跳过。`);
        continue;
      }

      const { error: updateError } = await adminSupabase
        .from("orders")
        .update({
          status: "paid",
          paid_at: parsePaidAt(result.raw.data?.payTime),
        })
        .eq("id", order.id);

      if (updateError) {
        errors.push(`订单 ${order.order_no} 更新失败。`);
        continue;
      }

      updated += 1;
    } catch (error) {
      console.error("PayFM order sync failed", {
        orderId: order.id,
        orderNo: order.order_no,
        error,
      });

      errors.push(`订单 ${order.order_no} 查单失败。`);
    }
  }

  return NextResponse.json({
    checked,
    updated,
    skipped,
    errors,
  });
}
