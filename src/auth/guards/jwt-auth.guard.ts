import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const disableAuth = this.configService.get('DISABLE_AUTH') || 'false';
    if (disableAuth === 'true') {
      return true;
    }
    return super.canActivate(context);
  }
}
