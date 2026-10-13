import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';

import { HeaderComponent } from '../../shared/components/header/header/header.component';

import { User } from '../../core/models/user.models';
import { Address } from '../../core/models/address.model';
import { Order } from '../../core/models/order.model';

import { AddressService } from '../../core/services/address.service';

import {
  loadOrders
} from '../../store/order/order.actions';

import {
  selectOrders,
  selectOrderLoading,
  selectOrderError
} from '../../store/order/order.selectors';


type AddressField =
  | 'fullName'
  | 'phone'
  | 'addressLine'
  | 'city'
  | 'state'
  | 'pincode'
  | 'addressType';


type ProfileField =
  | 'name'
  | 'phone';


@Component({
  selector: 'app-account',
  standalone: true,

  imports: [
    AsyncPipe,
    FormsModule,
    RouterLink,
    HeaderComponent
  ],

  templateUrl: './account.component.html',
  styleUrl: './account.component.css'
})


export class AccountComponent {

  private router = inject(Router);
  private addressService = inject(AddressService);
  private store = inject(Store);


  user: User | null = null;


  // =====================================================
  // SUCCESS MESSAGE
  // =====================================================

  private readonly SUCCESS_DURATION = 1000;

  private addressSuccessTimer:
    ReturnType<typeof setTimeout> | null = null;


  // =====================================================
  // PROFILE PHOTO
  // =====================================================

  profilePhoto = '';


  // =====================================================
  // PROFILE
  // =====================================================

  isEditingProfile = false;

  profileForm = {
    name: '',
    phone: ''
  };


  profileFieldErrors: Record<ProfileField, string> = {
    name: '',
    phone: ''
  };


  // =====================================================
  // ADDRESSES
  // =====================================================

  addresses: Address[] = [];

  isAddressFormOpen = false;

  isEditingAddress = false;

  editingAddressId: string | null = null;

  addressError = '';


  private _addressSuccess = '';


  get addressSuccess(): string {
    return this._addressSuccess;
  }


  set addressSuccess(value: string) {

    this._addressSuccess = value;

    if (this.addressSuccessTimer) {

      clearTimeout(
        this.addressSuccessTimer
      );

      this.addressSuccessTimer = null;
    }


    if (value) {

      this.addressSuccessTimer =
        setTimeout(() => {

          this._addressSuccess = '';

          this.addressSuccessTimer = null;

        }, this.SUCCESS_DURATION);
    }
  }


  // =====================================================
  // ADDRESS TYPES
  // =====================================================

  addressTypes: string[] = [
    'Home',
    'Work',
    'Other'
  ];


  // =====================================================
  // ADDRESS VALIDATION
  // =====================================================

  addressFieldErrors:
    Record<AddressField, string> = {

    fullName: '',
    phone: '',
    addressLine: '',
    city: '',
    state: '',
    pincode: '',
    addressType: ''
  };


  // =====================================================
  // DELETE ADDRESS
  // =====================================================

  isDeleteConfirmOpen = false;

  addressToDelete: Address | null = null;


  addressForm: Address = {

    userId: '',
    fullName: '',
    phone: '',
    addressLine: '',
    city: '',
    state: '',
    pincode: '',
    addressType: 'Home',
    isDefault: false
  };


  // =====================================================
  // ORDERS
  // =====================================================

  orders$ =
    this.store.select(selectOrders);


  orderLoading$ =
    this.store.select(selectOrderLoading);


  orderError$ =
    this.store.select(selectOrderError);


  userOrders: Order[] = [];

  isOrdersOpen = false;


  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor() {

    this.loadUser();

    this.loadOrders();
  }


  // =====================================================
  // LOAD USER
  // =====================================================

