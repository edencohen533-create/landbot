import { Integration, Lead } from "./types";
import { useQuizFlowStore } from "./store";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    ttq?: { load: (id: string) => void; page: () => void; track: (event: string, data?: unknown) => void };
    _qfPixelsLoaded?: Set<string>;
  }
}

async function fireWebhook(integration: Integration, lead: Lead) {
  if (!integration.url) return;
  try {
    const res = await fetch("/api/relay-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: integration.url,
        secret: integration.secret,
        payload: {
          leadId: lead.id,
          quizId: lead.quizId,
          quizName: lead.quizName,
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          score: lead.score,
          category: lead.category,
          utmSource: lead.utmSource,
          utmMedium: lead.utmMedium,
          utmCampaign: lead.utmCampaign,
          answers: lead.answers,
          createdAt: lead.createdAt,
        },
      }),
    });
    const data = await res.json().catch(() => ({ ok: false }));
    useQuizFlowStore.getState().recordIntegrationResult(integration.id, {
      status: data.ok ? "success" : "error",
      error: data.ok ? undefined : data.error || `HTTP ${data.status ?? "?"}`,
    });
  } catch (err) {
    useQuizFlowStore.getState().recordIntegrationResult(integration.id, {
      status: "error",
      error: err instanceof Error ? err.message : "שליחה נכשלה",
    });
  }
}

function loadMetaPixel(pixelId: string) {
  if (typeof window === "undefined") return;
  window._qfPixelsLoaded = window._qfPixelsLoaded || new Set();
  if (window._qfPixelsLoaded.has("meta:" + pixelId)) return;
  window._qfPixelsLoaded.add("meta:" + pixelId);
  /* eslint-disable */
  (function (f: any, b: any, e: any, v: any) {
    if (f.fbq) return;
    var n: any = (f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    });
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    var t = b.createElement(e);
    t.async = true;
    t.src = v;
    var s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */
  window.fbq?.("init", pixelId);
}

function loadTikTokPixel(pixelId: string) {
  if (typeof window === "undefined") return;
  window._qfPixelsLoaded = window._qfPixelsLoaded || new Set();
  if (window._qfPixelsLoaded.has("tiktok:" + pixelId)) return;
  window._qfPixelsLoaded.add("tiktok:" + pixelId);
  /* eslint-disable */
  (function (w: any, d: any, t: any) {
    w.TiktokAnalyticsObject = t;
    var ttq = (w[t] = w[t] || []);
    ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent"];
    ttq.setAndDefer = function (t: any, e: any) {
      t[e] = function () {
        t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
      };
    };
    for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
    ttq.instance = function (t: any) {
      var e = ttq._i[t] || [];
      for (var n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]);
      return e;
    };
    ttq.load = function (e: any) {
      var i = "https://analytics.tiktok.com/i18n/pixel/events.js";
      ttq._i = ttq._i || {};
      ttq._i[e] = [];
      ttq._t = ttq._t || {};
      ttq._t[e] = +new Date();
      ttq._o = ttq._o || {};
      var n = d.createElement("script");
      n.type = "text/javascript";
      n.async = true;
      n.src = i + "?sdkid=" + e + "&lib=" + t;
      var s = d.getElementsByTagName("script")[0];
      s.parentNode.insertBefore(n, s);
    };
    ttq.load(pixelId);
    ttq.page();
  })(window, document, "ttq");
  /* eslint-enable */
}

function fireMetaPixel(pixelId: string, lead: Lead) {
  loadMetaPixel(pixelId);
  window.fbq?.("track", "Lead", { value: lead.score, currency: "ILS", content_name: lead.quizName });
}

function fireTikTokPixel(pixelId: string, lead: Lead) {
  loadTikTokPixel(pixelId);
  window.ttq?.track("SubmitForm", { value: lead.score, currency: "ILS", content_name: lead.quizName });
}

export function triggerIntegrations(lead: Lead) {
  const integrations = useQuizFlowStore.getState().integrations.filter((i) => i.enabled);
  for (const integration of integrations) {
    if (integration.kind === "webhook") {
      void fireWebhook(integration, lead);
    } else if (integration.kind === "meta_pixel" && integration.pixelId) {
      fireMetaPixel(integration.pixelId, lead);
    } else if (integration.kind === "tiktok_pixel" && integration.pixelId) {
      fireTikTokPixel(integration.pixelId, lead);
    }
  }
}

export async function testWebhook(integration: Integration): Promise<{ ok: boolean; error?: string }> {
  if (!integration.url) return { ok: false, error: "לא הוגדרה כתובת" };
  try {
    const res = await fetch("/api/relay-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: integration.url,
        secret: integration.secret,
        payload: { test: true, message: "בדיקת חיבור מ-QuizFlow", sentAt: new Date().toISOString() },
      }),
    });
    const data = await res.json().catch(() => ({ ok: false }));
    useQuizFlowStore.getState().recordIntegrationResult(integration.id, {
      status: data.ok ? "success" : "error",
      error: data.ok ? undefined : data.error || `HTTP ${data.status ?? "?"}`,
    });
    return { ok: !!data.ok, error: data.error };
  } catch (err) {
    const error = err instanceof Error ? err.message : "שליחה נכשלה";
    useQuizFlowStore.getState().recordIntegrationResult(integration.id, { status: "error", error });
    return { ok: false, error };
  }
}
