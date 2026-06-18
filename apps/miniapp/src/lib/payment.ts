import Taro from '@tarojs/taro';

import { fetchOrderDetail } from '../api/orderApi';
import { createWechatPrepay, mockWechatPayNotify } from '../api/paymentApi';
import { Order } from '../api/types';

export const PAYMENT_MODE = __PAYMENT_MODE__;
const realPayPollIntervals = [800, 1200, 1600, 2400];

export function getPayButtonText() {
  return PAYMENT_MODE === 'real' ? '去支付' : '模拟支付';
}

export async function payOrder(order: Order) {
  const result = await createWechatPrepay(order.id);

  if (PAYMENT_MODE === 'real') {
    await Taro.requestPayment({
      timeStamp: result.wechatPayParams.timeStamp,
      nonceStr: result.wechatPayParams.nonceStr,
      package: result.wechatPayParams.package,
      signType: result.wechatPayParams.signType as 'RSA',
      paySign: result.wechatPayParams.paySign,
    });

    const latestOrder = await pollPaidOrder(order.id);

    return {
      submitted: true,
      mockPaid: false,
      latestOrder,
    };
  }

  const confirmResult = await Taro.showModal({
    title: '模拟微信支付',
    content: `支付单号：${result.payment.paymentNo}\n应付金额：¥${order.payableAmount}`,
    confirmText: '支付成功',
    cancelText: '稍后支付',
  });

  if (!confirmResult.confirm) {
    return {
      submitted: false,
      mockPaid: false,
    };
  }

  await mockWechatPayNotify({
    orderId: order.id,
    orderNo: order.orderNo,
    transactionId: createMockTransactionId(order.orderNo),
    amount: Number(order.payableAmount),
    tradeState: 'SUCCESS',
  });

  return {
    submitted: true,
    mockPaid: true,
    latestOrder: await fetchOrderDetail(order.id),
  };
}

function createMockTransactionId(orderNo: string) {
  return `WX_MOCK_${orderNo}_${Date.now()}`;
}

async function pollPaidOrder(orderId: string) {
  let latestOrder = await fetchOrderDetail(orderId);

  if (latestOrder.status !== 'PENDING_PAYMENT') {
    return latestOrder;
  }

  for (const interval of realPayPollIntervals) {
    await wait(interval);
    latestOrder = await fetchOrderDetail(orderId);

    if (latestOrder.status !== 'PENDING_PAYMENT') {
      return latestOrder;
    }
  }

  return latestOrder;
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
