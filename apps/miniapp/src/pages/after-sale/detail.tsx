import { Button, Image, Input, Text, View } from '@tarojs/components';
import Taro, { useDidShow, useRouter } from '@tarojs/taro';
import { useState } from 'react';

import { showApiError } from '../../api/error';
import { cancelAfterSale, fetchAfterSaleDetail, submitReturnLogistics } from '../../api/orderApi';
import {
  AfterSale,
  AfterSaleActorType,
  AfterSaleStatus,
  AfterSaleType,
  RefundStatus,
  SubmitReturnLogisticsInput,
} from '../../api/types';
import { PageShell } from '../../components/PageShell';
import { useSessionStore } from '../../store/sessionStore';
import { emitAfterSaleListUpdate } from './events';
import './detail.css';

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

function getStatusHint(afterSale: AfterSale) {
  if (afterSale.status === 'REQUESTED') {
    return '售后申请已提交，请等待商家审核。';
  }

  if (afterSale.status === 'APPROVED') {
    return '商家已审核通过，后续将继续处理退款。';
  }

  if (afterSale.status === 'WAIT_BUYER_RETURN') {
    return '商家已审核通过，请填写退货物流信息。';
  }

  if (afterSale.status === 'BUYER_RETURNED') {
    return '退货物流已提交，请等待商家确认收货。';
  }

  if (afterSale.status === 'MERCHANT_RECEIVED') {
    return '商家已确认收到退货，请等待商家触发退款。';
  }

  if (afterSale.status === 'REFUNDING') {
    return '售后退款处理中，请等待退款结果。';
  }

  if (afterSale.status === 'REJECTED') {
    return afterSale.rejectReason
      ? `商家已驳回：${afterSale.rejectReason}`
      : '商家已驳回售后申请。';
  }

  if (afterSale.status === 'CANCELLED') {
    return '售后申请已取消。';
  }

  if (afterSale.status === 'COMPLETED') {
    return '售后已完成。';
  }

  return '售后正在处理中。';
}

function canCancel(afterSale: AfterSale) {
  return afterSale.status === 'REQUESTED' || afterSale.status === 'WAIT_BUYER_RETURN';
}

function previewEvidenceImage(url: string, urls: string[]) {
  void Taro.previewImage({
    current: url,
    urls,
  });
}

