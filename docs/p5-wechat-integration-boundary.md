# P5 微信联调边界

记录时间：2026-05-28

本文档用于 P5 联调上线准备，先把真实微信登录和微信支付的配置、代码开关和后续实现边界固定下来。

mock / real 模式组合与部署检查见 [P5 联调部署清单](./p5-integration-deployment-checklist.md)。
联调失败排查见 [P5 微信联调问题排查](./p5-wechat-troubleshooting.md)。
收尾验收口径见 [P5 收尾验收清单](./p5-acceptance-checklist.md)。

## 当前状态

| 能力               | 当前模式 | 切换方式                 | 状态                    |
| ------------------ | -------- | ------------------------ | ----------------------- |
| 微信小程序登录     | mock     | `WECHAT_LOGIN_MODE=mock` | 本地 smoke 默认模式     |
| 真实 code2Session  | real     | `WECHAT_LOGIN_MODE=real` | 已接入服务端请求骨架    |
| 微信支付预下单     | mock     | `WECHAT_PAY_MODE=mock`   | 本地 MVP 默认模式       |
| 真实微信支付预下单 | real     | `WECHAT_PAY_MODE=real`   | 已接入 JSAPI 预下单封装 |
| 真实微信支付回调   | real     | `WECHAT_PAY_MODE=real`   | 已接入验签和资源解密    |
| 真实微信退款下单   | real     | `WECHAT_PAY_MODE=real`   | 已接入退款下单封装      |
| 真实微信退款回调   | real     | `WECHAT_PAY_MODE=real`   | 已接入验签和资源解密    |

## 环境变量

### 小程序端支付模式

```bash
TARO_APP_PAYMENT_MODE=mock
```

说明：

- `mock`：小程序显示模拟支付弹窗，确认后调用本地 mock notify，适合本地 smoke。
- `real`：小程序调用后端预下单接口后，使用返回参数调用 `Taro.requestPayment`。
- 真实支付成功后，订单状态最终以微信支付回调推进为准；小程序会在支付提交后重新拉取订单状态。

### 小程序登录

```bash
WECHAT_LOGIN_MODE=mock
WECHAT_MINIAPP_APP_ID=
WECHAT_MINIAPP_SECRET=
```

说明：

- `mock`：本地开发和 smoke 使用，后端通过 `mockOpenId` 或 `code` 派生 openId。
- `real`：后端调用微信 `jscode2session`，用真实 openId 创建或更新用户。
- `WECHAT_MINIAPP_SECRET` 只允许配置在服务端环境，不允许下发到小程序或前端。

### 微信支付

```bash
WECHAT_PAY_MODE=mock
WECHAT_PAY_API_BASE_URL=https://api.mch.weixin.qq.com
WECHAT_PAY_MCH_ID=
WECHAT_PAY_SERIAL_NO=
WECHAT_PAY_API_V3_KEY=
WECHAT_PAY_PRIVATE_KEY_PATH=
WECHAT_PAY_PLATFORM_SERIAL_NO=
WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH=
WECHAT_PAY_NOTIFY_URL=
WECHAT_PAY_REFUND_NOTIFY_URL=
```

说明：

- `mock`：当前本地 MVP 使用，返回 mock `requestPayment` 参数。
- `real`：服务端调用微信支付 JSAPI 下单，生成 `prepay_id`，再用商户私钥生成小程序 `requestPayment` 参数。
- `WECHAT_PAY_NOTIFY_URL` 必须是微信平台可访问的 HTTPS 地址。
- `WECHAT_PAY_REFUND_NOTIFY_URL` 可选；未配置时会从 `WECHAT_PAY_NOTIFY_URL` 自动派生为 `/api/refunds/wechat/notify`。
- 商户私钥建议用文件路径配置，不把私钥正文放入 `.env`。
- `WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH` 用于回调验签。
- `WECHAT_PAY_PLATFORM_SERIAL_NO` 可选配置；配置后会校验回调头 `Wechatpay-Serial` 是否匹配。
- `WECHAT_PAY_API_V3_KEY` 用于解密回调通知中的 `resource`。

