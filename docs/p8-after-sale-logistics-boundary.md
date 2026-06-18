# P8 售后与退货物流边界调研

记录时间：2026-06-17

本文档用于 P8-01 阶段，确认当前退款 / 物流能力现状，并拆分后续售后、退货物流和真实物流查询的实现边界。

## 结论

P8 建议先建设“售后单”领域模型，再把现有退款能力接入售后流程。

推荐顺序：

1. `P8-02`：新增售后单模型与基础状态机。
2. `P8-03`：小程序订单详情增加申请售后入口。
3. `P8-04`：后台增加售后审核与退款触发入口。
4. `P8-05`：增加退货物流单号填写和退货物流轨迹。
5. `P8-06`：接入真实物流查询适配层。

不建议直接扩展现有 `Refund` 表承载所有售后信息。`Refund` 当前已经承担支付退款和微信退款状态同步职责，继续塞入退货、换货、审核、买家举证、商家收货等字段会让职责混乱。

## 当前能力

| 能力                | 当前状态 | 说明                                                        |
| ------------------- | -------- | ----------------------------------------------------------- |
| 退款记录            | 已完成   | `Refund` 记录退款金额、原因、状态、微信退款交易号和失败源。 |
| 用户发起退款        | 已完成   | 用户可通过 `/api/refunds` 对订单创建退款记录。              |
| 后台处理退款        | 已完成   | 后台可确认退款、驳回退款、重试微信退款。                    |
| 微信退款回调        | 已完成   | mock / real 模式均有退款回调处理入口。                      |
| 退款积分边界        | 已完成   | 退款成功 / 失败会处理积分扣回和积分返还。                   |
| 订单物流轨迹        | 已完成   | 订单维度支持发货自动轨迹、后台手动追加轨迹和状态筛选。      |
| 退货物流            | 未完成   | 当前没有买家寄回物流公司、退货单号、商家收货确认等字段。    |
| 售后审核            | 未完成   | 当前没有独立售后申请、审核原因、凭证、协商记录。            |
| 换货流程            | 未完成   | 当前没有换货商品、补发物流、换货完成状态。                  |
| 真实物流查询 / 订阅 | 未完成   | 当前物流轨迹由后台维护，没有接服务商查询或回调。            |
| 多包裹 / 拆单       | 未完成   | 当前物流轨迹按订单维度记录，不支持多包裹。                  |

## 边界拆分

### Refund：资金退款记录

继续保留现有职责：

- 记录微信退款单号、退款金额、状态、交易号、失败原因。
- 处理微信退款下单、回调、重试和幂等。
- 负责订单金额相关状态：
  - 部分退款后订单回到原履约状态。
  - 全额退款后订单进入 `REFUNDED`。
- 触发积分扣回、积分返还等资金相关副作用。

不建议新增职责：

- 不记录退货物流单号。
- 不记录售后审核过程。
- 不记录买家凭证图片。
- 不承载换货或补发物流。

### AfterSale：售后申请

建议新增独立售后单，承担业务流程：

- 买家申请退款 / 退货退款 / 换货。
- 记录申请原因、说明、凭证图片。
- 后台审核通过或驳回。
- 记录退货地址和退货要求。
- 买家填写退货物流。
- 商家确认收货。
- 触发退款记录创建或换货补发。
- 记录售后操作日志。

### ReturnShipment：退货物流

建议退货物流独立于订单正向物流：

- 正向物流：商家发货给买家，继续使用 `OrderLogisticsTrace`。
- 退货物流：买家退回给商家，建议使用售后单维度的 `AfterSaleReturnShipment`。
- 换货补发物流：商家再次发货给买家，建议后续单独用 `AfterSaleExchangeShipment`，不要复用订单原始发货字段。

## 售后类型

建议第一阶段支持：

| 类型            | 说明                           | 是否需要退货物流 |
| --------------- | ------------------------------ | ---------------- |
| `REFUND_ONLY`   | 仅退款，适用于未发货或无需退货 | 否               |
| `RETURN_REFUND` | 退货退款，买家寄回后退款       | 是               |

第二阶段再支持：

