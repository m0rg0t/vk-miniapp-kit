# Data, permissions, and abuse resistance

## Bridge permissions

- Request phone, email, notifications, contacts, or other sensitive capability
  only after a clear user action.
- Explain why before opening native consent UI.
- Treat decline, unavailable methods, and platform differences as normal states.
- Do not repeatedly prompt after decline; provide a manual retry.
- Send only the minimum verified result to the backend and retain it only as
  long as the product requires.

## Inputs and navigation

- Allow-list deep-link route names and actions.
- Cap string and collection sizes before parsing or rendering.
- Never turn a payload directly into HTML, a script URL, redirect destination,
  database selector, or backend fetch URL.
- Validate server-side even when VKUI controls constrain the browser input.

## API controls

- Authenticate, then authorize object ownership on every endpoint.
- Use schema validation and reject unknown fields for sensitive writes.
- Rate-limit authentication, rewards, invitations, uploads, and expensive work.
- Add idempotency keys or transaction uniqueness for retryable effects.
- Use parameterized database queries.
- Restrict CORS to deployed application origins; never combine wildcard origin
  with credentials.

## Storage and observability

- Keep authority and long-lived credentials out of local/Bridge storage.
- Redact query strings, `sign`, tokens, phone/email, and raw request bodies from
  logs, analytics, traces, and client error reporting.
- Encrypt sensitive server data at rest where appropriate and document
  retention/deletion.
- Keep privacy copy synchronized with actual fields, subprocessors, retention,
  support contact, and deletion path.
