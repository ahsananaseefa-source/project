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
  map,
  switchMap
} from 'rxjs/operators';

import { WishlistService } from '../../core/services/wishlist.service';

import { ToastService } from '../../core/services/toast.service';

import {
  loadWishlist,
  loadWishlistSuccess,
  addToWishlist,
  removeFromWishlist,
  clearWishlist
} from './wishlist.actions';


@Injectable()
export class WishlistEffects {

  private actions$ =
    inject(Actions);

  private wishlistService =
    inject(WishlistService);

  private store =
    inject(Store);

  private toastService =
    inject(ToastService);


  // =====================================================
  // LOAD WISHLIST
  // =====================================================

  loadWishlist$ = createEffect(() =>

    this.actions$.pipe(

      ofType(loadWishlist),

      switchMap(() => {

        const userId =
          localStorage.getItem('userId');


        if (!userId) {

          return of(

            loadWishlistSuccess({
              items: []
            })

          );

        } 


        return this.wishlistService
          .getWishlist(userId)
          .pipe(

            map(items =>

              loadWishlistSuccess({
                items
              })

            ),

            catchError(error => {

              console.error(
                'Failed to load wishlist:',
                error
              );


              return of(

                loadWishlistSuccess({
                  items: []
                })

              );

            })

          );

      })

    )

  );


  // =====================================================
  // ADD TO WISHLIST
  // =====================================================

  addToWishlist$ = createEffect(() =>

    this.actions$.pipe(

      ofType(addToWishlist),

      switchMap(({ product }) => {

        const userId =
          localStorage.getItem('userId');

          


        // =================================================
        // NOT LOGGED IN
        // =================================================

        if (!userId) {

          this.toastService.error(
            'Please login to add products to wishlist.'
          );

          return EMPTY;

        }


        // =================================================
        // CHECK EXISTING PRODUCT
        // =================================================

        return this.wishlistService
          .isInWishlist(
            product.id,
            userId
          )
          .pipe(

            switchMap(
              isAlreadyInWishlist => {


                // =========================================
                // ALREADY EXISTS
                // =========================================

                if (isAlreadyInWishlist) {

                  this.toastService.info(
                    'This product is already in your wishlist.'
                  );

                  return EMPTY;

                }
                


                // =========================================
                // NEW WISHLIST ITEM
                // =========================================

                const wishlistItem = {

                  userId,

                  productId:
                    product.id,

                  addedAt:
                    new Date().toISOString()

                };


                return this.wishlistService
                  .addToWishlist(
                    wishlistItem
                  )
                  .pipe(

                    map(() =>
                      loadWishlist()
                    )

                  );

              }
            ),

            catchError(error => {

              console.error(
                'Failed to add wishlist item:',
                error
              );


              this.toastService.error(
                'Failed to add product to wishlist.'
              );


              return EMPTY;

            })

          );

      })

    )

  );




  // =====================================================
  // REMOVE ONE ITEM
  // =====================================================

  removeFromWishlist$ = createEffect(() =>

    this.actions$.pipe(

      ofType(removeFromWishlist),

      switchMap(({ productId }) => {

        const userId =
          localStorage.getItem('userId');


        if (!userId) {

          return EMPTY;

        }


        return this.wishlistService
          .getWishlist(userId)
          .pipe(

            switchMap(items => {

              const item =
                items.find(
                  wishlistItem =>
                    wishlistItem.productId ===
                    productId
                );


              if (!item?.id) {

                return of(
                  loadWishlist()
                );

              }


              return this.wishlistService
                .removeFromWishlist(
                  item.id
                )
                .pipe(

                  map(() =>
                    loadWishlist()
                  )

                );

            }),

            catchError(error => {

              console.error(
                'Failed to remove wishlist item:',
                error
              );


              return EMPTY;

            })

          );

      })

    )

  );


  // =====================================================
  // CLEAR ENTIRE WISHLIST
  // =====================================================

  clearWishlist$ = createEffect(() =>

    this.actions$.pipe(

      ofType(clearWishlist),

      switchMap(() => {

        const userId =
          localStorage.getItem('userId');


        // =================================================
        // GUEST
        // =================================================

        if (!userId) {

          return of(
            loadWishlist()
          );

        }


        return this.wishlistService
          .getWishlist(userId)
          .pipe(

            switchMap(items => {

              if (
                items.length === 0
              ) {

                return of(
                  loadWishlist()
                );

              }


              const deleteRequests =
                items

                  .filter(
                    item => item.id
                  )

                  .map(item =>
                    this.wishlistService
                      .removeFromWishlist(
                        item.id!
                      )
                  );


              if (
                deleteRequests.length === 0
              ) {

                return of(
                  loadWishlist()
                );

              }


              return forkJoin(
                deleteRequests
              ).pipe(

                map(() =>
                  loadWishlist()
                )

              );

            }),

            catchError(error => {

              console.error(
                'Failed to clear wishlist:',
                error
              );


              return EMPTY;

            })

          );

      })

    )

  );

  

}