import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';

import { fetchCategoryTree, fetchProducts } from '../../api/catalogApi';
import { showApiError } from '../../api/error';
import { Category, Product } from '../../api/types';
import { PageShell } from '../../components/PageShell';
import { ProductCard } from '../../components/ProductCard';
import './index.css';

interface FlatCategory {
  id: string;
  name: string;
  level: number;
}

function flattenCategories(categories: Category[]): FlatCategory[] {
  return categories.flatMap((category) => [
    {
      id: category.id,
      name: category.name,
      level: category.level,
    },
    ...flattenCategories(category.children ?? []),
  ]);
}

export default function CategoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>();
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const categoryOptions = useMemo(() => flattenCategories(categories), [categories]);
  const selectedCategory = categoryOptions.find((category) => category.id === selectedCategoryId);

  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      setCategories(await fetchCategoryTree());
    } catch (error) {
      showApiError(error, '分类加载失败');
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadProducts = async (categoryId?: string) => {
    setLoadingProducts(true);
    try {
      setProducts(await fetchProducts({ categoryId }));
    } catch (error) {
      showApiError(error, '商品加载失败');
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  useEffect(() => {
    void loadProducts(selectedCategoryId);
  }, [selectedCategoryId]);

  return (
    <PageShell className="category-page-shell">
      <View className="category-layout">
        <View className="category-menu">
          <Text
            className={!selectedCategoryId ? 'category-menu-item active' : 'category-menu-item'}
            onClick={() => setSelectedCategoryId(undefined)}
          >
            全部商品
          </Text>
          {categoryOptions.map((category) => (
            <Text
              className={
                category.id === selectedCategoryId
                  ? 'category-menu-item active'
                  : 'category-menu-item'
              }
              key={category.id}
              onClick={() => setSelectedCategoryId(category.id)}
              style={{ paddingLeft: `${18 + Math.max(category.level - 1, 0) * 12}px` }}
            >
              {category.name}
            </Text>
          ))}
          {loadingCategories ? <Text className="menu-loading">加载中</Text> : null}
        </View>
        <View className="category-content">
          <Text className="category-title">{selectedCategory?.name ?? '全部商品'}</Text>
          {loadingProducts ? (
            <View className="category-state">
              <Text className="placeholder-title">正在加载商品</Text>
            </View>
          ) : products.length > 0 ? (
            <View className="category-products">
              {products.map((product) => (
                <ProductCard compact product={product} key={product.id} showQuickCart />
              ))}
            </View>
          ) : (
            <View className="category-state">
              <Text className="placeholder-title">暂无商品</Text>
              <Text className="placeholder-copy">当前分类还没有上架商品。</Text>
            </View>
          )}
        </View>
      </View>
    </PageShell>
  );
}
