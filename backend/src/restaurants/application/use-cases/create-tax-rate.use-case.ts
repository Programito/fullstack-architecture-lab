import { Inject, Injectable } from '@nestjs/common';

import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { invalidTaxRate, restaurantNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { ok, err, type Result } from '../../../shared/result/result';
import { TAX_RATE_REPOSITORY, type TaxRateEntity, type TaxRateRepository } from '../ports/tax-rate-repository.port';

export type CreateTaxRateCommand = {
  restaurantId: string;
  name: string;
  ratePercent: number;
};

@Injectable()
export class CreateTaxRateUseCase {
  constructor(
    @Inject(TAX_RATE_REPOSITORY) private readonly repo: TaxRateRepository,
  ) {}

  async execute(command: CreateTaxRateCommand): Promise<Result<TaxRateEntity, ApplicationError>> {
    try {
      const organizationId = await this.repo.findOrganizationIdByRestaurantId(command.restaurantId);
      if (!organizationId) return err(restaurantNotFound(command.restaurantId));

      if (command.ratePercent < 0 || command.ratePercent > 100) {
        return err(invalidTaxRate('ratePercent must be between 0 and 100', { ratePercent: command.ratePercent }));
      }

      const taxRate = await this.repo.create({
        organizationId,
        name: command.name,
        ratePercent: command.ratePercent,
      });
      return ok(taxRate);
    } catch (error) {
      if (error instanceof ApplicationErrorException) return err(error.applicationError);
      throw error;
    }
  }
}
