import type { render } from 'ink';

import type { MessageBuffer } from '@/ui/ink/messageBuffer';
import { createNonBlockingStdout } from '@/ui/ink/nonBlockingStdout';
import { DEFAULT_GEMINI_MODEL } from '@/backends/gemini/constants';

async function loadGeminiInkUi() {
  const [{ render }, { default: React }, { GeminiTerminalDisplay }] = await Promise.all([
    import('ink'),
    import('react'),
    import('@/backends/gemini/ui/GeminiTerminalDisplay'),
  ]);
  return { render, React, GeminiTerminalDisplay };
}

export async function createGeminiTerminalUi(params: {
  messageBuffer: MessageBuffer;
  hasTTY: boolean;
  stdin: NodeJS.ReadStream;
  logPath?: string;
  initialModel?: string;
  onExit: () => Promise<void>;
  onDebug: (message: string) => void;
  saveModelToConfig: (model: string) => void;
}) {
  // Ink and React load only with a TTY, keeping them out of daemon-started runners.
  const inkUi = params.hasTTY ? await loadGeminiInkUi() : null;
  let inkInstance: ReturnType<typeof render> | null = null;
  let displayedModel: string | undefined = params.initialModel;

  const updateDisplayedModel = (model: string | undefined, saveToConfig: boolean = false) => {
    if (model === undefined) {
      params.onDebug('[gemini] updateDisplayedModel called with undefined, skipping update');
      return;
    }

    const oldModel = displayedModel;
    displayedModel = model;
    params.onDebug(`[gemini] updateDisplayedModel called: oldModel=${oldModel}, newModel=${model}, saveToConfig=${saveToConfig}`);

    if (saveToConfig) {
      params.saveModelToConfig(model);
    }

    if (params.hasTTY && oldModel !== model) {
      params.onDebug(`[gemini] Adding model update message to buffer: [MODEL:${model}]`);
      params.messageBuffer.addMessage(`[MODEL:${model}]`, 'system');
    } else if (params.hasTTY) {
      params.onDebug('[gemini] Model unchanged, skipping update message');
    }
  };

  const mount = () => {
    if (!inkUi) return;
    const { render, React, GeminiTerminalDisplay } = inkUi;

    console.clear();

    const DisplayComponent = () => {
      const currentModelValue = displayedModel || DEFAULT_GEMINI_MODEL;
      return React.createElement(GeminiTerminalDisplay, {
        messageBuffer: params.messageBuffer,
        logPath: params.logPath,
        currentModel: currentModelValue,
        onExit: params.onExit,
      });
    };

    inkInstance = render(React.createElement(DisplayComponent), {
      exitOnCtrlC: false,
      patchConsole: false,
      stdout: createNonBlockingStdout(process.stdout as any),
    });

    const initialModelName = displayedModel || DEFAULT_GEMINI_MODEL;
    params.onDebug(`[gemini] Sending initial model to UI: ${initialModelName}`);
    params.messageBuffer.addMessage(`[MODEL:${initialModelName}]`, 'system');

    params.stdin.resume();
    if (params.stdin.isTTY) {
      params.stdin.setRawMode(true);
    }
    params.stdin.setEncoding('utf8');
  };

  const unmount = async () => {
    if (params.stdin.isTTY) {
      try {
        params.stdin.setRawMode(false);
      } catch {
        // ignore
      }
    }
    if (params.hasTTY) {
      try {
        params.stdin.pause();
      } catch {
        // ignore
      }
    }
    if (inkInstance) {
      inkInstance.unmount();
      inkInstance = null;
    }
  };

  return {
    mount,
    unmount,
    updateDisplayedModel,
    getDisplayedModel: () => displayedModel,
  };
}
