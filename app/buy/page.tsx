"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function BuyPage() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("正在创建订单...");
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

      const orderKey = `creating-order-${productId}`;
      const lastCreatedAt = Number(sessionStorage.getItem(orderKey) || 0);
      const now = Date.now();

      if (lastCreatedAt && now - lastCreatedAt < 10000) {
        window.location.href = "/dashboard";
        return;
      }

      sessionStorage.setItem(orderKey, String(now));

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { error } = await supabase.from("orders").insert({
        user_id: user.id,
        product_id: productId
      });

      if (error) {
        setMessage("创建订单失败：" + error.message);
      } else {
        window.location.href = "/dashboard";
      }
    }

    createOrder();
  }, [searchParams]);

  return (
    <main className="section">
      <div className="container">
        <p>{message}</p>
      </div>
    </main>
  );
}