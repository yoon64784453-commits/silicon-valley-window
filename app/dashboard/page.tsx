"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Order = {
  id: string;
  created_at: string;
  status: string | null;
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
  const [loading, setLoading] = useState(false);

  async function loadOrders() {
    setLoading(true);

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
        status,
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
      setLoading(false);
      return;
    }

    setOrders((data as unknown as Order[]) || []);
    setMessage("");
    setLoading(false);
  }

  async function deleteOrder(orderId: string, status: string | null) {
    if (status === "paid") {
      alert("已付款订单不建议删除，这是你的交付凭证。");
      return;
    }

    const confirmed = window.confirm("确定要删除这条未完成订单记录吗？");

    if (!confirmed) return;

    const { error } = await supabase.from("orders").delete().eq("id", orderId);

    if (error) {
      alert("删除失败：" + error.message);
      return;
    }

    setOrders((prev) => prev.filter((order) => order.id !== orderId));
  }

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <main className="section">
      <div className="container">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2>我的订单 / 下载中心</h2>
            <p>付款确认后，商品交付内容会自动在这里解锁。</p>
          </div>

          <button className="btn" onClick={loadOrders} disabled={loading}>
            {loading ? "刷新中..." : "刷新订单"}
          </button>
        </div>

        {message && <p>{message}</p>}

        {!message && orders.length === 0 && <p>你还没有购买任何商品。</p>}

        <div className="grid" style={{ marginTop: 24 }}>
          {orders.map((order) => {
            const item = order.products;

            if (!item) return null;

            const isPaid = order.status === "paid";

            return (
              <div className="card" key={order.id}>
                <div className="cover">
                  {item.image_url ? (
                    <img className="product-image" src={item.image_url} alt={item.title} />
                  ) : (
                    item.emoji || "📦"
                  )}
                </div>

                <span
                  className="tag"
                  style={{
                    background: isPaid
                      ? "rgba(32,255,200,.12)"
                      : "rgba(255,255,255,.08)",
                    color: isPaid ? "#20ffc8" : "#b8c8c3",
                  }}
                >
                  {isPaid ? "交付已解锁" : "待付款确认"}
                </span>

                <h3>{item.title}</h3>
                <p>{item.subtitle}</p>

                <div className="price">¥{item.price}</div>

                <div style={{ marginTop: 14 }}>
                  {isPaid ? (
                    <div
                      style={{
                        padding: 16,
                        borderRadius: 22,
                        background:
                          "linear-gradient(135deg, rgba(32,255,200,.1), rgba(25,184,255,.06))",
                        border: "1px solid rgba(32,255,200,.18)",
                      }}
                    >
                      <strong>交付内容</strong>

                      <p
                        style={{
                          wordBreak: "break-all",
                          whiteSpace: "pre-wrap",
                          marginTop: 10,
                        }}
                      >
                        {item.delivery_content || "暂无交付内容"}
                      </p>

                      {item.download_name && (
                        <p style={{ marginTop: 10 }}>
                          文件名称：{item.download_name}
                        </p>
                      )}

                      <button
                        className="btn primary"
                        style={{ width: "100%", marginTop: 12 }}
                        onClick={() => {
                          navigator.clipboard.writeText(item.delivery_content || "");
                          alert("已复制交付内容");
                        }}
                      >
                        一键复制交付内容
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: 16,
                        borderRadius: 22,
                        background: "rgba(255,255,255,.04)",
                        border: "1px solid rgba(255,255,255,.08)",
                      }}
                    >
                      <strong>等待确认</strong>
                      <p style={{ marginBottom: 0 }}>
                        付款后请等待管理员确认。确认完成后，这里会自动显示交付内容。
                      </p>
                    </div>
                  )}

                  {!isPaid && (
                    <button
                      className="btn"
                      style={{ width: "100%", marginTop: 10 }}
                      onClick={() => deleteOrder(order.id, order.status)}
                    >
                      删除未完成订单
                    </button>
                  )}
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