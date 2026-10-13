import { createReducer, on } from '@ngrx/store';

import {
  initialOrderState
} from './order.state';

import {
  createOrder,
  createOrderSuccess,
  createOrderFailure,

  loadOrders,
  loadOrdersSuccess,
  loadOrdersFailure,

  cancelOrder,
  cancelOrderSuccess,
  cancelOrderFailure

} from './order.actions';


export const orderReducer = createReducer(

  initialOrderState,


  // =====================================================
  // CREATE ORDER
  // =====================================================

  on(
    createOrder,
    (state) => ({

      ...state,

      loading: true,

      error: null

    })
  ),


  on(
    createOrderSuccess,
    (state, { order }) => ({

      ...state,

      orders: [
        ...state.orders,
        order
      ],

      loading: false,

      error: null

    })
  ),


  on(
    createOrderFailure,
    (state, { error }) => ({

      ...state,

      loading: false,

      error

    })
  ),


  // =====================================================
  // LOAD ORDERS
  // =====================================================

  on(
    loadOrders,
    (state) => ({

      ...state,

      loading: true,

      error: null

    })
  ),


  on(
    loadOrdersSuccess,
    (state, { orders }) => ({

      ...state,

      orders,

      loading: false,

      error: null

    })
  ),


  on(
    loadOrdersFailure,
    (state, { error }) => ({

      ...state,

      loading: false,

      error

    })
  ),


  // =====================================================
  // CANCEL ORDER
  // =====================================================

  on(
    cancelOrder,
    (state) => ({

      ...state,

      loading: true,

      error: null

    })
  ),


  on(
    cancelOrderSuccess,
    (state, { order }) => ({

      ...state,

      orders: state.orders.map(
        existingOrder =>
          String(existingOrder.id) === String(order.id)
            ? order
            : existingOrder
      ),

      loading: false,

      error: null

    })
  ),


  on(
    cancelOrderFailure,
    (state, { error }) => ({

      ...state,

      loading: false,

      error

    })
  )

);