import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Category } from '../../generated/prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const parent = dto.parentId ? await this.findExisting(dto.parentId) : undefined;
    const level = parent ? parent.level + 1 : 1;

    const category = await this.prisma.category.create({
      data: {
        name: dto.name,
        parentId: dto.parentId,
        level,
        path: '',
        sort: dto.sort ?? 0,
        isVisible: dto.isVisible ?? true,
        description: dto.description,
      },
    });

    return this.prisma.category.update({
      where: { id: category.id },
      data: {
        path: parent ? `${parent.path}/${category.id}` : category.id,
      },
    });
  }

  findMany() {
    return this.prisma.category.findMany({
      orderBy: [{ level: 'asc' }, { sort: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findManyPublic() {
    return this.prisma.category.findMany({
      where: { isVisible: true },
      orderBy: [{ level: 'asc' }, { sort: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findTree() {
    const categories = await this.findMany();
    return this.buildTree(categories);
  }

  async findTreePublic() {
    const categories = await this.findManyPublic();
    return this.buildTree(categories);
  }

  async findById(id: string) {
    return this.findExisting(id);
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.findExisting(id);
    const parentId = dto.parentId === undefined ? category.parentId : dto.parentId;

    if (parentId === id) {
      throw new BadRequestException('Category cannot be its own parent');
    }

    const parent = parentId ? await this.findExisting(parentId) : undefined;

    if (parent && `${parent.path}/`.startsWith(`${category.path}/`)) {
      throw new BadRequestException('Category cannot move under its own child');
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        parentId,
        level: parent ? parent.level + 1 : 1,
        sort: dto.sort,
        isVisible: dto.isVisible,
        description: dto.description,
      },
    });

    await this.rebuildPath(updated.id);
    return this.findExisting(id);
  }

  async remove(id: string) {
    await this.findExisting(id);
    const childCount = await this.prisma.category.count({
      where: { parentId: id },
    });

    if (childCount > 0) {
      throw new BadRequestException('Cannot delete category with child categories');
    }

    const productCount = await this.prisma.product.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      throw new BadRequestException('Cannot delete category with products');
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }

  private async findExisting(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  private buildTree(categories: Category[]) {
    const nodeMap = new Map<string, CategoryTreeNode>();
    const roots: CategoryTreeNode[] = [];

    for (const category of categories) {
      nodeMap.set(category.id, {
        ...category,
        children: [],
      });
    }

    for (const category of categories) {
      const node = nodeMap.get(category.id);

      if (!node) {
        continue;
      }

      if (category.parentId) {
        const parent = nodeMap.get(category.parentId);
        if (parent) {
          parent.children.push(node);
          continue;
        }
      }

      roots.push(node);
    }

    return roots;
  }

  private async rebuildPath(id: string) {
    const category = await this.findExisting(id);
    const parent = category.parentId ? await this.findExisting(category.parentId) : undefined;
    const path = parent ? `${parent.path}/${category.id}` : category.id;
    const level = parent ? parent.level + 1 : 1;

    await this.prisma.category.update({
      where: { id: category.id },
      data: { path, level },
    });

    const children = await this.prisma.category.findMany({
      where: { parentId: category.id },
    });

    for (const child of children) {
      await this.rebuildPath(child.id);
    }
  }
}