  loadUser(): void {

    const storedUser =
      localStorage.getItem('user');


    if (!storedUser) {

      this.router.navigate(['/auth']);

      return;
    }


    try {

      this.user =
        JSON.parse(storedUser) as User;


      if (!this.user.id) {

        this.router.navigate(['/auth']);

        return;
      }


      this.loadProfilePhoto();

      this.loadAddresses();


    } catch (error) {

      console.error(
        'Failed to load user:',
        error
      );


      localStorage.removeItem('user');

      localStorage.removeItem('token');

      localStorage.removeItem('userId');


      this.router.navigate(['/auth']);
    }
  }


  // =====================================================
  // EDIT PROFILE
  // =====================================================

  openEditProfile(): void {

    if (!this.user) {
      return;
    }


    this.profileForm = {

      name:
        this.user.name ?? '',

      phone:
        this.user.phone ?? ''
    };


    this.profileFieldErrors = {

      name: '',
      phone: ''
    };


    this.isEditingProfile = true;

    this.addressError = '';

    this.addressSuccess = '';
  }


  cancelEditProfile(): void {

    this.isEditingProfile = false;


    this.profileFieldErrors = {

      name: '',
      phone: ''
    };


    this.addressError = '';
  }


  onProfileFieldChange(
    field: ProfileField,
    value: string
  ): void {

    this.profileFieldErrors[field] =
      this.getProfileFieldError(
        field,
        value
      );
  }


  validateProfileField(
    field: ProfileField
  ): void {

    this.profileFieldErrors[field] =
      this.getProfileFieldError(
        field,
        this.profileForm[field]
      );
  }


  saveProfile(): void {

    if (!this.user) {
      return;
    }


    const fields: ProfileField[] = [
      'name',
      'phone'
    ];


    let isValid = true;


    fields.forEach(field => {

      const message =
        this.getProfileFieldError(
          field,
          this.profileForm[field]
        );


      this.profileFieldErrors[field] =
        message;


      if (message) {
        isValid = false;
      }
    });


    if (!isValid) {
      return;
    }


    this.user = {

      ...this.user,

      name:
        this.profileForm.name.trim(),

      phone:
        this.profileForm.phone.trim()
    };


    localStorage.setItem(
      'user',
      JSON.stringify(this.user)
    );


    this.isEditingProfile = false;

    this.addressError = '';

    this.addressSuccess =
      'Profile updated successfully.';
  }


