"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type PayMethod = "wechat" | "alipay";

type Product = {
  id: string;
  title: string;
  price: number;
};

function PayMethodTabs({
  payMethod,
  setPayMethod,
}: {
  payMethod: PayMethod;
  setPayMethod: (method: PayMethod) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
      <button
        className={payMethod === "wechat" ? "btn primary" : "btn"}
        type="button"
        onClick={() => setPayMethod("wechat")}
      >
        微信支付
      </button>

      <button
        className={payMethod === "alipay" ? "btn primary" : "btn"}
        type="button"
        onClick={() => setPayMethod("alipay")}
      >
        支付宝
      </button>
    </div>
  );
}

function PaymentQr({ payMethod }: { payMethod: PayMethod }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 220,
        margin: "0 auto",
        padding: 14,
        borderRadius: 26,
        background: "rgba(255,255,255,.96)",
        boxShadow: "0 18px 60px rgba(0,0,0,.28)",
      }}
    >
      <img
        src={payMethod === "wechat" ? "/wechat-pay.png" : "/alipay-pay.png"}
        alt={payMethod === "wechat" ? "微信支付二维码" : "支付宝二维码"}
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          objectFit: "cover",
          borderRadius: 18,
          display: "block",
        }}
      />
    </div>
  );
}

function BuyContent() {
  const searchParams = useSearchParams();

  const [message, setMessage] = useState("正在创建订单...");
  const [created, setCreated] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [payMethod, setPayMethod] = useState<PayMethod>("wechat");
  const [product, setProduct] = useState<Product | null>(null);

  const hasCreatedOrder = useRef(false);

  useEffect(() => {
    async function createOrder() {
      if (hasCreatedOrder.current) return;
      hasCreatedOrder.current = true;

      const productId = searchParams.get("product_id");

      if (!productId) {
        setMessage("缺少商品 ID");
        return;
      }

      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;

        if (!user) {
          window.location.href = "/login";
          return;
        }

        const { data: productData } = await supabase
          .from("products")
          .select("id,title,price")
          .eq("id", productId)
          .single();

        if (productData) {
          setProduct(productData as Product);
        }

        const orderKey = `creating-order-${productId}`;
        const lastCreatedAt = Number(sessionStorage.getItem(orderKey) || 0);
        const now = Date.now();

        if (lastCreatedAt && now - lastCreatedAt < 10000) {
          setCreated(true);
          setMessage("订单已创建，请完成支付。");
          return;
        }

        sessionStorage.setItem(orderKey, String(now));

        const { error } = await supabase.from("orders").insert({
          user_id: user.id,
          product_id: productId,
          status: "pending",
        });

        if (error) {
          setMessage("创建订单失败：" + error.message);
          return;
        }

        setCreated(true);
        setMessage("订单已创建，请完成支付。");
      } catch (err) {
        console.error(err);
        setMessage("发生未知错误，请稍后重试。");
      }
    }

    createOrder();
  }, [searchParams]);

  const payMethodText = payMethod === "wechat" ? "微信支付" : "支付宝";

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 980 }}>
        <div
          className="panel"
          style={{
            padding: 0,
            borderRadius: 36,
            overflow: "hidden",
          }}
        >
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

              <h2 style={{ marginTop: 16, marginBottom: 8 }}>
                PromptBay Checkout
              </h2>

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

          <div
            className="checkout-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1.05fr .95fr",
              gap: 0,
            }}
          >
            <div style={{ padding: 32 }}>
              <h3 style={{ marginTop: 0 }}>选择支付方式</h3>

              <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
                <div
                  onClick={() => setShowQr(!showQr)}
                  style={{
                    padding: 18,
                    borderRadius: 22,
                    border: "1px solid rgba(126,255,224,.18)",
                    background: "rgba(255,255,255,.045)",
                    cursor: "pointer",
                  }}
                >
                  <strong>微信 / 支付宝扫码</strong>

                  <p style={{ marginBottom: 0 }}>
                    桌面端请查看右侧二维码；手机端点击此处展开付款二维码。
                  </p>

                  {showQr && (
                    <div
                      className="mobile-payment-qr"
                      style={{
                        marginTop: 18,
                        padding: 18,
                        borderRadius: 24,
                        background: "rgba(255,255,255,.06)",
                        border: "1px solid rgba(255,255,255,.08)",
                      }}
                    >
                      <PayMethodTabs
                        payMethod={payMethod}
                        setPayMethod={setPayMethod}
                      />

                      <PaymentQr payMethod={payMethod} />

                      <p style={{ textAlign: "center", marginBottom: 0 }}>
                        请使用{payMethodText}扫码支付
                      </p>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    padding: 18,
                    borderRadius: 22,
                    border: "1px solid rgba(255,255,255,.08)",
                    background: "rgba(255,255,255,.025)",
                    opacity: 0.68,
                  }}
                >
                  <strong>信用卡支付 / Stripe</strong>

                  <p style={{ marginBottom: 0 }}>
                    即将上线。后续可接入 Stripe Checkout，实现真实支付回调。
                  </p>
                </div>
              </div>

              <div
                style={{
                  marginTop: 28,
                  padding: 18,
                  borderRadius: 22,
                  background: "rgba(32,255,200,.06)",
                  border: "1px solid rgba(32,255,200,.14)",
                }}
              >
                <strong>订单状态</strong>

                <p style={{ marginBottom: 0 }}>
                  {created
                    ? "待付款确认。管理员确认后，交付内容会在下载中心解锁。"
                    : "正在创建订单，请稍候。"}
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginTop: 28,
                  flexWrap: "wrap",
                }}
              >
                <Link className="btn" href="/dashboard">
                  查看订单状态
                </Link>

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
                  padding: 18,
                  borderRadius: 30,
                  background: "rgba(255,255,255,.04)",
                  border: "1px solid rgba(255,255,255,.08)",
                }}
              >
                <PayMethodTabs
                  payMethod={payMethod}
                  setPayMethod={setPayMethod}
                />

                <PaymentQr payMethod={payMethod} />

                <p style={{ textAlign: "center", marginBottom: 0 }}>
                  {payMethodText}二维码
                </p>
              </div>

              <div
                style={{
                  marginTop: 18,
                  padding: 18,
                  borderRadius: 22,
                  background: "rgba(255,255,255,.035)",
                  border: "1px solid rgba(255,255,255,.06)",
                }}
              >
                <strong>订单摘要</strong>

                <p style={{ marginBottom: 0 }}>
                  商品：{product?.title || "正在读取商品信息"}
                </p>

                <p style={{ marginBottom: 0 }}>
                  应付金额：¥{product?.price ?? "--"}
                </p>

                <p style={{ marginBottom: 0 }}>
                  支付方式：{payMethodText}
                </p>
              </div>

              <div
                style={{
                  marginTop: 18,
                  padding: 18,
                  borderRadius: 22,
                  background: "rgba(255,255,255,.035)",
                  border: "1px solid rgba(255,255,255,.06)",
                }}
              >
                <strong>付款后请等待确认</strong>

                <p style={{ marginBottom: 0 }}>
                  当前为人工确认模式。付款后，管理员会在后台确认订单并解锁交付内容。
                </p>
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