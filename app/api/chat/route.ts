export async function POST(req: Request) {
  const body = await req.json();

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",

        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },

      body: JSON.stringify({
        model: body.model || "deepseek/deepseek-chat-v3",

        messages: [
          {
            role: "user",
            content: body.message,
          },
        ],
      }),
    }
  );

  const data = await response.json();

  return Response.json(data);
}