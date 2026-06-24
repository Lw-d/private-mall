import {
  createAdminApi,
  createApiClient,
  createMiniappApi,
  getApiErrorMessage,
  joinUrl,
  unwrapApiResponse,
  type DataApiRequestOptions,
} from '@mall/api-sdk';
import type {
  AfterSaleStatus,
  AfterSaleSummary,
  Order,
  PointLedger,
  PointRedeemRules,
  Product,
  UserAddress,
  UserCoupon,
} from '@mall/shared-types';

const apiBaseUrl = process.env.SMOKE_API_BASE_URL ?? 'http://localhost:3000';
const mockOpenId = process.env.SMOKE_OPEN_ID ?? 'seed-miniapp-user-openid';
const smokeSkuCode = process.env.SMOKE_SKU_CODE ?? 'SEED-CREAM-50ML';
const smokePointsPerYuan = Number(process.env.SMOKE_POINTS_PER_YUAN ?? 80);
const adminUsername = process.env.ADMIN_DEFAULT_USERNAME ?? 'admin';
const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD ?? 'Admin123456';
const shouldSkipSwaggerCheck = process.env.SMOKE_SKIP_SWAGGER_CHECK === '1';

let miniappAccessToken: string | undefined;
let adminAccessToken: string | undefined;
let createdOrderId: string | undefined;
let originalPointRules: PointRedeemRules | undefined;
let pointRulesRestored = false;
let originalDefaultAddress: UserAddress | null | undefined;

const miniappApi = createMiniappApi({
  async request<T>(path: string, options: DataApiRequestOptions = {}) {
    const response = await fetch(joinUrl(apiBaseUrl, path), {
      method: options.method ?? 'GET',
      headers: createHeaders(miniappAccessToken, options.data),
      body: options.data === undefined ? undefined : JSON.stringify(options.data),
    });
    const payload = await readJson(response);

    return unwrapApiResponse<T>(payload, response.status);
  },
});

const adminClient = createApiClient({
  baseUrl: apiBaseUrl,
  getAccessToken: () => adminAccessToken,
});
const adminApi = createAdminApi(adminClient);

