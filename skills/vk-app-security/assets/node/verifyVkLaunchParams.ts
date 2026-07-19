import { createHmac, timingSafeEqual } from 'node:crypto';

export type VerifyVkLaunchParamsOptions = {
  expectedAppId: string | number;
  secureKey: string;
  nowSeconds?: number;
  maxAgeSeconds?: number;
  maxFutureSkewSeconds?: number;
};

export type VerifiedVkLaunch = {
  appId: number;
  userId: number;
  timestamp: number;
  params: Readonly<Record<string, string>>;
};

export type VerifyVkLaunchParamsResult =
  | { ok: true; value: VerifiedVkLaunch }
  | {
      ok: false;
      reason:
        | 'malformed'
        | 'missing_field'
        | 'duplicate_field'
        | 'wrong_app'
        | 'expired'
        | 'future_timestamp'
        | 'invalid_signature';
    };

const criticalFields = ['sign', 'vk_app_id', 'vk_user_id', 'vk_ts'] as const;

const parseQuery = (input: string): URLSearchParams | null => {
  try {
    const afterQuestion = input.includes('?') ? input.slice(input.indexOf('?') + 1) : input;
    const query = (afterQuestion.startsWith('?') ? afterQuestion.slice(1) : afterQuestion)
      .split('#', 1)[0];
    if (/%(?![0-9A-Fa-f]{2})/.test(query)) return null;
    for (const pair of query.split('&')) {
      for (const component of pair.split('=', 2)) {
        decodeURIComponent(component.replace(/\+/g, ' '));
      }
    }
    return new URLSearchParams(query);
  } catch {
    return null;
  }
};

const safeEqual = (received: string, expected: string): boolean => {
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
};

export function verifyVkLaunchParams(
  input: string,
  options: VerifyVkLaunchParamsOptions,
): VerifyVkLaunchParamsResult {
  const params = parseQuery(input);
  if (!params || !options.secureKey) return { ok: false, reason: 'malformed' };

  for (const field of criticalFields) {
    const values = params.getAll(field);
    if (values.length === 0 || values[0] === '') return { ok: false, reason: 'missing_field' };
    if (values.length !== 1) return { ok: false, reason: 'duplicate_field' };
  }

  const sign = params.get('sign') as string;
  const appId = Number(params.get('vk_app_id'));
  const userId = Number(params.get('vk_user_id'));
  const timestamp = Number(params.get('vk_ts'));
  if (
    !Number.isSafeInteger(appId) ||
    !Number.isSafeInteger(userId) ||
    !Number.isSafeInteger(timestamp) ||
    appId <= 0 ||
    userId <= 0
  ) {
    return { ok: false, reason: 'malformed' };
  }

  if (String(appId) !== String(options.expectedAppId)) {
    return { ok: false, reason: 'wrong_app' };
  }

  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  const maxAge = options.maxAgeSeconds ?? 900;
  const futureSkew = options.maxFutureSkewSeconds ?? 30;
  if (timestamp < now - maxAge) return { ok: false, reason: 'expired' };
  if (timestamp > now + futureSkew) return { ok: false, reason: 'future_timestamp' };

  const signedEntries = [...params.entries()]
    .filter(([key]) => key.startsWith('vk_'))
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
  const canonical = new URLSearchParams(signedEntries).toString();
  const expected = createHmac('sha256', options.secureKey)
    .update(canonical)
    .digest('base64url');

  if (!safeEqual(sign, expected)) return { ok: false, reason: 'invalid_signature' };

  return {
    ok: true,
    value: {
      appId,
      userId,
      timestamp,
      params: Object.freeze(Object.fromEntries(signedEntries)),
    },
  };
}
