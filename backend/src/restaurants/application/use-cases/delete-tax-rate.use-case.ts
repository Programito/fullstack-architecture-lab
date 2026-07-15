import { Inject, Injectable } from '@nestjs/common';

import { taxRateInUse, type ApplicationError } from '../../../shared/errors/application-error';
import { ok, err, type Result } from '../../../shared/result/result';
import { TAX_RATE_REPOSITORY, type TaxRateRepository } from '../ports/tax-rate-repository.port';

export type DeleteTaxRateCommand = { restaurantId: string; taxRateId: string };

@Injectable()
export class DeleteTaxRateUseCase {
  constructor(
    @Inject(TAX_RATE_REPOSITORY) private readonly repo: TaxRateRepository,
  ) {}

  async execute(command: DeleteTaxRateCommand): Promise<Result<void, ApplicationError>> {
    const inUse = await this.repo.isAssignedToAnyProduct(command.taxRateId);
    if (inUse) return err(taxRateInUse(command.taxRateId));
    await this.repo.delete(command.taxRateId);
    return ok(undefined);
  }
}
