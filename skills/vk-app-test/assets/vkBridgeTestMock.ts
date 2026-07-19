/**
 * Scenario-controlled Vitest mock for @vkontakte/vk-bridge.
 *
 * Import this module once from the Vitest setup file. Tests can set per-method
 * responses, rejections, and receive-only events without coupling components to
 * a particular VK client.
 */

import { afterEach, vi } from 'vitest';

type Params = Record<string, unknown> | undefined;
type ResponseFactory = (params: Params) => unknown | Promise<unknown>;
type Response = unknown | ResponseFactory;
type Subscriber = (event: { detail: { type: string; data: unknown } }) => void;

const bridgeState = vi.hoisted(() => {
  const responses = new Map<string, Response>();
  const rejections = new Map<string, unknown>();
  const subscribers = new Set<Subscriber>();
  const send = vi.fn(async (method: string, params?: Params): Promise<unknown> => {
    if (rejections.has(method)) throw rejections.get(method);
    const response = responses.get(method);
    if (typeof response === 'function') return response(params);
    return response ?? { result: true };
  });
  const subscribe = vi.fn((subscriber: Subscriber) => subscribers.add(subscriber));
  const unsubscribe = vi.fn((subscriber: Subscriber) => subscribers.delete(subscriber));

  return { responses, rejections, subscribers, send, subscribe, unsubscribe };
});

vi.mock('@vkontakte/vk-bridge', () => ({
  default: {
    send: bridgeState.send,
    subscribe: bridgeState.subscribe,
    unsubscribe: bridgeState.unsubscribe,
    supports: vi.fn(() => true),
    isWebView: vi.fn(() => false),
    isIframe: vi.fn(() => true),
    isEmbedded: vi.fn(() => true),
    isStandalone: vi.fn(() => false),
  },
}));

export function bridgeSendMock() {
  return bridgeState.send;
}

export function setBridgeResponse(method: string, response: Exclude<Response, Error>): void {
  bridgeState.rejections.delete(method);
  bridgeState.responses.set(method, response);
}

export function rejectBridgeMethod(method: string, error: unknown = new Error(`${method} failed`)): void {
  bridgeState.responses.delete(method);
  bridgeState.rejections.set(method, error);
}

export function emitBridgeEvent(type: string, data: unknown): void {
  const event = { detail: { type, data } };
  bridgeState.subscribers.forEach((subscriber) => subscriber(event));
}

export function resetBridgeMock(): void {
  bridgeState.responses.clear();
  bridgeState.rejections.clear();
  bridgeState.subscribers.clear();
  bridgeState.send.mockClear();
  bridgeState.subscribe.mockClear();
  bridgeState.unsubscribe.mockClear();
  bridgeState.responses.set('VKWebAppInit', { result: true });
  bridgeState.responses.set('VKWebAppGetUserInfo', {
    id: 1,
    first_name: 'Test',
    last_name: 'User',
    photo_200: '',
  });
  bridgeState.responses.set('VKWebAppGetLaunchParams', {
    vk_app_id: 1,
    vk_user_id: 1,
    vk_platform: 'desktop_web',
    vk_language: 'ru',
  });
}

resetBridgeMock();
afterEach(resetBridgeMock);
