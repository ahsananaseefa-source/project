import {
  Component,
  OnDestroy,
  inject
} from '@angular/core';

import { FormsModule } from '@angular/forms';

import {
  ActivatedRoute,
  Router
} from '@angular/router';

import { Store } from '@ngrx/store';

import emailjs from '@emailjs/browser';

import { UserService } from '../../core/services/user.service';
import { CartService } from '../../core/services/cart.service';
import { ToastService } from '../../core/services/toast.service';

import { loadCart } from '../../store/cart/cart.actions';

import { User } from '../../core/models/user.models';


@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css'
})
export class AuthComponent implements OnDestroy {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private userService = inject(UserService);
  private cartService = inject(CartService);
  private store = inject(Store);
  private toastService = inject(ToastService);


  // =========================================================
  // EMAILJS CONFIG
  // =========================================================

  private readonly EMAILJS_SERVICE_ID = 'service_f05s6xe';
  private readonly EMAILJS_TEMPLATE_ID = 'template_cdey1ve';
  private readonly EMAILJS_PUBLIC_KEY = 'SJmmkU0Oe21BQ0hER';


  // =========================================================
  // OTP CONFIGURATION
  // =========================================================

  // OTP valid only for 1 minute
  private readonly OTP_VALID_MS = 1 * 60 * 1000;

  // Maximum wrong OTP attempts
  private readonly MAX_OTP_ATTEMPTS = 5;


  // =========================================================
  // AUTH
  // =========================================================

  isLogin = true;

  showPassword = false;
  showConfirmPassword = false;


  // =========================================================
  // FORM
  // =========================================================

  name = '';
  email = '';
  phone = '';
  password = '';
  confirmPassword = '';


  // =========================================================
  // FIELD VALIDATION ERRORS
  // =========================================================

  nameError = '';
  phoneError = '';
  emailError = '';
  passwordError = '';
  confirmPasswordError = '';


  // =========================================================
  // GENERAL MESSAGES
  // =========================================================

  errorMessage = '';


  // =========================================================
  // SUCCESS MESSAGE
  // Disappears automatically after 1 second
  // =========================================================

  private readonly SUCCESS_MESSAGE_DURATION = 1000;

  private successTimer:
    ReturnType<typeof setTimeout> | null = null;

  private _successMessage = '';

  get successMessage(): string {

    return this._successMessage;

  }

  set successMessage(value: string) {

    this._successMessage = value;

    // Stop the old timer
    if (this.successTimer) {

      clearTimeout(this.successTimer);

      this.successTimer = null;

    }

    // Start a new 1 second timer only for a real message
    if (value) {

      this.successTimer = setTimeout(() => {

        this._successMessage = '';

        this.successTimer = null;

      }, this.SUCCESS_MESSAGE_DURATION);

    }

  }


  // =========================================================
  // OTP
  // =========================================================

  otp = '';
  generatedOtp = '';

  otpSent = false;
  otpVerified = false;

  // Controls the OTP popup (sticky: user cannot close it)
  otpModalOpen = false;

  otpExpiryTime = 0;

  otpRemainingSeconds = 0;

  otpSending = false;
  otpVerifying = false;

  private otpAttempts = 0;


  // =========================================================
  // TIMER
  // =========================================================

  private otpInterval:
    ReturnType<typeof setInterval> | null = null;

  private verifyTimeout:
    ReturnType<typeof setTimeout> | null = null;


  // =========================================================
  // CONSTRUCTOR
  // =========================================================

  constructor() {

    emailjs.init({
      publicKey: this.EMAILJS_PUBLIC_KEY
    });

    this.route.queryParams.subscribe(params => {

      if (params['mode'] === 'register') {
        this.isLogin = false;
      } else {
        this.isLogin = true;
      }

    });
  }


  // =========================================================
  // DESTROY
  // =========================================================

  ngOnDestroy(): void {

    this.clearTimers();

  }


  // =========================================================
  // NORMALIZED EMAIL
  // =========================================================

  private get normalizedEmail(): string {

    return this.email.trim().toLowerCase();

  }


  // =========================================================
  // CLEAR TIMERS
  // =========================================================

  private clearTimers(): void {

    if (this.otpInterval) {

      clearInterval(this.otpInterval);

      this.otpInterval = null;

    }

    if (this.verifyTimeout) {

      clearTimeout(this.verifyTimeout);

      this.verifyTimeout = null;

    }

    // Clears the success message AND its timer
    this.successMessage = '';

  }


  // =========================================================
  // CLEAR FIELD ERRORS
  // =========================================================

