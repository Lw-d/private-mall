import { LockOutlined, ShopOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Space, Typography, message } from 'antd';
import { useState } from 'react';

import { showApiError } from '../api/error';
import { AdminLoginInput } from '../api/types';

interface LoginPageProps {
  onLogin: (values: AdminLoginInput) => Promise<void>;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values: AdminLoginInput) => {
    try {
      setLoading(true);
      await onLogin(values);
      message.success('登录成功');
    } catch (error) {
      showApiError(error, '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-screen">
      <Card className="login-card">
        <Space direction="vertical" size={20} className="login-stack">
          <div className="login-mark">
            <ShopOutlined />
          </div>
          <Space direction="vertical" size={4}>
            <Typography.Title level={3}>私域商城后台</Typography.Title>
            <Typography.Text type="secondary">商品、分类、订单管理</Typography.Text>
          </Space>
          <Form
            layout="vertical"
            className="login-form"
            initialValues={{ username: 'admin', password: 'Admin123456' }}
            onFinish={(values: AdminLoginInput) => void handleLogin(values)}
          >
            <Form.Item
              label="账号"
              name="username"
              rules={[{ required: true, message: '请输入账号' }]}
            >
              <Input autoComplete="username" />
            </Form.Item>
            <Form.Item
              label="密码"
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password autoComplete="current-password" />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              icon={<LockOutlined />}
              loading={loading}
            >
              登录
            </Button>
          </Form>
        </Space>
      </Card>
    </main>
  );
}
