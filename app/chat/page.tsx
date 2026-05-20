"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { supabase } from "@/lib/supabase";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

const STORAGE_KEY = "promptbay-chat-history";

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "\u4f60\u597d\uff0c\u6211\u662f PromptBay AI\u3002\u4f60\u53ef\u4ee5\u95ee\u6211\u5546\u54c1\u3001\u8ba2\u5355\u6216\u4f7f\u7528\u5efa\u8bae\u3002",
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

export default function ChatPage() {
  const [message, setMessage] = useState("");
  const [model, setModel] = useState("openrouter/free");
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
          model,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        appendAssistant(data.error || "AI\u8bf7\u6c42\u5931\u8d25");
        return;
      }

      appendAssistant(data.choices?.[0]?.message?.content || "AI\u6ca1\u6709\u56de\u590d");
    } catch (error) {
      console.error(error);
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
    <main className="section">
      <div className="container" style={{ maxWidth: 960 }}>
        <div className="panel chat-surface">
          <div className="chat-toolbar">
            <div>
              <h2>{"PromptBay AI \u52a9\u624b"}</h2>
              <p>{"\u8fd9\u662f\u4f60\u7684\u7f51\u7ad9\u63a5\u5165\u7684\u7b2c\u4e00\u4e2a AI\u3002"}</p>
            </div>

            <button className="btn" type="button" onClick={clearHistory}>
              {"\u6e05\u7a7a"}
            </button>
          </div>

          <select
            className="input"
            value={model}
            onChange={(event) => setModel(event.target.value)}
            style={{ marginTop: 16 }}
          >
            <option value="openrouter/free">Free Router</option>
            <option value="openrouter/owl-alpha">Owl Alpha</option>
            <option value="google/gemma-4-31b-it:free">Gemma 4 31B Free</option>
            <option value="openai/gpt-oss-20b:free">GPT OSS 20B Free</option>
            <option value="qwen/qwen3-coder:free">Qwen3 Coder Free</option>
          </select>

          <div className="chat-thread" aria-live="polite">
            {messages.map((item) => (
              <div className={"chat-row " + item.role} key={item.id}>
                <div className="chat-bubble">
                  <div className="chat-meta">
                    <span>{item.role === "user" ? "\u4f60" : "PromptBay AI"}</span>
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
                    <span>PromptBay AI</span>
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
            >
              {loading ? "AI\u601d\u8003\u4e2d..." : "\u53d1\u9001"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}