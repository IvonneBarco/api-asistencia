import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { QrService } from './qr.service';

describe('QrService', () => {
  let service: QrService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QrService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'QR_SECRET') return 'test-secret-key-12345';
              if (key === 'QR_EXPIRATION_MINUTES') return 60;
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<QrService>(QrService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generatePayload', () => {
    it('should generate valid payload with sid, exp, and sig', () => {
      const sessionId = 'SESSION-2026-01-31-TEST123';
      const payload = service.generatePayload(sessionId);

      expect(payload).toHaveProperty('sid', sessionId);
      expect(payload).toHaveProperty('exp');
      expect(payload).toHaveProperty('sig');
      expect(typeof payload.exp).toBe('number');
      expect(typeof payload.sig).toBe('string');
      expect(payload.sig).toHaveLength(64); // SHA256 hex = 64 chars
    });

    it('should generate future expiration timestamp', () => {
      const payload = service.generatePayload('TEST-SESSION');
      const now = Math.floor(Date.now() / 1000);

      expect(payload.exp).toBeGreaterThan(now);
      expect(payload.exp).toBeLessThanOrEqual(now + 3600 + 5); // 60min + 5s tolerance
    });
  });

  describe('parseQrRaw', () => {
    it('should parse valid JSON string', () => {
      const qrJson = JSON.stringify({
        sid: 'SESSION-TEST',
        exp: 1706731200,
        sig: 'abc123',
      });

      const parsed = service.parseQrRaw(qrJson);

      expect(parsed).toEqual({
        sid: 'SESSION-TEST',
        exp: 1706731200,
        sig: 'abc123',
      });
    });

    it('should parse URL with query params', () => {
      const qrUrl =
        'https://emaus.com/scan?sid=SESSION-TEST&exp=1706731200&sig=abc123';

      const parsed = service.parseQrRaw(qrUrl);

      expect(parsed).toEqual({
        sid: 'SESSION-TEST',
        exp: 1706731200,
        sig: 'abc123',
      });
    });

    it('should return null for invalid JSON', () => {
      const parsed = service.parseQrRaw('invalid-json-{');
      expect(parsed).toBeNull();
    });

    it('should return null for incomplete payload', () => {
      const qrJson = JSON.stringify({ sid: 'TEST' }); // missing exp and sig
      const parsed = service.parseQrRaw(qrJson);
      expect(parsed).toBeNull();
    });
  });

  describe('validateQRCode', () => {
    it('should validate correct QR code', () => {
      const sessionId = 'SESSION-2026-01-31-VALID';
      const payload = service.generatePayload(sessionId);
      const qrCode = JSON.stringify(payload);

      const result = service.validateQRCode(qrCode);

      expect(result.valid).toBe(true);
      expect(result.sessionId).toBe(sessionId);
      expect(result.error).toBeUndefined();
    });

    it('should reject QR with invalid signature', () => {
      const payload = service.generatePayload('SESSION-TEST');
      payload.sig = 'invalid-signature-tampered';
      const qrCode = JSON.stringify(payload);

      const result = service.validateQRCode(qrCode);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Código QR inválido');
    });

    it('should reject expired QR code', () => {
      const expiredPayload = {
        sid: 'SESSION-EXPIRED',
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hora atrás
        sig: 'any-signature',
      };
      const qrCode = JSON.stringify(expiredPayload);

      const result = service.validateQRCode(qrCode);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Código QR vencido');
    });

    it('should reject malformed QR code', () => {
      const result = service.validateQRCode('not-a-valid-json');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Código QR mal formado');
    });

    it('should reject QR with missing fields', () => {
      const incompleteQr = JSON.stringify({ sid: 'TEST' });

      const result = service.validateQRCode(incompleteQr);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Código QR mal formado');
    });

    it('should reject QR with wrong data types', () => {
      const wrongTypeQr = JSON.stringify({
        sid: 123, // should be string
        exp: 'not-a-number', // should be number
        sig: 'valid-string',
      });

      const result = service.validateQRCode(wrongTypeQr);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Código QR inválido');
    });

    it('should reject QR with tampered sessionId', () => {
      const payload = service.generatePayload('SESSION-ORIGINAL');
      payload.sid = 'SESSION-TAMPERED'; // cambiar sid sin regenerar sig
      const qrCode = JSON.stringify(payload);

      const result = service.validateQRCode(qrCode);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Código QR inválido');
    });

    it('should reject QR with tampered expiration', () => {
      const payload = service.generatePayload('SESSION-TEST');
      payload.exp = payload.exp + 86400; // +1 día sin regenerar sig
      const qrCode = JSON.stringify(payload);

      const result = service.validateQRCode(qrCode);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Código QR inválido');
    });
  });

  describe('generateQRCode', () => {
    it('should generate base64 PNG data URL', async () => {
      const qrCode = await service.generateQRCode('SESSION-TEST');

      expect(qrCode).toMatch(/^data:image\/png;base64,/);
      expect(qrCode.length).toBeGreaterThan(100);
    });
  });
});
