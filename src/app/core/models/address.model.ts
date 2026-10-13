export interface Address {
  id?: string;
  userId: string;

  fullName: string;
  phone: string;

  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  addressType?: string;
  isDefault: boolean;
}