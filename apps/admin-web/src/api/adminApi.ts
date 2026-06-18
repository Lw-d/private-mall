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
  fetchAfterSaleDetail,
  fetchAfterSales,
  fetchDashboardOverview,
  fetchOrders,
  fetchProducts,
  fetchUsers,
  loginAdmin,
  retryRefund,
  resetAdminPointRedeemRules,
  rejectAfterSale,
  shipOrder,
  triggerAfterSaleRefund,
  updateCategory,
  updateCoupon,
  updateCouponStatus,
  updateAdminPointRedeemRules,
  updateProduct,
  updateProductStatus,
  updateRefundStatus,
  uploadImage,
} = adminApi;
