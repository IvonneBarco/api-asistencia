import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsUUID,
  IsArray,
  ArrayNotEmpty,
} from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la sesión es requerido' })
  name: string;

  @IsDateString({}, { message: 'Fecha de inicio inválida' })
  startsAt: string;

  @IsDateString({}, { message: 'Fecha de fin inválida' })
  endsAt: string;
}

export class SyncUsersDto {
  @IsString()
  @IsOptional()
  spreadsheetId?: string;
}

export class UserDataDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  identification: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  pin?: string;

  @IsString()
  @IsOptional()
  role?: string;
}

export class BulkSyncUsersDto {
  @IsNotEmpty({ message: 'La lista de usuarios es requerida' })
  users: UserDataDto[];
}

export class AssignGroupDto {
  @IsString()
  @IsNotEmpty({ message: 'El ID del grupo es requerido' })
  groupId: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class RemoveFromGroupDto {
  @IsString()
  @IsOptional()
  reason?: string;
}

export class RegisterAttendanceDto {
  @IsUUID('4', { message: 'El ID del usuario debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID del usuario es requerido' })
  userId: string;

  @IsArray({ message: 'sessionIds debe ser un array' })
  @ArrayNotEmpty({ message: 'Debe proporcionar al menos una sesión' })
  @IsUUID('4', { each: true, message: 'Cada ID de sesión debe ser un UUID válido' })
  sessionIds: string[];
}
