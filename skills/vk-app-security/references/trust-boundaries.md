# VK Mini App trust boundaries

## Trust map

| Input or capability | Trust level | Required control |
|---|---|---|
| URL launch parameters | Untrusted in browser | Backend signature, app ID, timestamp verification |
| `vk_user_id` in a request body/header | Untrusted | Derive identity from the verified server session |
| Deep-link/hash/shared payload | Untrusted | Allow-list routes/actions; validate type, length, ownership |
| Bridge user/phone/email response | Client-side evidence | Use the method-specific server verification contract before privileged use |
| Local/Bridge storage | User-controlled state | Parse defensively; never store server authority there |
| Browser environment variables | Public | Never place secure keys/tokens behind `VITE_`, `REACT_APP_`, or `NEXT_PUBLIC_` |
| Backend secret environment | Sensitive | Least privilege, rotation, no logging, no client serialization |
| Deploy token | Sensitive operational credential | CI secret or local credential store; never source control |

## Review questions

- Can changing `vk_user_id`, a route payload, or storage value reveal or modify
  another user's data?
- Does every write endpoint authorize the resolved resource, not merely require
  a logged-in session?
- Can the same ad reward, purchase, invite, or mutation be replayed?
- Do errors or analytics contain the launch URL, signature, access token,
  phone/email, or full API body?
- Does wildcard CORS combine with credentials?
- Are redirects, image URLs, or backend fetch targets restricted against open
  redirect and server-side request forgery?
- Are data retention, account deletion, and catalog privacy text consistent?
