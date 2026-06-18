import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { createCoupon, fetchCoupons, updateCoupon, updateCouponStatus } from '../api/adminApi';
import { showApiError } from '../api/error';
import { Coupon, CouponInput, CouponStatus } from '../api/types';

const statusOptions: { value: CouponStatus; label: string }[] = [
  { value: 'DRAFT', label: '草稿' },
  { value: 'ACTIVE', label: '上架' },
  { value: 'INACTIVE', label: '下架' },
  { value: 'EXPIRED', label: '已过期' },
];

const statusTextMap: Record<CouponStatus, string> = {
  DRAFT: '草稿',
  ACTIVE: '上架',
  INACTIVE: '下架',
  EXPIRED: '已过期',
};

const statusColorMap: Record<CouponStatus, string> = {
  DRAFT: 'default',
  ACTIVE: 'green',
  INACTIVE: 'orange',
  EXPIRED: 'red',
};

interface CouponFormValues {
  name: string;
  code?: string;
  thresholdAmount: number;
  discountAmount: number;
  totalStock: number;
  perUserLimit?: number;
  validRange: [Dayjs, Dayjs];
  description?: string;
}

function toCouponInput(values: CouponFormValues): CouponInput {
  return {
    name: values.name,
    code: values.code?.trim() || undefined,
    thresholdAmount: values.thresholdAmount,
    discountAmount: values.discountAmount,
    totalStock: values.totalStock,
    perUserLimit: values.perUserLimit,
    validFrom: values.validRange[0].toISOString(),
    validTo: values.validRange[1].toISOString(),
    description: values.description,
  };
}

function formatDate(value: string) {
  return dayjs(value).format('YYYY-MM-DD HH:mm');
}

