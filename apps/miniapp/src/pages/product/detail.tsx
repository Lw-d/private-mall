import { Button, Image, Text, View } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';

import { addCartItem } from '../../api/cartApi';
import { fetchProductDetail } from '../../api/catalogApi';
import { showApiError } from '../../api/error';
import { Product, ProductSku } from '../../api/types';
import { PageShell } from '../../components/PageShell';
import { useSessionStore } from '../../store/sessionStore';
import { getProductCover, getProductPrice, getProductStock } from '../../utils/product';
import './detail.css';

function renderSpecs(sku: ProductSku) {
  if (!sku.specs || Object.keys(sku.specs).length === 0) {
    return sku.name;
  }

  return Object.entries(sku.specs)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' / ');
}

export default function ProductDetailPage() {
  const router = useRouter();
  const productId = router.params.id;
  const accessToken = useSessionStore((state) => state.accessToken);
  const [product, setProduct] = useState<Product>();
  const [selectedSkuId, setSelectedSkuId] = useState<string>();
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  const selectedSku = useMemo(
    () => product?.skus.find((sku) => sku.id === selectedSkuId),
    [product?.skus, selectedSkuId],
  );
  const cover = product ? getProductCover(product) : undefined;
  const stock = product ? getProductStock(product) : 0;
  const displayPrice = selectedSku?.price ?? (product ? getProductPrice(product) : '--');

  const loadProduct = async () => {
    if (!productId) {
      void Taro.showToast({ title: '商品不存在', icon: 'none' });
      return;
    }

    setLoading(true);
    try {
      const detail = await fetchProductDetail(productId);
      const firstAvailableSku = detail.skus.find((sku) => sku.isActive && sku.stock > 0);
      setProduct(detail);
      setSelectedSkuId(firstAvailableSku?.id ?? detail.skus[0]?.id);
      setQuantity(1);
    } catch (error) {
      showApiError(error, '商品加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProduct();
  }, [productId]);

  const changeQuantity = (nextQuantity: number) => {
    if (!selectedSku) {
      return;
    }

    setQuantity(Math.max(1, Math.min(nextQuantity, selectedSku.stock)));
  };

  const handleAddToCart = async () => {
    if (!accessToken) {
      void Taro.showToast({ title: '请先登录', icon: 'none' });
      setTimeout(() => {
        void Taro.switchTab({ url: '/pages/user/index' });
      }, 600);
      return;
    }

    if (!selectedSku) {
      void Taro.showToast({ title: '请选择 SKU', icon: 'none' });
      return;
    }

    if (!selectedSku.isActive || selectedSku.stock <= 0) {
      void Taro.showToast({ title: '当前规格不可购买', icon: 'none' });
      return;
    }

    setAdding(true);
    try {
      await addCartItem({
        skuId: selectedSku.id,
        quantity,
        checked: true,
      });
      void Taro.showToast({ title: '已加入购物车', icon: 'success' });
    } catch (error) {
      showApiError(error, '加入失败');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <PageShell>
        <View className="detail-state">
          <Text className="detail-state-title">正在加载商品</Text>
        </View>
      </PageShell>
    );
  }

  if (!product) {
    return (
      <PageShell>
        <View className="detail-state">
          <Text className="detail-state-title">商品加载失败</Text>
          <Button className="detail-state-button" onClick={() => void loadProduct()}>
            重新加载
          </Button>
        </View>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {cover ? (
        <Image className="detail-image" mode="aspectFill" src={cover} />
      ) : (
        <View className="detail-image detail-image-placeholder">
          <Text>商品</Text>
        </View>
      )}
      <View className="detail-panel">
        <Text className="detail-tag">{product.category?.name ?? '商品详情'}</Text>
        <Text className="detail-title">{product.name}</Text>
        <Text className="detail-subtitle">
          {product.subtitle ?? product.description ?? '暂无详情'}
        </Text>
        <Text className="detail-price">¥{displayPrice}</Text>
        <Text className="detail-stock">总库存 {stock}</Text>
      </View>

      <View className="detail-panel">
        <Text className="panel-title">选择规格</Text>
        <View className="sku-list">
          {product.skus.map((sku) => {
            const disabled = !sku.isActive || sku.stock <= 0;
            return (
              <View
                className={
                  sku.id === selectedSkuId
                    ? 'sku-option active'
                    : disabled
                      ? 'sku-option disabled'
                      : 'sku-option'
                }
                key={sku.id}
                onClick={() => {
                  if (!disabled) {
                    setSelectedSkuId(sku.id);
                    setQuantity(1);
                  }
                }}
              >
                <Text className="sku-name">{sku.name}</Text>
                <Text className="sku-specs">{renderSpecs(sku)}</Text>
                <Text className="sku-meta">
                  ¥{sku.price} / 库存 {sku.stock}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View className="detail-panel quantity-panel">
        <Text className="panel-title">数量</Text>
        <View className="quantity-control">
          <Button
            className="quantity-button"
            disabled={quantity <= 1}
            onClick={() => changeQuantity(quantity - 1)}
          >
            -
          </Button>
          <Text className="quantity-value">{quantity}</Text>
          <Button
            className="quantity-button"
            disabled={!selectedSku || quantity >= selectedSku.stock}
            onClick={() => changeQuantity(quantity + 1)}
          >
            +
          </Button>
        </View>
      </View>

      <View className="detail-actions">
        <Button
          className="secondary-button"
          onClick={() => Taro.switchTab({ url: '/pages/cart/index' })}
        >
          去购物车
        </Button>
        <Button className="primary-button" loading={adding} onClick={handleAddToCart}>
          加入购物车
        </Button>
      </View>
    </PageShell>
  );
}
