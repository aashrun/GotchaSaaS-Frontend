# Deployment and external setup

## Platform

Build with `npm run build`, migrate with `npm run db:migrate`, then serve `GotchaSaaS-Frontend/dist` through Express behind HTTPS. Use a Node host, not an arbitrary Cloudflare Worker for the control plane. Set `NODE_ENV=production`, `APP_ORIGIN=https://your-platform.example`, `DATABASE_URL` to the dedicated Neon platform connection URI and `DATABASE_SSL=true`. Use a valid certificate chain; never disable TLS verification.

Run web and worker processes separately. Web: `RUN_WORKER=false npm start -w GotchaSaaS-Backend`. Worker: `npm run worker`. `NEBULA_PORT` controls the HTTP port. Production binds to 0.0.0.0; local development binds to loopback. Set `TRUST_PROXY_HOPS` only to match your actual trusted proxy topology. Production must use `MAIL_MODE=resend`, `RESEND_API_KEY`, and a verified `MAIL_FROM` domain. Configure restart policy, log collection, database backups, secrets, provider quotas and alerts before going live.

## E2B

Provision a dedicated E2B template outside the control plane using the official [template documentation](https://docs.e2b.dev/). It must have Node 22+, `/workspace`, and the exact dependencies from `GotchaSaaS-Backend/Templates/index.js` preinstalled in `/workspace/node_modules`. Match React/Vite/TypeScript/Tailwind versions in the lockfile. Pin and audit the template image; set provider CPU/memory/disk limits and test them. This application does not claim to have verified those resource limits without a live E2B account.

Set `E2B_API_KEY`, `E2B_TEMPLATE_ID`, and `SANDBOX_TIMEOUT_MS` (default 15 minutes). Generation denies all egress and public sandbox traffic. No dependency installation or custom shell commands are accepted from the model. Fixed commands have a 60-second deadline. Source recovery is stored in PostgreSQL; E2B instances are disposable and killed after validation. A compiled opaque-origin iframe preview is provided; raw private sandbox port URLs are not exposed as public preview links.

## Cloudflare frontend publication

The initial adapter uses [Workers for Platforms dispatch scripts](https://developers.cloudflare.com/api/resources/workers_for_platforms/subresources/dispatch/). Configure `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_DISPATCH_NAMESPACE`, and `PUBLISHED_APP_DOMAIN`. The namespace must be untrusted. Configure its dynamic dispatch Worker, wildcard routing/DNS/HTTPS, allowed host validation, outbound limits and per-tenant resource limits before enabling creation.

The adapter uploads a fixed Worker module serving a validated frontend artifact. It does **not** deploy Express code or claim supported generated server/database authentication. The public URL must pass an actual HTTP smoke test before it is labeled published. An accepted upload with failed routing is recorded `verification_failed` and its external identifier is retained for cleanup.

The preview's Publish control first reads a tenant-scoped readiness plan. Missing provider configuration, disabled paid resources, missing active subscription, insufficient ownership, an active build, an unverified revision or an unresolved deployment operation blocks approval. Review shows the exact source revision and public URL. Only explicit owner approval queues publication, with a revision check and idempotency key. Changing source invalidates that approval. Verified static apps can also be downloaded as an offline HTML file without public hosting.

A minimal dispatch Worker pattern (review, quota-limit and deploy it in your account):

```js
export default {
  async fetch(request, env) {
    const host = new URL(request.url).hostname;
    const suffix = '.' + env.APP_DOMAIN;
    if (!host.endsWith(suffix)) return new Response('Not found', { status: 404 });
    const name = host.slice(0, -suffix.length);
    if (!/^app-[a-f0-9]{32}$/.test(name)) return new Response('Not found', { status: 404 });
    try {
      return await env.DISPATCH.get(name).fetch(request);
    } catch {
      return new Response('Application unavailable', { status: 404 });
    }
  },
};
```

Custom domains, provider metrics, server bindings and full-stack generated deployment remain unavailable. Never enable unlimited paid resources.
