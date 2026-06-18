import { Button, Image, Text, Textarea, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';

import { fetchAddresses } from '../../api/addressApi';
import { fetchCart } from '../../api/cartApi';
import { fetchProfile } from '../../api/authApi';
import { fetchAvailableCouponsForOrder } from '../../api/couponApi';
import { showApiError } from '../../api/error';
import { createOrderFromCart } from '../../api/orderApi';
import { fetchPointRedeemRules } from '../../api/pointApi';
import { Cart, CartItem, UserAddress, UserCoupon } from '../../api/types';
import { PageShell } from '../../components/PageShell';
import { resolveAssetUrl } from '../../lib/request';
import { useSessionStore } from '../../store/sessionStore';
import { ORDER_ADDRESS_SELECTED_EVENT, OrderAddressSelectedPayload } from './events';
import './confirm.css';

function renderSpecs(item: CartItem) {
  const specs = item.sku?.specs;
  if (!specs || Object.keys(specs).length === 0) {
    return item.sku?.name ?? '-';
  }

  return Object.entries(specs)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' / ');
}

function getSettlementItems(cart?: Cart) {
  return (cart?.items ?? []).filter((item) => item.checked && item.available && item.sku);
}

function getTotalAmount(items: CartItem[]) {
  return items.reduce((sum, item) => {
    if (!item.sku) {
      return sum;
    }

    return sum + Number(item.sku.price) * item.quantity;
  }, 0);
}

function formatAmount(amount: number) {
  return amount.toFixed(2);
}

function formatCouponAmount(value: string | number) {
  const amount = Number(value);
  return Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(2);
}

function calculatePointRedeem(
  pointsBalance: number,
  amountAfterCoupon: number,
  pointsPerYuan: number,
  enabled: boolean,
) {
  if (!enabled) {
    return {
      pointsUsed: 0,
      discountAmount: 0,
    };
  }

  const maxPointsByAmount = Math.floor(Math.max(amountAfterCoupon, 0) * pointsPerYuan);
  const pointsUsed = Math.min(Math.max(pointsBalance, 0), maxPointsByAmount);

  return {
    pointsUsed,
    discountAmount: pointsUsed / pointsPerYuan,
  };
}

