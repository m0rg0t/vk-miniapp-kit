// Optional pure policy; no SDK, host detection, side effects, or authentication.
const OK_WEB_CLIENTS = new Set([
  'desktop_web', 'desktop_web_ok', 'mobile_web', 'mobile_web_ok',
]);
const SHARE_TYPES = new Set(['message', 'post', 'story', 'qr', 'link', 'other']);

function configuredId(value, label) {
  if (typeof value !== 'string' || !/^[1-9][0-9]*$/.test(value)) {
    throw new TypeError(`${label} must be a configured positive decimal string`);
  }
  return value;
}

export function getLaunchContext(search, { vkAppId, okAppId }) {
  const vkUrl = `https://vk.com/app${configuredId(vkAppId, 'vkAppId')}`;
  const okUrl = `https://ok.ru/app/${configuredId(okAppId, 'okAppId')}`;
  const params = new URLSearchParams(search);
  const platform = params.get('vk_client') === 'ok' ? 'ok'
    : params.has('vk_platform') || params.has('vk_app_id') ? 'vk' : 'standalone';
  return {
    platform,
    clientPlatform: params.get('vk_platform') || '',
    appUrl: platform === 'ok' ? okUrl : vkUrl,
    storyAction: platform === 'ok' ? 'В историю OK' : 'В историю VK',
    showCommunity: platform !== 'ok',
    showOtherApps: platform !== 'ok',
  };
}

// Caller must ALSO require a real host. `supported` is a bounded SDK probe.
// Unknown OK variants are not proof of native support; verify them separately.
export function storyAllowed(context, supported) {
  if (context.platform === 'standalone' || supported !== true) return false;
  return !(context.platform === 'ok' && OK_WEB_CLIENTS.has(context.clientPlatform));
}

// Adapt current SDK StickerContainer[] shape without mutating the VK payload.
// This removes known incompatible fields, but is not a complete schema validator.
export function adaptStoryPayload(context, payload) {
  const adapted = { ...payload };
  if (context.platform !== 'ok') return adapted;
  delete adapted.attachment;
  if (Array.isArray(adapted.stickers)) {
    adapted.stickers = adapted.stickers.map(entry => {
      if (entry?.sticker_type !== 'renderable' || !entry.sticker) return entry;
      const sticker = { ...entry.sticker };
      delete sticker.clickable_zones;
      return { ...entry, sticker };
    });
  }
  return adapted;
}

// Bridge 3.0.2 types + deliberate legacy-host support. Update types explicitly.
export function classifyShareResponse(data) {
  if (Array.isArray(data)) {
    if (!data.length) return 'declined';
    return data.some(item => SHARE_TYPES.has(item?.type)) ? 'success' : 'failed';
  }
  if (data?.type === null) return 'declined';
  return SHARE_TYPES.has(data?.type) || data?.result === true ? 'success' : 'failed';
}
