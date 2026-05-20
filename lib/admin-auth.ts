import type { SupabaseClient, User } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseForToken } from "@/lib/supabase-server";

type AdminContext = {
  supabase: SupabaseClient;
  user: User;
};

type AdminAuthResult =
  | {
      context: AdminContext;
      response: null;
    }
  | {
      context: null;
      response: NextResponse;
    };

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const match = authHeader?.match(/^Bearer\s+(.+)$/i);

  return match?.[1] || null;
}

function getAdminEmails() {
  const value = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";

  return value
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireAdmin(request: NextRequest): Promise<AdminAuthResult> {
  const adminEmails = getAdminEmails();

  if (adminEmails.length === 0) {
    return {
      context: null,
      response: NextResponse.json(
        { error: "Admin email is not configured. Set ADMIN_EMAIL." },
        { status: 500 }
      ),
    };
  }

  const token = getBearerToken(request);

  if (!token) {
    return {
      context: null,
      response: NextResponse.json({ error: "Please sign in first." }, { status: 401 }),
    };
  }

  let supabase: SupabaseClient;

  try {
    supabase = createSupabaseForToken(token);
  } catch {
    return {
      context: null,
      response: NextResponse.json(
        { error: "Supabase environment variables are incomplete." },
        { status: 500 }
      ),
    };
  }

  const { data, error } = await supabase.auth.getUser(token);
  const user = data.user;
  const userEmail = user?.email?.trim().toLowerCase();

  if (error || !user || !userEmail) {
    return {
      context: null,
      response: NextResponse.json(
        { error: "Session expired. Please sign in again." },
        { status: 401 }
      ),
    };
  }

  if (!adminEmails.includes(userEmail)) {
    return {
      context: null,
      response: NextResponse.json(
        {
          error: "Current account is not an admin.",
          currentEmail: user.email,
        },
        { status: 403 }
      ),
    };
  }

  return {
    context: {
      supabase,
      user,
    },
    response: null,
  };
}