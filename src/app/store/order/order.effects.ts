import { Injectable, inject } from '@angular/core';

import {
  Actions,
  createEffect,
  ofType
} from '@ngrx/effects';

import {
  catchError,
  map,
  switchMap,
  tap
} from 'rxjs/operators';

import { Store } from '@ngrx/store';

import { of } from 'rxjs';

import { Router } from '@angular/router';

import { clearCart } from '../cart/cart.actions';

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

import { OrderService } from '../../core/services/order.service';


@Injectable()
export class OrderEffects {

  private actions$ =
    inject(Actions);

  private router =
    inject(Router);

  private store =
    inject(Store);

  private orderService =
    inject(OrderService);


  // =====================================================
  // CREATE ORDER
  // =====================================================

  createOrder$ = createEffect(() =>

    this.actions$.pipe(

      ofType(createOrder),

      switchMap(({ order }) =>

        this.orderService
          .createOrder(order)

          .pipe(

            map(createdOrder =>

              createOrderSuccess({

                order: createdOrder

              })

            ),

            catchError(error =>

              of(

                createOrderFailure({

                  error:
                    error?.message ??
                    'Unable to create order.'

                })

              )

            )

          )

      )

    )

  );


  // =====================================================
  // ORDER SUCCESS
  // CLEAR CART + NAVIGATE
  // =====================================================

  orderSuccess$ = createEffect(

    () =>

      this.actions$.pipe(

        ofType(createOrderSuccess),

        tap(() => {

          this.store.dispatch(
            clearCart()
          );

          this.router.navigate([
            '/order-success'
          ]);

        })

      ),

    {
      dispatch: false
    }

  );


  // =====================================================
  // LOAD ORDERS
  // =====================================================

  loadOrders$ = createEffect(() =>

    this.actions$.pipe(

      ofType(loadOrders),

      switchMap(() =>

        this.orderService
          .getOrders()

          .pipe(

            map(orders =>

              loadOrdersSuccess({

                orders

              })

            ),

            catchError(error =>

              of(

                loadOrdersFailure({

                  error:
                    error?.message ??
                    'Unable to load orders.'

                })

              )

            )

          )

      )

    )

  );


  // =====================================================
  // CANCEL ORDER
  // =====================================================

  cancelOrder$ = createEffect(() =>

    this.actions$.pipe(

      ofType(cancelOrder),

      switchMap(({ orderId, reason }) =>

        this.orderService
          .getOrderById(orderId)

          .pipe(

            switchMap(() =>

              this.orderService
                .cancelOrder(
                  orderId,
                  reason
                )

            ),

            map(updatedOrder =>

              cancelOrderSuccess({

                order: updatedOrder

              })

            ),

            catchError(error =>

              of(

                cancelOrderFailure({

                  error:
                    error?.message ??
                    'Unable to cancel order.'

                })

              )

            )

          )

      )

    )

  );

}