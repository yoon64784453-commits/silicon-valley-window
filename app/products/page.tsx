export const dynamic = "force-dynamic";

import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  title: string;
  subtitle: string | null;
  price: number;
  emoji: string | null;
  category: string | null;
  image_url?: string | null;
};

export default async function ProductsPage() {
  const { data: products, error } = await supabase
    .from("products")
    .select(
      "id,title,subtitle,price,emoji,category,image_url"
    )
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    return (
      <main className="section">
        <div className="store-container">
          <h2>读取商品失败</h2>
          <p>{error.message}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="section">
      <div className="store-container">
        <h2>虚拟产品商城</h2>

        <p>
          这里会自动读取你在后台上传到
          Supabase 的商品。
        </p>

        <div
          className="product-list"
          style={{ marginTop: 24 }}
        >
          {products?.map((item: Product) => (
            <Link
              href={`/products/${item.id}`}
              className="card"
              key={item.id}
            >
              <div className="cover">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="product-image"
                  />
                ) : (
                  item.emoji || "📦"
                )}
              </div>

              <span className="tag">
                {item.category || "虚拟产品"}
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
    </main>
  );
}