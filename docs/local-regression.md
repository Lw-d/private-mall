# 本地联调和回归说明

本文档用于本地启动 Docker、API、商家后台、小程序，并执行完整交易链路 smoke 回归。

P4 收口验收状态见 [P4 MVP 验收清单](./p4-mvp-acceptance-checklist.md)。

## 依赖

- Node.js `>=20.19.0`
- pnpm `>=10`
- Docker Desktop 或可访问的 Docker daemon
- 微信开发者工具，用于打开 `apps/miniapp/dist`

## 首次初始化

```bash
pnpm install
pnpm db:init
pnpm build
```

`pnpm db:init` 会依次执行：

- 启动 MySQL / Redis：`pnpm db:up`
- 生成 Prisma Client
- 应用数据库迁移
- 写入本地种子数据

默认种子数据：

- 后台管理员：`admin / Admin123456`
- 小程序 mock 用户：`seed-miniapp-user-openid`
- 默认 smoke SKU：`SEED-CREAM-50ML`
- 3 个可见分类、3 个上架商品、5 个 SKU

重复执行 `pnpm db:seed` 会更新同一批种子分类、商品、SKU 和用户，不会额外堆叠演示商品。注意：种子 SKU 库存会被重置为固定值，适合本地回归。

## 日常启动

### 1. 启动依赖服务

```bash
pnpm db:up
```

服务端口：

- MySQL：`localhost:3306`
- Redis：`localhost:6379`

停止服务：

```bash
pnpm db:down
```

### 2. 启动 API

```bash
pnpm --filter @mall/server build
pnpm --filter @mall/server start
```

默认地址：

- API：`http://localhost:3000/api`
- 健康检查：`http://localhost:3000/api/health`
- Swagger：`http://localhost:3000/docs`

### 3. 启动商家后台

另开一个终端：

```bash
pnpm --filter @mall/admin-web dev
```

默认地址：

- Admin：`http://localhost:5173`

后台登录：

```text
账号：admin
密码：Admin123456
```

如果本地修改了 `ADMIN_DEFAULT_USERNAME` 或 `ADMIN_DEFAULT_PASSWORD`，以 `.env` / `.env.local` 为准。

### 4. 构建小程序

另开一个终端：

```bash
pnpm --filter @mall/miniapp dev:weapp
```

构建产物目录：

```text
apps/miniapp/dist
```

在微信开发者工具中打开该目录。当前后端微信登录仍是 mock 版本，小程序侧会通过本地 `code` 或 mock OpenID 完成登录链路。

注意：Taro 在当前 Codex 沙箱内运行 `build:weapp` / `dev:weapp` 可能触发 macOS `system-configuration` panic 并挂起。需要给本机命令授权，或在普通终端中运行小程序构建 / watch。

### 优惠券小程序点击验收

本地验收优惠券页面时，建议先确认：

- API 已启动并通过 `http://localhost:3000/api/health`。
- `pnpm --filter @mall/miniapp dev:weapp` 已进入 `Watching...`。
- 微信开发者工具打开的是 `apps/miniapp/dist`。

推荐点击路径：

1. 进入“我的”，点击“微信登录”。
2. 登录成功后进入“优惠券”。
3. “可领取”列表应展示上架且未领取的券，点击“领取”。
4. 领取成功后，该券应从“可领取”移入“我的优惠券”。
5. 回到商品详情，加入购物车并勾选商品。
6. 从购物车进入确认订单页。
7. “优惠券”区域应展示可用券，默认选中抵扣金额最高的券。
8. 点击优惠券行可取消 / 重新选择，底部应付金额同步变化。
9. 点击“提交订单”，订单创建后进入订单列表。

## Smoke 回归

### 后台物流刷新冷却

商家后台订单页“刷新物流”按钮默认有 60 秒本地冷却，避免重复点击。需要本地快速连续复验时，可在启动后台前设置：

```bash
VITE_LOGISTICS_REFRESH_COOLDOWN_SECONDS=0 pnpm --filter @mall/admin-web dev
```

服务端 `LOGISTICS_PROVIDER=mock` 且未显式配置 `LOGISTICS_REFRESH_COOLDOWN_SECONDS` 时，不启用服务端刷新冷却，保证交易 smoke 可以连续刷新两次验证幂等。

