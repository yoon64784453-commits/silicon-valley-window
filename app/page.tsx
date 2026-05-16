
import Link from "next/link";
import { products } from "@/lib/products";

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="badge">AI工具 · 虚拟产品 · 智能体方案</span>
            <h1>硅谷之窗 AI</h1>
            <p>
              一个面向普通人的 AI 数字产品商城。你可以上传提示词包、课程资料、智能体模板、
              壁纸素材、电子书等虚拟产品，用户登录后购买并下载。
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 26, flexWrap: "wrap" }}>
              <Link className="btn primary" href="/products">进入商城</Link>
              <Link className="btn" href="/admin">上传商品</Link>
            </div>
          </div>
          <div className="hero-card">
            <div className="orb" />
            <div className="mock">
              <div className="mock-row"><strong>用户注册登录</strong><span>✅</span></div>
              <div className="mock-row"><strong>浏览虚拟产品</strong><span>🛒</span></div>
              <div className="mock-row"><strong>模拟购买解锁</strong><span>🔓</span></div>
              <div className="mock-row"><strong>下载数字文件</strong><span>📦</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>热门虚拟产品</h2>
          <p>第一版已内置演示商品，后续可接数据库、真实登录、真实支付和自动发货。</p>
          <div className="grid" style={{ marginTop: 22 }}>
            {products.map((item) => (
              <Link href={`/products/${item.id}`} className="card" key={item.id}>
                <div className="cover">{item.emoji}</div>
                <span className="tag">{item.category}</span>
                <h3>{item.title}</h3>
                <p>{item.subtitle}</p>
                <div className="price">¥{item.price}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
