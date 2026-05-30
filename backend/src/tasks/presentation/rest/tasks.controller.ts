import { Body, Controller, Get, Param, Patch, Post, Version } from '@nestjs/common';
import { ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { unwrapResultOrThrow } from '../../../shared/http/application-error.mapper';
import { TaskResponseDto } from './dto/task-response.dto';
import { CompleteTaskUseCase } from '../../application/use-cases/complete-task.use-case';
import { CreateTaskUseCase } from '../../application/use-cases/create-task.use-case';
import { ListTasksUseCase } from '../../application/use-cases/list-tasks.use-case';
import { CreateTaskDto } from './dto/create-task.dto';

@ApiTags('tasks')
@Controller('tasks')
export class TasksController {
  constructor(
    private readonly createTask: CreateTaskUseCase,
    private readonly listTasks: ListTasksUseCase,
    private readonly completeTask: CompleteTaskUseCase,
  ) {}

  @Post()
  @Version('1')
  @ApiCreatedResponse({ type: TaskResponseDto })
  async create(@Body() body: CreateTaskDto): Promise<TaskResponseDto> {
    const task = unwrapResultOrThrow(await this.createTask.execute(body));

    return TaskResponseDto.fromDomain(task);
  }

  @Get()
  @Version('1')
  @ApiOkResponse({ type: TaskResponseDto, isArray: true })
  async list(): Promise<TaskResponseDto[]> {
    const tasks = unwrapResultOrThrow(await this.listTasks.execute());

    return tasks.map(TaskResponseDto.fromDomain);
  }

  @Patch(':id/complete')
  @Version('1')
  @ApiOkResponse({ type: TaskResponseDto })
  @ApiNotFoundResponse({ description: 'Task not found.' })
  async complete(@Param('id') id: string): Promise<TaskResponseDto> {
    const task = unwrapResultOrThrow(await this.completeTask.execute(id));

    return TaskResponseDto.fromDomain(task);
  }
}
