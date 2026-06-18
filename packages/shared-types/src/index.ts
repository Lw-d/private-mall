export type ID = string;

export type UserStatus = 'ACTIVE' | 'DISABLED';
export type AdminRole = 'SUPER_ADMIN' | 'OPERATOR';
export type ProductStatus = 'DRAFT' | 'ON_SALE' | 'OFF_SALE';
export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PENDING_DELIVERY'
  | 'SHIPPED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDING'
  | 'REFUNDED';
export type PaymentChannel = 'WECHAT';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CLOSED';
export type RefundStatus = 'PENDING' | 'SUCCESS' | 'FAILED';
export type RefundFailureSource = 'ADMIN_REJECT' | 'WECHAT_REQUEST' | 'WECHAT_NOTIFY';
export type AfterSaleType = 'REFUND_ONLY' | 'RETURN_REFUND';
export type AfterSaleStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'WAIT_BUYER_RETURN'
  | 'BUYER_RETURNED'
  | 'MERCHANT_RECEIVED'
  | 'REFUNDING'
  | 'COMPLETED'
  | 'CANCELLED';
export type AfterSaleActorType = 'USER' | 'ADMIN' | 'SYSTEM';
export type CouponType = 'FIXED_AMOUNT';
export type CouponStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
export type UserCouponStatus = 'AVAILABLE' | 'LOCKED' | 'USED' | 'EXPIRED' | 'VOID';
export type OrderLogisticsTraceStatus =
  | 'SHIPPED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERING'
  | 'DELIVERED'
  | 'EXCEPTION';
export type PointLedgerType =
  | 'ORDER_EARN'
  | 'ORDER_REFUND_DEDUCT'
  | 'ORDER_REDEEM'
  | 'ORDER_REDEEM_REFUND'
  | 'ADJUSTMENT';

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface Category {
  id: ID;
  name: string;
  parentId: ID | null;
  level: number;
  path: string;
  sort: number;
  isVisible: boolean;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
  children?: Category[];
}

export interface CategoryInput {
  name: string;
  parentId?: ID;
  sort?: number;
  isVisible?: boolean;
  description?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  parentId?: ID | null;
  sort?: number;
  isVisible?: boolean;
  description?: string;
}

