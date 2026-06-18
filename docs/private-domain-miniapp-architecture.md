# 私域商品类小程序技术架构方案

本文档记录私域商品类微信小程序的最终技术架构、模块拆分、MVP 范围和 Codex 协作开发策略。

## 1. 方案定位

这套方案适合：

- AI / Codex 协作开发
- 中小团队快速交付
- 私域电商业务
- 后期扩展 SaaS
- 快速上线 MVP

核心原则：

- 使用标准化工程结构，降低 AI 生成和人工维护成本
- 按业务模块拆分，避免一次性生成整个系统
- 先跑通交易闭环，再扩展营销和增长能力

## 2. 整体架构

```text
                    微信小程序（用户端）
                            │
                            │ HTTPS
                            ▼
                    NestJS API Gateway
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
    MySQL               Redis              COS 对象存储
    主数据库              缓存               图片 / 文件

                            │
                            ▼
                    商家管理后台（React）
```

## 3. 技术选型

### 3.1 用户端：微信小程序

| 模块     | 技术         |
| -------- | ------------ |
| 框架     | Taro         |
| UI       | React        |
| 语言     | TypeScript   |
| 状态管理 | Zustand      |
| 请求     | Axios        |
| 样式     | SCSS Modules |
| UI 组件  | Taroify      |

### 3.2 商家后台

| 模块     | 技术         |
| -------- | ------------ |
| 框架     | React + Vite |
| UI       | Ant Design   |
| 状态管理 | Zustand      |
| 图表     | ECharts      |
| 表格     | ProTable     |
| 语言     | TypeScript   |

### 3.3 服务端

| 模块     | 技术            |
| -------- | --------------- |
| 框架     | NestJS          |
| ORM      | Prisma          |
| 数据库   | MySQL 8         |
| 缓存     | Redis           |
| 鉴权     | JWT             |
| API 文档 | Swagger         |
| 参数校验 | class-validator |
| 队列     | BullMQ（后期）  |

### 3.4 部署

| 模块     | 技术           |
| -------- | -------------- |
| 容器     | Docker         |
| 反向代理 | Nginx          |
| 进程管理 | PM2            |
| CI/CD    | GitHub Actions |
| 云服务   | 腾讯云         |

## 4. 技术决策

### 推荐 NestJS

NestJS 对 AI 协作开发非常友好，原因是模块结构稳定：

```text
Controller
Service
DTO
Module
Entity / Prisma Model
```

Codex 更适合在这种标准化结构中按模块持续生成、修改和 Review。

### 不推荐方案

第一版不建议采用：

- 微服务
- Java Spring Cloud
- 原生微信小程序
- Vue2
- MongoDB

原因：

```text
复杂度高
AI 生成一致性差
维护成本高
后期容易失控
```

## 5. Monorepo 目录结构

```bash
private-mall
├── apps
│   ├── server          # NestJS 后端
│   ├── admin-web       # 商家后台
│   └── miniapp         # 微信小程序
│
├── packages
│   ├── shared-types
│   ├── shared-utils
│   ├── api-sdk
│   └── eslint-config
│
├── docs
├── docker
├── scripts
└── pnpm-workspace.yaml
```

## 6. 后端模块拆分

后端按业务模块拆分：

```bash
src/modules
├── auth
├── user
├── product
├── category
├── cart
├── order
├── payment
├── coupon
├── marketing
├── upload
├── logistics
├── statistics
├── admin
└── common
```

### 6.1 auth：认证模块

职责：

- 登录
- JWT
- 微信授权
- Token 刷新
- 权限验证

建议结构：

```bash
auth
├── controller
├── service
├── dto
├── guards
├── decorators
└── strategies
```

核心接口：

```text
POST /auth/wx-login
POST /auth/refresh-token
GET  /auth/profile
```

### 6.2 user：用户模块

职责：

- 用户信息
- 地址
- 积分
- 会员等级
- 标签

核心表：

```text
users
user_addresses
user_levels
user_points
```

### 6.3 product：商品模块

职责：

- 商品
- SKU
- 库存
- 规格
- 图片

建议结构：

```bash
product
├── product
├── sku
├── inventory
├── brand
└── attributes
```

核心表：

```text
products
product_skus
product_images
product_specs
```

核心接口：

```text
GET    /products
GET    /products/:id
POST   /products
PUT    /products/:id
DELETE /products/:id
```

### 6.4 category：分类模块

