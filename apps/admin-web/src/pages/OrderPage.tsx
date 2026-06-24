import {
  Button,
  Descriptions,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';

import {
  addOrderLogisticsTrace,
  cancelOrder,
  fetchOrders,
  refreshOrderLogisticsTraces,
  retryRefund,
  shipOrder,
  updateRefundStatus,
} from '../api/adminApi';
import { ApiError } from '../api/client';
import { showApiError } from '../api/error';
import { Order, OrderLogisticsTraceStatus, OrderStatus, RefundStatus } from '../api/types';
import { appMessage } from '../utils/appMessage';

const logisticsRefreshLocalCooldownSeconds = resolveLogisticsRefreshLocalCooldownSeconds();

const orderStatuses: OrderStatus[] = [
  'PENDING_PAYMENT',
  'PENDING_DELIVERY',
  'SHIPPED',
  'COMPLETED',
  'CANCELLED',
  'REFUNDING',
  'REFUNDED',
];

const statusColorMap: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'gold',
  PAID: 'cyan',
  PENDING_DELIVERY: 'blue',
  SHIPPED: 'purple',
  COMPLETED: 'green',
  CANCELLED: 'default',
  REFUNDING: 'orange',
  REFUNDED: 'default',
};

const statusLabelMap: Record<OrderStatus, string> = {
  PENDING_PAYMENT: '待支付',
  PAID: '已支付',
  PENDING_DELIVERY: '待发货',
  SHIPPED: '已发货',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
  REFUNDING: '退款中',
  REFUNDED: '已退款',
};

const refundStatusColorMap: Record<RefundStatus, string> = {
  PENDING: 'orange',
  SUCCESS: 'green',
  FAILED: 'red',
};

const refundStatusLabelMap: Record<RefundStatus, string> = {
  PENDING: '待处理',
  SUCCESS: '已退款',
  FAILED: '失败',
};

const logisticsTraceStatusLabelMap: Record<OrderLogisticsTraceStatus, string> = {
  SHIPPED: '已发货',
  PICKED_UP: '已揽收',
  IN_TRANSIT: '运输中',
  DELIVERING: '派送中',
  DELIVERED: '已签收',
  EXCEPTION: '物流异常',
};

const logisticsTraceStatusOptions = Object.entries(logisticsTraceStatusLabelMap).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

interface ShipOrderFormValues {
  logisticsCompany?: string;
  trackingNo?: string;
  remark?: string;
}

interface RejectRefundFormValues {
  failureReason?: string;
}

interface LogisticsTraceFormValues {
  status: OrderLogisticsTraceStatus;
  content: string;
  logisticsCompany?: string;
  trackingNo?: string;
}

type RefundRecord = NonNullable<Order['refunds']>[number];
type LogisticsTraceRecord = NonNullable<Order['logisticsTraces']>[number];

function resolveLogisticsRefreshLocalCooldownSeconds() {
  const rawValue = import.meta.env.VITE_LOGISTICS_REFRESH_COOLDOWN_SECONDS;

  if (rawValue === undefined || rawValue === '') {
    return 60;
  }

  const value = Number(rawValue);

  return Number.isFinite(value) && value >= 0 ? value : 60;
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '-';
}

function formatRefundStatus(refund: RefundRecord) {
  if (refund.status !== 'FAILED') {
    return refundStatusLabelMap[refund.status];
  }

  if (refund.failureSource === 'ADMIN_REJECT') {
    return '已驳回';
  }

  if (refund.failureSource === 'WECHAT_REQUEST') {
    return '微信下单失败';
  }

  if (refund.failureSource === 'WECHAT_NOTIFY') {
    return '微信退款失败';
  }

  return '失败';
}

function canRetryRefund(refund: RefundRecord) {
  return (
    refund.status === 'FAILED' &&
    (refund.failureSource === 'WECHAT_REQUEST' || refund.failureSource === 'WECHAT_NOTIFY')
  );
}

