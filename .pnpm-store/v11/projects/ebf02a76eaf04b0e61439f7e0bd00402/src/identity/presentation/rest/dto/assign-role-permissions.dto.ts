import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsString } from 'class-validator';

export class AssignRolePermissionsDto {
  @ApiProperty({
    example: ['3a1f93a3-e312-4f89-8658-602516d28e2f'],
    type: [String],
  })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissionIds!: string[];
}