  private clearFieldErrors(): void {

    this.nameError = '';
    this.phoneError = '';
    this.emailError = '';
    this.passwordError = '';
    this.confirmPasswordError = '';

  }


  // =========================================================
  // SWITCH LOGIN / REGISTER
  // =========================================================

  switchMode(): void {

    this.isLogin = !this.isLogin;

    this.name = '';
    this.email = '';
    this.phone = '';
    this.password = '';
    this.confirmPassword = '';

    this.clearFieldErrors();

    this.errorMessage = '';
    this.successMessage = '';

    this.showPassword = false;
    this.showConfirmPassword = false;

    this.resetOtp();

  }


  // =========================================================
  // VALIDATE NAME
  // =========================================================

  private validateName(): boolean {

    const trimmedName = this.name.trim();

    // Allows names such as:
    // Ahsana
    // Ahsana Naseefa
    // Mary Jane Smith

    const nameRegex = /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/;

    if (!trimmedName) {

      this.nameError = 'Full name is required.';

      return false;

    }

    if (trimmedName.length < 3) {

      this.nameError = 'Full name must contain at least 3 letters.';

      return false;

    }

    if (!nameRegex.test(trimmedName)) {

      this.nameError = 'Use alphabets and spaces only.';

      return false;

    }

    this.nameError = '';

    return true;

  }


  // =========================================================
  // WEAK / FAKE PHONE NUMBER CHECK
  // =========================================================

  private isWeakPhoneNumber(phone: string): boolean {

    // 1. Same digit repeated in the whole number
    // Example: 9999999999

    if (/^(\d)\1+$/.test(phone)) {
      return true;
    }

    // 2. Same digit 6 or more times in a row
    // Example: 9000000000, 9111111111, 9888888123

    if (/(\d)\1{5,}/.test(phone)) {
      return true;
    }

    // 3. Fewer than 4 different digits in the number
    // Example: 9009009009, 9090909090

    if (new Set(phone.split('')).size < 4) {
      return true;
    }

    // 4. A short block repeated again and again
    // Example: 9898989898, 9876598765

    if (/^(\d{2,5})\1+$/.test(phone)) {
      return true;
    }

    // 5. Long ascending or descending run
    // Example: 9123456789, 9876543210

    let ascending = 1;
    let descending = 1;

    for (let i = 1; i < phone.length; i++) {

      const diff = Number(phone[i]) - Number(phone[i - 1]);

      ascending = diff === 1 ? ascending + 1 : 1;

      descending = diff === -1 ? descending + 1 : 1;

      if (ascending >= 6 || descending >= 6) {
        return true;
      }

    }

    return false;

  }


  // =========================================================
  // VALIDATE PHONE
  // =========================================================

  private validatePhone(): boolean {

    const trimmedPhone = this.phone.trim();

    if (!trimmedPhone) {

      this.phoneError = 'Phone number is required.';

      return false;

    }

    // Must contain exactly 10 digits
    // and start with 6, 7, 8 or 9

    const phoneRegex = /^[6-9][0-9]{9}$/;

    if (!phoneRegex.test(trimmedPhone)) {

      this.phoneError = 'Enter a valid 10-digit mobile number.';

      return false;

    }

    // Reject fake / repeated / sequential numbers

    if (this.isWeakPhoneNumber(trimmedPhone)) {

      this.phoneError = 'Enter a valid mobile number.';

      return false;

    }

    this.phoneError = '';

    return true;

  }


  // =========================================================
  // VALIDATE EMAIL
  // =========================================================

  private validateEmail(): boolean {

    const trimmedEmail = this.email.trim();

    const emailRegex =
      /^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*@[A-Za-z0-9]+(?:[.-][A-Za-z0-9]+)*\.[A-Za-z]{2,}$/;

    if (!trimmedEmail) {

      this.emailError = 'Email address is required.';

      return false;

    }

    if (!emailRegex.test(trimmedEmail)) {

      this.emailError = 'Enter a valid email address.';

      return false;

    }

    this.emailError = '';

    return true;

  }


  // =========================================================
  // VALIDATE PASSWORD (REGISTER ONLY)
  // Full password rules
  // =========================================================

  private validatePassword(): boolean {

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!this.password) {

      this.passwordError = 'Password is required.';

      return false;

    }

    if (!passwordRegex.test(this.password)) {

      this.passwordError =
        'Password must contain at least 8 characters, uppercase, lowercase, number and special character.';

      return false;

    }

    this.passwordError = '';

