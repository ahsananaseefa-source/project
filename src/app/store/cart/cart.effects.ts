import { Injectable, inject } from '@angular/core';

import {
  Actions,
  createEffect,
  ofType
} from '@ngrx/effects';

import { Store } from '@ngrx/store';

import {
  EMPTY,
  forkJoin,
  of
} from 'rxjs';

import {
  catchError,
  filter,
  map,
  switchMap,
  tap,
  withLatestFrom
} from 'rxjs/operators';

import {
  addToCart,
  removeFromCart,
  increaseQuantity,
  decreaseQuantity,
  clearCart,
  loadCart,
  loadCartSuccess,
  cartLimitReached
} from './cart.actions';

import {
  selectCartItems
} from './cart.selectors';

import {
  MAX_CART_PRODUCTS
} from './cart.reducer';

import { CartService } from '../../core/services/cart.service';


@Injectable()
export class CartEffects {

  private actions$ = inject(Actions);

  private cartService = inject(CartService);

  private store = inject(Store);


  // =====================================================
  // LOAD CART
  // =====================================================

  loadCart$ = createEffect(() =>

    this.actions$.pipe(

      ofType(loadCart),

      switchMap(() => {

        const userId =
          localStorage.getItem('userId');


        // =================================================
        // GUEST
        // =================================================

        if (!userId) {

          const guestCart =
            this.cartService.getGuestCart();


          return of(

            loadCartSuccess({
              items: guestCart
            })

          );

        }


        // =================================================
        // LOGGED IN
        // =================================================

        return this.cartService
          .getUserCart(userId)
          .pipe(

            map(items =>

              loadCartSuccess({
                items
              })

            ),

            catchError(error => {

              console.error(
                'Failed to load user cart:',
                error
              );


              return of(

                loadCartSuccess({
                  items: []
                })

              );

            })

          );

      })

    )

  );


  // =====================================================
  // ADD TO CART
  // =====================================================

  addToCart$ = createEffect(() =>

    this.actions$.pipe(

      ofType(addToCart),

      withLatestFrom(
        this.store.select(selectCartItems)
      ),

      switchMap(([action, cartItems]) => {

        const userId =
          localStorage.getItem('userId');


        // =================================================
        // GUEST
        // =================================================

        if (!userId) {

          return EMPTY;

        }


        // =================================================
        // PRODUCT REJECTED BY THE REDUCER
        // (cart limit reached or no stock)
        // The cart state is already updated here, so if the
        // product is not in it, it must not be saved.
        // =================================================

        const isInCart =
          cartItems.some(
            item =>
              item.product.id ===
              action.product.id
          );

        if (!isInCart) {

          return EMPTY;

        }


        // =================================================
        // MAXIMUM QUANTITY
        // =================================================

        const maximumQuantity =
          Math.min(
            this.cartService.MAX_CART_QUANTITY,
            action.product.stock
          );


        // =================================================
        // GET SERVER CART
        // =================================================

        return this.cartService
          .getUserCart(userId)
          .pipe(

            switchMap(serverItems => {

              const serverItem =
                serverItems.find(
                  item =>
                    item.product.id ===
                    action.product.id
                );


              // =================================================
              // PRODUCT ALREADY EXISTS
              // =================================================

              if (serverItem?.id) {

                const currentQuantity =
                  serverItem.quantity;


                // Already at maximum
                if (
                  currentQuantity >=
                  maximumQuantity
                ) {

                  return EMPTY;

                }


                const newQuantity =
                  Math.min(
                    currentQuantity +
                    action.quantity,
                    maximumQuantity
                  );


                return this.cartService
                  .updateCartItem(
                    serverItem.id,
                    newQuantity
                  );

              }


              // =================================================
              // NEW PRODUCT
              // =================================================

              const newQuantity =
                Math.min(
                  action.quantity,
                  maximumQuantity
                );


              const newItem = {

                userId,

                product:
                  action.product,

                quantity:
                  newQuantity

              };


              return this.cartService
                .addToCart(newItem);

            }),

            catchError(error => {

              console.error(
                'Failed to sync cart:',
                error
              );

              return EMPTY;

            })

          );

      })

    ),

    {
      dispatch: false
    }

  );


  // =====================================================
  // CART PRODUCT LIMIT REACHED
  // Fires when a NEW product is added while the cart
  // already has the maximum number of products
  // =====================================================

  cartLimitReached$ = createEffect(() =>

    this.actions$.pipe(

      ofType(addToCart),

      withLatestFrom(
        this.store.select(selectCartItems)
      ),

      filter(([action, cartItems]) =>

        action.product.stock > 0 &&

        cartItems.length >=
        MAX_CART_PRODUCTS &&

        !cartItems.some(
          item =>
            item.product.id ===
            action.product.id
        )

      ),

      map(() => cartLimitReached())

    )

  );


  // =====================================================
  // REMOVE FROM CART
  // =====================================================

