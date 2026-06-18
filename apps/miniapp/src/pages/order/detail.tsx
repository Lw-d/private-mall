import { Button, Image, Text, View } from '@tarojs/components';
import Taro, { useDidShow, useRouter } from '@tarojs/taro';
import { useState } from 'react';

import { showApiError } from '../../api/error';
import { cancelOrder, completeOrder, fetchAfterSales, fetchOrderDetail } from '../../api/orderApi';
import {
  AfterSale,
  AfterSaleStatus,
  Order,
  OrderItem,
  OrderLogisticsTrace,
  OrderLogisticsTraceStatus,
  OrderStatus,
} from '../../api/types';
import { PageShell } from '../../components/PageShell';
import { getPayButtonText, payOrder } from '../../lib/payment';
import { resolveAssetUrl } from '../../lib/request';
import { useSessionStore } from '../../store/sessionStore';
import { ORDER_LIST_UPDATE_EVENT, OrderListUpdatePayload } from './events';
import './detail.css';

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

const logisticsTraceStatusLabelMap: Record<OrderLogisticsTraceStatus, string> = {
  SHIPPED: '已发货',
  PICKED_UP: '已揽收',
  IN_TRANSIT: '运输中',
  DELIVERING: '派送中',
  DELIVERED: '已签收',
  EXCEPTION: '物流异常',
};

const afterSaleStatusLabelMap: Record<AfterSaleStatus, string> = {
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

function renderSpecs(item: OrderItem) {
  const specs = item.skuSpecs;
  if (!specs || Object.keys(specs).length === 0) {
    return item.skuName;
  }

  return Object.entries(specs)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' / ');
}

function formatDate(value?: string | null) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function getStatusHint(order: Order) {
  if (order.status === 'PENDING_PAYMENT') {
    return '订单已创建，请尽快完成支付；暂不购买也可以取消订单。';
  }

  if (order.status === 'PENDING_DELIVERY') {
    return '支付已完成，等待商家发货。';
  }

  if (order.status === 'SHIPPED') {
    const latestTrace = order.logisticsTraces?.[0];

    if (latestTrace?.status === 'EXCEPTION') {
      return `物流出现异常：${latestTrace.content}。请关注后续轨迹，或联系商家协助处理。`;
    }

    return order.trackingNo
      ? `商家已发货，物流单号：${order.trackingNo}。收到商品后可确认收货。`
      : '商家已发货，收到商品后可确认收货。';
  }

  if (order.status === 'COMPLETED') {
    return order.completedAt
      ? `订单已于 ${formatDate(order.completedAt)} 完成，感谢购买。`
      : '订单已完成，感谢购买。';
  }

  if (order.status === 'CANCELLED') {
    return order.cancelReason ? `订单已取消：${order.cancelReason}` : '订单已取消。';
  }

  if (order.status === 'REFUNDING') {
    return '退款处理中，请等待商家处理。';
  }

  return '订单已退款。';
}

function notifyOrderList(order: Order) {
  const payload: OrderListUpdatePayload = { order };
  Taro.eventCenter.trigger(ORDER_LIST_UPDATE_EVENT, payload);
}

function getTraceTitle(trace: OrderLogisticsTrace) {
  return logisticsTraceStatusLabelMap[trace.status] ?? trace.status;
}

function canApplyAfterSale(order: Order) {
  return (
    order.status === 'PENDING_DELIVERY' ||
    order.status === 'SHIPPED' ||
    order.status === 'COMPLETED' ||
    order.status === 'REFUNDING'
  );
}

function getActiveAfterSale(afterSales: AfterSale[]) {
  return afterSales.find(
    (item) =>
      item.status !== 'REJECTED' && item.status !== 'CANCELLED' && item.status !== 'COMPLETED',
  );
}

