# Backend launch verification and session exchange

VK launch authentication signs only launch fields whose keys begin with
`vk_`. Canonicalize those fields in lexical key order with URL query encoding,
compute HMAC-SHA256 with the application secure key, encode as unpadded
Base64url, and compare with `sign`.

Before changing canonicalization or accepted fields, re-check VK's current
[launch-parameter documentation](https://dev.vk.com/mini-apps/development/launch-params)
and the installed Bridge types. Do not silently drop a newly introduced
`vk_*` field from the signature input.

Signature validity alone is insufficient:

- require the exact expected `vk_app_id`;
- require numeric `vk_user_id` and `vk_ts`;
- reject timestamps too far in the past or future;
- include new/unknown `vk_*` fields in canonicalization;
- reject malformed and duplicate security-critical fields;
- use constant-time comparison;
- keep the secure key in backend secret storage.

Copy `assets/node/verifyVkLaunchParams.ts` into backend-only code and adapt its
result to the framework's authentication middleware. The verifier intentionally
does not create cookies or tokens; session policy belongs to the application.

## Recommended exchange

1. Client sends the original `window.location.search` to
   `POST /auth/vk-launch` over HTTPS.
2. Server verifies launch data with a short TTL.
3. Server resolves/creates the internal account for the verified VK user.
4. Server issues a short-lived, HttpOnly, Secure, SameSite cookie, or an
   equivalent token protected against script access and replay.
5. Subsequent endpoints derive the user from that session and authorize the
   requested resource.

Return one generic authentication failure to the client. Keep detailed parse
reasons in redacted server diagnostics.

## Testing

Generate signatures in test code from a fixed secure key, never a production
key. Cover:

- valid current launch;
- one modified signed field;
- wrong `vk_app_id`;
- expired and far-future `vk_ts`;
- missing/duplicate `sign`, app ID, user ID, or timestamp;
- malformed URL encoding, including invalid percent escapes/UTF-8;
- an extra signed `vk_*` field.
