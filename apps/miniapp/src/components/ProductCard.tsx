import { Image, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';

import { Product } from '../api/types';
import { getProductCover, getProductPrice, getProductStock } from '../utils/product';
import './ProductCard.css';

interface ProductCardProps {
  product: Product;
  compact?: boolean;
}

export function ProductCard({ product, compact = false }: ProductCardProps) {
  const cover = getProductCover(product);
  const price = getProductPrice(product);
  const stock = getProductStock(product);

  const openDetail = () => {
    void Taro.navigateTo({ url: `/pages/product/detail?id=${product.id}` });
  };

  return (
    <View className={compact ? 'product-card compact' : 'product-card'} onClick={openDetail}>
      {cover ? (
        <Image className="product-image" mode="aspectFill" src={cover} />
      ) : (
        <View className="product-image product-image-placeholder">
          <Text>商品</Text>
        </View>
      )}
      <View className="product-body">
        <Text className="product-tag">{product.category?.name ?? '精选'}</Text>
        <Text className="product-name">{product.name}</Text>
        <Text className="product-subtitle">{product.subtitle ?? `库存 ${stock}`}</Text>
        <Text className="product-price">¥{price}</Text>
      </View>
    </View>
  );
}
