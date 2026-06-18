import { Button, Input, Text, Textarea, View } from '@tarojs/components';
import Taro, { useDidShow, useRouter } from '@tarojs/taro';
import { useState } from 'react';

import { showApiError } from '../../api/error';
import { createAfterSale, fetchAfterSales, fetchOrderDetail } from '../../api/orderApi';
import { AfterSale, AfterSaleType, Order } from '../../api/types';
import { PageShell } from '../../components/PageShell';
import { useSessionStore } from '../../store/sessionStore';
import './apply.css';

const afterSaleTypeOptions: Array<{
  label: string;
  value: AfterSaleType;
  copy: string;
}> = [
  {
    label: '仅退款',
    value: 'REFUND_ONLY',
    copy: '无需退回商品，适用于未发货或商家同意仅退款场景。',
  },
  {
    label: '退货退款',
    value: 'RETURN_REFUND',
    copy: '需要后续填写退货物流，适用于已发货或已完成订单。',
  },
];

const afterSaleStatusText: Record<string, string> = {
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

function formatAmount(value?: string | number | null) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
}

function canApplyReturnRefund(order?: Order) {
  return order?.status === 'SHIPPED' || order?.status === 'COMPLETED';
}

function getDefaultType(order?: Order): AfterSaleType {
  return canApplyReturnRefund(order) ? 'RETURN_REFUND' : 'REFUND_ONLY';
}

function getApplyDisabledReason(order?: Order) {
  if (!order) {
    return '';
  }

  if (order.status === 'PENDING_PAYMENT') {
    return '待支付订单暂不能申请售后。';
  }

  if (order.status === 'CANCELLED') {
    return '已取消订单不能申请售后。';
  }

  if (order.status === 'REFUNDED') {
    return '已退款订单不能重复申请售后。';
  }

  return '';
}

