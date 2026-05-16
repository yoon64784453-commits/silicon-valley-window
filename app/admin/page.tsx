"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function checkAdmin() {
      const { data } = await supabase.auth.getUser();

      const userEmail = data.user?.email;
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

      if (!userEmail) {
        window.location.href = "/login";
        return;
      }

      if (userEmail === adminEmail) {
        setIsAdmin(true);
      }

      setChecking(false);
    }

    checkAdmin();
  }, []);

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
          <p>当前账号不是管理员。</p>
        </div>
      </main>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formElement = event.currentTarget;

    setLoading(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
const imageFile = form.get("image") as File;

let imageUrl = "";

if (imageFile && imageFile.size > 0) {
  const fileName = `${Date.now()}-${imageFile.name}`;

  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(fileName, imageFile);

  if (uploadError) {
    setMessage("图片上传失败：" + uploadError.message);
    setLoading(false);
    return;
  }

  const {
    data: { publicUrl }
  } = supabase.storage
    .from("product-images")
    .getPublicUrl(fileName);

  imageUrl = publicUrl;
}
    const product = {
      title: String(form.get("title") || ""),
      subtitle: String(form.get("subtitle") || ""),
      price: Number(form.get("price") || 0),
      emoji: String(form.get("emoji") || "📦"),
      category: String(form.get("category") || "虚拟产品"),
      description: String(form.get("description") || ""),
      download_name: String(form.get("download_name") || ""),
      delivery_content: String(form.get("delivery_content") || ""),
      image_url: imageUrl,
    };

    const { error } = await supabase.from("products").insert(product);

    if (error) {
      setMessage("保存失败：" + error.message);
    } else {
      setMessage("保存成功！现在去商城页看看。");
      formElement.reset();
    }

    setLoading(false);
  }

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 860 }}>
        <h2>管理员上传商品</h2>
        <p>现在这个表单会真正写入 Supabase 数据库。</p>

        <div className="panel" style={{ padding: 26, marginTop: 22 }}>
          <form className="form" onSubmit={handleSubmit}>
            <input className="input" name="title" placeholder="商品标题，例如：AI商业提示词包" required />
            <input className="input" name="subtitle" placeholder="一句话卖点，例如：客服、销售、运营都能用" />
            <input className="input" name="price" type="number" placeholder="价格，例如：49" required />
            <input className="input" name="emoji" placeholder="商品图标，例如：🧠" />
            <select className="input" name="category" defaultValue="">
              <option value="" disabled>选择分类</option>
              <option>提示词</option>
              <option>智能体</option>
              <option>课程资料</option>
              <option>壁纸素材</option>
              <option>电子书</option>
            </select>
            <textarea name="description" rows={6} placeholder="商品详情介绍" />
            <input
                className="input"
                name="image"
                type="file"
                accept="image/*"
           />
            <input className="input" name="download_name" placeholder="下载文件名，例如：demo.zip" />
            <textarea
              className="input"
              name="delivery_content"
              rows={4}
              placeholder="交付内容：链接、卡密、兑换码、教程地址等"
            />
            <button className="btn primary" type="submit" disabled={loading}>
              {loading ? "保存中..." : "保存商品"}
            </button>
          </form>

          {message && <p style={{ marginTop: 16 }}>{message}</p>}
        </div>
      </div>
    </main>
  );
}