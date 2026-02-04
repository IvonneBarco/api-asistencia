import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class JoinGroupDto {
  @IsString()
  @IsNotEmpty({ message: 'El ID del grupo es requerido' })
  groupId: string;
}

export class AssignGroupDto {
  @IsString()
  @IsNotEmpty({ message: 'El ID del grupo es requerido' })
  groupId: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del grupo es requerido' })
  name: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateGroupDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
