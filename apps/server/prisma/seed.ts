import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes, scryptSync } from 'node:crypto';

import {
  AdminRole,
  AdminStatus,
  CouponStatus,
  Prisma,
  PrismaClient,
  ProductStatus,
  UserStatus,
  UserCouponStatus,
} from '../src/generated/prisma/client';

function loadEnvFile(filename: string) {
  const filePath = resolve(process.cwd(), filename);

  if (!existsSync(filePath)) {
    return;
  }

  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, '');

    process.env[key] ??= value;
  }
}

loadEnvFile('.env');
loadEnvFile('.env.local');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required before running seed.');
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

const categoryIds = {
  skincare: 'seed-cat-skincare',
  essence: 'seed-cat-essence',
  lifestyle: 'seed-cat-lifestyle',
};

const productIds = {
  cream: 'seed-product-cream',
  serum: 'seed-product-serum',
  diffuser: 'seed-product-diffuser',
};

const seedUserOpenId = 'seed-miniapp-user-openid';
const seedAddressId = 'seed-address-default';
const seedCouponId = 'seed-coupon-new-user-20';
const seedUserCouponId = 'seed-user-coupon-new-user-20';
const seedAdminPassword = process.env.ADMIN_DEFAULT_PASSWORD ?? 'Admin123456';

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function seedAdmin() {
  const username = process.env.ADMIN_DEFAULT_USERNAME ?? 'admin';

  await prisma.admin.upsert({
    where: { username },
    create: {
      username,
      passwordHash: hashPassword(seedAdminPassword),
      nickname: '超级管理员',
      role: AdminRole.SUPER_ADMIN,
      status: AdminStatus.ACTIVE,
    },
    update: {
      nickname: '超级管理员',
      role: AdminRole.SUPER_ADMIN,
      status: AdminStatus.ACTIVE,
    },
  });
}

async function upsertCategory(input: {
  id: string;
  name: string;
  parentId?: string;
  level: number;
  path: string;
  sort: number;
  description: string;
}) {
  await prisma.category.upsert({
    where: { id: input.id },
    create: {
      id: input.id,
      name: input.name,
      parentId: input.parentId,
      level: input.level,
      path: input.path,
      sort: input.sort,
      isVisible: true,
      description: input.description,
    },
    update: {
      name: input.name,
      parentId: input.parentId ?? null,
      level: input.level,
      path: input.path,
      sort: input.sort,
      isVisible: true,
      description: input.description,
    },
  });
}

async function seedCategories() {
  await upsertCategory({
    id: categoryIds.skincare,
    name: '护肤护理',
    level: 1,
    path: categoryIds.skincare,
    sort: 10,
    description: '小程序回归测试用一级分类',
  });

  await upsertCategory({
    id: categoryIds.lifestyle,
    name: '生活香氛',
    level: 1,
    path: categoryIds.lifestyle,
    sort: 20,
    description: '小程序回归测试用一级分类',
  });

  await upsertCategory({
    id: categoryIds.essence,
    name: '精华面霜',
    parentId: categoryIds.skincare,
    level: 2,
    path: `${categoryIds.skincare}/${categoryIds.essence}`,
    sort: 10,
    description: '用于验证分类树和商品筛选',
  });
}

