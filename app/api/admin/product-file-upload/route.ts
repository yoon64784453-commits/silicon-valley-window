import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

type UploadRequest = {
  fileName?: unknown;
  contentType?: unknown;
};

function isZipName(fileName: string) {
  return fileName.toLowerCase().endsWith(".zip");
}

function getResumableEndpoint() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return "";
  }

  const url = new URL(supabaseUrl);
  const projectRef = url.hostname.split(".")[0];

  return `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`;
}

export async function POST(request: NextRequest) {
  const { response } = await requireAdmin(request);

  if (response) {
    return response;
  }

  let body: UploadRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const originalName = typeof body.fileName === "string" ? body.fileName.trim() : "";
  const contentType = typeof body.contentType === "string" ? body.contentType : "application/zip";

  if (!originalName || !isZipName(originalName)) {
    return NextResponse.json({ error: "Please upload a ZIP file." }, { status: 400 });
  }

  const supabaseAdmin = createSupabaseAdmin();
  const path = `${Date.now()}-${crypto.randomUUID()}.zip`;
  const { data, error } = await supabaseAdmin.storage
    .from("product-files")
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json(
      { error: "Failed to create upload URL: " + (error?.message || "unknown error") },
      { status: 500 }
    );
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from("product-files").getPublicUrl(path);

  return NextResponse.json({
    bucketName: "product-files",
    contentType,
    endpoint: getResumableEndpoint(),
    objectName: path,
    publicUrl,
    token: data.token,
  });
}
