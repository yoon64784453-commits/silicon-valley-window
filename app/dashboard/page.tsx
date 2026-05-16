"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Order = {
  id: string;
  created_at: string;
  products: {
    id: string;
    title: string;
    subtitle: string | null;
    price: number;
    image_url: string | null;
    emoji: string | null;
    download_name: string | null;
    delivery_content: string | null;
  } | null;
};

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState("正在读取订单...");
  async function deleteOrder(orderId: string) {
  const confirmed = window.confirm("确定要删除这条订单记录吗？");

  if (!confirmed) return;

  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("id", orderId);

  if (error) {
    alert("删除失败：" + error.message);
    return;
  }

  setOrders((prev) => prev.filter((order) => order.id !== orderId));
}

  useEffect(() => {
    async function loadOrders() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        window.location.href = "/login";
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          created_at,
          products (
            id,
            title,
            subtitle,
            price,
            image_url,
            emoji,
            download_name,
            delivery_content
          )
        `)
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        setMessage("读取订单失败：" + error.message);
      } else {
        setOrders((data as unknown as Order[]) || []);
        setMessage("");
      }
    }

    loadOrders();
  }, []);

  return (
    <main className="section">
      <div className="container">
        <h2>我的订单 / 下载中心</h2>
        <p>这里会显示当前账号已经购买的虚拟产品。</p>

        {message && <p>{message}</p>}

        {!message && orders.length === 0 && (
          <p>你还没有购买任何商品。</p>
        )}

        <div className="grid" style={{ marginTop: 24 }}>
          {orders.map((order) => {
            const item = order.products;

            if (!item) return null;

            return (
              <div className="card" key={order.id}>
                <div className="cover">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: "22px"
                      }}
                    />
                  ) : (
                    item.emoji || "📦"
                  )}
                </div>

                <span className="tag">已购买</span>
                <h3>{item.title}</h3>
                <p>{item.subtitle}</p>
                <div className="price">¥{item.price}</div>

                <div style={{ marginTop: 14 }}>
                  <p style={{ wordBreak: "break-all" }}>
                    交付内容：{item.delivery_content || "暂无交付内容"}
                  </p>

                  <button
                    className="btn primary"
                    style={{ width: "100%" }}
                    onClick={() => {
                      navigator.clipboard.writeText(item.delivery_content || "");
                      alert("已复制交付内容");
                    }}
                  >
                    一键复制
                  </button>
                  <button
                    className="btn"
                    style={{ width: "100%", marginTop: 10 }}
                    onClick={() => deleteOrder(order.id)}
                  >
                    删除订单
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 24 }}>
          <Link className="btn" href="/products">
            继续逛商城
          </Link>
        </div>
      </div>
    </main>
  );
}