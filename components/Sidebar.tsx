"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function Sidebar() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  useEffect(() => {
  async function loadUser() {
    const { data } = await supabase.auth.getUser();
    setUserEmail(data.user?.email || null);
  }

  loadUser();

  const {
    data: { subscription }
  } = supabase.auth.onAuthStateChange((_event, session) => {
    setUserEmail(session?.user?.email || null);
  });

  return () => {
    subscription.unsubscribe();
  };
}, []);
 async function logout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error(error);
    return;
  }

  localStorage.clear();
  sessionStorage.clear();

  window.location.replace("/");
}
  return (
    <aside className="sidebar">
      
      <Link href="/" className="brand">
        <img src="/logo.png" alt="PromptBay" className="brand-logo" />
        <div>
          <strong>PromptBay</strong>
          <span>AI Digital Market</span>
        </div>
      </Link>

      <nav className="side-nav">
        <Link href="/products">市场</Link>
        <Link href="/dashboard">订单</Link>
        <Link href="/message-board">留言板</Link>
        <Link href="/admin">开发者中心</Link>
      </nav>
      <Link className="ai-assistant-entry" href="/chat">
       AI 助手
      </Link>
      <div className="sidebar-user">

  {userEmail ? (
    <>
      <div className="sidebar-user-info">
        <strong>已登录</strong>
        <span>{userEmail}</span>
      </div>

      <button className="side-logout" onClick={logout}>
        退出登录
      </button>
    </>
    
  ) : (
    <div className="sidebar-auth">
      <Link className="auth-btn" href="/login">
        登录
      </Link>

      <Link className="auth-btn primary-auth" href="/login">
        注册
      </Link>
    </div>
  )}

</div>
    </aside>
  );
}