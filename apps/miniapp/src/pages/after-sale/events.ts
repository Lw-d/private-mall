import Taro from '@tarojs/taro';

import { AfterSale } from '../../api/types';

export const AFTER_SALE_LIST_UPDATE_EVENT = 'after-sale:list:update';

export interface AfterSaleListUpdatePayload {
  afterSale: AfterSale;
}

export function emitAfterSaleListUpdate(afterSale: AfterSale) {
  Taro.eventCenter.trigger(AFTER_SALE_LIST_UPDATE_EVENT, { afterSale });
}
