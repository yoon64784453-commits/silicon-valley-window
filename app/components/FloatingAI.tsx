"use client";

import { useState } from "react";

export default function FloatingAI() {
  const [open, setOpen] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [reply, setReply] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function sendMessage() {
    if (!message.trim()) return;

    setLoading(true);

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
          }),
        }
      );

      const data =
        await response.json();

      setReply(
        data.choices?.[0]?.message
          ?.content || "AI无回复"
      );

    } catch (error) {
      setReply("请求失败");

    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        className="floating-ai-button"
        onClick={() =>
          setOpen(!open)
        }
      >
        AI
      </button>

      <div
        className={`floating-ai-panel ${
          open ? "open" : ""
        }`}
      >
        <div className="floating-ai-header">
          PromptBay AI
        </div>

        <textarea
          className="input"
          rows={5}
          placeholder="输入你的问题..."
          value={message}
          onChange={(e) =>
            setMessage(
              e.target.value
            )
          }
        />

        <button
          className="btn primary"
          onClick={sendMessage}
          disabled={loading}
          style={{
            marginTop: 12,
            width: "100%",
          }}
        >
          {loading
            ? "AI思考中..."
            : "发送"}
        </button>

        <div className="floating-ai-reply">
          {reply || "AI回复会显示在这里"}
        </div>
      </div>
    </>
  );
}