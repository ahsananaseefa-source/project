import { CartItem } from './cart-item.model';

export interface Order {

  id: number;

  userId: string;

  items: CartItem[];

  totalAmount: number;

  shippingAddress: string;

  orderDate: Date;

  status: string;

  paymentMethod: string;

  cancelReason?: string;

  cancelledAt?: string;

}