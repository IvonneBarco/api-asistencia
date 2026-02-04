import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
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
