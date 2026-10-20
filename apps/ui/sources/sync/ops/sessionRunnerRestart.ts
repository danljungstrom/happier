import { buildSessionRunnerRuntimeRefreshRequestV1, readSessionRunnerRestartIdentityGuardV1, RestartSessionRunnerResultV1Schema, type RestartSessionRunnerResultV1, type SessionRunnerRuntimeRefreshReasonV1 } from '@happier-dev/protocol/sessions/control/sessionRunnerRestartV1';
import { RestartSessionRunnerRequestV2Schema } from '@happier-dev/protocol/sessions/control/sessionRunnerRestartV2';
import { SessionProviderBindingSecurityChangeConfirmationV1Schema, type SessionProviderBindingMetadataV1 } from '@happier-dev/protocol/providers/sessions/bindingMetadataV1';
import { SessionRunnerRuntimeStateV1Schema, SessionRunnerStatusGetRequestV1Schema, type SessionRunnerRuntimeStateV1, type SessionRunnerStatusGetRequestV1 } from '@happier-dev/protocol/sessions/control/sessionRunnerRuntimeV1';
import { SessionRunnerRuntimeStatusV2Schema, type SessionRunnerProcessIdentityV2 } from '@happier-dev/protocol/sessions/control/sessionRunnerRuntimeV2';
import {
    isRpcMethodNotFoundResult,
    RPC_ERROR_CODES,
    RPC_METHODS,
    SOCKET_RPC_AUTHORIZATION_CONTEXT_KINDS,
} from '@happier-dev/protocol/rpc';
import { readRpcErrorCode } from '@happier-dev/protocol/rpcErrors';

import { machineRpcWithServerScope } from '@/sync/runtime/orchestration/serverScopedRpc/serverScopedMachineRpc';
import { delay } from '@/utils/timing/time';

type RestartSessionRunnerInput = Readonly<{
    runtimeState: SessionRunnerRuntimeStateV1;
    serverId?: string | null;
    signal?: AbortSignal;
}>;

export type RestartStaleSessionRunnerResult = RestartSessionRunnerResultV1;

type RestartSessionRunnerForProviderBindingChangeInput = RestartSessionRunnerInput & Readonly<{
    launchBinding?: SessionProviderBindingMetadataV1 | null;
    nextBindingSecurityFingerprint?: string | null;
    runnerProcessIdentity: SessionRunnerProcessIdentityV2 | null;
}>;

type GetSessionRunnerRuntimeStatusInput = Readonly<{
    sessionId: string;
    machineId: string;
    serverId?: string | null;
    signal?: AbortSignal;
}>;

export type FetchedSessionRunnerRuntimeStatus = Readonly<{
    state: SessionRunnerRuntimeStateV1;
    runnerProcessIdentity: SessionRunnerProcessIdentityV2 | null;
}>;

function buildResult(input: Readonly<{
    sessionId: string;
    status: RestartSessionRunnerResultV1['status'];
    reasonCode?: RestartSessionRunnerResultV1['reasonCode'];
    diagnostics?: RestartSessionRunnerResultV1['diagnostics'];
}>): RestartSessionRunnerResultV1 {
    return RestartSessionRunnerResultV1Schema.parse({
        ok: false,
        sessionId: input.sessionId,
        status: input.status,
        ...(input.reasonCode ? { reasonCode: input.reasonCode } : {}),
        ...(input.diagnostics ? { diagnostics: input.diagnostics } : {}),
    });
}

function isUnsupportedDaemonError(error: unknown): boolean {
    const rpcErrorCode = readRpcErrorCode(error);
    if (rpcErrorCode === RPC_ERROR_CODES.METHOD_NOT_FOUND || rpcErrorCode === RPC_ERROR_CODES.METHOD_NOT_AVAILABLE) {
        return true;
    }
    if (error && typeof error === 'object') {
        const code = (error as { errorCode?: unknown; code?: unknown; status?: unknown }).errorCode
            ?? (error as { code?: unknown }).code
            ?? (error as { status?: unknown }).status;
        return code === RPC_ERROR_CODES.METHOD_NOT_FOUND
            || code === RPC_ERROR_CODES.METHOD_NOT_AVAILABLE
            || code === 'METHOD_NOT_FOUND'
            || code === 'METHOD_NOT_AVAILABLE';
    }
    return false;
}

function buildUnsupportedDaemonResult(sessionId: string): RestartSessionRunnerResultV1 {
    return buildResult({
        sessionId,
        status: 'unsupported_daemon',
        reasonCode: 'unsupported_daemon_version',
    });
}

function readNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

// Preserve the source restart owner's observation policy for delayed daemon publication.
const SESSION_RUNNER_RESTART_OBSERVE_ATTEMPTS = 8;
const SESSION_RUNNER_RESTART_OBSERVE_INTERVAL_MS = 1_500;

async function sendSessionRunnerRestartRequest<Request>(input: RestartSessionRunnerInput & Readonly<{
    method:
        | typeof RPC_METHODS.DAEMON_SESSION_RUNNER_RESTART
        | typeof RPC_METHODS.DAEMON_SESSION_RUNNER_RESTART_V2;
    request: Request;
    reconcileMode?: 'if_stale' | 'force_current_cli';
}>): Promise<RestartSessionRunnerResultV1> {
    input.signal?.throwIfAborted();
    const machineId = input.runtimeState.machineId?.trim() ?? '';
    if (machineId.length === 0) return buildUnsupportedDaemonResult(input.runtimeState.sessionId);
    let result: RestartSessionRunnerResultV1;
    try {
        const raw = await machineRpcWithServerScope<unknown, Request>({
            machineId,
            serverId: input.serverId ?? undefined,
            method: input.method,
            payload: input.request,
            // Child work can defer replacement; caller cancellation owns this wait.
            operationTimeoutMs: null,
            ...(input.signal ? { signal: input.signal } : {}),
            authorization: {
                kind: SOCKET_RPC_AUTHORIZATION_CONTEXT_KINDS.SESSION_WRITE,
                sessionId: input.runtimeState.sessionId,
            },
        });
        if (isRpcMethodNotFoundResult(raw) || isUnsupportedDaemonError(raw)) {
            return buildUnsupportedDaemonResult(input.runtimeState.sessionId);
        }

        const parsed = RestartSessionRunnerResultV1Schema.safeParse(raw);
        result = parsed.success && parsed.data.sessionId === input.runtimeState.sessionId
            ? parsed.data
            : buildResult({
                sessionId: input.runtimeState.sessionId,
                status: 'partial_failure',
                diagnostics: { errorCode: 'invalid_response' },
            });
    } catch (error) {
        input.signal?.throwIfAborted();
        if (isUnsupportedDaemonError(error)) {
            return buildUnsupportedDaemonResult(input.runtimeState.sessionId);
        }
        result = buildResult({
            sessionId: input.runtimeState.sessionId,
            status: 'partial_failure',
            diagnostics: {
                errorCode: error instanceof Error ? error.message : 'request_failed',
            },
        });
    }

    // Exact-process replacement cannot prove that a requested provider binding was
    // applied: V2 runtime status carries no binding evidence. Keep that failure closed.
    if (!input.reconcileMode || result.ok || ![
        'partial_failure', 'stop_failed', 'spawn_failed', 'runner_identity_changed', 'not_found',
    ].includes(result.status)) return result;

    for (let attempt = 0; attempt < SESSION_RUNNER_RESTART_OBSERVE_ATTEMPTS; attempt += 1) {
        input.signal?.throwIfAborted();
        const state = await getSessionRunnerRuntimeStatus({
            sessionId: input.runtimeState.sessionId,
            machineId,
            serverId: input.serverId,
            signal: input.signal,
        });
        const replaced = state?.runner.pid != null && state.runner.pid !== input.runtimeState.runner.pid;
        const landed = replaced || (input.reconcileMode === 'if_stale' && state?.versionState === 'current');
        if (landed) {
            return { ok: true, status: 'restarted', sessionId: input.runtimeState.sessionId };
        }
        if (attempt < SESSION_RUNNER_RESTART_OBSERVE_ATTEMPTS - 1) {
            await delay(SESSION_RUNNER_RESTART_OBSERVE_INTERVAL_MS);
        }
    }
    return result;
}

export async function restartSessionRunnerOnCurrentRuntime(
    input: RestartSessionRunnerInput & Readonly<{ reason: SessionRunnerRuntimeRefreshReasonV1 }>,
): Promise<RestartSessionRunnerResultV1> {
    const request = buildSessionRunnerRuntimeRefreshRequestV1(input.runtimeState, input.reason);
    if ('ok' in request) return request;
    return await sendSessionRunnerRestartRequest({ ...input,
        method: RPC_METHODS.DAEMON_SESSION_RUNNER_RESTART, request, reconcileMode: 'if_stale' });
}

