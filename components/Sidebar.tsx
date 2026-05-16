"use client";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export function Sidebar() {
  async function logout() {
  await supabase.auth.signOut();
  window.location.href = "/";
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
      <div className="sidebar-user">
        <div className="sidebar-user-info">
          <strong>已登录</strong>
          <span>PromptBay User</span>
        </div>

        <button className="side-logout" onClick={logout}>
          退出登录
        </button>
      </div>
    </aside>
  );
}