## 已落地代码边界

- 新增 `WechatModule` 和 `WechatService`。
- `AuthService.wxLogin` 不再直接拼 mock openId，而是通过 `WechatService.resolveMiniappSession` 解析登录会话。
- `WECHAT_LOGIN_MODE=real` 时，服务端会请求微信 `jscode2session`。
- `PaymentService.createWechatPrepay` 使用 `WECHAT_MINIAPP_APP_ID` 作为支付参数 `appId`。
- `WECHAT_PAY_MODE=real` 时，`PaymentService.createWechatPrepay` 会调用微信支付 `POST /v3/pay/transactions/jsapi`。
- `WECHAT_PAY_MODE=real` 时，用户申请退款会调用微信支付 `POST /v3/refund/domestic/refunds`。
- 真实预下单成功后，服务端会把 `prepay_id` 落到 `Payment.prepayId`，并返回小程序 `requestPayment` 所需的 `timeStamp`、`nonceStr`、`package`、`signType`、`paySign`。
- `WECHAT_PAY_MODE=real` 时，支付回调会使用 `Wechatpay-Timestamp`、`Wechatpay-Nonce`、`Wechatpay-Signature`、`Wechatpay-Serial` 和 raw body 做验签。
- `WECHAT_PAY_MODE=real` 时，退款回调同样使用微信支付回调验签和 resource 解密，再按 `out_refund_no` 同步退款终态。
- 回调 `resource` 使用 `WECHAT_PAY_API_V3_KEY` 按 `AEAD_AES_256_GCM` 解密后，再按 `out_trade_no`、`transaction_id`、金额和订单状态做幂等更新。
- 真实微信支付回调处理成功后返回 `204 No Content`；本地 mock notify 仍返回统一 JSON，兼容 smoke。
- 小程序订单列表和订单详情页已抽出统一支付流程，`TARO_APP_PAYMENT_MODE=real` 时调用 `Taro.requestPayment`，`mock` 时保留本地弹窗和 mock notify。
- 真实支付提交后，小程序会短轮询订单详情；如果回调已推进订单状态，会立即同步到订单列表和详情页。

## P5 后续实现任务

建议按以下顺序继续：

1. `P5-02`：接真实微信支付 JSAPI 预下单。
2. `P5-03`：接微信支付回调验签、资源解密和订单幂等更新。
3. `P5-04`：小程序端从 mock 支付切换到 `Taro.requestPayment`。
4. `P5-05`：补联调环境变量校验和部署文档。
5. `P5-06`：补真实支付联调前的 smoke / health 检查脚本或手工检查清单。
6. `P5-07`：补真实支付联调问题排查文档。
7. `P5-08`：补 P5 当前能力收口清单。
8. `P5-09`：补微信支付预下单响应验签和错误码记录。
9. `P5-10`：确认微信支付回调成功响应形态。
10. `P5-11`：补真实支付联调记录模板和最小日志脱敏检查。
11. `P5-12`：补支付后短轮询策略。
12. `P5-13`：整理 P5 收尾验收清单，准备真实环境联调执行。

## 联调风险点

- 微信登录 `code` 只能使用一次，且有效期很短；前端失败重试时需要重新 `Taro.login()`。
- 微信支付金额单位为分，当前系统订单金额使用 Decimal 元，需要在真实下单时统一转换并校验。
- 支付回调可能重复到达，必须保持 `transactionId` 幂等。
- 回调不能依赖用户登录态，只能依赖微信平台签名、商户号、订单号和金额校验。
- 当前已接入预下单请求签名、预下单响应验签和回调验签；仍需在真实环境验证平台公钥、回调到达和订单状态流转。
- 生产环境必须使用 HTTPS 回调地址，并在微信商户平台配置正确。