    return true;

  }


  // =========================================================
  // VALIDATE LOGIN PASSWORD (LOGIN ONLY)
  // Only checks that the password is not empty.
  // No rules message is shown in login.
  // =========================================================

  private validateLoginPassword(): boolean {

    if (!this.password) {

      this.passwordError = 'Password is required.';

      return false;

    }

    this.passwordError = '';

    return true;

  }


  // =========================================================
  // VALIDATE CONFIRM PASSWORD
  // =========================================================

  private validateConfirmPassword(): boolean {

    if (!this.confirmPassword) {

      this.confirmPasswordError = 'Please confirm your password.';

      return false;

    }

    if (this.password !== this.confirmPassword) {

      this.confirmPasswordError = 'Passwords do not match.';

      return false;

    }

    this.confirmPasswordError = '';

    return true;

  }


  // =========================================================
  // FIELD INPUT HANDLERS
  // =========================================================

  onNameInput(): void {

    this.nameError = '';

    if (this.name.trim()) {
      this.validateName();
    }

  }

  onPhoneInput(): void {

    // Only numbers
    this.phone = this.phone.replace(/\D/g, '');

    // Maximum 10 digits
    this.phone = this.phone.slice(0, 10);

    this.phoneError = '';

    if (this.phone.trim()) {
      this.validatePhone();
    }

  }

  onEmailInput(): void {

    this.emailError = '';

    // Login: a changed email makes the old
    // "Incorrect password" message outdated
    if (this.isLogin) {
      this.passwordError = '';
    }

    if (this.email.trim()) {
      this.validateEmail();
    }

  }

  onPasswordInput(): void {

    this.passwordError = '';

    // LOGIN: no validation message while typing
    if (this.isLogin) {
      return;
    }

    // REGISTER: full password rules
    if (this.password) {
      this.validatePassword();
    }

    if (this.confirmPassword) {
      this.validateConfirmPassword();
    }

  }

  onConfirmPasswordInput(): void {

    this.confirmPasswordError = '';

    if (this.confirmPassword) {
      this.validateConfirmPassword();
    }

  }


  // =========================================================
  // SUBMIT FORM
  // =========================================================

  submitForm(): void {

    this.errorMessage = '';
    this.successMessage = '';


    // =======================================================
    // LOGIN
    // =======================================================

    if (this.isLogin) {

      const emailOk = this.validateEmail();
      const passwordOk = this.validateLoginPassword();

      if (!emailOk || !passwordOk) {
        return;
      }

      this.userService
        .login(this.normalizedEmail, this.password)
        .subscribe({

          next: (users) => {

            // Wrong email or wrong password
            if (!users || users.length === 0) {

              this.showLoginFailure();

              return;

            }

            const user = users[0];

            // Save logged-in user
            this.setLoggedInUser(user);

            // Login toast
            this.toastService.success('Welcome back to ZELL.');

            // Merge guest cart
            this.mergeGuestCartAndNavigate();

          },

          error: (error) => {

            console.error('Login error:', error);

            this.errorMessage = 'Unable to login. Please try again.';

          }

        });

      return;

    }


    // =======================================================
    // REGISTER VALIDATIONS
    // =======================================================

    this.validateName();
    this.validatePhone();
    this.validateEmail();
    this.validatePassword();
    this.validateConfirmPassword();

    if (
      this.nameError ||
      this.phoneError ||
      this.emailError ||
      this.passwordError ||
      this.confirmPasswordError
    ) {
      return;
    }


    // =======================================================
    // IF OTP ALREADY VERIFIED
    // =======================================================

    if (this.otpVerified) {

      this.register();

      return;

    }


    // =======================================================
    // CHECK EMAIL ALREADY EXISTS
    // =======================================================

    this.userService
      .getUserByEmail(this.normalizedEmail)
      .subscribe({

        next: (users) => {

          if (users && users.length > 0) {

            this.emailError =
              'An account already exists with this email.';

            return;

          }

          // Create Account button sends OTP
          this.sendOtp();

        },

        error: (error) => {

          console.error('Error checking email:', error);

          this.errorMessage =
            'Unable to check email. Please try again.';

        }

      });

  }


  // =========================================================
  // LOGIN FAILURE
  // If the email exists, the password is wrong.
  // If the email does not exist, tell that instead.
  // =========================================================

  private showLoginFailure(): void {

    this.userService
      .getUserByEmail(this.normalizedEmail)
      .subscribe({

        next: (users) => {

          if (users && users.length > 0) {

            // Email is correct -> password is wrong
            this.passwordError = 'Incorrect password.';

          } else {

            // No account with this email
            this.emailError = 'No account found with this email.';

          }

        },

        error: (error) => {

          console.error('Login check error:', error);

          // Fallback: still show it near the password field
          this.passwordError = 'Incorrect password.';

        }

      });

  }


  // =========================================================
  // GENERATE OTP
  // =========================================================

  private generateOtp(): string {

    const array = new Uint32Array(1);

    crypto.getRandomValues(array);

    return (100000 + (array[0] % 900000)).toString();

  }


  // =========================================================
  // SEND OTP
  // =========================================================

  private sendOtp(): void {

    if (this.otpSending) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    if (!this.validateEmail()) {
      return;
    }

    this.otpSending = true;

    const otpValue = this.generateOtp();

    const toEmail = this.normalizedEmail;

    const templateParams = {
      name: this.name.trim(),
      to_name: this.name.trim(),
      email: toEmail,
      otp: otpValue,
      time: '1 minute'
    };

    emailjs
      .send(
        this.EMAILJS_SERVICE_ID,
        this.EMAILJS_TEMPLATE_ID,
        templateParams
      )

      .then(() => {

        // Save OTP
        this.generatedOtp = otpValue;

        this.otpAttempts = 0;

        this.otp = '';

        this.otpSent = true;

        this.otpVerified = false;

        this.otpSending = false;

        // Open OTP popup (stays open until OTP is verified)
        this.otpModalOpen = true;

        // Start 1-minute OTP timer
        this.startOtpTimer();

        // Disappears after 1 second
        this.successMessage = 'OTP sent to ' + toEmail + '.';

      })

      .catch(error => {

        console.error('EmailJS Error:', error);

        this.otpSending = false;

        this.otpSent = false;

        this.otpVerified = false;

        this.generatedOtp = '';

        // NOTE: the popup is NOT closed here.
        // If it is open, the error is shown inside it.

        const detail = error?.text ? ` (${error.text})` : '';

        this.errorMessage =
          'Unable to send OTP' + detail + '. Please try again.';

      });

  }


  // =========================================================
  // START OTP TIMER
  // =========================================================

  private startOtpTimer(): void {

    if (this.otpInterval) {

      clearInterval(this.otpInterval);

      this.otpInterval = null;

    }

    this.otpExpiryTime = Date.now() + this.OTP_VALID_MS;

    this.updateOtpTimer();

    this.otpInterval = setInterval(() => {

      this.updateOtpTimer();

    }, 1000);

  }


  // =========================================================
  // UPDATE OTP TIMER
  // =========================================================

  private updateOtpTimer(): void {

    const remainingMs = this.otpExpiryTime - Date.now();

    if (remainingMs <= 0) {

      this.otpRemainingSeconds = 0;

      // OTP is no longer valid, but the popup STAYS open
      this.generatedOtp = '';

      if (this.otpInterval) {

        clearInterval(this.otpInterval);

        this.otpInterval = null;

      }

      this.errorMessage =
        'OTP has expired. Please click Resend OTP to get a new one.';

      return;

    }

    this.otpRemainingSeconds = Math.ceil(remainingMs / 1000);

  }


  // =========================================================
  // OTP TIMER DISPLAY
  // =========================================================

  get otpTimerDisplay(): string {

    const minutes = Math.floor(this.otpRemainingSeconds / 60);

    const seconds = this.otpRemainingSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;

  }


  // =========================================================
  // CAN RESEND
  // Resend is allowed only after the timer has finished
  // =========================================================

  get canResend(): boolean {

    return this.otpRemainingSeconds <= 0 && !this.otpSending;

  }


  // =========================================================
  // VERIFY OTP
  // =========================================================

  verifyOtp(): void {

    this.errorMessage = '';
    this.successMessage = '';

    const enteredOtp = this.otp.trim();

    if (!this.generatedOtp) {

      this.errorMessage =
        'OTP has expired. Please click Resend OTP to get a new one.';

      return;

    }

    if (!enteredOtp) {

      this.errorMessage = 'Please enter the OTP.';

      return;

    }

    if (!/^\d{6}$/.test(enteredOtp)) {

      this.errorMessage = 'Please enter a valid 6-digit OTP.';

      return;

    }

    // Check expiry

    if (Date.now() >= this.otpExpiryTime) {

      this.expireOtp();

      this.errorMessage =
        'OTP has expired. Please click Resend OTP to get a new one.';

      return;

    }

    // Check wrong OTP

    if (enteredOtp !== this.generatedOtp) {

      this.otpAttempts++;

      if (this.otpAttempts >= this.MAX_OTP_ATTEMPTS) {

        this.expireOtp();

        this.errorMessage =
          'Too many wrong attempts. Please click Resend OTP to get a new one.';

        return;

      }

      this.errorMessage = 'Invalid OTP. Please check and try again.';

      return;

    }


    // =======================================================
    // OTP VERIFIED
    // =======================================================

    this.otpVerified = true;

    this.otpVerifying = true;

    // Disappears after 1 second
    this.successMessage = 'OTP verified successfully.';

    // Stop OTP timer

    if (this.otpInterval) {

      clearInterval(this.otpInterval);

      this.otpInterval = null;

    }

    // The popup closes ONLY here, after successful verification
    this.verifyTimeout = setTimeout(() => {

      this.otpVerifying = false;

      this.otpModalOpen = false;

      this.register();

    }, 400);

  }


  // =========================================================
  // EXPIRE OTP
  // Popup stays open, Resend becomes clickable
  // =========================================================

  private expireOtp(): void {

    this.generatedOtp = '';

    this.otp = '';

    this.otpVerified = false;

    this.otpRemainingSeconds = 0;

    this.otpExpiryTime = 0;

    if (this.otpInterval) {

      clearInterval(this.otpInterval);

      this.otpInterval = null;

    }

  }


  // =========================================================
  // RESEND OTP
  // Allowed only after the timer is finished
  // =========================================================

  resendOtp(): void {

    if (!this.canResend) {
      return;
    }

    this.otpVerified = false;

    this.sendOtp();

  }


  // =========================================================
  // RESET OTP
  // =========================================================

  private resetOtp(): void {

    this.clearTimers();

    this.otp = '';

    this.generatedOtp = '';

    this.otpAttempts = 0;

    this.otpSent = false;

    this.otpVerified = false;

    this.otpModalOpen = false;

    this.otpExpiryTime = 0;

    this.otpRemainingSeconds = 0;

    this.otpSending = false;

    this.otpVerifying = false;

  }


  // =========================================================
  // REGISTER
  // After success, the LOGIN form is shown directly
  // =========================================================

  private register(): void {

    const email = this.normalizedEmail;

    const newUser: User = {
      name: this.name.trim(),
      email: email,
      phone: this.phone.trim(),
      password: this.password
    };

    this.userService
      .register(newUser)
      .subscribe({

        next: () => {

          // IMPORTANT:
          // Do NOT automatically log in
          // after registration.

          this.toastService.success(
            'Account created successfully. Please login.'
          );

          // Clear registration data

          this.name = '';
          this.email = '';
          this.phone = '';
          this.password = '';
          this.confirmPassword = '';

          this.showPassword = false;
          this.showConfirmPassword = false;

          this.errorMessage = '';

          this.clearFieldErrors();

          this.resetOtp();

          // Show the LOGIN form directly.
          // Works even if the URL does not change.
          this.isLogin = true;

          // Update the URL to login mode as well
          this.router.navigate(
            ['/auth'],
            {
              queryParams: {
                mode: 'login'
              },
              replaceUrl: true
            }
          );

        },

        error: (error) => {

          console.error('Registration error:', error);

          this.errorMessage =
            'Registration failed. Please try again.';

        }

      });

  }


  // =========================================================
  // SAVE LOGIN DETAILS
  // =========================================================

  private setLoggedInUser(user: User): void {

    localStorage.setItem('user', JSON.stringify(user));

    localStorage.setItem('userId', String(user.id));

    localStorage.setItem('token', 'logged-in');

  }


  // =========================================================
  // MERGE GUEST CART
  // =========================================================

  private mergeGuestCartAndNavigate(): void {

    const userId = localStorage.getItem('userId');

    if (!userId) {

      this.router.navigate(['/home']);

      return;

    }

    this.cartService
      .mergeGuestCart(userId)
      .subscribe({

        next: () => {

          this.store.dispatch(loadCart());

          this.router.navigate(['/home']);

        },

        error: error => {

          console.error('Guest cart merge error:', error);

          this.store.dispatch(loadCart());

          this.router.navigate(['/home']);

        }

      });

  }


  // =========================================================
  // PASSWORD VISIBILITY
  // =========================================================

  togglePassword(): void {

    this.showPassword = !this.showPassword;

  }


  // =========================================================
  // CONFIRM PASSWORD VISIBILITY
  // =========================================================

  toggleConfirmPassword(): void {

    this.showConfirmPassword = !this.showConfirmPassword;

  }

}