export interface ProductSku {
  id: ID;
  productId?: ID;
  skuCode?: string | null;
  name: string;
  specs?: Record<string, string> | null;
  price: string;
  originPrice?: string | null;
  stock: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductImage {
  id: ID;
  productId?: ID;
  url: string;
  sort: number;
  isMain: boolean;
  createdAt?: string;
}

export interface ProductSkuInput {
  name: string;
  skuCode?: string;
  specs?: Record<string, string>;
  price: number;
  originPrice?: number;
  stock: number;
  isActive?: boolean;
}

export interface ProductImageInput {
  url: string;
  sort?: number;
  isMain?: boolean;
}

export interface ProductInput {
  categoryId: ID;
  name: string;
  subtitle?: string;
  description?: string;
  status?: ProductStatus;
  sort?: number;
  skus: ProductSkuInput[];
  images?: ProductImageInput[];
}

export interface ProductQuery {
  categoryId?: ID;
  keyword?: string;
}

export interface AdminProductQuery extends ProductQuery {
  status?: ProductStatus;
}

export interface Product {
  id: ID;
  categoryId: ID;
  category?: Category;
  name: string;
  subtitle?: string | null;
  description?: string | null;
  status: ProductStatus;
  salesCount: number;
  sort: number;
  skus: ProductSku[];
  images: ProductImage[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfile {
  id: ID;
  openId: string;
  unionId?: string | null;
  nickname?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  status: UserStatus;
  memberLevel: number;
  growthValue: number;
  pointsBalance: number;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface MiniappUser extends UserProfile {}

export interface AdminUser extends UserProfile {}

export interface WxLoginInput {
  code: string;
  mockOpenId?: string;
  unionId?: string;
  nickname?: string;
  avatarUrl?: string;
}

export interface MiniappLoginResult {
  accessToken: string;
  refreshToken: string;
  user: MiniappUser;
}

export interface AdminLoginInput {
  username: string;
  password: string;
}

export interface AdminProfile {
  id: ID;
  username: string;
  nickname?: string | null;
  role: AdminRole;
  status: UserStatus;
  lastLoginAt?: string | null;
}

export interface AdminLoginResult {
  accessToken: string;
  admin: AdminProfile;
}

export interface CartItemSku {
  id: ID;
  skuCode?: string | null;
  name: string;
  specs?: Record<string, string> | null;
  price: string;
  originPrice?: string | null;
  stock: number;
  isActive: boolean;
}

export interface CartItemProduct {
  id: ID;
  name: string;
  subtitle?: string | null;
  status: ProductStatus;
  mainImage?: string | null;
}

export interface CartItem {
  skuId: ID;
  quantity: number;
  checked: boolean;
  addedAt: string;
  updatedAt: string;
  available: boolean;
  unavailableReason?: string | null;
  sku: CartItemSku | null;
  product: CartItemProduct | null;
}

export interface CartSummary {
  totalQuantity: number;
  checkedQuantity: number;
  checkedCount: number;
}

export interface Cart {
  items: CartItem[];
  summary: CartSummary;
}

export interface AddCartItemInput {
  skuId: ID;
  quantity: number;
  checked?: boolean;
}

export interface UpdateCartItemInput {
  quantity: number;
}

export interface UpdateCartItemCheckedInput {
  checked: boolean;
}

export interface UserAddress {
  id: ID;
  userId: ID;
  receiverName: string;
  receiverPhone: string;
  province: string;
  city: string;
  district: string;
  detailAddress: string;
  postalCode?: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AddressInput {
  receiverName: string;
  receiverPhone: string;
  province: string;
  city: string;
  district: string;
  detailAddress: string;
  postalCode?: string;
  isDefault?: boolean;
}

export interface UpdateAddressInput {
  receiverName?: string;
  receiverPhone?: string;
  province?: string;
  city?: string;
  district?: string;
  detailAddress?: string;
  postalCode?: string;
  isDefault?: boolean;
}

export interface Coupon {
  id: ID;
  name: string;
  code: string;
  type: CouponType;
  thresholdAmount: string;
  discountAmount: string;
  totalStock: number;
  claimedCount: number;
  usedCount: number;
  perUserLimit: number;
  validFrom: string;
  validTo: string;
  status: CouponStatus;
  description?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface UserCoupon {
  id: ID;
  userId: ID;
  couponId: ID;
  status: UserCouponStatus;
  claimedAt: string;
  usedAt?: string | null;
  lockedAt?: string | null;
  orderId?: ID | null;
  coupon: Coupon;
}

export interface PointLedger {
  id: ID;
  userId: ID;
  orderId?: ID | null;
  type: PointLedgerType;
  points: number;
  balanceAfter: number;
  description?: string | null;
  createdAt: string;
}

export interface PointRedeemRules {
  enabled: boolean;
  pointsPerYuan: number;
  source?: 'database' | 'env';
  updatedAt?: string | null;
}

export interface UpdatePointRedeemRulesInput {
  enabled?: boolean;
  pointsPerYuan: number;
}

export interface CouponInput {
  name: string;
  code?: string;
  thresholdAmount: number;
  discountAmount: number;
  totalStock: number;
  perUserLimit?: number;
  validFrom: string;
  validTo: string;
  description?: string;
}

export interface CouponQuery {
  status?: CouponStatus;
  keyword?: string;
}

export interface OrderItem {
  id: ID;
  orderId?: ID;
  productId?: ID;
  skuId?: ID;
  productName: string;
  skuName: string;
  skuSpecs?: Record<string, string> | null;
  productImageUrl?: string | null;
  unitPrice: string;
  quantity: number;
  totalAmount: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderUser {
  id: ID;
  openId: string;
  nickname?: string | null;
  phone?: string | null;
}

export interface OrderLogisticsTrace {
  id: ID;
  orderId: ID;
  status: OrderLogisticsTraceStatus;
  content: string;
  logisticsCompany?: string | null;
  trackingNo?: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface Order {
  id: ID;
  orderNo: string;
  userId?: ID;
  status: OrderStatus;
  totalAmount: string;
  payableAmount: string;
  discountAmount: string;
  pointsUsed: number;
  pointsDiscountAmount: string;
  userCouponId?: ID | null;
  couponId?: ID | null;
  couponCode?: string | null;
  couponName?: string | null;
  couponDiscountAmount?: string | null;
  shippingAddressId?: ID | null;
  receiverName?: string | null;
  receiverPhone?: string | null;
  receiverProvince?: string | null;
  receiverCity?: string | null;
  receiverDistrict?: string | null;
  receiverDetailAddress?: string | null;
  receiverPostalCode?: string | null;
  totalQuantity: number;
  remark?: string | null;
  paidAt?: string | null;
  shippedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  logisticsCompany?: string | null;
  trackingNo?: string | null;
  deliveryRemark?: string | null;
  createdAt: string;
  updatedAt?: string;
  items: OrderItem[];
  refunds?: Refund[];
  afterSales?: AfterSale[];
  logisticsTraces?: OrderLogisticsTrace[];
  user?: OrderUser;
}

export interface OrderListResult {
  items: Order[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateOrderInput {
  shippingAddressId?: ID;
  userCouponId?: ID;
  usePoints?: boolean;
  remark?: string;
}

export interface CancelOrderInput {
  reason?: string;
}

export interface UserOrderQuery {
  status?: OrderStatus;
  page?: number;
  pageSize?: number;
}

export interface AdminOrderQuery {
  status?: OrderStatus;
  logisticsTraceStatus?: OrderLogisticsTraceStatus;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface ShipOrderInput {
  logisticsCompany?: string;
  trackingNo?: string;
  remark?: string;
}

export interface AddOrderLogisticsTraceInput {
  status: OrderLogisticsTraceStatus;
  content: string;
  logisticsCompany?: string;
  trackingNo?: string;
}

export interface AdminUserQuery {
  keyword?: string;
}

export interface Payment {
  id: ID;
  paymentNo: string;
  orderId: ID;
  channel?: PaymentChannel;
  amount: string;
  status: PaymentStatus;
  prepayId?: string | null;
  transactionId?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WechatPayParams {
  appId: string;
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: string;
  paySign: string;
}

export interface WechatPrepayResult {
  payment: Payment;
  wechatPayParams: WechatPayParams;
}

export interface WechatNotifyInput {
  orderId: ID;
  orderNo: string;
  transactionId: string;
  amount: number;
  tradeState?: string;
}

export interface CreateRefundInput {
  orderId: ID;
  amount: number;
  reason?: string;
}

export interface WechatRefundNotifyInput {
  refundNo: string;
  transactionId: string;
  amount: number;
  refundStatus?: string;
}

export interface WechatRefundNotifyResult {
  received: boolean;
  idempotent: boolean;
  refund: Refund | null;
}

export interface UpdateRefundStatusInput {
  status: Extract<RefundStatus, 'SUCCESS' | 'FAILED'>;
  failureReason?: string;
}

export interface WechatNotifyResult {
  received: boolean;
  idempotent: boolean;
  payment: Payment | null;
}

export interface Refund {
  id: ID;
  refundNo: string;
  orderId: ID;
  paymentId?: ID | null;
  amount: string;
  reason?: string | null;
  status: RefundStatus;
  failureSource?: RefundFailureSource | null;
  failureReason?: string | null;
  transactionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AfterSaleOrderSnapshot {
  id: ID;
  orderNo: string;
  status: OrderStatus;
  payableAmount: string;
}

export interface AfterSaleUserSnapshot {
  id: ID;
  openId: string;
  nickname?: string | null;
  phone?: string | null;
}

export interface AfterSaleLog {
  id: ID;
  afterSaleId: ID;
  actorType: AfterSaleActorType;
  actorId?: ID | null;
  action: string;
  content?: string | null;
  createdAt: string;
}

export interface AfterSaleRefundSnapshot {
  id: ID;
  refundNo: string;
  amount: string;
  status: RefundStatus;
  failureSource?: RefundFailureSource | null;
  failureReason?: string | null;
}

export interface AfterSale {
  id: ID;
  afterSaleNo: string;
  orderId: ID;
  userId: ID;
  type: AfterSaleType;
  status: AfterSaleStatus;
  reason: string;
  description?: string | null;
  evidenceImageUrls?: string[] | null;
  requestedAmount: string;
  approvedAmount?: string | null;
  rejectReason?: string | null;
  merchantRemark?: string | null;
  returnLogisticsCompany?: string | null;
  returnTrackingNo?: string | null;
  returnRemark?: string | null;
  refundId?: ID | null;
  approvedAt?: string | null;
  buyerReturnedAt?: string | null;
  merchantReceivedAt?: string | null;
  rejectedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  order?: AfterSaleOrderSnapshot;
  user?: AfterSaleUserSnapshot;
  refund?: AfterSaleRefundSnapshot;
  logs?: AfterSaleLog[];
}

export interface AfterSaleListResult {
  items: AfterSale[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateAfterSaleInput {
  orderId: ID;
  type: AfterSaleType;
  reason: string;
  description?: string;
  requestedAmount: number;
  evidenceImageUrls?: string[];
}

export interface UserAfterSaleQuery {
  orderId?: ID;
  status?: AfterSaleStatus;
  type?: AfterSaleType;
  page?: number;
  pageSize?: number;
}

export interface AdminAfterSaleQuery extends UserAfterSaleQuery {
  keyword?: string;
}

export interface ApproveAfterSaleInput {
  approvedAmount?: number;
  merchantRemark?: string;
}

export interface RejectAfterSaleInput {
  rejectReason: string;
  merchantRemark?: string;
}

export interface SubmitReturnLogisticsInput {
  returnLogisticsCompany: string;
  returnTrackingNo: string;
  returnRemark?: string;
}

export interface ConfirmReturnReceivedInput {
  merchantRemark?: string;
}

export interface UploadResult {
  url: string;
  path: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  storage: 'local';
}

export interface DashboardMetrics {
  gmv: string;
  totalOrders: number;
  todayOrders: number;
  pendingDeliveryOrders: number;
  totalUsers: number;
  productsOnSale: number;
  totalProducts: number;
  activeCoupons: number;
  claimedCoupons: number;
  usedCoupons: number;
  couponDiscountAmount: string;
  pointsIssued: number;
  pointsBalanceTotal: number;
  pointLedgerCount: number;
}

export interface DashboardOverview {
  metrics: DashboardMetrics;
  recentOrders: Order[];
}
