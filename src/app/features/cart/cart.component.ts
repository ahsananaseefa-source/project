import { Component, HostListener, OnDestroy, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';

import {
  selectCartItems,
  selectCartTotalAmount,
  selectIsCartEmpty
} from '../../store/cart/cart.selectors';

import {
  increaseQuantity,
  decreaseQuantity,
  removeFromCart,
  clearCart
} from '../../store/cart/cart.actions';

import { HeaderComponent } from '../../shared/components/header/header/header.component';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [AsyncPipe, HeaderComponent],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.css'
})
export class CartComponent implements OnDestroy {

  private store = inject(Store);
  private router = inject(Router);

  // ===================== CART LIMITS =====================

  readonly MAX_CART_QUANTITY = 5;
  readonly MAX_CART_PRODUCTS = 8;

  // ===================== CART DATA =====================

  cartItems$ = this.store.select(selectCartItems);
  totalAmount$ = this.store.select(selectCartTotalAmount);
  isCartEmpty$ = this.store.select(selectIsCartEmpty);

  // ===================== REMOVE CONFIRMATION =====================

  showRemoveConfirmation = false;
  productToRemove: string | null = null;
  productToRemoveName = '';
  isLastProduct = false;

  // ===================== CLEAR CART CONFIRMATION =====================

  showClearConfirmation = false;

  // ===================== PRODUCT LIMIT TOAST =====================

  showCartProductLimitMessage = false;

  private readonly TOAST_DURATION = 3000;
  private limitToastTimer: ReturnType<typeof setTimeout> | null = null;

  readonly toastDurationMs = this.TOAST_DURATION;

  // ===================== QUANTITY =====================

  increaseQuantity(
    productId: string,
    currentQuantity: number,
    stock: number
  ): void {

    if (currentQuantity >= this.getMaximumQuantity(stock)) {
      return;
    }

    this.store.dispatch(increaseQuantity({ productId }));
  }

  decreaseQuantity(productId: string): void {
    this.store.dispatch(decreaseQuantity({ productId }));
  }

  getMaximumQuantity(stock: number): number {
    return Math.min(this.MAX_CART_QUANTITY, stock);
  }

  // ===================== REMOVE PRODUCT =====================

  removeProduct(
    productId: string,
    cartItemCount: number,
    productName: string = ''
  ): void {

    this.productToRemove = productId;
    this.productToRemoveName = productName;
    this.isLastProduct = cartItemCount === 1;
    this.showRemoveConfirmation = true;
  }

  confirmRemove(): void {

    if (!this.productToRemove) {
      return;
    }

    this.store.dispatch(
      removeFromCart({ productId: this.productToRemove })
    );

    this.resetRemoveState();
  }

  cancelRemove(): void {
    this.resetRemoveState();
  }

  private resetRemoveState(): void {
    this.showRemoveConfirmation = false;
    this.productToRemove = null;
    this.productToRemoveName = '';
    this.isLastProduct = false;
  }

  // ===================== CLEAR CART =====================

  openClearConfirmation(): void {
    this.showClearConfirmation = true;
  }

  confirmClear(): void {
    this.store.dispatch(clearCart());
    this.showClearConfirmation = false;
  }

  cancelClear(): void {
    this.showClearConfirmation = false;
  }

  // ===================== ESCAPE KEY =====================

  @HostListener('document:keydown.escape')
  onEscape(): void {

    if (this.showRemoveConfirmation) {
      this.cancelRemove();
    }

    if (this.showClearConfirmation) {
      this.cancelClear();
    }

    if (this.showCartProductLimitMessage) {
      this.closeProductLimitMessage();
    }
  }

  // ===================== NAVIGATION =====================

  proceedToCheckout(): void {
    this.router.navigate(['/checkout']);
  }

  goToProducts(): void {
    this.router.navigate(['/products']);
  }

  // ===================== 8 PRODUCT LIMIT =====================

  hasReachedProductLimit(cartItems: any[]): boolean {
    return cartItems.length >= this.MAX_CART_PRODUCTS;
  }

  showProductLimitMessage(): void {

    this.showCartProductLimitMessage = true;

    if (this.limitToastTimer) {
      clearTimeout(this.limitToastTimer);
    }

    this.limitToastTimer = setTimeout(() => {
      this.showCartProductLimitMessage = false;
      this.limitToastTimer = null;
    }, this.TOAST_DURATION);
  }

  closeProductLimitMessage(): void {

    this.showCartProductLimitMessage = false;

    if (this.limitToastTimer) {
      clearTimeout(this.limitToastTimer);
      this.limitToastTimer = null;
    }
  }

  // ===================== CLEAN UP =====================

  ngOnDestroy(): void {
    if (this.limitToastTimer) {
      clearTimeout(this.limitToastTimer);
    }
  }
}