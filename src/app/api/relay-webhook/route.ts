import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let body: { url?: string; secret?: string; payload?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  const { url, secret, payload } = body;
  if (!url || typeof url !== "string") {
    return NextResponse.json({ ok: false, error: "missing url" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid url" }, { status: 400 });
  }
  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return NextResponse.json({ ok: false, error: "url must be http(s)" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(target.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "X-QuizFlow-Secret": secret } : {}),
      },
      body: JSON.stringify(payload ?? {}),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return NextResponse.json({ ok: res.ok, status: res.status, statusText: res.statusText });
  } catch (err) {
    clearTimeout(timeout);
    const message = err instanceof Error ? err.message : "request failed";
    return NextResponse.json({ ok: false, error: message }, { status: 200 });
  }
}