export default function AfterSaleDetailPage() {
  const router = useRouter();
  const accessToken = useSessionStore((state) => state.accessToken);
  const afterSaleId = router.params.id;
  const fromList = router.params.from === 'list';
  const [afterSale, setAfterSale] = useState<AfterSale>();
  const [loading, setLoading] = useState(false);
  const [operating, setOperating] = useState(false);
  const [returnLogisticsCompany, setReturnLogisticsCompany] = useState('');
  const [returnTrackingNo, setReturnTrackingNo] = useState('');
  const [returnRemark, setReturnRemark] = useState('');

  const load = async () => {
    if (!accessToken || !afterSaleId) {
      setAfterSale(undefined);
      return;
    }

    setLoading(true);
    try {
      setAfterSale(await fetchAfterSaleDetail(afterSaleId));
    } catch (error) {
      showApiError(error, '售后详情加载失败');
    } finally {
      setLoading(false);
    }
  };

  useDidShow(() => {
    void load();
  });

  const cancel = async () => {
    if (!afterSale || operating) {
      return;
    }

    const result = await Taro.showModal({
      title: '取消售后',
      content: `确认取消售后单 ${afterSale.afterSaleNo}？`,
      confirmText: '取消售后',
      confirmColor: '#dc2626',
    });

    if (!result.confirm) {
      return;
    }

    setOperating(true);
    try {
      const nextAfterSale = await cancelAfterSale(afterSale.id);
      setAfterSale(nextAfterSale);
      emitAfterSaleListUpdate(nextAfterSale);
      void Taro.showToast({ title: '售后已取消', icon: 'success' });
    } catch (error) {
      showApiError(error, '取消售后失败');
    } finally {
      setOperating(false);
    }
  };

  const submitLogistics = async () => {
    if (!afterSale || operating) {
      return;
    }

    const input: SubmitReturnLogisticsInput = {
      returnLogisticsCompany: returnLogisticsCompany.trim(),
      returnTrackingNo: returnTrackingNo.trim(),
      returnRemark: returnRemark.trim() || undefined,
    };

    if (!input.returnLogisticsCompany || !input.returnTrackingNo) {
      void Taro.showToast({ title: '请填写物流公司和单号', icon: 'none' });
      return;
    }

    setOperating(true);
    try {
      const nextAfterSale = await submitReturnLogistics(afterSale.id, input);
      setAfterSale(nextAfterSale);
      emitAfterSaleListUpdate(nextAfterSale);
      setReturnLogisticsCompany('');
      setReturnTrackingNo('');
      setReturnRemark('');
      void Taro.showToast({ title: '退货物流已提交', icon: 'success' });
    } catch (error) {
      showApiError(error, '提交退货物流失败');
    } finally {
      setOperating(false);
    }
  };

  if (!accessToken) {
    return (
      <PageShell>
        <View className="after-sale-empty">
          <Text className="after-sale-empty-title">请先登录</Text>
          <Text className="after-sale-empty-copy">登录后可以查看售后详情。</Text>
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

  if (!afterSaleId) {
    return (
      <PageShell>
        <View className="after-sale-empty">
          <Text className="after-sale-empty-title">售后不存在</Text>
          <Text className="after-sale-empty-copy">缺少售后 ID，请从订单详情页重新进入。</Text>
          <Button className="after-sale-primary-button" onClick={() => Taro.navigateBack()}>
            返回
          </Button>
        </View>
      </PageShell>
    );
  }

  if (loading && !afterSale) {
    return (
      <PageShell>
        <View className="after-sale-empty">
          <Text className="after-sale-empty-title">正在加载售后</Text>
        </View>
      </PageShell>
    );
  }

  if (!afterSale) {
    return (
      <PageShell>
        <View className="after-sale-empty">
          <Text className="after-sale-empty-title">售后加载失败</Text>
          <Text className="after-sale-empty-copy">可以重试读取售后信息。</Text>
          <Button className="after-sale-primary-button" onClick={() => void load()}>
            重试
          </Button>
        </View>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <View className="after-sale-page">
        <View className="after-sale-status-card">
          <View className="after-sale-status-head">
            <Text className="after-sale-status">{afterSaleStatusLabelMap[afterSale.status]}</Text>
            <Button
              className="after-sale-refresh-button light"
              loading={loading}
              onClick={() => void load()}
            >
              刷新
            </Button>
          </View>
          <Text className="after-sale-status-copy">{getStatusHint(afterSale)}</Text>
        </View>

        {canCancel(afterSale) ? (
          <View className="after-sale-action-bar">
            <Button
              className="after-sale-secondary-button danger"
              loading={operating}
              onClick={() => void cancel()}
            >
              取消售后
            </Button>
          </View>
        ) : null}

        {afterSale.status === 'WAIT_BUYER_RETURN' ? (
          <View className="after-sale-section">
            <Text className="after-sale-section-title">退货物流</Text>
            <View className="after-sale-form-field">
              <Text className="after-sale-form-label">物流公司</Text>
              <Input
                className="after-sale-input"
                maxlength={64}
                placeholder="例如 顺丰速运"
                value={returnLogisticsCompany}
                onInput={(event) => setReturnLogisticsCompany(event.detail.value)}
              />
            </View>
            <View className="after-sale-form-field">
              <Text className="after-sale-form-label">物流单号</Text>
              <Input
                className="after-sale-input"
                maxlength={64}
                placeholder="请输入退货物流单号"
                value={returnTrackingNo}
                onInput={(event) => setReturnTrackingNo(event.detail.value)}
              />
            </View>
            <View className="after-sale-form-field">
              <Text className="after-sale-form-label">退货备注</Text>
              <Input
                className="after-sale-input"
                maxlength={255}
                placeholder="选填"
                value={returnRemark}
                onInput={(event) => setReturnRemark(event.detail.value)}
              />
            </View>
            <Button
              className="after-sale-submit-button"
              loading={operating}
              onClick={() => void submitLogistics()}
            >
              提交退货物流
            </Button>
          </View>
        ) : null}

        <View className="after-sale-section">
          <Text className="after-sale-section-title">售后信息</Text>
          <View className="after-sale-info-row">
            <Text className="after-sale-info-label">售后单号</Text>
            <Text className="after-sale-info-value">{afterSale.afterSaleNo}</Text>
          </View>
          <View className="after-sale-info-row">
            <Text className="after-sale-info-label">售后类型</Text>
            <Text className="after-sale-info-value">{afterSaleTypeLabelMap[afterSale.type]}</Text>
          </View>
          <View className="after-sale-info-row">
            <Text className="after-sale-info-label">申请金额</Text>
            <Text className="after-sale-payable">¥{afterSale.requestedAmount}</Text>
          </View>
          <View className="after-sale-info-row">
            <Text className="after-sale-info-label">申请原因</Text>
            <Text className="after-sale-info-value">{afterSale.reason}</Text>
          </View>
          {afterSale.description ? (
            <View className="after-sale-info-row">
              <Text className="after-sale-info-label">补充说明</Text>
              <Text className="after-sale-info-value">{afterSale.description}</Text>
            </View>
          ) : null}
          {afterSale.evidenceImageUrls?.length ? (
            <View className="after-sale-evidence-block">
              <Text className="after-sale-info-label">凭证图片</Text>
              <View className="after-sale-evidence-list">
                {afterSale.evidenceImageUrls.map((url, index) => (
                  <View
                    className="after-sale-evidence-item"
                    key={`${url}-${index}`}
                    onClick={() =>
                      previewEvidenceImage(url, afterSale.evidenceImageUrls?.filter(Boolean) ?? [])
                    }
                  >
                    <Image className="after-sale-evidence-image" mode="aspectFill" src={url} />
                    <Text className="after-sale-evidence-index">{index + 1}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          {afterSale.approvedAmount ? (
            <View className="after-sale-info-row">
              <Text className="after-sale-info-label">通过金额</Text>
              <Text className="after-sale-info-value">¥{afterSale.approvedAmount}</Text>
            </View>
          ) : null}
          {afterSale.merchantRemark ? (
            <View className="after-sale-info-row">
              <Text className="after-sale-info-label">商家备注</Text>
              <Text className="after-sale-info-value">{afterSale.merchantRemark}</Text>
            </View>
          ) : null}
          {afterSale.returnLogisticsCompany ? (
            <View className="after-sale-info-row">
              <Text className="after-sale-info-label">退货物流</Text>
              <Text className="after-sale-info-value">
                {afterSale.returnLogisticsCompany} {afterSale.returnTrackingNo ?? ''}
              </Text>
            </View>
          ) : null}
          {afterSale.returnRemark ? (
            <View className="after-sale-info-row">
              <Text className="after-sale-info-label">退货备注</Text>
              <Text className="after-sale-info-value">{afterSale.returnRemark}</Text>
            </View>
          ) : null}
          {afterSale.buyerReturnedAt ? (
            <View className="after-sale-info-row">
              <Text className="after-sale-info-label">退货时间</Text>
              <Text className="after-sale-info-value">{formatDate(afterSale.buyerReturnedAt)}</Text>
            </View>
          ) : null}
          {afterSale.merchantReceivedAt ? (
            <View className="after-sale-info-row">
              <Text className="after-sale-info-label">收货时间</Text>
              <Text className="after-sale-info-value">
                {formatDate(afterSale.merchantReceivedAt)}
              </Text>
            </View>
          ) : null}
          {afterSale.refund ? (
            <>
              <View className="after-sale-info-row">
                <Text className="after-sale-info-label">退款单号</Text>
                <Text className="after-sale-info-value">{afterSale.refund.refundNo}</Text>
              </View>
              <View className="after-sale-info-row">
                <Text className="after-sale-info-label">退款状态</Text>
                <Text className="after-sale-info-value">
                  {refundStatusLabelMap[afterSale.refund.status]}
                </Text>
              </View>
              <View className="after-sale-info-row">
                <Text className="after-sale-info-label">退款金额</Text>
                <Text className="after-sale-info-value">¥{afterSale.refund.amount}</Text>
              </View>
              {afterSale.refund.failureReason ? (
                <View className="after-sale-info-row">
                  <Text className="after-sale-info-label">失败原因</Text>
                  <Text className="after-sale-info-value">{afterSale.refund.failureReason}</Text>
                </View>
              ) : null}
            </>
          ) : null}
        </View>

        <View className="after-sale-section">
          <Text className="after-sale-section-title">订单信息</Text>
          <View className="after-sale-info-row">
            <Text className="after-sale-info-label">订单号</Text>
            <Text className="after-sale-info-value">{afterSale.order?.orderNo ?? '-'}</Text>
          </View>
          <View className="after-sale-info-row">
            <Text className="after-sale-info-label">实付金额</Text>
            <Text className="after-sale-info-value">¥{afterSale.order?.payableAmount ?? '-'}</Text>
          </View>
        </View>

        <View className="after-sale-section">
          <Text className="after-sale-section-title">处理记录</Text>
          {afterSale.logs?.length ? (
            <View className="after-sale-log-list">
              {afterSale.logs.map((log) => (
                <View className="after-sale-log-item" key={log.id}>
                  <View className="after-sale-log-dot" />
                  <View className="after-sale-log-body">
                    <View className="after-sale-log-head">
                      <Text className="after-sale-log-title">
                        {actorLabelMap[log.actorType]} · {log.action}
                      </Text>
                      <Text className="after-sale-log-time">{formatDate(log.createdAt)}</Text>
                    </View>
                    {log.content ? (
                      <Text className="after-sale-log-copy">{log.content}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className="after-sale-placeholder">
              <Text>暂无处理记录</Text>
            </View>
          )}
        </View>

        <View className="after-sale-footer-actions">
          <Button
            className="after-sale-back-button"
            onClick={() =>
              fromList ? Taro.navigateBack() : Taro.redirectTo({ url: '/pages/after-sale/list' })
            }
          >
            售后记录
          </Button>
          <Button
            className="after-sale-order-button"
            onClick={() =>
              afterSale.orderId
                ? Taro.redirectTo({ url: `/pages/order/detail?id=${afterSale.orderId}` })
                : Taro.navigateBack()
            }
          >
            订单详情
          </Button>
        </View>
      </View>
    </PageShell>
  );
}
