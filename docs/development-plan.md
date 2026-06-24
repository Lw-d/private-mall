# 私域商品类小程序开发计划

本文档基于 [私域商品类小程序技术架构方案](./private-domain-miniapp-architecture.md) 制定，目标是把项目拆成可执行、可验收、适合 Codex 协作开发的任务计划。

## 1. 总目标

第一版 MVP 的唯一核心目标：

```text
用户可以在微信小程序中完成从登录、浏览商品、选择 SKU、加入购物车、提交订单到微信支付的完整交易闭环。
```

第一版只做必要能力：

- 微信登录
- 商品和 SKU
- 购物车
- 订单
- 微信支付
- 后台商品管理
- 后台订单管理

第一版暂缓：

- 分销
- 拼团
- 直播
- 积分商城
- 复杂营销
- 社交裂变

## 2. 项目阶段总览

| 阶段 | 周期      | 目标         | 交付结果                                           |
| ---- | --------- | ------------ | -------------------------------------------------- |
| P0   | 1 到 2 天 | 项目初始化   | Monorepo、基础目录、工程规范                       |
| P1   | 1 到 2 周 | 后端基础能力 | NestJS、Prisma、MySQL、Redis、JWT、Swagger、Docker |
| P2   | 2 到 3 周 | 交易主链路   | 登录、商品、SKU、购物车、订单、支付                |
| P3   | 1 到 2 周 | 后台管理 MVP | 商品管理、订单管理、后台登录                       |
| P4   | 1 到 2 周 | 小程序 MVP   | 首页、分类、商品详情、购物车、订单、支付页         |
| P5   | 1 周      | 联调上线     | 测试、部署、监控、上线检查                         |
| P6   | 长期      | 运营和增长   | 优惠券、会员、积分、统计、营销                     |

建议优先级：

```text
P0 → P1 → P2 → P3/P4 并行 → P5 → P6
```

## 3. P0：项目初始化

周期：1 到 2 天。

目标：创建可持续开发的 Monorepo 基础结构。

### 任务清单

- 初始化 `pnpm workspace`
- 创建 `apps/server`
- 创建 `apps/admin-web`
- 创建 `apps/miniapp`
- 创建 `packages/shared-types`
- 创建 `packages/shared-utils`
- 创建 `packages/api-sdk`
- 创建 `packages/eslint-config`
- 创建 `docs`
- 创建 `docker`
- 创建 `scripts`
- 配置基础 `README.md`
- 配置统一 TypeScript、ESLint、Prettier

### 交付物

```bash
private-mall
├── apps
│   ├── server
│   ├── admin-web
│   └── miniapp
├── packages
│   ├── shared-types
│   ├── shared-utils
│   ├── api-sdk
│   └── eslint-config
├── docs
├── docker
├── scripts
├── package.json
└── pnpm-workspace.yaml
```

### 验收标准

- 根目录可以执行依赖安装
- 各应用目录结构清晰
- 基础 lint / format 命令可运行
- 文档中说明本地启动方式

## 4. P1：后端基础架构

周期：1 到 2 周。

目标：搭建稳定的服务端基础设施。

### 任务清单

- 初始化 NestJS 项目
- 配置环境变量
- 接入 Prisma
- 配置 MySQL 连接
- 配置 Redis 连接
- 配置 Swagger
- 配置全局异常过滤器
- 配置全局响应格式
- 配置 `class-validator`
- 配置 JWT 基础能力
- 创建 Docker Compose
- 创建健康检查接口

### 推荐模块顺序

```text
common
→ database
→ redis
→ auth
→ user
```

### 核心接口

```text
GET /health
GET /docs
POST /auth/wx-login
POST /auth/refresh-token
GET /auth/profile
```

### 验收标准

- 服务端可以本地启动
- Swagger 可以访问
- MySQL 和 Redis 可以通过 Docker Compose 启动
- Prisma migration 可以执行
- JWT 登录链路可以返回 token
- 全局异常和参数校验生效

## 5. P2：交易主链路

周期：2 到 3 周。

目标：跑通用户支付闭环，这是整个项目第一关键阶段。

