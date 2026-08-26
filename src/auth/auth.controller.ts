import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { unlinkSync } from 'fs';
import { AuthService } from './auth.service';
import { LoginDto, LoginIdentificationDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ImageService } from '../services/image.service';
import { ensureProfilePhotosDirectory } from '../config/uploads';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private imageService: ImageService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    const response = await this.authService.login(loginDto);
    return {
      data: response,
    };
  }

  @Post('login-identification')
  @HttpCode(HttpStatus.OK)
  async loginWithIdentification(@Body() loginDto: LoginIdentificationDto) {
    const response = await this.authService.loginWithIdentification(loginDto.identification);
    return {
      data: response,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    const user = await this.authService.getUserById(req.user.userId);

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    return {
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        flowers: user.flowers,
        flores: user.flowers,
        role: user.role,
        avatar: user.avatar,
      },
    };
  }

  @Post('me/photo')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (_req, _file, callback) => {
            callback(null, ensureProfilePhotosDirectory());
      },
      filename: (_req, file, callback) => {
        const fileExtension = extname(file.originalname).toLowerCase() || '.jpg';
        callback(null, `user-${Date.now()}${fileExtension}`);
      },
    }),
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
  }))
  async uploadOwnPhoto(@Request() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ninguna fotografía');
    }

    if (!file.mimetype.startsWith('image/')) {
      try {
        unlinkSync(file.path);
      } catch {
        // Ignorar errores al limpiar un archivo inválido
      }
      throw new BadRequestException('La fotografía debe ser una imagen');
    }

    const avatarPath = await this.imageService.optimizeProfilePhoto(file.path);
    const user = await this.authService.updateUserPhoto(req.user.userId, avatarPath);

    return {
      data: {
        id: user.id,
        email: user.email,
        identification: user.identification,
        name: user.name,
        flowers: user.flowers,
        flores: user.flowers,
        role: user.role,
        avatar: user.avatar,
      },
      message: 'Fotografía actualizada correctamente',
    };
  }
}
