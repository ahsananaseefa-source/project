import {
  Component,
  DestroyRef,
  HostListener,
  inject
} from '@angular/core';

import { AsyncPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Order } from '../../core/models/order.model';

import {
  loadOrders,
  cancelOrder,
  cancelOrderSuccess,
  cancelOrderFailure
} from '../../store/order/order.actions';

import {
  selectOrders,
  selectOrderLoading,
  selectOrderError
} from '../../store/order/order.selectors';

import { ToastService } from '../../core/services/toast.service';
import { HeaderComponent } from '../../shared/components/header/header/header.component';


@Component({
  selector: 'app-order',
  standalone: true,
  imports: [RouterLink, AsyncPipe, DatePipe, HeaderComponent],
  templateUrl: './order.component.html',
  styleUrl: './order.component.css'
})
export class OrderComponent {

  private store = inject(Store);
  private actions$ = inject(Actions);
  private destroyRef = inject(DestroyRef);
  private toastService = inject(ToastService);


  // =====================================================
  // ORDERS
  // =====================================================

  orders$ = this.store.select(selectOrders).pipe(
    map((orders: Order[]) => {

      const userId = this.getCurrentUserId();

      if (!userId) {
        return [];
      }

      return orders
        .filter(order => String(order.userId) === String(userId))
        .sort((a, b) => {
          const dateA = new Date(a.orderDate).getTime();
          const dateB = new Date(b.orderDate).getTime();
          return dateB - dateA;
        });
    })
  );


  // =====================================================
  // LOADING / ERROR
  // =====================================================

  loading$ = this.store.select(selectOrderLoading);

  error$ = this.store.select(selectOrderError);


  // =====================================================
  // ORDER TRACKING
  // =====================================================

  readonly trackingSteps = [
    'Order Placed',
    'Confirmed',
    'Shipped',
    'Out for Delivery',
    'Delivered'
  ];

  // IDs of orders whose tracking is currently open.
  // Empty by default, so tracking is hidden for every order.
  private openTracking = new Set<string>();


  // =====================================================
  // CANCEL REASONS
  // =====================================================

  readonly cancelReasons = [
    'Ordered by mistake',
    'Found a better price elsewhere',
    'Want to change product / design',
    'Delivery is taking too long',
    'Need to change delivery address',
    'Other'
  ];


  // =====================================================
  // CANCEL MODAL STATE
  // =====================================================

  cancelModalOpen = false;

  orderToCancel: Order | null = null;

  selectedReason = '';

  otherReason = '';

  reasonError = '';