### 5.1 数据库优先

先完成核心 Prisma Schema：

```text
users
user_addresses
categories
products
product_skus
product_images
orders
order_items
payments
refunds
```

### 5.2 模块开发顺序

推荐顺序：

```text
category
→ product
→ cart
→ order
→ payment
```

原因：

- 订单依赖商品和 SKU
- 购物车依赖商品和 SKU
- 支付依赖订单
- 后台商品管理依赖商品模块

### 5.3 category 模块

任务：

- 分类表设计
- 分类树查询
- 分类创建、编辑、删除
- 支持 `parentId`、`level`、`path`

接口：

```text
GET /categories
GET /categories/tree
POST /categories
PUT /categories/:id
DELETE /categories/:id
```

验收标准：

- 支持无限级分类
- 可以返回前端需要的分类树
- 删除分类时校验是否存在子分类或商品

### 5.4 product 模块

任务：

- 商品表设计
- SKU 表设计
- 商品图片表设计
- 商品列表
- 商品详情
- 商品创建
- 商品编辑
- 商品上下架
- 库存扣减基础能力

接口：

```text
GET /products
GET /products/:id
POST /products
PUT /products/:id
PATCH /products/:id/status
DELETE /products/:id
```

验收标准：

- 商品支持多 SKU
- 商品列表支持分类、状态、关键词筛选
- 商品详情返回 SKU、图片、规格信息
- 库存字段具备后续下单扣减基础

### 5.5 cart 模块

任务：

- 加入购物车
- 修改数量
- 删除购物车项
- 勾选 / 取消勾选
- 查询购物车
- Redis 存储购物车数据

接口：

```text
GET /cart
POST /cart/items
PUT /cart/items/:skuId
DELETE /cart/items/:skuId
PATCH /cart/items/:skuId/checked
```

验收标准：

- 购物车按用户隔离
- 购物车商品价格以结算时商品 SKU 当前价格为准
- SKU 下架或库存不足时前端能得到明确状态

### 5.6 order 模块

任务：

- 创建订单
- 订单列表
- 订单详情
- 取消订单
- 订单状态机
- 创建订单时校验库存
- 创建订单时锁定或扣减库存

接口：

```text
POST /orders
GET /orders
GET /orders/:id
PATCH /orders/:id/cancel
```

订单状态：

```text
PENDING_PAYMENT
PAID
PENDING_DELIVERY
SHIPPED
COMPLETED
CANCELLED
REFUNDING
REFUNDED
```

验收标准：

- 不能购买已下架商品
- 不能购买库存不足 SKU
- 订单金额由服务端计算
- 订单状态流转受控
- 重复提交不会造成异常库存扣减

### 5.7 payment 模块

任务：

- 创建微信支付单
- 支付回调
- 支付状态查询
- 支付幂等处理
- 回调防重复
- 退款接口预留

接口：

```text
POST /payments/wechat/prepay
POST /payments/wechat/notify
GET /payments/:orderId/status
POST /refunds
```

验收标准：

- 同一订单不能重复生成异常支付记录
- 支付回调重复到达时订单状态只更新一次
- 支付成功后订单进入已支付或待发货状态
- 支付失败或未支付不改变订单为成功状态

## 6. P3：商家后台 MVP

周期：1 到 2 周。

目标：让商家可以维护商品和处理订单。

### 任务清单

- 初始化 React + Vite
- 配置 Ant Design
- 配置路由
- 配置后台登录
- 配置请求封装
- 配置 Zustand
- 商品列表页
- 商品编辑页
- SKU 编辑能力
- 分类管理页
- 订单列表页
- 订单详情页
- 发货操作

### 页面顺序

```text
login
→ layout
→ dashboard
→ category
→ product
→ order
```

### 验收标准

- 后台可以登录
- 商品可以创建、编辑、上下架
- SKU 可以维护价格和库存
- 订单可以查询和查看详情
- 已支付订单可以执行发货

## 7. P4：微信小程序 MVP

周期：1 到 2 周。

目标：让用户可以完成购买。

### 任务清单