function createHeaders(accessToken: string | undefined, data: unknown) {
  const headers = new Headers();

  if (data !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return headers;
}

async function readJson(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    return undefined;
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function findSmokeSku(products: Product[]) {
  for (const product of products) {
    const sku = product.skus.find((item) => item.skuCode === smokeSkuCode);

    if (sku) {
      return { product, sku };
    }
  }

  return undefined;
}

function toAmount(value: string | number) {
  return Number(value).toFixed(2);
}

function assertCouponApplied(order: Order, userCoupon: UserCoupon) {
  const totalAmount = Number(order.totalAmount);
  const couponDiscountAmount = Number(userCoupon.coupon.discountAmount);
  const pointsDiscountAmount = Number(order.pointsDiscountAmount ?? 0);
  const expectedDiscountAmount = couponDiscountAmount + pointsDiscountAmount;
  const expectedPayableAmount = Math.max(totalAmount - expectedDiscountAmount, 0);

  assert(order.userCouponId === userCoupon.id, 'Order userCouponId should match selected coupon.');
  assert(order.couponId === userCoupon.couponId, 'Order couponId should match selected coupon.');
  assert(order.couponCode === userCoupon.coupon.code, 'Order coupon code snapshot mismatch.');
  assert(order.couponName === userCoupon.coupon.name, 'Order coupon name snapshot mismatch.');
  assert(
    toAmount(order.discountAmount) === toAmount(expectedDiscountAmount),
    'Order discount amount mismatch.',
  );
  assert(
    toAmount(order.payableAmount) === toAmount(expectedPayableAmount),
    'Order payable amount should subtract coupon and points discount.',
  );
}

function assertAddressSnapshotted(order: Order, address: UserAddress) {
  assert(order.shippingAddressId === address.id, 'Order shippingAddressId mismatch.');
  assert(order.receiverName === address.receiverName, 'Order receiverName snapshot mismatch.');
  assert(order.receiverPhone === address.receiverPhone, 'Order receiverPhone snapshot mismatch.');
  assert(order.receiverProvince === address.province, 'Order receiverProvince snapshot mismatch.');
  assert(order.receiverCity === address.city, 'Order receiverCity snapshot mismatch.');
  assert(order.receiverDistrict === address.district, 'Order receiverDistrict snapshot mismatch.');
  assert(
    order.receiverDetailAddress === address.detailAddress,
    'Order receiverDetailAddress snapshot mismatch.',
  );
}

function calculateOrderPoints(order: Order) {
  return Math.floor(Number(order.payableAmount));
}

function calculatePointRedeem(
  pointsBalance: number,
  amountAfterCoupon: number,
  pointsPerYuan: number,
) {
  const maxPointsByAmount = Math.floor(amountAfterCoupon * pointsPerYuan);
  const pointsUsed = Math.min(Math.max(pointsBalance, 0), maxPointsByAmount);

  return {
    pointsUsed,
    discountAmount: pointsUsed / pointsPerYuan,
  };
}

function calculateProportionalPoints(points: number, amount: number, totalAmount: number) {
  return Math.floor((points * amount) / totalAmount);
}

function step(message: string) {
  console.log(`- ${message}`);
}

function asRecord(value: unknown) {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function stringify(value: unknown) {
  return JSON.stringify(value);
}

function getAfterSaleStatusCount(summary: AfterSaleSummary, status: AfterSaleStatus) {
  return summary.statusCounts.find((item) => item.status === status)?.count ?? 0;
}

async function assertAfterSaleOrderSummary(orderId: string, expectedStatus: AfterSaleStatus) {
  const summary = await miniappApi.fetchAfterSaleSummary({ orderId });

  assert(summary.total === 1, 'After-sale summary should include one order-level request.');
  assert(
    getAfterSaleStatusCount(summary, expectedStatus) === 1,
    `After-sale summary should count ${expectedStatus}.`,
  );
  assert(
    summary.statusCounts.every((item) => item.status === expectedStatus || item.count === 0),
    'After-sale summary should not count unrelated statuses for the smoke order.',
  );

  return summary;
}

async function checkHealth() {
  const response = await fetch(joinUrl(apiBaseUrl, '/api/health'));
  unwrapApiResponse<unknown>(await readJson(response), response.status);
  step(`API health ok: ${apiBaseUrl}`);
}

async function checkSwaggerContracts() {
  if (shouldSkipSwaggerCheck) {
    step('swagger contract check skipped');
    return;
  }

  const response = await fetch(joinUrl(apiBaseUrl, '/docs-json'));
  assert(response.ok, `Swagger docs-json should be available, got ${response.status}.`);

  const document = asRecord(await readJson(response));
  const paths = asRecord(document.paths);
  const ordersPath = asRecord(paths['/api/orders']);
  const getOrders = asRecord(ordersPath.get);
  const afterSaleSummaryPath = asRecord(paths['/api/after-sales/summary']);
  const getAfterSaleSummary = asRecord(afterSaleSummaryPath.get);
  const schemas = asRecord(asRecord(document.components).schemas);
  const orderListSchema = asRecord(schemas.OrderListResultDto);
  const orderListProperties = asRecord(orderListSchema.properties);
  const afterSaleSummarySchema = asRecord(schemas.AfterSaleSummaryResponseDto);
  const afterSaleSummaryProperties = asRecord(afterSaleSummarySchema.properties);
  const afterSaleStatusCountSchema = asRecord(schemas.AfterSaleStatusCountDto);
  const afterSaleStatusCountProperties = asRecord(afterSaleStatusCountSchema.properties);
  const orderParameters = Array.isArray(getOrders.parameters) ? getOrders.parameters : [];
  const afterSaleSummaryParameters = Array.isArray(getAfterSaleSummary.parameters)
    ? getAfterSaleSummary.parameters
    : [];
  const orderResponseSchemaText = stringify(asRecord(asRecord(getOrders.responses)['200']).content);
  const afterSaleSummaryResponseSchemaText = stringify(
    asRecord(asRecord(getAfterSaleSummary.responses)['200']).content,
  );

  assert(orderListProperties.items, 'OrderListResultDto should document items.');
  assert(orderListProperties.total, 'OrderListResultDto should document total.');
  assert(orderListProperties.page, 'OrderListResultDto should document page.');
  assert(orderListProperties.pageSize, 'OrderListResultDto should document pageSize.');
  assert(
    orderParameters.some((item) => asRecord(item).name === 'page'),
    'GET /api/orders should document page query parameter.',
  );
  assert(
    orderParameters.some((item) => asRecord(item).name === 'pageSize'),
    'GET /api/orders should document pageSize query parameter.',
  );
  assert(
    orderResponseSchemaText.includes('OrderListResultDto'),
    'GET /api/orders response should reference OrderListResultDto.',
  );

  assert(afterSaleSummaryProperties.total, 'AfterSaleSummaryResponseDto should document total.');
  assert(
    afterSaleSummaryProperties.statusCounts,
    'AfterSaleSummaryResponseDto should document statusCounts.',
  );
  assert(afterSaleStatusCountProperties.status, 'AfterSaleStatusCountDto should document status.');
  assert(afterSaleStatusCountProperties.count, 'AfterSaleStatusCountDto should document count.');
  assert(
    afterSaleSummaryParameters.some((item) => asRecord(item).name === 'orderId'),
    'GET /api/after-sales/summary should document orderId query parameter.',
  );
  assert(
    afterSaleSummaryParameters.some((item) => asRecord(item).name === 'type'),
    'GET /api/after-sales/summary should document type query parameter.',
  );
  assert(
    afterSaleSummaryResponseSchemaText.includes('AfterSaleSummaryResponseDto'),
    'GET /api/after-sales/summary response should reference AfterSaleSummaryResponseDto.',
  );

  step('swagger contract ok');
}

async function cleanupCart() {
  const cart = await miniappApi.fetchCart();

  for (const item of cart.items) {
    await miniappApi.removeCartItem(item.skuId);
  }

  if (cart.items.length > 0) {
    step(`cleaned ${cart.items.length} existing cart item(s)`);
  }
}

async function createAndClaimSmokeCoupon() {
  const now = Date.now();
  const code = `SMOKE_COUPON_${now}`;
  const coupon = await adminApi.createCoupon({
    name: 'Smoke 满 1 减 5',
    code,
    thresholdAmount: 1,
    discountAmount: 5,
    totalStock: 10,
    perUserLimit: 1,
    validFrom: new Date(now - 60_000).toISOString(),
    validTo: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
    description: 'Smoke transaction coupon',
  });

  await adminApi.updateCouponStatus(coupon.id, 'ACTIVE');
  step(`admin coupon created: ${coupon.code}`);

  const claimableCoupons = await miniappApi.fetchClaimableCoupons();
  assert(
    claimableCoupons.some((item) => item.id === coupon.id),
    'Smoke coupon should be claimable.',
  );

  const userCoupon = await miniappApi.claimCoupon(coupon.id);
  assert(userCoupon.status === 'AVAILABLE', 'Claimed coupon should be AVAILABLE.');
  assert(userCoupon.coupon.id === coupon.id, 'Claimed coupon payload mismatch.');
  step(`coupon claimed: ${coupon.code}`);

  return userCoupon;
}

async function exerciseAddressManagement() {
  originalDefaultAddress = await miniappApi.fetchDefaultAddress();
  assert(originalDefaultAddress, 'Smoke default address should exist. Run pnpm db:seed first.');
  assert(originalDefaultAddress.isDefault, 'Smoke address should be default.');
  step(`default address ok: ${originalDefaultAddress.receiverName}`);

  const address = await miniappApi.createAddress({
    receiverName: 'Smoke 地址用户',
    receiverPhone: '13900000000',
    province: '广东省',
    city: '深圳市',
    district: '福田区',
    detailAddress: `Smoke 临时地址 ${Date.now()}`,
    postalCode: '518000',
    isDefault: false,
  });
  assert(!address.isDefault, 'Smoke temporary address should not be default.');

  const nextDefault = await miniappApi.setDefaultAddress(address.id);
  assert(nextDefault.isDefault, 'Smoke temporary address should become default.');

  const restoredDefault = await miniappApi.setDefaultAddress(originalDefaultAddress.id);
  assert(restoredDefault.isDefault, 'Original default address should be restored.');

  await miniappApi.deleteAddress(address.id);
  const addresses = await miniappApi.fetchAddresses();
  assert(
    !addresses.some((item) => item.id === address.id),
    'Smoke temporary address should be deleted.',
  );
  step('address management ok');

  return restoredDefault;
}

async function configureSmokePointRedeemRules() {
  assert(
    Number.isInteger(smokePointsPerYuan) && smokePointsPerYuan > 0,
    'SMOKE_POINTS_PER_YUAN must be a positive integer.',
  );

  originalPointRules = await adminApi.fetchAdminPointRedeemRules();
  const updatedRules = await adminApi.updateAdminPointRedeemRules({
    enabled: true,
    pointsPerYuan: smokePointsPerYuan,
  });

  assert(updatedRules.enabled, 'Updated point redeem rules should be enabled.');
  assert(
    updatedRules.pointsPerYuan === smokePointsPerYuan,
    'Updated point redeem pointsPerYuan mismatch.',
  );
  assert(
    updatedRules.source === 'database',
    'Updated point redeem rules should come from database.',
  );

  const publicRules = await miniappApi.fetchPointRedeemRules();
  assert(publicRules.enabled, 'Public point redeem rules should be enabled.');
  assert(
    publicRules.pointsPerYuan === smokePointsPerYuan,
    'Public point redeem rules should match admin update.',
  );
  step(`point redeem rule update ok: ${smokePointsPerYuan} points / 1 yuan`);

  return updatedRules;
}

async function restorePointRedeemRules() {
  if (!originalPointRules || pointRulesRestored) {
    return;
  }

  if (originalPointRules.source === 'env') {
    const rules = await adminApi.resetAdminPointRedeemRules();
    assert(rules.source === 'env', 'Point redeem rules should reset to env fallback.');
  } else {
    const rules = await adminApi.updateAdminPointRedeemRules({
      enabled: originalPointRules.enabled,
      pointsPerYuan: originalPointRules.pointsPerYuan,
    });
    assert(rules.source === 'database', 'Point redeem rules should restore to database source.');
  }

  pointRulesRestored = true;
  step('point redeem rule restored');
}

async function bestEffortRestorePointRedeemRules() {
  try {
    await restorePointRedeemRules();
  } catch (error) {
    console.error(`Point redeem rule restore failed: ${getApiErrorMessage(error)}`);
  }
}

async function bestEffortRestoreDefaultAddress() {
  if (!originalDefaultAddress) {
    return;
  }

  try {
    await miniappApi.setDefaultAddress(originalDefaultAddress.id);
  } catch (error) {
    console.error(`Default address restore failed: ${getApiErrorMessage(error)}`);
  }
}

async function assertUserCouponStatus(userCouponId: string, status: UserCoupon['status']) {
  const myCoupons = await miniappApi.fetchMyCoupons();
  const userCoupon = myCoupons.find((item) => item.id === userCouponId);

  assert(userCoupon, `User coupon not found: ${userCouponId}`);
  assert(
    userCoupon.status === status,
    `User coupon should be ${status}, got ${userCoupon.status}.`,
  );

  return userCoupon;
}

async function exerciseRefundOnlyAfterSale(product: Product, skuId: string, address: UserAddress) {
  const cartAfterAdd = await miniappApi.addCartItem({
    skuId,
    quantity: 1,
    checked: true,
  });
  assert(
    cartAfterAdd.items.some((item) => item.skuId === skuId && item.checked),
    'After-sale smoke cart item should be checked.',
  );

  const order = await miniappApi.createOrderFromCart({
    shippingAddressId: address.id,
    remark: `Smoke after-sale ${new Date().toISOString()}`,
  });
  createdOrderId = order.id;
  assert(order.status === 'PENDING_PAYMENT', 'After-sale smoke order should be pending payment.');
  assert(
    order.items.some((item) => item.skuId === skuId),
    'After-sale smoke order item mismatch.',
  );

  const prepay = await miniappApi.createWechatPrepay(order.id);
  assert(prepay.payment.status === 'PENDING', 'After-sale smoke prepay should be pending.');

  const transactionId = `SMOKE_AFTER_SALE_TX_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const notify = await miniappApi.mockWechatPayNotify({
    orderId: order.id,
    orderNo: order.orderNo,
    transactionId,
    amount: Number(order.payableAmount),
    tradeState: 'SUCCESS',
  });
  assert(notify.received, 'After-sale smoke payment notify should be received.');

  const paidOrder = await miniappApi.fetchOrderDetail(order.id);
  assert(
    paidOrder.status === 'PENDING_DELIVERY',
    'After-sale smoke paid order should be pending delivery.',
  );

  const afterSale = await miniappApi.createAfterSale({
    orderId: order.id,
    type: 'REFUND_ONLY',
    reason: 'Smoke after-sale refund only',
    description: `Smoke after-sale for ${product.name}`,
    requestedAmount: Number(order.payableAmount),
  });
  assert(afterSale.status === 'REQUESTED', 'After-sale request should be REQUESTED.');
  assert(afterSale.orderId === order.id, 'After-sale request orderId mismatch.');
  await assertAfterSaleOrderSummary(order.id, 'REQUESTED');

  const approvedAfterSale = await adminApi.approveAfterSale(afterSale.id, {
    approvedAmount: Number(order.payableAmount),
    merchantRemark: 'Smoke approve refund only',
  });
  assert(approvedAfterSale.status === 'APPROVED', 'Refund-only after-sale should become APPROVED.');
  assert(
    toAmount(approvedAfterSale.approvedAmount ?? 0) === toAmount(order.payableAmount),
    'Approved after-sale amount mismatch.',
  );
  await assertAfterSaleOrderSummary(order.id, 'APPROVED');

  const refundingAfterSale = await adminApi.triggerAfterSaleRefund(afterSale.id);
  assert(refundingAfterSale.status === 'REFUNDING', 'After-sale should become REFUNDING.');
  assert(refundingAfterSale.refund, 'After-sale should include refund snapshot after trigger.');
  assert(
    refundingAfterSale.refund?.status === 'PENDING',
    'After-sale refund should be pending after trigger.',
  );
  await assertAfterSaleOrderSummary(order.id, 'REFUNDING');

  const refundTransactionId = `SMOKE_AFTER_SALE_REFUND_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const refundNotify = await miniappApi.mockWechatRefundNotify({
    refundNo: refundingAfterSale.refund.refundNo,
    transactionId: refundTransactionId,
    amount: Number(refundingAfterSale.refund.amount),
    refundStatus: 'SUCCESS',
  });
  assert(refundNotify.received, 'After-sale refund notify should be received.');
  assert(refundNotify.refund?.status === 'SUCCESS', 'After-sale refund should become SUCCESS.');

  const completedAfterSale = await miniappApi.fetchAfterSaleDetail(afterSale.id);
  assert(completedAfterSale.status === 'COMPLETED', 'After-sale should become COMPLETED.');
  assert(completedAfterSale.completedAt, 'Completed after-sale should have completedAt.');
  assert(
    completedAfterSale.logs?.some((item) => item.action === 'REFUND_SUCCESS'),
    'Completed after-sale should include refund success log.',
  );

  const refundedOrder = await miniappApi.fetchOrderDetail(order.id);
  assert(refundedOrder.status === 'REFUNDED', 'After-sale smoke order should become REFUNDED.');
  await assertAfterSaleOrderSummary(order.id, 'COMPLETED');
  step('after-sale summary status counts ok');
  step(`after-sale refund-only smoke ok: ${completedAfterSale.afterSaleNo}`);

  createdOrderId = undefined;
}

async function cancelPendingOrder() {
  if (!createdOrderId || !miniappAccessToken) {
    return;
  }

  try {
    const order = await miniappApi.fetchOrderDetail(createdOrderId);

    if (order.status === 'PENDING_PAYMENT') {
      await miniappApi.cancelOrder(createdOrderId, 'Smoke failed cleanup');
      step(`cleaned pending order: ${order.orderNo}`);
    }
  } catch {
    // Best effort cleanup only. The original failure is more useful to report.
  }
}

async function run() {
  console.log(`Smoke transaction started against ${apiBaseUrl}`);

  await checkHealth();
  await checkSwaggerContracts();

  const loginResult = await miniappApi.wxLogin({
    code: 'smoke-code',
    mockOpenId,
    nickname: 'Smoke 回归用户',
  });
  miniappAccessToken = loginResult.accessToken;
  step(`miniapp login ok: ${loginResult.user.openId}`);

  const adminLogin = await adminApi.loginAdmin({
    username: adminUsername,
    password: adminPassword,
  });
  adminAccessToken = adminLogin.accessToken;
  step(`admin login ok: ${adminLogin.admin.username}`);

  const smokePointRules = await configureSmokePointRedeemRules();
  const defaultAddress = await exerciseAddressManagement();
  const smokeUserCoupon = await createAndClaimSmokeCoupon();

  const products = await miniappApi.fetchProducts();
  const smokeProduct = findSmokeSku(products);
  assert(smokeProduct, `Seed SKU not found: ${smokeSkuCode}. Run pnpm db:seed first.`);
  assert(smokeProduct.product.status === 'ON_SALE', 'Smoke product must be on sale.');
  assert(smokeProduct.sku.stock > 0, 'Smoke SKU stock must be greater than 0.');
  step(`product ok: ${smokeProduct.product.name} / ${smokeProduct.sku.name}`);

  await cleanupCart();

  const cartAfterAdd = await miniappApi.addCartItem({
    skuId: smokeProduct.sku.id,
    quantity: 1,
    checked: true,
  });
  const cartItem = cartAfterAdd.items.find((item) => item.skuId === smokeProduct.sku.id);
  assert(cartItem?.checked, 'Smoke cart item should be checked.');
  assert(cartItem.available, cartItem.unavailableReason ?? 'Smoke cart item should be available.');
  step('cart add ok');

  const cartAmount = Number(smokeProduct.sku.price);
  const availableCoupons = await miniappApi.fetchAvailableCouponsForOrder(cartAmount.toFixed(2));
  assert(
    availableCoupons.some((item) => item.id === smokeUserCoupon.id),
    'Claimed coupon should be available for smoke order.',
  );
  step('coupon available-for-order ok');

  const couponCancelOrder = await miniappApi.createOrderFromCart({
    shippingAddressId: defaultAddress.id,
    userCouponId: smokeUserCoupon.id,
    remark: `Smoke coupon cancel ${new Date().toISOString()}`,
  });
  createdOrderId = couponCancelOrder.id;
  assertCouponApplied(couponCancelOrder, smokeUserCoupon);
  assertAddressSnapshotted(couponCancelOrder, defaultAddress);
  await assertUserCouponStatus(smokeUserCoupon.id, 'LOCKED');
  step(`coupon lock ok: ${couponCancelOrder.orderNo}`);

  const cancelledCouponOrder = await miniappApi.cancelOrder(
    couponCancelOrder.id,
    'Smoke coupon release check',
  );
  assert(cancelledCouponOrder.status === 'CANCELLED', 'Coupon test order should be cancelled.');
  await assertUserCouponStatus(smokeUserCoupon.id, 'AVAILABLE');
  createdOrderId = undefined;
  step('coupon release on cancel ok');

  const cartAfterCouponRelease = await miniappApi.addCartItem({
    skuId: smokeProduct.sku.id,
    quantity: 1,
    checked: true,
  });
  assert(
    cartAfterCouponRelease.items.some((item) => item.skuId === smokeProduct.sku.id && item.checked),
    'Smoke cart item should be re-added after coupon release check.',
  );
  step('cart re-add ok');

  const profileBeforeOrder = await miniappApi.fetchProfile();
  const order = await miniappApi.createOrderFromCart({
    shippingAddressId: defaultAddress.id,
    userCouponId: smokeUserCoupon.id,
    usePoints: true,
    remark: `Smoke transaction ${new Date().toISOString()}`,
  });
  createdOrderId = order.id;
  assert(order.status === 'PENDING_PAYMENT', 'Created order should be pending payment.');
  assertCouponApplied(order, smokeUserCoupon);
  assertAddressSnapshotted(order, defaultAddress);
  assert(order.pointsUsed > 0, 'Smoke order should use points.');
  assert(Number(order.pointsDiscountAmount) > 0, 'Smoke order should include points discount.');
  const expectedRedeem = calculatePointRedeem(
    profileBeforeOrder.pointsBalance,
    Math.max(Number(order.totalAmount) - Number(smokeUserCoupon.coupon.discountAmount), 0),
    smokePointRules.pointsPerYuan,
  );
  assert(
    order.pointsUsed === expectedRedeem.pointsUsed,
    'Order points used should match smoke rule.',
  );
  assert(
    toAmount(order.pointsDiscountAmount) === toAmount(expectedRedeem.discountAmount),
    'Order points discount should match smoke rule.',
  );
  assert(
    order.items.some((item) => item.skuId === smokeProduct.sku.id),
    'Order item mismatch.',
  );
  await restorePointRedeemRules();
  await assertUserCouponStatus(smokeUserCoupon.id, 'LOCKED');
  const profileAfterOrder = await miniappApi.fetchProfile();
  assert(
    profileAfterOrder.pointsBalance === profileBeforeOrder.pointsBalance - order.pointsUsed,
    'User points balance should decrease after points redeem order.',
  );
  const pointLedgerAfterOrder = await miniappApi.fetchPointLedger();
  const redeemPointLedger = pointLedgerAfterOrder.find(
    (item: PointLedger) => item.orderId === order.id && item.type === 'ORDER_REDEEM',
  );
  assert(redeemPointLedger, 'Points redeem order should create an ORDER_REDEEM ledger.');
  assert(redeemPointLedger.points === -order.pointsUsed, 'Redeem point ledger amount mismatch.');
  assert(
    redeemPointLedger.balanceAfter === profileAfterOrder.pointsBalance,
    'Redeem point ledger balanceAfter should match profile balance.',
  );
  step(`order created: ${order.orderNo}`);

  const prepay = await miniappApi.createWechatPrepay(order.id);
  assert(prepay.payment.status === 'PENDING', 'Prepay payment should be pending.');
  step(`prepay ok: ${prepay.payment.paymentNo}`);

  const transactionId = `SMOKE_TX_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const notify = await miniappApi.mockWechatPayNotify({
    orderId: order.id,
    orderNo: order.orderNo,
    transactionId,
    amount: Number(order.payableAmount),
    tradeState: 'SUCCESS',
  });
  assert(notify.received, 'Payment notify should be received.');
  assert(notify.payment?.status === 'SUCCESS', 'Payment should become success.');
  step(`mock payment ok: ${transactionId}`);

  const paidOrder = await miniappApi.fetchOrderDetail(order.id);
  assert(paidOrder.status === 'PENDING_DELIVERY', 'Paid order should be pending delivery.');
  assert(paidOrder.paidAt, 'Paid order should have paidAt.');
  await assertUserCouponStatus(smokeUserCoupon.id, 'USED');
  step('order status ok: PENDING_DELIVERY');

  const adminOrders = await adminApi.fetchOrders({ keyword: order.orderNo, page: 1, pageSize: 5 });
  assert(
    adminOrders.items.some((item) => item.id === order.id),
    'Admin order search should include smoke order.',
  );
  step('admin order search ok');

  const smokeTrackingNo = `SMOKE${Date.now()}`;
  const shippedOrder = await adminApi.shipOrder(order.id, {
    logisticsCompany: 'Smoke 测试物流',
    trackingNo: smokeTrackingNo,
    remark: 'Smoke transaction delivery',
  });
  assert(shippedOrder.status === 'SHIPPED', 'Shipped order should be SHIPPED.');
  assert(
    shippedOrder.logisticsTraces?.some((trace) => trace.trackingNo === smokeTrackingNo),
    'Shipped order should include logistics trace.',
  );
  step('admin ship ok');

  const userShippedOrder = await miniappApi.fetchOrderDetail(order.id);
  assert(userShippedOrder.status === 'SHIPPED', 'User order detail should be SHIPPED.');
  assert(
    userShippedOrder.logisticsTraces?.some((trace) => trace.trackingNo === smokeTrackingNo),
    'User order detail should include logistics trace.',
  );
  step('auto logistics trace ok');

  const refreshedLogisticsOrder = await adminApi.refreshOrderLogisticsTraces(order.id);
  const refreshedLogisticsTraceCount = refreshedLogisticsOrder.logisticsTraces?.length ?? 0;
  assert(
    refreshedLogisticsOrder.logisticsTraces?.some(
      (trace) => trace.trackingNo === smokeTrackingNo && trace.status === 'PICKED_UP',
    ),
    'Refreshed logistics traces should include mock picked-up trace.',
  );
  assert(
    refreshedLogisticsOrder.logisticsTraces?.some(
      (trace) => trace.trackingNo === smokeTrackingNo && trace.status === 'IN_TRANSIT',
    ),
    'Refreshed logistics traces should include mock in-transit trace.',
  );

  const idempotentLogisticsOrder = await adminApi.refreshOrderLogisticsTraces(order.id);
  assert(
    (idempotentLogisticsOrder.logisticsTraces?.length ?? 0) === refreshedLogisticsTraceCount,
    'Repeated logistics refresh should not create duplicate traces.',
  );
  step('mock logistics refresh ok');

  const manualTraceContent = `Smoke 手动轨迹 ${Date.now()}`;
  const tracedOrder = await adminApi.addOrderLogisticsTrace(order.id, {
    status: 'IN_TRANSIT',
    content: manualTraceContent,
  });
  assert(
    tracedOrder.logisticsTraces?.some((trace) => trace.content === manualTraceContent),
    'Admin appended logistics trace should be returned.',
  );
  const userTracedOrder = await miniappApi.fetchOrderDetail(order.id);
  assert(
    userTracedOrder.logisticsTraces?.some((trace) => trace.content === manualTraceContent),
    'User order detail should include appended logistics trace.',
  );
  step('manual logistics trace ok');

  const logisticsFilteredOrders = await adminApi.fetchOrders({
    keyword: order.orderNo,
    logisticsTraceStatus: 'IN_TRANSIT',
    page: 1,
    pageSize: 5,
  });
  assert(
    logisticsFilteredOrders.items.some((item) => item.id === order.id),
    'Admin logistics trace status filter should include smoke order.',
  );
  step('admin logistics status filter ok');

  const profileBeforeComplete = await miniappApi.fetchProfile();
  const expectedPoints = calculateOrderPoints(order);
  const completedOrder: Order = await miniappApi.completeOrder(order.id);
  assert(completedOrder.status === 'COMPLETED', 'Completed order should be COMPLETED.');
  assert(completedOrder.completedAt, 'Completed order should have completedAt.');
  step(`complete ok: ${completedOrder.orderNo}`);

  const profileAfterComplete = await miniappApi.fetchProfile();
  assert(
    profileAfterComplete.pointsBalance === profileBeforeComplete.pointsBalance + expectedPoints,
    'User points balance should increase after order completion.',
  );
  const pointLedger = await miniappApi.fetchPointLedger();
  const orderPointLedger = pointLedger.find(
    (item: PointLedger) => item.orderId === order.id && item.type === 'ORDER_EARN',
  );
  assert(orderPointLedger, 'Completed order should create an ORDER_EARN point ledger.');
  assert(orderPointLedger.points === expectedPoints, 'Point ledger amount mismatch.');
  assert(
    orderPointLedger.balanceAfter === profileAfterComplete.pointsBalance,
    'Point ledger balanceAfter should match current profile balance.',
  );
  step(`points earned ok: +${expectedPoints}`);

  const dashboardOverview = await adminApi.fetchDashboardOverview();
  assert(
    dashboardOverview.metrics.activeCoupons >= 1,
    'Dashboard should include active coupon metrics.',
  );
  assert(
    dashboardOverview.metrics.claimedCoupons >= 1,
    'Dashboard should include claimed coupon metrics.',
  );
  assert(
    dashboardOverview.metrics.usedCoupons >= 1,
    'Dashboard should include used coupon metrics.',
  );
  assert(
    Number(dashboardOverview.metrics.couponDiscountAmount) >=
      Number(smokeUserCoupon.coupon.discountAmount),
    'Dashboard should include coupon discount amount.',
  );
  assert(
    dashboardOverview.metrics.pointsIssued >= expectedPoints,
    'Dashboard should include issued points.',
  );
  assert(
    dashboardOverview.metrics.pointsBalanceTotal >= profileAfterComplete.pointsBalance,
    'Dashboard should include user points balance total.',
  );
  assert(
    dashboardOverview.metrics.pointLedgerCount >= 1,
    'Dashboard should include point ledger count.',
  );
  step('dashboard coupon and points statistics ok');

  const completedOrders = await miniappApi.fetchOrders({
    status: 'COMPLETED',
    page: 1,
    pageSize: 10,
  });
  assert(Array.isArray(completedOrders.items), 'User order pagination should return items.');
  assert(completedOrders.page === 1, 'User order pagination should return current page.');
  assert(completedOrders.pageSize === 10, 'User order pagination should return pageSize.');
  assert(completedOrders.total >= 1, 'User completed order total should be at least 1.');
  assert(
    completedOrders.items.some((item) => item.id === order.id),
    'User completed order page should include smoke order.',
  );
  step(`user order pagination ok: total ${completedOrders.total}`);

  await exerciseRefundOnlyAfterSale(smokeProduct.product, smokeProduct.sku.id, defaultAddress);

  const payableAmount = Number(order.payableAmount);
  const partialRefundAmount = Number((payableAmount / 2).toFixed(2));
  const remainingRefundAmount = Number((payableAmount - partialRefundAmount).toFixed(2));
  const expectedPartialDeductPoints = calculateProportionalPoints(
    expectedPoints,
    partialRefundAmount,
    payableAmount,
  );
  const expectedPartialRedeemRefundPoints = calculateProportionalPoints(
    order.pointsUsed,
    partialRefundAmount,
    payableAmount,
  );

  const partialRefund = await miniappApi.createRefund({
    orderId: order.id,
    amount: partialRefundAmount,
    reason: 'Smoke partial refund points check',
  });
  assert(partialRefund.status === 'PENDING', 'Partial refund request should be pending.');
  assert(
    toAmount(partialRefund.amount) === toAmount(partialRefundAmount),
    'Partial refund amount mismatch.',
  );

  const partialRefundingOrder = await miniappApi.fetchOrderDetail(order.id);
  assert(
    partialRefundingOrder.status === 'REFUNDING',
    'Partial refund order should become REFUNDING.',
  );

  const profileAfterPartialRefundRequest = await miniappApi.fetchProfile();
  assert(
    profileAfterPartialRefundRequest.pointsBalance ===
      profileAfterComplete.pointsBalance - expectedPartialDeductPoints,
    'User points balance should deduct earned points proportionally after partial refund request.',
  );
  const pointLedgerAfterPartialRefundRequest = await miniappApi.fetchPointLedger();
  const partialDeductLedger = pointLedgerAfterPartialRefundRequest.find(
    (item: PointLedger) => item.orderId === order.id && item.type === 'ORDER_REFUND_DEDUCT',
  );
  assert(partialDeductLedger, 'Partial refund should create an ORDER_REFUND_DEDUCT point ledger.');
  assert(
    partialDeductLedger.points === -expectedPartialDeductPoints,
    'Partial refund point ledger amount mismatch.',
  );
  assert(
    partialDeductLedger.balanceAfter === profileAfterPartialRefundRequest.pointsBalance,
    'Partial refund point ledger balanceAfter should match current profile balance.',
  );
  step(`partial refund points deduct ok: -${expectedPartialDeductPoints}`);

  const partialRefundTransactionId = `SMOKE_REFUND_PART_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const partialRefundNotify = await miniappApi.mockWechatRefundNotify({
    refundNo: partialRefund.refundNo,
    transactionId: partialRefundTransactionId,
    amount: Number(partialRefund.amount),
    refundStatus: 'SUCCESS',
  });
  assert(partialRefundNotify.received, 'Partial refund notify should be received.');
  assert(partialRefundNotify.refund?.status === 'SUCCESS', 'Partial refund should become SUCCESS.');
  assert(
    partialRefundNotify.refund?.transactionId === partialRefundTransactionId,
    'Partial refund transaction id should be saved.',
  );
  const partialRefundedOrder = await miniappApi.fetchOrderDetail(order.id);
  assert(
    partialRefundedOrder.status === 'COMPLETED',
    'Partial refund success should restore completed order status.',
  );
  assert(
    partialRefundedOrder.refunds?.some(
      (item) => item.id === partialRefund.id && item.status === 'SUCCESS',
    ),
    'Order detail should include processed partial refund record.',
  );
  const profileAfterPartialRefundSuccess = await miniappApi.fetchProfile();
  assert(
    profileAfterPartialRefundSuccess.pointsBalance ===
      profileAfterPartialRefundRequest.pointsBalance + expectedPartialRedeemRefundPoints,
    'User points balance should restore redeemed points proportionally after partial refund success.',
  );
  const pointLedgerAfterPartialRefundSuccess = await miniappApi.fetchPointLedger();
  const partialRedeemRefundLedger = pointLedgerAfterPartialRefundSuccess.find(
    (item: PointLedger) => item.orderId === order.id && item.type === 'ORDER_REDEEM_REFUND',
  );
  assert(
    partialRedeemRefundLedger,
    'Partial refund success should create an ORDER_REDEEM_REFUND point ledger.',
  );
  assert(
    partialRedeemRefundLedger.points === expectedPartialRedeemRefundPoints,
    'Partial redeem refund point ledger amount mismatch.',
  );
  step('partial wechat refund notify ok');

  const refund = await miniappApi.createRefund({
    orderId: order.id,
    amount: remainingRefundAmount,
    reason: 'Smoke remaining refund points check',
  });
  assert(refund.status === 'PENDING', 'Remaining refund request should be pending.');
  assert(
    toAmount(refund.amount) === toAmount(remainingRefundAmount),
    'Remaining refund amount mismatch.',
  );

  const profileAfterRefund = await miniappApi.fetchProfile();
  assert(
    profileAfterRefund.pointsBalance ===
      profileAfterPartialRefundSuccess.pointsBalance -
        (expectedPoints - expectedPartialDeductPoints),
    'User points balance should deduct remaining earned points after remaining refund request.',
  );
  const pointLedgerAfterRefund = await miniappApi.fetchPointLedger();
  const refundPointLedger = pointLedgerAfterRefund.find(
    (item: PointLedger) => item.orderId === order.id && item.type === 'ORDER_REFUND_DEDUCT',
  );
  assert(refundPointLedger, 'Remaining refund should keep ORDER_REFUND_DEDUCT point ledger.');
  assert(refundPointLedger.points === -expectedPoints, 'Refund point ledger amount mismatch.');
  assert(
    refundPointLedger.balanceAfter === profileAfterRefund.pointsBalance,
    'Refund point ledger balanceAfter should match current profile balance.',
  );
  step(`points refund deduct ok: -${expectedPoints}`);

  const refundTransactionId = `SMOKE_REFUND_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const refundNotify = await miniappApi.mockWechatRefundNotify({
    refundNo: refund.refundNo,
    transactionId: refundTransactionId,
    amount: Number(refund.amount),
    refundStatus: 'SUCCESS',
  });
  assert(refundNotify.received, 'Refund notify should be received.');
  assert(refundNotify.refund?.status === 'SUCCESS', 'Refund should become SUCCESS.');
  assert(
    refundNotify.refund?.transactionId === refundTransactionId,
    'Refund transaction id should be saved.',
  );
  const finalOrder = await miniappApi.fetchOrderDetail(order.id);
  assert(finalOrder.status === 'REFUNDED', 'Order should become REFUNDED after full refund total.');
  assert(
    finalOrder.refunds?.some((item) => item.id === refund.id && item.status === 'SUCCESS'),
    'Order detail should include processed refund record.',
  );
  const profileAfterRefundSuccess = await miniappApi.fetchProfile();
  assert(
    profileAfterRefundSuccess.pointsBalance ===
      profileAfterRefund.pointsBalance + (order.pointsUsed - expectedPartialRedeemRefundPoints),
    'User points balance should restore remaining redeemed points after full refund total.',
  );
  const pointLedgerAfterRefundSuccess = await miniappApi.fetchPointLedger();
  const redeemRefundLedger = pointLedgerAfterRefundSuccess.find(
    (item: PointLedger) => item.orderId === order.id && item.type === 'ORDER_REDEEM_REFUND',
  );
  assert(redeemRefundLedger, 'Refund success should create an ORDER_REDEEM_REFUND point ledger.');
  assert(
    redeemRefundLedger.points === order.pointsUsed,
    'Redeem refund point ledger amount mismatch.',
  );
  step('wechat refund notify ok');

  console.log('Smoke transaction passed.');
}

run().catch(async (error) => {
  await cancelPendingOrder();
  await bestEffortRestoreDefaultAddress();
  await bestEffortRestorePointRedeemRules();
  console.error(`Smoke transaction failed: ${getApiErrorMessage(error, 'Unknown smoke failure')}`);
  process.exitCode = 1;
});
