import { NextRequest, NextResponse } from "next/server";
import { ALLOWED_AI_MODELS, DEFAULT_AI_MODEL } from "@/lib/ai-models";
import { createSupabaseForToken } from "@/lib/supabase-server";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const requestsByUser = new Map<string, { count: number; resetAt: number }>();

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const match = authHeader?.match(/^Bearer\s+(.+)$/i);

  return match?.[1] || null;
}

function isRateLimited(userId: string) {
  const now = Date.now();
  const current = requestsByUser.get(userId);

  if (!current || current.resetAt <= now) {
    requestsByUser.set(userId, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });

    return false;
  }

  if (current.count >= RATE_LIMIT_MAX) {
    return true;
  }

  current.count += 1;

  return false;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "AI接口未配置。" }, { status: 500 });
  }

  const token = getBearerToken(req);

  if (!token) {
    return NextResponse.json({ error: "请先登录后使用 AI 助手。" }, { status: 401 });
  }

  let supabase;

  try {
    supabase = createSupabaseForToken(token);
  } catch {
    return NextResponse.json(
      { error: "Supabase 环境变量未配置完整。" },
      { status: 500 }
    );
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData.user) {
    return NextResponse.json(
      { error: "登录状态失效，请重新登录。" },
      { status: 401 }
    );
  }

  if (isRateLimited(userData.user.id)) {
    return NextResponse.json(
      { error: "请求太频繁，请稍后再试。" },
      { status: 429 }
    );
  }

  let body: {
    message?: unknown;
    model?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求内容不合法。" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!message) {
    return NextResponse.json({ error: "请输入问题。" }, { status: 400 });
  }

  if (message.length > 4000) {
    return NextResponse.json(
      { error: "问题太长，请控制在 4000 字以内。" },
      { status: 413 }
    );
  }

  const requestedModel = typeof body.model === "string" ? body.model : "";
  const model = ALLOWED_AI_MODELS.has(requestedModel) ? requestedModel : DEFAULT_AI_MODEL;

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",

        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "",
        "X-Title": "PromptBay",
      },

      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: message,
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    console.error("OpenRouter request failed", {
      status: response.status,
      body: errorText.slice(0, 500),
    });

    return NextResponse.json(
      { error: `AI service unavailable (OpenRouter ${response.status}).` },
      { status: 502 }
    );
  }

  const data = await response.json();

  return NextResponse.json(data);
}
