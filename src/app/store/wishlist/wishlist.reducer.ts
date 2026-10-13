import { createReducer, on } from '@ngrx/store';

import {
  initialWishlistState
} from './wishlist.state';

import {
  removeFromWishlist,
  clearWishlist,
  loadWishlistSuccess
} from './wishlist.actions';


export const wishlistReducer = createReducer(

  initialWishlistState,


  // =====================================================
  // LOAD WISHLIST SUCCESS
  // =====================================================

  on(
    loadWishlistSuccess,
    (state, { items }) => ({

      ...state,

      items: items

    })
  ),


  // =====================================================
  // REMOVE FROM WISHLIST
  // =====================================================

  on(
    removeFromWishlist,
    (state, { productId }) => {

      const updatedItems =
        state.items.filter(
          item =>
            item.productId !==
            productId
        );


      return {

        ...state,

        items: updatedItems

      };

    }
  ),


  // =====================================================
  // CLEAR WISHLIST
  // =====================================================

  on(
    clearWishlist,
    state => ({

      ...state,

      items: []

    })
  )

);