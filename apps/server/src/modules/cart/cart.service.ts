import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductStatus } from '../../generated/prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemCheckedDto } from './dto/update-cart-item-checked.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

interface StoredCartItem {
  skuId: string;
  quantity: number;
  checked: boolean;
  addedAt: string;
  updatedAt: string;
}

export interface CheckedCartItem {
  skuId: string;
  quantity: number;
}

type CartSku = Prisma.ProductSkuGetPayload<{
  include: {
    product: {
      include: {
        images: true;
      };
    };
  };
}>;

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async findCart(userId: string) {
    const items = await this.getStoredItems(userId);
    const skuIds = items.map((item) => item.skuId);
    const skus = skuIds.length
      ? await this.prisma.productSku.findMany({
          where: { id: { in: skuIds } },
          include: {
            product: {
              include: {
                images: {
                  orderBy: [{ isMain: 'desc' }, { sort: 'asc' }, { createdAt: 'asc' }],
                },
              },
            },
          },
        })
      : [];
    const skuMap = new Map(skus.map((sku) => [sku.id, sku]));

    const enrichedItems = items.map((item) => {
      const sku = skuMap.get(item.skuId);
      const product = sku?.product;
      const available =
        Boolean(sku?.isActive) &&
        Boolean(product) &&
        product?.status === ProductStatus.ON_SALE &&
        (sku?.stock ?? 0) >= item.quantity;

      return {
        ...item,
        available,
        unavailableReason: this.resolveUnavailableReason(item.quantity, sku),
        sku: sku
          ? {
              id: sku.id,
              skuCode: sku.skuCode,
              name: sku.name,
              specs: sku.specs,
              price: sku.price,
              originPrice: sku.originPrice,
              stock: sku.stock,
              isActive: sku.isActive,
            }
          : null,
        product: product
          ? {
              id: product.id,
              name: product.name,
              subtitle: product.subtitle,
              status: product.status,
              mainImage: product.images[0]?.url ?? null,
            }
          : null,
      };
    });

    return {
      items: enrichedItems,
      summary: {
        totalQuantity: enrichedItems.reduce((sum, item) => sum + item.quantity, 0),
        checkedQuantity: enrichedItems
          .filter((item) => item.checked)
          .reduce((sum, item) => sum + item.quantity, 0),
        checkedCount: enrichedItems.filter((item) => item.checked).length,
      },
    };
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    await this.assertSkuCanAdd(dto.skuId, dto.quantity);

    const items = await this.getStoredItems(userId);
    const now = new Date().toISOString();
    const existing = items.find((item) => item.skuId === dto.skuId);

    if (existing) {
      existing.quantity += dto.quantity;
      existing.checked = dto.checked ?? existing.checked;
      existing.updatedAt = now;
      await this.assertSkuCanAdd(dto.skuId, existing.quantity);
    } else {
      items.push({
        skuId: dto.skuId,
        quantity: dto.quantity,
        checked: dto.checked ?? true,
        addedAt: now,
        updatedAt: now,
      });
    }

    await this.saveStoredItems(userId, items);
    return this.findCart(userId);
  }

  async updateItem(userId: string, skuId: string, dto: UpdateCartItemDto) {
    await this.assertSkuCanAdd(skuId, dto.quantity);
    const items = await this.getStoredItems(userId);
    const item = this.findStoredItem(items, skuId);
    item.quantity = dto.quantity;
    item.updatedAt = new Date().toISOString();
    await this.saveStoredItems(userId, items);
    return this.findCart(userId);
  }

  async updateChecked(userId: string, skuId: string, dto: UpdateCartItemCheckedDto) {
    const items = await this.getStoredItems(userId);
    const item = this.findStoredItem(items, skuId);
    item.checked = dto.checked;
    item.updatedAt = new Date().toISOString();
    await this.saveStoredItems(userId, items);
    return this.findCart(userId);
  }

  async removeItem(userId: string, skuId: string) {
    const items = await this.getStoredItems(userId);
    const nextItems = items.filter((item) => item.skuId !== skuId);

    if (nextItems.length === items.length) {
      throw new NotFoundException('Cart item not found');
    }

    await this.saveStoredItems(userId, nextItems);
    return this.findCart(userId);
  }

  async removeCheckedCartItems(userId: string) {
    const items = await this.getStoredItems(userId);
    const nextItems = items.filter((item) => !item.checked);

    await this.saveStoredItems(userId, nextItems);
    return this.findCart(userId);
  }

  async clearCart(userId: string) {
    await this.saveStoredItems(userId, []);
    return this.findCart(userId);
  }

  async getCheckedItems(userId: string): Promise<CheckedCartItem[]> {
    const items = await this.getStoredItems(userId);
    return items
      .filter((item) => item.checked)
      .map((item) => ({
        skuId: item.skuId,
        quantity: item.quantity,
      }));
  }

  async removeCheckedItems(userId: string, skuIds: string[]) {
    const skuSet = new Set(skuIds);
    const items = await this.getStoredItems(userId);
    const nextItems = items.filter((item) => !skuSet.has(item.skuId));
    await this.saveStoredItems(userId, nextItems);
  }

  private async assertSkuCanAdd(skuId: string, quantity: number) {
    const sku = await this.prisma.productSku.findUnique({
      where: { id: skuId },
      include: { product: true },
    });

    if (!sku) {
      throw new NotFoundException('SKU not found');
    }

    if (!sku.isActive) {
      throw new BadRequestException('SKU is inactive');
    }

    if (sku.product.status !== ProductStatus.ON_SALE) {
      throw new BadRequestException('Product is not on sale');
    }

    if (sku.stock < quantity) {
      throw new BadRequestException('Insufficient SKU stock');
    }
  }

  private findStoredItem(items: StoredCartItem[], skuId: string) {
    const item = items.find((cartItem) => cartItem.skuId === skuId);

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    return item;
  }

  private resolveUnavailableReason(quantity: number, sku?: CartSku) {
    if (!sku) {
      return 'SKU not found';
    }

    if (!sku.isActive) {
      return 'SKU is inactive';
    }

    if (sku.product.status !== ProductStatus.ON_SALE) {
      return 'Product is not on sale';
    }

    if (sku.stock < quantity) {
      return 'Insufficient SKU stock';
    }

    return null;
  }

  private async getStoredItems(userId: string) {
    const raw = await this.redisService.getClient().get(this.getCartKey(userId));
    return raw ? (JSON.parse(raw) as StoredCartItem[]) : [];
  }

  private async saveStoredItems(userId: string, items: StoredCartItem[]) {
    await this.redisService.getClient().set(this.getCartKey(userId), JSON.stringify(items));
  }

  private getCartKey(userId: string) {
    return `cart:${userId}`;
  }
}
