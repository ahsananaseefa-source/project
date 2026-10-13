import { Component, HostListener, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';

import {
  ActivatedRoute,
  Router,
  RouterLink
} from '@angular/router';

import { Store } from '@ngrx/store';

import {
  map,
  switchMap,
  of
} from 'rxjs';

import { Product } from '../../../core/models/product.model';
import { WishlistItem } from '../../../core/models/wishlist-item.models';

import { ToastService } from '../../../core/services/toast.service';

import { loadProducts } from '../../../store/products/products.actions';
import { selectAllProducts } from '../../../store/products/products.selectors';

import { addToCart } from '../../../store/cart/cart.actions';
import { selectCartItems } from '../../../store/cart/cart.selectors';

import {
  addToWishlist,
  removeFromWishlist,
  loadWishlist
} from '../../../store/wishlist/wishlist.actions';

import { selectWishlistItems } from '../../../store/wishlist/wishlist.selectors';

import { HeaderComponent } from '../../../shared/components/header/header/header.component';
import { FooterComponent } from '../../../shared/components/footer/footer.component';


@Component({
  selector: 'app-product-details',

  standalone: true,

  imports: [
    AsyncPipe,
    RouterLink,
    HeaderComponent,
    FooterComponent
  ],

  templateUrl: './product-details.component.html',

  styleUrl: './product-details.component.css'
})
export class ProductDetailsComponent {

  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toastService = inject(ToastService);


  // ==========================================
  // CART LIMITS
  // ==========================================

  // Maximum quantity of the same product
  readonly MAX_CART_QUANTITY = 5;

  // Maximum number of different products in the cart
  readonly MAX_CART_PRODUCTS = 8;


  // ==========================================
  // SELECTED QUANTITY
  // ==========================================

  quantity = 1;


  // ==========================================
  // LOGIN MESSAGE
  // ==========================================

  loginMessage = false;


  // ==========================================
  // CART LIMIT MESSAGE (quantity limit)
  // ==========================================

  cartLimitMessage = false;
  cartLimitText = '';


  // ==========================================
  // IMAGE ZOOM
  // ==========================================

  // Hover zoom (desktop)
  isZoomed = false;
  zoomOrigin = '50% 50%';

  // Click to open full screen image
  lightboxOpen = false;


  // ==========================================
  // ALL PRODUCTS
  // ==========================================

  private allProducts$ = this.store.select(selectAllProducts);


  // ==========================================
  // CART ITEMS
  // ==========================================

  cartItems$ = this.store.select(selectCartItems);


  // ==========================================
  // WISHLIST ITEMS
  // ==========================================

  wishlistItems$ = this.store.select(selectWishlistItems);


  // ==========================================
  // CURRENT PRODUCT
  // ==========================================

  product$ = this.route.paramMap.pipe(

    switchMap(params => {

      const id = params.get('id');

      return this.allProducts$.pipe(
        map(products =>
          products.find(product => product.id === id) ?? null
        )
      );

    })

  );


  // ==========================================
  // SIMILAR PRODUCTS
  // ==========================================

  similarProducts$ = this.product$.pipe(

    switchMap(product => {

      if (!product) {
        return of([]);
      }

      return this.allProducts$.pipe(
        map(products =>
          products.filter(similarProduct =>
            similarProduct.id !== product.id &&
            similarProduct.category.toLowerCase() ===
            product.category.toLowerCase()
          )
        )
      );

    })

  );


  // ==========================================
  // CONSTRUCTOR
  // ==========================================

  constructor() {

    this.store.dispatch(loadProducts());
    this.store.dispatch(loadWishlist());

  }


  // ==========================================
  // QUANTITY HELPERS
  // ==========================================

  getMaximumQuantity(stock: number): number {
    return Math.min(this.MAX_CART_QUANTITY, stock);
  }

  getCurrentCartQuantity(product: Product, cartItems: any[]): number {

    const cartItem = cartItems.find(
      item => item.product.id === product.id
    );

    return cartItem?.quantity ?? 0;

  }

  hasReachedCartLimit(product: Product, cartItems: any[]): boolean {

    return (
      this.getCurrentCartQuantity(product, cartItems) >=
      this.getMaximumQuantity(product.stock)
    );

  }

  private buildLimitText(stock: number): string {

    return stock < this.MAX_CART_QUANTITY
      ? `Only ${stock} items are available for this product.`
      : `Maximum ${this.MAX_CART_QUANTITY} items are allowed for this product.`;

  }

  showCartLimitMessage(product: Product): void {

    this.cartLimitText = this.buildLimitText(product.stock);
    this.cartLimitMessage = true;

  }

  increaseQuantity(stock: number): void {

    // If maximum is reached, show message instead of increasing
    if (this.quantity >= this.getMaximumQuantity(stock)) {

      this.cartLimitText = this.buildLimitText(stock);
      this.cartLimitMessage = true;

      return;

    }

    this.quantity++;

  }

  decreaseQuantity(): void {

    if (this.quantity > 1) {
      this.quantity--;
    }

  }


  // ==========================================
  // 8 PRODUCT LIMIT
  // ==========================================

  isInCart(product: Product, cartItems: any[]): boolean {
    return cartItems.some(item => item.product.id === product.id);
  }

  hasReachedProductLimit(cartItems: any[]): boolean {
    return cartItems.length >= this.MAX_CART_PRODUCTS;
  }


  // ==========================================
  // ADD PRODUCT TO CART
  // Returns true only if the product was really added
  // ==========================================

  addProductToCart(product: Product, cartItems: any[]): boolean {

    // Check login
    if (!localStorage.getItem('token')) {
      this.loginMessage = true;
      return false;
    }

    // Check stock
    if (product.stock <= 0) {
      return false;
    }

    // 9th DIFFERENT product -> show toast
    if (
      !this.isInCart(product, cartItems) &&
      this.hasReachedProductLimit(cartItems)
    ) {

      this.toastService.show(
        `You can add a maximum of ${this.MAX_CART_PRODUCTS} different products to your cart.`,
        'error'
      );

      return false;

    }

    // Maximum allowed quantity of this product
    const maximumQuantity = this.getMaximumQuantity(product.stock);

    // Quantity already in cart
    const currentQuantity = this.getCurrentCartQuantity(product, cartItems);

    // Quantity limit reached
    if (currentQuantity >= maximumQuantity) {
      this.showCartLimitMessage(product);
      return false;
    }

    // Quantity that can still be added
    const remainingQuantity = maximumQuantity - currentQuantity;

    const quantityToAdd = Math.min(this.quantity, remainingQuantity);

    if (quantityToAdd <= 0) {
      return false;
    }

    // Add product
    this.store.dispatch(
      addToCart({
        product,
        quantity: quantityToAdd
      })
    );

    // Reset selected quantity
    this.quantity = 1;

    return true;

  }


  // ==========================================
  // BUY NOW
  // ==========================================

  buyNow(product: Product, cartItems: any[]): void {

    // Go to checkout only if the product was really added
    const added = this.addProductToCart(product, cartItems);

    if (!added) {
      return;
    }

    this.router.navigate(['/checkout']);

  }


  // ==========================================
  // LOGIN MESSAGE
  // ==========================================

  closeLoginMessage(): void {
    this.loginMessage = false;
  }

  goToLogin(): void {

    this.loginMessage = false;

    this.router.navigate(['/auth']);

  }


  // ==========================================
  // CLOSE CART LIMIT MESSAGE
  // ==========================================

  closeCartLimitMessage(): void {
    this.cartLimitMessage = false;
  }


  // ==========================================
  // IMAGE ZOOM - HOVER
  // ==========================================

  onImageEnter(): void {
    this.isZoomed = true;
  }

  onImageMove(event: MouseEvent): void {

    const element = event.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();

    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    this.zoomOrigin = `${x}% ${y}%`;

  }

  onImageLeave(): void {

    this.isZoomed = false;
    this.zoomOrigin = '50% 50%';

  }


  // ==========================================
  // IMAGE ZOOM - FULL SCREEN
  // ==========================================

  openLightbox(): void {
    this.lightboxOpen = true;
  }

  closeLightbox(): void {
    this.lightboxOpen = false;
  }

  // Escape key closes lightbox and popups
  @HostListener('document:keydown.escape')
  onEscape(): void {

    if (this.lightboxOpen) {
      this.closeLightbox();
    }

    if (this.cartLimitMessage) {
      this.closeCartLimitMessage();
    }

    if (this.loginMessage) {
      this.closeLoginMessage();
    }

  }


  // ==========================================
  // WISHLIST
  // ==========================================

  isInWishlist(product: Product, wishlistItems: WishlistItem[]): boolean {

    return wishlistItems.some(item => item.productId === product.id);

  }

  toggleWishlist(product: Product, wishlistItems: WishlistItem[]): void {

    if (this.isInWishlist(product, wishlistItems)) {

      this.store.dispatch(
        removeFromWishlist({ productId: product.id })
      );

    }
    else {

      this.store.dispatch(
        addToWishlist({ product })
      );

    }

  }

}