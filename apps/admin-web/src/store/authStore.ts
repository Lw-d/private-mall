import { create } from 'zustand';

interface AuthState {
  accessToken?: string;
  nickname?: string;
  setSession: (input: { accessToken: string; nickname?: string | null }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: localStorage.getItem('admin_access_token') ?? undefined,
  nickname: localStorage.getItem('admin_nickname') ?? undefined,
  setSession: ({ accessToken, nickname }) => {
    localStorage.setItem('admin_access_token', accessToken);
    if (nickname) {
      localStorage.setItem('admin_nickname', nickname);
    }
    set({ accessToken, nickname: nickname ?? undefined });
  },
  logout: () => {
    localStorage.removeItem('admin_access_token');
    localStorage.removeItem('admin_nickname');
    set({ accessToken: undefined, nickname: undefined });
  },
}));
