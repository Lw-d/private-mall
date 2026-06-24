import { createAdminApi } from '@mall/api-sdk';

import { apiClient } from './client';

const adminApi = createAdminApi(apiClient);

export const {
  addOrderLogisticsTrace,
  approveAfterSale,
  cancelOrder,
  confirmReturnReceived,
  createCategory,
  createCoupon,
  createProduct,
  deleteCategory,
  deleteProduct,
  fetchCategories,
  fetchCoupons,
  fetchAdminPointRedeemRules,
  fetchHomeBanners,
  fetchAfterSaleDetail,
  fetchAfterSales,
  fetchDashboardOverview,
  fetchOrders,
  fetchProducts,
  fetchUsers,
  loginAdmin,
  refreshOrderLogisticsTraces,
  retryRefund,
  resetAdminPointRedeemRules,
  rejectAfterSale,
  shipOrder,
  triggerAfterSaleRefund,
  updateCategory,
  updateCoupon,
  updateCouponStatus,
  updateHomeBanners,
  updateAdminPointRedeemRules,
  updateProduct,
  updateProductStatus,
  updateRefundStatus,
  uploadImage,
} = adminApi;
