import { describe, expect, it, vi } from 'vitest';

import { AcpBackend } from '@/agent/acp/AcpBackend';
import { writeAcpTestAgentScript } from '@/agent/acp/testkit/subprocessHarness';
import { createSessionTurnLifecycle } from '@/agent/runtime/session/turn/lifecycle';
import { createTestAcpRuntime } from '@/testkit/backends/acpRuntime';
import { createApprovedPermissionHandler } from '@/testkit/backends/permissionHandler';
import { createBasicSessionClientWithOverrides } from '@/testkit/backends/sessionFixtures';
import { withTempDir } from '@/testkit/fs/tempDir';
import { MessageBuffer } from '@/ui/ink/messageBuffer';

describe('createAcpRuntime provider activity ingress', () => {
  it('delivers unrendered native activity to the real turn lifecycle before transcript filtering', async () => {
    await withTempDir('happier-acp-provider-activity-', async (dir) => {
      const script = writeAcpTestAgentScript({ dir, fileName: 'provider.mjs', source: `
        let buffer = '';
        let promptId;
        const send = (message) => process.stdout.write(JSON.stringify(message) + '\\n');
        process.stdin.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.trim()) continue;
            const message = JSON.parse(line);
            if (message.method === 'initialize') {
              send({ jsonrpc: '2.0', id: message.id, result: { protocolVersion: 1, authMethods: [] } });
            } else if (message.method === 'session/new') {
              send({ jsonrpc: '2.0', id: message.id, result: { sessionId: 'native-session' } });
            } else if (message.method === 'session/prompt') {
              promptId = message.id;
              send({ jsonrpc: '2.0', method: 'session/update', params: {
                sessionId: 'native-session', update: { sessionUpdate: 'agent_thought_chunk', content: { type: 'text', text: '' } },
              } });
              send({ jsonrpc: '2.0', id: 'native-write', method: 'fs/write_text_file', params: {
                sessionId: 'native-session', path: 'native.txt', content: 'native content',
              } });
            } else if (message.id === 'native-write') {
              send({ jsonrpc: '2.0', id: 'native-read', method: 'fs/read_text_file', params: {
                sessionId: 'native-session', path: 'native.txt',
              } });
            } else if (message.id === 'native-read') {
              send({ jsonrpc: '2.0', id: promptId, result: { stopReason: 'end_turn' } });
            } else if (message.id !== undefined) {
              send({ jsonrpc: '2.0', id: message.id, result: {} });
            }
          }
        });
      ` });
      const backend = new AcpBackend({ agentName: 'test', cwd: dir, command: process.execPath, args: [script] });
      const lifecycle = createSessionTurnLifecycle({ sessionId: 'happier-session', enqueueSessionTurn: async () => {} });
      // Observe the real lifecycle without replacing its behavior.
      const observed = vi.spyOn(lifecycle, 'observeProviderTurnEvent');
      const runtime = createTestAcpRuntime({
        provider: 'customAcp', directory: dir, messageBuffer: new MessageBuffer(), mcpServers: {},
        permissionHandler: createApprovedPermissionHandler(), onThinkingChange: () => {},
        ensureBackend: async () => backend,
        session: createBasicSessionClientWithOverrides({ sessionTurnLifecycle: lifecycle }),
      });
      try {
        await runtime.startOrLoad({});
        expect(observed).not.toHaveBeenCalled();
        runtime.beginTurn();
        await runtime.sendPrompt('hello');
        expect(observed).toHaveBeenCalledTimes(3);
      } finally {
        await runtime.reset();
        await lifecycle.endSession();
        observed.mockRestore();
      }
    });
  });
});
