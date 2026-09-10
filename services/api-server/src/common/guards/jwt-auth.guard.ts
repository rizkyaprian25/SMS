import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers?.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Token tidak ada');
    const token = header.slice('Bearer '.length);
    try {
      req.user = await this.jwt.verifyAsync(token, {
        secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-min-32-karakter-xxxx',
      });
      return true;
    } catch {
      throw new UnauthorizedException('Token tidak valid / kedaluwarsa');
    }
  }
}
