import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

function readText(form: FormData, key: string, fallback = "") {
  const value = form.get(key);

  return typeof value === "string" ? value.trim() : fallback;
}

function getSafeExtension(fileName: string, fallback: string) {
  return (
    fileName
      .split(".")
      .pop()
      ?.replace(/[^a-z0-9]/gi, "")
      .toLowerCase() || fallback
  );
}

function isZipFile(file: File) {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  return (
    name.endsWith(".zip") ||
    type === "application/zip" ||
    type === "application/x-zip-compressed"
  );
}

export async function POST(request: NextRequest) {
  const { context, response } = await requireAdmin(request);

  if (response) {
    return response;
  }

  const form = await request.formData();
  const supabaseAdmin = createSupabaseAdmin();
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
    const extension = getSafeExtension(imageFile.name, "png");
    const fileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabaseAdmin.storage
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
    } = supabaseAdmin.storage.from("product-images").getPublicUrl(fileName);

    imageUrl = publicUrl;
  }

  let downloadUrl = "";
  let downloadName = readText(form, "download_name");
  let deliveryContent = readText(form, "delivery_content");
  const uploadedFileUrl = readText(form, "uploaded_file_url");
  const uploadedFileName = readText(form, "uploaded_file_name");
  const productFile = form.get("product_file");

  if (uploadedFileUrl) {
    downloadUrl = uploadedFileUrl;
    downloadName = downloadName || uploadedFileName;
    deliveryContent = deliveryContent
      ? `${deliveryContent}\n\nDownload link: ${downloadUrl}`
      : `Download link: ${downloadUrl}`;
  } else if (productFile instanceof File && productFile.size > 0) {
    if (!isZipFile(productFile)) {
      return NextResponse.json(
        { error: "Please upload a ZIP file." },
        { status: 400 }
      );
    }

    const fileName = `${Date.now()}-${crypto.randomUUID()}.zip`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("product-files")
      .upload(fileName, productFile, {
        contentType: productFile.type || "application/zip",
      });

    if (uploadError) {
      return NextResponse.json(
        { error: "商品文件上传失败：" + uploadError.message },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("product-files").getPublicUrl(fileName);

    downloadUrl = publicUrl;
    downloadName = downloadName || productFile.name;
    deliveryContent = deliveryContent
      ? `${deliveryContent}\n\nDownload link: ${downloadUrl}`
      : `Download link: ${downloadUrl}`;
  }

  const isFree = form.get("is_free") === "on";

  const product = {
    title,
    subtitle: readText(form, "subtitle"),
    price: isFree ? 0 : price,
    emoji: readText(form, "emoji", "📦"),
    category: readText(form, "category", "虚拟产品"),
    description: readText(form, "description"),
    download_name: downloadName,
    delivery_content: deliveryContent,
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
