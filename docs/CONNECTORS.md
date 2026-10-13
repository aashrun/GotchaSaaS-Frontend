# Connector direction

The sidebar has a dedicated Connectors destination. Search opens an account-scoped project picker (also Cmd/Ctrl+K); Projects opens the full library; collapsible Recents provides quick access to the five most recently edited projects. Folders remain optional groups. Credits and account controls stay pinned.

The existing GitHub project connection can read a configured repository and prepare a draft pull request for explicit owner review. It requires the server's configured GitHub token. The Connectors page accurately separates this capability from planned account OAuth connections and operator-managed platform services.

## Implementation order

1. **GitHub App OAuth:** per-account installations, repository allowlists, read-only scope first. Branch creation and draft PR publishing stay separate reviewed actions. Replace the shared operator token for customer accounts.
2. **Drive and Notion:** select specific documents/pages, import their text as untrusted references, retain source links, and refresh only with permission. Read access should be sufficient for the first release.
3. **Slack and email:** read selected context, prepare drafts, show recipients/content in a review, and send only after an explicit approval bound to that exact draft. Avoid background sending.
4. **Application databases:** provision isolated customer databases with a separate cost estimate and confirmation. Never expose the platform database or credentials to generated applications.

Use an encrypted credential store, connector-specific scopes, organization checks on every tool call, expiry/revocation, per-connector budgets and timeouts, an audit log, and immutable action digests. OAuth callbacks must verify state/PKCE; external content cannot grant permissions or approve actions. A failed request must not automatically repeat an irreversible action. Keep connection status, token expiry, last successful check, and disconnection visible.

These OAuth/document/messaging integrations are a plan, not shipped connectors. Do not label planned integrations connected or present buttons that pretend to connect an account.

## Prompt references

The plus menu on the project home and studio accepts up to four text/image references, including at most two images. Supported text formats are TXT, Markdown, CSV, JSON and source text (CSS/JS/JSX/TS/TSX/HTML). Each text file is limited to 10 KB and all text references to 20 KB. Credentials, invalid text, malware test signatures, executable archives and unsupported types are rejected.

Static PNG/JPEG/WebP input is limited to 1 MB and 16 million decoded pixels. The backend decodes it with Sharp, strips metadata/extra payloads, flattens transparency, resizes it within 1024×1024 and re-encodes JPEG under 200 KB. References are submitted as untrusted Responses text/image content; they never execute or become project source automatically. Credit estimates include a conservative image/context allowance. References survive the home-to-studio handoff and studio reload in session storage; approved jobs retain their normalized context for resumable work. Image understanding requires a vision-capable model. These checks reduce the upload surface; they are not a claim of antivirus certification.

References: [OpenRouter Responses API](https://openrouter.ai/docs/api_reference/responses/overview), [Sharp constructor limits](https://sharp.pixelplumbing.com/api-constructor/).
