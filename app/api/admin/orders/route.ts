import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const { context, response } = await requireAdmin(request);

  if (response) {
    return response;
  }

  const { data, error } = await context.supabase
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

  if (error) {
    return NextResponse.json(
      { error: "读取待确认订单失败：" + error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ orders: data || [] });
}
