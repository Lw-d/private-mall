import { Button, Text, View } from '@tarojs/components';
import Taro, { useDidShow, usePullDownRefresh, useReachBottom } from '@tarojs/taro';
import { useEffect, useRef, useState } from 'react';

import { showApiError } from '../../api/error';
import { fetchAfterSaleSummary, fetchAfterSales } from '../../api/orderApi';
import { AfterSale, AfterSaleStatus, AfterSaleSummary, AfterSaleType } from '../../api/types';
import { PageShell } from '../../components/PageShell';
import { useSessionStore } from '../../store/sessionStore';
import { AFTER_SALE_LIST_UPDATE_EVENT, AfterSaleListUpdatePayload } from './events';
import './list.css';

interface StatusTab {
  label: string;
  status?: AfterSaleStatus;
}

interface TypeTab {
  label: string;
  type?: AfterSaleType;
}

interface AfterSaleFilters {
  status?: AfterSaleStatus;
  type?: AfterSaleType;
}

type StatusCountKey = 'ALL' | AfterSaleStatus;
type StatusCountMap = Partial<Record<StatusCountKey, number>>;

const pageSize = 10;

const statusTabs: StatusTab[] = [
  { label: '全部' },
  { label: '待审核', status: 'REQUESTED' },
  { label: '待退货', status: 'WAIT_BUYER_RETURN' },
  { label: '退款中', status: 'REFUNDING' },
  { label: '已完成', status: 'COMPLETED' },
];

const typeTabs: TypeTab[] = [
  { label: '全部类型' },
  { label: '仅退款', type: 'REFUND_ONLY' },
  { label: '退货退款', type: 'RETURN_REFUND' },
];

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

const afterSaleTypeLabelMap: Record<AfterSaleType, string> = {
  REFUND_ONLY: '仅退款',
  RETURN_REFUND: '退货退款',
};

