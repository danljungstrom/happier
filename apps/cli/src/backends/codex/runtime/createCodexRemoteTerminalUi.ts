import type { render } from 'ink';

import { cleanupStdinAfterInk } from '@/ui/ink/cleanupStdinAfterInk';
import type { MessageBuffer } from '@/ui/ink/messageBuffer';
import { createNonBlockingStdout } from '@/ui/ink/nonBlockingStdout';
import {
    startRemoteModeStaticControl,
    type RemoteModeControlSurface,
    type RemoteModeStaticControl,
} from '@/ui/remoteControl/remoteModeControl';

async function loadCodexInkUi() {
    const [{ render }, { default: React }, { CodexTerminalDisplay }] = await Promise.all([
        import('ink'),
        import('react'),
        import('@/backends/codex/ui/CodexTerminalDisplay'),
    ]);
    return { render, React, CodexTerminalDisplay };
}

export async function createCodexRemoteTerminalUi(params: {
    messageBuffer: MessageBuffer;
    logPath?: string;
    hasTTY: boolean;
    surface?: RemoteModeControlSurface;
    stdin: NodeJS.ReadStream;
    stdout?: NodeJS.WriteStream;
    onExit: () => Promise<void>;
    onSwitchToLocal: () => Promise<void>;
}) {
    let inkInstance: ReturnType<typeof render> | null = null;
    let staticControl: RemoteModeStaticControl | null = null;
    let allowSwitchToLocal = false;
    const surface: RemoteModeControlSurface = params.surface ?? (params.hasTTY ? 'ink' : 'none');
    // Ink and React load only for an attached ink surface, keeping them out of daemon-started runners.
    const inkUi = surface === 'ink' && params.hasTTY ? await loadCodexInkUi() : null;

    const renderRemoteUi = (ui: NonNullable<typeof inkUi>) => ui.React.createElement(ui.CodexTerminalDisplay, {
        messageBuffer: params.messageBuffer,
        logPath: params.logPath,
        allowSwitchToLocal,
        onExit: params.onExit,
        onSwitchToLocal: params.onSwitchToLocal,
    });

    const mount = () => {
        if (surface === 'static') {
            if (!staticControl) {
                staticControl = startRemoteModeStaticControl({
                    providerName: 'Codex',
                    stdin: params.stdin,
                    stdout: params.stdout ?? process.stdout,
                    allowSwitchToLocal,
                    onExit: params.onExit,
                    onSwitchToLocal: params.onSwitchToLocal,
                });
            }
            return;
        }
        if (!inkUi) return;
        if (!inkInstance) {
            console.clear();
            inkInstance = inkUi.render(renderRemoteUi(inkUi), {
                exitOnCtrlC: false,
                patchConsole: false,
                stdout: createNonBlockingStdout(process.stdout as any),
            });

            params.stdin.resume();
            if (params.stdin.isTTY) {
                params.stdin.setRawMode(true);
            }
            params.stdin.setEncoding('utf8');
            return;
        }
        inkInstance.rerender(renderRemoteUi(inkUi));
    };

    const unmount = async () => {
        if (staticControl) {
            await staticControl.stop();
            staticControl = null;
        }
        if (surface !== 'ink' || !params.hasTTY) return;
        if (params.stdin.isTTY) {
            try {
                params.stdin.setRawMode(false);
            } catch {
                // ignore
            }
        }
        if (inkInstance) {
            try {
                inkInstance.unmount();
            } catch {
                // ignore
            }
            inkInstance = null;
        }
        await cleanupStdinAfterInk({ stdin: params.stdin as any, drainMs: 75 });
        try {
            params.stdin.pause();
        } catch {
            // ignore
        }
    };

    const setAllowSwitchToLocal = (allowed: boolean) => {
        allowSwitchToLocal = allowed;
        if (staticControl) {
            void staticControl.stop();
            staticControl = startRemoteModeStaticControl({
                providerName: 'Codex',
                stdin: params.stdin,
                stdout: params.stdout ?? process.stdout,
                allowSwitchToLocal,
                onExit: params.onExit,
                onSwitchToLocal: params.onSwitchToLocal,
            });
        }
        if (inkUi && inkInstance) {
            inkInstance.rerender(renderRemoteUi(inkUi));
        }
    };

    return {
        mount,
        unmount,
        setAllowSwitchToLocal,
    };
}
