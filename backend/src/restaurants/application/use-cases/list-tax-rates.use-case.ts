import { Inject, Injectable } from '@nestjs/common';

import { restaurantNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { ok, err, type Result } from '../../../shared/result/result';
import { TAX_RATE_REPOSITORY, type TaxRateEntity, type TaxRateRepository } from '../ports/tax-rate-repository.port';

export type ListTaxRatesCommand = { restaurantId: string };

@Injectable()
export class ListTaxRatesUseCase {
  constructor(
    @Inject(TAX_RATE_REPOSITORY) private readonly repo: TaxRateRepository,
  ) {}

  async execute(command: ListTaxRatesCommand): Promise<Result<TaxRateEntity[], ApplicationError>> {
    const organizationId = await this.repo.findOrganizationIdByRestaurantId(command.restaurantId);
    if (!organizationId) return err(restaurantNotFound(command.restaurantId));
    return ok(await this.repo.findByOrganizationId(organizationId));
  }
}