- 初始化 Taro + React + TypeScript
- 配置 Taroify
- 配置请求封装
- 配置 Zustand
- 微信登录
- 首页
- 分类页
- 商品列表页
- 商品详情页
- SKU 选择
- 购物车页
- 提交订单页
- 支付页
- 用户中心基础页
- 订单列表页
- 订单详情页

### 页面顺序

```text
login
→ home
→ category
→ product-detail
→ cart
→ order-confirm
→ payment
→ user-orders
```

### 验收标准

- 用户可以微信登录
- 用户可以浏览商品
- 用户可以选择 SKU
- 用户可以加入购物车
- 用户可以提交订单
- 用户可以发起微信支付
- 用户可以查看订单状态

## 8. P5：联调、测试和上线

周期：1 周。

目标：完成上线前的质量检查和部署。

### 联调清单

- 小程序登录联调
- 商品列表联调
- 商品详情联调
- SKU 价格和库存联调
- 购物车联调
- 订单创建联调
- 微信支付联调
- 支付回调联调
- 后台商品管理联调
- 后台订单发货联调

### 测试重点

- 登录过期
- SKU 库存不足
- 商品下架
- 重复提交订单
- 重复支付回调
- 支付成功但前端中断
- 订单取消后支付回调到达
- 后台并发改库存

### 上线准备

- 配置生产环境变量
- 配置 Nginx
- 配置 Docker 部署
- 配置 PM2 或容器启动策略
- 配置数据库备份
- 配置日志目录
- 配置错误监控
- 配置 GitHub Actions

### 验收标准

- 生产环境服务可启动
- Swagger 或接口文档可访问，必要时生产环境加访问控制
- 小程序体验版可以跑通完整交易链路
- 支付回调公网可访问
- 数据库具备备份方案

## 9. P6：运营和增长能力

周期：长期迭代。

优先级建议：

```text
优惠券
→ 会员等级
→ 积分
→ 数据统计
→ 分销
→ 拼团 / 秒杀
→ AI 推荐
```

### 运营模块

- 优惠券创建
- 优惠券领取
- 优惠券核销
- 会员等级
- 积分流水

### 统计模块

- GMV
- 订单量
- 支付转化率
- 用户增长
- 商品销量排行

### 增长模块

- 分销
- 拼团
- 秒杀
- 直播
- AI 推荐

## 10. Codex 任务拆分规范

每次给 Codex 的任务尽量保持单模块、单目标。

推荐任务格式：

```text
基于当前架构，实现 product 模块的 Prisma Schema、DTO、Service、Controller 和 Swagger 文档。
要求包含商品列表、商品详情、创建、编辑、上下架接口，并补充基础测试。
不要实现购物车和订单。
```

不推荐任务格式：

```text
帮我生成整个商城系统。
```

### 单模块标准顺序

每个后端模块按这个顺序开发：

```text
Prisma Schema
→ Migration
→ DTO
→ Service
→ Controller
→ Swagger
→ Unit Test
→ E2E Test
```

每个前端页面按这个顺序开发：

```text
接口类型
→ API 请求封装
→ Store
→ 页面 UI
→ 交互状态
→ 空状态 / 错误状态 / 加载状态
→ 联调
```

## 11. 推荐第一个开发迭代

第一轮迭代建议只做基础架构，不碰业务复杂度。

### Iteration 1

目标：

```text
搭好 Monorepo 和 server 基础架构。
```

任务：

- 初始化 pnpm workspace
- 创建 `apps/server`
- 初始化 NestJS
- 接入 Prisma
- 接入 Swagger
- 接入 MySQL Docker Compose
- 接入 Redis Docker Compose
- 创建 `/health`

验收：

- `pnpm install` 成功
- server 可以启动
- `/health` 返回正常
- Swagger 页面可打开
- Prisma 可以连接数据库

### Iteration 2

目标：

```text
完成用户登录基础。
```

任务：

- 创建 `users` 表
- 创建 `auth` 模块
- 创建 `user` 模块
- 实现微信登录接口骨架
- 实现 JWT 签发
- 实现 profile 接口

验收：