function getStatusCountKey(status?: AfterSaleStatus): StatusCountKey {
  return status ?? 'ALL';
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

function getStatusClassName(status: AfterSaleStatus) {
  if (status === 'REQUESTED' || status === 'WAIT_BUYER_RETURN') {
    return 'after-sale-list-status active';
  }

  if (status === 'REFUNDING') {
    return 'after-sale-list-status pending';
  }

  if (status === 'COMPLETED') {
    return 'after-sale-list-status completed';
  }

  if (status === 'REJECTED' || status === 'CANCELLED') {
    return 'after-sale-list-status muted';
  }

  return 'after-sale-list-status';
}

function getStatusHint(afterSale: AfterSale) {
  if (afterSale.status === 'REQUESTED') {
    return '申请已提交，等待商家审核。';
  }

  if (afterSale.status === 'APPROVED') {
    return '商家已审核通过，等待后续退款处理。';
  }

  if (afterSale.status === 'WAIT_BUYER_RETURN') {
    return '商家已审核通过，请填写退货物流。';
  }

  if (afterSale.status === 'BUYER_RETURNED') {
    return '退货物流已提交，等待商家确认收货。';
  }

  if (afterSale.status === 'MERCHANT_RECEIVED') {
    return '商家已收货，等待触发退款。';
  }

  if (afterSale.status === 'REFUNDING') {
    return '退款处理中，请等待退款结果。';
  }

  if (afterSale.status === 'REJECTED') {
    return afterSale.rejectReason ? `商家已驳回：${afterSale.rejectReason}` : '商家已驳回申请。';
  }

  if (afterSale.status === 'CANCELLED') {
    return '售后申请已取消。';
  }

  return '售后已完成。';
}

function getActionText(status: AfterSaleStatus) {
  if (status === 'WAIT_BUYER_RETURN') {
    return '填写物流';
  }

  if (status === 'REQUESTED' || status === 'REFUNDING') {
    return '查看进度';
  }

  return '查看详情';
}

function getFilterLabel(status?: AfterSaleStatus, type?: AfterSaleType) {
  if (status && type) {
    return `${afterSaleStatusLabelMap[status]} · ${afterSaleTypeLabelMap[type]}`;
  }

  if (status) {
    return afterSaleStatusLabelMap[status];
  }

  if (type) {
    return afterSaleTypeLabelMap[type];
  }

  return '';
}

function getEmptyState(status?: AfterSaleStatus, type?: AfterSaleType) {
  const filterLabel = getFilterLabel(status, type);

  if (!filterLabel) {
    return {
      title: '暂无售后记录',
      copy: '从订单详情页申请售后后会显示在这里。',
    };
  }

  return {
    title: `暂无${filterLabel}售后`,
    copy: '该状态下暂时没有售后申请。',
  };
}

function matchesAfterSaleFilters(afterSale: AfterSale, filters: AfterSaleFilters) {
  return (
    (!filters.status || afterSale.status === filters.status) &&
    (!filters.type || afterSale.type === filters.type)
  );
}

function formatCount(count?: number) {
  return count === undefined ? '-' : String(count);
}

function buildStatusCounts(summary: AfterSaleSummary): StatusCountMap {
  const counts: StatusCountMap = {
    ALL: summary.total,
  };

  for (const item of summary.statusCounts) {
    counts[item.status] = item.count;
  }

  return counts;
}

function mergeAfterSales(current: AfterSale[], next: AfterSale[]) {
  const afterSaleMap = new Map(current.map((afterSale) => [afterSale.id, afterSale]));

  for (const afterSale of next) {
    afterSaleMap.set(afterSale.id, afterSale);
  }

  return Array.from(afterSaleMap.values());
}

export default function AfterSaleListPage() {
  const accessToken = useSessionStore((state) => state.accessToken);
  const [selectedStatus, setSelectedStatus] = useState<AfterSaleStatus>();
  const [selectedType, setSelectedType] = useState<AfterSaleType>();
  const [afterSales, setAfterSales] = useState<AfterSale[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState<StatusCountMap>({});
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const hasLoadedRef = useRef(false);
  const afterSalesRef = useRef<AfterSale[]>([]);
  const pageRef = useRef(1);
  const selectedStatusRef = useRef<AfterSaleStatus>();
  const selectedTypeRef = useRef<AfterSaleType>();
  const skipNextShowRefreshRef = useRef(false);
  const emptyState = getEmptyState(selectedStatus, selectedType);
  const activeFilterLabel = getFilterLabel(selectedStatus, selectedType);
  const requestedCount = statusCounts.REQUESTED;
  const waitReturnCount = statusCounts.WAIT_BUYER_RETURN;
  const waitReturnValue = waitReturnCount ?? 0;
  const refundingCount = statusCounts.REFUNDING;
  const allCount = statusCounts.ALL;
  selectedStatusRef.current = selectedStatus;
  selectedTypeRef.current = selectedType;

  const loadAfterSales = async (
    filters: AfterSaleFilters = {
      status: selectedStatusRef.current,
      type: selectedTypeRef.current,
    },
    options: { page?: number; append?: boolean; showLoading?: boolean } = {},
  ) => {
    const status = filters.status;
    const type = filters.type;
    const nextPage = options.page ?? 1;
    const append = options.append ?? false;
    const showLoading = options.showLoading ?? true;

    if (!accessToken) {
      setAfterSales([]);
      afterSalesRef.current = [];
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
      const result = await fetchAfterSales({ status, type, page: nextPage, pageSize });
      setAfterSales((current) => {
        const nextAfterSales = append ? mergeAfterSales(current, result.items) : result.items;
        afterSalesRef.current = nextAfterSales;
        return nextAfterSales;
      });
      setPage(result.page);
      pageRef.current = result.page;
      setTotal(result.total);
      hasLoadedRef.current = true;
    } catch (error) {
      showApiError(error, '售后记录加载失败');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadStatusCounts = async (type = selectedTypeRef.current) => {
    if (!accessToken) {
      setStatusCounts({});
      return;
    }

    setSummaryLoading(true);
    try {
      const summary = await fetchAfterSaleSummary({ type });

      setStatusCounts(buildStatusCounts(summary));
    } catch (error) {
      showApiError(error, '售后分组加载失败');
    } finally {
      setSummaryLoading(false);
    }
  };

  const refreshCurrent = (options: { showLoading?: boolean } = {}) => {
    const filters = {
      status: selectedStatusRef.current,
      type: selectedTypeRef.current,
    };

    void Promise.all([
      loadAfterSales(filters, { page: 1, showLoading: options.showLoading }),
      loadStatusCounts(filters.type),
    ]);
  };

  useEffect(() => {
    const handleAfterSaleUpdate = (payload: AfterSaleListUpdatePayload) => {
      const nextAfterSale = payload.afterSale;
      const filters = {
        status: selectedStatusRef.current,
        type: selectedTypeRef.current,
      };
      const currentAfterSales = afterSalesRef.current;
      const existsInCurrentList = currentAfterSales.some(
        (afterSale) => afterSale.id === nextAfterSale.id,
      );
      const shouldShowAfterSale = matchesAfterSaleFilters(nextAfterSale, filters);
      const nextAfterSales = shouldShowAfterSale
        ? existsInCurrentList
          ? currentAfterSales.map((afterSale) =>
              afterSale.id === nextAfterSale.id ? nextAfterSale : afterSale,
            )
          : [nextAfterSale, ...currentAfterSales].slice(0, pageRef.current * pageSize)
        : currentAfterSales.filter((afterSale) => afterSale.id !== nextAfterSale.id);

      skipNextShowRefreshRef.current = true;
      afterSalesRef.current = nextAfterSales;
      setAfterSales(nextAfterSales);

      setTotal((currentTotal) => {
        if (!shouldShowAfterSale && existsInCurrentList) {
          return Math.max(0, currentTotal - 1);
        }

        if (shouldShowAfterSale && !existsInCurrentList) {
          return currentTotal + 1;
        }

        return currentTotal;
      });

      void loadStatusCounts(selectedTypeRef.current);
    };

    Taro.eventCenter.on(AFTER_SALE_LIST_UPDATE_EVENT, handleAfterSaleUpdate);

    return () => {
      Taro.eventCenter.off(AFTER_SALE_LIST_UPDATE_EVENT, handleAfterSaleUpdate);
    };
  }, []);

  useDidShow(() => {
    if (skipNextShowRefreshRef.current) {
      skipNextShowRefreshRef.current = false;
      return;
    }

    if (!hasLoadedRef.current) {
      refreshCurrent();
      return;
    }

    refreshCurrent({ showLoading: false });
  });

  usePullDownRefresh(() => {
    void Promise.all([
      loadAfterSales(
        { status: selectedStatusRef.current, type: selectedTypeRef.current },
        { page: 1, showLoading: false },
      ),
      loadStatusCounts(selectedTypeRef.current),
    ]).finally(() => {
      Taro.stopPullDownRefresh();
    });
  });

  useReachBottom(() => {
    if (!loading && !loadingMore && afterSales.length < total) {
      void loadAfterSales(
        { status: selectedStatusRef.current, type: selectedTypeRef.current },
        { page: page + 1, append: true },
      );
    }
  });

  const switchStatus = (status?: AfterSaleStatus) => {
    setSelectedStatus(status);
    selectedStatusRef.current = status;
    void loadAfterSales({ status, type: selectedTypeRef.current }, { page: 1 });
  };

  const switchType = (type?: AfterSaleType) => {
    setSelectedType(type);
    selectedTypeRef.current = type;
    void Promise.all([
      loadAfterSales({ status: selectedStatusRef.current, type }, { page: 1 }),
      loadStatusCounts(type),
    ]);
  };

  const openDetail = (afterSale: AfterSale) => {
    void Taro.navigateTo({ url: `/pages/after-sale/detail?id=${afterSale.id}&from=list` });
  };

  const renderStatusTabLabel = (tab: StatusTab) => {
    const count = statusCounts[getStatusCountKey(tab.status)];

    return count === undefined ? tab.label : `${tab.label} ${count}`;
  };

  if (!accessToken) {
    return (
      <PageShell>
        <View className="after-sale-list-empty">
          <Text className="after-sale-list-title">请先登录</Text>
          <Text className="after-sale-list-copy">登录后可以查看售后申请和处理进度。</Text>
          <Button
            className="after-sale-list-primary-button"
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
      <View className="after-sale-list-tabs">
        {statusTabs.map((tab) => {
          const isActive = selectedStatus === tab.status;

          return (
            <Text
              className={isActive ? 'after-sale-list-tab active' : 'after-sale-list-tab'}
              key={tab.label}
              onClick={() => switchStatus(tab.status)}
            >
              {renderStatusTabLabel(tab)}
            </Text>
          );
        })}
      </View>

      <View className="after-sale-list-type-tabs">
        {typeTabs.map((tab) => {
          const isActive = selectedType === tab.type;

          return (
            <Text
              className={isActive ? 'after-sale-list-type-tab active' : 'after-sale-list-type-tab'}
              key={tab.label}
              onClick={() => switchType(tab.type)}
            >
              {tab.label}
            </Text>
          );
        })}
      </View>

      <View className="after-sale-list-summary">
        <View className="after-sale-list-summary-item" onClick={() => switchStatus(undefined)}>
          <Text className="after-sale-list-summary-value">{formatCount(allCount)}</Text>
          <Text className="after-sale-list-summary-label">
            {summaryLoading ? '更新中' : '全部售后'}
          </Text>
        </View>
        <View className="after-sale-list-summary-item" onClick={() => switchStatus('REQUESTED')}>
          <Text className="after-sale-list-summary-value">{formatCount(requestedCount)}</Text>
          <Text className="after-sale-list-summary-label">待审核</Text>
        </View>
        <View
          className={
            waitReturnValue > 0
              ? 'after-sale-list-summary-item action'
              : 'after-sale-list-summary-item'
          }
          onClick={() => switchStatus('WAIT_BUYER_RETURN')}
        >
          <Text className="after-sale-list-summary-value">{formatCount(waitReturnCount)}</Text>
          <Text className="after-sale-list-summary-label">待退货</Text>
          {waitReturnValue > 0 ? (
            <Text className="after-sale-list-summary-badge">去处理</Text>
          ) : null}
        </View>
        <View className="after-sale-list-summary-item" onClick={() => switchStatus('REFUNDING')}>
          <Text className="after-sale-list-summary-value">{formatCount(refundingCount)}</Text>
          <Text className="after-sale-list-summary-label">退款中</Text>
        </View>
      </View>

      <View className="after-sale-list-toolbar">
        <View className="after-sale-list-toolbar-main">
          <Text className="after-sale-list-toolbar-copy">
            {activeFilterLabel ? `${activeFilterLabel}售后` : '全部售后'}
          </Text>
          <Text className="after-sale-list-toolbar-meta">
            {afterSales.length > 0 ? `已显示 ${afterSales.length} / ${total} 单` : `共 ${total} 单`}
          </Text>
        </View>
        <Button
          className="after-sale-list-refresh-button"
          loading={loading && afterSales.length > 0}
          onClick={() => refreshCurrent()}
        >
          刷新
        </Button>
      </View>

      {loading && afterSales.length === 0 ? (
        <View className="after-sale-list-empty">
          <Text className="after-sale-list-title">正在加载售后</Text>
        </View>
      ) : null}

      {!loading && afterSales.length === 0 ? (
        <View className="after-sale-list-empty">
          <Text className="after-sale-list-title">{emptyState.title}</Text>
          <Text className="after-sale-list-copy">{emptyState.copy}</Text>
          <Button
            className="after-sale-list-primary-button"
            onClick={() => Taro.navigateTo({ url: '/pages/order/list' })}
          >
            查看订单
          </Button>
        </View>
      ) : null}

      {afterSales.length > 0 ? (
        <View className="after-sale-list">
          {afterSales.map((afterSale) => (
            <View className="after-sale-list-card" key={afterSale.id}>
              <View className="after-sale-list-card-head">
                <View className="after-sale-list-card-main" onClick={() => openDetail(afterSale)}>
                  <Text className="after-sale-list-no">售后 {afterSale.afterSaleNo}</Text>
                  <Text className="after-sale-list-time">{formatDate(afterSale.createdAt)}</Text>
                </View>
                <Text className={getStatusClassName(afterSale.status)}>
                  {afterSaleStatusLabelMap[afterSale.status]}
                </Text>
              </View>

              <Text className="after-sale-list-hint" onClick={() => openDetail(afterSale)}>
                {getStatusHint(afterSale)}
              </Text>

              <View className="after-sale-list-info" onClick={() => openDetail(afterSale)}>
                <View className="after-sale-list-info-row">
                  <Text className="after-sale-list-label">售后类型</Text>
                  <Text className="after-sale-list-value">
                    {afterSaleTypeLabelMap[afterSale.type]}
                  </Text>
                </View>
                <View className="after-sale-list-info-row">
                  <Text className="after-sale-list-label">申请金额</Text>
                  <Text className="after-sale-list-payable">¥{afterSale.requestedAmount}</Text>
                </View>
                <View className="after-sale-list-info-row">
                  <Text className="after-sale-list-label">关联订单</Text>
                  <Text className="after-sale-list-value">
                    {afterSale.order?.orderNo ?? afterSale.orderId}
                  </Text>
                </View>
                <View className="after-sale-list-info-row">
                  <Text className="after-sale-list-label">申请原因</Text>
                  <Text className="after-sale-list-value">{afterSale.reason}</Text>
                </View>
              </View>

              <View className="after-sale-list-actions">
                {afterSale.order?.id ? (
                  <Button
                    className="after-sale-list-secondary-button"
                    onClick={() =>
                      Taro.navigateTo({ url: `/pages/order/detail?id=${afterSale.order?.id}` })
                    }
                  >
                    订单详情
                  </Button>
                ) : null}
                <Button
                  className="after-sale-list-primary-action"
                  onClick={() => openDetail(afterSale)}
                >
                  {getActionText(afterSale.status)}
                </Button>
              </View>
            </View>
          ))}

          <View className="after-sale-list-pagination-footer">
            {afterSales.length < total ? (
              <>
                <Text className="after-sale-list-page-info">
                  已显示 {afterSales.length} / {total} 单
                </Text>
                <Button
                  className="after-sale-list-load-more-button"
                  loading={loadingMore}
                  disabled={loadingMore}
                  onClick={() =>
                    void loadAfterSales(
                      { status: selectedStatusRef.current, type: selectedTypeRef.current },
                      { page: page + 1, append: true },
                    )
                  }
                >
                  加载更多
                </Button>
              </>
            ) : (
              <Text className="after-sale-list-end">已加载全部 {total} 单</Text>
            )}
          </View>
        </View>
      ) : null}
    </PageShell>
  );
}
