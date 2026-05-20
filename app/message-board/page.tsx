"use client";

import { FormEvent, useEffect, useState } from "react";

type BoardMessage = {
  id: string;
  name: string;
  content: string;
  createdAt: string;
};

const STORAGE_KEY = "promptbay-message-board";

export default function MessageBoardPage() {
  const [messages, setMessages] = useState<BoardMessage[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (!stored) return;

    try {
      setMessages(JSON.parse(stored) as BoardMessage[]);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  function saveMessages(nextMessages: BoardMessage[]) {
    setMessages(nextMessages);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextMessages));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "匿名用户").trim();
    const content = String(form.get("content") || "").trim();

    if (!content) return;

    saveMessages([
      {
        id: crypto.randomUUID(),
        name: name || "匿名用户",
        content,
        createdAt: new Date().toLocaleString("zh-CN"),
      },
      ...messages,
    ]);

    event.currentTarget.reset();
  }

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 900 }}>
        <h2>留言板</h2>
        <p>欢迎留下反馈、需求或购买前问题。</p>

        <div className="panel" style={{ padding: 26, marginTop: 22 }}>
          <form className="form" onSubmit={handleSubmit}>
            <input className="input" name="name" placeholder="昵称" />

            <textarea
              className="input"
              name="content"
              rows={5}
              placeholder="写下你的留言"
              required
            />

            <button className="btn primary" type="submit">
              发布留言
            </button>
          </form>
        </div>

        <div className="grid" style={{ marginTop: 24 }}>
          {messages.length === 0 ? (
            <div className="card">
              <h3>暂无留言</h3>
              <p>第一条留言会显示在这里。</p>
            </div>
          ) : (
            messages.map((message) => (
              <article className="card" key={message.id}>
                <span className="tag">{message.createdAt}</span>
                <h3>{message.name}</h3>
                <p style={{ whiteSpace: "pre-wrap" }}>{message.content}</p>
              </article>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
