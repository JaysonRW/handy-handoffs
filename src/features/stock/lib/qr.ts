import QRCode from "qrcode";
import type { StockItem } from "../types";

export function buildItemDeepLink(itemId: string, baseOrigin?: string): string {
  const origin =
    baseOrigin ??
    (typeof window !== "undefined"
      ? window.location.origin
      : "https://localhost");
  return `${origin}/admin/stock/${itemId}`;
}

export async function generateQrDataUrl(
  deepLink: string,
  size = 512,
): Promise<string> {
  return QRCode.toDataURL(deepLink, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: size,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}

export function triggerPrintSticker(item: StockItem, qrDataUrl: string): void {
  if (typeof window === "undefined") return;
  const origin =
    typeof window !== "undefined" ? window.location.origin : "PMTMS";
  const win = window.open("", "_blank", "width=600,height=560,top=50,left=50");
  if (!win) {
    alert("Popup blocked — allow popups for this site to print stickers.");
    return;
  }
  const labelOrigin = origin.replace(/^https?:\/\//, "");
  win.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>QR Sticker — ${escapeHtml(item.sku)} · ${escapeHtml(item.name)}</title>
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Inter;
        color: #111;
        background: #fff;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .card {
        width: 58mm;
        margin: 24px auto;
        padding: 10px 10px 12px;
        border: 1px dashed #bbb;
        border-radius: 10px;
        background: #fff;
      }
      .qr {
        width: 100%;
        aspect-ratio: 1 / 1;
        background: #fff;
        border: 1px solid #ddd;
        border-radius: 6px;
        display: block;
      }
      .sku {
        margin-top: 8px;
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        font-weight: 800;
        color: #111;
        text-align: center;
      }
      .name {
        margin-top: 2px;
        font-size: 12px;
        font-weight: 600;
        text-align: center;
        line-height: 1.15;
      }
      .loc {
        margin-top: 4px;
        font-size: 10px;
        text-align: center;
        color: #555;
      }
      .footer {
        margin-top: 6px;
        font-size: 9px;
        color: #888;
        text-align: center;
        letter-spacing: 0.04em;
      }
      @media print {
        body { padding: 0; background: #fff; }
        .card {
          margin: 0 auto;
          box-shadow: none;
          page-break-after: always;
          break-after: page;
        }
        @page { size: 60mm 68mm; margin: 1mm; }
      }
    </style>
  </head>
  <body>
    <div class="card">
      <img class="qr" src="${escapeAttr(qrDataUrl)}" alt="QR code" />
      <div class="sku">${escapeHtml(item.sku)}</div>
      <div class="name">${escapeHtml(item.name)}</div>
      ${item.location ? `<div class="loc">📍 ${escapeHtml(item.location)}</div>` : ""}
      <div class="footer">PMTMS · ${escapeHtml(labelOrigin)}</div>
    </div>
    <script>
      (function(){
        setTimeout(function(){
          try { window.focus(); window.print(); }
          catch(e) { console.warn("print blocked", e); }
        }, 250);
      })();
    <\/script>
  </body>
</html>`);
  win.document.close();
}

function escapeHtml(s: string | undefined): string {
  if (!s) return "";
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