function formatLogisticsTraceStatus(trace: LogisticsTraceRecord) {
  return logisticsTraceStatusLabelMap[trace.status] ?? trace.status;
}

function formatLogisticsSummary(order: Order) {
  const latestTrace = order.logisticsTraces?.[0];

  if (latestTrace) {
    return `${formatLogisticsTraceStatus(latestTrace)} / ${latestTrace.content}`;
  }

  if (order.trackingNo) {
    return `${order.logisticsCompany ?? '物流'} / ${order.trackingNo}`;
  }

  return '-';
}

function getLatestLogisticsTrace(order: Order) {
  return order.logisticsTraces?.[0];
}

function getLogisticsRefreshCooldownRetryAfter(error: unknown) {
  if (!(error instanceof ApiError)) {
    return undefined;
  }

  const apiError = error.error;

  if (typeof apiError !== 'object' || apiError === null) {
    return undefined;
  }

  const code = 'code' in apiError ? apiError.code : undefined;
  const retryAfterSeconds =
    'retryAfterSeconds' in apiError ? apiError.retryAfterSeconds : undefined;

  return code === 'LOGISTICS_REFRESH_COOLDOWN' && typeof retryAfterSeconds === 'number'
    ? retryAfterSeconds
    : undefined;
}

export function OrderPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState<OrderStatus | undefined>();
  const [logisticsTraceStatus, setLogisticsTraceStatus] = useState<
    OrderLogisticsTraceStatus | undefined
  >();
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [shippingOrder, setShippingOrder] = useState<Order | null>(null);
  const [tracingOrder, setTracingOrder] = useState<Order | null>(null);
  const [rejectingRefund, setRejectingRefund] = useState<RefundRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [processingRefundId, setProcessingRefundId] = useState<string>();
  const [refreshingLogisticsOrderId, setRefreshingLogisticsOrderId] = useState<string>();
  const [logisticsRefreshCooldownUntil, setLogisticsRefreshCooldownUntil] = useState<
    Record<string, number>
  >({});
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [shipForm] = Form.useForm<ShipOrderFormValues>();
  const [traceForm] = Form.useForm<LogisticsTraceFormValues>();
  const [rejectRefundForm] = Form.useForm<RejectRefundFormValues>();

  const load = async (
    params: {
      status?: OrderStatus;
      logisticsTraceStatus?: OrderLogisticsTraceStatus;
      keyword?: string;
      page?: number;
      pageSize?: number;
    } = {},
  ) => {
    const nextStatus = 'status' in params ? params.status : status;
    const nextLogisticsTraceStatus =
      'logisticsTraceStatus' in params ? params.logisticsTraceStatus : logisticsTraceStatus;
    const nextKeyword = 'keyword' in params ? params.keyword : keyword.trim();
    const nextPage = params.page ?? page;
    const nextPageSize = params.pageSize ?? pageSize;

    setLoading(true);
    try {
      const result = await fetchOrders({
        status: nextStatus,
        logisticsTraceStatus: nextLogisticsTraceStatus,
        keyword: nextKeyword || undefined,
        page: nextPage,
        pageSize: nextPageSize,
      });
      setOrders(result.items);
      setTotal(result.total);
      setPage(result.page);
      setPageSize(result.pageSize);
    } catch (error) {
      showApiError(error, '订单加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();

      setClockNow(now);
      setLogisticsRefreshCooldownUntil((current) => {
        const entries = Object.entries(current).filter(([, cooldownUntil]) => cooldownUntil > now);

        return entries.length === Object.keys(current).length
          ? current
          : Object.fromEntries(entries);
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const openShipModal = (order: Order) => {
    setShippingOrder(order);
    shipForm.setFieldsValue({
      logisticsCompany: order.logisticsCompany ?? undefined,
      trackingNo: order.trackingNo ?? undefined,
      remark: order.deliveryRemark ?? undefined,
    });
  };

  const submitShipOrder = async () => {
    if (!shippingOrder) return;

    const values = await shipForm.validateFields();
    setSubmitting(true);
    try {
      await shipOrder(shippingOrder.id, values);
      appMessage.success(
        values.trackingNo
          ? `订单 ${shippingOrder.orderNo} 已发货，物流单号：${values.trackingNo}`
          : `订单 ${shippingOrder.orderNo} 已发货`,
      );
      setShippingOrder(null);
      shipForm.resetFields();
      await load({ page, pageSize });
    } catch (error) {
      showApiError(error, '发货失败');
    } finally {
      setSubmitting(false);
    }
  };

  const openTraceModal = (order: Order) => {
    setTracingOrder(order);
    traceForm.setFieldsValue({
      status: 'IN_TRANSIT',
      content: undefined,
      logisticsCompany: order.logisticsCompany ?? undefined,
      trackingNo: order.trackingNo ?? undefined,
    });
  };

  const submitLogisticsTrace = async () => {
    if (!tracingOrder) return;

    const values = await traceForm.validateFields();
    setSubmitting(true);
    try {
      await addOrderLogisticsTrace(tracingOrder.id, values);
      appMessage.success(`订单 ${tracingOrder.orderNo} 已追加物流轨迹`);
      setTracingOrder(null);
      traceForm.resetFields();
      await load({ page, pageSize });
    } catch (error) {
      showApiError(error, '追加物流轨迹失败');
    } finally {
      setSubmitting(false);
    }
  };

  const submitRefreshLogisticsTraces = async (order: Order) => {
    setLogisticsRefreshCooldown(order.id, logisticsRefreshLocalCooldownSeconds);
    setRefreshingLogisticsOrderId(order.id);
    try {
      await refreshOrderLogisticsTraces(order.id);
      appMessage.success(`订单 ${order.orderNo} 已刷新物流轨迹`);
      await load({ page, pageSize });
    } catch (error) {
      const retryAfterSeconds = getLogisticsRefreshCooldownRetryAfter(error);

      if (retryAfterSeconds !== undefined) {
        setLogisticsRefreshCooldown(order.id, retryAfterSeconds);
      }

      showApiError(error, '刷新物流轨迹失败');
    } finally {
      setRefreshingLogisticsOrderId(undefined);
    }
  };

  const submitRefundStatus = async (refundId: string, status: 'SUCCESS' | 'FAILED') => {
    setProcessingRefundId(refundId);
    try {
      await updateRefundStatus(refundId, { status });
      appMessage.success(status === 'SUCCESS' ? '退款已确认' : '退款已驳回');
      await load({ page, pageSize });
    } catch (error) {
      showApiError(error, status === 'SUCCESS' ? '确认退款失败' : '驳回退款失败');
    } finally {
      setProcessingRefundId(undefined);
    }
  };

  const openRejectRefundModal = (refund: RefundRecord) => {
    setRejectingRefund(refund);
    rejectRefundForm.setFieldsValue({
      failureReason: undefined,
    });
  };

  const submitRejectRefund = async () => {
    if (!rejectingRefund) return;

    const values = await rejectRefundForm.validateFields();
    const failureReason = values.failureReason?.trim() || undefined;

    setProcessingRefundId(rejectingRefund.id);
    try {
      await updateRefundStatus(rejectingRefund.id, {
        failureReason,
        status: 'FAILED',
      });
      appMessage.success('退款已驳回');
      setRejectingRefund(null);
      rejectRefundForm.resetFields();
      await load({ page, pageSize });
    } catch (error) {
      showApiError(error, '驳回退款失败');
    } finally {
      setProcessingRefundId(undefined);
    }
  };

  const submitRefundRetry = async (refundId: string) => {
    setProcessingRefundId(refundId);
    try {
      await retryRefund(refundId);
      appMessage.success('已重新发起退款');
      await load({ page, pageSize });
    } catch (error) {
      showApiError(error, '重试退款失败');
    } finally {
      setProcessingRefundId(undefined);
    }
  };

  const setLogisticsRefreshCooldown = (orderId: string, seconds: number) => {
    if (seconds <= 0) {
      return;
    }

    setLogisticsRefreshCooldownUntil((current) => ({
      ...current,
      [orderId]: Date.now() + seconds * 1000,
    }));
  };

  const getLogisticsRefreshCooldownSeconds = (orderId: string) => {
    const cooldownUntil = logisticsRefreshCooldownUntil[orderId];

    if (!cooldownUntil || cooldownUntil <= clockNow) {
      return 0;
    }

    return Math.ceil((cooldownUntil - clockNow) / 1000);
  };

  const columns = useMemo(
    () => [
      { title: '订单号', dataIndex: 'orderNo', width: 210 },
      {
        title: '状态',
        dataIndex: 'status',
        render: (value: OrderStatus) => (
          <Tag color={statusColorMap[value]}>{statusLabelMap[value]}</Tag>
        ),
      },
      {
        title: '用户',
        render: (_: unknown, record: Order) =>
          record.user?.nickname ?? record.user?.phone ?? record.user?.openId ?? '-',
      },
      { title: '金额', dataIndex: 'payableAmount' },
      { title: '件数', dataIndex: 'totalQuantity' },
      {
        title: '物流',
        width: 260,
        render: (_: unknown, record: Order) => {
          const latestTrace = getLatestLogisticsTrace(record);
          const summary = formatLogisticsSummary(record);

          return (
            <Typography.Text
              ellipsis={{ tooltip: summary }}
              type={latestTrace?.status === 'EXCEPTION' ? 'danger' : undefined}
            >
              {summary}
            </Typography.Text>
          );
        },
      },
      {
        title: '商品',
        render: (_: unknown, record: Order) =>
          record.items.map((item) => item.productName).join('、'),
      },
      {
        title: '创建时间',
        render: (_: unknown, record: Order) => new Date(record.createdAt).toLocaleString(),
      },
      {
        title: '操作',
        render: (_: unknown, record: Order) => (
          <Space>
            <Popconfirm
              title="确认取消订单？"
              description={`订单 ${record.orderNo} 取消后会回滚库存。`}
              okText="确认取消"
              cancelText="返回"
              disabled={record.status !== 'PENDING_PAYMENT'}
              onConfirm={async () => {
                try {
                  await cancelOrder(record.id);
                  appMessage.success('订单已取消');
                  await load({ page, pageSize });
                } catch (error) {
                  showApiError(error, '取消失败');
                }
              }}
            >
              <Button size="small" disabled={record.status !== 'PENDING_PAYMENT'}>
                取消
              </Button>
            </Popconfirm>
            <Button
              size="small"
              type="primary"
              disabled={record.status !== 'PENDING_DELIVERY'}
              onClick={() => openShipModal(record)}
            >
              发货
            </Button>
          </Space>
        ),
      },
    ],
    [status],
  );

  const expandedRowRender = (order: Order) => (
    <Space direction="vertical" size={16} className="full-width">
      <Descriptions size="small" column={{ xs: 1, md: 2, lg: 3 }} bordered>
        <Descriptions.Item label="用户">
          {order.user?.nickname ?? order.user?.phone ?? order.user?.openId ?? '-'}
        </Descriptions.Item>
        <Descriptions.Item label="OpenID">{order.user?.openId ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="订单备注">{order.remark ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="收货人">{order.receiverName ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="联系电话">{order.receiverPhone ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="收货地址">
          {order.receiverProvince
            ? `${order.receiverProvince}${order.receiverCity ?? ''}${order.receiverDistrict ?? ''}${order.receiverDetailAddress ?? ''}`
            : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="优惠券抵扣">
          {order.couponDiscountAmount ?? '0.00'}
        </Descriptions.Item>
        <Descriptions.Item label="积分抵扣">
          {order.pointsUsed > 0 ? `${order.pointsUsed} 积分 / ${order.pointsDiscountAmount}` : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="支付时间">{formatDate(order.paidAt)}</Descriptions.Item>
        <Descriptions.Item label="发货时间">{formatDate(order.shippedAt)}</Descriptions.Item>
        <Descriptions.Item label="完成时间">{formatDate(order.completedAt)}</Descriptions.Item>
        <Descriptions.Item label="取消时间">{formatDate(order.cancelledAt)}</Descriptions.Item>
        <Descriptions.Item label="取消原因">{order.cancelReason ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="物流公司">{order.logisticsCompany ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="物流单号">{order.trackingNo ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="发货备注">{order.deliveryRemark ?? '-'}</Descriptions.Item>
      </Descriptions>
      <Table
        rowKey="id"
        size="small"
        columns={[
          { title: '商品', dataIndex: 'productName' },
          { title: 'SKU', dataIndex: 'skuName' },
          {
            title: '规格',
            render: (_: unknown, item: Order['items'][number]) =>
              item.skuSpecs ? JSON.stringify(item.skuSpecs) : '-',
          },
          { title: '单价', dataIndex: 'unitPrice' },
          { title: '数量', dataIndex: 'quantity' },
          { title: '小计', dataIndex: 'totalAmount' },
        ]}
        dataSource={order.items}
        pagination={false}
      />
      <Space direction="vertical" size={8} className="full-width">
        <Space className="full-width logistics-trace-header" align="center">
          <Typography.Title level={5} className="section-subtitle">
            物流轨迹
          </Typography.Title>
          <Button
            size="small"
            type="primary"
            disabled={!order.shippedAt}
            onClick={() => openTraceModal(order)}
          >
            追加轨迹
          </Button>
          <Button
            size="small"
            disabled={
              !order.shippedAt ||
              !order.trackingNo ||
              getLogisticsRefreshCooldownSeconds(order.id) > 0
            }
            loading={refreshingLogisticsOrderId === order.id}
            onClick={() => void submitRefreshLogisticsTraces(order)}
          >
            {getLogisticsRefreshCooldownSeconds(order.id) > 0
              ? `刷新物流 ${getLogisticsRefreshCooldownSeconds(order.id)}s`
              : '刷新物流'}
          </Button>
        </Space>
        {order.logisticsTraces?.length ? (
          <Table
            rowKey="id"
            size="small"
            columns={[
              {
                title: '时间',
                width: 180,
                render: (_: unknown, trace: LogisticsTraceRecord) => formatDate(trace.occurredAt),
              },
              {
                title: '状态',
                width: 100,
                render: (_: unknown, trace: LogisticsTraceRecord) => (
                  <Tag color={trace.status === 'EXCEPTION' ? 'red' : 'blue'}>
                    {formatLogisticsTraceStatus(trace)}
                  </Tag>
                ),
              },
              {
                title: '内容',
                dataIndex: 'content',
              },
              {
                title: '物流',
                width: 240,
                render: (_: unknown, trace: LogisticsTraceRecord) =>
                  [trace.logisticsCompany, trace.trackingNo].filter(Boolean).join(' / ') || '-',
              },
            ]}
            dataSource={order.logisticsTraces}
            pagination={false}
          />
        ) : (
          <Typography.Text type="secondary">暂无物流轨迹</Typography.Text>
        )}
      </Space>
      {order.refunds?.length ? (
        <Space direction="vertical" size={8} className="full-width">
          <Typography.Title level={5}>退款记录</Typography.Title>
          <Table
            rowKey="id"
            size="small"
            columns={[
              { title: '退款单号', dataIndex: 'refundNo' },
              { title: '金额', dataIndex: 'amount', width: 110 },
              {
                title: '状态',
                dataIndex: 'status',
                width: 100,
                render: (_: RefundStatus, refund: RefundRecord) => (
                  <Tag color={refundStatusColorMap[refund.status]}>
                    {formatRefundStatus(refund)}
                  </Tag>
                ),
              },
              {
                title: '原因',
                dataIndex: 'reason',
                render: (value?: string | null) => value ?? '-',
              },
              {
                title: '失败原因',
                dataIndex: 'failureReason',
                render: (value?: string | null) => value ?? '-',
              },
              {
                title: '申请时间',
                width: 180,
                render: (_: unknown, refund: RefundRecord) => formatDate(refund.createdAt),
              },
              {
                title: '操作',
                width: 180,
                render: (_: unknown, refund: RefundRecord) =>
                  refund.status === 'PENDING' ? (
                    <Space>
                      <Popconfirm
                        title="确认退款？"
                        description={`退款单 ${refund.refundNo} 将标记为已退款。`}
                        okText="确认"
                        cancelText="返回"
                        onConfirm={() => void submitRefundStatus(refund.id, 'SUCCESS')}
                      >
                        <Button
                          size="small"
                          type="primary"
                          loading={processingRefundId === refund.id}
                        >
                          确认
                        </Button>
                      </Popconfirm>
                      <Button
                        size="small"
                        danger
                        loading={processingRefundId === refund.id}
                        onClick={() => openRejectRefundModal(refund)}
                      >
                        驳回
                      </Button>
                    </Space>
                  ) : canRetryRefund(refund) ? (
                    <Popconfirm
                      title="重试退款？"
                      description={`退款单 ${refund.refundNo} 将重新发起真实微信退款。`}
                      okText="重试"
                      cancelText="返回"
                      onConfirm={() => void submitRefundRetry(refund.id)}
                    >
                      <Button size="small" loading={processingRefundId === refund.id}>
                        重试
                      </Button>
                    </Popconfirm>
                  ) : (
                    '-'
                  ),
              },
            ]}
            dataSource={order.refunds}
            pagination={false}
          />
        </Space>
      ) : null}
    </Space>
  );

  return (
    <section className="page">
      <Space className="toolbar" wrap>
        <Select
          allowClear
          placeholder="订单状态"
          value={status}
          options={orderStatuses.map((value) => ({ value, label: statusLabelMap[value] }))}
          onChange={(value: OrderStatus | undefined) => {
            setStatus(value);
            setPage(1);
            void load({ status: value, page: 1 });
          }}
          className="order-status-select"
        />
        <Select
          allowClear
          placeholder="物流状态"
          value={logisticsTraceStatus}
          options={logisticsTraceStatusOptions}
          onChange={(value: OrderLogisticsTraceStatus | undefined) => {
            setLogisticsTraceStatus(value);
            setPage(1);
            void load({ logisticsTraceStatus: value, page: 1 });
          }}
          className="order-status-select"
        />
        <Input.Search
          allowClear
          placeholder="搜索订单号 / 用户"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onSearch={(value) => {
            const nextKeyword = value.trim();
            setKeyword(nextKeyword);
            setPage(1);
            void load({ keyword: nextKeyword, page: 1 });
          }}
          className="order-search"
        />
        <Button type="primary" onClick={() => void load()}>
          查询
        </Button>
        <Button
          onClick={() => {
            setStatus(undefined);
            setLogisticsTraceStatus(undefined);
            setKeyword('');
            setPage(1);
            void load({
              status: undefined,
              logisticsTraceStatus: undefined,
              keyword: '',
              page: 1,
            });
          }}
        >
          重置
        </Button>
      </Space>
      <Table
        className="page-table"
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={orders}
        expandable={{ expandedRowRender }}
        scroll={{ x: 'max-content', y: '100%' }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (value) => `共 ${value} 条`,
          onChange: (nextPage, nextPageSize) => {
            setPage(nextPage);
            setPageSize(nextPageSize);
            void load({ page: nextPage, pageSize: nextPageSize });
          },
        }}
      />
      <Modal
        title="订单发货"
        open={Boolean(shippingOrder)}
        confirmLoading={submitting}
        onOk={() => void submitShipOrder()}
        onCancel={() => {
          setShippingOrder(null);
          shipForm.resetFields();
        }}
        okText="确认发货"
        cancelText="取消"
      >
        {shippingOrder ? (
          <Descriptions size="small" column={1} className="ship-order-summary">
            <Descriptions.Item label="订单号">{shippingOrder.orderNo}</Descriptions.Item>
            <Descriptions.Item label="商品">
              {shippingOrder.items.map((item) => item.productName).join('、')}
            </Descriptions.Item>
            <Descriptions.Item label="金额">{shippingOrder.payableAmount}</Descriptions.Item>
          </Descriptions>
        ) : null}
        <Form form={shipForm} layout="vertical">
          <Form.Item label="物流公司" name="logisticsCompany">
            <Input placeholder="例如：顺丰速运" maxLength={64} />
          </Form.Item>
          <Form.Item label="物流单号" name="trackingNo">
            <Input placeholder="请输入物流单号" maxLength={64} />
          </Form.Item>
          <Form.Item label="发货备注" name="remark">
            <Input.TextArea rows={3} maxLength={255} placeholder="可选" />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="驳回退款"
        open={!!rejectingRefund}
        confirmLoading={processingRefundId === rejectingRefund?.id}
        onOk={() => void submitRejectRefund()}
        onCancel={() => {
          setRejectingRefund(null);
          rejectRefundForm.resetFields();
        }}
        okText="确认驳回"
        cancelText="取消"
      >
        {rejectingRefund ? (
          <Descriptions size="small" column={1} className="ship-order-summary">
            <Descriptions.Item label="退款单号">{rejectingRefund.refundNo}</Descriptions.Item>
            <Descriptions.Item label="退款金额">{rejectingRefund.amount}</Descriptions.Item>
            <Descriptions.Item label="申请原因">{rejectingRefund.reason ?? '-'}</Descriptions.Item>
          </Descriptions>
        ) : null}
        <Form form={rejectRefundForm} layout="vertical">
          <Form.Item
            label="驳回原因"
            name="failureReason"
            rules={[{ max: 191, message: '驳回原因不能超过 191 个字符' }]}
          >
            <Input.TextArea rows={3} maxLength={191} showCount placeholder="可选" />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="追加物流轨迹"
        open={!!tracingOrder}
        confirmLoading={submitting}
        onOk={() => void submitLogisticsTrace()}
        onCancel={() => {
          setTracingOrder(null);
          traceForm.resetFields();
        }}
        okText="确认追加"
        cancelText="取消"
      >
        {tracingOrder ? (
          <Descriptions size="small" column={1} className="ship-order-summary">
            <Descriptions.Item label="订单号">{tracingOrder.orderNo}</Descriptions.Item>
            <Descriptions.Item label="物流公司">
              {tracingOrder.logisticsCompany ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label="物流单号">{tracingOrder.trackingNo ?? '-'}</Descriptions.Item>
          </Descriptions>
        ) : null}
        <Form form={traceForm} layout="vertical">
          <Form.Item
            label="轨迹状态"
            name="status"
            rules={[{ required: true, message: '请选择轨迹状态' }]}
          >
            <Select options={logisticsTraceStatusOptions} placeholder="请选择轨迹状态" />
          </Form.Item>
          <Form.Item
            label="轨迹内容"
            name="content"
            rules={[
              { required: true, message: '请输入轨迹内容' },
              { max: 191, message: '轨迹内容不能超过 191 个字符' },
            ]}
          >
            <Input.TextArea rows={3} maxLength={191} showCount placeholder="例如：包裹已揽收" />
          </Form.Item>
          <Form.Item label="物流公司" name="logisticsCompany">
            <Input placeholder="默认沿用订单物流公司" maxLength={64} />
          </Form.Item>
          <Form.Item label="物流单号" name="trackingNo">
            <Input placeholder="默认沿用订单物流单号" maxLength={64} />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}