| 类型       | 说明                       | 是否需要物流     |
| ---------- | -------------------------- | ---------------- |
| `EXCHANGE` | 换货，买家退回后商家补发   | 是，且有双向物流 |
| `REPAIR`   | 维修，寄回处理后再寄回买家 | 是，且有双向物流 |

## 建议状态机

第一阶段售后单状态：

```text
REQUESTED
APPROVED
REJECTED
WAIT_BUYER_RETURN
BUYER_RETURNED
MERCHANT_RECEIVED
REFUNDING
COMPLETED
CANCELLED
```

建议流转：

```text
仅退款:
REQUESTED -> APPROVED -> REFUNDING -> COMPLETED
REQUESTED -> REJECTED
REQUESTED -> CANCELLED

退货退款:
REQUESTED -> APPROVED -> WAIT_BUYER_RETURN -> BUYER_RETURNED -> MERCHANT_RECEIVED -> REFUNDING -> COMPLETED
REQUESTED -> REJECTED
WAIT_BUYER_RETURN -> CANCELLED
```

订单状态建议：

- 售后申请创建后，订单可继续保留原履约状态，避免 `OrderStatus` 无限膨胀。
- 订单列表通过 `afterSales` 摘要展示“售后中 / 退款中 / 已完成”。
- 只有进入资金退款时，才复用当前 `REFUNDING` / `REFUNDED` 订单状态。

## 建议数据模型

### AfterSale

建议字段：

```text
id
afterSaleNo
orderId
userId
type
status
reason
description
evidenceImageUrls
requestedAmount
approvedAmount
rejectReason
merchantRemark
refundId
createdAt
updatedAt
approvedAt
rejectedAt
completedAt
cancelledAt
```

索引建议：

```text
afterSaleNo unique
orderId
userId
status
type
createdAt
refundId
```

### AfterSaleItem

建议字段：

```text
id
afterSaleId
orderItemId
productId
skuId
productName
skuName
quantity
refundAmount
```

第一阶段可以先做订单级售后；如果要支持单品售后，再补 `AfterSaleItem`。

### AfterSaleReturnShipment

建议字段：

```text
id
afterSaleId
logisticsCompany
trackingNo
senderName
senderPhone
receiverName
receiverPhone
receiverAddress
status
submittedAt
receivedAt
createdAt
updatedAt
```

状态建议：

```text
WAIT_SUBMIT
SUBMITTED
IN_TRANSIT
DELIVERED
RECEIVED
EXCEPTION
```

### AfterSaleLog

建议字段：

```text
id
afterSaleId
actorType
actorId
action
content
createdAt
```

用于记录：

- 用户提交申请。
- 商家审核通过 / 驳回。
- 用户填写退货单号。
- 物流异常。
- 商家确认收货。
- 系统创建退款记录。
- 微信退款成功 / 失败同步。

## API 建议

### 小程序端

```text
GET  /api/after-sales
GET  /api/after-sales/:id
POST /api/after-sales
POST /api/after-sales/:id/cancel
POST /api/after-sales/:id/return-shipment
```

创建售后建议请求体：

```json
{
  "orderId": "order-id",
  "type": "RETURN_REFUND",
  "reason": "商品破损",
  "description": "收到时外包装破损",
  "requestedAmount": 99,
  "evidenceImageUrls": ["https://example.com/a.png"]
}
```

### 后台端

```text
GET  /api/admin/after-sales
GET  /api/admin/after-sales/:id
POST /api/admin/after-sales/:id/approve
POST /api/admin/after-sales/:id/reject
POST /api/admin/after-sales/:id/confirm-received
POST /api/admin/after-sales/:id/create-refund
```

后台列表筛选建议：

```text
status
type
orderNo
afterSaleNo
keyword
createdFrom
createdTo
```

## 真实物流查询方案

建议做适配层，不把任何服务商字段直接扩散到业务代码。

### 适配器接口

```ts
interface LogisticsProvider {
  query(input: LogisticsQueryInput): Promise<LogisticsQueryResult>;
  subscribe?(input: LogisticsSubscribeInput): Promise<LogisticsSubscribeResult>;
  parseWebhook?(payload: unknown): LogisticsWebhookResult;
}
```