async function upsertProduct(input: {
  id: string;
  categoryId: string;
  name: string;
  subtitle: string;
  description: string;
  sort: number;
  imageUrl: string;
  skus: Array<{
    skuCode: string;
    name: string;
    specs: Prisma.InputJsonValue;
    price: string;
    originPrice: string;
    stock: number;
  }>;
}) {
  await prisma.product.upsert({
    where: { id: input.id },
    create: {
      id: input.id,
      categoryId: input.categoryId,
      name: input.name,
      subtitle: input.subtitle,
      description: input.description,
      status: ProductStatus.ON_SALE,
      sort: input.sort,
    },
    update: {
      categoryId: input.categoryId,
      name: input.name,
      subtitle: input.subtitle,
      description: input.description,
      status: ProductStatus.ON_SALE,
      sort: input.sort,
    },
  });

  await prisma.productImage.deleteMany({
    where: { productId: input.id },
  });

  await prisma.productImage.create({
    data: {
      productId: input.id,
      url: input.imageUrl,
      isMain: true,
      sort: 0,
    },
  });

  for (const sku of input.skus) {
    await prisma.productSku.upsert({
      where: { skuCode: sku.skuCode },
      create: {
        productId: input.id,
        skuCode: sku.skuCode,
        name: sku.name,
        specs: sku.specs,
        price: sku.price,
        originPrice: sku.originPrice,
        stock: sku.stock,
        isActive: true,
      },
      update: {
        productId: input.id,
        name: sku.name,
        specs: sku.specs,
        price: sku.price,
        originPrice: sku.originPrice,
        stock: sku.stock,
        isActive: true,
      },
    });
  }
}

async function seedProducts() {
  await upsertProduct({
    id: productIds.cream,
    categoryId: categoryIds.essence,
    name: '修护精华面霜',
    subtitle: '适合完整交易链路回归的默认上架商品',
    description: '含多 SKU、价格、库存和主图，可用于首页、详情、购物车、下单、支付全链路测试。',
    sort: 10,
    imageUrl:
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=900&q=80',
    skus: [
      {
        skuCode: 'SEED-CREAM-50ML',
        name: '50ml',
        specs: { 容量: '50ml' },
        price: '209.00',
        originPrice: '259.00',
        stock: 120,
      },
      {
        skuCode: 'SEED-CREAM-100ML',
        name: '100ml',
        specs: { 容量: '100ml' },
        price: '359.00',
        originPrice: '429.00',
        stock: 80,
      },
    ],
  });

  await upsertProduct({
    id: productIds.serum,
    categoryId: categoryIds.essence,
    name: '亮采精华液',
    subtitle: '用于验证列表多商品展示和 SKU 切换',
    description: '默认上架，带两档规格，适合回归商品列表、详情和结算金额计算。',
    sort: 20,
    imageUrl:
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=900&q=80',
    skus: [
      {
        skuCode: 'SEED-SERUM-30ML',
        name: '30ml',
        specs: { 容量: '30ml' },
        price: '169.00',
        originPrice: '199.00',
        stock: 90,
      },
      {
        skuCode: 'SEED-SERUM-60ML',
        name: '60ml',
        specs: { 容量: '60ml' },
        price: '299.00',
        originPrice: '349.00',
        stock: 60,
      },
    ],
  });

  await upsertProduct({
    id: productIds.diffuser,
    categoryId: categoryIds.lifestyle,
    name: '木质调香氛',
    subtitle: '用于验证跨分类商品筛选',
    description: '生活香氛分类下的默认商品，帮助验证分类页切换和首页多品类展示。',
    sort: 30,
    imageUrl:
      'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=80',
    skus: [
      {
        skuCode: 'SEED-DIFFUSER-120ML',
        name: '120ml',
        specs: { 香型: '雪松琥珀', 容量: '120ml' },
        price: '129.00',
        originPrice: '159.00',
        stock: 100,
      },
    ],
  });
}

async function seedUser() {
  await prisma.user.upsert({
    where: { openId: seedUserOpenId },
    create: {
      openId: seedUserOpenId,
      nickname: '小程序回归用户',
      avatarUrl: '',
      phone: '13800000000',
      status: UserStatus.ACTIVE,
      memberLevel: 2,
      growthValue: 1280,
      pointsBalance: 320,
      lastLoginAt: new Date(),
    },
    update: {
      nickname: '小程序回归用户',
      phone: '13800000000',
      status: UserStatus.ACTIVE,
      memberLevel: 2,
      growthValue: 1280,
      pointsBalance: 320,
    },
  });
}

