type AddCartItemInput = import('@mall/shared-types').AddCartItemInput;
type AddOrderLogisticsTraceInput = import('@mall/shared-types').AddOrderLogisticsTraceInput;
type AddressInput = import('@mall/shared-types').AddressInput;
type AdminAfterSaleQuery = import('@mall/shared-types').AdminAfterSaleQuery;
type AdminLoginInput = import('@mall/shared-types').AdminLoginInput;
type AdminLoginResult = import('@mall/shared-types').AdminLoginResult;
type AdminOrderQuery = import('@mall/shared-types').AdminOrderQuery;
type AdminProductQuery = import('@mall/shared-types').AdminProductQuery;
type AdminUser = import('@mall/shared-types').AdminUser;
type AdminUserQuery = import('@mall/shared-types').AdminUserQuery;
type AfterSale = import('@mall/shared-types').AfterSale;
type AfterSaleListResult = import('@mall/shared-types').AfterSaleListResult;
type ApproveAfterSaleInput = import('@mall/shared-types').ApproveAfterSaleInput;
type CancelOrderInput = import('@mall/shared-types').CancelOrderInput;
type Cart = import('@mall/shared-types').Cart;
type Category = import('@mall/shared-types').Category;
type CategoryInput = import('@mall/shared-types').CategoryInput;
type Coupon = import('@mall/shared-types').Coupon;
type CouponInput = import('@mall/shared-types').CouponInput;
type CouponQuery = import('@mall/shared-types').CouponQuery;
type CouponStatus = import('@mall/shared-types').CouponStatus;
type ConfirmReturnReceivedInput = import('@mall/shared-types').ConfirmReturnReceivedInput;
type CreateAfterSaleInput = import('@mall/shared-types').CreateAfterSaleInput;
type CreateOrderInput = import('@mall/shared-types').CreateOrderInput;
type CreateRefundInput = import('@mall/shared-types').CreateRefundInput;
type DashboardOverview = import('@mall/shared-types').DashboardOverview;
type MiniappLoginResult = import('@mall/shared-types').MiniappLoginResult;
type MiniappUser = import('@mall/shared-types').MiniappUser;
type Order = import('@mall/shared-types').Order;
type OrderListResult = import('@mall/shared-types').OrderListResult;
type PointLedger = import('@mall/shared-types').PointLedger;
type PointRedeemRules = import('@mall/shared-types').PointRedeemRules;
type Product = import('@mall/shared-types').Product;
type ProductInput = import('@mall/shared-types').ProductInput;
type ProductQuery = import('@mall/shared-types').ProductQuery;
type ProductStatus = import('@mall/shared-types').ProductStatus;
type Refund = import('@mall/shared-types').Refund;
type RejectAfterSaleInput = import('@mall/shared-types').RejectAfterSaleInput;
type ShipOrderInput = import('@mall/shared-types').ShipOrderInput;
type SubmitReturnLogisticsInput = import('@mall/shared-types').SubmitReturnLogisticsInput;
type UpdateAddressInput = import('@mall/shared-types').UpdateAddressInput;
type UpdateCategoryInput = import('@mall/shared-types').UpdateCategoryInput;
type UpdateCartItemCheckedInput = import('@mall/shared-types').UpdateCartItemCheckedInput;
type UpdateCartItemInput = import('@mall/shared-types').UpdateCartItemInput;
type UpdatePointRedeemRulesInput = import('@mall/shared-types').UpdatePointRedeemRulesInput;
type UpdateRefundStatusInput = import('@mall/shared-types').UpdateRefundStatusInput;
type UploadResult = import('@mall/shared-types').UploadResult;
type UserAddress = import('@mall/shared-types').UserAddress;
type UserAfterSaleQuery = import('@mall/shared-types').UserAfterSaleQuery;
type UserCoupon = import('@mall/shared-types').UserCoupon;
type UserOrderQuery = import('@mall/shared-types').UserOrderQuery;
type WechatNotifyInput = import('@mall/shared-types').WechatNotifyInput;
type WechatNotifyResult = import('@mall/shared-types').WechatNotifyResult;
type WechatPrepayResult = import('@mall/shared-types').WechatPrepayResult;
type WechatRefundNotifyInput = import('@mall/shared-types').WechatRefundNotifyInput;
type WechatRefundNotifyResult = import('@mall/shared-types').WechatRefundNotifyResult;
type WxLoginInput = import('@mall/shared-types').WxLoginInput;

