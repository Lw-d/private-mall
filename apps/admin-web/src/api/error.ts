import { ApiClientError, getApiErrorMessage } from '@mall/api-sdk';

import { appMessage } from '../utils/appMessage';

export function showApiError(error: unknown, fallback: string) {
  if (error instanceof ApiClientError && error.status === 401) {
    return;
  }

  appMessage.error(getApiErrorMessage(error, fallback));
}
