import { Button, Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';

import { claimCoupon, fetchClaimableCoupons, fetchMyCoupons } from '../../api/couponApi';
import { showApiError } from '../../api/error';
import { Coupon, UserCoupon, UserCouponStatus } from '../../api/types';
import { PageShell } from '../../components/PageShell';
import { useSessionStore } from '../../store/sessionStore';
import './index.css';

const statusTextMap: Record<UserCouponStatus, string> = {
  AVAILABLE: '可使用',
  LOCKED: '已锁定',
  USED: '已使用',
  EXPIRED: '已过期',
  VOID: '已失效',
};

function formatDate(value: string) {
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}.${month}.${day}`;
}

function formatCouponAmount(value: string | number) {
  const amount = Number(value);
  return Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(2);
}

function CouponCard({
  coupon,
  action,
  badge,
}: {
  coupon: Coupon;
  action?: JSX.Element;
  badge?: string;
}) {
  return (
    <View className="coupon-card">
      <View className="coupon-value">
        <Text className="coupon-currency">¥</Text>
        <Text className="coupon-amount">{formatCouponAmount(coupon.discountAmount)}</Text>
      </View>
      <View className="coupon-body">
        <View className="coupon-title-row">
          <Text className="coupon-name">{coupon.name}</Text>
          {badge ? <Text className="coupon-badge">{badge}</Text> : null}
        </View>
        <Text className="coupon-rule">满 {formatCouponAmount(coupon.thresholdAmount)} 可用</Text>
        <Text className="coupon-date">
          {formatDate(coupon.validFrom)} - {formatDate(coupon.validTo)}
        </Text>
      </View>
      {action}
    </View>
  );
}

export default function CouponPage() {
  const accessToken = useSessionStore((state) => state.accessToken);
  const [claimableCoupons, setClaimableCoupons] = useState<Coupon[]>([]);
  const [myCoupons, setMyCoupons] = useState<UserCoupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [claimingId, setClaimingId] = useState<string>();

  const load = async () => {
    if (!accessToken) {
      setClaimableCoupons([]);
      setMyCoupons([]);
      return;
    }

    setLoading(true);
    try {
      const [nextClaimableCoupons, nextMyCoupons] = await Promise.all([
        fetchClaimableCoupons(),
        fetchMyCoupons(),
      ]);
      setClaimableCoupons(nextClaimableCoupons);
      setMyCoupons(nextMyCoupons);
    } catch (error) {
      showApiError(error, '优惠券加载失败');
    } finally {
      setLoading(false);
    }
  };

  useDidShow(() => {
    void load();
  });

  const handleClaim = async (coupon: Coupon) => {
    if (claimingId) {
      return;
    }

    setClaimingId(coupon.id);
    try {
      await claimCoupon(coupon.id);
      void Taro.showToast({ title: '领取成功', icon: 'success' });
      await load();
    } catch (error) {
      showApiError(error, '领取失败');
    } finally {
      setClaimingId(undefined);
    }
  };

  if (!accessToken) {
    return (
      <PageShell>
        <View className="coupon-empty">
          <Text className="coupon-empty-title">请先登录</Text>
          <Text className="coupon-empty-copy">登录后可以领取和查看优惠券。</Text>
          <Button
            className="coupon-primary-button"
            onClick={() => Taro.switchTab({ url: '/pages/user/index' })}
          >
            去登录
          </Button>
        </View>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <View className="coupon-page">
        <View className="coupon-section">
          <View className="coupon-section-header">
            <Text className="coupon-section-title">可领取</Text>
            <Button className="coupon-refresh-button" loading={loading} onClick={() => void load()}>
              刷新
            </Button>
          </View>
          {loading && claimableCoupons.length === 0 ? (
            <View className="coupon-placeholder">
              <Text>正在加载优惠券</Text>
            </View>
          ) : claimableCoupons.length > 0 ? (
            <View className="coupon-list">
              {claimableCoupons.map((coupon) => (
                <CouponCard
                  key={coupon.id}
                  coupon={coupon}
                  action={
                    <Button
                      className="coupon-action-button"
                      disabled={Boolean(claimingId)}
                      loading={claimingId === coupon.id}
                      onClick={() => void handleClaim(coupon)}
                    >
                      领取
                    </Button>
                  }
                />
              ))}
            </View>
          ) : (
            <View className="coupon-placeholder">
              <Text>暂无可领取优惠券</Text>
            </View>
          )}
        </View>

        <View className="coupon-section">
          <View className="coupon-section-header">
            <Text className="coupon-section-title">我的优惠券</Text>
            <Text className="coupon-section-extra">{myCoupons.length} 张</Text>
          </View>
          {loading && myCoupons.length === 0 ? (
            <View className="coupon-placeholder">
              <Text>正在加载优惠券</Text>
            </View>
          ) : myCoupons.length > 0 ? (
            <View className="coupon-list">
              {myCoupons.map((userCoupon) => (
                <CouponCard
                  key={userCoupon.id}
                  coupon={userCoupon.coupon}
                  badge={statusTextMap[userCoupon.status]}
                />
              ))}
            </View>
          ) : (
            <View className="coupon-placeholder">
              <Text>还没有优惠券</Text>
            </View>
          )}
        </View>
      </View>
    </PageShell>
  );
}
