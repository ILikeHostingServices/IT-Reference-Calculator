/* Worker entry point. Serves the static site from the ASSETS binding and:
   - 301-redirects any hostname other than PRIMARY_HOST (set in wrangler.jsonc) to it, keeping path and query;
   - adds a Last-Modified header from the deployed version's upload time (static assets carry none, so the
     footer's build time would be blank);
   - sends the security headers. They follow ilhs.app's site/_headers, loosened only where a tool needs it:
     scripts (the calculators), connect-src for the DNS-over-HTTPS resolvers, data: images for the QR
     download, and a service worker for offline use. */
const SECURITY_HEADERS = {
  "Content-Security-Policy": [
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self'",
    "font-src 'self'",
    "img-src 'self' data:",
    "connect-src 'self' https://cloudflare-dns.com https://dns.google",
    "manifest-src 'self'",
    "worker-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; "),
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const primary = (env.PRIMARY_HOST || "").trim().toLowerCase();
    if (primary && url.hostname !== primary && !url.hostname.endsWith(".workers.dev")) {
      url.protocol = "https:";
      url.hostname = primary;
      url.port = "";
      return Response.redirect(url.toString(), 301);
    }

    const asset = await env.ASSETS.fetch(request);
    const response = new Response(asset.body, asset);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(name, value);
    const deployed = env.CF_VERSION_METADATA && Date.parse(env.CF_VERSION_METADATA.timestamp);
    if (deployed && !response.headers.has("Last-Modified")) response.headers.set("Last-Modified", new Date(deployed).toUTCString());
    return response;
  },
};
