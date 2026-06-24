import Taro from '@tarojs/taro';
import {
  ApiClientError,
  unwrapApiResponse,
  type ApiErrorResponse,
  type ApiSuccessResponse,
} from '@mall/api-sdk';

import { ACCESS_TOKEN_KEY } from '../store/storageKeys';
import { notifySessionExpired } from '../store/sessionEvents';
import { useSessionStore } from '../store/sessionStore';

export type ApiResponse<T> = ApiSuccessResponse<T>;
export { ApiClientError as ApiError };

export const API_BASE_URL = __API_BASE_URL__.replace(/\/$/, '');

type RequestOptions = Omit<Taro.request.Option, 'url'>;

export async function request<T>(path: string, options: RequestOptions = {}) {
  const token = Taro.getStorageSync<string>(ACCESS_TOKEN_KEY);
  const response = await Taro.request<ApiSuccessResponse<T> | ApiErrorResponse>({
    url: `${API_BASE_URL}${path}`,
    method: options.method ?? 'GET',
    data: options.data,
    header: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.header,
    },
  });

  if (response.statusCode === 401 && token) {
    useSessionStore.getState().clearSession();
    notifySessionExpired();
  }

  return unwrapApiResponse<T>(response.data, response.statusCode);
}

export function resolveAssetUrl(url?: string | null) {
  if (!url) {
    return undefined;
  }

  if (/^https?:\/\//.test(url)) {
    return url;
  }

  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
}
