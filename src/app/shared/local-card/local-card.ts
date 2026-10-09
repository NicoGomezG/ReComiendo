import { Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Local } from '../../core/models/recomiendo.model';
import { StarRating } from '../star-rating/star-rating';

@Component({
  selector: 'app-local-card',
  imports: [RouterLink, DecimalPipe, StarRating],
  templateUrl: './local-card.html',
})
export class LocalCard {
  readonly local = input.required<Local>();
}