export default function OrderConfirmPage() {
  const accessToken = useSessionStore((state) => state.accessToken);
  const [cart, setCart] = useState<Cart>();
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>();
  const [availableCoupons, setAvailableCoupons] = useState<UserCoupon[]>([]);
  const [selectedCouponId, setSelectedCouponId] = useState<string>();
  const [pointsBalance, setPointsBalance] = useState(0);
  const [pointsEnabled, setPointsEnabled] = useState(true);
  const [pointsPerYuan, setPointsPerYuan] = useState(100);
  const [usePoints, setUsePoints] = useState(false);
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const settlementItems = useMemo(() => getSettlementItems(cart), [cart]);
  const totalQuantity = settlementItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = useMemo(() => getTotalAmount(settlementItems), [settlementItems]);
  const selectedCoupon = availableCoupons.find((coupon) => coupon.id === selectedCouponId);
  const discountAmount = selectedCoupon ? Number(selectedCoupon.coupon.discountAmount) : 0;
  const amountAfterCoupon = Math.max(totalAmount - discountAmount, 0);
  const selectedAddress = addresses.find((address) => address.id === selectedAddressId) ?? null;
  const pointRedeem = calculatePointRedeem(
    pointsBalance,
    amountAfterCoupon,
    pointsPerYuan,
    pointsEnabled,
  );
  const pointsDiscountAmount = usePoints ? pointRedeem.discountAmount : 0;
  const payableAmount = Math.max(amountAfterCoupon - pointsDiscountAmount, 0);

  const loadCart = async () => {
    if (!accessToken) {
      setCart(undefined);
      setAddresses([]);
      setSelectedAddressId(undefined);
      setAvailableCoupons([]);
      setSelectedCouponId(undefined);
      setPointsBalance(0);
      setPointsEnabled(true);
      setPointsPerYuan(100);
      setUsePoints(false);
      return;
    }

    setLoading(true);
    try {
      const nextCart = await fetchCart();
      const nextSettlementItems = getSettlementItems(nextCart);
      const nextTotalAmount = getTotalAmount(nextSettlementItems);
      const [profile, pointRules, nextAddresses, nextAvailableCoupons] = await Promise.all([
        fetchProfile(),
        fetchPointRedeemRules(),
        fetchAddresses(),
        nextTotalAmount > 0 ? fetchAvailableCouponsForOrder(nextTotalAmount.toFixed(2)) : [],
      ]);

      setCart(nextCart);
      setAddresses(nextAddresses);
      setSelectedAddressId((currentAddressId) => {
        if (currentAddressId && nextAddresses.some((address) => address.id === currentAddressId)) {
          return currentAddressId;
        }

        return nextAddresses.find((address) => address.isDefault)?.id ?? nextAddresses[0]?.id;
      });
      setAvailableCoupons(nextAvailableCoupons);
      setSelectedCouponId(nextAvailableCoupons[0]?.id);
      setPointsBalance(profile.pointsBalance);
      setPointsEnabled(pointRules.enabled);
      setPointsPerYuan(pointRules.pointsPerYuan);
      setUsePoints(false);
    } catch (error) {
      showApiError(error, '订单确认加载失败');
    } finally {
      setLoading(false);
    }
  };

  useDidShow(() => {
    void loadCart();
  });

  useEffect(() => {
    const handleAddressSelected = (payload?: OrderAddressSelectedPayload) => {
      if (payload?.addressId) {
        setSelectedAddressId(payload.addressId);
      }
    };

    Taro.eventCenter.on(ORDER_ADDRESS_SELECTED_EVENT, handleAddressSelected);

    return () => {
      Taro.eventCenter.off(ORDER_ADDRESS_SELECTED_EVENT, handleAddressSelected);
    };
  }, []);

  const openAddressSelector = () => {
    const selectedQuery = selectedAddressId
      ? `&selectedAddressId=${encodeURIComponent(selectedAddressId)}`
      : '';

    void Taro.navigateTo({ url: `/pages/address/index?select=1${selectedQuery}` });
  };

  const submitOrder = async () => {
    if (settlementItems.length === 0 || submitting) {
      return;
    }

    if (!selectedAddress) {
      void Taro.showToast({ title: '请先添加收货地址', icon: 'none' });
      return;
    }

    setSubmitting(true);
    try {
      const order = await createOrderFromCart({
        shippingAddressId: selectedAddress.id,
        userCouponId: selectedCouponId,
        usePoints,
        remark: remark.trim() || undefined,
      });

      void Taro.showToast({ title: '订单已创建', icon: 'success' });
      setCart(undefined);
      setAvailableCoupons([]);
      setSelectedCouponId(undefined);
      setUsePoints(false);
      setTimeout(() => {
        void Taro.redirectTo({ url: '/pages/order/list' });
      }, 500);

      return order;
    } catch (error) {
      showApiError(error, '订单创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (!accessToken) {
    return (
      <PageShell>
        <View className="confirm-empty">
          <Text className="confirm-title">请先登录</Text>
          <Text className="confirm-copy">登录后可以从购物车确认商品并创建订单。</Text>
          <Button
            className="confirm-primary-button"
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
        <View className="confirm-empty">
          <Text className="confirm-title">正在加载订单</Text>
        </View>
      </PageShell>
    );
  }

  if (settlementItems.length === 0) {
    return (
      <PageShell>
        <View className="confirm-empty">
          <Text className="confirm-title">暂无可结算商品</Text>
          <Text className="confirm-copy">请先在购物车勾选要购买的商品。</Text>
          <Button
            className="confirm-primary-button"
            onClick={() => Taro.switchTab({ url: '/pages/cart/index' })}
          >
            返回购物车
          </Button>
        </View>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <View className="confirm-content">
        <View className="confirm-section">
          <View className="confirm-section-header">
            <Text className="confirm-section-title">配送信息</Text>
            <Text className="confirm-section-extra" onClick={openAddressSelector}>
              选择/管理
            </Text>
          </View>
          {selectedAddress ? (
            <View className="delivery-card">
              <View className="delivery-title-row">
                <Text className="delivery-name">{selectedAddress.receiverName}</Text>
                <Text className="delivery-phone">{selectedAddress.receiverPhone}</Text>
                {selectedAddress.isDefault ? <Text className="delivery-badge">默认</Text> : null}
              </View>
              <Text className="delivery-copy">
                {selectedAddress.province}
                {selectedAddress.city}
                {selectedAddress.district}
                {selectedAddress.detailAddress}
              </Text>
              {addresses.length > 1 ? (
                <View className="delivery-options">
                  {addresses.map((address) => {
                    const active = address.id === selectedAddressId;

                    return (
                      <View
                        className={active ? 'delivery-option active' : 'delivery-option'}
                        key={address.id}
                        onClick={() => setSelectedAddressId(address.id)}
                      >
                        <View className="delivery-option-body">
                          <View className="delivery-option-title">
                            <Text className="delivery-option-name">{address.receiverName}</Text>
                            <Text className="delivery-option-phone">{address.receiverPhone}</Text>
                            {address.isDefault ? (
                              <Text className="delivery-option-badge">默认</Text>
                            ) : null}
                          </View>
                          <Text className="delivery-option-copy">
                            {address.province}
                            {address.city}
                            {address.district}
                            {address.detailAddress}
                          </Text>
                        </View>
                        <View
                          className={
                            active ? 'delivery-option-check active' : 'delivery-option-check'
                          }
                        >
                          <View className="delivery-option-check-dot" />
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>
          ) : (
            <View className="delivery-card warning" onClick={openAddressSelector}>
              <Text className="delivery-name">暂无收货地址</Text>
              <Text className="delivery-copy">请先添加收货地址后再提交订单。</Text>
            </View>
          )}
        </View>

        <View className="confirm-section">
          <View className="confirm-section-header">
            <Text className="confirm-section-title">商品清单</Text>
            <Text className="confirm-section-extra">共 {totalQuantity} 件</Text>
          </View>

          <View className="confirm-items">
            {settlementItems.map((item) => {
              const imageUrl = resolveAssetUrl(item.product?.mainImage);
              const lineAmount = item.sku
                ? (Number(item.sku.price) * item.quantity).toFixed(2)
                : '--';

              return (
                <View className="confirm-item" key={item.skuId}>
                  <View className="confirm-item-image">
                    {imageUrl ? (
                      <Image className="confirm-image" mode="aspectFill" src={imageUrl} />
                    ) : (
                      <Text className="confirm-image-placeholder">商品</Text>
                    )}
                  </View>

                  <View className="confirm-item-body">
                    <Text className="confirm-product-name">
                      {item.product?.name ?? '商品已失效'}
                    </Text>
                    <Text className="confirm-sku-name">{renderSpecs(item)}</Text>
                    <View className="confirm-price-row">
                      <Text className="confirm-price">¥{item.sku?.price ?? '--'}</Text>
                      <Text className="confirm-quantity">x{item.quantity}</Text>
                    </View>
                    <Text className="confirm-line-amount">小计 ¥{lineAmount}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View className="confirm-section">
          <View className="confirm-section-header">
            <Text className="confirm-section-title">订单备注</Text>
          </View>
          <Textarea
            className="remark-input"
            maxlength={255}
            placeholder="选填，给商家留言"
            value={remark}
            onInput={(event) => setRemark(event.detail.value)}
          />
        </View>

        <View className="confirm-section">
          <View className="confirm-section-header">
            <Text className="confirm-section-title">优惠券</Text>
            <Text className="confirm-section-extra">{availableCoupons.length} 张可用</Text>
          </View>
          {availableCoupons.length > 0 ? (
            <View className="confirm-coupon-list">
              {availableCoupons.map((userCoupon) => {
                const active = userCoupon.id === selectedCouponId;

                return (
                  <View
                    className={active ? 'confirm-coupon-item active' : 'confirm-coupon-item'}
                    key={userCoupon.id}
                    onClick={() => setSelectedCouponId(active ? undefined : userCoupon.id)}
                  >
                    <View className="confirm-coupon-body">
                      <Text className="confirm-coupon-name">{userCoupon.coupon.name}</Text>
                      <Text className="confirm-coupon-rule">
                        满 {formatCouponAmount(userCoupon.coupon.thresholdAmount)} 减{' '}
                        {formatCouponAmount(userCoupon.coupon.discountAmount)}
                      </Text>
                    </View>
                    <View
                      className={active ? 'confirm-coupon-check active' : 'confirm-coupon-check'}
                    >
                      <View className="confirm-coupon-check-dot" />
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View className="confirm-coupon-empty">
              <Text>暂无可用优惠券</Text>
            </View>
          )}
        </View>

        <View className="confirm-section">
          <View className="confirm-section-header">
            <Text className="confirm-section-title">积分抵扣</Text>
            <Text className="confirm-section-extra">{pointsBalance} 积分</Text>
          </View>
          <View
            className={usePoints ? 'confirm-points-card active' : 'confirm-points-card'}
            onClick={() => {
              if (pointRedeem.pointsUsed > 0) {
                setUsePoints(!usePoints);
              }
            }}
          >
            <View className="confirm-points-body">
              <Text className="confirm-points-title">
                {pointsEnabled
                  ? `使用 ${pointRedeem.pointsUsed} 积分抵 ¥${formatAmount(pointRedeem.discountAmount)}`
                  : '积分抵扣暂未开启'}
              </Text>
              <Text className="confirm-points-rule">{pointsPerYuan} 积分可抵 1 元</Text>
            </View>
            <View className={usePoints ? 'confirm-points-switch active' : 'confirm-points-switch'}>
              <View className="confirm-points-switch-dot" />
            </View>
          </View>
        </View>
      </View>

      <View className="confirm-summary">
        <View className="summary-body">
          <Text className="summary-copy">
            商品 ¥{formatAmount(totalAmount)}
            {discountAmount > 0 ? ` · 优惠 -¥${formatAmount(discountAmount)}` : ''}
            {pointsDiscountAmount > 0 ? ` · 积分 -¥${formatAmount(pointsDiscountAmount)}` : ''}
          </Text>
          <Text className="summary-amount">¥{formatAmount(payableAmount)}</Text>
        </View>
        <Button
          className={selectedAddress ? 'submit-order-button' : 'submit-order-button disabled'}
          loading={submitting}
          disabled={!selectedAddress}
          onClick={() => void submitOrder()}
        >
          提交订单
        </Button>
      </View>
    </PageShell>
  );
}
