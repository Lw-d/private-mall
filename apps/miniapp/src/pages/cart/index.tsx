import { Button, Image, ScrollView, Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useMemo, useState } from 'react';

import {
  clearCart,
  fetchCart,
  removeCheckedCartItems,
  removeCartItem,
  updateCartItemChecked,
  updateCartItemQuantity,
} from '../../api/cartApi';
import { showApiError } from '../../api/error';
import { Cart, CartItem } from '../../api/types';
import { PageShell } from '../../components/PageShell';
import { resolveAssetUrl } from '../../lib/request';
import { useSessionStore } from '../../store/sessionStore';
import './index.css';

function renderSpecs(item: CartItem) {
  const specs = item.sku?.specs;
  if (!specs || Object.keys(specs).length === 0) {
    return item.sku?.name ?? '-';
  }

  return Object.entries(specs)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' / ');
}

function getCheckedAmount(items: CartItem[]) {
  const amount = items.reduce((sum, item) => {
    if (!item.checked || !item.available || !item.sku) {
      return sum;
    }

    return sum + Number(item.sku.price) * item.quantity;
  }, 0);

  return amount.toFixed(2);
}

export default function CartPage() {
  const accessToken = useSessionStore((state) => state.accessToken);
  const [cart, setCart] = useState<Cart>();
  const [loading, setLoading] = useState(false);
  const [batchOperating, setBatchOperating] = useState(false);
  const [operatingSkuId, setOperatingSkuId] = useState<string>();

  const checkedAmount = useMemo(() => getCheckedAmount(cart?.items ?? []), [cart?.items]);

  const loadCart = async () => {
    if (!accessToken) {
      setCart(undefined);
      return;
    }

    setLoading(true);
    try {
      setCart(await fetchCart());
    } catch (error) {
      showApiError(error, '购物车加载失败');
    } finally {
      setLoading(false);
    }
  };

  useDidShow(() => {
    void loadCart();
  });

  const replaceCart = (nextCart: Cart) => {
    setCart(nextCart);
  };

  const operateCartItem = async (skuId: string, action: () => Promise<Cart>) => {
    setOperatingSkuId(skuId);
    try {
      replaceCart(await action());
    } catch (error) {
      showApiError(error, '操作失败');
    } finally {
      setOperatingSkuId(undefined);
    }
  };

  const changeQuantity = (item: CartItem, nextQuantity: number) => {
    if (!item.sku) {
      return;
    }

    const quantity = Math.max(1, Math.min(nextQuantity, item.sku.stock));
    if (quantity === item.quantity) {
      return;
    }

    void operateCartItem(item.skuId, () => updateCartItemQuantity(item.skuId, quantity));
  };

  const toggleChecked = (item: CartItem) => {
    if (!item.available) {
      void Taro.showToast({ title: item.unavailableReason ?? '当前商品不可选', icon: 'none' });
      return;
    }

    void operateCartItem(item.skuId, () => updateCartItemChecked(item.skuId, !item.checked));
  };

  const deleteItem = async (item: CartItem) => {
    const result = await Taro.showModal({
      title: '删除商品',
      content: `确认从购物车移除 ${item.product?.name ?? '该商品'}？`,
      confirmText: '删除',
      confirmColor: '#dc2626',
    });

    if (result.confirm) {
      void operateCartItem(item.skuId, () => removeCartItem(item.skuId));
    }
  };

  const deleteCheckedItems = async () => {
    if (!cart?.summary.checkedCount) {
      void Taro.showToast({ title: '请先选择商品', icon: 'none' });
      return;
    }

    const result = await Taro.showModal({
      title: '批量删除',
      content: `确认删除已选的 ${cart.summary.checkedCount} 个商品？`,
      confirmText: '删除',
      confirmColor: '#dc2626',
    });

    if (!result.confirm) {
      return;
    }

    setBatchOperating(true);
    try {
      replaceCart(await removeCheckedCartItems());
      void Taro.showToast({ title: '已删除', icon: 'success' });
    } catch (error) {
      showApiError(error, '批量删除失败');
    } finally {
      setBatchOperating(false);
    }
  };

  const clearAllCartItems = async () => {
    const result = await Taro.showModal({
      title: '清空购物车',
      content: '确认清空购物车内所有商品？',
      confirmText: '清空',
      confirmColor: '#dc2626',
    });

    if (!result.confirm) {
      return;
    }

    setBatchOperating(true);
    try {
      replaceCart(await clearCart());
      void Taro.showToast({ title: '已清空', icon: 'success' });
    } catch (error) {
      showApiError(error, '清空失败');
    } finally {
      setBatchOperating(false);
    }
  };

  const openProduct = (item: CartItem) => {
    if (!item.product?.id) {
      return;
    }

    void Taro.navigateTo({ url: `/pages/product/detail?id=${item.product.id}` });
  };

  if (!accessToken) {
    return (
      <PageShell>
        <View className="cart-empty">
          <Text className="cart-title">请先登录</Text>
          <Text className="cart-copy">登录后可以同步购物车，继续完成下单和支付。</Text>
          <Button
            className="cart-button"
            onClick={() => Taro.switchTab({ url: '/pages/user/index' })}
          >
            去登录
          </Button>
        </View>
      </PageShell>
    );
  }

  if (loading && !cart) {
    return (
      <PageShell>
        <View className="cart-empty">
          <Text className="cart-title">正在加载购物车</Text>
        </View>
      </PageShell>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <PageShell>
        <View className="cart-empty">
          <Text className="cart-title">购物车是空的</Text>
          <Text className="cart-copy">去挑选商品，加入购物车后会显示在这里。</Text>
          <Button
            className="cart-button"
            onClick={() => Taro.switchTab({ url: '/pages/home/index' })}
          >
            去逛逛
          </Button>
        </View>
      </PageShell>
    );
  }

  return (
    <PageShell className="cart-page-shell">
      <View className="cart-actions">
        <View className="cart-actions-buttons">
          <Button
            className="cart-action-button"
            disabled={batchOperating || cart.summary.checkedCount === 0}
            onClick={() => void deleteCheckedItems()}
          >
            删除已选
          </Button>
          <Button
            className="cart-action-button danger"
            disabled={batchOperating || cart.items.length === 0}
            onClick={() => void clearAllCartItems()}
          >
            清空
          </Button>
        </View>
      </View>

      <ScrollView className="cart-list" scrollY>
        {cart.items.map((item) => {
          const imageUrl = resolveAssetUrl(item.product?.mainImage);
          const isOperating = operatingSkuId === item.skuId;

          return (
            <View className="cart-item" key={item.skuId}>
              <View
                className={item.checked && item.available ? 'check-button active' : 'check-button'}
                onClick={() => toggleChecked(item)}
              >
                <Text>{item.checked && item.available ? '✓' : ''}</Text>
              </View>

              <View className="cart-product-image" onClick={() => openProduct(item)}>
                {imageUrl ? (
                  <Image className="cart-image" mode="aspectFill" src={imageUrl} />
                ) : (
                  <Text className="cart-image-placeholder">商品</Text>
                )}
              </View>

              <View className="cart-product-body">
                <View onClick={() => openProduct(item)}>
                  <Text className="cart-product-name">{item.product?.name ?? '商品已失效'}</Text>
                  <Text className="cart-sku-name">{renderSpecs(item)}</Text>
                  {!item.available ? (
                    <Text className="unavailable-label">
                      {item.unavailableReason ?? '当前不可购买'}
                    </Text>
                  ) : null}
                </View>

                <View className="cart-row">
                  <Text className="cart-price">¥{item.sku?.price ?? '--'}</Text>
                  <View className="quantity-control">
                    <Button
                      className="quantity-button"
                      disabled={isOperating || item.quantity <= 1}
                      onClick={() => changeQuantity(item, item.quantity - 1)}
                    >
                      -
                    </Button>
                    <Text className="quantity-value">{item.quantity}</Text>
                    <Button
                      className="quantity-button"
                      disabled={isOperating || !item.sku || item.quantity >= item.sku.stock}
                      onClick={() => changeQuantity(item, item.quantity + 1)}
                    >
                      +
                    </Button>
                  </View>
                </View>

                <Text className="delete-link" onClick={() => void deleteItem(item)}>
                  删除
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View className="cart-summary">
        <View>
          <Text className="summary-count">已选 {cart.summary.checkedQuantity} 件</Text>
          <Text className="summary-price">合计 ¥{checkedAmount}</Text>
        </View>
        <Button
          className="checkout-button"
          disabled={cart.summary.checkedQuantity === 0}
          onClick={() => Taro.navigateTo({ url: '/pages/order/confirm' })}
        >
          去结算
        </Button>
      </View>
    </PageShell>
  );
}
