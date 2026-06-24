import { ApiClientError, createApiClient, type ApiSuccessResponse } from '@mall/api-sdk';

import { emitAdminAuthExpired } from '../store/authEvents';

export type ApiResponse<T> = ApiSuccessResponse<T>;
export { ApiClientError as ApiError };

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const rawApiClient = createApiClient({
  baseUrl: API_BASE_URL,
  getAccessToken: () => localStorage.getItem('admin_access_token') ?? undefined,
});

export const apiClient = {
  async request<T>(path: string, options: RequestInit = {}) {
    try {
      return await rawApiClient.request<T>(path, options);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        emitAdminAuthExpired();
      }

      throw error;
    }
  },
};

export function request<T>(path: string, options: RequestInit = {}) {
  return apiClient.request<T>(path, options);
}
