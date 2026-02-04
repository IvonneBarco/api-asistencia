import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

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
