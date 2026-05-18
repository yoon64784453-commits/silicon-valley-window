"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type PendingOrder = {
  id: string;
  created_at: string;
  status: string | null;
  user_id: string;

  products: {
    title: string;
    price: number;
  } | null;

  users: {
    email: string;
  } | null;
};

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [orders, setOrders] = useState<PendingOrder[]>([]);

  useEffect(() => {
    async function checkAdmin() {
      const { data } = await supabase.auth.getUser();

      const userEmail = data.user?.email;
      const adminEmail =
        process.env.NEXT_PUBLIC_ADMIN_EMAIL;

      if (!userEmail) {
        window.location.href = "/login";
        return;
      }

      if (userEmail === adminEmail) {
        setIsAdmin(true);

        loadPendingOrders();
      }

      setChecking(false);
    }

    checkAdmin();
  }, []);

  async function loadPendingOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      created_at,
      status,
      user_id,

      products (
        title,
        price
      )
    `)
    .eq("status", "pending")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error("读取待确认订单失败：", error);
    setMessage("读取待确认订单失败：" + error.message);
    return;
  }

  console.log("待确认订单：", data);
  setOrders((data as unknown as PendingOrder[]) || []);
}

  async function confirmOrder(orderId: string) {
  const confirmed = window.confirm("确认该订单已付款并立即解锁交付内容？");

  if (!confirmed) return;

  const { error } = await supabase
    .from("orders")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) {
    alert("确认失败：" + error.message);
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

    const form = new FormData(formElement);

    setLoading(true);

    setMessage("");

    let imageUrl = "";

    const imageFile =
      form.get("image") as File | null;

    if (imageFile && imageFile.size > 0) {
      const fileName = `${Date.now()}-${imageFile.name}`;

      const { error: uploadError } =
        await supabase.storage
          .from("product-images")
          .upload(fileName, imageFile);

      if (uploadError) {
        setMessage(
          "图片上传失败：" +
            uploadError.message
        );

        setLoading(false);

        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      imageUrl = publicUrl;
    }

    const product = {
      title: String(form.get("title") || ""),

      subtitle: String(
        form.get("subtitle") || ""
      ),

      price: Number(form.get("price") || 0),

      emoji: String(form.get("emoji") || "📦"),

      category: String(
        form.get("category") || "虚拟产品"
      ),

      description: String(
        form.get("description") || ""
      ),

      download_name: String(
        form.get("download_name") || ""
      ),

      delivery_content: String(
        form.get("delivery_content") || ""
      ),

      image_url: imageUrl,
    };

    const { error } = await supabase
      .from("products")
      .insert(product);

    if (error) {
      setMessage(
        "保存失败：" + error.message
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

          <p>
            当前账号不是管理员。
          </p>
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