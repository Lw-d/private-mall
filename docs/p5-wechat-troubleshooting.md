# P5 微信联调问题排查

记录时间：2026-05-28

本文档用于排查真实微信登录和微信支付联调问题。联调前先确认 [P5 联调部署清单](./p5-integration-deployment-checklist.md) 已完成。

## 快速定位顺序

1. 跑轻量检查：

```bash
pnpm integration:check
```

2. 如果 API 暂未启动，只查环境变量：

```bash
INTEGRATION_SKIP_API_CHECK=1 pnpm integration:check
```

3. 再按失败位置进入对应章节：
   - 登录失败：看 code2Session。
   - 点击支付失败：看 JSAPI 预下单。
   - 小程序支付面板拉不起来：看 requestPayment。
   - 小程序显示已支付但订单没变：看支付回调。

## code2Session 登录失败

### 现象

- 小程序点击登录后提示“登录失败”。
- 服务端返回 `Wechat code2Session failed`。
- 服务端返回 `Wechat miniapp credentials are not configured`。

### 常见原因

- `WECHAT_LOGIN_MODE=real` 但缺少 `WECHAT_MINIAPP_APP_ID` 或 `WECHAT_MINIAPP_SECRET`。
- 小程序端实际 appId 与服务端配置的 appId 不一致。
- `code` 被重复使用或已过期。
- 服务端网络无法访问微信接口。

### 排查动作

- 确认服务端启动时没有环境变量校验错误。
- 确认小程序重新执行 `Taro.login()` 后再发起登录。
- 确认 `WECHAT_MINIAPP_SECRET` 只配置在服务端。
- 先用真实登录 + mock 支付组合验证登录和下单，不要同时排查支付。

## JSAPI 预下单失败

### 现象

- 小程序点击“去支付”后提示“支付失败”。
- 服务端返回 `Wechat Pay JSAPI prepay failed`。
- 服务端返回 `Wechat Pay credentials are not configured`。
- 错误响应 `error.wechatCode` 有微信支付上游错误码。

### 常见原因

- `WECHAT_PAY_MODE=real` 但商户号、证书序列号、私钥路径、API v3 key 或回调 URL 缺失。
- 商户私钥文件不可读。
- 商户证书序列号与私钥不匹配。
- `WECHAT_PAY_NOTIFY_URL` 不是公网 HTTPS。
- 用户 openId 不是当前小程序 appId 下的 openId。
- 订单金额转换为分后与预期不一致。

### 排查动作

```bash
INTEGRATION_SKIP_API_CHECK=1 pnpm integration:check
```

- 确认 `WECHAT_PAY_PRIVATE_KEY_PATH` 指向服务进程可读文件。
- 确认 `WECHAT_PAY_NOTIFY_URL` 以 `/api/payments/wechat/notify` 结尾。
- 确认先走过真实 code2Session，订单用户 openId 来自真实微信登录。
- 在后台订单里确认订单仍是待支付状态。
- 查看错误响应里的 `error.wechatCode`、`error.status` 和 `error.detail`，优先按微信支付上游错误码定位。

## requestPayment 调起失败

### 现象

- 小程序支付面板没有拉起。
- 小程序提示支付签名错误、参数错误或商户号异常。
- `TARO_APP_PAYMENT_MODE=real` 后按钮显示“去支付”，但支付失败。

### 常见原因

- 小程序端没有设置 `TARO_APP_PAYMENT_MODE=real`。
- 后端仍是 `WECHAT_PAY_MODE=mock`，模式组合不一致。
- 后端返回的 `appId` 与小程序实际 appId 不一致。
- `package` 不是 `prepay_id=...` 格式。
- `paySign` 不是用商户私钥按小程序调起支付签名串生成。
- 小程序没有配置合法请求域名。
- 服务端预下单响应验签失败，说明平台公钥或响应签名串不匹配。

### 排查动作

- 跑 `pnpm integration:check` 检查模式组合。
- 确认小程序构建时环境变量已生效。
- 在网络面板检查 `/api/payments/wechat/prepay` 返回：
  - `timeStamp`
  - `nonceStr`
  - `package`
  - `signType=RSA`
  - `paySign`
- 确认 `package` 形如 `prepay_id=wx...`。

## 支付回调未推进订单

### 现象

- 小程序支付完成，但订单仍是待支付。
- 微信商户平台显示通知失败或持续重试。
- 服务端返回 `Wechat Pay notify signature is invalid`。
- 服务端返回 `Wechat Pay notify resource decrypt failed`。
- 服务端返回 `Payment amount mismatch`。

### 常见原因

- `WECHAT_PAY_NOTIFY_URL` 外网不可访问。
- 反向代理没有把原始 body 传给 Nest，导致验签串不一致。
- `WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH` 配错或公钥不匹配。
- `WECHAT_PAY_PLATFORM_SERIAL_NO` 配置后与回调头 `Wechatpay-Serial` 不一致。
- `WECHAT_PAY_API_V3_KEY` 不是 32 字节或与商户平台配置不一致。
- 微信回调金额单位是分，订单金额是元，转换或校验失败。
- `out_trade_no` 找不到本地订单号。

### 排查动作

- 确认 API 使用 HTTPS 公网域名。
- 确认回调地址是：

```text
https://<公网域名>/api/payments/wechat/notify
```

- 确认服务端启动参数启用了 raw body。本项目已在 `main.ts` 开启 `rawBody`。
- 确认平台公钥文件可以被服务进程读取。
- 确认 API v3 key 长度为 32 字节。
- 在数据库中按订单号检查 `orders.order_no` 和 `payments.transaction_id`。
- 真实微信支付回调成功时服务端应返回 `204 No Content`；本地 mock notify 返回 JSON 属于本地回归兼容行为。

## integration:check 失败

### `tsx` IPC 被拦截

现象：

```text
listen EPERM ... tsx-xxx.pipe
```

说明：

- 这是当前沙箱对 `tsx` IPC pipe 的限制。
- 在本机终端或已授权的沙箱外环境执行即可。

### 模式组合不一致

现象：

```text
TARO_APP_PAYMENT_MODE=real requires WECHAT_PAY_MODE=real on the server.
```

处理：

- 真实支付联调时同时设置：

```bash
WECHAT_PAY_MODE=real
TARO_APP_PAYMENT_MODE=real
```

- 本地 smoke 时同时设置：

```bash
WECHAT_PAY_MODE=mock
TARO_APP_PAYMENT_MODE=mock
```

## 建议联调节奏

1. `mock/mock` 跑通 `pnpm smoke:transaction`。
2. 切 `WECHAT_LOGIN_MODE=real`，支付仍保持 mock，验证真实 openId 登录和下单。
3. 切 `WECHAT_PAY_MODE=real` 和 `TARO_APP_PAYMENT_MODE=real`，验证 JSAPI 预下单。
4. 用一笔小额订单验证 `requestPayment`。
5. 在微信商户平台确认回调成功。
6. 回到小程序订单详情页刷新，确认状态进入待发货。