### 物流 Provider Smoke

`http-json` 物流 provider 可以先用本地 fake endpoint 验证标准 JSON 契约，不需要启动数据库或 API：

```bash
pnpm smoke:logistics-provider
```

该脚本会启动临时 HTTP 服务并验证：

- provider 使用 `POST application/json` 请求配置的查询地址
- 可选 Bearer Token 会写入 `Authorization`
- 请求体包含物流公司、物流公司编码、物流单号、收货手机号后四位、订单号和售后单号
- 标准响应会被归一化为内部物流状态和轨迹
- 非 2xx、非法状态、空轨迹和缺少查询地址会按失败处理

### 交易闭环 Smoke

API 启动后执行：

```bash
pnpm smoke:transaction
```

本地 smoke 默认使用 `WECHAT_LOGIN_MODE=mock`、`WECHAT_PAY_MODE=mock` 和 `TARO_APP_PAYMENT_MODE=mock`。切到真实微信登录或真实微信支付前，先阅读 [P5 微信联调边界](./p5-wechat-integration-boundary.md)。

积分抵扣默认规则为：

```bash
POINTS_REDEEM_POINTS_PER_YUAN=100
```

即 `100` 积分抵 `1` 元。未配置且后台尚未保存规则时使用默认值；小程序订单确认页会从 `GET /api/points/rules` 读取当前规则。

商家后台“运营设置”页会通过 `GET /api/admin/points/rules` 展示当前生效规则，并可通过 `PATCH /api/admin/points/rules` 保存后台配置。后台保存后，新订单和小程序订单确认页都会优先使用数据库中的规则；尚未保存后台规则时回退到 `POINTS_REDEEM_POINTS_PER_YUAN`。

smoke 会自动验证：

- API 健康检查
- 小程序 mock 登录
- 查询默认收货地址
- 新增临时收货地址、设为默认、恢复原默认地址并删除临时地址
- 订单确认页可从收货地址列表中选择本次订单地址
- 订单确认页进入地址页后，可选择地址并返回确认页保持选中态
- 查询 public 商品列表
- 清理测试用户购物车
- 加入购物车
- 后台创建 smoke 优惠券并上架
- 小程序领取优惠券
- 后台更新积分抵扣规则，并确认小程序 public 规则同步
- 查询订单可用优惠券
- 创建待支付订单后锁定优惠券
- 取消待支付订单后释放优惠券
- 从购物车创建订单
- 创建订单时写入收货地址快照
- 使用优惠券抵扣并校验应付金额
- 使用后台配置的积分比例抵扣并校验应付金额
- 下单后扣减积分余额并写入积分消费流水
- smoke 完成积分抵扣断言后恢复原积分规则
- 创建 mock 微信预支付单
- 调用 mock 支付回调
- 支付成功后核销优惠券
- 后台管理员登录
- 后台搜索订单
- 后台发货
- 后台发货后生成订单物流轨迹
- 后台通过物流 provider 刷新物流轨迹，mock provider 会生成揽收和运输中轨迹
- 重复刷新物流轨迹时保持幂等，不重复插入同一批 provider 轨迹
- 后台订单展开行展示物流轨迹
- 后台订单可手动追加物流轨迹，用户订单详情可见
- 后台订单可按物流轨迹状态筛选，smoke 会用手动追加轨迹断言筛选结果
- 用户确认收货
- 订单完成后发放积分
- 用户积分流水返回订单积分记录
- 后台经营概览返回优惠券和积分统计
- 完成订单部分退款申请后按比例扣回订单积分
- 部分退款成功后订单恢复原履约状态并按比例返还抵扣积分
- 剩余退款成功后订单变为已退款并结清积分扣回 / 返还
- 微信退款回调成功后返还订单积分抵扣
- 微信退款回调后订单变为已退款并返回退款记录
- Swagger 中用户订单分页响应文档
- Swagger 中售后 summary 聚合接口响应文档
- 用户侧订单分页返回结构
- 独立创建一笔售后 smoke 订单并完成 mock 支付
- 用户申请仅退款售后
- 售后 summary 接口会按订单维度返回当前售后状态计数
- 后台审核通过售后单
- 售后 summary 状态计数同步变为已通过
- 后台触发售后退款
- 售后 summary 状态计数同步变为退款中
- 微信退款回调成功后售后单进入已完成，订单进入已退款
- 售后 summary 状态计数同步变为已完成

