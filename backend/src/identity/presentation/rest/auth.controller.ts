import { Body, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException, UseGuards, Version } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AuthService } from '../../application/use-cases/auth.service';
import { AuthTokenService } from '../../infrastructure/security/auth-token.service';
import { UserResponseDto } from './dto/user-response.dto';
import { AuthGuard, type AuthenticatedRequest } from './auth.guard';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';

const REFRESH_COOKIE = 'refresh_token';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: AuthTokenService,
    private readonly config: ConfigService,
  ) {}

  @Post('login')
  @Version('1')
  @HttpCode(200)
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse()
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) response: CookieResponse): Promise<AuthResponseDto> {
    const result = await this.auth.login(body.email, body.password);
    this.setRefreshCookie(response, result.refreshToken);
    return AuthResponseDto.fromResult(result);
  }

  @Post('refresh')
  @Version('1')
  @HttpCode(200)
  @ApiOkResponse({ type: AuthResponseDto })
  async refresh(@Req() request: CookieRequest, @Res({ passthrough: true }) response: CookieResponse): Promise<AuthResponseDto> {
    const token = readCookie(request, REFRESH_COOKIE);
    if (!token) throw new UnauthorizedException('Refresh token cookie is required.');
    const result = await this.auth.refresh(token);
    this.setRefreshCookie(response, result.refreshToken);
    return AuthResponseDto.fromResult(result);
  }

  @Post('logout')
  @Version('1')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async logout(@Req() request: AuthenticatedRequest, @Res({ passthrough: true }) response: CookieResponse): Promise<void> {
    await this.auth.logout(request.auth.sessionId);
    response.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }

  @Get('me')
  @Version('1')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: UserResponseDto })
  async me(@Req() request: AuthenticatedRequest): Promise<{ userId: string; roles: string[]; permissions: string[] }> {
    return {
      userId: request.auth.userId,
      roles: request.auth.roles,
      permissions: request.auth.permissions,
    };
  }

  private setRefreshCookie(response: CookieResponse, token: string): void {
    response.cookie(REFRESH_COOKIE, token, {
      ...this.cookieOptions(),
      maxAge: this.tokens.refreshTtlSeconds * 1000,
    });
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      secure: this.config.get<string>('AUTH_COOKIE_SECURE') === 'true',
      sameSite: 'strict' as const,
      path: '/api/v1/auth',
    };
  }
}

type CookieRequest = { headers: { cookie?: string } };
type CookieResponse = {
  cookie(name: string, value: string, options: Record<string, unknown>): void;
  clearCookie(name: string, options: Record<string, unknown>): void;
};

function readCookie(request: CookieRequest, name: string): string | null {
  const cookie = request.headers.cookie;
  if (!cookie) return null;
  for (const pair of cookie.split(';')) {
    const [key, ...value] = pair.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return null;
}
