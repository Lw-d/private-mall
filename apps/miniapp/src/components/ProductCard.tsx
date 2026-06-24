import { Button, Image, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import type { ITouchEvent } from '@tarojs/components';

import { addCartItem } from '../api/cartApi';
import { showApiError } from '../api/error';
import { Product } from '../api/types';
import { getProductCover, getProductPrice, getProductStock } from '../utils/product';
import './ProductCard.css';

interface ProductCardProps {
  product: Product;
  compact?: boolean;
  showQuickCart?: boolean;
}

export function ProductCard({ product, compact = false, showQuickCart = false }: ProductCardProps) {
  const cover = getProductCover(product);
  const price = getProductPrice(product);
  const stock = getProductStock(product);
  const firstAvailableSku = product.skus.find((sku) => sku.isActive && sku.stock > 0);

  const openDetail = () => {
    void Taro.navigateTo({ url: `/pages/product/detail?id=${product.id}` });
  };

  const quickAddCart = async (event: ITouchEvent) => {
    event.stopPropagation();

    if (!firstAvailableSku) {
      void Taro.showToast({ title: '暂无可售规格', icon: 'none' });
      return;
    }

    try {
      await addCartItem({ skuId: firstAvailableSku.id, quantity: 1, checked: true });
      void Taro.showToast({ title: '已加入购物车', icon: 'success' });
    } catch (error) {
      showApiError(error, '加入购物车失败');
    }
  };

  return (
    <View className={compact ? 'product-card compact' : 'product-card'} onClick={openDetail}>
      {cover ? (
        <Image className="product-image" mode="aspectFit" src={cover} />
      ) : (
        <View className="product-image product-image-placeholder">
          <Text>商品</Text>
        </View>
      )}
      <View className="product-body">
        <Text className="product-tag">{product.category?.name ?? '精选'}</Text>
        <Text className="product-name">{product.name}</Text>
        <Text className="product-subtitle">{product.subtitle ?? `库存 ${stock}`}</Text>
        <View className="product-footer">
          <Text className="product-price">¥{price}</Text>
          {showQuickCart ? (
            <Button
              className="product-cart-button"
              disabled={!firstAvailableSku}
              onClick={quickAddCart}
            >
              +
            </Button>
          ) : null}
        </View>
      </View>
    </View>
  );
}
