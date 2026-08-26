import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { existsSync, unlinkSync } from 'fs';
import { basename, extname, join } from 'path';
const sharp = require('sharp') as any;
import { ensureProfilePhotosDirectory, getProfilePhotosDirectory } from '../config/uploads';

@Injectable()
export class ImageService {
  async optimizeProfilePhoto(filePath: string): Promise<string> {
    const uploadDirectory = ensureProfilePhotosDirectory();

    const fileName = `profile-${Date.now()}-${randomBytes(6).toString('hex')}.jpg`;
    const outputPath = join(uploadDirectory, fileName);

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
    if (!fileName || basename(fileName) !== fileName || extname(fileName) === '') {
      return;
    }

    this.removeFile(join(getProfilePhotosDirectory(), fileName));
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
