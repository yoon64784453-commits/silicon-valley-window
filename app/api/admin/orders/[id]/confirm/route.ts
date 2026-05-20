import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: { id: string };
  }
) {
  const { context, response } = await requireAdmin(request);

  if (response) {
    return response;
  }

  const { error } = await context.supabase
    .from("orders")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
    })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json(
      { error: "确认失败：" + error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
