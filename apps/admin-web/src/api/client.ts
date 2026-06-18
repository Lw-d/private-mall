import { ApiClientError, createApiClient, type ApiSuccessResponse } from '@mall/api-sdk';

export type ApiResponse<T> = ApiSuccessResponse<T>;
export { ApiClientError as ApiError };

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
export const apiClient = createApiClient({
  baseUrl: API_BASE_URL,
  getAccessToken: () => localStorage.getItem('admin_access_token') ?? undefined,
});

export async function request<T>(path: string, options: RequestInit = {}) {
  return apiClient.request<T>(path, options);
}
