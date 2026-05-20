"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  title: string;
  price: number;
};

function BuyContent() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("正在读取商品信息...");
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    async function loadCheckout() {
      const productId = searchParams.get("product_id");

      if (!productId) {
        setMessage("缺少商品 ID");
        return;
      }

      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;

        if (!user) {
          window.location.replace("/login");
          return;
        }

        const { data: productData, error: productError } = await supabase
          .from("products")
          .select("id,title,price")
          .eq("id", productId)
          .single();

        if (productError || !productData) {
          setMessage("商品不存在或已下架。");
          return;
        }

        setProduct(productData as Product);

        const { data: existingOrder } = await supabase
          .from("orders")
          .select("id,status")
          .eq("user_id", user.id)
          .eq("product_id", productId)
          .in("status", ["pending", "paid"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingOrder?.status === "paid") {
          setMessage("你已购买过该商品，交付内容已解锁。");
          return;
        }

        if (existingOrder?.status === "pending") {
          setMessage("订单已存在，可以继续前往收银台。");
          return;
        }

        setMessage("确认订单后进入收银台。");
      } catch (error) {
        console.error(error);
        setMessage("发生未知错误，请稍后重试。");
      }
    }

    loadCheckout();
  }, [searchParams]);

  async function startPay() {
    setMessage("正在创建支付订单...");

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      window.location.href = "/login";
      return;
    }

    const response = await fetch("/api/pay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        productId: searchParams.get("product_id"),
      }),
    });

    const data = await response.json();

    if (data.error) {
      setMessage(data.error);
      return;
    }

    if (data.paid) {
      window.location.href = "/dashboard";
      return;
    }

    window.location.href = data.payUrl;
  }

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 980 }}>
        <div className="panel" style={{ padding: 0, borderRadius: 36, overflow: "hidden" }}>
          <div
            className="checkout-header"
            style={{
              padding: "28px 32px",
              borderBottom: "1px solid rgba(126,255,224,.12)",
              display: "flex",
              justifyContent: "space-between",
              gap: 18,
              alignItems: "center",
            }}
          >
            <div>
              <span className="tag">Secure Checkout</span>
              <h2 style={{ marginTop: 16, marginBottom: 8 }}>PromptBay Checkout</h2>
              <p style={{ margin: 0 }}>{message}</p>
            </div>

            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 18,
                background: "linear-gradient(135deg,#20ffc8,#19b8ff)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#041311",
                fontWeight: 900,
                fontSize: 20,
                boxShadow: "0 0 28px rgba(34,255,205,.22)",
              }}
            >
              PB
            </div>
          </div>

          <div className="checkout-grid" style={{ display: "grid", gridTemplateColumns: "1.05fr .95fr" }}>
            <div style={{ padding: 32 }}>
              <h3 style={{ marginTop: 0 }}>确认订单</h3>

              <div
                style={{
                  marginTop: 20,
                  padding: 18,
                  borderRadius: 22,
                  border: "1px solid rgba(126,255,224,.18)",
                  background: "rgba(255,255,255,.045)",
                }}
              >
                <button className="btn primary" style={{ width: "100%" }} onClick={startPay}>
                  前往支付FM收银台
                </button>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
                <Link className="btn" href="/products">
                  返回商城
                </Link>
              </div>
            </div>

            <div
              className="checkout-side"
              style={{
                padding: 32,
                background:
                  "radial-gradient(circle at 50% 0%, rgba(32,255,200,.12), transparent 45%), rgba(0,0,0,.16)",
                borderLeft: "1px solid rgba(126,255,224,.1)",
              }}
            >
              <div
                style={{
                  minHeight: 220,
                  padding: 24,
                  borderRadius: 28,
                  background: "rgba(255,255,255,.04)",
                  border: "1px solid rgba(255,255,255,.08)",
                  display: "grid",
                  alignContent: "center",
                  gap: 12,
                }}
              >
                <strong style={{ fontSize: 20 }}>订单摘要</strong>
                <p style={{ margin: 0 }}>商品：{product?.title || "正在读取商品信息"}</p>
                <p style={{ margin: 0 }}>应付金额：¥{product?.price ?? "--"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function BuyPage() {
  return (
    <Suspense
      fallback={
        <main className="section">
          <div className="container">
            <p>正在加载购买页面...</p>
          </div>
        </main>
      }
    >
      <BuyContent />
    </Suspense>
  );
}