  cancelling = false;


  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor() {

    this.store.dispatch(loadOrders());

    this.actions$
      .pipe(
        ofType(cancelOrderSuccess, cancelOrderFailure),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(action => {

        this.cancelling = false;

        // CANCEL SUCCESS
        if (action.type === cancelOrderSuccess.type) {

          this.toastService.success('Your order has been cancelled.');

          this.cancelModalOpen = false;
          this.orderToCancel = null;
          this.selectedReason = '';
          this.otherReason = '';
          this.reasonError = '';

          return;
        }

        // CANCEL FAILURE
        if (action.type === cancelOrderFailure.type) {

          this.reasonError =
            action.error ||
            'Unable to cancel the order. Please try again.';
        }
      });
  }


  // =====================================================
  // TRACKING TOGGLE
  // =====================================================

  isTrackingOpen(order: Order): boolean {
    return this.openTracking.has(String(order.id));
  }

  toggleTracking(order: Order): void {

    const id = String(order.id);

    if (this.openTracking.has(id)) {
      this.openTracking.delete(id);
    } else {
      this.openTracking.add(id);
    }
  }


  // =====================================================
  // CHECK CANCELLED
  // =====================================================

  isCancelled(order: Order): boolean {
    return String(order?.status ?? '')
      .toLowerCase()
      .includes('cancel');
  }


  // =====================================================
  // STATUS LABEL
  // =====================================================

  getStatusLabel(order: Order): string {

    const status = String(order?.status ?? '').trim().toLowerCase();

    if (status === 'success' || status === 'successful') {
      return 'Order Placed';
    }

    return String(order?.status ?? '');
  }


  // =====================================================
  // TRACKING STEP
  // =====================================================

  getStepIndex(order: Order): number {

    const status = String(order?.status ?? '').toLowerCase();

    if (status.includes('cancel')) {
      return -1;
    }

    if (status.includes('out')) {
      return 3;
    }

    if (status.includes('deliver')) {
      return 4;
    }

    if (status.includes('ship')) {
      return 2;
    }

    if (status.includes('confirm') || status.includes('process')) {
      return 1;
    }

    return 0;
  }


  // =====================================================
  // CAN CANCEL
  // =====================================================

  canCancel(order: Order): boolean {

    if (!order) {
      return false;
    }

    if (this.isCancelled(order)) {
      return false;
    }

    const step = this.getStepIndex(order);

    return step >= 0 && step <= 1;
  }


  // =====================================================
  // PRODUCT IMAGE / NAME / PREVIEW
  // =====================================================

  getItemImage(item: any): string {
    return item?.product?.image ?? item?.image ?? '';
  }

  getItemName(item: any): string {
    return item?.product?.name ?? item?.name ?? 'Product';
  }

  getPreviewItems(order: Order): any[] {
    return (order?.items ?? []).slice(0, 3);
  }

  getExtraItemCount(order: Order): number {
    return Math.max((order?.items?.length ?? 0) - 3, 0);
  }


  // =====================================================
  // OPEN CANCEL MODAL
  // =====================================================

  openCancel(order: Order): void {

    if (!this.canCancel(order)) {
      return;
    }

    this.orderToCancel = order;
    this.selectedReason = '';
    this.otherReason = '';
    this.reasonError = '';
    this.cancelling = false;
    this.cancelModalOpen = true;
  }


  // =====================================================
  // CLOSE CANCEL MODAL
  // =====================================================

  closeCancel(): void {

    if (this.cancelling) {
      return;
    }

    this.cancelModalOpen = false;
    this.orderToCancel = null;
    this.selectedReason = '';
    this.otherReason = '';
    this.reasonError = '';
  }


  // =====================================================
  // SELECT CANCEL REASON
  // =====================================================

  selectReason(reason: string): void {
    this.selectedReason = reason;
    this.reasonError = '';
  }


  // =====================================================
  // ESC KEY
  // =====================================================

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.cancelModalOpen) {
      this.closeCancel();
    }
  }


  // =====================================================
  // CONFIRM CANCEL
  // =====================================================

  confirmCancel(): void {

    if (!this.orderToCancel) {
      return;
    }

    if (this.cancelling) {
      return;
    }

    if (!this.canCancel(this.orderToCancel)) {
      this.reasonError = 'This order can no longer be cancelled.';
      return;
    }

    if (!this.selectedReason) {
      this.reasonError = 'Please select a reason for cancelling.';
      return;
    }

    if (this.selectedReason === 'Other' && !this.otherReason.trim()) {
      this.reasonError = 'Please tell us the reason.';
      return;
    }

    const reason =
      this.selectedReason === 'Other'
        ? this.otherReason.trim()
        : this.selectedReason;

    this.cancelling = true;
    this.reasonError = '';

    // IMPORTANT:
    // Do NOT use Number() here.
    // Pass the actual order ID directly.

    this.store.dispatch(
      cancelOrder({
        orderId: this.orderToCancel.id,
        reason
      })
    );
  }


  // =====================================================
  // CURRENT USER ID
  // =====================================================

  private getCurrentUserId(): string | null {

    try {

      const storedUser = localStorage.getItem('user');

      if (storedUser) {

        const user = JSON.parse(storedUser);

        if (user?.id !== undefined && user?.id !== null) {
          return String(user.id);
        }
      }

    } catch {
      // Ignore invalid JSON
    }

    const userId = localStorage.getItem('userId');

    return userId ? String(userId) : null;
  }

}