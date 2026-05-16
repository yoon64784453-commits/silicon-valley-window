"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  async function signUp() {
    setMessage("");
  const emailRule =
  /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

if (!emailRule.test(email)) {
  setMessage("注册失败：请输入有效邮箱地址。");
  return;
}
    const usernameRule = /^[A-Za-z][A-Za-z0-9_]{5,}$/;

    if (!usernameRule.test(username)) {
      setMessage("注册失败：用户名必须以字母开头，且至少6位，可包含字母、数字和下划线。");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("注册失败：两次输入的密码不一致。");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username
        }
      }
    });

    if (error) {
      setMessage("注册失败：" + error.message);
    } else {
      setMessage("注册成功，请登录。");
      setMode("login");
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
      window.location.href = "/dashboard";
    }
  }

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 520 }}>
        <div className="panel" style={{ padding: 28 }}>
          <h2>{mode === "login" ? "登录 PromptBay" : "注册 PromptBay"}</h2>
          <p>
            {mode === "login"
              ? "登录后可以查看订单与交付内容。"
              : "创建账号后即可购买数字商品。"}
          </p>

          <div className="form" style={{ marginTop: 20 }}>
            {mode === "register" && (
              <input
                className="input"
                placeholder="用户名：字母开头，至少6位"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            )}

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

            {mode === "register" && (
              <input
                className="input"
                type="password"
                placeholder="确认密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            )}

            {mode === "login" ? (
              <>
                <button className="btn primary" onClick={signIn}>
                  登录
                </button>

                <button className="btn" onClick={() => setMode("register")}>
                  没有账号？去注册
                </button>
              </>
            ) : (
              <>
                <button className="btn primary" onClick={signUp}>
                  注册
                </button>

                <button className="btn" onClick={() => setMode("login")}>
                  已有账号？去登录
                </button>
              </>
            )}

            {message && <p>{message}</p>}
          </div>
        </div>
      </div>
    </main>
  );
}