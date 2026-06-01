/**
 * 事件适配器
 * 统一 window.dispatchEvent（Web）和 Taro.eventCenter（小程序）的调用
 */

import Taro from '@tarojs/taro';

type EventHandler = (...args: any[]) => void;

const handlers = new Map<string, Set<EventHandler>>();

const isMiniProgram = (): boolean => {
  try {
    return Taro.getEnv() === Taro.ENV_TYPE.WEAPP;
  } catch {
    return process.env.TARO_ENV === 'weapp';
  }
};

const remember = (event: string, handler: EventHandler): void => {
  const set = handlers.get(event) || new Set<EventHandler>();
  set.add(handler);
  handlers.set(event, set);
};

const forget = (event: string, handler: EventHandler): void => {
  const set = handlers.get(event);
  if (!set) return;
  set.delete(handler);
  if (set.size === 0) handlers.delete(event);
};

/**
 * 监听事件
 */
export const on = (event: string, handler: EventHandler): void => {
  remember(event, handler);
  if (isMiniProgram()) {
    Taro.eventCenter.on(event, handler);
  } else {
    window.addEventListener(event, handler as EventListener);
  }
};

/**
 * 移除事件监听
 */
export const off = (event: string, handler: EventHandler): void => {
  forget(event, handler);
  if (isMiniProgram()) {
    Taro.eventCenter.off(event, handler);
  } else {
    window.removeEventListener(event, handler as EventListener);
  }
};

/**
 * 触发事件
 */
export const trigger = (event: string, data?: any): void => {
  if (isMiniProgram()) {
    Taro.eventCenter.trigger(event, data);
  } else {
    window.dispatchEvent(new CustomEvent(event, { detail: data }));
  }
};

/**
 * 只监听一次
 */
export const once = (event: string, handler: EventHandler): void => {
  const wrappedHandler = (...args: any[]) => {
    off(event, wrappedHandler);
    handler(...args);
  };
  on(event, wrappedHandler);
};

/**
 * 清除所有事件监听
 */
export const offAll = (event?: string): void => {
  const events = event ? [event] : [...handlers.keys()];
  for (const eventName of events) {
    const eventHandlers = [...(handlers.get(eventName) || [])];
    eventHandlers.forEach((handler) => off(eventName, handler));
  }
};

export default {
  on,
  off,
  trigger,
  once,
  offAll,
};
