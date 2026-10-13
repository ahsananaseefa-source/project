import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  message: string;
  type: ToastType;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {

  private toastSubject = new BehaviorSubject<Toast | null>(null);

  toast$ = this.toastSubject.asObservable();

  private timer: ReturnType<typeof setTimeout> | null = null;

  show(
    message: string,
    type: ToastType = 'success',
    duration: number = 2500
  ): void {

    // Stop the old timer so it cannot hide the new toast early
    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.toastSubject.next({
      message,
      type
    });

    this.timer = setTimeout(() => {
      this.toastSubject.next(null);
      this.timer = null;
    }, duration);
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error');
  }

  info(message: string): void {
    this.show(message, 'info');
  }
}