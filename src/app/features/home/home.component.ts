import { Component, HostListener, OnInit, inject } from '@angular/core';

import { AsyncPipe } from '@angular/common';

import { RouterLink } from '@angular/router';

import { Store } from '@ngrx/store';

import { map } from 'rxjs/operators';

import { HeaderComponent } from '../../shared/components/header/header/header.component';

import { FooterComponent } from '../../shared/components/footer/footer.component';

import { loadProducts } from '../../store/products/products.actions';

import {
  selectAllProducts,
  selectProductsLoading,
  selectProductsError
} from '../../store/products/products.selectors';

import {
  addToWishlist,
  removeFromWishlist,
  loadWishlist
} from '../../store/wishlist/wishlist.actions';

import { selectWishlistItems } from '../../store/wishlist/wishlist.selectors';

import { Product } from '../../core/models/product.model';

import { WishlistItem } from '../../core/models/wishlist-item.models';


@Component({
  selector: 'app-home',

  standalone: true,

  imports: [
    AsyncPipe,
    RouterLink,
    HeaderComponent,
    FooterComponent
  ],

  templateUrl: './home.component.html',

  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {

  private store = inject(Store);


  // =====================================================
  // STAY ON HOME WHEN BACK IS PRESSED
  // =====================================================

  private homeUrl = '';

  ngOnInit(): void {

    // Remember the home URL and add one extra history entry,
    // so the back button has something to land on (still home)
    this.homeUrl = location.href;

    history.pushState(history.state, '', this.homeUrl);

  }

  @HostListener('window:popstate')
  onBackPressed(): void {

    // Only block back while the user is really on the home page.
    // If the URL is different, let the router work normally.
    if (location.href === this.homeUrl) {

      history.pushState(history.state, '', this.homeUrl);

    }

  }


  // =====================================================
  // CATEGORIES
  // =====================================================

  categories = [
    'Rings',
    'Earrings',
    'Bracelets',
    'Bangles',
    'Chains',
    'Anklets'
  ];


  // =====================================================
  // PAGINATION
  // =====================================================

  currentPage = 1;

  productsPerPage = 6;


  // =====================================================
  // PRODUCTS
  // =====================================================

  private allProducts$ = this.store.select(selectAllProducts);


  // =====================================================
  // FEATURED PRODUCTS (HIGHEST RATING FIRST)
  // =====================================================

  products$ = this.allProducts$.pipe(

    map(products =>
      [...products].sort(
        (a, b) => Number(b.rating) - Number(a.rating)
      )
    )

  );


  // =====================================================
  // LOADING / ERROR
  // =====================================================

  loading$ = this.store.select(selectProductsLoading);

  error$ = this.store.select(selectProductsError);


  // =====================================================
  // WISHLIST
  // =====================================================

  wishlistItems$ = this.store.select(selectWishlistItems);


  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor() {

    this.store.dispatch(loadProducts());

    this.store.dispatch(loadWishlist());

  }


  // =====================================================
  // PAGINATION
  // =====================================================

  getPaginatedProducts(products: Product[]): Product[] {

    const startIndex = (this.currentPage - 1) * this.productsPerPage;

    return products.slice(
      startIndex,
      startIndex + this.productsPerPage
    );

  }

  getTotalPages(products: Product[]): number {

    return Math.ceil(products.length / this.productsPerPage);

  }

  getPageNumbers(products: Product[]): number[] {

    return Array.from(
      { length: this.getTotalPages(products) },
      (_, index) => index + 1
    );

  }

  changePage(page: number): void {

    this.currentPage = page;

  }

  previousPage(): void {

    if (this.currentPage > 1) {
      this.currentPage--;
    }

  }

  nextPage(products: Product[]): void {

    if (this.currentPage < this.getTotalPages(products)) {
      this.currentPage++;
    }

  }


  // =====================================================
  // WISHLIST
  // =====================================================

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