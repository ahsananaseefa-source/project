import { Routes } from '@angular/router';

import { HomeComponent } from './features/home/home.component';
import { authGuard } from './core/guards/auth.guard';
import { WishlistComponent } from './features/wishlist/wishlist.component';
import { CartComponent } from './features/cart/cart.component';
import { ProductsComponent } from './features/products/products.component';
import { accountGuard } from './core/guards/account.guard';
import { NotFoundComponent } from './features/not-found/not-found.component';


export const routes: Routes = [

  // =========================
  // AUTH
  // =========================

  {
    path: 'auth',

    loadComponent: () =>
      import('./features/auth/auth.component')
        .then(m => m.AuthComponent)
  },


  // =========================
  // CHECKOUT
  // LOGIN REQUIRED
  // =========================

  {
    path: 'checkout',

    loadComponent: () =>
      import('./features/checkout/checkout.component')
        .then(m => m.CheckoutComponent),

    canActivate: [authGuard]
  },


  // =========================
  // PRODUCT DETAILS
  // PUBLIC
  // =========================

  {
    path: 'products/:id',

    loadComponent: () =>
      import('./features/products/product-details/product-details.component')
        .then(m => m.ProductDetailsComponent)
  },


  // =========================
  // PRODUCTS
  // PUBLIC
  // =========================

  {
    path: 'products',

    component: ProductsComponent
  },


  // =========================
  // ACCOUNT
  // LOGIN REQUIRED
  // =========================

  {
    path: 'account',

    canActivate: [accountGuard],

    loadComponent: () =>
      import('./features/account/account.component')
        .then(m => m.AccountComponent)
  },


  // =========================
  // HOME
  // PUBLIC
  // =========================

  {
    path: 'home',

    component: HomeComponent
  },


  // =========================
  // WISHLIST
  // LOGIN REQUIRED
  // =========================

  {
    path: 'wishlist',

    component: WishlistComponent,

    canActivate: [authGuard]
  },


  // =========================
  // CART
  // LOGIN REQUIRED
  // =========================

  {
    path: 'cart',

    component: CartComponent,

    canActivate: [authGuard]
  },


  // =========================
  // ORDER DETAILS
  // LOGIN REQUIRED
  // =========================

  {
    path: 'order/:id',

    loadComponent: () =>
      import('./features/order-details/order-details.component')
        .then(m => m.OrderDetailsComponent),

    canActivate: [authGuard]
  },


  // =========================
  // ORDERS
  // LOGIN REQUIRED
  // =========================

  {
    path: 'order',

    loadComponent: () =>
      import('./features/order/order.component')
        .then(m => m.OrderComponent),

    canActivate: [authGuard]
  },


  // =========================
  // ORDER SUCCESS
  // LOGIN REQUIRED
  // =========================

  {
    path: 'order-success',

    loadComponent: () =>
      import('./features/order-success/order-success.component')
        .then(m => m.OrderSuccessComponent),

    canActivate: [authGuard]
  },


  // =========================
  // DEFAULT
  // =========================

  {
    path: '',

    redirectTo: 'home',

    pathMatch: 'full'
  },


  // =========================
  // INVALID ROUTE
  // =========================

 
  {
    path:"**",
    component:NotFoundComponent

  }
];