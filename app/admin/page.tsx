"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type PendingOrder = {
  id: string;
  order_no?: string | null;
  created_at: string;
  status: string | null;
  user_id: string;

  products: {
    title: string;
    price: number;
  } | null;
};

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();

  return data.session?.access_token || null;
}

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [orders, setOrders] = useState<PendingOrder[]>([]);

  const loadPendingOrders = useCallback(async (tokenOverride?: string) => {
    const token = tokenOverride || (await getAccessToken());

    if (!token) {
      window.location.href = "/login";
      return;
    }

    const response = await fetch("/api/admin/orders", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      setMessage(result.error || "读取待确认订单失败。");
      return;
    }

    setOrders((result.orders as PendingOrder[]) || []);
  }, []);

  useEffect(() => {
    async function checkAdmin() {
      const token = await getAccessToken();

      if (!token) {
        window.location.href = "/login";
        return;
      }

      try {
        const response = await fetch("/api/admin/check", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json();

        if (response.ok && result.isAdmin) {
          setIsAdmin(true);
          await loadPendingOrders(token);
        } else {
          setMessage(result.error || "管理员验证失败。");
        }
      } catch {
        setMessage("管理员验证失败，请稍后重试。");
      } finally {
        setChecking(false);
      }
    }

    checkAdmin();
  }, [loadPendingOrders]);

  async function confirmOrder(orderId: string) {
  const confirmed = window.confirm("确认该订单已付款并立即解锁交付内容？");

  if (!confirmed) return;

  const token = await getAccessToken();

  if (!token) {
    window.location.href = "/login";
    return;
  }

  const response = await fetch(`/api/admin/orders/${orderId}/confirm`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json();

  if (!response.ok) {
    alert(result.error || "确认失败。");
    return;
  }

  alert("订单已确认，用户下载中心已自动解锁交付内容。");

  setOrders((prev) => prev.filter((order) => order.id !== orderId));
}

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const formElement = event.currentTarget;

    setLoading(true);

    setMessage("");

    const token = await getAccessToken();

    if (!token) {
      window.location.href = "/login";
      return;
    }

    const response = await fetch("/api/admin/products", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: new FormData(formElement),
    });

    const result = await response.json();

    if (!response.ok) {
      setMessage(
        result.error || "保存失败。"
      );
    } else {
      setMessage(
        "保存成功！现在去商城页看看。"
      );

      formElement.reset();
    }

    setLoading(false);
  }

  if (checking) {
    return (
      <main className="section">
        <div className="container">
          <p>正在验证管理员身份...</p>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="section">
        <div className="container">
          <h2>无权访问</h2>

          <p>{message || "\u5f53\u524d\u8d26\u53f7\u4e0d\u662f\u7ba1\u7406\u5458\u3002"}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="section">
      <div
        className="container"
        style={{ maxWidth: 960 }}
      >
        <h2>管理员中心</h2>

        <p>
          商品上传 + 模拟支付确认
        </p>

        <div
          className="panel"
          style={{
            padding: 26,
            marginTop: 22,
          }}
        >
          <h3>待确认订单</h3>

          {orders.length === 0 && (
            <p>暂无待确认订单。</p>
          )}

          <div
            className="grid"
            style={{ marginTop: 18 }}
          >
            {orders.map((order) => (
              <div
                className="card"
                key={order.id}
              >
                <span className="tag">
                  待付款确认
                </span>

                <p style={{ marginBottom: 8 }}>
                  订单号：
                  {order.order_no || order.id.slice(0, 8)}
                </p>

                <h3>
                  {order.products?.title}
                </h3>

                <p>
                  用户ID：
                  {order.user_id || "未知用户"}
                </p>
                <div className="price">
                  ¥
                  {order.products?.price}
                </div>

                <button
                  className="btn primary"
                  style={{
                    width: "100%",
                    marginTop: 16,
                  }}
                  onClick={() =>
                    confirmOrder(order.id)
                  }
                >
                  确认付款
                </button>
              </div>
            ))}
          </div>
        </div>

        <div
          className="panel"
          style={{
            padding: 26,
            marginTop: 28,
          }}
        >
          <h3>上传商品</h3>

          <form
            className="form"
            onSubmit={handleSubmit}
            style={{ marginTop: 20 }}
          >
            <input
              className="input"
              name="title"
              placeholder="商品标题"
              required
            />

            <input
              className="input"
              name="subtitle"
              placeholder="一句话卖点"
            />

            <input
              className="input"
              name="price"
              type="number"
              placeholder="价格"
              required
            />

            <input
              className="input"
              name="emoji"
              placeholder="商品图标"
            />

            <select
              className="input"
              name="category"
              defaultValue=""
            >
              <option
                value=""
                disabled
              >
                选择分类
              </option>

              <option>提示词</option>
              <option>智能体</option>
              <option>课程资料</option>
              <option>壁纸素材</option>
              <option>电子书</option>
            </select>

            <textarea
              className="input"
              name="description"
              rows={6}
              placeholder="商品详情介绍"
            />

            <input
              className="input"
              name="image"
              type="file"
              accept="image/*"
            />

            <input
              className="input"
              name="product_file"
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
            />

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <input
                name="is_free"
                type="checkbox"
              />
              免费下载
            </label>

            <input
              className="input"
              name="download_name"
              placeholder="下载文件名"
            />

            <textarea
              className="input"
              name="delivery_content"
              rows={4}
              placeholder="交付内容"
            />

            <button
              className="btn primary"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "保存中..."
                : "保存商品"}
            </button>
          </form>

          {message && (
            <p style={{ marginTop: 16 }}>
              {message}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
