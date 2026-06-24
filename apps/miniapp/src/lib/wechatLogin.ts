import Taro from '@tarojs/taro';

import { wxLogin } from '../api/authApi';
import { useSessionStore } from '../store/sessionStore';

interface WechatProfile {
  nickname?: string;
  avatarUrl?: string;
}

export function normalizeWechatAvatarUrl(avatarUrl?: string | null) {
  const normalizedAvatarUrl = avatarUrl?.trim();

  if (!normalizedAvatarUrl) {
    return undefined;
  }

  return normalizedAvatarUrl.replace(/^http:\/\//i, 'https://');
}

function normalizeWechatProfile(userInfo?: { nickName?: string; avatarUrl?: string }) {
  const nickname = userInfo?.nickName?.trim();
  const avatarUrl = normalizeWechatAvatarUrl(userInfo?.avatarUrl);

  return {
    nickname: nickname || undefined,
    avatarUrl: avatarUrl || undefined,
  };
}

async function readUserProfile(): Promise<WechatProfile> {
  try {
    const profile = await Taro.getUserProfile({
      desc: '用于完善会员资料',
    });

    return normalizeWechatProfile(profile.userInfo);
  } catch {
    try {
      const profile = await Taro.getUserInfo();

      return normalizeWechatProfile(profile.userInfo);
    } catch {
      return {};
    }
  }
}

export async function loginWithWechat() {
  const [{ code }, profile] = await Promise.all([Taro.login(), readUserProfile()]);
  const result = await wxLogin({
    code,
    nickname: profile.nickname,
    avatarUrl: profile.avatarUrl,
  });

  useSessionStore.getState().setSession({
    ...result,
    user: {
      ...result.user,
      nickname: result.user.nickname ?? profile.nickname,
      avatarUrl: normalizeWechatAvatarUrl(result.user.avatarUrl ?? profile.avatarUrl),
    },
  });

  return result;
}