export function CouponPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<CouponStatus | undefined>();
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<CouponFormValues>();

  const load = async () => {
    setLoading(true);
    try {
      setCoupons(await fetchCoupons({ keyword: keyword.trim() || undefined, status }));
    } catch (error) {
      showApiError(error, '优惠券加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openCreate = () => {
    setEditingCoupon(undefined);
    form.resetFields();
    form.setFieldsValue({
      thresholdAmount: 0,
      discountAmount: 10,
      totalStock: 100,
      perUserLimit: 1,
      validRange: [dayjs().startOf('day'), dayjs().add(30, 'day').endOf('day')],
    });
    setModalOpen(true);
  };

  const openEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    form.setFieldsValue({
      name: coupon.name,
      code: coupon.code,
      thresholdAmount: Number(coupon.thresholdAmount),
      discountAmount: Number(coupon.discountAmount),
      totalStock: coupon.totalStock,
      perUserLimit: coupon.perUserLimit,
      validRange: [dayjs(coupon.validFrom), dayjs(coupon.validTo)],
      description: coupon.description ?? undefined,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingCoupon(undefined);
    form.resetFields();
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      if (editingCoupon) {
        await updateCoupon(editingCoupon.id, toCouponInput(values));
        message.success('优惠券已更新');
      } else {
        await createCoupon(toCouponInput(values));
        message.success('优惠券已创建');
      }

      closeModal();
      await load();
    } catch (error) {
      showApiError(error, editingCoupon ? '优惠券更新失败' : '优惠券创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (coupon: Coupon) => {
    const nextStatus: CouponStatus = coupon.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    try {
      await updateCouponStatus(coupon.id, nextStatus);
      message.success(nextStatus === 'ACTIVE' ? '优惠券已上架' : '优惠券已下架');
      await load();
    } catch (error) {
      showApiError(error, '状态更新失败');
    }
  };

  const columns = useMemo(
    () => [
      {
        title: '优惠券',
        dataIndex: 'name',
        width: 220,
        render: (value: string, record: Coupon) => (
          <Space direction="vertical" size={2}>
            <Typography.Text strong>{value}</Typography.Text>
            <Typography.Text type="secondary" copyable>
              {record.code}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: '规则',
        render: (_: unknown, record: Coupon) =>
          `满 ${record.thresholdAmount} 减 ${record.discountAmount}`,
      },
      {
        title: '状态',
        dataIndex: 'status',
        render: (value: CouponStatus) => (
          <Tag color={statusColorMap[value]}>{statusTextMap[value]}</Tag>
        ),
      },
      {
        title: '库存',
        render: (_: unknown, record: Coupon) => `${record.claimedCount}/${record.totalStock} 已领`,
      },
      {
        title: '已使用',
        dataIndex: 'usedCount',
      },
      {
        title: '每人限领',
        dataIndex: 'perUserLimit',
      },
      {
        title: '有效期',
        render: (_: unknown, record: Coupon) =>
          `${formatDate(record.validFrom)} - ${formatDate(record.validTo)}`,
      },
      {
        title: '操作',
        render: (_: unknown, record: Coupon) => (
          <Space>
            <Button size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
            <Popconfirm
              title={record.status === 'ACTIVE' ? '确认下架优惠券？' : '确认上架优惠券？'}
              okText="确认"
              cancelText="返回"
              onConfirm={() => void toggleStatus(record)}
            >
              <Button size="small">{record.status === 'ACTIVE' ? '下架' : '上架'}</Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [keyword, status],
  );

  return (
    <section className="page">
      <div className="page-title">
        <Typography.Title level={4}>优惠券管理</Typography.Title>
        <Typography.Text type="secondary">配置满减券，查看领取和使用数据。</Typography.Text>
      </div>
      <Space className="toolbar" wrap>
        <Input.Search
          allowClear
          placeholder="搜索名称 / 券码"
          value={keyword}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setKeyword(event.target.value)}
          onSearch={() => void load()}
          className="coupon-search"
        />
        <Select
          allowClear
          placeholder="状态"
          value={status}
          options={statusOptions}
          onChange={(value: CouponStatus | undefined) => setStatus(value)}
          className="status-select"
        />
        <Button type="primary" onClick={() => void load()}>
          查询
        </Button>
        <Button type="primary" ghost onClick={openCreate}>
          新增优惠券
        </Button>
      </Space>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={coupons} />
      <Modal
        title={editingCoupon ? '编辑优惠券' : '新增优惠券'}
        open={modalOpen}
        confirmLoading={submitting}
        onOk={() => void handleSubmit()}
        onCancel={closeModal}
        okText="保存"
        cancelText="取消"
        destroyOnHidden
        forceRender
      >
        <Form form={form} layout="vertical" className="coupon-form">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input maxLength={64} />
          </Form.Item>
          <Form.Item name="code" label="券码">
            <Input maxLength={64} placeholder="不填则自动生成" />
          </Form.Item>
          <Space className="full-width" size={12}>
            <Form.Item
              name="thresholdAmount"
              label="使用门槛"
              rules={[{ required: true, message: '请输入门槛' }]}
            >
              <InputNumber min={0} precision={2} className="coupon-number-input" />
            </Form.Item>
            <Form.Item
              name="discountAmount"
              label="抵扣金额"
              rules={[{ required: true, message: '请输入抵扣金额' }]}
            >
              <InputNumber min={0.01} precision={2} className="coupon-number-input" />
            </Form.Item>
          </Space>
          <Space className="full-width" size={12}>
            <Form.Item
              name="totalStock"
              label="发放总量"
              rules={[{ required: true, message: '请输入库存' }]}
            >
              <InputNumber min={1} precision={0} className="coupon-number-input" />
            </Form.Item>
            <Form.Item name="perUserLimit" label="每人限领">
              <InputNumber min={1} precision={0} className="coupon-number-input" />
            </Form.Item>
          </Space>
          <Form.Item
            name="validRange"
            label="有效期"
            rules={[{ required: true, message: '请选择有效期' }]}
          >
            <DatePicker.RangePicker showTime className="full-width" />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={3} maxLength={255} />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}
