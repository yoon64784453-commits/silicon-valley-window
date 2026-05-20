"use client";

import { Suspense, useEffect, useState } from "react";
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

function BuyContent() {
  const searchParams = useSearchParams();

  const [message, setMessage] = useState("正在读取商品信息...");
  const [created, setCreated] = useState(false);
  const [payMethod, setPayMethod] = useState<PayMethod>("wechat");
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
          .select("id,status,order_no")
          .eq("user_id", user.id)
          .eq("product_id", productId)
          .in("status", ["pending", "paid"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingOrder?.status === "paid") {
          setCreated(true);
          setMessage("你已购买过该商品，交付内容已解锁。");
          return;
        }

        if (existingOrder?.status === "pending") {
          setCreated(true);
          setMessage("订单已存在。点击下方按钮继续进入支付FM收银台，付款后会自动核验。");
          return;
        }

        setMessage("选择支付方式后，系统会生成支付FM动态订单。");
      } catch (err) {
        console.error(err);
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
      payType: payMethod,
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

const payMethodText = payMethod === "wechat" ? "微信支付" : "支付宝";

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
              <h3 style={{ marginTop: 0 }}>选择支付方式</h3>

              <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
                <div
                  style={{
                    padding: 18,
                    borderRadius: 22,
                    border: "1px solid rgba(126,255,224,.18)",
                    background: "rgba(255,255,255,.045)",
                  }}
                >
                  <PayMethodTabs payMethod={payMethod} setPayMethod={setPayMethod} />

                  <strong>支付FM动态收银台</strong>
                  <p style={{ marginBottom: 0 }}>
                    系统会为当前订单生成专属支付链接。付款成功后，支付FM通知和订单页主动查单都会尝试自动解锁交付内容。
                  </p>
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
                    ? "订单已生成。付款后系统会自动接收支付通知；如果通知延迟，刷新下载中心也会主动核验支付状态。"
                    : "点击资源解锁后会创建支付订单并跳转支付FM收银台。"}
                </p>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
                <button className="btn primary" onClick={startPay}>
                  前往支付FM收银台
                </button>

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
                <strong>自动交付模式</strong>
                <p style={{ marginBottom: 0 }}>
                  不再依赖静态收款码。每次付款都会绑定专属订单号，方便系统识别付款并自动交付。
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
                <p style={{ marginBottom: 0 }}>商品：{product?.title || "正在读取商品信息"}</p>
                <p style={{ marginBottom: 0 }}>应付金额：¥{product?.price ?? "--"}</p>
                <p style={{ marginBottom: 0 }}>支付方式：{payMethodText}</p>
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
                <strong>付款后自动核验</strong>
                <p style={{ marginBottom: 0 }}>
                  支付通知成功时会立即解锁；如果网络导致通知没到，用户刷新下载中心也会触发主动查单。
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
