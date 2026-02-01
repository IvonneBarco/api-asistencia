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
