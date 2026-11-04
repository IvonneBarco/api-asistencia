import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateOwnProfileDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @MaxLength(150)
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'La identificación es requerida' })
  @MaxLength(50)
  identification: string;

  @IsDateString({}, { message: 'Fecha de nacimiento inválida' })
  @IsOptional()
  birthDate?: string;

  @IsDateString({}, { message: 'Fecha del primer retiro inválida' })
  @IsOptional()
  firstEmausRetreatDate?: string;

  @IsString()
  @MaxLength(30)
  @IsOptional()
  phoneNumber?: string;
}
