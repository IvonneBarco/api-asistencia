import { IsString, IsNotEmpty, MaxLength, IsOptional, Length } from 'class-validator';

export class ScanAttendanceDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'El código QR es demasiado largo' })
  qrCode?: string;

  @IsOptional()
  @IsString()
  @Length(4, 4, { message: 'El PIN debe tener 4 dígitos' })
  sessionPin?: string;
}

export class ScanAttendanceResponse {
  added: boolean;
  flowers: number;
  message: string;
  session?: {
    id: string;
    name: string;
    date: Date;
  };
}
