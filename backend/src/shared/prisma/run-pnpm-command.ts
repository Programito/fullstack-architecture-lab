import { execFileSync } from 'node:child_process';

type PnpmCommand = 'prisma';

export function runPnpmCommand(args: [PnpmCommand, ...string[]], cwd: string): void {
  const command = process.platform === 'win32' ? 'cmd.exe' : 'pnpm';
  const commandArgs = process.platform === 'win32' ? ['/d', '/s', '/c', 'pnpm', ...args] : args;

  execFileSync(command, commandArgs, {
    cwd,
    env: process.env,
    stdio: 'pipe',
  });
}
