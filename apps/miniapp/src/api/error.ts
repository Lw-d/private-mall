import { getApiErrorMessage } from '@mall/api-sdk';
import Taro from '@tarojs/taro';

export function showApiError(error: unknown, fallback: string) {
  void Taro.showToast({
    title: getApiErrorMessage(error, fallback),
    icon: 'none',
  });
}
