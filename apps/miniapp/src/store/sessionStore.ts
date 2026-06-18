import Taro from '@tarojs/taro';
import { create } from 'zustand';

import { MiniappUser } from '../api/types';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_PROFILE_KEY } from './storageKeys';

interface SessionState {
  accessToken?: string;
  refreshToken?: string;
  user?: MiniappUser;
  isHydrated: boolean;
  setSession: (session: { accessToken: string; refreshToken: string; user: MiniappUser }) => void;
  updateUser: (user: MiniappUser) => void;
  hydrateSession: () => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  accessToken: undefined,
  refreshToken: undefined,
  user: undefined,
  isHydrated: false,
  setSession: (session) => {
    Taro.setStorageSync(ACCESS_TOKEN_KEY, session.accessToken);
    Taro.setStorageSync(REFRESH_TOKEN_KEY, session.refreshToken);
    Taro.setStorageSync(USER_PROFILE_KEY, session.user);
    set({ ...session, isHydrated: true });
  },
  updateUser: (user) => {
    Taro.setStorageSync(USER_PROFILE_KEY, user);
    set({ user });
  },
  hydrateSession: () => {
    const accessToken = Taro.getStorageSync<string>(ACCESS_TOKEN_KEY) || undefined;
    const refreshToken = Taro.getStorageSync<string>(REFRESH_TOKEN_KEY) || undefined;
    const user = Taro.getStorageSync<MiniappUser>(USER_PROFILE_KEY) || undefined;

    set({
      accessToken,
      refreshToken,
      user,
      isHydrated: true,
    });
  },
  clearSession: () => {
    Taro.removeStorageSync(ACCESS_TOKEN_KEY);
    Taro.removeStorageSync(REFRESH_TOKEN_KEY);
    Taro.removeStorageSync(USER_PROFILE_KEY);
    set({
      accessToken: undefined,
      refreshToken: undefined,
      user: undefined,
      isHydrated: true,
    });
  },
}));
