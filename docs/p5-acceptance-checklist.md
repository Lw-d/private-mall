# P5 收尾验收清单

记录时间：2026-05-29

本文档用于 P5 进入真实环境联调前的最终收口验收。它只确认“代码和文档已准备好进入联调”，不等同于生产上线批准。

## 结论

P5 当前状态：

- 代码侧已具备真实微信登录、JSAPI 预下单、小程序调起支付、支付回调验签解密、订单幂等推进和支付后状态同步能力。
- 文档侧已具备联调部署清单、问题排查、真实支付记录模板和当前能力收口清单。
- 当前环境无法完成真实微信平台端到端验证，必须进入具备公网 HTTPS、微信小程序和微信商户配置的环境执行联调。

建议判定：

```text
P5 可进入真实环境联调；真实联调通过前，不建议标记为生产可上线。
```

## 已完成验收项

| 验收项                      | 状态   | 说明                                                               |
| --------------------------- | ------ | ------------------------------------------------------------------ |
| mock 登录链路               | 已完成 | 本地 smoke 可继续使用 mock openId。                                |
| 真实 code2Session           | 已完成 | `WECHAT_LOGIN_MODE=real` 时服务端调用微信换取 openId。             |
| mock 支付链路               | 已完成 | 本地 mock prepay + mock notify 仍可推进订单状态。                  |
| JSAPI 预下单请求签名        | 已完成 | `WECHAT_PAY_MODE=real` 时调用微信支付 v3 JSAPI 下单。              |
| JSAPI 预下单响应验签        | 已完成 | 服务端校验微信支付应答签名后再使用 `prepay_id`。                   |
| 小程序 requestPayment       | 已完成 | `TARO_APP_PAYMENT_MODE=real` 时调用 `Taro.requestPayment`。        |
| 微信支付回调 raw body       | 已完成 | 服务端保留 raw body 用于回调验签。                                 |
| 微信支付回调验签            | 已完成 | 使用平台公钥、时间戳、随机串、签名和 raw body 校验。               |
| 微信支付回调资源解密        | 已完成 | 使用 API v3 key 解密 `AEAD_AES_256_GCM` resource。                 |
| 回调成功响应形态            | 已完成 | 真实微信支付回调成功返回 `204 No Content`；mock 回调保留 JSON。    |
| 订单幂等状态推进            | 已完成 | 通过订单号、金额、交易号和状态判断推进订单到待发货。               |
| 小程序支付后短轮询          | 已完成 | 真实支付提交后短轮询订单详情，降低回调延迟造成的状态误解。         |
| real 模式环境变量 fail-fast | 已完成 | 缺少关键微信登录 / 微信支付配置时后端启动失败。                    |
| 联调前检查脚本              | 已完成 | `pnpm integration:check` 检查模式组合、API health 和回调 URL。     |
| 问题排查文档                | 已完成 | 覆盖登录、预下单、requestPayment、回调和检查脚本常见问题。         |
| 真实支付联调记录模板        | 已完成 | 记录真实联调过程，并明确禁止记录 secret、私钥、完整 token 和签名。 |
| 最小错误响应脱敏            | 已完成 | 全局异常过滤器递归脱敏敏感字段，降低错误响应泄露风险。             |

## 真实联调准入条件

进入真实微信联调前必须具备：

- 可访问的公网 HTTPS API 域名。
- 微信小程序 appId 和 app secret。
- 微信支付商户号。
- 商户 API 证书序列号。
- 商户私钥文件，且服务进程可读。
- 微信支付 API v3 key。
- 微信支付平台公钥文件。
- 可选的微信支付平台公钥序列号。
- 微信商户平台已配置正确的支付回调 URL。
- 小程序合法请求域名已包含 API 域名。
- Docker / MySQL / Redis / API 在目标环境可用。
- 微信开发者工具或真机调试环境可用。

## 推荐执行顺序

1. 本地或测试环境先使用 mock 组合执行基础回归：

   ```bash
   WECHAT_LOGIN_MODE=mock WECHAT_PAY_MODE=mock TARO_APP_PAYMENT_MODE=mock pnpm smoke:transaction
   ```

2. API 启动后执行联调前检查：

   ```bash
   pnpm integration:check
   ```

3. 执行真实支付前，生成脱敏联调记录草稿：

   ```bash
   pnpm integration:record
   ```

4. 先切换真实登录和 mock 支付，验证真实 openId 绑定、创建订单和 mock 支付状态推进。

5. 再切换真实登录和真实支付，并强制校验 real 模式：

   ```bash
   INTEGRATION_REQUIRE_REAL=1 pnpm integration:check
   ```

6. 执行一笔小额 JSAPI 支付，并使用生成的联调记录文件记录环境、订单、回调和结论。

7. 如果失败，按 [P5 微信联调问题排查](./p5-wechat-troubleshooting.md) 分层定位。

## 真实联调通过标准

真实联调至少满足：

- `pnpm integration:check` 在目标 API 环境通过。
- `INTEGRATION_REQUIRE_REAL=1 pnpm integration:check` 在真实支付联调前通过。
- `WECHAT_LOGIN_MODE=real` 时，小程序登录返回真实 openId 对应用户。
- `WECHAT_PAY_MODE=real` 时，服务端成功返回 `requestPayment` 所需参数。
- 小程序能成功调起 `Taro.requestPayment`。
- 用户确认支付后，微信支付回调到达服务端。
- 真实支付回调成功时，接口返回 `204 No Content`。
- 订单状态从 `PENDING_PAYMENT` 推进到 `PENDING_DELIVERY`。
- 小程序订单列表 / 详情页最终显示最新状态。
- 后台订单列表可以搜索到该订单，并能看到待发货状态。
- 联调记录中没有写入 app secret、API v3 key、商户私钥、完整 token 或完整签名。

## 当前环境未验证项

当前开发环境仍有以下限制：

- Docker daemon 不可用，无法本地启动完整 MySQL / Redis 链路。
- API 未监听 `localhost:3000`，无法执行不跳过 API 的 `integration:check`。
- 沙箱内 `tsx` 会因 IPC pipe 限制影响 `smoke:transaction` 和 `integration:check`，需要在沙箱外或已授权环境执行。
- 当前没有真实微信小程序和商户配置，无法验证 code2Session、JSAPI 预下单、requestPayment 和微信支付回调。
- macOS 沙箱下 Taro build 有已知 panic / 挂起风险，小程序构建建议放到非沙箱本机或 CI。

## P5 收口建议

P5 可按以下口径收口：

```text
P5 代码与文档已完成真实微信登录和微信支付联调准备；下一步进入真实环境联调执行，并根据联调记录修复实际问题。
```

进入生产部署前，继续参考 [生产部署前检查清单](./production-readiness-checklist.md)。
