import { Button, Image, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useCallback, useEffect, useState } from 'react';

import { fetchProfile } from '../../api/authApi';
import { showApiError } from '../../api/error';
import { fetchPointLedger } from '../../api/pointApi';
import { PointLedger } from '../../api/types';
import { PageShell } from '../../components/PageShell';
import { loginWithWechat, normalizeWechatAvatarUrl } from '../../lib/wechatLogin';
import { useSessionStore } from '../../store/sessionStore';
import './index.css';

export default function UserPage() {
  const accessToken = useSessionStore((state) => state.accessToken);
  const user = useSessionStore((state) => state.user);
  const isHydrated = useSessionStore((state) => state.isHydrated);
  const updateUser = useSessionStore((state) => state.updateUser);
  const clearSession = useSessionStore((state) => state.clearSession);
  const [loggingIn, setLoggingIn] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pointLedgers, setPointLedgers] = useState<PointLedger[]>([]);

  const loadProfile = useCallback(
    async (silent = false) => {
      if (!accessToken) {
        return;
      }

      setRefreshing(true);
      try {
        const [profile, ledgers] = await Promise.all([fetchProfile(), fetchPointLedger()]);
        updateUser(profile);
        setPointLedgers(ledgers);
        if (!silent) {
          void Taro.showToast({ title: '资料已更新', icon: 'success' });
        }
      } catch (error) {
        if (!silent) {
          showApiError(error, '资料刷新失败');
        }
      } finally {
        setRefreshing(false);
      }
    },
    [accessToken, updateUser],
  );

  useEffect(() => {
    if (isHydrated && accessToken) {
      void loadProfile(true);
    }
  }, [accessToken, isHydrated, loadProfile]);

  const handleLogin = async () => {
    setLoggingIn(true);
    try {
      await loginWithWechat();
      void Taro.showToast({ title: '登录成功', icon: 'success' });
    } catch (error) {
      showApiError(error, '登录失败');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    setPointLedgers([]);
    void Taro.showToast({ title: '已退出', icon: 'success' });
  };

  const displayName = user?.nickname ?? (accessToken ? '微信昵称' : '微信用户');
  const memberLevel = user?.memberLevel ?? 1;
  const growthValue = user?.growthValue ?? 0;
  const pointsBalance = user?.pointsBalance ?? 0;
  const recentPointLedgers = pointLedgers.slice(0, 3);
  const avatarUrl = normalizeWechatAvatarUrl(user?.avatarUrl);

  return (
    <PageShell>
      <View className="user-card">
        <View className="avatar-placeholder">
          {avatarUrl ? (
            <Image className="user-avatar" mode="aspectFill" src={avatarUrl} />
          ) : (
            <Text>会</Text>
          )}
        </View>
        <View className="user-info">
          <Text className="user-name">{displayName}</Text>
          {!accessToken ? (
            <Text className="user-copy">登录后可查看订单、购物车和会员资料。</Text>
          ) : null}
          <Text className={accessToken ? 'login-status active' : 'login-status'}>
            {accessToken ? '已登录' : '未登录'}
          </Text>
        </View>
      </View>

      <View className="member-card">
        <View className="member-card-head">
          <Text className="member-card-title">会员等级</Text>
          <Text className="member-level">V{memberLevel}</Text>
        </View>
        <View className="member-card-body">
          <Text className="member-copy">
            {accessToken
              ? `当前成长值 ${growthValue} · 积分 ${pointsBalance}`
              : '登录后查看会员等级、成长值和积分'}
          </Text>
          <Text className="member-note">积分可在提交订单时抵扣应付金额</Text>
        </View>
      </View>

      <View className="points-card">
        <View className="points-card-head">
          <Text className="points-title">积分流水</Text>
          <Text className="points-total">{pointsBalance}</Text>
        </View>
        {accessToken && recentPointLedgers.length > 0 ? (
          <View className="points-list">
            {recentPointLedgers.map((ledger) => (
              <View className="points-item" key={ledger.id}>
                <View className="points-item-body">
                  <Text className="points-item-title">{ledger.description ?? '积分变动'}</Text>
                  <Text className="points-item-time">
                    {new Date(ledger.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <Text className="points-item-value">
                  {ledger.points > 0 ? `+${ledger.points}` : ledger.points}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text className="points-empty">
            {accessToken ? '暂无积分流水' : '登录后查看积分流水'}
          </Text>
        )}
      </View>

      <View className="user-menu">
        <View
          className="user-menu-item"
          onClick={() => Taro.navigateTo({ url: '/pages/order/list' })}
        >
          <Text>我的订单</Text>
          <Text className="menu-arrow">›</Text>
        </View>
        <View
          className="user-menu-item"
          onClick={() => Taro.navigateTo({ url: '/pages/after-sale/list' })}
        >
          <View className="user-menu-label">
            <Text>售后记录</Text>
            <Text className="user-menu-badge">可追踪</Text>
          </View>
          <Text className="menu-arrow">›</Text>
        </View>
        <View
          className="user-menu-item"
          onClick={() => Taro.navigateTo({ url: '/pages/address/index' })}
        >
          <View className="user-menu-label">
            <Text>收货地址</Text>
            <Text className="user-menu-badge">可管理</Text>
          </View>
          <Text className="menu-arrow">›</Text>
        </View>
        <View
          className="user-menu-item"
          onClick={() => Taro.navigateTo({ url: '/pages/coupon/index' })}
        >
          <View className="user-menu-label">
            <Text>优惠券</Text>
            <Text className="user-menu-badge">可领取</Text>
          </View>
          <Text className="menu-arrow">›</Text>
        </View>
      </View>

      {accessToken ? (
        <View className="button-row">
          <Button
            className="secondary-login-button"
            loading={refreshing}
            onClick={() => void loadProfile()}
          >
            刷新资料
          </Button>
          <Button className="login-button" onClick={handleLogout}>
            退出登录
          </Button>
        </View>
      ) : (
        <Button className="login-button" loading={loggingIn} onClick={handleLogin}>
          微信登录
        </Button>
      )}
    </PageShell>
  );
}
