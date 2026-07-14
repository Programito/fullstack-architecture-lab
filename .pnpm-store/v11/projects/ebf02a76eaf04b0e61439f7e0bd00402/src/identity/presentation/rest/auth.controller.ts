import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res, UnauthorizedException, UseGuards, Version } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AuditService } from '../../../observability/application/audit.service';
import { auditContext } from '../../../observability/application/audit-context';
import { resolveClientOrigin } from '../../../observability/application/client-origin';
import { AuthService } from '../../application/use-cases/auth.service';
import { AuthTokenService } from '../../infrastructure/security/auth-token.service';
import { USER_REPOSITORY, type UserRepository } from '../../application/ports/user-repository.port';
import { UserResponseDto } from './dto/user-response.dto';
import { AuthGuard, type AuthenticatedRequest } from './auth.guard';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { DemoLoginDto } from './dto/demo-login.dto';
import { DEMO_ACCOUNT_CATALOG } from '../../domain/demo-account-catalog';
import { RolesGuard, RequireRoles } from './roles.guard';

const REFRESH_COOKIE = 'refresh_token';
const DEVELOPER_COOKIE = 'developer_access_token';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: AuthTokenService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  @Post('login')
  @Version('1')
  @HttpCode(200)
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse()
  async login(
    @Body() body: LoginDto,
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ): Promise<AuthResponseDto> {
    let result: Awaited<ReturnType<AuthService['login']>>;
    try {
      result = await this.auth.login(body.email, body.password);
    } catch (error) {
      await this.audit.record({
        ...auditContext(request),
        event: 'auth.login.failed',
        message: `Login attempt for ${body.email} failed.`,
        result: 'failed',
        entityType: 'auth',
        entityLabel: body.email,
        metadata: { clientOrigin: resolveClientOrigin(request, 'web-admin') },
      });
      throw error;
    }
    this.setAuthCookies(response, result);
    await this.audit.record({
      ...auditContext(request, result.scopes.restaurants[0] ?? null),
      userId: result.user.id,
      event: 'auth.login.succeeded',
      message: `User ${result.user.email} signed in.`,
      result: 'succeeded',
      entityType: 'auth',
      entityId: result.user.id,
      entityLabel: result.user.email,
      changedFields: ['session'],
      metadata: { roles: result.roles, clientOrigin: resolveClientOrigin(request, 'web-admin') },
    });
    return AuthResponseDto.fromResult(result);
  }

  @Post('demo-login')
  @Version('1')
  @HttpCode(200)
  @ApiOkResponse({ type: AuthResponseDto })
  async demoLogin(
    @Body() body: DemoLoginDto,
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ): Promise<AuthResponseDto> {
    const result = await this.auth.demoLogin(body.role);
    this.setAuthCookies(response, result);
    await this.audit.record({
      ...auditContext(request, result.scopes.restaurants[0] ?? null),
      userId: result.user.id,
      event: 'auth.demo-login.succeeded',
      message: `Demo role ${body.role} signed in.`,
      result: 'succeeded',
      entityType: 'auth',
      entityId: result.user.id,
      entityLabel: result.user.email,
      changedFields: ['session'],
      metadata: { role: body.role, email: result.user.email, clientOrigin: resolveClientOrigin(request, 'web-demo') },
    });
    return AuthResponseDto.fromResult(result);
  }

  @Get('public-config')
  @Version('1')
  publicConfig() {
    const demoLoginEnabled = this.config.get<string>('DEMO_LOGIN_ENABLED') === 'true';
    return {
      demoLoginEnabled,
      demoRoles: demoLoginEnabled
        ? DEMO_ACCOUNT_CATALOG.filter((account) => account.channel === 'staff').map(
            ({ role, label, description, icon }) => ({ role, label, description, icon }),
          )
        : [],
    };
  }

  @Get('developer-resources')
  @Version('1')
  @UseGuards(AuthGuard, RolesGuard)
  @RequireRoles('developer')
  developerResources() {
    return {
      storybookUrl: this.config.get<string>('DEVELOPER_STORYBOOK_URL') ?? '/developer/storybook/',
      apiDocsUrl: this.config.get<string>('DEVELOPER_API_DOCS_URL') ?? '/developer/api-docs/',
      architectureUrl: this.config.get<string>('DEVELOPER_ARCHITECTURE_URL') ?? '/developer/architecture/',
    };
  }

  @Post('refresh')
  @Version('1')
  @HttpCode(200)
  @ApiOkResponse({ type: AuthResponseDto })
  async refresh(@Req() request: CookieRequest, @Res({ passthrough: true }) response: CookieResponse): Promise<AuthResponseDto> {
    const token = readCookie(request, REFRESH_COOKIE);
    if (!token) throw new UnauthorizedException('Refresh token cookie is required.');
    let result: Awaited<ReturnType<AuthService['refresh']>>;
    try {
      result = await this.auth.refresh(token);
    } catch (error) {
      if (error instanceof Error && error.message.includes('reuse detected')) {
        await this.audit.record({
          ...auditContext(request),
          event: 'auth.refresh.reuse-detected',
          message: 'Refresh token reuse detected; session revoked.',
          result: 'failed',
          entityType: 'auth',
          metadata: { clientOrigin: resolveClientOrigin(request, 'web-admin') },
        });
      }
      throw error;
    }
    this.setAuthCookies(response, result);
    return AuthResponseDto.fromResult(result);
  }

  @Post('logout')
  @Version('1')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async logout(@Req() request: AuthenticatedRequest, @Res({ passthrough: true }) response: CookieResponse): Promise<void> {
    await this.auth.logout(request.auth.sessionId);
    const user = await this.users.findById(request.auth.userId);
    const label = user?.email ?? request.auth.userId;
    await this.audit.record({
      ...auditContext(request),
      event: 'auth.logout.succeeded',
      message: `User ${label} signed out.`,
      result: 'succeeded',
      entityType: 'auth',
      entityId: request.auth.userId,
      entityLabel: label,
      changedFields: ['session'],
      metadata: { sessionId: request.auth.sessionId, clientOrigin: resolveClientOrigin(request, 'backend') },
    });
    response.clearCookie(REFRESH_COOKIE, this.cookieOptions());
    response.clearCookie(DEVELOPER_COOKIE, this.developerCookieOptions());
  }

  @Get('me')
  @Version('1')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: UserResponseDto })
  async me(
    @Req() request: AuthenticatedRequest,
  ): Promise<{
    userId: string;
    roles: string[];
    permissions: string[];
    scopes: { organizations: string[]; restaurants: string[] };
  }> {
    return {
      userId: request.auth.userId,
      roles: request.auth.roles,
      permissions: request.auth.permissions,
      scopes: request.auth.scopes,
    };
  }

  private setRefreshCookie(response: CookieResponse, token: string): void {
    response.cookie(REFRESH_COOKIE, token, {
      ...this.cookieOptions(),
      maxAge: this.tokens.refreshTtlSeconds * 1000,
    });
  }

  private setAuthCookies(response: CookieResponse, result: Awaited<ReturnType<AuthService['login']>>): void {
    this.setRefreshCookie(response, result.refreshToken);
    if (result.roles.includes('developer')) {
      response.cookie(DEVELOPER_COOKIE, result.accessToken, {
        ...this.developerCookieOptions(),
        maxAge: this.tokens.accessTtlSeconds * 1000,
      });
    } else {
      response.clearCookie(DEVELOPER_COOKIE, this.developerCookieOptions());
    }
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      secure: this.config.get<string>('AUTH_COOKIE_SECURE') === 'true',
      sameSite: 'strict' as const,
      path: '/api/v1/auth',
    };
  }

  private developerCookieOptions() {
    return {
      httpOnly: true,
      secure: this.config.get<string>('AUTH_COOKIE_SECURE') === 'true',
      sameSite: 'strict' as const,
      path: '/developer',
    };
  }
}

type CookieRequest = { headers: { cookie?: string }; requestId?: string; method?: string; originalUrl?: string; url?: string };
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
