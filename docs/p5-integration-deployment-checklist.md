# P5 联调部署清单

记录时间：2026-05-28

本文档用于整理 P5 阶段 mock / real 模式启动组合、必填环境变量和上线前检查项。

联调失败时参考 [P5 微信联调问题排查](./p5-wechat-troubleshooting.md)。
当前能力状态见 [P5 当前能力收口清单](./p5-current-capability-closure.md)。
收尾验收口径见 [P5 收尾验收清单](./p5-acceptance-checklist.md)。
真实支付联调记录可使用 [P5 真实支付联调记录模板](./p5-real-payment-test-record-template.md)。

## 模式组合

### 1. 本地 MVP / smoke 模式

适用场景：本地开发、无微信真实配置、自动 smoke 回归。

```bash
WECHAT_LOGIN_MODE=mock
WECHAT_PAY_MODE=mock
TARO_APP_PAYMENT_MODE=mock
```

特点：

- 小程序登录使用 mock openId。
- 后端支付返回 mock 预支付参数。
- 小程序显示模拟支付弹窗。
- 用户确认后调用 mock notify 推进订单状态。

### 2. 真实微信登录 + mock 支付

适用场景：先验证小程序 appId / secret 和真实 openId 绑定，不触碰商户支付。

```bash
WECHAT_LOGIN_MODE=real
WECHAT_MINIAPP_APP_ID=<小程序 AppID>
WECHAT_MINIAPP_SECRET=<小程序 AppSecret>

WECHAT_PAY_MODE=mock
TARO_APP_PAYMENT_MODE=mock
```

特点：

- 后端通过微信 `jscode2session` 换取 openId。
- 支付仍走本地 mock 链路，便于先验证登录和下单。

### 3. 真实微信登录 + 真实微信支付

适用场景：完整微信支付 JSAPI 联调。

```bash
WECHAT_LOGIN_MODE=real
WECHAT_MINIAPP_APP_ID=<小程序 AppID>
WECHAT_MINIAPP_SECRET=<小程序 AppSecret>

WECHAT_PAY_MODE=real
WECHAT_PAY_API_BASE_URL=https://api.mch.weixin.qq.com
WECHAT_PAY_MCH_ID=<商户号>
WECHAT_PAY_SERIAL_NO=<商户 API 证书序列号>
WECHAT_PAY_API_V3_KEY=<32 字节 API v3 key>
WECHAT_PAY_PRIVATE_KEY_PATH=<商户私钥文件路径>
WECHAT_PAY_PLATFORM_SERIAL_NO=<微信支付平台公钥序列号，可选>
WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH=<微信支付平台公钥文件路径>
WECHAT_PAY_NOTIFY_URL=https://<公网域名>/api/payments/wechat/notify
WECHAT_PAY_REFUND_NOTIFY_URL=https://<公网域名>/api/refunds/wechat/notify

TARO_APP_PAYMENT_MODE=real
TARO_APP_API_BASE_URL=https://<公网域名>
```

特点：

- 小程序端调用 `Taro.requestPayment`。
- 服务端调用微信支付 JSAPI 预下单。
- 微信支付回调验签、解密后推进订单状态。
- 用户申请退款时服务端调用微信支付退款下单。
- 微信退款回调验签、解密后同步退款和订单状态。
- 真实退款下单失败后，可在后台订单退款记录中对失败退款发起重试。

## 后端启动校验

后端启动时会校验以下规则：

- `WECHAT_LOGIN_MODE` 只能是 `mock` 或 `real`。
- `WECHAT_PAY_MODE` 只能是 `mock` 或 `real`。
- `WECHAT_LOGIN_MODE=real` 时，必须配置：
  - `WECHAT_MINIAPP_APP_ID`
  - `WECHAT_MINIAPP_SECRET`
- `WECHAT_PAY_MODE=real` 时，必须配置：
  - `WECHAT_PAY_MCH_ID`
  - `WECHAT_PAY_SERIAL_NO`
  - `WECHAT_PAY_API_V3_KEY`
  - `WECHAT_PAY_PRIVATE_KEY_PATH`
  - `WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH`
  - `WECHAT_PAY_NOTIFY_URL`
- `WECHAT_PAY_REFUND_NOTIFY_URL` 可选；未配置时会从 `WECHAT_PAY_NOTIFY_URL` 自动派生。

## 上线前检查

- API 使用 HTTPS 公网域名。
- `WECHAT_PAY_NOTIFY_URL` 已在微信商户平台配置并可访问。
- `WECHAT_PAY_REFUND_NOTIFY_URL` 已在微信退款下单请求中正确传入，或确认自动派生地址可访问。
- 真实退款失败重试只在 `WECHAT_PAY_MODE=real` 下开放，mock 模式下不应作为本地驳回退款的处理方式。
- 小程序合法域名包含 API 域名。
- 服务端环境不泄露 `WECHAT_MINIAPP_SECRET`、商户私钥、API v3 key。
- 商户私钥文件权限只允许服务进程读取。
- 订单金额以服务端计算为准，小程序不可传入支付金额。
- 支付状态只以微信支付回调推进，不依赖小程序端支付成功回调。
- `pnpm smoke:transaction` 在 mock 模式通过。
- 真实支付模式至少完成一笔小额订单端到端联调。

## 联调前检查脚本

API 启动后执行：

```bash
pnpm integration:check
```

默认检查：

- 微信登录 / 支付模式环境变量。
- 小程序支付模式组合。
- API health。
- Swagger docs-json。
- 真实支付模式下的回调 URL 格式。

常用参数：

```bash
INTEGRATION_API_BASE_URL=https://<公网域名> pnpm integration:check
```

如果只想检查环境变量和模式组合，暂时跳过 API：

```bash
INTEGRATION_SKIP_API_CHECK=1 pnpm integration:check
```

真实支付模式下，如果要额外检查回调 URL 远程可达：

```bash
INTEGRATION_CHECK_NOTIFY_URL=1 pnpm integration:check
```

注意：远程可达检查只验证 URL 没有 5xx，不代表微信平台回调验签已经成功。

真实支付联调执行前，建议强制校验所有模式均为 real：

```bash
INTEGRATION_REQUIRE_REAL=1 pnpm integration:check
```

如果需要同时确认回调 URL 远程可达：

```bash
INTEGRATION_REQUIRE_REAL=1 INTEGRATION_CHECK_NOTIFY_URL=1 pnpm integration:check
```

## 真实联调记录生成

执行真实支付联调前，可先生成一份脱敏记录草稿：

```bash
pnpm integration:record
```

默认输出到：

```text
docs/records/<日期>-wechat-pay-real-test-dev.md
```

可配置项：

```bash
INTEGRATION_RECORD_ENV=staging \
INTEGRATION_RECORD_DATE=2026-05-30 \
pnpm integration:record
```

如果目标文件已存在，脚本会拒绝覆盖；确需覆盖时显式设置：

```bash
INTEGRATION_RECORD_OVERWRITE=1 pnpm integration:record
```

记录草稿只会写入模式、域名、appId 后 6 位和商户号后 6 位。不要手动写入 app secret、API v3 key、商户私钥、完整 token 或完整签名。
