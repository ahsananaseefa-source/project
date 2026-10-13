import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { productReducer } from './store/products/products.reducer';
import { ProductsEffects } from './store/products/products.effects';
import { cartReducer } from './store/cart/cart.reducer';
import { CartEffects } from './store/cart/cart.effects';
import { WishlistEffects } from './store/wishlist/wishlist.effects';
import { wishlistReducer } from './store/wishlist/wishlist.reducer';
import { orderReducer } from './store/order/order.reducer';
import { OrderEffects } from './store/order/order.effects';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';



export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }), provideRouter(routes,withInMemoryScrolling({
    scrollPositionRestoration: 'top'
  })), provideHttpClient(), 
    provideStore({
      products : productReducer,
      cart : cartReducer,
      wishlist : wishlistReducer,
      order : orderReducer

  }), 
    provideEffects([
      ProductsEffects,
      CartEffects,
      WishlistEffects,
      OrderEffects
    ]), provideAnimationsAsync()]
};
