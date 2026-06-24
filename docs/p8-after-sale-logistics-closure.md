# P8 售后与真实物流当前能力收口清单

记录时间：2026-06-19

本文档用于确认 P8 售后、退货物流、真实物流 provider 骨架、后台物流刷新冷却和小程序售后列表能力，并把后续不阻塞当前阶段收口的事项单独列出。

## 结论

P8 已完成“售后单模型 + 用户侧售后申请 / 详情 / 列表 + 后台售后处理 + 售后退款接入 + 退货物流填写 + 物流 provider 骨架 + 完整 smoke 回归”的本地闭环。

建议状态：

- 可以把 P8 售后 / 物流增强阶段作为本地功能阶段收口。
- 后续进入真实微信、真实物流或生产联调前，先保持 `pnpm smoke:transaction` 和 `pnpm smoke:logistics-provider` 通过。
- 当前真实物流能力是 provider 适配层和 `http-json` 契约骨架，不等同于已经接入快递 100、顺丰、菜鸟等真实服务商。
- 小程序售后页面已通过类型检查和 weapp 构建，但仍未完成微信开发者工具 / 真机视觉复验。
- 真实微信登录、真实微信支付、真实微信退款和真实物流回调仍需要外部环境联调，不应仅凭本地 mock smoke 判断可生产上线。

## 已具备能力

| 能力                      | 状态   | 说明                                                                        |
| ------------------------- | ------ | --------------------------------------------------------------------------- |
| 售后单数据模型            | 已完成 | 新增 `AfterSale` 和 `AfterSaleLog`，承担售后申请、审核、退款触发和日志。    |
| 售后基础状态机            | 已完成 | 覆盖 `REQUESTED`、`APPROVED`、`WAIT_BUYER_RETURN`、`REFUNDING` 等状态。     |
| 用户创建售后              | 已完成 | 小程序可创建 `REFUND_ONLY` 和 `RETURN_REFUND` 售后申请。                    |
| 用户取消售后              | 已完成 | 用户可取消 `REQUESTED` 或 `WAIT_BUYER_RETURN` 状态售后。                    |
| 用户退货物流填写          | 已完成 | 退货退款审核通过后，用户可填写退货物流公司、单号和备注。                    |
| 用户售后详情              | 已完成 | 展示进度、退款快照、处理记录、凭证图片、退货物流和订单入口。                |
| 用户售后列表              | 已完成 | 支持状态筛选、类型筛选、分页、下拉刷新、详情跳转和订单跳转。                |
| 售后状态计数聚合          | 已完成 | `GET /api/after-sales/summary` 一次返回总数和各状态数量。                   |
| 小程序售后待处理入口      | 已完成 | 列表顶部概览展示待审核、待退货、退款中等数量，待退货可快捷处理。            |
| 小程序售后事件回写        | 已完成 | 申请、取消、填写退货物流后，列表可同步局部更新并刷新计数。                  |
| 后台售后管理              | 已完成 | 支持列表筛选、关键词搜索、展开详情、审核通过、驳回、确认收货和触发退款。    |
| 售后退款接入              | 已完成 | 后台触发退款复用现有 `Refund`、微信退款下单 / 回调和积分退款边界。          |
| 售后处理日志              | 已完成 | 创建、取消、审核、退货物流、确认收货、触发退款、退款成功 / 失败均写日志。   |
| 正向物流 provider 抽象    | 已完成 | 新增 `LogisticsService` 和 provider 接口，业务代码不直接绑定第三方字段。    |
| mock 物流 provider        | 已完成 | 本地发货后可刷新出揽收、运输中等 mock 轨迹，并纳入交易 smoke。              |
| `http-json` 物流 provider | 已完成 | 支持标准 JSON 查询契约、Bearer Token、HMAC 签名、超时、错误码和重试。       |
| 物流 provider 本地 smoke  | 已完成 | `pnpm smoke:logistics-provider` 可验证请求、签名、响应归一化和失败分支。    |
| 后台物流刷新冷却          | 已完成 | 服务端按 provider 感知默认冷却，真实 provider 默认 60 秒。                  |
| 后台物流刷新按钮冷却展示  | 已完成 | 后台按钮展示本地倒计时，并可用服务端 `retryAfterSeconds` 校准。             |
| 后台消息提示上下文迁移    | 已完成 | 后台消息提示迁移到 AntD `App.useApp()`，消除静态 message warning。          |
| Swagger 契约保护          | 已完成 | smoke 覆盖订单分页和售后 summary 的 `/docs-json` 响应契约。                 |
| API 兼容说明              | 已完成 | `docs/api-compatibility.md` 已说明售后模型、接口、summary 和物流 provider。 |

## 自动回归覆盖

`pnpm smoke:transaction` 当前覆盖：

- API 健康检查。
- Swagger 用户订单分页文档。
- Swagger 售后 summary 聚合接口文档。
- 小程序 mock 登录。
- 后台管理员登录。
- 默认收货地址查询和临时地址管理。
- 优惠券领取、锁定、取消释放、支付核销。
- 积分抵扣、积分发放、部分退款扣回、抵扣返还和全额退款结清。
- 后台发货和自动物流轨迹。
- 后台通过物流 provider 刷新物流轨迹。
- mock provider 刷新幂等，不重复插入同一批轨迹。
- 后台手动追加物流轨迹，用户订单详情可见。
- 后台订单列表按物流轨迹状态筛选。
- 后台经营概览优惠券和积分统计。
- 用户订单分页返回结构。
- 独立创建一笔售后 smoke 订单并完成 mock 支付。
- 用户申请仅退款售后。
- 售后 summary 按订单维度返回当前状态计数。
- 后台审核通过售后单。
- 后台触发售后退款。
- 微信退款回调成功后售后单进入 `COMPLETED`，订单进入 `REFUNDED`。
- 售后 summary 状态计数同步变为已完成。

