# API 兼容说明

本文档记录本地 MVP 开发过程中已经发生的接口返回结构调整，以及前端 / SDK 调用方需要注意的迁移点。

## 用户侧订单列表分页

涉及接口：

```text
GET /api/orders
```

变更时间：

```text
P4-32
```

### 变更前

用户侧订单列表直接返回订单数组：

```ts
type ResponseData = Order[];
```

旧调用方式：

```ts
const orders = await fetchOrders({ status: 'PENDING_PAYMENT' });
orders.map((order) => order.orderNo);
```

### 变更后

用户侧订单列表返回分页对象：

```ts
interface OrderListResult {
  items: Order[];
  total: number;
  page: number;
  pageSize: number;
}
```

新调用方式：

```ts
const result = await fetchOrders({
  status: 'PENDING_PAYMENT',
  page: 1,
  pageSize: 10,
});

result.items.map((order) => order.orderNo);
```

分页参数：

- `status`：可选，订单状态筛选。
- `page`：可选，默认 `1`。
- `pageSize`：可选，默认 `10`，最大 `50`。

响应字段：

- `items`：当前页订单。
- `total`：当前筛选条件下的订单总数。
- `page`：当前页码。
- `pageSize`：当前页大小。

### 已同步调用方

- `packages/shared-types`
  - `UserOrderQuery` 已新增 `page` / `pageSize`。
  - `OrderListResult` 为用户侧和后台侧共用分页结果类型。
- `packages/api-sdk`
  - `createMiniappApi(...).fetchOrders()` 现在返回 `OrderListResult`。
- `apps/miniapp`
  - `pages/order/list` 已改为读取 `result.items`。
  - 已支持刷新第一页、触底加载更多和下拉刷新。

### 已检查范围

当前小程序侧只有订单列表页调用 `fetchOrders`。

```text
apps/miniapp/src/pages/order/list.tsx
```

订单详情页使用：

```text
fetchOrderDetail(id)
```

订单确认页使用：

```text
createOrderFromCart(...)
```

因此小程序其它页面没有继续假设 `GET /api/orders` 返回数组。

### 回归验证

推荐执行：

```bash
pnpm typecheck
pnpm smoke:transaction
```

`pnpm smoke:transaction` 会在交易闭环完成后额外断言：

- `GET /api/orders?status=COMPLETED&page=1&pageSize=10` 返回分页结构。
- `items` 是数组。
- `page` / `pageSize` 与请求一致。
- `total >= 1`。
- 当前 smoke 刚完成的订单出现在返回的第一页中。

## 订单物流轨迹与后台物流筛选

涉及接口：

```text
GET /api/orders
GET /api/orders/:id
GET /api/admin/orders
PATCH /api/admin/orders/:id/ship
POST /api/admin/orders/:id/logistics-traces
```

变更时间：

```text
P7-05 ~ P7-15
```

### 新增订单字段

订单响应新增可选字段：

```ts
type OrderLogisticsTraceStatus =
  | 'SHIPPED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERING'
  | 'DELIVERED'
  | 'EXCEPTION';

interface OrderLogisticsTrace {
  id: ID;
  orderId: ID;
  status: OrderLogisticsTraceStatus;
  content: string;
  logisticsCompany?: string | null;
  trackingNo?: string | null;
  occurredAt: string;
  createdAt: string;
}

interface Order {
  logisticsTraces?: OrderLogisticsTrace[];
}
```

兼容说明：

- `logisticsTraces` 为可选字段，旧数据或旧接口调用方应按空数组处理。
- 用户侧订单列表、用户侧订单详情和后台订单列表都会带出该字段。
- 当前按 `occurredAt desc` 返回，调用方可用 `order.logisticsTraces?.[0]` 读取最新轨迹。
- `orders` 表上的 `logisticsCompany`、`trackingNo`、`shippedAt`、`deliveryRemark` 仍保留，作为发货快照和无轨迹时的兼容展示字段。

### 后台发货行为

后台发货接口：

```text
PATCH /api/admin/orders/:id/ship
```

发货成功后除了更新订单发货字段，还会自动写入一条物流轨迹：

```ts
{
  status: 'SHIPPED',
  content: '商家已发货，包裹等待揽收'
}
```

如果发货时未填写物流单号，轨迹内容为：

```text
商家已发货
```

### 手动追加轨迹

新增后台接口：

```text
POST /api/admin/orders/:id/logistics-traces
```

请求体：

