import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, LoginIdentificationDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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
        role: user.role,
      },
    };
  }
}
