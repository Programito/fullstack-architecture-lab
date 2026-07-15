import { Inject, Injectable } from '@nestjs/common';

import { ApplicationErrorException } from '../../../shared/errors/application-error-exception';
import { invalidTaxRate, taxRateNotFound, type ApplicationError } from '../../../shared/errors/application-error';
import { ok, err, type Result } from '../../../shared/result/result';
import { TAX_RATE_REPOSITORY, type TaxRateEntity, type TaxRateRepository } from '../ports/tax-rate-repository.port';

export type UpdateTaxRateCommand = {
  restaurantId: string;
  taxRateId: string;
  name?: string;
  ratePercent?: number;
  isActive?: boolean;
};

@Injectable()
export class UpdateTaxRateUseCase {
  constructor(
    @Inject(TAX_RATE_REPOSITORY) private readonly repo: TaxRateRepository,
  ) {}

  async execute(command: UpdateTaxRateCommand): Promise<Result<TaxRateEntity, ApplicationError>> {
    try {
      const existing = await this.repo.findById(command.taxRateId);
      if (!existing) return err(taxRateNotFound(command.taxRateId));

      if (command.ratePercent !== undefined && (command.ratePercent < 0 || command.ratePercent > 100)) {
        return err(invalidTaxRate('ratePercent must be between 0 and 100', { ratePercent: command.ratePercent }));
      }

      const taxRate = await this.repo.update({
        taxRateId: command.taxRateId,
        name: command.name,
        ratePercent: command.ratePercent,
        isActive: command.isActive,
      });
      return ok(taxRate);
    } catch (error) {
      if (error instanceof ApplicationErrorException) return err(error.applicationError);
      throw error;
    }
  }
}