```ts
interface AddOrderLogisticsTraceInput {
  status: OrderLogisticsTraceStatus;
  content: string;
  logisticsCompany?: string;
  trackingNo?: string;
}
```

约束：

- 仅后台管理员可调用。
- 订单必须已经发货，即存在 `shippedAt`。
- `status` 只允许使用 `OrderLogisticsTraceStatus` 的枚举值。
- 未传 `logisticsCompany` / `trackingNo` 时，会沿用订单发货字段中的物流公司 / 单号。

### 后台物流状态筛选

后台订单列表新增查询参数：

```ts
interface AdminOrderQuery {
  status?: OrderStatus;
  logisticsTraceStatus?: OrderLogisticsTraceStatus;
  keyword?: string;
  page?: number;
  pageSize?: number;
}
```

接口示例：

```text
GET /api/admin/orders?logisticsTraceStatus=EXCEPTION&page=1&pageSize=20
```

筛选语义：

- 返回至少存在一条指定物流状态轨迹的订单。
- 可与 `status`、`keyword`、`page`、`pageSize` 组合使用。
- 例如筛选异常物流的已发货订单：

```text
GET /api/admin/orders?status=SHIPPED&logisticsTraceStatus=EXCEPTION
```

### 迁移和回归注意事项

物流轨迹依赖数据库迁移：

```text
apps/server/prisma/migrations/20260617000100_add_order_logistics_trace/migration.sql
```

本地联调前需要执行：

```bash
pnpm db:up
pnpm --filter @mall/server prisma:migrate:deploy
pnpm db:seed
```

当前 Codex 环境中 Docker daemon 未运行时，`pnpm db:up` 会失败，因此无法应用迁移和执行完整 smoke。

完整 smoke 可用后，推荐执行：

```bash
pnpm smoke:transaction
```

smoke 会验证：

- 后台发货后自动生成物流轨迹。
- 用户订单详情返回物流轨迹。
- 后台手动追加物流轨迹后，用户订单详情可见。
- 后台订单列表可按 `logisticsTraceStatus=IN_TRANSIT` 筛选到当前 smoke 订单。

## P8 售后基础模型与接口

P8-02 新增售后单基础模型，先覆盖“用户创建售后申请 + 用户查询 / 取消 + 后台查询 / 审核通过 / 驳回”的状态闭环。P8-05 补充退货物流填写和商家确认收货。P8-06 接入后台触发售后退款和退款状态回写。

当前不包含：

- 换货 / 维修。
- 真实物流查询。

### 新增类型

```ts
type AfterSaleType = 'REFUND_ONLY' | 'RETURN_REFUND';

type AfterSaleStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'WAIT_BUYER_RETURN'
  | 'BUYER_RETURNED'
  | 'MERCHANT_RECEIVED'
  | 'REFUNDING'
  | 'COMPLETED'
  | 'CANCELLED';

type AfterSaleActorType = 'USER' | 'ADMIN' | 'SYSTEM';
```

### 响应字段

```ts
interface AfterSale {
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
  order?: {
    id: ID;
    orderNo: string;
    status: OrderStatus;
    payableAmount: string;
  };
  user?: {
    id: ID;
    openId: string;
    nickname?: string | null;
    phone?: string | null;
  };
  refund?: {
    id: ID;
    refundNo: string;
    amount: string;
    status: RefundStatus;
    failureSource?: RefundFailureSource | null;
    failureReason?: string | null;
  };
  logs?: AfterSaleLog[];
}
```

兼容说明：

- `Refund` 仍只表示资金退款记录，不承载售后审核、退货物流或买家举证。
- `Order.afterSales` 为可选字段，旧调用方可以忽略。
- P8-02 不会因为创建售后单立即修改订单状态。
- P8-06 后，后台触发售后退款会复用既有 `Refund`、订单 `REFUNDING` / `REFUNDED` 状态和积分退款扣回 / 返还逻辑。

### 用户侧接口

```text
POST /api/after-sales
GET  /api/after-sales
GET  /api/after-sales/summary
GET  /api/after-sales/:id
PATCH /api/after-sales/:id/cancel
PATCH /api/after-sales/:id/return-logistics
```

创建售后请求体：

```ts
interface CreateAfterSaleInput {
  orderId: ID;
  type: AfterSaleType;
  reason: string;
  description?: string;
  requestedAmount: number;
  evidenceImageUrls?: string[];
}

interface SubmitReturnLogisticsInput {
  returnLogisticsCompany: string;
  returnTrackingNo: string;
  returnRemark?: string;
}

interface UserAfterSaleSummaryQuery {
  orderId?: ID;
  type?: AfterSaleType;
}

interface AfterSaleSummary {
  total: number;
  statusCounts: Array<{
    status: AfterSaleStatus;
    count: number;
  }>;
}
```

