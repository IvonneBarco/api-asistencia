import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class ScanAttendanceDto {
  @IsString()
  @IsNotEmpty({ message: 'El código QR es requerido' })
  @MaxLength(2000, { message: 'El código QR es demasiado largo' })
  qrCode: string;
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