async function seedCoupon() {
  await prisma.coupon.upsert({
    where: { id: seedCouponId },
    create: {
      id: seedCouponId,
      name: '新人满 99 减 20',
      code: 'NEW_USER_20',
      thresholdAmount: '99.00',
      discountAmount: '20.00',
      totalStock: 1000,
      claimedCount: 1,
      perUserLimit: 1,
      validFrom: new Date('2026-01-01T00:00:00.000Z'),
      validTo: new Date('2027-12-31T23:59:59.999Z'),
      status: CouponStatus.ACTIVE,
      description: '小程序优惠券回归测试用满减券',
    },
    update: {
      name: '新人满 99 减 20',
      thresholdAmount: '99.00',
      discountAmount: '20.00',
      totalStock: 1000,
      perUserLimit: 1,
      validFrom: new Date('2026-01-01T00:00:00.000Z'),
      validTo: new Date('2027-12-31T23:59:59.999Z'),
      status: CouponStatus.ACTIVE,
      description: '小程序优惠券回归测试用满减券',
    },
  });

  const user = await prisma.user.findUniqueOrThrow({
    where: { openId: seedUserOpenId },
  });

  await prisma.userCoupon.upsert({
    where: { id: seedUserCouponId },
    create: {
      id: seedUserCouponId,
      userId: user.id,
      couponId: seedCouponId,
      status: UserCouponStatus.AVAILABLE,
    },
    update: {
      userId: user.id,
      couponId: seedCouponId,
      status: UserCouponStatus.AVAILABLE,
      lockedAt: null,
      usedAt: null,
      orderId: null,
    },
  });
}

async function seedAddress() {
  const user = await prisma.user.findUniqueOrThrow({
    where: { openId: seedUserOpenId },
  });

  await prisma.userAddress.upsert({
    where: { id: seedAddressId },
    create: {
      id: seedAddressId,
      userId: user.id,
      receiverName: '小程序回归用户',
      receiverPhone: '13800000000',
      province: '广东省',
      city: '深圳市',
      district: '南山区',
      detailAddress: '科技园 Smoke 测试地址 1001',
      postalCode: '518000',
      isDefault: true,
    },
    update: {
      userId: user.id,
      receiverName: '小程序回归用户',
      receiverPhone: '13800000000',
      province: '广东省',
      city: '深圳市',
      district: '南山区',
      detailAddress: '科技园 Smoke 测试地址 1001',
      postalCode: '518000',
      isDefault: true,
    },
  });

  await prisma.userAddress.updateMany({
    where: {
      userId: user.id,
      id: { not: seedAddressId },
      isDefault: true,
    },
    data: { isDefault: false },
  });
}

async function main() {
  await seedAdmin();
  await seedCategories();
  await seedProducts();
  await seedUser();
  await seedAddress();
  await seedCoupon();

  const [categoryCount, productCount, skuCount, couponCount, addressCount] = await Promise.all([
    prisma.category.count({ where: { id: { in: Object.values(categoryIds) } } }),
    prisma.product.count({ where: { id: { in: Object.values(productIds) } } }),
    prisma.productSku.count({
      where: {
        skuCode: {
          in: [
            'SEED-CREAM-50ML',
            'SEED-CREAM-100ML',
            'SEED-SERUM-30ML',
            'SEED-SERUM-60ML',
            'SEED-DIFFUSER-120ML',
          ],
        },
      },
    }),
    prisma.coupon.count({ where: { id: seedCouponId } }),
    prisma.userAddress.count({ where: { id: seedAddressId } }),
  ]);

  console.log(
    `Seed completed: ${categoryCount} categories, ${productCount} products, ${skuCount} SKUs, ${couponCount} coupons, ${addressCount} addresses.`,
  );
  console.log(
    `Admin login: ${process.env.ADMIN_DEFAULT_USERNAME ?? 'admin'} / ${seedAdminPassword}`,
  );
  console.log(`Miniapp mock openId: ${seedUserOpenId}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