export default function AfterSaleApplyPage() {
  const router = useRouter();
  const accessToken = useSessionStore((state) => state.accessToken);
  const orderId = router.params.orderId;
  const [order, setOrder] = useState<Order>();
  const [existingAfterSale, setExistingAfterSale] = useState<AfterSale>();
  const [type, setType] = useState<AfterSaleType>('REFUND_ONLY');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [requestedAmount, setRequestedAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!accessToken || !orderId) {
      setOrder(undefined);
      setExistingAfterSale(undefined);
      return;
    }

    setLoading(true);
    try {
      const [nextOrder, afterSaleList] = await Promise.all([
        fetchOrderDetail(orderId),
        fetchAfterSales({ orderId, page: 1, pageSize: 1 }),
      ]);
      const nextType = getDefaultType(nextOrder);
      setOrder(nextOrder);
      setType(nextType);
      setRequestedAmount(formatAmount(nextOrder.payableAmount));
      setExistingAfterSale(afterSaleList.items[0]);
    } catch (error) {
      showApiError(error, '售后信息加载失败');
    } finally {
      setLoading(false);
    }
  };

  useDidShow(() => {
    void load();
  });

  const submit = async () => {
    if (!order || submitting) {
      return;
    }

    const trimmedReason = reason.trim();
    const amount = Number(requestedAmount);

    if (!trimmedReason) {
      void Taro.showToast({ title: '请填写申请原因', icon: 'none' });
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      void Taro.showToast({ title: '请填写有效金额', icon: 'none' });
      return;
    }

    if (amount > Number(order.payableAmount)) {
      void Taro.showToast({ title: '金额不能超过实付', icon: 'none' });
      return;
    }

    if (type === 'RETURN_REFUND' && !canApplyReturnRefund(order)) {
      void Taro.showToast({ title: '当前订单不支持退货退款', icon: 'none' });
      return;
    }

    setSubmitting(true);
    try {
      const afterSale = await createAfterSale({
        orderId: order.id,
        type,
        reason: trimmedReason,
        description: description.trim() || undefined,
        requestedAmount: amount,
      });
      void Taro.showToast({ title: '已提交售后', icon: 'success' });
      void Taro.redirectTo({ url: `/pages/after-sale/detail?id=${afterSale.id}` });
    } catch (error) {
      showApiError(error, '售后提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (!accessToken) {
    return (
      <PageShell>
        <View className="after-sale-empty">
          <Text className="after-sale-empty-title">请先登录</Text>
          <Text className="after-sale-empty-copy">登录后可以申请和查看售后。</Text>
          <Button
            className="after-sale-primary-button"
            onClick={() => Taro.switchTab({ url: '/pages/user/index' })}
          >
            去登录
          </Button>
        </View>
      </PageShell>
    );
  }

  if (!orderId) {
    return (
      <PageShell>
        <View className="after-sale-empty">
          <Text className="after-sale-empty-title">缺少订单信息</Text>
          <Text className="after-sale-empty-copy">请从订单详情页重新进入。</Text>
          <Button className="after-sale-primary-button" onClick={() => Taro.navigateBack()}>
            返回
          </Button>
        </View>
      </PageShell>
    );
  }

  const disabledReason = getApplyDisabledReason(order);

  return (
    <PageShell>
      <View className="after-sale-page">
        <View className="after-sale-section">
          <View className="after-sale-section-header">
            <Text className="after-sale-section-title">订单信息</Text>
            <Button
              className="after-sale-refresh-button"
              loading={loading}
              onClick={() => void load()}
            >
              刷新
            </Button>
          </View>
          {order ? (
            <View className="after-sale-order-card">
              <View className="after-sale-info-row">
                <Text className="after-sale-info-label">订单号</Text>
                <Text className="after-sale-info-value">{order.orderNo}</Text>
              </View>
              <View className="after-sale-info-row">
                <Text className="after-sale-info-label">商品数量</Text>
                <Text className="after-sale-info-value">{order.totalQuantity} 件</Text>
              </View>
              <View className="after-sale-info-row">
                <Text className="after-sale-info-label">实付金额</Text>
                <Text className="after-sale-payable">¥{order.payableAmount}</Text>
              </View>
            </View>
          ) : (
            <View className="after-sale-placeholder">
              <Text>{loading ? '正在加载订单' : '订单加载失败'}</Text>
            </View>
          )}
        </View>

        {existingAfterSale ? (
          <View className="after-sale-section">
            <Text className="after-sale-section-title">已有售后</Text>
            <View className="after-sale-existing">
              <Text className="after-sale-existing-title">{existingAfterSale.afterSaleNo}</Text>
              <Text className="after-sale-existing-copy">
                {afterSaleStatusText[existingAfterSale.status] ?? existingAfterSale.status}
              </Text>
              <Button
                className="after-sale-primary-button full"
                onClick={() =>
                  Taro.redirectTo({ url: `/pages/after-sale/detail?id=${existingAfterSale.id}` })
                }
              >
                查看售后详情
              </Button>
            </View>
          </View>
        ) : null}

        {!existingAfterSale ? (
          <View className="after-sale-section">
            <Text className="after-sale-section-title">售后类型</Text>
            <View className="after-sale-type-list">
              {afterSaleTypeOptions.map((option) => {
                const disabled = option.value === 'RETURN_REFUND' && !canApplyReturnRefund(order);
                const selected = type === option.value;

                return (
                  <View
                    className={
                      selected
                        ? 'after-sale-type-card selected'
                        : disabled
                          ? 'after-sale-type-card disabled'
                          : 'after-sale-type-card'
                    }
                    key={option.value}
                    onClick={() => {
                      if (!disabled) {
                        setType(option.value);
                      }
                    }}
                  >
                    <View className="after-sale-type-head">
                      <Text className="after-sale-type-title">{option.label}</Text>
                      {selected ? <Text className="after-sale-type-badge">已选</Text> : null}
                    </View>
                    <Text className="after-sale-type-copy">{option.copy}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {!existingAfterSale ? (
          <View className="after-sale-section">
            <Text className="after-sale-section-title">申请信息</Text>
            <View className="after-sale-form">
              <Input
                className="after-sale-input"
                maxlength={80}
                placeholder="申请原因，例如：商品破损"
                value={reason}
                onInput={(event) => setReason(event.detail.value)}
              />
              <Input
                className="after-sale-input"
                placeholder="申请金额"
                type="digit"
                value={requestedAmount}
                onInput={(event) => setRequestedAmount(event.detail.value)}
              />
              <Textarea
                className="after-sale-textarea"
                maxlength={500}
                placeholder="补充说明（选填）"
                value={description}
                onInput={(event) => setDescription(event.detail.value)}
              />
              {disabledReason ? <Text className="after-sale-warning">{disabledReason}</Text> : null}
              <Button
                className="after-sale-primary-button full"
                disabled={Boolean(disabledReason) || loading}
                loading={submitting}
                onClick={() => void submit()}
              >
                提交申请
              </Button>
            </View>
          </View>
        ) : null}
      </View>
    </PageShell>
  );
}