职责：

- 商品分类
- 分类树
- 导航

建议使用无限级分类：

```text
parentId
level
path
```

### 6.5 cart：购物车模块

职责：

- 加入购物车
- 修改数量
- SKU 切换
- 勾选状态

建议购物车走 Redis，原因是高频读写。

### 6.6 order：订单模块

职责：

- 创建订单
- 订单状态
- 取消订单
- 售后
- 退款

订单状态机：

```text
待支付
已支付
待发货
已发货
已完成
已取消
退款中
已退款
```

建议结构：

```bash
order
├── create
├── refund
├── after-sale
├── delivery
└── status-machine
```

### 6.7 payment：支付模块

职责：

- 微信支付
- 支付回调
- 退款
- 对账

核心要求：

- 支付逻辑必须幂等
- 支付回调必须防重复

### 6.8 coupon：优惠券模块

职责：

- 优惠券
- 领取
- 使用
- 核销

### 6.9 marketing：营销模块

后期建设，第一版不做。

可包含：

- 拼团
- 秒杀
- 分销
- 砍价
- 邀请奖励

### 6.10 upload：上传模块

职责：

- 图片上传
- 视频上传
- COS 上传

### 6.11 statistics：数据统计模块

职责：

- GMV
- 订单统计
- 用户增长
- 商品排行

## 7. 微信小程序模块拆分

页面结构：

```bash
src/pages
├── home
├── category
├── product
├── cart
├── order
├── user
└── marketing
```

首页：

- banner
- 推荐商品
- 营销位
- 热销
- 猜你喜欢

商品详情：

- 轮播图
- SKU
- 详情
- 评价
- 推荐商品

用户中心：

- 订单
- 优惠券
- 地址
- 会员
- 积分

## 8. 商家后台模块拆分

页面结构：

```bash
src/pages
├── dashboard
├── product
├── order
├── user
├── marketing
├── finance
├── setting
└── permission
```

商品管理：

- 商品 CRUD
- SKU
- 库存
- 分类
- 品牌

订单管理：

- 发货
- 退款
- 售后
- 物流

权限管理采用 RBAC：

- 用户
- 角色
- 菜单
- 权限

## 9. 数据库拆分

第一阶段核心表：

用户体系：

```text
users
user_addresses
```

商品体系：

```text
products
product_skus
categories
```

订单体系：

```text
orders
order_items
```

支付体系：

```text
payments
refunds
```

## 10. 开发阶段计划

### 第一阶段：基础架构，约 2 周

目标：搭建基础架构。

完成：

- Monorepo
- NestJS
- Prisma
- MySQL
- Redis
- JWT
- Swagger
- Docker

### 第二阶段：交易链路，约 2 到 3 周

目标：跑通交易链路。

完成：

- 登录
- 商品
- SKU
- 购物车
- 订单
- 微信支付

这是最关键阶段。

### 第三阶段：运营能力，约 2 周

目标：补齐基础运营能力。

完成：

- 优惠券
- 会员
- 积分
- 数据统计

### 第四阶段：增长体系，长期

目标：增长和高级营销。

完成：

- 分销
- 拼团
- 直播
- AI 推荐

## 11. MVP 范围

第一版必须有：

- 微信登录
- 商品
- SKU
- 购物车
- 订单
- 微信支付
- 后台商品管理
- 后台订单管理

第一版不建议做：

- 直播
- 分销
- 积分商城
- 复杂营销
- 社交裂变

第一目标是让用户完成支付。

## 12. Codex 协作开发策略

### 原则 1：一次只生成一个模块

正确：

```text
生成 product 模块
```

避免：

```text
生成整个商城
```

### 原则 2：先数据库，再接口，再页面

推荐顺序：

```text
Prisma Schema
→ Service
→ Controller
→ Admin 页面
→ 小程序页面
```

### 原则 3：所有接口先 Swagger

先定义 Swagger，有利于：

- 前后端协作
- AI 理解接口边界
- 自动生成 API SDK
- 后续 Review 和测试

## 13. 立刻执行步骤

### Step 1：初始化 Monorepo

```bash
pnpm init
```

### Step 2：创建应用目录

```bash
apps/server
apps/admin-web
apps/miniapp
```

### Step 3：优先实现核心链路

```text
登录
商品
订单
支付
```

### Step 4：暂缓营销系统

先确保：

```text
用户能完成支付
```

这是电商系统第一目标。