建议统一入参：

```text
provider
logisticsCompanyCode
trackingNo
receiverPhoneTail
orderNo
afterSaleNo
```

建议统一出参：

```text
status
traces[]
rawPayload
queriedAt
```

### 服务商取舍

| 方案                  | 优点                                     | 风险 / 限制                                 | 建议     |
| --------------------- | ---------------------------------------- | ------------------------------------------- | -------- |
| 快递聚合服务          | 覆盖快递公司多，适合中小商家快速接入     | 需付费、需签名、不同套餐可能限制查询 / 订阅 | 优先调研 |
| 顺丰 / 京东等直连接口 | 官方链路清晰，适合自有发货渠道稳定的商家 | 每家单独接入，覆盖面有限                    | 作为补充 |
| 菜鸟 / 平台物流       | 适合淘宝、天猫或平台生态订单             | 对独立私域商城可能有资质和生态限制          | 暂不优先 |
| 继续后台手动维护      | 零外部依赖，当前已可用                   | 运营成本高，不适合订单量上升                | 保留兜底 |

### 第一阶段建议

- 先保留当前后台手动轨迹作为兜底。
- 新增 `LogisticsProvider` 抽象和 mock provider。
- 真实服务商凭证通过环境变量注入。
- 查询结果写入内部统一轨迹表，不直接把第三方 raw 字段暴露给小程序。
- 对同一单号做查询频率限制，避免高频刷新消耗额度。

### 回调 / 订阅建议

如果服务商支持订阅推送：

- 发货或填写退货单号后发起订阅。
- 回调必须验签。
- 回调处理必须幂等。
- raw payload 落库便于排查。
- 异常状态统一映射到内部 `EXCEPTION`。

如果只支持主动查询：

- 后台追加“刷新物流”按钮。
- 服务端做缓存，例如 5 到 15 分钟内不重复请求同一单号。
- 可以后续接入定时任务批量刷新未完成物流。

## P8 实现拆分

### P8-02 售后模型与基础接口

目标：

- 新增售后 Prisma 模型。
- 新增共享类型和 API SDK。
- 支持用户创建售后申请、查询售后详情。
- 支持后台审核通过 / 驳回。

不包含：

- 退货物流。
- 微信退款触发。
- 小程序完整页面。

### P8-03 小程序售后入口

目标：

- 订单详情增加申请售后入口。
- 增加售后申请页。
- 增加售后详情页。

不包含：

- 退货物流轨迹。
- 换货。

### P8-04 后台售后处理

目标：

- 后台增加售后列表和详情。
- 支持审核通过、驳回、备注。
- 审核通过后可触发现有退款能力。

### P8-05 退货物流

目标：

- 用户填写退货物流公司和单号。
- 后台确认收货。
- 小程序展示退货物流摘要。
- smoke 覆盖退货退款主链路。

### P8-06 真实物流查询适配层

目标：

- 新增物流 provider 抽象。
- 增加 mock provider。
- 增加真实 provider 的配置结构和文档。
- 优先接入一个聚合查询服务，后续再扩展直连服务商。

## smoke 建议

售后基础 smoke：

```text
用户创建已支付订单
用户申请仅退款
后台审核通过
系统创建退款记录
后台确认退款成功
订单金额、积分、退款记录正确
售后单进入 COMPLETED
```

退货退款 smoke：

```text
用户创建已发货订单
用户申请退货退款
后台审核通过
用户填写退货物流
后台确认收货
后台触发退款
退款成功
售后单进入 COMPLETED
```

物流查询 smoke：

```text
使用 mock provider 查询物流
写入统一轨迹
重复查询保持幂等
异常轨迹映射为 EXCEPTION
```

## 当前不做

以下能力不进入 P8 第一批开发：

- 多包裹拆单。
- 换货补发。
- 维修售后。
- 仲裁 / 申诉。
- 自动退款规则引擎。
- 平台客服聊天。
- 物流保价和运费险。
- 跨境物流轨迹。

## 推荐下一步

进入实现节点：

```text
P8-02：新增售后单模型与基础状态机。
```
