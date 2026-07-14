import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewTimeEntryChangeRequestDto {
  @ApiProperty({ enum: ['approved', 'rejected'], example: 'approved' })
  @IsIn(['approved', 'rejected'])
  status!: 'approved' | 'rejected';

  @ApiPropertyOptional({ example: 'Cambio validado.', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reviewNote?: string | null;
}
