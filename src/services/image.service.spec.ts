import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
const sharp = require('sharp') as any;
import { ImageService } from './image.service';

describe('ImageService', () => {
  let service: ImageService;

  beforeEach(() => {
    service = new ImageService();
  });

  it('optimizes profile photos as JPEGs capped at 800 pixels', async () => {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), 'emaus-image-'));
    const inputPath = join(temporaryDirectory, 'original.png');

    try {
      await sharp({
        create: {
          width: 1600,
          height: 1200,
          channels: 3,
          background: { r: 120, g: 180, b: 220 },
        },
      }).png().toFile(inputPath);

      const avatarPath = await service.optimizeProfilePhoto(inputPath);
      const outputPath = join(process.cwd(), avatarPath.slice(1));
      const metadata = await sharp(outputPath).metadata();

      expect(avatarPath).toMatch(/^\/uploads\/profile-photos\/profile-.*\.jpg$/);
      expect(metadata.format).toBe('jpeg');
      expect(metadata.width).toBe(800);
      expect(metadata.height).toBe(600);

      await rm(outputPath, { force: true });
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });
});
