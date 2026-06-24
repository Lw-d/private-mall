import { Card, Col, Row, Space, Statistic, Table, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import { fetchDashboardOverview } from '../api/adminApi';
import { showApiError } from '../api/error';
import { DashboardOverview, Order, OrderStatus } from '../api/types';

export function DashboardPage() {
  const [overview, setOverview] = useState<DashboardOverview>();
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setOverview(await fetchDashboardOverview());
    } catch (error) {
      showApiError(error, '经营概览加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const columns = useMemo(
    () => [
      { title: '订单号', dataIndex: 'orderNo', width: 210 },
      {
        title: '用户',
        render: (_: unknown, record: Order) =>
          record.user?.nickname ?? record.user?.phone ?? record.user?.openId ?? '-',
      },
      {
        title: '状态',
        dataIndex: 'status',
        render: (value: OrderStatus) => (
          <Tag color={value === 'PENDING_DELIVERY' ? 'blue' : 'default'}>{value}</Tag>
        ),
      },
      { title: '金额', dataIndex: 'payableAmount' },
      {
        title: '商品',
        render: (_: unknown, record: Order) =>
          record.items.map((item) => item.productName).join('、'),
      },
      {
        title: '创建时间',
        render: (_: unknown, record: Order) => new Date(record.createdAt).toLocaleString(),
      },
    ],
    [],
  );

  const metrics = overview?.metrics;
  const statColProps = { xs: 24, md: 8, lg: 6 };

  return (
    <section className="page">
      <Row gutter={[16, 16]}>
        <Col {...statColProps}>
          <Card loading={loading}>
            <Statistic title="GMV" value={metrics?.gmv ?? '0.00'} prefix="¥" precision={2} />
          </Card>
        </Col>
        <Col {...statColProps}>
          <Card loading={loading}>
            <Statistic title="订单总数" value={metrics?.totalOrders ?? 0} />
          </Card>
        </Col>
        <Col {...statColProps}>
          <Card loading={loading}>
            <Statistic title="今日订单" value={metrics?.todayOrders ?? 0} />
          </Card>
        </Col>
        <Col {...statColProps}>
          <Card loading={loading}>
            <Statistic title="待发货" value={metrics?.pendingDeliveryOrders ?? 0} />
          </Card>
        </Col>
        <Col {...statColProps}>
          <Card loading={loading}>
            <Statistic title="用户数" value={metrics?.totalUsers ?? 0} />
          </Card>
        </Col>
        <Col {...statColProps}>
          <Card loading={loading}>
            <Statistic
              title="在售商品"
              value={metrics?.productsOnSale ?? 0}
              suffix={
                <Typography.Text type="secondary">/ {metrics?.totalProducts ?? 0}</Typography.Text>
              }
            />
          </Card>
        </Col>
        <Col {...statColProps}>
          <Card loading={loading}>
            <Statistic title="有效优惠券" value={metrics?.activeCoupons ?? 0} />
          </Card>
        </Col>
        <Col {...statColProps}>
          <Card loading={loading}>
            <Statistic
              title="领券 / 用券"
              value={metrics?.claimedCoupons ?? 0}
              suffix={
                <Typography.Text type="secondary">/ {metrics?.usedCoupons ?? 0}</Typography.Text>
              }
            />
          </Card>
        </Col>
        <Col {...statColProps}>
          <Card loading={loading}>
            <Statistic
              title="优惠抵扣"
              value={metrics?.couponDiscountAmount ?? '0.00'}
              prefix="¥"
              precision={2}
            />
          </Card>
        </Col>
        <Col {...statColProps}>
          <Card loading={loading}>
            <Statistic title="累计发放积分" value={metrics?.pointsIssued ?? 0} />
          </Card>
        </Col>
        <Col {...statColProps}>
          <Card loading={loading}>
            <Statistic title="当前积分余额" value={metrics?.pointsBalanceTotal ?? 0} />
          </Card>
        </Col>
        <Col {...statColProps}>
          <Card loading={loading}>
            <Statistic title="积分流水" value={metrics?.pointLedgerCount ?? 0} />
          </Card>
        </Col>
      </Row>
      <Space direction="vertical" size={12} className="full-width">
        <Typography.Title level={5}>最近订单</Typography.Title>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={overview?.recentOrders ?? []}
          pagination={false}
        />
      </Space>
    </section>
  );
}