export default function OrderDetailPage() {
  const router = useRouter();
  const accessToken = useSessionStore((state) => state.accessToken);
  const [order, setOrder] = useState<Order>();
  const [afterSales, setAfterSales] = useState<AfterSale[]>([]);
  const [loading, setLoading] = useState(false);
  const [operating, setOperating] = useState(false);
  const [syncedAt, setSyncedAt] = useState<string>();

  const orderId = router.params.id;

  const loadOrder = async () => {
    if (!accessToken || !orderId) {
      setOrder(undefined);
      setAfterSales([]);
      return;
    }

    setLoading(true);
    try {
      const [nextOrder, afterSaleList] = await Promise.all([
        fetchOrderDetail(orderId),
        fetchAfterSales({ orderId, page: 1, pageSize: 10 }),
      ]);
      setOrder(nextOrder);
      setAfterSales(afterSaleList.items);
      setSyncedAt(undefined);
    } catch (error) {
      showApiError(error, '订单详情加载失败');
    } finally {
      setLoading(false);
    }
  };

  const goAfterSale = () => {
    if (!order) {
      return;
    }

    const activeAfterSale = getActiveAfterSale(afterSales);

    if (activeAfterSale) {
      void Taro.navigateTo({ url: `/pages/after-sale/detail?id=${activeAfterSale.id}` });
      return;
    }

    void Taro.navigateTo({ url: `/pages/after-sale/apply?orderId=${order.id}` });
  };

  useDidShow(() => {
    void loadOrder();
  });

  const handlePay = async () => {
    if (!order || operating) {
      return;
    }

    setOperating(true);
    try {
      const result = await payOrder(order);

      if (!result.submitted) {
        return;
      }

      void Taro.showToast({
        title:
          result.latestOrder?.status !== 'PENDING_PAYMENT'
            ? '支付成功'
            : result.mockPaid
              ? '支付成功'
              : '支付已提交',
        icon: 'success',
      });
      const nextOrder = result.latestOrder ?? (await fetchOrderDetail(order.id));
      setOrder(nextOrder);
      notifyOrderList(nextOrder);
      setSyncedAt(new Date().toISOString());
    } catch (error) {
      showApiError(error, '支付失败');
    } finally {
      setOperating(false);
    }
  };

  const handleCancel = async () => {
    if (!order || operating) {
      return;
    }

    const result = await Taro.showModal({
      title: '取消订单',
      content: `确认取消订单 ${order.orderNo}？`,
      confirmText: '取消订单',
      confirmColor: '#dc2626',
    });

    if (!result.confirm) {
      return;
    }

    setOperating(true);
    try {
      const nextOrder = await cancelOrder(order.id, '用户取消订单');
      setOrder(nextOrder);
      notifyOrderList(nextOrder);
      setSyncedAt(new Date().toISOString());
      void Taro.showToast({ title: '订单已取消', icon: 'success' });
    } catch (error) {
      showApiError(error, '取消失败');
    } finally {
      setOperating(false);
    }
  };

  const handleConfirmReceived = async () => {
    if (!order || operating) {
      return;
    }

    const result = await Taro.showModal({
      title: '确认收货',
      content: `确认订单 ${order.orderNo} 已收到商品？`,
      confirmText: '确认收货',
    });

    if (!result.confirm) {
      return;
    }

    setOperating(true);
    try {
      const nextOrder = await completeOrder(order.id);
      setOrder(nextOrder);
      notifyOrderList(nextOrder);
      setSyncedAt(new Date().toISOString());
      void Taro.showToast({ title: '订单已完成', icon: 'success' });
    } catch (error) {
      showApiError(error, '确认收货失败');
    } finally {
      setOperating(false);
    }
  };

  const backToOrderList = () => {
    const pages = Taro.getCurrentPages();

    if (pages.length > 1) {
      void Taro.navigateBack();
      return;
    }

    void Taro.navigateTo({ url: '/pages/order/list' });
  };

  const renderEmptyState = ({
    title,
    copy,
    primaryText,
    onPrimary,
    secondaryText,
    onSecondary = backToOrderList,
  }: {
    title: string;
    copy?: string;
    primaryText: string;
    onPrimary: () => void;
    secondaryText?: string;
    onSecondary?: () => void;
  }) => (
    <PageShell>
      <View className="detail-empty">
        <Text className="detail-title">{title}</Text>
        {copy ? <Text className="detail-copy">{copy}</Text> : null}
        <View className="detail-empty-actions">
          <Button className="detail-primary-button" onClick={onPrimary}>
            {primaryText}
          </Button>
          {secondaryText ? (
            <Button className="detail-empty-secondary-button" onClick={onSecondary}>
              {secondaryText}
            </Button>
          ) : null}
        </View>
      </View>
    </PageShell>
  );

  if (!accessToken) {
    return renderEmptyState({
      title: '请先登录',
      copy: '登录后可以查看订单详情和处理订单状态。',
      primaryText: '去登录',
      onPrimary: () => Taro.switchTab({ url: '/pages/user/index' }),
      secondaryText: '返回列表',
    });
  }

  if (!orderId) {
    return renderEmptyState({
      title: '订单不存在',
      copy: '缺少订单 ID，请从订单列表重新进入。',
      primaryText: '返回列表',
      onPrimary: backToOrderList,
    });
  }

  if (loading && !order) {
    return (
      <PageShell>
        <View className="detail-empty">
          <Text className="detail-title">正在加载订单</Text>
        </View>
      </PageShell>
    );
  }

  if (!order) {
    return renderEmptyState({
      title: '订单加载失败',
      copy: '可以重试读取订单，或返回订单列表重新进入。',
      primaryText: '重试',
      onPrimary: () => void loadOrder(),
      secondaryText: '返回列表',
    });
  }

  return (
    <PageShell>
      <View className="detail-status-card">
        <View className="detail-status-head">
          <Text className="detail-status">{statusLabelMap[order.status]}</Text>
          <Button
            className="detail-refresh-button"
            loading={loading}
            disabled={operating}
            onClick={() => void loadOrder()}
          >
            刷新
          </Button>
        </View>
        <Text className="detail-status-copy">{getStatusHint(order)}</Text>
        {syncedAt ? (
          <Text className="detail-status-meta">状态已同步到订单列表 · {formatDate(syncedAt)}</Text>
        ) : null}
      </View>

      {order.status === 'PENDING_PAYMENT' ? (
        <View className="detail-action-bar">
          <Button
            className="detail-secondary-button"
            disabled={operating}
            onClick={() => void handleCancel()}
          >
            取消订单
          </Button>
          <Button
            className="detail-pay-button"
            loading={operating}
            onClick={() => void handlePay()}
          >
            {getPayButtonText()}
          </Button>
        </View>
      ) : null}

      {order.status === 'SHIPPED' ? (
        <View className="detail-action-bar">
          {canApplyAfterSale(order) ? (
            <Button className="detail-secondary-button" disabled={operating} onClick={goAfterSale}>
              申请售后
            </Button>
          ) : null}
          <Button
            className="detail-pay-button"
            loading={operating}
            onClick={() => void handleConfirmReceived()}
          >
            确认收货
          </Button>
        </View>
      ) : null}

      {order.status !== 'PENDING_PAYMENT' &&
      order.status !== 'SHIPPED' &&
      canApplyAfterSale(order) ? (
        <View className="detail-action-bar">
          <Button className="detail-secondary-button" disabled={operating} onClick={goAfterSale}>
            {getActiveAfterSale(afterSales) ? '查看售后' : '申请售后'}
          </Button>
        </View>
      ) : null}

      <View className="detail-section">
        <Text className="detail-section-title">订单信息</Text>
        <View className="detail-info-row">
          <Text className="detail-info-label">订单号</Text>
          <Text className="detail-info-value">{order.orderNo}</Text>
        </View>
        <View className="detail-info-row">
          <Text className="detail-info-label">创建时间</Text>
          <Text className="detail-info-value">{formatDate(order.createdAt)}</Text>
        </View>
        <View className="detail-info-row">
          <Text className="detail-info-label">支付时间</Text>
          <Text className="detail-info-value">{formatDate(order.paidAt)}</Text>
        </View>
        <View className="detail-info-row">
          <Text className="detail-info-label">完成时间</Text>
          <Text className="detail-info-value">{formatDate(order.completedAt)}</Text>
        </View>
        {order.remark ? (
          <View className="detail-info-row">
            <Text className="detail-info-label">订单备注</Text>
            <Text className="detail-info-value">{order.remark}</Text>
          </View>
        ) : null}
      </View>

      <View className="detail-section">
        <Text className="detail-section-title">收货信息</Text>
        <View className="detail-info-row">
          <Text className="detail-info-label">收货人</Text>
          <Text className="detail-info-value">{order.receiverName ?? '-'}</Text>
        </View>
        <View className="detail-info-row">
          <Text className="detail-info-label">联系电话</Text>
          <Text className="detail-info-value">{order.receiverPhone ?? '-'}</Text>
        </View>
        <View className="detail-info-row">
          <Text className="detail-info-label">收货地址</Text>
          <Text className="detail-info-value">
            {order.receiverProvince
              ? `${order.receiverProvince}${order.receiverCity ?? ''}${order.receiverDistrict ?? ''}${order.receiverDetailAddress ?? ''}`
              : '-'}
          </Text>
        </View>
      </View>

      <View className="detail-section">
        <Text className="detail-section-title">商品清单</Text>
        <View className="detail-items">
          {order.items.map((item) => {
            const imageUrl = resolveAssetUrl(item.productImageUrl);

            return (
              <View className="detail-item" key={item.id}>
                <View className="detail-item-image">
                  {imageUrl ? (
                    <Image className="detail-image" mode="aspectFill" src={imageUrl} />
                  ) : (
                    <Text className="detail-image-placeholder">商品</Text>
                  )}
                </View>
                <View className="detail-item-body">
                  <Text className="detail-product-name">{item.productName}</Text>
                  <Text className="detail-sku-name">{renderSpecs(item)}</Text>
                  <View className="detail-price-row">
                    <Text className="detail-price">¥{item.unitPrice}</Text>
                    <Text className="detail-quantity">x{item.quantity}</Text>
                  </View>
                  <Text className="detail-line-amount">小计 ¥{item.totalAmount}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View className="detail-section">
        <Text className="detail-section-title">物流信息</Text>
        <View className="detail-info-row">
          <Text className="detail-info-label">物流公司</Text>
          <Text className="detail-info-value">{order.logisticsCompany ?? '待商家发货'}</Text>
        </View>
        <View className="detail-info-row">
          <Text className="detail-info-label">物流单号</Text>
          <Text className="detail-info-value">{order.trackingNo ?? '-'}</Text>
        </View>
        <View className="detail-info-row">
          <Text className="detail-info-label">发货时间</Text>
          <Text className="detail-info-value">{formatDate(order.shippedAt)}</Text>
        </View>
        {order.deliveryRemark ? (
          <View className="detail-info-row">
            <Text className="detail-info-label">发货备注</Text>
            <Text className="detail-info-value">{order.deliveryRemark}</Text>
          </View>
        ) : null}
        {order.logisticsTraces?.length ? (
          <View className="detail-trace-list">
            {order.logisticsTraces.map((trace) => (
              <View className="detail-trace-item" key={trace.id}>
                <View
                  className={
                    trace.status === 'EXCEPTION' ? 'detail-trace-dot exception' : 'detail-trace-dot'
                  }
                />
                <View className="detail-trace-body">
                  <View className="detail-trace-head">
                    <Text className="detail-trace-title">{getTraceTitle(trace)}</Text>
                    <Text className="detail-trace-time">{formatDate(trace.occurredAt)}</Text>
                  </View>
                  <Text className="detail-trace-copy">{trace.content}</Text>
                  {trace.logisticsCompany || trace.trackingNo ? (
                    <Text className="detail-trace-meta">
                      {[trace.logisticsCompany, trace.trackingNo].filter(Boolean).join(' / ')}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View className="detail-section">
        <Text className="detail-section-title">费用明细</Text>
        <View className="detail-info-row">
          <Text className="detail-info-label">商品数量</Text>
          <Text className="detail-info-value">{order.totalQuantity} 件</Text>
        </View>
        <View className="detail-info-row">
          <Text className="detail-info-label">商品金额</Text>
          <Text className="detail-info-value">¥{order.totalAmount}</Text>
        </View>
        {Number(order.couponDiscountAmount ?? 0) > 0 ? (
          <View className="detail-info-row">
            <Text className="detail-info-label">优惠券抵扣</Text>
            <Text className="detail-info-value">-¥{order.couponDiscountAmount}</Text>
          </View>
        ) : null}
        {order.pointsUsed > 0 ? (
          <View className="detail-info-row">
            <Text className="detail-info-label">积分抵扣</Text>
            <Text className="detail-info-value">
              {order.pointsUsed} 积分 / -¥{order.pointsDiscountAmount}
            </Text>
          </View>
        ) : null}
        <View className="detail-info-row">
          <Text className="detail-info-label">应付金额</Text>
          <Text className="detail-payable">¥{order.payableAmount}</Text>
        </View>
      </View>

      {afterSales.length > 0 ? (
        <View className="detail-section">
          <Text className="detail-section-title">售后记录</Text>
          <View className="detail-after-sale-list">
            {afterSales.map((afterSale) => (
              <View className="detail-after-sale-card" key={afterSale.id}>
                <View className="detail-after-sale-head">
                  <Text className="detail-after-sale-no">{afterSale.afterSaleNo}</Text>
                  <Text className="detail-after-sale-badge">
                    {afterSaleStatusLabelMap[afterSale.status]}
                  </Text>
                </View>
                <View className="detail-info-row">
                  <Text className="detail-info-label">申请原因</Text>
                  <Text className="detail-info-value">{afterSale.reason}</Text>
                </View>
                <View className="detail-info-row">
                  <Text className="detail-info-label">申请金额</Text>
                  <Text className="detail-info-value">¥{afterSale.requestedAmount}</Text>
                </View>
                <Button
                  className="detail-after-sale-button"
                  onClick={() =>
                    Taro.navigateTo({ url: `/pages/after-sale/detail?id=${afterSale.id}` })
                  }
                >
                  查看详情
                </Button>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View className="detail-footer-actions">
        <Button className="detail-back-button" onClick={backToOrderList}>
          返回订单列表
        </Button>
      </View>
    </PageShell>
  );
}
