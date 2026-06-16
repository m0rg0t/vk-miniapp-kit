/**
 * Dev-mode mock for VK Bridge calls, so the app is fully usable in a plain
 * browser (no VK client). vkBridge.ts routes here automatically when
 * isDevMode() is true. Add/adjust entries as you adopt more VKWebApp* methods.
 */

export const MOCK_USER = {
  id: 1,
  first_name: 'Dev',
  last_name: 'User',
  photo_200: '',
  city: { id: 1, title: 'Localhost' },
};

/** Canned responses keyed by VK Bridge method name. */
const MOCKS: Record<string, unknown> = {
  VKWebAppGetUserInfo: MOCK_USER,
  VKWebAppGetLaunchParams: { vk_user_id: 1, vk_app_id: 0, vk_platform: 'desktop_web' },

  // Ads — return "available" so you can exercise the UI path in dev. Note: no
  // real ad renders in dev; only the VK client shows actual ads.
  VKWebAppCheckNativeAds: { result: true },
  VKWebAppShowNativeAds: { result: true },
  VKWebAppCheckBannerAd: { result: true },
  VKWebAppShowBannerAd: { banner_height: 64 },
  VKWebAppHideBannerAd: { result: true },

  // Sharing
  VKWebAppShare: { type: 'message' },

  // Storage (in-memory below overrides these for round-tripping)
  VKWebAppStorageSet: { result: true },
  VKWebAppStorageGet: { keys: [] },
  VKWebAppStorageGetKeys: { keys: [] },
};

// Tiny in-memory store so StorageSet/Get actually round-trip in dev.
const memStore = new Map<string, string>();

export function getMockResponse<T>(method: string, params: Record<string, unknown> = {}): T {
  if (method === 'VKWebAppStorageSet') {
    memStore.set(String(params.key), String(params.value));
    return { result: true } as T;
  }
  if (method === 'VKWebAppStorageGet') {
    const keys = (params.keys as string[]) ?? [];
    return { keys: keys.map((key) => ({ key, value: memStore.get(key) ?? '' })) } as T;
  }
  if (method === 'VKWebAppStorageGetKeys') {
    return { keys: [...memStore.keys()] } as T;
  }
  return (MOCKS[method] ?? { result: true }) as T;
}
