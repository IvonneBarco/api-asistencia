import { IsEmail, IsString, Length, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Correo electrónico inválido' })
  email: string;

  @IsString()
  @Length(4, 4, { message: 'El PIN debe tener 4 dígitos' })
  pin: string;
}

export class LoginIdentificationDto {
  @IsString()
  @IsNotEmpty({ message: 'El número de identificación es requerido' })
  identification: string;
}