export interface ApiSuccessResponse<T> {
  code: number;
  message: string;
  data: T;
  timestamp: string;
  path: string;
}

export interface ApiErrorResponse {
  code: number;
  message: string;
  error?: unknown;
  timestamp: string;
  path: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T>;
export type ApiPayload<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface ApiSdkConfig {
  baseUrl: string;
  getAccessToken?: () => string | undefined;
}

export interface FetchApiRequester {
  request<T>(path: string, options?: RequestInit): Promise<T>;
}

export type ApiRequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface DataApiRequestOptions {
  method?: ApiRequestMethod;
  data?: unknown;
}

export interface DataApiRequester {
  request<T>(path: string, options?: DataApiRequestOptions): Promise<T>;
}

export class ApiClientError extends Error {
  override readonly name = 'ApiClientError';
  readonly code?: number;
  readonly path?: string;
  readonly error?: unknown;

  constructor(
    message: string,
    readonly status: number,
    readonly payload?: unknown,
  ) {
    super(message);

    if (isApiErrorResponse(payload)) {
      this.code = payload.code;
      this.path = payload.path;
      this.error = payload.error;
    }
  }
}

export function isApiSuccessResponse<T>(payload: unknown): payload is ApiSuccessResponse<T> {
  return isApiResponseLike(payload) && payload.code === 0 && 'data' in payload;
}

export function isApiErrorResponse(payload: unknown): payload is ApiErrorResponse {
  return isApiResponseLike(payload) && payload.code !== 0;
}

export function unwrapApiResponse<T>(payload: unknown, status = 200): T {
  if (status < 200 || status >= 300) {
    throw createApiClientError(payload, status);
  }

  if (!isApiSuccessResponse<T>(payload)) {
    throw createApiClientError(payload, status);
  }

  return payload.data;
}

export function getApiErrorMessage(error: unknown, fallback = '请求失败') {
  if (error instanceof ApiClientError) {
    return error.message || fallback;
  }

  if (isApiErrorResponse(error)) {
    return error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}

export function createApiClient(config: ApiSdkConfig) {
  const baseUrl = normalizeBaseUrl(config.baseUrl);

  return {
    async request<T>(path: string, options: RequestInit = {}) {
      const token = config.getAccessToken?.();
      const response = await fetch(joinUrl(baseUrl, path), {
        ...options,
        headers: createHeaders(options.headers, options.body, token),
      });
      const payload = await readJson(response);

      return unwrapApiResponse<T>(payload, response.status);
    },
  };
}

export function createAdminApi(client: FetchApiRequester) {
  return {
    loginAdmin(input: AdminLoginInput) {
      return client.request<AdminLoginResult>('/api/admin/auth/login', jsonRequest('POST', input));
    },

    fetchCategories() {
      return client.request<Category[]>('/api/admin/categories/tree');
    },

    fetchDashboardOverview() {
      return client.request<DashboardOverview>('/api/admin/statistics/overview');
    },

    fetchAdminPointRedeemRules() {
      return client.request<PointRedeemRules>('/api/admin/points/rules');
    },

    updateAdminPointRedeemRules(input: UpdatePointRedeemRulesInput) {
      return client.request<PointRedeemRules>(
        '/api/admin/points/rules',
        jsonRequest('PATCH', input),
      );
    },

    resetAdminPointRedeemRules() {
      return client.request<PointRedeemRules>('/api/admin/points/rules', { method: 'DELETE' });
    },

    fetchCoupons(params: CouponQuery = {}) {
      return client.request<Coupon[]>(withQuery('/api/admin/coupons', params));
    },

    createCoupon(input: CouponInput) {
      return client.request<Coupon>('/api/admin/coupons', jsonRequest('POST', input));
    },

    updateCoupon(id: string, input: Partial<CouponInput>) {
      return client.request<Coupon>(`/api/admin/coupons/${id}`, jsonRequest('PATCH', input));
    },

    updateCouponStatus(id: string, status: CouponStatus) {
      return client.request<Coupon>(
        `/api/admin/coupons/${id}/status`,
        jsonRequest('PATCH', { status }),
      );
    },

    fetchUsers(params: AdminUserQuery = {}) {
      return client.request<AdminUser[]>(withQuery('/api/admin/users', params));
    },

    createCategory(input: CategoryInput) {
      return client.request<Category>('/api/admin/categories', jsonRequest('POST', input));
    },

    updateCategory(id: string, input: UpdateCategoryInput) {
      return client.request<Category>(`/api/admin/categories/${id}`, jsonRequest('PATCH', input));
    },

    deleteCategory(id: string) {
      return client.request<Category>(`/api/admin/categories/${id}`, { method: 'DELETE' });
    },

    fetchProducts(params: AdminProductQuery = {}) {
      return client.request<Product[]>(withQuery('/api/admin/products', params));
    },

    createProduct(input: ProductInput) {
      return client.request<Product>('/api/admin/products', jsonRequest('POST', input));
    },

    updateProduct(id: string, input: Partial<ProductInput>) {
      return client.request<Product>(`/api/admin/products/${id}`, jsonRequest('PATCH', input));
    },

    updateProductStatus(id: string, status: ProductStatus) {
      return client.request<Product>(
        `/api/admin/products/${id}/status`,
        jsonRequest('PATCH', { status }),
      );
    },

    deleteProduct(id: string) {
      return client.request<Product>(`/api/admin/products/${id}`, { method: 'DELETE' });
    },

    uploadImage(file: File) {
      const formData = new FormData();
      formData.append('file', file);

      return client.request<UploadResult>('/api/admin/uploads/images', {
        method: 'POST',
        body: formData,
      });
    },

    fetchOrders(params: AdminOrderQuery = {}) {
      return client.request<OrderListResult>(withQuery('/api/admin/orders', params));
    },

    cancelOrder(id: string, input: CancelOrderInput = { reason: '后台取消' }) {
      return client.request<Order>(`/api/admin/orders/${id}/cancel`, jsonRequest('PATCH', input));
    },

    shipOrder(id: string, input: ShipOrderInput) {
      return client.request<Order>(`/api/admin/orders/${id}/ship`, jsonRequest('PATCH', input));
    },

    addOrderLogisticsTrace(id: string, input: AddOrderLogisticsTraceInput) {
      return client.request<Order>(
        `/api/admin/orders/${id}/logistics-traces`,
        jsonRequest('POST', input),
      );
    },

    updateRefundStatus(id: string, input: UpdateRefundStatusInput) {
      return client.request<Refund>(`/api/admin/refunds/${id}/status`, jsonRequest('PATCH', input));
    },

    retryRefund(id: string) {
      return client.request<Refund>(`/api/admin/refunds/${id}/retry`, jsonRequest('POST', {}));
    },

    fetchAfterSales(params: AdminAfterSaleQuery = {}) {
      return client.request<AfterSaleListResult>(withQuery('/api/admin/after-sales', params));
    },

    fetchAfterSaleDetail(id: string) {
      return client.request<AfterSale>(`/api/admin/after-sales/${id}`);
    },

    approveAfterSale(id: string, input: ApproveAfterSaleInput = {}) {
      return client.request<AfterSale>(
        `/api/admin/after-sales/${id}/approve`,
        jsonRequest('PATCH', input),
      );
    },

    rejectAfterSale(id: string, input: RejectAfterSaleInput) {
      return client.request<AfterSale>(
        `/api/admin/after-sales/${id}/reject`,
        jsonRequest('PATCH', input),
      );
    },

    confirmReturnReceived(id: string, input: ConfirmReturnReceivedInput = {}) {
      return client.request<AfterSale>(
        `/api/admin/after-sales/${id}/confirm-return-received`,
        jsonRequest('PATCH', input),
      );
    },

    triggerAfterSaleRefund(id: string) {
      return client.request<AfterSale>(`/api/admin/after-sales/${id}/trigger-refund`, {
        method: 'PATCH',
      });
    },
  };
}

export function createMiniappApi(client: DataApiRequester) {
  return {
    wxLogin(input: WxLoginInput) {
      return client.request<MiniappLoginResult>('/api/auth/wx-login', dataRequest('POST', input));
    },

    fetchProfile() {
      return client.request<MiniappUser>('/api/auth/profile');
    },

    fetchPointLedger() {
      return client.request<PointLedger[]>('/api/points/ledger');
    },

    fetchPointRedeemRules() {
      return client.request<PointRedeemRules>('/api/points/rules');
    },

    fetchAddresses() {
      return client.request<UserAddress[]>('/api/addresses');
    },

    fetchDefaultAddress() {
      return client.request<UserAddress | null>('/api/addresses/default');
    },

    createAddress(input: AddressInput) {
      return client.request<UserAddress>('/api/addresses', dataRequest('POST', input));
    },

    updateAddress(id: string, input: UpdateAddressInput) {
      return client.request<UserAddress>(`/api/addresses/${id}`, dataRequest('PATCH', input));
    },

    setDefaultAddress(id: string) {
      return client.request<UserAddress>(`/api/addresses/${id}/default`, { method: 'PATCH' });
    },

    deleteAddress(id: string) {
      return client.request<UserAddress>(`/api/addresses/${id}`, { method: 'DELETE' });
    },

    refreshToken(refreshToken: string) {
      return client.request<MiniappLoginResult>(
        '/api/auth/refresh-token',
        dataRequest('POST', { refreshToken }),
      );
    },

    fetchCategoryTree() {
      return client.request<Category[]>('/api/categories/tree');
    },

    fetchProducts(query: ProductQuery = {}) {
      return client.request<Product[]>(withQuery('/api/products', query));
    },

    fetchProductDetail(id: string) {
      return client.request<Product>(`/api/products/${id}`);
    },

    fetchCart() {
      return client.request<Cart>('/api/cart');
    },

    fetchClaimableCoupons() {
      return client.request<Coupon[]>('/api/coupons/claimable');
    },

    claimCoupon(id: string) {
      return client.request<UserCoupon>(`/api/coupons/${id}/claim`, dataRequest('POST', {}));
    },

    fetchMyCoupons() {
      return client.request<UserCoupon[]>('/api/coupons/my');
    },

    fetchAvailableCouponsForOrder(amount: number | string) {
      return client.request<UserCoupon[]>(
        withQuery('/api/coupons/available-for-order', { amount }),
      );
    },

    addCartItem(input: AddCartItemInput) {
      return client.request<Cart>('/api/cart/items', dataRequest('POST', input));
    },

    updateCartItemQuantity(skuId: string, quantity: number) {
      const input: UpdateCartItemInput = { quantity };
      return client.request<Cart>(`/api/cart/items/${skuId}`, dataRequest('PATCH', input));
    },

    updateCartItemChecked(skuId: string, checked: boolean) {
      const input: UpdateCartItemCheckedInput = { checked };
      return client.request<Cart>(`/api/cart/items/${skuId}/checked`, dataRequest('PATCH', input));
    },

    removeCartItem(skuId: string) {
      return client.request<Cart>(`/api/cart/items/${skuId}`, { method: 'DELETE' });
    },

    createOrderFromCart(input: CreateOrderInput = {}) {
      return client.request<Order>('/api/orders', dataRequest('POST', input));
    },

    fetchOrders(query: UserOrderQuery = {}) {
      return client.request<OrderListResult>(withQuery('/api/orders', query));
    },

    fetchOrderDetail(id: string) {
      return client.request<Order>(`/api/orders/${id}`);
    },

    cancelOrder(id: string, reason?: string) {
      const input: CancelOrderInput = { reason };
      return client.request<Order>(`/api/orders/${id}/cancel`, dataRequest('PATCH', input));
    },

    completeOrder(id: string) {
      return client.request<Order>(`/api/orders/${id}/complete`, { method: 'PATCH' });
    },

    createWechatPrepay(orderId: string) {
      return client.request<WechatPrepayResult>(
        '/api/payments/wechat/prepay',
        dataRequest('POST', { orderId }),
      );
    },

    mockWechatPayNotify(input: WechatNotifyInput) {
      return client.request<WechatNotifyResult>(
        '/api/payments/wechat/notify',
        dataRequest('POST', input),
      );
    },

    createRefund(input: CreateRefundInput) {
      return client.request<Refund>('/api/refunds', dataRequest('POST', input));
    },

    createAfterSale(input: CreateAfterSaleInput) {
      return client.request<AfterSale>('/api/after-sales', dataRequest('POST', input));
    },

    fetchAfterSales(query: UserAfterSaleQuery = {}) {
      return client.request<AfterSaleListResult>(withQuery('/api/after-sales', query));
    },

    fetchAfterSaleDetail(id: string) {
      return client.request<AfterSale>(`/api/after-sales/${id}`);
    },

    cancelAfterSale(id: string) {
      return client.request<AfterSale>(`/api/after-sales/${id}/cancel`, {
        method: 'PATCH',
      });
    },

    submitReturnLogistics(id: string, input: SubmitReturnLogisticsInput) {
      return client.request<AfterSale>(
        `/api/after-sales/${id}/return-logistics`,
        dataRequest('PATCH', input),
      );
    },

    mockWechatRefundNotify(input: WechatRefundNotifyInput) {
      return client.request<WechatRefundNotifyResult>(
        '/api/refunds/wechat/notify',
        dataRequest('POST', input),
      );
    },
  };
}

export function joinUrl(baseUrl: string, path: string) {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${normalizedBaseUrl}${normalizedPath}`;
}

function jsonRequest(method: ApiRequestMethod, input: unknown): RequestInit {
  return {
    method,
    body: JSON.stringify(input),
  };
}

function dataRequest(method: ApiRequestMethod, input: unknown): DataApiRequestOptions {
  return {
    method,
    data: input,
  };
}

function withQuery(path: string, params: object) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }

  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

function createApiClientError(payload: unknown, status: number) {
  if (isApiErrorResponse(payload)) {
    return new ApiClientError(payload.message || 'Request failed', status, payload);
  }

  if (isApiResponseLike(payload)) {
    return new ApiClientError(payload.message || 'Request failed', status, payload);
  }

  return new ApiClientError('Request failed', status, payload);
}

function createHeaders(headers: RequestInit['headers'], body: RequestInit['body'], token?: string) {
  const nextHeaders = new Headers(headers);
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  if (!isFormData && !nextHeaders.has('Content-Type')) {
    nextHeaders.set('Content-Type', 'application/json');
  }

  if (token && !nextHeaders.has('Authorization')) {
    nextHeaders.set('Authorization', `Bearer ${token}`);
  }

  return nextHeaders;
}

async function readJson(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    return undefined;
  }
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/$/, '');
}

function isApiResponseLike(payload: unknown): payload is {
  code: number;
  message: string;
  timestamp?: string;
  path?: string;
} {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'code' in payload &&
    'message' in payload &&
    typeof payload.code === 'number' &&
    typeof payload.message === 'string'
  );
}
