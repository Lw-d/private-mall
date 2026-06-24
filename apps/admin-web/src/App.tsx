import {
  AppstoreOutlined,
  DashboardOutlined,
  GiftOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ReconciliationOutlined,
  LogoutOutlined,
  SettingOutlined,
  ShoppingOutlined,
  TagsOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { App as AntdApp, Button, ConfigProvider, Layout, Menu, Space, Typography } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import type { MenuProps } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import { loginAdmin } from './api/adminApi';
import { PageBreadcrumb } from './components/PageBreadcrumb';
import { AfterSalePage } from './pages/AfterSalePage';
import { CategoryPage } from './pages/CategoryPage';
import { CouponPage } from './pages/CouponPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { OrderPage } from './pages/OrderPage';
import { ProductPage } from './pages/ProductPage';
import { SettingPage } from './pages/SettingPage';
import { UserPage } from './pages/UserPage';
import { adminAuthExpiredEventName } from './store/authEvents';
import { useAuthStore } from './store/authStore';
import { bindAppMessage } from './utils/appMessage';

const { Header, Sider, Content } = Layout;

type PageKey =
  | 'dashboard'
  | 'category'
  | 'product'
  | 'coupon'
  | 'order'
  | 'afterSale'
  | 'user'
  | 'setting';

const pagePaths: Record<PageKey, string> = {
  dashboard: '/',
  category: '/categories',
  product: '/products',
  coupon: '/coupons',
  order: '/orders',
  afterSale: '/after-sales',
  user: '/users',
  setting: '/settings',
};

const pageTitles: Record<PageKey, string> = {
  dashboard: '经营概览',
  category: '分类管理',
  product: '商品管理',
  coupon: '优惠券管理',
  order: '订单管理',
  afterSale: '售后管理',
  user: '用户管理',
  setting: '运营设置',
};

function getPageKey(pathname: string): PageKey {
  const entry = Object.entries(pagePaths).find(([, path]) => path === pathname);
  return (entry?.[0] as PageKey | undefined) ?? 'dashboard';
}

export function App() {
  return (
    <ConfigProvider locale={zhCN} theme={{ token: { borderRadius: 6, colorPrimary: '#1677ff' } }}>
      <AntdApp>
        <AdminAppContent />
      </AntdApp>
    </ConfigProvider>
  );
}

function AdminAppContent() {
  const { message } = AntdApp.useApp();
  const { accessToken, nickname, setSession, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const page = getPageKey(location.pathname);
  const expiredNoticeShownRef = useRef(false);
  const [siderCollapsed, setSiderCollapsed] = useState(false);

  useEffect(() => bindAppMessage(message), [message]);

  useEffect(() => {
    if (accessToken) {
      expiredNoticeShownRef.current = false;
    }
  }, [accessToken]);

  useEffect(() => {
    const handleAuthExpired = () => {
      if (expiredNoticeShownRef.current) {
        return;
      }

      expiredNoticeShownRef.current = true;
      logout();
      navigate('/', { replace: true });
      message.warning('登录已失效，请重新登录');
    };

    window.addEventListener(adminAuthExpiredEventName, handleAuthExpired);

    return () => {
      window.removeEventListener(adminAuthExpiredEventName, handleAuthExpired);
    };
  }, [logout, message, navigate]);

  const handleLogin = async (values: { username: string; password: string }) => {
    const result = await loginAdmin(values);
    setSession({
      accessToken: result.accessToken,
      nickname: result.admin.nickname ?? result.admin.username,
    });
  };

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(pagePaths[key as PageKey]);
  };

  return <>{!accessToken ? <LoginPage onLogin={handleLogin} /> : <AdminShell />}</>;

  function AdminShell() {
    return (
      <Layout className="admin-shell">
        <Sider
          width={224}
          collapsedWidth={72}
          collapsed={siderCollapsed}
          trigger={null}
          className="admin-sider"
        >
          <div className="brand">
            <ShoppingOutlined />
            <span>私域商城后台</span>
          </div>
          <Menu
            mode="inline"
            selectedKeys={[page]}
            onClick={handleMenuClick}
            items={[
              { key: 'dashboard', icon: <DashboardOutlined />, label: '经营概览' },
              { key: 'category', icon: <AppstoreOutlined />, label: '分类管理' },
              { key: 'product', icon: <TagsOutlined />, label: '商品管理' },
              { key: 'coupon', icon: <GiftOutlined />, label: '优惠券管理' },
              { key: 'order', icon: <ShoppingOutlined />, label: '订单管理' },
              { key: 'afterSale', icon: <ReconciliationOutlined />, label: '售后管理' },
              { key: 'user', icon: <UserOutlined />, label: '用户管理' },
              { key: 'setting', icon: <SettingOutlined />, label: '运营设置' },
            ]}
          />
        </Sider>
        <Layout className="admin-main">
          <Header className="admin-header">
            <Space size={12} className="header-left">
              <Button
                type="text"
                icon={siderCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setSiderCollapsed((value) => !value)}
              />
              <PageBreadcrumb className="header-breadcrumb" title={pageTitles[page]} />
            </Space>
            <Space>
              <Typography.Text type="secondary">{nickname}</Typography.Text>
              <Button icon={<LogoutOutlined />} onClick={logout} />
            </Space>
          </Header>
          <Content className="admin-content">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/categories" element={<CategoryPage />} />
              <Route path="/products" element={<ProductPage />} />
              <Route path="/coupons" element={<CouponPage />} />
              <Route path="/orders" element={<OrderPage />} />
              <Route path="/after-sales" element={<AfterSalePage />} />
              <Route path="/users" element={<UserPage />} />
              <Route path="/settings" element={<SettingPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    );
  }
}
