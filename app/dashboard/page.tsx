"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Copy, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Order = {
  id: string;
  order_no?: string | null;
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

function isMissingOrderNumberColumn(error: { code?: string; message?: string }) {
  return error.code === "42703" || error.message?.includes("order_no");
}

function getDateParts(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

function getDisplayOrderNo(order: Order) {
  if (order.order_no) return order.order_no;

  const parts = getDateParts(order.created_at);

  if (!parts) return order.id.slice(0, 8);

  const suffix = order.id.replace(/\D/g, "").slice(-3).padStart(3, "0");

  return `${parts.year}${parts.month}${parts.day}${parts.hour}${parts.minute}${suffix}`;
}

function formatOrderTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "时间未知";

  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState("正在读取订单...");
  const [loading, setLoading] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  const syncPendingOrders = useCallback(async (accessToken: string) => {
    const response = await fetch("/api/pay/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) return null;

    return response.json() as Promise<{ updated?: number }>;
  }, []);

  const loadOrders = useCallback(async (syncPending = true) => {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const { data: sessionData } = await supabase.auth.getSession();

    if (!userData.user) {
      window.location.href = "/login";
      return;
    }

    const withOrderNumber = await supabase
      .from("orders")
      .select(`
        id,
        order_no,
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

    let data: unknown = withOrderNumber.data;
    let error = withOrderNumber.error;

    if (error && isMissingOrderNumberColumn(error)) {
      const fallback = await supabase
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

      data = fallback.data as unknown;
      error = fallback.error;
    }

    if (error) {
      setMessage("读取订单失败：" + error.message);
      setLoading(false);
      return;
    }

    const nextOrders = (data as unknown as Order[]) || [];
    const hasPendingOrders = nextOrders.some((order) => order.status === "pending");
    const accessToken = sessionData.session?.access_token;

    if (syncPending && hasPendingOrders && accessToken) {
      const syncResult = await syncPendingOrders(accessToken);

      if ((syncResult?.updated || 0) > 0) {
        await loadOrders(false);
        return;
      }
    }

    setOrders(nextOrders);
    setMessage("");
    setLoading(false);
  }, [syncPendingOrders]);

  function toggleOrder(orderId: string) {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  }

  async function copyDeliveryContent(content: string | null) {
    await navigator.clipboard.writeText(content || "");
    alert("已复制交付内容");
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
  }, [loadOrders]);

  return (
    <main className="section">
      <div className="container orders-container">
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

          <button className="btn" onClick={() => loadOrders()} disabled={loading}>
            <RefreshCw size={16} />
            {loading ? "刷新中..." : "刷新订单"}
          </button>
        </div>

        {message && <p>{message}</p>}

        {!message && orders.length === 0 && <p>你还没有购买任何商品。</p>}

        <div className="orders-list">
          {orders.map((order) => {
            const item = order.products;

            if (!item) return null;

            const isPaid = order.status === "paid";
            const isExpanded = Boolean(expandedOrders[order.id]);
            const orderNo = getDisplayOrderNo(order);

            return (
              <article className="card order-card" key={order.id}>
                <button
                  className="order-summary-button"
                  type="button"
                  onClick={() => toggleOrder(order.id)}
                  aria-expanded={isExpanded}
                >
                  <div className="order-summary-main">
                    <span className="order-no">#{orderNo}</span>
                    <strong>{item.title}</strong>
                    <span>{item.subtitle || "数字商品交付"}</span>
                  </div>

                  <div className="order-summary-meta">
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
                    <span>{formatOrderTime(order.created_at)}</span>
                  </div>

                  <div className="order-summary-price">¥{item.price}</div>

                  <ChevronDown
                    className={isExpanded ? "order-chevron open" : "order-chevron"}
                    size={20}
                  />
                </button>

                {isExpanded && (
                  <div className="order-expanded">
                    <div className="order-expanded-cover">
                      {item.image_url ? (
                        <img className="product-image" src={item.image_url} alt={item.title} />
                      ) : (
                        item.emoji || "📦"
                      )}
                    </div>

                    <div className="order-expanded-body">
                      {isPaid ? (
                        <div className="order-delivery-box">
                          <strong>交付内容</strong>

                          <p>
                            {item.delivery_content || "暂无交付内容"}
                          </p>

                          {item.download_name && (
                            <p>
                              文件名称：{item.download_name}
                            </p>
                          )}

                          <button
                            className="btn primary"
                            type="button"
                            onClick={() => copyDeliveryContent(item.delivery_content)}
                          >
                            <Copy size={16} />
                            一键复制交付内容
                          </button>
                        </div>
                      ) : (
                        <div className="order-waiting-box">
                          <strong>等待确认</strong>
                          <p>
                            付款后请等待系统或管理员确认。确认完成后，这里会自动显示交付内容。
                          </p>
                        </div>
                      )}

                      {!isPaid && (
                        <button
                          className="btn order-delete-button"
                          type="button"
                          onClick={() => deleteOrder(order.id, order.status)}
                        >
                          <Trash2 size={16} />
                          删除未完成订单
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </article>
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
