"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { usePathname } from "next/navigation";
import { AI_MODEL_OPTIONS, DEFAULT_AI_MODEL } from "@/lib/ai-models";
import { supabase } from "@/lib/supabase";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

const STORAGE_KEY = "promptbay-floating-ai-history";
const MODEL_STORAGE_KEY = "promptbay-ai-model";

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
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [model, setModel] = useState(DEFAULT_AI_MODEL);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const storedModel = window.localStorage.getItem(MODEL_STORAGE_KEY);

    if (
      storedModel &&
      AI_MODEL_OPTIONS.some((option) => option.value === storedModel)
    ) {
      setModel(storedModel);
    }

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
    window.localStorage.setItem(MODEL_STORAGE_KEY, model);
  }, [model]);

  useEffect(() => {
    if (!historyLoaded) return;

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [historyLoaded, messages]);

  function updateAssistant(messageId: string, content: string) {
    setMessages((current) =>
      current.map((item) => (item.id === messageId ? { ...item, content } : item))
    );
  }

  function appendAssistantChunk(messageId: string, chunk: string) {
    if (!chunk) return;

    setMessages((current) =>
      current.map((item) =>
        item.id === messageId ? { ...item, content: item.content + chunk } : item
      )
    );
  }

  async function sendMessage() {
    const prompt = message.trim();

    if (loading || !prompt) return;

    setMessage("");
    setLoading(true);

    const assistantMessage = createMessage("assistant", "");

    setStreamingMessageId(assistantMessage.id);
    setMessages((current) => [
      ...current,
      createMessage("user", prompt),
      assistantMessage,
    ]);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        updateAssistant(
          assistantMessage.id,
          "\u8bf7\u5148\u767b\u5f55\u540e\u4f7f\u7528 AI \u52a9\u624b\u3002"
        );
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

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        updateAssistant(assistantMessage.id, data.error || "AI\u8bf7\u6c42\u5931\u8d25");
        return;
      }

      const reader = response.body?.getReader();

      if (!reader) {
        updateAssistant(assistantMessage.id, "AI\u6ca1\u6709\u8fd4\u56de\u53ef\u8bfb\u53d6\u7684\u56de\u590d\u3002");
        return;
      }

      const decoder = new TextDecoder();
      let received = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        received += chunk;
        appendAssistantChunk(assistantMessage.id, chunk);
      }

      const rest = decoder.decode();

      if (rest) {
        received += rest;
        appendAssistantChunk(assistantMessage.id, rest);
      }

      if (!received.trim()) {
        updateAssistant(assistantMessage.id, "AI\u65e0\u56de\u590d");
      }
    } catch {
      updateAssistant(
        assistantMessage.id,
        "\u8bf7\u6c42\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002"
      );
    } finally {
      setLoading(false);
      setStreamingMessageId(null);
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

  if (pathname === "/chat") {
    return null;
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

        <select
          className="input ai-model-select"
          value={model}
          onChange={(event) => setModel(event.target.value)}
        >
          {AI_MODEL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <div className="chat-thread" aria-live="polite">
          {messages.map((item) => (
            <div className={"chat-row " + item.role} key={item.id}>
              <div className="chat-bubble">
                <div className="chat-meta">
                  <span>{item.role === "user" ? "\u4f60" : "AI"}</span>
                  {item.createdAt && <span>{item.createdAt}</span>}
                </div>
                <div>
                  {item.content || item.id === streamingMessageId ? (
                    item.content || (
                      <span className="chat-typing">
                        <span />
                        <span />
                        <span />
                      </span>
                    )
                  ) : null}
                </div>
              </div>
            </div>
          ))}

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
