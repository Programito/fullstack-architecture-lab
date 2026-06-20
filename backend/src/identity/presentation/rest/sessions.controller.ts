import { Body, Controller, Get, Inject, NotFoundException, Param, Patch, Req, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { AUTH_SESSION_REPOSITORY, type AuthSessionRepository } from '../../application/ports/auth-session-repository.port';
import { AuthGuard, type AuthenticatedRequest } from './auth.guard';
import { SessionResponseDto } from './dto/session-response.dto';
import { SetEnabledDto } from './dto/set-enabled.dto';

@ApiTags('sessions')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(@Inject(AUTH_SESSION_REPOSITORY) private readonly sessions: AuthSessionRepository) {}

  @Get()
  @Version('1')
  @ApiOkResponse({ type: SessionResponseDto, isArray: true })
  async list(@Req() request: AuthenticatedRequest): Promise<SessionResponseDto[]> {
    return (await this.sessions.findByUserId(request.auth.userId)).map(SessionResponseDto.fromDomain);
  }

  @Patch(':id/enabled')
  @Version('1')
  @ApiOkResponse({ type: SessionResponseDto })
  async setEnabled(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: SetEnabledDto,
  ): Promise<SessionResponseDto> {
    const session = await this.sessions.findById(id);
    if (!session || session.userId !== request.auth.userId) throw new NotFoundException('Session was not found.');
    session.setEnabled(body.enabled);
    await this.sessions.save(session);
    return SessionResponseDto.fromDomain(session);
  }
}
