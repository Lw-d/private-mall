import {
  AppstoreOutlined,
  DashboardOutlined,
  GiftOutlined,
  ReconciliationOutlined,
  LogoutOutlined,
  SettingOutlined,
  ShoppingOutlined,
  TagsOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, ConfigProvider, Layout, Menu, Space, Typography } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import type { MenuProps } from 'antd';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import { loginAdmin } from './api/adminApi';
import { AfterSalePage } from './pages/AfterSalePage';
import { CategoryPage } from './pages/CategoryPage';
import { CouponPage } from './pages/CouponPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { OrderPage } from './pages/OrderPage';
import { ProductPage } from './pages/ProductPage';
import { SettingPage } from './pages/SettingPage';
import { UserPage } from './pages/UserPage';
import { useAuthStore } from './store/authStore';

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

function getPageKey(pathname: string): PageKey {
  const entry = Object.entries(pagePaths).find(([, path]) => path === pathname);
  return (entry?.[0] as PageKey | undefined) ?? 'dashboard';
}

export function App() {
  const { accessToken, nickname, setSession, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const page = getPageKey(location.pathname);

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

  return (
    <ConfigProvider locale={zhCN} theme={{ token: { borderRadius: 6, colorPrimary: '#1677ff' } }}>
      {!accessToken ? (
        <LoginPage onLogin={handleLogin} />
      ) : (
        <Layout className="admin-shell">
          <Sider width={224} className="admin-sider">
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
              <Typography.Text strong>商家工作台</Typography.Text>
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
      )}
    </ConfigProvider>
  );
}
