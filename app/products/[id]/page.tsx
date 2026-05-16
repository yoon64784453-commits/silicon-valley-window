import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Product = {
  id: string;
  title: string;
  subtitle: string | null;
  price: number;
  emoji: string | null;
  category: string | null;
  description: string | null;
  download_name: string | null;
  image_url: string | null;
};

export default async function ProductDetail({
  params,
}: {
  params: { id: string };
}) {
  const { data: product, error } = await supabase
    .from("products")
    .select(
      "id,title,subtitle,price,emoji,category,description,download_name,image_url"
    )
    .eq("id", params.id)
    .single();

  if (error || !product) {
    notFound();
  }

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 760 }}>
        <div className="panel" style={{ padding: 40, borderRadius: 32 }}>
          <div className="detail-cover">
            {product.image_url ? (
              <img
                className="product-detail-image"
                src={product.image_url}
                alt={product.title}
              />
            ) : (
              <div className="cover">{product.emoji || "📦"}</div>
            )}
          </div>

          <span className="tag">{product.category || "虚拟产品"}</span>

          <h1
            style={{
              fontSize: 48,
              lineHeight: 1.15,
              margin: "20px 0 16px",
              color: "#effffb",
              background: "none",
              WebkitBackgroundClip: "initial",
              letterSpacing: "-0.04em",
            }}
          >
            {product.title}
          </h1>

          <p>{product.description || product.subtitle}</p>

          <div className="price">¥{product.price}</div>

          <p style={{ marginTop: 12 }}>
            下载文件：{product.download_name || "购买后可见"}
          </p>

          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 24,
              flexWrap: "wrap",
            }}
          >
            <Link className="btn primary" href={`/buy?product_id=${product.id}`}>
              创建订单
            </Link>

            <Link className="btn" href="/products">
              返回商城
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}