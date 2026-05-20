import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

function readText(form: FormData, key: string, fallback = "") {
  const value = form.get(key);

  return typeof value === "string" ? value.trim() : fallback;
}

export async function POST(request: NextRequest) {
  const { context, response } = await requireAdmin(request);

  if (response) {
    return response;
  }

  const form = await request.formData();
  const title = readText(form, "title");
  const price = Number(readText(form, "price", "0"));

  if (!title) {
    return NextResponse.json({ error: "请填写商品标题。" }, { status: 400 });
  }

  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: "商品价格不合法。" }, { status: 400 });
  }

  let imageUrl = "";
  const imageFile = form.get("image");

  if (imageFile instanceof File && imageFile.size > 0) {
    const extension =
      imageFile.name
        .split(".")
        .pop()
        ?.replace(/[^a-z0-9]/gi, "")
        .toLowerCase() || "png";

    const fileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await context.supabase.storage
      .from("product-images")
      .upload(fileName, imageFile, {
        contentType: imageFile.type || undefined,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: "图片上传失败：" + uploadError.message },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = context.supabase.storage.from("product-images").getPublicUrl(fileName);

    imageUrl = publicUrl;
  }

  const product = {
    title,
    subtitle: readText(form, "subtitle"),
    price,
    emoji: readText(form, "emoji", "📦"),
    category: readText(form, "category", "虚拟产品"),
    description: readText(form, "description"),
    download_name: readText(form, "download_name"),
    delivery_content: readText(form, "delivery_content"),
    image_url: imageUrl,
  };

  const { error } = await context.supabase.from("products").insert(product);

  if (error) {
    return NextResponse.json(
      { error: "保存失败：" + error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