  removeFromCart$ = createEffect(() =>

    this.actions$.pipe(

      ofType(removeFromCart),

      switchMap(({ productId }) => {

        const userId =
          localStorage.getItem('userId');


        if (!userId) {

          return EMPTY;

        }


        return this.cartService
          .getUserCart(userId)
          .pipe(

            switchMap(items => {

              const item =
                items.find(
                  cartItem =>
                    cartItem.product.id ===
                    productId
                );


              if (!item?.id) {

                return EMPTY;

              }


              return this.cartService
                .removeFromCart(item.id);

            }),

            catchError(error => {

              console.error(
                'Failed to remove cart item:',
                error
              );

              return EMPTY;

            })

          );

      })

    ),

    {
      dispatch: false
    }

  );


  // =====================================================
  // INCREASE QUANTITY
  // =====================================================

  increaseQuantity$ = createEffect(() =>

    this.actions$.pipe(

      ofType(increaseQuantity),

      withLatestFrom(
        this.store.select(selectCartItems)
      ),

      switchMap(([{ productId }, cartItems]) => {

        const userId =
          localStorage.getItem('userId');


        if (!userId) {

          return EMPTY;

        }


        const currentItem =
          cartItems.find(
            item =>
              item.product.id ===
              productId
          );


        if (!currentItem) {

          return EMPTY;

        }


        const maximumQuantity =
          Math.min(
            this.cartService.MAX_CART_QUANTITY,
            currentItem.product.stock
          );


        // =================================================
        // ALREADY AT MAXIMUM
        // =================================================

        if (
          currentItem.quantity >=
          maximumQuantity
        ) {

          return EMPTY;

        }


        return this.cartService
          .getUserCart(userId)
          .pipe(

            switchMap(serverItems => {

              const serverItem =
                serverItems.find(
                  item =>
                    item.product.id ===
                    productId
                );


              if (!serverItem?.id) {

                return EMPTY;

              }


              const newQuantity =
                Math.min(
                  serverItem.quantity + 1,
                  maximumQuantity
                );


              return this.cartService
                .updateCartItem(
                  serverItem.id,
                  newQuantity
                );

            }),

            catchError(error => {

              console.error(
                'Failed to increase quantity:',
                error
              );

              return EMPTY;

            })

          );

      })

    ),

    {
      dispatch: false
    }

  );


  // =====================================================
  // DECREASE QUANTITY
  // =====================================================

  decreaseQuantity$ = createEffect(() =>

    this.actions$.pipe(

      ofType(decreaseQuantity),

      withLatestFrom(
        this.store.select(selectCartItems)
      ),

      switchMap(([{ productId }, cartItems]) => {

        const userId =
          localStorage.getItem('userId');


        if (!userId) {

          return EMPTY;

        }


        const currentItem =
          cartItems.find(
            item =>
              item.product.id ===
              productId
          );


        if (
          !currentItem ||
          currentItem.quantity <= 1
        ) {

          return EMPTY;

        }


        return this.cartService
          .getUserCart(userId)
          .pipe(

            switchMap(serverItems => {

              const serverItem =
                serverItems.find(
                  item =>
                    item.product.id ===
                    productId
                );


              if (!serverItem?.id) {

                return EMPTY;

              }


              const newQuantity =
                Math.max(
                  serverItem.quantity - 1,
                  1
                );


              return this.cartService
                .updateCartItem(
                  serverItem.id,
                  newQuantity
                );

            }),

            catchError(error => {

              console.error(
                'Failed to decrease quantity:',
                error
              );

              return EMPTY;

            })

          );

      })

    ),

    {
      dispatch: false
    }

  );


  // =====================================================
  // CLEAR CART
  // =====================================================

  clearCart$ = createEffect(() =>

    this.actions$.pipe(

      ofType(clearCart),

      switchMap(() => {

        const userId =
          localStorage.getItem('userId');


        if (!userId) {

          return EMPTY;

        }


        return this.cartService
          .getUserCart(userId)
          .pipe(

            switchMap(items =>

              this.cartService
                .clearUserCart(items)

            ),

            catchError(error => {

              console.error(
                'Failed to clear cart:',
                error
              );

              return EMPTY;

            })

          );

      })

    ),

    {
      dispatch: false
    }

  );


  // =====================================================
  // SAVE GUEST CART
  // =====================================================

  saveGuestCart$ = createEffect(

    () =>

      this.actions$.pipe(

        ofType(
          addToCart,
          removeFromCart,
          increaseQuantity,
          decreaseQuantity,
          clearCart
        ),

        withLatestFrom(
          this.store.select(selectCartItems)
        ),

        tap(([, cartItems]) => {

          const userId =
            localStorage.getItem('userId');


          // Only save guest cart
          if (!userId) {

            this.cartService
              .saveGuestCart(cartItems);

          }

        })

      ),

    {
      dispatch: false
    }

  );

}