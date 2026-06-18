# Mall System

私域商品类微信小程序 Monorepo。

## Apps

- `apps/server`: NestJS API 服务
- `apps/admin-web`: React + Vite 商家后台
- `apps/miniapp`: Taro + React 微信小程序

## Packages

- `packages/shared-types`: 前后端共享类型
- `packages/shared-utils`: 前后端共享工具
- `packages/api-sdk`: API SDK
- `packages/eslint-config`: 统一 ESLint 配置

## Development

```bash
pnpm install
pnpm db:init
pnpm --filter @mall/server start
```

完整本地联调、后台、小程序和 smoke 回归步骤见 [本地联调和回归说明](./docs/local-regression.md)。

真实微信登录 / 支付联调前可执行：

```bash
pnpm integration:check
pnpm integration:record
```

生产部署前可执行：

```bash
pnpm deployment:preflight
```

## Docs

- [技术架构方案](./docs/private-domain-miniapp-architecture.md)
- [开发计划](./docs/development-plan.md)
- [项目进度记录](./docs/project-progress.md)
- [本地联调和回归说明](./docs/local-regression.md)
- [API 兼容说明](./docs/api-compatibility.md)
- [P4 MVP 验收清单](./docs/p4-mvp-acceptance-checklist.md)
- [P4 小程序 MVP 缺口复盘](./docs/p4-miniapp-mvp-gap-review.md)
- [P5 微信联调边界](./docs/p5-wechat-integration-boundary.md)
- [P5 联调部署清单](./docs/p5-integration-deployment-checklist.md)
- [P5 微信联调问题排查](./docs/p5-wechat-troubleshooting.md)
- [P5 当前能力收口清单](./docs/p5-current-capability-closure.md)
- [P5 收尾验收清单](./docs/p5-acceptance-checklist.md)
- [P5 真实支付联调记录模板](./docs/p5-real-payment-test-record-template.md)
- [生产部署前检查清单](./docs/production-readiness-checklist.md)
- [P6 运营增长能力最小范围](./docs/p6-growth-scope.md)
- [P6 运营增长当前能力收口清单](./docs/p6-current-capability-closure.md)
