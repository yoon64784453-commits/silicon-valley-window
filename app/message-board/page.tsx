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
      <div className="container message-board-container">
        <div className="page-heading">
          <span className="section-kicker">Feedback</span>
          <h2>留言板</h2>
          <p>欢迎留下反馈、需求或购买前问题。</p>
        </div>

        <div className="message-board-layout">
          <div className="panel message-form-panel">
            <form className="form" onSubmit={handleSubmit}>
              <input className="input" name="name" placeholder="昵称" />

              <textarea
                className="input"
                name="content"
                rows={6}
                placeholder="写下你的留言"
                required
              />

              <button className="btn primary" type="submit">
                发布留言
              </button>
            </form>
          </div>

          <div className="message-list">
            {messages.length === 0 ? (
              <div className="card message-card empty-message-card">
                <span className="tag">等待第一条留言</span>
                <h3>暂无留言</h3>
                <p>第一条留言会显示在这里。</p>
              </div>
            ) : (
              messages.map((message) => (
                <article className="card message-card" key={message.id}>
                  <div className="message-card-head">
                    <h3>{message.name}</h3>
                    <span className="tag">{message.createdAt}</span>
                  </div>
                  <p style={{ whiteSpace: "pre-wrap" }}>{message.content}</p>
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
