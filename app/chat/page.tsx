"use client";

import { useState } from "react";

export default function ChatPage() {
  const [message, setMessage] = useState("");

  const [model, setModel] = useState("deepseek/deepseek-chat-v3");

  const [reply, setReply] = useState("");

  const [loading, setLoading] =
    useState(false);

  async function sendMessage() {
    if (!message.trim()) return;

    setLoading(true);

    setReply("");

    try {
      const response = await fetch(
        "/api/chat",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            message,
            model,
          }),
        }
      );

      const data =
        await response.json();

      const aiText =
        data.choices?.[0]?.message
          ?.content || "AI没有回复";

      setReply(aiText);

    } catch (error) {
      setReply("请求失败");

      console.error(error);

    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="section">
      <div
        className="container"
        style={{
          maxWidth: 900,
        }}
      >
        <div
          className="panel"
          style={{
            padding: 28,
            borderRadius: 32,
          }}
        >
          <h2>PromptBay AI 助手</h2>

          <p>
            这是你的网站接入的第一个 AI。
          </p>
          <select
              className="input"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={{ marginTop: 16 }}
         >
              <option value="openrouter/free">
               OpenRouter Free
              </option>

              <option value="deepseek/deepseek-chat-v3-0324:free">
               DeepSeek Free
              </option>

              <option value="deepseek/deepseek-r1:free">
               DeepSeek R1 Free
              </option>

              <option value="qwen/qwen3-235b-a22b:free">
               Qwen 3 Free
              </option>

              <option value="meta-llama/llama-3.3-70b-instruct:free">
               Llama 3 Free
              </option>
          </select>
          <textarea
            className="input"
            rows={6}
            placeholder="输入你的问题..."
            value={message}
            onChange={(e) =>
              setMessage(
                e.target.value
              )
            }
            style={{
              marginTop: 20,
            }}
          />

          <button
            className="btn primary"
            onClick={sendMessage}
            disabled={loading}
            style={{
              marginTop: 16,
            }}
          >
            {loading
              ? "AI思考中..."
              : "发送"}
          </button>

          {reply && (
            <div
              className="panel"
              style={{
                marginTop: 24,
                padding: 22,
                borderRadius: 24,
              }}
            >
              <h3>AI 回复</h3>

              <p
                style={{
                  whiteSpace:
                    "pre-wrap",
                }}
              >
                {reply}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}