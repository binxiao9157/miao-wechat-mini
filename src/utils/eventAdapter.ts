/**
 * 事件适配器
 * 统一 window.dispatchEvent（Web）和 Taro.eventCenter（小程序）的调用
 */

import Taro from '@tarojs/taro';

const isMiniProgram = process.env.TARO_ENV === 'weapp';

/**
 * 监听事件
 */
export const on = (event: string, handler: Function): void => {
  if (isMiniProgram) {
    Taro.eventCenter.on(event, handler);
  } else {
    window.addEventListener(event, handler as EventListener);
  }
};

/**
 * 移除事件监听
 */
export const off = (event: string, handler: Function): void => {
  if (isMiniProgram) {
    Taro.eventCenter.off(event, handler);
  } else {
    window.removeEventListener(event, handler as EventListener);
  }
};

/**
 * 触发事件
 */
export const trigger = (event: string, data?: any): void => {
  if (isMiniProgram) {
    Taro.eventCenter.trigger(event, data);
  } else {
    window.dispatchEvent(new CustomEvent(event, { detail: data }));
  }
};

/**
 * 只监听一次
 */
export const once = (event: string, handler: Function): void => {
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
  if (isMiniProgram) {
    if (event) {
      Taro.eventCenter.off(event);
    } else {
      // Taro 没有清除所有事件的方法，需要手动处理
    }
  } else {
    if (event) {
      // 无法获取特定事件的所有监听器，只能清除具名函数
    }
  }
};

export default {
  on,
  off,
  trigger,
  once,
  offAll,
};