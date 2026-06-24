import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductStatus } from '../../generated/prisma/client';

import { CategoryService } from '../category/category.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateHomeBannersDto } from './dto/update-home-banners.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateProductDto) {
    await this.categoryService.findById(dto.categoryId);

    return this.prisma.product.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        subtitle: dto.subtitle,
        description: dto.description,
        status: dto.status,
        sort: dto.sort ?? 0,
        skus: {
          create: dto.skus.map((sku) => ({
            skuCode: sku.skuCode,
            name: sku.name,
            specs: sku.specs ?? Prisma.JsonNull,
            price: sku.price,
            originPrice: sku.originPrice,
            stock: sku.stock,
            isActive: sku.isActive ?? true,
          })),
        },
        images: {
          create: dto.images?.map((image) => ({
            url: image.url,
            sort: image.sort ?? 0,
            isMain: image.isMain ?? false,
          })),
        },
      },
      include: this.detailInclude,
    });
  }

  findMany(query: QueryProductsDto) {
    return this.prisma.product.findMany({
      where: {
        categoryId: query.categoryId,
        status: query.status,
        name: query.keyword
          ? {
              contains: query.keyword,
            }
          : undefined,
      },
      include: this.detailInclude,
      orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
    });
  }

  findManyPublic(query: QueryProductsDto) {
    return this.prisma.product.findMany({
      where: {
        categoryId: query.categoryId,
        status: ProductStatus.ON_SALE,
        name: query.keyword
          ? {
              contains: query.keyword,
            }
          : undefined,
      },
      include: this.detailInclude,
      orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
    });
  }

  findHomeBanners() {
    return this.prisma.homeBanner.findMany({
      where: {
        isActive: true,
        product: {
          status: ProductStatus.ON_SALE,
        },
      },
      include: this.homeBannerInclude,
      orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
    });
  }

  findAdminHomeBanners() {
    return this.prisma.homeBanner.findMany({
      include: this.homeBannerInclude,
      orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async updateHomeBanners(dto: UpdateHomeBannersDto) {
    const productIds = dto.items.map((item) => item.productId);

    if (productIds.length > 0) {
      const productsCount = await this.prisma.product.count({
        where: {
          id: { in: productIds },
        },
      });

      if (productsCount !== productIds.length) {
        throw new BadRequestException('Home banner product does not exist');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.homeBanner.deleteMany();

      if (dto.items.length > 0) {
        await tx.homeBanner.createMany({
          data: dto.items.map((item, index) => ({
            productId: item.productId,
            sort: item.sort ?? index,
            isActive: item.isActive ?? true,
          })),
        });
      }

      return tx.homeBanner.findMany({
        include: this.homeBannerInclude,
        orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
      });
    });
  }

  async findById(id: string) {
    return this.findExisting(id);
  }

  async findPublicById(id: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        status: ProductStatus.ON_SALE,
      },
      include: this.detailInclude,
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findExisting(id);

    if (dto.categoryId) {
      await this.categoryService.findById(dto.categoryId);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.skus) {
        await tx.productSku.deleteMany({ where: { productId: id } });
      }

      if (dto.images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
      }

      return tx.product.update({
        where: { id },
        data: {
          categoryId: dto.categoryId,
          name: dto.name,
          subtitle: dto.subtitle,
          description: dto.description,
          status: dto.status,
          sort: dto.sort,
          skus: dto.skus
            ? {
                create: dto.skus.map((sku) => ({
                  skuCode: sku.skuCode,
                  name: sku.name,
                  specs: sku.specs ?? Prisma.JsonNull,
                  price: sku.price,
                  originPrice: sku.originPrice,
                  stock: sku.stock,
                  isActive: sku.isActive ?? true,
                })),
              }
            : undefined,
          images: dto.images
            ? {
                create: dto.images.map((image) => ({
                  url: image.url,
                  sort: image.sort ?? 0,
                  isMain: image.isMain ?? false,
                })),
              }
            : undefined,
        },
        include: this.detailInclude,
      });
    });
  }

  async updateStatus(id: string, dto: UpdateProductStatusDto) {
    await this.findExisting(id);

    return this.prisma.product.update({
      where: { id },
      data: { status: dto.status },
      include: this.detailInclude,
    });
  }

  async remove(id: string) {
    await this.findExisting(id);

    const orderedItemsCount = await this.prisma.orderItem.count({
      where: {
        OR: [{ productId: id }, { sku: { productId: id } }],
      },
    });

    if (orderedItemsCount > 0) {
      throw new BadRequestException('Product has orders and cannot be deleted');
    }

    return this.prisma.product.delete({
      where: { id },
      include: this.detailInclude,
    });
  }

  async assertCategoryHasNoProducts(categoryId: string) {
    const count = await this.prisma.product.count({
      where: { categoryId },
    });

    if (count > 0) {
      throw new BadRequestException('Cannot delete category with products');
    }
  }

  private async findExisting(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: this.detailInclude,
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  private readonly detailInclude = {
    category: true,
    skus: {
      orderBy: { createdAt: 'asc' },
    },
    images: {
      orderBy: [{ isMain: 'desc' }, { sort: 'asc' }, { createdAt: 'asc' }],
    },
  } satisfies Prisma.ProductInclude;

  private readonly homeBannerInclude = {
    product: {
      include: this.detailInclude,
    },
  } satisfies Prisma.HomeBannerInclude;
}
