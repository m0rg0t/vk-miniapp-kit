---
name: vk-app-security
description: "Threat-model and harden VK Mini Apps across the browser/backend boundary: verify signed launch parameters and freshness on the server, protect the VK secure key, exchange verified identity for an application session, minimize Bridge permissions, validate shared/deep-link input, audit storage/logging/CORS/rate limits, and scan for common secret and trust-boundary mistakes. Use for security reviews, authentication, backend/API work, privacy-sensitive features, payments or user data, before release, or when code trusts vk_user_id or URL launch data."
---

# Secure a VK Mini App

Treat every browser value as attacker-controlled until a backend verifies its
origin. Keep the VK application secure key on the server only.

## Inspect the trust boundary

Read `references/trust-boundaries.md`. Map:

- launch URL → browser parser → backend authentication;
- Bridge permission request → response → storage/logging;
- deep-link/shared payload → route or action;
- application session → API authorization and data ownership;
- deploy/admin credentials → CI or developer machine.

Run the read-only scan from the application root:

```bash
SKILL_DIR="<absolute path to the installed vk-app-security skill>"
node "$SKILL_DIR/scripts/security-scan.mjs"
node "$SKILL_DIR/scripts/security-scan.mjs" --strict --json
```

Inspect every finding before editing. Static matches are evidence pointers, not
proof of exploitability.

## Authenticate launch identity

Read `references/backend-session.md`. If the backend trusts `vk_user_id` or any
launch field:

1. Copy `assets/node/verifyVkLaunchParams.ts` into backend-only code.
2. Load the VK application ID and secure key from server secrets.
3. Send the original launch query to the backend over HTTPS.
4. Verify the signature, exact app ID, and a short timestamp TTL.
5. Compare signatures in constant time.
6. Exchange the verified VK user ID for a short-lived, secure application
   session. Authorize each resource independently.

Never import the verifier into browser code, prefix its secret with `VITE_`, or
accept a client-provided user ID as authentication.

## Minimize data and permission risk

Read `references/data-and-permissions.md`. Ask for Bridge permissions at the
moment of user intent, explain the benefit, and make decline a usable state.
Validate deep links, share payloads, storage values, API bodies, and identifiers
against allow-lists and size limits.

For write endpoints, add authorization, schema validation, rate limits, and
idempotency where retries can duplicate effects. Redact launch queries, access
tokens, phone/email signatures, and personal data from logs and error reports.

## Verify

- Unit-test a valid signature, tampering, wrong app ID, malformed input, and an
  expired timestamp.
- Run the scanner and `vk-app-doctor --release --strict`.
- Exercise signed session creation plus an unauthorized resource access.
- Confirm secrets are absent from the production browser bundle and repository.
- Preserve a real-client permission smoke test; local mocks cannot prove native
  consent UI.

## Done when

- No browser-delivered value is used as identity or authorization before server
  verification.
- Secure keys and deploy/access tokens remain server/CI-only and are rotated if
  exposure is suspected.
- Requested permissions, retained data, privacy copy, and deletion behavior
  agree.
- High-confidence scanner findings are resolved and remaining assumptions are
  explicit in the delivery tracker.
