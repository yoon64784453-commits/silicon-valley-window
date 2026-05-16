"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function signUp() {
    setMessage("");
    const { error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      setMessage("注册失败：" + error.message);
    } else {
      setMessage("注册成功，请检查邮箱确认邮件。");
    }
  }

  async function signIn() {
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setMessage("登录失败：" + error.message);
    } else {
      setMessage("登录成功！");
      window.location.href = "/dashboard";
    }
  }

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 520 }}>
        <div className="panel" style={{ padding: 28 }}>
          <h2>登录硅谷之窗</h2>
          <p>注册或登录后，用户可以查看自己的订单和下载内容。</p>

          <div className="form" style={{ marginTop: 20 }}>
            <input
              className="input"
              type="email"
              placeholder="邮箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              className="input"
              type="password"
              placeholder="密码，至少6位"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button className="btn primary" onClick={signIn}>
              登录
            </button>

            <button className="btn" onClick={signUp}>
              注册新账号
            </button>

            {message && <p>{message}</p>}
          </div>
        </div>
      </div>
    </main>
  );
}