约束：

- 仅当前订单所属用户可创建和访问售后单。
- 待支付、已取消、已退款订单不能创建售后单。
- `RETURN_REFUND` 仅允许已发货或已完成订单。
- 当前订单存在未完结售后单时，不允许重复创建订单级售后。
- `requestedAmount` 必须大于 0，且不能超过订单实付金额。
- 用户仅可取消 `REQUESTED` 或 `WAIT_BUYER_RETURN` 状态的售后单。
- 用户仅可在 `WAIT_BUYER_RETURN` 状态填写退货物流，填写后进入 `BUYER_RETURNED`。
- 用户侧售后列表支持 `orderId` 查询参数，用于订单详情页展示当前订单关联售后。
- 用户侧售后计数聚合接口支持按 `orderId` 和 `type` 筛选，一次返回总数和各状态数量，用于小程序售后列表状态 tab / 概览卡片。

### 后台接口

```text
GET   /api/admin/after-sales
GET   /api/admin/after-sales/:id
PATCH /api/admin/after-sales/:id/approve
PATCH /api/admin/after-sales/:id/reject
PATCH /api/admin/after-sales/:id/confirm-return-received
PATCH /api/admin/after-sales/:id/trigger-refund
```

后台查询参数：

```ts
interface AdminAfterSaleQuery {
  orderId?: ID;
  status?: AfterSaleStatus;
  type?: AfterSaleType;
  keyword?: string;
  page?: number;
  pageSize?: number;
}
```

审核通过请求体：

```ts
interface ApproveAfterSaleInput {
  approvedAmount?: number;
  merchantRemark?: string;
}
```

驳回请求体：

```ts
interface RejectAfterSaleInput {
  rejectReason: string;
  merchantRemark?: string;
}

interface ConfirmReturnReceivedInput {
  merchantRemark?: string;
}
```

后台审核规则：

- 仅 `REQUESTED` 状态可审核通过或驳回。
- `REFUND_ONLY` 审核通过后进入 `APPROVED`。
- `RETURN_REFUND` 审核通过后进入 `WAIT_BUYER_RETURN`。
- 驳回后进入 `REJECTED` 并记录 `rejectReason`。
- 仅 `BUYER_RETURNED` 状态可确认收到退货，确认后进入 `MERCHANT_RECEIVED`。
- 仅 `APPROVED` 的 `REFUND_ONLY` 或 `MERCHANT_RECEIVED` 的 `RETURN_REFUND` 可触发售后退款。
- 触发退款后售后进入 `REFUNDING`，关联 `refundId`，订单进入 `REFUNDING`。
- 退款成功后售后进入 `COMPLETED` 并写入 `completedAt`。
- 退款失败后 `REFUND_ONLY` 回到 `APPROVED`，`RETURN_REFUND` 回到 `MERCHANT_RECEIVED`，允许后台再次触发退款。
- 每次创建、取消、审核通过、驳回、填写退货物流、确认退货收货、触发退款、退款成功 / 失败都会写入 `AfterSaleLog`。

### 小程序页面入口

P8-03 新增小程序页面：

```text
pages/after-sale/apply
pages/after-sale/detail
```

订单详情页会在以下订单状态展示售后入口：

```text
PENDING_DELIVERY
SHIPPED
COMPLETED
REFUNDING
```

入口行为：

- 当前订单无未完结售后时，进入 `pages/after-sale/apply?orderId=...`。
- 当前订单已有未完结售后时，进入 `pages/after-sale/detail?id=...`。
- 订单详情页会展示当前订单的售后记录列表。
- 售后申请页会通过 `GET /api/after-sales?orderId=...` 检查是否已有售后单。
- 售后详情页支持用户取消 `REQUESTED` / `WAIT_BUYER_RETURN` 状态的售后单。
- 售后详情页支持用户在 `WAIT_BUYER_RETURN` 状态填写退货物流。
- 售后详情页展示关联退款单号、退款状态、退款金额和失败原因。

### 后台页面入口

P8-04 新增管理后台页面：

```text
/after-sales
```

后台菜单新增“售后管理”，页面能力：

