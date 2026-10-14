# Deployment and external setup

## Platform

Build with `npm run build`, migrate with `npm run db:migrate`, then serve `GotchaSaaS-Frontend/dist` through Express behind HTTPS. Use a Node host, not an arbitrary Cloudflare Worker for the control plane. Set `NODE_ENV=production`, `APP_ORIGIN=https://your-platform.example`, `DATABASE_URL` to the dedicated Neon platform connection URI and `DATABASE_SSL=true`. Use a valid certificate chain; never disable TLS verification.

Run web and worker processes separately. Web: `RUN_WORKER=false npm start -w GotchaSaaS-Backend`. Worker: `npm run worker`. `API_PORT` controls the HTTP port. Production binds to 0.0.0.0; local development binds to loopback. Set `TRUST_PROXY_HOPS` only to match your actual trusted proxy topology. Production must use `MAIL_MODE=resend`, `RESEND_API_KEY`, and a verified `MAIL_FROM` domain. Configure restart policy, log collection, database backups, secrets, provider quotas and alerts before going live.

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

## Multi-target images and preview hosting

The base image serves web/PWA/desktop renderers. Run `npm run runtime:mobile` and `npm run runtime:python` to prepare separate approved offline images; they record `E2B_MOBILE_TEMPLATE_ID` and `E2B_PYTHON_TEMPLATE_ID` in the ignored local environment. Image creation is metered operator work, not a customer tool. All three images are configured in the current local environment. The scripts pin dependency locks before building; new images need contract verification before registration.

Install/offline testing uses a separate PWA preview server, default port 7015. Production needs `APP_PREVIEW_ORIGIN=https://preview.example-other-domain.com`, `APP_PREVIEW_PORT`, wildcard DNS/TLS and a reverse proxy preserving each project's host. Use a separate root domain from the control plane. Signed project/user/revision tickets protect online access. Service workers cache only the application shell/manifest; database synchronization is not implicit. The worker cannot intercept the Gotcha platform origin.

Native artifacts are source exports with Expo EAS or a manual Electron OS matrix. They are excluded from the Cloudflare web publisher. Connect Expo later as agreed; package/device checks, signing and store release remain separate stages. Source ZIPs contain guides and remap the protected desktop workflow into `.github/workflows/desktop-build.yml`. No app-store submission or GitHub workflow is triggered automatically. [Target strategy](MULTI_TARGET_STRATEGY.md) describes supported stacks and honest delivery limits.
