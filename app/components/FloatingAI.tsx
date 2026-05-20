"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { supabase } from "@/lib/supabase";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

const STORAGE_KEY = "promptbay-floating-ai-history";

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "\u4f60\u597d\uff0c\u6211\u662f PromptBay AI\u3002",
  createdAt: "",
};

function createMessage(role: ChatMessage["role"], content: string): ChatMessage {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? role + "-" + crypto.randomUUID()
      : role + "-" + Date.now() + "-" + Math.random().toString(16).slice(2);

  return {
    id,
    role,
    content,
    createdAt: new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

export default function FloatingAI() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ChatMessage[];

        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    setHistoryLoaded(true);
  }, []);

  useEffect(() => {
    if (!historyLoaded) return;

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [historyLoaded, messages]);

  function appendAssistant(content: string) {
    setMessages((current) => [...current, createMessage("assistant", content)]);
  }

  async function sendMessage() {
    const prompt = message.trim();

    if (loading || !prompt) return;

    setMessage("");
    setLoading(true);
    setMessages((current) => [...current, createMessage("user", prompt)]);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        appendAssistant("\u8bf7\u5148\u767b\u5f55\u540e\u4f7f\u7528 AI \u52a9\u624b\u3002");
        return;
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          message: prompt,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        appendAssistant(data.error || "AI\u8bf7\u6c42\u5931\u8d25");
        return;
      }

      appendAssistant(data.choices?.[0]?.message?.content || "AI\u65e0\u56de\u590d");
    } catch {
      appendAssistant("\u8bf7\u6c42\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002");
    } finally {
      setLoading(false);
    }
  }

  function handleMessageKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void sendMessage();
    }
  }

  function clearHistory() {
    setMessages([WELCOME_MESSAGE]);
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <>
      <button className="floating-ai-button" onClick={() => setOpen(!open)}>
        AI
      </button>

      <div className={"floating-ai-panel " + (open ? "open" : "")}>
        <div className="floating-ai-header-row">
          <div className="floating-ai-header">PromptBay AI</div>

          <button className="btn" type="button" onClick={clearHistory}>
            {"\u6e05\u7a7a"}
          </button>
        </div>

        <div className="chat-thread" aria-live="polite">
          {messages.map((item) => (
            <div className={"chat-row " + item.role} key={item.id}>
              <div className="chat-bubble">
                <div className="chat-meta">
                  <span>{item.role === "user" ? "\u4f60" : "AI"}</span>
                  {item.createdAt && <span>{item.createdAt}</span>}
                </div>
                <div>{item.content}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="chat-row assistant">
              <div className="chat-bubble">
                <div className="chat-meta">
                  <span>AI</span>
                </div>
                <span className="chat-typing">
                  <span />
                  <span />
                  <span />
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="chat-composer">
          <textarea
            className="input chat-input"
            rows={4}
            placeholder={"\u8f93\u5165\u4f60\u7684\u95ee\u9898..."}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={handleMessageKeyDown}
          />

          <button
            className="btn primary"
            type="button"
            onClick={sendMessage}
            disabled={loading || !message.trim()}
            style={{ width: "100%" }}
          >
            {loading ? "AI\u601d\u8003\u4e2d..." : "\u53d1\u9001"}
          </button>
        </div>
      </div>
    </>
  );
}