- 按售后状态筛选。
- 按售后类型筛选。
- 按售后单号、订单号、用户 OpenID / 昵称 / 手机号关键词搜索。
- 展开行查看订单快照、用户信息、申请原因、商家备注、退货物流和处理记录。
- 对 `REQUESTED` 状态售后执行“通过”或“驳回”。
- 对 `BUYER_RETURNED` 状态售后执行“确认收货”。
- 对 `APPROVED` 的 `REFUND_ONLY` 或 `MERCHANT_RECEIVED` 的 `RETURN_REFUND` 执行“触发退款”。
- 展开行查看关联退款单号、退款状态、退款金额和失败原因。

当前后台售后状态推进：

- `REFUND_ONLY` 通过后进入 `APPROVED`。
- `RETURN_REFUND` 通过后进入 `WAIT_BUYER_RETURN`。
- 驳回后进入 `REJECTED`。
- 买家填写退货物流后进入 `BUYER_RETURNED`。
- 商家确认收到退货后进入 `MERCHANT_RECEIVED`。
- 后台触发退款后进入 `REFUNDING`。
- 退款成功后进入 `COMPLETED`。
- 退款失败后回到可重新触发退款的业务状态。

### 迁移和回归注意事项

售后基础模型依赖数据库迁移：

```text
apps/server/prisma/migrations/20260618000100_add_after_sale/migration.sql
apps/server/prisma/migrations/20260618000200_add_after_sale_return_logistics/migration.sql
```

本地联调前需要执行：

```bash
pnpm db:up
pnpm --filter @mall/server prisma:migrate:deploy
pnpm db:seed
```

P8-02 当前已通过静态校验和服务端构建。完整数据库 smoke 需要 Docker 启动后再补。

## P8-07 订单物流查询适配层

P8-07 新增服务端物流查询适配层，当前默认接入 `mock` provider，后续真实快递聚合服务或直连服务商只替换 provider，不把第三方字段扩散到订单业务代码。

后台新增接口：

```text
POST /api/admin/orders/:id/logistics-traces/refresh
```

接口行为：

- 仅已发货订单可刷新物流。
- 订单必须已有 `trackingNo`。
- 服务端通过 `LogisticsService` 查询 provider，并写入现有 `OrderLogisticsTrace`。
- 写入时按状态、内容、物流单号、发生时间做幂等去重，重复刷新不会重复插入同一条轨迹。
- 默认 `LOGISTICS_PROVIDER=mock`。
- P8-12 新增 `LOGISTICS_PROVIDER=http-json`，用于对接返回标准 JSON 的物流查询网关或聚合服务适配层。

后台页面：

- 订单管理展开行的“物流轨迹”区域新增“刷新物流”按钮。
- 有发货时间和物流单号时按钮可用。

### http-json provider 契约

启用配置：

```text
LOGISTICS_PROVIDER=http-json
LOGISTICS_HTTP_QUERY_URL=https://example.com/logistics/query
LOGISTICS_HTTP_AUTH_TOKEN=<optional bearer token>
LOGISTICS_HTTP_SIGNING_SECRET=<optional hmac secret>
LOGISTICS_HTTP_TIMEOUT_MS=5000
LOGISTICS_HTTP_RETRY_ATTEMPTS=0
LOGISTICS_HTTP_RETRY_DELAY_MS=300
LOGISTICS_REFRESH_COOLDOWN_SECONDS=60
```

服务端会向 `LOGISTICS_HTTP_QUERY_URL` 发送 `POST application/json` 请求。配置了 `LOGISTICS_HTTP_AUTH_TOKEN` 时，会附带：

```text
Authorization: Bearer <token>
```

配置了 `LOGISTICS_HTTP_SIGNING_SECRET` 时，会额外附带 HMAC-SHA256 签名头：

```text
X-Logistics-Signature-Version: hmac-sha256-v1
X-Logistics-Timestamp: 2026-06-18T08:00:00.000Z
X-Logistics-Nonce: <uuid>
X-Logistics-Signature: <hex hmac>
```

签名明文：

```text
<timestamp>.<nonce>.<raw-json-body>
```

请求体：

```json
{
  "logisticsCompany": "顺丰速运",
  "logisticsCompanyCode": "SF",
  "trackingNo": "SF1234567890",
  "receiverPhoneTail": "0000",
  "orderNo": "MO20260618154626BVZ8CE",
  "afterSaleNo": null
}
```

响应体必须是内部标准结构：

