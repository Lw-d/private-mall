# Docker Development Services

本目录用于本地开发依赖服务。

## Start

```bash
pnpm db:up
```

## Stop

```bash
pnpm db:down
```

## Services

- MySQL: `localhost:3306`
- Redis: `localhost:6379`

默认数据库连接：

```text
mysql://mall:mall_password@localhost:3306/mall_system
```

## Initialize Data

启动 Docker 后，可执行完整数据库初始化：

```bash
pnpm db:init
```

该命令会应用 Prisma migration 并写入本地 seed 数据。更多联调和回归步骤见：

```text
docs/local-regression.md
```