- 可以模拟微信登录
- 可以拿到 JWT
- 带 JWT 可以访问个人信息

### Iteration 3

目标：

```text
完成商品和分类基础。
```

任务：

- 创建 `categories` 表
- 创建 `products` 表
- 创建 `product_skus` 表
- 实现分类树
- 实现商品 CRUD
- 实现 SKU 管理

验收：

- 后端可创建商品
- 商品详情返回 SKU
- 商品列表可筛选

## 12. 风险和控制点

## 后续专项任务：图片 / 文件存储改造

背景：

- 当前商品图片和上传图片默认写入后端本地目录 `apps/server/uploads`。
- 本地目录适合开发和 MVP 验证，但生产环境长期运行会带来磁盘膨胀、容器重建丢失、多实例文件不同步、CDN 缓存困难等问题。
- 数据库当前保存的是图片 URL，具备平滑迁移到文件服务器 / 对象存储的基础。

建议拆分：

### PX-Storage-01：抽象上传存储层

目标：

```text
把上传模块从“直接写本地磁盘”改成 StorageService 抽象，先保留 local 实现。
```

任务：

- 新增 `StorageService` 接口，统一 `upload`、`delete`、`getPublicUrl` 等能力。
- 将现有 `UploadService` 中的本地写文件逻辑迁移为 `LocalStorageProvider`。
- 通过环境变量选择存储驱动，例如 `UPLOAD_STORAGE=local`。
- 保持现有 `/api/admin/uploads/images` 响应结构不变，避免影响管理后台商品表单。

验收：

- 本地上传图片仍可写入 `UPLOAD_LOCAL_DIR`。
- 商品图片 URL 保存逻辑不变。
- `pnpm --filter @mall/server typecheck` 和服务端构建通过。

### PX-Storage-02：接入对象存储 / 文件服务器

目标：

```text
支持把新上传图片保存到对象存储或独立文件服务器，后端不再依赖本地 uploads 目录承载生产图片。
```

任务：

- 优先选择一个实现：腾讯云 COS、阿里云 OSS、S3 或 MinIO。
- 新增对应 `StorageProvider`，通过 `UPLOAD_STORAGE=cos|oss|s3|minio` 切换。
- 支持返回公网 URL 或 CDN URL。
- 将生产预检脚本中的上传存储检查与实际实现对齐。
- 补充环境变量说明和部署文档。

验收：

- 管理后台上传图片后，数据库保存远程 URL。
- 小程序商品列表、详情、首页轮播图均可正常展示远程图片。
- 后端重启、容器重建不影响已上传图片访问。

### PX-Storage-03：历史图片迁移

目标：

```text
把既有 /uploads/... 图片迁移到对象存储，并更新数据库 URL。
```

任务：

- 编写一次性迁移脚本：
  - 扫描 `ProductImage.url`、售后凭证图片等图片 URL 字段。
  - 识别 `/uploads/...` 本地路径。
  - 上传到对象存储。
  - 更新数据库 URL。
- 支持 dry-run，输出迁移清单和失败项。
- 迁移完成后保留本地 uploads 备份一段时间。

验收：

- 迁移脚本可重复安全运行。
- 迁移后商品、轮播图、售后凭证图片可正常访问。
- 新上传图片不再进入后端本地 uploads 目录。

### 支付风险

控制点：

- 所有支付回调必须幂等
- 订单金额必须服务端计算
- 支付成功以微信回调和主动查询为准

### 库存风险

控制点：

- 创建订单时校验库存
- 支付或创建订单阶段明确库存扣减策略
- 避免重复扣减

### AI 开发风险

控制点：

- 一次只生成一个模块
- 每个模块都先写 Schema 和接口
- 不让 AI 同时修改多个业务域
- 每个阶段都有验收标准

### 范围失控风险

控制点：

- MVP 不做营销系统
- MVP 不做复杂权限
- MVP 不做复杂统计
- 先完成支付闭环

## 13. 当前下一步

建议下一步直接执行：

```text
P0：初始化 Monorepo
```

完成后进入：

```text
P1：搭建 NestJS + Prisma + MySQL + Redis + Swagger 基础架构
```
