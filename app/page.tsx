import Link from "next/link";
import { products } from "@/lib/products";

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <div className="container">
          <div className="hero-premium">
            <div className="hero-glow" />

            <span className="badge">
              AI工具 · 数字商品 · 智能体部署
            </span>

            <h1>PromptBay</h1>

            <p className="hero-subtitle">
              一个面向 AI 时代的数字商品市场，
              汇集工具权益、Prompt 资产、
              智能体方案与交付服务。
            </p>

            <div className="hero-actions">
              <Link className="btn primary" href="/products">
                进入市场
              </Link>

              <Link className="btn" href="/dashboard">
                查看订单
              </Link>
            </div>

            <div className="hero-metrics">
              <div>
                <strong>AI Market</strong>
                <span>数字权益交付</span>
              </div>

              <div>
                <strong>Agent Ready</strong>
                <span>智能体部署方案</span>
              </div>

              <div>
                <strong>Code / URL</strong>
                <span>卡密链接一键复制</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>热门虚拟产品</h2>

          <p>
            第一版已内置演示商品，
            后续可接数据库、真实登录、
            真实支付和自动发货。
          </p>

          <div
            className="grid"
            style={{ marginTop: 22 }}
          >
            {products.map((item) => (
              <Link
                href={`/products/${item.id}`}
                className="card"
                key={item.id}
              >
                <div className="cover">
                  {item.emoji}
                </div>

                <span className="tag">
                  {item.category}
                </span>

                <h3>{item.title}</h3>

                <p>{item.subtitle}</p>

                <div className="price">
                  ¥{item.price}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}