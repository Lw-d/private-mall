import Taro from '@tarojs/taro';

export const SESSION_EXPIRED_EVENT = 'session:expired';

export function notifySessionExpired() {
  Taro.eventCenter.trigger(SESSION_EXPIRED_EVENT);
}