最近一次完整回归：

```text
pnpm --filter @mall/server typecheck
pnpm --filter @mall/server build
pnpm format:check
pnpm smoke:transaction
```

关键结果：

```text
swagger contract ok
mock logistics refresh ok
after-sale summary status counts ok
after-sale refund-only smoke ok
Smoke transaction passed.
```

`pnpm smoke:logistics-provider` 当前覆盖：

- `http-json` provider 使用 `POST application/json` 请求配置的查询地址。
- 可选 Bearer Token 会写入 `Authorization`。
- 可选 HMAC 签名头完整生成。
- 请求体包含物流公司、物流公司编码、物流单号、收货手机号后四位、订单号和售后单号。
- 标准响应可归一化为内部物流状态、轨迹和查询时间。
- 非 2xx、非法状态、空轨迹、缺少查询地址、超时和可重试失败按预期处理。

## 数据库迁移

P8 新增并已在本地执行通过的迁移：

```text
apps/server/prisma/migrations/20260618000100_add_after_sale/migration.sql
apps/server/prisma/migrations/20260618000200_add_after_sale_return_logistics/migration.sql
```

本地重新初始化建议：

```bash
pnpm db:init
pnpm smoke:transaction
pnpm smoke:logistics-provider
```

## API 兼容说明

售后接口、售后 summary 聚合接口、后台售后处理、物流 provider 契约和后台物流刷新冷却说明见：

```text
docs/api-compatibility.md
```

关键兼容点：

- `Refund` 仍只表示资金退款记录，不承载售后审核、退货物流或买家举证。
- `Order.afterSales` 为可选字段，旧调用方可以忽略。
- 售后申请创建后不会立即改变订单履约状态，只有进入资金退款时复用 `REFUNDING` / `REFUNDED`。
- 用户侧售后 summary 支持 `orderId` 和 `type` 可选筛选，缺失状态返回 `0`。
- `LOGISTICS_PROVIDER=mock` 仍是本地默认，`http-json` 需要提供标准 JSON 查询网关。
- `LOGISTICS_REFRESH_COOLDOWN_SECONDS` 未配置时，`mock` provider 默认不启用服务端冷却，非 `mock` provider 默认 `60` 秒。

## 明确延后事项

以下事项不阻塞 P8 当前阶段收口：

| 事项                     | 建议阶段 | 说明                                                                     |
| ------------------------ | -------- | ------------------------------------------------------------------------ |
| 微信真机售后视觉复验     | P9       | 微信开发者工具模拟器已复验通过，仍需在真实微信和生产 HTTPS 环境检查。    |
| 真实物流服务商接入       | P9       | 需要选择快递 100、顺丰、菜鸟等厂商，并实现厂商字段到内部契约的适配。     |
| 物流订阅 / 回调          | P9       | 当前是后台主动刷新，不包含快递轨迹订阅、推送回调或异步补偿。             |
| 退货物流真实查询         | P9       | 当前退货物流只记录买家填写信息，未接退货单号的真实轨迹查询。             |
| 换货 / 维修              | P9+      | 当前只支持仅退款和退货退款，未做换货商品、补发物流和维修状态机。         |
| 单品级售后               | P9+      | 当前是订单级售后，未拆 `AfterSaleItem` 支持订单内单个 SKU 售后。         |
| 多包裹 / 拆单            | P9+      | 当前正向物流轨迹按订单维度记录，不支持一个订单多个包裹。                 |
| 多实例物流刷新强一致频控 | P9+      | 当前服务端冷却为进程内 Map，多实例部署可升级为 Redis TTL / 分布式锁。    |
| raw payload 存档策略     | P9+      | 当前 provider 支持 rawPayload 入参，但未设计持久化、脱敏和保留周期。     |
| 售后处理 SLA / 超时提醒  | P9+      | 当前无超时自动提醒、自动关闭、自动确认收货或客服工单。                   |
| 售后客服协商 / 留言      | P9+      | 当前处理日志偏操作审计，未做用户与客服的多轮协商消息。                   |
| E2E 视觉自动化           | P9+      | 当前主要依赖 build、smoke 和手工浏览器复验，未接 Playwright / 真机截图。 |

## 真实环境依赖

以下事项仍需真实环境验证：

- 微信真机中售后申请、详情、列表、状态计数、待退货入口和图片预览的视觉复验。
- 真实微信登录 `code2Session`。
- 真实微信 JSAPI 预下单和 `Taro.requestPayment`。
- 微信支付回调验签、解密和订单推进。
- 真实微信退款下单、退款回调成功 / 失败 / 异常状态。
- 真实物流服务商 API 签名、查询、限流、异常状态映射和回调。
- 生产 HTTPS 域名、小程序 request 合法域名、支付回调地址和商户证书路径。

## 当前环境说明

- 本地 MySQL / Redis 可通过 `pnpm db:up` 启动。
- 最新完整交易 smoke 已通过。
- 最新物流 provider smoke 已纳入本地回归说明。
- P8-31 已在微信开发者工具中复验售后申请、详情、列表、状态计数、筛选、待退货入口和退货物流提交。
- Taro 小程序构建在 Codex 沙箱内可能触发 macOS `system-configuration` panic，需要普通终端或授权命令运行。

## 推荐下一步

建议进入 P9 真实环境联调准备：

```text
P9-01：整理真实微信登录 / 支付 / 退款 / 物流 provider 的联调环境清单，并选择真实物流服务商。
```
