import { getApiErrorMessage } from '@mall/api-sdk';
import { message } from 'antd';

export function showApiError(error: unknown, fallback: string) {
  message.error(getApiErrorMessage(error, fallback));
}
