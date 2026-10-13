import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { loadProducts } from '../../store/products/products.actions';
import {
  selectAllProducts,
  selectProductsLoading,
  selectProductsError
} from '../../store/products/products.selectors';

import { addToCart } from '../../store/cart/cart.actions';
import { selectCartItems } from '../../store/cart/cart.selectors';

import {
  addToWishlist,
  removeFromWishlist,
  loadWishlist
} from '../../store/wishlist/wishlist.actions';
import { selectWishlistItems } from '../../store/wishlist/wishlist.selectors';

import { Product } from '../../core/models/product.model';
import { ToastService } from '../../core/services/toast.service';

import { HeaderComponent } from '../../shared/components/header/header/header.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';


@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    AsyncPipe,
    FormsModule,
    RouterLink,
    FooterComponent,
    HeaderComponent
  ],
  templateUrl: './products.component.html',
  styleUrl: './products.component.css'
})
export class ProductsComponent {

  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private toastService = inject(ToastService);


  // =====================================================
  // USER STATE
  // =====================================================

  get isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }


  // =====================================================
  // CART LIMITS
  // =====================================================

  readonly MAX_CART_QUANTITY = 5;
  readonly MAX_CART_PRODUCTS = 8;


  // =====================================================
  // CART LIMIT POPUP (quantity limit)
  // =====================================================

  cartLimitMessage = false;
  cartLimitText = '';


  // =====================================================
  // TRIGGERS
  // =====================================================

  private filterChange$ = new BehaviorSubject<void>(undefined);
  private pageChange$ = new BehaviorSubject<number>(1);


  // =====================================================
  // FILTER VALUES
  // =====================================================

  selectedCategory = '';
  searchTerm = '';
  minPrice: number | null = null;
  maxPrice: number | null = null;

  sortOrder: 'default' | 'lowToHigh' | 'highToLow' = 'default';


  // =====================================================
  // PAGINATION VALUES
  // =====================================================

  currentPage = 1;
  itemsPerPage = 6;


  // =====================================================
  // PRODUCTS
  // =====================================================

  private allProducts$ = this.store.select(selectAllProducts);

  products$ = combineLatest([
    this.allProducts$,
    this.filterChange$
  ]).pipe(

    map(([products]) => {

      let filteredProducts = [...products];

      // CATEGORY FILTER
      if (this.selectedCategory) {
        filteredProducts = filteredProducts.filter(
          product =>
            product.category.toLowerCase().trim() ===
            this.selectedCategory.toLowerCase().trim()
        );
      }

      // SEARCH FILTER
      if (this.searchTerm.trim()) {

        const search = this.searchTerm.trim().toLowerCase();

        const searchPattern = new RegExp(
          `\\b${this.escapeRegExp(search)}\\b`,
          'i'
        );

        filteredProducts = filteredProducts.filter(product =>
          searchPattern.test(product.name.toLowerCase()) ||
          searchPattern.test(product.category.toLowerCase()) ||
          searchPattern.test(product.description.toLowerCase())
        );
      }

      // MINIMUM PRICE
      if (this.minPrice !== null && this.minPrice >= 0) {
        filteredProducts = filteredProducts.filter(
          product => product.price >= this.minPrice!
        );
      }

      // MAXIMUM PRICE
      if (this.maxPrice !== null && this.maxPrice >= 0) {
        filteredProducts = filteredProducts.filter(
          product => product.price <= this.maxPrice!
        );
      }

      // PRICE SORTING
      if (this.sortOrder === 'lowToHigh') {
        filteredProducts.sort((a, b) => a.price - b.price);
      }
      else if (this.sortOrder === 'highToLow') {
        filteredProducts.sort((a, b) => b.price - a.price);
      }

      return filteredProducts;
    })
  );

  paginatedProducts$ = combineLatest([
    this.products$,
    this.pageChange$
  ]).pipe(

    map(([products, page]) => {

      const startIndex = (page - 1) * this.itemsPerPage;
      const endIndex = startIndex + this.itemsPerPage;

      return products.slice(startIndex, endIndex);
    })
  );

  totalPages$ = this.products$.pipe(
    map(products => Math.ceil(products.length / this.itemsPerPage))
  );

  loading$ = this.store.select(selectProductsLoading);
  error$ = this.store.select(selectProductsError);
  cartItems$ = this.store.select(selectCartItems);
  wishlistItems$ = this.store.select(selectWishlistItems);


  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor() {

    this.store.dispatch(loadProducts());

    // Wishlist only for logged-in users
    if (this.isLoggedIn) {
      this.store.dispatch(loadWishlist());
    }

    // READ URL PARAMETERS
    this.route.queryParams.subscribe(params => {

      if (params['search']) {
        this.searchTerm = params['search'];
        this.selectedCategory = '';
      }
      else {
        this.selectedCategory = params['category'] || '';
        this.searchTerm = '';
      }

      this.currentPage = 1;
      this.pageChange$.next(this.currentPage);
      this.filterChange$.next();
    });
  }


  // =====================================================
  // ESCAPE REGEX
  // =====================================================

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }


  // =====================================================
  // FILTERS
  // =====================================================

  onPriceFilterChange(): void {
    this.currentPage = 1;
    this.filterChange$.next();
    this.pageChange$.next(this.currentPage);
  }

  onSortChange(): void {
    this.currentPage = 1;
    this.filterChange$.next();
    this.pageChange$.next(this.currentPage);
  }

  clearFilters(): void {
    this.minPrice = null;
    this.maxPrice = null;
    this.sortOrder = 'default';
    this.selectedCategory = '';
    this.searchTerm = '';
    this.currentPage = 1;

    this.filterChange$.next();
    this.pageChange$.next(this.currentPage);
  }


  // =====================================================
  // PAGINATION
  // =====================================================

  nextPage(totalPages: number): void {
    if (this.currentPage < totalPages) {
      this.currentPage++;
      this.pageChange$.next(this.currentPage);
      this.scrollToTop();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.pageChange$.next(this.currentPage);
      this.scrollToTop();
    }
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.pageChange$.next(this.currentPage);
    this.scrollToTop();
  }

  getPageNumbers(totalPages: number): number[] {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  private scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }


  // =====================================================
  // CART QUANTITY HELPERS
  // =====================================================

  getMaximumCartQuantity(product: Product): number {
    return Math.min(this.MAX_CART_QUANTITY, product.stock);
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
      this.getMaximumCartQuantity(product)
    );
  }

  showCartLimitMessage(product: Product): void {

    if (product.stock < this.MAX_CART_QUANTITY) {
      this.cartLimitText =
        `Only ${product.stock} items are available for this product.`;
    }
    else {
      this.cartLimitText =
        `Maximum ${this.MAX_CART_QUANTITY} items are allowed for this product.`;
    }

    this.cartLimitMessage = true;
  }

  closeCartLimitMessage(): void {
    this.cartLimitMessage = false;
  }


  // =====================================================
  // 8 PRODUCT LIMIT
  // =====================================================

  hasReachedProductLimit(cartItems: any[]): boolean {
    return cartItems.length >= this.MAX_CART_PRODUCTS;
  }


  // =====================================================
  // ADD TO CART
  // =====================================================

  addProductToCart(product: Product, cartItems: any[]): void {

    // GUEST USER -> LOGIN TOAST
    if (!this.isLoggedIn) {

      this.toastService.show(
        'Please login to add products to your cart.',
        'error'
      );

      return;
    }

    // OUT OF STOCK
    if (product.stock <= 0) {
      return;
    }

    // 9th DIFFERENT PRODUCT -> TOAST
    if (
      !this.isInCart(product, cartItems) &&
      this.hasReachedProductLimit(cartItems)
    ) {

      this.toastService.show(
        `You can add a maximum of ${this.MAX_CART_PRODUCTS} different products to your cart.`,
        'error'
      );

      return;
    }

    // QUANTITY LIMIT (same product)
    if (this.hasReachedCartLimit(product, cartItems)) {
      this.showCartLimitMessage(product);
      return;
    }

    // ADD ONLY ONE
    this.store.dispatch(
      addToCart({
        product,
        quantity: 1
      })
    );
  }

  isInCart(product: Product, cartItems: any[]): boolean {
    return cartItems.some(item => item.product.id === product.id);
  }


  // =====================================================
  // WISHLIST
  // =====================================================

  isInWishlist(product: Product, wishlistItems: any[]): boolean {
    return wishlistItems.some(item => item.productId === product.id);
  }

  toggleWishlist(product: Product, wishlistItems: any[]): void {

    // GUEST USER -> LOGIN TOAST
    if (!this.isLoggedIn) {

      this.toastService.show(
        'Please login to use your wishlist.',
        'error'
      );

      return;
    }

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