  private getProfileFieldError(
    field: ProfileField,
    rawValue: string
  ): string {

    const value =
      (rawValue ?? '').trim();


    if (field === 'name') {

      if (!value) {
        return 'Please enter your name.';
      }


      if (value.length < 3) {

        return 'Name must be at least 3 characters.';
      }


      if (
        !/^[A-Za-z][A-Za-z .'-]*$/.test(value)
      ) {

        return 'Name can contain only letters and spaces.';
      }


      return '';
    }


    if (!value) {
      return '';
    }


    if (!/^[0-9]+$/.test(value)) {

      return 'Phone number must contain digits only.';
    }


    if (value.length !== 10) {

      return 'Phone number must be exactly 10 digits.';
    }


    if (!/^[6-9]/.test(value)) {

      return 'Phone number must start with 6, 7, 8 or 9.';
    }


    if (this.isFakePhoneNumber(value)) {

      return 'Please enter a valid phone number.';
    }


    return '';
  }


  // =====================================================
  // PROFILE PHOTO
  // =====================================================

  loadProfilePhoto(): void {

    if (!this.user?.id) {
      return;
    }


    const savedPhoto =
      localStorage.getItem(
        `profilePhoto_${this.user.id}`
      );


    if (savedPhoto) {

      this.profilePhoto =
        savedPhoto;
    }
  }


  openProfilePhotoInput(
    input: HTMLInputElement
  ): void {

    input.click();
  }


  onProfilePhotoSelected(
    event: Event
  ): void {

    const input =
      event.target as HTMLInputElement;


    const file =
      input.files?.[0];


    if (!file) {
      return;
    }


    if (!file.type.startsWith('image/')) {

      this.addressError =
        'Please select a valid image file.';

      input.value = '';

      return;
    }


    if (file.size > 5 * 1024 * 1024) {

      this.addressError =
        'Profile photo must be smaller than 5 MB.';

      input.value = '';

      return;
    }


    const reader =
      new FileReader();


    reader.onload = () => {

      const result =
        reader.result as string;


      this.profilePhoto =
        result;


      if (this.user?.id) {

        localStorage.setItem(
          `profilePhoto_${this.user.id}`,
          result
        );
      }


      this.addressError = '';

      this.addressSuccess =
        'Profile photo updated successfully.';
    };


    reader.onerror = () => {

      this.addressError =
        'Unable to upload the profile photo.';
    };


    reader.readAsDataURL(file);

    input.value = '';
  }


  removeProfilePhoto(): void {

    if (!this.user?.id) {
      return;
    }


    localStorage.removeItem(
      `profilePhoto_${this.user.id}`
    );


    this.profilePhoto = '';


    this.addressSuccess =
      'Profile photo removed successfully.';

    this.addressError = '';
  }


  // =====================================================
  // LOAD ADDRESSES
  // =====================================================

  loadAddresses(): void {

    if (!this.user?.id) {
      return;
    }


    this.addressService
      .getUserAddresses(this.user.id)
      .subscribe({

        next: addresses => {

          this.addresses =
            addresses;
        },


        error: error => {

          console.error(
            'Failed to load addresses:',
            error
          );


          this.addressError =
            'Unable to load your saved addresses.';
        }
      });
  }


  // =====================================================
  // LOAD ORDERS
  // =====================================================

  loadOrders(): void {

    this.store.dispatch(
      loadOrders()
    );


    this.orders$.subscribe({

      next: orders => {

        const userId =
          localStorage.getItem('userId');


        if (!userId) {

          this.userOrders = [];

          return;
        }


        this.userOrders =
          orders

            .filter(
              order =>
                String(order.userId) ===
                String(userId)
            )

            .sort(
              (a, b) =>
                new Date(b.orderDate).getTime() -
                new Date(a.orderDate).getTime()
            );
      }
    });
  }


  // =====================================================
  // TOGGLE ORDERS
  // =====================================================

  toggleOrders(): void {

    this.isOrdersOpen =
      !this.isOrdersOpen;


    if (this.isOrdersOpen) {

      setTimeout(() => {

        document
          .querySelector('.orders-section')
          ?.scrollIntoView({

            behavior: 'smooth',

            block: 'start'
          });

      }, 100);
    }
  }


  // =====================================================
  // ORDER DATE
  // =====================================================

  formatOrderDate(
    date: Date | string
  ): string {

    const orderDate =
      new Date(date);


    return orderDate.toLocaleDateString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }
    );
  }


  // =====================================================
  // ADD ADDRESS
  // =====================================================

  openAddAddress(): void {

    if (this.addresses.length >= 2) {

      this.addressError =
        'You can save a maximum of 2 addresses.';

      return;
    }


    this.resetAddressForm();


    this.addressForm.userId =
      this.user?.id ?? '';


    this.addressForm.fullName =
      this.user?.name ?? '';


    this.isAddressFormOpen = true;

    this.isEditingAddress = false;

    this.editingAddressId = null;

    this.addressError = '';

    this.addressSuccess = '';
  }


  // =====================================================
  // EDIT ADDRESS
  // =====================================================

  editAddress(
    address: Address
  ): void {

    this.addressForm = {

      ...address,

      addressType:
        address.addressType || 'Home'
    };


    this.clearAddressFieldErrors();


    this.isAddressFormOpen = true;

    this.isEditingAddress = true;

    this.editingAddressId =
      address.id ?? null;

    this.addressError = '';

    this.addressSuccess = '';
  }


  // =====================================================
  // CANCEL ADDRESS FORM
  // =====================================================

  cancelAddressForm(): void {

    this.isAddressFormOpen = false;

    this.isEditingAddress = false;

    this.editingAddressId = null;

    this.addressError = '';

    this.resetAddressForm();
  }


  // =====================================================
  // ADDRESS TYPE
  // =====================================================

  selectAddressType(
    type: string
  ): void {

    this.addressForm.addressType =
      type;


    this.addressFieldErrors.addressType =
      this.getAddressFieldError(
        'addressType',
        type
      );
  }


  // =====================================================
  // SAVE ADDRESS
  // =====================================================

  saveAddress(): void {

    this.addressError = '';

    this.addressSuccess = '';


    if (!this.validateAddressForm()) {
      return;
    }


    if (!this.user?.id) {

      this.addressError =
        'User information is missing.';

      return;
    }


    const addressData: Address = {

      ...this.addressForm,

      userId:
        this.user.id,

      fullName:
        this.addressForm.fullName.trim(),

      phone:
        this.addressForm.phone.trim(),

      addressLine:
        this.addressForm.addressLine.trim(),

      city:
        this.addressForm.city.trim(),

      state:
        this.addressForm.state.trim(),

      pincode:
        this.addressForm.pincode.trim(),

      addressType:
        this.addressForm.addressType
    };


    // =====================================================
    // ADD ADDRESS
    // =====================================================

    if (!this.isEditingAddress) {

      if (this.addresses.length === 0) {

        addressData.isDefault = true;
      }


      if (addressData.isDefault) {

        this.removeDefaultFromExistingAddresses();
      }


      this.addressService
        .addAddress(addressData)
        .subscribe({

          next: savedAddress => {

            this.addresses = [

              ...this.addresses,

              savedAddress
            ];


            this.isAddressFormOpen = false;


            this.addressSuccess =
              'Address saved successfully.';


            this.resetAddressForm();
          },


          error: error => {

            console.error(
              'Failed to save address:',
              error
            );


            this.addressError =
              'Unable to save the address. Please try again.';
          }
        });


      return;
    }


    // =====================================================
    // UPDATE ADDRESS
    // =====================================================

    if (!this.editingAddressId) {

      this.addressError =
        'Address ID is missing.';

      return;
    }


    if (addressData.isDefault) {

      this.removeDefaultFromExistingAddresses(
        this.editingAddressId
      );
    }


    this.addressService
      .updateAddress(
        this.editingAddressId,
        addressData
      )
      .subscribe({

        next: updatedAddress => {

          this.addresses =
            this.addresses.map(
              address =>
                address.id ===
                updatedAddress.id

                  ? updatedAddress

                  : address
            );


          this.isAddressFormOpen = false;

          this.isEditingAddress = false;

          this.editingAddressId = null;


          this.addressSuccess =
            'Address updated successfully.';


          this.resetAddressForm();
        },


        error: error => {

          console.error(
            'Failed to update address:',
            error
          );


          this.addressError =
            'Unable to update the address. Please try again.';
        }
      });
  }


  // =====================================================
  // DELETE ADDRESS
  // =====================================================

  deleteAddress(
    address: Address
  ): void {

    if (!address.id) {
      return;
    }


    this.addressToDelete =
      address;


    this.isDeleteConfirmOpen =
      true;
  }


  cancelDelete(): void {

    this.isDeleteConfirmOpen =
      false;


    this.addressToDelete =
      null;
  }


  confirmDelete(): void {

    if (!this.addressToDelete?.id) {
      return;
    }


    const addressId =
      this.addressToDelete.id;


    const wasDefault =
      this.addressToDelete.isDefault;


    this.addressService
      .deleteAddress(addressId)
      .subscribe({

        next: () => {

          this.addresses =
            this.addresses.filter(
              address =>
                address.id !== addressId
            );


          this.isDeleteConfirmOpen =
            false;


          this.addressToDelete =
            null;


          if (
            wasDefault &&
            this.addresses.length > 0
          ) {

            this.setDefaultAddress(
              this.addresses[0]
            );
          }


          this.addressSuccess =
            'Address deleted successfully.';


          this.addressError = '';
        },


        error: error => {

          console.error(
            'Failed to delete address:',
            error
          );


          this.addressError =
            'Unable to delete the address. Please try again.';


          this.isDeleteConfirmOpen =
            false;


          this.addressToDelete =
            null;
        }
      });
  }


  // =====================================================
  // DEFAULT ADDRESS
  // =====================================================

  setDefaultAddress(
    address: Address
  ): void {

    if (!address.id) {
      return;
    }


    this.addressService
      .updateAddress(
        address.id,
        {
          isDefault: true
        }
      )
      .subscribe({

        next: updatedAddress => {

          this.addresses =
            this.addresses.map(item => ({

              ...item,

              isDefault:
                item.id ===
                updatedAddress.id

            }));


          this.addressSuccess =
            'Default address updated.';


          this.addressError = '';
        },


        error: error => {

          console.error(
            'Failed to set default address:',
            error
          );


          this.addressError =
            'Unable to update the default address.';
        }
      });
  }


  // =====================================================
  // REMOVE OLD DEFAULT
  // =====================================================

  private removeDefaultFromExistingAddresses(
    exceptId?: string
  ): void {

    this.addresses

      .filter(address =>
        address.isDefault &&
        address.id !== exceptId &&
        address.id
      )

      .forEach(address => {

        this.addressService

          .updateAddress(
            address.id!,
            {
              isDefault: false
            }
          )

          .subscribe({

            next: () => {

              this.addresses =
                this.addresses.map(
                  item =>
                    item.id === address.id

                      ? {
                          ...item,
                          isDefault: false
                        }

                      : item
                );
            },


            error: error => {

              console.error(
                'Failed to remove old default address:',
                error
              );
            }
          });
      });


    this.addresses =
      this.addresses.map(address =>

        address.id === exceptId

          ? address

          : {
              ...address,
              isDefault: false
            }
      );
  }


  // =====================================================
  // PHONE VALIDATION
  // =====================================================

  private isFakePhoneNumber(
    value: string
  ): boolean {

    if (/(\d)\1{5,}/.test(value)) {
      return true;
    }


    const counts:
      Record<string, number> = {};


    for (const digit of value) {

      counts[digit] =
        (counts[digit] ?? 0) + 1;
    }


    if (
      Object.values(counts)
        .some(count => count >= 7)
    ) {

      return true;
    }


    if (
      /^(\d{2})\1{4}$/.test(value) ||
      /^(\d{5})\1$/.test(value)
    ) {

      return true;
    }


    let ascending = 1;

    let descending = 1;


    for (
      let i = 1;
      i < value.length;
      i++
    ) {

      const diff =
        Number(value[i]) -
        Number(value[i - 1]);


      ascending =
        diff === 1
          ? ascending + 1
          : 1;


      descending =
        diff === -1
          ? descending + 1
          : 1;


      if (
        ascending >= 6 ||
        descending >= 6
      ) {

        return true;
      }
    }


    return false;
  }


  // =====================================================
  // ADDRESS FIELD VALIDATION
  // =====================================================

  onAddressFieldChange(
    field: AddressField,
    value: string
  ): void {

    this.addressFieldErrors[field] =
      this.getAddressFieldError(
        field,
        value
      );


    if (this.addressError) {

      this.addressError = '';
    }
  }


  validateAddressField(
    field: AddressField
  ): void {

    this.addressFieldErrors[field] =
      this.getAddressFieldError(
        field,
        String(
          this.addressForm[field] ?? ''
        )
      );
  }


  private getAddressFieldError(
    field: AddressField,
    rawValue: string
  ): string {

    const value =
      (rawValue ?? '').trim();


    switch (field) {

      case 'fullName':

        if (!value) {

          return 'Please enter your full name.';
        }


        if (value.length < 3) {

          return 'Name must be at least 3 characters.';
        }


        if (
          !/^[A-Za-z][A-Za-z .'-]*$/.test(
            value
          )
        ) {

          return 'Name can contain only letters and spaces.';
        }


        return '';


      case 'phone':

        if (!value) {

          return 'Please enter your phone number.';
        }


        if (!/^[0-9]+$/.test(value)) {

          return 'Phone number must contain digits only.';
        }


        if (value.length !== 10) {

          return 'Please enter a valid 10-digit phone number.';
        }


        if (!/^[6-9]/.test(value)) {

          return 'Phone number must start with 6, 7, 8 or 9.';
        }


        if (this.isFakePhoneNumber(value)) {

          return 'Please enter a valid phone number.';
        }


        return '';


      case 'addressLine':

        if (!value) {

          return 'Please enter your address.';
        }


        if (value.length < 10) {

          return 'Address is too short. Please add house, street and area.';
        }


        return '';


      case 'city':

        if (!value) {

          return 'Please enter your city.';
        }


        if (
          !/^[A-Za-z][A-Za-z .'-]*$/.test(
            value
          )
        ) {

          return 'City can contain only letters.';
        }


        return '';


      case 'state':

        if (!value) {

          return 'Please enter your state.';
        }


        if (
          !/^[A-Za-z][A-Za-z .'-]*$/.test(
            value
          )
        ) {

          return 'State can contain only letters.';
        }


        return '';


      case 'pincode':

        if (!value) {

          return 'Please enter your pincode.';
        }


        if (!/^[0-9]+$/.test(value)) {

          return 'Pincode must contain digits only.';
        }


        if (value.length !== 6) {

          return 'Please enter a valid 6-digit pincode.';
        }


        if (value.startsWith('0')) {

          return 'Pincode cannot start with 0.';
        }


        return '';


      case 'addressType':

        if (
          !this.addressTypes.includes(value)
        ) {

          return 'Please select an address type.';
        }


        return '';
    }
  }


  private clearAddressFieldErrors(): void {

    this.addressFieldErrors = {

      fullName: '',
      phone: '',
      addressLine: '',
      city: '',
      state: '',
      pincode: '',
      addressType: ''
    };
  }


  // =====================================================
  // VALIDATE ADDRESS FORM
  // =====================================================

  private validateAddressForm(): boolean {

    const fields: AddressField[] = [

      'fullName',
      'phone',
      'addressLine',
      'city',
      'state',
      'pincode',
      'addressType'
    ];


    let isValid = true;


    fields.forEach(field => {

      const message =
        this.getAddressFieldError(
          field,
          String(
            this.addressForm[field] ?? ''
          )
        );


      this.addressFieldErrors[field] =
        message;


      if (message) {

        isValid = false;
      }
    });


    if (!isValid) {

      this.addressError =
        'Please correct the highlighted fields.';
    }


    return isValid;
  }


  // =====================================================
  // RESET ADDRESS FORM
  // =====================================================

  private resetAddressForm(): void {

    this.addressForm = {

      userId:
        this.user?.id ?? '',

      fullName: '',

      phone: '',

      addressLine: '',

      city: '',

      state: '',

      pincode: '',

      addressType: 'Home',

      isDefault: false
    };


    this.clearAddressFieldErrors();
  }


  // =====================================================
  // LOGOUT
  // =====================================================

  logout(): void {

    const userId =
      this.user?.id;


    localStorage.removeItem('token');

    localStorage.removeItem('user');

    localStorage.removeItem('userId');


    if (userId) {

      this.profilePhoto = '';


      localStorage.removeItem(
        `profilePhoto_${userId}`
      );
    }


    this.router.navigate(['/auth']);
  }

}