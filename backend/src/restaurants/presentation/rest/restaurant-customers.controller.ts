import { Body, Controller, Get, Param, Post, Query, UseGuards, Version } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { unwrapResultOrThrow } from '../../../shared/http/application-error.mapper';
import { AuthGuard } from '../../../identity/presentation/rest/auth.guard';
import { SearchCustomersUseCase } from '../../application/use-cases/search-customers.use-case';
import { CreateCustomerUseCase } from '../../application/use-cases/create-customer.use-case';
import { CustomerSummaryResponseDto } from './dto/customer-summary-response.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';

@ApiTags('restaurants')
@Controller('restaurants')
export class RestaurantCustomersController {
  constructor(
    private readonly searchCustomersUC: SearchCustomersUseCase,
    private readonly createCustomerUC: CreateCustomerUseCase,
  ) {}

  @Get(':id/customers')
  @Version('1')
  @ApiOkResponse({ type: CustomerSummaryResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Restaurant not found.' })
  async searchCustomers(
    @Param('id') id: string,
    @Query('q') q: string = '',
  ): Promise<CustomerSummaryResponseDto[]> {
    const customers = unwrapResultOrThrow(await this.searchCustomersUC.execute({ restaurantId: id, q }));
    return customers.map(CustomerSummaryResponseDto.fromDomain);
  }

  @Post(':id/customers')
  @Version('1')
  @UseGuards(AuthGuard)
  @ApiCreatedResponse({ type: CustomerSummaryResponseDto })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse({ description: 'Restaurant not found.' })
  @ApiUnauthorizedResponse()
  async createCustomer(
    @Param('id') id: string,
    @Body() body: CreateCustomerDto,
  ): Promise<CustomerSummaryResponseDto> {
    const customer = unwrapResultOrThrow(
      await this.createCustomerUC.execute({
        restaurantId: id,
        name: body.name,
        phone: body.phone ?? null,
        email: body.email ?? null,
        notes: body.notes ?? null,
      }),
    );
    return CustomerSummaryResponseDto.fromDomain(customer);
  }
}
