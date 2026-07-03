import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SetUserScopeDto {
  @ApiProperty({ example: 'org-demo' })
  @IsString()
  organizationId!: string;

  @ApiPropertyOptional({ example: 'restaurant-mesaflow-centro' })
  @IsOptional()
  @IsString()
  restaurantId?: string;
}
