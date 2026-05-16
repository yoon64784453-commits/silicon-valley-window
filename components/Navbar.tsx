
import Link from "next/link";

export function Navbar() {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link href="/" className="logo">
          <span className="logo-mark" />
          <span>硅谷之窗</span>
        </Link>
        <nav className="nav-links">
          <Link href="/products">虚拟产品</Link>
          <Link href="/dashboard">我的订单</Link>
          <Link href="/admin">管理员上传</Link>
          <Link className="btn" href="/login">登录</Link>
        </nav>
      </div>
    </header>
  );
}
