import Link from "next/link";

export function Sidebar() {
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
    </aside>
  );
}