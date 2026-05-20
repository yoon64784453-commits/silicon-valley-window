import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

function isMissingOrderNumberColumn(error: { code?: string; message?: string }) {
  return error.code === "42703" || error.message?.includes("order_no");
}

export async function GET(request: NextRequest) {
  const { context, response } = await requireAdmin(request);

  if (response) {
    return response;
  }

  const withOrderNumber = await context.supabase
    .from("orders")
    .select(
      `
      id,
      order_no,
      created_at,
      status,
      user_id,
      products (
        title,
        price
      )
    `
    )
    .eq("status", "pending")
    .order("created_at", {
      ascending: false,
    });

  let data: unknown = withOrderNumber.data;
  let error = withOrderNumber.error;

  if (error && isMissingOrderNumberColumn(error)) {
    const fallback = await context.supabase
      .from("orders")
      .select(
        `
        id,
        created_at,
        status,
        user_id,
        products (
          title,
          price
        )
      `
      )
      .eq("status", "pending")
      .order("created_at", {
        ascending: false,
      });

    data = fallback.data as unknown;
    error = fallback.error;
  }

  if (error) {
    return NextResponse.json(
      { error: "读取待确认订单失败：" + error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ orders: data || [] });
}
