import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "inbox-attachments";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");
  const workspaceId = formData.get("workspaceId");

  if (!(file instanceof File) || typeof workspaceId !== "string" || !workspaceId) {
    return NextResponse.json({ ok: false, error: "missing file or workspaceId" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    await admin.storage.createBucket(BUCKET, { public: true });
  }

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `${workspaceId}/${crypto.randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await admin.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ ok: true, url: pub.publicUrl, name: file.name, type: file.type || "application/octet-stream" });
}
