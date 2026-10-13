import { Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { RouterLink } from '@angular/router';

import { HeaderComponent } from '../../shared/components/header/header/header.component';


@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, HeaderComponent],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.css'
})
export class NotFoundComponent {

  private location = inject(Location);


  // =====================================================
  // GO BACK
  // =====================================================

  goBack(): void {
    this.location.back();
  }

}