import { Button, Image, Text, View } from '@tarojs/components';
import Taro, { useDidShow, usePullDownRefresh, useReachBottom } from '@tarojs/taro';
import { useEffect, useRef, useState } from 'react';

import { showApiError } from '../../api/error';
import { cancelOrder, completeOrder, fetchOrders } from '../../api/orderApi';
import { Order, OrderItem, OrderLogisticsTraceStatus, OrderStatus } from '../../api/types';
import { PageShell } from '../../components/PageShell';
import { getPayButtonText, payOrder } from '../../lib/payment';
import { resolveAssetUrl } from '../../lib/request';
import { useSessionStore } from '../../store/sessionStore';
import { ORDER_LIST_UPDATE_EVENT, OrderListUpdatePayload } from './events';
import './list.css';

interface StatusTab {
  label: string;
  status?: OrderStatus;
}

const statusTabs: StatusTab[] = [
  { label: '全部' },
  { label: '待支付', status: 'PENDING_PAYMENT' },
  { label: '待发货', status: 'PENDING_DELIVERY' },
  { label: '已发货', status: 'SHIPPED' },
  { label: '已完成', status: 'COMPLETED' },
  { label: '已取消', status: 'CANCELLED' },
];
const pageSize = 10;

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

function renderSpecs(item: OrderItem) {
  const specs = item.skuSpecs;
  if (!specs || Object.keys(specs).length === 0) {
    return item.skuName;
  }

  return Object.entries(specs)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' / ');
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${month}-${day} ${hour}:${minute}`;
}

function getStatusClassName(status: OrderStatus) {
  if (status === 'PENDING_PAYMENT') {
    return 'order-status active';
  }

  if (status === 'SHIPPED') {
    return 'order-status shipping';
  }

  if (status === 'COMPLETED') {
    return 'order-status completed';
  }

  return 'order-status';
}

function getOrderHint(order: Order) {
  if (order.status === 'PENDING_PAYMENT') {
    return '待支付订单可继续支付或取消。';
  }

  if (order.status === 'PENDING_DELIVERY') {
    return '商家正在处理订单，请等待发货。';
  }

  if (order.status === 'SHIPPED') {
    const latestTrace = order.logisticsTraces?.[0];

    if (latestTrace) {
      if (latestTrace.status === 'EXCEPTION') {
        return `物流异常：${latestTrace.content} · 请查看详情或联系商家`;
      }

      const traceLabel = logisticsTraceStatusLabelMap[latestTrace.status] ?? latestTrace.status;
      return `${traceLabel}：${latestTrace.content} · ${formatDate(latestTrace.occurredAt)}`;
    }

    return order.trackingNo
      ? `物流单号：${order.trackingNo}`
      : '商家已发货，收到商品后可确认收货。';
  }

  if (order.status === 'COMPLETED') {
    return order.completedAt ? `完成时间：${formatDate(order.completedAt)}` : '订单已完成。';
  }

  if (order.status === 'CANCELLED') {
    return order.cancelReason ? `取消原因：${order.cancelReason}` : '订单已取消。';
  }

  if (order.status === 'REFUNDING') {
    return '退款处理中，请等待商家处理。';
  }

  return '订单已退款。';
}

function getEmptyState(status?: OrderStatus) {
  if (!status) {
    return {
      title: '暂无订单',
      copy: '提交订单后会显示在这里。',
    };
  }

  if (status === 'PENDING_PAYMENT') {
    return {
      title: '暂无待支付订单',
      copy: '需要继续支付的订单会显示在这里。',
    };
  }

  if (status === 'PENDING_DELIVERY') {
    return {
      title: '暂无待发货订单',
      copy: '支付成功后，等待商家发货的订单会显示在这里。',
    };
  }

  if (status === 'SHIPPED') {
    return {
      title: '暂无已发货订单',
      copy: '商家发货后，可以在这里查看物流并确认收货。',
    };
  }

  if (status === 'COMPLETED') {
    return {
      title: '暂无已完成订单',
      copy: '确认收货后的订单会沉淀在这里。',
    };
  }

  if (status === 'CANCELLED') {
    return {
      title: '暂无已取消订单',
      copy: '取消过的订单会显示在这里。',
    };
  }

  return {
    title: `暂无${statusLabelMap[status]}订单`,
    copy: '该状态下暂时没有订单。',
  };
}

function mergeOrders(current: Order[], next: Order[]) {
  const orderMap = new Map(current.map((order) => [order.id, order]));

  for (const order of next) {
    orderMap.set(order.id, order);
  }

  return Array.from(orderMap.values());
}

function replaceOrder(current: Order[], nextOrder: Order) {
  return current.map((order) => (order.id === nextOrder.id ? nextOrder : order));
}

export default function OrderListPage() {
  const accessToken = useSessionStore((state) => state.accessToken);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [operatingOrderId, setOperatingOrderId] = useState<string>();
  const hasLoadedRef = useRef(false);
  const ordersRef = useRef<Order[]>([]);
  const pageRef = useRef(1);
  const skipNextShowRefreshRef = useRef(false);
  const selectedStatusRef = useRef<OrderStatus>();
  const emptyState = getEmptyState(selectedStatus);
  selectedStatusRef.current = selectedStatus;

  const loadOrders = async (
    status = selectedStatus,
    options: { page?: number; append?: boolean; showLoading?: boolean } = {},
  ) => {
    const nextPage = options.page ?? 1;
    const append = options.append ?? false;
    const showLoading = options.showLoading ?? true;

    if (!accessToken) {
      setOrders([]);
      ordersRef.current = [];
      setPage(1);
      pageRef.current = 1;
      setTotal(0);
      return;
    }

    if (append) {
      setLoadingMore(true);
    } else if (showLoading) {
      setLoading(true);
    }

    try {
      const result = await fetchOrders({ status, page: nextPage, pageSize });
      setOrders((current) => {
        const nextOrders = append ? mergeOrders(current, result.items) : result.items;
        ordersRef.current = nextOrders;
        return nextOrders;
      });
      setPage(result.page);
      pageRef.current = result.page;
      setTotal(result.total);
      hasLoadedRef.current = true;
    } catch (error) {
      showApiError(error, '订单加载失败');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const handleOrderUpdate = (payload: OrderListUpdatePayload) => {
      skipNextShowRefreshRef.current = true;
      const nextOrder = payload.order;
      const status = selectedStatusRef.current;
      const currentOrders = ordersRef.current;
      const shouldShowOrder = !status || nextOrder.status === status;
      const existsInCurrentStatus = currentOrders.some((order) => order.id === nextOrder.id);
      const nextOrders = shouldShowOrder
        ? existsInCurrentStatus
          ? currentOrders.map((order) => (order.id === nextOrder.id ? nextOrder : order))
          : [nextOrder, ...currentOrders].slice(0, pageRef.current * pageSize)
        : currentOrders.filter((order) => order.id !== nextOrder.id);

      ordersRef.current = nextOrders;
      setOrders(nextOrders);

      setTotal((currentTotal) => {
        if (!shouldShowOrder && existsInCurrentStatus) {
          return Math.max(0, currentTotal - 1);
        }

        if (shouldShowOrder && !existsInCurrentStatus) {
          return currentTotal + 1;
        }

        return currentTotal;
      });
    };

    Taro.eventCenter.on(ORDER_LIST_UPDATE_EVENT, handleOrderUpdate);

    return () => {
      Taro.eventCenter.off(ORDER_LIST_UPDATE_EVENT, handleOrderUpdate);
    };
  }, []);

  useDidShow(() => {
    if (skipNextShowRefreshRef.current) {
      skipNextShowRefreshRef.current = false;
      return;
    }

    if (!hasLoadedRef.current) {
      void loadOrders(selectedStatus, { page: 1 });
    }
  });

  usePullDownRefresh(() => {
    void loadOrders(selectedStatus, { page: 1, showLoading: false }).finally(() => {
      Taro.stopPullDownRefresh();
    });
  });

  useReachBottom(() => {
    if (!loading && !loadingMore && orders.length < total) {
      void loadOrders(selectedStatus, { page: page + 1, append: true });
    }
  });

  const switchStatus = (status?: OrderStatus) => {
    setSelectedStatus(status);
    void loadOrders(status, { page: 1 });
  };

  const handlePrepay = async (order: Order) => {
    setOperatingOrderId(order.id);
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

      if (result.latestOrder) {
        setOrders((current) => {
          const nextOrders = replaceOrder(current, result.latestOrder);
          ordersRef.current = nextOrders;
          return nextOrders;
        });
      }

      await loadOrders(selectedStatus, { page: 1 });
    } catch (error) {
      showApiError(error, '支付失败');
    } finally {
      setOperatingOrderId(undefined);
    }
  };

  const handleCancel = async (order: Order) => {
    const result = await Taro.showModal({
      title: '取消订单',
      content: `确认取消订单 ${order.orderNo}？`,
      confirmText: '取消订单',
      confirmColor: '#dc2626',
    });

    if (!result.confirm) {
      return;
    }

    setOperatingOrderId(order.id);
    try {
      await cancelOrder(order.id, '用户取消订单');
      void Taro.showToast({ title: '订单已取消', icon: 'success' });
      await loadOrders(selectedStatus, { page: 1 });
    } catch (error) {
      showApiError(error, '取消失败');
    } finally {
      setOperatingOrderId(undefined);
    }
  };

  const handleConfirmReceived = async (order: Order) => {
    const result = await Taro.showModal({
      title: '确认收货',
      content: `确认订单 ${order.orderNo} 已收到商品？`,
      confirmText: '确认收货',
    });

    if (!result.confirm) {
      return;
    }

    setOperatingOrderId(order.id);
    try {
      await completeOrder(order.id);
      void Taro.showToast({ title: '订单已完成', icon: 'success' });
      await loadOrders(selectedStatus, { page: 1 });
    } catch (error) {
      showApiError(error, '确认收货失败');
    } finally {
      setOperatingOrderId(undefined);
    }
  };

  const openOrderDetail = (order: Order) => {
    void Taro.navigateTo({ url: `/pages/order/detail?id=${order.id}` });
  };

  if (!accessToken) {
    return (
      <PageShell>
        <View className="order-empty">
          <Text className="order-title">请先登录</Text>
          <Text className="order-copy">登录后可以查看订单状态和继续支付。</Text>
          <Button
            className="order-primary-button"
            onClick={() => Taro.switchTab({ url: '/pages/user/index' })}
          >
            去登录
          </Button>
        </View>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <View className="order-tabs">
        {statusTabs.map((tab) => {
          const isActive = selectedStatus === tab.status;

          return (
            <Text
              className={isActive ? 'order-tab active' : 'order-tab'}
              key={tab.label}
              onClick={() => switchStatus(tab.status)}
            >
              {tab.label}
            </Text>
          );
        })}
      </View>

      <View className="order-toolbar">
        <View className="order-toolbar-main">
          <Text className="order-toolbar-copy">
            {selectedStatus ? `${statusLabelMap[selectedStatus]}订单` : '全部订单'}
          </Text>
          <Text className="order-toolbar-meta">
            {orders.length > 0 ? `已显示 ${orders.length} / ${total} 单` : `共 ${total} 单`}
          </Text>
        </View>
        <Button
          className="order-refresh-button"
          loading={loading && orders.length > 0}
          onClick={() => void loadOrders(selectedStatus, { page: 1 })}
        >
          刷新
        </Button>
      </View>

      {loading && orders.length === 0 ? (
        <View className="order-empty">
          <Text className="order-title">正在加载订单</Text>
        </View>
      ) : null}

      {!loading && orders.length === 0 ? (
        <View className="order-empty">
          <Text className="order-title">{emptyState.title}</Text>
          <Text className="order-copy">{emptyState.copy}</Text>
          <Button
            className="order-primary-button"
            onClick={() => Taro.switchTab({ url: '/pages/home/index' })}
          >
            去逛逛
          </Button>
        </View>
      ) : null}

      {orders.length > 0 ? (
        <View className="order-list">
          {orders.map((order) => {
            const isOperating = operatingOrderId === order.id;
            const canPay = order.status === 'PENDING_PAYMENT';
            const canComplete = order.status === 'SHIPPED';

            return (
              <View className="order-card" key={order.id}>
                <View className="order-card-header" onClick={() => openOrderDetail(order)}>
                  <View>
                    <Text className="order-no">订单 {order.orderNo}</Text>
                    <Text className="order-time">{formatDate(order.createdAt)}</Text>
                  </View>
                  <Text className={getStatusClassName(order.status)}>
                    {statusLabelMap[order.status]}
                  </Text>
                </View>

                <Text className="order-hint" onClick={() => openOrderDetail(order)}>
                  {getOrderHint(order)}
                </Text>

                <View className="order-items" onClick={() => openOrderDetail(order)}>
                  {order.items.map((item) => {
                    const imageUrl = resolveAssetUrl(item.productImageUrl);

                    return (
                      <View className="order-item" key={item.id}>
                        <View className="order-item-image">
                          {imageUrl ? (
                            <Image className="order-image" mode="aspectFill" src={imageUrl} />
                          ) : (
                            <Text className="order-image-placeholder">商品</Text>
                          )}
                        </View>

                        <View className="order-item-body">
                          <Text className="order-product-name">{item.productName}</Text>
                          <Text className="order-sku-name">{renderSpecs(item)}</Text>
                          <View className="order-item-row">
                            <Text className="order-price">¥{item.unitPrice}</Text>
                            <Text className="order-quantity">x{item.quantity}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>

                <View className="order-footer">
                  <Text className="order-total">
                    共 {order.totalQuantity} 件，应付 ¥{order.payableAmount}
                  </Text>
                  <Text className="order-detail-link" onClick={() => openOrderDetail(order)}>
                    查看详情
                  </Text>

                  {canPay ? (
                    <View className="order-actions">
                      <Button
                        className="order-secondary-button"
                        disabled={isOperating}
                        onClick={() => void handleCancel(order)}
                      >
                        取消订单
                      </Button>
                      <Button
                        className="order-pay-button"
                        loading={isOperating}
                        onClick={() => void handlePrepay(order)}
                      >
                        {getPayButtonText()}
                      </Button>
                    </View>
                  ) : null}

                  {canComplete ? (
                    <View className="order-actions">
                      <Button
                        className="order-pay-button"
                        loading={isOperating}
                        onClick={() => void handleConfirmReceived(order)}
                      >
                        确认收货
                      </Button>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })}

          <View className="order-pagination-footer">
            {orders.length < total ? (
              <>
                <Text className="order-page-info">
                  已显示 {orders.length} / {total} 单
                </Text>
                <Button
                  className="order-load-more-button"
                  loading={loadingMore}
                  disabled={loadingMore}
                  onClick={() => void loadOrders(selectedStatus, { page: page + 1, append: true })}
                >
                  加载更多
                </Button>
              </>
            ) : (
              <Text className="order-list-end">已加载全部 {total} 单</Text>
            )}
          </View>
        </View>
      ) : null}
    </PageShell>
  );
}
