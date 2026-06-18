import {
  Button,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';

import {
  approveAfterSale,
  confirmReturnReceived,
  fetchAfterSales,
  rejectAfterSale,
  triggerAfterSaleRefund,
} from '../api/adminApi';
import { showApiError } from '../api/error';
import {
  AfterSale,
  AfterSaleActorType,
  AfterSaleStatus,
  AfterSaleType,
  ApproveAfterSaleInput,
  ConfirmReturnReceivedInput,
  RejectAfterSaleInput,
  RefundStatus,
} from '../api/types';

const afterSaleStatuses: AfterSaleStatus[] = [
  'REQUESTED',
  'APPROVED',
  'REJECTED',
  'WAIT_BUYER_RETURN',
  'BUYER_RETURNED',
  'MERCHANT_RECEIVED',
  'REFUNDING',
  'COMPLETED',
  'CANCELLED',
];

const afterSaleTypes: AfterSaleType[] = ['REFUND_ONLY', 'RETURN_REFUND'];

const statusLabelMap: Record<AfterSaleStatus, string> = {
  REQUESTED: '待审核',
  APPROVED: '已通过',
  REJECTED: '已驳回',
  WAIT_BUYER_RETURN: '待退货',
  BUYER_RETURNED: '已退货',
  MERCHANT_RECEIVED: '商家已收货',
  REFUNDING: '退款中',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

const statusColorMap: Record<AfterSaleStatus, string> = {
  REQUESTED: 'orange',
  APPROVED: 'blue',
  REJECTED: 'red',
  WAIT_BUYER_RETURN: 'purple',
  BUYER_RETURNED: 'cyan',
  MERCHANT_RECEIVED: 'geekblue',
  REFUNDING: 'gold',
  COMPLETED: 'green',
  CANCELLED: 'default',
};

const typeLabelMap: Record<AfterSaleType, string> = {
  REFUND_ONLY: '仅退款',
  RETURN_REFUND: '退货退款',
};

const actorLabelMap: Record<AfterSaleActorType, string> = {
  USER: '用户',
  ADMIN: '商家',
  SYSTEM: '系统',
};

const refundStatusLabelMap: Record<RefundStatus, string> = {
  PENDING: '退款中',
  SUCCESS: '退款成功',
  FAILED: '退款失败',
};

const refundStatusColorMap: Record<RefundStatus, string> = {
  PENDING: 'gold',
  SUCCESS: 'green',
  FAILED: 'red',
};

interface ApproveFormValues {
  approvedAmount?: number;
  merchantRemark?: string;
}

interface RejectFormValues {
  rejectReason: string;
  merchantRemark?: string;
}

interface ConfirmReceivedFormValues {
  merchantRemark?: string;
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '-';
}

function formatStatus(status: AfterSaleStatus) {
  return <Tag color={statusColorMap[status]}>{statusLabelMap[status]}</Tag>;
}

function formatType(type: AfterSaleType) {
  return <Tag color={type === 'RETURN_REFUND' ? 'purple' : 'blue'}>{typeLabelMap[type]}</Tag>;
}

function canReview(afterSale: AfterSale) {
  return afterSale.status === 'REQUESTED';
}

function canConfirmReceived(afterSale: AfterSale) {
  return afterSale.status === 'BUYER_RETURNED';
}

function canTriggerRefund(afterSale: AfterSale) {
  if (afterSale.refundId) {
    return false;
  }

  return (
    (afterSale.type === 'REFUND_ONLY' && afterSale.status === 'APPROVED') ||
    (afterSale.type === 'RETURN_REFUND' && afterSale.status === 'MERCHANT_RECEIVED')
  );
}

function formatRefundStatus(status?: RefundStatus) {
  if (!status) {
    return '-';
  }

  return <Tag color={refundStatusColorMap[status]}>{refundStatusLabelMap[status]}</Tag>;
}

export function AfterSalePage() {
  const [afterSales, setAfterSales] = useState<AfterSale[]>([]);
  const [status, setStatus] = useState<AfterSaleStatus | undefined>();
  const [type, setType] = useState<AfterSaleType | undefined>();
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [reviewingAfterSale, setReviewingAfterSale] = useState<AfterSale | null>(null);
  const [rejectingAfterSale, setRejectingAfterSale] = useState<AfterSale | null>(null);
  const [confirmingAfterSale, setConfirmingAfterSale] = useState<AfterSale | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [approveForm] = Form.useForm<ApproveFormValues>();
  const [rejectForm] = Form.useForm<RejectFormValues>();
  const [confirmReceivedForm] = Form.useForm<ConfirmReceivedFormValues>();

  const load = async (
    params: {
      status?: AfterSaleStatus;
      type?: AfterSaleType;
      keyword?: string;
      page?: number;
      pageSize?: number;
    } = {},
  ) => {
    const nextStatus = 'status' in params ? params.status : status;
    const nextType = 'type' in params ? params.type : type;
    const nextKeyword = 'keyword' in params ? params.keyword : keyword.trim();
    const nextPage = params.page ?? page;
    const nextPageSize = params.pageSize ?? pageSize;

    setLoading(true);
    try {
      const result = await fetchAfterSales({
        status: nextStatus,
        type: nextType,
        keyword: nextKeyword || undefined,
        page: nextPage,
        pageSize: nextPageSize,
      });
      setAfterSales(result.items);
      setTotal(result.total);
      setPage(result.page);
      setPageSize(result.pageSize);
    } catch (error) {
      showApiError(error, '售后加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openApproveModal = (afterSale: AfterSale) => {
    setReviewingAfterSale(afterSale);
    approveForm.setFieldsValue({
      approvedAmount: Number(afterSale.requestedAmount),
      merchantRemark: afterSale.merchantRemark ?? undefined,
    });
  };

  const submitApprove = async () => {
    if (!reviewingAfterSale) return;

    const values = await approveForm.validateFields();
    const input: ApproveAfterSaleInput = {
      approvedAmount: values.approvedAmount,
      merchantRemark: values.merchantRemark?.trim() || undefined,
    };

    setSubmitting(true);
    try {
      await approveAfterSale(reviewingAfterSale.id, input);
      message.success(
        reviewingAfterSale.type === 'RETURN_REFUND' ? '售后已通过，等待买家退货' : '售后已通过',
      );
      setReviewingAfterSale(null);
      approveForm.resetFields();
      await load({ page, pageSize });
    } catch (error) {
      showApiError(error, '审核通过失败');
    } finally {
      setSubmitting(false);
    }
  };

  const openRejectModal = (afterSale: AfterSale) => {
    setRejectingAfterSale(afterSale);
    rejectForm.setFieldsValue({
      rejectReason: afterSale.rejectReason ?? undefined,
      merchantRemark: afterSale.merchantRemark ?? undefined,
    });
  };

  const submitReject = async () => {
    if (!rejectingAfterSale) return;

    const values = await rejectForm.validateFields();
    const input: RejectAfterSaleInput = {
      rejectReason: values.rejectReason.trim(),
      merchantRemark: values.merchantRemark?.trim() || undefined,
    };

    setSubmitting(true);
    try {
      await rejectAfterSale(rejectingAfterSale.id, input);
      message.success('售后已驳回');
      setRejectingAfterSale(null);
      rejectForm.resetFields();
      await load({ page, pageSize });
    } catch (error) {
      showApiError(error, '驳回失败');
    } finally {
      setSubmitting(false);
    }
  };

  const openConfirmReceivedModal = (afterSale: AfterSale) => {
    setConfirmingAfterSale(afterSale);
    confirmReceivedForm.setFieldsValue({
      merchantRemark: afterSale.merchantRemark ?? undefined,
    });
  };

  const submitConfirmReceived = async () => {
    if (!confirmingAfterSale) return;

    const values = await confirmReceivedForm.validateFields();
    const input: ConfirmReturnReceivedInput = {
      merchantRemark: values.merchantRemark?.trim() || undefined,
    };

    setSubmitting(true);
    try {
      await confirmReturnReceived(confirmingAfterSale.id, input);
      message.success('已确认收到退货');
      setConfirmingAfterSale(null);
      confirmReceivedForm.resetFields();
      await load({ page, pageSize });
    } catch (error) {
      showApiError(error, '确认收货失败');
    } finally {
      setSubmitting(false);
    }
  };

  const triggerRefund = (afterSale: AfterSale) => {
    Modal.confirm({
      title: '触发售后退款',
      content: `确认为售后单 ${afterSale.afterSaleNo} 触发退款？`,
      okText: '触发退款',
      cancelText: '取消',
      onOk: async () => {
        setSubmitting(true);
        try {
          await triggerAfterSaleRefund(afterSale.id);
          message.success('已触发售后退款');
          await load({ page, pageSize });
        } catch (error) {
          showApiError(error, '触发退款失败');
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const columns = useMemo(
    () => [
      { title: '售后单号', dataIndex: 'afterSaleNo', width: 210 },
      {
        title: '状态',
        dataIndex: 'status',
        width: 110,
        render: (value: AfterSaleStatus) => formatStatus(value),
      },
      {
        title: '类型',
        dataIndex: 'type',
        width: 110,
        render: (value: AfterSaleType) => formatType(value),
      },
      {
        title: '订单号',
        render: (_: unknown, record: AfterSale) => record.order?.orderNo ?? record.orderId,
      },
      {
        title: '用户',
        render: (_: unknown, record: AfterSale) =>
          record.user?.nickname ?? record.user?.phone ?? record.user?.openId ?? '-',
      },
      { title: '申请金额', dataIndex: 'requestedAmount', width: 110 },
      {
        title: '原因',
        dataIndex: 'reason',
        ellipsis: true,
      },
      {
        title: '创建时间',
        width: 180,
        render: (_: unknown, record: AfterSale) => formatDate(record.createdAt),
      },
      {
        title: '操作',
        width: 180,
        render: (_: unknown, record: AfterSale) => {
          if (canReview(record)) {
            return (
              <Space>
                <Button size="small" type="primary" onClick={() => openApproveModal(record)}>
                  通过
                </Button>
                <Button size="small" danger onClick={() => openRejectModal(record)}>
                  驳回
                </Button>
              </Space>
            );
          }

          if (canConfirmReceived(record)) {
            return (
              <Button size="small" type="primary" onClick={() => openConfirmReceivedModal(record)}>
                确认收货
              </Button>
            );
          }

          if (canTriggerRefund(record)) {
            return (
              <Button size="small" type="primary" onClick={() => triggerRefund(record)}>
                触发退款
              </Button>
            );
          }

          return <Typography.Text type="secondary">-</Typography.Text>;
        },
      },
    ],
    [],
  );

  const expandedRowRender = (afterSale: AfterSale) => (
    <Space direction="vertical" size={16} className="full-width">
      <Descriptions size="small" column={{ xs: 1, md: 2, lg: 3 }} bordered>
        <Descriptions.Item label="售后单号">{afterSale.afterSaleNo}</Descriptions.Item>
        <Descriptions.Item label="状态">{formatStatus(afterSale.status)}</Descriptions.Item>
        <Descriptions.Item label="类型">{formatType(afterSale.type)}</Descriptions.Item>
        <Descriptions.Item label="订单号">
          {afterSale.order?.orderNo ?? afterSale.orderId}
        </Descriptions.Item>
        <Descriptions.Item label="订单状态">{afterSale.order?.status ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="订单实付">
          {afterSale.order?.payableAmount ?? '-'}
        </Descriptions.Item>
        <Descriptions.Item label="用户">
          {afterSale.user?.nickname ?? afterSale.user?.phone ?? afterSale.user?.openId ?? '-'}
        </Descriptions.Item>
        <Descriptions.Item label="OpenID">{afterSale.user?.openId ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="申请金额">{afterSale.requestedAmount}</Descriptions.Item>
        <Descriptions.Item label="通过金额">{afterSale.approvedAmount ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="申请原因">{afterSale.reason}</Descriptions.Item>
        <Descriptions.Item label="补充说明">{afterSale.description ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="驳回原因">{afterSale.rejectReason ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="商家备注">{afterSale.merchantRemark ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="退货物流公司">
          {afterSale.returnLogisticsCompany ?? '-'}
        </Descriptions.Item>
        <Descriptions.Item label="退货物流单号">
          {afterSale.returnTrackingNo ?? '-'}
        </Descriptions.Item>
        <Descriptions.Item label="退货备注">{afterSale.returnRemark ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="退款单号">{afterSale.refund?.refundNo ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="退款状态">
          {formatRefundStatus(afterSale.refund?.status)}
        </Descriptions.Item>
        <Descriptions.Item label="退款金额">{afterSale.refund?.amount ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="退款失败原因">
          {afterSale.refund?.failureReason ?? '-'}
        </Descriptions.Item>
        <Descriptions.Item label="申请时间">{formatDate(afterSale.createdAt)}</Descriptions.Item>
        <Descriptions.Item label="审核通过">{formatDate(afterSale.approvedAt)}</Descriptions.Item>
        <Descriptions.Item label="买家退货">
          {formatDate(afterSale.buyerReturnedAt)}
        </Descriptions.Item>
        <Descriptions.Item label="商家收货">
          {formatDate(afterSale.merchantReceivedAt)}
        </Descriptions.Item>
        <Descriptions.Item label="驳回时间">{formatDate(afterSale.rejectedAt)}</Descriptions.Item>
        <Descriptions.Item label="取消时间">{formatDate(afterSale.cancelledAt)}</Descriptions.Item>
      </Descriptions>
      <Space direction="vertical" size={8} className="full-width">
        <Typography.Title level={5} className="section-subtitle">
          处理记录
        </Typography.Title>
        {afterSale.logs?.length ? (
          <Table
            rowKey="id"
            size="small"
            columns={[
              {
                title: '时间',
                width: 180,
                render: (_: unknown, record: NonNullable<AfterSale['logs']>[number]) =>
                  formatDate(record.createdAt),
              },
              {
                title: '角色',
                width: 100,
                render: (_: unknown, record: NonNullable<AfterSale['logs']>[number]) =>
                  actorLabelMap[record.actorType],
              },
              { title: '动作', dataIndex: 'action', width: 120 },
              {
                title: '内容',
                dataIndex: 'content',
                render: (value?: string | null) => value ?? '-',
              },
            ]}
            dataSource={afterSale.logs}
            pagination={false}
          />
        ) : (
          <Typography.Text type="secondary">暂无处理记录</Typography.Text>
        )}
      </Space>
    </Space>
  );

  return (
    <section className="page">
      <div className="page-title">
        <Typography.Title level={4}>售后管理</Typography.Title>
        <Typography.Text type="secondary">
          查看用户售后申请，处理审核、退货物流、确认收货和售后退款。
        </Typography.Text>
      </div>
      <Space className="toolbar" wrap>
        <Select
          allowClear
          placeholder="售后状态"
          value={status}
          options={afterSaleStatuses.map((value) => ({ value, label: statusLabelMap[value] }))}
          onChange={(value: AfterSaleStatus | undefined) => {
            setStatus(value);
            setPage(1);
            void load({ status: value, page: 1 });
          }}
          className="after-sale-status-select"
        />
        <Select
          allowClear
          placeholder="售后类型"
          value={type}
          options={afterSaleTypes.map((value) => ({ value, label: typeLabelMap[value] }))}
          onChange={(value: AfterSaleType | undefined) => {
            setType(value);
            setPage(1);
            void load({ type: value, page: 1 });
          }}
          className="after-sale-status-select"
        />
        <Input.Search
          allowClear
          placeholder="搜索售后单 / 订单号 / 用户"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onSearch={(value) => {
            const nextKeyword = value.trim();
            setKeyword(nextKeyword);
            setPage(1);
            void load({ keyword: nextKeyword, page: 1 });
          }}
          className="after-sale-search"
        />
        <Button type="primary" onClick={() => void load()}>
          查询
        </Button>
        <Button
          onClick={() => {
            setStatus(undefined);
            setType(undefined);
            setKeyword('');
            setPage(1);
            void load({ status: undefined, type: undefined, keyword: '', page: 1 });
          }}
        >
          重置
        </Button>
      </Space>
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={afterSales}
        expandable={{ expandedRowRender }}
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
        title="审核通过"
        open={Boolean(reviewingAfterSale)}
        confirmLoading={submitting}
        onOk={() => void submitApprove()}
        onCancel={() => {
          setReviewingAfterSale(null);
          approveForm.resetFields();
        }}
        okText="确认通过"
        cancelText="取消"
      >
        {reviewingAfterSale ? (
          <Descriptions size="small" column={1} className="ship-order-summary">
            <Descriptions.Item label="售后单号">{reviewingAfterSale.afterSaleNo}</Descriptions.Item>
            <Descriptions.Item label="售后类型">
              {typeLabelMap[reviewingAfterSale.type]}
            </Descriptions.Item>
            <Descriptions.Item label="申请金额">
              {reviewingAfterSale.requestedAmount}
            </Descriptions.Item>
            <Descriptions.Item label="申请原因">{reviewingAfterSale.reason}</Descriptions.Item>
          </Descriptions>
        ) : null}
        <Form form={approveForm} layout="vertical">
          <Form.Item
            label="通过金额"
            name="approvedAmount"
            rules={[{ type: 'number', min: 0.01, message: '通过金额必须大于 0' }]}
          >
            <InputNumber min={0.01} precision={2} className="full-width" />
          </Form.Item>
          <Form.Item
            label="商家备注"
            name="merchantRemark"
            rules={[{ max: 191, message: '商家备注不能超过 191 个字符' }]}
          >
            <Input.TextArea rows={3} maxLength={191} showCount placeholder="可选" />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="驳回售后"
        open={Boolean(rejectingAfterSale)}
        confirmLoading={submitting}
        onOk={() => void submitReject()}
        onCancel={() => {
          setRejectingAfterSale(null);
          rejectForm.resetFields();
        }}
        okText="确认驳回"
        cancelText="取消"
      >
        {rejectingAfterSale ? (
          <Descriptions size="small" column={1} className="ship-order-summary">
            <Descriptions.Item label="售后单号">{rejectingAfterSale.afterSaleNo}</Descriptions.Item>
            <Descriptions.Item label="申请金额">
              {rejectingAfterSale.requestedAmount}
            </Descriptions.Item>
            <Descriptions.Item label="申请原因">{rejectingAfterSale.reason}</Descriptions.Item>
          </Descriptions>
        ) : null}
        <Form form={rejectForm} layout="vertical">
          <Form.Item
            label="驳回原因"
            name="rejectReason"
            rules={[
              { required: true, message: '请输入驳回原因' },
              { max: 191, message: '驳回原因不能超过 191 个字符' },
            ]}
          >
            <Input.TextArea rows={3} maxLength={191} showCount placeholder="请输入驳回原因" />
          </Form.Item>
          <Form.Item
            label="商家备注"
            name="merchantRemark"
            rules={[{ max: 191, message: '商家备注不能超过 191 个字符' }]}
          >
            <Input.TextArea rows={3} maxLength={191} showCount placeholder="可选" />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="确认收到退货"
        open={Boolean(confirmingAfterSale)}
        confirmLoading={submitting}
        onOk={() => void submitConfirmReceived()}
        onCancel={() => {
          setConfirmingAfterSale(null);
          confirmReceivedForm.resetFields();
        }}
        okText="确认收货"
        cancelText="取消"
      >
        {confirmingAfterSale ? (
          <Descriptions size="small" column={1} className="ship-order-summary">
            <Descriptions.Item label="售后单号">
              {confirmingAfterSale.afterSaleNo}
            </Descriptions.Item>
            <Descriptions.Item label="退货物流">
              {[confirmingAfterSale.returnLogisticsCompany, confirmingAfterSale.returnTrackingNo]
                .filter(Boolean)
                .join(' / ') || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="买家备注">
              {confirmingAfterSale.returnRemark ?? '-'}
            </Descriptions.Item>
          </Descriptions>
        ) : null}
        <Form form={confirmReceivedForm} layout="vertical">
          <Form.Item
            label="商家备注"
            name="merchantRemark"
            rules={[{ max: 191, message: '商家备注不能超过 191 个字符' }]}
          >
            <Input.TextArea rows={3} maxLength={191} showCount placeholder="可选" />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}
