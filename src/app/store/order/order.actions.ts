import { createAction, props } from '@ngrx/store';

import { Order } from '../../core/models/order.model';


// =====================================================
// CREATE ORDER
// =====================================================

export const createOrder = createAction(
  '[Order] Create Order',
  props<{ order: Order }>()
);


export const createOrderSuccess = createAction(
  '[Order] Create Order Success',
  props<{ order: Order }>()
);


export const createOrderFailure = createAction(
  '[Order] Create Order Failure',
  props<{ error: string }>()
);


// =====================================================
// LOAD ORDERS
// =====================================================

export const loadOrders = createAction(
  '[Order] Load Orders'
);


export const loadOrdersSuccess = createAction(
  '[Order] Load Orders Success',
  props<{ orders: Order[] }>()
);


export const loadOrdersFailure = createAction(
  '[Order] Load Orders Failure',
  props<{ error: string }>()
);


// =====================================================
// CANCEL ORDER
// =====================================================

export const cancelOrder = createAction(
  '[Order] Cancel Order',
  props<{
    orderId: number;
    reason: string;
  }>()
);


export const cancelOrderSuccess = createAction(
  '[Order] Cancel Order Success',
  props<{ order: Order }>()
);


export const cancelOrderFailure = createAction(
  '[Order] Cancel Order Failure',
  props<{ error: string }>()
);