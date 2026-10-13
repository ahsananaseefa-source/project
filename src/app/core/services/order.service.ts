import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Order } from '../models/order.model';

@Injectable({
  providedIn: 'root'
})
export class OrderService {

  private http = inject(HttpClient);

  private readonly API_URL =
    'http://localhost:3000/order';


  // =====================================================
  // GET ALL ORDERS
  // =====================================================

  getOrders(): Observable<Order[]> {

    return this.http.get<Order[]>(
      this.API_URL
    );

  }


  // =====================================================
  // GET SINGLE ORDER
  // =====================================================

  getOrderById(
    id: string | number
  ): Observable<Order> {

    return this.http.get<Order>(
      `${this.API_URL}/${id}`
    );

  }


  // =====================================================
  // CREATE ORDER
  // =====================================================

  createOrder(
    order: Order
  ): Observable<Order> {

    return this.http.post<Order>(
      this.API_URL,
      order
    );

  }


  // =====================================================
  // UPDATE ORDER
  // =====================================================

  updateOrder(
    id: string | number,
    order: Order
  ): Observable<Order> {

    return this.http.put<Order>(
      `${this.API_URL}/${id}`,
      order
    );

  }


  // =====================================================
  // PATCH ORDER
  // =====================================================

  patchOrder(
    id: string | number,
    changes: Partial<Order>
  ): Observable<Order> {

    return this.http.patch<Order>(
      `${this.API_URL}/${id}`,
      changes
    );

  }


  // =====================================================
  // CANCEL ORDER
  // =====================================================

  cancelOrder(
    id: string | number,
    reason: string
  ): Observable<Order> {

    return this.http.patch<Order>(

      `${this.API_URL}/${id}`,

      {
        status: 'Cancelled',

        cancelReason: reason,

        cancelledAt:
          new Date().toISOString()

      }

    );

  }

}