用户侧订单分页返回结构的兼容说明见：

```text
docs/api-compatibility.md
```

订单物流轨迹响应字段、后台手动追加轨迹和物流状态筛选参数的兼容说明也见：

```text
docs/api-compatibility.md
```

成功时最后输出：

```text
Smoke transaction passed.
```

可配置环境变量：

```bash
SMOKE_API_BASE_URL=http://localhost:3000 \
SMOKE_OPEN_ID=seed-miniapp-user-openid \
SMOKE_SKU_CODE=SEED-CREAM-50ML \
SMOKE_POINTS_PER_YUAN=80 \
ADMIN_DEFAULT_USERNAME=admin \
ADMIN_DEFAULT_PASSWORD=Admin123456 \
pnpm smoke:transaction
```

如果只想验证交易链路、暂时跳过 Swagger 文档断言：

```bash
SMOKE_SKIP_SWAGGER_CHECK=1 pnpm smoke:transaction
```

## 联调前检查

真实登录或真实支付联调前，建议先执行轻量检查：

```bash
pnpm integration:check
```

如果 API 暂未启动，只检查环境变量和模式组合：

```bash
INTEGRATION_SKIP_API_CHECK=1 pnpm integration:check
```

真实支付联调前，如果要强制确认服务端和小程序支付模式都已切到 real：

```bash
INTEGRATION_REQUIRE_REAL=1 pnpm integration:check
```

生成真实支付联调记录草稿：

```bash
pnpm integration:record
```

生产部署前检查：

```bash
pnpm deployment:preflight
```

注意：每次 smoke 会创建一笔真实本地订单，并扣减一次种子 SKU 库存。如果需要恢复默认库存：

```bash
pnpm db:seed
```

## 推荐回归顺序

完整回归建议按下面顺序执行：

```bash
pnpm db:init
pnpm --filter @mall/server build
pnpm --filter @mall/server start
pnpm smoke:transaction
pnpm --filter @mall/admin-web dev
pnpm --filter @mall/miniapp dev:weapp
```

其中 `server start`、`admin-web dev`、`miniapp dev:weapp` 分别占用前台终端，实际执行时需要分开终端运行。

## 小程序订单刷新策略

订单列表页的刷新来源分为三类：

- 首次进入订单列表时加载第一页。
- 订单详情页完成模拟支付、取消订单、确认收货后，会通过页面事件同步当前订单到列表页。
- 用户可在订单列表页点击“刷新”或下拉刷新，主动重新拉取当前筛选的第一页。

为了减少分页上下文跳动，从订单详情页返回列表时不会无条件重载第一页。列表页会优先使用详情页同步事件更新当前已加载订单；如果用户需要完全重新对齐服务端状态，再使用“刷新”或下拉刷新。

## 常见问题

### Docker daemon 未运行

现象：

```text
Cannot connect to the Docker daemon
```

处理：

- 启动 Docker Desktop。
- 再执行 `pnpm db:up` 或 `pnpm db:init`。

### API 启动时报 Redis 连接失败

现象：

```text
ioredis ... ECONNREFUSED
Connection is closed.
```

处理：

- 确认 Docker 已启动。
- 执行 `pnpm db:up`。
- 确认 Redis 在 `localhost:6379`。
- 重启 API。

### smoke 找不到默认 SKU

现象：

```text
Seed SKU not found: SEED-CREAM-50ML
```

处理：

```bash
pnpm db:seed
pnpm smoke:transaction
```

### smoke 管理员登录失败

处理：

- 确认本地管理员账号密码是否被 `.env.local` 覆盖。
- 使用相同环境变量运行 smoke：

```bash
ADMIN_DEFAULT_USERNAME=<账号> ADMIN_DEFAULT_PASSWORD=<密码> pnpm smoke:transaction
```

### 端口占用

默认端口：

- API：`3000`
- Admin Vite：`5173`
- MySQL：`3306`
- Redis：`6379`

如果 API 端口被占用，可以在 `apps/server/.env` 或 `.env.local` 修改 `PORT`，同时用 `SMOKE_API_BASE_URL` 指向新的地址。
