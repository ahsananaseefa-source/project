import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import {
  Observable,
  forkJoin,
  of
} from 'rxjs';

import {
  switchMap,
  tap
} from 'rxjs/operators';

import { CartItem } from '../models/cart-item.model';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class CartService {

  private http = inject(HttpClient);

  private toastService = inject(ToastService);


  // =====================================================
  // STORAGE / API
  // =====================================================

  private guestStorageKey = 'zell-guest-cart';

  private apiUrl = 'http://localhost:3000/cart';

  readonly MAX_CART_QUANTITY = 5;


  // =====================================================
  // GUEST CART
  // =====================================================

  saveGuestCart(items: CartItem[]): void {

    localStorage.setItem(
      this.guestStorageKey,
      JSON.stringify(items)
    );

  }


  getGuestCart(): CartItem[] {

    const cart =
      localStorage.getItem(
        this.guestStorageKey
      );

    if (!cart) {
      return [];
    }

    try {

      return JSON.parse(cart) as CartItem[];

    } catch (error) {

      console.error(
        'Failed to read guest cart:',
        error
      );

      return [];

    }

  }


  clearGuestCart(): void {

    localStorage.removeItem(
      this.guestStorageKey
    );

  }


  // =====================================================
  // MAXIMUM QUANTITY
  // =====================================================

  getMaximumQuantity(
    stock: number
  ): number {

    return Math.min(
      this.MAX_CART_QUANTITY,
      stock
    );

  }


  // =====================================================
  // JSON SERVER - USER CART
  // =====================================================

  getUserCart(
    userId: string
  ): Observable<CartItem[]> {

    const params =
      new HttpParams()
        .set('userId', userId);

    return this.http.get<CartItem[]>(
      this.apiUrl,
      {
        params
      }
    );

  }


  // =====================================================
  // ADD TO CART
  // =====================================================

  addToCart(
    item: CartItem
  ): Observable<CartItem> {

    return this.http.post<CartItem>(
      this.apiUrl,
      item
    ).pipe(

      tap(() => {

        this.toastService.success(
          'Product added to cart.'
        );

      })

    );

  }


  // =====================================================
  // UPDATE CART QUANTITY
  // =====================================================

  updateCartItem(
    id: string,
    quantity: number
  ): Observable<CartItem> {

    return this.http.patch<CartItem>(
      `${this.apiUrl}/${id}`,
      {
        quantity
      }
    );

  }


  // =====================================================
  // REMOVE FROM CART
  // =====================================================

  removeFromCart(
    id: string
  ): Observable<void> {

    return this.http.delete<void>(
      `${this.apiUrl}/${id}`
    ).pipe(

      tap(() => {

        this.toastService.success(
          'Product removed from cart.'
        );

      })

    );

  }


  // =====================================================
  // CLEAR USER CART
  // =====================================================

  clearUserCart(
    items: CartItem[]
  ): Observable<void[]> {

    if (items.length === 0) {
      return of([]);
    }


    const deleteRequests =
      items
        .filter(item => item.id)
        .map(item =>
          this.removeFromCart(
            item.id!
          )
        );


    if (deleteRequests.length === 0) {
      return of([]);
    }


    return forkJoin(
      deleteRequests
    );

  }


  // =====================================================
  // MERGE GUEST CART → USER CART
  // =====================================================

  mergeGuestCart(
    userId: string
  ): Observable<CartItem[]> {

    const guestItems =
      this.getGuestCart();


    // ---------------------------------------------------
    // NO GUEST CART
    // ---------------------------------------------------

    if (guestItems.length === 0) {

      return this.getUserCart(
        userId
      );

    }


    // ---------------------------------------------------
    // GET EXISTING USER CART
    // ---------------------------------------------------

    return this.getUserCart(
      userId
    ).pipe(

      switchMap(serverItems => {

        const requests:
          Observable<any>[] = [];


        // =================================================
        // PROCESS EVERY GUEST ITEM
        // =================================================

        for (
          const guestItem of guestItems
        ) {

          const maximumQuantity =
            this.getMaximumQuantity(
              guestItem.product.stock
            );


          // Product has no stock
          if (
            maximumQuantity <= 0
          ) {

            continue;

          }


          const existingItem =
            serverItems.find(
              item =>
                item.product.id ===
                guestItem.product.id
            );


          // ===============================================
          // PRODUCT ALREADY EXISTS
          // ===============================================

          if (
            existingItem?.id
          ) {

            const mergedQuantity =
              Math.min(

                existingItem.quantity +
                  guestItem.quantity,

                maximumQuantity

              );


            requests.push(

              this.updateCartItem(
                existingItem.id,
                mergedQuantity
              )

            );

          }


          // ===============================================
          // NEW PRODUCT
          // ===============================================

          else {

            const newItem:
              CartItem = {

              userId,

              product:
                guestItem.product,

              quantity:
                Math.min(
                  guestItem.quantity,
                  maximumQuantity
                )

            };


            requests.push(

              this.addToCart(
                newItem
              )

            );

          }

        }


        // -------------------------------------------------
        // NOTHING TO SYNC
        // -------------------------------------------------

        if (
          requests.length === 0
        ) {

          this.clearGuestCart();

          return of(
            serverItems
          );

        }


        // -------------------------------------------------
        // WAIT FOR ALL REQUESTS
        // -------------------------------------------------

        return forkJoin(
          requests
        ).pipe(

          // Get the final user cart
          // after all updates/additions.

          switchMap(() =>
            this.getUserCart(
              userId
            )
          ),

          // Clear guest cart only
          // after successful merge.

          tap(() => {

            this.clearGuestCart();

          })

        );

      })

    );

  }

}