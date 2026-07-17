import { NgClass } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button } from '../../../../shared/ui/button/button';
import { Dialog } from '../../../../shared/ui/dialog/dialog';

@Component({
  selector: 'app-payment-gateway-dialog',
  imports: [Button, Dialog, NgClass, TranslocoPipe],
  templateUrl: './payment-gateway-dialog.html',
})
export class PaymentGatewayDialog {
  readonly open = input(false);
  readonly total = input.required<string>();
  readonly tableTitle = input.required<string>();
  readonly statusLabel = input.required<string>();
  readonly rejected = input(false);
  readonly loading = input(false);

  readonly closed = output<void>();
  readonly accepted = output<void>();
  readonly rejectedPayment = output<void>();
}
