# 生产部署前检查清单

记录时间：2026-06-01

本文档用于 P5 收尾后、进入生产部署或 P6 运营增长前的上线前检查。它不替代真实微信联调记录；真实登录、真实支付、支付回调仍需按 [P5 收尾验收清单](./p5-acceptance-checklist.md) 和联调记录确认。

## 自动检查

生产部署前执行：

```bash
pnpm deployment:preflight
```

该脚本会检查：

- `NODE_ENV=production`。
- 数据库、Redis、端口等基础运行环境。
- JWT 和后台默认密码是否仍使用本地默认值。
- `PUBLIC_BASE_URL`、`VITE_API_BASE_URL`、`TARO_APP_API_BASE_URL` 是否为公网 HTTPS。
- 微信登录和微信支付是否均为 real 模式。
- 微信支付商户号、证书序列号、API v3 key、私钥路径、平台公钥路径和回调 URL。
- 小程序支付模式是否为 real。
- 数据库备份、日志策略、错误监控和回滚方案是否已显式确认。

如果证书文件在目标机器上可用，默认会检查文件是否存在。仅在 CI 或无法挂载证书文件的检查环境中跳过：

```bash
DEPLOYMENT_PREFLIGHT_SKIP_FILE_CHECK=1 pnpm deployment:preflight
```

## 关键环境变量

### 服务端

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://...
REDIS_HOST=...
REDIS_PORT=6379
JWT_ACCESS_SECRET=<至少 32 位随机值>
JWT_REFRESH_SECRET=<至少 32 位随机值>
ADMIN_DEFAULT_USERNAME=...
ADMIN_DEFAULT_PASSWORD=<已替换本地默认密码>
PUBLIC_BASE_URL=https://<api-domain>
UPLOAD_STORAGE=local|cos
```

如果使用本地磁盘上传：

```bash
UPLOAD_LOCAL_DIR=/data/mall/uploads
```

如果使用腾讯云 COS：

```bash
UPLOAD_STORAGE=cos
TENCENT_COS_SECRET_ID=...
TENCENT_COS_SECRET_KEY=...
TENCENT_COS_BUCKET=...
TENCENT_COS_REGION=...
```

### 微信登录和支付

```bash
WECHAT_LOGIN_MODE=real
WECHAT_MINIAPP_APP_ID=...
WECHAT_MINIAPP_SECRET=...

WECHAT_PAY_MODE=real
WECHAT_PAY_API_BASE_URL=https://api.mch.weixin.qq.com
WECHAT_PAY_MCH_ID=...
WECHAT_PAY_SERIAL_NO=...
WECHAT_PAY_API_V3_KEY=...
WECHAT_PAY_PRIVATE_KEY_PATH=/run/secrets/wechat-pay-private-key.pem
WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH=/run/secrets/wechat-pay-platform-public-key.pem
WECHAT_PAY_NOTIFY_URL=https://<api-domain>/api/payments/wechat/notify
WECHAT_PAY_REFUND_NOTIFY_URL=https://<api-domain>/api/refunds/wechat/notify
```

### 前端和小程序

```bash
VITE_API_BASE_URL=https://<api-domain>
TARO_APP_API_BASE_URL=https://<api-domain>
TARO_APP_PAYMENT_MODE=real
```

## 人工确认项

以下项目无法只靠代码判断，完成后再设置确认变量：

```bash
DATABASE_BACKUP_CONFIRMED=1
LOG_RETENTION_CONFIRMED=1
ERROR_MONITORING_CONFIRMED=1
ROLLBACK_PLAN_CONFIRMED=1
```

确认口径：

- 数据库备份：已有定时备份、恢复演练路径和备份保留周期。
- 日志策略：日志目录、保留周期、脱敏策略和磁盘告警已确认。
- 错误监控：至少具备服务异常告警、支付回调失败告警或日志检索方案。
- 回滚方案：明确上一版本镜像 / 构建产物、数据库 migration 回滚策略和负责人。

## 部署前建议顺序

1. 在目标环境配置生产环境变量。
2. 执行 `pnpm deployment:preflight`，修复所有失败项。
3. 执行 `pnpm typecheck` 和 `pnpm format:check`。
4. 执行服务端和后台构建：

   ```bash
   pnpm --filter @mall/server build
   pnpm --filter @mall/admin-web build
   ```

5. 在非沙箱本机或 CI 中执行小程序构建：

   ```bash
   pnpm --filter @mall/miniapp build
   ```

6. API 启动后执行：

   ```bash
   INTEGRATION_REQUIRE_REAL=1 pnpm integration:check
   ```

7. 使用小程序体验版完成一笔小额真实支付，并留存联调记录。

## 不通过时不得上线

出现以下任一情况，不建议上线：

- `deployment:preflight` 存在失败项。
- JWT secret、后台默认密码、数据库密码仍使用本地默认值。
- API 或小程序请求地址仍指向 localhost。
- 微信登录、微信支付或小程序支付仍为 mock。
- 支付回调 URL 不是公网 HTTPS。
- 数据库没有备份方案。
- 没有回滚方案。
- 真实微信支付端到端联调没有通过。
