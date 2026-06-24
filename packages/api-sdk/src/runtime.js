export class ApiClientError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.payload = payload;

    if (isApiErrorResponse(payload)) {
      this.code = payload.code;
      this.path = payload.path;
      this.error = payload.error;
    }
  }
}

export function isApiSuccessResponse(payload) {
  return isApiResponseLike(payload) && payload.code === 0 && 'data' in payload;
}

export function isApiErrorResponse(payload) {
  return isApiResponseLike(payload) && payload.code !== 0;
}

export function unwrapApiResponse(payload, status = 200) {
  if (status < 200 || status >= 300) {
    throw createApiClientError(payload, status);
  }

  if (!isApiSuccessResponse(payload)) {
    throw createApiClientError(payload, status);
  }

  return payload.data;
}

export function getApiErrorMessage(error, fallback = '请求失败') {
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

export function createApiClient(config) {
  const baseUrl = normalizeBaseUrl(config.baseUrl);

  return {
    async request(path, options = {}) {
      const token = config.getAccessToken ? config.getAccessToken() : undefined;
      const response = await fetch(
        joinUrl(baseUrl, path),
        Object.assign({}, options, {
          headers: createHeaders(options.headers, options.body, token),
        }),
      );
      const payload = await readJson(response);

      return unwrapApiResponse(payload, response.status);
    },
  };
}

export function createAdminApi(client) {
  return {
    loginAdmin(input) {
      return client.request('/api/admin/auth/login', jsonRequest('POST', input));
    },

    fetchCategories() {
      return client.request('/api/admin/categories/tree');
    },

    fetchDashboardOverview() {
      return client.request('/api/admin/statistics/overview');
    },

    fetchAdminPointRedeemRules() {
      return client.request('/api/admin/points/rules');
    },

    updateAdminPointRedeemRules(input) {
      return client.request('/api/admin/points/rules', jsonRequest('PATCH', input));
    },

    resetAdminPointRedeemRules() {
      return client.request('/api/admin/points/rules', { method: 'DELETE' });
    },

    fetchCoupons(params = {}) {
      return client.request(withQuery('/api/admin/coupons', params));
    },

    createCoupon(input) {
      return client.request('/api/admin/coupons', jsonRequest('POST', input));
    },

    updateCoupon(id, input) {
      return client.request(`/api/admin/coupons/${id}`, jsonRequest('PATCH', input));
    },

    updateCouponStatus(id, status) {
      return client.request(`/api/admin/coupons/${id}/status`, jsonRequest('PATCH', { status }));
    },

    fetchUsers(params = {}) {
      return client.request(withQuery('/api/admin/users', params));
    },

    createCategory(input) {
      return client.request('/api/admin/categories', jsonRequest('POST', input));
    },

    updateCategory(id, input) {
      return client.request(`/api/admin/categories/${id}`, jsonRequest('PATCH', input));
    },

    deleteCategory(id) {
      return client.request(`/api/admin/categories/${id}`, { method: 'DELETE' });
    },

    fetchProducts(params = {}) {
      return client.request(withQuery('/api/admin/products', params));
    },

    fetchHomeBanners() {
      return client.request('/api/admin/products/home-banners');
    },

    updateHomeBanners(input) {
      return client.request('/api/admin/products/home-banners', jsonRequest('PATCH', input));
    },

    createProduct(input) {
      return client.request('/api/admin/products', jsonRequest('POST', input));
    },

    updateProduct(id, input) {
      return client.request(`/api/admin/products/${id}`, jsonRequest('PATCH', input));
    },

    updateProductStatus(id, status) {
      return client.request(`/api/admin/products/${id}/status`, jsonRequest('PATCH', { status }));
    },

    deleteProduct(id) {
      return client.request(`/api/admin/products/${id}`, { method: 'DELETE' });
    },

    uploadImage(file) {
      const formData = new FormData();
      formData.append('file', file);

      return client.request('/api/admin/uploads/images', {
        method: 'POST',
        body: formData,
      });
    },

    fetchOrders(params = {}) {
      return client.request(withQuery('/api/admin/orders', params));
    },

    cancelOrder(id, input = { reason: '后台取消' }) {
      return client.request(`/api/admin/orders/${id}/cancel`, jsonRequest('PATCH', input));
    },

    shipOrder(id, input) {
      return client.request(`/api/admin/orders/${id}/ship`, jsonRequest('PATCH', input));
    },

    addOrderLogisticsTrace(id, input) {
      return client.request(`/api/admin/orders/${id}/logistics-traces`, jsonRequest('POST', input));
    },

    refreshOrderLogisticsTraces(id) {
      return client.request(`/api/admin/orders/${id}/logistics-traces/refresh`, {
        method: 'POST',
      });
    },

    updateRefundStatus(id, input) {
      return client.request(`/api/admin/refunds/${id}/status`, jsonRequest('PATCH', input));
    },

    retryRefund(id) {
      return client.request(`/api/admin/refunds/${id}/retry`, jsonRequest('POST', {}));
    },

    fetchAfterSales(params = {}) {
      return client.request(withQuery('/api/admin/after-sales', params));
    },

    fetchAfterSaleDetail(id) {
      return client.request(`/api/admin/after-sales/${id}`);
    },

    approveAfterSale(id, input = {}) {
      return client.request(`/api/admin/after-sales/${id}/approve`, jsonRequest('PATCH', input));
    },

    rejectAfterSale(id, input) {
      return client.request(`/api/admin/after-sales/${id}/reject`, jsonRequest('PATCH', input));
    },

    confirmReturnReceived(id, input = {}) {
      return client.request(
        `/api/admin/after-sales/${id}/confirm-return-received`,
        jsonRequest('PATCH', input),
      );
    },

    triggerAfterSaleRefund(id) {
      return client.request(`/api/admin/after-sales/${id}/trigger-refund`, { method: 'PATCH' });
    },
  };
}

export function createMiniappApi(client) {
  return {
    wxLogin(input) {
      return client.request('/api/auth/wx-login', dataRequest('POST', input));
    },

    fetchProfile() {
      return client.request('/api/auth/profile');
    },

    fetchPointLedger() {
      return client.request('/api/points/ledger');
    },

    fetchPointRedeemRules() {
      return client.request('/api/points/rules');
    },

    fetchAddresses() {
      return client.request('/api/addresses');
    },

    fetchDefaultAddress() {
      return client.request('/api/addresses/default');
    },

    createAddress(input) {
      return client.request('/api/addresses', dataRequest('POST', input));
    },

    updateAddress(id, input) {
      return client.request(`/api/addresses/${id}`, dataRequest('PATCH', input));
    },

    setDefaultAddress(id) {
      return client.request(`/api/addresses/${id}/default`, { method: 'PATCH' });
    },

    deleteAddress(id) {
      return client.request(`/api/addresses/${id}`, { method: 'DELETE' });
    },

    refreshToken(refreshToken) {
      return client.request('/api/auth/refresh-token', dataRequest('POST', { refreshToken }));
    },

    fetchCategoryTree() {
      return client.request('/api/categories/tree');
    },

    fetchProducts(query = {}) {
      return client.request(withQuery('/api/products', query));
    },

    fetchHomeBanners() {
      return client.request('/api/products/home-banners');
    },

    fetchProductDetail(id) {
      return client.request(`/api/products/${id}`);
    },

    fetchCart() {
      return client.request('/api/cart');
    },

    fetchClaimableCoupons() {
      return client.request('/api/coupons/claimable');
    },

    claimCoupon(id) {
      return client.request(`/api/coupons/${id}/claim`, dataRequest('POST', {}));
    },

    fetchMyCoupons() {
      return client.request('/api/coupons/my');
    },

    fetchAvailableCouponsForOrder(amount) {
      return client.request(withQuery('/api/coupons/available-for-order', { amount }));
    },

    addCartItem(input) {
      return client.request('/api/cart/items', dataRequest('POST', input));
    },

    updateCartItemQuantity(skuId, quantity) {
      const input = { quantity };
      return client.request(`/api/cart/items/${skuId}`, dataRequest('PATCH', input));
    },

    updateCartItemChecked(skuId, checked) {
      const input = { checked };
      return client.request(`/api/cart/items/${skuId}/checked`, dataRequest('PATCH', input));
    },

    removeCartItem(skuId) {
      return client.request(`/api/cart/items/${skuId}`, { method: 'DELETE' });
    },

    removeCheckedCartItems() {
      return client.request('/api/cart/items/checked', { method: 'DELETE' });
    },

    clearCart() {
      return client.request('/api/cart/items', { method: 'DELETE' });
    },

    createOrderFromCart(input = {}) {
      return client.request('/api/orders', dataRequest('POST', input));
    },

    fetchOrders(query = {}) {
      return client.request(withQuery('/api/orders', query));
    },

    fetchOrderDetail(id) {
      return client.request(`/api/orders/${id}`);
    },

    cancelOrder(id, reason) {
      const input = { reason };
      return client.request(`/api/orders/${id}/cancel`, dataRequest('PATCH', input));
    },

    completeOrder(id) {
      return client.request(`/api/orders/${id}/complete`, { method: 'PATCH' });
    },

    createWechatPrepay(orderId) {
      return client.request('/api/payments/wechat/prepay', dataRequest('POST', { orderId }));
    },

    mockWechatPayNotify(input) {
      return client.request('/api/payments/wechat/notify', dataRequest('POST', input));
    },

    createRefund(input) {
      return client.request('/api/refunds', dataRequest('POST', input));
    },

    createAfterSale(input) {
      return client.request('/api/after-sales', dataRequest('POST', input));
    },

    fetchAfterSales(query = {}) {
      return client.request(withQuery('/api/after-sales', query));
    },

    fetchAfterSaleSummary(query = {}) {
      return client.request(withQuery('/api/after-sales/summary', query));
    },

    fetchAfterSaleDetail(id) {
      return client.request(`/api/after-sales/${id}`);
    },

    cancelAfterSale(id) {
      return client.request(`/api/after-sales/${id}/cancel`, { method: 'PATCH' });
    },

    submitReturnLogistics(id, input) {
      return client.request(`/api/after-sales/${id}/return-logistics`, dataRequest('PATCH', input));
    },

    mockWechatRefundNotify(input) {
      return client.request('/api/refunds/wechat/notify', dataRequest('POST', input));
    },
  };
}

export function joinUrl(baseUrl, path) {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${normalizedBaseUrl}${normalizedPath}`;
}

function jsonRequest(method, input) {
  return {
    method,
    body: JSON.stringify(input),
  };
}

function dataRequest(method, input) {
  return {
    method,
    data: input,
  };
}

function withQuery(path, params) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }

  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

function createApiClientError(payload, status) {
  if (isApiErrorResponse(payload)) {
    return new ApiClientError(payload.message || 'Request failed', status, payload);
  }

  if (isApiResponseLike(payload)) {
    return new ApiClientError(payload.message || 'Request failed', status, payload);
  }

  return new ApiClientError('Request failed', status, payload);
}

function createHeaders(headers, body, token) {
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

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function normalizeBaseUrl(baseUrl) {
  return baseUrl.replace(/\/$/, '');
}

function isApiResponseLike(payload) {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'code' in payload &&
    'message' in payload &&
    typeof payload.code === 'number' &&
    typeof payload.message === 'string'
  );
}
