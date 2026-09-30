import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getLaunchContext, storyAllowed, adaptStoryPayload, classifyShareResponse,
} from '../assets/ok-platform-policy.mjs';

// Fabricated IDs/query values. No app/account/network dependencies.
const config = { vkAppId: '100001', okAppId: '200002' };
const ctx = (search = '') => getLaunchContext(search, config);

for (const variant of ['desktop_web', 'desktop_web_ok', 'mobile_web', 'mobile_web_ok']) {
  test(`OK ${variant}: reject false-positive story support and retain OK app share URL`, () => {
    const context = ctx(`?vk_client=ok&vk_platform=${variant}`);
    assert.equal(storyAllowed(context, true), false);
    assert.equal(context.appUrl, 'https://ok.ru/app/200002');
  });
}

for (const variant of ['android', 'android_ok', 'iphone', 'iphone_ok']) {
  test(`OK ${variant}: retain a supported story and reject unavailable capability`, () => {
    const context = ctx(`?vk_client=ok&vk_platform=${variant}`);
    assert.equal(storyAllowed(context, true), true);
    assert.equal(storyAllowed(context, false), false);
    assert.equal(storyAllowed(context, undefined), false);
  });
}

test('OK takes precedence; signed launch data and untrusted IDs cannot select a public URL', () => {
  const context = ctx('?vk_client=ok&vk_app_id=999999&vk_ok_app_id=888888&sign=PRIVATE_SENTINEL&access_token=SECRET_SENTINEL');
  assert.equal(context.platform, 'ok');
  assert.equal(context.appUrl, 'https://ok.ru/app/200002');
  assert.equal(context.showCommunity, false);
  assert.equal(context.showOtherApps, false);
  assert.equal(JSON.stringify(context).includes('SENTINEL'), false);
});

test('standalone remains native-disabled; VK links and supported stories are preserved', () => {
  const standalone = ctx();
  assert.equal(standalone.platform, 'standalone');
  assert.equal(storyAllowed(standalone, true), false);
  const vk = ctx('?vk_platform=desktop_web&vk_app_id=100001');
  assert.equal(vk.platform, 'vk');
  assert.equal(vk.appUrl, 'https://vk.com/app100001');
  assert.equal(vk.showCommunity, true);
  assert.equal(vk.showOtherApps, true);
  assert.equal(storyAllowed(vk, true), true);
});

test('public IDs must be explicitly configured, not URL fragments or numbers', () => {
  for (const bad of [undefined, 123, '', '0', '../other', '123?sign=secret']) {
    assert.throws(() => getLaunchContext('', { ...config, okAppId: bad }), TypeError);
    assert.throws(() => getLaunchContext('', { ...config, vkAppId: bad }), TypeError);
  }
});

test('OK removes unsupported story fields without losing media or mutating the VK payload', () => {
  const payload = {
    background_type: 'image', url: 'https://example.org/image.png', locked: true,
    attachment: { type: 'url', url: 'https://vk.com/app100001', text: 'learn_more' },
    stickers: [
      { sticker_type: 'native', sticker: { action_type: 'text', action: { text: 'Sample' } } },
      { sticker_type: 'renderable', sticker: {
        content_type: 'image', url: 'https://example.org/sticker.png',
        transform: { relation_width: 0.5 }, clickable_zones: [{ action_type: 'link' }],
      } },
    ],
  };
  const before = structuredClone(payload);
  const ok = adaptStoryPayload(ctx('?vk_client=ok'), payload);
  assert.equal(Object.hasOwn(ok, 'attachment'), false);
  assert.equal(Object.hasOwn(ok.stickers[1].sticker, 'clickable_zones'), false);
  assert.equal(ok.url, before.url);
  assert.equal(ok.locked, true);
  assert.deepEqual(ok.stickers[0], before.stickers[0]);
  assert.deepEqual(ok.stickers[1].sticker.transform, before.stickers[1].sticker.transform);
  assert.equal(ok.stickers[1].sticker.url, before.stickers[1].sticker.url);
  assert.deepEqual(payload, before);
  assert.deepEqual(adaptStoryPayload(ctx('?vk_app_id=100001'), payload), before);
});

test('OK handles story backgrounds without any stickers/attachment', () => {
  const payload = { background_type: 'none', camera_type: 'front' };
  assert.deepEqual(adaptStoryPayload(ctx('?vk_client=ok'), payload), payload);
});

test('recognized Bridge 3 arrays and legacy objects succeed', () => {
  for (const type of ['message', 'post', 'story', 'qr', 'link', 'other']) {
    assert.equal(classifyShareResponse([{ type }]), 'success');
    assert.equal(classifyShareResponse({ type }), 'success');
  }
  assert.equal(classifyShareResponse({ result: true }), 'success');
});

test('known cancellations are quiet; malformed or new unknown shapes are not success', () => {
  for (const value of [[], { type: null }]) {
    assert.equal(classifyShareResponse(value), 'declined');
  }
  for (const value of [null, undefined, {}, { result: false }, [{ type: null }],
    [true], { type: '' }, { type: 'not-in-sdk' }]) {
    assert.equal(classifyShareResponse(value), 'failed');
  }
});
