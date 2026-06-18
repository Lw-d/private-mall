# P6 运营增长能力最小范围

记录时间：2026-06-01

本文档用于 P6 进入优惠券、会员、积分等运营增长能力前，先固定最小可交付范围和实现顺序，避免过早把复杂营销规则耦合进交易主链路。

## 结论

P6 第一阶段优先级：

```text
优惠券 MVP → 会员等级展示 → 积分流水 → 统计增强
```

第一阶段只做“能被运营配置、能被用户领取、能在下单时抵扣、能在订单上留存折扣快照”的优惠券闭环。

暂不做：

- 多券叠加。
- 商品 / 分类定向券。
- 优惠券分享裂变。
- 自动最优券推荐。
- 积分抵现。
- 会员价和多等级复杂权益。
- 跨店铺 / 多商户营销。

## 为什么先做优惠券

当前交易链路已有：

- 购物车勾选结算。
- 订单 `totalAmount` / `payableAmount`。
- 支付按 `payableAmount` 预下单。
- 支付回调按订单金额校验。

优惠券是最直接影响支付金额的增长能力。需要先把折扣计算、订单快照、核销与取消退回边界固定下来，再扩展会员和积分，避免后续多套价格规则互相覆盖。

## 优惠券 MVP 范围

### 运营后台

运营可以：

- 创建优惠券。
- 编辑未开始或未领取的优惠券基础信息。
- 上架 / 下架优惠券。
- 查看优惠券列表。
- 查看领取数量、使用数量和库存。

优惠券字段建议：

| 字段              | 说明                                |
| ----------------- | ----------------------------------- |
| `name`            | 优惠券名称                          |
| `code`            | 系统生成或运营填写的唯一券码        |
| `type`            | 首期只支持满减券                    |
| `thresholdAmount` | 使用门槛，订单商品金额满多少可用    |
| `discountAmount`  | 抵扣金额                            |
| `totalStock`      | 发放总量                            |
| `claimedCount`    | 已领取数量                          |
| `usedCount`       | 已使用数量                          |
| `perUserLimit`    | 每个用户最多领取数量，首期默认 1    |
| `validFrom`       | 有效期开始                          |
| `validTo`         | 有效期结束                          |
| `status`          | draft / active / inactive / expired |
| `description`     | 使用说明                            |

### 用户端

用户可以：

- 查看可领取优惠券。
- 领取优惠券。
- 在订单确认页查看当前可用优惠券。
- 选择一张优惠券抵扣订单。
- 在订单详情中看到优惠券抵扣金额。

首期只允许每笔订单使用一张优惠券。

### 订单与支付

下单时服务端负责：

- 重新读取购物车已勾选商品和 SKU 价格。
- 校验用户优惠券归属、状态、有效期和使用门槛。
- 计算 `discountAmount`。
- 将 `payableAmount = totalAmount - discountAmount`。
- 在订单上保存优惠券快照，避免运营后续修改券信息影响历史订单。
- 将用户优惠券标记为锁定或已使用。
- 支付回调仍按订单 `payableAmount` 校验金额。

订单取消时：

- 如果订单仍未支付，恢复 SKU 库存。
- 如果已锁定优惠券，释放为可再次使用。

支付成功后：

- 优惠券状态确认已使用。
- 订单进入待发货。

## 建议数据模型

### Coupon

```text
id
name
code
type
thresholdAmount
discountAmount
totalStock
claimedCount
usedCount
perUserLimit
validFrom
validTo
status
description
createdAt
updatedAt
```

### UserCoupon

```text
id
userId
couponId
status
claimedAt
usedAt
lockedAt
orderId
```

状态建议：

```text
AVAILABLE
LOCKED
USED
EXPIRED
VOID
```

### Order 增量字段

```text
discountAmount
couponId
couponCode
couponName
couponDiscountAmount
```

说明：

- `discountAmount` 是订单总优惠金额，后续可兼容会员价、积分抵扣等多种优惠。
- `coupon*` 字段是首期优惠券快照。
- 首期不拆 `order_discounts` 表，等多优惠叠加时再抽象。

## API 规划

### 管理后台

```text
GET    /admin/coupons
POST   /admin/coupons
GET    /admin/coupons/:id
PUT    /admin/coupons/:id
PATCH  /admin/coupons/:id/status
```

### 小程序用户端

```text
GET  /coupons/claimable
POST /coupons/:id/claim
GET  /coupons/my
GET  /coupons/available-for-order
```

### 订单

```text
POST /orders
```

`CreateOrderDto` 后续增加：

```text
userCouponId?: string
```

## 会员与积分延后范围

### 会员等级展示

第二阶段只建议做展示型会员等级：

- 用户表增加会员等级或独立 `user_levels`。
- 后台可配置等级名称、成长值门槛。
- 小程序个人中心展示当前等级。

暂不影响价格。

### 积分流水

第三阶段做积分流水：

- 订单完成后发放积分。
- 取消 / 退款时扣回积分。
- 用户中心展示积分余额和流水。

暂不做积分抵现。

## 验收标准

优惠券 MVP 通过标准：

- 后台能创建一张满减券。
- 用户能领取一张券。
- 订单确认页能展示可用券并选择一张。
- 服务端下单时校验券并计算 `payableAmount`。
- 支付按优惠后的金额预下单。
- 订单详情和后台订单能看到优惠券折扣快照。
- 未支付订单取消后，优惠券可以再次使用。
- 已支付订单不会重复核销优惠券。

## 推荐下一步

```text
P6-03：实现优惠券 MVP 数据模型与 Prisma migration，先补 Coupon / UserCoupon / Order 折扣快照字段。
```
