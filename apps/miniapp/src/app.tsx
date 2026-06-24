import type { PropsWithChildren } from 'react';
import { useEffect } from 'react';
import Taro from '@tarojs/taro';

import { showApiError } from './api/error';
import { loginWithWechat } from './lib/wechatLogin';
import { SESSION_EXPIRED_EVENT } from './store/sessionEvents';
import { useSessionStore } from './store/sessionStore';
import './app.css';

let sessionExpiredTask: Promise<void> | undefined;

function requestLoginAfterSessionExpired() {
  if (sessionExpiredTask) {
    return;
  }

  sessionExpiredTask = (async () => {
    const result = await Taro.showModal({
      title: '登录已失效',
      content: '登录状态已过期，是否立即重新登录？',
      confirmText: '重新登录',
      cancelText: '暂不登录',
    });

    if (!result.confirm) {
      return;
    }

    try {
      await loginWithWechat();
      await Taro.showToast({ title: '登录成功', icon: 'success' });
    } catch (error) {
      showApiError(error, '登录失败');
    }
  })().finally(() => {
    sessionExpiredTask = undefined;
  });
}

export default function App({ children }: PropsWithChildren) {
  const hydrateSession = useSessionStore((state) => state.hydrateSession);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    Taro.eventCenter.on(SESSION_EXPIRED_EVENT, requestLoginAfterSessionExpired);

    return () => {
      Taro.eventCenter.off(SESSION_EXPIRED_EVENT, requestLoginAfterSessionExpired);
    };
  }, []);

  return children;
}
