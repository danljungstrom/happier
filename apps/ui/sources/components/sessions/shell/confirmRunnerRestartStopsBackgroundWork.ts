import { hasSessionProviderRuntimeActivityV1 } from '@happier-dev/protocol/sessions/awareness/runtime';

import { Modal } from '@/modal';
import { createUiSessionAwarenessInput } from '@/sync/domains/session/awareness/sessionAwareness';
import { storage } from '@/sync/domains/state/storage';
import { t } from '@/text';

// Repeated presses while the dialog is open must not stack dialogs (and restart requests).
let confirmationOpen = false;

/**
 * Restarting a session runner ends its provider process, which also stops every background agent,
 * shell or run it hosts. The user decides here before the restart request is sent; the daemon trusts
 * this confirmation and does not re-check background activity for app-confirmed restart reasons.
 * Reads the session at press time because SessionView does not subscribe to runtime activity.
 * Resolves `true` when the restart may proceed.
 */
export async function confirmRunnerRestartStopsBackgroundWork(sessionId: string): Promise<boolean> {
    const session = storage.getState().sessions[sessionId];
    // SessionView renders only stored sessions, so a missing record has no runtime to protect.
    if (!session) return true;
    // Background presentation excludes foreground work; interruption protection must not.
    if (!hasSessionProviderRuntimeActivityV1(createUiSessionAwarenessInput(session, Date.now()))) return true;
    if (confirmationOpen) return false;
    confirmationOpen = true;
    try {
        return await Modal.confirm(
            t('session.runnerRestartBackgroundWork.title'),
            t('session.runnerRestartBackgroundWork.body', { count: session.runtimeActivityActiveCount ?? 0 }),
            {
                cancelText: t('common.cancel'),
                confirmText: t('session.runnerRestartBackgroundWork.confirmAction'),
                destructive: true,
            },
        );
    } finally {
        confirmationOpen = false;
    }
}
