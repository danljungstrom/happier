import type { Query, SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { expect, it, vi } from 'vitest';

import { createSessionTurnLifecycle } from '@/agent/runtime/session/turn/lifecycle';
import type { TurnStallNotice } from '@/agent/runtime/session/turn/stallWatch';
import { claudeRemoteAgentSdk } from './claudeRemoteAgentSdk';
import { makeMode } from './claudeRemoteAgentSdk.testkit';

type PermissionHook = (input: unknown, toolUseId: string | undefined, options: { signal?: AbortSignal }) => Promise<unknown>;
type ObservationHook = (input: unknown) => Promise<unknown>;

it('observes a main permission request before its decision and excludes replayed or sidechain hooks', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const notices: TurnStallNotice[] = [];
    const lifecycle = createSessionTurnLifecycle({
        sessionId: 'happier-session', enqueueSessionTurn: async () => {},
        turnStallWarnMs: 100, onTurnStallNotice: notice => notices.push(notice),
    });
    let resolveDecision!: (value: { behavior: 'allow'; updatedInput: Record<string, never> }) => void;
    const decision = new Promise<{ behavior: 'allow'; updatedInput: Record<string, never> }>(resolve => { resolveDecision = resolve; });
    let sent = false;
    try {
        await lifecycle.beginTurn({ provider: 'claude' });
        await claudeRemoteAgentSdk({
            sessionId: null, transcriptPath: null, path: '/tmp', claudeExecutablePath: '/tmp/claude',
            canCallTool: () => decision, isAborted: () => false,
            nextMessage: async () => {
                if (sent) return null;
                sent = true;
                return { message: 'hello', mode: makeMode({ claudeRemoteAgentSdkEnabled: true }) };
            },
            onReady() {}, onSessionFound() {}, onMessage() {},
            onProviderEvent: () => lifecycle.observeProviderTurnEvent(),
            createQuery: ({ options }) => {
                // Only the external SDK's hook registration shape is asserted at this boundary.
                const hooks = options?.hooks as {
                    PermissionRequest: Array<{ hooks: PermissionHook[] }>;
                    PostToolUse: Array<{ hooks: ObservationHook[] }>;
                };
                const query: Pick<Query, typeof Symbol.asyncIterator | 'close' | 'setPermissionMode' | 'setModel' | 'setMaxThinkingTokens' | 'supportedCommands' | 'supportedModels'> = {
                    async *[Symbol.asyncIterator]() {
                        yield { type: 'system', subtype: 'init', session_id: 'native-main' } as SDKMessage;
                        await vi.advanceTimersByTimeAsync(75);
                        const pending = hooks.PermissionRequest[0]!.hooks[0]!({
                            hook_event_name: 'PermissionRequest', session_id: 'native-main', tool_name: 'Bash', tool_input: {},
                        }, 'permission-1', { signal: new AbortController().signal });
                        await vi.advanceTimersByTimeAsync(99);
                        expect(notices).toEqual([]);
                        await vi.advanceTimersByTimeAsync(1);
                        expect(notices).toMatchObject([{ lastEventAgeMs: 100 }]);
                        resolveDecision({ behavior: 'allow', updatedInput: {} });
                        await pending;
                        await hooks.PermissionRequest[0]!.hooks[0]!({
                            hook_event_name: 'PermissionRequest', session_id: 'native-main', tool_name: 'Bash', tool_input: {}, agent_id: 'child',
                        }, 'permission-child', { signal: new AbortController().signal });
                        await hooks.PostToolUse[0]!.hooks[0]!({ hook_event_name: 'PostToolUse', session_id: 'native-main', agent_id: 'child' });
                        await hooks.PostToolUse[0]!.hooks[0]!({ hook_event_name: 'PostToolUse', session_id: 'native-main', isReplay: true });
                        await vi.advanceTimersByTimeAsync(100);
                        expect(notices).toHaveLength(1);
                        await hooks.PostToolUse[0]!.hooks[0]!({ hook_event_name: 'PostToolUse', session_id: 'native-main' });
                        await vi.advanceTimersByTimeAsync(100);
                        expect(notices).toMatchObject([{ lastEventAgeMs: 100 }, { lastEventAgeMs: 100 }]);
                        yield { type: 'result', subtype: 'success', session_id: 'native-main' } as SDKMessage;
                    },
                    close() {}, async setPermissionMode() {}, async setModel() {}, async setMaxThinkingTokens() {},
                    supportedCommands: async () => [], supportedModels: async () => [],
                };
                return query as Query;
            },
        });
    } finally {
        resolveDecision({ behavior: 'allow', updatedInput: {} });
        await lifecycle.completeTurn({ provider: 'claude' });
        vi.useRealTimers();
    }
});

it('observes live SDK events before buffering while replay cannot postpone a stall notice', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const notices: TurnStallNotice[] = [];
    const lifecycle = createSessionTurnLifecycle({
        sessionId: 'happier-session',
        enqueueSessionTurn: async () => {},
        turnStallWarnMs: 100,
        onTurnStallNotice: (notice) => notices.push(notice),
    });
    await lifecycle.beginTurn({ provider: 'claude' });
    // The external Agent SDK query is the boundary; raw event handling and the stopwatch stay real.
    const query: Pick<Query, typeof Symbol.asyncIterator | 'close' | 'setPermissionMode' | 'setModel' | 'setMaxThinkingTokens' | 'supportedCommands' | 'supportedModels'> = {
        async *[Symbol.asyncIterator]() {
            yield { type: 'system', subtype: 'init', session_id: 'native-main' } as SDKMessage;
            await vi.advanceTimersByTimeAsync(75);
            yield {
                type: 'stream_event', session_id: 'native-main', parent_tool_use_id: null,
                event: { type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: 'tool-1', name: 'Write', input: {} } },
            } as SDKMessage;
            await vi.advanceTimersByTimeAsync(75);
            yield {
                type: 'stream_event', session_id: 'native-main', parent_tool_use_id: null,
                event: { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: '{"content":"still generating' } },
            } as SDKMessage;
            await vi.advanceTimersByTimeAsync(75);
            yield { type: 'rate_limit_event', session_id: 'native-main', rate_limit_info: { status: 'allowed', rateLimitType: 'five_hour' } } as SDKMessage;
            await vi.advanceTimersByTimeAsync(99);
            expect(notices).toEqual([]);
            yield { type: 'rate_limit_event', session_id: 'native-main', isReplay: true } as unknown as SDKMessage;
            await vi.advanceTimersByTimeAsync(1);
            expect(notices).toMatchObject([{ lastEventAgeMs: 100 }]);
            yield { type: 'result', subtype: 'success', session_id: 'native-main' } as SDKMessage;
        },
        close() {}, async setPermissionMode() {}, async setModel() {}, async setMaxThinkingTokens() {},
        supportedCommands: async () => [], supportedModels: async () => [],
    };
    let sent = false;
    try {
        await claudeRemoteAgentSdk({
            sessionId: null, transcriptPath: null, path: '/tmp', claudeExecutablePath: '/tmp/claude',
            canCallTool: async () => ({ behavior: 'allow', updatedInput: {} }), isAborted: () => false,
            nextMessage: async () => {
                if (sent) return null;
                sent = true;
                return { message: 'hello', mode: makeMode({ claudeRemoteAgentSdkEnabled: true }) };
            },
            onReady() {}, onSessionFound() {}, onMessage() {},
            onProviderEvent: () => lifecycle.observeProviderTurnEvent(),
            createQuery: () => query as Query,
        });
    } finally {
        await lifecycle.completeTurn({ provider: 'claude' });
        vi.useRealTimers();
    }
});
