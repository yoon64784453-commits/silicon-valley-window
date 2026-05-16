
import Link from "next/link";

export function Navbar() {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link href="/" className="logo">
          <span className="logo-mark" />
          <span>PromptBay</span>
        </Link>
        <nav className="nav-links">
          <Link href="/products">市场</Link>
          <Link href="/dashboard">我的订单</Link>
          <Link href="/admin">开发者中心</Link>
          <Link className="btn" href="/login">登录</Link>
        </nav>
      </div>
    </header>
  );
}
