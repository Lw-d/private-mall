# 项目进度记录

本文档用于记录每次已完成的子任务、关键决策和下一步方向。上下文变长或中断后，优先阅读本文档、[开发计划](./development-plan.md) 和 [技术架构方案](./private-domain-miniapp-architecture.md) 来恢复项目状态。

## 当前项目目标

第一版 MVP 目标是跑通私域商品类微信小程序交易闭环：

```text
微信登录 → 浏览商品 → 选择 SKU → 加入购物车 → 创建订单 → 微信支付 → 后台处理订单
```

## 当前阶段

```text
P4：微信小程序 MVP
```

## 已完成子任务

### 2026-05-19：P0-01 创建 Monorepo 基础骨架

完成内容：

- 创建根目录 `package.json`
- 创建 `pnpm-workspace.yaml`
- 创建 `tsconfig.base.json`
- 创建 Prettier 配置
- 创建项目 `README.md`
- 创建 `apps/server`
- 创建 `apps/admin-web`
- 创建 `apps/miniapp`
- 创建 `packages/shared-types`
- 创建 `packages/shared-utils`
- 创建 `packages/api-sdk`
- 创建 `packages/eslint-config`
- 给各应用和共享包添加最小 `package.json`
- 给各 TypeScript 包添加最小 `tsconfig.json`
- 给共享包添加最小入口文件

关键决策：

- 当前不初始化 git，因为用户尚未明确要求。
- 当前应用目录只做占位，不直接生成完整 NestJS / React / Taro 项目，避免在 P0 引入过多框架细节。
- P1 再正式初始化 NestJS 后端基础架构。

当前目录状态：

```text
apps/server        NestJS 后端占位
apps/admin-web     React 后台占位
apps/miniapp       Taro 小程序占位
packages/*         共享包占位
docs/*             技术方案、开发计划、进度记录
```

验证结果：

- `pnpm install` 通过
- `pnpm typecheck` 通过
- `pnpm format:check` 通过

修正记录：

- 初始子包中曾把外部依赖 `typescript` 写为 `workspace:^`，pnpm 会误认为它是内部 workspace 包。已改为由根 `devDependencies` 统一提供。
- 首次安装遇到 npm registry DNS 失败，已在用户授权网络访问后完成安装。

## 下一步

进入 P1：

```text
搭建 NestJS + Prisma + MySQL + Redis + Swagger 基础架构
```

P1 建议从 `apps/server` 开始，优先完成：

- NestJS 项目初始化
- `/health` 健康检查
- Swagger
- 环境变量配置
- Prisma
- Docker Compose 中的 MySQL 和 Redis

### 2026-05-19：P1-01 初始化 NestJS Server 最小服务

完成内容：

- 给 `apps/server` 安装 NestJS 基础依赖：
  - `@nestjs/common`
  - `@nestjs/core`
  - `@nestjs/platform-express`
  - `@nestjs/swagger`
  - `@nestjs/config`
  - `class-validator`
  - `class-transformer`
  - `reflect-metadata`
  - `rxjs`
  - `swagger-ui-express`
- 给 `apps/server` 安装开发依赖：
  - `tsx`
  - `@types/node`
- 将 `apps/server` 从占位入口改为真实 NestJS 应用。
- 新增 `apps/server/src/main.ts`。
- 新增 `apps/server/src/modules/app.module.ts`。
- 新增 `apps/server/src/modules/health/*`。
- 新增 `apps/server/.env.example`。
- 配置全局 API 前缀：`/api`。
- 配置 Swagger 地址：`/docs`。
- 配置全局 `ValidationPipe`。
- 配置 `ConfigModule` 读取 `.env.local` 和 `.env`。

验证结果：

- `pnpm --filter @mall/server typecheck` 通过
- `pnpm --filter @mall/server build` 通过
- `pnpm format:check` 通过
- `pnpm typecheck` 通过
- 本地启动 `pnpm --filter @mall/server start` 成功
- `GET http://localhost:3000/api/health` 返回：

```json
{
  "status": "ok",
  "service": "mall-server",
  "timestamp": "2026-05-19T02:04:17.001Z"
}
```

- `GET http://localhost:3000/docs` 返回 HTTP `200`

注意事项：

- 在当前沙箱环境中，`tsx watch` 会因为创建 IPC pipe 被拦截，`pnpm --filter @mall/server dev` 暂时不能作为验证方式。
- 编译后的 `pnpm --filter @mall/server start` 可以正常运行，但监听本地端口需要用户授权。
- 停止本地服务时使用了 Ctrl+C，因此终端显示 `SIGINT`，这不是服务启动失败。

下一步：

```text
P1-02：接入 Prisma，并准备 MySQL / Redis Docker Compose
```

### 2026-05-19：P1-02 接入 Prisma 与本地 MySQL / Redis 配置

完成内容：

- 给 `apps/server` 安装 Prisma 相关依赖：
  - `@prisma/client`
  - `prisma`
- 将 Prisma 固定到 `6.19.0`。
- 新增 `apps/server/prisma/schema.prisma`。
- 新增 `PrismaModule`。
- 新增 `PrismaService`。
- 将 `PrismaModule` 接入 `AppModule`。
- 新增 server Prisma 脚本：
  - `prisma:generate`
  - `prisma:migrate:dev`
  - `prisma:studio`
- 新增 `docker/docker-compose.dev.yml`。
- 新增 `docker/README.md`。
- 新增根脚本：
  - `pnpm db:up`
  - `pnpm db:down`
- 新增 `.gitignore`。
- 将 Prisma 生成物加入 `.prettierignore` 和 `.gitignore`。

关键决策：

- 当前不在 P1 设计业务数据表，业务模型从 P2 开始按模块逐步添加。
- Prisma 7 移除了 schema 中 `datasource.url` 的传统写法，会增加当前阶段复杂度；因此本项目先固定 Prisma `6.19.0`，保持 `DATABASE_URL` 配置方式稳定。
- Prisma Client 当前生成到 `apps/server/src/generated/prisma`，该目录为生成物，不参与格式化和版本跟踪。

验证结果：

- `pnpm --filter @mall/server prisma:generate` 通过
- `pnpm --filter @mall/server build` 通过
- `pnpm format:check` 通过
- `pnpm typecheck` 通过
- `docker compose -f docker/docker-compose.dev.yml config` 通过

注意事项：

- `prisma generate` 首次需要下载 Prisma engine，网络受限环境下需要授权联网。
- 目前还未执行 `pnpm db:up` 拉起 MySQL / Redis 容器，也未执行 migration；这是后续进入业务 Schema 前的步骤。

下一步：

```text
P1-03：启动 MySQL / Redis，添加基础数据库迁移，并准备 auth/user 模块的开发入口
```

### 2026-05-19：P1-03 尝试启动 MySQL / Redis，本地 Docker daemon 未运行

执行内容：

- 执行 `pnpm db:up`，尝试通过 `docker/docker-compose.dev.yml` 启动 MySQL 和 Redis。

结果：

- 启动失败。
- 原因是当前机器 Docker daemon 未运行：

```text
Cannot connect to the Docker daemon at unix:///Users/liwen/.docker/run/docker.sock. Is the docker daemon running?
```

当前状态：

- Docker Compose 配置文件已通过语法校验。
- MySQL / Redis 容器尚未启动。
- 尚未执行 Prisma migration。

下一步处理：

```text
启动 Docker Desktop 或 Docker daemon 后，重新执行 pnpm db:up。
```

之后继续：

- 执行数据库连接验证
- 执行第一版 Prisma migration
- 进入 auth / user 基础模块开发

### 2026-05-19：P1-03 续：Docker 恢复后完成数据库基础验证

完成内容：

- 在 Docker Desktop 启动后，执行 `pnpm db:up` 成功。
- 首次拉取并启动本地开发容器：
  - `private-mall-mysql`
  - `private-mall-redis`
- 验证 Docker Compose 服务状态正常。
- 验证 Redis：
  - `docker exec private-mall-redis redis-cli ping` 返回 `PONG`
- 验证 MySQL：
  - `docker exec private-mall-mysql mysqladmin ping ...` 返回 `mysqld is alive`
- 创建本地 Prisma shadow database：
  - `mall_system_shadow`
- 只授权 `mall` 用户访问 `mall_system_shadow.*`，没有授予全局最高权限。
- 在 Prisma schema 中增加 `shadowDatabaseUrl`。
- 在 `.env.example` 和本地 `.env` 中增加 `SHADOW_DATABASE_URL`。
- 执行 Prisma migration 状态检查成功。
- 新增并接入空的 `AuthModule`。
- 新增并接入空的 `UserModule`。

关键决策：

- 本地 Prisma Migrate 需要 shadow database。由于 `mall` 用户默认不能创建数据库，采用单独 shadow 库的方式处理，而不是给业务用户授予全局 `ALL PRIVILEGES`。
- 当前 Prisma schema 还没有业务模型，因此 `prisma migrate dev --name init` 返回 `Already in sync`，没有生成 migration 文件；业务表从下一步 `user/auth` 模块开始创建。

验证结果：

- `pnpm db:up` 通过
- `docker compose -f docker/docker-compose.dev.yml ps` 正常
- `docker exec private-mall-redis redis-cli ping` 返回 `PONG`
- `docker exec private-mall-mysql mysqladmin ping ...` 返回 `mysqld is alive`
- `pnpm --filter @mall/server exec prisma migrate status` 通过
- `pnpm --filter @mall/server prisma:generate` 通过
- `pnpm --filter @mall/server build` 通过
- `pnpm format:check` 通过
- `pnpm typecheck` 通过

下一步：

```text
P1-04：实现 user/auth 基础能力
```

建议范围：

- 添加 `users` 表
- 添加 UserService
- 添加 AuthService
- 添加模拟微信登录接口 `POST /auth/wx-login`
- 添加 JWT 签发
- 添加 `GET /auth/profile`

### 2026-05-19：P1-04 实现 user/auth 基础能力

完成内容：

- 安装 `@nestjs/jwt`。
- 在 Prisma schema 中新增 `UserStatus` enum。
- 在 Prisma schema 中新增 `User` model，映射到 `users` 表。
- 执行并应用 migration：
  - `20260519021818_create_users`
- 实现 `UserService`：
  - `findById`
  - `upsertWechatUser`
- 完善 `UserModule`，接入 `PrismaModule` 并导出 `UserService`。
- 实现 `AuthService`：
  - 模拟微信登录
  - 创建或更新微信用户
  - 签发 access token
  - 签发 refresh token
  - 获取当前用户 profile
- 完善 `AuthModule`：
  - 接入 `JwtModule`
  - 接入 `UserModule`
  - 注册 `AuthController`
  - 注册 `AuthService`
  - 注册 `JwtAuthGuard`
- 新增 `POST /api/auth/wx-login`。
- 新增 `GET /api/auth/profile`。
- 新增 `WxLoginDto`。
- 新增 `JwtAuthGuard`。
- 新增 `CurrentUser` 装饰器。
- 新增 `AuthenticatedUser` 类型。

当前登录策略：

- 当前阶段不接真实微信 API。
- `POST /api/auth/wx-login` 支持本地模拟登录。
- 如果传入 `mockOpenId`，优先使用该值。
- 如果未传 `mockOpenId`，使用 `mock_wx_${code}` 作为本地 openId。

验证结果：

- `pnpm --filter @mall/server exec prisma migrate status` 通过
- `pnpm --filter @mall/server build` 通过
- `pnpm typecheck` 通过
- `pnpm format:check` 通过
- 本地启动 server 后，`POST /api/auth/wx-login` 返回 access token、refresh token 和 user。
- 使用 access token 请求 `GET /api/auth/profile` 成功返回当前用户。

接口验证样例：

```bash
curl -X POST http://localhost:3000/api/auth/wx-login \
  -H 'Content-Type: application/json' \
  -d '{"code":"dev-code-001","mockOpenId":"dev-open-id-001","nickname":"测试用户"}'
```

```bash
curl http://localhost:3000/api/auth/profile \
  -H 'Authorization: Bearer <accessToken>'
```

注意事项：

- 目前 refresh token 只签发，尚未实现 `POST /auth/refresh-token`。
- 真实微信 `code2Session` 尚未接入，后续需要配置微信小程序 appId / secret 并调用微信接口。
- 当前 `JwtAuthGuard` 为自定义轻量实现，后续如权限复杂化可再引入 Passport strategy。

下一步：

```text
P1-05：补齐 refresh-token、统一响应格式、全局异常过滤器，完成 P1 基础架构收口
```

完成 P1 收口后进入 P2：

```text
category → product → cart → order → payment
```

### 2026-05-19：P1-05 基础架构收口

完成内容：

- 新增统一成功响应拦截器：
  - `ResponseInterceptor`
- 新增全局异常过滤器：
  - `HttpExceptionFilter`
- 在 `main.ts` 中注册：
  - 全局 `ValidationPipe`
  - 全局 `HttpExceptionFilter`
  - 全局 `ResponseInterceptor`
- 新增 `RefreshTokenDto`。
- 新增 `POST /api/auth/refresh-token`。
- `AuthService` 新增 refresh token 校验和重新签发逻辑。

统一成功响应格式：

```json
{
  "code": 0,
  "message": "success",
  "data": {},
  "timestamp": "2026-05-19T02:24:24.885Z",
  "path": "/api/health"
}
```

统一错误响应格式示例：

```json
{
  "code": 401,
  "message": "Missing bearer token",
  "error": "Unauthorized",
  "timestamp": "2026-05-19T02:24:42.889Z",
  "path": "/api/auth/profile"
}
```

接口验证结果：

- `GET /api/health` 返回统一成功响应。
- `POST /api/auth/wx-login` 返回统一成功响应，`data` 中包含 access token、refresh token 和 user。
- `POST /api/auth/refresh-token` 可以用 refresh token 换取新的 token。
- `GET /api/auth/profile` 未带 token 时返回统一 401 响应。

最终验证：

- `pnpm --filter @mall/server build` 通过
- `pnpm typecheck` 通过
- `pnpm format:check` 通过

注意事项：

- P1 基础架构已经可以支撑后续业务模块。
- 当前真实微信 `code2Session` 未接入，仍为本地 mock 登录。
- 当前没有单元测试和 E2E 测试，后续从业务模块开始补关键测试。

下一步进入 P2：

```text
P2-01：category 模块
```

建议范围：

- 添加 `categories` 表
- 支持无限级分类字段：`parentId`、`level`、`path`
- 实现分类 CRUD
- 实现分类树接口 `GET /api/categories/tree`
- 删除分类时校验子分类和商品引用

### 2026-05-19：P2-01 实现 category 分类模块

完成内容：

- 在 Prisma schema 中新增 `Category` model，映射到 `categories` 表。
- 分类支持无限级结构字段：
  - `parentId`
  - `level`
  - `path`
  - `sort`
  - `isVisible`
- 执行并应用 migration：
  - `20260519023116_create_categories`
- 新增 `CategoryModule`。
- 新增 `CategoryService`。
- 新增 `CategoryController`。
- 新增 DTO：
  - `CreateCategoryDto`
  - `UpdateCategoryDto`
- 将 `CategoryModule` 接入 `AppModule`。

接口：

```text
POST   /api/categories
GET    /api/categories
GET    /api/categories/tree
GET    /api/categories/:id
PATCH  /api/categories/:id
DELETE /api/categories/:id
```

已实现规则：

- 创建根分类时，`level = 1`，`path = 当前分类 id`。
- 创建子分类时，`level = parent.level + 1`，`path = parent.path/current.id`。
- 查询树接口会按 `level`、`sort`、`createdAt` 排序后组装。
- 更新分类时防止把分类设置成自己的父级。
- 更新分类时防止把分类移动到自己的子级下面。
- 移动分类后会递归重建自身和子分类的 `path` / `level`。
- 删除分类时，如果存在子分类，会返回 400。

接口验证结果：

- 创建根分类成功。
- 创建子分类成功。
- `GET /api/categories/tree` 返回父子树结构成功。
- `PATCH /api/categories/:id` 更新分类成功。
- 删除存在子级的父分类时返回统一 400 响应。

最终验证：

- `pnpm --filter @mall/server exec prisma migrate status` 通过，当前有 2 个 migration。
- `pnpm --filter @mall/server build` 通过
- `pnpm typecheck` 通过
- `pnpm format:check` 通过

注意事项：

- 商品表尚未创建，因此“删除分类时校验商品引用”暂未实现。该规则应在 P2-02 product 模块接入 `categoryId` 后补充。
- 当前分类接口暂未加后台权限保护，后续 admin/RBAC 阶段再统一处理。

下一步：

```text
P2-02：product 商品模块
```

建议范围：

- 添加 `products`
- 添加 `product_skus`
- 添加 `product_images`
- 商品关联 `categoryId`
- 商品 CRUD
- SKU 价格和库存
- 商品上下架
- 商品列表支持分类、状态、关键词筛选

### 2026-05-19：P2-02 实现 product 商品模块

完成内容：

- 在 Prisma schema 中新增 `ProductStatus` enum：
  - `DRAFT`
  - `ON_SALE`
  - `OFF_SALE`
- 在 Prisma schema 中新增：
  - `Product`
  - `ProductSku`
  - `ProductImage`
- `Product` 关联 `Category`。
- `ProductSku` 支持：
  - `skuCode`
  - `name`
  - `specs`
  - `price`
  - `originPrice`
  - `stock`
  - `isActive`
- `ProductImage` 支持主图和排序。
- 执行并应用 migration：
  - `20260519023524_create_products`
- 新增 `ProductModule`。
- 新增 `ProductService`。
- 新增 `ProductController`。
- 新增 DTO：
  - `CreateProductDto`
  - `UpdateProductDto`
  - `QueryProductsDto`
  - `UpdateProductStatusDto`
  - `ProductSkuDto`
  - `ProductImageDto`
- 将 `ProductModule` 接入 `AppModule`。
- 补充分类删除时的商品引用校验：
  - 分类下存在商品时返回 400。

接口：

```text
POST   /api/products
GET    /api/products
GET    /api/products/:id
PATCH  /api/products/:id
PATCH  /api/products/:id/status
DELETE /api/products/:id
```

已实现能力：

- 创建商品时校验分类存在。
- 创建商品时至少需要 1 个 SKU。
- 商品支持多 SKU。
- 商品支持多图片。
- 商品列表支持：
  - `categoryId`
  - `status`
  - `keyword`
- 商品详情返回分类、SKU、图片。
- 商品可上下架，当前通过 status 字段表达。
- 更新商品时可整体替换 SKU 和图片。
- 删除商品时级联删除 SKU 和图片。
- 删除分类时，如果分类下存在商品，会阻止删除。

接口验证结果：

- 创建商品成功。
- 商品详情返回分类、SKU、图片。
- 商品列表按关键词和状态筛选成功。
- `PATCH /api/products/:id/status` 上架成功。
- `PATCH /api/products/:id` 更新商品、SKU、图片成功。
- 删除存在商品的分类时返回统一 400 响应。

最终验证：

- `pnpm --filter @mall/server exec prisma migrate status` 通过，当前有 3 个 migration。
- `pnpm --filter @mall/server build` 通过
- `pnpm typecheck` 通过
- `pnpm format:check` 通过

注意事项：

- 当前金额在 Prisma 中使用 Decimal，接口响应中会表现为字符串，这是 Prisma 默认行为，后续前端和 API SDK 需要按字符串金额处理，避免浮点误差。
- 当前商品接口暂未做后台权限保护，后续 admin/RBAC 阶段统一处理。
- 当前更新商品采用整体替换 SKU/图片，MVP 阶段足够；后续后台体验要求更高时可改为 SKU 级别增删改。

下一步：

```text
P2-03：cart 购物车模块
```

建议范围：

- 接入 Redis 客户端
- 购物车按用户隔离
- 加入购物车
- 修改数量
- 删除购物车项
- 勾选 / 取消勾选
- 查询购物车时实时补商品、SKU、价格、库存和上下架状态

### 2026-05-19：P2-03 实现 cart 购物车模块

完成内容：

- 安装 Redis 客户端依赖：
  - `ioredis`
- 新增 `RedisModule`。
- 新增 `RedisService`。
- 新增 Redis 注入 token：
  - `REDIS_CLIENT`
- Redis 配置从 `.env` 读取：
  - `REDIS_HOST`
  - `REDIS_PORT`
  - `REDIS_PASSWORD`
- 将 `RedisModule` 接入 `AppModule`。
- 新增 `CartModule`。
- 新增 `CartService`。
- 新增 `CartController`。
- 新增 DTO：
  - `AddCartItemDto`
  - `UpdateCartItemDto`
  - `UpdateCartItemCheckedDto`

购物车存储策略：

- 购物车数据存 Redis。
- Redis key 格式：

```text
cart:<userId>
```

- Redis 中只保存轻量数据：
  - `skuId`
  - `quantity`
  - `checked`
  - `addedAt`
  - `updatedAt`
- 查询购物车时实时从 MySQL 补充：
  - SKU 信息
  - 商品信息
  - 当前价格
  - 当前库存
  - 商品上下架状态
  - SKU 是否启用
  - 主图

接口：

```text
GET    /api/cart
POST   /api/cart/items
PATCH  /api/cart/items/:skuId
PATCH  /api/cart/items/:skuId/checked
DELETE /api/cart/items/:skuId
```

已实现规则：

- 所有购物车接口需要 JWT。
- 购物车按当前登录用户隔离。
- 加入购物车前校验 SKU 存在。
- 加入购物车前校验 SKU 已启用。
- 加入购物车前校验商品状态为 `ON_SALE`。
- 加入购物车前校验库存足够。
- 重复加入同一 SKU 时累加数量。
- 修改数量时重新校验库存。
- 查询购物车时返回 `available` 和 `unavailableReason`。
- 支持勾选 / 取消勾选。
- 支持删除购物车项。
- 返回汇总信息：
  - `totalQuantity`
  - `checkedQuantity`
  - `checkedCount`

接口验证结果：

- 模拟登录成功获取 access token。
- 使用 access token 调用购物车接口成功。
- `POST /api/cart/items` 添加 SKU 成功。
- `PATCH /api/cart/items/:skuId` 修改数量成功。
- `PATCH /api/cart/items/:skuId/checked` 修改勾选状态成功。
- `GET /api/cart` 查询购物车成功。
- Redis 中可看到 `cart:<userId>` key。
- `DELETE /api/cart/items/:skuId` 删除购物车项成功。

最终验证：

- `pnpm --filter @mall/server build` 通过
- `pnpm typecheck` 通过
- `pnpm format:check` 通过
- `pnpm --filter @mall/server exec prisma migrate status` 通过，当前有 3 个 migration。

注意事项：

- 购物车不落 MySQL，符合当前技术方案中“购物车走 Redis”的设计。
- 当前没有购物车全选 / 批量删除接口，MVP 暂不加；小程序端可按单项操作先跑通链路。
- 当前金额仍沿用 Prisma Decimal 响应字符串的表现。

下一步：

```text
P2-04：order 订单模块
```

建议范围：

- 添加 `orders`
- 添加 `order_items`
- 创建订单
- 从购物车已勾选项创建订单
- 服务端计算订单金额
- 校验商品上架、SKU 启用、库存充足
- 扣减库存
- 订单状态机基础
- 订单列表和详情
- 取消订单

### 2026-05-19：P2-04 实现 order 订单模块

完成内容：

- 在 Prisma schema 中新增 `OrderStatus` enum：
  - `PENDING_PAYMENT`
  - `PAID`
  - `PENDING_DELIVERY`
  - `SHIPPED`
  - `COMPLETED`
  - `CANCELLED`
  - `REFUNDING`
  - `REFUNDED`
- 在 Prisma schema 中新增：
  - `Order`
  - `OrderItem`
- `User` 关联 `Order`。
- `ProductSku` 关联 `OrderItem`。
- 执行并应用 migration：
  - `20260519061456_create_orders`
- `CartService` 新增内部能力：
  - `getCheckedItems`
  - `removeCheckedItems`
- `CartModule` 导出 `CartService`。
- 新增 `OrderModule`。
- 新增 `OrderService`。
- 新增 `OrderController`。
- 新增 DTO：
  - `CreateOrderDto`
  - `QueryOrdersDto`
  - `CancelOrderDto`
- 将 `OrderModule` 接入 `AppModule`。

接口：

```text
POST  /api/orders
GET   /api/orders
GET   /api/orders/:id
PATCH /api/orders/:id/cancel
```

已实现规则：

- 所有订单接口需要 JWT。
- 创建订单从当前用户购物车已勾选项生成。
- 创建订单时服务端实时读取 SKU / 商品信息。
- 创建订单时校验：
  - 购物车存在已勾选项
  - SKU 存在
  - SKU 已启用
  - 商品状态为 `ON_SALE`
  - 库存充足
- 订单金额由服务端计算。
- 订单项快照保存：
  - `productName`
  - `skuName`
  - `skuSpecs`
  - `productImageUrl`
  - `unitPrice`
  - `quantity`
  - `totalAmount`
- 创建订单时在事务中扣减库存。
- 创建订单成功后清理购物车已勾选项。
- 订单列表只返回当前用户订单。
- 订单详情校验订单归属。
- 当前仅允许取消 `PENDING_PAYMENT` 订单。
- 取消订单时回滚库存。

接口验证结果：

- 模拟登录成功获取 access token。
- 添加 SKU 到购物车成功。
- `POST /api/orders` 从已勾选购物车项创建订单成功。
- 创建订单后 `GET /api/cart` 返回空购物车，说明已勾选项清理成功。
- `GET /api/orders/:id` 返回订单详情成功。
- `PATCH /api/orders/:id/cancel` 取消待支付订单成功。
- 取消订单后商品 SKU 库存回滚成功。

最终验证：

- `pnpm --filter @mall/server exec prisma migrate status` 通过，当前有 4 个 migration。
- `pnpm --filter @mall/server build` 通过
- `pnpm typecheck` 通过
- `pnpm format:check` 通过

注意事项：

- 当前订单不包含收货地址，后续应在 user/address 模块补齐后接入订单创建。
- 当前订单不包含优惠券、运费、积分抵扣，MVP 阶段先保证交易主链路。
- 当前订单金额字段使用 Decimal，接口响应仍表现为字符串。
- 当前订单创建后状态为 `PENDING_PAYMENT`，支付模块会在 P2-05 接入。

下一步：

```text
P2-05：payment 支付模块
```

建议范围：

- 添加 `payments`
- 添加 `refunds`
- 创建微信预支付单接口骨架
- 支付回调接口骨架
- 支付状态查询
- 支付成功后更新订单状态
- 支付回调幂等处理

### 2026-05-19：P2-05 实现 payment 支付模块骨架

完成内容：

- 在 Prisma schema 中新增 `PaymentChannel` enum：
  - `WECHAT`
- 在 Prisma schema 中新增 `PaymentStatus` enum：
  - `PENDING`
  - `SUCCESS`
  - `FAILED`
  - `CLOSED`
- 在 Prisma schema 中新增 `RefundStatus` enum：
  - `PENDING`
  - `SUCCESS`
  - `FAILED`
- 在 Prisma schema 中新增：
  - `Payment`
  - `Refund`
- `Order` 关联 `Payment` 和 `Refund`。
- 执行并应用 migration：
  - `20260519063159_create_payments`
- 新增 `PaymentModule`。
- 新增 `PaymentService`。
- 新增 `PaymentController`。
- 新增 DTO：
  - `CreateWechatPrepayDto`
  - `WechatNotifyDto`
  - `CreateRefundDto`
- 将 `PaymentModule` 接入 `AppModule`。

接口：

```text
POST /api/payments/wechat/prepay
POST /api/payments/wechat/notify
GET  /api/payments/:orderId/status
POST /api/refunds
```

已实现规则：

- 预支付接口需要 JWT。
- 预支付只能用于当前用户自己的订单。
- 预支付只能用于 `PENDING_PAYMENT` 订单。
- 同一个待支付订单重复预支付时，复用已有 `PENDING` payment。
- 当前返回 mock 微信支付参数：
  - `appId`
  - `timeStamp`
  - `nonceStr`
  - `package`
  - `signType`
  - `paySign`
- mock 支付回调根据 `orderId`、`orderNo`、`amount` 校验订单。
- mock 支付回调用 `transactionId` 做幂等。
- 首次成功回调会：
  - 将 payment 更新为 `SUCCESS`
  - 写入 `transactionId`
  - 写入 `paidAt`
  - 保存 `notifyPayload`
  - 将订单从 `PENDING_PAYMENT` 更新为 `PENDING_DELIVERY`
  - 写入订单 `paidAt`
- 重复回调返回 `idempotent: true`。
- 支付状态查询需要 JWT 且校验订单归属。
- 退款接口为骨架实现：
  - 创建 `Refund`
  - 将订单更新为 `REFUNDING`

接口验证结果：

- 登录成功获取 access token。
- 加入购物车成功。
- 创建待支付订单成功。
- `POST /api/payments/wechat/prepay` 创建 mock 预支付成功。
- 同一订单重复预支付复用同一条 `PENDING` payment。
- `POST /api/payments/wechat/notify` mock 支付回调成功。
- 支付回调后订单状态变为 `PENDING_DELIVERY`。
- 重复支付回调返回 `idempotent: true`。
- `GET /api/payments/:orderId/status` 查询支付状态成功。
- `POST /api/refunds` 创建退款骨架成功。

最终验证：

- `pnpm --filter @mall/server exec prisma migrate status` 通过，当前有 5 个 migration。
- `pnpm --filter @mall/server build` 通过
- `pnpm typecheck` 通过
- `pnpm format:check` 通过

注意事项：

- 当前支付模块仍是 mock 微信支付骨架，未接入真实微信支付签名、证书、商户号、平台证书验签。
- 当前 notify 接口没有做微信平台验签，只用于本地链路验证。
- 当前退款只创建退款记录并更新订单为 `REFUNDING`，未实现真实微信退款和退款回调。
- 当前支付成功后订单进入 `PENDING_DELIVERY`，后台订单发货模块后续接入。

下一步：

```text
P2 后端交易主链路已基本跑通。建议下一步进入 P3：商家后台 MVP。
```

P3 建议优先范围：

- 初始化 `apps/admin-web` React + Vite
- 后台登录
- 商品管理
- 分类管理
- 订单管理
- 订单发货操作

### 2026-05-19：P3-01 初始化商家后台 MVP 骨架

完成内容：

- 将 `apps/admin-web` 从占位项目升级为 React + Vite 后台应用。
- 安装并固定前端稳定依赖：
  - React `18.3.1`
  - React DOM `18.3.1`
  - Vite `5.4.21`
  - `@vitejs/plugin-react`
  - Ant Design `5.x`
  - `@ant-design/icons`
  - `@ant-design/pro-components`
  - Zustand
  - ECharts
  - React Router DOM
- 新增 `apps/admin-web/index.html`。
- 新增 `apps/admin-web/vite.config.ts`。
- 更新 `apps/admin-web/package.json`：
  - `dev`
  - `build`
  - `preview`
- 更新 `apps/admin-web/tsconfig.json` 支持 React JSX。
- 新增后台应用入口：
  - `src/main.tsx`
  - `src/App.tsx`
  - `src/styles.css`
- 新增 API 客户端：
  - `src/api/client.ts`
  - `src/api/adminApi.ts`
  - `src/api/types.ts`
- 新增登录状态 store：
  - `src/store/authStore.ts`
- 新增页面：
  - `LoginPage`
  - `DashboardPage`
  - `CategoryPage`
  - `ProductPage`
  - `OrderPage`

当前后台能力：

- 模拟商家登录。
- 登录后保存 access token 到 `localStorage`。
- Vite 开发服务器代理 `/api` 到 `http://localhost:3000`。
- 后台主布局包含：
  - 经营概览
  - 分类管理
  - 商品管理
  - 订单管理
- 分类管理：
  - 查询分类树
  - 新增分类
- 商品管理：
  - 查询商品列表
  - 按状态和关键词筛选
  - 上架 / 下架
- 订单管理：
  - 查询订单列表
  - 按状态筛选
  - 取消待支付订单

验证结果：

- `pnpm --filter @mall/admin-web build` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- 后端服务本地启动成功：`http://localhost:3000`。
- 后台 Vite dev server 启动成功：`http://localhost:5173`。
- `GET http://localhost:5173/` 返回 HTTP `200`。
- 通过 Vite 代理调用 `POST /api/auth/wx-login` 成功。

注意事项：

- 当前后台登录仍复用 mock 微信登录接口，尚未实现真正 admin/RBAC。
- 当前商品管理只实现查询和上下架，暂未做商品创建/编辑表单。
- 当前订单管理暂未实现发货操作，因为后端还没有 delivery/logistics 模块。
- 构建时有 Ant Design 相关 bundle 体积 warning，MVP 阶段可接受；后续可通过路由级动态导入拆包优化。

当前本地服务：

```text
API:   http://localhost:3000
Admin: http://localhost:5173
```

下一步：

```text
P3-02：补齐后台商品创建/编辑表单，或先补后端订单发货接口再接订单发货操作。
```

### 2026-05-19：P3-02 补齐后台商品创建 / 编辑表单

完成内容：

- 扩展 `apps/admin-web/src/api/types.ts`：
  - `ProductInput`
  - `ProductSkuInput`
  - `ProductImageInput`
- 扩展 `apps/admin-web/src/api/adminApi.ts`：
  - `createProduct`
  - `updateProduct`
- 新增商品表单弹窗：
  - `ProductFormModal`
- 商品管理页接入：
  - 新增商品
  - 编辑商品
  - 分类树拉平后作为分类选择项
  - SKU 动态行
  - 主图 URL
  - 商品基础信息
  - 商品状态
- 新增表单样式：
  - `.form-grid`
  - `.product-form`
  - `.sku-row`

当前商品表单能力：

- 选择分类。
- 填写商品名称、副标题、详情、排序、状态。
- 填写主图 URL。
- 维护多个 SKU：
  - 名称
  - 编码
  - 价格
  - 划线价
  - 库存
  - 规格 JSON
  - 是否启用
- 编辑商品时回填已有商品、SKU、主图。
- 提交时调用后端：
  - `POST /api/products`
  - `PATCH /api/products/:id`

验证结果：

- `pnpm --filter @mall/admin-web build` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- `GET http://localhost:5173/` 返回 HTTP `200`。

注意事项：

- 当前规格使用 JSON 文本输入，适合 MVP 快速验证；后续可升级为规格键值 UI。
- 当前图片只维护主图 URL，后续可接 upload/COS 模块支持多图上传。
- 当前商品编辑采用后端已有的整体替换 SKU / 图片策略。
- 当前后台仍未实现真正 admin/RBAC 权限。

下一步：

```text
P3-03：补后端订单发货接口，并接入后台订单发货操作。
```

### 2026-05-20：P3-03 补齐订单发货接口与后台发货操作

完成内容：

- 在 Prisma `Order` model 中新增发货字段：
  - `shippedAt`
  - `logisticsCompany`
  - `trackingNo`
  - `deliveryRemark`
- 新增并应用 migration：
  - `20260520000100_add_order_delivery_fields`
- 新增后端 DTO：
  - `ShipOrderDto`
- `OrderService` 新增 `ship` 方法。
- `OrderController` 新增发货接口：
  - `PATCH /api/orders/:id/ship`
- 后台 API SDK 新增：
  - `shipOrder`
  - `ShipOrderInput`
- 后台订单页接入发货操作：
  - 待发货订单显示“发货”按钮
  - 发货弹窗填写物流公司、物流单号、发货备注
  - 发货成功后刷新订单列表
  - 订单列表显示物流信息

当前发货规则：

- 发货接口需要 JWT。
- 当前仍沿用现有订单接口权限模型，只允许操作当前登录用户自己的订单；真正后台全量订单权限后续在 admin/RBAC 阶段统一处理。
- 仅允许 `PENDING_DELIVERY` 订单发货。
- 发货后订单状态变为 `SHIPPED`。
- 发货时记录 `shippedAt`、物流公司、物流单号和发货备注。

验证结果：

- `pnpm --filter @mall/server prisma:generate` 通过。
- `pnpm --filter @mall/server exec prisma migrate deploy` 通过，本地 MySQL 已应用第 6 个 migration。
- `pnpm --filter @mall/server exec prisma migrate status` 通过，数据库 schema 已是最新。
- `pnpm --filter @mall/server build` 通过。
- `pnpm --filter @mall/admin-web build` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

注意事项：

- 后台订单管理当前仍是“当前登录用户订单”视角，还不是真正商家全量订单列表。
- 后台构建仍有 Ant Design chunk 体积 warning，和前一阶段一致，MVP 阶段可接受。
- 发货信息当前直接挂在 `orders` 表，适合 MVP；后续物流轨迹、拆单、多包裹可再拆 `logistics` / `deliveries` 表。

下一步：

```text
P3-04：补真正的商家后台 admin/RBAC 基础，至少支持后台管理员登录和订单全量管理入口。
```

### 2026-05-20：P3-04 实现后台管理员登录与订单全量管理入口

完成内容：

- 在 Prisma schema 中新增后台管理员基础模型：
  - `Admin`
  - `AdminRole`
  - `AdminStatus`
- 新增并应用 migration：
  - `20260520000200_create_admins`
- 新增 `AdminModule`。
- 新增管理员登录接口：
  - `POST /api/admin/auth/login`
- 新增管理员 profile 接口：
  - `GET /api/admin/auth/profile`
- 新增 `AdminAuthGuard`，要求 JWT payload 中 `type = admin`。
- 新增 `CurrentAdmin` 装饰器和 `AuthenticatedAdmin` 类型。
- 管理员密码使用 Node 内置 `crypto.scryptSync` 加盐哈希保存。
- 首次管理员登录时，如果 `admins` 表为空，会自动创建默认超级管理员。
- 新增后台订单接口：
  - `GET /api/admin/orders`
  - `PATCH /api/admin/orders/:id/cancel`
  - `PATCH /api/admin/orders/:id/ship`
- `OrderService` 新增管理员视角能力：
  - 查询全量订单
  - 取消任意待支付订单
  - 发货任意待发货订单
- 后台登录页从“模拟商家登录”改为账号密码登录。
- 后台订单页切换到 `/api/admin/orders`。
- 后台订单页新增下单用户展示。

默认管理员：

```text
账号：admin
密码：Admin123456
```

默认值可通过 server 环境变量覆盖：

```text
ADMIN_DEFAULT_USERNAME
ADMIN_DEFAULT_PASSWORD
```

验证结果：

