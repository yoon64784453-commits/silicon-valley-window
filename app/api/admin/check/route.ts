import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const { response } = await requireAdmin(request);

  if (response) {
    return response;
  }

  return NextResponse.json({ isAdmin: true });
}
