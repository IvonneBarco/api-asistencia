import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';

export interface QRPayload {
  sid: string; // sessionId
  exp: number; // timestamp expiration
  sig: string; // HMAC signature
}

@Injectable()
export class QrService {
  private readonly secret: string;
  private readonly expirationMinutes: number;

  constructor(private configService: ConfigService) {
    this.secret = this.configService.get<string>('QR_SECRET');
    this.expirationMinutes =
      this.configService.get<number>('QR_EXPIRATION_MINUTES') || 60;
  }

  /**
   * Genera firma HMAC SHA256
   * sig = HMAC(secret, sid + "." + exp)
   */
  private generateSignature(sid: string, exp: number): string {
    const message = `${sid}.${exp}`;
    return crypto.createHmac('sha256', this.secret).update(message).digest('hex');
  }

  /**
   * Verifica firma HMAC
   */
  private verifySignature(sid: string, exp: number, sig: string): boolean {
    const expected = this.generateSignature(sid, exp);
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  }

  /**
   * Genera payload de QR
   */
  generatePayload(sessionId: string): QRPayload {
    const exp = Math.floor(Date.now() / 1000) + this.expirationMinutes * 60;
    const sig = this.generateSignature(sessionId, exp);

    return {
      sid: sessionId,
      exp,
      sig,
    };
  }

  /**
   * Genera QR code como base64 PNG
   */
  async generateQRCode(sessionId: string): Promise<string> {
    const payload = this.generatePayload(sessionId);
    const data = JSON.stringify(payload);

    try {
      const qrCode = await QRCode.toDataURL(data, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 400,
        margin: 2,
      });
      return qrCode;
    } catch (error) {
      throw new Error('Error generando código QR');
    }
  }

  /**
   * Parsea QR raw (soporta JSON string o URL con query params)
   */
  parseQrRaw(rawQr: string): QRPayload | null {
    try {
      // Intenta parsear como JSON directo
      const payload = JSON.parse(rawQr);
      if (payload.sid && payload.exp && payload.sig) {
        return payload;
      }
    } catch {
      // Si no es JSON, intenta extraer de URL
      try {
        const url = new URL(rawQr);
        const sid = url.searchParams.get('sid');
        const exp = url.searchParams.get('exp');
        const sig = url.searchParams.get('sig');

        if (sid && exp && sig) {
          return {
            sid,
            exp: parseInt(exp, 10),
            sig,
          };
        }
      } catch {
        // No es URL válida tampoco
      }
    }
    return null;
  }

  /**
   * Valida payload de QR
   * Retorna sessionId si es válido, lanza excepción si no
   */
  validateQRCode(rawQr: string): {
    valid: boolean;
    sessionId?: string;
    error?: string;
  } {
    const payload = this.parseQrRaw(rawQr);

    if (!payload) {
      return { valid: false, error: 'Código QR mal formado' };
    }

    // Validar estructura
    if (!payload.sid || !payload.exp || !payload.sig) {
      return { valid: false, error: 'Código QR inválido' };
    }

    // Validar tipo de datos
    if (typeof payload.sid !== 'string' || typeof payload.exp !== 'number' || typeof payload.sig !== 'string') {
      return { valid: false, error: 'Código QR inválido' };
    }

    // Validar expiración
    const now = Math.floor(Date.now() / 1000);
    if (now > payload.exp) {
      return { valid: false, error: 'Código QR vencido' };
    }

    // Validar firma
    try {
      const signatureValid = this.verifySignature(
        payload.sid,
        payload.exp,
        payload.sig,
      );

      if (!signatureValid) {
        return { valid: false, error: 'Código QR inválido' };
      }
    } catch (error) {
      return { valid: false, error: 'Código QR inválido' };
    }

    return { valid: true, sessionId: payload.sid };
  }
}