- `pnpm --filter @mall/server exec prisma format` 通过。
- `pnpm --filter @mall/server prisma:generate` 通过。
- `pnpm --filter @mall/server exec prisma migrate deploy` 通过，本地 MySQL 已应用第 7 个 migration。
- `pnpm --filter @mall/server exec prisma migrate status` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm --filter @mall/admin-web build` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- 本地启动 API 后，`POST /api/admin/auth/login` 使用默认管理员登录成功。
- 使用 admin token 调用 `GET /api/admin/orders` 成功返回全量订单和用户信息。

注意事项：

- 当前 RBAC 是基础版，只包含管理员角色字段，尚未拆 `roles` / `permissions` / `menus` 表。
- 当前分类和商品接口尚未接管理员守卫，后台仍可使用，但权限边界后续需要统一收紧到 `/api/admin/*`。
- 默认管理员用于 MVP 本地开发，正式部署前必须通过环境变量设置强密码。
- 当前后台没有 refresh token，管理员 access token 有效期为 2 小时。
- 后台构建仍有 Ant Design chunk 体积 warning，MVP 阶段继续接受。

下一步：

```text
P3-05：将后台商品/分类管理迁移到 /api/admin 命名空间，并用 AdminAuthGuard 保护后台写操作。
```

### 2026-05-20：P3-05 后台商品 / 分类接口迁移到 admin 命名空间

完成内容：

- 新增后台分类 controller：
  - `AdminCategoryController`
  - 路由前缀：`/api/admin/categories`
- 新增后台商品 controller：
  - `AdminProductController`
  - 路由前缀：`/api/admin/products`
- 后台分类接口全部使用 `AdminAuthGuard`：
  - `POST /api/admin/categories`
  - `GET /api/admin/categories`
  - `GET /api/admin/categories/tree`
  - `GET /api/admin/categories/:id`
  - `PATCH /api/admin/categories/:id`
  - `DELETE /api/admin/categories/:id`
- 后台商品接口全部使用 `AdminAuthGuard`：
  - `POST /api/admin/products`
  - `GET /api/admin/products`
  - `GET /api/admin/products/:id`
  - `PATCH /api/admin/products/:id`
  - `PATCH /api/admin/products/:id/status`
  - `DELETE /api/admin/products/:id`
- 公共分类 / 商品接口保留读能力，供小程序侧浏览使用。
- 公共分类 / 商品写接口也加上 `AdminAuthGuard`，避免未授权写入。
- `AdminModule` 导出 `JwtModule`，修复跨模块使用 `AdminAuthGuard` 时的运行时依赖注入问题。
- 后台 `adminApi.ts` 已切换：
  - 分类管理使用 `/api/admin/categories`
  - 商品管理使用 `/api/admin/products`

验证结果：

- `pnpm --filter @mall/server build` 通过。
- `pnpm --filter @mall/admin-web build` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- 本地启动 API 后，Nest 模块依赖初始化成功。
- 未带 token 调用 `POST /api/categories` 返回 HTTP `401`。
- 默认管理员登录成功。
- 使用 admin token 调用 `GET /api/admin/categories/tree` 返回 HTTP `200`。
- 使用 admin token 调用 `GET /api/admin/products` 返回 HTTP `200`。
- 验证结束后已停止本地 API 服务，避免占用 `3000` 端口。

注意事项：

- 当前小程序侧仍可公开读取分类和商品列表 / 详情。
- 后台写操作已经收敛到 admin token，但真正细粒度 RBAC 权限点尚未拆分。
- 后续若小程序只允许读取上架商品，需要在 public 商品列表中默认过滤 `ON_SALE`，后台 admin 列表保留全状态查询。

下一步：

```text
P3-06：调整小程序侧 public 商品查询语义，默认只暴露上架商品；同时为后台保留全状态商品查询。
```

### 2026-05-20：P3-06 收紧 public 商品查询，只暴露上架商品

完成内容：

- `ProductService` 新增 public 查询方法：
  - `findManyPublic`
  - `findPublicById`
- public 商品列表接口调整：
  - `GET /api/products`
  - 默认强制 `status = ON_SALE`
- public 商品详情接口调整：
  - `GET /api/products/:id`
  - 仅允许访问 `ON_SALE` 商品
  - 草稿 / 下架商品对 public 端表现为 `Product not found`
- 后台商品接口保持原语义：
  - `GET /api/admin/products`
  - `GET /api/admin/products/:id`
  - 可查询全状态商品，也可按状态筛选

验证结果：

- `pnpm --filter @mall/server build` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- 本地启动 API 后，`GET /api/products` 成功返回商品列表，返回数据为 `ON_SALE` 商品。
- 默认管理员登录成功。
- 使用 admin token 调用 `GET /api/admin/products` 成功，后台仍保留全状态查询能力。
- 验证结束后已停止本地 API 服务，避免占用 `3000` 端口。

注意事项：

- 当前测试库里只有一个上架商品，因此 public/admin 列表样例数据数量一致；语义已在代码层拆分。
- 后续如果要让 public 分类树也只展示有上架商品的分类，可在小程序首页/分类页阶段再做。

下一步：

```text
P3-07：后台经营概览接入真实统计接口，替换当前静态 Dashboard。
```

### 2026-05-20：P3-07 后台经营概览接入真实统计接口

完成内容：

- 新增后端后台统计服务：
  - `AdminStatisticsService`
- 新增后端后台统计接口：
  - `GET /api/admin/statistics/overview`
- 统计接口使用 `AdminAuthGuard` 保护。
- 当前经营概览返回：
  - `gmv`
  - `totalOrders`
  - `todayOrders`
  - `pendingDeliveryOrders`
  - `totalUsers`
  - `productsOnSale`
  - `totalProducts`
  - `recentOrders`
- 后台 API SDK 新增：
  - `fetchDashboardOverview`
  - `DashboardOverview`
- 后台 `DashboardPage` 从静态卡片改为真实数据：
  - GMV
  - 订单总数
  - 今日订单
  - 待发货
  - 用户数
  - 在售商品 / 商品总数
  - 最近订单表格

统计口径：

- GMV 当前统计已支付相关订单金额：
  - `PENDING_DELIVERY`
  - `SHIPPED`
  - `COMPLETED`
  - `REFUNDING`
  - `REFUNDED`
- 同时要求订单 `paidAt` 不为空。
- 今日订单按服务器本地日期当天 `00:00:00` 后创建的订单计算。

验证结果：

- `pnpm --filter @mall/server build` 通过。
- `pnpm --filter @mall/admin-web build` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- 本地启动 API 后，默认管理员登录成功。
- 使用 admin token 调用 `GET /api/admin/statistics/overview` 成功返回真实统计数据。
- 当前测试库统计样例：
  - GMV：`359.00`
  - 订单总数：`2`
  - 用户数：`6`
  - 在售商品：`1`
- 验证结束后已停止本地 API 服务，避免占用 `3000` 端口。

注意事项：

- GMV 当前包含 `REFUNDING` 和 `REFUNDED` 订单金额，后续接完整退款成功回调后，应新增“净 GMV / 退款金额”口径。
- 当前 Dashboard 仅做运营概览，没有图表趋势；后续可接 ECharts 做 7 日 GMV / 订单趋势。
- 后台构建仍有 Ant Design chunk 体积 warning，MVP 阶段继续接受。

下一步：

```text
P3-08：后台订单管理增强，补订单详情展开和关键状态操作体验。
```

### 2026-05-20：P3-08 增强后台订单管理详情和操作体验

完成内容：

- 后台订单类型补充字段：
  - `cancelledAt`
  - `cancelReason`
- 后台订单页新增状态颜色映射：
  - 待支付、待发货、已发货、已完成、退款中等状态更易扫描。
- 后台订单页新增展开详情：
  - 用户昵称 / 手机 / OpenID
  - 订单备注
  - 支付时间
  - 发货时间
  - 取消时间
  - 取消原因
  - 物流公司
  - 物流单号
  - 发货备注
  - 商品明细表
- 商品明细表展示：
  - 商品名
  - SKU
  - 规格
  - 单价
  - 数量
  - 小计
- 取消订单操作增加二次确认：
  - 明确提示取消后会回滚库存
  - 取消成功后提示并刷新列表
- 发货弹窗增强：
  - 展示订单号
  - 展示商品摘要
  - 展示订单金额

验证结果：

- `pnpm --filter @mall/server build` 通过。
- `pnpm --filter @mall/admin-web build` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- 本地启动 API 和后台 dev server 后，`GET http://localhost:5173/` 返回 HTTP `200`。
- 通过 Vite 代理调用 `POST /api/admin/auth/login` 登录成功。
- 验证结束后已停止 API 和后台 dev server，避免占用 `3000` / `5173` 端口。

注意事项：

- 本节点主要是后台交互增强，没有新增后端接口或数据库字段。
- 当前订单详情仍以内嵌展开行展示，后续订单字段继续增加时可升级为独立订单详情抽屉。
- 后台构建仍有 Ant Design chunk 体积 warning，MVP 阶段继续接受。

下一步：

```text
P3-09：补后台用户管理基础页，支持用户列表查看和按关键词检索。
```

### 2026-05-20：P3-09 补后台用户管理基础页

完成内容：

- 新增后端 DTO：
  - `QueryAdminUsersDto`
- 新增后端后台用户服务：
  - `AdminUserService`
- 新增后端后台用户接口：
  - `GET /api/admin/users`
- 用户列表接口使用 `AdminAuthGuard` 保护。
- 用户列表支持关键词检索：
  - `openId`
  - `nickname`
  - `phone`
- 当前用户列表按 `createdAt desc` 排序，最多返回 100 条。
- 后台 API SDK 新增：
  - `fetchUsers`
  - `User`
- 新增后台页面：
  - `UserPage`
- 后台菜单新增：
  - 用户管理
- 用户管理页展示：
  - 昵称
  - OpenID
  - 手机号
  - 状态
  - 最近登录
  - 注册时间

验证结果：

- `pnpm --filter @mall/server build` 通过。
- `pnpm --filter @mall/admin-web build` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- 本地启动 API 后，默认管理员登录成功。
- 使用 admin token 调用 `GET /api/admin/users` 返回 HTTP `200`。
- 使用 admin token 调用 `GET /api/admin/users?keyword=测试` 返回 HTTP `200`。
- 验证结束后已停止本地 API 服务，避免占用 `3000` 端口。

注意事项：

- 当前用户管理仅支持查看和检索，不支持禁用 / 改手机号 / 打标签。
- 用户列表暂未做分页参数，MVP 阶段先限制最多 100 条；后续用户量上来后应加 `page` / `pageSize`。
- 后台构建仍有 Ant Design chunk 体积 warning，MVP 阶段继续接受。

下一步：

```text
P3-10：后台分类管理增强，支持编辑 / 删除分类，并补关键操作确认。
```

### 2026-05-20：P3-10 增强后台分类管理编辑 / 删除体验

完成内容：

- 后台 API SDK 新增：
  - `updateCategory`
  - `deleteCategory`
- 分类管理页从“只新增”升级为“新增 / 编辑共用表单”。
- 左侧分类树支持选中分类。
- 选中分类后，右侧表单自动回填：
  - 名称
  - 父级分类
  - 排序
  - 是否显示
  - 描述
- 父级分类从手填 ID 改为树选择器。
- 支持编辑分类后保存。
- 支持切回新建模式。
- 支持刷新时重置表单。
- 删除分类增加二次确认。
- 删除时保留后端原有保护：
  - 存在子分类时不能删除
  - 存在商品引用时不能删除

验证结果：

- `pnpm --filter @mall/server build` 通过。
- `pnpm --filter @mall/admin-web build` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

注意事项：

- 当前前端未主动过滤“不能把父级设为自己或自己的子级”的选项，后端已有校验会阻止非法移动。
- 后续可在分类树节点标题中加入快捷编辑 / 删除按钮，目前采用选中后在右侧操作，交互更稳。
- 后台构建仍有 Ant Design chunk 体积 warning，MVP 阶段继续接受。

下一步：

```text
P3-11：后台商品管理增强，补商品删除确认和商品详情展开。
```

### 2026-05-21：P3-11 增强后台商品管理删除确认和详情展开

完成内容：

- 后台 API SDK 新增：
  - `deleteProduct`
- 商品管理页新增商品删除操作。
- 删除商品前增加二次确认：
  - 明确提示会同步移除 SKU 和图片。
  - 提示有历史订单的商品应优先下架。
- 商品列表状态展示从枚举值升级为中文标签：
  - 草稿
  - 上架
  - 下架
- 商品上下架操作补成功 / 失败提示。
- 商品列表新增展开详情：
  - 商品名
  - 分类
  - 状态
  - 副标题
  - 排序
  - 销量
  - 详情
  - SKU 明细
  - 图片 URL 明细
- SKU 明细展示：
  - SKU 名称
  - 编码
  - 规格
  - 价格
  - 划线价
  - 库存
  - 启用状态
- 图片明细展示：
  - 主图 / 普通图片
  - 排序
  - 可复制 URL
- 后端商品删除补订单占用保护：
  - 商品已有订单明细时不允许硬删除。
  - 避免外键错误直接暴露给后台。

验证结果：

- `pnpm --filter @mall/server build` 通过。
- `pnpm --filter @mall/admin-web build` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

注意事项：

- 当前商品删除仍是硬删除；已有订单的商品会被后端阻止删除。正式运营后更推荐做软删除或归档。
- 商品详情仍使用表格展开行展示，字段继续增多时可升级为商品详情抽屉。
- 后台构建仍有 Ant Design chunk 体积 warning，MVP 阶段继续接受。

下一步：

```text
P3-12：补上传模块基础能力，为后台商品图片上传预留本地上传和 COS 接口骨架。
```

### 2026-05-21：P3-12 补上传模块基础能力和后台商品主图上传

完成内容：

- 新增后端上传模块：
  - `UploadModule`
  - `UploadService`
  - `AdminUploadController`
- 新增后台上传接口：
  - `POST /api/admin/uploads/images`
- 上传接口使用 `AdminAuthGuard` 保护，只允许后台管理员调用。
- 上传接口支持 `multipart/form-data`。
- 上传接口限制：
  - 只允许 `jpeg`
  - 只允许 `png`
  - 只允许 `webp`
  - 只允许 `gif`
  - 单文件最大 `5MB`
- 本地上传文件按年月目录保存：
  - `/uploads/images/YYYY/MM/...`
- 后端启动时通过 Express 静态资源服务开放 `/uploads/*`。
- 新增上传返回结构：
  - `url`
  - `path`
  - `filename`
  - `originalName`
  - `mimeType`
  - `size`
  - `storage`
- `.env.example` 新增上传相关配置：
  - `UPLOAD_LOCAL_DIR`
  - `PUBLIC_BASE_URL`
  - `UPLOAD_STORAGE`
  - 腾讯云 COS 配置占位
- `.gitignore` 忽略本地上传目录。
- 后台 API Client 支持 `FormData`，避免上传时错误设置 JSON `Content-Type`。
- 后台 API SDK 新增：
  - `uploadImage`
- 商品表单主图 URL 支持上传图片后自动回填。
- 后台商品表单上传按钮支持：
  - 上传中 loading
  - 上传成功提示
  - 上传失败提示

验证结果：

- `pnpm --filter @mall/server build` 通过。
- `pnpm --filter @mall/admin-web build` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- 本地启动 API 后，`GET /api/health` 返回正常。
- 默认管理员登录成功。
- 使用 admin token 调用 `POST /api/admin/uploads/images` 上传成功。
- 上传接口返回 `/uploads/images/2026/05/...` 路径。
- 访问上传后的 `/uploads/...` 静态资源返回 HTTP `200`。
- 验证结束后已停止本地 API 服务，释放 `3000` 端口。
- 验证产生的临时上传文件已删除。

注意事项：

- 当前是本地上传落地版本，COS 只预留配置入口，尚未接腾讯云 SDK。
- 当前只校验 MIME 类型和大小，没有做图片内容解码校验；后续接入真实对象存储或图片处理服务时再补。
- 本地上传目录不会进入版本管理。
- 后台构建仍有 Ant Design chunk 体积 warning，MVP 阶段继续接受。

暂停标记：

```text
P3-12 已完成。按用户要求，暂停后续模块开发，暂不进入 P4。
```

恢复时的建议下一步：

```text
P4-01：进入小程序 MVP，初始化 Taro 小程序基础结构和页面路由。
```

### 2026-05-21：P4-01 初始化 Taro 小程序基础结构和页面路由

完成内容：

- `apps/miniapp` 从占位包升级为 Taro 小程序工程。
- 安装小程序端依赖：
  - Taro `4.2.0`
  - React `18.3.1`
  - Zustand
  - Taroify
- 新增 Taro 构建配置：
  - `config/index.ts`
  - `config/dev.ts`
  - `config/prod.ts`
- 新增 Babel 配置：
  - `babel.config.cjs`
- 新增微信开发者工具项目配置：
  - `project.config.json`
- 更新小程序脚本：
  - `pnpm --filter @mall/miniapp dev:weapp`
  - `pnpm --filter @mall/miniapp build:weapp`
  - `pnpm --filter @mall/miniapp build`
- 新增小程序入口：
  - `src/app.tsx`
  - `src/app.config.ts`
  - `src/app.css`
  - `src/index.html`
- 新增底部 Tab 路由：
  - 首页：`pages/home/index`
  - 分类：`pages/category/index`
  - 购物车：`pages/cart/index`
  - 我的：`pages/user/index`
- 新增非 Tab 预留页面：
  - 商品详情：`pages/product/detail`
  - 订单列表：`pages/order/list`
- 新增基础页面 UI：
  - 首页推荐商品占位
  - 分类双栏占位
  - 商品详情占位
  - 购物车空状态
  - 订单状态占位
  - 我的页面与订单入口
- 新增小程序请求封装：
  - `src/lib/request.ts`
- 新增小程序会话状态：
  - `src/store/sessionStore.ts`
- 新增通用页面容器：
  - `src/components/PageShell.tsx`
- 样式优先使用 Flex，避免小程序端 CSS Grid 兼容性风险。

验证结果：

- `pnpm --filter @mall/miniapp typecheck` 通过。
- `pnpm --filter @mall/miniapp build` 通过，已生成微信小程序产物到 `apps/miniapp/dist`。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

注意事项：

- Taro CLI 首次构建会写入用户目录缓存 `~/.taro4.0`，在当前沙箱中需要授权后构建。
- 安装依赖时仍有 peer warning：
  - `@tarojs/plugin-framework-react` 提示 `vite@^4`，当前 P4-01 使用 webpack5 构建，暂不影响。
  - `@tarojs/webpack5-runner` 提示 `less@^4`，当前小程序样式使用 CSS，暂不影响。
- 首页和详情页图片目前使用占位 URL；接入商品接口和上传/COS 后，应改为商品主图 URL。
- 当前小程序只完成路由和页面骨架，还没有接真实登录、商品、购物车、订单接口。

下一步：

```text
P4-02：小程序接入微信登录骨架和会话存储，打通 /api/auth/wx-login 与 profile 入口。
```

### 2026-05-21：P4-02 接入小程序微信登录骨架和会话存储

完成内容：

- 新增小程序 API 类型：
  - `MiniappUser`
  - `WxLoginInput`
  - `LoginResult`
- 新增小程序认证 API：
  - `wxLogin`
  - `fetchProfile`
  - `refreshToken`
- 小程序请求封装统一读取本地 `access_token`。
- 新增小程序 storage key 管理：
  - `ACCESS_TOKEN_KEY`
  - `REFRESH_TOKEN_KEY`
  - `USER_PROFILE_KEY`
- 扩展 Zustand 会话状态：
  - `accessToken`
  - `refreshToken`
  - `user`
  - `isHydrated`
  - `setSession`
  - `updateUser`
  - `hydrateSession`
  - `clearSession`
- App 启动时自动从小程序 storage 恢复会话。
- 我的页面接入登录状态：
  - 未登录展示“微信登录”
  - 已登录展示用户昵称 / OpenID / 登录状态
  - 支持头像展示
  - 支持刷新资料
  - 支持退出登录
- 登录按钮调用：
  - `Taro.login()`
  - `Taro.getUserProfile()`
  - `POST /api/auth/wx-login`
- 登录成功后写入：
  - access token
  - refresh token
  - 用户资料
- 登录后可调用 `GET /api/auth/profile` 同步资料。

验证结果：

- `pnpm --filter @mall/miniapp typecheck` 通过。
- `pnpm --filter @mall/miniapp build` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- 本地启动 API 后，调用 `POST /api/auth/wx-login` 成功返回：
  - `accessToken`
  - `refreshToken`
  - `user`
- 使用返回的 `accessToken` 调用 `GET /api/auth/profile` 成功返回当前用户。
- 验证结束后已停止本地 API 服务，释放 `3000` 端口。

注意事项：

- 当前后端微信登录仍是本地 mock 版本，会用 `code` 或 `mockOpenId` 派生 OpenID；接入正式微信登录时需要补 `code2Session`。
- 小程序侧已预留 `refreshToken` API，但当前还没有自动刷新 access token 的拦截逻辑。
- `Taro.getUserProfile()` 如果用户拒绝授权，仍可只用 `code` 完成 mock 登录，只是昵称和头像为空。
- 本节点实际验证创建 / 更新了本地测试用户 `miniapp-p4-02-openid`。

下一步：

```text
P4-03：小程序首页和分类页接入真实分类 / 商品列表接口。
```

### 2026-05-21：P4-03 小程序首页和分类页接入真实分类 / 商品列表接口

完成内容：

- 后端公共分类接口调整：
  - `GET /api/categories`
  - `GET /api/categories/tree`
- 公共分类接口现在只返回 `isVisible = true` 的分类。
- 后台分类接口保持不变，仍通过 `/api/admin/categories` 返回全量分类。
- 小程序新增目录 API：
  - `fetchCategoryTree`
  - `fetchProducts`
- 小程序新增目录类型：
  - `Category`
  - `Product`
  - `ProductSku`
  - `ProductImage`
  - `ProductStatus`
- 小程序新增商品工具方法：
  - 获取主图 URL
  - 计算最低价格
  - 统计库存
- 小程序请求封装导出：
  - `API_BASE_URL`
  - `resolveAssetUrl`
- 图片 URL 支持：
  - 绝对 URL
  - `/uploads/...` 相对路径自动拼接 API 域名
- 新增共享商品卡片组件：
  - `ProductCard`
- 首页接入真实商品列表：
  - 页面加载时调用 `GET /api/products`
  - 展示商品主图 / 分类 / 名称 / 副标题 / 最低价
  - 支持加载态
  - 支持空状态
  - 支持重新加载
  - 商品点击进入商品详情页
- 分类页接入真实分类树：
  - 页面加载时调用 `GET /api/categories/tree`
  - 左侧展示“全部商品”和可见分类
  - 支持子分类缩进
- 分类页接入真实商品筛选：
  - 选中“全部商品”调用 `GET /api/products`
  - 选中分类调用 `GET /api/products?categoryId=...`
  - 右侧展示当前分类商品列表
  - 支持加载态和空状态

验证结果：

- `pnpm --filter @mall/server build` 通过。
- `pnpm --filter @mall/miniapp typecheck` 通过。
- `pnpm --filter @mall/miniapp build` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- 本地启动 API 后，调用 `GET /api/categories/tree` 成功返回可见分类树。
- 本地启动 API 后，调用 `GET /api/products` 成功返回上架商品列表。
- 本地启动 API 后，调用 `GET /api/products?categoryId=...` 成功按分类返回上架商品。
- 验证结束后已停止本地 API 服务，释放 `3000` 端口。

注意事项：

- 当前商品列表按“精确分类 ID”筛选，不会自动包含子分类商品；后续如果运营更需要父分类聚合，应在后端商品查询增加包含子分类的能力。
- 商品详情页目前仍是占位页，只接收真实商品 ID；下一步再接详情接口和 SKU 选择。
- 当前首页展示全部上架商品，暂未做分页、推荐位或 banner 配置。
- 本地测试库当前有 1 个可见分类树和 1 个上架商品，接口结构已满足小程序列表展示。

下一步：

```text
P4-04：小程序商品详情页接入真实商品详情接口，并补 SKU 展示 / 加入购物车入口。
```

### 2026-05-21：P4-04 小程序商品详情页接入真实商品详情和加入购物车入口

完成内容：

- 小程序目录 API 新增：
  - `fetchProductDetail`
- 小程序购物车 API 新增：
  - `addCartItem`
- 商品详情页从占位数据切换为真实接口：
  - `GET /api/products/:id`
- 商品详情页展示真实商品信息：
  - 主图
  - 分类
  - 商品名
  - 副标题 / 详情
  - 最低价或当前 SKU 价格
  - 总库存
- 商品详情页新增 SKU 展示：
  - SKU 名称
  - 规格
  - 价格
  - 库存
  - 不可购买状态
- 商品详情页新增 SKU 选择：
  - 默认选中第一个可购买 SKU
  - 切换 SKU 时重置购买数量
- 商品详情页新增数量步进：
  - 最小数量为 `1`
  - 最大数量不超过当前 SKU 库存
- 商品详情页新增加入购物车：
  - 未登录时提示登录，并跳转“我的”页
  - 已登录时调用 `POST /api/cart/items`
  - 默认加入后勾选购物车项
  - 成功 / 失败均有提示
- 商品详情页保留“去购物车”入口。
- 商品详情页新增加载态和加载失败重试态。

验证结果：

- `pnpm --filter @mall/miniapp typecheck` 通过。
- `pnpm --filter @mall/miniapp build` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- 本地启动 API 后，调用 `GET /api/products/:id` 成功返回商品详情和 SKU。
- 本地启动 API 后，调用 `POST /api/auth/wx-login` 成功获取测试用户 token。
- 使用测试用户 token 调用 `POST /api/cart/items` 成功加入购物车。
- 验证后调用 `DELETE /api/cart/items/:skuId` 删除测试购物车项。
- 验证结束后已停止本地 API 服务，释放 `3000` 端口。

注意事项：

- 本节点实际验证创建 / 更新了本地测试用户 `miniapp-p4-04-openid`。
- 购物车页目前仍是空状态占位页，下一步需要接真实购物车列表。
- 商品详情页当前只做基础 SKU 选择，没有做弹层式规格选择器；MVP 可先接受。
- 当前加购前只做前端库存上限约束，最终库存校验仍以后端 `CartService.assertSkuCanAdd` 为准。

下一步：

```text
P4-05：小程序购物车页接入真实购物车接口，支持数量修改、勾选和删除。
```

### 2026-05-22：P4-05 小程序购物车页接入真实购物车接口

完成内容：

- 小程序购物车 API 已扩展：
  - `fetchCart`
  - `updateCartItemQuantity`
  - `updateCartItemChecked`
  - `removeCartItem`
- 小程序购物车类型已新增：
  - `Cart`
  - `CartItem`
  - `CartSummary`
  - `CartItemSku`
  - `CartItemProduct`
- 购物车页已从占位空状态切换为真实接口：
  - 已登录时进入页面自动调用 `GET /api/cart`
  - 未登录时展示登录引导并跳转“我的”页
- 商品项展示已完成：
  - 勾选状态
  - 商品图
  - 商品名
  - SKU 规格
  - 可用 / 不可用原因
  - 单价
  - 数量
- 已实现数量修改：
  - `PATCH /api/cart/items/:skuId`
  - 数量最小为 `1`
  - 数量最大不超过当前 SKU 库存
- 已实现勾选 / 取消勾选：
  - `PATCH /api/cart/items/:skuId/checked`
- 已实现删除入口：
  - `DELETE /api/cart/items/:skuId`
  - 删除前弹窗确认
- 底部汇总已完成：
  - 已选数量
  - 已选金额
- 结算按钮目前仍是占位提示：
  - `结算将在下一步接入`

已完成验证：

- `pnpm --filter @mall/miniapp typecheck` 通过。
- `pnpm --filter @mall/miniapp build` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- 本地启动 API 后，`POST /api/auth/wx-login` 成功获取测试 token。
- 使用测试 token 调用 `POST /api/cart/items` 成功加入购物车。
- 使用测试 token 调用 `GET /api/cart` 成功返回购物车。
- 使用测试 token 调用 `PATCH /api/cart/items/:skuId` 成功修改数量。
- 使用测试 token 调用 `PATCH /api/cart/items/:skuId/checked` 成功修改勾选状态。
- 恢复后重新登录测试用户，确认暂停时的测试购物车项仍存在。
- 使用测试 token 调用 `DELETE /api/cart/items/:skuId` 成功删除测试购物车项。
- 删除后接口返回空购物车，测试购物车项已清理。

注意事项：

- 本节点实际创建 / 更新了本地测试用户：
  - `miniapp-p4-05-openid`
- 本节点运行时验证使用并已清理的 SKU：
  - `cmpc0wzfv0004htuzklyvpf4m`
- 购物车结算按钮仍是占位提示，下一步接订单确认 / 创建订单。
- 当前未做全选按钮；MVP 可后续在购物车体验增强节点补。
- 购物车最终可购买性仍以后端 Redis + DB 聚合结果为准。

下一步：

```text
P4-06：小程序订单确认页和创建订单接口接入，从购物车勾选项生成订单。
```

### 2026-05-22：P4-06 小程序订单确认页和创建订单接口接入

完成内容：

- 小程序新增订单 API：
  - `createOrderFromCart`
  - 调用 `POST /api/orders`
- 小程序新增订单类型：
  - `OrderStatus`
  - `Order`
  - `OrderItem`
- 小程序新增订单确认页：
  - `pages/order/confirm`
- 小程序路由新增：
  - `pages/order/confirm`
- 购物车页“去结算”从占位提示切换为跳转订单确认页。
- 订单确认页进入时读取真实购物车：
  - `GET /api/cart`
- 订单确认页只展示可结算商品：
  - 已勾选
  - 商品可用
  - SKU 存在
- 订单确认页展示：
  - 配送信息占位
  - 商品图
  - 商品名
  - SKU 规格
  - 单价
  - 数量
  - 小计
  - 总件数
  - 应付金额
- 订单确认页新增订单备注：
  - 最长 `255` 字符
  - 提交时传给后端 `remark`
- 提交订单时调用：
  - `POST /api/orders`
- 订单创建成功后：
  - 后端自动从已勾选购物车项生成订单
  - 后端扣减库存
  - 后端移除已勾选购物车项
  - 小程序跳转到订单列表页
- 未登录时展示登录引导。
- 没有可结算商品时展示返回购物车入口。

验证结果：

- `pnpm --filter @mall/miniapp typecheck` 通过。
- `pnpm --filter @mall/miniapp build` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- 本地启动 API 后，使用测试用户 `miniapp-p4-05-openid` 调用 `POST /api/cart/items` 成功加入并勾选测试 SKU。
- 使用测试 token 调用 `POST /api/orders` 成功从购物车创建订单。
- 创建的测试订单：
  - `MO20260522142753H7E1RR`
  - 状态：`PENDING_PAYMENT`
  - 应付金额：`209`
  - 商品数量：`1`
- 创建订单后调用 `GET /api/cart` 确认购物车已清空。
- 为避免测试数据占用库存，已调用 `PATCH /api/orders/:id/cancel` 取消测试订单。
- 测试订单取消后状态为 `CANCELLED`，库存已按后端取消逻辑归还。

注意事项：

- 当前订单确认页的配送信息仍是占位，后续地址模块接入后需要补真实收货地址选择。
- 当前订单确认页不传地址、优惠券、运费，MVP 先跑通购物车到订单创建。
- 当前订单创建成功后跳转订单列表页，但订单列表仍是占位页，后续节点需要接真实订单列表和支付入口。
- 本节点创建并取消了一笔本地测试订单，测试订单仍保留在数据库用于审计和列表验证。

下一步：

```text
P4-07：小程序订单列表页接入真实订单接口，并提供待支付订单的支付入口。
```

### 2026-05-22：P4-07 小程序订单列表页接入真实订单接口和预支付入口

完成内容：

- 小程序订单 API 扩展：
  - `fetchOrders`
  - `cancelOrder`
- 小程序新增支付 API：
  - `createWechatPrepay`
  - 调用 `POST /api/payments/wechat/prepay`
- 小程序新增支付类型：
  - `PaymentStatus`
  - `Payment`
  - `WechatPayParams`
  - `WechatPrepayResult`
- 订单列表页从占位页切换为真实接口：
  - `GET /api/orders`
- 订单列表页新增状态筛选：
  - 全部
  - 待支付
  - 待发货
  - 已发货
  - 已取消
- 订单列表页展示真实订单信息：
  - 订单号
  - 下单时间
  - 订单状态
  - 商品图
  - 商品名
  - SKU 规格
  - 单价
  - 数量
  - 应付金额
- 待支付订单新增操作：
  - 取消订单
  - 去支付
- “取消订单”接入：
  - `PATCH /api/orders/:id/cancel`
- “去支付”接入：
  - `POST /api/payments/wechat/prepay`
  - 成功后展示预支付单号
- 未登录时展示登录引导。
- 空订单状态展示返回首页入口。

验证结果：

- `pnpm --filter @mall/miniapp typecheck` 通过。
- `pnpm --filter @mall/miniapp build` 通过。
- 本地启动 API 后，使用测试用户 `miniapp-p4-05-openid` 创建一笔待支付测试订单。
- 使用测试 token 调用 `GET /api/orders?status=PENDING_PAYMENT` 成功返回待支付订单。
- 使用测试 token 调用 `POST /api/payments/wechat/prepay` 成功生成 mock 微信预支付单。
- 生成的测试预支付单：
  - `PAY20260522143302296GU69KL`
  - 状态：`PENDING`
  - 金额：`209`
- 为避免测试数据占用库存，已调用 `PATCH /api/orders/:id/cancel` 取消测试订单。
- 测试订单取消后状态为 `CANCELLED`，库存已按后端取消逻辑归还。

注意事项：

- 当前“去支付”只生成 mock 微信预支付参数，不调用真实 `Taro.requestPayment`。
- 当前预支付成功后订单仍保持 `PENDING_PAYMENT`，真实支付成功状态需要通过支付回调推进。
- 订单列表当前未做下拉刷新和分页，MVP 数据量下先按全量列表展示。
- 本节点创建并取消了一笔本地测试订单，测试订单仍保留在数据库用于订单列表验证。

下一步：

```text
P4-08：小程序支付结果链路接入，基于 mock 支付回调把订单从待支付推进到待发货。
```

### 2026-05-22：管理后台布局与路由修复

修复内容：

- 管理后台接入 `react-router-dom` 路由：
  - `/`
  - `/categories`
  - `/products`
  - `/orders`
  - `/users`
- 菜单点击从本地 `useState` 页面切换改为真实 URL 导航。
- 菜单选中态根据当前 `location.pathname` 计算。
- 未匹配路径统一重定向到 `/`。
- 修复刷新后回到首页的问题：
  - 进入 `/products`、`/orders` 等二级路由后刷新，仍保持当前路径。
- 修复后台整体布局滚动问题：
  - `body` 禁止整体滚动。
  - `.admin-shell` 固定为 `100vh`。
  - `.admin-header` 固定在顶部。
  - `.admin-content` 独立滚动。
  - 侧边栏保持整屏高度，品牌区吸顶。

验证结果：

- `pnpm --filter @mall/admin-web typecheck` 通过。
- `pnpm --filter @mall/admin-web build` 通过。
- 本地启动管理后台后，`GET /products` 返回 `200`。
- 本地启动管理后台后，`GET /orders` 返回 `200`。

注意事项：

- 当前使用 `BrowserRouter`，生产部署时 Nginx 需要为后台前端配置 history fallback，将非静态资源请求回退到 `index.html`。

### 2026-05-22：P4-08 小程序 mock 支付结果链路接入

完成内容：

- 小程序支付 API 扩展：
  - `mockWechatPayNotify`
  - 调用 `POST /api/payments/wechat/notify`
- 小程序新增支付回调类型：
  - `WechatNotifyInput`
  - `WechatNotifyResult`
- 订单列表页待支付订单的支付入口升级：
  - 原来只生成预支付单
  - 现在生成预支付单后弹出 mock 支付确认
  - 点击“支付成功”后调用 mock 支付回调
- mock 支付回调参数包含：
  - `orderId`
  - `orderNo`
  - `transactionId`
  - `amount`
  - `tradeState: SUCCESS`
- mock 支付成功后：
  - 后端支付单从 `PENDING` 更新为 `SUCCESS`
  - 后端订单从 `PENDING_PAYMENT` 推进到 `PENDING_DELIVERY`
  - 小程序显示支付成功提示
  - 小程序刷新订单列表
- 订单列表页按钮文案从“去支付”调整为“模拟支付”，避免误导为真实微信支付。

验证结果：

- `pnpm --filter @mall/miniapp typecheck` 通过。
- `pnpm --filter @mall/miniapp build` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- 本地启动 API 后，使用测试用户 `miniapp-p4-08-openid` 登录成功。
- 使用测试 token 调用 `POST /api/cart/items` 成功加入并勾选测试 SKU。
- 使用测试 token 调用 `POST /api/orders` 成功创建待支付测试订单。
- 使用测试 token 调用 `POST /api/payments/wechat/prepay` 成功生成 mock 微信预支付单。
- 调用 `POST /api/payments/wechat/notify` 成功模拟支付回调。
- 支付回调后支付单状态为 `SUCCESS`。
- 支付回调后订单状态为 `PENDING_DELIVERY`。
- 调用 `GET /api/orders/:id` 确认订单状态已更新为待发货。

本地测试数据：

- 测试用户：
  - `miniapp-p4-08-openid`
- 测试订单：
  - `MO20260522155535GHKPNO`
  - 状态：`PENDING_DELIVERY`
  - 金额：`209`
- 测试预支付单：
  - `PAY20260522155545713UJBHSE`
  - 状态：`SUCCESS`

注意事项：

- 当前仍是 mock 支付链路，不调用真实 `Taro.requestPayment`。
- 当前 mock notify 接口不做微信平台验签，只用于本地 MVP 链路验证。
- 本节点创建了一笔已支付待发货测试订单，因支付成功后不能走用户取消流程恢复库存，订单保留在本地库中供后台发货和订单状态验证。
- 后续接真实微信支付时，需要把 mock 弹窗替换为 `Taro.requestPayment`，并由微信支付回调触发服务端 notify。

下一步：

```text
P4-09：小程序订单详情页接入真实订单详情，展示支付后订单状态和物流信息。
```

### 2026-05-22：P4-09 小程序订单详情页接入真实订单详情

完成内容：

- 小程序订单 API 扩展：
  - `fetchOrderDetail`
  - 调用 `GET /api/orders/:id`
- 小程序新增订单详情页：
  - `pages/order/detail`
- 小程序路由新增：
  - `pages/order/detail`
- 订单列表页新增详情入口：
  - 点击订单头部进入详情
  - 点击商品区域进入详情
  - 点击“查看详情”进入详情
- 订单详情页展示真实订单状态：
  - 待支付
  - 待发货
  - 已发货
  - 已完成
  - 已取消
  - 退款中
  - 已退款
- 订单详情页展示状态说明：
  - 待支付提示完成支付
  - 待发货提示等待商家发货
  - 已发货提示查看物流
  - 已取消展示取消原因
- 订单详情页展示订单信息：
  - 订单号
  - 创建时间
  - 支付时间
  - 订单备注
- 订单详情页展示商品清单：
  - 商品图
  - 商品名
  - SKU 规格
  - 单价
  - 数量
  - 小计
- 订单详情页展示物流信息：
  - 物流公司
  - 物流单号
  - 发货时间
  - 发货备注
- 订单详情页展示费用明细：
  - 商品数量
  - 商品金额
  - 应付金额
- 未登录、缺少订单 ID、加载失败均有兜底状态。

验证结果：

- `pnpm --filter @mall/miniapp typecheck` 通过。
- `pnpm --filter @mall/miniapp build` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- 本地启动 API 后，使用测试用户 `miniapp-p4-08-openid` 重新登录成功。
- 使用测试 token 调用 `GET /api/orders/:id` 成功读取 P4-08 已支付待发货订单详情。
- 验证订单：
  - `MO20260522155535GHKPNO`
  - 状态：`PENDING_DELIVERY`
  - 支付时间已存在
  - 商品和金额明细返回正常

注意事项：

- 当前订单详情页只展示物流信息，不提供确认收货、申请退款等操作。
- 当前待支付订单仍需回到订单列表页进行 mock 支付。
- 物流信息来自后端订单发货字段，后续可与后台发货节点联动验证。

下一步：

```text
P4-10：小程序订单详情页补操作入口，支持待支付订单模拟支付、待支付订单取消，以及已发货订单确认收货占位。
```

### 2026-05-25：P4-10 小程序订单详情页补操作入口

完成内容：

- 订单详情页新增待支付订单操作区：
  - 取消订单
  - 模拟支付
- 订单详情页取消订单接入：
  - `PATCH /api/orders/:id/cancel`
  - 取消前弹窗确认
  - 取消成功后直接刷新当前详情状态
- 订单详情页模拟支付接入：
  - `POST /api/payments/wechat/prepay`
  - 弹窗展示 mock 支付单号和应付金额
  - 确认“支付成功”后调用 `POST /api/payments/wechat/notify`
  - 支付成功后重新加载订单详情
- 订单详情页已发货订单新增确认收货占位：
  - 当前只显示提示，后续接真实确认收货接口
- 订单详情页新增操作中状态：
  - 防止重复点击取消 / 支付按钮
  - 按钮 loading / disabled 跟随操作状态

验证结果：

- `pnpm --filter @mall/miniapp typecheck` 通过。
- `pnpm --filter @mall/miniapp build` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- 本地启动 API 后，使用测试用户 `miniapp-p4-10-openid` 登录成功。
- 创建待支付订单后，调用 `PATCH /api/orders/:id/cancel` 成功取消订单。
- 再次创建待支付订单后，调用 `POST /api/payments/wechat/prepay` 成功生成预支付单。
- 调用 `POST /api/payments/wechat/notify` 成功模拟支付回调。
- 支付回调后调用 `GET /api/orders/:id` 确认订单状态为 `PENDING_DELIVERY`。

本地测试数据：

- 测试用户：
  - `miniapp-p4-10-openid`
- 取消链路测试订单：
  - `MO20260525095243NAZ3MC`
  - 状态：`CANCELLED`
- 模拟支付链路测试订单：
  - `MO20260525095313MK4V22`
  - 状态：`PENDING_DELIVERY`
- 模拟支付测试预支付单：
  - `PAY20260525095322660KAZS14`
  - 状态：`SUCCESS`

注意事项：

- 当前确认收货仍是占位提示，后端尚未提供用户确认收货接口。
- 当前详情页模拟支付与订单列表模拟支付逻辑有少量重复，后续真实支付接入时可抽出共享支付流程。
- 本节点创建了一笔已支付待发货测试订单，保留用于后台发货和后续订单状态验证。

下一步：

```text
P4-11：补用户确认收货接口和小程序确认收货链路，将已发货订单推进到已完成。
```

### 2026-05-25：P4-11 用户确认收货接口和小程序确认收货链路

完成内容：

- Prisma 订单模型新增完成时间：
  - `completedAt`
- 新增数据库迁移：
  - `20260525000100_add_order_completed_at`
- 后端订单服务新增确认收货能力：
  - `OrderService.complete`
- 后端新增用户确认收货接口：
  - `PATCH /api/orders/:id/complete`
- 确认收货接口规则：
  - 必须是当前登录用户的订单
  - 仅允许 `SHIPPED` 订单确认收货
  - 成功后订单状态更新为 `COMPLETED`
  - 写入 `completedAt`
- 小程序订单 API 扩展：
  - `completeOrder`
- 小程序订单详情页“确认收货”从占位提示切换为真实接口：
  - 弹窗确认
  - 调用 `PATCH /api/orders/:id/complete`
  - 成功后刷新当前订单详情
  - 操作中按钮进入 loading 状态

验证结果：

- `pnpm --filter @mall/server prisma:generate` 通过。
- `pnpm --filter @mall/server prisma:migrate:dev` 通过，已应用 `completedAt` migration。
- `pnpm --filter @mall/server typecheck` 通过。
- `pnpm --filter @mall/miniapp typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm --filter @mall/miniapp build` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- 本地启动 API 后，使用测试用户 `miniapp-p4-10-openid` 重新登录成功。
- 使用测试 token 调用 `PATCH /api/orders/:id/ship` 将测试订单推进到 `SHIPPED`。
- 使用测试 token 调用 `PATCH /api/orders/:id/complete` 成功确认收货。
- 调用 `GET /api/orders/:id` 确认订单状态为 `COMPLETED`，且 `completedAt` 已写入。

本地测试数据：

- 测试用户：
  - `miniapp-p4-10-openid`
- 确认收货测试订单：
  - `MO20260525095313MK4V22`
  - 状态：`COMPLETED`
  - 物流公司：`P4-11测试物流`
  - 物流单号：`P411202605250001`

注意事项：

- 当前 `PATCH /api/orders/:id/ship` 仍暴露在用户端控制器中，用于本地链路验证；真实业务应只允许后台或商家发货。
- 确认收货接口目前只处理 `SHIPPED -> COMPLETED`，未包含自动完成、售后拦截等复杂规则。
- 本节点把 P4-10 的已支付待发货测试订单推进为已完成，后续如需待发货测试数据需重新创建。

下一步：

```text
P4-12：小程序订单列表和详情页状态体验增强，补已完成状态展示、列表刷新入口和支付/收货流程提示优化。
```

### 2026-05-25：P4-12 小程序订单状态体验增强

完成内容：

- 小程序订单列表新增“已完成”筛选 tab：
  - 支持按 `COMPLETED` 状态查看订单
- 小程序订单列表新增顶部刷新入口：
  - 显示当前筛选范围
  - 可手动刷新当前订单列表
  - 刷新中保留已有列表并显示按钮 loading
- 小程序订单列表新增状态提示文案：
  - 待支付：提示可继续支付或取消
  - 待发货：提示等待商家发货
  - 已发货：优先展示物流单号
  - 已完成：展示完成时间
  - 已取消：展示取消原因
  - 退款中 / 已退款：展示退款状态
- 小程序订单列表新增已发货订单确认收货入口：
  - 调用 `PATCH /api/orders/:id/complete`
  - 成功后刷新当前列表
  - 操作中按钮进入 loading 状态
- 小程序订单详情页增强状态提示：
  - 待支付提示可支付或取消
  - 已发货提示物流单号和确认收货动作
  - 已完成提示完成时间
- 小程序订单详情页新增手动刷新按钮：
  - 可在详情页直接刷新订单状态
  - 操作中禁用刷新
- 小程序订单详情页订单信息新增完成时间：
  - 展示 `completedAt`

验证结果：

- `pnpm exec prettier --write apps/miniapp/src/pages/order/list.tsx apps/miniapp/src/pages/order/list.css apps/miniapp/src/pages/order/detail.tsx apps/miniapp/src/pages/order/detail.css` 已执行。
- `pnpm --filter @mall/miniapp typecheck` 通过。
- `pnpm --filter @mall/miniapp build` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

注意事项：

- 订单列表当前只补了用户侧确认收货入口；真实物流查询、售后入口、评价入口尚未接入。
- 订单列表顶部筛选 tab 当前是 6 个固定项，后续如继续增加退款、售后等状态，建议改成横向滚动 tab。
- 详情页刷新按钮是手动刷新，不涉及下拉刷新能力。

下一步：

```text
P4-13：梳理并收紧发货接口权限，将用户侧发货验证入口迁移到后台/商家侧能力。
```

### 2026-05-25：P4-13 收紧发货接口权限

完成内容：

- 移除用户侧发货接口：
  - 删除 `OrderController` 中的 `PATCH /api/orders/:id/ship`
  - 用户端订单控制器仅保留创建、列表、详情、取消、确认收货
- 移除用户侧发货服务方法：
  - 删除 `OrderService.ship`
  - 保留后台发货方法 `OrderService.shipForAdmin`
- 后台/商家侧发货能力保持不变：
  - `PATCH /api/admin/orders/:id/ship`
  - 仍由 `AdminAuthGuard` 保护

验证结果：

- `pnpm exec prettier --write apps/server/src/modules/order/order.controller.ts apps/server/src/modules/order/order.service.ts` 已执行。
- `pnpm --filter @mall/server typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。
- 本地启动 API 后确认路由映射：
  - 不再映射 `PATCH /api/orders/:id/ship`
  - 仍映射 `PATCH /api/admin/orders/:id/ship`
- 调用用户侧 `PATCH /api/orders/test-order-id/ship` 返回 `404`。
- 调用后台侧 `PATCH /api/admin/orders/test-order-id/ship` 在未登录时返回 `401`，说明后台路由存在且受管理员鉴权保护。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- 本地 API 验证后已停止，`3000` 端口未被占用。

注意事项：

- 后续如需在本地验证“待发货 -> 已发货 -> 已完成”完整链路，应通过后台登录后调用 `PATCH /api/admin/orders/:id/ship`，不再使用用户侧发货接口。
- 当前后台发货接口只校验管理员登录，暂未细分角色权限；后续 RBAC 节点再补超级管理员 / 运营角色能力边界。

下一步：

```text
P4-14：后台订单详情体验增强，补完成时间、订单状态筛选体验和发货后列表刷新反馈。
```

### 2026-05-25：P4-14 后台订单详情和筛选体验增强

完成内容：

- 后台订单类型补齐完成时间：
  - `Order.completedAt`
- 后台订单状态展示从枚举值改为中文标签：
  - 待支付、待发货、已发货、已完成、已取消、退款中、已退款
- 后台订单状态筛选体验增强：
  - 下拉选项展示中文状态
  - 选择状态后立即按当前状态加载列表
  - 新增“重置”按钮，可回到全部订单
- 后台订单展开详情新增完成时间：
  - 展示 `completedAt`
- 后台发货成功反馈增强：
  - 成功提示包含订单号
  - 如果填写物流单号，成功提示同步展示物流单号
  - 发货成功后继续刷新当前筛选列表
- 后台订单页副标题更新：
  - 明确后台可处理取消、发货和售后前置流程

验证结果：

- `pnpm exec prettier --write apps/admin-web/src/pages/OrderPage.tsx apps/admin-web/src/api/types.ts` 已执行。
- `pnpm --filter @mall/admin-web typecheck` 通过。
- `pnpm --filter @mall/admin-web build` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

注意事项：

- 后台订单表格仍为单页展示，尚未接分页、搜索订单号、用户筛选。
- Vite 构建仍提示主 chunk 超过 500KB，这是当前 Ant Design/ECharts 等依赖带来的构建提示，不影响本节点功能；后续可在性能优化节点做路由级懒加载。

下一步：

```text
P4-15：后台订单列表补分页和订单号/用户关键词搜索，降低订单量增长后的列表压力。
```

### 2026-05-25：P4-15 后台订单分页和关键词搜索

完成内容：

- 新增后台订单查询 DTO：
  - `QueryAdminOrdersDto`
  - 支持 `status`
  - 支持 `keyword`
  - 支持 `page`
  - 支持 `pageSize`
- 后台订单列表接口改为分页结构：
  - `GET /api/admin/orders`
  - 返回 `items`
  - 返回 `total`
  - 返回 `page`
  - 返回 `pageSize`
- 后台订单搜索支持：
  - 订单号 `orderNo`
  - 用户 `openId`
  - 用户昵称 `nickname`
  - 用户手机号 `phone`
- 后台订单服务查询优化：
  - 使用 `count + findMany` 事务同时返回总数和当前页
  - 保持按创建时间倒序
  - 继续包含用户和订单商品明细
- 管理后台 API 类型补充：
  - `OrderListResult`
- 管理后台订单页接入分页：
  - Ant Design Table pagination
  - 支持页码切换
  - 支持 pageSize 切换
  - 展示总数
- 管理后台订单页接入关键词搜索：
  - 搜索订单号 / 用户
  - 搜索后回到第一页
  - 重置按钮清空状态和关键词

验证结果：

- `pnpm exec prettier --write apps/server/src/modules/admin/dto/query-admin-orders.dto.ts apps/server/src/modules/admin/admin-order.controller.ts apps/server/src/modules/order/order.service.ts apps/admin-web/src/api/types.ts apps/admin-web/src/api/adminApi.ts apps/admin-web/src/pages/OrderPage.tsx apps/admin-web/src/styles.css` 已执行。
- `pnpm --filter @mall/server typecheck` 通过。
- `pnpm --filter @mall/admin-web typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm --filter @mall/admin-web build` 通过。
- 本地启动 API 后，管理员 `admin` 登录成功。
- 调用 `GET /api/admin/orders?page=1&pageSize=2&keyword=MO` 成功返回分页结构：
  - `items`
  - `total`
  - `page`
  - `pageSize`
- 调用 `GET /api/admin/orders?page=1&pageSize=1&status=COMPLETED&keyword=miniapp-p4-10-openid` 成功按状态和用户关键词组合筛选。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- 本地 API 验证后已停止，`3000` 端口未被占用。

注意事项：

- 小程序用户侧订单接口仍保持数组返回，未接分页；当前 P4-15 只调整后台订单接口。
- 后台订单搜索当前是简单 `contains` 查询，后续订单量变大后可考虑为 `orderNo`、用户标识字段补索引或单独搜索服务。
- 后台订单接口返回结构已从 `Order[]` 变为分页对象，调用方目前只有管理后台订单页已同步调整。

下一步：

```text
P4-16：补后台订单分页接口的 Swagger 响应说明，并整理订单模块接口文档边界。
```

### 2026-05-25：P4-16 后台订单分页接口 Swagger 和订单接口边界文档

完成内容：

- 新增后台订单 Swagger 响应 DTO：
  - `AdminOrderListResultDto`
  - `AdminOrderDto`
  - `AdminOrderItemDto`
  - `AdminOrderUserDto`
- 后台订单分页接口补响应模型：
  - `GET /api/admin/orders`
  - Swagger 响应明确为 `AdminOrderListResultDto`
  - 文档中展示 `items / total / page / pageSize`
- 后台订单操作接口补响应模型：
  - `PATCH /api/admin/orders/:id/cancel`
  - `PATCH /api/admin/orders/:id/ship`
  - 响应模型统一标注为 `AdminOrderDto`
- 后台订单接口补 `ApiOperation`：
  - 商家后台分页查询订单
  - 商家后台取消待支付订单
  - 商家后台发货
- 用户侧订单接口补 `ApiOperation`：
  - 小程序用户从购物车创建订单
  - 小程序用户查询自己的订单列表
  - 小程序用户查询自己的订单详情
  - 小程序用户取消待支付订单
  - 小程序用户确认收货
- 文档边界说明补充：
  - 用户侧订单接口只处理当前登录用户自己的订单
  - 发货能力仅属于商家后台
  - 用户侧订单接口不提供发货能力
- Swagger 可空字段类型优化：
  - 可空字符串标注为 `string nullable`
  - 可空时间标注为 `string date-time nullable`

验证结果：

- `pnpm exec prettier --write apps/server/src/modules/admin/dto/admin-order-list-result.dto.ts apps/server/src/modules/admin/admin-order.controller.ts apps/server/src/modules/order/order.controller.ts` 已执行。
- `pnpm --filter @mall/server typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。
- 本地启动 API 后，`/docs-json` 中已确认：
  - 存在 `AdminOrderListResultDto`
  - `GET /api/admin/orders` 响应引用分页 DTO
  - 后台发货接口说明包含“用户侧订单接口不提供发货能力”
  - 用户确认收货接口摘要为“小程序用户确认收货”
- 本地 API 验证后已停止，`3000` 端口未被占用。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

注意事项：

- 当前 Swagger 仍只描述后台订单分页接口的核心响应字段，没有为所有用户侧订单响应单独补 DTO；后续可统一抽象订单响应 DTO。
- 当前全局响应拦截器会包裹 `code / message / data`，Swagger 响应 DTO 描述的是 `data` 内部结构；后续如要完全精确，可增加统一响应包装 DTO。

下一步：

```text
P4-17：整理订单响应类型复用，统一用户侧和后台侧订单 DTO 文档，减少 Swagger 响应说明重复。
```

### 2026-05-25：P4-17 订单响应 DTO 复用和 Swagger 响应统一

完成内容：

- 新增订单模块公共响应 DTO：
  - `OrderResponseDto`
  - `OrderItemResponseDto`
- 用户侧订单接口统一引用公共订单响应 DTO：
  - `POST /api/orders`
  - `GET /api/orders`
  - `GET /api/orders/:id`
  - `PATCH /api/orders/:id/cancel`
  - `PATCH /api/orders/:id/complete`
- 后台订单响应 DTO 改为复用公共订单响应：
  - `AdminOrderDto extends OrderResponseDto`
  - 后台只额外补充 `user`
- 后台订单分页响应继续引用后台订单 DTO：
  - `AdminOrderListResultDto.items -> AdminOrderDto[]`
- 移除后台订单 DTO 中重复维护的订单基础字段和订单明细字段：
  - 商品明细统一由 `OrderItemResponseDto` 描述
  - 订单主体统一由 `OrderResponseDto` 描述
- Swagger 文档响应结构更统一：
  - 用户侧订单接口返回 `OrderResponseDto`
  - 后台订单操作返回 `AdminOrderDto`
  - 后台订单分页返回 `AdminOrderListResultDto`

验证结果：

- `pnpm exec prettier --write apps/server/src/modules/order/dto/order-response.dto.ts apps/server/src/modules/admin/dto/admin-order-list-result.dto.ts apps/server/src/modules/order/order.controller.ts` 已执行。
- `pnpm --filter @mall/server typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。
- 本地启动 API 后，`/docs-json` 中已确认：
  - 存在 `OrderResponseDto`
  - 存在 `OrderItemResponseDto`
  - 用户侧订单接口响应引用 `OrderResponseDto`
  - 后台分页响应引用 `AdminOrderListResultDto`
  - 后台订单响应 `AdminOrderDto` 同时包含公共订单字段和后台用户字段
- 本地 API 验证后已停止，`3000` 端口未被占用。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

注意事项：

- 当前 Swagger 响应 DTO 仍描述的是全局响应包装里的 `data` 内容，尚未统一封装 `code / message / data / timestamp / path`。
- 小程序前端类型中 `OrderItem.updatedAt` 目前比后端 `OrderItem` 模型多一个字段，当前未影响编译；后续建议在前端类型清理节点统一修正。

下一步：

```text
P4-18：统一 API 响应包装 Swagger 文档，补通用响应 DTO，让文档显式体现 code/message/data/timestamp/path。
```

### 2026-05-25：P4-18 API 响应包装 Swagger 文档

完成内容：

- 新增通用 Swagger 响应 DTO：
  - `ApiSuccessResponseDto`
  - `ApiErrorResponseDto`
- 新增通用成功响应装饰器：
  - `ApiWrappedOkResponse`
- `ApiWrappedOkResponse` 支持：
  - 单对象 `data`
  - 数组 `data`
  - 分页对象 `data`
  - 自动挂载 `ApiSuccessResponseDto`
  - 自动挂载业务响应 DTO
- 订单用户侧接口改用包装响应文档：
  - `POST /api/orders`
  - `GET /api/orders`
  - `GET /api/orders/:id`
  - `PATCH /api/orders/:id/cancel`
  - `PATCH /api/orders/:id/complete`
- 后台订单接口改用包装响应文档：
  - `GET /api/admin/orders`
  - `PATCH /api/admin/orders/:id/cancel`
  - `PATCH /api/admin/orders/:id/ship`
- Swagger 文档现在显式展示响应外层结构：
  - `code`
  - `message`
  - `data`
  - `timestamp`
  - `path`
- `data` 内部继续引用已有业务 DTO：
  - `OrderResponseDto`
  - `AdminOrderDto`
  - `AdminOrderListResultDto`

验证结果：

- `pnpm exec prettier --write apps/server/src/modules/common/dto/api-response.dto.ts apps/server/src/modules/common/decorators/api-wrapped-ok-response.decorator.ts apps/server/src/modules/order/order.controller.ts apps/server/src/modules/admin/admin-order.controller.ts` 已执行。
- `pnpm --filter @mall/server typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。
- 本地启动 API 后，`/docs-json` 中已确认：
  - 存在 `ApiSuccessResponseDto`
  - 订单创建接口响应为 `ApiSuccessResponseDto + data: OrderResponseDto`
  - 用户订单列表响应为 `ApiSuccessResponseDto + data: OrderResponseDto[]`
  - 后台订单分页响应为 `ApiSuccessResponseDto + data: AdminOrderListResultDto`
  - 响应文档中包含 `code / message / data / timestamp / path`
- 本地 API 验证后已停止，`3000` 端口未被占用。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

注意事项：

- 本节点先将订单相关接口切换到统一响应包装文档；其他模块仍有部分接口使用原始 `ApiOkResponse`，后续可逐模块迁移。
- `ApiErrorResponseDto` 已创建，但尚未批量挂到异常响应文档；后续可配合 `ApiBadRequestResponse / ApiUnauthorizedResponse` 统一补齐。

下一步：

```text
P4-19：将商品、分类、购物车、支付等核心接口逐步迁移到 ApiWrappedOkResponse，补齐统一响应文档覆盖率。
```

### 2026-05-25：P4-19 核心接口统一响应文档迁移

完成内容：

- 商品用户侧接口迁移到 `ApiWrappedOkResponse`：
  - `POST /api/products`
  - `GET /api/products`
  - `GET /api/products/:id`
  - `PATCH /api/products/:id`
  - `PATCH /api/products/:id/status`
  - `DELETE /api/products/:id`
- 商品后台接口迁移到 `ApiWrappedOkResponse`：
  - `POST /api/admin/products`
  - `GET /api/admin/products`
  - `GET /api/admin/products/:id`
  - `PATCH /api/admin/products/:id`
  - `PATCH /api/admin/products/:id/status`
  - `DELETE /api/admin/products/:id`
- 分类用户侧接口迁移到 `ApiWrappedOkResponse`：
  - `POST /api/categories`
  - `GET /api/categories`
  - `GET /api/categories/tree`
  - `GET /api/categories/:id`
  - `PATCH /api/categories/:id`
  - `DELETE /api/categories/:id`
- 分类后台接口迁移到 `ApiWrappedOkResponse`：
  - `POST /api/admin/categories`
  - `GET /api/admin/categories`
  - `GET /api/admin/categories/tree`
  - `GET /api/admin/categories/:id`
  - `PATCH /api/admin/categories/:id`
  - `DELETE /api/admin/categories/:id`
- 购物车接口迁移到 `ApiWrappedOkResponse`：
  - `GET /api/cart`
  - `POST /api/cart/items`
  - `PATCH /api/cart/items/:skuId`
  - `PATCH /api/cart/items/:skuId/checked`
  - `DELETE /api/cart/items/:skuId`
- 支付和退款接口迁移到 `ApiWrappedOkResponse`：
  - `POST /api/payments/wechat/prepay`
  - `POST /api/payments/wechat/notify`
  - `GET /api/payments/:orderId/status`
  - `POST /api/refunds`
- 上传接口迁移到 `ApiWrappedOkResponse`：
  - `POST /api/admin/uploads/images`
  - `data` 明确引用 `UploadResultDto`

验证结果：

- `pnpm exec prettier --write apps/server/src/modules/product/product.controller.ts apps/server/src/modules/product/admin-product.controller.ts apps/server/src/modules/category/category.controller.ts apps/server/src/modules/category/admin-category.controller.ts apps/server/src/modules/cart/cart.controller.ts apps/server/src/modules/payment/payment.controller.ts apps/server/src/modules/upload/admin-upload.controller.ts` 已执行。
- `pnpm --filter @mall/server typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。
- 本地启动 API 后，`/docs-json` 中已确认：
  - 商品接口响应包含 `ApiSuccessResponseDto`
  - 分类接口响应包含 `ApiSuccessResponseDto`
  - 购物车接口响应包含 `ApiSuccessResponseDto`
  - 支付接口响应包含 `ApiSuccessResponseDto`
  - 上传接口响应包含 `ApiSuccessResponseDto + data: UploadResultDto`
- 本地 API 验证后已停止，`3000` 端口未被占用。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

注意事项：

- 商品、分类、购物车、支付当前多数接口还没有专门的响应 DTO，本节点先统一外层响应包装；`data` 内部精细结构后续可按模块补齐。
- 当前仍保留原始 `ApiOkResponse` 的模块：
  - auth
  - admin-auth
  - admin-users
  - admin-statistics
  - health
- `ApiWrappedOkResponse` 内部仍使用 Nest Swagger 的 `ApiOkResponse` 生成最终响应文档，这是预期实现细节。

下一步：

```text
P4-20：继续迁移 auth、admin-auth、admin-users、admin-statistics、health 到统一响应文档，并按需补登录/用户/统计响应 DTO。
```

### 2026-05-26：P4-20 剩余核心接口统一响应文档迁移

完成内容：

- 新增用户认证响应 DTO：
  - `UserProfileResponseDto`
  - `UserLoginResponseDto`
- 新增管理员认证响应 DTO：
  - `AdminProfileResponseDto`
  - `AdminLoginResponseDto`
- 新增后台用户响应 DTO：
  - `AdminUserResponseDto`
- 新增后台统计响应 DTO：
  - `AdminStatisticsMetricsDto`
  - `AdminStatisticsOverviewDto`
- 新增健康检查响应 DTO：
  - `HealthResponseDto`
- auth 接口迁移到 `ApiWrappedOkResponse`：
  - `POST /api/auth/wx-login`
  - `POST /api/auth/refresh-token`
  - `GET /api/auth/profile`
- admin-auth 接口迁移到 `ApiWrappedOkResponse`：
  - `POST /api/admin/auth/login`
  - `GET /api/admin/auth/profile`
- admin-users 接口迁移到 `ApiWrappedOkResponse`：
  - `GET /api/admin/users`
- admin-statistics 接口迁移到 `ApiWrappedOkResponse`：
  - `GET /api/admin/statistics/overview`
- health 接口迁移到 `ApiWrappedOkResponse`：
  - `GET /api/health`

验证结果：

- `pnpm exec prettier --write ...` 已执行。
- `pnpm --filter @mall/server typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。
- 本地启动 API 后，`/docs-json` 中已确认：
  - `UserLoginResponseDto`
  - `UserProfileResponseDto`
  - `AdminLoginResponseDto`
  - `AdminProfileResponseDto`
  - `AdminUserResponseDto`
  - `AdminStatisticsOverviewDto`
  - `HealthResponseDto`
  - 上述接口响应均使用 `ApiSuccessResponseDto + data: <业务 DTO>` 包装。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- 本地 API 验证后已停止，`3000` 端口未被占用。
- `rg "ApiOkResponse" apps/server/src/modules -n` 确认业务控制器不再直接使用 `ApiOkResponse`，仅 `ApiWrappedOkResponse` 装饰器内部保留。

注意事项：

- 当前商品、分类、购物车、支付接口已统一外层响应包装，但 `data` 内部仍有部分 `{}`，后续可继续补模块级响应 DTO。
- `ApiErrorResponseDto` 尚未挂到错误响应装饰器；后续可补统一错误响应文档。

下一步：

```text
P4-21：为商品、分类、购物车、支付补业务响应 DTO，让 Swagger 的 data 内部结构不再为空对象。
```

### 2026-05-26：P4-21 商品/分类/购物车/支付响应 DTO 补齐

完成内容：

- 新增商品响应 DTO：
  - `ProductResponseDto`
  - `ProductSkuResponseDto`
  - `ProductImageResponseDto`
- 新增分类响应 DTO：
  - `CategoryResponseDto`
  - `CategoryTreeNodeResponseDto`
- 新增购物车响应 DTO：
  - `CartResponseDto`
  - `CartItemResponseDto`
  - `CartSkuResponseDto`
  - `CartProductResponseDto`
  - `CartSummaryResponseDto`
- 新增支付/退款响应 DTO：
  - `PaymentRecordResponseDto`
  - `WechatPayParamsResponseDto`
  - `WechatPrepayResponseDto`
  - `WechatNotifyResponseDto`
  - `PaymentStatusResponseDto`
  - `RefundResponseDto`
- 商品用户侧接口补齐 `data` 业务结构：
  - `POST /api/products`
  - `GET /api/products`
  - `GET /api/products/:id`
  - `PATCH /api/products/:id`
  - `PATCH /api/products/:id/status`
  - `DELETE /api/products/:id`
- 商品后台接口补齐 `data` 业务结构：
  - `POST /api/admin/products`
  - `GET /api/admin/products`
  - `GET /api/admin/products/:id`
  - `PATCH /api/admin/products/:id`
  - `PATCH /api/admin/products/:id/status`
  - `DELETE /api/admin/products/:id`
- 分类用户侧和后台接口补齐 `data` 业务结构：
  - 普通列表使用 `CategoryResponseDto[]`
  - 分类树使用 `CategoryTreeNodeResponseDto[]`
  - 创建、详情、更新、删除使用 `CategoryResponseDto`
- 购物车接口统一补齐 `CartResponseDto`：
  - `GET /api/cart`
  - `POST /api/cart/items`
  - `PATCH /api/cart/items/:skuId`
  - `PATCH /api/cart/items/:skuId/checked`
  - `DELETE /api/cart/items/:skuId`
- 支付和退款接口补齐对应响应 DTO：
  - `POST /api/payments/wechat/prepay` 使用 `WechatPrepayResponseDto`
  - `POST /api/payments/wechat/notify` 使用 `WechatNotifyResponseDto`
  - `GET /api/payments/:orderId/status` 使用 `PaymentStatusResponseDto`
  - `POST /api/refunds` 使用 `RefundResponseDto`

验证结果：

- `pnpm exec prettier --write ...` 已执行。
- `pnpm --filter @mall/server typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。
- 本地启动 API 后，`/docs-json` 中已确认：
  - 商品接口 `data` 引用 `ProductResponseDto` 或 `ProductResponseDto[]`
  - 分类接口 `data` 引用 `CategoryResponseDto` 或 `CategoryTreeNodeResponseDto[]`
  - 购物车接口 `data` 引用 `CartResponseDto`
  - 支付接口 `data` 引用 `WechatPrepayResponseDto`、`WechatNotifyResponseDto`、`PaymentStatusResponseDto`
  - 退款接口 `data` 引用 `RefundResponseDto`
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- 本地 API 验证后已停止，`3000` 端口未被占用。

注意事项：

- DTO 当前用于 Swagger 文档描述，不改变 Prisma 服务层返回结构。
- 金额字段在响应文档中按字符串描述，匹配 Prisma Decimal JSON 序列化后的常见表现。
- 购物车商品状态当前文档为字符串，后续如前端 SDK 需要更强类型，可进一步改为 `ProductStatus` 枚举。

下一步：

```text
P4-22：补统一错误响应文档装饰器，将 `ApiErrorResponseDto` 挂到常见 400/401/403/404 接口响应中。
```

### 2026-05-26：P4-22 统一错误响应文档

完成内容：

- 新增公共 Swagger 错误响应装饰器：
  - `ApiCommonErrorResponses`
- `ApiCommonErrorResponses` 统一引用 `ApiErrorResponseDto`，支持按控制器/方法配置：
  - 400 Bad Request
  - 401 Unauthorized
  - 403 Forbidden
  - 404 Not Found
- 已挂载到主要业务控制器：
  - `auth`
  - `admin-auth`
  - `admin-orders`
  - `admin-statistics`
  - `admin-users`
  - `orders`
  - `cart`
  - `categories`
  - `admin-categories`
  - `products`
  - `admin-products`
  - `payments/refunds`
  - `admin-uploads`
- 混合公开/鉴权控制器做了更精确的错误响应范围：
  - 商品、分类、支付控制器类级只保留 400/404。
  - 需要鉴权的方法单独补 401/403。
  - 公开查询接口不会额外展示 401/403。

验证结果：

- `pnpm exec prettier --write ...` 已执行。
- `pnpm --filter @mall/server typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。
- 本地启动 API 后，`/docs-json` 中已确认：
  - 常见错误响应均引用 `#/components/schemas/ApiErrorResponseDto`
  - `GET /api/products`、`GET /api/categories` 等公开接口没有多挂 401/403
  - `POST /api/products`、`POST /api/categories`、`POST /api/payments/wechat/prepay`、`GET /api/cart` 等鉴权接口包含 401/403
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- 本地 API 验证后已停止，`3000` 端口未被占用。

注意事项：

- 当前 `ApiErrorResponseDto` 已完成 Swagger 文档挂载；运行时错误响应仍依赖现有 Nest 异常处理行为。
- 后续如要让运行时错误响应 100% 对齐 `ApiErrorResponseDto`，可增加全局异常过滤器。

下一步：

```text
P4-23：补全局异常过滤器，让运行时错误响应与 Swagger 的 `ApiErrorResponseDto` 保持一致。
```

### 2026-05-26：P4-23 全局异常过滤器运行时响应对齐

完成内容：

- 收紧并完善全局 `HttpExceptionFilter`：
  - HTTP 异常统一输出 `code/message/error/timestamp/path`
  - 校验异常的 `message[]` 会拼接成可读字符串
  - `error` 字段优先使用 Nest 异常响应里的错误描述
  - 缺省错误描述使用 Node HTTP 标准状态文案
  - `path` 优先使用 `request.originalUrl`，兼容全局 prefix 后的完整路径
- 未知异常处理调整：
  - 服务端日志记录真实异常堆栈
  - 客户端只返回通用 `Internal server error`
  - 避免把内部错误细节暴露给前端

验证结果：

- `pnpm exec prettier --write apps/server/src/modules/common/filters/http-exception.filter.ts` 已执行。
- `pnpm --filter @mall/server typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。
- 本地启动 API 后已验证运行时错误响应：
  - `POST /api/auth/wx-login {}` 返回 400，结构为 `ApiErrorResponseDto`
  - `GET /api/cart` 未带 token 返回 401，结构为 `ApiErrorResponseDto`
  - `GET /api/not-found` 返回 404，结构为 `ApiErrorResponseDto`
- 通过编译后的 `HttpExceptionFilter` 直接调用验证未知异常：
  - 返回 500
  - `message` 为 `Internal server error`
  - `error` 为 `Internal Server Error`
  - 内部异常详情只进入服务端日志
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- 本地 API 验证后已停止，`3000` 端口未被占用。

注意事项：

- 当前没有正式测试框架，P4-23 使用编译检查、真实 HTTP 请求和过滤器直接调用完成验证。
- 后续如引入 Jest 或 Vitest，可把异常过滤器的 400/401/404/500 行为固化为单元测试。

下一步：

```text
P4-24：开始补 API SDK 类型和请求封装，让后台和小程序消费统一响应/错误结构。
```

### 2026-05-26：P4-24 API SDK 统一响应/错误解包

完成内容：

- 重构 `@mall/api-sdk` 核心导出：
  - `ApiSuccessResponse<T>`
  - `ApiErrorResponse`
  - `ApiPayload<T>`
  - `ApiClientError`
  - `isApiSuccessResponse`
  - `isApiErrorResponse`
  - `unwrapApiResponse`
  - `createApiClient`
  - `joinUrl`
- `ApiClientError` 统一承载：
  - HTTP status
  - 原始 payload
  - 后端错误 `code`
  - 后端错误 `path`
  - 后端错误 `error`
- 新增通用解包逻辑：
  - 非 2xx 直接抛 `ApiClientError`
  - `code !== 0` 直接抛 `ApiClientError`
  - 成功时只返回 `data`
- 后台管理端请求封装接入 `@mall/api-sdk`：
  - `apps/admin-web/src/api/client.ts`
  - 使用 `createApiClient`
  - 保留 `request<T>()` 调用方式
  - 继续自动注入 `admin_access_token`
  - 继续兼容 JSON/FormData
- 小程序请求封装接入 `@mall/api-sdk`：
  - `apps/miniapp/src/lib/request.ts`
  - 保留 Taro request 适配
  - 使用 `unwrapApiResponse`
  - 统一抛 `ApiClientError`
  - 继续自动注入小程序 access token

验证结果：

- `pnpm exec prettier --write packages/api-sdk/src/index.ts apps/admin-web/src/api/client.ts apps/miniapp/src/lib/request.ts` 已执行。
- `pnpm --filter @mall/api-sdk typecheck` 通过。
- `pnpm --filter @mall/admin-web typecheck` 通过。
- `pnpm --filter @mall/miniapp typecheck` 通过。
- `pnpm format:check` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm --filter @mall/admin-web build` 通过。
- `pnpm --filter @mall/miniapp build:weapp` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- 当前未启动本地 API，`3000` 端口未被占用。

注意事项：

- 本节点先统一响应/错误解包，不大范围迁移业务 API 类型，避免影响页面层。
- 后台和小程序的业务 DTO 类型仍分散在各自 `api/types.ts` 中，后续可逐步沉淀到 `@mall/shared-types` 或 `@mall/api-sdk`。

下一步：

```text
P4-25：沉淀前后端共享业务类型，优先统一商品、分类、订单、购物车、支付的前端 DTO。
```

### 2026-05-26：P4-25 前端共享业务类型沉淀

完成内容：

- 扩展 `@mall/shared-types`，沉淀核心业务 DTO：
  - 基础类型：`ID`
  - 状态类型：`UserStatus`、`AdminRole`、`ProductStatus`、`OrderStatus`、`PaymentStatus`、`PaymentChannel`、`RefundStatus`
  - 分类：`Category`
  - 商品：`Product`、`ProductSku`、`ProductImage`
  - 商品输入：`ProductInput`、`ProductSkuInput`、`ProductImageInput`
  - 用户：`UserProfile`、`MiniappUser`、`AdminUser`
  - 登录：`WxLoginInput`、`MiniappLoginResult`、`AdminLoginInput`、`AdminProfile`、`AdminLoginResult`
  - 购物车：`Cart`、`CartItem`、`CartItemSku`、`CartItemProduct`、`CartSummary`
  - 订单：`Order`、`OrderItem`、`OrderUser`、`OrderListResult`、`ShipOrderInput`
  - 支付：`Payment`、`WechatPayParams`、`WechatPrepayResult`、`WechatNotifyInput`、`WechatNotifyResult`
  - 退款：`Refund`
  - 上传：`UploadResult`
  - 后台统计：`DashboardMetrics`、`DashboardOverview`
- 后台管理端类型入口改为复用共享类型：
  - `apps/admin-web/src/api/types.ts`
  - 保留原页面层使用的 `User`、`LoginResult` 名称，分别映射到 `AdminUser`、`AdminLoginResult`
- 小程序类型入口改为复用共享类型：
  - `apps/miniapp/src/api/types.ts`
  - 保留原页面层使用的 `LoginResult` 名称，映射到 `MiniappLoginResult`
- 页面层和业务 API 调用无需调整导入路径，继续从各自 `api/types.ts` 消费类型。

验证结果：

- `pnpm exec prettier --write packages/shared-types/src/index.ts apps/admin-web/src/api/types.ts apps/miniapp/src/api/types.ts` 已执行。
- `pnpm --filter @mall/shared-types typecheck` 通过。
- `pnpm --filter @mall/admin-web typecheck` 通过。
- `pnpm --filter @mall/miniapp typecheck` 通过。
- `pnpm format:check` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm --filter @mall/admin-web build` 通过。
- `pnpm --filter @mall/miniapp build:weapp` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- 当前未启动本地 API，`3000` 端口未被占用。

注意事项：

- 为兼容当前页面层，`Order.userId`、`Order.updatedAt`、`Product.createdAt`、`Product.updatedAt` 等部分后端必返字段在共享类型中仍保持可选，后续可随着前端数据模型稳定再收紧。
- `PaymentStatus` 已按后端 Prisma 枚举收敛为 `PENDING | SUCCESS | FAILED | CLOSED`，退款状态独立使用 `RefundStatus`。

下一步：

```text
P4-26：将后台和小程序业务 API 入参类型继续迁移到 `@mall/shared-types`，减少页面 API 文件里的临时 inline 类型。
```

### 2026-05-26：P4-26 业务 API 入参类型共享化

完成内容：

- 扩展 `@mall/shared-types`，新增业务 API 入参和查询类型：
  - `CategoryInput`
  - `UpdateCategoryInput`
  - `ProductQuery`
  - `AdminProductQuery`
  - `AddCartItemInput`
  - `UpdateCartItemInput`
  - `UpdateCartItemCheckedInput`
  - `CreateOrderInput`
  - `CancelOrderInput`
  - `UserOrderQuery`
  - `AdminOrderQuery`
  - `AdminUserQuery`
- 后台类型入口继续复用共享类型：
  - `apps/admin-web/src/api/types.ts`
  - 新增导出 `AdminUserQuery`、`AdminProductQuery`、`AdminOrderQuery`、`CategoryInput`、`UpdateCategoryInput`
- 小程序类型入口继续复用共享类型：
  - `apps/miniapp/src/api/types.ts`
  - 新增导出 `AddCartItemInput`、`CreateOrderInput`、`ProductQuery`、`UserOrderQuery`
- 后台业务 API 文件去掉 inline 入参类型：
  - `fetchUsers(params: AdminUserQuery)`
  - `createCategory(input: CategoryInput)`
  - `updateCategory(input: UpdateCategoryInput)`
  - `fetchProducts(params: AdminProductQuery)`
  - `fetchOrders(params: AdminOrderQuery)`
- 小程序业务 API 文件去掉本地临时接口：
  - `addCartItem(input: AddCartItemInput)`
  - `fetchProducts(query: ProductQuery)`
  - `createOrderFromCart(input: CreateOrderInput)`
  - `fetchOrders(query: UserOrderQuery)`

验证结果：

- `pnpm exec prettier --write packages/shared-types/src/index.ts apps/admin-web/src/api/types.ts apps/miniapp/src/api/types.ts apps/admin-web/src/api/adminApi.ts apps/miniapp/src/api/cartApi.ts apps/miniapp/src/api/catalogApi.ts apps/miniapp/src/api/orderApi.ts` 已执行。
- `rg "interface .*Input|interface .*Query|params: \\{|input: \\{" apps/admin-web/src/api apps/miniapp/src/api -n` 确认业务 API 层不再保留同类临时 inline 类型。
- `pnpm --filter @mall/shared-types typecheck` 通过。
- `pnpm --filter @mall/admin-web typecheck` 通过。
- `pnpm --filter @mall/miniapp typecheck` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- 当前未启动本地 API，`3000` 端口未被占用。

注意事项：

- 本节点只收敛类型，不改变请求路径和页面层导入方式。
- `UpdateCartItemInput`、`UpdateCartItemCheckedInput`、`CancelOrderInput` 已先沉淀到共享类型，后续 API SDK 化时可直接复用。

下一步：

```text
P4-27：补 `@mall/api-sdk` 业务 API 封装，优先迁移后台和小程序共用的商品、分类、订单、购物车、支付接口。
```

### 2026-05-26：P4-27 API SDK 业务接口封装

完成内容：

- `@mall/api-sdk` 新增业务 API requester 抽象：
  - `FetchApiRequester`
  - `DataApiRequester`
  - `DataApiRequestOptions`
  - `ApiRequestMethod`
- `@mall/api-sdk` 新增后台业务 API 工厂：
  - `createAdminApi`
- `createAdminApi` 覆盖后台当前业务接口：
  - 管理员登录
  - 后台分类树、创建、更新、删除
  - 后台经营概览
  - 后台用户查询
  - 后台商品查询、创建、更新、上下架、删除
  - 后台图片上传
  - 后台订单分页查询、取消、发货
- `@mall/api-sdk` 新增小程序业务 API 工厂：
  - `createMiniappApi`
- `createMiniappApi` 覆盖小程序当前业务接口：
  - 微信登录、刷新 token、用户 profile
  - 分类树、商品列表、商品详情
  - 购物车查询、添加、改数量、改勾选、删除
  - 订单创建、列表、详情、取消、确认收货
  - mock 微信预支付和支付回调
- SDK 内部统一处理：
  - 查询参数拼接
  - JSON body 序列化
  - Taro `data` 风格请求体
  - 上传 FormData
- 后台管理端迁移到 SDK 业务工厂：
  - `apps/admin-web/src/api/client.ts` 导出 `apiClient`
  - `apps/admin-web/src/api/adminApi.ts` 改为 `createAdminApi(apiClient)` 的重导出
- 小程序端迁移到 SDK 业务工厂：
  - 新增 `apps/miniapp/src/api/sdk.ts`
  - 使用 Taro request 适配 `createMiniappApi`
  - `authApi.ts`、`cartApi.ts`、`catalogApi.ts`、`orderApi.ts`、`paymentApi.ts` 改为从 `miniappApi` 重导出

验证结果：

- `pnpm exec prettier --write packages/api-sdk/src/index.ts apps/admin-web/src/api/client.ts apps/admin-web/src/api/adminApi.ts apps/miniapp/src/api/sdk.ts apps/miniapp/src/api/authApi.ts apps/miniapp/src/api/cartApi.ts apps/miniapp/src/api/catalogApi.ts apps/miniapp/src/api/orderApi.ts apps/miniapp/src/api/paymentApi.ts` 已执行。
- `pnpm --filter @mall/api-sdk typecheck` 通过。
- `pnpm --filter @mall/admin-web typecheck` 通过。
- `pnpm --filter @mall/miniapp typecheck` 通过。
- `rg "request<|JSON.stringify|URLSearchParams|/api/" apps/admin-web/src/api apps/miniapp/src/api -n` 确认本地前端 API 文件不再维护业务路径和 JSON 拼接，只保留请求适配。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- 当前未启动本地 API，`3000` 端口未被占用。

注意事项：

- 本节点只迁移 API 封装位置，不改变页面调用函数名和请求行为。
- 小程序仍通过 Taro request 发请求，SDK 只负责业务路径和类型封装。
- 后台上传仍使用浏览器 `FormData`，由 `createAdminApi.uploadImage` 统一封装。

下一步：

```text
P4-28：统一后台和小程序错误提示体验，基于 `ApiClientError` 提供可复用错误消息解析和页面提示接入。
```

### 2026-05-26：P4-28 统一前端错误提示体验

完成内容：

- `@mall/api-sdk` 新增错误消息解析工具：
  - `getApiErrorMessage(error, fallback)`
- `getApiErrorMessage` 支持统一解析：
  - `ApiClientError`
  - 后端 `ApiErrorResponse`
  - 普通 `Error`
  - 未知异常 fallback
- 后台管理端新增错误提示 helper：
  - `apps/admin-web/src/api/error.ts`
  - `showApiError(error, fallback)`
  - 内部使用 Ant Design `message.error`
- 小程序端新增错误提示 helper：
  - `apps/miniapp/src/api/error.ts`
  - `showApiError(error, fallback)`
  - 内部使用 `Taro.showToast`
- 后台页面接入统一错误提示：
  - 经营概览
  - 商品管理
  - 商品表单上传 / 提交
  - 分类管理
  - 登录页
  - 用户管理
  - 订单管理
- 小程序页面接入统一错误提示：
  - 首页
  - 分类页
  - 商品详情页
  - 购物车页
  - 订单确认页
  - 订单列表页
  - 订单详情页
  - 用户中心
- 分类管理补充显式错误捕获：
  - 创建分类失败提示
  - 更新分类失败提示
  - 删除分类失败提示

验证结果：

- `pnpm exec prettier --write ...` 已执行。
- `rg "error instanceof Error \\? error\\.message|message\\.error\\(error instanceof|title: error instanceof" apps/admin-web/src apps/miniapp/src -n` 确认旧式错误提示解析已清理。
- `pnpm --filter @mall/api-sdk typecheck` 通过。
- `pnpm --filter @mall/admin-web typecheck` 通过。
- `pnpm --filter @mall/miniapp typecheck` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- 当前未启动本地 API，`3000` 端口未被占用。

注意事项：

- 本节点只统一错误消息解析和 UI 提示，不改变接口请求逻辑。
- 小程序非接口类业务提示，例如“请先登录”“请选择 SKU”等仍保留页面内直接 toast。

下一步：

```text
P4-29：补本地种子数据和一键初始化脚本，方便完整交易链路回归。
```

### 2026-05-27：P4-29 本地种子数据和一键初始化脚本

完成内容：

- 新增后端 Prisma seed 脚本：
  - `apps/server/prisma/seed.ts`
- 新增服务端脚本：
  - `pnpm --filter @mall/server db:seed`
  - `pnpm --filter @mall/server prisma:migrate:deploy`
- 新增根目录脚本：
  - `pnpm db:seed`
  - `pnpm db:init`
- `pnpm db:init` 当前执行顺序：
  - 启动 MySQL / Redis：`pnpm db:up`
  - 生成 Prisma Client
  - 应用数据库迁移
  - 写入本地种子数据
- seed 脚本会读取 `apps/server/.env` 和 `apps/server/.env.local`。
- seed 脚本显式向 PrismaClient 传入 `DATABASE_URL`，避免脚本运行时 Prisma 没有拿到环境变量。

种子数据：

- 默认管理员：
  - 账号：`admin`
  - 密码：`Admin123456`
  - 支持继续通过 `ADMIN_DEFAULT_USERNAME` / `ADMIN_DEFAULT_PASSWORD` 覆盖
- 小程序回归用户：
  - `openId = seed-miniapp-user-openid`
- 分类：
  - 护肤护理
  - 护肤护理 / 精华面霜
  - 生活香氛
- 上架商品：
  - 修护精华面霜：2 个 SKU
  - 亮采精华液：2 个 SKU
  - 木质调香氛：1 个 SKU

实现规则：

- 种子分类和商品使用固定 ID。
- 种子 SKU 使用固定 `skuCode`。
- seed 可重复执行，重复执行时更新同一批分类、商品、SKU、用户和管理员，不额外堆叠演示数据。
- 商品默认设置为 `ON_SALE`，可直接用于小程序首页、分类、详情、购物车、订单和 mock 支付链路回归。

验证结果：

- `pnpm db:seed` 已真实写入本地数据库：
  - 3 个分类
  - 3 个商品
  - 5 个 SKU
- `pnpm --filter @mall/server typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

注意事项：

- 当前 seed 会把演示 SKU 库存重置为固定值，适合本地回归；不要直接用于生产数据。
- 当前 `pnpm db:init` 依赖本机 Docker daemon 可访问；在受限沙箱中可能需要授权 Docker / tsx 的本地 IPC 权限。
- seed 只准备回归基础数据，不自动创建订单；完整交易链路仍从小程序登录、加购、下单、mock 支付开始跑。

下一步：

```text
P4-30：补完整交易链路 smoke 回归脚本，基于种子数据自动验证登录、加购、下单、mock 支付和订单状态推进。
```

### 2026-05-27：P4-30 完整交易链路 smoke 回归脚本

完成内容：

- 新增交易链路 smoke 脚本：
  - `apps/server/scripts/smoke-transaction.ts`
- 新增服务端脚本：
  - `pnpm --filter @mall/server smoke:transaction`
- 新增根目录脚本：
  - `pnpm smoke:transaction`
- `apps/server` 显式依赖 `@mall/api-sdk`，用于 smoke 脚本复用统一 API SDK。
- 执行 `pnpm install` 刷新 workspace 依赖链接和 lockfile。

smoke 覆盖链路：

- 检查 `GET /api/health`。
- 小程序 mock 登录：
  - 默认 `openId = seed-miniapp-user-openid`
- 读取 public 商品列表，查找默认种子 SKU：
  - 默认 `skuCode = SEED-CREAM-50ML`
- 清理当前测试用户购物车残留项。
- 加入购物车并确认勾选 / 可购买状态。
- 从购物车创建订单。
- 创建 mock 微信预支付单。
- 调用 mock 支付回调，将订单推进到 `PENDING_DELIVERY`。
- 后台管理员登录。
- 后台按订单号搜索订单。
- 后台发货，将订单推进到 `SHIPPED`。
- 用户侧确认收货，将订单推进到 `COMPLETED`。

可配置环境变量：

- `SMOKE_API_BASE_URL`：默认 `http://localhost:3000`
- `SMOKE_OPEN_ID`：默认 `seed-miniapp-user-openid`
- `SMOKE_SKU_CODE`：默认 `SEED-CREAM-50ML`
- `ADMIN_DEFAULT_USERNAME`：默认 `admin`
- `ADMIN_DEFAULT_PASSWORD`：默认 `Admin123456`

验证结果：

- `pnpm --filter @mall/server exec tsc --noEmit --module CommonJS --moduleResolution Node --target ES2022 --skipLibCheck --esModuleInterop --types node scripts/smoke-transaction.ts` 通过。
- `pnpm --filter @mall/server typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

运行验证情况：

- 曾尝试启动本地 API：`pnpm --filter @mall/server start`。
- API 启动过程中 Redis 连接失败，原因是本机 Docker daemon 未运行：

```text
Cannot connect to the Docker daemon at unix:///Users/liwen/.docker/run/docker.sock. Is the docker daemon running?
```

- 因 Redis 未启动，购物车链路无法完成真实运行验证。
- Docker Desktop / Docker daemon 启动后，建议执行：

```bash
pnpm db:init
pnpm --filter @mall/server build
pnpm --filter @mall/server start
pnpm smoke:transaction
```

注意事项：

- smoke 脚本会创建一笔真实本地订单，并推进到已完成；每次运行会扣减一次种子 SKU 库存。
- 如需重置种子商品库存，可再次执行 `pnpm db:seed`。
- 如果 smoke 在待支付阶段失败，脚本会尽量自动取消待支付订单，避免库存长时间占用。

下一步：

```text
P4-31：补 smoke 脚本文档和本地回归说明，整理 Docker/API/后台/小程序的联调启动顺序。
```

### 2026-05-27：P4-31 本地联调和 smoke 回归文档

完成内容：

- 新增本地联调和回归说明：
  - `docs/local-regression.md`
- README 增加本地回归文档入口：
  - `README.md`
- Docker 文档补充数据库初始化说明：
  - `docker/README.md`

文档覆盖内容：

- 本地依赖：
  - Node.js
  - pnpm
  - Docker Desktop / Docker daemon
  - 微信开发者工具
- 首次初始化流程：
  - `pnpm install`
  - `pnpm db:init`
  - `pnpm build`
- 日常启动流程：
  - Docker MySQL / Redis
  - API
  - 商家后台
  - Taro 微信小程序构建
- 默认 seed 数据：
  - 后台管理员
  - 小程序 mock 用户
  - 默认 smoke SKU
  - 分类 / 商品 / SKU 数量
- smoke 回归命令：
  - `pnpm smoke:transaction`
- smoke 可配置环境变量：
  - `SMOKE_API_BASE_URL`
  - `SMOKE_OPEN_ID`
  - `SMOKE_SKU_CODE`
  - `ADMIN_DEFAULT_USERNAME`
  - `ADMIN_DEFAULT_PASSWORD`
- 常见问题：
  - Docker daemon 未运行
  - Redis 连接失败
  - smoke 找不到默认 SKU
  - 管理员登录失败
  - 端口占用

验证结果：

- `pnpm exec prettier --write README.md docker/README.md docs/local-regression.md docs/project-progress.md` 已执行。
- `pnpm format:check` 通过。

注意事项：

- 本节点是文档整理，不改业务逻辑。
- 完整 smoke 真实运行仍依赖本机 Docker daemon 启动后再执行。

下一步：

```text
P4-32：补用户侧订单列表分页或下拉刷新能力，改善小程序订单数据增长后的体验。
```

### 2026-05-27：P4-32 用户侧订单列表分页和刷新体验

完成内容：

- 用户侧订单查询 DTO 增加分页参数：
  - `page`
  - `pageSize`
- 新增用户侧订单分页响应 DTO：
  - `OrderListResultDto`
- 用户侧订单列表接口从数组返回升级为分页结构：
  - `GET /api/orders`
  - 返回 `items`
  - 返回 `total`
  - 返回 `page`
  - 返回 `pageSize`
- `OrderService.findMany` 改为 `count + findMany` 事务查询。
- `@mall/shared-types` 中 `UserOrderQuery` 增加分页参数。
- `@mall/api-sdk` 中小程序 `fetchOrders` 返回 `OrderListResult`。
- 小程序订单列表页接入分页：
  - 默认每页 10 条
  - 进入页面加载第一页
  - 切换状态时重置到第一页
  - 顶部显示当前筛选总订单数
  - 支持底部“加载更多”
  - 支持触底自动加载更多
  - 支持下拉刷新当前筛选
- 小程序订单列表页开启下拉刷新配置：
  - `enablePullDownRefresh: true`

验证结果：

- `pnpm exec prettier --write ...` 已执行。
- `pnpm --filter @mall/server typecheck` 通过。
- `pnpm --filter @mall/api-sdk typecheck` 通过。
- `pnpm --filter @mall/miniapp typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

注意事项：

- 运行 `pnpm --filter @mall/miniapp build` 时，Taro 底层依赖在当前 macOS 沙箱中输出 Rust panic：

```text
system-configuration ... Attempted to create a NULL object.
```

- panic 后构建进程未正常退出，且当前沙箱下 `ps/pkill` 无法列出或终止该进程；为避免误伤其它 Node 任务，未使用全局强杀。
- 本节点已完成 TypeScript 层验证；小程序真实构建建议在普通终端或 Docker/系统权限正常的环境中再次执行。

下一步：

```text
P4-33：补用户侧订单分页接口的 Swagger 文档验证和 smoke 脚本可选分页断言。
```

### 2026-05-27：P4-33 用户订单分页 Swagger 与 smoke 断言

完成内容：

- 增强交易链路 smoke 脚本：
  - `apps/server/scripts/smoke-transaction.ts`
- smoke 启动后会检查 `/docs-json`：
  - 存在 `OrderListResultDto`
  - `OrderListResultDto` 包含 `items / total / page / pageSize`
  - `GET /api/orders` 文档包含 `page` 查询参数
  - `GET /api/orders` 文档包含 `pageSize` 查询参数
  - `GET /api/orders` 成功响应引用 `OrderListResultDto`
- smoke 完成订单确认收货后会调用用户侧分页接口：
  - `GET /api/orders?status=COMPLETED&page=1&pageSize=10`
- 分页断言内容：
  - 返回 `items` 数组
  - 返回 `page = 1`
  - 返回 `pageSize = 10`
  - 返回 `total >= 1`
  - 第一页包含本次 smoke 刚完成的订单
- 本地回归文档补充 smoke 现在会覆盖：
  - Swagger 用户订单分页响应文档
  - 用户侧订单分页返回结构
- 增加可选环境变量：
  - `SMOKE_SKIP_SWAGGER_CHECK=1`
  - 用于临时跳过 Swagger 文档断言，仅跑交易链路

验证结果：

- `pnpm exec prettier --write apps/server/scripts/smoke-transaction.ts docs/local-regression.md` 已执行。
- `pnpm --filter @mall/server exec tsc --noEmit --module CommonJS --moduleResolution Node --target ES2022 --skipLibCheck --esModuleInterop --types node scripts/smoke-transaction.ts` 通过。
- `pnpm --filter @mall/server typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

注意事项：

- 本节点增强的是 smoke 脚本和文档断言；完整 smoke 真实运行仍依赖本机 Docker daemon、Redis、MySQL 和 API 服务正常启动。
- 如果 `/docs-json` 暂时不可用，可用 `SMOKE_SKIP_SWAGGER_CHECK=1 pnpm smoke:transaction` 临时跳过文档断言。

下一步：

```text
P4-34：补用户侧订单分页接口兼容说明，并检查小程序其他页面是否仍假设订单列表为数组。
```

### 2026-05-27：P4-34 用户侧订单分页兼容说明和调用点检查

完成内容：

- 新增 API 兼容说明文档：
  - `docs/api-compatibility.md`
- README 增加 API 兼容说明入口：
  - `README.md`
- 本地回归文档增加用户侧订单分页兼容说明入口：
  - `docs/local-regression.md`

兼容说明覆盖内容：

- `GET /api/orders` 在 P4-32 的返回结构变化：
  - 旧结构：`Order[]`
  - 新结构：`OrderListResult`
- 旧调用方式和新调用方式对照。
- 分页参数说明：
  - `status`
  - `page`
  - `pageSize`
- 分页响应字段说明：
  - `items`
  - `total`
  - `page`
  - `pageSize`
- 已同步调用方：
  - `packages/shared-types`
  - `packages/api-sdk`
  - `apps/miniapp/src/pages/order/list.tsx`
- 回归验证建议：
  - `pnpm typecheck`
  - `pnpm smoke:transaction`

调用点检查：

- 已执行：

```bash
rg -n "fetchOrders\(|createMiniappApi\(|/api/orders" apps/miniapp/src packages/api-sdk/src packages/shared-types/src --glob '!**/dist/**'
```

- 检查结果：
  - 小程序侧只有 `apps/miniapp/src/pages/order/list.tsx` 调用 `fetchOrders`。
  - 订单列表页已读取 `result.items`，不再假设接口直接返回数组。
  - 订单详情页使用 `fetchOrderDetail(id)`。
  - 订单确认页使用 `createOrderFromCart(...)`。
  - 小程序其它页面没有继续假设 `GET /api/orders` 返回数组。

验证结果：

- `pnpm exec prettier --write README.md docs/api-compatibility.md docs/local-regression.md` 已执行。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

注意事项：

- 本节点是兼容说明和调用点审计，不改变业务逻辑。
- 外部调用方如果直接请求 `GET /api/orders`，需要从读取数组改为读取 `data.items`。

下一步：

```text
P4-35：补小程序订单列表空态和分页边界体验微调，区分“暂无订单”和“已加载全部”。
```

### 2026-05-28：P4-35 小程序订单列表空态和分页边界体验

完成内容：

- 小程序订单列表页空态按当前筛选状态展示不同文案：
  - 全部订单
  - 待支付
  - 待发货
  - 已发货
  - 已完成
  - 已取消
- 订单列表工具栏从单行总数改为双行信息：
  - 当前筛选名称
  - 已显示数量 / 总数
- 分页追加时按订单 ID 去重，避免触底重复请求造成重复卡片。
- 底部分页状态区优化：
  - 未加载完时展示 `已显示 x / y 单`
  - 展示“加载更多”按钮
  - 加载完后展示 `已加载全部 y 单`
- 保留触底自动加载更多和按钮手动加载更多两种方式。

修改文件：

- `apps/miniapp/src/pages/order/list.tsx`
- `apps/miniapp/src/pages/order/list.css`

验证结果：

- `pnpm exec prettier --write apps/miniapp/src/pages/order/list.tsx apps/miniapp/src/pages/order/list.css` 已执行。
- `pnpm --filter @mall/miniapp typecheck` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

注意事项：

- 本节点只做小程序订单列表体验微调，不改变接口结构。
- 已知 `pnpm --filter @mall/miniapp build` 在当前 macOS 沙箱可能触发 Taro 底层 `system-configuration` panic，本节点未再次运行该构建命令，避免复现挂起。

下一步：

```text
P4-36：补小程序订单详情页与列表页之间的分页刷新一致性，减少支付/取消/确认收货后的状态跳动。
```

### 2026-05-28：P4-36 订单详情和列表刷新一致性

完成内容：

- 新增订单列表同步事件：
  - `apps/miniapp/src/pages/order/events.ts`
  - `ORDER_LIST_UPDATE_EVENT`
- 订单详情页在关键状态操作成功后触发列表同步事件：
  - 模拟支付成功
  - 取消订单成功
  - 确认收货成功
- 订单列表页订阅同步事件后本地更新当前已加载列表：
  - 当前筛选包含该订单时，替换对应订单卡片。
  - 当前筛选不再包含该订单时，移除对应订单卡片。
  - 本地同步时维护 `total`，避免数量展示滞后。
  - 使用订单 ID 去重，避免重复插入。
- 订单列表页不再每次 `useDidShow` 都重载第一页：
  - 首次进入仍加载第一页。
  - 从详情页完成状态操作返回时，优先使用事件同步结果。
  - 详情页没有状态操作时，列表保持当前筛选、分页和滚动上下文。
- 订单列表页使用 `ref` 保存当前订单列表、页码和筛选，避免事件订阅随列表变化反复解绑 / 绑定。

修改文件：

- `apps/miniapp/src/pages/order/events.ts`
- `apps/miniapp/src/pages/order/detail.tsx`
- `apps/miniapp/src/pages/order/list.tsx`

验证结果：

- `pnpm exec prettier --write apps/miniapp/src/pages/order/detail.tsx apps/miniapp/src/pages/order/list.tsx apps/miniapp/src/pages/order/events.ts` 已执行。
- `pnpm --filter @mall/miniapp typecheck` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

注意事项：

- 本节点优化小程序页面间状态同步，不改变接口结构。
- 详情页操作成功后仍会更新详情页自身订单状态；列表页收到事件后只做本地同步，避免分页上下文跳回第一页。

下一步：

```text
P4-37：补订单列表页主动刷新策略说明和详情页返回入口体验，避免用户误以为状态未更新。
```

### 2026-05-28：P4-37 订单刷新策略说明和详情页返回入口

完成内容：

- 订单详情页状态操作成功后展示同步提示：
  - `状态已同步到订单列表`
  - 同步时间
- 订单详情页新增底部返回入口：
  - `返回订单列表`
- 返回入口支持兜底导航：
  - 有上一页时 `navigateBack`
  - 没有上一页时 `navigateTo('/pages/order/list')`
- 订单详情页缺少订单 ID 时，也使用统一的“返回列表”入口。
- 本地回归文档补充“小程序订单刷新策略”说明：
  - 首次进入订单列表加载第一页
  - 详情页操作成功后通过页面事件同步订单到列表
  - 列表页“刷新”按钮和下拉刷新用于主动重新拉取当前筛选第一页
  - 从详情页返回列表时不会无条件重载第一页，减少筛选和分页上下文跳动

修改文件：

- `apps/miniapp/src/pages/order/detail.tsx`
- `apps/miniapp/src/pages/order/detail.css`
- `docs/local-regression.md`

验证结果：

- `pnpm exec prettier --write apps/miniapp/src/pages/order/detail.tsx apps/miniapp/src/pages/order/detail.css docs/local-regression.md` 已执行。
- `pnpm --filter @mall/miniapp typecheck` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

注意事项：

- 本节点不改变接口结构，只优化小程序页面体验和文档说明。
- 详情页同步提示会在主动刷新详情页后清除，避免把旧同步时间误认为当前状态。

下一步：

```text
P4-38：补小程序订单详情页错误态返回和重试操作排版微调，提升异常链路体验。
```

### 2026-05-28：P4-38 订单详情页异常态操作排版

完成内容：

- 订单详情页抽出统一异常态渲染逻辑：
  - 标题
  - 说明文案
  - 主按钮
  - 可选次按钮
- 未登录状态增强：
  - 主操作：去登录
  - 次操作：返回列表
- 缺少订单 ID 状态增强：
  - 主操作：返回列表
- 订单加载失败状态增强：
  - 主操作：重试
  - 次操作：返回列表
- 统一异常态按钮排版：
  - 主按钮使用绿色实心按钮
  - 次按钮使用白底描边按钮
  - 多按钮并排展示

修改文件：

- `apps/miniapp/src/pages/order/detail.tsx`
- `apps/miniapp/src/pages/order/detail.css`

验证结果：

- `pnpm exec prettier --write apps/miniapp/src/pages/order/detail.tsx apps/miniapp/src/pages/order/detail.css` 已执行。
- `pnpm --filter @mall/miniapp typecheck` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

注意事项：

- 本节点只调整小程序异常态体验，不改变接口或状态流转。
- 仍未重新运行 `pnpm --filter @mall/miniapp build`，原因是当前 macOS 沙箱下 Taro 构建存在已知底层 panic / 挂起风险。

下一步：

```text
P4-39：梳理小程序订单链路剩余体验缺口，决定是否进入地址模块或收尾 P4 MVP。
```

### 2026-05-28：P4-39 小程序订单链路剩余缺口复盘

完成内容：

- 新增 P4 小程序 MVP 缺口复盘文档：
  - 梳理已跑通能力。
  - 梳理 P4 收尾前保留缺口。
  - 明确建议：P4 不展开完整地址模块，进入 MVP 收尾验收。
- 订单确认页配送信息文案去开发占位化：
  - 从“后续地址模块接入”调整为默认配送和商家联系确认的产品文案。
- 个人中心未开放入口补体验反馈：
  - “收货地址”展示待开放标记。
  - “优惠券”展示待开放标记。
  - 点击未开放入口时展示 toast，避免静态入口无反馈。

修改文件：

- `apps/miniapp/src/pages/order/confirm.tsx`
- `apps/miniapp/src/pages/user/index.tsx`
- `apps/miniapp/src/pages/user/index.css`
- `docs/p4-miniapp-mvp-gap-review.md`
- `docs/project-progress.md`

关键决策：

- 当前不进入完整地址模块。地址模块会牵动用户地址表、订单地址快照、订单创建入参、后台订单展示和历史订单兼容，更适合作为 P5/P6 独立节点。
- P4 收尾标准继续围绕“登录 -> 浏览商品 -> SKU -> 购物车 -> 创建订单 -> 支付状态推进 -> 后台处理订单”的 MVP 主链路。
- 优惠券、积分、运费、售后和物流轨迹暂不阻塞 P4 MVP。

验证结果：

- `pnpm exec prettier --write apps/miniapp/src/pages/order/confirm.tsx apps/miniapp/src/pages/user/index.tsx apps/miniapp/src/pages/user/index.css docs/p4-miniapp-mvp-gap-review.md docs/project-progress.md` 已执行。
- `pnpm --filter @mall/miniapp typecheck` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

注意事项：

- 本节点只做 P4 MVP 收口判断和小程序轻量体验修补，不改变接口结构或数据库结构。
- 仍未重新运行 `pnpm --filter @mall/miniapp build`，原因是当前 macOS 沙箱下 Taro 构建存在已知底层 panic / 挂起风险。

下一步：

```text
P4-40：收口 P4 MVP 验收清单，并复跑类型、格式和 smoke 回归。
```

### 2026-05-28：P4-40 P4 MVP 验收清单和回归状态收口

完成内容：

- 新增 P4 MVP 验收清单：
  - 明确 P4 本地 MVP 主链路验收范围。
  - 标注已完成能力、待环境复跑项目和明确延后事项。
  - 给出进入 P5 前必须复验的命令顺序。
- README 补充 P4 验收清单和 P4 缺口复盘入口。
- 本地联调文档补充 P4 验收清单引用。
- 执行当前环境可用的静态检查。
- 尝试执行 smoke 回归，并记录阻塞原因。

修改文件：

- `docs/p4-mvp-acceptance-checklist.md`
- `docs/local-regression.md`
- `docs/project-progress.md`
- `README.md`

验证结果：

- `docker compose -f docker/docker-compose.dev.yml ps` 未通过：当前环境无法连接 Docker daemon。
- `curl -sS -m 3 http://localhost:3000/api/health` 未通过：当前没有 API 服务监听 `localhost:3000`。
- `pnpm smoke:transaction` 在沙箱内未通过：`tsx` 创建 IPC pipe 被拦截。
- `pnpm smoke:transaction` 在沙箱外可启动脚本，但未通过：API 未启动导致 `fetch failed`。
- `pnpm exec prettier --write README.md docs/local-regression.md docs/project-progress.md docs/p4-mvp-acceptance-checklist.md` 已执行。
- `pnpm --filter @mall/miniapp typecheck` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

注意事项：

- P4 当前可按本地 MVP 收口，但完整 smoke 需要在 Docker、MySQL、Redis 和 API 可用环境中复跑。
- 小程序 build 仍建议放到非沙箱本机或 CI 环境复验，避免当前 macOS 沙箱下 Taro build 已知 panic / 挂起风险。

下一步：

```text
P5-01：进入联调上线准备，优先梳理真实微信登录和微信支付所需配置、环境变量与回调边界。
```

### 2026-05-28：P5-01 微信登录和支付联调边界梳理

完成内容：

- 新增微信联调边界文档：
  - 梳理真实微信登录和微信支付所需环境变量。
  - 明确当前 mock / real 模式切换方式。
  - 明确真实微信支付后续实现顺序和风险点。
- 新增 `WechatModule` 和 `WechatService`：
  - 统一维护微信小程序 appId。
  - 统一读取微信登录模式。
  - 统一读取微信支付模式。
  - 支持 `WECHAT_LOGIN_MODE=real` 时调用微信 `jscode2session`。
- 登录链路改造：
  - `AuthService.wxLogin` 改为通过 `WechatService.resolveMiniappSession` 获取 openId。
  - 默认仍保持 mock 行为，兼容本地 smoke 和现有小程序登录。
  - Swagger 文档补充 mock / real 模式说明。
- 支付链路边界收紧：
  - mock 预支付参数中的 `appId` 改为从 `WECHAT_MINIAPP_APP_ID` 读取，未配置时回退 `mock-app-id`。
  - `WECHAT_PAY_MODE=real` 时明确返回未实现，避免真实联调误用 mock 支付签名。
- `.env.example` 补充微信登录和微信支付环境变量。
- README 和本地联调文档补充 P5 微信联调边界入口。

修改文件：

- `apps/server/src/modules/wechat/wechat.module.ts`
- `apps/server/src/modules/wechat/wechat.service.ts`
- `apps/server/src/modules/auth/auth.module.ts`
- `apps/server/src/modules/auth/auth.service.ts`
- `apps/server/src/modules/auth/dto/wx-login.dto.ts`
- `apps/server/src/modules/payment/payment.module.ts`
- `apps/server/src/modules/payment/payment.service.ts`
- `apps/server/.env.example`
- `docs/p5-wechat-integration-boundary.md`
- `docs/local-regression.md`
- `docs/project-progress.md`
- `README.md`

验证结果：

- `pnpm exec prettier --write --ignore-unknown apps/server/src/modules/wechat/wechat.module.ts apps/server/src/modules/wechat/wechat.service.ts apps/server/src/modules/auth/auth.module.ts apps/server/src/modules/auth/auth.service.ts apps/server/src/modules/auth/dto/wx-login.dto.ts apps/server/src/modules/payment/payment.module.ts apps/server/src/modules/payment/payment.service.ts apps/server/.env.example docs/p5-wechat-integration-boundary.md docs/local-regression.md docs/project-progress.md README.md` 已执行。
- `pnpm --filter @mall/server typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

注意事项：

- 当前只把真实微信登录接到服务端 code2Session 骨架；需要真实 appId / secret 和可联网运行环境才能完成联调验证。
- 真实微信支付仍是后续 P5 节点，当前只补配置边界和 fail-fast 防误用。
- 首次格式化命令直接包含 `.env.example` 时，Prettier 因无法推断 parser 退出；已改用 `--ignore-unknown` 处理。

下一步：

```text
P5-02：接真实微信支付 JSAPI 预下单的服务端封装，生成可供小程序 requestPayment 使用的签名参数。
```

### 2026-05-28：P5-02 真实微信支付 JSAPI 预下单服务端封装

完成内容：

- `WechatService` 新增微信支付 v3 JSAPI 预下单封装：
  - 读取商户号、商户证书序列号、商户私钥路径、回调地址和微信支付 API 域名。
  - 使用商户私钥生成 `WECHATPAY2-SHA256-RSA2048` Authorization。
  - 调用 `POST /v3/pay/transactions/jsapi` 获取 `prepay_id`。
  - 生成小程序 `requestPayment` 所需的 `timeStamp`、`nonceStr`、`package`、`signType`、`paySign`。
- `PaymentService.createWechatPrepay` 支持真实支付模式：
  - `WECHAT_PAY_MODE=mock` 时保持原有 mock 预支付行为。
  - `WECHAT_PAY_MODE=real` 时调用真实 JSAPI 预下单封装。
  - 将订单 `payableAmount` 从 Decimal 元转换为微信支付要求的整数分。
  - 使用当前订单用户的 openId 作为 `payer.openid`。
  - 真实预下单成功后将 `prepay_id` 保存到 `Payment.prepayId`。
  - 如已有真实 `prepay_id` 的待支付记录，会优先复用，避免重复下单。
- `.env.example` 补充 `WECHAT_PAY_API_BASE_URL`。
- P5 微信联调边界文档更新真实预下单状态和后续回调边界。

修改文件：

- `apps/server/src/modules/wechat/wechat.service.ts`
- `apps/server/src/modules/payment/payment.service.ts`
- `apps/server/.env.example`
- `docs/p5-wechat-integration-boundary.md`
- `docs/project-progress.md`

验证结果：

- `pnpm exec prettier --write --ignore-unknown apps/server/src/modules/wechat/wechat.service.ts apps/server/src/modules/payment/payment.service.ts apps/server/.env.example docs/p5-wechat-integration-boundary.md docs/project-progress.md` 已执行。
- `pnpm --filter @mall/server typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

注意事项：

- 当前实现完成真实 JSAPI 预下单请求签名和小程序调起支付签名，但尚未做微信支付回调验签、资源解密和订单真实支付通知处理。
- 当前预下单请求签名已接入，但微信支付应答签名校验、平台证书 / 微信支付公钥配置还需要在后续节点补齐。
- 当前环境没有真实微信支付商户配置，也不能对微信支付接口做端到端联调。

下一步：

```text
P5-03：接微信支付回调验签、资源解密和订单幂等更新。
```

### 2026-05-28：P5-03 微信支付回调验签、资源解密和订单幂等更新

完成内容：

- Nest 启动配置开启 `rawBody`：
  - 微信支付回调验签需要使用原始请求体。
- 支付回调 Controller 调整：
  - `POST /api/payments/wechat/notify` 同时接收 body、headers 和 raw body。
  - 保留本地 mock notify 兼容。
- `WechatService` 新增真实回调处理能力：
  - 读取 `Wechatpay-Timestamp`、`Wechatpay-Nonce`、`Wechatpay-Signature`、`Wechatpay-Serial`。
  - 使用 `WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH` 读取平台公钥并验签。
  - 可选使用 `WECHAT_PAY_PLATFORM_SERIAL_NO` 校验回调证书 / 公钥序列号。
  - 使用 `WECHAT_PAY_API_V3_KEY` 对 `resource` 做 `AEAD_AES_256_GCM` 解密。
  - 解析解密后的微信支付交易对象。
- `PaymentService.handleWechatNotify` 支持模式切换：
  - `WECHAT_PAY_MODE=mock` 时继续兼容原有 smoke mock 通知。
  - `WECHAT_PAY_MODE=real` 时走真实微信支付通知验签、解密和交易解析。
- 订单支付成功更新逻辑抽成共享方法：
  - mock 和 real 通知复用同一套订单金额校验、`transactionId` 幂等、支付记录更新和订单状态推进逻辑。
  - real 通知按 `out_trade_no` 定位订单。
  - 金额从微信支付整数分转换为 Decimal 元后与订单 `payableAmount` 校验。
- `.env.example` 补充微信支付平台序列号和平台公钥路径。
- P5 微信联调边界文档补充真实回调所需配置和已落地能力。

修改文件：

- `apps/server/src/main.ts`
- `apps/server/src/modules/payment/payment.controller.ts`
- `apps/server/src/modules/payment/payment.service.ts`
- `apps/server/src/modules/wechat/wechat.service.ts`
- `apps/server/.env.example`
- `docs/p5-wechat-integration-boundary.md`
- `docs/project-progress.md`

验证结果：

- `pnpm exec prettier --write --ignore-unknown apps/server/src/main.ts apps/server/src/modules/payment/payment.controller.ts apps/server/src/modules/wechat/wechat.service.ts apps/server/src/modules/payment/payment.service.ts apps/server/.env.example` 已执行。
- `pnpm --filter @mall/server typecheck` 通过。
- `pnpm exec prettier --write --ignore-unknown docs/p5-wechat-integration-boundary.md docs/project-progress.md apps/server/.env.example` 已执行。
- `pnpm --filter @mall/server build` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

注意事项：

- 当前没有真实微信支付平台公钥、API v3 key、商户配置和公网回调地址，无法做端到端真实回调验证。
- 预下单响应验签尚未接入，可在后续联调加固节点补齐。

下一步：

```text
P5-04：小程序端从 mock 支付弹窗切换为按环境调用 Taro.requestPayment，并保留本地 mock 回归入口。
```

### 2026-05-28：P5-04 小程序支付流程按环境切换

完成内容：

- 新增小程序支付流程工具：
  - `TARO_APP_PAYMENT_MODE=mock` 时保留本地模拟支付弹窗。
  - `TARO_APP_PAYMENT_MODE=mock` 且用户确认支付成功后，继续调用 mock notify，兼容本地 smoke。
  - `TARO_APP_PAYMENT_MODE=real` 时调用后端预下单接口，再使用返回的 `timeStamp`、`nonceStr`、`package`、`signType`、`paySign` 调用 `Taro.requestPayment`。
- 订单列表页支付逻辑改造：
  - 移除页面内重复 mock 支付实现。
  - 支付按钮文案按模式显示“模拟支付”或“去支付”。
  - 支付提交后刷新订单列表。
- 订单详情页支付逻辑改造：
  - 移除页面内重复 mock 支付实现。
  - 支付按钮文案按模式显示“模拟支付”或“去支付”。
  - 支付提交后重新拉取订单详情，并同步订单列表缓存。
- P5 微信联调边界文档补充 `TARO_APP_PAYMENT_MODE`。
- 本地联调文档补充小程序支付模式说明。

修改文件：

- `apps/miniapp/src/lib/payment.ts`
- `apps/miniapp/src/pages/order/list.tsx`
- `apps/miniapp/src/pages/order/detail.tsx`
- `docs/p5-wechat-integration-boundary.md`
- `docs/local-regression.md`
- `docs/project-progress.md`

验证结果：

- `pnpm exec prettier --write apps/miniapp/src/lib/payment.ts apps/miniapp/src/pages/order/list.tsx apps/miniapp/src/pages/order/detail.tsx` 已执行。
- `pnpm --filter @mall/miniapp typecheck` 通过。
- `pnpm exec prettier --write apps/miniapp/src/lib/payment.ts apps/miniapp/src/pages/order/list.tsx apps/miniapp/src/pages/order/detail.tsx docs/p5-wechat-integration-boundary.md docs/local-regression.md docs/project-progress.md` 已执行。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

注意事项：

- 真实支付成功后，订单状态由微信支付回调推进；小程序支付提交后的首次刷新可能早于回调到达，用户可继续使用列表 / 详情页刷新入口确认最终状态。
- 当前仍未运行小程序 build，原因是当前 macOS 沙箱下 Taro 构建存在已知底层 panic / 挂起风险。

下一步：

```text
P5-05：补联调环境变量校验和部署文档，整理 mock / real 模式启动组合。
```

### 2026-05-28：P5-05 联调环境变量校验和部署清单

完成内容：

- 后端新增环境变量校验：
  - 校验 `WECHAT_LOGIN_MODE` 只能为 `mock` 或 `real`。
  - 校验 `WECHAT_PAY_MODE` 只能为 `mock` 或 `real`。
  - `WECHAT_LOGIN_MODE=real` 时强制要求 `WECHAT_MINIAPP_APP_ID` 和 `WECHAT_MINIAPP_SECRET`。
  - `WECHAT_PAY_MODE=real` 时强制要求微信支付商户号、证书序列号、API v3 key、私钥路径、平台公钥路径和回调地址。
- `ConfigModule.forRoot` 接入环境变量校验函数，后端启动时 fail-fast。
- 新增 P5 联调部署清单：
  - 本地 MVP / smoke 模式。
  - 真实微信登录 + mock 支付模式。
  - 真实微信登录 + 真实微信支付模式。
  - 后端启动校验规则。
  - 上线前检查项。
- README 增加 P5 联调部署清单入口。
- P5 微信联调边界文档增加部署清单引用，并推进后续节点。

修改文件：

- `apps/server/src/modules/config/env.validation.ts`
- `apps/server/src/modules/app.module.ts`
- `docs/p5-integration-deployment-checklist.md`
- `docs/p5-wechat-integration-boundary.md`
- `docs/project-progress.md`
- `README.md`

验证结果：

- `pnpm exec prettier --write apps/server/src/modules/config/env.validation.ts apps/server/src/modules/app.module.ts docs/p5-integration-deployment-checklist.md docs/p5-wechat-integration-boundary.md docs/project-progress.md README.md` 已执行。
- `pnpm --filter @mall/server typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。
- `WECHAT_LOGIN_MODE=real WECHAT_PAY_MODE=mock node -e "require('./apps/server/dist/modules/config/env.validation.js').validateEnv(process.env)"` 按预期失败：缺少 `WECHAT_MINIAPP_APP_ID` 和 `WECHAT_MINIAPP_SECRET`。
- `WECHAT_LOGIN_MODE=mock WECHAT_PAY_MODE=real node -e "require('./apps/server/dist/modules/config/env.validation.js').validateEnv(process.env)"` 按预期失败：缺少微信支付真实模式必填配置。
- `WECHAT_LOGIN_MODE=mock WECHAT_PAY_MODE=mock node -e "require('./apps/server/dist/modules/config/env.validation.js').validateEnv(process.env); console.log('env ok')"` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

注意事项：

- 当前校验只覆盖微信登录和微信支付模式相关变量，不改变现有数据库、Redis、JWT 等配置行为。
- `WECHAT_PAY_PLATFORM_SERIAL_NO` 仍保持可选；配置后会在回调处理时校验回调头序列号。
- 环境变量校验模块补充了 `reflect-metadata` 导入，保证单独加载编译产物做校验时也能正常运行。

下一步：

```text
P5-06：补真实支付联调前的 smoke / health 检查脚本或手工检查清单。
```

### 2026-05-28：P5-06 真实支付联调前检查脚本和清单补充

完成内容：

- 新增 server 侧轻量联调检查脚本：
  - 校验微信登录 / 支付模式环境变量。
  - 校验小程序支付模式与后端支付模式组合。
  - 检查 API health。
  - 检查 Swagger docs-json。
  - 真实支付模式下检查回调 URL 格式。
  - 可选检查回调 URL 远程可达。
- 新增脚本入口：
  - 根目录 `pnpm integration:check`
  - server 包 `pnpm --filter @mall/server integration:check`
- P5 联调部署清单补充联调前检查脚本用法。
- 本地联调文档补充 `integration:check` 说明。

修改文件：

- `apps/server/scripts/integration-check.ts`
- `apps/server/package.json`
- `package.json`
- `docs/p5-integration-deployment-checklist.md`
- `docs/local-regression.md`
- `docs/project-progress.md`

验证结果：

- `pnpm exec prettier --write apps/server/scripts/integration-check.ts apps/server/package.json package.json docs/p5-integration-deployment-checklist.md docs/local-regression.md docs/project-progress.md` 已执行。
- `pnpm --filter @mall/server typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm integration:check` 在沙箱内未通过：`tsx` 创建 IPC pipe 被拦截，和 smoke 脚本限制一致。
- 沙箱外执行 `INTEGRATION_SKIP_API_CHECK=1 WECHAT_LOGIN_MODE=mock WECHAT_PAY_MODE=mock TARO_APP_PAYMENT_MODE=mock pnpm integration:check` 通过。
- 沙箱外执行 `INTEGRATION_SKIP_API_CHECK=1 WECHAT_LOGIN_MODE=mock WECHAT_PAY_MODE=mock TARO_APP_PAYMENT_MODE=real pnpm integration:check` 按预期失败：小程序真实支付模式需要后端真实支付模式。
- 沙箱外执行 `INTEGRATION_SKIP_API_CHECK=1 WECHAT_LOGIN_MODE=mock WECHAT_PAY_MODE=real TARO_APP_PAYMENT_MODE=real pnpm integration:check` 按预期失败：缺少微信支付真实模式必填配置。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

注意事项：

- `integration:check` 不创建订单、不扣库存，适合真实支付联调前做轻量检查。
- 完整交易链路仍以 `pnpm smoke:transaction` 为准。
- 当前环境没有 API 服务监听，未执行不跳过 API 的 health / Swagger 检查。

下一步：

```text
P5-07：补真实支付联调问题排查文档，覆盖 code2Session、JSAPI 下单、requestPayment 和支付回调常见失败。
```

### 2026-05-28：P5-07 微信联调问题排查文档

完成内容：

- 新增 P5 微信联调问题排查文档：
  - 快速定位顺序。
  - code2Session 登录失败排查。
  - JSAPI 预下单失败排查。
  - 小程序 `requestPayment` 调起失败排查。
  - 支付回调未推进订单排查。
  - `integration:check` 常见失败排查。
  - 建议联调节奏。
- README 增加问题排查文档入口。
- P5 联调部署清单增加问题排查文档引用。
- P5 微信联调边界增加问题排查文档引用，并补充 P5-07 节点。

修改文件：

- `docs/p5-wechat-troubleshooting.md`
- `docs/p5-integration-deployment-checklist.md`
- `docs/p5-wechat-integration-boundary.md`
- `docs/project-progress.md`
- `README.md`

验证结果：

- `pnpm exec prettier --write README.md docs/p5-wechat-troubleshooting.md docs/p5-integration-deployment-checklist.md docs/p5-wechat-integration-boundary.md docs/project-progress.md` 已执行。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

注意事项：

- 本节点只补文档，不改变代码行为。
- 文档中的真实支付排查仍需要在具备微信商户配置、公网 HTTPS 回调地址和微信开发者工具的环境中验证。

下一步：

```text
P5-08：补 P5 当前能力收口清单，确认进入真实环境联调前还缺哪些代码加固项。
```

### 2026-05-29：P5-08 P5 当前能力收口清单

完成内容：

- 新增 P5 当前能力收口清单：
  - 汇总 P5 已具备能力。
  - 明确可以进入真实环境联调，但不能直接视为生产可上线。
  - 梳理真实联调前建议加固项。
  - 梳理当前沙箱无法完成、需要外部环境验证的事项。
  - 明确下一步建议优先补微信支付预下单响应验签和错误码记录。
- README 增加 P5 当前能力收口清单入口。
- P5 微信联调边界文档修正真实支付回调状态：
  - 从“P5 后续实现”更新为“已接入验签和资源解密”。
- P5 联调部署清单增加当前能力收口清单引用。

修改文件：

- `docs/p5-current-capability-closure.md`
- `docs/p5-wechat-integration-boundary.md`
- `docs/p5-integration-deployment-checklist.md`
- `docs/project-progress.md`
- `README.md`

验证结果：

- `pnpm exec prettier --write README.md docs/p5-current-capability-closure.md docs/p5-wechat-integration-boundary.md docs/p5-integration-deployment-checklist.md docs/project-progress.md` 已执行。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

注意事项：

- 本节点只做文档收口和状态修正，不改变代码行为。
- 当前仍没有真实微信商户配置、公网 HTTPS 回调地址和可用 Docker/API 环境，因此不能声明真实端到端支付联调已完成。

下一步：

```text
P5-09：补微信支付预下单响应验签和错误码记录，提升真实支付联调可观测性。
```

### 2026-05-29：P5-09 微信支付预下单响应验签和错误码记录

完成内容：

- 新增微信支付专用异常：
  - 上游错误统一标记 `upstream: wechat-pay`。
  - 错误响应 `error` 中携带 `wechatCode`、`status`、`detail`。
  - 只记录微信支付错误摘要，不暴露商户私钥、API v3 key 或签名原文。
- 真实 JSAPI 预下单响应处理增强：
  - 响应 body 改为先读取原始文本。
  - 非 2xx 或缺少 `prepay_id` 时抛出带微信错误码的异常。
  - 预下单成功后使用响应头 `Wechatpay-Timestamp`、`Wechatpay-Nonce`、`Wechatpay-Signature`、`Wechatpay-Serial` 和响应 body 做验签。
- 回调验签逻辑复用：
  - 将预下单响应验签和支付回调验签抽成统一 `verifyWechatPaySignature`。
  - 回调仍使用 raw body 做签名串，行为不变。
- P5 当前能力收口清单更新：
  - 预下单响应验签标记为已完成。
  - 微信支付错误码记录标记为已完成。
- P5 问题排查文档补充：
  - JSAPI 预下单失败时查看 `error.wechatCode/status/detail`。
  - requestPayment 调起失败时考虑预下单响应验签失败。

修改文件：

- `apps/server/src/modules/wechat/wechat-pay.exception.ts`
- `apps/server/src/modules/wechat/wechat.service.ts`
- `docs/p5-current-capability-closure.md`
- `docs/p5-wechat-troubleshooting.md`
- `docs/project-progress.md`

验证结果：

- `pnpm exec prettier --write apps/server/src/modules/wechat/wechat-pay.exception.ts apps/server/src/modules/wechat/wechat.service.ts docs/p5-current-capability-closure.md docs/p5-wechat-troubleshooting.md docs/project-progress.md` 已执行。
- `pnpm --filter @mall/server typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

注意事项：

- 当前预下单响应验签依赖 `WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH`，真实支付模式下必须配置正确平台公钥。
- 当前仍无法在本沙箱做真实微信支付端到端验证。

下一步：

```text
P5-10：确认微信支付回调成功响应形态，必要时为回调接口绕过统一响应包装。
```

### 2026-05-29：P5-10 微信支付回调成功响应形态确认

完成内容：

- 根据微信支付回调成功响应要求调整真实回调返回：
  - `WECHAT_PAY_MODE=real` 时，支付回调处理完成后返回 `204 No Content`。
  - 成功响应不再返回统一 `code/message/data` 包装。
- 保留本地 mock notify 兼容：
  - `WECHAT_PAY_MODE=mock` 时仍返回原有统一 JSON。
  - 避免破坏 `pnpm smoke:transaction` 中对 mock notify 结果的断言。
- 全局响应拦截器增强：
  - 如果响应状态码为 `204`，直接返回空响应，不再包统一成功结构。
- 支付 Controller 调整：
  - 回调先等待 `PaymentService.handleWechatNotify` 完成，确保订单状态已处理。
  - 再按支付模式决定返回 `204` 或 mock JSON。
- P5 文档更新：
  - 当前能力收口清单将回调成功响应形态确认为已完成。
  - 微信联调边界说明真实回调成功返回 `204 No Content`。
  - 问题排查文档补充真实回调和 mock notify 的响应差异。

修改文件：

- `apps/server/src/modules/common/interceptors/response.interceptor.ts`
- `apps/server/src/modules/payment/payment.controller.ts`
- `apps/server/src/modules/payment/payment.service.ts`
- `docs/p5-current-capability-closure.md`
- `docs/p5-wechat-integration-boundary.md`
- `docs/p5-wechat-troubleshooting.md`
- `docs/project-progress.md`

验证结果：

- `pnpm exec prettier --write apps/server/src/modules/common/interceptors/response.interceptor.ts apps/server/src/modules/payment/payment.controller.ts apps/server/src/modules/payment/payment.service.ts docs/p5-current-capability-closure.md docs/p5-wechat-integration-boundary.md docs/p5-wechat-troubleshooting.md docs/project-progress.md` 已执行。
- 首次 `pnpm --filter @mall/server typecheck` 和 `pnpm --filter @mall/server build` 未通过：拦截器返回类型写成 `ApiResponse<T> | T`，与 `NestInterceptor<T, ApiResponse<T>>` 不匹配。
- 已将拦截器返回类型收窄为 `ApiResponse<T> | undefined`，用于表达 `204 No Content`。
- `pnpm --filter @mall/server typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

注意事项：

- 当前没有微信商户真实回调环境，无法让微信平台实际确认 `204` 响应；本节点按官方文档和当前代码路径完成服务端响应形态调整。
- mock notify 仍走统一 JSON，这是为了保留本地 smoke 回归能力。

下一步：

```text
P5-11：补真实支付联调记录模板和最小日志脱敏检查。
```

### 2026-05-29：P5-11 真实支付联调记录模板和最小日志脱敏

完成内容：

- 新增真实支付联调记录模板：
  - 记录环境、模式配置、联调前检查、测试订单、结果步骤、问题处理和结论。
  - 明确禁止记录 app secret、API v3 key、商户私钥、完整支付签名、完整 access token / refresh token。
- README 增加真实支付联调记录模板入口。
- P5 联调部署清单增加真实支付联调记录模板引用。
- 最小日志 / 错误响应脱敏：
  - 全局异常过滤器在输出 `error` 字段前递归脱敏敏感 key。
  - 覆盖 `secret`、`token`、`authorization`、`signature`、`paySign`、`private key`、`api v3 key`、`ciphertext` 等字段名。
- P5 当前能力收口清单更新：
  - 敏感日志脱敏标记为已完成。
  - 真实联调记录模板标记为已完成。

修改文件：

- `apps/server/src/modules/common/filters/http-exception.filter.ts`
- `docs/p5-real-payment-test-record-template.md`
- `docs/p5-current-capability-closure.md`
- `docs/p5-integration-deployment-checklist.md`
- `docs/project-progress.md`
- `README.md`

验证结果：

- `pnpm exec prettier --write apps/server/src/modules/common/filters/http-exception.filter.ts README.md docs/p5-real-payment-test-record-template.md docs/p5-current-capability-closure.md docs/p5-integration-deployment-checklist.md docs/project-progress.md` 已执行。
- `pnpm --filter @mall/server typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。
- `rg -n "console\\.|Logger|logger\\.|secret|SECRET|PRIVATE|API_V3|paySign|signature|Authorization|accessToken|refreshToken" apps/server/src apps/server/scripts --glob '!**/dist/**' --glob '!**/generated/**'` 已执行。
- 扫描命中项为配置读取、DTO 字段、脚本状态输出、mock `paySign`、请求头构造和异常过滤器脱敏规则；未发现直接打印真实 secret、API v3 key、私钥、完整 token 或签名的代码。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

注意事项：

- 当前只做错误响应层面的最小脱敏；未来如果引入结构化请求日志，还需要在日志中间件层继续脱敏。
- 联调记录模板需要在真实环境执行时复制使用，不应直接把密钥或完整 token 写入仓库文档。

下一步：

```text
P5-12：补支付后短轮询策略，减少真实回调延迟导致的小程序状态误解。
```

### 2026-05-29：P5-12 小程序真实支付后短轮询状态同步

完成内容：

- 小程序支付工具补真实支付后短轮询：
  - `TARO_APP_PAYMENT_MODE=real` 且 `Taro.requestPayment` 成功后，短轮询订单详情。
  - 如果回调已将订单推进到非 `PENDING_PAYMENT`，立即返回最新订单。
  - 如果短轮询结束仍未变化，返回当前最新订单，保留用户手动刷新入口。
- mock 支付兼容：
  - mock notify 后直接拉取最新订单并返回。
  - 保持本地 smoke 行为。
- 订单列表页支付后状态同步：
  - 支付工具返回最新订单时，先替换当前列表里的对应订单。
  - 再刷新当前筛选第一页，最终与服务端对齐。
- 订单详情页支付后状态同步：
  - 优先使用支付工具返回的最新订单。
  - 同步订单列表事件和同步时间提示。
- P5 当前能力收口清单更新：
  - 支付后状态轮询策略标记为已完成。
- P5 微信联调边界文档补充真实支付提交后的短轮询行为。

修改文件：

- `apps/miniapp/src/lib/payment.ts`
- `apps/miniapp/src/pages/order/list.tsx`
- `apps/miniapp/src/pages/order/detail.tsx`
- `docs/p5-current-capability-closure.md`
- `docs/p5-wechat-integration-boundary.md`
- `docs/project-progress.md`

验证结果：

- `pnpm exec prettier --write apps/miniapp/src/lib/payment.ts apps/miniapp/src/pages/order/list.tsx apps/miniapp/src/pages/order/detail.tsx docs/p5-current-capability-closure.md docs/p5-wechat-integration-boundary.md docs/project-progress.md` 已执行。
- `pnpm --filter @mall/miniapp typecheck` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

注意事项：

- 短轮询只用于改善用户体验，最终订单状态仍以微信支付回调和服务端订单状态为准。
- 若微信回调延迟超过短轮询窗口，用户仍可通过订单列表 / 详情页刷新入口获取最新状态。

下一步：

```text
P5-13：整理 P5 收尾验收清单，准备真实环境联调执行。
```

### 2026-05-29：P5-13 收尾验收清单与真实联调准备

完成内容：

- 新增 P5 收尾验收清单：
  - 明确 P5 当前口径为“可进入真实环境联调”，不等同于生产可上线。
  - 汇总真实微信登录、JSAPI 预下单、预下单响应验签、requestPayment、回调验签解密、204 成功响应、短轮询、环境校验、问题排查和联调记录模板等验收项。
  - 固定真实联调准入条件、推荐执行顺序和通过标准。
  - 记录当前环境未验证项，避免把沙箱内未完成的真实平台验证误判为已上线验证。
- README 增加 P5 收尾验收清单入口。
- P5 当前能力收口清单更新：
  - 增加收尾验收清单引用。
  - 将推荐下一步调整为进入真实环境联调执行。
- P5 微信联调边界更新：
  - 增加收尾验收清单引用。
  - 补充 P5-13 到后续任务序列。
  - 修正“预下单响应验签待补”的过期风险描述。
- P5 联调部署清单增加收尾验收清单引用。

修改文件：

- `docs/p5-acceptance-checklist.md`
- `README.md`
- `docs/p5-current-capability-closure.md`
- `docs/p5-wechat-integration-boundary.md`
- `docs/p5-integration-deployment-checklist.md`
- `docs/project-progress.md`

验证结果：

- `pnpm exec prettier --write README.md docs/p5-acceptance-checklist.md docs/p5-current-capability-closure.md docs/p5-wechat-integration-boundary.md docs/p5-integration-deployment-checklist.md docs/project-progress.md` 已执行。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

注意事项：

- 本节点为 P5 收尾文档节点，没有修改运行时代码。
- 当前环境仍缺真实微信小程序和商户配置，无法完成真实端到端联调。

下一步：

```text
P5-14：进入真实环境联调执行，根据联调记录修复实际问题。
```

### 2026-05-30：P5-14 真实联调执行辅助工具

完成内容：

- `integration:check` 增加真实模式强制校验：
  - 设置 `INTEGRATION_REQUIRE_REAL=1` 后，要求 `WECHAT_LOGIN_MODE=real`、`WECHAT_PAY_MODE=real` 和 `TARO_APP_PAYMENT_MODE=real` 同时成立。
  - 用于真实支付联调前防止误用 mock 模式。
- 新增 `integration:record` 脚本：
  - 从真实支付联调记录模板生成一份记录草稿。
  - 默认输出到 `docs/records/<日期>-wechat-pay-real-test-dev.md`。
  - 支持 `INTEGRATION_RECORD_ENV`、`INTEGRATION_RECORD_DATE`、`INTEGRATION_RECORD_DIR`、`INTEGRATION_RECORD_PATH` 和 `INTEGRATION_RECORD_OVERWRITE`。
  - 自动写入脱敏环境摘要，只记录 appId 后 6 位、商户号后 6 位、模式和域名。
- 根目录和 server 包都增加 `integration:record` 命令。
- P5 联调部署清单、P5 收尾验收清单、本地回归文档和 README 补充真实联调执行辅助命令。

修改文件：

- `apps/server/scripts/integration-check.ts`
- `apps/server/scripts/create-real-payment-record.ts`
- `apps/server/package.json`
- `package.json`
- `docs/p5-integration-deployment-checklist.md`
- `docs/p5-acceptance-checklist.md`
- `docs/local-regression.md`
- `README.md`
- `docs/project-progress.md`

验证结果：

- `pnpm exec prettier --write apps/server/scripts/integration-check.ts apps/server/scripts/create-real-payment-record.ts apps/server/package.json package.json README.md docs/p5-integration-deployment-checklist.md docs/p5-acceptance-checklist.md docs/local-regression.md docs/project-progress.md` 已执行。
- `INTEGRATION_RECORD_PATH=/private/tmp/private-mall-real-pay-record-test.md INTEGRATION_RECORD_ENV=staging WECHAT_MINIAPP_APP_ID=wx123456789abc WECHAT_PAY_MCH_ID=1900000109 WECHAT_LOGIN_MODE=real WECHAT_PAY_MODE=real TARO_APP_PAYMENT_MODE=real pnpm integration:record` 在沙箱内未通过：`tsx` 创建 IPC pipe 被拦截，和既有脚本限制一致。
- 上述 `integration:record` 命令沙箱外执行通过，成功生成 `/private/tmp/private-mall-real-pay-record-test.md`。
- `INTEGRATION_SKIP_API_CHECK=1 INTEGRATION_REQUIRE_REAL=1 WECHAT_LOGIN_MODE=real WECHAT_MINIAPP_APP_ID=wx123456789abc WECHAT_MINIAPP_SECRET=dummy-secret WECHAT_PAY_MODE=real WECHAT_PAY_MCH_ID=1900000109 WECHAT_PAY_SERIAL_NO=dummy-serial WECHAT_PAY_API_V3_KEY=12345678901234567890123456789012 WECHAT_PAY_PRIVATE_KEY_PATH=/private/tmp/dummy-private-key.pem WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH=/private/tmp/dummy-platform-key.pem WECHAT_PAY_NOTIFY_URL=https://example.com/api/payments/wechat/notify TARO_APP_PAYMENT_MODE=real pnpm integration:check` 沙箱外执行通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

注意事项：

- 当前环境仍无法真正执行微信真实 code2Session、JSAPI 支付和微信支付回调，只能交付真实环境执行辅助能力。
- 生成的联调记录草稿仍需要联调人员填写实际订单、回调和结论。

下一步：

```text
P5-15：根据真实环境联调结果修复实际问题，或进入 P6 生产部署前检查。
```

### 2026-06-01：P5-15 / P6-01 生产部署前检查

完成内容：

- 新增 `deployment:preflight` 脚本：
  - 检查 `NODE_ENV=production`、端口、数据库、Redis、JWT secret、后台默认密码和公网基础 URL。
  - 检查微信登录、微信支付和小程序支付是否已切到 real。
  - 检查微信支付回调 URL、公钥 / 私钥路径、API v3 key 等关键配置。
  - 检查后台 `VITE_API_BASE_URL` 和小程序 `TARO_APP_API_BASE_URL` 是否为公网 HTTPS。
  - 对数据库备份、日志策略、错误监控和回滚方案给出人工确认项。
- 根目录和 server 包增加 `deployment:preflight` 命令。
- `.env.example` 增加生产部署前人工确认变量。
- 新增生产部署前检查清单：
  - 固定自动检查命令、关键环境变量、人工确认口径、推荐执行顺序和不得上线条件。
- README、本地回归文档和 P5 收尾验收清单增加生产部署前检查入口。

修改文件：

- `apps/server/scripts/deployment-preflight.ts`
- `apps/server/package.json`
- `package.json`
- `apps/server/.env.example`
- `docs/production-readiness-checklist.md`
- `README.md`
- `docs/local-regression.md`
- `docs/p5-acceptance-checklist.md`
- `docs/project-progress.md`

验证结果：

- `pnpm exec prettier --write apps/server/scripts/deployment-preflight.ts apps/server/package.json package.json apps/server/.env.example README.md docs/production-readiness-checklist.md docs/local-regression.md docs/p5-acceptance-checklist.md docs/project-progress.md` 未完全通过：`.env.example` 无法推断 parser。
- `pnpm exec prettier --write --ignore-unknown apps/server/scripts/deployment-preflight.ts apps/server/package.json package.json apps/server/.env.example README.md docs/production-readiness-checklist.md docs/local-regression.md docs/p5-acceptance-checklist.md docs/project-progress.md` 已执行。
- `NODE_ENV=production PORT=3000 DATABASE_URL=mysql://mall:prodSecret@db.internal:3306/mall_system REDIS_HOST=redis.internal REDIS_PORT=6379 JWT_ACCESS_SECRET=12345678901234567890123456789012 JWT_REFRESH_SECRET=abcdefghijklmnopqrstuvwxzy123456 ADMIN_DEFAULT_PASSWORD=ProdAdminPassword123 PUBLIC_BASE_URL=https://api.example.com UPLOAD_STORAGE=cos TENCENT_COS_SECRET_ID=dummy-id TENCENT_COS_SECRET_KEY=dummy-key TENCENT_COS_BUCKET=dummy-bucket TENCENT_COS_REGION=ap-shanghai WECHAT_LOGIN_MODE=real WECHAT_MINIAPP_APP_ID=wx123456789abc WECHAT_MINIAPP_SECRET=dummy-miniapp-secret WECHAT_PAY_MODE=real WECHAT_PAY_MCH_ID=1900000109 WECHAT_PAY_SERIAL_NO=dummy-serial WECHAT_PAY_API_V3_KEY=12345678901234567890123456789012 WECHAT_PAY_PRIVATE_KEY_PATH=/private/tmp/dummy-private-key.pem WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH=/private/tmp/dummy-platform-key.pem WECHAT_PAY_NOTIFY_URL=https://api.example.com/api/payments/wechat/notify VITE_API_BASE_URL=https://api.example.com TARO_APP_API_BASE_URL=https://api.example.com TARO_APP_PAYMENT_MODE=real DATABASE_BACKUP_CONFIRMED=1 LOG_RETENTION_CONFIRMED=1 ERROR_MONITORING_CONFIRMED=1 ROLLBACK_PLAN_CONFIRMED=1 DEPLOYMENT_PREFLIGHT_SKIP_FILE_CHECK=1 pnpm deployment:preflight` 在沙箱内未通过：`tsx` 创建 IPC pipe 被拦截，和既有脚本限制一致。
- 上述 `deployment:preflight` 命令沙箱外执行通过：0 failed，2 warnings；warnings 来自显式跳过证书文件存在性检查。
- `pnpm --filter @mall/server typecheck` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

注意事项：

- 当前环境没有真实生产密钥、HTTPS 域名、证书文件和数据库备份配置，`deployment:preflight` 的默认生产检查会按预期失败。
- 本节点不替代真实微信端到端联调；上线前仍需留存真实支付联调记录。

下一步：

```text
P6-02：进入运营增长能力规划，优先设计优惠券 / 会员 / 积分的最小可交付范围。
```

### 2026-06-01：P6-02 运营增长能力最小范围设计

完成内容：

- 新增 P6 运营增长能力最小范围文档：
  - 明确 P6 第一阶段优先级为“优惠券 MVP → 会员等级展示 → 积分流水 → 统计增强”。
  - 将优惠券 MVP 限定为满减券、每单一张券、后台创建 / 上下架、用户领取、下单抵扣和订单折扣快照。
  - 明确暂不做多券叠加、商品 / 分类定向券、积分抵现、会员价和复杂权益。
  - 设计 Coupon、UserCoupon 和 Order 折扣快照字段。
  - 固定优惠券核销、订单取消释放、支付成功确认使用的边界。
  - 规划管理后台、小程序用户端和订单创建接口的后续改动。
- README 增加 P6 运营增长能力最小范围入口。

修改文件：

- `docs/p6-growth-scope.md`
- `README.md`
- `docs/project-progress.md`

验证结果：

- `pnpm exec prettier --write README.md docs/p6-growth-scope.md docs/project-progress.md` 已执行。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。

注意事项：

- 本节点是 P6 范围设计节点，没有修改运行时代码和数据库 schema。
- 优惠券会直接影响 `payableAmount` 和微信支付金额校验，下一节点应先落数据模型和订单折扣快照字段，再接接口。

下一步：

```text
P6-03：实现优惠券 MVP 数据模型与 Prisma migration，先补 Coupon / UserCoupon / Order 折扣快照字段。
```

### 2026-06-06：P6-03 优惠券交易底座

完成内容：

- 新增优惠券相关 Prisma 枚举：
  - `CouponType`
  - `CouponStatus`
  - `UserCouponStatus`
- 新增优惠券数据模型：
  - `Coupon`
  - `UserCoupon`
- 给 `Order` 增加折扣和优惠券快照字段：
  - `discountAmount`
  - `userCouponId`
  - `couponId`
  - `couponCode`
  - `couponName`
  - `couponDiscountAmount`
- 新增 migration：
  - `20260606000100_add_coupons`
- `CreateOrderDto` 增加 `userCouponId`。
- 下单链路接入优惠券校验：
  - 校验用户券归属当前用户。
  - 校验用户券状态为 `AVAILABLE`。
  - 校验优惠券状态为 `ACTIVE`。
  - 校验有效期和满减门槛。
  - 计算 `payableAmount = totalAmount - discountAmount`。
  - 在订单上保存优惠券快照。
  - 创建订单后将用户券锁定为 `LOCKED`。
- 取消待支付订单时释放已锁定用户券。
- 支付成功回调推进订单状态时，将用户券标记为 `USED`，并增加优惠券 `usedCount`。
- seed 增加一张本地回归满减券，并给小程序回归用户发放一张可用券。
- 共享类型同步优惠券枚举、`Coupon`、`UserCoupon` 和订单折扣字段。

修改文件：

- `apps/server/prisma/schema.prisma`
- `apps/server/prisma/migrations/20260606000100_add_coupons/migration.sql`
- `apps/server/prisma/seed.ts`
- `apps/server/src/modules/order/dto/create-order.dto.ts`
- `apps/server/src/modules/order/dto/order-response.dto.ts`
- `apps/server/src/modules/order/order.service.ts`
- `apps/server/src/modules/payment/payment.service.ts`
- `packages/shared-types/src/index.ts`
- `apps/miniapp/project.config.json`
- `docs/project-progress.md`

验证结果：

- `pnpm --filter @mall/server prisma:generate` 通过。
- `pnpm --filter @mall/server typecheck` 通过。
- `pnpm --filter @mall/shared-types typecheck` 通过。
- `pnpm --filter @mall/api-sdk typecheck` 通过。
- `pnpm typecheck` 通过。

注意事项：

- 本节点只完成优惠券参与交易的后端底座，还没有新增后台优惠券管理页面和小程序领券 / 选券页面。
- 需要在数据库可用环境执行 migration 和 seed 后，才能在本地 API 中实际使用新表。

下一步：

```text
P6-04：实现优惠券后台管理接口与页面，支持创建、编辑、上架 / 下架和查看领取 / 使用数据。
```

### 2026-06-06：P6-04 优惠券后台管理

完成内容：

- 新增后端 `CouponModule`。
- 新增后台优惠券接口：
  - `GET /api/admin/coupons`
  - `GET /api/admin/coupons/:id`
  - `POST /api/admin/coupons`
  - `PATCH /api/admin/coupons/:id`
  - `PATCH /api/admin/coupons/:id/status`
- 新增优惠券 DTO：
  - `CreateCouponDto`
  - `UpdateCouponDto`
  - `UpdateCouponStatusDto`
  - `QueryCouponsDto`
  - `CouponResponseDto`
- 后台接口支持：
  - 按状态和关键词查询优惠券。
  - 创建草稿优惠券。
  - 自动生成券码。
  - 编辑未领取优惠券的规则字段。
  - 已领取优惠券仅允许更新名称和说明。
  - 上架时校验有效期和库存。
- 共享类型新增：
  - `CouponInput`
  - `CouponQuery`
- API SDK 新增后台优惠券方法：
  - `fetchCoupons`
  - `createCoupon`
  - `updateCoupon`
  - `updateCouponStatus`
- 管理后台新增“优惠券管理”导航和页面：
  - 列表展示名称、券码、满减规则、状态、库存、已使用、限领和有效期。
  - 支持关键词搜索和状态筛选。
  - 支持新增 / 编辑弹窗。
  - 支持上架 / 下架操作。

修改文件：

- `apps/server/src/modules/app.module.ts`
- `apps/server/src/modules/coupon/*`
- `packages/shared-types/src/index.ts`
- `packages/api-sdk/src/index.ts`
- `packages/api-sdk/src/runtime.js`
- `apps/admin-web/package.json`
- `apps/admin-web/src/App.tsx`
- `apps/admin-web/src/api/adminApi.ts`
- `apps/admin-web/src/api/types.ts`
- `apps/admin-web/src/pages/CouponPage.tsx`
- `apps/admin-web/src/styles.css`
- `pnpm-lock.yaml`
- `docs/project-progress.md`

验证结果：

- `pnpm install` 通过，没有下载新包。
- `pnpm --filter @mall/server typecheck` 通过。
- `pnpm --filter @mall/admin-web typecheck` 通过。
- `pnpm --filter @mall/api-sdk typecheck` 通过。
- `pnpm --filter @mall/shared-types typecheck` 通过。

注意事项：

- 本节点只完成后台管理优惠券，不包含小程序用户领券、我的优惠券和订单确认页选券。
- 需要先执行 P6-03 的数据库 migration 后，后台优惠券接口才能在本地数据库中使用。

下一步：

```text
P6-05：实现小程序优惠券领取、我的优惠券和订单确认页选券抵扣。
```

### 2026-06-06：P6-05 小程序优惠券领取与下单选券

完成内容：

- 新增用户端优惠券接口：
  - `GET /api/coupons/claimable`
  - `POST /api/coupons/:id/claim`
  - `GET /api/coupons/my`
  - `GET /api/coupons/available-for-order?amount=...`
- 用户端领取逻辑：
  - 只展示已上架、有效期内、未领满、当前用户未超过限领的优惠券。
  - 领取时事务内校验状态、有效期、库存和限领。
  - 领取成功后创建 `UserCoupon` 并增加 `Coupon.claimedCount`。
- 订单可用券接口：
  - 按当前用户、`AVAILABLE` 状态、有效期和订单金额门槛筛选。
  - 默认按抵扣金额从高到低返回。
- API SDK 新增小程序优惠券方法：
  - `fetchClaimableCoupons`
  - `claimCoupon`
  - `fetchMyCoupons`
  - `fetchAvailableCouponsForOrder`
- 小程序新增优惠券页面：
  - 可领取优惠券列表。
  - 我的优惠券列表。
  - 登录态空态。
  - 领取成功后刷新列表。
- “我的”页优惠券入口改为真实跳转。
- 订单确认页接入优惠券：
  - 加载购物车后按商品金额拉取可用券。
  - 默认选择抵扣金额最高的优惠券。
  - 支持点击切换 / 取消选择。
  - 汇总栏展示商品金额、优惠金额和应付金额。
  - 提交订单时传入 `userCouponId`。

修改文件：

- `apps/server/src/modules/coupon/coupon.controller.ts`
- `apps/server/src/modules/coupon/coupon.module.ts`
- `apps/server/src/modules/coupon/coupon.service.ts`
- `apps/server/src/modules/coupon/dto/coupon-response.dto.ts`
- `apps/server/src/modules/coupon/dto/query-available-coupons.dto.ts`
- `packages/api-sdk/src/index.ts`
- `packages/api-sdk/src/runtime.js`
- `apps/miniapp/src/app.config.ts`
- `apps/miniapp/src/api/couponApi.ts`
- `apps/miniapp/src/api/types.ts`
- `apps/miniapp/src/pages/coupon/index.config.ts`
- `apps/miniapp/src/pages/coupon/index.tsx`
- `apps/miniapp/src/pages/coupon/index.css`
- `apps/miniapp/src/pages/order/confirm.tsx`
- `apps/miniapp/src/pages/order/confirm.css`
- `apps/miniapp/src/pages/user/index.tsx`
- `docs/project-progress.md`

验证结果：

- `pnpm --filter @mall/server typecheck` 通过。
- `pnpm --filter @mall/api-sdk typecheck` 通过。
- `pnpm --filter @mall/shared-types typecheck` 通过。
- `pnpm --filter @mall/miniapp typecheck` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm --filter @mall/admin-web build` 通过。
- `pnpm --filter @mall/miniapp build:weapp` 在当前 macOS 沙箱下触发既有 Taro 底层 `system-configuration` panic 并挂起，已手动结束进程。

注意事项：

- 本节点没有启动后端、管理后台或小程序。
- 实际体验前需要执行优惠券 migration / seed，并启动后端和小程序 watch。
- 小程序完整构建仍建议在非沙箱本机、微信开发者工具 watch 或 CI 中复验。

下一步：

```text
P6-06：运行数据库 migration 和 seed 后，启动三端做优惠券领取、选券下单和支付回归。
```

### 2026-06-06：P6-06 优惠券交易 smoke 回归

完成内容：

- 扩展 `pnpm smoke:transaction` 覆盖优惠券交易链路。
- smoke 现在会在后台创建一张独立测试券并上架，避免依赖固定种子券是否已被使用。
- 新增小程序领取优惠券断言：
  - 后台创建的测试券应出现在可领取列表。
  - 领取后用户券状态应为 `AVAILABLE`。
- 新增订单可用券断言：
  - 按购物车商品金额查询时，应返回刚领取的测试券。
- 新增锁券 / 释放断言：
  - 使用优惠券创建一笔待支付订单后，订单应保存优惠券快照和折扣金额。
  - 用户券状态应变为 `LOCKED`。
  - 取消待支付订单后，用户券状态应恢复为 `AVAILABLE`。
- 新增优惠后支付断言：
  - 重新加购并使用同一张券创建正式 smoke 订单。
  - 校验 `payableAmount = totalAmount - discountAmount`。
  - mock 支付按优惠后的 `payableAmount` 通知。
  - 支付成功后用户券状态应变为 `USED`。
- 本地回归文档补充优惠券 smoke 覆盖范围。

修改文件：

- `apps/server/scripts/smoke-transaction.ts`
- `docs/local-regression.md`
- `docs/project-progress.md`

验证结果：

- `pnpm --filter @mall/server typecheck` 通过。
- `pnpm --filter @mall/api-sdk typecheck` 通过。
- `pnpm --filter @mall/shared-types typecheck` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- `pnpm --filter @mall/server build` 通过。

注意事项：

- 本节点只增强回归脚本，没有启动 API、后台或小程序。
- 实际执行 `pnpm smoke:transaction` 前仍需完成数据库 migration、seed，并启动 API。

下一步：

```text
P6-07：执行优惠券 smoke 回归并修复运行时问题，然后启动三端做页面体验复验。
```

### 2026-06-06：P6-07 优惠券 smoke 运行时验收

完成内容：

- 启动 Docker Desktop。
- 启动本地 MySQL / Redis：
  - `pnpm db:up`
- 生成 Prisma Client：
  - `pnpm --filter @mall/server prisma:generate`
- 应用数据库 migration：
  - `pnpm --filter @mall/server prisma:migrate:deploy`
  - 成功应用 `20260606000100_add_coupons`
- 刷新种子数据：
  - `pnpm --filter @mall/server db:seed`
- 修复 Nest 运行时依赖注入问题：
  - `CouponModule` 后台接口使用 `AdminAuthGuard`，需要导入 `AdminModule`。
  - `CouponModule` 用户接口使用 `JwtAuthGuard`，需要导入 `JwtModule` 和 `UserModule`。
- 临时启动 API 并验证健康检查。
- 执行优惠券增强后的 smoke 回归：
  - `pnpm smoke:transaction`
- smoke 已完整通过：
  - API health。
  - Swagger 订单分页文档。
  - 小程序 mock 登录。
  - 后台登录。
  - 后台创建并上架 smoke 优惠券。
  - 小程序领取优惠券。
  - 查询订单可用券。
  - 使用券创建待支付订单并锁券。
  - 取消待支付订单并释放券。
  - 重新加购、选券下单、校验优惠后应付金额。
  - mock 支付成功后核销券。
  - 后台搜索订单、发货、用户确认收货和订单分页。
- 回归结束后已停止临时 API。
- 回归结束后已停止 MySQL / Redis 容器。

修改文件：

- `apps/server/src/modules/coupon/coupon.module.ts`
- `docs/project-progress.md`

验证结果：

- `pnpm --filter @mall/server build` 通过。
- `pnpm smoke:transaction` 通过。
- 复查后端、后台、小程序运行进程：无残留。
- 复查 Docker Compose：无运行中的 MySQL / Redis 容器。

注意事项：

- `pnpm db:up`、`pnpm db:seed` 和 `pnpm smoke:transaction` 在当前沙箱中需要非沙箱授权，原因分别是 Docker socket 和 `tsx` IPC pipe 限制。
- 本节点没有启动管理后台和小程序页面，只完成 API + 数据库层的优惠券交易回归。

下一步：

```text
P6-08：启动后端、管理后台和小程序 watch，做优惠券后台页面、领券页和订单确认页的视觉 / 交互复验。
```

### 2026-06-08：P6-08 优惠券页面静态质量修正

完成内容：

- 尝试启动 Docker Desktop 并等待 Docker daemon。
- 当前 Docker daemon 未能在等待窗口内就绪，因此未继续启动 MySQL / Redis、API、后台和小程序 watch。
- 在等待期间完成优惠券相关页面的静态质量修正：
  - 后台优惠券弹窗从“编辑”切换到“新增”时，先 `resetFields()`，避免名称、券码、说明等字段残留。
  - 小程序优惠券卡片补充长名称、规则和有效期文本的收缩与省略，降低窄屏溢出风险。
  - 小程序订单确认页优惠券条目补充内容区 `min-width: 0` 和文本省略。
  - 小程序订单确认页底部汇总栏补充金额内容区收缩规则，避免“商品金额 / 优惠金额”文案挤压提交按钮。

修改文件：

- `apps/admin-web/src/pages/CouponPage.tsx`
- `apps/miniapp/src/pages/coupon/index.css`
- `apps/miniapp/src/pages/order/confirm.tsx`
- `apps/miniapp/src/pages/order/confirm.css`
- `docs/project-progress.md`

验证结果：

- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- `pnpm --filter @mall/admin-web build` 通过。

注意事项：

- Docker daemon 当前未就绪，三端运行态页面复验未执行。
- 本节点没有启动后端、管理后台或小程序 watch。

下一步：

```text
P6-09：Docker daemon 可用后启动 MySQL / Redis、API、后台和小程序 watch，继续优惠券页面运行态复验。
```

### 2026-06-08：P6-09 优惠券运行态复验

完成内容：

- Docker daemon 已就绪。
- 启动本地 MySQL / Redis：
  - `pnpm db:up`
- 应用数据库 migration：
  - `pnpm --filter @mall/server prisma:migrate:deploy`
  - 当前无待应用 migration。
- 生成 Prisma Client：
  - `pnpm --filter @mall/server prisma:generate`
- 刷新种子数据：
  - `pnpm --filter @mall/server db:seed`
  - 种子数据包含 3 个分类、3 个商品、5 个 SKU 和 1 张新人优惠券。
- 启动 API 并验证健康检查：
  - `pnpm --filter @mall/server start`
  - `http://localhost:3000/api/health` 通过。
- 启动管理后台并完成浏览器运行态复验：
  - `pnpm --filter @mall/admin-web dev`
  - 登录后台后进入“优惠券管理”。
  - 优惠券列表正常展示 seed 券和 smoke 券。
  - “新增优惠券”弹窗正常打开。
  - 从新增弹窗读取到名称、券码为空，验证新增态不会残留编辑态字段。
  - 修正优惠券弹窗 `destroyOnClose` 废弃警告，改为 `destroyOnHidden`。
  - 给优惠券弹窗增加 `forceRender`，避免打开前重置表单触发 Form 未挂载警告。
- 启动小程序 watch 时，在当前沙箱内复现 Taro 底层 `system-configuration` panic，导致 watch 未完整更新 dist。
- 在非沙箱权限下执行小程序单次构建：
  - `pnpm --filter @mall/miniapp build:weapp`
  - 构建通过。
  - `apps/miniapp/dist/app.json` 已包含 `pages/coupon/index`。
  - `apps/miniapp/dist/pages/coupon/index.{js,json,wxml,wxss}` 已生成。
- 执行优惠券增强后的交易 smoke 回归：
  - `pnpm smoke:transaction`
  - 已完整通过后台创建 smoke 券、小程序领取、下单锁券、取消释放、重新下单、优惠后 mock 支付、券核销、后台发货和用户确认收货。

修改文件：

- `apps/admin-web/src/pages/CouponPage.tsx`
- `docs/project-progress.md`

验证结果：

- `pnpm --filter @mall/server build` 通过。
- `pnpm --filter @mall/admin-web build` 通过。
- `pnpm --filter @mall/miniapp build:weapp` 在非沙箱权限下通过。
- `pnpm smoke:transaction` 通过。

注意事项：

- Taro 小程序 build / watch 在当前沙箱内会触发 macOS `system-configuration` panic；在非沙箱权限下构建正常。
- 微信开发者工具查看小程序前，应使用非沙箱终端运行 `pnpm --filter @mall/miniapp dev:weapp` 或先执行一次非沙箱 `build:weapp`。

下一步：

```text
P6-10：继续做小程序优惠券领取页和订单确认页的真机 / 微信开发者工具视觉复验，修正实际页面样式问题。
```

### 2026-06-11：P6-10 小程序优惠券体验修正

完成内容：

- 优惠券领取页补充金额显示格式化：
  - 抵扣金额、使用门槛去掉无意义的 `.00`。
  - 非整数金额仍保留两位小数。
- 优惠券领取页补充加载态：
  - 可领取列表加载中展示“正在加载优惠券”。
  - 我的优惠券列表加载中展示“正在加载优惠券”。
- 优惠券领取按钮补充提交中禁用态：
  - 任一优惠券领取中时，其他领取按钮同步禁用，避免重复提交。
- 订单确认页优惠券规则显示同步格式化：
  - “满 99 减 20”替代原始 decimal 字符串。
- 订单确认页优惠券选择控件改为圆点选中态：
  - 未选中显示描边圆点。
  - 选中后显示绿色圆点和内点。
  - 保留点击整行选择 / 取消选择的交互。
- 复查小程序 dist 产物：
  - `apps/miniapp/dist/app.json` 包含 `pages/coupon/index`。
  - `apps/miniapp/dist/pages/coupon/index.wxml` 存在。
  - `apps/miniapp/dist/pages/order/confirm.wxss` 包含新的选券圆点样式。

修改文件：

- `apps/miniapp/src/pages/coupon/index.tsx`
- `apps/miniapp/src/pages/coupon/index.css`
- `apps/miniapp/src/pages/order/confirm.tsx`
- `apps/miniapp/src/pages/order/confirm.css`
- `docs/project-progress.md`

验证结果：

- `pnpm --filter @mall/miniapp typecheck` 通过。
- `pnpm format:check` 通过。
- `pnpm --filter @mall/miniapp build:weapp` 在非沙箱权限下通过。

注意事项：

- 本节点没有启动 API、管理后台或小程序 watch。
- 由于 Taro 在当前沙箱内存在 `system-configuration` panic，仍建议在普通终端或授权命令中运行小程序 watch 后用微信开发者工具查看页面。

下一步：

```text
P6-11：启动 API 与小程序 watch，在微信开发者工具中做优惠券领取、选券下单的实际页面点击验收。
```

### 2026-06-11：P6-11 小程序优惠券运行态准备

完成内容：

- 启动 Docker Desktop 并确认 Docker daemon 可用。
- 启动本地 MySQL / Redis：
  - `pnpm db:up`
- 应用数据库 migration：
  - `pnpm --filter @mall/server prisma:migrate:deploy`
  - 当前无待应用 migration。
- 生成 Prisma Client：
  - `pnpm --filter @mall/server prisma:generate`
- 刷新种子数据：
  - `pnpm --filter @mall/server db:seed`
- 构建并启动 API：
  - `pnpm --filter @mall/server build`
  - `pnpm --filter @mall/server start`
  - `http://localhost:3000/api/health` 通过。
- 启动小程序 watch：
  - `pnpm --filter @mall/miniapp dev:weapp`
  - Taro 已进入 `Watching...`。
  - watch 输出已识别 `src/pages/coupon/index.tsx`。
  - `apps/miniapp/dist/app.json` 包含 `pages/coupon/index`。
  - `apps/miniapp/dist/pages/coupon/index.wxml` 存在。
  - `apps/miniapp/dist/pages/order/confirm.wxss` 包含新的选券圆点样式。
- 执行优惠券交易 smoke：
  - `pnpm smoke:transaction`
  - 完整通过后台创建 smoke 券、小程序领取、查询可用券、锁券、取消释放、重新下单、mock 支付核销、后台发货和用户确认收货。
- 创建一张本地 UI 验收券：
  - `P6_UI_COUPON_1781169992`
  - 状态 `ACTIVE`。
  - 已领数量 `0/20`。
  - 用于微信开发者工具里直接点击“领取”验证。
- 补充本地联调文档中的优惠券小程序点击验收路径。

修改文件：

- `docs/local-regression.md`
- `docs/project-progress.md`

验证结果：

- `pnpm --filter @mall/server build` 通过。
- `pnpm --filter @mall/miniapp dev:weapp` 非沙箱权限下进入 watch。
- `pnpm smoke:transaction` 通过。
- 本地 API 查询可领取券通过，返回 smoke 券、P6 UI 验收券和新人券。

注意事项：

- 当前 Codex 环境无法定位微信开发者工具应用或 CLI：
  - `open -a 微信开发者工具 apps/miniapp/dist` 返回未找到应用。
  - `/Applications` 和 Spotlight 索引均未找到可用 CLI。
- 因此本节点完成到“API + 小程序 watch + dist 产物 + smoke + 手工点击验收清单”层面，微信开发者工具中的实际点击仍需在用户已打开的工具中按文档路径复验。

下一步：

```text
P6-12：根据微信开发者工具中的实际点击反馈，修正优惠券领取页、订单确认页或登录态联动问题。
```

### 2026-06-11：P6-12 会员等级展示底座

完成内容：

- 在无新增微信开发者工具页面反馈的情况下，按 P6 规划进入“会员等级展示”阶段。
- 用户表新增展示型会员字段：
  - `memberLevel`：会员等级，默认 `1`。
  - `growthValue`：成长值，默认 `0`。
- 新增数据库 migration：
  - `20260611000100_add_user_member_fields`
- 种子用户补充会员数据：
  - `seed-miniapp-user-openid`
  - `memberLevel = 2`
  - `growthValue = 1280`
- 登录 / 用户资料响应 DTO 补充会员字段。
- 后台用户列表响应 DTO 补充会员字段。
- shared types 的 `UserProfile` 补充会员字段，供小程序和后台共享。
- 小程序“我的”页新增会员等级卡片：
  - 展示 `V{memberLevel}`。
  - 登录后展示当前成长值。
  - 明确会员价、积分抵扣等权益暂未开放。
- 后台“用户管理”表格新增“会员”列：
  - 展示会员等级。
  - 展示成长值。
- 本节点只做展示，不影响商品价格、优惠券抵扣、订单金额和支付金额。

修改文件：

- `apps/server/prisma/schema.prisma`
- `apps/server/prisma/migrations/20260611000100_add_user_member_fields/migration.sql`
- `apps/server/prisma/seed.ts`
- `apps/server/src/modules/auth/dto/auth-response.dto.ts`
- `apps/server/src/modules/admin/dto/admin-user-response.dto.ts`
- `packages/shared-types/src/index.ts`
- `apps/miniapp/src/pages/user/index.tsx`
- `apps/miniapp/src/pages/user/index.css`
- `apps/admin-web/src/pages/UserPage.tsx`
- `docs/project-progress.md`

验证结果：

- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- `pnpm --filter @mall/server prisma:generate` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm --filter @mall/admin-web build` 通过。
- `pnpm --filter @mall/miniapp build:weapp` 在非沙箱权限下通过。
- `pnpm --filter @mall/server prisma:migrate:deploy` 已成功应用 `20260611000100_add_user_member_fields`。
- `pnpm --filter @mall/server db:seed` 通过。
- 小程序登录接口返回：
  - `memberLevel = 2`
  - `growthValue = 1280`
- 后台用户列表按“ 小程序回归用户 ”检索返回：
  - `memberLevel = 2`
  - `growthValue = 1280`
- `pnpm smoke:transaction` 通过，确认交易主链路未受影响。

注意事项：

- 会员等级当前仅展示，不参与定价、折扣、积分抵现或权益计算。
- 新用户默认 `V1 / 0 成长值`。

下一步：

```text
P6-13：实现积分流水最小底座，先记录订单完成后的积分发放和用户中心积分展示，不做积分抵现。
```

### 2026-06-11：P6-13 积分流水最小底座

完成内容：

- 新增积分字段和流水模型：
  - `User.pointsBalance`：用户当前积分余额，默认 `0`。
  - `PointLedger`：积分流水。
  - `PointLedgerType`：首期包含 `ORDER_EARN` 和 `ADJUSTMENT`。
- 新增数据库 migration：
  - `20260611000200_add_points`
- 种子用户补充积分余额：
  - `seed-miniapp-user-openid`
  - `pointsBalance = 320`
- 用户资料响应和后台用户列表响应补充 `pointsBalance`。
- 新增用户端积分流水接口：
  - `GET /api/points/ledger`
  - 返回当前用户最近 50 条积分流水。
- 订单确认收货时发放积分：
  - 发放规则：`floor(payableAmount)`。
  - 与订单完成在同一个事务中处理。
  - 生成 `ORDER_EARN` 积分流水。
  - `balanceAfter` 记录发放后的积分余额。
  - 当前只在订单从 `SHIPPED` 到 `COMPLETED` 时发放一次。
- API SDK 新增 `fetchPointLedger`。
- 小程序“我的”页新增积分展示：
  - 会员卡片展示积分余额。
  - 新增“积分流水”卡片展示最近 3 条流水。
  - 未登录 / 无流水时展示对应空态。
- 后台“用户管理”表格新增“积分”列。
- smoke 回归补充积分断言：
  - 订单完成前记录积分余额。
  - 完成后校验余额增加。
  - 校验积分流水存在对应订单的 `ORDER_EARN` 记录。
  - 校验流水 `balanceAfter` 与用户当前积分余额一致。
- 本地联调文档补充积分 smoke 覆盖项。

修改文件：

- `apps/server/prisma/schema.prisma`
- `apps/server/prisma/migrations/20260611000200_add_points/migration.sql`
- `apps/server/prisma/seed.ts`
- `apps/server/src/modules/app.module.ts`
- `apps/server/src/modules/order/order.service.ts`
- `apps/server/src/modules/point/*`
- `apps/server/src/modules/auth/dto/auth-response.dto.ts`
- `apps/server/src/modules/admin/dto/admin-user-response.dto.ts`
- `apps/server/scripts/smoke-transaction.ts`
- `packages/shared-types/src/index.ts`
- `packages/api-sdk/src/index.ts`
- `packages/api-sdk/src/runtime.js`
- `apps/miniapp/src/api/pointApi.ts`
- `apps/miniapp/src/api/types.ts`
- `apps/miniapp/src/pages/user/index.tsx`
- `apps/miniapp/src/pages/user/index.css`
- `apps/admin-web/src/pages/UserPage.tsx`
- `docs/local-regression.md`
- `docs/project-progress.md`

验证结果：

- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- `pnpm --filter @mall/server prisma:generate` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm --filter @mall/admin-web build` 通过。
- `pnpm --filter @mall/miniapp build:weapp` 在非沙箱权限下通过。
- `pnpm --filter @mall/server prisma:migrate:deploy` 已成功应用 `20260611000200_add_points`。
- `pnpm --filter @mall/server db:seed` 通过。
- `GET /api/points/ledger` 验证通过：
  - smoke 订单完成后新增 `ORDER_EARN` 流水。
  - `points = 204`
  - `balanceAfter = 当前用户积分余额`
- `pnpm smoke:transaction` 通过，并包含 `points earned ok: +204`。

注意事项：

- 当前积分只做发放和流水展示，不做积分抵现。
- 退款 / 售后扣回积分暂未接入，后续进入退款能力或售后节点时再补。
- 会员成长值与积分余额当前是两个独立字段，订单完成只增加积分余额，不自动调整会员等级。

下一步：

```text
P6-14：补充积分退款 / 作废边界设计，或进入后台统计增强，把优惠券与积分数据纳入经营概览。
```

## 2026-06-12 P6-14 后台经营概览增强

目标：

- 把已完成的优惠券和积分链路纳入商家后台首页。
- 让 smoke 能覆盖新增统计字段，避免后续回归时只测交易链路、不测经营概览。

本次完成：

- 后台统计接口 `GET /api/admin/statistics/overview` 新增经营指标：
  - `activeCoupons`：当前有效优惠券数量。
  - `claimedCoupons`：累计领券数量。
  - `usedCoupons`：累计用券数量。
  - `couponDiscountAmount`：已支付订单的优惠券抵扣总额。
  - `pointsIssued`：订单完成累计发放积分。
  - `pointsBalanceTotal`：用户当前积分余额合计。
  - `pointLedgerCount`：积分流水总数。
- Swagger DTO 和 shared types 同步新增字段。
- 商家后台“经营概览”新增优惠券和积分统计卡片：
  - 有效优惠券
  - 领券 / 用券
  - 优惠抵扣
  - 累计发放积分
  - 当前积分余额
  - 积分流水
- 交易 smoke 新增 Dashboard 统计断言：
  - 完成订单后校验有效优惠券、领券、用券、优惠抵扣、积分发放、积分余额和积分流水统计。
- 本地联调文档补充 smoke 覆盖项。

修改文件：

- `apps/server/src/modules/admin/admin-statistics.service.ts`
- `apps/server/src/modules/admin/dto/admin-statistics-response.dto.ts`
- `apps/server/scripts/smoke-transaction.ts`
- `apps/admin-web/src/pages/DashboardPage.tsx`
- `packages/shared-types/src/index.ts`
- `docs/local-regression.md`
- `docs/project-progress.md`

验证结果：

- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm --filter @mall/admin-web build` 通过。
- `pnpm --filter @mall/server prisma:migrate:deploy` 通过，无待应用 migration。
- `pnpm --filter @mall/server db:seed` 通过。
- `pnpm smoke:transaction` 通过，并包含：
  - `points earned ok: +204`
  - `dashboard coupon and points statistics ok`

注意事项：

- 当前统计以本地数据库实时聚合为主，没有做缓存。
- `activeCoupons` 按 `ACTIVE` 且当前时间位于有效期内计算。
- `couponDiscountAmount` 只统计已支付订单中的优惠券抵扣金额。

下一步：

```text
P6-15：进入积分退款 / 作废边界，处理订单退款或售后场景下已发放积分的扣回规则。
```

## 2026-06-12 P6-15 积分退款扣回边界

目标：

- 已完成订单申请全额退款时，扣回该订单完成时发放的积分。
- 保持积分流水可追溯，并避免同一订单重复扣回。

本次完成：

- 新增积分流水类型：
  - `ORDER_REFUND_DEDUCT`：订单全额退款扣回积分。
- 调整积分流水与订单关系：
  - `Order.pointLedger` 改为 `Order.pointLedgers`。
  - `PointLedger.orderId` 不再单独唯一。
  - 新增 `@@unique([orderId, type])`，允许同一订单同时存在发放和扣回流水，并保证每种类型只写一次。
- 新增数据库 migration：
  - `20260612000100_add_point_refund_deduct`
- 退款边界增强：
  - 退款申请允许 `PENDING_DELIVERY`、`PAID`、`SHIPPED`、`COMPLETED` 订单进入。
  - 对 `COMPLETED` 且全额退款的订单，查找对应 `ORDER_EARN` 流水。
  - 若尚未存在 `ORDER_REFUND_DEDUCT`，则扣减用户积分余额并写入负数积分流水。
  - 重复退款申请不会重复扣回积分。
- API SDK 新增小程序侧 `createRefund` 调用。
- shared types 新增：
  - `ORDER_REFUND_DEDUCT`
  - `CreateRefundInput`
- smoke 回归补充退款扣回断言：
  - 创建完成订单的全额退款申请。
  - 校验订单进入 `REFUNDING`。
  - 校验用户积分余额扣回。
  - 校验出现 `ORDER_REFUND_DEDUCT` 负数流水。
  - 校验扣回流水 `balanceAfter` 与当前用户积分余额一致。
- 本地联调文档补充 smoke 覆盖项。

修改文件：

- `apps/server/prisma/schema.prisma`
- `apps/server/prisma/migrations/20260612000100_add_point_refund_deduct/migration.sql`
- `apps/server/src/modules/payment/payment.service.ts`
- `apps/server/scripts/smoke-transaction.ts`
- `packages/shared-types/src/index.ts`
- `packages/api-sdk/src/index.ts`
- `packages/api-sdk/src/runtime.js`
- `docs/local-regression.md`
- `docs/project-progress.md`

验证结果：

- `pnpm --filter @mall/server prisma:generate` 通过。
- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm --filter @mall/server prisma:migrate:deploy` 已成功应用 `20260612000100_add_point_refund_deduct`。
- `pnpm --filter @mall/server db:seed` 通过。
- `pnpm smoke:transaction` 通过，并包含：
  - `points earned ok: +204`
  - `dashboard coupon and points statistics ok`
  - `points refund deduct ok: -204`

注意事项：

- 当前项目还没有真实退款成功回调 / 审核完成接口，因此扣回触发点暂时放在“创建全额退款申请”。
- 当前只处理全额退款扣回积分；部分退款暂不扣回。
- 后续接入真实退款成功通知后，应把扣回逻辑移动到退款成功确认点。

下一步：

```text
P6-16：补充退款记录展示与后台售后处理入口，或进入积分抵扣 / 积分消费能力设计。
```

## 2026-06-12 P6-16 退款记录展示与后台售后入口

目标：

- 后台订单管理能看到用户退款申请。
- 商家可在后台处理待处理退款。
- smoke 覆盖“用户申请退款 -> 后台确认退款 -> 订单已退款”的闭环。

本次完成：

- 订单响应补充退款记录：
  - `Order.refunds`
  - 后台订单列表 / 展开行可直接读取退款记录。
- 新增后台退款处理 API：
  - `PATCH /api/admin/refunds/:id/status`
  - 支持 `SUCCESS` / `FAILED`。
- 新增后台退款处理服务：
  - 待处理退款标记为 `SUCCESS` 时，订单状态更新为 `REFUNDED`。
  - 待处理退款标记为 `FAILED` 时，订单状态按时间戳恢复到 `COMPLETED` / `SHIPPED` / `PENDING_DELIVERY`。
  - 若驳回的是已完成订单全额退款申请，会恢复 P6-15 已扣回的积分，并删除对应扣回流水，保证后续重新申请退款时仍可再次扣回。
- API SDK 新增：
  - `adminApi.updateRefundStatus`
- 后台订单管理页增强：
  - 展开订单行展示退款记录表。
  - 待处理退款支持“确认”和“驳回”操作。
  - 退款状态展示为待处理 / 已退款 / 已驳回。
- smoke 回归补充后台售后断言：
  - 用户完成订单后申请全额退款。
  - 校验积分扣回。
  - 后台确认退款。
  - 校验退款状态为 `SUCCESS`。
  - 校验订单状态变为 `REFUNDED`。
  - 校验订单详情包含已处理退款记录。
- 本地联调文档补充 smoke 覆盖项。

修改文件：

- `apps/server/src/modules/order/order.service.ts`
- `apps/server/src/modules/order/dto/order-response.dto.ts`
- `apps/server/src/modules/admin/admin-refund.controller.ts`
- `apps/server/src/modules/admin/admin-refund.service.ts`
- `apps/server/src/modules/admin/admin.module.ts`
- `apps/server/src/modules/admin/dto/update-refund-status.dto.ts`
- `apps/server/scripts/smoke-transaction.ts`
- `apps/admin-web/src/api/adminApi.ts`
- `apps/admin-web/src/api/types.ts`
- `apps/admin-web/src/pages/OrderPage.tsx`
- `packages/shared-types/src/index.ts`
- `packages/api-sdk/src/index.ts`
- `packages/api-sdk/src/runtime.js`
- `docs/local-regression.md`
- `docs/project-progress.md`

验证结果：

- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm --filter @mall/admin-web build` 通过。
- `pnpm --filter @mall/server prisma:migrate:deploy` 通过，无待应用 migration。
- `pnpm --filter @mall/server db:seed` 通过。
- `pnpm smoke:transaction` 通过，并包含：
  - `points refund deduct ok: -204`
  - `admin refund approval ok`

注意事项：

- 当前后台“确认退款”仍是本地业务状态确认，不是真实微信退款成功回调。
- 真实微信退款能力接入后，需要把 `SUCCESS` 状态与微信退款回调 / 商户平台结果对齐。
- 退款驳回时当前会恢复订单生命周期状态；前端暂未暴露“驳回原因”字段。

下一步：

```text
P6-17：进入真实微信退款回调 / 退款状态同步，或设计积分抵扣与积分消费流水。
```

## 2026-06-13 P6-17 退款回调状态同步

目标：

- 退款状态从“后台手动确认”推进到“可由微信退款回调同步”。
- 后台处理和微信回调共用同一套退款状态机，避免两条链路出现状态差异。

本次完成：

- 新增退款工作流服务：
  - `RefundWorkflowService`
  - 后台退款处理和微信退款回调都复用它。
  - 支持按退款 ID 或退款单号更新状态。
  - 统一处理订单状态更新、退款驳回后的订单状态恢复、积分扣回恢复。
- 新增微信退款回调接口：
  - `POST /api/refunds/wechat/notify`
  - mock 模式返回统一 JSON，兼容本地 smoke。
  - real 模式验签 / 解密后返回 `204 No Content`，与支付回调行为一致。
- WechatService 新增退款回调解析：
  - `parseRefundNotify`
  - 解密微信支付回调 resource 后读取 `out_refund_no`、`refund_id`、`refund_status`、退款金额等字段。
- PaymentService 新增退款回调处理：
  - mock 回调字段：`refundNo`、`transactionId`、`amount`、`refundStatus`。
  - `SUCCESS` 映射为 `RefundStatus.SUCCESS`。
  - `FAILED` / `CLOSED` / `ABNORMAL` 映射为 `RefundStatus.FAILED`。
  - 其他非终态回调幂等返回，不改变退款或订单状态。
  - 回调金额与退款单金额不一致时拒绝处理。
  - 成功回调会保存 `transactionId` 和 `notifyPayload`。
- API SDK 和 shared types 新增：
  - `WechatRefundNotifyInput`
  - `WechatRefundNotifyResult`
  - `miniappApi.mockWechatRefundNotify`
- smoke 回归从后台确认退款改为模拟微信退款回调：
  - 创建退款申请后触发 `POST /api/refunds/wechat/notify`。
  - 校验退款状态为 `SUCCESS`。
  - 校验退款交易号已保存。
  - 校验订单状态变为 `REFUNDED`。
  - 校验订单详情包含已处理退款记录。
- 本地联调文档补充退款回调覆盖项。

修改文件：

- `apps/server/src/modules/payment/payment.service.ts`
- `apps/server/src/modules/payment/payment.controller.ts`
- `apps/server/src/modules/payment/payment.module.ts`
- `apps/server/src/modules/payment/refund-workflow.service.ts`
- `apps/server/src/modules/payment/dto/payment-response.dto.ts`
- `apps/server/src/modules/payment/dto/wechat-refund-notify.dto.ts`
- `apps/server/src/modules/wechat/wechat.service.ts`
- `apps/server/src/modules/admin/admin-refund.service.ts`
- `apps/server/src/modules/admin/admin.module.ts`
- `apps/server/scripts/smoke-transaction.ts`
- `packages/shared-types/src/index.ts`
- `packages/api-sdk/src/index.ts`
- `packages/api-sdk/src/runtime.js`
- `docs/local-regression.md`
- `docs/project-progress.md`

验证结果：

- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm --filter @mall/admin-web build` 通过。
- `pnpm --filter @mall/server prisma:migrate:deploy` 通过，无待应用 migration。
- `pnpm --filter @mall/server db:seed` 通过。
- `pnpm smoke:transaction` 通过，并包含：
  - `points refund deduct ok: -204`
  - `wechat refund notify ok`

注意事项：

- 当前仍未主动调用微信退款下单 API，退款单创建后由 mock / real 回调同步终态。
- 真实微信退款接入时，需要补 `POST /v3/refund/domestic/refunds` 调用，并使用当前 `refundNo` 作为 `out_refund_no`。
- 当前非终态退款回调只做幂等返回，不记录中间态。

下一步：

```text
P6-18：接入真实微信退款下单 API，或进入积分抵扣 / 积分消费流水能力设计。
```

## 2026-06-13 P6-18 真实微信退款下单 API

目标：

- 在 `WECHAT_PAY_MODE=real` 时，用户申请退款后调用微信支付退款下单接口。
- 继续保持本地 mock smoke 链路稳定。
- 让退款下单、退款回调、后台处理共享同一套退款状态机。

本次完成：

- WechatService 新增真实退款下单封装：
  - `POST /v3/refund/domestic/refunds`
  - 使用 `out_trade_no`、`out_refund_no`、退款金额、订单总金额和退款回调地址。
  - 复用微信支付 v3 请求签名。
  - 对微信退款下单响应做签名验证。
  - 微信返回非 2xx 或缺少 `out_refund_no` 时抛出 `Wechat Pay refund request failed`。
- 新增退款回调地址配置：
  - `WECHAT_PAY_REFUND_NOTIFY_URL`
  - 可选；未配置时自动从 `WECHAT_PAY_NOTIFY_URL` 派生为 `/api/refunds/wechat/notify`。
- PaymentService 退款创建流程增强：
  - 创建本地退款单时关联最近一笔成功支付记录 `paymentId`。
  - mock 模式保持原行为，只创建本地退款单并等待 mock 回调 / 后台处理。
  - real 模式创建本地退款单后调用微信退款下单。
  - 微信退款下单返回终态时，复用 `RefundWorkflowService` 同步退款和订单状态。
  - 微信退款下单返回处理中时，保存微信 `refund_id` 和响应 payload，等待退款回调同步终态。
  - 微信退款下单失败时，将本地退款单标记为失败并恢复订单 / 积分边界。
- 联调检查增强：
  - `integration:check` 校验支付回调和退款回调地址格式。
  - `INTEGRATION_CHECK_NOTIFY_URL=1` 时同时检查两个回调地址可达性。
- 部署预检增强：
  - `deployment-preflight` 校验退款回调地址格式。
- 文档更新：
  - P5 微信联调边界补充真实退款下单和退款回调。
  - P5 联调部署清单补充 `WECHAT_PAY_REFUND_NOTIFY_URL`。
  - 生产 readiness 清单补充退款回调地址。

修改文件：

- `apps/server/src/modules/wechat/wechat.service.ts`
- `apps/server/src/modules/payment/payment.service.ts`
- `apps/server/src/modules/config/env.validation.ts`
- `apps/server/scripts/integration-check.ts`
- `apps/server/scripts/deployment-preflight.ts`
- `docs/p5-wechat-integration-boundary.md`
- `docs/p5-integration-deployment-checklist.md`
- `docs/production-readiness-checklist.md`
- `docs/project-progress.md`

验证结果：

- `pnpm typecheck` 通过。
- `pnpm format:check` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm --filter @mall/admin-web build` 通过。
- `INTEGRATION_SKIP_API_CHECK=1 INTEGRATION_REQUIRE_REAL=1 ... pnpm integration:check` 通过，并包含：
  - `payment and refund notify url format ok; remote reachability check skipped`
- `pnpm --filter @mall/server prisma:migrate:deploy` 通过，无待应用 migration。
- `pnpm --filter @mall/server db:seed` 通过。
- `pnpm smoke:transaction` 通过，并包含：
  - `points refund deduct ok: -204`
  - `wechat refund notify ok`

注意事项：

- 当前还没有真实商户环境实测微信退款下单，只完成代码封装、配置校验和 mock 回归保护。
- `WECHAT_PAY_REFUND_NOTIFY_URL` 建议显式配置；自动派生仅适合支付回调 URL 使用标准路径时。
- 微信退款下单失败时当前会把本地退款单置为失败，这更适合“请求未被微信接受”的场景；真实运营中如需重试，可后续增加“重新发起退款”动作。

下一步：

```text
P6-19：设计积分抵扣 / 积分消费流水，或补真实退款联调记录模板与失败重试能力。
```

## 2026-06-13 P6-19 积分抵扣与消费流水

目标：

- 让用户在订单确认页使用积分抵扣应付金额。
- 订单创建、取消、退款回调都能保持积分余额和积分流水一致。
- 继续用交易 smoke 覆盖优惠券、积分、支付、退款的组合边界。

本次完成：

- 积分消费数据模型增强：
  - `Order` 新增 `pointsUsed` 和 `pointsDiscountAmount`，保存订单积分抵扣快照。
  - `PointLedgerType` 新增 `ORDER_REDEEM` 和 `ORDER_REDEEM_REFUND`。
  - 新增数据库 migration：`20260613000100_add_points_redeem`。
- 订单创建支持积分抵扣：
  - 用户传入 `usePoints` 后，按 `100` 积分抵 `1` 元计算。
  - 积分抵扣发生在优惠券抵扣之后，最多抵扣剩余应付金额。
  - 创建订单时扣减用户积分余额并写入 `ORDER_REDEEM` 负数流水。
  - `discountAmount` 作为订单总优惠金额，包含优惠券抵扣和积分抵扣。
- 订单取消 / 退款边界增强：
  - 待支付订单取消时返还已消费积分，并写入 `ORDER_REDEEM_REFUND` 正数流水。
  - 退款成功回调时返还订单创建时消费的积分。
  - 退款失败时仍会恢复此前申请退款阶段扣回的订单发放积分。
  - 返还逻辑保持幂等，避免重复返还。
- 小程序订单确认页新增积分抵扣：
  - 拉取用户积分余额。
  - 展示可抵扣金额。
  - 支持开关积分抵扣，并同步底部应付金额。
  - 提交订单时传入 `usePoints`。
- 小程序和后台订单展示增强：
  - 用户订单详情费用明细展示优惠券抵扣和积分抵扣。
  - 后台订单展开行展示优惠券抵扣和积分抵扣。
  - 用户中心积分流水负数展示修正，避免出现 `+-`。
- smoke 回归增强：
  - 下单时启用积分抵扣。
  - 校验订单积分抵扣金额、积分余额扣减、`ORDER_REDEEM` 流水。
  - 订单完成后校验按实际应付金额发放积分。
  - 全额退款申请后校验订单发放积分扣回。
  - 微信退款回调成功后校验消费积分返还和 `ORDER_REDEEM_REFUND` 流水。
- 本地回归文档补充积分抵扣 smoke 覆盖项。

修改文件：

- `apps/server/prisma/schema.prisma`
- `apps/server/prisma/migrations/20260613000100_add_points_redeem/migration.sql`
- `apps/server/src/modules/order/order.service.ts`
- `apps/server/src/modules/order/dto/create-order.dto.ts`
- `apps/server/src/modules/order/dto/order-response.dto.ts`
- `apps/server/src/modules/payment/refund-workflow.service.ts`
- `apps/server/scripts/smoke-transaction.ts`
- `apps/miniapp/src/pages/order/confirm.tsx`
- `apps/miniapp/src/pages/order/confirm.css`
- `apps/miniapp/src/pages/order/detail.tsx`
- `apps/miniapp/src/pages/user/index.tsx`
- `apps/admin-web/src/pages/OrderPage.tsx`
- `packages/shared-types/src/index.ts`
- `docs/local-regression.md`
- `docs/project-progress.md`

验证结果：

- `pnpm --filter @mall/server prisma:generate` 通过。
- `pnpm typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm --filter @mall/admin-web build` 通过。
- `pnpm --filter @mall/miniapp build:weapp` 通过。
- `pnpm format:check` 通过。
- `pnpm --filter @mall/server prisma:migrate:deploy` 通过，已应用 `20260613000100_add_points_redeem`。
- `pnpm --filter @mall/server db:seed` 通过。
- `pnpm smoke:transaction` 通过，并包含：
  - `points earned ok: +200`
  - `points refund deduct ok: -200`
  - `wechat refund notify ok`

注意事项：

- 当前积分抵扣比例固定为 `100` 积分抵 `1` 元，尚未做后台配置。
- 当前只支持用户在订单确认页选择是否使用全部可用抵扣额度，尚未支持手动输入本次使用积分数。
- `discountAmount` 已经是订单总优惠金额；若需要单独统计优惠券优惠，应继续使用订单上的优惠券快照字段。
- 退款成功时返还积分抵扣，部分退款的按比例返还规则暂未实现。

下一步：

```text
P6-20：补真实退款失败重试 / 联调记录模板，或继续增强积分抵扣规则配置与部分退款积分返还。
```

## 2026-06-15 P6-20 真实退款失败重试与联调记录补强

目标：

- 补齐真实微信退款下单失败后的运营重试入口。
- 避免真实退款失败后只能把本地退款单停留在失败状态。
- 让真实支付联调记录覆盖退款下单、退款回调和失败重试。

本次完成：

- 新增后台真实退款重试能力：
  - 新增 `POST /api/admin/refunds/:id/retry`。
  - 仅允许 `WECHAT_PAY_MODE=real` 下使用。
  - 仅允许对 `FAILED` 退款单重试。
  - 重试时将退款单重新置为 `PENDING`，订单状态切回 `REFUNDING`。
  - 已完成订单的全额退款重试会重新扣回订单发放积分，保持退款申请阶段积分边界一致。
  - 重试后复用真实微信退款下单封装和 `RefundWorkflowService` 状态机。
- 支付模块导出 `PaymentService`，后台售后服务复用同一套真实退款下单逻辑。
- 后台订单退款记录增强：
  - 失败退款展示“重试”按钮。
  - 失败状态文案调整为“失败/驳回”，兼容真实退款失败与后台手动驳回两类来源。
  - 重试成功后刷新订单列表。
- API SDK 增强：
  - `createAdminApi` 新增 `retryRefund(id)`。
  - 同步更新运行时 JS 入口。
- 联调文档增强：
  - P5 联调部署清单补充真实退款失败重试说明。
  - P5 真实支付联调记录模板补充退款下单、退款回调和失败重试记录项。

修改文件：

- `apps/server/src/modules/payment/payment.module.ts`
- `apps/server/src/modules/payment/payment.service.ts`
- `apps/server/src/modules/admin/admin-refund.controller.ts`
- `apps/server/src/modules/admin/admin-refund.service.ts`
- `apps/admin-web/src/api/adminApi.ts`
- `apps/admin-web/src/pages/OrderPage.tsx`
- `packages/api-sdk/src/index.ts`
- `packages/api-sdk/src/runtime.js`
- `docs/p5-integration-deployment-checklist.md`
- `docs/p5-real-payment-test-record-template.md`
- `docs/project-progress.md`

验证结果：

- `pnpm typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm --filter @mall/admin-web build` 通过。

注意事项：

- 当前 `FAILED` 同时表示后台驳回和真实微信退款失败；本次没有新增失败来源字段，因此后台会对所有失败退款显示重试按钮。
- 后端会在 mock 模式下拒绝重试，避免本地手动驳回退款被误当作微信退款失败处理。
- 真实退款失败重试仍待真实商户环境验证。

下一步：

```text
P6-21：拆分退款失败来源 / 失败原因字段，或继续增强积分抵扣规则配置与部分退款积分返还。
```

## 2026-06-15 P6-21 退款失败来源拆分

目标：

- 修正 P6-20 留下的 `FAILED` 含义过宽问题。
- 区分后台驳回、微信退款下单失败和微信退款回调失败。
- 只允许真实微信失败退款在后台展示重试入口。

本次完成：

- 退款数据模型增强：
  - 新增 `RefundFailureSource`：
    - `ADMIN_REJECT`
    - `WECHAT_REQUEST`
    - `WECHAT_NOTIFY`
  - `Refund` 新增 `failureSource` 和 `failureReason`。
  - 新增 migration：`20260615000100_add_refund_failure_source`。
- 退款状态机增强：
  - `RefundWorkflowService.updateStatusById` / `updateStatusByRefundNo` 支持写入失败来源和失败原因。
  - 退款成功时清空失败来源和失败原因。
- 失败来源写入规则：
  - 后台手动驳回写入 `ADMIN_REJECT`。
  - 微信退款下单请求抛错写入 `WECHAT_REQUEST`，失败原因记录异常 message。
  - 微信退款下单响应直接返回失败终态时写入 `WECHAT_REQUEST`。
  - 微信退款回调返回 `FAILED` / `CLOSED` / `ABNORMAL` 时写入 `WECHAT_NOTIFY`。
- 后台重试边界收紧：
  - 仅 `WECHAT_REQUEST` / `WECHAT_NOTIFY` 来源的失败退款允许重试。
  - 后台手动驳回的退款不再展示重试按钮。
  - 重试时清空旧失败来源和失败原因。
- 后台订单退款记录展示增强：
  - `ADMIN_REJECT` 展示为“已驳回”。
  - `WECHAT_REQUEST` 展示为“微信下单失败”。
  - `WECHAT_NOTIFY` 展示为“微信退款失败”。
  - 新增失败原因列。
- API 响应和共享类型补齐 `failureSource` / `failureReason`。

修改文件：

- `apps/server/prisma/schema.prisma`
- `apps/server/prisma/migrations/20260615000100_add_refund_failure_source/migration.sql`
- `apps/server/src/modules/payment/payment.service.ts`
- `apps/server/src/modules/payment/refund-workflow.service.ts`
- `apps/server/src/modules/payment/dto/payment-response.dto.ts`
- `apps/server/src/modules/admin/admin-refund.service.ts`
- `apps/server/src/modules/admin/dto/update-refund-status.dto.ts`
- `apps/admin-web/src/pages/OrderPage.tsx`
- `packages/shared-types/src/index.ts`
- `docs/project-progress.md`

验证结果：

- `pnpm --filter @mall/server prisma:generate` 通过。
- `pnpm typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm --filter @mall/admin-web build` 通过。

注意事项：

- 本节点只拆分失败来源，未新增后台驳回原因输入弹窗；当前 DTO 已支持 `failureReason`，前端后续可补输入。
- migration 尚未在本地数据库执行，本节点未启动 Docker / API。
- 真实微信失败来源仍需在商户环境通过退款下单失败和退款失败回调实际验证。

下一步：

```text
P6-22：补后台退款驳回原因输入，或进入积分抵扣规则配置与部分退款积分返还。
```

## 2026-06-15 P6-22 后台退款驳回原因输入

目标：

- 让后台驳回退款时可以填写原因。
- 复用 P6-21 已补好的 `failureReason` 字段。
- 让退款记录中的失败原因不只服务于微信失败，也能覆盖人工售后处理。

本次完成：

- 后台订单退款记录交互增强：
  - “驳回”从 `Popconfirm` 改为弹窗表单。
  - 弹窗展示退款单号、退款金额和用户申请原因。
  - 支持填写可选驳回原因，最长 `191` 个字符。
  - 提交时调用 `updateRefundStatus`，传入 `status: FAILED` 和 `failureReason`。
  - 提交成功后关闭弹窗、重置表单并刷新订单列表。
- 继续保留：
  - 待处理退款的“确认”轻量确认。
  - 微信失败退款的“重试”轻量确认。
  - 退款记录中的“失败原因”列。

修改文件：

- `apps/admin-web/src/pages/OrderPage.tsx`
- `docs/project-progress.md`

验证结果：

- `pnpm typecheck` 通过。
- `pnpm --filter @mall/admin-web build` 通过。

注意事项：

- 后端 DTO 在 P6-21 已支持 `failureReason`，本节点只补后台输入。
- 当前没有启动后台页面做浏览器交互复验，仅完成静态类型和生产构建验证。

下一步：

```text
P6-23：进入积分抵扣规则配置，或处理部分退款积分扣回 / 返还规则。
```

## 2026-06-15 P6-23 积分抵扣规则配置

目标：

- 去掉后端和小程序里的积分抵扣比例硬编码。
- 让订单创建和小程序展示读取同一套积分抵扣规则。
- 保持默认规则不变，避免影响现有 smoke 口径。

本次完成：

- 新增积分抵扣规则配置：
  - `POINTS_REDEEM_POINTS_PER_YUAN`
  - 默认值为 `100`，表示 `100` 积分抵 `1` 元。
  - 环境变量校验要求为大于等于 `1` 的整数。
- 新增积分规则接口：
  - `GET /api/points/rules`
  - 返回 `enabled` 和 `pointsPerYuan`。
  - 当前接口复用积分模块和用户登录态保护。
- 后端订单创建改造：
  - `OrderService` 不再使用本地常量 `POINTS_PER_YUAN`。
  - 积分抵扣计算改为从 `PointService.getRedeemRules()` 读取 `pointsPerYuan`。
  - 默认未配置时仍按 `100` 积分抵 `1` 元计算。
- 小程序订单确认页改造：
  - 订单确认加载时同时请求用户资料、积分规则和可用优惠券。
  - 积分抵扣金额按接口返回的 `pointsPerYuan` 计算。
  - 规则文案从固定“100 积分可抵 1 元”改为动态展示。
- API SDK 和共享类型增强：
  - 新增 `PointRedeemRules` 类型。
  - `createMiniappApi` 新增 `fetchPointRedeemRules()`。

修改文件：

- `apps/server/src/modules/config/env.validation.ts`
- `apps/server/src/modules/order/order.module.ts`
- `apps/server/src/modules/order/order.service.ts`
- `apps/server/src/modules/point/point.controller.ts`
- `apps/server/src/modules/point/point.service.ts`
- `apps/server/src/modules/point/dto/point-redeem-rule-response.dto.ts`
- `apps/miniapp/src/api/pointApi.ts`
- `apps/miniapp/src/pages/order/confirm.tsx`
- `packages/api-sdk/src/index.ts`
- `packages/api-sdk/src/runtime.js`
- `packages/shared-types/src/index.ts`
- `docs/local-regression.md`
- `docs/project-progress.md`

验证结果：

- `pnpm typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm --filter @mall/admin-web build` 通过。
- `pnpm --filter @mall/miniapp build:weapp` 通过。

注意事项：

- 当前只是环境变量级配置，尚未做后台运营配置页面。
- 积分抵扣开关当前始终为启用；后续如需关闭，可继续扩展 `enabled` 的来源。
- smoke 仍使用默认 `100`，应付金额断言口径不变。

下一步：

```text
P6-24：处理部分退款积分扣回 / 返还规则，或补后台积分规则配置页面。
```

## 2026-06-15 P6-24 部分退款积分扣回与返还规则

目标：

- 补齐部分退款时积分发放扣回和积分抵扣返还的比例规则。
- 避免部分退款成功后订单被错误置为 `REFUNDED`。
- 防止多次部分退款累计金额超过订单实付金额。

本次完成：

- 已发放积分扣回改为累计比例同步：
  - 统计同一订单 `PENDING` + `SUCCESS` 退款累计金额。
  - 按 `floor(订单发放积分 * 累计退款金额 / 订单实付金额)` 计算目标扣回积分。
  - `ORDER_REFUND_DEDUCT` 仍保持每个订单一条流水。
  - 多次部分退款会更新同一条扣回流水，并按差额调整用户积分余额。
  - 退款失败 / 驳回后重新计算目标扣回积分，必要时返还差额或删除扣回流水。
- 积分抵扣返还改为成功退款累计比例同步：
  - 统计同一订单 `SUCCESS` 退款累计金额。
  - 按 `floor(订单抵扣积分 * 成功退款金额 / 订单实付金额)` 计算目标返还积分。
  - `ORDER_REDEEM_REFUND` 仍保持每个订单一条流水。
  - 多次部分退款成功会更新同一条返还流水，并按差额增加用户积分余额。
- 订单退款状态修正：
  - 累计成功退款金额达到订单实付金额时，订单状态变为 `REFUNDED`。
  - 部分退款成功时，订单恢复到原履约状态：
    - 已完成订单恢复 `COMPLETED`
    - 已发货订单恢复 `SHIPPED`
    - 已支付 / 待发货订单恢复 `PENDING_DELIVERY`
- 退款金额保护：
  - 新建退款时统计同一订单 `PENDING` + `SUCCESS` 退款累计金额。
  - 若累计金额加本次申请金额超过订单实付金额，拒绝创建退款。
- 真实退款重试联动：
  - 失败退款重试重新置为 `PENDING` 后，会按累计退款金额重新同步积分扣回。

修改文件：

- `apps/server/src/modules/payment/payment.service.ts`
- `apps/server/src/modules/payment/refund-workflow.service.ts`
- `docs/project-progress.md`

验证结果：

- `pnpm typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。

注意事项：

- 当前部分退款规则采用 `floor` 向下取整，避免多次部分退款提前多扣 / 多返积分。
- 最后一笔退款使累计成功退款金额达到订单实付金额时，会返还全部抵扣积分，并把订单置为 `REFUNDED`。
- 本节点未启动数据库和 smoke；完整交易回归仍需在应用 P6-21 migration 后执行。

下一步：

```text
P6-25：在 smoke 中增加部分退款断言，或补后台积分规则配置页面。
```

## 2026-06-15 P6-25 部分退款 smoke 断言

目标：

- 把 P6-24 的部分退款积分规则纳入自动回归。
- 验证部分退款不会错误地把订单置为 `REFUNDED`。
- 验证多次退款累计到全额后，积分扣回和抵扣返还最终结清。

本次完成：

- 交易 smoke 退款段从“一次全额退款”改为“两段退款”：
  - 第一段退订单实付金额的一半。
  - 第二段退剩余金额。
- 新增部分退款申请断言：
  - 退款单状态为 `PENDING`。
  - 订单进入 `REFUNDING`。
  - 用户积分余额按比例扣回订单完成发放积分。
  - `ORDER_REFUND_DEDUCT` 流水金额等于比例扣回积分。
- 新增部分退款成功回调断言：
  - 退款单变为 `SUCCESS`。
  - 订单恢复为 `COMPLETED`，不提前变为 `REFUNDED`。
  - 用户积分余额按比例返还订单抵扣积分。
  - `ORDER_REDEEM_REFUND` 流水金额等于比例返还积分。
- 新增剩余退款断言：
  - 第二笔退款申请后，`ORDER_REFUND_DEDUCT` 更新为订单全部发放积分扣回。
  - 第二笔退款成功后，订单变为 `REFUNDED`。
  - `ORDER_REDEEM_REFUND` 更新为订单全部抵扣积分返还。
- 本地回归文档补充部分退款覆盖项。

修改文件：

- `apps/server/scripts/smoke-transaction.ts`
- `docs/local-regression.md`
- `docs/project-progress.md`

验证结果：

- `pnpm typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。

注意事项：

- 本节点只增强 smoke 脚本和文档，未启动 Docker / API 实跑 smoke。
- 完整 smoke 运行前仍需应用 P6-21 migration：`20260615000100_add_refund_failure_source`。

下一步：

```text
P6-26：应用最新 migration 并实跑 smoke，或补后台积分规则配置页面。
```

## 2026-06-15 P6-26 最新迁移与完整 smoke 回归

目标：

- 应用 P6-21 之后新增的退款失败来源 migration。
- 在本地数据库上跑完整交易 smoke。
- 验证 P6-24 / P6-25 的部分退款积分规则真实闭环。

本次完成：

- 启动 Docker Desktop daemon。
- 启动本地 MySQL / Redis：
  - `pnpm db:up`
- 应用最新 Prisma migration：
  - `20260615000100_add_refund_failure_source`
- 刷新本地种子数据：
  - `pnpm --filter @mall/server db:seed`
- 启动本地后端 API：
  - `pnpm --filter @mall/server start`
- 执行完整交易 smoke：
  - `pnpm smoke:transaction`

验证结果：

- `pnpm format:check` 通过。
- `pnpm typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm --filter @mall/admin-web build` 通过。
- `pnpm --filter @mall/server prisma:migrate:deploy` 通过，并应用：
  - `20260615000100_add_refund_failure_source`
- `pnpm --filter @mall/server db:seed` 通过。
- `pnpm smoke:transaction` 通过，并包含：
  - `partial refund points deduct ok: -100`
  - `partial wechat refund notify ok`
  - `points refund deduct ok: -200`
  - `wechat refund notify ok`

注意事项：

- 本次只启动后端 API 跑 smoke，没有启动管理后台和小程序 watch。
- Docker Desktop 是通过 `docker desktop start` 拉起的；回归结束后应继续关闭 API 和本地 MySQL / Redis。

下一步：

```text
P6-27：补后台积分规则配置页面，或进入 P6 运营增长能力收口清单。
```

## 2026-06-15 P6-27 后台积分规则展示页

目标：

- 让商家后台能看到当前生效的积分抵扣规则。
- 明确积分规则当前来源是后端环境变量，而不是后台可写配置。
- 为后续做“后台可编辑积分规则”预留页面入口和 API 边界。

本次完成：

- 新增后台积分规则接口：
  - `GET /api/admin/points/rules`
  - 使用后台管理员鉴权。
  - 复用 `PointService.getRedeemRules()`，与小程序 `GET /api/points/rules` 同源。
- AdminModule 接入 PointModule：
  - 后台点数接口可以复用积分服务。
- API SDK 增强：
  - `createAdminApi` 新增 `fetchAdminPointRedeemRules()`。
- 后台新增“运营设置”页面：
  - 侧边栏新增“运营设置”入口。
  - 页面展示积分抵扣比例、启用状态、配置键和默认值。
  - 明确提示当前通过 `POINTS_REDEEM_POINTS_PER_YUAN` 配置，修改后需要重启后端。
  - 展示小程序订单确认页读取规则的接口路径。
- 本地回归文档补充后台运营设置页说明。

修改文件：

- `apps/server/src/modules/admin/admin-point.controller.ts`
- `apps/server/src/modules/admin/admin.module.ts`
- `apps/admin-web/src/App.tsx`
- `apps/admin-web/src/api/adminApi.ts`
- `apps/admin-web/src/api/types.ts`
- `apps/admin-web/src/pages/SettingPage.tsx`
- `packages/api-sdk/src/index.ts`
- `packages/api-sdk/src/runtime.js`
- `docs/local-regression.md`
- `docs/project-progress.md`

验证结果：

- `pnpm typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm --filter @mall/admin-web build` 通过。

注意事项：

- 当前后台页面是只读展示，不提供在线修改。
- 后续如需在线修改，需要新增持久化配置表、后台更新接口，以及规则变更审计。

下一步：

```text
P6-28：整理 P6 运营增长能力收口清单，或实现后台可编辑积分规则配置表。
```

## 2026-06-16 P6-28 后台可编辑积分规则

目标：

- 让商家后台可以在线调整积分抵扣启停和抵扣比例。
- 将积分抵扣规则持久化，避免只能通过环境变量和重启后端调整。
- 保证小程序下单、后端订单创建和后台展示读取同一套生效规则。

本次完成：

- 新增积分抵扣规则持久化表：
  - `point_redeem_rules`
  - 保存 `enabled`、`pointsPerYuan`、`createdAt`、`updatedAt`。
  - 默认规则使用固定 `default` ID，便于后续扩展审计或多租户配置。
- 后端积分规则读取改为数据库优先：
  - 有后台保存规则时返回数据库配置。
  - 未保存规则时回退 `POINTS_REDEEM_POINTS_PER_YUAN`。
  - 响应新增 `source` 和 `updatedAt`，便于后台展示规则来源。
- 新增后台更新接口：
  - `PATCH /api/admin/points/rules`
  - 支持保存启用状态和 `pointsPerYuan`。
- 订单创建接入启停开关：
  - 后端创建订单时若积分抵扣规则停用，则不再抵扣积分。
  - 已创建订单继续保留自身积分抵扣快照。
- API SDK 增强：
  - `createAdminApi` 新增 `updateAdminPointRedeemRules()`。
  - 共享类型新增 `PointRedeemRules.source`、`updatedAt` 和 `UpdatePointRedeemRulesInput`。
- 后台“运营设置”页改为可编辑：
  - 支持切换积分抵扣启停。
  - 支持调整“多少积分抵 1 元”。
  - 保存后展示当前来源和更新时间。
- 小程序订单确认页接入启停状态：
  - 规则停用时不再计算可抵扣积分。
  - 文案提示“积分抵扣暂未开启”。
- 本地回归文档更新后台积分规则配置说明。

修改文件：

- `apps/server/prisma/schema.prisma`
- `apps/server/prisma/migrations/20260616000100_add_point_redeem_rule/migration.sql`
- `apps/server/src/modules/admin/admin-point.controller.ts`
- `apps/server/src/modules/order/order.service.ts`
- `apps/server/src/modules/point/dto/point-redeem-rule-response.dto.ts`
- `apps/server/src/modules/point/dto/update-point-redeem-rule.dto.ts`
- `apps/server/src/modules/point/point.service.ts`
- `apps/admin-web/src/api/adminApi.ts`
- `apps/admin-web/src/pages/SettingPage.tsx`
- `apps/miniapp/src/pages/order/confirm.tsx`
- `packages/api-sdk/src/index.ts`
- `packages/api-sdk/src/runtime.js`
- `packages/shared-types/src/index.ts`
- `docs/local-regression.md`
- `docs/project-progress.md`

验证结果：

- `pnpm typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm --filter @mall/admin-web build` 通过。
- `pnpm --filter @mall/miniapp build:weapp` 通过。

注意事项：

- 本次只生成并验证了迁移文件，尚未连接本地 MySQL 执行迁移。
- 后续运行完整联调前，需要先启动 Docker 依赖并执行 Prisma migrate deploy。

下一步：

```text
P6-29：启动数据库执行迁移并补 smoke 覆盖后台积分规则更新，或整理 P6 运营增长收口清单。
```

## 2026-06-16 P6-29 积分规则更新 smoke 覆盖

目标：

- 让 `pnpm smoke:transaction` 覆盖后台积分抵扣规则更新。
- 避免 smoke 临时修改积分规则后污染本地环境变量回退状态。
- 确认后台保存规则、小程序读取规则和订单创建计算使用同一套配置。

本次完成：

- 后台积分规则新增恢复接口：
  - `DELETE /api/admin/points/rules`
  - 删除后台保存的数据库覆盖规则，恢复使用 `POINTS_REDEEM_POINTS_PER_YUAN`。
- PointService 新增 `resetRedeemRules()`：
  - 删除默认积分规则记录。
  - 返回恢复后的当前生效规则。
- API SDK 增强：
  - `createAdminApi` 新增 `resetAdminPointRedeemRules()`。
- 后台“运营设置”页新增“恢复环境变量”按钮：
  - 可一键删除后台覆盖配置。
  - 表单会同步更新为恢复后的规则。
- smoke 交易链路新增积分规则断言：
  - 登录管理员后记录原始积分规则。
  - 临时保存 `SMOKE_POINTS_PER_YUAN`，默认 `80` 积分抵 `1` 元。
  - 断言 `GET /api/points/rules` 已同步后台配置。
  - 创建订单后断言 `pointsUsed` 和 `pointsDiscountAmount` 符合后台配置。
  - 完成积分抵扣断言后恢复原始规则；失败时也会尽力恢复。
- 本地回归文档补充 smoke 覆盖项和 `SMOKE_POINTS_PER_YUAN` 参数。

修改文件：

- `apps/server/src/modules/admin/admin-point.controller.ts`
- `apps/server/src/modules/point/point.service.ts`
- `apps/server/scripts/smoke-transaction.ts`
- `apps/admin-web/src/api/adminApi.ts`
- `apps/admin-web/src/pages/SettingPage.tsx`
- `packages/api-sdk/src/index.ts`
- `packages/api-sdk/src/runtime.js`
- `docs/local-regression.md`
- `docs/project-progress.md`

验证结果：

- `pnpm format:check`
- `pnpm typecheck`
- `pnpm --filter @mall/server build`
- `pnpm --filter @mall/admin-web build`
- `pnpm --filter @mall/miniapp build:weapp`
- `pnpm --filter @mall/server prisma:migrate:deploy` 通过，并应用 `20260616000100_add_point_redeem_rule`。
- `pnpm db:seed` 通过。
- `pnpm smoke:transaction` 通过，并包含：
  - `point redeem rule update ok: 80 points / 1 yuan`
  - `point redeem rule restored`
  - `Smoke transaction passed.`

下一步：

```text
P6-30：启动数据库执行迁移并运行完整 smoke，或整理 P6 运营增长收口清单。
```

## 2026-06-16 P6-30 运营增长能力收口清单

目标：

- 把 P6 已完成能力、自动回归覆盖和明确延后事项整理成独立清单。
- 修正 P6-29 之后“还需执行迁移和 smoke”的过期下一步。
- 为后续进入 P7 地址 / 物流 / 售后增强提供清晰交接点。

本次完成：

- 新增 P6 当前能力收口清单：
  - `docs/p6-current-capability-closure.md`
  - 汇总优惠券、会员等级展示、积分流水、积分抵扣、部分退款积分边界、退款失败来源和后台积分规则配置。
  - 明确 `pnpm smoke:transaction` 已覆盖后台积分规则更新、小程序规则同步、优惠券、积分抵扣、支付、发货、完成、部分退款和全额退款闭环。
  - 列出收货地址、物流轨迹、完整售后、积分手动输入、积分规则审计、会员权益配置、多券叠加、定向券、细粒度 RBAC 和单元 / E2E 测试等延后事项。
  - 标记真实微信登录、真实支付、真实退款和回调仍需商户环境验证。
- README 文档入口新增 P6 收口清单链接。

修改文件：

- `docs/p6-current-capability-closure.md`
- `docs/project-progress.md`
- `README.md`

验证结果：

- `pnpm format:check` 通过。

下一步：

```text
P7-01：设计并实现收货地址模块，接入订单确认页和订单快照。
```

## 2026-06-16 P7-01 收货地址模块与订单地址快照

目标：

- 补齐 P7 第一项地址能力，让订单确认页不再使用“默认配送”占位文案。
- 下单时写入收货地址快照，避免用户后续修改地址影响历史订单。
- 让 smoke 覆盖默认地址读取和订单地址快照。

本次完成：

- 新增收货地址数据模型：
  - `UserAddress`
  - 支持收货人、手机号、省、市、区、详细地址、邮编和默认地址标记。
  - 与 `User` 建立一对多关系。
- 订单表新增收货地址快照字段：
  - `shippingAddressId`
  - `receiverName`
  - `receiverPhone`
  - `receiverProvince`
  - `receiverCity`
  - `receiverDistrict`
  - `receiverDetailAddress`
  - `receiverPostalCode`
- 新增地址模块：
  - `GET /api/addresses`
  - `GET /api/addresses/default`
  - `POST /api/addresses`
  - `PATCH /api/addresses/:id`
  - `PATCH /api/addresses/:id/default`
  - `DELETE /api/addresses/:id`
- 订单创建接入地址：
  - 支持传 `shippingAddressId`。
  - 未传时自动使用当前用户默认地址。
  - 没有可用地址时拒绝创建订单。
  - 创建订单时保存地址快照。
- seed 增加默认收货地址：
  - `seed-address-default`
  - 保障本地 smoke 和小程序确认页默认可用。
- 共享类型和 API SDK 增强：
  - 新增 `UserAddress`、`AddressInput`、`UpdateAddressInput`。
  - `createMiniappApi` 新增地址相关方法。
- 小程序订单确认页：
  - 加载并展示默认收货地址。
  - 提交订单时传入默认地址 ID。
  - 没有地址时禁用提交按钮并提示。
- 小程序订单详情页和后台订单展开行：
  - 展示订单收货地址快照。
- smoke 增强：
  - 断言默认收货地址存在。
  - 创建订单后断言收货地址快照与默认地址一致。
- 本地回归文档补充地址覆盖项。

修改文件：

- `apps/server/prisma/schema.prisma`
- `apps/server/prisma/migrations/20260616000200_add_user_address/migration.sql`
- `apps/server/prisma/seed.ts`
- `apps/server/scripts/smoke-transaction.ts`
- `apps/server/src/modules/address/*`
- `apps/server/src/modules/app.module.ts`
- `apps/server/src/modules/order/dto/create-order.dto.ts`
- `apps/server/src/modules/order/dto/order-response.dto.ts`
- `apps/server/src/modules/order/order.service.ts`
- `apps/admin-web/src/pages/OrderPage.tsx`
- `apps/miniapp/src/api/addressApi.ts`
- `apps/miniapp/src/api/types.ts`
- `apps/miniapp/src/pages/order/confirm.tsx`
- `apps/miniapp/src/pages/order/confirm.css`
- `apps/miniapp/src/pages/order/detail.tsx`
- `packages/api-sdk/src/index.ts`
- `packages/api-sdk/src/runtime.js`
- `packages/shared-types/src/index.ts`
- `docs/local-regression.md`
- `docs/project-progress.md`

验证结果：

- `pnpm --filter @mall/server prisma:generate` 通过。
- `pnpm format:check` 通过。
- `pnpm typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm --filter @mall/admin-web build` 通过。
- `pnpm --filter @mall/miniapp build:weapp` 通过。
- `pnpm --filter @mall/server prisma:migrate:deploy` 通过，并应用 `20260616000200_add_user_address`。
- `pnpm db:seed` 通过，并写入 1 条默认地址。
- `pnpm smoke:transaction` 通过，并包含：
  - `default address ok: 小程序回归用户`
  - `Smoke transaction passed.`

下一步：

```text
P7-02：继续做小程序地址管理页面，支持新增 / 编辑 / 设置默认地址。
```

## 2026-06-16 P7-02 小程序地址管理页面

目标：

- 让用户在小程序内管理收货地址，而不是只依赖 seed 默认地址。
- 从“我的”和订单确认页都能进入地址管理。
- 把地址新增、设置默认、删除纳入 smoke，保护订单确认页默认地址来源。

本次完成：

- 新增小程序地址管理页：
  - `pages/address/index`
  - 展示地址列表。
  - 支持新增地址。
  - 支持编辑地址。
  - 支持设置默认地址。
  - 支持删除非默认地址。
- “我的”页面收货地址入口从“待开放”改为真实跳转。
- 订单确认页配送卡片可点击进入地址管理。
- 无地址时确认页提示“请先添加默认地址后再提交订单”。
- smoke 增强：
  - 新增临时地址。
  - 将临时地址设为默认。
  - 恢复原默认地址。
  - 删除临时地址。
  - 失败时尽力恢复原默认地址。
- 本地回归文档补充地址管理覆盖项。

修改文件：

- `apps/miniapp/src/app.config.ts`
- `apps/miniapp/src/pages/address/index.config.ts`
- `apps/miniapp/src/pages/address/index.tsx`
- `apps/miniapp/src/pages/address/index.css`
- `apps/miniapp/src/pages/user/index.tsx`
- `apps/miniapp/src/pages/order/confirm.tsx`
- `apps/server/scripts/smoke-transaction.ts`
- `docs/local-regression.md`
- `docs/project-progress.md`

验证结果：

- `pnpm format:check` 通过。
- `pnpm typecheck` 通过。
- `pnpm --filter @mall/miniapp build:weapp` 通过。
- `pnpm --filter @mall/server prisma:migrate:deploy` 通过，无待应用迁移。
- `pnpm db:seed` 通过。
- `pnpm smoke:transaction` 通过，并包含：
  - `address management ok`
  - `Smoke transaction passed.`

下一步：

```text
P7-03：订单确认页支持选择本次订单收货地址。
```

## 2026-06-17 P7-03 订单确认页地址选择能力

目标：

- 订单确认页不再只能使用默认地址。
- 用户可在确认订单时从已有收货地址中选择本次订单地址。
- 保留进入地址管理页的入口，便于新增 / 编辑 / 设置默认。

本次完成：

- 订单确认页从拉取默认地址改为拉取地址列表。
- 地址列表加载后优先保持当前选择；当前选择不存在时回退默认地址，再回退第一条地址。
- 配送信息展示当前选中地址。
- 多地址时展示紧凑选择列表，支持点击切换本次订单地址。
- 提交订单时使用当前选中地址的 `shippingAddressId`。
- 无地址时提交按钮保持禁用，并提示先添加收货地址。
- 本地回归文档补充订单确认页地址选择覆盖项。

修改文件：

- `apps/miniapp/src/pages/order/confirm.tsx`
- `apps/miniapp/src/pages/order/confirm.css`
- `docs/local-regression.md`
- `docs/project-progress.md`

验证结果：

- `pnpm format:check` 通过。
- `pnpm typecheck` 通过。
- `pnpm --filter @mall/miniapp build:weapp` 通过。

下一步：

```text
P7-04：补齐地址页选择返回态。
```

## 2026-06-17 P7-04 地址页选择返回态

目标：

- 从订单确认页进入地址页时，用户可以直接选择本次订单地址并返回。
- 普通地址管理入口仍保持新增 / 编辑 / 设默认 / 删除能力。

本次完成：

- 新增订单地址选择事件：
  - `ORDER_ADDRESS_SELECTED_EVENT`
  - `OrderAddressSelectedPayload`
- 订单确认页进入地址页时携带选择模式参数和当前选中地址。
- 订单确认页监听地址选择事件，返回后保持本次订单地址选中态。
- 地址页在选择模式下标题改为“选择地址”。
- 地址页在选择模式下显示“选择”按钮。
- 地址页对当前选中地址展示“已选”标记和选中态样式。
- 本地回归文档补充地址页选择返回确认页覆盖项。

修改文件：

- `apps/miniapp/src/pages/order/events.ts`
- `apps/miniapp/src/pages/order/confirm.tsx`
- `apps/miniapp/src/pages/address/index.tsx`
- `apps/miniapp/src/pages/address/index.css`
- `docs/local-regression.md`
- `docs/project-progress.md`

验证结果：

- `pnpm format:check` 通过。
- `pnpm typecheck` 通过。
- `pnpm --filter @mall/miniapp build:weapp` 通过。

下一步：

```text
P7-05：补订单物流轨迹 MVP。
```

## 2026-06-17 P7-05 订单物流轨迹 MVP

目标：

- 订单不只保存发货字段，也能保存可扩展的物流轨迹。
- 后台发货后自动生成一条用户可见物流轨迹。
- 小程序订单详情展示物流时间线。

本次完成：

- 新增 `OrderLogisticsTrace` 数据模型和迁移：
  - 关联订单。
  - 保存轨迹状态、内容、物流公司、物流单号和发生时间。
  - 订单删除时级联删除轨迹。
- 订单响应新增 `logisticsTraces` 字段。
- 后台发货接口改为事务：
  - 更新订单发货字段。
  - 写入“商家已发货”物流轨迹。
- 小程序订单详情物流信息区新增轨迹时间线。
- smoke 回归补充断言：
  - 后台发货响应包含物流轨迹。
  - 用户订单详情包含物流轨迹。
- 本地回归文档补充物流轨迹覆盖项。

修改文件：

- `apps/server/prisma/schema.prisma`
- `apps/server/prisma/migrations/20260617000100_add_order_logistics_trace/migration.sql`
- `apps/server/src/modules/order/order.service.ts`
- `apps/server/src/modules/order/dto/order-response.dto.ts`
- `apps/server/scripts/smoke-transaction.ts`
- `apps/miniapp/src/api/types.ts`
- `apps/miniapp/src/pages/order/detail.tsx`
- `apps/miniapp/src/pages/order/detail.css`
- `packages/shared-types/src/index.ts`
- `docs/local-regression.md`
- `docs/project-progress.md`

验证结果：

- `pnpm --filter @mall/server prisma:generate` 通过。
- `pnpm format:check` 通过。
- `pnpm typecheck` 通过。
- `pnpm --filter @mall/miniapp build:weapp` 通过。

未执行：

- 本次未启动 Docker / API，因此新迁移尚未应用到本地数据库。
- 本次未执行 `pnpm smoke:transaction`；后续启动数据库和 API 后需要复跑完整 smoke。

下一步：

```text
P7-06：补后台订单详情物流轨迹展示。
```

## 2026-06-17 P7-06 后台订单物流轨迹展示

目标：

- 管理后台订单展开行能看到物流轨迹，不只展示发货字段。
- 后台发货生成的轨迹可被运营在订单管理页复核。

本次完成：

- 后台订单展开行新增“物流轨迹”区块。
- 有轨迹时展示轨迹表格：
  - 时间。
  - 状态。
  - 内容。
  - 物流公司 / 物流单号。
- 无轨迹时展示“暂无物流轨迹”。
- 本地回归文档补充后台订单展开行物流轨迹覆盖项。

修改文件：

- `apps/admin-web/src/pages/OrderPage.tsx`
- `docs/local-regression.md`
- `docs/project-progress.md`

验证结果：

- `pnpm format:check` 通过。
- `pnpm typecheck` 通过。
- `pnpm --filter @mall/admin-web build` 通过。

备注：

- 后台构建仍有 Vite chunk size warning，属于现有后台打包体积提示，不影响本次功能验证。

下一步：

```text
P7-07：补物流轨迹手动追加接口 / 后台表单。
```

## 2026-06-17 P7-07 物流轨迹手动追加

目标：

- 管理后台可为已发货订单手动追加物流轨迹。
- 用户订单详情能看到后台追加的轨迹。
- smoke 覆盖自动发货轨迹和手动追加轨迹。

本次完成：

- 新增共享输入类型 `AddOrderLogisticsTraceInput`。
- 新增后端 DTO `AddOrderLogisticsTraceDto`。
- 新增后台接口：
  - `POST /api/admin/orders/:id/logistics-traces`
  - 仅允许已发货订单追加轨迹。
  - 未填写物流公司 / 单号时沿用订单已有发货信息。
- API SDK 新增 `addOrderLogisticsTrace`。
- 管理后台订单展开行新增“追加轨迹”按钮。
- 新增“追加物流轨迹”弹窗：
  - 轨迹状态。
  - 轨迹内容。
  - 物流公司。
  - 物流单号。
- smoke 回归新增手动追加物流轨迹断言。
- 本地回归文档补充后台手动追加物流轨迹覆盖项。

修改文件：

- `packages/shared-types/src/index.ts`
- `packages/api-sdk/src/index.ts`
- `packages/api-sdk/src/runtime.js`
- `apps/server/src/modules/order/dto/add-order-logistics-trace.dto.ts`
- `apps/server/src/modules/order/order.service.ts`
- `apps/server/src/modules/admin/admin-order.controller.ts`
- `apps/server/scripts/smoke-transaction.ts`
- `apps/admin-web/src/api/adminApi.ts`
- `apps/admin-web/src/pages/OrderPage.tsx`
- `apps/admin-web/src/styles.css`
- `docs/local-regression.md`
- `docs/project-progress.md`

验证结果：

- `pnpm format:check` 通过。
- `pnpm typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm --filter @mall/admin-web build` 通过。

备注：

- 后台构建仍有 Vite chunk size warning，属于现有后台打包体积提示，不影响本次功能验证。
- 本次未启动 Docker / API，因此新迁移尚未应用到本地数据库，完整 smoke 尚未复跑。

下一步：

```text
P7-08：补物流轨迹状态枚举 / 文案映射，并记录本地 smoke 阻塞原因。
```

## 2026-06-17 P7-08 物流轨迹状态收敛

目标：

- 物流轨迹状态不再由后台自由输入，避免同义状态发散。
- 后端、后台和小程序统一状态范围与中文文案。
- 尝试执行迁移 / smoke，如本地环境不满足则记录明确阻塞原因。

本次完成：

- 尝试执行 `pnpm db:up`，但 Docker daemon 未运行：
  - `Cannot connect to the Docker daemon at unix:///Users/liwen/.docker/run/docker.sock`
  - 因此本次无法应用迁移，也无法执行完整 smoke。
- 新增共享类型 `OrderLogisticsTraceStatus`：
  - `SHIPPED`
  - `PICKED_UP`
  - `IN_TRANSIT`
  - `DELIVERING`
  - `DELIVERED`
  - `EXCEPTION`
- `OrderLogisticsTrace.status` 和 `AddOrderLogisticsTraceInput.status` 改为枚举类型。
- 后端 `AddOrderLogisticsTraceDto` 增加状态白名单校验。
- 管理后台“追加物流轨迹”表单中，轨迹状态由输入框改为下拉选择。
- 管理后台物流轨迹表格统一展示中文状态文案。
- 小程序订单详情物流时间线统一展示中文状态文案。

修改文件：

- `packages/shared-types/src/index.ts`
- `apps/server/src/modules/order/dto/add-order-logistics-trace.dto.ts`
- `apps/admin-web/src/api/types.ts`
- `apps/admin-web/src/pages/OrderPage.tsx`
- `apps/miniapp/src/api/types.ts`
- `apps/miniapp/src/pages/order/detail.tsx`
- `docs/project-progress.md`

验证结果：

- `pnpm format:check` 通过。
- `pnpm typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm --filter @mall/admin-web build` 通过。
- `pnpm --filter @mall/miniapp build:weapp` 通过。

备注：

- 后台构建仍有 Vite chunk size warning，属于现有后台打包体积提示，不影响本次功能验证。

未执行：

- `pnpm db:up` 未通过，因为 Docker daemon 未运行。
- 新迁移尚未应用到本地数据库。
- 完整 `pnpm smoke:transaction` 尚未复跑。

下一步：

```text
P7-09：小程序订单列表展示最新物流轨迹摘要。
```

## 2026-06-17 P7-09 小程序订单列表物流摘要

目标：

- 用户在订单列表页即可看到已发货订单的最新物流进展。
- 订单列表与订单详情使用一致的物流轨迹状态中文文案。

本次完成：

- 小程序订单列表 `getOrderHint` 优先读取 `order.logisticsTraces[0]`。
- 已发货订单如存在物流轨迹，展示：
  - 中文状态。
  - 轨迹内容。
  - 轨迹发生时间。
- 无物流轨迹时保留原有物流单号 / 已发货提示。
- 订单提示文案增加单行省略，避免长轨迹撑破卡片。

修改文件：

- `apps/miniapp/src/pages/order/list.tsx`
- `apps/miniapp/src/pages/order/list.css`
- `docs/project-progress.md`

验证结果：

- `pnpm format:check` 通过。
- `pnpm typecheck` 通过。
- `pnpm --filter @mall/miniapp build:weapp` 通过。

未执行：

- Docker daemon 仍未运行，本节点未应用迁移、未执行完整 smoke。

下一步：

```text
P7-10：后台订单列表展示最新物流摘要。
```

## 2026-06-17 P7-10 后台订单列表物流摘要

目标：

- 管理后台订单列表不展开订单，也能看到当前物流进展。
- 后台列表、后台展开行和小程序详情使用同一套物流轨迹状态中文文案。

本次完成：

- 后台订单列表“物流”列优先读取最新物流轨迹。
- 有物流轨迹时展示：
  - 中文状态。
  - 轨迹内容。
- 无物流轨迹时保留原物流公司 / 物流单号展示。
- 物流列增加固定宽度和 tooltip 省略，避免长轨迹撑宽表格。

修改文件：

- `apps/admin-web/src/pages/OrderPage.tsx`
- `docs/project-progress.md`

验证结果：

- `pnpm format:check` 通过。
- `pnpm typecheck` 通过。
- `pnpm --filter @mall/admin-web build` 通过。

备注：

- 后台构建仍有 Vite chunk size warning，属于现有后台打包体积提示，不影响本次功能验证。

未执行：

- Docker daemon 仍未运行，本节点未应用迁移、未执行完整 smoke。

下一步：

```text
P7-11：补物流异常状态的用户侧提示文案。
```

## 2026-06-17 P7-11 物流异常用户提示

目标：

- 当最新物流轨迹为异常状态时，用户侧有明确提示，而不是按普通物流节点展示。
- 订单列表和订单详情都能提示用户查看详情或联系商家处理。

本次完成：

- 小程序订单列表：
  - 最新轨迹为 `EXCEPTION` 时展示“物流异常”提示。
  - 文案提示用户查看详情或联系商家。
- 小程序订单详情：
  - 已发货订单最新轨迹为 `EXCEPTION` 时，状态卡片展示异常说明。
  - 物流时间线异常节点使用红色标记。

修改文件：

- `apps/miniapp/src/pages/order/list.tsx`
- `apps/miniapp/src/pages/order/detail.tsx`
- `apps/miniapp/src/pages/order/detail.css`
- `docs/project-progress.md`

验证结果：

- `pnpm format:check` 通过。
- `pnpm typecheck` 通过。
- `pnpm --filter @mall/miniapp build:weapp` 通过。

未执行：

- Docker daemon 仍未运行，本节点未应用迁移、未执行完整 smoke。

下一步：

```text
P7-12：补后台物流异常状态醒目标记。
```

## 2026-06-17 P7-12 后台物流异常标记

目标：

- 管理后台能快速识别物流异常订单。
- 订单列表和展开轨迹表都能对异常状态给出明显视觉提示。

本次完成：

- 后台订单列表“物流”列：
  - 最新轨迹为 `EXCEPTION` 时使用危险色文本。
  - 保留 tooltip 省略展示。
- 后台订单展开行“物流轨迹”表：
  - 状态列改为 Tag。
  - 异常状态使用红色 Tag。
  - 普通轨迹使用蓝色 Tag。

修改文件：

- `apps/admin-web/src/pages/OrderPage.tsx`
- `docs/project-progress.md`

验证结果：

- `pnpm format:check` 通过。
- `pnpm typecheck` 通过。
- `pnpm --filter @mall/admin-web build` 通过。

备注：

- 后台构建仍有 Vite chunk size warning，属于现有后台打包体积提示，不影响本次功能验证。

未执行：

- Docker daemon 仍未运行，本节点未应用迁移、未执行完整 smoke。

下一步：

```text
P7-13：补物流轨迹状态在后台列表中的筛选能力。
```

## 2026-06-17 P7-13 后台物流状态筛选

目标：

- 管理后台可以按物流轨迹状态筛选订单。
- 运营可快速定位物流异常订单，不必逐条查看列表文案。

本次完成：

- 后台订单查询参数新增 `logisticsTraceStatus`。
- 后端后台订单查询支持按 `logisticsTraces.some.status` 筛选。
- 后端查询 DTO 对物流状态做白名单校验。
- 管理后台订单工具栏新增“物流状态”下拉。
- 重置按钮会同步清空订单状态、物流状态和关键词。
- 本地回归文档补充后台物流状态筛选覆盖项。

修改文件：

- `packages/shared-types/src/index.ts`
- `apps/server/src/modules/admin/dto/query-admin-orders.dto.ts`
- `apps/server/src/modules/order/order.service.ts`
- `apps/admin-web/src/pages/OrderPage.tsx`
- `docs/local-regression.md`
- `docs/project-progress.md`

验证结果：

- `pnpm format:check` 通过。
- `pnpm typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm --filter @mall/admin-web build` 通过。

备注：

- 后台构建仍有 Vite chunk size warning，属于现有后台打包体积提示，不影响本次功能验证。

未执行：

- Docker daemon 仍未运行，本节点未应用迁移、未执行完整 smoke。

下一步：

```text
P7-14：补后台物流筛选 smoke 断言。
```

## 2026-06-17 P7-14 后台物流筛选 smoke 断言

目标：

- 完整 smoke 回归能覆盖后台物流状态筛选。
- 等 Docker 可用后，后台物流筛选不会只停留在页面和接口类型层面。

本次完成：

- smoke 在后台手动追加 `IN_TRANSIT` 物流轨迹后，调用后台订单列表：
  - `keyword: order.orderNo`
  - `logisticsTraceStatus: IN_TRANSIT`
- smoke 断言筛选结果包含当前订单。
- 本地回归文档明确 smoke 会使用手动追加轨迹断言后台物流状态筛选。

修改文件：

- `apps/server/scripts/smoke-transaction.ts`
- `docs/local-regression.md`
- `docs/project-progress.md`

验证结果：

- `pnpm format:check` 通过。
- `pnpm typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。

未执行：

- Docker daemon 仍未运行，本节点未应用迁移、未执行完整 smoke。

下一步：

```text
P7-15：补物流轨迹 API 兼容说明。
```

## 2026-06-17 P7-15 物流轨迹 API 兼容说明

目标：

- 明确 P7 物流轨迹新增字段、后台追加接口和筛选参数的兼容边界。
- 给后续联调 / 回归留下清晰迁移步骤和 smoke 验证范围。

本次完成：

- `docs/api-compatibility.md` 新增“订单物流轨迹与后台物流筛选”章节。
- 文档覆盖：
  - `Order.logisticsTraces` 响应字段。
  - `OrderLogisticsTraceStatus` 状态枚举。
  - 后台发货自动写入物流轨迹行为。
  - `POST /api/admin/orders/:id/logistics-traces` 请求体和约束。
  - `GET /api/admin/orders?logisticsTraceStatus=...` 筛选语义。
  - 迁移文件路径和本地迁移步骤。
  - smoke 覆盖项。
- 本地回归文档补充物流轨迹兼容说明入口。

修改文件：

- `docs/api-compatibility.md`
- `docs/local-regression.md`
- `docs/project-progress.md`

验证结果：

- `pnpm format:check` 通过。

未执行：

- Docker daemon 仍未运行，本节点未应用迁移、未执行完整 smoke。

下一步：

```text
P7-16：启动 Docker 后应用迁移并执行完整 smoke。
```

## 2026-06-17 P7-16 应用迁移与完整 smoke 回归

目标：

- 应用 P7 物流轨迹新增迁移。
- 复跑完整交易 smoke，验证地址、订单、优惠券、积分、支付、发货、物流轨迹、退款等主链路。
- 解除此前 “Docker daemon 未运行” 对 P7 验证的阻塞。

本次完成：

- 启动 Docker Compose 依赖：
  - MySQL
  - Redis
- 重新生成 Prisma Client。
- 成功应用迁移：
  - `20260617000100_add_order_logistics_trace`
- 刷新本地 seed：
  - 3 个分类。
  - 3 个商品。
  - 5 个 SKU。
  - 1 张优惠券。
  - 1 个默认收货地址。
- 构建并启动后端 API。
- 执行完整 `pnpm smoke:transaction`。
- smoke 覆盖并通过：
  - 默认地址查询。
  - 地址管理。
  - 订单地址快照。
  - 优惠券锁定 / 释放 / 核销。
  - 积分抵扣 / 发放 / 退款边界。
  - 后台发货。
  - 后台发货自动生成物流轨迹。
  - 用户订单详情返回物流轨迹。
  - 后台手动追加物流轨迹。
  - 后台按物流状态筛选订单。
  - 用户确认收货。
  - 部分退款和全额退款。
- smoke 结束后已停止本次启动的后端 API。

验证结果：

- `pnpm --filter @mall/server prisma:generate` 通过。
- `pnpm --filter @mall/server prisma:migrate:deploy` 通过。
- `pnpm db:seed` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm smoke:transaction` 通过，并包含：
  - `auto logistics trace ok`
  - `manual logistics trace ok`
  - `admin logistics status filter ok`
  - `Smoke transaction passed.`

当前注意：

- 本次启动的后端 API 已停止。
- Docker 中 MySQL / Redis 仍保持运行，可继续用于后续本地开发；如需停止可执行 `pnpm db:down`。

下一步：

```text
P7-17：整理 P7 地址 / 物流阶段收口清单。
```

## 2026-06-17 P7-17 P7 地址与物流阶段收口清单

目标：

- 将 P7 地址 / 物流阶段的已完成功能、自动回归覆盖、迁移状态和延后事项集中收口。
- 明确当前物流能力边界，避免把后台手动轨迹误认为真实快递轨迹查询。
- 给后续 P8 售后、真实物流查询、运费模板或真机复验留下清晰入口。

本次完成：

- 新增 `docs/p7-address-logistics-closure.md`。
- 汇总 P7 已完成能力：
  - 收货地址模型与小程序地址 CRUD。
  - 订单确认页选地址和订单地址快照。
  - 后台 / 小程序订单地址展示。
  - 物流轨迹模型、后台发货自动轨迹和后台手动追加轨迹。
  - 小程序物流时间线、列表物流摘要和异常提示。
  - 后台物流摘要、轨迹表格、异常标记和物流状态筛选。
- 记录最新完整 smoke 已覆盖并通过：
  - 地址管理。
  - 优惠券。
  - 积分。
  - 支付 mock。
  - 发货。
  - 自动物流轨迹。
  - 手动物流轨迹。
  - 后台物流状态筛选。
  - 确认收货。
  - 部分退款 / 全额退款。
- 明确 P8 延后事项：
  - 真实物流查询。
  - 物流订阅 / 回调。
  - 多包裹 / 拆单。
  - 运费模板。
  - 售后退货物流。
  - 地址智能解析和区域编码。
  - 物流操作审计。
  - E2E 视觉回归。

修改文件：

- `docs/p7-address-logistics-closure.md`
- `docs/project-progress.md`

验证结果：

- `pnpm format:check` 通过。

当前注意：

- P7 最新完整 smoke 已在 P7-16 通过。
- 本次启动的后端 API 已停止。
- Docker 中 MySQL / Redis 仍保持运行，可继续用于后续本地开发；如需停止可执行 `pnpm db:down`。

下一步：

```text
P8-01：整理售后 / 退货物流边界，或接入真实物流查询方案调研。
```

## 2026-06-17 P8-01 售后 / 退货物流边界与真实物流查询调研

目标：

- 梳理当前退款、订单物流轨迹和后台处理能力。
- 明确 `Refund`、售后单、退货物流、真实物流查询之间的职责边界。
- 为 P8 后续模型、接口、小程序页面、后台页面和 smoke 拆分开发节点。

本次完成：

- 新增 `docs/p8-after-sale-logistics-boundary.md`。
- 明确当前能力：
  - 现有 `Refund` 已覆盖退款记录、后台处理、微信退款回调、积分扣回 / 返还。
  - 现有 `OrderLogisticsTrace` 已覆盖订单正向物流轨迹。
  - 当前缺少独立售后申请、售后审核、退货物流、换货流程和真实物流查询。
- 明确职责拆分：
  - `Refund` 继续只负责资金退款记录和微信退款同步。
  - 新增 `AfterSale` 承担售后申请、审核、协商、退款触发和售后日志。
  - 新增退货物流模型承担当次售后退回商家的物流信息。
- 设计 P8 第一阶段售后类型：
  - `REFUND_ONLY`
  - `RETURN_REFUND`
- 设计售后基础状态机：
  - `REQUESTED`
  - `APPROVED`
  - `REJECTED`
  - `WAIT_BUYER_RETURN`
  - `BUYER_RETURNED`
  - `MERCHANT_RECEIVED`
  - `REFUNDING`
  - `COMPLETED`
  - `CANCELLED`
- 拆分后续实现节点：
  - `P8-02` 售后模型与基础接口。
  - `P8-03` 小程序售后入口。
  - `P8-04` 后台售后处理。
  - `P8-05` 退货物流。
  - `P8-06` 真实物流查询适配层。
- 给出真实物流查询适配层建议：
  - 保留后台手动轨迹作为兜底。
  - 新增 `LogisticsProvider` 抽象。
  - 优先接入 mock provider，再接一个聚合查询服务。
  - 查询 / 回调结果写入内部统一轨迹，不把第三方 raw 字段直接暴露给小程序。

修改文件：

- `docs/p8-after-sale-logistics-boundary.md`
- `docs/project-progress.md`

验证结果：

- `pnpm format:check` 通过。

当前注意：

- 本节点为边界调研和开发拆分，未修改数据库模型和业务代码。
- 未启动后端 API、小程序 watch 或管理后台。
- Docker 中 MySQL / Redis 如仍在运行，可继续用于后续开发；如需停止可执行 `pnpm db:down`。

下一步：

```text
P8-02：新增售后单模型与基础状态机。
```

## 2026-06-18 P8-02 售后单模型与基础状态机

目标：

- 新增独立售后单模型，避免继续扩展 `Refund` 承载售后审核、买家举证和退货流程。
- 建立 P8 第一阶段售后状态机。
- 提供用户侧创建 / 查询 / 取消接口和后台查询 / 审核通过 / 驳回接口。
- 为后续小程序售后入口、后台售后页面、退货物流和退款触发留好类型与 SDK。

本次完成：

- Prisma schema 新增枚举：
  - `AfterSaleType`
  - `AfterSaleStatus`
  - `AfterSaleActorType`
- Prisma schema 新增模型：
  - `AfterSale`
  - `AfterSaleLog`
- 新增数据库迁移：
  - `apps/server/prisma/migrations/20260618000100_add_after_sale/migration.sql`
- 新增后端售后模块：
  - `AfterSaleModule`
  - `AfterSaleService`
  - `AfterSaleController`
  - `AdminAfterSaleController`
- 用户侧新增接口：
  - `POST /api/after-sales`
  - `GET /api/after-sales`
  - `GET /api/after-sales/:id`
  - `PATCH /api/after-sales/:id/cancel`
- 后台侧新增接口：
  - `GET /api/admin/after-sales`
  - `GET /api/admin/after-sales/:id`
  - `PATCH /api/admin/after-sales/:id/approve`
  - `PATCH /api/admin/after-sales/:id/reject`
- 基础状态流转：
  - 用户创建后进入 `REQUESTED`。
  - 用户可取消 `REQUESTED` / `WAIT_BUYER_RETURN`。
  - 后台可将 `REQUESTED` 审核通过。
  - `REFUND_ONLY` 审核通过后进入 `APPROVED`。
  - `RETURN_REFUND` 审核通过后进入 `WAIT_BUYER_RETURN`。
  - 后台可将 `REQUESTED` 驳回为 `REJECTED`。
  - 创建、取消、审核通过、驳回均写入 `AfterSaleLog`。
- 业务约束：
  - 待支付、已取消、已退款订单不可申请售后。
  - `RETURN_REFUND` 仅允许已发货或已完成订单。
  - 同一订单当前只允许一个未完结订单级售后。
  - 申请金额必须大于 0 且不能超过订单实付金额。
- 共享类型新增：
  - 售后类型 / 状态 / 日志类型。
  - `CreateAfterSaleInput`
  - `UserAfterSaleQuery`
  - `AdminAfterSaleQuery`
  - `ApproveAfterSaleInput`
  - `RejectAfterSaleInput`
  - `AfterSaleListResult`
- API SDK 新增：
  - 小程序售后创建 / 查询 / 取消方法。
  - 后台售后查询 / 审核通过 / 驳回方法。
- 小程序和后台本地 API 包装层导出新增售后方法与类型。
- `docs/api-compatibility.md` 补充 P8 售后基础模型与接口兼容说明。
- 为本地查看页面保留后端启动开关：
  - `ENABLE_SWAGGER=false` 时跳过 Swagger 文档生成，业务接口不受影响。

修改文件：

- `apps/server/prisma/schema.prisma`
- `apps/server/prisma/migrations/20260618000100_add_after_sale/migration.sql`
- `apps/server/src/modules/app.module.ts`
- `apps/server/src/modules/after-sale/*`
- `apps/server/src/modules/common/dto/api-response.dto.ts`
- `apps/server/src/main.ts`
- `packages/shared-types/src/index.ts`
- `packages/api-sdk/src/index.ts`
- `packages/api-sdk/src/runtime.js`
- `apps/admin-web/src/api/adminApi.ts`
- `apps/admin-web/src/api/types.ts`
- `apps/miniapp/src/api/orderApi.ts`
- `apps/miniapp/src/api/types.ts`
- `docs/api-compatibility.md`
- `docs/project-progress.md`

验证结果：

- `pnpm --filter @mall/server prisma:generate` 通过。
- `pnpm --filter @mall/server exec prisma format` 通过。
- `pnpm --filter @mall/server typecheck` 通过。
- `pnpm --filter @mall/api-sdk typecheck` 通过。
- `pnpm --filter @mall/shared-types typecheck` 通过。
- `pnpm --filter @mall/admin-web typecheck` 通过。
- `pnpm --filter @mall/miniapp typecheck` 通过。
- `pnpm --filter @mall/server build` 通过。
- `pnpm format:check` 通过。

未执行：

- Docker MySQL / Redis 当前未启动，未执行 `prisma:migrate:deploy`。
- 未执行完整 `pnpm smoke:transaction`。
- P8-02 不包含小程序页面和后台售后页面。
- P8-02 不触发资金退款，不接退货物流。

下一步：

```text
P8-03：小程序订单详情增加申请售后入口，新增售后申请页和售后详情页。
```

## 2026-06-18 P8-03 小程序售后入口与售后页面

目标：

- 在小程序订单详情页接入售后入口。
- 新增售后申请页和售后详情页。
- 让用户能从订单进入售后申请、查看当前订单售后记录，并取消允许取消的售后单。

本次完成：

- 售后列表接口补充 `orderId` 查询参数：
  - 用户侧可通过 `GET /api/after-sales?orderId=...` 查询当前订单售后。
  - 后台侧 `AdminAfterSaleQuery` 同步支持 `orderId`。
- 小程序路由新增：
  - `pages/after-sale/apply`
  - `pages/after-sale/detail`
- 新增售后申请页：
  - 自动读取订单详情。
  - 自动检查当前订单是否已有售后单。
  - 支持选择 `REFUND_ONLY` / `RETURN_REFUND`。
  - 未发货订单禁用 `RETURN_REFUND`。
  - 支持填写申请原因、申请金额、补充说明。
  - 提交成功后跳转售后详情。
- 新增售后详情页：
  - 展示售后状态、售后单号、类型、金额、原因、商家备注。
  - 展示关联订单信息。
  - 展示售后处理记录。
  - 支持取消 `REQUESTED` / `WAIT_BUYER_RETURN` 状态的售后单。
- 订单详情页增强：
  - 非待支付的可售后状态展示“申请售后 / 查看售后”入口。
  - 已发货订单在确认收货按钮旁展示售后入口。
  - 当前订单存在未完结售后时，优先进入售后详情。
  - 展示当前订单售后记录列表。
- `docs/api-compatibility.md` 补充 P8-03 小程序页面入口与行为说明。

修改文件：

- `apps/server/src/modules/after-sale/dto/query-after-sales.dto.ts`
- `apps/server/src/modules/after-sale/after-sale.service.ts`
- `packages/shared-types/src/index.ts`
- `apps/miniapp/src/app.config.ts`
- `apps/miniapp/src/api/orderApi.ts`
- `apps/miniapp/src/api/types.ts`
- `apps/miniapp/src/pages/order/detail.tsx`
- `apps/miniapp/src/pages/order/detail.css`
- `apps/miniapp/src/pages/after-sale/apply.config.ts`
- `apps/miniapp/src/pages/after-sale/apply.tsx`
- `apps/miniapp/src/pages/after-sale/apply.css`
- `apps/miniapp/src/pages/after-sale/detail.config.ts`
- `apps/miniapp/src/pages/after-sale/detail.tsx`
- `apps/miniapp/src/pages/after-sale/detail.css`
- `docs/api-compatibility.md`
- `docs/project-progress.md`

验证结果：

- `pnpm --filter @mall/miniapp typecheck` 通过。
- `pnpm --filter @mall/server typecheck` 通过。
- `pnpm --filter @mall/api-sdk typecheck` 通过。
- `pnpm --filter @mall/shared-types typecheck` 通过。
- `pnpm --filter @mall/miniapp build:weapp` 通过。
- `pnpm format:check` 通过。

未执行：

- Docker MySQL / Redis 当前未启动，未执行数据库迁移和完整 smoke。
- 未启动微信开发者工具做真机视觉复验。
- P8-03 仍不包含后台售后管理页面。
- P8-03 仍不包含退货物流填写和退款触发。

下一步：

```text
P8-04：后台增加售后列表和审核处理页面。
```

## 2026-06-18 P8-04 后台售后列表与审核处理页面

目标：

- 在管理后台增加售后管理入口。
- 支持商家查看售后列表、筛选售后状态 / 类型、搜索售后单 / 订单 / 用户。
- 支持展开查看售后详情和处理记录。
- 支持对待审核售后执行“通过”和“驳回”。

本次完成：

- 新增后台页面：
  - `apps/admin-web/src/pages/AfterSalePage.tsx`
- 后台菜单新增“售后管理”：
  - 路由：`/after-sales`
  - 图标：`ReconciliationOutlined`
- 售后列表能力：
  - 分页展示售后单号、状态、类型、订单号、用户、申请金额、原因、创建时间。
  - 支持状态筛选。
  - 支持类型筛选。
  - 支持关键词搜索售后单号、订单号、用户 OpenID / 昵称 / 手机号。
  - 支持展开行查看订单快照、用户信息、申请金额、通过金额、申请原因、补充说明、商家备注、驳回原因和时间字段。
  - 支持展开行查看 `AfterSaleLog` 处理记录。
- 审核处理能力：
  - `REQUESTED` 状态可审核通过。
  - `REQUESTED` 状态可驳回。
  - 审核通过弹窗支持填写通过金额和商家备注。
  - 驳回弹窗要求填写驳回原因，可选商家备注。
  - `REFUND_ONLY` 通过后进入 `APPROVED`。
  - `RETURN_REFUND` 通过后进入 `WAIT_BUYER_RETURN`。
  - 驳回后进入 `REJECTED`。
- 样式补充：
  - 新增售后筛选框和搜索框宽度。
- `docs/api-compatibility.md` 补充后台售后页面入口与审核行为说明。

修改文件：

- `apps/admin-web/src/App.tsx`
- `apps/admin-web/src/pages/AfterSalePage.tsx`
- `apps/admin-web/src/styles.css`
- `docs/api-compatibility.md`
- `docs/project-progress.md`

验证结果：

- `pnpm --filter @mall/admin-web typecheck` 通过。
- `pnpm --filter @mall/api-sdk typecheck` 通过。
- `pnpm --filter @mall/shared-types typecheck` 通过。
- `pnpm --filter @mall/admin-web build` 通过。
- `pnpm format:check` 通过。

未执行：

- Docker MySQL / Redis 当前未启动，未执行数据库迁移和完整 smoke。
- 未启动管理后台页面做浏览器视觉复验。
- P8-04 仍不触发资金退款。
- P8-04 仍不包含退货物流填写、商家确认收货和小程序退货物流页面。

下一步：

```text
P8-05：退货物流与商家确认收货，或 P8-04 运行态视觉复验。
```

## 2026-06-18 P8-05 退货物流与商家确认收货

目标：

- 在 P8 售后基础状态机上补齐退货退款的物流节点。
- 支持买家在商家审核通过后填写退货物流。
- 支持商家后台在买家已退货后确认收到退货。
- 继续保持资金退款触发和真实物流查询为后续节点。

本次完成：

- 售后模型新增退货物流字段：
  - `returnLogisticsCompany`
  - `returnTrackingNo`
  - `returnRemark`
  - `buyerReturnedAt`
  - `merchantReceivedAt`
- 新增数据库迁移：
  - `apps/server/prisma/migrations/20260618000200_add_after_sale_return_logistics/migration.sql`
- 用户侧新增接口：
  - `PATCH /api/after-sales/:id/return-logistics`
  - 仅允许 `WAIT_BUYER_RETURN` 状态提交退货物流。
  - 提交后进入 `BUYER_RETURNED`，并写入 `AfterSaleLog`。
- 后台新增接口：
  - `PATCH /api/admin/after-sales/:id/confirm-return-received`
  - 仅允许 `BUYER_RETURNED` 状态确认收到退货。
  - 确认后进入 `MERCHANT_RECEIVED`，并写入 `AfterSaleLog`。
- `@mall/shared-types` 和 `@mall/api-sdk` 同步新增：
  - `SubmitReturnLogisticsInput`
  - `ConfirmReturnReceivedInput`
  - 小程序 `submitReturnLogistics`
  - 后台 `confirmReturnReceived`
- 小程序售后详情页新增：
  - `WAIT_BUYER_RETURN` 状态展示退货物流填写区。
  - 展示退货物流、退货备注、买家退货时间、商家收货时间。
  - 更新状态说明文案。
- 后台售后管理页新增：
  - 展开详情展示退货物流信息和退货 / 收货时间。
  - `BUYER_RETURNED` 状态展示“确认收货”操作。
  - 确认收货弹窗支持填写商家备注。
- `docs/api-compatibility.md` 补充 P8-05 接口、字段、状态流转和迁移说明。

修改文件：

- `apps/server/prisma/schema.prisma`
- `apps/server/prisma/migrations/20260618000200_add_after_sale_return_logistics/migration.sql`
- `apps/server/src/modules/after-sale/after-sale.controller.ts`
- `apps/server/src/modules/after-sale/admin-after-sale.controller.ts`
- `apps/server/src/modules/after-sale/after-sale.service.ts`
- `apps/server/src/modules/after-sale/dto/after-sale-response.dto.ts`
- `apps/server/src/modules/after-sale/dto/review-after-sale.dto.ts`
- `packages/shared-types/src/index.ts`
- `packages/api-sdk/src/index.ts`
- `packages/api-sdk/src/runtime.js`
- `apps/miniapp/src/api/orderApi.ts`
- `apps/miniapp/src/api/types.ts`
- `apps/miniapp/src/pages/after-sale/detail.tsx`
- `apps/miniapp/src/pages/after-sale/detail.css`
- `apps/admin-web/src/api/adminApi.ts`
- `apps/admin-web/src/api/types.ts`
- `apps/admin-web/src/pages/AfterSalePage.tsx`
- `docs/api-compatibility.md`
- `docs/project-progress.md`

已验证：

- `pnpm --filter @mall/server prisma:generate` 通过。
- `pnpm --filter @mall/server typecheck` 通过。
- `pnpm --filter @mall/api-sdk typecheck` 通过。
- `pnpm --filter @mall/shared-types typecheck` 通过。
- `pnpm --filter @mall/admin-web typecheck` 通过。
- `pnpm --filter @mall/miniapp typecheck` 通过。

未执行：

- Docker MySQL / Redis 当前未确认启动，未执行数据库迁移和完整 smoke。
- 未启动小程序 / 管理后台做运行态视觉复验。
- P8-05 仍不触发资金退款。
- P8-05 仍不接真实物流查询。

下一步：

```text
P8-06：售后退款触发与退款状态回写，或先运行三端做售后链路视觉 / smoke 复验。
```

## 2026-06-18 P8-06 售后退款触发与状态回写

目标：

- 让售后单能复用已有退款能力触发资金退款。
- 退款成功 / 失败后回写售后状态和售后日志。
- 后台页面可以从售后单触发退款，并查看关联退款状态。
- 小程序售后详情可以展示退款进度和失败原因。

本次完成：

- `PaymentService` 抽出内部退款创建流程：
  - 保留用户侧 `POST /api/refunds` 原行为。
  - 新增 `createAfterSaleRefund` 给售后服务复用。
  - 触发售后退款时复用订单 `REFUNDING`、退款单、积分扣回 / 返还和真实微信退款下单逻辑。
- `RefundWorkflowService` 新增售后回写：
  - 退款成功后，关联售后进入 `COMPLETED` 并写入 `completedAt`。
  - 退款失败后，`REFUND_ONLY` 回到 `APPROVED`。
  - 退款失败后，`RETURN_REFUND` 回到 `MERCHANT_RECEIVED`。
  - 退款成功 / 失败均写入 `AfterSaleLog`。
- 后台售后新增接口：
  - `PATCH /api/admin/after-sales/:id/trigger-refund`
  - 仅允许 `APPROVED` 的 `REFUND_ONLY` 或 `MERCHANT_RECEIVED` 的 `RETURN_REFUND` 触发退款。
  - 已有关联 `refundId` 的售后不能重复触发。
- 售后详情响应新增退款快照：
  - `refund.refundNo`
  - `refund.amount`
  - `refund.status`
  - `refund.failureSource`
  - `refund.failureReason`
- `@mall/shared-types` 和 `@mall/api-sdk` 同步新增：
  - `AfterSaleRefundSnapshot`
  - 后台 `triggerAfterSaleRefund`
- 管理后台售后页新增：
  - 满足条件的售后显示“触发退款”按钮。
  - 展开详情展示退款单号、退款状态、退款金额和失败原因。
- 小程序售后详情页新增：
  - 展示退款单号、退款状态、退款金额和失败原因。
  - 更新 `MERCHANT_RECEIVED` / `REFUNDING` 状态说明文案。
- `docs/api-compatibility.md` 补充 P8-06 接口、状态流转和退款回写说明。

修改文件：

- `apps/server/src/modules/payment/payment.service.ts`
- `apps/server/src/modules/payment/refund-workflow.service.ts`
- `apps/server/src/modules/after-sale/after-sale.module.ts`
- `apps/server/src/modules/after-sale/after-sale.service.ts`
- `apps/server/src/modules/after-sale/admin-after-sale.controller.ts`
- `apps/server/src/modules/after-sale/dto/after-sale-response.dto.ts`
- `packages/shared-types/src/index.ts`
- `packages/api-sdk/src/index.ts`
- `packages/api-sdk/src/runtime.js`
- `apps/admin-web/src/api/adminApi.ts`
- `apps/admin-web/src/api/types.ts`
- `apps/admin-web/src/pages/AfterSalePage.tsx`
- `apps/miniapp/src/api/types.ts`
- `apps/miniapp/src/pages/after-sale/detail.tsx`
- `docs/api-compatibility.md`
- `docs/project-progress.md`

已验证：

- `pnpm --filter @mall/server typecheck` 通过。
- `pnpm --filter @mall/api-sdk typecheck` 通过。
- `pnpm --filter @mall/shared-types typecheck` 通过。
- `pnpm --filter @mall/admin-web typecheck` 通过。
- `pnpm --filter @mall/miniapp typecheck` 通过。

未执行：

- Docker MySQL / Redis 当前未确认启动，未执行数据库迁移和完整 smoke。
- 未启动小程序 / 管理后台做运行态视觉复验。
- P8-06 仍不接真实物流查询。
- P8-06 仍不包含换货 / 维修售后类型。

下一步：

```text
P8-07：运行三端做售后退款链路 smoke / 视觉复验，或进入真实物流查询接入。
```
