import { Order } from '../../api/types';

export const ORDER_LIST_UPDATE_EVENT = 'order:list:update';
export const ORDER_ADDRESS_SELECTED_EVENT = 'order:address:selected';

export interface OrderListUpdatePayload {
  order: Order;
}

export interface OrderAddressSelectedPayload {
  addressId: string;
}
