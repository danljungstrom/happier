import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { killProcessTree } from '@/agent/runtime/process/killProcessTree';
import { AcpBackend } from '../AcpBackend';

describe('AcpBackend dispose during startup', () => {
  it('does not spawn the agent when disposed before the launch is ready', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'acp-dispose-startup-'));
    const marker = join(dir, 'spawned');
    let releaseLaunch!: () => void;
    const launchReady = new Promise<void>((resolve) => { releaseLaunch = resolve; });
    let launchCleanups = 0;

    const backend = new AcpBackend({
      agentName: 'test',
      cwd: dir,
      command: 'unused',
      prepareProcessLaunch: async () => {
        await launchReady;
        return {
          command: process.execPath,
          args: ['-e', `require('fs').writeFileSync(${JSON.stringify(marker)}, '1'); setInterval(() => {}, 1000)`],
          cleanup: () => { launchCleanups += 1; },
        };
      },
    });

    try {
      const started = backend.startSession();
      started.catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 50));

      await backend.dispose();
      releaseLaunch();

      await new Promise((resolve) => setTimeout(resolve, 500));
      expect(existsSync(marker)).toBe(false);
      await expect(started).rejects.toThrow(/disposed/);
      expect(launchCleanups).toBe(1);
    } finally {
      const leaked = (backend as unknown as { process: Parameters<typeof killProcessTree>[0] | null }).process;
      if (leaked) await killProcessTree(leaked, { graceMs: 250 });
      rmSync(dir, { recursive: true, force: true });
    }
  }, 15_000);
});
