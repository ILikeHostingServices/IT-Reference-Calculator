/* Worker entry point. Serves the static site from the ASSETS binding and 301-redirects
   any hostname other than PRIMARY_HOST (set in wrangler.jsonc) to it, keeping path and query.
   Static assets carry no Last-Modified header, so the footer's build time would be blank;
   this adds one from the deployed version's upload time. */
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

    const response = await env.ASSETS.fetch(request);
    const deployed = env.CF_VERSION_METADATA && Date.parse(env.CF_VERSION_METADATA.timestamp);
    if (!deployed || response.headers.has("Last-Modified")) return response;
    const withDate = new Response(response.body, response);
    withDate.headers.set("Last-Modified", new Date(deployed).toUTCString());
    return withDate;
  },
};