export async function restartSessionRunnerForProviderBindingChange(
    input: RestartSessionRunnerForProviderBindingChangeInput,
): Promise<RestartSessionRunnerResultV1> {
    if (!input.runnerProcessIdentity) {
        return buildUnsupportedDaemonResult(input.runtimeState.sessionId);
    }
    const identityGuard = readSessionRunnerRestartIdentityGuardV1(input.runtimeState);
    if ('ok' in identityGuard) return identityGuard;
    const nextFingerprint = readNonEmptyString(input.nextBindingSecurityFingerprint);
    const confirmation = input.launchBinding && nextFingerprint
        ? SessionProviderBindingSecurityChangeConfirmationV1Schema.parse({
            v: 1,
            sessionId: input.runtimeState.sessionId,
            connectionId: input.launchBinding.connectionId,
            previousBindingSecurityFingerprint: input.launchBinding.bindingSecurityFingerprint,
            nextBindingSecurityFingerprint: nextFingerprint,
        })
        : undefined;
    const request = RestartSessionRunnerRequestV2Schema.parse({
        v: 2,
        sessionId: input.runtimeState.sessionId,
        mode: 'force_current_cli',
        reason: 'provider_binding_change_recovery',
        expectedRunnerPid: identityGuard.expectedRunnerPid,
        expectedProcessCommandHash: identityGuard.expectedProcessCommandHash,
        expectedRunnerEntrypointIdentity: identityGuard.expectedRunnerEntrypointIdentity,
        expectedRunnerProcessIdentity: input.runnerProcessIdentity,
        ...(confirmation ? { providerBindingSecurityChangeConfirmationV1: confirmation } : {}),
    });
    return await sendSessionRunnerRestartRequest({
        runtimeState: input.runtimeState,
        serverId: input.serverId,
        signal: input.signal,
        method: RPC_METHODS.DAEMON_SESSION_RUNNER_RESTART_V2,
        request,
    });
}

export async function getSessionRunnerRuntimeStatus(
    input: GetSessionRunnerRuntimeStatusInput,
): Promise<SessionRunnerRuntimeStateV1 | null> {
    return (await getSessionRunnerRuntimeStatusSnapshot(input))?.state ?? null;
}

async function getSessionRunnerRuntimeStatusV1Fallback(
    input: GetSessionRunnerRuntimeStatusInput,
    payload: SessionRunnerStatusGetRequestV1,
): Promise<FetchedSessionRunnerRuntimeStatus | null> {
    try {
        const raw = await machineRpcWithServerScope<unknown, typeof payload>({
            machineId: input.machineId,
            serverId: input.serverId ?? undefined,
            method: RPC_METHODS.DAEMON_SESSION_RUNNER_STATUS_GET,
            payload,
            ...(input.signal ? { signal: input.signal } : {}),
        });
        if (isRpcMethodNotFoundResult(raw) || isUnsupportedDaemonError(raw)) return null;
        const parsed = SessionRunnerRuntimeStateV1Schema.safeParse(raw);
        if (!parsed.success || parsed.data.sessionId !== payload.sessionId) return null;
        return { state: parsed.data, runnerProcessIdentity: null };
    } catch {
        input.signal?.throwIfAborted();
        return null;
    }
}

export async function getSessionRunnerRuntimeStatusSnapshot(
    input: GetSessionRunnerRuntimeStatusInput,
): Promise<FetchedSessionRunnerRuntimeStatus | null> {
    const payload = SessionRunnerStatusGetRequestV1Schema.parse({
        sessionId: input.sessionId,
    } satisfies SessionRunnerStatusGetRequestV1);
    try {
        const raw = await machineRpcWithServerScope<unknown, typeof payload>({
            machineId: input.machineId,
            serverId: input.serverId ?? undefined,
            method: RPC_METHODS.DAEMON_SESSION_RUNNER_STATUS_V2_GET,
            payload,
            ...(input.signal ? { signal: input.signal } : {}),
        });
        if (!isRpcMethodNotFoundResult(raw) && !isUnsupportedDaemonError(raw)) {
            const parsed = SessionRunnerRuntimeStatusV2Schema.safeParse(raw);
            if (parsed.success && parsed.data.state.sessionId === payload.sessionId) {
                return {
                    state: parsed.data.state,
                    runnerProcessIdentity: parsed.data.runnerProcessIdentity,
                };
            }
        }
    } catch {
        input.signal?.throwIfAborted();
        // Additive V2 may be absent on supported older daemons; V1 remains the status fallback.
    }
    return await getSessionRunnerRuntimeStatusV1Fallback(input, payload);
}
