import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { extname, join } from 'path';
const sharp = require('sharp') as any;

@Injectable()
export class ImageService {
  private readonly uploadDirectory = join(process.cwd(), 'uploads', 'profile-photos');

  async optimizeProfilePhoto(filePath: string): Promise<string> {
    mkdirSync(this.uploadDirectory, { recursive: true });

    const fileName = `profile-${Date.now()}-${randomBytes(6).toString('hex')}.jpg`;
    const outputPath = join(this.uploadDirectory, fileName);

    try {
      await sharp(filePath)
        .rotate()
        .resize(800, 800, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({
          quality: 80,
          progressive: true,
          mozjpeg: true,
        })
        .toFile(outputPath);

      this.removeFile(filePath);
      return `/uploads/profile-photos/${fileName}`;
    } catch {
      this.removeFile(filePath);
      this.removeFile(outputPath);
      throw new BadRequestException('La fotografía no es válida o no se pudo procesar');
    }
  }

  removeStoredPhoto(avatarPath?: string | null): void {
    if (!avatarPath || !avatarPath.startsWith('/uploads/profile-photos/')) {
      return;
    }

    const fileName = avatarPath.slice('/uploads/profile-photos/'.length);
    if (!fileName || fileName !== `${fileName.split('/').pop()}` || extname(fileName) === '') {
      return;
    }

    this.removeFile(join(this.uploadDirectory, fileName));
  }

  private removeFile(filePath: string): void {
    if (!existsSync(filePath)) {
      return;
    }

    try {
      unlinkSync(filePath);
    } catch {
      // La limpieza no debe ocultar el resultado de la operación principal.
    }
  }
}
