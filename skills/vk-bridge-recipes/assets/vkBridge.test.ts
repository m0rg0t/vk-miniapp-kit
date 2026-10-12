import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const sdk = vi.hoisted(() => ({ send: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn() }));
vi.mock('@vkontakte/vk-bridge', () => ({ default: sdk }));
import { vkBridgeSend, vkBridgeService, vkBridgeSubscribe } from './vkBridge';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv('DEV', false);
  vi.stubGlobal('window', { parent: {} });
  vi.stubGlobal('navigator', { userAgent: 'test' });
  sdk.send.mockReset();sdk.subscribe.mockReset();sdk.unsubscribe.mockReset();
});
afterEach(() => { vi.useRealTimers();vi.unstubAllGlobals();vi.unstubAllEnvs(); });

describe('central Bridge service', () => {
  for (const method of ['VKWebAppShare', 'VKWebAppShowStoryBox']) {
    it(`${method} waits for human input without the short API timeout`, async () => {
      let resolve!: (value: unknown) => void;
      sdk.send.mockReturnValue(new Promise(r => { resolve = r; }));
      const pending = method === 'VKWebAppShare'
        ? vkBridgeService.share('https://example.test/app')
        : vkBridgeSend(method, { background_type: 'image', url: 'https://example.test/card.png' });
      const settled = vi.fn();void pending.then(settled);
      await vi.advanceTimersByTimeAsync(7000);
      expect(settled).not.toHaveBeenCalled();
      const response = method === 'VKWebAppShare' ? [{ type: 'link' }] : { result: true };
      resolve(response);expect(await pending).toEqual(response);
      expect(vi.getTimerCount()).toBe(0);
    });
  }
  it('retains the short budget for API calls and allows explicit dialog overrides', async () => {
    sdk.send.mockReturnValue(new Promise(() => {}));
    const api = vkBridgeSend('VKWebAppGetUserInfo');
    await vi.advanceTimersByTimeAsync(5001);expect(await api).toBeNull();
    const dialog = vkBridgeService.share(undefined, { timeout: 12000 });
    await vi.advanceTimersByTimeAsync(12001);expect(await dialog).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('settles failed/empty sharing without initiating a second method', async () => {
    sdk.send.mockResolvedValue([]);expect(await vkBridgeService.share()).toEqual([]);
    sdk.send.mockRejectedValue({ error_type: 'client_error', error_data: { error_code: 4 } });
    expect(await vkBridgeService.share()).toBeNull();
    sdk.send.mockResolvedValue({ result: false });
    expect(await vkBridgeSend('VKWebAppShowStoryBox')).toEqual({ result: false });
    expect(sdk.send.mock.calls.map(call => call[0])).toEqual(['VKWebAppShare', 'VKWebAppShare', 'VKWebAppShowStoryBox']);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('clears timers for immediate success and rejection, and can disable timeout', async () => {
    sdk.send.mockResolvedValue({ result: true });await vkBridgeService.storageSet('test_state', '{}');
    expect(vi.getTimerCount()).toBe(0);
    sdk.send.mockRejectedValue(new Error('network'));expect(await vkBridgeSend('VKWebAppStorageGet')).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    sdk.send.mockResolvedValue([{ type: 'link' }]);await vkBridgeService.share(undefined, { timeout: null });
    expect(vi.getTimerCount()).toBe(0);
  });
  it('subscribes to receive-only host events and cleans up the same listener', () => {
    const listener = vi.fn(),stop = vkBridgeSubscribe(listener);
    const event = { detail: { type: 'VKWebAppViewHide', data: {} } };
    sdk.subscribe.mock.calls[0][0](event);expect(listener).toHaveBeenCalledWith(event);
    stop();expect(sdk.unsubscribe).toHaveBeenCalledWith(listener);
    expect(sdk.send).not.toHaveBeenCalled();
  });
  it('uses explicit dev responses, round-trips storage, and rejects unknown mock methods', async () => {
    const browser = { parent: null as unknown };browser.parent = browser;
    vi.stubGlobal('window', browser);vi.stubEnv('DEV', true);
    const write = vkBridgeSend('VKWebAppStorageSet', { key: 'test_state', value: 'saved' }, { mockDelay: 0 });
    await vi.runAllTimersAsync();expect(await write).toEqual({ result: true });
    const read = vkBridgeSend('VKWebAppStorageGet', { keys: ['test_state'] }, { mockDelay: 0 });
    await vi.runAllTimersAsync();expect(await read).toEqual({ keys: [{ key: 'test_state', value: 'saved' }] });
    const unknown = vkBridgeSend('VKWebAppUnknown', {}, { mockDelay: 0 });
    const assertion = expect(unknown).rejects.toThrow('Unsupported VK Bridge mock');
    await vi.runAllTimersAsync();await assertion;
    expect(sdk.send).not.toHaveBeenCalled();
  });
});
