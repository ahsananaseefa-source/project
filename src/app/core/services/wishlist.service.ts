import { Injectable, inject } from '@angular/core';

import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import { Observable } from 'rxjs';

import { map, tap } from 'rxjs/operators';

import { WishlistItem } from '../models/wishlist-item.models';
import { ToastService } from './toast.service';


@Injectable({
  providedIn: 'root'
})
export class WishlistService {

  private http = inject(HttpClient);

  private toastService = inject(ToastService);

  private apiUrl =
    'http://localhost:3000/wishlist';


  // =====================================================
  // GET WISHLIST
  // =====================================================

  getWishlist(
    userId: string
  ): Observable<WishlistItem[]> {

    const params =
      new HttpParams()
        .set('userId', userId);

    return this.http.get<WishlistItem[]>(
      this.apiUrl,
      { params }
    );

  }


  // =====================================================
  // ADD TO WISHLIST
  // =====================================================

  addToWishlist(
    item: WishlistItem
  ): Observable<WishlistItem> {

    return this.http.post<WishlistItem>(
      this.apiUrl,
      item
    ).pipe(

      tap(() => {

        this.toastService.success(
          'Added to wishlist.'
        );

      })

    );

  }


  // =====================================================
  // REMOVE FROM WISHLIST
  // =====================================================

  removeFromWishlist(
    id: string
  ): Observable<void> {

    return this.http.delete<void>(
      `${this.apiUrl}/${id}`
    ).pipe(

      tap(() => {

        this.toastService.success(
          'Removed from wishlist.'
        );

      })

    );

  }


  // =====================================================
  // CHECK PRODUCT IN WISHLIST
  // =====================================================

  isInWishlist(
    productId: string,
    userId: string
  ): Observable<boolean> {

    const params =
      new HttpParams()
        .set('userId', userId)
        .set('productId', productId);

    return this.http

      .get<WishlistItem[]>(
        this.apiUrl,
        { params }
      )

      .pipe(

        map(items =>
          items.length > 0
        )

      );

  }
  

}