```json
{
  "status": "IN_TRANSIT",
  "queriedAt": "2026-06-18T08:00:00.000Z",
  "traces": [
    {
      "status": "PICKED_UP",
      "content": "快递员已揽收包裹",
      "occurredAt": "2026-06-18T07:20:00.000Z"
    },
    {
      "status": "IN_TRANSIT",
      "content": "包裹正在发往下一站",
      "occurredAt": "2026-06-18T09:00:00.000Z"
    }
  ],
  "rawPayload": {
    "provider": "your-provider-name"
  }
}
```

字段要求：

- `status` 和 `traces[].status` 必须是内部状态之一：`SHIPPED`、`PICKED_UP`、`IN_TRANSIT`、`DELIVERING`、`DELIVERED`、`EXCEPTION`。
- `traces[].content` 不能为空。
- `traces[].occurredAt` 必须是可解析时间。
- provider 返回非 2xx、空轨迹、非法状态或非法时间时，服务端会返回物流查询失败。

物流 provider 错误响应会保持 HTTP 状态语义，同时在 `error.code` 中返回内部错误码：

```json
{
  "code": 503,
  "message": "Logistics provider returned 503",
  "error": {
    "code": "LOGISTICS_PROVIDER_HTTP_ERROR",
    "provider": "http-json",
    "httpStatus": 503
  }
}
```

当前错误码：

- `LOGISTICS_PROVIDER_MISSING_ENDPOINT`：启用 `http-json` 但缺少 `LOGISTICS_HTTP_QUERY_URL`。
- `LOGISTICS_PROVIDER_HTTP_ERROR`：provider 返回非 2xx。
- `LOGISTICS_PROVIDER_INVALID_JSON`：provider 响应不是合法 JSON。
- `LOGISTICS_PROVIDER_INVALID_STATUS`：provider 返回了未知物流状态。
- `LOGISTICS_PROVIDER_INVALID_TRACE`：轨迹内容为空或发生时间不可解析。
- `LOGISTICS_PROVIDER_NO_TRACES`：provider 未返回有效轨迹。
- `LOGISTICS_PROVIDER_TIMEOUT`：请求超时。
- `LOGISTICS_PROVIDER_QUERY_FAILED`：网络或其它未分类查询失败。

重试策略：

- `LOGISTICS_HTTP_RETRY_ATTEMPTS` 默认为 `0`，即保持单次查询。
- 设置为 `1` 表示失败后最多额外重试 1 次。
- `LOGISTICS_HTTP_RETRY_DELAY_MS` 控制每次重试前等待时间，默认 `300` 毫秒。
- 仅以下临时失败会重试：
  - `LOGISTICS_PROVIDER_TIMEOUT`
  - `LOGISTICS_PROVIDER_QUERY_FAILED`
  - `LOGISTICS_PROVIDER_HTTP_ERROR` 且 provider HTTP 状态为 `5xx`
- 配置错误、非法 JSON、非法状态、空轨迹和非法轨迹不会重试。

后台刷新频控：

- 未显式配置 `LOGISTICS_REFRESH_COOLDOWN_SECONDS` 时，`mock` provider 默认不启用服务端冷却，非 `mock` provider 默认 `60` 秒。
- 设置 `LOGISTICS_REFRESH_COOLDOWN_SECONDS=60` 可显式启用 60 秒冷却。
- 同一 API 实例内，同一订单在冷却期内重复调用刷新接口会返回 `429`。
- 设置为 `0` 可关闭本地冷却。
- 当前冷却为进程内保护，适合本地和单实例部署；多实例强一致频控可后续升级为 Redis 锁。

冷却错误示例：

```json
{
  "code": 429,
  "message": "Logistics refresh is cooling down. Please retry after 58 seconds.",
  "error": {
    "code": "LOGISTICS_REFRESH_COOLDOWN",
    "retryAfterSeconds": 58
  }
}
```

后台页面本地冷却：

- 商家后台订单页默认点击“刷新物流”后会进入 60 秒本地按钮冷却。
- 可通过 `VITE_LOGISTICS_REFRESH_COOLDOWN_SECONDS` 调整。
- 设置为 `0` 可关闭前端本地按钮冷却。
- 如果服务端返回 `LOGISTICS_REFRESH_COOLDOWN`，前端会使用响应里的 `retryAfterSeconds` 校准倒计时。

本地 fake endpoint smoke：

```bash
pnpm smoke:logistics-provider
```

该脚本不依赖数据库或 Nest API，会直接验证 `http-json` provider 的请求格式、Bearer Token、HMAC 签名、响应归一化和失败分支错误码。
