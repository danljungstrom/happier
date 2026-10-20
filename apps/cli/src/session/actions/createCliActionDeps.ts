import { actionStartTargetUnavailableV1, measureActionStartPhaseV1, admitActionAgentStartV1 } from '@happier-dev/protocol/actions/executor/agentStartAdmission';
import { SessionSpawnNewIncompatibleTargetV1Schema, type SessionSpawnNewIncompatibleTargetV1 } from '@happier-dev/protocol/sessions/creation/sessionSpawnNewResultV1';
import { homedir } from 'node:os';
import { logger } from '@/ui/logger';
import { executeCapturedMachineAction } from '@/api/machine/capturedMachineAction';
import { isOriginalSessionInputAccountActionCustody } from "@/daemon/sessionEncryption/requesterAccountActionProjection";
import { readRequesterAccountActionContext } from "@/daemon/sessionEncryption/requesterAccountActionContext";
import { createReviewedSecondOpinionSessionCreationAuthorization } from '@/api/externalActionExecutionAuthorization';
import { setModelFavoriteV1 } from '@happier-dev/protocol/providers/modelFavoritesV1';
import { updateAccountSettingsV2OnceAgainstLatest } from '@/settings/accountSettings/updateAccountSettingsV2WithRetry';
import { inspectSessionContinuation } from '@/session/agentTransition/sessionContinuationInspection';
import { runSessionAgentTransition } from '@/session/agentTransition/sessionAgentTransitionCoordinator';
import { rejectUndispatchedSessionAgentTransition } from '@happier-dev/protocol/sessions/agentTransitionEffectStage';
import { projectAutomationEligibleEventsCatalogV1 } from '@happier-dev/protocol/daemon/contributionRegistryProjection';
import { projectCurrentSessionPresentationActionResult } from '@/session/presentation/currentSessionPresentationService';
import { flattenWidgetLayoutWidgetsV1 } from '@happier-dev/protocol/widgets/widgetLayoutItemV1';
import axios from 'axios';
import { autonomousExchangePath, readAutonomousExchangeStatus,
  mutateAutonomousExchangeControl } from '@/api/sessionAutonomousExchangeTransport';
import { MachineCapabilityInstallInputSchema, MachineCapabilityInstallOutputSchema, MachineReplacementSetInputSchema } from '@happier-dev/protocol/actions/specs/machineConnection';
import { buildCurrentAccountStoredContentCompatibilityHttpHeaders } from '@/api/clientCompatibility/cliClientCompatibility';
import { readManagedMachine } from '@/machines/managed/readManagedMachine';
import { readMachineReferenceCensusV1, type MachineReferenceCensusV1 } from '@happier-dev/protocol/machines/machineReferenceCensusV1';
import { MACHINE_VITALS_ACTION_INPUT_SCHEMAS } from '@happier-dev/protocol/actions/specs/machineVitals';
import { MACHINE_RESOURCES_ACTION_INPUT_SCHEMAS } from '@happier-dev/protocol/actions/specs/machineResources';
import { MACHINE_STORAGE_ACTION_INPUT_SCHEMAS, MACHINE_STORAGE_ACTION_OUTPUT_SCHEMAS } from '@happier-dev/protocol/actions/specs/storage';
import { MACHINE_PROCESSES_ACTION_INPUT_SCHEMAS, MACHINE_PROCESSES_ACTION_OUTPUT_SCHEMAS } from '@happier-dev/protocol/actions/specs/machineProcesses';
import { ACTION_ID_FAMILIES_V1 } from '@happier-dev/protocol/actions/actionIds';
import type { ActionId } from '@happier-dev/protocol/actions/actionIds';
import { listMachineVitalsSummariesV1, readMachineVitalsResourcesProjectionV1 } from '@happier-dev/protocol/machines/vitals/listMachineVitalsSummariesV1';
import { ManagedGetInputV1Schema, ManagedGetOutputV1Schema, ManagedDeleteInputV1Schema,
  managedMachineActionEndpointPathV1 } from '@happier-dev/protocol/machines/managed/actionsV1';
import { MachinePoolListOutputV1Schema } from '@happier-dev/protocol/machines/pools/v1';
import { machinePoolActionEndpointPathV1 } from '@happier-dev/protocol/machines/pools/actionsV1';
import { listAutomationDefinitions } from '@/api/automations';
import { createCliProfileStore, createCliProfileStoreForOperation } from '@/settings/profiles/profileStore';
import type { SavedSecretOperationContextV1 } from '@/settings/secrets/hydrateSavedSecretCatalog';
import { AcpCatalogUnavailableError } from '@/agent/acp/catalog/configured/resolveBackend';
import { refreshActiveProfileCatalog } from '@/settings/profiles/hydrateProfileCatalog';
import type { ProfileRecordV1 } from '@happier-dev/protocol/profiles/profileRecordV1';
import { withdrawPendingQueueV2Message, updatePendingQueueV2RequestedAction, markPendingQueueV2DeliveryHandled, dismissPendingQueueV2Delivery, sendPendingQueueV2DeliveryAsNew } from '@/api/session/pendingQueueV2Transport';
import { readProviderAccountUsageHistoryWitnessV4, readProviderAccountUsageQuotaV4 } from '@/daemon/connectedServices/accountUsage/readQuota';
import { evaluatePendingResetStartAdmissionV1, PendingResetStartWaitingReasonV1Schema } from '@happier-dev/protocol/sessions/pending/pendingResetStartReadinessV1';
import { PENDING_INPUT_PROTOCOL_VERSION_V4 } from '@happier-dev/protocol/clientCompatibility/primitives';
import { createServerUrlComparableKey } from '@happier-dev/protocol/server/urls/serverUrlComparableKey';
import { readRpcRequestDisposition } from '@happier-dev/sync-client';
import { ArtifactAccessGrantsListResponseV1Schema } from '@happier-dev/protocol/artifacts/artifactAccessV1';
import { StoredContentPublicSharesListResponseV1Schema } from '@happier-dev/protocol/sharing/storedContentPublicShareV1';
import { PROJECT_DEFINITION_ACTION_INPUT_SCHEMAS, PROJECT_DEFINITION_ACTION_OUTPUT_SCHEMAS } from '@happier-dev/protocol/actions/projectDefinitionActionFamily';
import { ProjectWorkerActionInputSchemasV1, ProjectWorkerActionOutputSchemasV1 } from '@happier-dev/protocol/actions/specs/projectWorkers';
import { ActionApprovalRequestCreatedResultSchema, ActionExecuteFailureSchema } from '@happier-dev/protocol/actions/actionExecutionResult';
import { executeActionOperationActionV1 } from '@happier-dev/protocol/actions/executor/actionOperationActions';
import { ACTION_OPERATION_RPC_METHODS_V2 } from '@happier-dev/protocol/actions/operations/v1';
import { updatePersonalProjectContextV1 } from '@happier-dev/protocol/projects/projectContextV1';
import type { ExternalActionExecutionAuthorizationV1 } from '@happier-dev/protocol/actions/externalActionApi';
import { readProjectAccountRows, createProjectAccountSnapshotMutation, mutateProjectAccountOrganization, mutateProjectAccountRows,
  type OpenedProjectAccountRowMutationRequest, type ProjectAccountRowsInput } from '@/workspaces/projectAccountRows';
import { readProjectLastOpenedMemoryMap } from '@/workspaces/projectLastOpenedMemory';
import { buildProjectLastOpenedMemoryKeyV1 } from '@happier-dev/protocol/account/authoringMemory';
import { projectProjectListV1 } from '@happier-dev/protocol/workspaces';
import { setProjectVisibilityV1 } from '@happier-dev/protocol/projects/projectVisibilityV1';
import { postWebhookJsonAsync, WebhookDestinationAdmissionError } from '@/notifications/activity/sendWebhookActivityNotification';
import { createCliSettingsDeclarationAction } from './settingsDeclarationAction';
import { createCliPromptLibraryStore } from '@/settings/prompts/promptLibraryStore';
import { getServerProfile, isServerProfileHomeIdentity, resolveServerProfileHomeIdentityId } from '@/server/serverProfiles';
import { createCurrentMachineExecutionOriginContextResolver } from '@/api/machine/resolveCurrentMachineExecutionOriginContext';
import { areServerProfileIdentifiersEquivalent } from '@happier-dev/protocol/features/payload/capabilities/serverIdentityCapabilities';
import { readCliMemoryInheritedContext, readCliMemoryScopeContext } from './readCliMemoryInheritedContext';
import { createCliProjectTrustAction } from './projectTrustAction';
import { PROJECT_ACTION_INPUT_SCHEMAS_V1, PROJECT_ACTION_OUTPUT_SCHEMAS_V1, PROJECT_FINITE_ACTION_RPC_METHODS_V1 } from '@happier-dev/protocol/actions/projectActionFamily';
import { resolveProjectActionMachineV1 } from '@happier-dev/protocol/actions/executor/projectActionPlacement';
import { createCliProjectSourceActionDeps } from './projectSourceActionDeps';
import { admitSessionContextIntentV1 } from '@happier-dev/protocol/sessions/context/sessionContextV1';
import { admitDeclaredSessionVoicePreferenceV1, readBuiltInSessionVoiceDeclarationV1 } from '@happier-dev/protocol/sessions/instructions/sessionVoicePreferenceV1';
import { VoiceProviderContributionSchema } from '@happier-dev/protocol/plugins/contributions/voice';
import { buildQualifiedPluginContributionKey } from '@happier-dev/protocol/plugins/contribution-identity';
import { withCliPromptLibraryArtifactReader, resolveCliPromptStackSystemAppendBlocks } from '@/agent/prompts/library/resolveCliPromptStackSystemAppendBlocks';
import { PromptStackPreparationError } from '@happier-dev/protocol/prompts/library/resolvePromptStackSystemAppendBlocksV1';
import { applyTodoSessionLinkV1, TodoSessionLinkErrorV1, TodoSessionLinkInputV1Schema, projectTodoSessionLinkFailureV1 } from '@happier-dev/protocol/todos/todoSessionLinkV1';
import { createCliAccountKvJsonTransport, createCliAccountKvJsonCollectionTransport } from '@/api/client/accountKvJsonTransport';
import { executeInternalTaskAction, executeInternalTaskReorder } from '@happier-dev/protocol/todos/todoActionOperationsV1';
import { readCliWidgetCatalogProjectionV1, cliWidgetCatalogEntryV1 } from './widgetCatalogProjection';
import { describeWidgetAreaApprovalSurfaceV1 } from '@happier-dev/protocol/widgets';
import { createCliWidgetInputActionDepsV1 } from './widgetInputActionDeps';
import { createCliWidgetAreaActionDepsV1 } from './widgetAreaActionDeps';
import { createCliWidgetDefinitionActionDepsV1 } from './widgetDefinitionActionDeps';
import { BUILTIN_WIDGET_DESCRIPTORS_V1, countWidgetInstancesV1, isSameWidgetDefinitionV1, widgetCandidateDefinitionV1 } from '@happier-dev/protocol/widgets/builtinWidgetDescriptorV1';
import { readWidgetActionSurfacePortV1 } from '@happier-dev/protocol/widgets/executeWidgetInstanceActionV1';
import { readWidgetActionSessionTargetV1 } from '@happier-dev/protocol/widgets/actionsV1';
import { createHomeHubArtifactPortV1 } from '@happier-dev/protocol/home/homeHubArtifactV1';
import type { HomeHubLayoutValue } from '@happier-dev/protocol/home';
import { SessionUpdatePostInputV1Schema, workerDeliverablesBelongToSessionV1 } from '@happier-dev/protocol/sessions/relations/workerUpdateV1';
import type { SessionUpdatePostInputV1 } from '@happier-dev/protocol';
import { SessionAwarenessProjectionV1Schema } from '@happier-dev/protocol/sessions/awareness/projectionV1';
import { projectSessionAwarenessV1 } from '@happier-dev/protocol/sessions/awareness/projectV1';
import { waitForSessionAwarenessV1 } from '@happier-dev/protocol/sessions/awareness/waitV1';
import { openSessionEventSource } from '@/session/transport/socket/sessionSocketAgentState';
import { createCliConnectedServiceAction } from './connectedServiceActionDeps';
import { createCliProfileActionExecuteV1 } from './cliActionDeps/createCliProfileActionDeps';
import { createCliMcpServerActionExecuteV1 } from './cliActionDeps/createCliMcpServerActionDeps';
import { createCliSessionCapabilitiesActionDeps } from './cliActionDeps/createCliSessionCapabilitiesActionDeps';
import { setSessionCapabilityV1 } from '@happier-dev/protocol/actions/executor/sessionCapabilities';
import { createCliProviderActionExecuteV1 } from './cliActionDeps/createCliProviderActionDeps';
import { createUsageSourceActionPort } from '@happier-dev/protocol/actions/executor/usageSourceActions';
import { createCliRemoteHostActionExecuteV1 } from './cliActionDeps/createCliRemoteHostActionDeps';
import { randomUUID } from 'node:crypto';
import { createFoundSkillBundleReader } from '@/cli/actions/foundSkillBundleReader';
import { admitScmRemotePolicy } from '@happier-dev/protocol/scm/remotePolicy';
import { admitScmCommitPolicy, admitScmCommitUndoLast } from '@happier-dev/protocol/scm/capabilities';
import { ScmBackendDescribeResponseSchema, ScmRemoteRequestSchema, ScmCommitCreateRequestSchema } from '@happier-dev/protocol/scm';
import type { ScmCapabilities } from '@happier-dev/protocol/scm';
import { ScmPullRequestOpenOrReuseResponseSchema } from '@happier-dev/protocol/scm/pullRequests';
import { SESSION_PULL_REQUEST_BINDING_ACTION_ID_V1, SessionPullRequestBindingResultV1Schema,
  type SessionPullRequestBindingInputV1 } from '@happier-dev/channels-protocol/v1';
import { createTargetedActionRpcRequestV1 } from '@happier-dev/protocol/actions/actionRpcTransport';
import { createUnavailableRuntimeActionExecutor } from '@happier-dev/protocol/actions/executor/dispatch';
import { DaemonLocalServiceLauncherStartRequestV1Schema } from '@happier-dev/protocol/local/services/launcher/v1';
import { LocalServiceActionRequestV1Schema } from '@happier-dev/protocol/local/services/actions/v1';
import { parseLocalServiceDomainActionRpcRequest, resolveLocalServiceDomainActionRpcBinding,
  resolveLocalServiceActionKindForRuntimeActionId } from '@happier-dev/protocol/actions/specs/localServices';
import { requiresAgentEgressRedaction } from '@happier-dev/protocol/actions/actionApprovalPolicy';
import { DaemonLocalServicePublicPreviewCreateResponseV1Schema, DaemonLocalServicePublicPreviewRevokeResponseV1Schema,
  LocalServicePublicPreviewSnapshotV1Schema, redactLocalServicePublicPreviewCreateResponseForAgentEgress,
  redactLocalServicePublicPreviewRevokeResponseForAgentEgress, redactLocalServicePublicPreviewSnapshotForAgentEgress } from '@happier-dev/protocol/local/services/public/v1';
import type { RpcHandlerContext, RpcLocalActionContext } from '@/api/rpc/types';
import { resolveFilesystemAccessPolicy, type FilesystemAccessPolicy } from '@/rpc/handlers/fileSystem/accessPolicy/filesystemAccessPolicy';
import { resolveCwd } from '@/scm/runtime';
import type { SessionActionRpcOriginV1 } from '@happier-dev/protocol/socketRpc';
import { hasReceivedWorkflowSessionRoleAuthority, resolveSessionRoleRpcOrigin } from './sessionRoleRpcOrigin';
import { isWorkflowRunExecutorStorageOperationV1 } from '@happier-dev/protocol/workflows/workflowRunStorageV1';

import { AGENT_SIGN_IN_PREPARE_RPC_METHOD, AGENT_SIGN_IN_STATUS_RPC_METHOD, AgentSignInStatusResponseSchema } from '@happier-dev/protocol/daemon/agentSignIn';
import { readAgentStartCallerWorkDepthV1, AgentStartSessionCallerV1Schema, AgentStartRefusalV1Schema } from '@happier-dev/protocol/account/settings/admitAgentStartV1';
import { isTerminalAutomationRunStateV3 } from '@happier-dev/protocol/automations/automationRunStateV3';
import { isExecutionRunTerminalStatus } from '@happier-dev/protocol/execution/runs/waitForTerminal';
import { createArtifactAccessActionsV1 } from '@happier-dev/protocol/actions/executor/artifactAccessActions';
import type { ArtifactRequestAuthorizationHeaders } from '@/api/artifacts/accountArtifactStore';
import { createLaunchProfilePublisherV1 } from '@happier-dev/protocol/launchProfiles/publishLaunchProfile';
import { createWorkBoardArtifactPortV1 } from '@happier-dev/protocol/boards/workBoardArtifactV1';
import { WorkflowRunRecipientCensusResponseV1Schema } from '@happier-dev/protocol/workflows/workflowRunKeyV1';
import { resolveWorkflowRunDataKeyV1 } from '@happier-dev/protocol/workflows/workflowRunDataKeyV1';
import { resolveWorkflowDefinitionRefV1 } from '@happier-dev/protocol/workflows/workflowDefinitionResolverV1';
import { formatWorkflowDefinitionRefV1 } from '@happier-dev/protocol/workflows/workflowDefinitionRefV1';
import { buildSessionPermissionRespondRpcParamsV1, SessionUserActionPassUpRpcParamsV1Schema } from '@happier-dev/protocol/sessions/permissions/respondRpcParamsV1';
import { isPermissionModeGrantedV1, resolveEffectiveApiTokenPermissionModeV1 } from '@happier-dev/protocol/auth/apiTokenGrant';
import { resolveEffectivePermissionMode } from '@happier-dev/protocol/actions/permissionPrivilege';
import { ConnectedAccountAttemptResponseSchema, CONNECTED_ACCOUNT_AUTHENTICATION_COMMAND_RPC_METHOD } from '@happier-dev/protocol/connect/connectedAccountDaemonRpcV1';
import { startMachineAgentSignIn, cancelMachineAgentSignIn, restartMachineAgentSignIn } from '@happier-dev/protocol/daemon/startAgentSignIn';
import { buildMachineAgentsDetectRequest, buildMachineAgentInventoryDescriptors, projectMachineAgentsDetectResponse, projectAcpCatalogForMachineInventory, MachineAgentInventoryUnavailableError } from '@happier-dev/protocol/capabilities/machineAgentInventory';
import { DaemonContributionRegistryProjectionDescribeResponseSchema } from '@happier-dev/protocol/daemon/contributionRegistryProjection';
import { DaemonAgentInstallStartResponseSchema, DaemonAgentInstallReadResponseSchema, DaemonAgentInstallCancelResponseSchema } from '@happier-dev/protocol/daemon/agent-install-jobs';
import { DaemonTerminalEnsureResponseSchema, DaemonTerminalListResponseV1Schema, DaemonTerminalCloseResponseSchema } from '@happier-dev/protocol/daemon/terminal';
import { DaemonWorkspaceFileSearchResponseSchema } from '@happier-dev/protocol/machines/workspaceFiles';
import { projectSessionActivityCompatibilityV1, SESSION_LIST_AWARENESS_VIEW_V1 } from '@happier-dev/protocol/sessions/awareness/action';
import { projectSessionManagerSourceKeyPreparationV1, readSessionManagerSessionIdV1 } from '@happier-dev/protocol/sessions/follow/sessionManagerV1';
import { resolveSessionAutoResumeAdmissionV1 } from '@happier-dev/protocol/sessions/metadata/sessionExplicitStopV1';
import type { SessionFollowSourceKeyPreparationResultV1, ResolvedRolesSnapshotV1, PluginRoleContributionV1, SpawnConfigOptionValue, SessionBridgeLifecycleHookEventIdV1, SessionModelSelectionV1, SessionUsageLimitRecoveryResumePromptModeV1, SessionUsageLimitRecoveryV1, ActionExecutorDeps, ActionExecutorContext, BackendTargetRefV2, ScmDiffSummaryGenerateInput, SessionSpawnNewInputV2, SessionSpawnNewResultV1, SessionCreationDirectoryApprovalV1, SessionCreationTargetPreparationRequestV1, SessionCreationTargetPreparationResultV1, AgentExecutionTargetV1, ActionCaller, ComposerAttachmentInputV1, SessionInputAdmissionResultV1, SessionMessageSendResultV1 } from '@happier-dev/protocol';
import { AcpConfigOptionOverridesV1Schema, buildAcpConfigOptionOverridesV1 } from '@happier-dev/protocol/sessions/metadata/overrides';
import { AccountSettingMutationV1Schema } from '@happier-dev/protocol/account/settings/accountSettingMutationV1';
import { BackendTargetRefV2Schema, readBackendTargetRefV2 } from '@happier-dev/protocol/backends/targets/backendTargetRefV2';
import { derivePluginSessionInputLocalIdV1, buildTrustedHostSessionInputAdmissionV1, SessionInputSourceSessionV1Schema } from '@happier-dev/protocol/sessions/messages/sessionInputAdmission';
import { isMemorySessionSearchHitV1, negotiateMemorySearchV1 } from '@happier-dev/protocol/memory/memorySearch';
import { MACHINE_TERMINAL_ACTION_OUTPUT_SCHEMAS } from '@happier-dev/protocol/actions/specs/machineTerminal';
import { MemoryStatusV1Schema, type MemoryStatusV1 } from '@happier-dev/protocol/memory/memoryStatus';
import { MemorySettingsV1Schema } from '@happier-dev/protocol/memory/memorySettings';
import { MemoryWindowV1Schema } from '@happier-dev/protocol/memory/memoryWindow';
import { buildBackendTargetKeyV2 } from '@happier-dev/protocol/backends/targets/backendTargetRefV2';
import { WorkflowStepExecutionSelectionSchema, WorkflowIngressContextV1Schema } from '@happier-dev/protocol/workflows/workflowV1';
import { getActionSpec } from '@happier-dev/protocol/actions/actionSpecs';
import { ProjectAccountWorkspaceRefV1Schema } from '@happier-dev/protocol/projects/projectAccountRowsV1';
import { resolveProjectAccountWorkspaceRefRemovalV1 } from '@happier-dev/protocol/projects/projectAccountSnapshotV1';
import type { ProjectWorkspaceUpdateInputV1, ProjectWorkspaceUpdateOutputV1,
  ProjectWorkspaceForgetInputV1, ProjectWorkspaceForgetOutputV1 } from '@happier-dev/protocol/projects/projectWorkspaceActionsV1';
import { WorkflowMachineCommandOutputV1Schema } from '@happier-dev/protocol/workflows/stepActionsV1';
import { MAX_AUTOMATION_STORED_ENVELOPE_UTF8_BYTES } from '@happier-dev/protocol/automations/automationStoredContentEnvelopeV1';
import { RuntimeDescriptorV1Schema } from '@happier-dev/protocol/sessions/metadata/runtime-descriptor';
import { encodeBase64 } from '@happier-dev/protocol/crypto/base64';
import { REGISTRY_ACTION_OUTPUT_SCHEMAS_V1 } from '@happier-dev/protocol/registries';
import { installPromptRegistryItemInLibrary, updatePromptBundleInLibrary, updatePromptDocInLibrary, readPromptDocInLibrary, createPromptDocInLibrary, setPromptDocFavorite, listPromptLibrary, readSkillInLibrary } from '@happier-dev/protocol/prompts/library/promptLibraryActionOperations';
import { createSkillActionExecuteV1, readSkillUsageCatalogV1 } from '@happier-dev/protocol/prompts/library/skills/skillActionOperations';
import { SKILL_MACHINE_ACTION_INPUT_SCHEMAS_V1 } from '@happier-dev/protocol/prompts/library/skills/skillActionSchemasV1';
import { readSkillRulesForItemV1 } from '@happier-dev/protocol/prompts/library/skillRulesActionsV1';
import { SkillReadResultV1Schema, type SessionSkillReadItemV1 } from '@happier-dev/protocol/prompts/library/skills/skillReadV1';
import { resolvePromptDocCreateActionInputV1 } from '@happier-dev/protocol/prompts/library/promptDocV2';
import { listPromptInvocationsInLibrary, resolvePromptInvocationInLibrary } from '@happier-dev/protocol/prompts/library/promptInvocationActionOperations';
import { readPromptLibraryCatalogRecordV1 } from '@happier-dev/protocol/prompts/library/promptLibraryCatalogV1';
import { SessionAccessErrorCodeV1Schema } from '@happier-dev/protocol/sessions/access/sessionAccessOperationsV1';
import { normalizeSessionCreationOrganizationPlacementV1 } from '@happier-dev/protocol/sessions/creation/sessionCreationCorrespondenceV1';
import { buildSessionCreationCorrespondence } from '@/session/shared/sessionCreationCorrespondence';
import { projectDiscussionModelParticipantLaunchV1 } from '@happier-dev/protocol/discussions/modelParticipantLaunch';
import { SessionSpawnNewInputV2Schema } from '@happier-dev/protocol/sessions/creation/sessionSpawnNewInputV2';
import { SessionCreationTargetPreparationResultV1Schema, SessionCreationDirectoryApprovalV1Schema,
  needsSessionCreationDirectoryApprovalPreflightV1, projectSessionCreationDirectoryApprovalV1,
} from '@happier-dev/protocol/sessions/creation/sessionCreationTargetPreparationV1';
import { SessionModelSelectionV1Schema, SessionModelSelectionResolutionError, resolveSessionModelSelectionInputRefV1 } from '@happier-dev/protocol/providers/model-selection';
import { HandoffTargetReplacementPreflightResultV1Schema, WorkspaceSyncRelationshipsListRpcResultV1Schema, WorkspaceSyncConflictPageV1Schema, WorkspaceSyncConflictInspectRpcResultV1Schema, WorkspaceSyncConflictResolutionResultV1Schema, WorkspaceSyncRelationshipIdV1Schema, WorkspaceSyncStatusV1Schema } from '@happier-dev/protocol/sessions/control/handoff/workspaceSyncSchemas';
import { resolveWorkspaceSyncReadControllerV1 } from '@happier-dev/protocol/workspaces/workspaceSyncTopology';
import { SessionAuthoringTerminalV1Schema } from '@happier-dev/protocol/sessions/authoring/creationFieldsV1';
import { normalizeSpawnSessionErrorDetail, SPAWN_SESSION_ERROR_DETAIL_KINDS, isSessionCreationCorrespondenceConflictSpawnErrorDetail, isSessionCreationOrganizationInvalidSpawnErrorDetail } from '@happier-dev/protocol/spawnSession';
import { normalizeSpawnSessionNonceResolution } from '@happier-dev/protocol/sessions/spawnSessionNonce';
import { supportsMachineOperationProtocolCapabilityV1, supportsMachineSessionSpawnProtocolVersionV1 } from '@happier-dev/protocol/machines/operationProtocolCapabilitiesV1';
import { ProviderConnectionIdSchema } from '@happier-dev/protocol/providers/ids';
import { resolveExplicitSessionSpawnMachineTarget } from '@happier-dev/protocol/actions/sessionSpawnMachineTarget';
import { mergeSpawnConfigOptionAliases } from '@happier-dev/protocol/actions/sessionSpawnConfigOptions';
import { resolveActionBackendTargetSelection } from '@happier-dev/protocol/actions/resolveActionBackendTargetSelection';
import { parseBackendTargetKeyV2 } from '@happier-dev/protocol/backends/targets/backendTargetRefV2';
import { readRuntimeDescriptorV1FromMetadata } from '@happier-dev/protocol/sessions/metadata/runtime-descriptor-compat';
import { withExecutionRunStartFailureDetails, ExecutionRunGetResponseSchema, ExecutionRunGetRequestSchema } from '@happier-dev/protocol/execution/runs/responseSchemas';
import { RoleActionInputSchemasV1, RoleActionOutputSchemasV1 } from '@happier-dev/protocol/prompts/roles/roleActionsV1';
import { assertAccountRoleArtifactDeletionV1, RoleActionRefusalV1 } from '@happier-dev/protocol/prompts/roles/accountRoleActions';
import { readSessionWorkspaceWritesV1 } from '@happier-dev/protocol/prompts/roles/resolveRoleSelectionV1';
import { HAPPIER_STRUCTURED_INPUT_METADATA_KEY_V1, RawIngressStructuredInputV1Schema, hasRawSessionAttachmentSelectionV1 } from '@happier-dev/protocol/runtime/input/structuredInputV1';
import { SessionPendingMessageComposerAdmissionPrepareResponseV1Schema } from '@happier-dev/protocol/sessions/userMessageRpc';
import { buildUploadedAttachment } from '@happier-dev/protocol/messages/structured/sessionAttachmentsInputV1';
import { readPendingLocalId } from '@happier-dev/protocol/sessions/pending/pendingLocalId';
import { projectSessionAttachmentInputV1 } from '@/session/attachments/projectRawIngressSessionAttachmentsV1';
import { WorkflowRunSummaryV1Schema } from '@happier-dev/protocol/workflows/workflowProgressV1';
import { readSessionRolesV1 } from '@happier-dev/protocol/prompts/roles/sessionRolesSnapshot';
import { readCompleteActionSpecV1 } from '@happier-dev/protocol/actions/actionCatalog';
import { StrictJsonValueSchema } from '@happier-dev/protocol/json/strictJsonValue';
import { resolveActionAgentStartContextV1 } from '@happier-dev/protocol/actions/executor/agentStartAdmission';
import { requestDaemonSignedRootActionExecution, recordDaemonSkillUse } from '@/daemon/controlClient';
import { resolveHappierSkillIdentity } from '@/prompts/skills/runtime/resolveHappierSkillIdentity';
import { doesWorkflowImmediateEligibleStepTargetSession } from '@/daemon/workflows/coordinator';
import { SpawnSessionTerminalSchema } from '@/rpc/handlers/spawnSessionOptionsContract';
import { SPAWN_SESSION_ERROR_CODES } from '@/session/shared/spawnSessionContract';
import { createStableSpawnNonce } from '@/session/shared/spawnNonce';
import {
  AGENT_IDS,
  DEFAULT_AGENT_ID,
  parsePermissionIntentAlias,
  resolvePermissionIntentFromSessionMetadata,
  resolveCanonicalAgentIdFromFlavor,
  resolveAgentIdFromSessionMetadata,
  isBundledAgentId,
  type AgentId,
  type PermissionIntent,
} from '@happier-dev/agents';
import { BUNDLED_AGENT_CONTRIBUTION_IDENTITIES } from '@happier-dev/agents/agent-ids';
import { configuration } from '@/configuration';
import { resolveServerHttpBaseUrl, normalizeServerHttpBaseUrl } from '@/api/client/serverHttpBaseUrl';
import type { AdmittedRequesterSessionBootstrap } from '@/daemon/sessionEncryption/requesterSessionCredentials';
import { projectRequesterSessionCredentialDisclosure } from '@happier-dev/protocol/sessions/creation/sessionRequesterBootstrapV1';
import { MachineAdmissionTransportUnavailableError } from '@/daemon/machineAdmissionTransport';
import { isAuthenticationError } from '@/api/client/httpStatusError';
import { readSessionCreationTerminalSpawnErrorDetail } from '@/api/session/sessionCreationTerminalSpawnErrorDetail';
import { readMachineOperationProtocolCapabilitiesV1 } from '@/api/machine/machineOperationProtocolCapabilities';
import {
  SessionInitialAccessEnvelopeHostError,
  SessionInitialAccessUpdateRequiredError,
} from '@/api/session/sessionCreationInitialAccess';
import { getPreferredHostName } from '@/daemon/machine/metadata';
import { createCliApprovalsArtifactStore } from '@/session/actions/approvals/artifactStore';
import { createAcknowledgedAccountArtifactTransport, createCredentialedAccountArtifactStore } from '@/api/artifacts/accountArtifactStore';
import { createCliArtifactActions } from './artifactActions';
import { createWorkflowDefinitionActions } from './workflowDefinitions';
import { createCliWorkflowTriggerActions } from './workflowTriggers';
import { getWorkflowStarterExamplesV1 } from '@happier-dev/protocol/workflows/builtins/examples';
import { createRoleActionExecutor, type RoleWorkspaceWritesPolicyPreparer } from './roleActions';
import { createRoleSourceReader, type RoleSourceReader } from '@/session/roles/roleSources';
import { readAccountIdFromToken } from '@/cloud/decodeJwtPayload';
import { createSessionRunReportPolicyReader } from '@/api/sessionFollowCreationPreferences';
import { createWorkflowActionExecutor, normalizeWorkflowActionThrownError } from './workflowActionExecutor';
import { createSessionFollowSourceKeyPreparationAfterSet } from '@/agent/runtime/session/follow/createSessionFollowSourceKeyPreparationAfterSet';
import { createWorkflowRunActionOwner } from './workflowRunActions';
import { createCommittedInputTypeDeps } from '@/plugins/runtime/invocation/actions/createCommittedContributedActionDeps';
import { createCredentialedWorkflowMaterializationHostV1, projectWorkflowConversationRoleSelection } from './workflowMaterializationHost';
import { createWorkflowRunStorageClient } from '@/daemon/workflows/workflowRunStorageClient';
import { createWorkflowInvocationRecoveryObserver, observeWorkflowInvocationRecoveryEvidence, resolveWorkflowSessionConversation } from '@/daemon/workflows/invocationRecoveryObserver';
import { createWorkflowInvocationRecoveryFactWriter } from '@/daemon/workflows/recovery';
import { createWorkflowRunPushNotificationClient } from '@/daemon/workflows/production';
import { createWorkflowRunReviewEntryNotificationHandler } from '@/notifications/activity/dispatchWorkflowRunUpdateNotification';
import type { WorkflowAccountRunActionDeps } from '@happier-dev/protocol';
import { isWorkflowRuntimeEnabled } from '@/daemon/automation/workflowFeatureGate';
import { listCurrentAccountAdministrationMachines, listCurrentAccountMachines, resolveCurrentAccountMachineTarget } from '@/api/machine/resolveCurrentAccountMachineTarget';
import { isMachineRequestReachabilityFailureV1 } from '@happier-dev/protocol/machines/machineReachabilityV1';
import { resolveFilesystemTransferCustodyFailure } from './filesystemTransferCustody';
import { readAgentCatalogSnapshot } from '@/agent/catalog/snapshot';
import { prepareWorkflowAcceptedWorkspaceTarget, restoreRecordedWorkflowWorkspace } from '@/daemon/workflows/resolveWorkflowWorkspace';
import {
  createAutomationAccountEncryptionMaterialSnapshotV1,
  resolveValidatedAutomationAccountEncryptionV1,
} from '@/plugins/runtime/automations/automationAccountCurrentness';
import { fetchChangesAccountId } from '@/api/changes';
import { hasStoredSessionCredentialProvenance, readSettings, type StoredCredentials } from '@/persistence';
import {
  createSpawnedSession,
  type DirectSpawnedSessionTransport,
  type ReplaySeededSessionCreationV1,
} from '@/session/services/createSpawnedSession';
import { resolveSessionHandoffSourceAuthority } from '@/session/handoff/resolveSessionHandoffSourceAuthority';
import { buildReplaySeededSpawnRecipe } from '@/session/replay/buildReplaySeededSpawnRecipe';
import { resolveReplaySourceContextAuthority } from '@/session/replay/resolveReplaySourceContextAuthority';
import {
  type ResolveSpawnConnectedServicesTeamResourceCatalog,
  mergeSessionTeamCredentialBindingIntents,
  resolveSessionSpawnConnectedServicesDefaultsPayload,
} from '@/session/services/spawnConnectedServicesDefaults';
import { getSessionEvents } from '@/session/services/getSessionEvents';
import { getSessionTranscript } from '@/session/services/getSessionTranscript';
import { buildCliSessionAwarenessInputV1 } from '@/cli/output/session/sessionAwareness';
import { fetchAccountEncryptionCurrentness } from '@/api/client/connectedServiceCredentialApi';
import { getSessionStatus } from '@/session/services/getSessionStatus';
import { createSessionBoardActionDeps } from '@/session/board/sessionBoardActionDeps';
import { createDiscussionActionDeps } from '@/discussions/discussionActionDeps';
import { resolveWorkflowDiscussionOrigin } from '@/daemon/workflows/workflowDiscussion';
import { createSessionListActionDeps } from './sessionListActionDependency';
import { resolveCliAgentStartContextV1 } from './resolveCliAgentStartContextV1';
import { resolveRolesSnapshotV1 } from '@happier-dev/protocol/prompts/roles/resolveRoleSelectionV1';
import { createCliBoundSessionMetadataReader, readCliActionBoundSessionId, resolveCliActionCallerSession, resolveCliActionCallerWorkflowTarget } from './resolveCliActionCallerSession';
import {
  dispatchOriginalAccountAction,
  prepareInstalledWorkflowActionAuthorization,
  resolveExternalActionServerRequestHeaders,
  readReviewedServiceMoveInput,
  isReviewedServiceMoveChild,
  type ExternalActionHomeBinding,
} from '@/api/externalActionExecutionAuthorization';
import { isProjectServiceMoveChildInputV1 } from '@happier-dev/protocol/workspaces/projectServiceRelocationV1';
import { requestSessionStop } from '@/session/services/requestSessionStop';
import {
  admitPluginSessionInputAttachmentsV1,
  buildPluginSessionInputAttachmentDraftsV1,
} from '@/session/composer/admitPluginSessionInputAttachmentsV1';

type SessionSpawnNewErrorResult = Extract<SessionSpawnNewResultV1, Readonly<{ type: 'error' }>>;

function incompatibleSessionSpawnTarget(reason: SessionSpawnNewIncompatibleTargetV1['reason']) {
  return { type: 'error', code: 'incompatible_target', retryable: false, incompatibleTarget: { reason } } as const satisfies SessionSpawnNewErrorResult;
}

/**
 * Keeps physical-host and atomic-create initial-access failures on the strict spawn
 * settlement instead of erasing Lane 04/Lane 06 recovery meaning behind a
 * generic process failure. The projection carries no key or response body.
 */
export function projectSessionInitialAccessEnvelopeHostErrorResult(
  error: unknown,
): SessionSpawnNewErrorResult | null {
  const code = error instanceof SessionInitialAccessEnvelopeHostError
    ? error.code
    : error && typeof error === 'object' && typeof (error as { code?: unknown }).code === 'string'
      ? (error as { code: string }).code
      : null;
  const parsedSessionAccessError = SessionAccessErrorCodeV1Schema.safeParse(code);
  if (parsedSessionAccessError.success) {
    return {
      type: 'error',
      code: parsedSessionAccessError.data,
      retryable: false,
    };
  }
  switch (code) {
    case 'not_authenticated':
      return { type: 'error', code: 'permission_denied', retryable: false };
    case 'session_data_key_unavailable':
      return { type: 'error', code, retryable: false };
    case 'session_access_request_failed':
      return { type: 'error', code, retryable: true };
    case 'unsupported_action':
      return incompatibleSessionSpawnTarget('initial_access_unsupported');
    default:
      return null;
  }
}
import type { ComposerAttachmentSendPreparationRegistryV1 } from '@/session/composer/prepareComposerAttachmentDraftsForSendV1';
import { notifyComposerAttachmentsAfterMessageAccepted } from '@/session/composer/notifyComposerAttachmentsAfterMessageAccepted';
import {
  sendSessionMessage,
  waitForSessionInputResult,
  type SendSessionMessageResult,
} from '@/session/services/sendSessionMessage';
import { mutateSessionMessageReplyObservation } from '@/session/services/sessionMessageReply';
import { SessionMessageReplyObservationRequestV1Schema, SessionMessageReplyMutationResultV1Schema } from '@happier-dev/protocol/sessions/messages/sessionMessageReplyV1';
import type { ApiSessionClient } from '@/api/session/sessionClient';
import { resolveSessionMessageAdmissionTimeoutMs } from '@/session/transport/shared/sessionTimeouts';
import { findPersistedSessionUserMessageAdmission } from '@/api/session/client/transcript/sessionUserMessageAdmissionRejoin';
import { validateComposerAttachmentRejoinCorrespondenceV1 } from '@/session/services/admitSessionStructuredInputV1';
import {
  buildCausalSessionInputAdmissionV1,
  buildSessionSpawnInitialInputAdmissionForLocalIdV1,
  buildPluginSessionInputAdmissionV1,
  requiresMachineAdmissionForSessionInput,
  resolveSessionInputTargetMachineId,
  resolveProtectedSessionInputActionTarget,
} from '@/session/services/sessionInputAdmissionIdentity';
import {
  indexAgentRoutingIdsByContributionIdentity,
  readAgentRoutingIdForContributionIdentity,
} from '@/plugins/projection/registry/agentRoutingIdentity';
import { resolveSessionCreationAgentTarget } from '@/session/creation/resolveSessionCreationAgentTarget';
import { projectSessionSpawnFailure } from '@/session/creation/projectSessionSpawnFailure';
import { setSessionArchivedState } from '@/session/services/setSessionArchivedState';
import { setSessionModel } from '@/session/services/setSessionModel';
import { SessionModelTransitionResultV1Schema } from '@happier-dev/protocol/sessions/control/modelTransitionV1';
import { setSessionMode } from '@/session/services/setSessionMode';
import { setSessionPermissionMode } from '@/session/services/setSessionPermissionMode';
import { updateSessionStateFieldForTarget } from '@/session/services/updateSessionStateFieldForTarget';
import { waitForSessionIdle } from '@/session/services/waitForSessionIdle';
import { requestInactiveSessionResume } from '@/session/services/requestInactiveSessionResume';
import { SessionResumeRequestV1Schema, type SessionResumeRequestV1 } from '@happier-dev/protocol/sessions/control/sessionResumeRequestV1';
import { buildSessionRunnerRuntimeRefreshRequestV1, RestartSessionRunnerResultV1Schema } from '@happier-dev/protocol/sessions/control/sessionRunnerRestartV1';
import { SessionRunnerRuntimeStateV1Schema } from '@happier-dev/protocol/sessions/control/sessionRunnerRuntimeV1';
import { resolveSessionMachineWorkspacePath } from '@/session/machineControlLocality';
import {
  resolveCurrentSessionCapabilityBinding,
  resolveCurrentSessionUiBinding,
} from '@/session/presentation/currentSessionUiBindings';

import type {
  SessionStoredContentCryptoContext,
} from '@/session/transport/encryption/sessionStoredContentCodec';
import type { SessionTransportEncryptionMaterial } from '@/session/transport/encryption/sessionEncryptionContext';
import {
  cancelExecutionRunStream,
  ensureExecutionRun,
  ensureOrStartExecutionRun,
  executeExecutionRunAction,
  getExecutionRun,
  listExecutionRuns,
  readExecutionRunStream,
  startExecutionRun,
  startExecutionRunStream,
  stopExecutionRun,
  waitForExecutionRun,
} from '@/session/services/executionRuns';
import { buildPluginInstallApprovalPreview } from '@/plugins/devLoop/installApprovalPreview';
import { decideUserPluginChange, requestUserPluginChange } from '@/plugins/daemon/changeClient';
import type { DaemonPluginChangeService } from '@/plugins/daemon/changeService';
import { readPluginInstallApprovalPendingReview } from '@happier-dev/protocol/actions/actionApprovalPresentation';
import {
  normalizeExecutionRunWaitTimeoutMs,
} from '@/session/services/executionRunWaitTiming';
import { resolveSessionTransportContext } from '@/session/services/resolveSessionTransportContext';
import { readSessionOwnerLocality, tryDecryptSessionMetadata, tryDecryptSessionOwnerMetadataView } from '@/session/transport/encryption/sessionEncryptionContext';
import { readSessionBotV1 } from '@happier-dev/protocol/sessions/identity/sessionBotV1';
import { updateSessionMetadataForTarget } from '@/session/services/updateSessionMetadataForTarget';
import { fetchSessionById, fetchSessionByIdCompat, fetchSessionTurnsProjection, fetchSessionsQueryPage, setSessionAttentionStanding, setSessionOrganizationPin, setSessionManager, type RawSessionRecord } from '@/session/transport/http/sessionsHttp';
import { runWithServerHttpBaseUrl } from '@/api/client/serverHttpBaseUrl';
import { createCliProviderConnectionsStore, createCliProviderConnectionsStoreForOperation } from '@/providers/settings/catalogStore';
import { refreshActiveProviderConnectionsCatalog } from '@/providers/settings/hydrate';
import { revokeMachineWithProviderCleanup } from '@happier-dev/protocol/machines/account/revokeWithProviderCleanup';
import { callSessionRpc, resolveSessionRpcContent } from '@/session/transport/rpc/sessionRpc';
import { readRuntimeAuthUsageLimitRecoveryAttemptId } from '@/session/usageLimitRecoveryControls/runtimeAuthUsageLimitRecoveryControl';
import {
  callExactMachineRpc,
  callMachineRpc,
  dispatchRequesterSessionSpawnNewRpc,
  readMachineRpcRequestDisposition,
} from '@/session/transport/rpc/machineRpc';
import { resolveLiveDaemonControlTargetForServer } from '@/daemon/multiDaemon';
import { RPC_METHODS } from '@happier-dev/protocol/rpc/methods';
import { SOCKET_RPC_AUTHORIZATION_CONTEXT_KINDS } from '@happier-dev/protocol/rpc';
import { SESSION_RPC_METHODS } from '@happier-dev/protocol/rpc/methods';
import { isRpcMethodNotAvailableError, isRpcMethodNotFoundError, isRpcMethodNotFoundResult, RPC_ERROR_CODES, readRpcErrorCode, RpcError } from '@happier-dev/protocol/rpcErrors';
import { readExecutionRunProtocolV2Support, type ExecutionRunCapabilityObservation } from '@happier-dev/protocol/execution/runs/protocolSupport';
import { routeSessionCatalogControl } from '@/session/catalogControls/sessionCatalogControlRouter';
import { routeSessionGoalControl } from '@/session/goalControls/sessionGoalControlRouter';
import {
  normalizeUsageLimitRecoveryOperationResult,
} from '@/session/usageLimitRecoveryControls/sessionUsageLimitRecoveryOperationResult';
import { executePluginDevLoopAction } from '@/plugins/devLoop/actions';
import { executePluginSettingsAdministrationAction } from '@/plugins/settings/administration';
import { getSessionHostBridge } from '@/agent/runtime/bridges/session/SessionHostBridge';
import { resolveBackendTargetFromSessionMetadata } from '@/session/backendTargets/resolveBackendTargetFromSessionMetadata';
import { createCliActionInventoryDeps } from './cliActionDeps/createCliActionInventoryDeps';
import {
  readSessionAgentState,
} from './cliActionDeps/sessionStateReaders';
import {
  HostSubagentStoreError,
  hostSubagentStore,
  type HostSubagentActor,
} from '@/session/subagents/hostSubagentStore';
import {
  resolveUsageLimitRecoveryEnabled,
  usageLimitRecoveryDisabledResult,
} from '@/features/usageLimitRecoveryFeatureGate';
import { createCliRegistryHostV1 } from '@/registries/createCliRegistryHost';
import { createCliRegistryUpdateCheck } from '@/registries/updates/createCliRegistryUpdateCheck';
import { createMarketplaceIndexService } from '@/plugins/store/marketplace/service';
import { createPluginPermissionGrantActionExecutor } from '@/plugins/runtime/lifecycle/permissions/pluginPermissionGrantActionExecutor';
import { createPluginWebhookActionExecutor } from '@/plugins/runtime/webhooks/pluginWebhookActionExecutor';
import { createAutomationConversationActionExecutor } from '@/plugins/runtime/automations/automationConversationActionExecutor';
import {
  createAutomationEventActionExecutor,
  type ResolveAutomationEventAdoptedDefinitionSetV1,
} from '@/plugins/runtime/automations/automationEventActionExecutor';
import type {
  RevalidatePluginActionCallerOccurrence,
  RevalidatePluginActionCallerMaterialization,
} from '@/plugins/runtime/invocation/services/actionCaller';
import { executeScmActionOperation } from '@/scm/actions/executeScmActionOperation';
import { createCliScmReviewedMarkAction, clearCliScmReviewedMarks } from '@/scm/actions/executeScmReviewedMarkAction';
import { executeScmDiffSummaryAction } from '@/scm/actions/executeScmDiffSummaryAction';
import { createRepositoryCheckpointTranscriptPageReader } from '@/scm/checkpoints/readRepositoryCheckpointTranscriptPage';
import type { ReadPullRequestComparisonPage } from '@/scm/comparisons/readPullRequestComparisonPage';
import { createCliReviewCommentActionExecutorFromCredentials } from '@/agent/reviews/comments/executor';
import { executePluginExternalSessionAction } from './externalSessions/pluginExternalSessionActionExecutor';
import { createHostExternalSessionActionTransport } from './externalSessions/hostExternalSessionActionTransport';
import type {
  ExternalSessionPluginAdmissionOwner,
} from './externalSessions/pluginExternalSessionAdmissionOwner';
import { bootstrapAccountSettingsContext } from '@/settings/accountSettings/bootstrapAccountSettingsContext';
import { fetchAccountProfile } from '@/api/accountProfile';
import { readSessionOperationCredentialReadinessV1 } from '@happier-dev/protocol/sessions/control/sessionReadinessV1';
import { resolveMachineRpcRoutePolicy } from '@happier-dev/protocol/machines/peer/mediation/rpc/routePolicyV1';
import { ConnectedAccountUiProjectionEntryV1Schema } from '@happier-dev/protocol/connect/connectedAccountUiProjectionV1';
import { TeamCredentialResourceEntitledPageV1Schema, type TeamCredentialResourceCatalogEntryV1 } from '@happier-dev/protocol/teams/credentials/resourceV1';
import { PushNotificationClient } from '@/api/pushNotifications';
import { dispatchActivityNotificationAsync, listActivityNotificationChannels,
  NotificationChannelCatalogUnavailableError } from '@/notifications/activity/dispatchActivityNotification';
import { hydrateNotificationChannelCatalogForActiveAccount, hydrateNotificationChannelCatalogForOperation } from '@/settings/notifications/hydrateNotificationChannelCatalog';
import { createSavedSecretMaterializerFromSnapshotV1, SavedSecretResolutionError } from '@/settings/secrets/savedSecretCatalog';
import { deriveSettingsSecretsReadKeysForCredentials } from '@/settings/secrets/settingsSecretsKey';
import { createActionSettingsProvider, type RuntimeActionSettingsProvider } from '@/settings/actionsSettingsProvider';
import { getActiveAccountSettingsSnapshot, getActiveAccountSettingsSnapshotLifetimeToken, isActiveAccountSettingsSnapshotLifetimeCurrent, readAccountRoleOverridesFromSnapshot } from '@/settings/accountSettings/activeAccountSettingsSnapshot';
import { readPreparedAccountRoleOverrides, type SessionRoleContext } from '@/session/roles/sessionRoleContext';
import { readSessionPreparationFailureDiagnostic } from '@/agent/runtime/session/errors/classifyPrimarySessionRuntimeIssue';
import { createCliConnectedAccountCatalogStore } from '@/settings/connectedAccounts/connectedAccountCatalogStore';
import { readActiveConnectedAccountCatalog } from '@/settings/connectedAccounts/hydrateConnectedAccountCatalog';
import { prepareActiveAccountRoleOverrides } from '@/settings/prompts/hydratePromptLibraryCatalog';
import { runWithRequesterSessionCurrentnessCheckpoint, runWithoutRequesterSessionCurrentnessCheckpoint } from '@/daemon/sessionEncryption/requesterCurrentness';
import { resolveAccountSettingsScopeKeyForToken } from '@/settings/accountSettings/accountSettingsScopeKey';
import { resolveWorkspaceRefById } from '@/workspaces/workspaceRefsV1';
import { projectWorkspaceRefV1, resolveWorkspaceRefV1 } from '@happier-dev/protocol/workspaces/workspaceRefResolutionV1';
import { buildProjectAccountRowPhysicalKeyV1 } from '@happier-dev/protocol/projects/projectAccountRowsV1';
import type { CliServerFeaturesSnapshot } from '@/features/serverFeaturesClient';
import { createCliAcpCatalogStore } from '@/agent/acp/catalog/acpCatalogStore';

/**
 * Projects the low-level send wrapper onto the one public Action result.
 * Admission evidence is authoritative even when acknowledgement or waiting
 * failed after a durable effect. A successful unprotected send predates the
 * admission envelope, so its resolved local id is projected as accepted.
 */
function projectSessionMessageSendActionResult(
  result: SendSessionMessageResult,
): SessionMessageSendResultV1 | null {
  if (!result.ok && result.settlementResult) return result.settlementResult;
  if (result.admissionResult) return result.admissionResult;
  if (result.ok) return { status: 'accepted', localId: result.localId };
  return null;
}

function notSupported(): never {
  throw new Error('action_not_supported_in_cli');
}

function serializeHostSubagentStoreError(error: unknown): Readonly<{ ok: false; errorCode: string; error: string }> {
  if (error instanceof HostSubagentStoreError) {
    return { ok: false, errorCode: error.code, error: error.code };
  }
  throw error;
}

function deriveHostSubagentActor(caller: ActionCaller): HostSubagentActor {
  if (caller.kind !== 'plugin' || !caller.contributionLocalId?.trim()) {
    return { kind: 'externalRpc' };
  }
  return {
    kind: 'plugin',
    pluginId: caller.pluginId,
    agentId: caller.contributionLocalId,
  };
}

function normalizeStringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function executionRunActionFailure(
  code: string,
  message?: string,
  details?: unknown,
): Readonly<{ ok: false; errorCode: string; error: string; details?: unknown }> {
  return {
    ok: false,
    errorCode: code,
    error: message ?? code,
    ...(details !== undefined ? { details } : {}),
  };
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function isExecutionRunActionAbort(error: unknown, signal?: AbortSignal): boolean {
  return signal?.aborted === true || readRecord(error).name === 'AbortError';
}

function hasPossiblyAcceptedSpawnNonce(error: unknown): boolean {
  const details = readRecord(readRecord(error).details);
  return typeof details.spawnNonce === 'string' && details.spawnNonce.trim().length > 0;
}

/**
 * The Action surface consumes only the protocol-owned terminal detail, never
 * daemon/server wording. Direct daemon-control failures carry it at
 * `details.errorDetail`; the awaiter path nests the original response once.
 */
function hasSessionCreationOrganizationInvalidDetail(error: unknown): boolean {
  const details = readRecord(readRecord(error).details);
  return isSessionCreationOrganizationInvalidSpawnErrorDetail(
    details.errorDetail,
  ) || isSessionCreationOrganizationInvalidSpawnErrorDetail(
    readRecord(details.spawnResponse).errorDetail,
  );
}

function hasSessionCreationCorrespondenceConflictDetail(error: unknown): boolean {
  const details = readRecord(readRecord(error).details);
  return isSessionCreationCorrespondenceConflictSpawnErrorDetail(
    details.errorDetail,
  ) || isSessionCreationCorrespondenceConflictSpawnErrorDetail(
    readRecord(details.spawnResponse).errorDetail,
  );
}

function readResumePromptMode(value: unknown): SessionUsageLimitRecoveryResumePromptModeV1 | undefined {
  return value === 'standard' || value === 'off' || value === 'custom' ? value : undefined;
}

export type ResumeInactiveSessionWhenUsageLimitReady = (input: Readonly<{
  sessionId: string;
  rawSession: RawSessionRecord;
  metadata: Record<string, unknown>;
}>) => Promise<boolean>;

export type ScheduleInactiveSessionUsageLimitRecoveryCheck = (input: Readonly<{
  sessionId: string;
  recovery: SessionUsageLimitRecoveryV1;
  runCheckNow: () => Promise<unknown>;
}>) => Promise<void> | void;

export type CancelInactiveSessionUsageLimitRecoveryCheck = (input: Readonly<{
  sessionId: string;
  issueFingerprint: string;
  armedAtMs: number;
  runtimeAuthRecoveryAttemptId?: string;
}>) => Promise<void> | void;

/**
 * Reads the current record from the inactive usage-limit recovery lifecycle owner so an
 * in-flight readiness probe can be fenced against a cancellation, exhaustion or replacement
 * that landed while it was running.
 */
export type ReadInactiveSessionUsageLimitRecovery = (input: Readonly<{
  sessionId: string;
}>) => SessionUsageLimitRecoveryV1 | null;

export type CancelConnectedServiceRuntimeAuthRecovery = (input: Readonly<{
  sessionId: string;
  attemptId: string;
}>) => Promise<unknown> | unknown;

export type RetryTemporaryThrottleNow = (input: Readonly<{
  sessionId: string;
}>) => Promise<unknown> | unknown;

/**
 * Host-private exact-daemon path used only after the public V2 Action owner
 * has admitted an already server-stamped request. It replaces transport, not
 * Session creation policy, normalization, or lifecycle ownership.
 */
export type SessionSpawnDirectTargetTransport = Readonly<{
  machineId: string;
  prepare: (
    request: SessionCreationTargetPreparationRequestV1,
    options?: Readonly<{ signal?: AbortSignal }>,
  ) => Promise<SessionCreationTargetPreparationResultV1>;
  spawnedSession: DirectSpawnedSessionTransport;
}>;

/** The daemon's already authenticated Machine socket; never the Account user socket. */
export type SessionActionRpcTransport = (request: Readonly<{
  sessionId: string;
  method: string;
  input: unknown;
  content: import('@happier-dev/sync-client').SocketRpcContent;
  signal?: AbortSignal;
}> & (Readonly<{ origin: SessionActionRpcOriginV1; executionAuthorization?: never }>
  | Readonly<{ origin?: never; executionAuthorization: NonNullable<ActionExecutorContext['externalActionExecutionAuthorization']> }>)) => Promise<unknown>;

export type MachineActionDirectTargetTransport = Readonly<{
  machineId: string;
  /** Only the installed registered owner consumes an already Home-admitted Project root. */
  openProject?: NonNullable<ActionExecutorDeps['projectsOpen']>;
  invoke: (
    method: string,
    request: unknown,
    options?: Readonly<{
      signal?: AbortSignal;
      executionRunPermissionRequestStore?: unknown;
      executionRunWorkflowObservationSink?: unknown;
      executionRunWorkflowRunId?: string;
      executionRunWorkflowScope?: RpcLocalActionContext['executionRunWorkflowScope'];
      localActionContext?: RpcLocalActionContext;
      /** Existing admitted Session custody; never serialized in Machine RPC input. */
      rpcContext?: Pick<RpcHandlerContext, 'requesterSessionBootstrap'>;
    }>,
  ) => Promise<unknown>;
}>;

type CurrentMachineControlIdentity = Readonly<{
  machineId: string | null;
  host: string | null;
  homeDir: string | null;
}>;

function readStringRecord(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const entries = Object.entries(value as Record<string, unknown>);
  if (!entries.every(([, entryValue]) => typeof entryValue === 'string')) return undefined;
  return Object.fromEntries(entries) as Record<string, string>;
}

function readConfigOptionsRecord(value: unknown): Record<string, SpawnConfigOptionValue> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const entries = Object.entries(value as Record<string, unknown>);
  if (!entries.every(([, entryValue]) => (
    typeof entryValue === 'string'
    || typeof entryValue === 'number' && Number.isFinite(entryValue)
    || typeof entryValue === 'boolean'
    || entryValue === null
  ))) {
    return undefined;
  }
  return Object.fromEntries(entries) as Record<string, SpawnConfigOptionValue>;
}

async function resolveSpawnConnectedServicesDefaultPayload(params: Readonly<{
  backendTarget: NonNullable<ReturnType<typeof readBackendTargetRefV2>>;
  credentials: StoredCredentials;
  signal?: AbortSignal;
  operationContext?: SavedSecretOperationContextV1;
  resolveTeamCredentialResourceCatalog?: ResolveSpawnConnectedServicesTeamResourceCatalog;
}>): Promise<Awaited<ReturnType<typeof resolveSessionSpawnConnectedServicesDefaultsPayload>>> {
  if (params.backendTarget.sourceKind !== 'built_in') return null;
  // ONE defaulting owner (QA2-F02): session spawn and execution-run start resolve defaults
  // through the same fresh-bootstrap owner; no local settings-snapshot path.
  return await resolveSessionSpawnConnectedServicesDefaultsPayload({
    agentId: params.backendTarget.backendId,
    credentials: params.credentials,
    signal: params.signal,
    ...(params.operationContext ? { operationContext: params.operationContext } : {}),
    ...(params.resolveTeamCredentialResourceCatalog
      ? { resolveTeamCredentialResourceCatalog: params.resolveTeamCredentialResourceCatalog }
      : {}),
  });
}

type PendingAgentRequestKind = 'permission' | 'user_action';

/**
 * The Action-executor dependency contract owns the V2-only capability
 * requirement; this transport only consumes it, so it is read back from that
 * declaration instead of being restated here.
 */
type ExecutionRunProtocolV2Requirement = Parameters<
  NonNullable<ActionExecutorDeps['executionRunCheckProtocolV2']>
>[1];

function permissionRequestNotFoundResult(sessionId: string) {
  return {
    ok: false,
    errorCode: 'permission_request_not_found',
    errorMessage: 'permission_request_not_found',
    sessionId,
  } as const;
}

function isKnownCompletedRequestId(params: Readonly<{
  rawSession: Readonly<{ agentState?: unknown }>;
  requestId: string;
  kind: PendingAgentRequestKind;
}> & SessionStoredContentCryptoContext): boolean {
  const agentState = readSessionAgentState(params);
  const completedRequests = agentState?.completedRequests;
  if (!completedRequests || typeof completedRequests !== 'object' || Array.isArray(completedRequests)) {
    return false;
  }

  const completed = (completedRequests as Record<string, unknown>)[params.requestId];
  if (!completed || typeof completed !== 'object' || Array.isArray(completed)) {
    return false;
  }

  const requestKind = (completed as Record<string, unknown>).kind;
  if (params.kind === 'user_action') return requestKind === 'user_action';
  return requestKind === 'permission' || typeof requestKind === 'undefined';
}

const DETACHED_EXECUTION_RUN_CALLER_LIFECYCLE_METHODS = new Set<string>([
  SESSION_RPC_METHODS.EXECUTION_RUN_START,
  SESSION_RPC_METHODS.EXECUTION_RUN_ENSURE,
  SESSION_RPC_METHODS.EXECUTION_RUN_ENSURE_OR_START,
  SESSION_RPC_METHODS.EXECUTION_RUN_SEND,
  SESSION_RPC_METHODS.EXECUTION_RUN_ACTION,
  SESSION_RPC_METHODS.EXECUTION_RUN_STREAM_START,
  SESSION_RPC_METHODS.EXECUTION_RUN_STREAM_START_V2,
  SESSION_RPC_METHODS.EXECUTION_RUN_STREAM_CANCEL,
  SESSION_RPC_METHODS.EXECUTION_RUN_STOP,
  SESSION_RPC_METHODS.EXECUTION_RUN_WAIT,
]);

/**
 * An exact Action Home is one target: its server id and its base URL are bound
 * together or not at all. The Home-bound dependency owners already refuse a
 * half-bound target, so callers express the same pair here instead of letting
 * one half reach an owner that would fall back to the configured active Home.
 */
export type CliActionExactHomeTarget =
  | Readonly<{ serverId?: undefined; serverHttpBaseUrl?: undefined }>
  | Readonly<{ serverId: string; serverHttpBaseUrl: string }>;

export function createCliActionDeps(params: Readonly<{
  token: string;
  /** Local delivery only; a host without a link consumer refuses creation before HTTP. */
  onPublicLinkIssued?: (link: import('@happier-dev/protocol').ArtifactPublicLinkIssuedV1) => void | Promise<void>;
  credentials?: StoredCredentials;
  /** Daemon startup already owns this service; do not loop through its not-yet-open control transport. */
  pluginChangeService?: DaemonPluginChangeService;
  /** Canonical private-secret Action adapter supplied by the captured Account host. */
  personalSavedSecretActionExecute?: ActionExecutorDeps['personalSavedSecretActionExecute'];
  /** Standalone input choices use the authenticated built-in Action owner. */
  readAdmittedInputTypeOptions?: ActionExecutorDeps['readAdmittedInputTypeOptions'];
  /** Currentness of this composition's already-captured credential. */
  isCredentialCurrent?: () => boolean | Promise<boolean>;
  onRequesterSessionCredentialDisclosure?: Parameters<typeof dispatchOriginalAccountAction>[0]['onRequesterSessionCredentialDisclosure'];
  requesterSessionBootstrap?: AdmittedRequesterSessionBootstrap;
  /** Private invocation custody, never a daemon Account snapshot or a fake Session. */
  savedSecretOperationContext?: SavedSecretOperationContextV1;
  /** Live Session Role admission shares its retained Account demand and holder. */
  getSessionRoleContext?: () => SessionRoleContext;
  /** Memory-only prompted Provider credential, promoted only by the admitted connection owner. */
  providerPreparedSavedSecret?: Parameters<typeof createCliProviderActionExecuteV1>[0]['preparedSavedSecret'];
  /** Installed exact-target Project producer; absent hosts retain Trust-only behavior. */
  projectAction?: ActionExecutorDeps['projectAction'];
  /** Receiving daemon's target-local Activity Undo owner; clients retain exact Machine transport. */
  machineGuardAction?: ActionExecutorDeps['machineGuardAction'];
  /** Machine-owned policy intersects the selected Session's confined SCM root. */
  scmFilesystemAccessPolicy?: FilesystemAccessPolicy;
  /** The daemon binds its canonical local file owner; clients use exact Machine transport. */
  projectDefinitionAction?: ActionExecutorDeps['projectDefinitionAction'];
  /** Account row/policy ports share the family with exact-Machine status and retirement. */
  projectWorkerAccountAction?: ActionExecutorDeps['projectWorkerAction'];
  stageWorkStateMutation?: (mutation: import('@/api/session/client/transport/mutations/sessionClientDurableMutationTypes').DaemonWorkStateFieldMutation, options?: Readonly<{ signal?: AbortSignal }>) => Promise<void>;
  stageSessionStateMutation?: (mutation: import('@/api/session/client/transport/mutations/sessionClientDurableMutationTypes').RegisteredSessionStateFieldMutationV1) => Promise<void>;
  postSessionUpdate?: (report: SessionUpdatePostInputV1) => Promise<Readonly<{ persisted: boolean; localId?: string }>>;
  sessionId: string;
  /** Current authenticated receiver/source socket; no authored destination override. */
  sessionMessageReplyPublisher?: Pick<ApiSessionClient, 'sessionId' | 'mutateSessionMessageReply' | 'publishSessionMessageReply'>;
  /** Current Session publisher supplied by the admitted host; never a human HTTP fallback. */
  postAgentDiscussionMessage?: Parameters<typeof createDiscussionActionDeps>[0]['postAgentMessage'];
  /** Exact live RPC owner for this bound Session; absent on Account/daemon action hosts. */
  invokeBoundSessionRpc?: (method: string, input: unknown, signal?: AbortSignal) => Promise<unknown>;
  /** One-use transport already resolved by this Goal RPC's admission owner. */
  initialSessionGoalTransport?: Extract<Awaited<ReturnType<typeof resolveSessionTransportContext>>, { ok: true }>;
  rawSession?: Readonly<{
    metadata?: unknown;
    metadataLayoutVersion?: unknown;
    path?: unknown;
    host?: unknown;
    machineId?: unknown;
    workDepth?: unknown;
  }> | null;
  getCurrentSessionBackendTarget?: (() => BackendTargetRefV2 | null | undefined) | null;
  getCurrentSessionMetadata?: () => Readonly<Record<string, unknown>> | null;
  /** Current delivered plan of this runner; absent on a remote Account client. */
  getCurrentSessionSkillItems?: () => readonly SessionSkillReadItemV1[] | null;
  getCurrentAppliedChildSelection?: () => Promise<import('@/agent/runtime/bridges/executionRun/runtime/openInputs').ExecutionRunAppliedParentSelection> | import('@/agent/runtime/bridges/executionRun/runtime/openInputs').ExecutionRunAppliedParentSelection;
  getCurrentSessionWorkDepth?: () => number | undefined;
  getAgentStartRunCaller?: () => import('./resolveCliAgentStartContextV1').AgentStartRunCallerBinding | null;
  getCurrentTurnWorkDepth?: (expectedTurnId?: string) => number | undefined;
  getCurrentResolvedRoles?: () => ResolvedRolesSnapshotV1;
  getCurrentWorkspaceWrites?: () => 'allow' | 'deny' | undefined;
  readRoleSources?: RoleSourceReader;
  readPluginRoles?: () => readonly PluginRoleContributionV1[];
  /** Already-admitted declarations from this host's current executable registry lease; never wakes a daemon. */
  readPluginVoiceProviders?: () => readonly Readonly<{
    identity: Readonly<{ pluginId: string; localId: string }>;
    definition: unknown;
  }>[];
  prepareWorkspaceWritesPolicy?: RoleWorkspaceWritesPolicyPreparer;
  happyHomeDir?: string;
  resolveAutomationEventAdoptedDefinitionSet?: ResolveAutomationEventAdoptedDefinitionSetV1;
  revalidatePluginActionCallerMaterialization?: RevalidatePluginActionCallerMaterialization;
  revalidatePluginActionCallerOccurrence?: RevalidatePluginActionCallerOccurrence;
  isUsageLimitRecoveryEnabled?: (() => Promise<boolean> | boolean) | null;
  externalSessionPluginAdmissionOwner?: ExternalSessionPluginAdmissionOwner;
  machineAdmissionTransport?: NonNullable<
    Parameters<typeof sendSessionMessage>[0]['machineAdmissionTransport']
  >;
  sessionSpawnDirectTargetTransport?: SessionSpawnDirectTargetTransport;
  machineActionDirectTargetTransport?: MachineActionDirectTargetTransport;
  /** The CLI's explicit `--machine-id`; the one Machine an Account-owned read goes through when the host has no Session or daemon of its own. */
  explicitMachineId?: string;
  sessionActionRpcTransport?: SessionActionRpcTransport;
  /**
   * Read at dispatch time so the plugin runtime's declared Composer attachments
   * are reachable from the Session-input writer. It is absent for hosts that
   * run no plugin runtime, in which case a declared attachment is refused
   * rather than dropped.
   */
  resolveComposerAttachmentSendPreparation?: () => ComposerAttachmentSendPreparationRegistryV1 | null;
  /** Reads the daemon's already-retained snapshot for this exact Home. */
  resolveServerFeaturesSnapshot?: () =>
    | CliServerFeaturesSnapshot
    | undefined
    | Promise<CliServerFeaturesSnapshot | undefined>;
  /** Exact Home-bound policy/settings snapshot owned by the runtime constructor. */
  actionsSettingsProvider?: RuntimeActionSettingsProvider;
  /** Existing Account workflow family owner, shared with notification link checks. */
  workflowAction?: ActionExecutorDeps['workflowAction'];
  /** Exact committed contributed-Action owner supplied by this host constructor. */
  invokeContributedAction?: ActionExecutorDeps['invokeContributedAction'];
  /** Current plugin notification owner from this host's executable registry lease. */
  resolvePluginNotifications?: () => Parameters<typeof dispatchActivityNotificationAsync>[0]['pluginNotifications'];
  resolveTeamCredentialResourceCatalog?: ResolveSpawnConnectedServicesTeamResourceCatalog;
  /**
   * Stored-content material this composition already holds for one exact
   * Session, for a host whose credentials carry no Account encryption material.
   * Passed straight to the Session-scoped Action owners that need it.
   */
  resolveExactSessionEncryptionMaterial?: (sessionId: string) => SessionTransportEncryptionMaterial | null;
  /** Existing daemon authority owner shared with coordinator effect currentness. */
  workflowAcceptedAuthorizationCurrentness?: (input: Readonly<{
    authorization: import('@happier-dev/protocol').WorkflowAcceptedAuthorizationV1;
    signal?: AbortSignal;
  }>) => boolean | Promise<boolean>;
}> & SessionStoredContentCryptoContext & ExternalActionHomeBinding & CliActionExactHomeTarget,
  readEffectiveDeps?: () => ActionExecutorDeps,
): ActionExecutorDeps {
  const roleAccountScopeKey = params.serverHttpBaseUrl
    ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, () => resolveAccountSettingsScopeKeyForToken(params.token))
    : resolveAccountSettingsScopeKeyForToken(params.token);
  const roleAccountLifetimeToken = getActiveAccountSettingsSnapshotLifetimeToken();
  const readNotificationContext = async (signal?: AbortSignal) => {
    const credentials = params.credentials;
    if (!credentials) throw new NotificationChannelCatalogUnavailableError('unauthorized');
    const operation = params.savedSecretOperationContext;
    const home = operation?.serverHttpBaseUrl ?? params.serverHttpBaseUrl ?? resolveServerHttpBaseUrl();
    const scopeKey = runWithServerHttpBaseUrl(home, () => resolveAccountSettingsScopeKeyForToken(credentials.token));
    const readSnapshot = () => operation ? operation.readSnapshot() : getActiveAccountSettingsSnapshot();
    const lifetimeToken = getActiveAccountSettingsSnapshotLifetimeToken();
    const isCurrent = async () => !signal?.aborted && readSnapshot()?.scopeKey === scopeKey
      && (operation ? operation.credentials.token === credentials.token && await operation.isCurrent()
        : isActiveAccountSettingsSnapshotLifetimeCurrent({ scopeKey, lifetimeToken }))
      && (!params.isCredentialCurrent || await params.isCredentialCurrent());
    const assertCurrent = async () => {
      signal?.throwIfAborted();
      if (!await isCurrent()) throw new NotificationChannelCatalogUnavailableError('scope-retired');
    };
    await assertCurrent();
    let snapshot = readSnapshot();
    if (!snapshot) throw new NotificationChannelCatalogUnavailableError('scope-retired');
    if (!snapshot.notificationChannelCatalog || snapshot.notificationChannelCatalog.status === 'loading') {
      if (operation) {
        const catalog = await hydrateNotificationChannelCatalogForOperation({ operationContext: operation, signal, assertCurrent });
        if (catalog.status === 'unavailable' && catalog.reason === 'scope-retired') throw new NotificationChannelCatalogUnavailableError('scope-retired');
      } else {
        await runWithServerHttpBaseUrl(home, () => hydrateNotificationChannelCatalogForActiveAccount({ credentials, scopeKey, lifetimeToken, signal }));
      }
      await assertCurrent();
      snapshot = readSnapshot();
    }
    if (!snapshot) throw new NotificationChannelCatalogUnavailableError('scope-retired');
    const captured = snapshot;
    return { settings: captured.settings, notificationChannelCatalog: captured.notificationChannelCatalog ?? { status: 'loading' as const },
      savedSecretMaterializer: createSavedSecretMaterializerFromSnapshotV1(captured,
        operation ? { isCurrent: () => operation.readSnapshot() === captured } : undefined), isCurrent };
  };
  const notificationFailure = (error: unknown) => {
    if (error instanceof NotificationChannelCatalogUnavailableError) return { ok: false as const,
      errorCode: error.code, error: 'Notification channel catalog is unavailable', details: { reason: error.reason } };
    if (error instanceof SavedSecretResolutionError) return { ok: false as const,
      errorCode: error.code, error: 'Notification signing material is unavailable', details: { reason: error.status } };
    throw error;
  };
  const roleSettingsProvider = params.actionsSettingsProvider ?? createActionSettingsProvider({ scopeKey: roleAccountScopeKey });
  const readAccountRoleOverrides = () => {
    if (params.savedSecretOperationContext) {
      const snapshot = params.savedSecretOperationContext.readSnapshot();
      return snapshot ? readAccountRoleOverridesFromSnapshot(snapshot)
        : { status: 'unavailable' as const, reason: 'scope-retired' as const };
    }
    return roleSettingsProvider.getAccountRoleOverrides?.()
      ?? { status: 'unavailable' as const, reason: 'source-unavailable' };
  };
  const prepareAccountRoleOverrides = async (signal?: AbortSignal): Promise<void> => {
    const sessionRoles = params.getSessionRoleContext?.();
    if (sessionRoles) { await runWithoutRequesterSessionCurrentnessCheckpoint(() => sessionRoles.prepare(signal, true)); return; }
    const credentials = params.credentials;
    if (!credentials) return;
    const prepare = () => prepareActiveAccountRoleOverrides({ credentials,
      scopeKey: roleAccountScopeKey, lifetimeToken: roleAccountLifetimeToken, signal,
      operationContext: params.savedSecretOperationContext });
    const prepared = await (params.serverHttpBaseUrl ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, prepare) : prepare());
    if (prepared.status === 'unavailable' && prepared.reason === 'scope-retired') {
      throw Object.assign(new Error('account_role_overrides_unavailable'), {
        code: 'account_role_overrides_unavailable', reason: 'scope-retired',
      });
    }
  };
  const readReadyAccountRoleOverrides = (signal?: AbortSignal) => params.getSessionRoleContext?.().readAccountOverrides(signal)
    ?? readPreparedAccountRoleOverrides({ read: readAccountRoleOverrides, prepare: prepareAccountRoleOverrides }, signal);
  // Re-formed once so the proven pair travels to every Home-bound owner
  // together; the two params fields decorrelate as soon as they are spread apart.
  const exactHome: CliActionExactHomeTarget =
    params.serverId !== undefined && params.serverHttpBaseUrl !== undefined
      ? { serverId: params.serverId, serverHttpBaseUrl: params.serverHttpBaseUrl }
      : {};
  const readServerFeaturesSnapshot = async (): Promise<CliServerFeaturesSnapshot | undefined> =>
    await params.resolveServerFeaturesSnapshot?.();
  const projectHomeId = params.serverId ?? configuration.activeServerId;
  const actionHomeId = params.serverIdentityId ?? projectHomeId;
  const resolveProjectHomeIdentity = async () => await resolveServerProfileHomeIdentityId(projectHomeId) ?? actionHomeId;
  const isSameActionHomeId = (serverId: string) => areServerProfileIdentifiersEquivalent(actionHomeId, serverId, identifier =>
    identifier === projectHomeId || identifier === params.serverIdentityId ? params.serverIdentityId : undefined);
  const projectHomeAdmission = async (serverId?: string, context?: ActionExecutorContext) => {
    if ((serverId !== undefined && !await isServerProfileHomeIdentity(projectHomeId, serverId.trim()))
      || (context?.serverId && !await isServerProfileHomeIdentity(projectHomeId, context.serverId))
      || (params.serverId === undefined && configuration.activeServerId !== projectHomeId)) {
      return executionRunActionFailure('server_scope_mismatch');
    }
    return null;
  };
  const projectAccountAdmission = async (serverId?: string, context?: ActionExecutorContext) => {
    const homeDenied = await projectHomeAdmission(serverId, context);
    if (homeDenied) return homeDenied;
    const authorization = context?.externalActionExecutionAuthorization;
    if (authorization) {
      const account = authorization.requesterAccountProjection;
      const http = authorization.requesterHttpProjection;
      if (!account || !http || account.accountId !== authorization.binding.accountId || http.accountId !== account.accountId
        || account.serverId !== projectHomeId || http.serverId !== projectHomeId
        || http.serverHttpBaseUrl.replace(/\/+$/, '') !== (params.serverHttpBaseUrl ?? resolveServerHttpBaseUrl()).replace(/\/+$/, '')
        || context?.externalActionCredential && context.externalActionCredential.accountId !== account.accountId
        || context?.runtimeAccountId && context.runtimeAccountId !== account.accountId) {
        return executionRunActionFailure('project_requester_authority_unavailable');
      }
      return null;
    }
    // Public principal equality does not establish private requester custody.
    // External actions must arrive with the admitted host-private projection.
    if (context?.externalActionCredential) return executionRunActionFailure('project_requester_authority_unavailable');
    if (!params.credentials) return executionRunActionFailure('not_authenticated');
    const accountId = readAccountIdFromToken(params.credentials.token);
    if (context?.rpcSessionAuthorization && !context.runtimeAccountId) {
      return executionRunActionFailure('project_requester_authority_unavailable');
    }
    if (context?.runtimeAccountId && context.runtimeAccountId !== accountId) {
      return executionRunActionFailure('project_requester_authority_unavailable');
    }
    return null;
  };
  const withProjectHome = <T>(operation: () => Promise<T>): Promise<T> => runWithServerHttpBaseUrl(
    params.serverHttpBaseUrl ?? resolveServerHttpBaseUrl(), operation,
  );
  const projectRowsAuthority = (context?: ActionExecutorContext, effectActionId?: string, signal?: AbortSignal): ProjectAccountRowsInput => {
    const authorization = context?.externalActionExecutionAuthorization;
    if (authorization) return { authorization, effectActionId: effectActionId ?? authorization.binding.actionId,
      serverId: projectHomeId, ...(signal ? { signal } : {}) };
    if (!params.credentials) throw Object.assign(new Error('not_authenticated'), { code: 'not_authenticated' });
    return { credentials: params.credentials, serverId: projectHomeId, ...(signal ? { signal } : {}) };
  };
  const assertProjectRequesterCurrent = async (context?: ActionExecutorContext) => {
    const authorization = context?.externalActionExecutionAuthorization;
    if (!authorization) return;
    if (await projectAccountAdmission(projectHomeId, context)
      || !await authorization.requesterAccountProjection!.isCurrent() || !await authorization.requesterHttpProjection!.isCurrent()) {
      throw Object.assign(new Error('project_requester_authority_unavailable'), { code: 'project_requester_authority_unavailable' });
    }
    context?.signal?.throwIfAborted();
  };
  const readProjectRows = async (signal?: AbortSignal, context?: ActionExecutorContext, effectActionId?: string) => {
    return await withProjectHome(() => readProjectAccountRows(projectRowsAuthority(context, effectActionId, signal)));
  };
  const readProjectRequesterArtifact = async (ref: Parameters<NonNullable<ExternalActionExecutionAuthorizationV1['requesterAccountProjection']>['readArtifact']>[0],
    options: Readonly<{ signal?: AbortSignal }> | undefined, context: ActionExecutorContext) => {
    const authorization = context.externalActionExecutionAuthorization;
    if (!authorization) return null;
    await assertProjectRequesterCurrent(context);
    const artifact = await authorization.requesterAccountProjection!.readArtifact(ref, options);
    await assertProjectRequesterCurrent(context);
    return artifact?.artifactId === ref.artifactId ? artifact : null;
  };
  const resolveServerRequestHeaders = (
    context: ActionExecutorContext | undefined,
    effectActionId: string,
    request: Readonly<{ method: string; path: string; body?: unknown }>,
  ): Readonly<Record<string, string>> | null => {
    const resolved = resolveExternalActionServerRequestHeaders({
      context,
      effectActionId,
      method: request.method,
      path: request.path,
      ...(request.body === undefined ? {} : { body: request.body }),
      daemonToken: params.token,
      serverIdentityId: params.serverIdentityId,
      ...(params.externalActionMachineRequestPrivateKey
        ? { privateKey: params.externalActionMachineRequestPrivateKey }
        : {}),
      ...(params.externalActionMachineInstallationId
        ? { installationId: params.externalActionMachineInstallationId }
        : {}),
    });
    return resolved.ok ? resolved.headers : null;
  };
  const prepareSourceKeyAfterCommit = async (input: Readonly<{
    effectActionId: 'session.manager.set' | 'session.spawn_new';
    sourceSessionId: string;
    destinationSessionId: string;
    context?: ActionExecutorContext;
    signal?: AbortSignal;
  }>): Promise<SessionFollowSourceKeyPreparationResultV1> => {
    if (!params.credentials) return { kind: 'waiting', reason: 'runner_unreachable', cause: 'credentials_unavailable' };
    if (!input.context) return { kind: 'waiting', reason: 'runner_unreachable', cause: 'action_context_unavailable' };
    try {
      return await createSessionFollowSourceKeyPreparationAfterSet({
        credentials: params.credentials,
        effectActionId: input.effectActionId,
        ...(params.serverHttpBaseUrl ? { serverHttpBaseUrl: params.serverHttpBaseUrl } : {}),
        ...(params.serverIdentityId ? { serverIdentityId: params.serverIdentityId } : {}),
        ...(params.resolveServerFeaturesSnapshot ? { resolveServerFeaturesSnapshot: params.resolveServerFeaturesSnapshot } : {}),
        ...(params.externalActionMachineRequestPrivateKey ? { externalActionMachineRequestPrivateKey: params.externalActionMachineRequestPrivateKey } : {}),
        ...(params.externalActionMachineInstallationId ? { externalActionMachineInstallationId: params.externalActionMachineInstallationId } : {}),
      })({ sourceSessionId: input.sourceSessionId, destinationSessionId: input.destinationSessionId,
        context: input.context, ...(input.signal ? { signal: input.signal } : {}) });
    } catch {
      return { kind: 'waiting', reason: 'runner_unreachable', cause: 'preparation_exception' };
    }
  };
  const roleArtifactStore = params.credentials ? createCredentialedAccountArtifactStore(params.credentials) : undefined;
  const homeAccountId = params.credentials ? readAccountIdFromToken(params.credentials.token) : null;
  // Widget surfaces are shared Home addresses, not this device's credential profile.
  const widgetHomeId = params.serverIdentityId ?? params.serverId ?? configuration.activeServerId;
  const accountCallerContext = (context: ActionExecutorContext): ActionExecutorContext => ({ ...context,
    ...(homeAccountId ? { runtimeAccountId: homeAccountId } : {}) });
  const artifactCallerContext = (context: ActionExecutorContext): ActionExecutorContext => ({ ...accountCallerContext(context),
    ...(!context.defaultSessionId && params.sessionId ? { defaultSessionId: params.sessionId } : {}) });
  const todoHomeServerId = params.serverId ?? configuration.activeServerId;
  const todoHomeBaseUrl = params.serverHttpBaseUrl ?? resolveServerHttpBaseUrl();
  const homeHubArtifactPort = roleArtifactStore && homeAccountId ? createHomeHubArtifactPortV1(createAcknowledgedAccountArtifactTransport(roleArtifactStore), {
    accountId: homeAccountId, readWidgets: (signal, layout) => readHomeWidgets(signal, layout),
  }) : null;
  const readRawRoleSettings = params.credentials ? async (options?: Readonly<{ requireCurrentNetwork: boolean }>) => {
    if (params.savedSecretOperationContext && !await params.savedSecretOperationContext.isCurrent()) {
      throw Object.assign(new Error('scope-retired'), { code: 'scope-retired' });
    }
    if (params.savedSecretOperationContext && !options?.requireCurrentNetwork) {
      const captured = params.savedSecretOperationContext.readSnapshot();
      if (!captured?.rawSettings || captured.source === 'none') {
        throw Object.assign(new Error('account_settings_content_unavailable'), { code: 'account_settings_content_unavailable' });
      }
      return captured.rawSettings;
    }
    const current = await bootstrapAccountSettingsContext({ credentials: params.credentials!, mode: 'blocking',
      ...(params.savedSecretOperationContext ? { publication: 'invocation' as const, refresh: 'force' as const, honorAccountSettingsModeEnv: false } : {}),
      ...(options?.requireCurrentNetwork ? { refresh: 'force', publication: 'invocation', honorAccountSettingsModeEnv: false } as const : {}) });
    if (!current.rawSettings || (options?.requireCurrentNetwork && current.source !== 'network')) {
      throw Object.assign(new Error('account_settings_content_unavailable'), { code: 'account_settings_content_unavailable' });
    }
    return current.rawSettings;
  } : undefined;
  const machineReferenceServerUrl = params.serverHttpBaseUrl ?? resolveServerHttpBaseUrl();
  const managedMachineReferences: NonNullable<ActionExecutorDeps['managedMachineReferences']> = async ({ input, context, signal }) => {
    const unavailable = (reason: MachineReferenceCensusV1['unavailable'][number]): MachineReferenceCensusV1 => ({
      homeId: input.homeId, machineId: null, coverage: 'partial', references: [], unavailable: [reason],
    });
    if (await projectAccountAdmission(projectHomeId, context) || !params.credentials || !roleArtifactStore || !readRawRoleSettings) {
      return unavailable('requester_authority');
    }
    return await runWithServerHttpBaseUrl(machineReferenceServerUrl, async () => {
      const headers = { ...buildCurrentAccountStoredContentCompatibilityHttpHeaders(), Authorization: `Bearer ${params.credentials!.token}` };
      let machine: ReturnType<typeof ManagedGetOutputV1Schema.parse>;
      try {
        const response = await axios.post(`${machineReferenceServerUrl}${managedMachineActionEndpointPathV1('machines.managed.get')}`,
          ManagedGetInputV1Schema.parse({ homeId: input.homeId, managedId: input.managedId }), { headers, signal });
        machine = ManagedGetOutputV1Schema.parse(response.data);
        if (machine.homeId !== input.homeId || machine.id !== input.managedId) return unavailable('target');
      } catch { return unavailable('target'); }
      let profileStore: ReturnType<typeof createCliProfileStore> | undefined;
      return await readMachineReferenceCensusV1({ homeId: input.homeId, machineId: machine.enrolledMachineId ?? null,
        homeAliases: [projectHomeId], signal }, {
        artifacts: roleArtifactStore,
        readSettings: async () => {
          await readRawRoleSettings();
          profileStore = params.savedSecretOperationContext
            ? createCliProfileStoreForOperation({ operationContext: params.savedSecretOperationContext, signal })
            : createCliProfileStore({ credentials: params.credentials!, signal });
          return (await profileStore.readSourceSnapshot()).raw;
        },
        readProfileCatalog: async () => {
          if (!profileStore) throw new Error('profile_catalog_unavailable');
          return await profileStore.readProfileCatalog();
        },
        readPools: async () => {
          const response = await axios.post(`${machineReferenceServerUrl}${machinePoolActionEndpointPathV1('machines.pools.list')}`, {}, { headers, signal });
          return MachinePoolListOutputV1Schema.parse(response.data);
        },
        readAssignments: cursor => listAutomationDefinitions({ token: params.credentials!.token, ...(cursor ? { cursor } : {}) }),
      });
    });
  };
  const launchProfilePublicationServerUrl = params.serverHttpBaseUrl ?? resolveServerHttpBaseUrl();
  const sourceReader = params.readRoleSources ?? createRoleSourceReader({
    artifactStore: roleArtifactStore, readPluginRoles: params.readPluginRoles,
    accountId: params.credentials ? readAccountIdFromToken(params.credentials.token) ?? undefined : undefined,
    readRawAccountSettings: readRawRoleSettings,
  });
  const readRoleSources: RoleSourceReader = async signal => {
    const read = () => params.serverHttpBaseUrl
      ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, () => sourceReader(signal)) : sourceReader(signal);
    // The built-in reader only lists/reads artifacts and, for this private
    // Account, reads captured Settings. Injected readers retain their own scope.
    const sources = await (params.savedSecretOperationContext && !params.readRoleSources
      ? runWithRequesterSessionCurrentnessCheckpoint(read, { readOnly: true })
      : runWithoutRequesterSessionCurrentnessCheckpoint(read));
    signal?.throwIfAborted();
    if (params.savedSecretOperationContext && !await params.savedSecretOperationContext.isCurrent()) {
      throw Object.assign(new Error('scope-retired'), { code: 'scope-retired' });
    }
    return sources;
  };
  const callerSessionResolution = (context: ActionExecutorContext): Parameters<typeof resolveCliActionCallerSession>[0] => ({
    context, credentials: params.credentials, boundSessionId: params.sessionId, resolveTransportForSession,
    readBoundSession: async () => {
      const metadata = await readCurrentSessionMetadata(context.signal);
      return { metadata, workDepth: params.getCurrentSessionWorkDepth?.() ?? params.rawSession?.workDepth,
        backendTarget: params.getCurrentSessionBackendTarget?.() ?? resolveBackendTargetFromSessionMetadata(metadata),
        machineId: await resolveCurrentSessionValue('machineId', context.signal), directory: await resolveCurrentSessionValue('path', context.signal) };
    },
  });
  const resolveActionCallerSession = async (context: ActionExecutorContext) => await resolveCliActionCallerSession(callerSessionResolution(context));
  let workflowAuthorityReader: typeof params.workflowAcceptedAuthorizationCurrentness;
  const isWorkflowAuthorizationCurrent = async (context: ActionExecutorContext): Promise<boolean> => {
    if (context.actionCaller?.kind !== 'workflowRun') return true;
    if (context.externalActionExecutionAuthorization?.binding.workflowActionOrigin) {
      const accountId = readAccountIdFromToken(params.token);
      return !!accountId && hasReceivedWorkflowSessionRoleAuthority({ context, accountId, sessionId: params.sessionId });
    }
    workflowAuthorityReader ??= params.workflowAcceptedAuthorizationCurrentness;
    if (!workflowAuthorityReader && params.credentials) {
      const accountId = readAccountIdFromToken(params.token);
      if (!accountId) return false;
      const { createCredentialedWorkflowAcceptedAuthorizationCurrentness } = await import('@/daemon/workflows/daemonRuntime');
      workflowAuthorityReader = createCredentialedWorkflowAcceptedAuthorizationCurrentness({
        credentials: params.credentials, accountId, serverId: params.serverId,
        serverHttpBaseUrl: params.serverHttpBaseUrl });
    }
    return workflowAuthorityReader ? await workflowAuthorityReader({ authorization: context.actionCaller.authorization,
      ...(context.signal ? { signal: context.signal } : {}) }) : false;
  };
  const resolveAgentStartContext: NonNullable<ActionExecutorDeps['resolveAgentStartContext']> = async (context, options) => {
    const binding = context.externalActionExecutionAuthorization?.binding;
    const workflowOrigin = binding?.workflowActionOrigin;
    const witness = workflowOrigin?.sessionAuthority;
    if (workflowOrigin || context.actionCaller?.kind === 'workflowRun') {
      if (!binding || !workflowOrigin || !witness || context.actionCaller?.kind !== 'workflowRun'
        || context.actionCaller.runId !== workflowOrigin.runId || context.actionRequestId !== binding?.requestId
        || binding.accountId !== readAccountIdFromToken(params.token)
        || binding.target.kind !== 'session' || binding.target.sessionId !== params.sessionId) return null;
      const settings = params.actionsSettingsProvider?.getAccountSettings?.();
      if (!settings) return null;
      return { caller: { kind: 'originless', runId: workflowOrigin.runId, runDepth: witness.runDepth,
          ...(witness.runOriginSessionId ? { runOriginSessionId: witness.runOriginSessionId } : {}) },
        baseline: { machineId: binding.machineId, directory: witness.directory },
        ledSubtreeSessionIds: [], roles: {}, callerPermissionCeiling: witness.authorization.admittedPermissionCeiling,
        workDepthLimit: settings.workDepthLimit, allowLists: settings.sessionAgentStartAllowListsV1 };
    }
    const session = await measureActionStartPhaseV1(context, 'caller_session', () => resolveActionCallerSession(context));
    const refuse = (reason: import('@happier-dev/protocol/workflows/workflowProgressV1').WorkflowTargetUnavailableReasonV1) => {
      context.recordActionStartDiagnostic?.({ phase: 'agent_start_context', refusalReason: reason });
      return null;
    };
    if (!session) return refuse('caller_session_unavailable');
    const runCaller = params.getAgentStartRunCaller?.();
    if (params.getAgentStartRunCaller && !runCaller) return refuse('caller_run_unavailable');
    const caller = context.actionCaller;
    const admittedCaller = caller?.kind === 'session'
      ? AgentStartSessionCallerV1Schema.safeParse(caller)
      : null;
    if (admittedCaller && !admittedCaller.success) return refuse('caller_witness_invalid');
    let starterDepth: unknown = admittedCaller?.success ? admittedCaller.data.starterDepth : session.workDepth;
    if (starterDepth === undefined && !runCaller) {
      try {
        const persisted = await fetchSessionById({ token: params.token, sessionId: session.sessionId });
        if (persisted && 'workDepth' in persisted) starterDepth = persisted.workDepth;
      } catch { return refuse('caller_depth_unavailable'); }
    }
    const turnId = context.sessionInputSource && typeof context.sessionInputSource === 'object'
      && 'sourceTurnId' in context.sessionInputSource && typeof context.sessionInputSource.sourceTurnId === 'string'
      ? context.sessionInputSource.sourceTurnId : undefined;
    const turnDepth = (admittedCaller?.success ? admittedCaller.data.turnDepth : params.getCurrentTurnWorkDepth?.(turnId))
      ?? (context.actionCaller?.kind !== 'session' && session.sessionId === params.sessionId
        && !params.getCurrentTurnWorkDepth ? 0 : undefined);
    if (turnDepth === undefined) return refuse('caller_depth_unavailable');
    // Scope admission consumes the same validated caller, not Agent launch
    // selections. Catalog hydration repeats requester authority round trips
    // without contributing any fact to the fresh Home subtree decision.
    const scopeOnly = options?.purpose === 'session_scope';
    const prepareStartReads = async () => {
      if (!scopeOnly) await measureActionStartPhaseV1(context, 'role_overrides', () => prepareAccountRoleOverrides(context.signal));
      const roleSources = scopeOnly ? undefined
        : await measureActionStartPhaseV1(context, 'role_sources', () => readRoleSources(context.signal));
      const settings = await measureActionStartPhaseV1(context, 'account_settings', async () =>
        params.actionsSettingsProvider?.getAccountSettings?.()
        ?? (params.credentials ? (await runWithoutRequesterSessionCurrentnessCheckpoint(() =>
          bootstrapAccountSettingsContext({ credentials: params.credentials!, mode: 'blocking' }))).settings : null));
      let appliedChildSelection: import('@/agent/runtime/bridges/executionRun/runtime/openInputs').ExecutionRunAppliedParentSelection | undefined;
      if (!scopeOnly && session.sessionId === params.sessionId && params.getCurrentAppliedChildSelection) {
        try { appliedChildSelection = await runWithoutRequesterSessionCurrentnessCheckpoint(() => params.getCurrentAppliedChildSelection!()); }
        catch { appliedChildSelection = { status: 'unavailable' }; }
      }
      const availableAgents = scopeOnly ? undefined : await measureActionStartPhaseV1(context, 'agent_inventory',
        () => inventoryDeps.agentsBackendsList({ includeDisabled: false }));
      return { roleSources, settings, appliedChildSelection, availableAgents };
    };
    // Built-in Role/Artifact, captured Settings and ACP reads join one bounded
    // observation. Their owners exclude migrations, source/history maintenance
    // and private publication; injected preparation above also leaves the scope.
    const { roleSources, settings, appliedChildSelection, availableAgents } = await (params.savedSecretOperationContext && !scopeOnly
      ? runWithRequesterSessionCurrentnessCheckpoint(prepareStartReads, { readOnly: true }) : prepareStartReads());
    context.signal?.throwIfAborted();
    if (!scopeOnly && params.savedSecretOperationContext && !await params.savedSecretOperationContext.isCurrent()) {
      return refuse('caller_session_unavailable');
    }
    context.signal?.throwIfAborted();
    return resolveCliAgentStartContextV1({
      recordActionStartDiagnostic: context.recordActionStartDiagnostic,
      sessionId: session.sessionId,
      machineId: session.machineId, directory: session.directory,
      backendTarget: session.backendTarget ?? null,
      metadata: session.metadata, starterDepth: typeof starterDepth === 'number' ? starterDepth : undefined, runCaller,
      appliedChildSelection,
      turnDepth,
      callerPermissionMode: context.callerPermissionMode ?? null, settings,
      accountRoleOverrides: readAccountRoleOverrides(),
      ...(scopeOnly ? { roles: {} } : {}),
      availableAgentTargetKeys: availableAgents?.items
        .filter((item) => item.enabled).map((item) => item.targetKey),
      roleSourceInventory: roleSources,
    });
  };
  const approvalsStore = params.credentials ? createCliApprovalsArtifactStore({ credentials: params.credentials,
    serverId: params.serverId ?? configuration.activeServerId, serverHttpBaseUrl: params.serverHttpBaseUrl,
    operationContext: params.savedSecretOperationContext }) : null;
  const pluginChangeService = params.pluginChangeService;
  const pluginChangeServices = pluginChangeService ? {
    requestUserPluginChange: (input: Parameters<typeof requestUserPluginChange>[0]) => requestUserPluginChange(input, {
      ensureDaemon: async () => undefined,
      requestChange: pluginChangeService.requestPluginChange,
      decideChange: pluginChangeService.decidePluginChange,
    }),
    decideUserPluginChange: (input: Parameters<typeof decideUserPluginChange>[0]) => decideUserPluginChange(input, {
      ensureDaemon: async () => undefined,
      readStatus: pluginChangeService.statusPluginChange,
      decideChange: pluginChangeService.decidePluginChange,
    }),
  } : {};
  const pluginInstallApprovalChangeServices = pluginChangeService ? {
    requestUserPluginChange: (input: Parameters<typeof requestUserPluginChange>[0]) => requestUserPluginChange(input, {
      ensureDaemon: async () => undefined,
      // The Action's ordinary approval remains authoritative even when this
      // exact source is already trusted by the daemon's install policy.
      requestChange: (request: Parameters<DaemonPluginChangeService['requestPluginChange']>[0],
        options?: Parameters<DaemonPluginChangeService['requestPluginChange']>[1]) =>
        pluginChangeService.requestPluginChange(request, { ...options, retainReview: true }),
      decideChange: pluginChangeService.decidePluginChange,
    }),
  } : {};
  const cancelRetainedPluginInstallReview = async (request: unknown): Promise<void> => {
    const pending = readPluginInstallApprovalPendingReview(readRecord(request).preview);
    if (!pending) return;
    try {
      await (pluginChangeServices.decideUserPluginChange ?? decideUserPluginChange)({ pendingChangeId: pending.pendingChangeId, decision: 'reject' });
    } catch {
      // The daemon owns expiry. Artifact persistence remains authoritative even
      // when a best-effort cancellation transport is unavailable.
    }
  };
  const artifactApprovalStore = approvalsStore ? {
    ...approvalsStore,
    approvalsUpdate: async (args: Parameters<typeof approvalsStore.approvalsUpdate>[0]) => {
      const result = await approvalsStore.approvalsUpdate(args);
      if ((result as { ok?: false }).ok !== false && (args.request.status === 'rejected' || args.request.status === 'canceled')) {
        await cancelRetainedPluginInstallReview(args.request);
      }
      return result;
    },
  } : null;
  const executeSkillAction = async ({ actionId, input, context }: Parameters<NonNullable<ActionExecutorDeps['skillActionExecute']>>[0]) => {
      if (!approvalsStore || !params.credentials) return notSupported();
      const readFoundSkillBundle: NonNullable<Parameters<typeof createSkillActionExecuteV1>[0]['readFoundSkillBundle']> = async (machineId, path, signal) => {
        const localHome = await isServerProfileHomeIdentity(params.serverId ?? configuration.activeServerId, configuration.activeServerId);
        const localMachine = localHome ? await readCurrentMachineControlIdentity() : null;
        return createFoundSkillBundleReader({ machineId: localMachine?.machineId ?? null,
          machineRPC: (targetMachineId, method, request, transferSignal) => callMachineAction({ machineId: targetMachineId, method, request,
            context, authority: context.authority, effectActionId: actionId, exactMachine: true,
            ...(context.serverId ? { serverId: context.serverId } : {}),
            ...(context.rpcSessionAuthorization ? { authorization: context.rpcSessionAuthorization } : {}),
            ...(transferSignal ? { signal: transferSignal } : {}),
          }),
        })(machineId, path, signal);
      };
      const registry = createCliRegistryHostV1({ credentials: params.credentials, port: approvalsStore.promptLibraryStore.organization, signal: context.signal,
        operationContext: params.savedSecretOperationContext });
      const execute = createSkillActionExecuteV1({ store: approvalsStore.promptLibraryStore, skillRules: approvalsStore.skillRules, randomId: randomUUID, readFoundSkillBundle, readPluginSkills: approvalsStore.readPluginSkills,
        readRegistryItem: registry.readRegistryItem, readRegistrySource: registry.readRegistrySource,
        fetchRegistrySkillFiles: registry.filesForPointer, readLinkSkills: registry.readLinkSkills, fetchLinkSkillFiles: registry.fetchLinkSkillFiles,
        includeInSession: async (sessionId, skillId, signal) => {
          const port = createCliSessionCapabilitiesActionDeps({ credentials: params.credentials!,
            serverId: params.serverId ?? configuration.activeServerId, serverHttpBaseUrl: params.serverHttpBaseUrl ?? resolveServerHttpBaseUrl(),
            operationContext: params.savedSecretOperationContext, skillRules: approvalsStore.skillRules, callMachineAction,
            resolveAuthorizationHeaders: (_selectionActionId, caller, request) => resolveServerRequestHeaders(caller, actionId, request),
          }).sessionCapabilities!;
          return setSessionCapabilityV1({ port, request: { sessionId, kind: 'skill', id: skillId, state: 'on' },
            context: { ...context, ...(signal ? { signal } : {}) } });
        },
      });
      const caller = { surface: context.surface ?? null, ...(context.defaultSessionId ? { sessionId: context.defaultSessionId } : {}) };
      const operation = () => execute(actionId, input, caller, context.signal);
      return params.serverHttpBaseUrl ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, operation) : operation();
  };
  const readPromptInvocations = async (signal?: AbortSignal): Promise<Readonly<{ invocations: unknown; revision: number | 'absent'; assertCurrent: () => void }> | null> => {
    signal?.throwIfAborted();
    const credentials = params.credentials;
    if (!credentials) return null;
    const read = async () => {
      const store = createCliPromptLibraryStore({ credentials, signal });
      const catalog = await store.readPromptLibraryCatalog();
      const absent = (catalog.status === 'ready' || catalog.status === 'partial')
        && !catalog.rows.some(row => row.record.key === 'invocations')
        && !catalog.tombstones.some(row => row.key === 'invocations')
        && !catalog.diagnostics.some(row => row.key === 'invocations');
      const source = absent ? await store.readSourceSnapshot() : null;
      const current = readPromptLibraryCatalogRecordV1({ catalog, key: 'invocations', ...(source ? { rawSettings: source.raw } : {}) });
      store.assertCurrent();
      return current.status === 'ready' && current.record.key === 'invocations'
        ? { invocations: current.record.value, revision: current.revision, assertCurrent: store.assertCurrent } : null;
    };
    try { return await (params.serverHttpBaseUrl ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, read) : read()); }
    catch { signal?.throwIfAborted(); return null; }
  };
  const resolveSessionAgentIdentity = (metadata: Record<string, unknown> | null | undefined, backendTarget?: BackendTargetRefV2 | null) => {
    const agentId = backendTarget?.sourceKind === 'built_in'
      ? backendTarget.backendId : resolveAgentIdFromSessionMetadata(metadata);
    return agentId ? (backendTarget?.sourceKind === 'built_in' && isBundledAgentId(agentId) ? BUNDLED_AGENT_CONTRIBUTION_IDENTITIES[agentId]
      : readAgentCatalogSnapshot().agentDefinitionsById.get(agentId)?.identity) : undefined;
  };
  const invokeSessionPullRequestBinding = async (input: SessionPullRequestBindingInputV1, caller?: ActionExecutorContext) => {
    caller?.signal?.throwIfAborted();
    const transport = await resolveTransportForSession(input.sessionId, caller?.signal);
    if (!transport.ok) throw Object.assign(new Error('target_unavailable'), { code: 'target_unavailable' });
    const metadata = readTransportSessionOwnerMetadata(transport);
    const machineId = normalizeStringValue(transport.rawSession.machineId) ?? normalizeStringValue(metadata?.machineId);
    if (!machineId) throw Object.assign(new Error('target_unavailable'), { code: 'target_unavailable' });
    const action = { pluginId: 'happier.channels', localId: SESSION_PULL_REQUEST_BINDING_ACTION_ID_V1 };
    // The Account collection owns the link. Keep the actual invoking host's
    // caller/target authority; the Session identifies the binding, not a new principal.
    const context: ActionExecutorContext = { ...caller, defaultSessionId: input.sessionId };
    let response: unknown;
    if (params.invokeContributedAction) {
      const result = await params.invokeContributedAction({ action, input, context, ...(caller?.signal ? { signal: caller.signal } : {}) });
      if (!result.ok) throw Object.assign(new Error(result.errorCode), { code: result.errorCode });
      response = result.result;
    } else {
      if ((caller?.actionCaller && caller.actionCaller.kind !== 'host') || caller?.surface === 'agent' || caller?.surface === 'mcp') {
        throw Object.assign(new Error('target_unavailable'), { code: 'target_unavailable' });
      }
      response = await callMachineAction({ machineId, method: 'action.invoke',
        request: createTargetedActionRpcRequestV1({ action, input }, { kind: 'machine', machineId }, { defaultSessionId: input.sessionId }),
        ...(caller?.signal ? { signal: caller.signal } : {}) });
    }
    caller?.signal?.throwIfAborted();
    if (response !== null && typeof response === 'object' && 'ok' in response && response.ok === false) {
      const code = 'errorCode' in response && typeof response.errorCode === 'string' ? response.errorCode : 'target_unavailable';
      throw Object.assign(new Error(code), { code });
    }
    const parsed = SessionPullRequestBindingResultV1Schema.safeParse(response);
    if (!parsed.success) throw Object.assign(new Error('target_unavailable'), { code: 'target_unavailable' });
    if (parsed.data.kind === 'links' && parsed.data.sessionId !== input.sessionId) {
      throw Object.assign(new Error('target_unavailable'), { code: 'target_unavailable' });
    }
    return parsed.data;
  };
  const { sessionList, sessionFollowPreview } = params.credentials
    ? createSessionListActionDeps({
        ...(params.isCredentialCurrent ? { isCredentialCurrent: params.isCredentialCurrent } : {}),
        readWorkspaceRefs: async input => {
          const denied = await projectAccountAdmission(input.project?.serverId, input.context);
          if (denied) throw Object.assign(new Error(denied.errorCode), { code: denied.errorCode });
          const rows = await readProjectRows(input.signal, input.context, input.context.externalActionExecutionAuthorization?.binding.actionId ?? 'session.list');
          await assertProjectRequesterCurrent(input.context);
          return rows.workspaceRefs;
        },
        credentials: params.credentials,
        ...(params.actionsSettingsProvider?.getAccountSettings
          ? { resolveAccountSettings: params.actionsSettingsProvider.getAccountSettings }
          : {}),
        ...(params.serverId ? { serverId: params.serverId } : {}),
        ...(params.serverIdentityId ? { serverIdentityId: params.serverIdentityId } : {}),
        ...(params.serverHttpBaseUrl ? { serverHttpBaseUrl: params.serverHttpBaseUrl } : {}),
        ...(params.externalActionMachineRequestPrivateKey
          ? { externalActionMachineRequestPrivateKey: params.externalActionMachineRequestPrivateKey }
          : {}),
        ...(params.externalActionMachineInstallationId
          ? { externalActionMachineInstallationId: params.externalActionMachineInstallationId }
          : {}),
      })
    : { sessionList: async () => ({ ok: false as const, errorCode: 'not_authenticated', error: 'not_authenticated' }),
      sessionFollowPreview: async () => ({ ok: false as const, errorCode: 'not_authenticated', error: 'not_authenticated' }) };
  let workflowTriggers: ReturnType<typeof createCliWorkflowTriggerActions> | null = null;
  let resolveWorkflowMaterializer: ReturnType<typeof createCredentialedWorkflowMaterializationHostV1> | null = null;
  const workflowDefinitions = params.credentials
    ? createWorkflowDefinitionActions({ artifactStore: roleArtifactStore!,
      readWorkflowTriggerSummaries: () => {
        if (!workflowTriggers) throw Object.assign(new Error('target_unavailable'), { code: 'target_unavailable' });
        return workflowTriggers.readWorkflowSummaries();
      },
      resolveMaterializer: (target) => {
        if (!resolveWorkflowMaterializer) throw Object.assign(new Error('target_unavailable'), { code: 'target_unavailable' });
        return resolveWorkflowMaterializer(target);
      },
      removeWorkflowTriggers: async (definitionId) => {
        if (!workflowTriggers) throw Object.assign(new Error('content_unavailable'), { code: 'content_unavailable' });
        await workflowTriggers.removeForWorkflow(definitionId);
      } })
    : null;
  if (params.credentials && workflowDefinitions) {
    workflowTriggers = createCliWorkflowTriggerActions({ credentials: params.credentials,
      sessionList,
      pullRequests: {
        listLinks: async (sessionId, caller) => {
          const result = await invokeSessionPullRequestBinding({ kind: 'list', sessionId }, caller);
          if (result.kind !== 'links') throw Object.assign(new Error('target_unavailable'), { code: 'target_unavailable' });
          return [...result.pullRequestLinks];
        },
        attach: async ({ sessionId, pullRequest, ...target }, caller) => {
          const result = await invokeSessionPullRequestBinding({ kind: 'attach', sessionId, pullRequest, target }, caller);
          if (result.kind !== 'attached') throw Object.assign(new Error('target_unavailable'), { code: 'target_unavailable' });
        },
        removeTrigger: async (input, caller) => {
          const result = await invokeSessionPullRequestBinding({ kind: 'removeTrigger', ...input }, caller);
          if (result.kind !== 'removed') throw Object.assign(new Error('target_unavailable'), { code: 'target_unavailable' });
        },
      },
      ...(params.serverHttpBaseUrl ? { serverHttpBaseUrl: params.serverHttpBaseUrl } : {}),
      resolveWorkflow: async (ref) => {
        const resolved = await resolveWorkflowDefinitionRefV1(ref, {
          readPluginWorkflows: workflowDefinitions.readPluginWorkflows,
          readArtifact: (definitionId, signal) => workflowDefinitions.get({ definitionId, ...(signal ? { signal } : {}) }),
        });
        if (!resolved) throw Object.assign(new Error('source_unavailable'), { code: 'source_unavailable' });
        return resolved.definition;
      },
      resolveSession: async (sessionId, caller, options) => {
        const transport = await resolveTransportForSession(sessionId, caller?.signal);
        if (!transport.ok) throw Object.assign(new Error('target_unavailable'), { code: 'target_unavailable' });
        const metadata = readTransportSessionOwnerMetadata(transport);
        const machineId = normalizeStringValue(transport.rawSession.machineId) ?? normalizeStringValue(metadata?.machineId);
        const directory = normalizeStringValue(metadata?.path) ?? normalizeStringValue(transport.rawSession.path);
        if (!machineId || !directory) throw Object.assign(new Error('target_unavailable'), { code: 'target_unavailable' });
        let nativeGoalOwner: boolean | null = transport.rawSession.active === true ? null : false;
        if (options?.checkNativeGoalOwner === true && transport.rawSession.active === true) {
          const result = await callSessionRpcForTransport(transport, SESSION_RPC_METHODS.SESSION_GOAL_GET,
            { capabilitiesOnly: true }, caller?.signal, null);
          if (result !== null && typeof result === 'object' && 'nativeGoalOwner' in result && typeof result.nativeGoalOwner === 'boolean') {
            nativeGoalOwner = result.nativeGoalOwner;
          }
        }
        const identity = resolveSessionAgentIdentity(metadata, resolveBackendTargetFromSessionMetadata(metadata));
        const selection = identity ? WorkflowStepExecutionSelectionSchema.safeParse({
          agentTarget: { kind: 'agent', identity }, ...(metadata?.permissionMode ? { permissionMode: metadata.permissionMode } : {}),
        }) : null;
        return { project: { machineId, directory }, nativeGoalOwner,
          ...(selection?.success ? { executionSelection: selection.data } : {}) };
      },
      resolveMaterializer: async (target, caller) => {
        if (!resolveWorkflowMaterializer) throw Object.assign(new Error('target_unavailable'), { code: 'target_unavailable' });
        return resolveWorkflowMaterializer({ ...target, signal: caller.signal });
      },
      resolveRunTrigger: async (runId) => {
        const raw = await workflowRunStorage.execute({ operation: 'get', runId });
        const run = raw !== null && typeof raw === 'object' && 'run' in raw ? WorkflowRunSummaryV1Schema.safeParse(raw.run) : null;
        if (!run?.success || run.data.id !== runId || run.data.origin.kind !== 'automation') return null;
        const origin = run.data.origin;
        return origin.originSessionId && origin.cause && 'triggerId' in origin.cause && origin.cause.triggerId
          ? { sessionId: origin.originSessionId, triggerId: origin.cause.triggerId, automationId: origin.automationId } : null;
      },
      resolveRunSource: async (source, caller) => {
        if (source.kind === 'workflow_run') {
          const raw = await workflowRunStorage.execute({ operation: 'get', runId: source.runId,
            ...(caller?.signal ? { signal: caller.signal } : {}) });
          const run = raw !== null && typeof raw === 'object' && 'run' in raw ? WorkflowRunSummaryV1Schema.safeParse(raw.run) : null;
          if (!run?.success || run.data.id !== source.runId) throw Object.assign(new Error('source_unavailable'), { code: 'source_unavailable' });
          return { terminal: isTerminalAutomationRunStateV3(run.data.state) };
        }
        let raw: unknown;
        if (source.sessionId) {
          const transport = await resolveTransportForSession(source.sessionId, caller?.signal);
          if (!transport.ok || readExecutionRunTransportMachineId(transport) !== source.machineId) {
            throw Object.assign(new Error('source_unavailable'), { code: 'source_unavailable' });
          }
          const observed = await getExecutionRun({ ...transport, token: params.token, sessionId: transport.sessionId,
            request: { runId: source.runId }, ...(caller?.signal ? { signal: caller.signal } : {}) });
          if (!observed.ok) throw Object.assign(new Error('source_unavailable'), { code: 'source_unavailable' });
          raw = observed.data;
        } else {
          raw = await callDetachedExecutionRunRpc(null, SESSION_RPC_METHODS.EXECUTION_RUN_GET,
            { runId: source.runId }, { targetMachineId: source.machineId, ...(caller?.signal ? { signal: caller.signal } : {}) });
        }
        const result = ExecutionRunGetResponseSchema.safeParse(raw);
        if (!result.success || result.data.run.runId !== source.runId) {
          throw Object.assign(new Error('source_unavailable'), { code: 'source_unavailable' });
        }
        return { terminal: isExecutionRunTerminalStatus(result.data.run.status) };
      },
    });
  }
  const pluginPermissionGrantAction = params.credentials
    ? createPluginPermissionGrantActionExecutor({
      credentials: params.credentials,
      ...(params.revalidatePluginActionCallerMaterialization
        ? { revalidateCallerMaterialization: params.revalidatePluginActionCallerMaterialization }
        : {}),
    })
    : null;
  const pluginWebhookAction = params.credentials
    ? createPluginWebhookActionExecutor({
      credentials: params.credentials,
      ...(params.revalidatePluginActionCallerMaterialization
        ? { revalidateCallerMaterialization: params.revalidatePluginActionCallerMaterialization }
        : {}),
    })
    : null;
  const automationConversationAction = params.credentials
    ? createAutomationConversationActionExecutor({
      credentials: params.credentials,
      ...(params.revalidatePluginActionCallerMaterialization
        ? { revalidateCallerMaterialization: params.revalidatePluginActionCallerMaterialization }
        : {}),
      ...(params.revalidatePluginActionCallerOccurrence
        ? { revalidateCallerOccurrence: params.revalidatePluginActionCallerOccurrence }
        : {}),
    })
    : null;
  const automationEventAction = params.credentials && params.resolveAutomationEventAdoptedDefinitionSet
    ? createAutomationEventActionExecutor({
      credentials: params.credentials,
      resolveAdoptedDefinitionSet: params.resolveAutomationEventAdoptedDefinitionSet,
      ...(params.revalidatePluginActionCallerMaterialization
        ? { revalidateCallerMaterialization: params.revalidatePluginActionCallerMaterialization }
        : {}),
      ...(params.revalidatePluginActionCallerOccurrence
        ? { revalidateCallerOccurrence: params.revalidatePluginActionCallerOccurrence }
        : {}),
    })
    : null;
  const reviewCommentAction = params.credentials
    ? createCliReviewCommentActionExecutorFromCredentials({ credentials: params.credentials })
    : null;
  type ResolvedSessionTransport = Extract<
    Awaited<ReturnType<typeof resolveSessionTransportContext>>,
    Readonly<{ ok: true }>
  >;
  const readTransportSessionOwnerMetadata = (transport: ResolvedSessionTransport) => params.credentials
    ? tryDecryptSessionOwnerMetadataView({ credentials: params.credentials,
        accountEncryptionMode: transport.accountEncryptionCurrentness.mode, rawSession: transport.rawSession })
    : null;
  type LifecycleHookSessionContext = Readonly<{
    machineId?: string;
    cwd?: string;
    workspaceId?: string;
  }>;

  const ambiguousSpawnActionRequestIds = new Set<string>();
  const isMachineActionServerScopeCurrent = async (input: Readonly<{
    serverId?: string | null;
    machineId?: ActionExecutorContext['executionRunTargetMachineId'];
    context?: ActionExecutorContext;
    signal?: AbortSignal;
  }>): Promise<boolean> => {
    if (!input.serverId || await isServerProfileHomeIdentity(params.serverId ?? configuration.activeServerId, input.serverId)) return true;
    const context = input.context;
    // Exact daemon replay retains the creator's profile label in its signed
    // proposal. Only that verified origin's current Home/Machine can interpret
    // the label; another input, Home or target is not a routing alias.
    if (!input.machineId || !context?.bypassApprovals || context.serverId !== input.serverId || !context.serverIdentityId
      || context.executionRunTargetMachineId !== input.machineId
      || params.machineActionDirectTargetTransport?.machineId !== input.machineId) return false;
    const current = await createCurrentMachineExecutionOriginContextResolver({
      serverUrl: params.serverHttpBaseUrl ?? resolveServerHttpBaseUrl(),
      resolveCurrentMachineId: () => params.machineActionDirectTargetTransport?.machineId ?? null,
    })(input.signal);
    return current?.machineId === input.machineId && current.serverIdentityId === context.serverIdentityId;
  };
  // Resource handlers require current Machine admission even on this daemon.
  // Derive every Action method from the canonical families; watches share that ingress.
  const authenticatedMachineIngressMethods = new Set<string>([
    ...[
      ...ACTION_ID_FAMILIES_V1.machine_work_summary,
      ...ACTION_ID_FAMILIES_V1.machine_vitals,
      ...ACTION_ID_FAMILIES_V1.machine_resources,
      ...ACTION_ID_FAMILIES_V1.machine_processes,
      ...ACTION_ID_FAMILIES_V1.machine_storage,
      ...ACTION_ID_FAMILIES_V1.machine_guard,
    ].flatMap(actionId => {
      const method = getActionSpec(actionId).bindings?.rpcMethod;
      return method ? [method] : [];
    }),
    RPC_METHODS.DAEMON_VITALS_WATCH, RPC_METHODS.DAEMON_PROCESSES_WATCH,
    RPC_METHODS.DAEMON_STORAGE_WATCH, RPC_METHODS.DAEMON_GUARD_WATCH,
    // Issuer-side approval has no receiving Machine stamp. Open's ordinary
    // Account replay must pass authenticated ingress, like resource effects.
    RPC_METHODS.PROJECTS_OPEN,
    // Configured-Agent jobs require receiving Machine admission, which local
    // approval replay does not carry. Direct-only hosts can still install
    // bundled tools; configured definitions remain refused without admission.
    ...(params.credentials ? [
      RPC_METHODS.DAEMON_AGENTS_INSTALL_START,
      RPC_METHODS.DAEMON_AGENTS_INSTALL_READ,
      RPC_METHODS.DAEMON_AGENTS_INSTALL_CANCEL,
    ] : []),
  ]);
  const callMachineAction = async (input: Readonly<{
    machineId: string;
    authority?: ActionExecutorContext['authority'];
    serverId?: string;
    method: string;
    request: unknown;
    authorization?: ActionExecutorContext['rpcSessionAuthorization'];
    signal?: AbortSignal;
    timeoutMs?: number | null;
    requestId?: string;
    reattachOnReconnect?: Parameters<typeof callMachineRpc>[0]['reattachOnReconnect'];
    exactMachine?: true;
    requireCurrentMachine?: true;
    context?: ActionExecutorContext & Pick<RpcLocalActionContext, 'requesterWorkAttributionV1' | 'operationReview'>;
    effectActionId?: string;
  }>): Promise<unknown> => {
    if (!await isMachineActionServerScopeCurrent(input)) {
      throw Object.assign(new Error('server_scope_mismatch'), { code: 'server_scope_mismatch' });
    }
    const direct = params.machineActionDirectTargetTransport;
    const externalRequest = input.context?.externalActionCredential !== undefined
      || input.context?.externalActionExecutionAuthorization !== undefined;
    if (externalRequest && (!params.externalActionMachineRequestPrivateKey || !params.externalActionMachineInstallationId
      || !input.effectActionId || !input.context?.externalActionExecutionAuthorization || !input.context.externalActionTarget)) {
      throw Object.assign(new Error('not_authenticated'), { code: 'not_authenticated' });
    }
    // Opened requester custody is host-private. Sending it back through a
    // serialized self-RPC drops its private readers; spend it at this installed owner.
    const requester = readRequesterAccountActionContext(input.context?.externalActionExecutionAuthorization);
    const admittedLocalRequester = requester?.authorization.binding.machineId === input.machineId;
    if (direct?.machineId === input.machineId && (!externalRequest || admittedLocalRequester)
      && !authenticatedMachineIngressMethods.has(input.method)) {
      const localActionContext: RpcLocalActionContext = {
        ...(admittedLocalRequester && input.effectActionId === 'session.open'
          && input.context?.actionCaller?.kind === 'session' && input.request
          && typeof input.request === 'object' && 'type' in input.request && input.request.type === 'resume-session'
          ? { resumeActionContext: input.context } : {}),
        ...(input.context?.surface ? { surface: input.context.surface } : {}),
        ...(admittedLocalRequester && input.context?.externalActionExecutionAuthorization
          ? { externalActionExecutionAuthorization: input.context.externalActionExecutionAuthorization } : {}),
        ...(input.authority ? { authority: input.authority } : {}),
        ...(input.context?.callerPermissionMode !== undefined ? { callerPermissionMode: input.context.callerPermissionMode } : {}),
        ...(input.context?.causalPermissionAuthority !== undefined ? { causalPermissionAuthority: input.context.causalPermissionAuthority } : {}),
        ...(input.context?.callerInputConstraints ? { callerInputConstraints: input.context.callerInputConstraints } : {}),
        ...(input.context?.agentStartContext ? { agentStartContext: input.context.agentStartContext } : {}),
        ...(input.context?.agentStartWorkDepth !== undefined ? { agentStartWorkDepth: input.context.agentStartWorkDepth } : {}),
        ...(input.context?.agentStartWorkspaceWrites !== undefined ? { agentStartWorkspaceWrites: input.context.agentStartWorkspaceWrites } : {}),
        ...(input.context?.sessionAgentSpawnPolicyV1 !== undefined ? { sessionAgentSpawnPolicyV1: input.context.sessionAgentSpawnPolicyV1 } : {}),
        ...(input.context?.actionRequestId ? { actionRequestId: input.context.actionRequestId } : {}),
        ...(input.context?.executionRunWorkflowRunId ? { executionRunWorkflowRunId: input.context.executionRunWorkflowRunId } : {}),
        ...(input.context?.executionRunWorkflowScope ? { executionRunWorkflowScope: input.context.executionRunWorkflowScope } : {}),
        ...(input.context?.executionRunTargetMachineId ? { executionRunTargetMachineId: input.context.executionRunTargetMachineId } : {}),
        ...(input.context?.operationProgress ? { operationProgress: input.context.operationProgress } : {}),
        ...(input.context?.operationOwnerUpdate ? { operationOwnerUpdate: input.context.operationOwnerUpdate } : {}),
        ...(input.context?.operationAcceptance ? { operationAcceptance: input.context.operationAcceptance } : {}),
        ...(input.context?.operationCancellation ? { operationCancellation: input.context.operationCancellation } : {}),
        ...(input.context?.operationReview ? { operationReview: input.context.operationReview } : {}),
        ...(input.context?.requesterWorkAttributionV1 ? { requesterWorkAttributionV1: input.context.requesterWorkAttributionV1 } : {}),
      };
      const hasLocalActionContext = Object.keys(localActionContext).length > 0;
      return await direct.invoke(
        input.method,
        input.request,
        input.signal || hasLocalActionContext ? {
          ...(input.signal ? { signal: input.signal } : {}),
          ...(hasLocalActionContext ? { localActionContext } : {}),
        } : undefined,
      );
    }
    const invoke = input.exactMachine ? callExactMachineRpc : callMachineRpc;
    const requestId = input.requestId ?? input.context?.actionRequestId;
    const reviewedOpinionDirectoryRead = input.method === RPC_METHODS.DAEMON_SESSION_CREATION_DIRECTORY_PREFLIGHT
      && input.effectActionId === 'session.spawn_new'
      && requester?.authorization.binding.actionId === 'discussion.second_opinion.start';
    return await invoke({
      credentials: reviewedOpinionDirectoryRead ? requester.credentials : params.credentials!,
      machineId: input.machineId,
      method: input.method,
      request: input.request,
      ...(input.requireCurrentMachine ? { requireCurrentMachine: true } : {}),
      ...(requestId ? { requestId } : {}),
      ...(input.reattachOnReconnect ? { reattachOnReconnect: input.reattachOnReconnect } : {}),
      ...(externalRequest && input.context && input.effectActionId && params.externalActionMachineInstallationId
        && params.externalActionMachineRequestPrivateKey ? { externalAction: { context: input.context, effectActionId: input.effectActionId,
          installationId: params.externalActionMachineInstallationId, privateKey: params.externalActionMachineRequestPrivateKey } } : {}),
      ...(input.authorization ? { authorization: input.authorization } : {}),
      ...executionRunAuthorityCeiling(input),
      ...(input.signal ? { signal: input.signal } : {}),
      ...(input.timeoutMs === undefined ? {} : { timeoutMs: input.timeoutMs }),
    });
  };

  const resolveWidgetSessionTransport = async (sessionRef: Readonly<{ serverId: string; sessionId: string }>, signal?: AbortSignal) => {
    signal?.throwIfAborted();
    if (!isSameActionHomeId(sessionRef.serverId)) {
      throw Object.assign(new Error('server_scope_mismatch'), { code: 'server_scope_mismatch' });
    }
    const transport = await resolveTransportForSession(sessionRef.sessionId, signal);
    if (!transport.ok || transport.sessionId !== sessionRef.sessionId) {
      throw Object.assign(new Error('widget_catalog_unavailable'), { code: 'widget_catalog_unavailable' });
    }
    // The Home's current Account projection owns Session read authority.
    // Machine metadata alone does not admit a widget's hosting or selected Session.
    if (transport.rawSession.effectiveAccess?.capabilities.readTranscript !== true) {
      throw Object.assign(new Error('widget_read_denied'), { code: 'widget_read_denied' });
    }
    return transport;
  };
  const describeWidgetProjection = async (machineId: string, signal?: AbortSignal) => {
    const result = DaemonContributionRegistryProjectionDescribeResponseSchema.safeParse(await callMachineAction({
      machineId, serverId: params.serverId ?? configuration.activeServerId,
      method: RPC_METHODS.DAEMON_MERGED_CONTRIBUTION_REGISTRY_PROJECTION_DESCRIBE,
      request: { machineId }, ...(signal ? { signal } : {}),
    }));
    signal?.throwIfAborted();
    if (!result.success) throw Object.assign(new Error('widget_catalog_unavailable'), { code: 'widget_catalog_unavailable' });
    return result.data.projection;
  };
  // Home, Project and plugin-area widgets belong to the Account, not to a Session or this process's
  // Machine. A host with neither (a standalone CLI replaying an approved Action) reads the plugin
  // projection from the Machine the CLI names with its explicit selector, otherwise from a reachable
  // Account daemon. Account presence also lists daemons connected to other servers on a shared Account, so a
  // target-unavailable verdict moves to the next one; the Machine that answered is reused.
  let answeringAccountWidgetMachineId: string | undefined;
  const readAccountWidgetProjection = async (signal?: AbortSignal) => {
    if (answeringAccountWidgetMachineId) {
      try { return await describeWidgetProjection(answeringAccountWidgetMachineId, signal); }
      catch (error) {
        signal?.throwIfAborted();
        if (!isMachineRequestReachabilityFailureV1(error)) throw error;
        answeringAccountWidgetMachineId = undefined;
      }
    }
    const candidates = await listCurrentAccountAdministrationMachines({ token: params.token,
      ...(params.serverHttpBaseUrl ? { serverHttpBaseUrl: params.serverHttpBaseUrl } : {}),
      ...(params.explicitMachineId ? { requestedMachineId: params.explicitMachineId } : {}) }).catch(() => []);
    signal?.throwIfAborted();
    let unavailable: unknown;
    for (const machineId of candidates) {
      try {
        const projection = await describeWidgetProjection(machineId, signal);
        answeringAccountWidgetMachineId = machineId;
        return projection;
      } catch (error) {
        signal?.throwIfAborted();
        if (!isMachineRequestReachabilityFailureV1(error)) throw error;
        unavailable = error;
      }
    }
    if (unavailable) throw unavailable;
    return null;
  };
  const readWidgetProjection = async (signal?: AbortSignal, sessionRef?: Readonly<{ serverId: string; sessionId: string }>) => {
    signal?.throwIfAborted();
    const transport = sessionRef ? await resolveWidgetSessionTransport(sessionRef, signal) : null;
    const machineId = transport?.ok
      ? normalizeStringValue(readTransportSessionOwnerMetadata(transport)?.machineId)
      : params.machineActionDirectTargetTransport?.machineId ?? normalizeStringValue(await resolveCurrentSessionValue('machineId'));
    if (machineId) return await describeWidgetProjection(machineId, signal);
    return transport ? null : await readAccountWidgetProjection(signal);
  };
  const readWidgetCandidates = async (signal?: AbortSignal, sessionRef?: Readonly<{ serverId: string; sessionId: string }>) => {
    const projection = await readWidgetProjection(signal, sessionRef);
    return projection ? readCliWidgetCatalogProjectionV1(projection)
      : BUILTIN_WIDGET_DESCRIPTORS_V1.map(candidate => ({ ...candidate, fields: candidate.inputs?.fields ?? [], connectedAccountPurposeBindings: [] }));
  };
  const readHomeWidgets = async (signal?: AbortSignal, layout?: HomeHubLayoutValue) => {
    const candidates = await readWidgetCandidates(signal);
    const referenced = new Set(layout ? flattenWidgetLayoutWidgetsV1(layout.items).flatMap(({ instance }) => instance.definition.kind === 'artifact' ? [instance.definition.artifactId] : []) : []);
    if (referenced.size === 0) return candidates;
    const definitions = await actionDeps.widgetDefinitionArtifacts?.summaries([...referenced], signal) ?? [];
    return [...candidates, ...definitions.map(summary => ({
      key: `artifact:${summary.artifactId}`, homeDefault: 'available' as const,
      definition: { kind: 'artifact' as const, artifactId: summary.artifactId }, sizeDeclaration: summary.sizeDeclaration,
    }))];
  };

  // One admission for every read of the Account's Project rows by a widget input: the validator and the choices.
  const readAdmittedProjectRows = async (signal: AbortSignal | undefined, context: ActionExecutorContext | undefined, fallbackActionId: string) => {
    if (await projectAccountAdmission(widgetHomeId, context)) return null;
    const rows = await readProjectRows(signal, context, context?.externalActionExecutionAuthorization?.binding.actionId ?? fallbackActionId);
    await assertProjectRequesterCurrent(context);
    signal?.throwIfAborted();
    return await projectAccountAdmission(widgetHomeId, context) ? null : rows;
  };
  const inventoryDeps = createCliActionInventoryDeps({ ...params, callMachineAction,
    localMachineId: params.machineActionDirectTargetTransport?.machineId,
    authorizeConnectedAccountRequest: (context, request) => resolveServerRequestHeaders(context,
      context?.externalActionExecutionAuthorization?.binding.actionId ?? 'sessions.spawn.connected_services.list', request),
    readCurrentSessionMetadata: () => readCurrentSessionMetadata(),
    resolveTransportForSession: (id, signal) => resolveTransportForSession(id, signal),
  });
  const signInOperations = (target: Readonly<{ machineId: string; serverId?: string; signal?: AbortSignal }>): Parameters<typeof restartMachineAgentSignIn>[1] => {
    const { machineId, serverId, signal } = target;
    return {
      signal,
      prepare: (request) => callMachineAction({ machineId, serverId, method: AGENT_SIGN_IN_PREPARE_RPC_METHOD, request, signal }),
      beginConnect: async (command) => ConnectedAccountAttemptResponseSchema.parse(await callMachineAction({
        machineId, serverId, method: CONNECTED_ACCOUNT_AUTHENTICATION_COMMAND_RPC_METHOD, request: { v: 1, machineId, command }, signal,
      })),
      ensureTerminal: async (request) => DaemonTerminalEnsureResponseSchema.parse(await callMachineAction({
        machineId, serverId, method: RPC_METHODS.DAEMON_TERMINAL_ENSURE, request,
      })),
      listTerminals: async () => DaemonTerminalListResponseV1Schema.parse(await callMachineAction({
        machineId, serverId, method: RPC_METHODS.DAEMON_TERMINAL_LIST, request: {}, signal,
      })),
      // Cleanup must retain an acquired process even after the initiating request aborts.
      closeTerminal: async (terminalId) => DaemonTerminalCloseResponseSchema.parse(await callMachineAction({
        machineId, serverId, method: RPC_METHODS.DAEMON_TERMINAL_CLOSE, request: { terminalId },
      })),
    };
  };

  resolveWorkflowMaterializer = params.credentials && workflowDefinitions
    ? createCredentialedWorkflowMaterializationHostV1({
      credentials: params.credentials, readRoleSources,
      serverId: projectHomeId, serverIdentityId: params.serverIdentityId,
      savedSecretOperationContext: params.savedSecretOperationContext,
      ...(params.serverHttpBaseUrl ? { serverHttpBaseUrl: params.serverHttpBaseUrl } : {}),
      callMachineAction,
      readHostActionContract: async (actionId, target) => {
        const action = await readCompleteActionSpecV1({ actionId, ...(target.signal ? { signal: target.signal } : {}),
          read: async input => {
            const result = await requestDaemonSignedRootActionExecution({ actionId: 'action.spec.get', input,
              target: { kind: 'machine', machineId: target.machineId, project: { machineId: target.machineId, directory: target.directory } },
            }, target.signal ? { signal: target.signal } : {});
            if (!result.ok) throw new Error('action_contract_unavailable');
            return result.result;
          },
        });
        const inputSchema = StrictJsonValueSchema.safeParse(action.inputSchema);
        const outputSchema = StrictJsonValueSchema.safeParse(action.outputSchema);
        return inputSchema.success && outputSchema.success ? { inputSchema: inputSchema.data, outputSchema: outputSchema.data } : null;
      },
      readWorkflowDefinition: (ref, signal) => resolveWorkflowDefinitionRefV1(formatWorkflowDefinitionRefV1(ref), {
        readPluginWorkflows: workflowDefinitions.readPluginWorkflows,
        readArtifact: (definitionId, readSignal) => workflowDefinitions.get({ definitionId, ...(readSignal ? { signal: readSignal } : {}) }),
        ...(signal ? { signal } : {}),
      }),
    }) : null;

  const resolveWorkspaceSyncReadController = async (input: Readonly<{
    controllerMachineId?: string;
    workspaceRefId?: string;
    relationshipId?: string;
  }>, signal?: AbortSignal): Promise<string> => {
    if (!params.credentials) {
      throw Object.assign(new Error('Workspace sync read requires an authenticated Account'), { code: 'not_authenticated' });
    }
    const current = await readProjectRows(signal);
    const workspaceRefs = current.workspaceRefs;
    const relationships = current.relationships;
    const relationship = input.relationshipId ? relationships.find(entry => entry.relationshipId === input.relationshipId) : undefined;
    const selectedRefId = input.workspaceRefId ?? relationship?.alphaWorkspaceRefId;
    const selectedRef = selectedRefId ? resolveWorkspaceRefById(workspaceRefs, selectedRefId, params.serverIdentityId ?? projectHomeId)
      ?? resolveWorkspaceRefById(workspaceRefs, selectedRefId) : null;
    const currentServerId = selectedRef?.serverId ?? params.serverIdentityId ?? projectHomeId;
    const denied = await projectHomeAdmission(currentServerId);
    if (denied) throw Object.assign(new Error(denied.errorCode), { code: denied.errorCode });
    return resolveWorkspaceSyncReadControllerV1({ ...input, workspaceRefs, relationships, serverId: currentServerId });
  };

  const readCurrentSessionMetadata = createCliBoundSessionMetadataReader({ ...params,
    // Transport resolution is lazy; the owner is constructed later in this composition.
    resolveTransportForSession: (id, signal) => resolveTransportForSession(id, signal),
  });

  const resolveCurrentSessionValue = async (key: 'path' | 'host' | 'machineId', signal?: AbortSignal): Promise<string | null> => {
    const rawValue = params.rawSession?.[key];
    if (typeof rawValue === 'string' && rawValue.trim().length > 0) {
      return rawValue.trim();
    }

    const metadata = await readCurrentSessionMetadata(signal);
    const metadataValue = metadata?.[key];
    return typeof metadataValue === 'string' && metadataValue.trim().length > 0
      ? metadataValue.trim()
      : null;
  };

  const resolvePluginInstallWorkspaceRoot = async (input: unknown, signal?: AbortSignal) => {
    const request = readRecord(input);
    const source = readRecord(request.source);
    // Remote candidates and installed updates have no Session-relative trust
    // decision. Global callers must not look up a synthetic bound Session.
    if (source.kind === 'marketplace' || source.kind === 'installed'
      || request.kind === 'npm' || request.kind === 'archive') return undefined;
    return await resolveCurrentSessionValue('path', signal) ?? undefined;
  };

  const resolveWorkflowIngressContext = async (
    context: ActionExecutorContext,
  ): Promise<ReturnType<typeof WorkflowIngressContextV1Schema.parse> | undefined> => {
    const session = await resolveActionCallerSession(context);
    if (!session) return undefined;

    // The live Session client is the canonical current Agent authority for the
    // hosting Session. The synced Session record is a fallback for a field the
    // live context does not supply, never an unconditional prerequisite.
    const agentIdentity = resolveSessionAgentIdentity(session.metadata, session.backendTarget);
    const { machineId, directory } = session;
    return WorkflowIngressContextV1Schema.parse({
      ...(agentIdentity ? { agentTarget: { kind: 'agent', identity: agentIdentity } } : {}),
      ...(machineId ? { machineId } : {}),
      ...(directory ? { directory } : {}),
    });
  };

  const workflowRunServerHttpBaseUrl = params.serverHttpBaseUrl ?? resolveServerHttpBaseUrl();
  const createWorkflowRunStorage = (caller?: Parameters<NonNullable<ActionExecutorDeps['workflowAction']>>[0]): WorkflowAccountRunActionDeps['storage'] => ({
    observeChanges: (runId, onChange, onError) => createWorkflowRunStorageClient({
      token: params.token,
      serverHttpBaseUrl: workflowRunServerHttpBaseUrl,
    }).observeChanges(runId, onChange, onError),
    execute: async (operation, options) => {
      let machineId: string | undefined;
      const authorizationMachineId = caller?.context.externalActionExecutionAuthorization?.binding.machineId;
      if (isWorkflowRunExecutorStorageOperationV1(operation.operation) || authorizationMachineId) {
        const publisherMachineId = normalizeStringValue(options?.publisherMachineId);
        const operationMachineId = publisherMachineId ?? (typeof operation.machineId === 'string' && operation.machineId.trim()
          ? operation.machineId.trim()
          : null);
        if (authorizationMachineId && operationMachineId && authorizationMachineId !== operationMachineId) {
          throw Object.assign(new Error('target_unavailable'), { code: 'target_unavailable',
            details: { code: 'target_unavailable', reason: 'target_binding_mismatch' } });
        }
        const settingsMachineId = operationMachineId || authorizationMachineId ? null : normalizeStringValue((await readSettings()).machineId);
        const resolvedMachineId = operationMachineId ?? authorizationMachineId ?? settingsMachineId ?? await resolveCurrentSessionValue('machineId');
        if (!resolvedMachineId) throw Object.assign(new Error('target_unavailable'), { code: 'target_unavailable',
          details: { code: 'target_unavailable', reason: 'publisher_machine_unavailable' } });
        machineId = resolvedMachineId;
      }
      return await createWorkflowRunStorageClient({
        token: params.token,
        ...(machineId ? { machineId } : {}),
        serverHttpBaseUrl: workflowRunServerHttpBaseUrl,
        ...(caller ? { resolveAuthorizationHeaders: (request) => resolveServerRequestHeaders(caller.context, caller.actionId, request) } : {}),
      }).execute(
        operation as Parameters<ReturnType<typeof createWorkflowRunStorageClient>['execute']>[0],
        { ...(options?.signal ? { signal: options.signal } : {}),
          ...(authorizationMachineId ? { publisherMachineId: machineId } : {}) },
      );
    },
  });
  const workflowRunStorage = createWorkflowRunStorage();
  const resolveWorkflowRunEncryption = async (
    caller: Parameters<NonNullable<ActionExecutorDeps['workflowAction']>>[0],
    signal?: AbortSignal,
  ) => {
    const authorizationHeaders = resolveServerRequestHeaders(caller.context, caller.actionId, {
      method: 'GET', path: '/v1/account/encryption/currentness',
    });
    if (!authorizationHeaders) throw Object.assign(new Error('not_authenticated'), { code: 'not_authenticated' });
    const resolved = await resolveValidatedAutomationAccountEncryptionV1({
      signal: signal ?? new AbortController().signal,
      resolveAccountEncryptionCurrentness: async (currentnessSignal) => await fetchAccountEncryptionCurrentness({
        token: params.token,
        serverBaseUrl: workflowRunServerHttpBaseUrl,
        authorizationHeaders,
        ...(currentnessSignal ? { signal: currentnessSignal } : {}),
      }),
      resolveAccountEncryptionMaterial: async () => createAutomationAccountEncryptionMaterialSnapshotV1(params.credentials!),
    });
    if (resolved.kind !== 'available') throw Object.assign(new Error('content_unavailable'), { code: 'content_unavailable' });
    return resolved;
  };

  const workflowAction: ActionExecutorDeps['workflowAction'] | null = params.workflowAction ?? (workflowDefinitions && params.credentials
    ? async (args) => {
      // Each invocation retains its original proof; concurrent Session calls
      // must never spend another caller's authority through a shared closure.
      const workflowRunStorage = createWorkflowRunStorage(args);
      const execute = createWorkflowActionExecutor({
        onFailureDiagnostic: diagnostic => logger.infoFile(JSON.stringify(diagnostic)),
        isWorkflowFeatureEnabled: async () => {
          try {
            return isWorkflowRuntimeEnabled(process.env, await readServerFeaturesSnapshot());
          } catch {
            return false;
          }
        },
        resolveIngressContext: async (args) => await resolveWorkflowIngressContext(args.context),
        resolveTargetValidation: async (args) => {
          try {
            const machines = await listCurrentAccountMachines({
              token: params.token,
              ...(params.serverHttpBaseUrl ? { serverHttpBaseUrl: params.serverHttpBaseUrl } : {}),
              ...(args.context.signal ? { signal: args.context.signal } : {}),
            });
            const target = resolveExplicitSessionSpawnMachineTarget({
              machineId: args.input.target?.machineId,
              machines: machines.map((machine) => ({ machineId: machine.id })),
            });
            if (target.kind === 'resolved') return { targetValidation: 'checked' as const };
          } catch {
            // The canonical inventory owner reported an unavailable observation.
          }
          return {
            targetValidation: 'unavailable' as const,
            targetIssues: [{
              code: 'target_unavailable' as const,
              path: '/target/machineId',
              message: 'The requested Workflow target is unavailable.',
              severity: 'error' as const,
            }],
          };
        },
        definitions: workflowDefinitions,
        ...(workflowTriggers ? { triggers: workflowTriggers } : {}),
        runs: createWorkflowRunActionOwner({
          resolveDiscussionOrigin: async ({ origin, context }) => {
            const requester = readRequesterAccountActionContext(context.externalActionExecutionAuthorization);
            const credentials = requester?.credentials ?? params.credentials;
            if (!credentials || context.externalActionExecutionAuthorization && !requester) {
              throw Object.assign(new Error('run_access_denied'), { code: 'run_access_denied' });
            }
            if (requester && !await requester.isCurrent()) throw Object.assign(new Error('run_access_denied'), { code: 'run_access_denied' });
            const discussionAction = createDiscussionActionDeps({ credentials,
              serverId: projectHomeId, serverHttpBaseUrl: requester?.serverHttpBaseUrl ?? workflowRunServerHttpBaseUrl,
              ...(params.serverIdentityId ? { serverIdentityId: params.serverIdentityId } : {}),
              ...(params.externalActionMachineRequestPrivateKey ? { externalActionMachineRequestPrivateKey: params.externalActionMachineRequestPrivateKey } : {}),
              ...(params.externalActionMachineInstallationId ? { externalActionMachineInstallationId: params.externalActionMachineInstallationId } : {}),
              ...(params.resolveServerFeaturesSnapshot ? { resolveServerFeaturesSnapshot: params.resolveServerFeaturesSnapshot } : {}),
            }).discussionAction!;
            const result = await resolveWorkflowDiscussionOrigin({ origin, context, discussionAction, signal: context.signal }).catch(error => {
              context.signal?.throwIfAborted();
              const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
              throw Object.assign(new Error(code === 'invalid_reference_scope' ? 'invalid_reference_scope' : 'content_unavailable'), {
                code: code === 'invalid_reference_scope' ? 'invalid_reference_scope' : 'content_unavailable',
              });
            });
            if (requester && !await requester.isCurrent()) throw Object.assign(new Error('run_access_denied'), { code: 'run_access_denied' });
            return result;
          },
          resolveRunReportPolicy: async ({ context }) => {
            const requester = readRequesterAccountActionContext(context.externalActionExecutionAuthorization);
            const credentials = requester?.credentials ?? params.credentials;
            const accountId = context.externalActionExecutionAuthorization?.binding.accountId
              ?? (credentials ? readAccountIdFromToken(credentials.token) : null);
            if (!accountId || context.externalActionCredential && !requester) {
              throw Object.assign(new Error('content_unavailable'), { code: 'content_unavailable' });
            }
            return await createSessionRunReportPolicyReader({ serverId: projectHomeId,
              serverHttpBaseUrl: requester?.serverHttpBaseUrl ?? workflowRunServerHttpBaseUrl,
              accountId, readCredentials: async () => credentials ?? null,
              isCurrent: requester ? () => requester.isCurrent() : () => params.isCredentialCurrent?.() ?? true,
            })(context.signal);
          },
          resolveAgentStartContext,
          sessionList,
          inputTypeDeps: createCommittedInputTypeDeps(),
          resolveMaterializationContext: async (args, target) => {
            if (!resolveWorkflowMaterializer) throw Object.assign(new Error('target_unavailable'), { code: 'target_unavailable' });
            if (args.context.surface !== 'agent'
              && (!args.context.actionCaller || args.context.actionCaller.kind === 'host')
              && args.context.defaultSessionId) {
              const sessionId = args.context.defaultSessionId;
              const requester = readRequesterAccountActionContext(args.context.externalActionExecutionAuthorization);
              const credentials = requester?.credentials ?? params.credentials;
              if (!credentials || args.context.externalActionCredential && !requester) {
                throw Object.assign(new Error('source_unavailable'), { code: 'source_unavailable' });
              }
              const origin = await runWithServerHttpBaseUrl(requester?.serverHttpBaseUrl ?? workflowRunServerHttpBaseUrl,
                () => resolveWorkflowSessionConversation({ credentials, sessionId,
                  ...(args.context.signal ? { signal: args.context.signal } : {}),
                }));
              if (!origin || requester && !await requester.isCurrent()) {
                throw Object.assign(new Error('source_unavailable'), { code: 'source_unavailable' });
              }
              return await resolveWorkflowMaterializer({ ...target, signal: args.context.signal,
                roleSelection: projectWorkflowConversationRoleSelection(origin) });
            }
            const metadata = await readCurrentSessionMetadata();
            const baseline = (await resolveActionAgentStartContextV1({ resolveAgentStartContext }, args.context))?.baseline.configuration;
            return await resolveWorkflowMaterializer({ ...target, signal: args.context.signal,
              roleSelection: {
                sessionRoles: readSessionRolesV1(metadata) ?? undefined,
                defaultConnectedServices: baseline?.connectedServices,
                ...(baseline?.agentTarget ? { defaultEngine: { agentTargetKey: buildBackendTargetKeyV2(baseline.agentTarget),
                  ...(baseline.modelSelection ? { modelId: 'ref' in baseline.modelSelection
                    ? baseline.modelSelection.ref.modelId : baseline.modelSelection.modelId } : {}) } } : {}),
              },
            });
          },
          doesImmediateEligibleStepTargetSession: doesWorkflowImmediateEligibleStepTargetSession,
          resolveAccountId: async (signal) => args.context.externalActionExecutionAuthorization?.binding.accountId
            ?? await fetchChangesAccountId({
            token: params.token,
            serverHttpBaseUrl: workflowRunServerHttpBaseUrl,
            ...(signal ? { signal } : {}),
          }),
          storage: workflowRunStorage,
          definitions: workflowDefinitions,
          readPluginWorkflows: workflowDefinitions.readPluginWorkflows,
          resolveEncryption: (signal) => resolveWorkflowRunEncryption(args, signal),
          observeRecovery: async ({ run, progress, signal }) => await observeWorkflowInvocationRecoveryEvidence({
            credentials: params.credentials!, machineId: run.machineId, progress,
            getApproval: async artifactId => ({ artifactId,
              request: await approvalsStore?.approvalsGet({ artifactId, serverId: null }) }),
            getOperation: async (operation) => await callMachineAction({ serverId: operation.serverId,
              machineId: operation.machineId, method: ACTION_OPERATION_RPC_METHODS_V2.get,
              request: { operationId: operation.operationId }, exactMachine: true, ...(signal ? { signal } : {}) }),
            getRun: async (request) => await callDetachedExecutionRunRpc(null, SESSION_RPC_METHODS.EXECUTION_RUN_GET,
              request, { exactMachineId: run.machineId, ...(signal ? { signal } : {}) }),
            ...(signal ? { signal } : {}),
          }),
          reattachInvocation: async ({ run, index, signal }) => {
            const census = WorkflowRunRecipientCensusResponseV1Schema.parse(await workflowRunStorage.execute({
              operation: 'run-key.census', runId: run.id,
            }, signal ? { signal } : {}));
            const resolved = resolveWorkflowRunDataKeyV1({ encryption: await resolveWorkflowRunEncryption(args, signal), census });
            if (resolved.kind !== 'available') throw Object.assign(new Error('content_unavailable'), { code: 'content_unavailable' });
            const writer = createWorkflowInvocationRecoveryFactWriter({ accountId: census.ownerAccountId, run, expectedRevision: run.revision,
              encryption: resolved.encryption,
              onReviewEntered: createWorkflowRunReviewEntryNotificationHandler({
                expoPushSender: createWorkflowRunPushNotificationClient(params.token),
              }),
              storage: { execute: async (operation, options) => await workflowRunStorage.execute(operation, {
                ...options, publisherMachineId: run.machineId,
              }) },
              ...(signal ? { signal } : {}),
            });
            const invocation = await writer.readInvocation(index.id);
            if (!invocation || invocation.index.attempt !== index.attempt || invocation.index.lifecycle !== index.lifecycle) {
              throw Object.assign(new Error('workflow_invocation_fact_conflict'), { code: 'workflow_invocation_fact_conflict' });
            }
            const observe = createWorkflowInvocationRecoveryObserver({ credentials: params.credentials!, machineId: run.machineId,
              nativeActionOperations: {
                get: async (operation, observationSignal) => await callMachineAction({ serverId: operation.serverId,
                  machineId: operation.machineId, method: ACTION_OPERATION_RPC_METHODS_V2.get,
                  request: { operationId: operation.operationId }, exactMachine: true, ...(observationSignal ? { signal: observationSignal } : {}) }),
                cancel: async () => { throw Object.assign(new Error('workflow_observation_only'), { code: 'workflow_observation_only' }); },
                wait: async () => { throw Object.assign(new Error('workflow_observation_only'), { code: 'workflow_observation_only' }); },
              },
              nativeActionRuns: {
                get: async (runId, observationSignal) => await callDetachedExecutionRunRpc(null, SESSION_RPC_METHODS.EXECUTION_RUN_GET,
                  { runId, includeStructured: true }, { exactMachineId: run.machineId,
                    ...(observationSignal ? { signal: observationSignal } : {}) }),
                stop: async () => { throw Object.assign(new Error('workflow_observation_only'), { code: 'workflow_observation_only' }); },
                wait: async () => { throw Object.assign(new Error('workflow_observation_only'), { code: 'workflow_observation_only' }); },
              },
              actionExecutor: { execute: async (actionId, request, context) => {
                // This port is intentionally read-only: observation reattach
                // cannot reach the stop/send/start/resume effects.
                if (actionId === 'approval.request.get' && 'artifactId' in request) return { ok: true,
                  result: { artifactId: request.artifactId,
                    request: await approvalsStore?.approvalsGet({ artifactId: request.artifactId, serverId: null }) } };
                if (actionId !== 'execution.run.get' || !('runId' in request)) return { ok: false, errorCode: 'workflow_observation_only' };
                const native = await callDetachedExecutionRunRpc(null, SESSION_RPC_METHODS.EXECUTION_RUN_GET,
                  { runId: request.runId, includeStructured: false }, {
                    exactMachineId: run.machineId, ...(context.signal ? { signal: context.signal } : {}),
                  });
                return { ok: true, result: native };
              } },
            });
            const observation = await observe({ progress: invocation.progress, terminalParent: false,
              ...(invocation.progress.execution?.kind === 'action'
                ? { frozenActionContract: await writer.resolveFrozenActionContract(invocation) } : {}),
              cancellationRequested: invocation.index.lifecycle === 'cancel_requested', observationOnly: true,
              ...(signal ? { signal } : {}),
            });
            await writer.commitObservation(invocation, observation);
          },
          prepareWorkspace: async ({ projectTarget, definition }) => {
            if (!projectTarget.workspaceRefId) {
              return await prepareWorkflowAcceptedWorkspaceTarget({ projectTarget, definition });
            }
            const rows = await readProjectRows();
            const workspaceServerId = params.serverIdentityId ?? projectHomeId;
            return await prepareWorkflowAcceptedWorkspaceTarget({
              projectTarget,
              definition,
              currentServerId: workspaceServerId,
              resolveWorkspaceRef: (workspaceRefId) => resolveWorkspaceRefById(
                rows.workspaceRefs,
                workspaceRefId,
                workspaceServerId,
              ),
            });
          },
          restoreWorkspace: async (workspace) => await restoreRecordedWorkflowWorkspace({ workspace }),
          ...(params.workflowAcceptedAuthorizationCurrentness
            ? { isAcceptedAuthorizationCurrent: params.workflowAcceptedAuthorizationCurrentness }
            : {}),
        }),
      });
      return await execute(args);
    }
    : null);

  let currentMachineControlIdentityPromise: Promise<CurrentMachineControlIdentity> | null = null;

  const readCurrentMachineControlIdentity = async (): Promise<CurrentMachineControlIdentity> => {
    currentMachineControlIdentityPromise ??= (async () => {
      let machineId: string | null = null;
      try {
        machineId = normalizeStringValue((await readSettings()).machineId);
      } catch {
        machineId = null;
      }

      let host: string | null = null;
      try {
        host = normalizeStringValue(await getPreferredHostName());
      } catch {
        host = null;
      }

      return {
        machineId,
        host,
        homeDir: normalizeStringValue(homedir()),
      };
    })();
    return await currentMachineControlIdentityPromise;
  };

  const resolveSessionSpawnAgentInventorySelection: NonNullable<
    ActionExecutorDeps['resolveSessionSpawnAgentInventorySelection']
  > = ({ agentTarget }) => {
    const resolvedTarget = resolveSessionCreationAgentTarget(agentTarget);
    return resolvedTarget
      ? {
          agentId: resolvedTarget.agentId,
          backendTargetKey: buildBackendTargetKeyV2(resolvedTarget.backendTarget),
        }
      : null;
  };

  const requireLocalPromptActionMachine = async (machineId: string): Promise<Readonly<{
    ok: true;
  }> | Readonly<{
    ok: false;
    errorCode: 'machine_not_found';
    error: 'machine_not_found';
  }>> => {
    const current = await readCurrentMachineControlIdentity();
    return current.machineId === machineId
      ? { ok: true }
      : { ok: false, errorCode: 'machine_not_found', error: 'machine_not_found' };
  };

  const resolveTransportForSession = async (idOrPrefix: string, signal?: AbortSignal,
    caller?: Readonly<{ context: ActionExecutorContext; actionId: ActionId }>): Promise<ResolvedSessionTransport | Readonly<{
    ok: false;
    code: string;
    candidates?: string[];
  }>> => {
    signal?.throwIfAborted();
    if (!params.credentials) {
      return { ok: false, code: 'not_authenticated' };
    }

    const normalized = String(idOrPrefix ?? '').trim();
    if (!normalized) {
      return { ok: false, code: 'session_not_found' };
    }
    const serverFeaturesSnapshot = await readServerFeaturesSnapshot();
    const credentials = params.credentials;
    const read = () => resolveSessionTransportContext({
      credentials,
      idOrPrefix: normalized,
      ...(signal ? { signal } : {}),
      ...(caller ? { resolveAuthorizationHeaders: request => resolveServerRequestHeaders(caller.context, caller.actionId, request) } : {}),
      ...(serverFeaturesSnapshot ? { serverFeaturesSnapshot } : {}),
    });
    const resolved = await (caller ? withProjectHome(read) : read());
    if (!resolved.ok) {
      return {
        ok: false,
        code: resolved.code,
        ...(resolved.candidates ? { candidates: resolved.candidates } : {}),
      };
    }

    // A Session can move or lose access between Actions and between capability
    // preflight and admission. Resolve its current transport at each boundary.
    return resolved;
  };

  const resumeInactiveSessionTransport = async (input: Readonly<{
    transport: ResolvedSessionTransport;
    localId: string;
    effectActionId: 'execution.run.start' | 'session.open' | 'session.user_action.answer';
    context?: ActionExecutorContext;
    signal?: AbortSignal;
    waitForReady?: boolean;
    approvedNewDirectoryCreation?: boolean;
    resumeRequest?: SessionResumeRequestV1;
  }>) => {
    if (input.effectActionId === 'session.user_action.answer') {
      const metadata = readTransportSessionOwnerMetadata(input.transport);
      const admission = resolveSessionAutoResumeAdmissionV1({ metadata,
        archivedAt: input.transport.rawSession.archivedAt, authorityAvailable: metadata !== null,
        // The existing exact-Machine resume/RPC owners admit reachability next;
        // this lifecycle check must also precede the active-runner shortcut.
        machineAvailable: true,
      });
      if (admission !== 'eligible') return { ok: false,
        code: admission === 'archived' ? 'session_archived' as const
          : admission === 'machine_unavailable' ? 'unsupported' as const : admission,
        message: `Question host is unavailable: ${admission}`,
      } as const;
    }
    if (input.transport.rawSession.active === true && !input.resumeRequest) {
      return { ok: true } as const;
    }
    if (!params.credentials) {
      return {
        ok: false,
        code: 'unsupported',
        message: 'Inactive session resume requires authentication',
      } as const;
    }
    const metadata = readTransportSessionOwnerMetadata(input.transport) ?? {};
    const resumeControls = input.resumeRequest ? (() => {
      const { type: _type, sessionId: _sessionId, directory: _directory,
        agentTarget: _agentTarget, backendTarget: _backendTarget,
        executionAuthorization: _executionAuthorization, initialTranscriptAfterSeq: _initialTranscriptAfterSeq,
        spawnNonce: _spawnNonce, initialGoal: _initialGoal,
        approvedNewDirectoryCreation: _approvedNewDirectoryCreation, ...controls } = input.resumeRequest;
      return controls;
    })() : undefined;
    return await requestInactiveSessionResume({
      credentials: params.credentials,
      sessionId: input.transport.sessionId,
      localId: input.localId,
      rawSession: input.transport.rawSession,
      metadata,
      // Answering may wake its lost host, never clear a person's explicit Stop.
      ...(input.effectActionId === 'session.user_action.answer' ? { executionAuthority: 'account_automation' as const }
        : input.context?.authority ? { executionAuthority: input.context.authority } : {}),
      ...(input.effectActionId !== 'session.user_action.answer' && input.context ? { actionContext: input.context } : {}),
      ...(resumeControls ? { incomingOptions: resumeControls,
        ...(input.resumeRequest?.initialGoal ? { initialGoal: input.resumeRequest.initialGoal } : {}),
      } : {}),
      ...(input.signal ? { signal: input.signal } : {}),
      ...(input.waitForReady === true ? { waitForReady: true } : {}),
      ...(input.approvedNewDirectoryCreation === true ? { approvedNewDirectoryCreation: true } : {}),
      machineRpcTransport: (method, request, options) => callMachineAction({
        machineId: normalizeStringValue(input.transport.rawSession.machineId) ?? normalizeStringValue(metadata.machineId) ?? '',
        method, request, ...options, exactMachine: true, requireCurrentMachine: true,
        ...(input.context ? { context: input.context, authority: input.context.authority } : {}),
        effectActionId: input.effectActionId,
      }),
    });
  };

  type ExecutionRunActionTransportOptions = Readonly<{
    surface?: ActionExecutorContext['surface'];
    authority?: ActionExecutorContext['authority'];
    workDepth?: number;
    workspaceWrites?: 'allow' | 'deny';
    agentStartContext?: ActionExecutorContext['agentStartContext'];
    sessionAgentSpawnPolicyV1?: unknown;
    causalPermissionAuthority?: ActionExecutorContext['causalPermissionAuthority'];
    effectiveCallerPermissionMode?: string;
    serverId?: string | null;
    originSessionId?: string | null;
    targetMachineId?: string | null;
    exactMachineId?: string | null;
    signal?: AbortSignal;
    permissionRequestStore?: unknown;
    workflowObservationSink?: unknown;
    workflowRunId?: string;
    workflowScope?: NonNullable<ActionExecutorContext['executionRunWorkflowScope']>;
    requesterWorkAttributionV1?: RpcLocalActionContext['requesterWorkAttributionV1'];
  }>;
  function executionRunAuthorityCeiling(opts?: Pick<ExecutionRunActionTransportOptions, 'authority'>): Readonly<{
    authorityCeiling?: 'account_automation';
  }> {
    return opts?.authority === 'account_automation' ? { authorityCeiling: 'account_automation' } : {};
  }
  type ExecutionRunMachineTarget =
    | Readonly<{ ok: true; machineId: string }>
    | Readonly<{ ok: false; errorCode: 'execution_run_target_not_selected' | 'execution_run_target_unavailable' }>;

  const readExecutionRunTransportMachineId = (transport: ResolvedSessionTransport): string | null => {
    const metadata = readTransportSessionOwnerMetadata(transport);
    return normalizeStringValue(transport.rawSession.machineId)
      ?? normalizeStringValue(metadata?.machineId);
  };

  /**
   * Scope selection is authoritative before this point. This only resolves the
   * already-selected Session's daemon (or the caller's current device outside
   * a Session); it never scans, falls back, or accepts a machine id from Action
   * input.
   */
  const resolveExecutionRunMachineTarget = async (
    sessionId: string | null,
    opts?: ExecutionRunActionTransportOptions,
  ): Promise<ExecutionRunMachineTarget> => {
    const preflightMachineId = normalizeStringValue(opts?.exactMachineId);
    if (preflightMachineId) return { ok: true, machineId: preflightMachineId };

    // A bound host admits this target before Action dispatch. It is neither
    // mutable Action input nor a fallback candidate: V2 capability preflight
    // must interrogate this exact daemon before the resulting exactMachineId
    // pins every later control.
    const admittedMachineId = normalizeStringValue(opts?.targetMachineId);
    if (admittedMachineId) return { ok: true, machineId: admittedMachineId };

    const originSessionId = normalizeStringValue(opts?.originSessionId);
    const ownSessionId = readCliActionBoundSessionId(params.sessionId);
    const targetSessionId = sessionId ?? originSessionId ?? ownSessionId;

    if (targetSessionId) {
      const transport = await resolveTransportForSession(targetSessionId, opts?.signal);
      if (!transport.ok) return { ok: false, errorCode: 'execution_run_target_unavailable' };
      const machineId = readExecutionRunTransportMachineId(transport);
      return machineId
        ? { ok: true, machineId }
        : { ok: false, errorCode: 'execution_run_target_unavailable' };
    }

    const local = await readCurrentMachineControlIdentity();
    return local.machineId
      ? { ok: true, machineId: local.machineId }
      : { ok: false, errorCode: 'execution_run_target_not_selected' };
  };

  const requiresDirectExecutionRunTransport = (opts?: ExecutionRunActionTransportOptions) =>
    opts?.workDepth !== undefined || opts?.workspaceWrites !== undefined || opts?.permissionRequestStore !== undefined
      || opts?.workflowObservationSink !== undefined || opts?.workflowRunId !== undefined
      || opts?.requesterWorkAttributionV1 !== undefined || opts?.causalPermissionAuthority !== undefined
      || opts?.effectiveCallerPermissionMode !== undefined;

  const callDetachedExecutionRunRpc = async (
    sessionId: string | null,
    method: string,
    request: unknown,
    opts?: ExecutionRunActionTransportOptions,
  ): Promise<unknown> => {
    const isStart = method === SESSION_RPC_METHODS.EXECUTION_RUN_START;
    const failure = (code: string, runCreation: 'noRunCreated' | 'outcomeUnknown', message?: string) => ({
      ok: false as const,
      code,
      ...(message ? { message } : {}),
      ...(isStart
        ? { details: withExecutionRunStartFailureDetails(undefined, runCreation) }
        : {}),
    });
    if (!params.credentials) {
      return failure('not_authenticated', 'noRunCreated');
    }
    const target = await resolveExecutionRunMachineTarget(sessionId, opts);
    if (!target.ok) return failure(target.errorCode, 'noRunCreated');
    try {
      const direct = params.machineActionDirectTargetTransport;
      if (requiresDirectExecutionRunTransport(opts) && direct?.machineId !== target.machineId) {
        return failure('execution_run_target_unavailable', 'noRunCreated');
      }
      if (direct?.machineId === target.machineId) {
        return await direct.invoke(method, request, {
          ...(opts?.signal ? { signal: opts.signal } : {}),
          ...(params.requesterSessionBootstrap
            ? { rpcContext: { requesterSessionBootstrap: params.requesterSessionBootstrap } }
            : {}),
          localActionContext: {
            ...(opts?.surface ? { surface: opts.surface } : {}),
            ...(opts?.authority ? { authority: opts.authority } : {}),
            ...(opts?.workDepth === undefined ? {} : {
              surface: 'agent' as const,
              authority: 'account_automation' as const,
              agentStartWorkDepth: opts.workDepth,
              agentStartContext: opts.agentStartContext,
              sessionAgentSpawnPolicyV1: opts.sessionAgentSpawnPolicyV1,
              callerPermissionMode: opts.agentStartContext?.callerPermissionCeiling,
            }),
            // Retained sends have no start depth, but still carry their
            // admitted authority and current narrowed permission mode.
            ...(opts?.workDepth !== undefined || opts?.causalPermissionAuthority !== undefined
              ? { causalPermissionAuthority: opts.causalPermissionAuthority } : {}),
            ...(opts?.effectiveCallerPermissionMode !== undefined
              ? { callerPermissionMode: opts.effectiveCallerPermissionMode } : {}),
            ...(opts?.workspaceWrites === undefined ? {} : { agentStartWorkspaceWrites: opts.workspaceWrites }),
            ...(opts?.permissionRequestStore === undefined ? {} : { executionRunPermissionRequestStore: opts.permissionRequestStore }),
            ...(opts?.workflowObservationSink === undefined ? {} : { executionRunWorkflowObservationSink: opts.workflowObservationSink }),
            ...(opts?.workflowRunId ? { executionRunWorkflowRunId: opts.workflowRunId } : {}),
            ...(opts?.workflowScope ? { executionRunWorkflowScope: opts.workflowScope } : {}),
            ...(opts?.requesterWorkAttributionV1 ? { requesterWorkAttributionV1: opts.requesterWorkAttributionV1 } : {}),
          },
          ...(opts?.permissionRequestStore === undefined
            ? {}
            : { executionRunPermissionRequestStore: opts.permissionRequestStore }),
          ...(opts?.workflowObservationSink === undefined
            ? {}
            : { executionRunWorkflowObservationSink: opts.workflowObservationSink }),
          ...(opts?.workflowRunId ? { executionRunWorkflowRunId: opts.workflowRunId } : {}),
          ...(opts?.workflowScope ? { executionRunWorkflowScope: opts.workflowScope } : {}),
        });
      }
      const getRequest = method === SESSION_RPC_METHODS.EXECUTION_RUN_GET
        ? ExecutionRunGetRequestSchema.safeParse(request)
        : null;
      return await callMachineRpc({
        credentials: params.credentials,
        machineId: target.machineId,
        method,
        request,
        ...executionRunAuthorityCeiling(opts),
        ...(DETACHED_EXECUTION_RUN_CALLER_LIFECYCLE_METHODS.has(method)
          || getRequest?.success && Boolean(getRequest.data.waitForInputId || getRequest.data.waitForOutput)
          || method === SESSION_RPC_METHODS.EXECUTION_RUN_STREAM_READ
            && request !== null && typeof request === 'object' && 'waitForEvents' in request && request.waitForEvents === true
          ? { timeoutMs: null }
          : {}),
        ...(opts?.signal ? { signal: opts.signal } : {}),
      });
    } catch (error) {
      const requestDisposition = readMachineRpcRequestDisposition(error);
      const runCreation = requestDisposition === 'notSent'
        ? 'noRunCreated'
        : 'outcomeUnknown';
      if (
        method === SESSION_RPC_METHODS.EXECUTION_RUN_SEND
        && requestDisposition !== 'notSent'
      ) {
        return failure(
          'execution_run_send_outcome_unknown',
          'outcomeUnknown',
          'The execution-run input may have been accepted before its response failed',
        );
      }
      if (isExecutionRunActionAbort(error, opts?.signal)) {
        return failure('cancelled', runCreation);
      }
      return failure('execution_run_target_unavailable', runCreation);
    }
  };

  const readExecutionRunProtocolV2 = async (
    sessionId: string | null,
    requirement: ExecutionRunProtocolV2Requirement,
    opts?: ExecutionRunActionTransportOptions,
  ): Promise<
    | Readonly<{ ok: true; exactMachineId: string }>
    | Readonly<{ ok: false; errorCode: string; error: string }>
  > => {
    if (!params.credentials) {
      return executionRunActionFailure('not_authenticated');
    }
    if (opts?.signal?.aborted) {
      return executionRunActionFailure('cancelled');
    }
    const target = await resolveExecutionRunMachineTarget(sessionId, opts);
    if (!target.ok) return executionRunActionFailure(target.errorCode);
    let observation: ExecutionRunCapabilityObservation;
    try {
      const response = await callMachineAction({
        machineId: target.machineId,
        method: RPC_METHODS.CAPABILITIES_DETECT,
        request: { requests: [{ id: 'tool.executionRuns' }] },
        ...(opts?.authority ? { authority: opts.authority } : {}),
        ...(opts?.signal ? { signal: opts.signal } : {}),
      });
      observation = { supported: true, response };
    } catch (error) {
      observation = { supported: false, reason: 'error', error };
    }
    const support = readExecutionRunProtocolV2Support(observation, requirement, opts?.signal);
    return support.ok ? { ok: true, exactMachineId: target.machineId } : support;
  };

  const callSessionRpcForTransport = async (
    transport: ResolvedSessionTransport,
    methodSuffix: string,
    request: unknown,
    signal?: AbortSignal,
    timeoutMs?: number | null,
  ): Promise<unknown> => {
    if (!params.credentials) {
      return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
    }

    try {
      return await callSessionRpc({
        ...transport,
        token: params.credentials.token,
        sessionId: transport.sessionId,
        method: `${transport.sessionId}:${methodSuffix}`,
        request,
        ...(signal ? { signal } : {}),
        ...(timeoutMs === undefined ? {} : { timeoutMs }),
      });
    } catch (error) {
      const errorCode = readRpcErrorCode(error) ?? 'session_rpc_failed';
      return {
        ok: false,
        errorCode,
        error: errorCode,
        errorMessage: error instanceof Error ? error.message : errorCode,
        sessionId: transport.sessionId,
      };
    }
  };

  const callSessionActionRpc = async (
    transport: ResolvedSessionTransport,
    method: string,
    input: unknown,
    context: ActionExecutorContext,
  ): Promise<unknown> => {
    if (context.authority === 'present_user') return await callSessionRpcForTransport(transport, method, input, context.signal);
    if (!params.sessionActionRpcTransport) {
      throw new RpcError('role_rpc_origin_unavailable', 'role_rpc_origin_unavailable');
    }
    context.signal?.throwIfAborted();
    if (context.actionCaller?.kind === 'workflowRun') {
      const caller = context.agentStartContext;
      if (!params.credentials || !params.serverIdentityId || !params.externalActionMachineInstallationId
        || !params.externalActionMachineRequestPrivateKey || !caller || caller.caller.kind !== 'originless') {
        throw Object.assign(new Error('role_rpc_origin_unavailable'), { code: 'role_rpc_origin_unavailable' });
      }
      const authorization = await prepareInstalledWorkflowActionAuthorization({
        credentials: params.credentials, context, input,
        actionId: method === SESSION_RPC_METHODS.SESSION_ROLES_CONFIGURATION_SET ? 'session.roles.apply_to_reports' : method,
        target: { kind: 'session', sessionId: transport.sessionId }, machineId: caller.baseline.machineId,
        serverId: params.serverId ?? configuration.activeServerId, serverIdentityId: params.serverIdentityId,
        serverHttpBaseUrl: params.serverHttpBaseUrl ?? resolveServerHttpBaseUrl(),
        installationId: params.externalActionMachineInstallationId, privateKey: params.externalActionMachineRequestPrivateKey,
        isCurrent: async () => await isWorkflowAuthorizationCurrent(context),
      });
      if (!authorization) throw new RoleActionRefusalV1('run_access_denied');
      return await params.sessionActionRpcTransport({ sessionId: transport.sessionId, method, input,
        content: resolveSessionRpcContent(transport), executionAuthorization: authorization,
        ...(context.signal ? { signal: context.signal } : {}) });
    }
    const questionMethod = method === SESSION_RPC_METHODS.SESSION_NEEDS_YOU_RAISE
      || method === 'session.user_action.answer';
    const origin = questionMethod && context.readSessionActionRpcOrigin
      ? context.readSessionActionRpcOrigin()
      : resolveSessionRoleRpcOrigin(context);
    if (!origin) throw new RpcError('role_rpc_origin_unavailable', 'role_rpc_origin_unavailable');
    return await params.sessionActionRpcTransport({ sessionId: transport.sessionId, method, input,
      content: resolveSessionRpcContent(transport), origin,
      ...(context.signal ? { signal: context.signal } : {}),
    });
  };

  const normalizeLifecycleHookSessionContext = (context: Readonly<{
    machineId?: unknown;
    cwd?: unknown;
    workspaceId?: unknown;
  }>): LifecycleHookSessionContext => {
    const machineId = normalizeStringValue(context.machineId);
    const cwd = normalizeStringValue(context.cwd);
    const workspaceId = normalizeStringValue(context.workspaceId);
    return {
      ...(machineId ? { machineId } : {}),
      ...(cwd ? { cwd } : {}),
      ...(workspaceId ? { workspaceId } : {}),
    };
  };

  const resolveLifecycleHookSessionContext = async (event: Readonly<{
    happySessionId: string;
    exactSessionContext?: LifecycleHookSessionContext;
  }>): Promise<LifecycleHookSessionContext> => {
    if (event.exactSessionContext !== undefined) {
      return normalizeLifecycleHookSessionContext(event.exactSessionContext);
    }

    if (event.happySessionId === params.sessionId) {
      const metadata = await readCurrentSessionMetadata();
      return normalizeLifecycleHookSessionContext({
        machineId: await resolveCurrentSessionValue('machineId'),
        cwd: await resolveCurrentSessionValue('path'),
        workspaceId: metadata?.workspaceId,
      });
    }

    try {
      const transport = await resolveTransportForSession(event.happySessionId);
      if (!transport.ok) return {};
      const metadata = readTransportSessionOwnerMetadata(transport);
      return normalizeLifecycleHookSessionContext({
        machineId: normalizeStringValue(transport.rawSession.machineId) ?? metadata?.machineId,
        cwd: normalizeStringValue(transport.rawSession.path) ?? metadata?.path,
        workspaceId: metadata?.workspaceId,
      });
    } catch {
      return {};
    }
  };

  const dispatchSessionLifecycleHookEvent = async (event: Readonly<{
    eventId: SessionBridgeLifecycleHookEventIdV1;
    happySessionId: string;
    backendTarget?: string;
    exactSessionContext?: LifecycleHookSessionContext;
    payload: Record<string, unknown>;
  }>): Promise<void> => {
    const happyHomeDir = typeof params.happyHomeDir === 'string' && params.happyHomeDir.trim().length > 0
      ? params.happyHomeDir.trim()
      : null;
    if (!happyHomeDir) {
      return;
    }
    const sessionContext = await resolveLifecycleHookSessionContext(event);

    await getSessionHostBridge().emitLifecycleHookEvent({
      happyHomeDir,
      eventId: event.eventId,
      happySessionId: event.happySessionId,
      ...sessionContext,
      ...(event.backendTarget ? { backendTarget: event.backendTarget } : {}),
      payload: event.payload,
    });
  };

  const callResolvedSessionRpc = async (
    sessionId: string,
    method: string,
    request: unknown,
    signal?: AbortSignal,
  ): Promise<unknown> => {
    // A Session runner already holds this exact host-bound transport, but no
    // Account bearer. Other Sessions still require normal credential resolution.
    if (sessionId === params.sessionId && params.invokeBoundSessionRpc) {
      return await params.invokeBoundSessionRpc(method, request, signal);
    }
    if (!params.credentials) {
      return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
    }
    const transport = await resolveTransportForSession(sessionId, signal);
    if (!transport.ok) {
      return { ok: false, errorCode: transport.code, error: transport.code, ...(transport.candidates ? { candidates: transport.candidates } : {}) };
    }
    return await callSessionRpcForTransport(transport, method, request, signal);
  };

  const isUsageLimitRecoveryEnabled = async (): Promise<boolean> => {
    if (typeof params.isUsageLimitRecoveryEnabled === 'function') {
      return await params.isUsageLimitRecoveryEnabled();
    }
    return await resolveUsageLimitRecoveryEnabled();
  };

  let initialSessionGoalTransport = params.initialSessionGoalTransport;
  const callRoutedSessionGoalControl = async (
    sessionId: string,
    operation: 'get' | 'set' | 'clear',
    request: Record<string, unknown>,
    options?: Readonly<{ resumeInactiveWithInitialGoal?: boolean; context?: ActionExecutorContext; signal?: AbortSignal; actionRequestId?: string; serverId?: string | null }>,
  ): Promise<unknown> => {
    const preparationStartedAt = performance.now();
    const signal = options?.signal ?? options?.context?.signal;
    const authority = options?.context ? options.context.authority ?? 'account_automation' : undefined;
    signal?.throwIfAborted();
    if (!params.credentials) {
      return normalizeUsageLimitRecoveryOperationResult(
        { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' },
        { sessionId },
      );
    }

    const relayGoal: NonNullable<Parameters<typeof routeSessionGoalControl>[0]['callMachineGoalRpc']> = async ({ machineId,
      operation: machineOperation, request: goalRequest, resumeInactiveWithInitialGoal }) => await callMachineAction({
        machineId, timeoutMs: null,
        ...(options?.serverId ? { serverId: options.serverId } : {}),
        method: machineOperation === 'get' ? RPC_METHODS.DAEMON_SESSION_GOAL_GET
          : machineOperation === 'clear' ? RPC_METHODS.DAEMON_SESSION_GOAL_CLEAR
            : resumeInactiveWithInitialGoal ? RPC_METHODS.DAEMON_SESSION_GOAL_SET_V2 : RPC_METHODS.DAEMON_SESSION_GOAL_SET,
        request: { sessionId, ...goalRequest, ...(resumeInactiveWithInitialGoal ? { resumeInactiveWithInitialGoal: true } : {}) },
        ...(options?.context ? { context: options.context, authority, authorization: options.context.rpcSessionAuthorization } : {}),
        ...(signal ? { signal } : {}), effectActionId: `session.goal.${machineOperation}`,
      });
    const invokeBoundSessionRpc = params.invokeBoundSessionRpc;
    if (sessionId === params.sessionId && invokeBoundSessionRpc) {
      const metadata = params.getCurrentSessionMetadata?.() ?? null;
      return await routeSessionGoalControl({
        token: params.credentials.token,
        credentials: params.credentials,
        sessionId,
        rawSession: { ...(params.rawSession ?? {}), active: true },
        metadata,
        currentMachineId: normalizeStringValue(params.rawSession?.machineId)
          ?? normalizeStringValue(metadata?.machineId),
        operation,
        ...(operation === 'set' ? { request } : {}),
        ...(params.mode === 'plain' ? { mode: params.mode, ctx: params.ctx } : { mode: params.mode, ctx: params.ctx }),
        signal,
        stageWorkStateMutation: params.stageWorkStateMutation,
        callMachineGoalRpc: relayGoal,
        callLiveSessionRpc: async () => await invokeBoundSessionRpc(
          operation === 'get'
            ? SESSION_RPC_METHODS.SESSION_GOAL_GET
            : operation === 'clear'
              ? SESSION_RPC_METHODS.SESSION_GOAL_CLEAR
              : SESSION_RPC_METHODS.SESSION_GOAL_SET,
          request,
          signal,
        ),
      });
    }

    const admittedTransport = initialSessionGoalTransport;
    initialSessionGoalTransport = undefined;
    const transport = admittedTransport?.sessionId === sessionId
      ? admittedTransport
      : await resolveTransportForSession(sessionId, signal);
    const transportResolvedAt = performance.now();
    logger.debug('[SessionGoal] Action transport resolution', { sessionId, operation,
      durationMs: Math.round(transportResolvedAt - preparationStartedAt) });
    if (!transport.ok) {
      return normalizeUsageLimitRecoveryOperationResult(
        {
          ok: false,
          errorCode: transport.code,
          error: transport.code,
        },
        { sessionId },
      );
    }

    const metadata = readTransportSessionOwnerMetadata(transport);
    const currentMachineIdentity = await readCurrentMachineControlIdentity();
    logger.debug('[SessionGoal] Machine identity resolution', { sessionId, operation,
      durationMs: Math.round(performance.now() - transportResolvedAt) });
    const actionRequestId = options?.actionRequestId ?? options?.context?.actionRequestId;
    return await routeSessionGoalControl({
      ...transport,
      token: params.credentials.token,
      credentials: params.credentials,
      sessionId: transport.sessionId,
      rawSession: transport.rawSession,
      metadata,
      currentMachineId: currentMachineIdentity.machineId,
      currentMachineHost: currentMachineIdentity.host,
      currentMachineHomeDir: currentMachineIdentity.homeDir,
      operation,
      ...(signal ? { signal } : {}),
      ...(authority ? { executionAuthority: authority } : {}),
      ...(actionRequestId ? { actionRequestId } : {}),
      resumeInactiveWithInitialGoal: operation === 'set' && typeof request.objective === 'string'
        && options?.resumeInactiveWithInitialGoal !== false,
      stageWorkStateMutation: params.stageWorkStateMutation,
      ...(operation === 'set' ? { request } : {}),
      // Goal preparation, native confirmation and inactive resume share the
      // admitted caller's lifetime; transport setup keeps its own existing bound.
      callLiveSessionRpc: async () => await callSessionRpcForTransport(
        transport,
        operation === 'get'
          ? SESSION_RPC_METHODS.SESSION_GOAL_GET
          : operation === 'clear'
            ? SESSION_RPC_METHODS.SESSION_GOAL_CLEAR
            : SESSION_RPC_METHODS.SESSION_GOAL_SET,
        request,
        signal,
        null,
      ),
      // The registered daemon Goal handler already admitted this transport.
      // Missing custody there is a wiring failure, never a relay back to itself.
      ...(admittedTransport ? {} : { callMachineGoalRpc: relayGoal }),
      machineResumeTransport: async (method, resumeRequest, resumeOptions) => await callMachineAction({
        machineId: currentMachineIdentity.machineId!, method, request: resumeRequest, timeoutMs: null,
        ...(options?.serverId ? { serverId: options.serverId } : {}),
        ...(options?.context ? { context: options.context, authority,
          authorization: options.context.rpcSessionAuthorization } : {}),
        ...(resumeOptions?.signal ? { signal: resumeOptions.signal } : {}), effectActionId: 'session.goal.set',
      }),
    });
  };

  const callRoutedSessionCatalogControl = async (
    sessionId: string,
    operation: 'vendorPlugins' | 'skills',
    request: Readonly<{ cwd?: string }>,
  ): Promise<unknown> => {
    if (!params.credentials) {
      return operation === 'vendorPlugins'
        ? { unsupported: true, vendorPlugins: [], diagnostic: 'not_authenticated' }
        : { unsupported: true, skills: [], diagnostic: 'not_authenticated' };
    }

    const transport = await resolveTransportForSession(sessionId);
    if (!transport.ok) {
      return operation === 'vendorPlugins'
        ? { unsupported: true, vendorPlugins: [], diagnostic: transport.code }
        : { unsupported: true, skills: [], diagnostic: transport.code };
    }

    const metadata = readTransportSessionOwnerMetadata(transport);
    const currentMachineIdentity = await readCurrentMachineControlIdentity();
    const method = operation === 'vendorPlugins'
      ? SESSION_RPC_METHODS.SESSION_VENDOR_PLUGIN_CATALOG_LIST
      : SESSION_RPC_METHODS.SESSION_SKILL_CATALOG_LIST;
    const rpcRequest = {
      ...(typeof request.cwd === 'string' && request.cwd.trim().length > 0 ? { cwd: request.cwd.trim() } : {}),
    };
    return await routeSessionCatalogControl({
      ...transport,
      token: params.credentials.token,
      credentials: params.credentials,
      sessionId: transport.sessionId,
      rawSession: transport.rawSession,
      metadata,
      currentMachineId: currentMachineIdentity.machineId,
      currentMachineHost: currentMachineIdentity.host,
      currentMachineHomeDir: currentMachineIdentity.homeDir,
      operation,
      ...('cwd' in rpcRequest ? { cwd: rpcRequest.cwd } : {}),
      callLiveSessionRpc: async () => await callSessionRpcForTransport(
        transport,
        method,
        rpcRequest,
      ),
    });
  };

  const callRoutedUsageLimitRecoveryControl = async (
    sessionId: string,
    operation: 'enable' | 'cancel' | 'checkNow' | 'switchAccountNow' | 'consumeResetCredit',
    request: Record<string, unknown>,
  ): Promise<unknown> => {
    if (!params.credentials) {
      return normalizeUsageLimitRecoveryOperationResult(
        { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' },
        { sessionId },
      );
    }

    const transport = await resolveTransportForSession(sessionId);
    if (!transport.ok) {
      return normalizeUsageLimitRecoveryOperationResult(
        {
          ok: false,
          errorCode: transport.code,
          error: transport.code,
        },
        { sessionId },
      );
    }

    const metadata = readTransportSessionOwnerMetadata(transport);
    const daemonOwnedCheck = operation === 'checkNow' && readRuntimeAuthUsageLimitRecoveryAttemptId(metadata) !== null;
    if (transport.rawSession.active === true && !daemonOwnedCheck) {
      return normalizeUsageLimitRecoveryOperationResult(await callSessionRpcForTransport(
        transport,
        operation === 'enable'
          ? SESSION_RPC_METHODS.SESSION_USAGE_LIMIT_WAIT_RESUME_ENABLE
          : operation === 'cancel'
            ? SESSION_RPC_METHODS.SESSION_USAGE_LIMIT_WAIT_RESUME_CANCEL
            : operation === 'consumeResetCredit'
              ? SESSION_RPC_METHODS.SESSION_USAGE_LIMIT_CONSUME_RESET_CREDIT
              : SESSION_RPC_METHODS.SESSION_USAGE_LIMIT_CHECK_NOW,
        request,
      ), { sessionId: transport.sessionId });
    }

    const rawMachineId = normalizeStringValue(transport.rawSession.machineId);
    const metadataMachineId = normalizeStringValue(metadata?.machineId);
    if (rawMachineId && metadataMachineId && rawMachineId !== metadataMachineId) {
      return normalizeUsageLimitRecoveryOperationResult({
        ok: false,
        errorCode: 'session_usage_limit_recovery_control_target_machine_mismatch',
        error: 'session_usage_limit_recovery_control_target_machine_mismatch',
      }, { sessionId: transport.sessionId });
    }
    const machineId = rawMachineId ?? metadataMachineId;
    if (!machineId) {
      return normalizeUsageLimitRecoveryOperationResult({
        ok: false,
        errorCode: 'session_usage_limit_recovery_control_target_machine_unavailable',
        error: 'session_usage_limit_recovery_control_target_machine_unavailable',
      }, { sessionId: transport.sessionId });
    }

    const method = operation === 'enable'
      ? RPC_METHODS.DAEMON_SESSION_USAGE_LIMIT_WAIT_RESUME_ENABLE
      : operation === 'cancel'
        ? RPC_METHODS.DAEMON_SESSION_USAGE_LIMIT_WAIT_RESUME_CANCEL
        : operation === 'consumeResetCredit'
          ? RPC_METHODS.DAEMON_SESSION_USAGE_LIMIT_CONSUME_RESET_CREDIT
          : RPC_METHODS.DAEMON_SESSION_USAGE_LIMIT_CHECK_NOW;
    try {
      return normalizeUsageLimitRecoveryOperationResult(await callMachineRpc({
        credentials: params.credentials,
        machineId,
        method,
        request,
      }), { sessionId: transport.sessionId });
    } catch {
      return normalizeUsageLimitRecoveryOperationResult({
        ok: false,
        errorCode: 'session_usage_limit_recovery_control_target_machine_unavailable',
        error: 'session_usage_limit_recovery_control_target_machine_unavailable',
      }, { sessionId: transport.sessionId });
    }
  };

  const executeSessionBoundScmAction: NonNullable<ActionExecutorDeps['scmActionExecute']> = async ({
    actionId,
    input,
    context,
    executeCanonicalAction,
  }) => {
    const localReviewHomeCurrent = async () => {
      if (context.serverId && !await isServerProfileHomeIdentity(configuration.activeServerId, context.serverId)) return false;
      if (params.serverId && !await isServerProfileHomeIdentity(configuration.activeServerId, params.serverId)) return false;
      if (!params.serverHttpBaseUrl) return true;
      try {
        const selected = createServerUrlComparableKey(params.serverHttpBaseUrl);
        return Boolean(selected && [configuration.serverUrl, configuration.apiServerUrl, resolveServerHttpBaseUrl()]
          .some(url => createServerUrlComparableKey(url) === selected));
      } catch { return false; }
    };
    const localReviewContext = { ...context, serverId: configuration.activeServerId };
    const requesterAccountId = context.externalActionCredential?.accountId ?? context.runtimeAccountId;
    const accountMarksDeps = params.credentials ? {
      executeReviewedMarks: (comparison: import('@happier-dev/protocol').ScmComparison, request: import('@happier-dev/protocol').ScmReviewedMarkInput, reviewed: boolean) => createCliScmReviewedMarkAction({
        credentials: params.credentials!, comparison, changeRefs: request.changeRefs, reviewed,
        ...(requesterAccountId ? { requesterAccountId } : {}),
        ...(params.serverHttpBaseUrl ? { serverBaseUrl: params.serverHttpBaseUrl } : {}),
        resolveAuthorizationHeaders: request => resolveServerRequestHeaders(context, actionId, request),
        ...(context.signal ? { signal: context.signal } : {}),
      }),
      clearReviewedMarks: (comparison: import('@happier-dev/protocol').ScmComparison) => clearCliScmReviewedMarks({
        credentials: params.credentials!, comparison,
        ...(requesterAccountId ? { requesterAccountId } : {}),
        ...(params.serverHttpBaseUrl ? { serverBaseUrl: params.serverHttpBaseUrl } : {}),
        resolveAuthorizationHeaders: request => resolveServerRequestHeaders(context, actionId, request),
        ...(context.signal ? { signal: context.signal } : {}),
      }),
    } : {};
    const attachSuccessfulPullRequest = async (response: unknown) => {
      const sessionId = normalizeStringValue(context.defaultSessionId);
      if (actionId !== 'scm.pullRequest.openOrReuse' || !sessionId) return response;
      const parsed = ScmPullRequestOpenOrReuseResponseSchema.safeParse(response);
      if (!parsed.success || !parsed.data.success || !parsed.data.pullRequest) return response;
      const pr = parsed.data.pullRequest;
      if (pr.provider.kind !== 'github' || !pr.provider.nameWithOwner || !pr.number) return response;
      try {
        const result = await invokeSessionPullRequestBinding({ kind: 'attach', sessionId,
          pullRequest: { repository: pr.provider.nameWithOwner, number: pr.number } }, context);
        if (result.kind !== 'attached') throw Object.assign(new Error('target_unavailable'), { code: 'target_unavailable' });
        return response;
      } catch (error) {
        const code = error !== null && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
          ? error.code : 'target_unavailable';
        return { ok: false, errorCode: code, error: code, details: { pullRequest: pr, scmEffectCommitted: true } };
      }
    };
    const inputRecord = input && typeof input === 'object' && !Array.isArray(input)
      ? input as Readonly<Record<string, unknown>>
      : {};
    const resolveScmBackendTarget = (metadata: Record<string, unknown> | null) => {
      const selector = inputRecord.modelSelector;
      const selectorRecord = selector && typeof selector === 'object' && !Array.isArray(selector)
        ? selector as Readonly<Record<string, unknown>> : {};
      const targetKey = normalizeStringValue(selectorRecord.backendTargetKey);
      if (!targetKey) return resolveBackendTargetFromSessionMetadata(metadata);
      try {
        const target = parseBackendTargetKeyV2(targetKey);
        if (target.kind === 'backend' || target.definitionId) return readBackendTargetRefV2(target);
        const catalog = readAgentCatalogSnapshot();
        const agentId = readAgentRoutingIdForContributionIdentity(
          indexAgentRoutingIdsByContributionIdentity([...catalog.agentDefinitionsById.values()]), target.identity);
        return agentId ? BackendTargetRefV2Schema.parse({ kind: 'backend', backendId: agentId, sourceKind: 'built_in' }) : null;
      } catch { return null; }
    };
    const readComparisonTranscriptPage = params.credentials ? createRepositoryCheckpointTranscriptPageReader({
      credentials: params.credentials,
      resolveAuthorizationHeaders: request => resolveServerRequestHeaders(context, 'session.transcript.get', request),
      ...(context.signal ? { signal: context.signal } : {}),
    }) : undefined;
    const authorizeReviewSession = async (sessionId: string) => {
      // An ingress proof is the caller's ceiling; never widen it with the
      // runtime owner's credentials. Ordinary CLI callers prove access at Home.
      if (context.rpcSessionAuthorization) return context.rpcSessionAuthorization.sessionId === sessionId;
      const snapshot = await fetchSessionById({ token: params.token, sessionId,
        ...(params.serverHttpBaseUrl ? { serverUrl: params.serverHttpBaseUrl } : {}),
        resolveAuthorizationHeaders: request => resolveServerRequestHeaders(context, actionId, request),
        ...(context.signal ? { signal: context.signal } : {}),
      }).catch(() => null);
      return snapshot?.id === sessionId;
    };
    const readPullRequestComparisonPage: ReadPullRequestComparisonPage = async ({ sourceAction, continuation }) => {
      const input = sourceAction.input;
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Pull-request source Action requires object input');
      const selectedSourceInput = Object.fromEntries(Object.entries(input).filter(([key]) => key !== 'continuation'));
      const result = await executeCanonicalAction('action.invoke', {
        action: sourceAction.action,
        input: { ...selectedSourceInput, comparison: true, ...(continuation ? { continuation } : {}) },
      }, { requiredContributedActionDangerLevel: 'safe' });
      if (!result.ok) throw new Error(`Pull-request source Action unavailable: ${result.errorCode}`);
      return result.result;
    };
    const machineInventory = actionId === 'scm.diffSummary.result.list' || actionId === 'scm.diffSummary.result.clear'
      || actionId === 'scm.hostingRepository.resolveAddress';
    if (machineInventory && context.externalActionTarget?.kind !== 'machine') {
      return { ok: false, errorCode: 'machine_not_selected', error: 'machine_not_selected' };
    }
    if (context.externalActionTarget?.kind === 'machine') {
      const machineId = normalizeStringValue(context.externalActionTarget.machineId);
      const cwd = normalizeStringValue(actionId === 'scm.repository.clone'
        ? inputRecord.destinationParentPath
        : inputRecord.cwd);
      const method = getActionSpec(actionId).bindings?.rpcMethod;
      if (!machineId || (!machineInventory && !cwd) || !method || actionId === 'scm.reviewWorkspace.materializePrepared') {
        return { ok: false, errorCode: 'invalid_input', error: 'invalid_input' };
      }
      if (!params.credentials && params.machineActionDirectTargetTransport?.machineId !== machineId) {
        return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
      }
      if (!await isMachineActionServerScopeCurrent({ serverId: context.serverId, machineId, context,
        ...(context.signal ? { signal: context.signal } : {}) })) return { ok: false, errorCode: 'server_scope_mismatch', error: 'server_scope_mismatch' };
      if (params.credentials && actionId.startsWith('scm.diffSummary.')) {
        const currentMachine = await readCurrentMachineControlIdentity();
        if (currentMachine.machineId === machineId) {
          if (!await localReviewHomeCurrent()) return { ok: false, errorCode: 'server_scope_mismatch', error: 'server_scope_mismatch' };
          return executeScmActionOperation({ actionId, input: inputRecord, workingDirectory: cwd ?? process.cwd(),
            accessPolicy: params.scmFilesystemAccessPolicy ?? resolveFilesystemAccessPolicy(),
            ...(readComparisonTranscriptPage ? { readComparisonTranscriptPage } : {}), readPullRequestComparisonPage,
            authorizeSession: authorizeReviewSession,
            executeCanonicalAction, actionContext: localReviewContext, ...accountMarksDeps, ...(context.signal ? { signal: context.signal } : {}),
            executeDiffSummary: async ({ request }) => {
              const summary = request as ScmDiffSummaryGenerateInput;
              const parent = summary.sessionId ? await resolveTransportForSession(summary.sessionId, context.signal) : null;
              if (parent && !parent.ok) return { success: false, errorCode: 'DIFF_UNAVAILABLE', error: parent.code };
              const metadata = parent?.ok ? readTransportSessionOwnerMetadata(parent) : null;
              const parentMachineId = parent?.ok ? normalizeStringValue(parent.rawSession.machineId)
                ?? normalizeStringValue(metadata?.machineId) : null;
              if (parentMachineId && parentMachineId !== machineId) {
                return { success: false, errorCode: 'DIFF_UNAVAILABLE', error: 'scm_action_session_not_local' };
              }
              return await executeScmDiffSummaryAction({
                request: summary, machineId, credentials: params.credentials,
                ...(readComparisonTranscriptPage ? { readTranscriptPage: readComparisonTranscriptPage } : {}), readPullRequestComparisonPage,
                backendTarget: resolveScmBackendTarget(metadata), executeCanonicalAction,
                ...(context.signal ? { signal: context.signal } : {}),
              });
            },
          });
        }
      }
      const admitPolicy = actionId === 'scm.commit.create'
        ? (capabilities?: ScmCapabilities) => admitScmCommitPolicy(ScmCommitCreateRequestSchema.parse(inputRecord), capabilities)
        : actionId === 'scm.commit.undoLast'
          ? (capabilities?: ScmCapabilities) => admitScmCommitUndoLast(capabilities)
          : actionId === 'scm.remote.fetch' || actionId === 'scm.remote.pull' || actionId === 'scm.remote.push'
            ? (capabilities?: ScmCapabilities) => admitScmRemotePolicy(ScmRemoteRequestSchema.parse(inputRecord), capabilities)
            : undefined;
      if (admitPolicy && !admitPolicy().success) {
        let capabilities: ScmCapabilities | undefined;
        try {
          const description = ScmBackendDescribeResponseSchema.safeParse(await callMachineAction({
            machineId, method: 'scm.backend.describe',
            request: { cwd, ...(inputRecord.backendPreference ? { backendPreference: inputRecord.backendPreference } : {}), outcomeVersion: 1 },
            ...(context.signal ? { signal: context.signal } : {}),
          }));
          if (description.success && description.data.success) capabilities = description.data.capabilities;
        } catch {
          // An unproven exact-target capability is not permission to send fields
          // a predecessor daemon could silently ignore.
        }
        const admission = admitPolicy(capabilities);
        if (!admission.success) return admission;
      }
      return await attachSuccessfulPullRequest(await callMachineAction({ machineId, method, request: {
        ...inputRecord,
        ...(actionId.startsWith('scm.diffSummary.') || actionId === 'scm.hostingRepository.resolveAddress'
          ? {}
          : { outcomeVersion: 1 }),
        ...(actionId === 'scm.status.snapshot' ? { operationStateVersion: 1 } : {}),
      }, ...(context.rpcSessionAuthorization ? { authorization: context.rpcSessionAuthorization } : {}),
        ...(context.signal ? { signal: context.signal } : {}) }));
    }
    if (!params.credentials) {
      return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
    }
    if (actionId === 'scm.reviewWorkspace.materializePrepared') {
      const selectedRoot = normalizeStringValue(inputRecord.cwd);
      if (!selectedRoot) {
        return { ok: false, errorCode: 'invalid_input', error: 'invalid_input' };
      }
      return await executeScmActionOperation({
        actionId,
        input: inputRecord,
        workingDirectory: selectedRoot,
        accessPolicy: { kind: 'restrictedRoots', roots: [selectedRoot] },
        ...(context.signal ? { signal: context.signal } : {}),
      });
    }
    const sessionId = normalizeStringValue(context.defaultSessionId);
    if (!sessionId) {
      return { ok: false, errorCode: 'session_not_selected', error: 'session_not_selected' };
    }
    const transport = await resolveTransportForSession(sessionId, context.signal);
    if (!transport.ok) {
      return { ok: false, errorCode: transport.code, error: transport.code };
    }

    const metadata = readTransportSessionOwnerMetadata(transport);
    const persistedWorkingDirectory = normalizeStringValue(metadata?.path);
    if (!persistedWorkingDirectory) {
      return {
        ok: false,
        errorCode: 'scm_action_worktree_unavailable',
        error: 'scm_action_worktree_unavailable',
      };
    }

    const currentMachine = await readCurrentMachineControlIdentity();
    const workingDirectory = metadata
      ? resolveSessionMachineWorkspacePath({
          metadata,
          currentMachineId: currentMachine.machineId,
          candidatePath: persistedWorkingDirectory,
        }) ?? persistedWorkingDirectory
      : persistedWorkingDirectory;
    const sessionMachineId = normalizeStringValue(transport.rawSession.machineId)
      ?? normalizeStringValue(metadata?.machineId);
    const sessionHost = normalizeStringValue(transport.rawSession.host)
      ?? normalizeStringValue(metadata?.host);
    const machineMismatch = Boolean(
      sessionMachineId
      && currentMachine.machineId
      && sessionMachineId !== currentMachine.machineId,
    );
    const hostMismatch = Boolean(
      !sessionMachineId
      && sessionHost
      && currentMachine.host
      && sessionHost !== currentMachine.host,
    );
    if (machineMismatch || hostMismatch) {
      return {
        ok: false,
        errorCode: 'scm_action_session_not_local',
        error: 'scm_action_session_not_local',
      };
    }

    if (params.scmFilesystemAccessPolicy) {
      const authorized = resolveCwd(workingDirectory, workingDirectory, params.scmFilesystemAccessPolicy);
      if (!authorized.ok) return { ok: false, errorCode: 'scm_action_path_denied', error: authorized.error };
    }

    const sessionBoundInput = actionId === 'scm.repository.clone'
      ? inputRecord
      : actionId === 'scm.pullRequest.prepareWorktree'
        ? { ...inputRecord, cwd: workingDirectory, sourcePath: workingDirectory }
        : { ...inputRecord, cwd: workingDirectory,
            ...(actionId === 'scm.diffSummary.capture' ? { sessionId: transport.sessionId } : {}),
          };
    const backendTarget = actionId === 'scm.diffSummary.generate' ? resolveScmBackendTarget(metadata) : null;

    if (actionId.startsWith('scm.diffSummary.') && !await localReviewHomeCurrent()) {
      return { ok: false, errorCode: 'server_scope_mismatch', error: 'server_scope_mismatch' };
    }

    return await attachSuccessfulPullRequest(await executeScmActionOperation({
      actionId,
      input: sessionBoundInput,
      workingDirectory,
      accessPolicy: { kind: 'restrictedRoots', roots: [workingDirectory] },
      ...(readComparisonTranscriptPage ? { readComparisonTranscriptPage } : {}),
      readPullRequestComparisonPage,
      sessionId: transport.sessionId,
      authorizeSession: authorizeReviewSession,
      executeCanonicalAction,
      actionContext: localReviewContext,
      ...accountMarksDeps,
      ...(context.signal ? { signal: context.signal } : {}),
      executeDiffSummary: async ({ request }) => await executeScmDiffSummaryAction({
        request: request as ScmDiffSummaryGenerateInput,
        sessionId: transport.sessionId,
        ...(readComparisonTranscriptPage ? { readTranscriptPage: readComparisonTranscriptPage } : {}),
        readPullRequestComparisonPage,
        backendTarget,
        credentials: params.credentials,
        executeCanonicalAction,
        ...(context.signal ? { signal: context.signal } : {}),
      }),
    }));
  };

  type SessionSpawnTargetPreparation =
    | Readonly<{
        ok: true;
        preparedTarget: Extract<
          SessionCreationTargetPreparationResultV1,
          Readonly<{ ok: true }>
        >;
      }>
    | Readonly<{
        ok: false;
        result: Extract<SessionSpawnNewResultV1, Readonly<{ type: 'error' }>>;
      }>;

  /**
   * A direct transport is installed only by the authenticated exact-machine
   * receiver. Once that receiver has selected this daemon, its local profile
   * id is not an Account-routing identity: retain the portable server id in
   * the Action input and approval artifact instead of comparing it to that
   * profile-local value.
   */
  const isCurrentSessionSpawnExecutionTarget = (executionTarget: Readonly<{
    serverId: string;
    machineId: string;
  }>): boolean => {
    const directTargetTransport = params.sessionSpawnDirectTargetTransport;
    if (directTargetTransport?.machineId === executionTarget.machineId) {
      return true;
    }
    // Retained plugin recipes carry portable Home identities too. Use the
    // same captured Home equivalence as other Actions before target I/O.
    return isSameActionHomeId(executionTarget.serverId)
      && (params.serverId !== undefined || configuration.activeServerId === projectHomeId);
  };

  /**
   * One exact-target bridge to the daemon-owned preparation RPC. Both the
   * Action approval probe and the eventual V2 spawn consume this owner; no
   * caller resolves a remote path or synthesizes its directory state.
   */
  const prepareSessionSpawnTarget = async (input: Readonly<{
    executionTarget: Readonly<{ serverId: string; machineId: string }>;
    directory: SessionCreationTargetPreparationRequestV1['directory'];
    sessionCreationTag?: SessionCreationTargetPreparationRequestV1['sessionCreationTag'];
    checkoutCreationDraft?: SessionCreationTargetPreparationRequestV1['checkoutCreationDraft'];
    context?: ActionExecutorContext;
    signal?: AbortSignal;
  }>): Promise<SessionSpawnTargetPreparation> => {
    if (!params.credentials) {
      return {
        ok: false,
        result: { type: 'error', code: 'permission_denied', retryable: false },
      };
    }
    if (input.signal?.aborted) {
      return {
        ok: false,
        result: { type: 'error', code: 'cancelled', retryable: true },
      };
    }

    const directTargetTransport = params.sessionSpawnDirectTargetTransport;
    if (
      directTargetTransport
      && directTargetTransport.machineId !== input.executionTarget.machineId
    ) {
      return {
        ok: false,
        result: { type: 'error', code: 'target_unavailable', retryable: false },
      };
    }

    let rawPreparedTarget: unknown;
    try {
      rawPreparedTarget = directTargetTransport
        ? await directTargetTransport.prepare(
          {
            directory: input.directory,
            ...(input.sessionCreationTag ? { sessionCreationTag: input.sessionCreationTag } : {}),
            ...(input.checkoutCreationDraft !== undefined
              ? { checkoutCreationDraft: input.checkoutCreationDraft }
              : {}),
          },
          input.signal ? { signal: input.signal } : undefined,
        )
        : await callMachineAction({
            machineId: input.executionTarget.machineId,
            exactMachine: true,
            ...(input.context ? { context: input.context, effectActionId: 'session.spawn_new' } : {}),
            method: needsSessionCreationDirectoryApprovalPreflightV1(input)
              ? RPC_METHODS.DAEMON_SESSION_CREATION_DIRECTORY_PREFLIGHT : RPC_METHODS.DAEMON_SESSION_CREATION_PREPARE,
            request: {
              directory: input.directory,
              ...(input.sessionCreationTag ? { sessionCreationTag: input.sessionCreationTag } : {}),
              ...(input.checkoutCreationDraft !== undefined
                ? { checkoutCreationDraft: input.checkoutCreationDraft }
                : {}),
            },
            ...(input.signal ? { signal: input.signal } : {}),
          });
    } catch (error) {
      if (input.signal?.aborted) {
        return {
          ok: false,
          result: { type: 'error', code: 'cancelled', retryable: true },
        };
      }
      if (isRpcMethodNotAvailableError(error) || isRpcMethodNotFoundError(error)) {
        return {
          ok: false,
          result: incompatibleSessionSpawnTarget('target_preparation_rpc_unavailable'),
        };
      }
      if (isAuthenticationError(error) || readRpcErrorCode(error) === RPC_ERROR_CODES.FORBIDDEN) {
        return {
          ok: false,
          result: { type: 'error', code: 'permission_denied', retryable: false },
        };
      }
      return {
        ok: false,
        result: { type: 'error', code: 'spawn_failed', retryable: true },
      };
    }

    const preparedTarget = SessionCreationTargetPreparationResultV1Schema.safeParse(rawPreparedTarget);
    if (!preparedTarget.success) {
      return {
        ok: false,
        result: incompatibleSessionSpawnTarget('target_preparation_invalid_result'),
      };
    }
    if (!preparedTarget.data.ok) {
      if (preparedTarget.data.code === 'invalid_directory') {
        return {
          ok: false,
          result: { type: 'error', code: 'invalid_input', retryable: false },
        };
      }
      if (preparedTarget.data.code === 'checkout_unavailable') {
        return {
          ok: false,
          result: incompatibleSessionSpawnTarget('checkout_unavailable'),
        };
      }
      return {
        ok: false,
        result: { type: 'error', code: 'spawn_failed', retryable: true },
      };
    }
    return { ok: true, preparedTarget: preparedTarget.data };
  };

  const resolveWorkspacePublishCaller = async (context: ActionExecutorContext) => {
    const caller = await resolveActionCallerSession(context);
    if (!caller?.directory || !caller.machineId || !(await requireLocalPromptActionMachine(caller.machineId)).ok) return null;
    return { sessionId: caller.sessionId, machineId: caller.machineId, directory: caller.directory,
      ...(context.runtimeRunId ? { runId: context.runtimeRunId } : {}) };
  };
  const widgetBoardDeps = params.credentials ? createSessionBoardActionDeps({
    credentials: params.credentials,
    resolvePublishCaller: resolveWorkspacePublishCaller,
    ...(params.resolveExactSessionEncryptionMaterial ? { resolveExactSessionEncryptionMaterial: params.resolveExactSessionEncryptionMaterial } : {}),
    ...(params.resolveServerFeaturesSnapshot ? { resolveServerFeaturesSnapshot: params.resolveServerFeaturesSnapshot } : {}),
    ...exactHome,
    ...(params.serverIdentityId ? { serverIdentityId: params.serverIdentityId } : {}),
    ...(params.externalActionMachineRequestPrivateKey ? { externalActionMachineRequestPrivateKey: params.externalActionMachineRequestPrivateKey } : {}),
    ...(params.externalActionMachineInstallationId ? { externalActionMachineInstallationId: params.externalActionMachineInstallationId } : {}),
  }) : null;
  const connectedServiceAction = params.credentials ? createCliConnectedServiceAction({
    credentials: params.credentials, ...exactHome, resolveHeaders: resolveServerRequestHeaders, callMachineAction,
    ...(params.savedSecretOperationContext ? { operationContext: params.savedSecretOperationContext } : {}),
    ...(params.isCredentialCurrent ? { isCredentialCurrent: params.isCredentialCurrent } : {}),
  }) : undefined;
  const actionDeps: ActionExecutorDeps = {
    ...(params.readAdmittedInputTypeOptions ? { readAdmittedInputTypeOptions: params.readAdmittedInputTypeOptions } : {}),
    registryActionExecute: async ({actionId,input,context}) => {
      if(!params.credentials) throw new Error('account_credentials_unavailable');
      return createCliRegistryHostV1({credentials:params.credentials,
        port:approvalsStore?.promptLibraryStore.organization,signal:context.signal,operationContext:params.savedSecretOperationContext,
        updates: filter => createCliRegistryUpdateCheck({ credentials: params.credentials!, serverId: params.serverId,
          serverHttpBaseUrl: params.serverHttpBaseUrl, signal: context.signal, operationContext: params.savedSecretOperationContext }).checkNow(filter),
      }).execute(actionId,input);
    },
    homeRuntimeTaskRpc: async ({ machineId, method, request, context }) => {
      try {
        return await callMachineAction({ machineId, serverId: context.serverId ?? params.serverId,
          method: method === 'detect' ? RPC_METHODS.CAPABILITIES_DETECT : RPC_METHODS.CAPABILITIES_INVOKE,
          request, context, effectActionId: 'home.runtime.restart', exactMachine: true, timeoutMs: null,
          ...(context.authority ? { authority: context.authority } : {}),
          ...(context.signal ? { signal: context.signal } : {}),
        });
      } catch (error) {
        if (readMachineRpcRequestDisposition(error) === 'notSent') {
          return { ok: false, errorCode: 'request_not_sent', error: 'request_not_sent' };
        }
        throw error;
      }
    },
    ...(approvalsStore?.promptLibraryStore.organization ? { artifactFolders: approvalsStore.promptLibraryStore.organization,
      promptStacks: approvalsStore.promptLibraryStore.organization, skillRules: approvalsStore.skillRules } : {}),
    runtimeActionExecute: async (args) => {
      const isStart = args.actionId === 'localServices.launcher.start';
      const controlKind = resolveLocalServiceActionKindForRuntimeActionId(args.actionId);
      const domainRpc = resolveLocalServiceDomainActionRpcBinding(args.actionId);
      // The daemon's Copy/Open receipt grants eligibility; it does not perform
      // the answering client's clipboard/navigation effect. This host is headless.
      if (!isStart && !domainRpc && (!controlKind || controlKind === 'copy_url' || controlKind === 'open_preview')) {
        return createUnavailableRuntimeActionExecutor()(args);
      }
      const spec = getActionSpec(args.actionId);
      const admittedInput = spec.inputSchema.safeParse(args.input);
      if (!admittedInput.success) return executionRunActionFailure('invalid_parameters');
      const parsedStart = !domainRpc && isStart
        ? DaemonLocalServiceLauncherStartRequestV1Schema.safeParse(admittedInput.data) : null;
      const parsed = domainRpc ? parseLocalServiceDomainActionRpcRequest(args.actionId, admittedInput.data) : isStart
        ? parsedStart
        : LocalServiceActionRequestV1Schema.safeParse(admittedInput.data);
      if (!parsed?.success) return executionRunActionFailure('invalid_parameters');
      const request = parsed.data;
      const machineId = 'target' in request ? request.target.machineId : request.machineId;
      const denied = await projectHomeAdmission(parsedStart?.success ? parsedStart.data.workspace?.serverId : undefined, args.context);
      if (denied) return denied;
      const method = spec.bindings?.rpcMethod;
      if (!method) return executionRunActionFailure('runtime_action_disabled');
      if (!params.credentials && params.machineActionDirectTargetTransport?.machineId !== machineId) {
        return executionRunActionFailure('not_authenticated');
      }
      args.context.signal?.throwIfAborted();
      const response = await withProjectHome(() => callMachineAction({ machineId, serverId: projectHomeId,
        method, request: domainRpc ? request : createTargetedActionRpcRequestV1(request, { kind: 'machine', machineId },
          { defaultSessionId: args.context.defaultSessionId }),
        authority: args.context.authority, authorization: args.context.rpcSessionAuthorization,
        context: args.context, effectActionId: args.actionId, exactMachine: true, timeoutMs: null,
        ...(args.context.signal ? { signal: args.context.signal } : {}),
      }));
      const failure = ActionExecuteFailureSchema.safeParse(response);
      if (failure.success) return failure.data;
      const result = domainRpc && 'snapshotResponseSchema' in domainRpc
        ? domainRpc.snapshotResponseSchema.parse(response).snapshot : response;
      if (requiresAgentEgressRedaction(args.context)) {
        if (args.actionId === 'localServices.publicPreview.status') return redactLocalServicePublicPreviewSnapshotForAgentEgress(LocalServicePublicPreviewSnapshotV1Schema.parse(result));
        if (args.actionId === 'localServices.publicPreview.create') return redactLocalServicePublicPreviewCreateResponseForAgentEgress(DaemonLocalServicePublicPreviewCreateResponseV1Schema.parse(result));
        if (args.actionId === 'localServices.publicPreview.revoke') return redactLocalServicePublicPreviewRevokeResponseForAgentEgress(DaemonLocalServicePublicPreviewRevokeResponseV1Schema.parse(result));
      }
      return result;
    },
    ...(approvalsStore ? { memoryLibrary: {
      serverId: actionHomeId,
      isSameServerId: isSameActionHomeId,
      store: approvalsStore.promptLibraryStore, randomId: randomUUID,
      readExposure: async (artifactId, context) => {
        if (!actionDeps.artifactAccessAction || !actionDeps.artifactAction) throw Object.assign(new Error('memory_exposure_unavailable'), { code: 'memory_exposure_unavailable' });
        const grants = ArtifactAccessGrantsListResponseV1Schema.parse(await actionDeps.artifactAccessAction({
          actionId: 'artifact.access.grants.list', input: { artifactId }, context, signal: context.signal }));
        const publicShares = grants.access === 'owner' ? StoredContentPublicSharesListResponseV1Schema.parse(await actionDeps.artifactAction({
          actionId: 'artifact.public_link.list', input: { artifactId }, context, signal: context.signal })) : null;
        return { grants, publicShares };
      },
      readSession: async (ref, context) => {
        if (!params.credentials) throw Object.assign(new Error('not_authenticated'), { code: 'not_authenticated' });
        const read = async () => {
          const target = await resolveSessionTransportContext({ credentials: params.credentials!, idOrPrefix: ref.sessionId,
            signal: context.signal, resolveAuthorizationHeaders: request => resolveServerRequestHeaders(context, 'memory.remember', request) });
          if (!target.ok || target.sessionId !== ref.sessionId) throw Object.assign(new Error('session_target_unavailable'), { code: 'session_target_unavailable' });
          const metadata = readTransportSessionOwnerMetadata(target);
          if (!metadata) throw Object.assign(new Error('session_target_unavailable'), { code: 'session_target_unavailable' });
          const machineId = readSessionOwnerLocality({ metadata, rawSession: target.rawSession })?.machineId;
          return { metadata, revision: target.rawSession.metadataVersion, ...(machineId ? { machineId } : {}) };
        };
        return params.serverHttpBaseUrl ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, read) : read();
      },
      readInheritedContext: async (snapshot, context) => {
        if (!params.credentials) throw Object.assign(new Error('not_authenticated'), { code: 'not_authenticated' });
        const read = () => readCliMemoryInheritedContext({ credentials: params.credentials!,
          serverId: actionHomeId, snapshot, context });
        return params.serverHttpBaseUrl ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, read) : read();
      },
      readScopeContext: async (target, context) => {
        if (!params.credentials) throw Object.assign(new Error('not_authenticated'), { code: 'not_authenticated' });
        if (target.scope === 'project' && await projectAccountAdmission(target.projectRef.serverId, context)) {
          throw Object.assign(new Error('project_context_access_denied'), { code: 'project_context_access_denied' });
        }
        if (!actionDeps.projectsContextUpdate || !actionDeps.projectSourcesRead || !actionDeps.projectSourcesUpdate) {
          throw Object.assign(new Error('project_context_unavailable'), { code: 'project_context_unavailable' });
        }
        const read = () => readCliMemoryScopeContext({ credentials: params.credentials!,
          serverId: target.scope === 'project' ? target.projectRef.serverId : todoHomeServerId, target, context,
          readProjectRows: () => readProjectRows(context.signal, context, 'memory.remember'),
          projectsContextUpdate: actionDeps.projectsContextUpdate!, projectSourcesRead: actionDeps.projectSourcesRead!,
          projectSourcesUpdate: actionDeps.projectSourcesUpdate!,
        });
        return runWithServerHttpBaseUrl(todoHomeBaseUrl, read);
      },
      readArtifactHeaders: async (refs, context) => {
        const serverId = params.credentials?.requesterSessionCredentialScope?.serverId
          ?? params.serverId ?? configuration.activeServerId;
        if ((params.credentials?.requesterSessionCredentialScope || context.externalActionCredential
          || context.externalActionExecutionAuthorization)
          && (!isSameActionHomeId(serverId) || refs.some(ref => ref.serverId?.trim() && !isSameActionHomeId(ref.serverId)))) {
          throw Object.assign(new Error('server_target_mismatch'), { code: 'server_target_mismatch' });
        }
        return withCliPromptLibraryArtifactReader(reader => Promise.all(refs.map(async ref =>
          (await reader.readArtifactHeader(ref.serverId && isSameActionHomeId(ref.serverId)
            ? { ...ref, serverId } : ref))?.header ?? null)), {
          credentials: params.credentials, serverId, signal: context.signal,
        });
      },
    } } : {}),
    projectsWorkspaceUpdate: async ({ serverId, workspaceId, label, pinned }: ProjectWorkspaceUpdateInputV1,
      context?: ActionExecutorContext): Promise<ProjectWorkspaceUpdateOutputV1> => {
      const refused = await projectAccountAdmission(serverId, context);
      if (refused) return refused;
      serverId = await resolveProjectHomeIdentity();
      const operationSignal = context?.signal;
      try {
        const before = await readProjectRows(operationSignal, context, 'projects.workspace.update');
        const resolved = resolveWorkspaceRefV1(before.workspaceRefs, { serverId, id: workspaceId });
        if (resolved.kind !== 'resolved') return executionRunActionFailure(resolved.kind === 'missing' ? 'not_found' : `workspace_ref_${resolved.kind}`);
        const ref = resolved.ref;
        const mutations: OpenedProjectAccountRowMutationRequest['mutations'][number][] = [];
        const key = { kind: 'workspace-ref' as const, serverId: ref.serverId, id: ref.id };
        const revisionFor = (rowKey: Parameters<typeof buildProjectAccountRowPhysicalKeyV1>[0]) => before.rows.find(
          row => buildProjectAccountRowPhysicalKeyV1(row.key) === buildProjectAccountRowPhysicalKeyV1(rowKey),
        )?.revision ?? 'absent';
        if (label !== undefined && label !== ref.label) {
          const workspaceRef = ProjectAccountWorkspaceRefV1Schema.parse({ ...ref, label });
          mutations.push({ key, expectedRevision: revisionFor(key), payload: { key, value: workspaceRef } });
        }
        const target = projectWorkspaceRefV1(ref);
        const organizationKey = { kind: 'project-organization' as const, ...target };
        const organization = before.organizations.find(row => row.key.serverId === target.serverId && row.key.projectKey === target.projectKey)?.value ?? {};
        let acknowledgedWorkspaceRef = ref;
        let acknowledgedOrganization = organization;
        if (pinned !== undefined && pinned !== (organization.pinned === true)) {
          mutations.push({ key: organizationKey, expectedRevision: revisionFor(organizationKey),
            payload: { key: organizationKey, value: { ...organization, pinned } } });
        }
        if (mutations.length > 0) {
          const result = await withProjectHome(() => mutateProjectAccountRows({ ...projectRowsAuthority(context, 'projects.workspace.update', operationSignal),
            request: { mutations, expectedRefs: [], topologyChange: false }, ...(operationSignal ? { signal: operationSignal } : {}) }));
          if (result.status !== 'updated') return executionRunActionFailure(result.status === 'conflict' ? 'project_account_rows_conflict' : `project_account_rows_${result.status}`);
          for (const row of result.openedRows) {
            if (!row.payload) continue;
            if (row.key.kind === 'workspace-ref' && 'id' in row.payload.value) acknowledgedWorkspaceRef = row.payload.value;
            if (row.key.kind === 'project-organization' && !('id' in row.payload.value) && !('relationships' in row.payload.value)) {
              acknowledgedOrganization = row.payload.value;
            }
          }
        }
        return { ok: true, workspaceRef: acknowledgedWorkspaceRef, organization: acknowledgedOrganization };
      } catch (error) {
        if (isExecutionRunActionAbort(error, operationSignal)) return executionRunActionFailure('cancelled');
        return executionRunActionFailure(readRpcErrorCode(error) ?? 'project_account_rows_unavailable');
      }
    },
    projectsWorkspaceForget: async ({ serverId, workspaceId }: ProjectWorkspaceForgetInputV1,
      context?: ActionExecutorContext): Promise<ProjectWorkspaceForgetOutputV1> => {
      const refused = await projectAccountAdmission(serverId, context);
      if (refused) return refused;
      serverId = await resolveProjectHomeIdentity();
      try {
        const result = await withProjectHome(() => createProjectAccountSnapshotMutation(projectRowsAuthority(context, 'projects.workspace.forget', context?.signal))(snapshot => {
          return { ...snapshot, workspaceRefs: resolveProjectAccountWorkspaceRefRemovalV1(snapshot,
            { serverId, workspaceRefId: workspaceId }) };
        }, context?.signal));
        if (result.status !== 'applied' && result.status !== 'unchanged') return executionRunActionFailure(`project_account_rows_${result.status}`);
        return { ok: true, workspaceId };
      } catch (error) {
        if (isExecutionRunActionAbort(error, context?.signal)) return executionRunActionFailure('cancelled');
        const details = error instanceof Error && 'relationshipIds' in error && Array.isArray(error.relationshipIds)
          && error.relationshipIds.every((id: unknown) => typeof id === 'string')
          ? { relationshipIds: error.relationshipIds } : undefined;
        const code = error instanceof Error && 'code' in error && typeof error.code === 'string'
          ? error.code : readRpcErrorCode(error);
        return executionRunActionFailure(code ?? 'project_account_rows_unavailable', undefined, details);
      }
    },
    ...createCliProjectSourceActionDeps({
      serverHttpBaseUrl: todoHomeBaseUrl,
      admitAccount: async (serverId, context) => {
        const denied = await projectHomeAdmission(serverId, context);
        if (denied) return denied;
        // Shared Source metadata uses the admitted requester HTTP authority;
        // the canonical header owner validates its Home/target/signing context.
        if (context.externalActionExecutionAuthorization) {
          const http = context.externalActionExecutionAuthorization.requesterHttpProjection;
          if (http && (http.accountId !== context.externalActionExecutionAuthorization.binding.accountId
            || http.serverId !== projectHomeId || http.serverHttpBaseUrl.replace(/\/+$/, '') !== todoHomeBaseUrl.replace(/\/+$/, '')
            || !await http.isCurrent())) return executionRunActionFailure('project_requester_authority_unavailable');
          return null;
        }
        const accountDenied = await projectAccountAdmission(serverId, context);
        if (accountDenied) return accountDenied;
        if (params.token !== params.credentials?.token) return executionRunActionFailure('not_authenticated');
        if (!params.serverId && configuration.activeServerId !== projectHomeId) return executionRunActionFailure('server_scope_mismatch');
        return null;
      },
      resolveRequestHeaders: async (context, effectActionId, request) => {
        const projection = context.externalActionExecutionAuthorization?.requesterHttpProjection;
        if (!projection) return resolveServerRequestHeaders(context, effectActionId, request);
        return projection.createRequestHeaders({ ...request, effectActionId, ...(context.signal ? { signal: context.signal } : {}) });
      },
      readArtifact: async (ref, options, context) => {
        if (context.externalActionExecutionAuthorization) return readProjectRequesterArtifact(ref, options, context);
        if (await projectAccountAdmission(projectHomeId, context) || !roleArtifactStore) return null;
        if (await isServerProfileHomeIdentity(projectHomeId, ref.serverId)) {
          return runWithServerHttpBaseUrl(todoHomeBaseUrl, () => roleArtifactStore.read(ref.artifactId, options));
        }
        // Signed Source HTTP authority carries no foreign Home Artifact reader;
        // it cannot borrow the custodian's saved-profile credentials.
        if (context.externalActionCredential || context.externalActionExecutionAuthorization) return null;
        return withCliPromptLibraryArtifactReader(async reader => {
          const artifact = await reader.readArtifact(ref);
          return artifact ? { artifactId: artifact.id, header: artifact.header } : null;
        }, { serverId: projectHomeId, signal: options?.signal });
      },
    }),
    ...(roleArtifactStore && homeAccountId ? createCliWidgetAreaActionDepsV1({
      transport: createAcknowledgedAccountArtifactTransport({
        read: (id, options) => runWithServerHttpBaseUrl(todoHomeBaseUrl, () => roleArtifactStore.read(id, options)),
        create: args => runWithServerHttpBaseUrl(todoHomeBaseUrl, () => roleArtifactStore.create(args)),
        update: args => runWithServerHttpBaseUrl(todoHomeBaseUrl, () => roleArtifactStore.update(args)),
        list: args => runWithServerHttpBaseUrl(todoHomeBaseUrl, () => roleArtifactStore.list(args)),
        delete: (id, options) => runWithServerHttpBaseUrl(todoHomeBaseUrl, () => roleArtifactStore.delete(id, options)),
      }), scope: { serverId: widgetHomeId, accountId: homeAccountId },
      // A CLI invocation captures its credentials and explicit Home; only ambient invocations follow active Home changes.
      isCurrent: () => !!params.serverId || configuration.activeServerId === todoHomeServerId,
    }) : {}),
    ...(roleArtifactStore && homeAccountId ? createCliWidgetDefinitionActionDepsV1({
      transport: roleArtifactStore, accountId: homeAccountId, serverHttpBaseUrl: params.serverHttpBaseUrl,
      getDeps: () => readEffectiveDeps?.() ?? actionDeps, readCandidates: readWidgetCandidates,
    }) : {}),
    ...createCliWidgetInputActionDepsV1({
      serverId: widgetHomeId, accountId: homeAccountId,
      getDeps: () => readEffectiveDeps?.() ?? actionDeps, readCandidates: readWidgetCandidates,
      readWorkspaceRefs: async (signal, context) => (await readAdmittedProjectRows(signal, context, 'widgets.item.inputs.validate'))?.workspaceRefs ?? null,
      readInputTypes: async (signal, session) => (await readWidgetProjection(signal, session))?.familiesById.inputTypes,
      readResources: async (signal, session) => {
        const projection = await readWidgetProjection(signal, session);
        return { resources: Object.values(projection?.resourcesById ?? {}),
          connectedAccountDescriptors: Object.values(projection?.familiesById.connectedAccounts?.entriesById ?? {}) };
      },
      readViewerPurposeContext: async (signal, context) => {
        if (!params.credentials || !homeAccountId) return null;
        const credentials = params.credentials;
        const operationContext = params.savedSecretOperationContext;
        const home = operationContext?.serverHttpBaseUrl ?? params.serverHttpBaseUrl ?? resolveServerHttpBaseUrl();
        const read = async () => {
          const authorizeRequest = (request: Readonly<{ method: string; path: string; body?: unknown }>) =>
            resolveServerRequestHeaders(context, context.externalActionExecutionAuthorization?.binding.actionId ?? 'widgets.catalog.list', request);
          const catalogInput = { credentials, signal, operationContext, authorizeRequest };
          const store = createCliConnectedAccountCatalogStore(catalogInput);
          store.assertCurrent();
          const purpose = await readActiveConnectedAccountCatalog({ ...catalogInput, key: 'purposes' });
          store.assertCurrent();
          if (purpose.status !== 'ready' || purpose.record.key !== 'purposes') return null;
          const profile = await fetchAccountProfile({ token: credentials.token, signal, authorizeRequest });
          store.assertCurrent();
          if (operationContext && !await operationContext.isCurrent()
            || params.isCredentialCurrent && !await params.isCredentialCurrent()) return null;
          store.assertCurrent();
          return profile.id === homeAccountId ? { profile, purposeBindings: purpose.record.value } : null;
        };
        return runWithServerHttpBaseUrl(home, read);
      },
      validateSession: async (session, signal) => {
        if (!isSameActionHomeId(session.serverId)) return false;
        const transport = await resolveTransportForSession(session.sessionId, signal);
        return transport.ok && transport.sessionId === session.sessionId;
      },
    }),
    widgetAccountScope: () => {
      const accountId = params.credentials ? readAccountIdFromToken(params.credentials.token) : null;
      return accountId ? { serverId: widgetHomeId, accountId, isSameServerId: isSameActionHomeId } : null;
    },
    widgetCatalog: { describeSurface: async (surface, _context, signal) => {
      const projection = await readWidgetProjection(signal);
      return describeWidgetAreaApprovalSurfaceV1(surface, Object.values(projection?.familiesById.pluginUi?.entriesById ?? {}));
    }, readInstalledInputFields: async ({ surface, definition, signal, boundSession }) => {
      const physicalSession = readWidgetActionSessionTargetV1(surface);
      const candidates = await readWidgetCandidates(signal, readWidgetActionSessionTargetV1(surface, boundSession));
      if (physicalSession && boundSession && physicalSession.sessionId !== boundSession.sessionId) {
        await resolveWidgetSessionTransport(physicalSession, signal);
      }
      const candidate = candidates.find(candidate => candidate.availability === 'available'
        && isSameWidgetDefinitionV1(widgetCandidateDefinitionV1(candidate), definition));
      return candidate?.fields ?? null;
    }, list: async (surface, _context, signal, boundSession) => {
      const port = readWidgetActionSurfacePortV1(actionDeps, surface);
      if (!port) return { ok: false, errorCode: 'unsupported_widget_surface', error: 'unsupported_widget_surface' };
      const sessionRef = readWidgetActionSessionTargetV1(surface, boundSession);
      const candidates = await readWidgetCandidates(signal, sessionRef);
      const read = await port.read(surface, _context, signal);
      if ('ok' in read) return read;
      const instances = read.instances.map(entry => entry.instance);
      const entries = candidates.map(candidate => cliWidgetCatalogEntryV1(candidate, countWidgetInstancesV1(instances, widgetCandidateDefinitionV1(candidate))));
      for (const summary of await actionDeps.widgetDefinitionArtifacts?.list(signal) ?? []) {
        const reference = { kind: 'artifact' as const, artifactId: summary.artifactId };
        entries.push({ definition: reference, title: summary.name, fields: [...summary.inputs.fields],
          sizeDeclaration: summary.sizeDeclaration,
          availability: summary.bodyKind === 'declarative' || summary.bodyKind === 'html' || summary.bodyKind === 'builtin' || summary.sourceDefinition && candidates.some(candidate => candidate.availability === 'available'
            && isSameWidgetDefinitionV1(widgetCandidateDefinitionV1(candidate), summary.sourceDefinition!)) ? 'available' : 'unavailable',
          instanceCount: countWidgetInstancesV1(instances, reference) });
      }
      return entries;
    } },
    artifactAction: async (args) => {
      if (!roleArtifactStore) return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
      const execute = createCliArtifactActions({ store: roleArtifactStore, onPublicLinkIssued: params.onPublicLinkIssued,
        authorizationHeaders: (context, effectActionId) => async request => {
          const headers = resolveServerRequestHeaders(context, effectActionId, request);
          if (!headers) throw Object.assign(new Error('execution_not_authorized'), { code: 'execution_not_authorized' });
          return { ...headers };
        },
        beforeDelete: async ({ artifactId, signal }) => {
          signal?.throwIfAborted();
          const assertCurrent = () => {
            if (!isActiveAccountSettingsSnapshotLifetimeCurrent({ scopeKey: roleAccountScopeKey, lifetimeToken: roleAccountLifetimeToken })) {
              throw Object.assign(new Error('scope-retired'), { code: 'scope-retired' });
            }
          };
          assertCurrent();
          if (!homeAccountId || !readRawRoleSettings) {
            throw Object.assign(new Error('account_settings_content_unavailable'), { code: 'account_settings_content_unavailable' });
          }
          const rawSettings = await readRawRoleSettings({ requireCurrentNetwork: true });
          signal?.throwIfAborted();
          assertCurrent();
          await assertAccountRoleArtifactDeletionV1({ artifactId, accountId: homeAccountId, rawSettings,
            readTargetArtifactKind: async () => {
              const artifact = await roleArtifactStore.read(artifactId, { signal, includeSharedAudience: false });
              signal?.throwIfAborted();
              assertCurrent();
              return typeof artifact?.header.kind === 'string' ? artifact.header.kind : undefined;
            } });
        }, resolvePublishCaller: resolveWorkspacePublishCaller });
      return params.serverHttpBaseUrl
        ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, () => execute({ ...args, context: artifactCallerContext(args.context) }))
        : execute({ ...args, context: artifactCallerContext(args.context) });
    },
    artifactAccessAction: async (args) => {
      if (!roleArtifactStore) return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
      const authorizationHeaders: ArtifactRequestAuthorizationHeaders | undefined =
        args.context.externalActionCredential || args.context.externalActionExecutionAuthorization ? async request => {
          const headers = resolveServerRequestHeaders(args.context, args.actionId, request);
          if (!headers) throw Object.assign(new Error('execution_not_authorized'), { code: 'execution_not_authorized' });
          return { ...headers };
        } : undefined;
      const options = authorizationHeaders ? { authorizationHeaders } : undefined;
      const artifactAccessAction = createArtifactAccessActionsV1({
        read: (artifactId, readOptions) => roleArtifactStore.read(artifactId, { ...readOptions,
          ...(authorizationHeaders ? { authorizationHeaders, includeSharedAudience: false } : {}) }),
        transport: {
          list: (input, signal) => roleArtifactStore.accessGrants.list(input, signal, options),
          set: (input, signal) => roleArtifactStore.accessGrants.set(input, signal, options),
          remove: (input, signal) => roleArtifactStore.accessGrants.remove(input, signal, options),
        },
      });
      return params.serverHttpBaseUrl
        ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, () => artifactAccessAction(args)) : artifactAccessAction(args);
    },
    connectedServiceAction,
    profileActionExecute: params.credentials ? createCliProfileActionExecuteV1({
      credentials: params.credentials, serverId: projectHomeId,
      serverHttpBaseUrl: params.serverHttpBaseUrl ?? resolveServerHttpBaseUrl(),
      ...(params.savedSecretOperationContext ? { operationContext: params.savedSecretOperationContext } : {}),
      callMachineAction,
    }) : undefined,
    mcpServerAction: params.credentials ? createCliMcpServerActionExecuteV1({
      credentials: params.credentials, serverId: projectHomeId,
      serverHttpBaseUrl: params.serverHttpBaseUrl ?? resolveServerHttpBaseUrl(),
      ...(params.savedSecretOperationContext ? { operationContext: params.savedSecretOperationContext } : {}),
      callMachineAction,
      connectedServiceAction,
      registryActionExecute: request => {
        if (!actionDeps.registryActionExecute) throw new Error('registry_unavailable');
        return actionDeps.registryActionExecute(request);
      },
      personalSavedSecretActionExecute: params.personalSavedSecretActionExecute,
    }) : undefined,
    providerActionExecute: params.credentials ? createCliProviderActionExecuteV1({
      credentials: params.credentials, serverId: projectHomeId,
      serverHttpBaseUrl: params.serverHttpBaseUrl ?? resolveServerHttpBaseUrl(),
      ...(params.savedSecretOperationContext ? { operationContext: params.savedSecretOperationContext } : {}),
      ...(params.providerPreparedSavedSecret ? { preparedSavedSecret: params.providerPreparedSavedSecret } : {}),
      ...(params.isCredentialCurrent ? { isCredentialCurrent: params.isCredentialCurrent } : {}),
      callMachineAction,
    }) : undefined,
    remoteHostActionExecute: params.credentials ? createCliRemoteHostActionExecuteV1({
      credentials: params.credentials, serverId: projectHomeId,
      serverHttpBaseUrl: params.serverHttpBaseUrl ?? resolveServerHttpBaseUrl(),
      ...(params.savedSecretOperationContext ? { operationContext: params.savedSecretOperationContext } : {}),
    }) : undefined,
    launchProfilePublish: async (input, context) => {
      const credentials = params.credentials;
      if (!roleArtifactStore || !credentials) throw Object.assign(new Error('not_authenticated'), { code: 'not_authenticated' });
      const denied = await projectAccountAdmission(undefined, context?.context);
      if (denied) throw Object.assign(new Error(denied.errorCode), { code: denied.errorCode });
      return await runWithServerHttpBaseUrl(launchProfilePublicationServerUrl, async () => {
        context?.signal?.throwIfAborted();
        if (!params.savedSecretOperationContext && !getActiveAccountSettingsSnapshot()) await bootstrapAccountSettingsContext({ credentials, mode: 'blocking' });
        const profileStore = params.savedSecretOperationContext
          ? createCliProfileStoreForOperation({ operationContext: params.savedSecretOperationContext, signal: context?.signal })
          : createCliProfileStore({ credentials, signal: context?.signal });
        const refreshCatalog = () => refreshActiveProfileCatalog({ credentials, signal: context?.signal,
          ...(params.savedSecretOperationContext ? { operationContext: params.savedSecretOperationContext } : {}) });
        await refreshCatalog();
        profileStore.assertCurrent();
        let capturedRow: Readonly<{ record: ProfileRecordV1; revision: number }> | null = null;
        return await createLaunchProfilePublisherV1({
          profileStore: {
            read: async profileId => {
              const catalog = await profileStore.readProfileCatalog();
              profileStore.assertCurrent();
              if (catalog.status !== 'ready' || catalog.source !== 'destination') {
                throw Object.assign(new Error('profile_catalog_unavailable'), { code: 'profile_catalog_unavailable' });
              }
              capturedRow = catalog.records.find(row => row.record.id === profileId) ?? null;
              return capturedRow;
            },
            updateDefinition: async ({ profileId, expectedRevision, artifactId }) => {
              profileStore.assertCurrent();
              if (!capturedRow || capturedRow.record.id !== profileId || capturedRow.revision !== expectedRevision) {
                throw Object.assign(new Error('profile_revision_conflict'), { code: 'profile_revision_conflict' });
              }
              const result = await profileStore.writeRecord({
                record: { ...capturedRow.record, definition: { kind: 'artifact', artifactId } },
                expectedRevision, operation: 'update',
              });
              if (result.status !== 'updated') {
                throw Object.assign(new Error(`profile_row_${result.status}`), { code: `profile_row_${result.status}` });
              }
              await refreshCatalog().catch(() => undefined);
            },
          },
          artifactStore: {
            read: (id, signal) => {
              profileStore.assertCurrent();
              return roleArtifactStore.read(id, signal ? { signal } : undefined);
            },
            create: input => {
              profileStore.assertCurrent();
              return roleArtifactStore.create(input);
            },
          },
        }).publish(input, { ...context,
          context: artifactCallerContext(context?.context ?? { surface: 'cli', authority: 'present_user' }) });
      });
    },
    resolveSessionSpawnAgentInventorySelection,
    notificationChannelsList: async (context) => {
      if (!params.credentials) return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
      context.signal?.throwIfAborted();
      try {
        const items = await listActivityNotificationChannels({ ...await readNotificationContext(context.signal),
          pushTokenReader: new PushNotificationClient(params.credentials.token,
            params.savedSecretOperationContext?.serverHttpBaseUrl ?? params.serverHttpBaseUrl,
            params.serverId ?? configuration.activeServerId),
          ...(params.resolvePluginNotifications ? { pluginNotifications: params.resolvePluginNotifications() } : {}) });
        context.signal?.throwIfAborted();
        return { items };
      } catch (error) { return notificationFailure(error); }
    },
    webhookCall: async (input, context) => {
      context.signal?.throwIfAborted();
      let result: Awaited<ReturnType<typeof postWebhookJsonAsync>>;
      try {
        result = await postWebhookJsonAsync({ ...input,
          idempotencyKey: context.actionRequestId ?? randomUUID(),
          ...(context.signal ? { signal: context.signal } : {}) });
      } catch (error) {
        if (error instanceof WebhookDestinationAdmissionError) {
          return { ok: false, errorCode: 'webhook_destination_rejected', error: 'Webhook destination rejected' };
        }
        throw error;
      }
      return result.status >= 300
        ? { ok: false, errorCode: 'webhook_failed', error: 'Webhook failed', details: result } : result;
    },
    notificationsNotifyMe: async (input, context) => {
      if (!params.credentials) return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
      context.signal?.throwIfAborted();
      if (input.open?.kind === 'session') {
        const session = await fetchSessionById({ token: params.credentials.token, sessionId: input.open.sessionId,
          ...(params.savedSecretOperationContext?.serverHttpBaseUrl || params.serverHttpBaseUrl
            ? { serverUrl: params.savedSecretOperationContext?.serverHttpBaseUrl ?? params.serverHttpBaseUrl } : {}),
          ...(context.signal ? { signal: context.signal } : {}), accessProjectionVersion: 1 });
        if (session?.id !== input.open.sessionId || !session.effectiveAccess?.capabilities.readTranscript) {
          return { ok: false, errorCode: 'session_not_found', error: 'session_not_found' };
        }
      } else if (input.open?.kind === 'workflow_run') {
        if (!workflowAction) return { ok: false, errorCode: 'target_unavailable', error: 'target_unavailable' };
        const visible = await workflowAction({ actionId: 'workflow.run.get', input: { runId: input.open.runId }, context });
        if ('errorCode' in visible && visible.ok === false) return visible;
      }
      context.signal?.throwIfAborted();
      try {
      return await dispatchActivityNotificationAsync({
        ...await readNotificationContext(context.signal),
        expoPushSender: new PushNotificationClient(params.credentials.token,
          params.savedSecretOperationContext?.serverHttpBaseUrl ?? params.serverHttpBaseUrl,
          params.serverId ?? configuration.activeServerId),
        ...(params.resolvePluginNotifications ? { pluginNotifications: params.resolvePluginNotifications() } : {}),
        ...(input.channels ? { channels: input.channels } : {}),
        event: { topic: 'notify_me', message: input.message,
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.open ? { open: input.open } : {}),
          ...(context.actionRequestId ? { actionRequestId: context.actionRequestId } : {}) },
      });
      } catch (error) { return notificationFailure(error); }
    },
    machineCommandRun: async (input, context) => {
      context.signal?.throwIfAborted();
      const target = context.externalActionTarget;
      if (target?.kind !== 'machine' || !target.project || target.project.machineId !== target.machineId) {
        return { ok: false, errorCode: 'command_target_required', error: 'Command machine and workspace are required' };
      }
      if (!await isMachineActionServerScopeCurrent({ serverId: context.serverId, machineId: target.machineId, context, signal: context.signal })) {
        return { ok: false, errorCode: 'server_scope_mismatch', error: 'server_scope_mismatch' };
      }
      if (!params.credentials && params.machineActionDirectTargetTransport?.machineId !== target.machineId) {
        return { ok: false, errorCode: 'command_transport_unavailable', error: 'Command machine transport is unavailable' };
      }
      const raw = await callMachineAction({
        machineId: target.machineId,
        serverId: context.serverId ?? undefined,
        authority: context.authority,
        method: RPC_METHODS.BASH,
        request: { command: input.command, ...(input.env ? { env: input.env } : {}),
          cwd: target.project.directory, cwdMode: 'explicit', timeout: 0,
          ...(context.actionCaller?.kind === 'workflowRun'
            ? { outputTailMaxBytes: MAX_AUTOMATION_STORED_ENVELOPE_UTF8_BYTES } : {}) },
        timeoutMs: null,
        ...(context.signal ? { signal: context.signal } : {}),
      });
      if (raw === null || typeof raw !== 'object' || Array.isArray(raw) || !('success' in raw) || typeof raw.success !== 'boolean') {
        return { ok: false, errorCode: 'action_failed', error: 'Command result is invalid' };
      }
      const response = raw as Record<string, unknown>;
      // Pre-process refusals may omit output; a successful command must carry
      // complete output rather than fabricating an empty result after an effect.
      const output = WorkflowMachineCommandOutputV1Schema.safeParse({
        exitCode: response.exitCode === undefined && !response.success ? -1 : response.exitCode,
        stdout: response.stdout === undefined && !response.success ? '' : response.stdout,
        stderr: response.stderr === undefined && !response.success ? '' : response.stderr,
        ...(response.stdoutTruncated === undefined ? {} : { stdoutTruncated: response.stdoutTruncated }),
        ...(response.stderrTruncated === undefined ? {} : { stderrTruncated: response.stderrTruncated }),
      });
      if (!output.success) return { ok: false, errorCode: 'action_failed', error: 'Command result is invalid' };
      if (response.success) return output.data;
      const cancelled = response.error === 'Command cancelled';
      return { ok: false, errorCode: cancelled ? 'command_cancelled' : 'command_failed',
        error: cancelled ? 'Command cancelled' : 'Command failed', details: output.data };
    },
    getCurrentWorkspaceWrites: params.getCurrentWorkspaceWrites ?? (params.getCurrentSessionMetadata ? () => {
      const read = readAccountRoleOverrides();
      return read.status === 'ready' ? readSessionWorkspaceWritesV1(params.getCurrentSessionMetadata?.(), {
        settingsOverrides: read.overrides, settingsRoles: params.getCurrentResolvedRoles?.(),
      }) : 'deny';
    } : undefined),
    roleActionExecute: ((createHost: (sessionId: string, readMetadata: typeof params.getCurrentSessionMetadata) =>
      NonNullable<ActionExecutorDeps['roleActionExecute']>): NonNullable<ActionExecutorDeps['roleActionExecute']> =>
      async (initialRequest) => {
        const operation = async () => {
        let request = { ...initialRequest, context: artifactCallerContext(initialRequest.context) };
        const input = RoleActionInputSchemasV1[request.actionId].parse(request.input);
        if (request.context.authority !== 'present_user'
          && (request.actionId === 'session.roles.apply_to_reports' || ('sessionId' in input && input.sessionId !== params.sessionId))
          && (request.context.actionCaller?.kind !== 'workflowRun'
            && request.context.actionCaller?.kind !== 'session' || !params.sessionActionRpcTransport)) {
          throw Object.assign(new Error('role_rpc_origin_unavailable'), { code: 'role_rpc_origin_unavailable' });
        }
        await prepareAccountRoleOverrides(request.context.signal);
        if (!await isWorkflowAuthorizationCurrent(request.context)) {
          throw new RoleActionRefusalV1('run_access_denied');
        }
        let execute = createHost(params.sessionId, params.getCurrentSessionMetadata);
        if (request.context.actionCaller?.kind === 'session' && request.context.authority !== 'present_user') {
          const caller = await resolveActionCallerSession(request.context);
          if (!caller?.metadata) throw Object.assign(new Error('target_unavailable'), { code: 'target_unavailable' });
          const roleSources = await readRoleSources(request.context.signal);
          const overridesRead = await readReadyAccountRoleOverrides(request.context.signal);
          if (overridesRead.status !== 'ready') throw Object.assign(new Error('account_role_overrides_unavailable'), {
            code: 'account_role_overrides_unavailable', reason: overridesRead.reason,
          });
          const currentWrites = readSessionWorkspaceWritesV1(caller.metadata, {
            roleSourceInventory: roleSources,
            settingsOverrides: overridesRead.overrides,
          });
          request = { ...request, context: { ...request.context,
            workspaceWrites: currentWrites === 'deny' || request.context.workspaceWrites === 'deny' ? 'deny' : currentWrites } };
        }
        // The source daemon owns the authenticated origin. Expand report copies
        // there through the same role owner, rather than asking a target Session
        // to impersonate the caller's Machine on a second forwarding hop.
        if (request.actionId === 'session.roles.apply_to_reports'
          && (request.context.actionCaller?.kind === 'session' || request.context.actionCaller?.kind === 'workflowRun')
          && request.context.authority !== 'present_user') {
          const input = RoleActionInputSchemasV1['session.roles.apply_to_reports'].parse(request.input);
          const target = await resolveTransportForSession(input.sessionId, request.context.signal);
          if (!target.ok || target.rawSession.effectiveAccess?.level !== 'owner' || !params.credentials) {
            throw Object.assign(new Error('session_target_unavailable'), { code: 'session_target_unavailable' });
          }
          const metadata = tryDecryptSessionOwnerMetadataView({ credentials: params.credentials,
            accountEncryptionMode: target.accountEncryptionCurrentness.mode, rawSession: target.rawSession });
          if (!metadata) throw Object.assign(new Error('session_target_unavailable'), { code: 'session_target_unavailable' });
          execute = createHost(input.sessionId, () => metadata);
        }
        const result = await execute(request);
        if (params.credentials && (request.actionId === 'roles.list' || request.actionId === 'roles.get')
          && !(params.savedSecretOperationContext ? await params.savedSecretOperationContext.isCurrent()
            : isActiveAccountSettingsSnapshotLifetimeCurrent({ scopeKey: roleAccountScopeKey, lifetimeToken: roleAccountLifetimeToken }))) {
          throw Object.assign(new Error('account_role_overrides_unavailable'), {
            code: 'account_role_overrides_unavailable', reason: 'scope-retired',
          });
        }
        return result;
        };
        try {
          return await (params.serverHttpBaseUrl
            ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, operation) : operation());
        } catch (error) {
          const diagnostic = readSessionPreparationFailureDiagnostic(error);
          if (diagnostic.originalCode === 'context_source_unavailable' || diagnostic.originalCode === 'role_overrides_unavailable') {
            logger.infoFile('[Session] Role Action refused', diagnostic);
          }
          throw error;
        }
      })((sessionId, readSessionMetadata) => createRoleActionExecutor({
      sessionId,
      readSessionMetadata,
      stageSessionStateMutation: params.stageSessionStateMutation,
      beforeSessionMutation: async (context, targetSessionId) => {
        if (context.actionCaller?.kind !== 'workflowRun') return;
        if (!await isWorkflowAuthorizationCurrent(context)) {
          throw new RoleActionRefusalV1('run_access_denied');
        }
        const current = await resolveActionAgentStartContextV1({ resolveAgentStartContext, sessionList }, context, targetSessionId);
        const admission = admitActionAgentStartV1(context, { kind: 'session_target', targetSessionId }, current);
        if (!admission.ok) throw new RoleActionRefusalV1(admission.error.errorCode);
      },
      readRoleSources,
      readPluginRoles: params.readPluginRoles,
      prepareWorkspaceWritesPolicy: params.prepareWorkspaceWritesPolicy,
      forwardSessionRoleAction: async ({ actionId, input, context }) => {
        const request = RoleActionInputSchemasV1[actionId].parse(input);
        if (!('sessionId' in request)) throw Object.assign(new Error('session_target_unavailable'), { code: 'session_target_unavailable' });
        const transport = await resolveTransportForSession(request.sessionId, context.signal);
        if ('ok' in transport && transport.ok === false) throw Object.assign(new Error(transport.code), { code: transport.code });
        const response = await callSessionActionRpc(transport, actionId, input, context);
        if (response && typeof response === 'object' && 'ok' in response && response.ok === false) return response;
        const parsed = RoleActionOutputSchemasV1[actionId].safeParse(response);
        if (parsed.success) return parsed.data;
        throw Object.assign(new Error('session_target_unavailable'), { code: 'session_target_unavailable' });
      },
      artifactStore: roleArtifactStore,
      readSettingsOverrides: readReadyAccountRoleOverrides,
      ...(params.credentials ? {
        accountId: readAccountIdFromToken(params.credentials.token) ?? undefined,
        listReportSessions: async (leadSessionId, context) => {
          const accountId = readAccountIdFromToken(params.credentials!.token);
          if (!accountId) throw Object.assign(new Error('not_authenticated'), { code: 'not_authenticated' });
          const reportsByStorage = await Promise.all((['active', 'archived'] as const).map(async storage => {
            const reports: { sessionId: string; ownerAccountId: string }[] = [];
            let cursor: string | undefined;
            do {
              const read = () => fetchSessionsQueryPage({ token: params.credentials!.token,
                query: { v: 1, storage, includeInactive: true, scope: 'all_accessible', attention: 'any', audiences: [], tagIds: [],
                  underSessionId: leadSessionId, ...(cursor ? { cursor } : {}) },
                ...(context.signal ? { signal: context.signal } : {}),
                resolveAuthorizationHeaders: (request) => resolveServerRequestHeaders(context, 'session.roles.apply_to_reports', request),
              });
              const page = await (params.serverHttpBaseUrl ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, read) : read());
              for (const session of page.sessions) {
                if (readSessionManagerSessionIdV1(session) === leadSessionId && session.effectiveAccess.level === 'owner') {
                  reports.push({ sessionId: session.id, ownerAccountId: accountId });
                }
              }
              if (page.hasNext && (!page.nextCursor || page.nextCursor === cursor)) {
                throw Object.assign(new Error('session_list_cursor_invalid'), { code: 'session_list_cursor_invalid' });
              }
              cursor = page.hasNext ? page.nextCursor ?? undefined : undefined;
            } while (cursor);
            return reports;
          }));
          return reportsByStorage.flat();
        },
        writeReportSessionRoles: async (sessionId, configuration, context) => {
          const startedAt = performance.now();
          let transportDurationMs: number | undefined;
          let rpcStartedAt: number | undefined;
          let outcome: 'ok' | 'failed' = 'failed';
          try {
            const transport = await resolveTransportForSession(sessionId, context.signal);
            transportDurationMs = Math.round(performance.now() - startedAt);
            if ('ok' in transport && transport.ok === false) throw Object.assign(new Error(transport.code), { code: transport.code });
            rpcStartedAt = performance.now();
            const result = await callSessionActionRpc(transport, SESSION_RPC_METHODS.SESSION_ROLES_CONFIGURATION_SET,
              { sessionId, configuration }, context);
            if (!result || typeof result !== 'object' || !('updated' in result) || result.updated !== true) {
              const code = result && typeof result === 'object' && 'errorCode' in result && typeof result.errorCode === 'string'
                ? result.errorCode : 'session_target_unavailable';
              throw Object.assign(new Error(code), { code });
            }
            outcome = 'ok';
          } finally {
            logger.infoFile('[Session] Role Apply recipient delivery', { sessionId: params.sessionId, reportSessionId: sessionId,
              phase: rpcStartedAt === undefined ? 'transport' : 'rpc',
              transportDurationMs: transportDurationMs ?? Math.round(performance.now() - startedAt),
              ...(rpcStartedAt === undefined ? {} : { rpcDurationMs: Math.round(performance.now() - rpcStartedAt) }),
              durationMs: Math.round(performance.now() - startedAt),
              outcome: outcome === 'failed' && context.signal?.aborted ? 'cancelled' : outcome });
          }
        },
        readRawAccountSettings: readRawRoleSettings,
        mutateAccountRoleOverrides: async (mutation, context) => {
          await createCliPromptLibraryStore({ credentials: params.credentials!, signal: context.signal,
            operationContext: params.savedSecretOperationContext }).mutateRoleOverride(mutation);
        },
      } : {}),
    })),
    scmActionExecute: executeSessionBoundScmAction,
    executionRunCheckProtocolV2: async (sessionId, requirement, opts) => {
      if (
        !requirement.detachedScope
        && !requirement.startAndWait
        && !requirement.exactInputResults
        && !requirement.runScopedAgentBindings
        && !requirement.secretReferenceOverlay
      ) {
        return { ok: true };
      }
      return await readExecutionRunProtocolV2(sessionId, requirement, opts);
    },
    executionRunStart: async (sessionId, request, opts) => {
      if (sessionId === null) {
        return await callDetachedExecutionRunRpc(
          sessionId,
          SESSION_RPC_METHODS.EXECUTION_RUN_START,
          request,
          opts,
        );
      }
      // Public Session RPC cannot authenticate a host-private admission stamp.
      // Refuse before resuming/sending instead of losing the admitted ceiling.
      if (opts?.workDepth !== undefined || opts?.workspaceWrites !== undefined) {
        return { ok: false, code: 'execution_run_target_unavailable',
          details: withExecutionRunStartFailureDetails(undefined, 'noRunCreated') };
      }
      let transport: Awaited<ReturnType<typeof resolveTransportForSession>>;
      try {
        transport = await resolveTransportForSession(sessionId, opts?.signal);
      } catch (error) {
        // Fresh transport preparation has not attempted resume or Start. Its
        // failure is positive evidence that this invocation created no Run.
        return { ok: false,
          code: isExecutionRunActionAbort(error, opts?.signal) ? 'cancelled' : 'execution_run_target_unavailable',
          details: withExecutionRunStartFailureDetails(undefined, 'noRunCreated') };
      }
      if (!transport.ok) {
        return {
          ok: false,
          code: transport.code,
          ...(transport.candidates ? { candidates: transport.candidates } : {}),
          details: withExecutionRunStartFailureDetails(undefined, 'noRunCreated'),
        };
      }
      const admittedMachineId = normalizeStringValue(opts?.exactMachineId);
      if (
        admittedMachineId
        && readExecutionRunTransportMachineId(transport) !== admittedMachineId
      ) {
        return {
          ok: false,
          code: 'execution_run_target_unavailable',
          details: withExecutionRunStartFailureDetails(undefined, 'noRunCreated'),
        };
      }
      const resumed = await resumeInactiveSessionTransport({
        transport,
        localId: `execution.run.start:${randomUUID()}`,
        effectActionId: 'execution.run.start',
        ...(opts?.signal ? { signal: opts.signal } : {}),
        waitForReady: true,
      });
      if (!resumed.ok) {
        return {
          ok: false,
          code: 'execution_run_target_unavailable',
          message: resumed.message,
          details: withExecutionRunStartFailureDetails(undefined, 'noRunCreated'),
        };
      }
      return await startExecutionRun({
        ...transport,
        token: params.token,
        sessionId: transport.sessionId,
        ...executionRunAuthorityCeiling(opts),
        request,
        ...(opts?.signal ? { signal: opts.signal } : {}),
      });
    },
    executionRunList: async (sessionId, request, opts) => {
      if (sessionId === null) {
        return await callDetachedExecutionRunRpc(
          sessionId,
          SESSION_RPC_METHODS.EXECUTION_RUN_LIST,
          request,
          opts,
        );
      }
      const transport = await resolveTransportForSession(sessionId, opts?.signal);
      if (!transport.ok) {
        return { ok: false, code: transport.code, ...(transport.candidates ? { candidates: transport.candidates } : {}) };
      }
      return await listExecutionRuns({
        ...transport,
        token: params.token,
        sessionId: transport.sessionId,
        ...executionRunAuthorityCeiling(opts),
        request,
        skipLiveRpc: transport.rawSession.active === false,
        ...(opts?.signal ? { signal: opts.signal } : {}),
      });
    },
    executionRunGet: async (sessionId, request, opts) => {
      if (sessionId === null) {
        return await callDetachedExecutionRunRpc(
          sessionId,
          SESSION_RPC_METHODS.EXECUTION_RUN_GET,
          request,
          opts,
        );
      }
      const transport = await resolveTransportForSession(sessionId, opts?.signal);
      if (!transport.ok) {
        return { ok: false, code: transport.code, ...(transport.candidates ? { candidates: transport.candidates } : {}) };
      }
      return await getExecutionRun({
        ...transport,
        token: params.token,
        sessionId: transport.sessionId,
        ...executionRunAuthorityCeiling(opts),
        request,
        ...(opts?.signal ? { signal: opts.signal } : {}),
      });
    },
    detachedExecutionRunSend: async (sessionId, request, opts) =>
      await callDetachedExecutionRunRpc(
        sessionId,
        SESSION_RPC_METHODS.EXECUTION_RUN_SEND,
        { ...request, sessionId },
        opts,
      ),
    executionRunEnsure: async (sessionId, request, opts) => {
      if (sessionId === null) {
        return await callDetachedExecutionRunRpc(
          sessionId,
          SESSION_RPC_METHODS.EXECUTION_RUN_ENSURE,
          request,
          opts,
        );
      }
      const transport = await resolveTransportForSession(sessionId, opts?.signal);
      if (!transport.ok) {
        return { ok: false, code: transport.code, ...(transport.candidates ? { details: transport.candidates } : {}) };
      }
      return await ensureExecutionRun({
        ...transport,
        token: params.token,
        sessionId: transport.sessionId,
        ...executionRunAuthorityCeiling(opts),
        request,
        ...(opts?.signal ? { signal: opts.signal } : {}),
      });
    },
    executionRunEnsureOrStart: async (sessionId, request, opts) => {
      if (sessionId === null) {
        return await callDetachedExecutionRunRpc(
          sessionId,
          SESSION_RPC_METHODS.EXECUTION_RUN_ENSURE_OR_START,
          request,
          opts,
        );
      }
      const transport = await resolveTransportForSession(sessionId, opts?.signal);
      if (!transport.ok) {
        return { ok: false, code: transport.code, ...(transport.candidates ? { details: transport.candidates } : {}) };
      }
      return await ensureOrStartExecutionRun({
        ...transport,
        token: params.token,
        sessionId: transport.sessionId,
        ...executionRunAuthorityCeiling(opts),
        request,
        ...(opts?.signal ? { signal: opts.signal } : {}),
      });
    },
    executionRunStreamStart: async (sessionId, request, opts) => {
      if (sessionId === null) {
        return await callDetachedExecutionRunRpc(
          sessionId,
          SESSION_RPC_METHODS.EXECUTION_RUN_STREAM_START,
          request,
          opts,
        );
      }
      const transport = await resolveTransportForSession(sessionId, opts?.signal);
      if (!transport.ok) {
        return { ok: false, code: transport.code, ...(transport.candidates ? { details: transport.candidates } : {}) };
      }
      return await startExecutionRunStream({
        ...transport,
        token: params.token,
        sessionId: transport.sessionId,
        ...executionRunAuthorityCeiling(opts),
        request,
        ...(opts?.signal ? { signal: opts.signal } : {}),
      });
    },
    executionRunStreamRead: async (sessionId, request, opts) => {
      if (sessionId === null) {
        return await callDetachedExecutionRunRpc(
          sessionId,
          SESSION_RPC_METHODS.EXECUTION_RUN_STREAM_READ,
          request,
          opts,
        );
      }
      const transport = await resolveTransportForSession(sessionId, opts?.signal);
      if (!transport.ok) {
        return { ok: false, code: transport.code, ...(transport.candidates ? { details: transport.candidates } : {}) };
      }
      return await readExecutionRunStream({
        ...transport,
        token: params.token,
        sessionId: transport.sessionId,
        ...executionRunAuthorityCeiling(opts),
        request,
        ...(opts?.signal ? { signal: opts.signal } : {}),
      });
    },
    executionRunStreamCancel: async (sessionId, request, opts) => {
      if (sessionId === null) {
        return await callDetachedExecutionRunRpc(
          sessionId,
          SESSION_RPC_METHODS.EXECUTION_RUN_STREAM_CANCEL,
          request,
          opts,
        );
      }
      const transport = await resolveTransportForSession(sessionId, opts?.signal);
      if (!transport.ok) {
        return { ok: false, code: transport.code, ...(transport.candidates ? { details: transport.candidates } : {}) };
      }
      return await cancelExecutionRunStream({
        ...transport,
        token: params.token,
        sessionId: transport.sessionId,
        ...executionRunAuthorityCeiling(opts),
        request,
        ...(opts?.signal ? { signal: opts.signal } : {}),
      });
    },
    executionRunCancelTurn: async (sessionId, request, opts) => {
      if (sessionId === null) {
        return await callDetachedExecutionRunRpc(sessionId, SESSION_RPC_METHODS.EXECUTION_RUN_CANCEL_TURN_V1, request, opts);
      }
      const transport = await resolveTransportForSession(sessionId, opts?.signal);
      if (!transport.ok) return { ok: false, code: transport.code };
      return await callSessionRpc({
        ...transport, token: params.token, sessionId: transport.sessionId,
        method: SESSION_RPC_METHODS.EXECUTION_RUN_CANCEL_TURN_V1, request,
        ...executionRunAuthorityCeiling(opts),
        ...(opts?.signal ? { signal: opts.signal } : {}),
      });
    },
    executionRunStop: async (sessionId, request, opts) => {
      if (sessionId === null) {
        return await callDetachedExecutionRunRpc(
          sessionId,
          SESSION_RPC_METHODS.EXECUTION_RUN_STOP,
          request,
          opts,
        );
      }
      const transport = await resolveTransportForSession(sessionId, opts?.signal);
      if (!transport.ok) {
        return { ok: false, code: transport.code, ...(transport.candidates ? { candidates: transport.candidates } : {}) };
      }
      return await stopExecutionRun({
        ...transport,
        token: params.token,
        sessionId: transport.sessionId,
        ...executionRunAuthorityCeiling(opts),
        request,
        ...(opts?.signal ? { signal: opts.signal } : {}),
      });
    },
    executionRunAction: async (sessionId, request, opts) => {
      if (sessionId === null) {
        return await callDetachedExecutionRunRpc(
          sessionId,
          SESSION_RPC_METHODS.EXECUTION_RUN_ACTION,
          request,
          opts,
        );
      }
      const transport = await resolveTransportForSession(sessionId, opts?.signal);
      if (!transport.ok) {
        return { ok: false, code: transport.code, ...(transport.candidates ? { candidates: transport.candidates } : {}) };
      }
      return await executeExecutionRunAction({
        ...transport,
        token: params.token,
        sessionId: transport.sessionId,
        ...executionRunAuthorityCeiling(opts),
        request,
        ...(opts?.signal ? { signal: opts.signal } : {}),
      });
    },
    executionRunPermissionRespond: async (request, context) => {
      if (!await isMachineActionServerScopeCurrent({ serverId: context.serverId, machineId: context.executionRunTargetMachineId, context, signal: context.signal })) {
        return { ok: false, errorCode: 'server_scope_mismatch', error: 'server_scope_mismatch' };
      }
      const target = await resolveExecutionRunMachineTarget(null, {
        targetMachineId: context.executionRunTargetMachineId,
        originSessionId: context.defaultSessionId,
        serverId: context.serverId,
        signal: context.signal,
      });
      if (!target.ok) return { ok: false, errorCode: target.errorCode, error: target.errorCode };
      const direct = params.machineActionDirectTargetTransport;
      if (direct?.machineId === target.machineId) {
        return await direct.invoke(RPC_METHODS.DAEMON_EXECUTION_RUN_PERMISSION_RESPOND, request, {
          ...(context.signal ? { signal: context.signal } : {}),
          localActionContext: { ...context,
            executionRunTargetMachineId: context.executionRunTargetMachineId ?? undefined },
        });
      }
      if (!params.credentials) return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
      return await callExactMachineRpc({
        credentials: params.credentials,
        machineId: target.machineId,
        serverUrl: params.serverHttpBaseUrl ?? resolveServerHttpBaseUrl(),
        method: RPC_METHODS.DAEMON_EXECUTION_RUN_PERMISSION_RESPOND,
        request,
        ...executionRunAuthorityCeiling(context),
        ...(context.signal ? { signal: context.signal } : {}),
      });
    },
    executionRunWait: async (sessionId, request, opts) => {
      if (sessionId === null) {
        if (!params.credentials) return { ok: false, code: 'not_authenticated' };
        const target = await resolveExecutionRunMachineTarget(sessionId, opts);
        if (!target.ok) return { ok: false, code: target.errorCode };
        return await waitForExecutionRun({ credentials: params.credentials, machineId: target.machineId,
          serverUrl: params.serverHttpBaseUrl ?? resolveServerHttpBaseUrl(),
          ...executionRunAuthorityCeiling(opts), runId: request.runId,
          timeoutMs: normalizeExecutionRunWaitTimeoutMs(request.timeoutSeconds),
          ...(request.condition ? { condition: request.condition } : {}),
          ...(request.after ? { after: ExecutionRunGetResponseSchema.parse(request.after) } : {}),
          ...(opts?.onSnapshot ? { onSnapshot: opts.onSnapshot } : {}),
          ...(opts?.signal ? { signal: opts.signal } : {}),
          ...(params.machineActionDirectTargetTransport?.machineId === target.machineId || requiresDirectExecutionRunTransport(opts)
            ? { invokeWait: (request: unknown, signal?: AbortSignal) =>
            callDetachedExecutionRunRpc(null, SESSION_RPC_METHODS.EXECUTION_RUN_WAIT, request,
              { ...opts, exactMachineId: target.machineId, ...(signal ? { signal } : {}) }) } : {}),
        });
      }
      const transport = await resolveTransportForSession(sessionId, opts?.signal);
      if (!transport.ok) {
        return { ok: false, code: transport.code, ...(transport.candidates ? { candidates: transport.candidates } : {}) };
      }

      return await waitForExecutionRun({
        ...transport,
        token: params.token,
        sessionId: transport.sessionId,
        ...executionRunAuthorityCeiling(opts),
        runId: request.runId,
        timeoutMs: normalizeExecutionRunWaitTimeoutMs(request.timeoutSeconds),
        ...(request.condition ? { condition: request.condition } : {}),
        ...(request.after ? { after: ExecutionRunGetResponseSchema.parse(request.after) } : {}),
        ...(opts?.onSnapshot ? { onSnapshot: opts.onSnapshot } : {}),
        ...(opts?.signal ? { signal: opts.signal } : {}),
      });
    },
    ...(reviewCommentAction
      ? {
        reviewCommentAction: async ({ actionId, input, reviewCommentPrincipal, signal }) =>
          await reviewCommentAction(actionId, input, {
            ...(reviewCommentPrincipal ? { principal: reviewCommentPrincipal } : {}),
            ...(signal ? { signal } : {}),
          }),
      }
      : {}),

    daemonMemorySettingsGet: async ({ machineId, context, serverId, signal }) => {
      if (!params.credentials && params.machineActionDirectTargetTransport?.machineId !== machineId) return notSupported();
      return MemorySettingsV1Schema.parse(await callMachineAction({ machineId, method: RPC_METHODS.DAEMON_MEMORY_SETTINGS_GET,
        request: {}, context, effectActionId: 'search.settings.get', authority: context.authority, exactMachine: true,
        ...(serverId ? { serverId } : {}), ...(signal ? { signal } : {}) }));
    },
    daemonMemorySettingsSet: async ({ machineId, settings, context, serverId, signal }) => {
      if (!params.credentials && params.machineActionDirectTargetTransport?.machineId !== machineId) return notSupported();
      return MemorySettingsV1Schema.parse(await callMachineAction({ machineId, method: RPC_METHODS.DAEMON_MEMORY_SETTINGS_SET,
        request: settings, context, effectActionId: 'search.settings.set', authority: context.authority, exactMachine: true,
        ...(serverId ? { serverId } : {}), ...(signal ? { signal } : {}) }));
    },
    daemonMemoryStatus: async ({ machineId, context, serverId, signal }) => {
      if (!params.credentials && params.machineActionDirectTargetTransport?.machineId !== machineId) return notSupported();
      return MemoryStatusV1Schema.parse(await callMachineAction({ machineId, method: RPC_METHODS.DAEMON_MEMORY_STATUS,
        request: {}, context, effectActionId: 'memory.status', authority: context.authority, exactMachine: true,
        timeoutMs: null,
        ...(serverId ? { serverId } : {}), ...(signal ? { signal } : {}) }));
    },
    daemonMemoryClearIndex: async ({ machineId, context, serverId, signal }) => {
      if (!params.credentials && params.machineActionDirectTargetTransport?.machineId !== machineId) return notSupported();
      const result = await callMachineAction({ machineId, method: RPC_METHODS.DAEMON_MEMORY_CLEAR_INDEX,
        request: {}, context, effectActionId: 'memory.clear_index', authority: context.authority, exactMachine: true,
        ...(serverId ? { serverId } : {}), ...(signal ? { signal } : {}) });
      if (!result || typeof result !== 'object' || !('ok' in result) || result.ok !== true) throw new Error('memory_clear_index_failed');
      return { ok: true };
    },
    daemonMemorySearch: async ({ machineId, query, serverId, signal }) => {
      const credentials = params.credentials;
      if (!credentials) return notSupported();
      const documentsRequested = query.corpora?.includes('documents') === true;
      const exactScopeRequired = documentsRequested || query.scope.type === 'project';
      if (exactScopeRequired && !await isMachineActionServerScopeCurrent({ serverId, machineId, signal })) {
        return { v: 1, ok: false, errorCode: 'memory_invalid_query', error: 'Exact Home scope is unavailable.' };
      }
      // A capability on one daemon cannot authorize a successor or another
      // Home. Keep released transcript-only target replacement unchanged.
      const serverUrl = params.serverHttpBaseUrl ?? resolveServerHttpBaseUrl();
      const callMemoryRpc = (method: string, request: unknown) =>
        (exactScopeRequired ? callExactMachineRpc : callMachineRpc)({
          credentials, machineId, method, request, timeoutMs: null,
          ...(exactScopeRequired ? { serverUrl } : {}),
          ...(signal ? { signal } : {}),
        });
      let status: Promise<MemoryStatusV1> | undefined;
      const readStatus = () => status ??= callMemoryRpc(RPC_METHODS.DAEMON_MEMORY_STATUS, {})
        .then(value => MemoryStatusV1Schema.parse(value));
      const result = await negotiateMemorySearchV1({
        query,
        readDocumentSearchSupport: async () => (await readStatus()).documentSearchSupported === true,
        readProjectSearchSupport: async () => (await readStatus()).projectSearchSupported === true,
        search: async (request) => await callMemoryRpc(RPC_METHODS.DAEMON_MEMORY_SEARCH, request),
        ...(signal ? { signal } : {}),
      });
      if (!result.ok) return result;

      const visibleThroughSeqBySessionId = new Map<string, number>();
      await Promise.all([...new Set(result.hits.flatMap((hit) =>
        isMemorySessionSearchHitV1(hit) ? [hit.sessionId] : [],
      ))].map(async (sessionId) => {
        try {
          const session = await fetchSessionById({
            token: credentials.token,
            sessionId,
            ...(exactScopeRequired ? { serverUrl } : {}),
            ...(signal ? { signal } : {}),
          });
          if (session && Number.isSafeInteger(session.seq) && session.seq >= 0) {
            visibleThroughSeqBySessionId.set(sessionId, session.seq);
          }
        } catch {
          signal?.throwIfAborted();
          // The daemon index is derived state. An unreadable Session cannot be
          // returned as Action data, even when its retained summary still exists.
        }
      }));
      signal?.throwIfAborted();
      return {
        ...result,
        hits: result.hits.filter((hit) => {
          // The daemon admits Artifact and native transcript sources. Only
          // Happier Session ranges need this caller-visible sequence check.
          if (!isMemorySessionSearchHitV1(hit)) return true;
          const visibleThroughSeq = visibleThroughSeqBySessionId.get(hit.sessionId);
          return visibleThroughSeq !== undefined
            && hit.seqFrom <= visibleThroughSeq
            && hit.seqTo <= visibleThroughSeq;
        }),
      };
    },
    daemonMemoryGetWindow: async ({ machineId, serverId, signal, ...request }) => {
      if (!params.credentials) return notSupported();
      if (request.source !== undefined) {
        if (!await isMachineActionServerScopeCurrent({ serverId, machineId, signal })) throw Object.assign(
          new Error('Exact Home scope is unavailable.'), { code: 'not_authenticated' as const });
        return MemoryWindowV1Schema.parse(await callExactMachineRpc({ credentials: params.credentials,
          machineId, serverUrl: params.serverHttpBaseUrl ?? resolveServerHttpBaseUrl(),
          method: RPC_METHODS.DAEMON_MEMORY_GET_WINDOW, request: { ...request, v: 1 },
          ...(signal ? { signal } : {}),
        }));
      }
      const { sessionId, seqFrom, seqTo } = request;
      const session = await fetchSessionById({
        token: params.credentials.token,
        sessionId,
        ...(signal ? { signal } : {}),
      });
      const visibleThroughSeq = session?.seq;
      if (
        typeof visibleThroughSeq !== 'number'
        || !Number.isSafeInteger(visibleThroughSeq)
        || visibleThroughSeq < 0
        || seqFrom > visibleThroughSeq
        || seqTo > visibleThroughSeq
      ) {
        throw Object.assign(
          new Error('Memory window is outside the current Session projection.'),
          { code: 'not_authenticated' as const },
        );
      }
      return MemoryWindowV1Schema.parse(await callMachineRpc({
        credentials: params.credentials,
        machineId,
        method: RPC_METHODS.DAEMON_MEMORY_GET_WINDOW,
        request: { v: 1, sessionId, seqFrom, seqTo },
        ...(signal ? { signal } : {}),
      }));
    },
    daemonMemoryEnsureUpToDate: async ({ machineId, sessionId }) => {
      if (!params.credentials) return notSupported();
      return await callMachineRpc({
        credentials: params.credentials,
        machineId,
        method: RPC_METHODS.DAEMON_MEMORY_ENSURE_UP_TO_DATE,
        request: sessionId ? { sessionId } : {},
        // The Memory worker owns the awaited indexing lifetime.
        timeoutMs: null,
      });
    },
    ...(homeHubArtifactPort ? { homeHubArtifacts: {
      read: signal => params.serverHttpBaseUrl
        ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, () => homeHubArtifactPort.read(signal)) : homeHubArtifactPort.read(signal),
      apply: (intent, signal) => params.serverHttpBaseUrl
        ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, () => homeHubArtifactPort.apply(intent, signal)) : homeHubArtifactPort.apply(intent, signal),
      describe: (layout, signal) => params.serverHttpBaseUrl
        ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, () => homeHubArtifactPort.describe(layout, signal)) : homeHubArtifactPort.describe(layout, signal),
      captureWidgetPresentation: (layout, instanceId, signal) => params.serverHttpBaseUrl
        ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, () => homeHubArtifactPort.captureWidgetPresentation(layout, instanceId, signal))
        : homeHubArtifactPort.captureWidgetPresentation(layout, instanceId, signal),
    } } : {}),
    ...(roleArtifactStore ? { workBoardArtifacts: {
      readBoardAccess: (boardId, signal) => params.serverHttpBaseUrl
        ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, () => createWorkBoardArtifactPortV1(roleArtifactStore).readBoardAccess(boardId, signal))
        : createWorkBoardArtifactPortV1(roleArtifactStore).readBoardAccess(boardId, signal),
      readBoard: (boardId, signal) => params.serverHttpBaseUrl
        ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, () => createWorkBoardArtifactPortV1(roleArtifactStore).readBoard(boardId, signal))
        : createWorkBoardArtifactPortV1(roleArtifactStore).readBoard(boardId, signal),
      read: (signal) => params.serverHttpBaseUrl
        ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, () => createWorkBoardArtifactPortV1(roleArtifactStore).read(signal))
        : createWorkBoardArtifactPortV1(roleArtifactStore).read(signal),
      apply: (intent, signal, context) => params.serverHttpBaseUrl
        ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, () => createWorkBoardArtifactPortV1(roleArtifactStore).apply(intent, signal, context ? artifactCallerContext(context) : undefined))
        : createWorkBoardArtifactPortV1(roleArtifactStore).apply(intent, signal, context ? artifactCallerContext(context) : undefined),
    } } : {}),
    internalTaskAction: async ({ actionId, input, context, signal }) => {
      if (!params.credentials || !homeAccountId) return { status: 'unavailable' };
      const requireCurrent = () => {
        if (signal?.aborted || (params.serverId === undefined && configuration.activeServerId !== todoHomeServerId)) {
          throw Object.assign(new Error('task_scope_mismatch'), { code: 'task_scope_mismatch' });
        }
      };
      return executeInternalTaskAction({ actionId, input, scope: { serverId: todoHomeServerId, accountId: homeAccountId }, requireCurrent, createId: randomUUID,
        port: createCliAccountKvJsonCollectionTransport({ credentials: params.credentials, serverBaseUrl: todoHomeBaseUrl, signal,
          shouldContinue: () => !signal?.aborted && (params.serverId !== undefined || configuration.activeServerId === todoHomeServerId),
          resolveAuthorizationHeaders: request => { requireCurrent(); return resolveServerRequestHeaders(context, actionId, request); },
        }),
      });
    },
    listReorder: async ({ actionId, input, context, signal }) => {
      if (actionId !== 'tasks.internal.reorder' || !params.credentials || !homeAccountId) return { status: 'unavailable' };
      const requireCurrent = () => {
        if (signal?.aborted || (params.serverId === undefined && configuration.activeServerId !== todoHomeServerId)) {
          throw Object.assign(new Error('task_scope_mismatch'), { code: 'task_scope_mismatch' });
        }
      };
      return executeInternalTaskReorder({ input, scope: { serverId: todoHomeServerId, accountId: homeAccountId }, requireCurrent,
        port: createCliAccountKvJsonCollectionTransport({ credentials: params.credentials, serverBaseUrl: todoHomeBaseUrl, signal,
          shouldContinue: () => !signal?.aborted && (params.serverId !== undefined || configuration.activeServerId === todoHomeServerId),
          resolveAuthorizationHeaders: request => { requireCurrent(); return resolveServerRequestHeaders(context, actionId, request); },
        }),
      });
    },
    todoSessionLink: async ({ input, context, signal }) => {
      const parsed = TodoSessionLinkInputV1Schema.safeParse(input);
      if (!parsed.success) return { status: 'refused', reason: 'invalid_input' };
      if (!params.credentials || !homeAccountId) return { status: 'unavailable' };
      // The executor's captured Home/credentials are the Account authority, not a caller-supplied URL.
      const requireCurrent = () => {
        if (signal?.aborted || parsed.data.scope.serverId !== todoHomeServerId || parsed.data.scope.accountId !== homeAccountId
          || (params.serverId === undefined && configuration.activeServerId !== todoHomeServerId)) {
          throw new TodoSessionLinkErrorV1('task_scope_mismatch');
        }
      };
      try {
        requireCurrent();
        await applyTodoSessionLinkV1(parsed.data, createCliAccountKvJsonTransport({
          credentials: params.credentials, key: `todo.${parsed.data.taskId}`,
          serverBaseUrl: todoHomeBaseUrl,
          ...(signal ? { signal } : {}),
          resolveAuthorizationHeaders: request => {
            requireCurrent();
            return resolveServerRequestHeaders(context, 'tasks.internal.session.link', request);
          },
        }), { requireCurrent });
        return { status: parsed.data.linked === false ? 'unlinked' : 'linked' };
      } catch (error) { return projectTodoSessionLinkFailureV1(error); }
    },
    updateAccountAcpCatalogSettings: async ({ mutate, signal, expectedRevision, sourceSettingsVersion }) => {
      if (!params.credentials) return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
      return await runWithServerHttpBaseUrl(params.savedSecretOperationContext?.serverHttpBaseUrl ?? todoHomeBaseUrl, async () => {
        try {
          if (!params.savedSecretOperationContext && getActiveAccountSettingsSnapshot()?.scopeKey
            !== resolveAccountSettingsScopeKeyForToken(params.credentials!.token)) {
            await bootstrapAccountSettingsContext({ credentials: params.credentials!, mode: 'blocking' });
          }
          const result = await createCliAcpCatalogStore({ credentials: params.credentials!, signal,
            operationContext: params.savedSecretOperationContext }).updateCatalog(mutate, { expectedRevision, sourceSettingsVersion });
          // Publication may retire after acknowledgement; the durable row receipt still succeeds.
          if (result.status === 'updated') return { ok: true as const,
            revision: result.revision,
            ...('cleanup' in result ? { cleanup: result.cleanup } : {}),
          };
          if (result.status === 'unchanged') return { ok: false as const,
            errorCode: 'acp_catalog_unavailable', error: 'acp_catalog_unavailable',
          };
          const details = { ...('revision' in result ? { revision: result.revision } : {}), ...('reason' in result ? { reason: result.reason } : {}) };
          const errorCode = result.status === 'conflict' ? 'conflict' : `acp_catalog_${result.status}`;
          return { ok: false as const, errorCode, error: errorCode, ...(Object.keys(details).length > 0 ? { details } : {}) };
        } catch (error) {
          if (error instanceof AcpCatalogUnavailableError) {
            return { ok: false as const, errorCode: error.code, error: error.code, details: {
              reason: error.reason,
              ...(typeof error.revision === 'number' && Number.isSafeInteger(error.revision) && error.revision >= 0
                ? { revision: error.revision } : {}),
            } };
          }
          const code = error instanceof Error && 'code' in error && typeof error.code === 'string' ? error.code
            : signal?.aborted ? 'cancelled' : 'acp_catalog_unavailable';
          return { ok: false as const, errorCode: code, error: code };
        }
      });
    },
    projectsContextUpdate: async (input, context) => {
      if (await projectAccountAdmission(input.target.serverId, context)) {
        return { ok: false, errorCode: 'project_context_access_denied' };
      }
      input = { ...input, target: { ...input.target,
        serverId: await resolveProjectHomeIdentity() } };
      const accountId = context?.externalActionExecutionAuthorization?.binding.accountId ?? homeAccountId;
      if (!accountId) return { ok: false, errorCode: 'project_context_access_denied' };
      const run = () => updatePersonalProjectContextV1({
        accountScope: () => params.serverId === undefined && configuration.activeServerId !== projectHomeId
          ? null : { serverId: input.target.serverId, accountId },
        readArtifact: async (ref, options) => {
          if (context?.externalActionExecutionAuthorization) {
            const artifact = await readProjectRequesterArtifact({ ...ref, serverId: ref.serverId ?? input.target.serverId }, options, context);
            return artifact?.promptLibraryArtifact ?? null;
          }
          if (!approvalsStore) return null;
          if (!ref.serverId || await isServerProfileHomeIdentity(projectHomeId, ref.serverId)) return approvalsStore.promptLibraryStore.read(ref.artifactId, options);
          // Delegated provenance cannot borrow the user's saved foreign Home.
          if (context?.externalActionCredential || context?.externalActionExecutionAuthorization) return null;
          // The reader captures that Home's actual saved credential. Do not pass
          // this Action's credential override: the focused Home may be foreign.
          return withCliPromptLibraryArtifactReader(reader => reader.readArtifact(ref), {
            serverId: todoHomeServerId, signal: options?.signal,
          });
        },
        mutateOrganization: (mutation) => mutateProjectAccountOrganization({ ...mutation,
          ...projectRowsAuthority(context, 'projects.context.update', mutation.signal), serverId: mutation.serverId }),
      }, input, context);
      return runWithServerHttpBaseUrl(todoHomeBaseUrl, run);
    },
    projectAction: async (args) => {
      if (args.actionId === 'projects.trust.list' || args.actionId === 'projects.trust.revoke') {
        return await createCliProjectTrustAction({ token: params.token, credentials: params.credentials,
          accountId: homeAccountId, ...exactHome })(args);
      }
      if (params.projectAction) return await params.projectAction(args);
      const { actionId, input, context } = args;
      const parsed = PROJECT_ACTION_INPUT_SCHEMAS_V1[actionId].safeParse(input);
      if (!parsed.success) return executionRunActionFailure('invalid_parameters');
      const workspace = parsed.data.workspace;
      if (!await isMachineActionServerScopeCurrent({ serverId: workspace.serverId, machineId: workspace.machineId, context, signal: context.signal })
        || !await isMachineActionServerScopeCurrent({ serverId: context.serverId, machineId: workspace.machineId, context, signal: context.signal })) {
        return executionRunActionFailure('server_scope_mismatch');
      }
      const originalAccount = params.credentials && !params.machineActionDirectTargetTransport
        && !context.externalActionCredential && !context.externalActionExecutionAuthorization
        && !context.rpcSessionAuthorization && (!context.actionCaller || context.actionCaller.kind === 'host');
      const placement = await resolveProjectActionMachineV1({ actionId, input: parsed.data, context,
        executeCanonicalAction: args.executeCanonicalAction, createRequestKey: randomUUID,
        ...(originalAccount && params.serverIdentityId ? { homeId: params.serverIdentityId } : {}) });
      if (!placement.ok) return placement;
      const { machineId } = placement;
      if (context.externalActionTarget && (context.externalActionTarget.kind !== 'machine'
        || context.externalActionTarget.machineId !== machineId)) return executionRunActionFailure('target_not_local');
      if (!params.credentials && params.machineActionDirectTargetTransport?.machineId !== machineId) {
        return executionRunActionFailure('not_authenticated');
      }
      context.signal?.throwIfAborted();
      if (originalAccount) {
        if (context.surface !== 'cli' || !context.actionRequestId
          || (context.runtimeAccountId && context.runtimeAccountId !== homeAccountId)) {
          return executionRunActionFailure('admission_unavailable');
        }
        const execution = await dispatchOriginalAccountAction({ actionId, input: parsed.data, requestId: context.actionRequestId,
          target: { kind: 'machine', machineId }, credentials: params.credentials!, authority: context.authority,
          invocation: { caller: { kind: 'host' }, surface: 'cli', authority: context.authority ?? 'account_automation' },
          serverHttpBaseUrl: params.serverHttpBaseUrl ?? resolveServerHttpBaseUrl(),
          ...(params.serverIdentityId ? { serverIdentityId: params.serverIdentityId } : {}),
          ...(params.onRequesterSessionCredentialDisclosure
            ? { onRequesterSessionCredentialDisclosure: params.onRequesterSessionCredentialDisclosure } : {}),
          ...(params.isCredentialCurrent ? { isCurrent: params.isCredentialCurrent } : {}),
          ...(context.signal ? { signal: context.signal } : {}) });
        if (!execution.ok) return execution;
        const approval = ActionApprovalRequestCreatedResultSchema.safeParse(execution.result);
        if (approval.success && approval.data.actionId === actionId) return approval.data;
        const output = PROJECT_ACTION_OUTPUT_SCHEMAS_V1[actionId].safeParse(execution.result);
        return output.success ? output.data : executionRunActionFailure('invalid_action_output');
      }
      if (params.machineActionDirectTargetTransport?.machineId !== machineId && !context.externalActionCredential
        && !context.externalActionExecutionAuthorization && !context.rpcSessionAuthorization) {
        return executionRunActionFailure('admission_unavailable');
      }
      const call = () => callMachineAction({ machineId, serverId: workspace.serverId,
        method: PROJECT_FINITE_ACTION_RPC_METHODS_V1[actionId], request: parsed.data, authority: context.authority,
        ...(context.rpcSessionAuthorization ? { authorization: context.rpcSessionAuthorization } : {}),
        exactMachine: true, context, effectActionId: actionId, timeoutMs: null,
        ...(context.signal ? { signal: context.signal } : {}) });
      const raw = await (params.serverHttpBaseUrl ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, call) : call());
      // A received finite acknowledgement retains its operation custody even
      // if observation is cancelled while consuming it. Cancellation before
      // issue and strict output validation remain unchanged; this is not Stop.
      const failure = ActionExecuteFailureSchema.safeParse(raw);
      if (failure.success) return failure.data;
      const approval = ActionApprovalRequestCreatedResultSchema.safeParse(raw);
      if (approval.success && approval.data.actionId === actionId) return approval.data;
      const output = PROJECT_ACTION_OUTPUT_SCHEMAS_V1[actionId].safeParse(raw);
      return output.success ? output.data : executionRunActionFailure('invalid_action_output');
    },
    promptDocGet: async ({ artifactId, signal }) => {
      if (!approvalsStore) return notSupported();
      return await readPromptDocInLibrary({ store: approvalsStore.promptLibraryStore, artifactId, ...(signal ? { signal } : {}) });
    },
    promptDocCreate: async ({ signal, ...request }) => {
      if (!approvalsStore) return notSupported();
      return createPromptDocInLibrary({ store: approvalsStore.promptLibraryStore, request: resolvePromptDocCreateActionInputV1(request), signal });
    },
    promptDocFavoriteSet: async ({ signal, ...request }) => {
      if (!approvalsStore) return notSupported();
      return setPromptDocFavorite({ store: approvalsStore.promptLibraryStore, request, signal });
    },
    promptsLibraryList: async ({ signal, ...request }) => {
      if (!approvalsStore) return notSupported();
      return listPromptLibrary({ store: approvalsStore.promptLibraryStore, request, signal });
    },
    promptInvocationsList: async (request) => {
      request.signal?.throwIfAborted();
      const source = await readPromptInvocations(request.signal);
      const unavailable = { items: [], coverage: 'unavailable' as const };
      if (!source) return unavailable;
      try {
        source.assertCurrent();
        const result = listPromptInvocationsInLibrary({ invocations: source.invocations, revision: source.revision, request });
        source.assertCurrent();
        return result;
      } catch { request.signal?.throwIfAborted(); return unavailable; }
    },
    promptInvocationResolve: async ({ sessionId, signal, ...request }) => {
      if (!approvalsStore) return notSupported();
      const source = await readPromptInvocations(signal);
      const unavailable = { status: 'unavailable' as const, invocationId: request.invocationId.trim() };
      if (!source) return unavailable;
      try {
        source.assertCurrent();
        const result = await withCliPromptLibraryArtifactReader((reader) => resolvePromptInvocationInLibrary({ invocations: source.invocations,
          store: approvalsStore.promptLibraryStore, readArtifact: async (ref) => {
            source.assertCurrent();
            const artifact = await reader.readArtifact(ref);
            source.assertCurrent();
            return artifact;
          }, request, sessionId: sessionId ?? null, signal }), { credentials: params.credentials, serverId: projectHomeId, signal });
        source.assertCurrent();
        return result;
      } catch { signal?.throwIfAborted(); return unavailable; }
    },
    promptDocUpdate: async ({ signal, ...request }) => {
      if (!approvalsStore) return notSupported();
      return await updatePromptDocInLibrary({
        store: approvalsStore.promptLibraryStore,
        request,
        ...(signal ? { signal } : {}),
      });
    },
    skillsRead: async ({ signal, ...request }, context) => {
      const operation = async () => {
        if (request.sessionId && !(request.sessionId === params.sessionId && params.getCurrentSessionSkillItems)) {
          const transport = await resolveTransportForSession(request.sessionId, signal);
          if ('ok' in transport && transport.ok === false) return { ok: false, errorCode: transport.code, error: transport.code };
          const response = await callSessionActionRpc(transport, 'skills.read', request, context);
          if (response && typeof response === 'object' && 'ok' in response && response.ok === false) return response;
          return SkillReadResultV1Schema.parse(response);
        }
        if (!approvalsStore) return notSupported();
        const sessionItems = request.sessionId ? params.getCurrentSessionSkillItems?.() : undefined;
        const usage = await readSkillUsageCatalogV1(approvalsStore.skillRules, signal);
        let rules: Awaited<ReturnType<typeof readSkillRulesForItemV1>> | undefined;
        // Name reads are addressed by the Session's admitted identity, just like id
        // reads. An unrelated plugin source is not authority for this content.
        const skillId = 'skillId' in request ? request.skillId : resolveHappierSkillIdentity(
          { name: request.name }, sessionItems ? { items: sessionItems } : undefined);
        const pluginSkills = await approvalsStore.readPluginSkills(signal, skillId ? [skillId] : []);
        const result = await readSkillInLibrary({ store: approvalsStore.promptLibraryStore, request, sessionItems, pluginSkills,
          usage: usage?.row, signal, recordSessionUse: async selected => {
            // Join failures and retired plans must fail before the best-effort use fact is sent.
            rules = await readSkillRulesForItemV1(approvalsStore.skillRules, selected.skillId, signal);
            signal?.throwIfAborted();
            const currentItems = params.getCurrentSessionSkillItems?.();
            const identity = resolveHappierSkillIdentity({ name: selected.name }, currentItems ? { items: currentItems } : undefined);
            const current = currentItems?.find(item => item.skillId === identity);
            if (identity !== selected.skillId || current?.digest !== selected.digest) return false;
            const accountId = params.credentials ? readAccountIdFromToken(params.credentials.token) : null;
            if (accountId) await recordDaemonSkillUse({ skillIds: [identity], account: { accountId,
              serverHttpBaseUrl: normalizeServerHttpBaseUrl(params.savedSecretOperationContext?.serverHttpBaseUrl ?? params.serverHttpBaseUrl ?? resolveServerHttpBaseUrl()),
            } }, { ...(signal ? { signal } : {}) }).catch(() => {});
            return true;
          } });
        return 'skillId' in result ? { ...result, rules: rules ?? await readSkillRulesForItemV1(approvalsStore.skillRules, result.skillId, signal) } : result;
      };
      return params.serverHttpBaseUrl ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, operation) : operation();
    },
    skillActionExecute: executeSkillAction,
    skillMachineActionExecute: async ({ actionId, input, context }) => {
      const request = SKILL_MACHINE_ACTION_INPUT_SCHEMAS_V1[actionId].parse(input);
      if (!params.credentials && params.machineActionDirectTargetTransport?.machineId !== request.machineId) return notSupported();
      const method = getActionSpec(actionId).bindings?.rpcMethod;
      if (!method) return notSupported();
      const call = () => callMachineAction({ machineId: request.machineId, method, request, context,
        effectActionId: actionId, authority: context.authority, exactMachine: true,
        ...(context.serverId ? { serverId: context.serverId } : {}),
        ...(context.rpcSessionAuthorization ? { authorization: context.rpcSessionAuthorization } : {}),
        ...(context.signal ? { signal: context.signal } : {}),
      });
      return params.serverHttpBaseUrl ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, call) : call();
    },
    promptBundleUpdate: async ({ signal, ...request }) => {
      if (!approvalsStore) return notSupported();
      return await updatePromptBundleInLibrary({
        store: approvalsStore.promptLibraryStore,
        request,
        ...(signal ? { signal } : {}),
      });
    },
    promptRegistryInstall: async ({ signal, ...request }, context) => {
      if (!approvalsStore || !params.credentials) return notSupported();
      const localMachine = await requireLocalPromptActionMachine(request.machineId);
      if (!localMachine.ok) return localMachine;
      const registry = createCliRegistryHostV1({ credentials: params.credentials, port: approvalsStore.promptLibraryStore.organization, signal,
        operationContext: params.savedSecretOperationContext });
      return installPromptRegistryItemInLibrary({
        fetchItem: async ({ sourceId, itemId }) => {
          const normalizedItemId = itemId.startsWith(sourceId + ':') ? itemId.slice(sourceId.length + 1) : itemId;
          return REGISTRY_ACTION_OUTPUT_SCHEMAS_V1['registries.items.read'].parse(await registry.execute('registries.items.read',
            { kind: 'skill', sourceId, itemId: normalizedItemId })).item;
        },
        installLibrary: pointer => executeSkillAction({ actionId: 'skills.install', input: { source: { kind: 'registry', ...pointer } }, context }),
        request, signal,
      });
    },

    sessionOpen: async ({ sessionId, serverId, resumeRequest, actionRequestId, signal, approvedNewDirectoryCreation }, context) => {
      if (!params.credentials) return notSupported();
      const exactServerId = normalizeStringValue(serverId);
      const boundServerId = normalizeStringValue(params.serverId);
      if (!exactServerId || !boundServerId || exactServerId !== boundServerId
        && !(params.machineActionDirectTargetTransport && exactServerId === params.serverIdentityId)) {
        return { ok: false, errorCode: 'session_not_found', error: 'session_not_found' };
      }
      const transport = await resolveTransportForSession(sessionId, signal,
        context ? { context, actionId: 'session.open' } : undefined);
      if (!transport.ok) {
        return { ok: false, errorCode: transport.code, error: transport.code };
      }
      if (resumeRequest) {
        const request = SessionResumeRequestV1Schema.safeParse(resumeRequest);
        const machineId = normalizeStringValue(transport.rawSession.machineId)
          ?? normalizeStringValue(readTransportSessionOwnerMetadata(transport)?.machineId);
        if (!request.success || request.data.sessionId !== transport.sessionId
          || !params.machineActionDirectTargetTransport || params.machineActionDirectTargetTransport.machineId !== machineId) {
          return { ok: false, errorCode: 'target_unavailable', error: 'target_unavailable' };
        }
      }
      if (transport.rawSession.active === true && !resumeRequest) {
        return {
          ok: true,
          status: 'opened',
          sessionId: transport.sessionId,
          serverId: exactServerId,
          address: { serverId: exactServerId, sessionId: transport.sessionId },
        };
      }
      const localId = normalizeStringValue(actionRequestId) ?? `session.open:${transport.sessionId}`;
      const resumed = await resumeInactiveSessionTransport({
        transport,
        localId,
        effectActionId: 'session.open',
        ...(context ? { context } : {}),
        ...(resumeRequest ? { resumeRequest } : {}),
        ...(approvedNewDirectoryCreation === true || resumeRequest?.approvedNewDirectoryCreation === true
          ? { approvedNewDirectoryCreation: true } : {}),
        ...(signal ? { signal } : {}),
      });
      return resumed.ok
        ? {
            ok: true,
            status: 'opened',
            sessionId: transport.sessionId,
            serverId: exactServerId,
            address: { serverId: exactServerId, sessionId: transport.sessionId },
          }
        : { ok: false, errorCode: resumed.code, error: resumed.message };
    },
    sessionFork: async ({
      sessionId,
      forkPoint,
      strategy,
      replaySummaryRunner,
      replayMaxSeedChars,
      requestId,
      signal,
    }) => {
      if (!params.credentials) return notSupported();
      const transport = await resolveTransportForSession(sessionId, signal);
      if (!transport.ok) {
        return { ok: false, errorCode: transport.code, error: transport.code };
      }
      const metadata = readTransportSessionOwnerMetadata(transport);
      const machineId = normalizeStringValue(transport.rawSession.machineId)
        ?? normalizeStringValue(metadata?.machineId);
      if (!machineId) {
        return { ok: false, errorCode: 'machine_not_found', error: 'machine_not_found' };
      }
      return await callMachineAction({
        machineId,
        method: RPC_METHODS.SESSION_FORK,
        authorization: { kind: 'session.write', sessionId: transport.sessionId },
        request: {
          v: 1,
          parentSessionId: transport.sessionId,
          forkPoint,
          ...(strategy ? { strategy } : {}),
          ...(replaySummaryRunner ? { replaySummaryRunner } : {}),
          ...(replayMaxSeedChars !== undefined ? { replayMaxSeedChars } : {}),
          ...(requestId ? { requestId } : {}),
        },
        ...(signal ? { signal } : {}),
      });
    },
    sessionContinueWithReplay: async (args) => {
      if (!params.credentials) return notSupported();
      const machineId = (await readCurrentMachineControlIdentity()).machineId;
      if (!machineId) {
        return { ok: false, errorCode: 'machine_not_found', error: 'machine_not_found' };
      }
      const { signal, ...request } = args;
      return await callMachineRpc({
        credentials: params.credentials,
        machineId,
        method: RPC_METHODS.SESSION_CONTINUE_WITH_REPLAY,
        authorization: { kind: 'session.write', sessionId: request.replay.previousSessionId },
        request,
        // Replay preparation and startup follow their containing caller lifetime.
        timeoutMs: null,
        ...(signal ? { signal } : {}),
      });
    },
    sessionRollback: async ({ sessionId, target, signal }) => await callResolvedSessionRpc(
      sessionId,
      SESSION_RPC_METHODS.SESSION_ROLLBACK,
      { sessionId, ...(target ? { target } : {}) },
      signal,
    ),
    checkpointCodeRollback: async ({ request, signal }) => await callResolvedSessionRpc(
      request.sessionId,
      SESSION_RPC_METHODS.SESSION_CHECKPOINT_CODE_ROLLBACK,
      request,
      signal,
    ),
    sessionCheckpoint: async ({ request, signal }) => await callResolvedSessionRpc(
      request.sessionId,
      SESSION_RPC_METHODS.SESSION_CHECKPOINT,
      request,
      signal,
    ),
    sessionRestore: async ({ request, signal }) => await callResolvedSessionRpc(
      request.sessionId,
      SESSION_RPC_METHODS.SESSION_RESTORE,
      request,
      signal,
    ),
    // One destination-approval preflight for both destination-choosing Action
    // families. Handoff expresses its intent through a workspace action; direct
    // Project linking has no Session and states its intent and mode explicitly.
    sessionHandoffTargetReplacementApprovalPreflight: async ({
      targetMachineId,
      targetPath,
      workspaceAction,
      activatesExactMirror,
      destinationIntent,
      serverId,
      operationId,
      effectActionId,
      context,
      signal,
    }) => {
      const handoffChoosesDestination = workspaceAction?.kind === 'copy_once'
        || workspaceAction?.kind === 'create_relationship';
      if (!handoffChoosesDestination && destinationIntent === undefined) {
        return { type: 'not_required' as const };
      }
      if (!params.credentials || !targetPath?.trim() || !serverId?.trim() || !operationId.trim()) {
        return { type: 'error' as const, result: { ok: false, errorCode: 'invalid_input', error: 'invalid_input' } };
      }
      const mirrors = activatesExactMirror
        ?? (workspaceAction?.kind === 'create_relationship' && workspaceAction.mode === 'mirror_exactly');
      try {
        return HandoffTargetReplacementPreflightResultV1Schema.parse(await callMachineAction({
          machineId: targetMachineId,
          method: RPC_METHODS.DAEMON_WORKSPACE_SYNC_TARGET_REPLACEMENT_PREFLIGHT,
          request: {
            v: 1,
            serverId: serverId.trim(),
            machineId: targetMachineId,
            operationId: operationId.trim(),
            targetPath: targetPath.trim(),
            ...(mirrors ? { activatesExactMirror: true } : {}),
            ...(destinationIntent ? { destinationIntent } : {}),
          },
          context,
          effectActionId,
          exactMachine: true,
          ...(signal ? { signal } : {}),
        }));
      } catch (error) {
        const errorCode = readRpcErrorCode(error) ?? 'target_unavailable';
        return { type: 'error' as const, result: { ok: false, errorCode, error: errorCode } };
      }
    },
    workspaceSyncRelationshipCreate: async ({
      input,
      operationId,
      serverIdentityId,
      serverId,
      targetReplacementApproval,
      targetReplacementApprovalReceiptId,
      context,
      signal,
    }) => {
      if (!params.credentials) return notSupported();
      // Linking runs on the machine that hosts the selected source Workspace.
      // Its address comes from current Account rows, never from the caller.
      const requestedServerId = normalizeStringValue(serverId);
      const denied = await projectHomeAdmission(requestedServerId ?? actionHomeId);
      if (denied) return denied;
      const rows = await readProjectRows(signal);
      // Action contexts carry a device-local profile in `serverId`, while
      // WorkspaceRefs are keyed by the stable Home identity when available.
      // Admission accepts either identifier; domain lookup must use the Home.
      const currentServerId = normalizeStringValue(serverIdentityId) ?? actionHomeId;
      const source = resolveWorkspaceRefById(rows.workspaceRefs, input.sourceWorkspaceRefId, currentServerId)
        ?? (serverId === undefined && params.serverIdentityId === undefined
          ? resolveWorkspaceRefById(rows.workspaceRefs, input.sourceWorkspaceRefId) : null);
      if (!source) {
        return { ok: false, errorCode: 'workspace_ref_not_ready', error: 'workspace_ref_not_ready' };
      }
      const sourceDenied = await projectHomeAdmission(source.serverId);
      if (sourceDenied) return sourceDenied;
      return await callMachineAction({
        machineId: source.machineId,
        method: RPC_METHODS.DAEMON_WORKSPACE_SYNC_RELATIONSHIP_CREATE,
        request: {
          v: 1,
          operationId,
          actionInput: input,
          ...(targetReplacementApproval && targetReplacementApprovalReceiptId
            ? { targetReplacementApproval, targetReplacementApprovalReceiptId }
            : {}),
        },
        context,
        effectActionId: 'workspace.sync.relationship.create',
        exactMachine: true,
        ...(signal ? { signal } : {}),
      });
    },
    workspaceSyncRelationshipTerminate: async ({ input, serverId, signal }) => {
      if (!params.credentials) return notSupported();
      const denied = await projectHomeAdmission(serverId ?? actionHomeId);
      if (denied) return denied;
      const response = await callMachineAction({
        machineId: input.controllerMachineId,
        serverId: actionHomeId,
        method: RPC_METHODS.DAEMON_WORKSPACE_SYNC_TERMINATE,
        request: WorkspaceSyncRelationshipIdV1Schema.parse({ relationshipId: input.relationshipId }),
        exactMachine: true,
        ...(signal ? { signal } : {}),
      });
      if (readRecord(response).ok !== true) throw Object.assign(new Error('Invalid Workspace Sync terminate response'), { code: 'action_failed' });
      return { v: 1 as const, relationshipId: input.relationshipId, terminated: true as const };
    },
    workspaceSyncRelationshipDisable: async ({ input, serverId, signal }) => {
      if (!params.credentials) return notSupported();
      const denied = await projectHomeAdmission(serverId ?? actionHomeId);
      if (denied) return denied;
      const response = await callMachineAction({
        machineId: input.controllerMachineId,
        serverId: actionHomeId,
        method: RPC_METHODS.DAEMON_WORKSPACE_SYNC_PAUSE,
        request: WorkspaceSyncRelationshipIdV1Schema.parse({ relationshipId: input.relationshipId }),
        exactMachine: true,
        ...(signal ? { signal } : {}),
      });
      if (readRecord(response).ok !== true) throw Object.assign(new Error('Invalid Workspace Sync pause response'), { code: 'action_failed' });
      return { v: 1 as const, relationshipId: input.relationshipId, enabled: false as const };
    },
    workspaceSyncRelationshipEnable: async ({ input, serverId, signal }) => {
      if (!params.credentials) return notSupported();
      const denied = await projectHomeAdmission(serverId ?? actionHomeId);
      if (denied) return denied;
      const response = await callMachineAction({
        machineId: input.controllerMachineId,
        serverId: actionHomeId,
        method: RPC_METHODS.DAEMON_WORKSPACE_SYNC_RESUME,
        request: WorkspaceSyncRelationshipIdV1Schema.parse({ relationshipId: input.relationshipId }),
        exactMachine: true,
        ...(signal ? { signal } : {}),
      });
      if (readRecord(response).ok !== true) throw Object.assign(new Error('Invalid Workspace Sync resume response'), { code: 'action_failed' });
      return { v: 1 as const, relationshipId: input.relationshipId, enabled: true as const };
    },
    workspaceSyncRelationshipFlush: async ({ input, serverId, signal }) => {
      if (!params.credentials) return notSupported();
      const denied = await projectHomeAdmission(serverId ?? actionHomeId);
      if (denied) return denied;
      const response = await callMachineAction({
        machineId: input.controllerMachineId,
        serverId: actionHomeId,
        method: RPC_METHODS.DAEMON_WORKSPACE_SYNC_FLUSH,
        request: WorkspaceSyncRelationshipIdV1Schema.parse({ relationshipId: input.relationshipId }),
        exactMachine: true,
        ...(signal ? { signal } : {}),
      });
      return { v: 1 as const, relationshipId: input.relationshipId,
        status: WorkspaceSyncStatusV1Schema.parse(readRecord(response).status) };
    },
    workspaceSyncConflictResolve: async ({ actionReceiptId, input, signal }) => {
      if (!params.credentials) {
        throw Object.assign(new Error('Workspace sync resolution requires an authenticated Account'), { code: 'not_authenticated' });
      }
      try {
        return WorkspaceSyncConflictResolutionResultV1Schema.parse(await callMachineAction({
          machineId: input.controllerMachineId,
          method: RPC_METHODS.DAEMON_WORKSPACE_SYNC_CONFLICT_RESOLVE,
          request: { actionReceiptId, actionInput: input },
          ...(signal ? { signal } : {}),
        }));
      } catch (error) {
        if (isRpcMethodNotAvailableError(error) || isRpcMethodNotFoundError(error)) {
          throw Object.assign(new Error('Controller must be updated for workspace conflict resolution'), {
            code: 'workspace_sync_update_required',
          });
        }
        throw error;
      }
    },
    workspaceSyncRelationshipsList: async ({ input, signal }) => {
      const machineId = await resolveWorkspaceSyncReadController(input, signal);
      return WorkspaceSyncRelationshipsListRpcResultV1Schema.parse(await callMachineAction({
        machineId,
        method: RPC_METHODS.DAEMON_WORKSPACE_SYNC_RELATIONSHIPS_LIST,
        request: input.workspaceRefId ? { workspaceRefId: input.workspaceRefId } : {},
        ...(signal ? { signal } : {}),
      }));
    },
    workspaceSyncConflictsList: async ({ input, signal }) => {
      const machineId = await resolveWorkspaceSyncReadController(input, signal);
      return WorkspaceSyncConflictPageV1Schema.parse(await callMachineAction({
        machineId,
        method: RPC_METHODS.DAEMON_WORKSPACE_SYNC_CONFLICTS_LIST,
        request: { relationshipId: input.relationshipId, limit: input.limit, ...(input.cursor ? { cursor: input.cursor } : {}) },
        ...(signal ? { signal } : {}),
      }));
    },
    workspaceSyncConflictInspect: async ({ input, signal }) => {
      const machineId = await resolveWorkspaceSyncReadController(input, signal);
      return WorkspaceSyncConflictInspectRpcResultV1Schema.parse(await callMachineAction({
        machineId,
        method: RPC_METHODS.DAEMON_WORKSPACE_SYNC_CONFLICT_INSPECT,
        request: {
          workspaceRefId: input.workspaceRefId,
          path: input.path,
          ...(input.preview ? { preview: input.preview } : {}),
        },
        ...(signal ? { signal } : {}),
      }));
    },
    sessionHandoffStart: async ({
      sessionId,
      targetMachineId,
      targetPath,
      targetSessionStorageMode,
      stateTransfer,
      workspaceAction,
      serverId,
      actionRequestId,
      handoffTargetReplacementApproval,
      handoffTargetReplacementApprovalReceiptId,
      handoffTargetReplacementApprovalActionInput,
      signal,
    }) => {
      if (!params.credentials) return notSupported();
      const transport = await resolveTransportForSession(sessionId, signal);
      if (!transport.ok) {
        return { ok: false, errorCode: transport.code, error: transport.code };
      }
      // One owner for the handoff source facts, shared with the daemon's tracked
      // coordinator: machine custody and transcript-storage authority both come
      // from OWNER metadata, and an unresolved link refuses here rather than
      // being stamped as `persisted` on a request that stops the source.
      const source = resolveSessionHandoffSourceAuthority({
        credentials: params.credentials,
        rawSession: transport.rawSession,
        accountEncryptionMode: transport.accountEncryptionCurrentness.mode,
      });
      if (!source.ok) {
        return { ok: false, errorCode: source.errorCode, error: source.error };
      }
      const sourceMachineId = source.sourceMachineId;
      return await callMachineAction({
        machineId: sourceMachineId,
        method: RPC_METHODS.DAEMON_SESSION_HANDOFF_START_V3,
        request: {
          sessionId: transport.sessionId,
          sourceMachineId,
          targetMachineId,
          sessionStorageMode: source.sessionStorageMode,
          ...(targetPath ? { targetPath } : {}),
          ...(targetSessionStorageMode ? { targetSessionStorageMode } : {}),
          ...(stateTransfer ? { stateTransfer } : {}),
          preferredTransportStrategies: ['direct_peer', 'server_routed_stream'],
          ...(workspaceAction ? { workspaceAction } : {}),
          ...(serverId ? { accountServerId: serverId } : {}),
          ...(actionRequestId ? { actionRequestId } : {}),
          ...(handoffTargetReplacementApproval ? { handoffTargetReplacementApproval } : {}),
          ...(handoffTargetReplacementApprovalReceiptId ? {
            handoffTargetReplacementApprovalReceiptId,
            handoffTargetReplacementApprovalActionInput,
          } : {}),
        },
        ...(signal ? { signal } : {}),
      });
    },
    resolveAgentStartContext,
    sessionSpawnNewDirectoryApprovalPreflight: async ({ input, context, signal }) => {
      if (!params.credentials) {
        return {
          type: 'error' as const,
          result: { type: 'error' as const, code: 'permission_denied' as const, retryable: false },
        };
      }
      if (signal?.aborted) {
        return {
          type: 'error' as const,
          result: { type: 'error' as const, code: 'cancelled' as const, retryable: true },
        };
      }
      if (!isCurrentSessionSpawnExecutionTarget(input.executionTarget)) {
        return {
          type: 'error' as const,
          result: { type: 'error' as const, code: 'target_unavailable' as const, retryable: false },
        };
      }
      if (!needsSessionCreationDirectoryApprovalPreflightV1(input)) {
        // A worktree is materialized by the SCM owner, not by the raw
        // directory-creation authorization path.
        return { type: 'not_required' as const };
      }

      const preparation = await prepareSessionSpawnTarget({
        executionTarget: input.executionTarget,
        directory: input.directory,
        ...(context ? { context } : {}),
        ...(signal ? { signal } : {}),
      });
      if (!preparation.ok) {
        return { type: 'error' as const, result: preparation.result };
      }
      const approval = projectSessionCreationDirectoryApprovalV1(input.executionTarget, preparation.preparedTarget);
      return approval ? { type: 'approval_required' as const, approval } : { type: 'not_required' as const };
    },
    sessionSpawnNew: async (input) => {
      const reviewedOpinionSpawn = input.context?.externalActionExecutionAuthorization?.binding.actionId === 'discussion.second_opinion.start';
      if (input.admittedInput && params.credentials && params.credentials.credentialProvenance !== 'api_token'
        && isSameActionHomeId(input.admittedInput.executionTarget.serverId)
        && (reviewedOpinionSpawn || params.sessionSpawnDirectTargetTransport?.machineId !== input.executionTarget.machineId)) {
        const localDaemon = reviewedOpinionSpawn ? null
          : await resolveLiveDaemonControlTargetForServer(projectHomeId).catch(() => null);
        const ownsRequestedMachine = localDaemon?.accountId === readAccountIdFromToken(params.credentials.token)
          && localDaemon?.machineId === input.executionTarget.machineId;
        if (!ownsRequestedMachine) {
          try {
            const dispatched = await dispatchRequesterSessionSpawnNewRpc({ credentials: params.credentials, input: input.admittedInput,
              context: input.context, serverId: input.admittedInput.executionTarget.serverId, serverUrl: machineReferenceServerUrl,
              serverIdentityId: params.serverIdentityId ?? input.context?.serverIdentityId,
              ...(params.externalActionMachineInstallationId
                ? { externalActionMachineInstallationId: params.externalActionMachineInstallationId } : {}),
              ...(params.externalActionMachineRequestPrivateKey
                ? { externalActionMachineRequestPrivateKey: params.externalActionMachineRequestPrivateKey } : {}),
              ...(params.onRequesterSessionCredentialDisclosure
                ? { onRequesterSessionCredentialDisclosure: params.onRequesterSessionCredentialDisclosure } : {}),
            });
            if (dispatched) return dispatched.ok ? dispatched.result : dispatched;
          } catch {
            const errorCode = input.signal?.aborted ? 'cancelled' : 'target_unavailable';
            return { ok: false, errorCode, error: errorCode };
          }
        }
      }
      const {
      context,
      creationAuthorization: admittedCreationAuthorization,
      callerInputConstraints,
      executionTarget,
      directory,
      initialAccess,
      initialTriggers,
      initialSessionRolesV1: requestedInitialSessionRolesV1,
      roleId,
      manager,
      primaryTeamId,
      teamCredentialBindings,
      organizationPlacement,
      placementOrigin,
      agentTarget,
      modelSelection,
      profileId,
      secretReferenceOverlay,
      permissionMode,
      allowedTools,
      unlistedTools,
      agentModeId,
      configuration: configurationSnapshot,
      connectedServices,
      capabilitySelection,
      transcriptStorage,
      terminal,
      checkoutCreationDraft,
      title,
      identity,
      attestedContext,
      memoryEnabled,
      promptStack,
      managedCreation,
      discussionParticipant,
      discussionParticipantLaunch: admittedDiscussionLaunch,
      initialInput,
      agentSessionStartupInstructionsV1,
      environmentVariables,
      sessionCreationTag,
      sourceContext,
      legacyMetadataLabel,
      actionCaller,
      callerSurface,
      actionRequestId,
      resumeActionRequest,
      sessionCreationDirectoryApproval,
      workDepth,
      originKind,
      originSessionId,
      originRunId,
      signal,
      } = input;
      const creationAuthorization = context?.externalActionExecutionAuthorization?.binding.actionId === 'discussion.second_opinion.start'
        ? input.admittedInput && params.externalActionMachineInstallationId && params.externalActionMachineRequestPrivateKey
          ? createReviewedSecondOpinionSessionCreationAuthorization({ context, publicInput: input.admittedInput,
            installationId: params.externalActionMachineInstallationId, privateKey: params.externalActionMachineRequestPrivateKey })
          : null
        : admittedCreationAuthorization;
      if (context?.externalActionExecutionAuthorization?.binding.actionId === 'discussion.second_opinion.start' && !creationAuthorization) {
        return { type: 'error', code: 'permission_denied', retryable: false };
      }
      let initialSessionRolesV1 = requestedInitialSessionRolesV1;
      const discussionParticipantLaunch = discussionParticipant
        ? admittedDiscussionLaunch ?? projectDiscussionModelParticipantLaunchV1(input)
        : undefined;
      const sessionAllowedTools = allowedTools ?? configurationSnapshot?.allowedTools;
      const sessionUnlistedTools = unlistedTools ?? configurationSnapshot?.unlistedTools;
      if (!params.credentials) {
        return { type: 'error', code: 'permission_denied', retryable: false };
      }
      if (signal?.aborted) {
        return { type: 'error', code: 'cancelled', retryable: true };
      }
      if ((initialInput?.attachments?.length ?? 0) > 0 && actionCaller.kind !== 'plugin') {
        return { type: 'error', code: 'invalid_input', retryable: false };
      }
      if (initialInput && !params.machineAdmissionTransport) {
        const externalRequest = context?.externalActionCredential !== undefined
          || context?.externalActionExecutionAuthorization !== undefined;
        const authorizationHeaders = externalRequest
          ? resolveServerRequestHeaders(context, 'session.spawn_new', {
              method: 'GET', path: '/v1/account/encryption/currentness',
            })
          : null;
        if (externalRequest && !authorizationHeaders) {
          return { type: 'error', code: 'permission_denied', retryable: false };
        }
        // New Sessions use persisted Account mode, never the parent's mode or
        // credential key presence. Existing Session sends read their own mode.
        const currentness = await fetchAccountEncryptionCurrentness({
          token: params.credentials.token,
          ...(params.serverHttpBaseUrl ? { serverBaseUrl: params.serverHttpBaseUrl } : {}),
          ...(authorizationHeaders ? { authorizationHeaders } : {}),
          ...(signal ? { signal } : {}),
        });
        const { inputAdmission } = buildSessionSpawnInitialInputAdmissionForLocalIdV1({
          actionCaller,
          callerSurface,
          // Only admission facts are inspected here; the creator owns the
          // actual first-input local id after settling the Session identity.
          localId: sessionCreationTag,
        });
        if (requiresMachineAdmissionForSessionInput({
          request: inputAdmission.request,
          mode: currentness.mode,
          ...(context?.externalActionExecutionAuthorization
            ? { callerInputAuthorization: context.externalActionExecutionAuthorization }
            : {}),
        })) {
          const cause = new MachineAdmissionTransportUnavailableError();
          // Refuse unadmittable protected input before a Session exists.
          throw Object.assign(new Error(cause.message, { cause }), {
            code: SPAWN_SESSION_ERROR_CODES.DAEMON_RPC_UNAVAILABLE,
          });
        }
      }

      if (!isCurrentSessionSpawnExecutionTarget(executionTarget)) {
        return { type: 'error', code: 'target_unavailable', retryable: false };
      }
      if (managedCreation) {
        try {
          const retained = await readManagedMachine({ credentials: params.credentials,
            serverHttpBaseUrl: machineReferenceServerUrl, homeId: managedCreation.homeId,
            managedId: managedCreation.managedId, signal,
            ...(context?.externalActionExecutionAuthorization
              ? { authorization: context.externalActionExecutionAuthorization } : {}),
          });
          if (retained.homeId !== managedCreation.homeId || retained.id !== managedCreation.managedId
            || retained.controller.machineId !== managedCreation.controller.machineId
            || retained.controller.installationId !== managedCreation.controller.installationId
            || retained.creationState !== 'active' || retained.archivedAt !== undefined
            || retained.allocation !== 'bound' || !retained.resource
            || retained.enrolledMachineId !== executionTarget.machineId) {
            return { type: 'error', code: 'invalid_input', retryable: false };
          }
        } catch (error) {
          return isAuthenticationError(error)
            ? { type: 'error', code: 'permission_denied', retryable: false }
            : { type: 'error', code: 'spawn_failed', retryable: true };
        }
      }
      const normalizedActionRequestId = normalizeStringValue(actionRequestId);
      if (resumeActionRequest === true && !normalizedActionRequestId) {
        return { type: 'error', code: 'invalid_input', retryable: false };
      }
      const spawnNonce = normalizedActionRequestId
        ? createStableSpawnNonce('session.spawn_new.action', { actionRequestId: normalizedActionRequestId })
        : undefined;

      const directTargetTransport = params.sessionSpawnDirectTargetTransport;
      let placementOriginSupported = Boolean(directTargetTransport);
      let secretReferenceOverlaySupported = Boolean(directTargetTransport);
      if (
        directTargetTransport
        && directTargetTransport.machineId !== executionTarget.machineId
      ) {
        return { type: 'error', code: 'target_unavailable', retryable: false };
      }
      if (!directTargetTransport) {
        let targetCapabilityProjection: Awaited<ReturnType<typeof readMachineOperationProtocolCapabilitiesV1>>;
        try {
          targetCapabilityProjection = await readMachineOperationProtocolCapabilitiesV1({
            credentials: params.credentials,
            machineId: executionTarget.machineId,
            ...(signal ? { signal } : {}),
          });
        } catch (error) {
          const spawnMayHaveBeenAccepted = hasPossiblyAcceptedSpawnNonce(error);
          if (signal?.aborted) {
            if (spawnMayHaveBeenAccepted) {
              return {
                type: 'pending',
                retryWithSameCreationKey: true,
                outcome: 'unknown',
              };
            }
            return { type: 'error', code: 'cancelled', retryable: true };
          }
          if (isAuthenticationError(error)) {
            return { type: 'error', code: 'permission_denied', retryable: false };
          }
          return { type: 'error', code: 'machine_offline', retryable: true };
        }
        if (
          !targetCapabilityProjection
          || !supportsMachineOperationProtocolCapabilityV1(
            targetCapabilityProjection.capabilities,
            'sessionSpawn',
          )
        ) {
          if (initialSessionRolesV1 !== undefined) {
            return {
              type: 'error', code: 'update_required', retryable: false,
              details: {
                kind: 'update_required', operation: 'session.spawn_new', component: 'daemon',
                reason: 'session_roles_snapshot_update_required',
              },
            };
          }
          if (initialAccess !== undefined || primaryTeamId !== undefined) {
            return {
              type: 'error', code: 'update_required', retryable: false,
              details: new SessionInitialAccessUpdateRequiredError('daemon').details,
            };
          }
          return incompatibleSessionSpawnTarget('session_spawn_protocol_unavailable');
        }
        placementOriginSupported = supportsMachineOperationProtocolCapabilityV1(
          targetCapabilityProjection.capabilities,
          'sessionSpawnPlacementOrigin',
        );
        secretReferenceOverlaySupported = supportsMachineSessionSpawnProtocolVersionV1(
          targetCapabilityProjection.capabilities,
          2,
        );
      }
      if (secretReferenceOverlay && !secretReferenceOverlaySupported) {
        return {
          type: 'error',
          code: 'update_required',
          retryable: false,
          details: {
            kind: 'update_required',
            operation: 'session.spawn_new',
            component: 'daemon',
            reason: 'session_secret_reference_overlay_update_required',
          },
        };
      }

      const resolvedAgentTarget = resolveSessionCreationAgentTarget(agentTarget);
      if (!resolvedAgentTarget) {
        return { type: 'error', code: 'target_unavailable', retryable: false };
      }
      const { backendTarget } = resolvedAgentTarget;
      // Root starts have no lead snapshot. Bind the selected Account role at
      // the native spawn owner before the launch contract drops Action roleId.
      if (roleId && initialSessionRolesV1 === undefined) {
        await prepareAccountRoleOverrides(signal);
        const inventory = await readRoleSources(signal);
        const overrides = readAccountRoleOverrides();
        if (overrides.status !== 'ready') return { ok: false, errorCode: 'account_role_overrides_unavailable', error: 'account_role_overrides_unavailable' };
        if (inventory.status !== 'ready') return { ok: false, errorCode: 'role_source_incomplete', error: 'role_source_incomplete' };
        const roles = resolveRolesSnapshotV1({ roleSourceInventory: inventory, settingsOverrides: overrides.overrides,
          defaultEngine: { agentTargetKey: buildBackendTargetKeyV2(agentTarget),
            ...(modelSelection?.ref.modelId ? { modelId: modelSelection.ref.modelId } : {}) },
        });
        if (!roles[roleId]) return { ok: false, errorCode: 'role_target_unavailable', error: 'role_target_unavailable' };
        initialSessionRolesV1 = { roleId, overrides: {}, sessionRoles: roles, notes: '' };
      }
      const connectedServicesDefaults = connectedServices === undefined
        ? await resolveSpawnConnectedServicesDefaultPayload({
            credentials: params.credentials,
            backendTarget,
            signal,
            ...(params.savedSecretOperationContext ? { operationContext: params.savedSecretOperationContext } : {}),
            ...(params.resolveTeamCredentialResourceCatalog
              ? { resolveTeamCredentialResourceCatalog: params.resolveTeamCredentialResourceCatalog }
              : {}),
          })
        : null;
      if (signal?.aborted) {
        return { type: 'error', code: 'cancelled', retryable: true };
      }
      const resolvedConnectedServices = connectedServices
        ?? connectedServicesDefaults?.connectedServices;
      const resolvedConnectedServicesUpdatedAt = connectedServicesDefaults?.connectedServicesUpdatedAt;
      // Defaulted Team targets reach the Session only through its own Team
      // slot bindings; an explicit slot choice wins.
      const resolvedTeamCredentialBindings = mergeSessionTeamCredentialBindingIntents({
        explicit: teamCredentialBindings,
        admitted: connectedServicesDefaults?.teamCredentialBindings ?? null,
      });
      const normalizedPlacement =
        normalizeSessionCreationOrganizationPlacementV1(organizationPlacement);
      const normalizedTerminal = terminal === undefined
        ? undefined
        : SessionAuthoringTerminalV1Schema.safeParse(terminal);
      if (normalizedTerminal !== undefined && !normalizedTerminal.success) {
        return { type: 'error', code: 'invalid_input', retryable: false };
      }
      const spawnTerminal = normalizedTerminal === undefined
        ? undefined
        : SpawnSessionTerminalSchema.safeParse(normalizedTerminal.data);
      if (spawnTerminal !== undefined && !spawnTerminal.success) {
        return { type: 'error', code: 'invalid_input', retryable: false };
      }
      const windowsTerminal = normalizedTerminal?.data.windows;
      const normalizedConfigurationOverrides = configurationSnapshot
        ? buildAcpConfigOptionOverridesV1({
            updatedAt: Math.max(
              configurationSnapshot.mode.updatedAtMs,
              configurationSnapshot.model.updatedAtMs,
              configurationSnapshot.permissionIntent.updatedAtMs,
              ...Object.values(configurationSnapshot.options).map((entry) => entry.updatedAtMs),
            ),
            overrides: Object.fromEntries(
              Object.entries(configurationSnapshot.options).map(([key, entry]) => [
                key,
                { updatedAt: entry.updatedAtMs, value: entry.value },
              ]),
            ),
          })
        : undefined;
      const resolvedModelSelection = modelSelection
        ?? (configurationSnapshot?.model.value
          ? SessionModelSelectionV1Schema.parse({
              v: 1,
              updatedAt: configurationSnapshot.model.updatedAtMs,
              ref: {
                agentTargetKey: buildBackendTargetKeyV2(backendTarget),
                providerConnectionId: null,
                modelId: configurationSnapshot.model.value,
              },
            })
          : undefined);
      const requestedPermissionMode = permissionMode
        ?? configurationSnapshot?.permissionIntent.value
        ?? undefined;
      const resolvedPermissionMode = requestedPermissionMode
        ? parsePermissionIntentAlias(requestedPermissionMode)
        : undefined;
      if (requestedPermissionMode && !resolvedPermissionMode) {
        return { type: 'error', code: 'invalid_input', retryable: false };
      }
      const resolvedAgentModeId = agentModeId
        ?? configurationSnapshot?.mode.value
        ?? undefined;
      const startupInstructionsMarker = agentSessionStartupInstructionsV1
        ? {
            v: agentSessionStartupInstructionsV1.v,
            id: agentSessionStartupInstructionsV1.id,
            revision: agentSessionStartupInstructionsV1.revision,
          }
        : null;
      const targetPreparation = await prepareSessionSpawnTarget({
        executionTarget,
        directory,
        sessionCreationTag,
        ...(checkoutCreationDraft !== undefined ? { checkoutCreationDraft } : {}),
        ...(signal ? { signal } : {}),
      });
      if (!targetPreparation.ok) return targetPreparation.result;
      const preparedTarget = targetPreparation.preparedTarget;
      // A created receipt is not current exclusive custody. Pre-spawn failures
      // retain the checkout; deleting files remains an explicit SCM operation.
      if (signal?.aborted) {
        return { type: 'error', code: 'cancelled', retryable: true };
      }
      const directoryApproval = SessionCreationDirectoryApprovalV1Schema.safeParse(
        sessionCreationDirectoryApproval,
      );
      if (
        preparedTarget.directoryCreationRequired
        && (
          !directoryApproval.success
          || directoryApproval.data.executionTarget.serverId !== executionTarget.serverId
          || directoryApproval.data.executionTarget.machineId !== executionTarget.machineId
          || directoryApproval.data.directory !== preparedTarget.directory
        )
      ) {
        return { type: 'error', code: 'permission_denied', retryable: false };
      }
      const normalizedDirectory = preparedTarget.directory;
      const initialTriggerPreparationState: { failure?: unknown } = {};
      const prepareInitialTriggers: Parameters<typeof createSpawnedSession>[0]['prepareInitialTriggers'] =
        !discussionParticipant && (identity?.bot?.kind === 'bot' || (initialTriggers && initialTriggers.length > 0)) ? async () => {
          try {
            const preparedDrafts = [...(initialTriggers ?? [])];
            if (identity?.bot?.kind === 'bot') {
              const settings = roleSettingsProvider.getAccountSettings?.();
              if (!settings) throw Object.assign(new Error('account_settings_content_unavailable'), { code: 'account_settings_content_unavailable' });
              if (settings.memoryUpkeepInNewBots) {
                const upkeep = getWorkflowStarterExamplesV1().find((example) => example.key === 'memory-upkeep-in-session');
                if (upkeep?.triggerSeed?.kind !== 'schedule') throw Object.assign(new Error('source_unavailable'), { code: 'source_unavailable' });
                preparedDrafts.push({ target: { kind: 'inline', definition: upkeep.definition },
                  executionTarget: { kind: 'session' }, trigger: upkeep.triggerSeed });
              }
            }
            if (preparedDrafts.length === 0) return [];
            if (!workflowTriggers) throw Object.assign(new Error('target_unavailable'), { code: 'target_unavailable' });
            return await workflowTriggers.prepareSessionInitialTriggers({
              project: { machineId: executionTarget.machineId, directory: normalizedDirectory },
              initialTriggers: preparedDrafts,
              caller: {
                ...context,
                ...(actionCaller ? { actionCaller } : {}),
                ...(callerSurface ? { surface: callerSurface } : {}),
                ...(signal ? { signal } : {}),
              },
            });
          } catch (error) {
            initialTriggerPreparationState.failure = error;
            throw error;
          }
        } : undefined;
      const immutableCheckout = preparedTarget.checkout
        ? {
            kind: preparedTarget.checkout.kind,
            finalDirectory: preparedTarget.checkout.finalDirectory,
            baseRef: preparedTarget.checkout.baseRef,
            branchMode: preparedTarget.checkout.branchMode,
          }
        : null;
      const correspondence = buildSessionCreationCorrespondence({
        identity: { sessionCreationTag },
        recipe: {
          execution: {
            machineId: executionTarget.machineId,
            directory: directory.kind === 'managed' ? directory : { kind: 'path', path: normalizedDirectory },
          },
          organization: normalizedPlacement,
          agentTarget,
          modelSelection: resolvedModelSelection ?? null,
          profileId: profileId ?? null,
          ...(identity !== undefined ? { identity } : {}),
          ...(memoryEnabled !== undefined ? { memoryEnabled } : {}),
          ...(promptStack !== undefined ? { promptStack } : {}),
          ...(managedCreation ? { managedCreation } : {}),
          ...(discussionParticipant ? { discussionParticipant } : {}),
          ...(secretReferenceOverlay ? { secretReferenceOverlay } : {}),
          requestedPermissionMode: resolvedPermissionMode ?? null,
          ...(sessionAllowedTools !== undefined ? { allowedTools: sessionAllowedTools } : {}),
          ...(sessionUnlistedTools !== undefined ? { unlistedTools: sessionUnlistedTools } : {}),
          agentModeId: resolvedAgentModeId ?? null,
          configuration: configurationSnapshot ?? null,
          connectedServices: resolvedConnectedServices ?? null,
          capabilitySelection: capabilitySelection ?? null,
          transcriptStorage: transcriptStorage ?? null,
          terminal: normalizedTerminal?.data ?? null,
          agentSessionStartupInstructionsMarkerV1: startupInstructionsMarker,
          checkout: immutableCheckout,
        },
      });
      // A source recipe is required semantics, not a hint: it is resolved to an
      // exact cutoff before any Session row exists, and a failure creates no
      // child so the authoring draft and its chip stay intact.
      let replaySeededCreation: ReplaySeededSessionCreationV1 | undefined;
      let managedDirectorySeed: Parameters<typeof createSpawnedSession>[0]['managedDirectorySeed'];
      if (sourceContext && resumeActionRequest !== true) {
        let sourceAuthority: Awaited<ReturnType<typeof resolveReplaySourceContextAuthority>>;
        try {
          sourceAuthority = await resolveReplaySourceContextAuthority({
            credentials: params.credentials,
            sourceSessionId: sourceContext.sourceSessionId,
          });
        } catch (error) {
          return isAuthenticationError(error)
            ? { type: 'error', code: 'permission_denied', retryable: false }
            : { type: 'error', code: 'spawn_failed', retryable: true };
        }
        if (sourceAuthority.status !== 'owned') {
          return sourceAuthority.status === 'not_owned'
            ? { type: 'error', code: 'permission_denied', retryable: false }
            : { type: 'error', code: 'spawn_failed', retryable: true };
        }
        const sameMachine = sourceAuthority.sourceMachineId === executionTarget.machineId;
        if (directory.kind === 'managed' && sourceAuthority.managedSource && (
          sourceAuthority.sourceMachineId === null || (sameMachine && !sourceAuthority.managedDirectorySeed)
        )) {
          // A managed fork promises proven local file continuity or an explicit
          // cross-machine empty folder. Unknown locality cannot satisfy either.
          return { type: 'error', code: 'spawn_failed', retryable: true };
        }
        if (directory.kind === 'managed' && sameMachine) managedDirectorySeed = sourceAuthority.managedDirectorySeed;
        const filesNotCopied = directory.kind === 'managed' && sourceAuthority.sourceMachineId !== null && !sameMachine
          ? { reason: 'cross_machine' as const } : undefined;
        const recipeResult = await buildReplaySeededSpawnRecipe({
          credentials: params.credentials,
          cwd: normalizedDirectory,
          source: {
            sourceSessionId: sourceContext.sourceSessionId,
            forkPoint: sourceContext.forkPoint,
          },
          agentHintAgentId: resolvedAgentTarget.agentId,
          // Source-local media survives only when the source and selected child
          // target are proven to be the same exact machine and this process is
          // directly preparing that target. A replacement relation or a direct
          // transport alone does not make an old workspace path usable.
          mediaContinuityUsableOnCreatingMachine:
            Boolean(directTargetTransport)
            && sourceAuthority.sourceMachineId === executionTarget.machineId,
        });
        if (!recipeResult.ok) {
          // The two recipe failures — an unhydratable source and an empty seed —
          // are not distinguishable at this owner, and neither created a child.
          // Report the retryable form so a transient source read does not strand
          // an otherwise valid authoring attempt.
          return { type: 'error', code: 'spawn_failed', retryable: true };
        }
        replaySeededCreation = {
          tag: sessionCreationTag,
          flavor: resolvedAgentTarget.agentId,
          metadata: {
            ...recipeResult.recipe.metadata,
            ...(filesNotCopied ? { forkV1: {
              ...(recipeResult.recipe.metadata.forkV1 && typeof recipeResult.recipe.metadata.forkV1 === 'object'
                ? recipeResult.recipe.metadata.forkV1 : {}),
              filesNotCopied,
            } } : {}),
            sessionCreationCorrespondenceV1: correspondence,
          },
          sourceRecipe: {
            sourceSessionId: sourceContext.sourceSessionId,
            cutoffSeqInclusive: recipeResult.recipe.cutoffSeqInclusive,
          },
        };
      }
      try {
        const created = await createSpawnedSession({
          ...(creationAuthorization ? { creationAuthorization } : {}),
          ...(callerInputConstraints ? { callerInputConstraints } : {}),
          credentials: params.credentials,
          serverId: executionTarget.serverId,
          ...(params.actionsSettingsProvider?.getAccountSettings
            ? { accountSettings: params.actionsSettingsProvider.getAccountSettings() ?? undefined } : {}),
          ...(workDepth !== undefined ? { workDepth } : {}),
          ...(discussionParticipant ? { originKind: 'discussion' as const, discussionParticipant, discussionParticipantLaunch }
            : originKind !== undefined ? { originKind, originSessionId, originRunId } : {}),
          directory: normalizedDirectory,
          directoryKind: preparedTarget.directoryKind,
          ...(managedDirectorySeed ? { managedDirectorySeed } : {}),
          ...(initialAccess !== undefined ? { initialAccess } : {}),
          ...(prepareInitialTriggers ? { prepareInitialTriggers } : {}),
          ...((promptStack?.length ?? 0) > 0 ? { preparePromptStack: async () => {
            await resolveCliPromptStackSystemAppendBlocks({ surface: 'coding', sessionEntries: promptStack,
              credentials: params.credentials, serverId: executionTarget.serverId, ...(memoryEnabled !== undefined ? { memoryEnabled } : {}),
              ...(signal ? { signal } : {}) });
          } } : {}),
          ...(initialSessionRolesV1 !== undefined ? { initialSessionRolesV1 } : {}),
          ...(manager !== undefined ? { manager } : {}),
          ...(primaryTeamId !== undefined ? { primaryTeamId } : {}),
          ...(resolvedTeamCredentialBindings !== undefined
            ? { teamCredentialBindings: resolvedTeamCredentialBindings }
            : {}),
          machineId: executionTarget.machineId,
          backendTarget,
          sessionCreationTag,
          ...(replaySeededCreation ? { replaySeededCreation } : {}),
          ...(sourceContext ? { sourceContext } : {}),
          approvedNewDirectoryCreation: preparedTarget.directoryCreationRequired,
          ...(legacyMetadataLabel ? { legacyMetadataLabel } : {}),
          sessionCreationCorrespondence: correspondence,
          organizationPlacement: normalizedPlacement,
          ...(placementOrigin && placementOriginSupported ? { placementOrigin } : {}),
          ...(resolvedModelSelection ? { modelSelection: resolvedModelSelection } : {}),
          ...(profileId ? { profileId } : {}),
          ...(secretReferenceOverlay ? { secretReferenceOverlay } : {}),
          // Raw launch environment is deliberately absent from the
          // server-visible creation correspondence above; it reaches only this
          // direct-to-daemon spawn.
          ...(environmentVariables ? { environmentVariables } : {}),
          ...(resolvedPermissionMode ? { permissionMode: resolvedPermissionMode } : {}),
          ...(sessionAllowedTools !== undefined ? { allowedTools: sessionAllowedTools } : {}),
          ...(sessionUnlistedTools !== undefined ? { unlistedTools: sessionUnlistedTools } : {}),
          ...(configurationSnapshot?.workspaceWrites !== undefined ? { workspaceWrites: configurationSnapshot.workspaceWrites } : {}),
          ...(resolvedAgentModeId ? { agentModeId: resolvedAgentModeId } : {}),
          ...(normalizedConfigurationOverrides
            ? { sessionConfigOptionOverrides: normalizedConfigurationOverrides }
            : {}),
          ...(resolvedConnectedServices ? { connectedServices: resolvedConnectedServices } : {}),
          ...(resolvedConnectedServicesUpdatedAt !== undefined
            ? { connectedServicesUpdatedAt: resolvedConnectedServicesUpdatedAt }
            : {}),
          ...(capabilitySelection ? { capabilitySelection } : {}),
          ...(transcriptStorage ? { transcriptStorage } : {}),
          ...(spawnTerminal?.data ? { terminal: spawnTerminal.data } : {}),
          ...(windowsTerminal?.launchMode
            ? { windowsRemoteSessionLaunchMode: windowsTerminal.launchMode }
            : {}),
          ...(windowsTerminal?.console
            ? { windowsRemoteSessionConsole: windowsTerminal.console }
            : {}),
          ...(windowsTerminal?.windowName
            ? { windowsTerminalWindowName: windowsTerminal.windowName }
            : {}),
          ...(configurationSnapshot?.providerSessionResume
            ? { resume: configurationSnapshot.providerSessionResume.providerSessionId }
            : {}),
          ...(title ? { initialTitle: title } : {}),
          ...(identity !== undefined ? { identity } : {}),
          ...(memoryEnabled !== undefined ? { memoryEnabled } : {}),
          ...(promptStack !== undefined ? { promptStack } : {}),
          ...(initialInput ? { initialInput } : {}),
          ...(attestedContext !== undefined ? { attestedContext } : {}),
          ...(initialInput
            ? {
                buildInitialInputHandoff: (localId: string) => {
                  const admission = buildSessionSpawnInitialInputAdmissionForLocalIdV1({
                    actionCaller,
                    callerSurface,
                    localId,
                  });
                  const attachments = initialInput.attachments ?? [];
                  const authoredComposerAttachments = attachments.length > 0 && actionCaller.kind === 'plugin'
                    ? buildPluginSessionInputAttachmentDraftsV1({
                        pluginId: actionCaller.pluginId,
                        messageLocalId: localId,
                        authored: attachments,
                      })
                    : [];
                  const structuredInput = initialInput.structuredInput;
                  if (!structuredInput && authoredComposerAttachments.length === 0) {
                    return admission;
                  }
                  return {
                    ...admission,
                    meta: {
                      [HAPPIER_STRUCTURED_INPUT_METADATA_KEY_V1]: {
                        ...(structuredInput ?? { v: 1 }),
                        ...(authoredComposerAttachments.length > 0
                          ? { composerAttachments: [
                              ...(structuredInput?.composerAttachments ?? []),
                              ...authoredComposerAttachments,
                            ] }
                          : {}),
                      },
                    },
                  };
                },
              }
            : {}),
          ...(params.machineAdmissionTransport
            ? { machineAdmissionTransport: params.machineAdmissionTransport }
            : {}),
          ...(directTargetTransport
            ? { directTransport: { ...directTargetTransport.spawnedSession,
                spawn: (request, options) => directTargetTransport.spawnedSession.spawn(request, {
                  ...options, ...(context ? { localActionContext: context } : {}),
                }),
              } }
            : {}),
          ...(params.machineActionDirectTargetTransport?.machineId === executionTarget.machineId
            ? {
                machineActionTransport: params.machineActionDirectTargetTransport.invoke,
              }
            : {}),
          ...(agentSessionStartupInstructionsV1
            ? { agentSessionStartupInstructionsV1 }
            : {}),
          ...(spawnNonce ? { spawnNonce } : {}),
          ...(resumeActionRequest === true ? { resumeOnly: true } : {}),
          ...(signal ? { signal } : {}),
        });
        const committed: Extract<SessionSpawnNewResultV1, { type: 'success' }> = {
          type: 'success',
          disposition: created.disposition,
          sessionId: created.sessionId,
          executionTarget,
          organizationPlacement: created.organizationPlacement,
          initialInput: created.initialInput,
          ...(created.attestedContext ? { attestedContext: created.attestedContext } : {}),
          ...(created.filesNotCopied ? { filesNotCopied: created.filesNotCopied } : {}),
        };
        if (!manager) return committed;
        const preparation = await prepareSourceKeyAfterCommit({ effectActionId: 'session.spawn_new',
          sourceSessionId: created.sessionId, destinationSessionId: manager.sessionId,
          ...(context ? { context } : {}), ...(signal ? { signal } : {}) });
        // The Session and manager edge are already committed. Keep the
        // independent preparation outcome visible without turning creation
        // into an error that invites another spawn.
        return { ...committed, sourceKeyPreparation: preparation };
      } catch (error) {
        // A proven pre-persistence failure creates no Session, but does not
        // establish that the checkout still has no other consumer.
        if (error instanceof PromptStackPreparationError) throw error;
        if ('failure' in initialTriggerPreparationState && initialTriggerPreparationState.failure === error) {
          const code = readRecord(error).code;
          if (signal?.aborted || code === 'cancelled') {
            return { type: 'error', code: 'cancelled', retryable: true };
          }
          if (isAuthenticationError(error) || code === 'permission_denied' || code === 'run_access_denied'
            || code === 'visible_team_not_granted') {
            return { type: 'error', code: 'permission_denied', retryable: false };
          }
          if (code === 'invalid_input') {
            return { type: 'error', code: 'invalid_input', retryable: false };
          }
          const policyRefusal = AgentStartRefusalV1Schema.safeParse({ code });
          if (policyRefusal.success && code !== 'target_unavailable' && code !== 'role_target_unavailable') {
            return { type: 'error', code: 'permission_denied', retryable: false };
          }
          if (code === 'source_unavailable' || code === 'content_unavailable' || code === 'target_unavailable'
            || code === 'role_target_unavailable' || code === 'feature_disabled'
            || code === 'account_settings_content_unavailable') {
            return { type: 'error', code: 'target_unavailable', retryable: false };
          }
          return projectSessionSpawnFailure({ errorCode: typeof code === 'string' ? code : '',
            errorMessage: readRecord(error).message });
        }
        const details = readRecord(readRecord(error).details);
        const spawnErrorDetails = [readSessionCreationTerminalSpawnErrorDetail(error), details, details.errorDetail, readRecord(details.spawnResponse).errorDetail]
          .map(normalizeSpawnSessionErrorDetail);
        const initialTriggerRefusal = spawnErrorDetails.find(
          (detail) => detail?.kind === SPAWN_SESSION_ERROR_DETAIL_KINDS.SESSION_CREATION_INITIAL_TRIGGER_REFUSED,
        );
        // This typed witness proves no Session was born, even when caller
        // cancellation arrives with the response. Unknown outcomes retain checkout custody.
        if (initialTriggerRefusal?.kind === SPAWN_SESSION_ERROR_DETAIL_KINDS.SESSION_CREATION_INITIAL_TRIGGER_REFUSED) {
          return { type: 'error', code: initialTriggerRefusal.code === 'feature_disabled' ? 'target_unavailable' : initialTriggerRefusal.code, retryable: false };
        }
        const initialAccessFailure = projectSessionInitialAccessEnvelopeHostErrorResult(error);
        if (initialAccessFailure) return initialAccessFailure;
        const code = error && typeof error === 'object'
          && typeof (error as { code?: unknown }).code === 'string'
          ? (error as { code: string }).code
          : '';
        if (isAuthenticationError(error)) {
          return { type: 'error', code: 'permission_denied', retryable: false };
        }
        if (hasSessionCreationOrganizationInvalidDetail(error)) {
          return { type: 'error', code: 'organization_invalid', retryable: false };
        }
        if (code === SPAWN_SESSION_ERROR_CODES.INVALID_REQUEST) {
          return { type: 'error', code: 'invalid_input', retryable: false };
        }
        if (code === 'creation_conflict' || hasSessionCreationCorrespondenceConflictDetail(error)) {
          return { type: 'error', code: 'creation_conflict', retryable: false };
        }
        const requestDisposition = readMachineRpcRequestDisposition(error);
        if (
          code === 'outcome_unknown'
          || code === SPAWN_SESSION_ERROR_CODES.SESSION_WEBHOOK_TIMEOUT
          || requestDisposition === 'outcomeUnknown'
          || requestDisposition === null && code === 'MACHINE_RPC_TIMEOUT'
        ) {
          return {
            type: 'pending',
            retryWithSameCreationKey: true,
            outcome: 'unknown',
          };
        }
        if (signal?.aborted) {
          return { type: 'error', code: 'cancelled', retryable: true };
        }
        if (code === SPAWN_SESSION_ERROR_CODES.DAEMON_RPC_UNAVAILABLE) {
          const predicate = SessionSpawnNewIncompatibleTargetV1Schema.safeParse(
            details.incompatibleTarget ?? readRecord(details.spawnResponse).incompatibleTarget,
          );
          return incompatibleSessionSpawnTarget(predicate.success ? predicate.data.reason : 'daemon_rpc_unavailable');
        }
        for (const detail of spawnErrorDetails) {
          if (detail?.kind === SPAWN_SESSION_ERROR_DETAIL_KINDS.TERMINAL_HOST_UNAVAILABLE) {
            return { ...incompatibleSessionSpawnTarget('terminal_host_unavailable'), terminalHostError: detail };
          }
          if (detail?.kind === SPAWN_SESSION_ERROR_DETAIL_KINDS.SESSION_CREATION_ACCESS_REFUSED) {
            return { type: 'error', code: detail.code, retryable: false };
          }
          if (detail?.kind === 'update_required') {
            return { type: 'error', code: 'update_required', retryable: false, details: detail };
          }
          if (detail?.kind === SPAWN_SESSION_ERROR_DETAIL_KINDS.PROVIDER_ERROR) {
            return {
              type: 'error', code: 'spawn_failed',
              retryable: detail.providerError.retryable,
              providerError: detail.providerError,
            };
          }
        }
        return projectSessionSpawnFailure({
          errorCode: code, errorMessage: readRecord(error).message,
          agentId: details.agentId ?? readRecord(details.spawnResponse).agentId,
          errorDetail: spawnErrorDetails.find(detail => detail?.kind === 'launch_error'
            || detail?.kind === SPAWN_SESSION_ERROR_DETAIL_KINDS.CONNECTED_SERVICE_UX_DIAGNOSTIC),
        });
      }
    },
    ...(artifactApprovalStore ?? {}),
    ...inventoryDeps,
    ...(params.credentials && approvalsStore ? createCliSessionCapabilitiesActionDeps({ credentials: params.credentials,
      serverId: params.serverId ?? configuration.activeServerId, serverHttpBaseUrl: params.serverHttpBaseUrl ?? resolveServerHttpBaseUrl(),
      operationContext: params.savedSecretOperationContext, skillRules: approvalsStore.skillRules,
      callMachineAction,
      resolveAuthorizationHeaders: (actionId, context, request) => resolveServerRequestHeaders(context, actionId, request),
    }) : {}),
    projectsVisibilitySet: async (input, context) => {
      if (await projectAccountAdmission(input.target.serverId, context)) {
        return { ok: false, errorCode: 'project_visibility_access_denied' };
      }
      input = { ...input, target: { ...input.target,
        serverId: await resolveProjectHomeIdentity() } };
      const accountId = context?.externalActionExecutionAuthorization?.binding.accountId ?? homeAccountId;
      if (!accountId) return { ok: false, errorCode: 'project_visibility_access_denied' };
      return runWithServerHttpBaseUrl(todoHomeBaseUrl, () => setProjectVisibilityV1({
        accountScope: () => params.serverId === undefined && configuration.activeServerId !== projectHomeId
          ? null : { serverId: input.target.serverId, accountId },
        mutateOrganization: mutation => mutateProjectAccountOrganization({ ...mutation,
          ...projectRowsAuthority(context, 'projects.visibility.set', mutation.signal), serverId: mutation.serverId }),
      }, input, context));
    },
    projectsList: async (args, context) => {
      const requestedServerId = args.serverId ?? context?.serverId ?? projectHomeId;
      const refused = await projectAccountAdmission(requestedServerId, context);
      if (refused) return refused;
      const serverId = await resolveProjectHomeIdentity();
      return runWithServerHttpBaseUrl(todoHomeBaseUrl, async () => {
        const authority = { ...projectRowsAuthority(context, 'projects.list', context?.signal), serverId };
        const snapshot = await readProjectAccountRows(authority);
        const recency = await readProjectLastOpenedMemoryMap(authority);
        const workspaceRefs = snapshot.workspaceRefs.map(ref => {
          const lastOpenedAtMs = recency.get(buildProjectLastOpenedMemoryKeyV1({ serverId: ref.serverId, projectKey: ref.projectKey ?? ref.id }));
          return lastOpenedAtMs === undefined ? ref : { ...ref, lastOpenedAtMs };
        });
        const projected = projectProjectListV1({ ...args, serverId,
          workspaceRefs, organizations: snapshot.organizations, coverage: 'complete' });
        let machines: Awaited<ReturnType<typeof listCurrentAccountMachines>> | null;
        try { machines = await listCurrentAccountMachines({ ...(authority.authorization
          ? { authorization: authority.authorization, effectActionId: authority.effectActionId }
          : { token: authority.credentials.token }), serverHttpBaseUrl: todoHomeBaseUrl, signal: context?.signal }); }
        catch { context?.signal?.throwIfAborted(); machines = null; }
        await assertProjectRequesterCurrent(context);
        const changed = await projectAccountAdmission(requestedServerId, context);
        if (changed) return changed;
        const items = projected.items.map(({ ref, ...item }) => {
          const machine = machines?.find(candidate => candidate.id === ref.machineId);
          return { ...item, serverId: ref.serverId, machineId: ref.machineId, rootPath: ref.rootPath,
            ...(ref.label ? { label: ref.label } : {}),
            reachable: machines === null ? null : Boolean(machine?.active && machine.revokedAt === null && machine.replacedByMachineId === null),
            ...(ref.repositoryIdentity ? { forge: ref.repositoryIdentity } : {}), worktrees: [] };
        });
        return { items, truncated: projected.truncated, coverage: projected.coverage };
      });
    },
    projectWorkspaceRefs: async (_args, context) => {
      const rows = await readAdmittedProjectRows(context?.signal, context, 'action.options.resolve');
      if (!rows) return { ok: false, errorCode: 'project_account_access_denied', error: 'project_account_access_denied' };
      const projected = projectProjectListV1({ serverId: widgetHomeId, workspaceRefs: rows.workspaceRefs, organizations: rows.organizations });
      return { workspaceRefs: projected.items.map(item => item.ref) };
    },
    projectWorkerAction: async (args) => {
      const { actionId, input, context, signal } = args;
      if (actionId !== 'projects.worker.status' && actionId !== 'projects.worker.copy.inspect' && actionId !== 'projects.worker.copy.retire') {
        return params.projectWorkerAccountAction ? await params.projectWorkerAccountAction(args)
          : { ok: false, errorCode: 'unsupported_action', error: 'unsupported_action' };
      }
      const request = ProjectWorkerActionInputSchemasV1[actionId].parse(input);
      const machineId = 'destination' in request ? request.destination.machineId : request.machineId;
      if (!await isMachineActionServerScopeCurrent({ serverId: request.workspace.serverId, machineId, context, signal })
        || !await isMachineActionServerScopeCurrent({ serverId: context.serverId, machineId, context, signal })) {
        return { ok: false, errorCode: 'server_scope_mismatch', error: 'server_scope_mismatch' };
      }
      if (context.externalActionTarget && (context.externalActionTarget.kind !== 'machine'
        || context.externalActionTarget.machineId !== machineId)) {
        const authorization = context.externalActionExecutionAuthorization;
        const move = authorization && await readReviewedServiceMoveInput({ authorization,
          envelope: context.originalActionEnvelope, signal });
        if (!move || !isProjectServiceMoveChildInputV1(move, actionId, machineId, request)) {
          return { ok: false, errorCode: 'target_not_local', error: 'target_not_local' };
        }
      }
      if (!params.credentials && params.machineActionDirectTargetTransport?.machineId !== machineId) {
        return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
      }
      signal?.throwIfAborted();
      const spec = getActionSpec(actionId);
      const method = spec.bindings?.rpcMethod;
      if (!method) return { ok: false, errorCode: 'unsupported_action', error: 'unsupported_action' };
      // Worker observations and copy reconciliation share the containing Action's lifetime.
      const call = () => callMachineAction({ machineId, serverId: request.workspace.serverId, method,
        request, authority: context.authority, exactMachine: true, context, effectActionId: actionId, timeoutMs: null,
        ...(signal ? { signal } : {}) });
      // A standalone caller has no installed requester custody. Use the same
      // Home admission as original CLI work before the daemon reads private rows.
      const originalStatus = actionId === 'projects.worker.status' && params.credentials && !params.machineActionDirectTargetTransport
        && !context.externalActionCredential && !context.externalActionExecutionAuthorization && !context.rpcSessionAuthorization
        && !context.causalPermissionAuthority && (!context.actionCaller || context.actionCaller.kind === 'host')
        && (context.surface === undefined || context.surface === 'cli' || context.surface === 'mcp');
      const execution = originalStatus ? await dispatchOriginalAccountAction({ actionId, input: request,
        requestId: context.actionRequestId ?? randomUUID(), target: { kind: 'machine', machineId },
        credentials: params.credentials!, authority: context.authority,
        serverHttpBaseUrl: params.serverHttpBaseUrl ?? resolveServerHttpBaseUrl(),
        ...(params.serverIdentityId ? { serverIdentityId: params.serverIdentityId } : {}),
        ...(params.onRequesterSessionCredentialDisclosure ? { onRequesterSessionCredentialDisclosure: params.onRequesterSessionCredentialDisclosure } : {}),
        ...(params.isCredentialCurrent ? { isCurrent: params.isCredentialCurrent } : {}),
        ...(signal ? { signal } : {}) }) : null;
      const raw = execution ? execution.ok ? execution.result : execution
        : await (params.serverHttpBaseUrl ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, call) : call());
      // Cancellation retires a read, not an already received write acknowledgement.
      if (spec.sideEffectClass === 'read') signal?.throwIfAborted();
      const failure = ActionExecuteFailureSchema.safeParse(raw);
      if (failure.success) return failure.data;
      const deferred = ActionApprovalRequestCreatedResultSchema.safeParse(raw);
      if (deferred.success && deferred.data.actionId === actionId) return deferred.data;
      const output = ProjectWorkerActionOutputSchemasV1[actionId].safeParse(raw);
      if (!output.success || ('candidate' in output.data && output.data.eligible
        && (output.data.candidate.serverId !== request.workspace.serverId || output.data.candidate.machineId !== machineId))
        || ('targetMachineId' in request && 'preview' in output.data && output.data.ok
          && (output.data.preview.targetMachineId !== request.targetMachineId || output.data.preview.workspaceRefId !== request.targetWorkspaceRefId))) {
        const errorCode = actionId === 'projects.worker.copy.retire' ? 'outcome_unknown' : 'invalid_action_output';
        return { ok: false, errorCode, error: errorCode };
      }
      return output.data;
    },
    projectDefinitionAction: async ({ actionId, input, context }) => {
      const parsed = PROJECT_DEFINITION_ACTION_INPUT_SCHEMAS[actionId].safeParse(input);
      if (!parsed.success) return { ok: false, errorCode: 'invalid_parameters', error: 'invalid_parameters' };
      const workspace = parsed.data.workspace;
      // The installed owner handles its own checkout. A reviewed compound
      // Move's destination inspection uses the existing exact-Machine transport.
      const localDefinition = params.machineActionDirectTargetTransport
        ? params.machineActionDirectTargetTransport.machineId === workspace.machineId
        : !context.externalActionTarget || context.externalActionTarget.kind === 'machine'
          && context.externalActionTarget.machineId === workspace.machineId;
      if (params.projectDefinitionAction && localDefinition) {
        return await params.projectDefinitionAction({ actionId, input: parsed.data, context });
      }
      if (!await isMachineActionServerScopeCurrent({ serverId: workspace.serverId, machineId: workspace.machineId, context, signal: context.signal })
        || !await isMachineActionServerScopeCurrent({ serverId: context.serverId, machineId: workspace.machineId, context, signal: context.signal })) {
        return { ok: false, errorCode: 'server_scope_mismatch', error: 'server_scope_mismatch' };
      }
      if (context.externalActionTarget && (context.externalActionTarget.kind !== 'machine'
        || context.externalActionTarget.machineId !== workspace.machineId)) {
        const authorization = context.externalActionExecutionAuthorization;
        if (actionId !== 'projects.inspect' || !authorization || !await isReviewedServiceMoveChild({ authorization,
          envelope: context.originalActionEnvelope, actionId, machineId: workspace.machineId, params: parsed.data,
          ...(context.signal ? { signal: context.signal } : {}) })) {
          return { ok: false, errorCode: 'target_not_local', error: 'target_not_local' };
        }
      }
      if (!params.credentials && params.machineActionDirectTargetTransport?.machineId !== workspace.machineId) {
        return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
      }
      context.signal?.throwIfAborted();
      if (actionId === 'projects.inspect' && params.credentials && !params.machineActionDirectTargetTransport
        && !context.externalActionCredential && !context.externalActionExecutionAuthorization
        && !context.rpcSessionAuthorization && (!context.actionCaller || context.actionCaller.kind === 'host')) {
        const execution = await dispatchOriginalAccountAction({ actionId, input: parsed.data,
          requestId: context.actionRequestId ?? randomUUID(), target: { kind: 'machine', machineId: workspace.machineId },
          credentials: params.credentials, authority: context.authority,
          serverHttpBaseUrl: params.serverHttpBaseUrl ?? resolveServerHttpBaseUrl(),
          ...(params.serverIdentityId ? { serverIdentityId: params.serverIdentityId } : {}),
          ...(params.onRequesterSessionCredentialDisclosure ? { onRequesterSessionCredentialDisclosure: params.onRequesterSessionCredentialDisclosure } : {}),
          ...(params.isCredentialCurrent ? { isCurrent: params.isCredentialCurrent } : {}),
          ...(context.signal ? { signal: context.signal } : {}) });
        return execution.ok ? execution.result : execution;
      }
      const call = () => callMachineAction({ machineId: workspace.machineId, serverId: workspace.serverId,
        method: getActionSpec(actionId).bindings!.rpcMethod!, request: parsed.data, authority: context.authority,
        exactMachine: true, context, effectActionId: actionId, timeoutMs: null,
        ...(context.signal ? { signal: context.signal } : {}) });
      const raw = await (params.serverHttpBaseUrl ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, call) : call());
      context.signal?.throwIfAborted();
      const failure = ActionExecuteFailureSchema.safeParse(raw);
      if (failure.success) return failure.data;
      const deferred = ActionApprovalRequestCreatedResultSchema.safeParse(raw);
      if (deferred.success && deferred.data.actionId === actionId) return deferred.data;
      const output = PROJECT_DEFINITION_ACTION_OUTPUT_SCHEMAS[actionId].safeParse(raw);
      return output.success ? output.data : { ok: false, errorCode: 'invalid_action_output', error: 'invalid_action_output' };
    },
    machineWorkSummaryGet: async ({ input, context, signal }) => {
      if (!params.credentials) return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
      const read = () => callMachineAction({ machineId: input.machineId, serverId: input.serverId,
        method: RPC_METHODS.MACHINES_WORK_SUMMARY_GET, request: input, authority: context.authority,
        context, effectActionId: 'machines.work.summary.get', exactMachine: true, ...(signal ? { signal } : {}) });
      return await (params.serverHttpBaseUrl ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, read) : read());
    },
    machineStorageAction: async ({ actionId, input, context, signal }) => {
      const parsed = MACHINE_STORAGE_ACTION_INPUT_SCHEMAS[actionId].safeParse(input);
      if (!parsed.success) return { ok: false, errorCode: 'invalid_parameters', error: 'invalid_parameters' };
      const serverId = parsed.data.serverId ?? context.serverId ?? projectHomeId;
      const denied = await projectAccountAdmission(serverId, context);
      if (denied) return denied;
      const assertCurrent = async () => {
        signal?.throwIfAborted();
        const scopeDenied = await projectAccountAdmission(serverId, context);
        if (scopeDenied) throw Object.assign(new Error(scopeDenied.errorCode), { code: scopeDenied.errorCode });
        await assertProjectRequesterCurrent(context);
        if (params.isCredentialCurrent && !await params.isCredentialCurrent()) {
          throw Object.assign(new Error('scope-retired'), { code: 'scope-retired' });
        }
        signal?.throwIfAborted();
      };
      return withProjectHome(async () => {
        const spec = getActionSpec(actionId);
        const raw = await executeCapturedMachineAction({ actionId, assertCurrent,
          invoke: options => callMachineAction({ machineId: parsed.data.machineId, serverId,
            method: spec.bindings!.rpcMethod!, request: { ...parsed.data, serverId },
            authority: context.authority, context, effectActionId: actionId, exactMachine: true, timeoutMs: null,
            ...(signal ? { signal } : {}), ...options }) });
        // Machine RPC serializes thrown refusals as { error, errorCode },
        // while an Action failure additionally carries ok:false. Preserve that
        // boundary rejection before validating the successful Storage output.
        const record = readRecord(raw);
        const failure = ActionExecuteFailureSchema.safeParse(record && !('ok' in record) && typeof record.error === 'string'
          ? { ...record, ok: false } : raw);
        if (failure.success) return failure.data;
        const deferred = ActionApprovalRequestCreatedResultSchema.safeParse(raw);
        if (deferred.success && deferred.data.actionId === actionId) return deferred.data;
        const output = MACHINE_STORAGE_ACTION_OUTPUT_SCHEMAS[actionId].safeParse(raw);
        return output.success ? output.data : { ok: false, errorCode: 'invalid_action_output', error: 'invalid_action_output' };
      });
    },
    machineProcessesAction: async ({ actionId, input, context, signal }) => {
      const parsed = MACHINE_PROCESSES_ACTION_INPUT_SCHEMAS[actionId].safeParse(input);
      if (!parsed.success) return { ok: false, errorCode: 'invalid_parameters', error: 'invalid_parameters' };
      const serverId = parsed.data.serverId ?? context.serverId ?? projectHomeId;
      const denied = await projectAccountAdmission(serverId, context);
      if (denied) return denied;
      const assertCurrent = async () => {
        signal?.throwIfAborted();
        const scopeDenied = await projectAccountAdmission(serverId, context);
        if (scopeDenied) throw Object.assign(new Error(scopeDenied.errorCode), { code: scopeDenied.errorCode });
        await assertProjectRequesterCurrent(context);
        if (params.isCredentialCurrent && !await params.isCredentialCurrent()) {
          throw Object.assign(new Error('scope-retired'), { code: 'scope-retired' });
        }
        signal?.throwIfAborted();
      };
      return withProjectHome(async () => {
        const raw = await executeCapturedMachineAction({ actionId, assertCurrent,
          invoke: options => callMachineAction({ machineId: parsed.data.machineId, serverId,
            method: getActionSpec(actionId).bindings!.rpcMethod!, request: { ...parsed.data, serverId },
            authority: context.authority, context, effectActionId: actionId, exactMachine: true, timeoutMs: null,
            ...(signal ? { signal } : {}), ...options }) });
        const failure = ActionExecuteFailureSchema.safeParse(raw);
        if (failure.success) return failure.data;
        const deferred = ActionApprovalRequestCreatedResultSchema.safeParse(raw);
        if (deferred.success && deferred.data.actionId === actionId) return deferred.data;
        const output = MACHINE_PROCESSES_ACTION_OUTPUT_SCHEMAS[actionId].safeParse(raw);
        return output.success ? output.data : { ok: false, errorCode: 'invalid_action_output', error: 'invalid_action_output' };
      });
    },
    machineVitalsAction: async ({ actionId, input, context, signal }) => {
      const serverId = input.serverId ?? context.serverId ?? projectHomeId;
      const denied = await projectAccountAdmission(serverId, context);
      if (denied) return denied;
      const assertCurrent = async () => {
        signal?.throwIfAborted();
        await assertProjectRequesterCurrent(context);
        if (params.isCredentialCurrent && !await params.isCredentialCurrent()) {
          throw Object.assign(new Error('scope-retired'), { code: 'scope-retired' });
        }
      };
      const read = async (machineId: string, method: string, request: unknown) => {
        await assertCurrent();
        const result = await callMachineAction({ machineId, serverId, method, request, authority: context.authority,
          context, effectActionId: actionId, exactMachine: true, ...(signal ? { signal } : {}) });
        await assertCurrent();
        return result;
      };
      const execute = async () => {
        if (actionId !== 'machines.vitals.summaries.list') {
          const target = actionId === 'machines.vitals.get'
            ? MACHINE_VITALS_ACTION_INPUT_SCHEMAS['machines.vitals.get'].parse(input)
            : MACHINE_VITALS_ACTION_INPUT_SCHEMAS['machines.vitals.history.get'].parse(input);
          return await read(target.machineId, getActionSpec(actionId).bindings!.rpcMethod!, { ...target, serverId });
        }
        const { listCurrentAccountMachines } = await import('@/api/machine/resolveCurrentAccountMachineTarget');
        const { ApiClient } = await import('@/api/api');
        const authorization = context.externalActionExecutionAuthorization;
        await assertCurrent();
        const inventory = await listCurrentAccountMachines({ token: params.token, ...(authorization ? { authorization } : {}),
          effectActionId: actionId, ...(signal ? { signal } : {}) });
        const api = params.credentials ? await ApiClient.create(params.credentials) : null;
        const machines = await Promise.all(inventory.filter(row => row.revokedAt === null && row.replacedByMachineId === null).map(async row => {
          try {
            const opened = authorization
              ? await ApiClient.getRequesterMachine(row.id, { authorization, effectActionId: actionId, ...(signal ? { signal } : {}) })
              : await api!.getMachine(row.id, { ...(signal ? { signal } : {}) });
            await assertCurrent();
            return { machineId: row.id, name: opened?.metadata?.displayName ?? opened?.metadata?.host ?? row.label,
              online: row.active, resources: readMachineVitalsResourcesProjectionV1(opened?.daemonState), unavailable: !opened };
          } catch {
            await assertCurrent();
            return { machineId: row.id, name: row.label, online: row.active, unavailable: true };
          }
        }));
        const result = await listMachineVitalsSummariesV1({ machines, readSummary: machineId => read(machineId,
          RPC_METHODS.MACHINES_VITALS_GET, { serverId, machineId, view: 'summary' }), ...(signal ? { signal } : {}) });
        await assertCurrent();
        return result;
      };
      return await withProjectHome(execute);
    },
    machineResourcesPolicyAction: async ({ actionId, input, context, signal }) => {
      const serverId = input.serverId ?? context.serverId ?? projectHomeId;
      const denied = await projectAccountAdmission(serverId, context);
      if (denied) return denied;
      const current = async () => {
        if (signal?.aborted || params.isCredentialCurrent && !await params.isCredentialCurrent()) return false;
        await assertProjectRequesterCurrent(context);
        return true;
      };
      const execute = async () => {
        if (!await current()) return { status: 'unavailable' };
        if (actionId === 'machines.resources.policy.set') {
          const request = MACHINE_RESOURCES_ACTION_INPUT_SCHEMAS[actionId].parse(input);
          return executeCapturedMachineAction({ actionId, assertCurrent: async () => {
            signal?.throwIfAborted();
            if (!await current()) throw Object.assign(new Error('scope-retired'), { code: 'scope-retired' });
            signal?.throwIfAborted();
          }, invoke: options => callMachineAction({ machineId: request.machineId, serverId, method: RPC_METHODS.MACHINES_RESOURCES_POLICY_SET,
            request: { ...request, serverId }, authority: context.authority, context, effectActionId: actionId, exactMachine: true,
            ...(signal ? { signal } : {}), ...options }) });
        }
        const request = MACHINE_RESOURCES_ACTION_INPUT_SCHEMAS[actionId].parse(input);
        const { readMachineResourcesPolicySnapshot } = await import('@/api/machine/machineResourcesPolicy');
        const { ApiClient } = await import('@/api/api');
        const authorization = context.externalActionExecutionAuthorization;
        return readMachineResourcesPolicySnapshot({ machineId: request.machineId, isCurrent: current, readMachine: async () => {
          if (authorization) return ApiClient.getRequesterMachine(request.machineId, { authorization, effectActionId: actionId, ...(signal ? { signal } : {}) });
          if (!params.credentials) return null;
          const api = await ApiClient.create(params.credentials);
          return api.getMachine(request.machineId, { ...(signal ? { signal } : {}) });
        } });
      };
      return withProjectHome(execute);
    },
    machineGuardAction: async args => {
      const { actionId, input, context, signal } = args;
      const serverId = input.serverId ?? context.serverId ?? projectHomeId;
      const denied = await projectAccountAdmission(serverId, context);
      if (denied) return denied;
      const assertCurrent = async () => {
        signal?.throwIfAborted();
        const denied = await projectAccountAdmission(serverId, context);
        if (denied) throw Object.assign(new Error(denied.errorCode), { code: denied.errorCode });
        await assertProjectRequesterCurrent(context);
        if (params.isCredentialCurrent && !await params.isCredentialCurrent()) throw Object.assign(new Error('scope-retired'), { code: 'scope-retired' });
        signal?.throwIfAborted();
      };
      const targetLocalAction = params.machineGuardAction;
      if (actionId === 'machines.guard.activity.undo' && targetLocalAction) return withProjectHome(() =>
        executeCapturedMachineAction({ actionId, assertCurrent, invoke: () => targetLocalAction(args) }));
      const { executeMachineGuardAction } = await import('@/api/machine/machineGuard');
      return withProjectHome(() => executeMachineGuardAction({ actionId, input, serverId,
        assertCurrent,
        call: request => callMachineAction({ machineId: request.machineId, serverId, method: request.method,
          request: request.input, authority: context.authority, context, effectActionId: actionId, exactMachine: true,
          ...(request.timeoutMs === undefined ? {} : { timeoutMs: request.timeoutMs }),
          ...(signal ? { signal } : {}) }),
      }));
    },
    usageSourceAction: async (request, context) => {
      const denied = await projectHomeAdmission(request.input.serverId, context);
      if (denied) return executionRunActionFailure('server_target_mismatch');
      return createUsageSourceActionPort({
        serverId: request.input.serverId,
        assertCurrent: async context => {
          context.signal?.throwIfAborted();
          const denied = await projectHomeAdmission(request.input.serverId, context);
          if (denied) throw Object.assign(new Error('server_target_mismatch'), { code: 'server_target_mismatch' });
          if (params.isCredentialCurrent && !await params.isCredentialCurrent()
            || params.savedSecretOperationContext && !await params.savedSecretOperationContext.isCurrent()) {
            throw Object.assign(new Error('scope-retired'), { code: 'scope-retired' });
          }
          context.signal?.throwIfAborted();
        },
        rpc: async (request, context) => {
          if (!params.credentials) return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
          const call = () => callMachineAction({ machineId: request.input.machineId, serverId: request.input.serverId,
            method: request.actionId, request: request.input, authority: context.authority, authorization: context.rpcSessionAuthorization,
            context, effectActionId: request.actionId, exactMachine: true, ...(context.signal ? { signal: context.signal } : {}) });
          return await (params.serverHttpBaseUrl ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, call) : call());
        },
      })(request, { ...context, serverId: request.input.serverId });
    },
    projectsOpen: async (input, context) => {
      const { OpenProjectResultV1Schema } = await import('@happier-dev/protocol/projects/openProjectV1');
      const installed = params.machineActionDirectTargetTransport;
      const open = async () => OpenProjectResultV1Schema.parse(await (installed?.machineId === input.machineId
        && installed.openProject && context.originalActionEnvelope ? installed.openProject(input, context) : callMachineAction({
        machineId: input.machineId,
        serverId: input.serverId,
        method: RPC_METHODS.PROJECTS_OPEN,
        request: input,
        authority: context.authority,
        context,
        effectActionId: 'projects.open',
        exactMachine: true,
        timeoutMs: null,
        ...(context.signal ? { signal: context.signal } : {}),
      })));
      try { return await (params.serverHttpBaseUrl ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, open) : open()); }
      catch (error) {
        if (readRpcRequestDisposition(error) === 'notSent') return { kind: 'refused', code: 'machine_unreachable' };
        throw error;
      }
    },
    filesystemActionExecute: async ({ actionId, input, context }) => {
      const custodyFailure = resolveFilesystemTransferCustodyFailure(actionId, context);
      if (custodyFailure) return custodyFailure;
      const target = context.externalActionTarget;
      const machineId = target === undefined
        ? context.defaultSessionMachineId?.trim()
        : target.kind === 'machine'
          ? target.machineId.trim()
          : '';
      if (!machineId) {
        return { ok: false, errorCode: 'machine_not_selected', error: 'machine_not_selected' };
      }
      if (!params.credentials && params.machineActionDirectTargetTransport?.machineId !== machineId) {
        return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
      }
      if (!await isMachineActionServerScopeCurrent({ serverId: context.serverId, machineId, context, signal: context.signal })) {
        return { ok: false, errorCode: 'server_scope_mismatch', error: 'server_scope_mismatch' };
      }
      const method = getActionSpec(actionId).bindings?.rpcMethod;
      if (!method) return { ok: false, errorCode: 'unsupported_action', error: 'unsupported_action' };
      // Semantic RPCs re-enter the daemon's canonical Action admission owner.
      // Preserve signed requester provenance and the exact captured target/root.
      const preparedCopy = actionId === 'daemon.filesystem.copy'
        && readRecord(input).kind === 'prepared_transfer';
      const execute = () => callMachineAction({
        machineId, serverId: context.serverId ?? undefined, method, request: input, authority: context.authority,
        context, effectActionId: actionId, exactMachine: true,
        ...(actionId === 'daemon.filesystem.upload' || actionId === 'daemon.filesystem.download' || preparedCopy
          ? { timeoutMs: null } : {}),
        ...(context.signal ? { signal: context.signal } : {}),
      });
      const result = await (params.serverHttpBaseUrl ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, execute) : execute());
      return isRpcMethodNotFoundResult(result) && !('success' in result)
        ? { ok: false, errorCode: result.errorCode ?? RPC_ERROR_CODES.METHOD_NOT_FOUND, error: result.error }
        : result;
    },
    workspaceFilesSearch: async ({ machineId, ...request }, context) => {
      if (!params.credentials && params.machineActionDirectTargetTransport?.machineId !== machineId) {
        return { ok: false, errorCode: 'workspace_file_search_unavailable', error: 'An authenticated machine transport is required.' };
      }
      try {
        const search = async () => DaemonWorkspaceFileSearchResponseSchema.parse(await callMachineAction({
          machineId, serverId: context.serverId ?? undefined, method: RPC_METHODS.DAEMON_WORKSPACE_FILES_SEARCH, request,
          ...(context.signal ? { signal: context.signal } : {}),
        }));
        return await (params.serverHttpBaseUrl ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, search) : search());
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'server_scope_mismatch') {
          return { ok: false, errorCode: 'server_scope_mismatch', error: 'server_scope_mismatch' };
        }
        throw error;
      }
    },
    workflowEventsList: async (args, context) => {
      if (!params.credentials && params.machineActionDirectTargetTransport?.machineId !== args.machineId) {
        return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
      }
      try {
        const readCatalog = async () => {
          const response = DaemonContributionRegistryProjectionDescribeResponseSchema.safeParse(await callMachineAction({
            machineId: args.machineId, serverId: args.serverId,
            method: RPC_METHODS.DAEMON_MERGED_CONTRIBUTION_REGISTRY_PROJECTION_DESCRIBE,
            request: { machineId: args.machineId },
            ...(context.signal ? { signal: context.signal } : {}),
          }));
          if (!response.success || response.data.automationEligibleEvents === undefined) {
            return { ok: false as const, errorCode: 'workflow_event_catalog_unavailable', error: 'workflow_event_catalog_unavailable' };
          }
          return { machineId: args.machineId, events: projectAutomationEligibleEventsCatalogV1(response.data.automationEligibleEvents) };
        };
        return await (params.serverHttpBaseUrl
          ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, readCatalog) : readCatalog());
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'server_scope_mismatch') {
          return { ok: false, errorCode: 'server_scope_mismatch', error: 'server_scope_mismatch' };
        }
        throw error;
      }
    },
    machinesAgentsList: async (args, context) => {
      if (!params.credentials && params.machineActionDirectTargetTransport?.machineId !== args.machineId) {
        return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
      }
      try {
        const readInventory = async () => {
          const protectedRequest = context.externalActionCredential || context.externalActionExecutionAuthorization
            ? { context, effectActionId: context.externalActionExecutionAuthorization?.binding.actionId ?? 'machines.agents.list' } : {};
          if (args.draftDefinitions) {
            const definitions = args.definitionId
              ? args.draftDefinitions.filter(definition => definition.definitionId === args.definitionId) : args.draftDefinitions;
            const request = buildMachineAgentsDetectRequest({ agents: [], definitions, refresh: args.refresh });
            const response = await callMachineAction({ machineId: args.machineId, serverId: args.serverId,
              method: RPC_METHODS.CAPABILITIES_DETECT, request, ...protectedRequest, ...(context.signal ? { signal: context.signal } : {}) });
            return projectMachineAgentsDetectResponse({ agents: [], definitions, response });
          }
          const roster = DaemonContributionRegistryProjectionDescribeResponseSchema.safeParse(await callMachineAction({
            machineId: args.machineId,
            serverId: args.serverId,
            method: RPC_METHODS.DAEMON_MERGED_CONTRIBUTION_REGISTRY_PROJECTION_DESCRIBE,
            request: { machineId: args.machineId, selection: 'agents' },
            ...protectedRequest,
            ...(context.signal ? { signal: context.signal } : {}),
          }));
          if (!roster.success) throw new MachineAgentInventoryUnavailableError(args.agentId ?? 'unknown');
          const agents = buildMachineAgentInventoryDescriptors(roster.data.projection)
            .filter(({ agentId }) => !args.agentId || args.agentId === agentId);
          const observedDefinitions: ReturnType<typeof projectAcpCatalogForMachineInventory> = !args.agentId || args.definitionId
            ? projectAcpCatalogForMachineInventory(await inventoryDeps.readAccountAcpCatalog({ signal: context.signal })) : {};
          const definitionInventory = args.definitionId && 'definitions' in observedDefinitions
            ? { ...observedDefinitions, definitions: observedDefinitions.definitions?.filter(definition => definition.definitionId === args.definitionId) }
            : observedDefinitions;
          const request = buildMachineAgentsDetectRequest({ agents, ...definitionInventory, refresh: args.refresh });
          if (request.requests?.length === 0) return { items: [],
            ...('definitionCatalog' in definitionInventory && definitionInventory.definitionCatalog ? { definitionCatalog: definitionInventory.definitionCatalog } : {}) };
          const response = await callMachineAction({
            machineId: args.machineId,
            serverId: args.serverId,
            method: RPC_METHODS.CAPABILITIES_DETECT,
            request,
            ...protectedRequest,
            ...(context.signal ? { signal: context.signal } : {}),
          });
          return projectMachineAgentsDetectResponse({ agents, response, ...definitionInventory });
        };
        return await (params.serverHttpBaseUrl
          ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, readInventory)
          : readInventory());
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'server_scope_mismatch') {
          return { ok: false, errorCode: 'server_scope_mismatch', error: 'server_scope_mismatch' };
        }
        if (error instanceof MachineAgentInventoryUnavailableError) {
          return { ok: false, errorCode: error.code, error: error.message };
        }
        throw error;
      }
    },
    machineAgentSignInStart: async ({ machineId, signal, serverId, ...request }) => {
      if (!params.credentials && params.machineActionDirectTargetTransport?.machineId !== machineId) {
        return { ok: false, errorCode: 'sign_in_unavailable', error: 'An authenticated machine transport is required.' };
      }
      return startMachineAgentSignIn({ ...request, machineId }, signInOperations({ machineId, serverId, signal }));
    },
    machineAgentSignInStatus: async ({ machineId, signal, serverId, agentId }) => {
      if (!params.credentials && params.machineActionDirectTargetTransport?.machineId !== machineId) {
        throw Object.assign(new Error('An authenticated machine transport is required.'), { code: 'sign_in_unavailable' });
      }
      return AgentSignInStatusResponseSchema.parse(await callMachineAction({
        machineId, serverId, method: AGENT_SIGN_IN_STATUS_RPC_METHOD, request: { agentId }, signal,
      }));
    },
    machineAgentSignInCancel: async ({ machineId, serverId, signal, ...request }) => {
      if (!params.credentials && params.machineActionDirectTargetTransport?.machineId !== machineId) {
        return { ok: false, errorCode: 'sign_in_unavailable', error: 'An authenticated machine transport is required.' };
      }
      return await cancelMachineAgentSignIn({ ...request, machineId }, signInOperations({ machineId, serverId, signal }));
    },
    machineAgentSignInRestart: async ({ machineId, serverId, signal, ...request }) => {
      if (!params.credentials && params.machineActionDirectTargetTransport?.machineId !== machineId) {
        return { ok: false, errorCode: 'sign_in_unavailable', error: 'An authenticated machine transport is required.' };
      }
      return await restartMachineAgentSignIn({ ...request, machineId }, signInOperations({ machineId, serverId, signal }));
    },
    actionOperationAction: async ({ actionId, input, context, signal }) => executeActionOperationActionV1({
      actionId, input, ...(signal ? { signal } : {}),
      transport: async ({ serverId, machineId, method, payload, signal: requestSignal }) => {
        if (!params.credentials && params.machineActionDirectTargetTransport?.machineId !== machineId) {
          return { ok: false, errorCode: 'operation_transport_unavailable', error: 'An authenticated machine transport is required.' };
        }
        return await callMachineAction({ serverId, machineId, method, request: payload,
          authority: context.authority, exactMachine: true, ...(requestSignal ? { signal: requestSignal } : {}),
          ...(actionId === 'action.operations.get' && 'waitForTerminal' in input && input.waitForTerminal
            ? { timeoutMs: null } : {}),
        });
      },
    }),
    machinePageAction: async ({ actionId, input, context }) => {
      if (actionId === 'machines.capabilities.install') {
        const { machineId, serverId, capabilityId, method } = MachineCapabilityInstallInputSchema.parse(input);
        if (!params.credentials && params.machineActionDirectTargetTransport?.machineId !== machineId) {
          return { ok: false, errorCode: 'daemon_transport_unavailable', error: 'An authenticated machine transport is required.' };
        }
        try {
          const raw = await callMachineAction({ machineId, serverId, method: RPC_METHODS.CAPABILITIES_INVOKE,
            request: { id: capabilityId, method }, context, effectActionId: actionId, authority: context.authority,
            exactMachine: true, timeoutMs: 5 * 60_000, ...(context.signal ? { signal: context.signal } : {}),
          });
          if (isRpcMethodNotFoundResult(raw)) return { supported: false, reason: 'not-supported' };
          const parsed = MachineCapabilityInstallOutputSchema.safeParse({ supported: true, response: raw });
          return parsed.success ? parsed.data : { supported: false, reason: 'error' };
        } catch (error) {
          context.signal?.throwIfAborted();
          if (isRpcMethodNotAvailableError(error) || isRpcMethodNotFoundError(error)) return { supported: false, reason: 'not-supported' };
          const requestDisposition = readRpcRequestDisposition(error);
          return { supported: false, reason: 'error', ...(requestDisposition ? { requestDisposition } : {}) };
        }
      }
      if (actionId === 'machines.replacement.set' || actionId === 'machines.replacement.clear') {
        if (!await isMachineActionServerScopeCurrent({ serverId: input.serverId ?? context.serverId, machineId: input.machineId, context, signal: context.signal })) {
          return { ok: false, errorCode: 'server_scope_mismatch', error: 'server_scope_mismatch' };
        }
        const credentials = params.savedSecretOperationContext?.credentials ?? params.credentials;
        if (!credentials || !params.savedSecretOperationContext && params.token !== credentials.token
          || context.runtimeAccountId && context.runtimeAccountId !== readAccountIdFromToken(credentials.token)) {
          return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
        }
        if (await params.isCredentialCurrent?.() === false) {
          return { ok: false, errorCode: 'credential_scope_changed', error: 'credential_scope_changed' };
        }
        const spec = getActionSpec(actionId);
        const transport = spec.serverTransport!;
        const home = params.savedSecretOperationContext?.serverHttpBaseUrl ?? params.serverHttpBaseUrl ?? resolveServerHttpBaseUrl();
        const request = actionId === 'machines.replacement.set' ? MachineReplacementSetInputSchema.parse(input) : null;
        const body = request ? { replacementMachineId: request.replacementMachineId,
          ...(request.confirmActiveOldMachine === undefined ? {} : { confirmActiveOldMachine: request.confirmActiveOldMachine }) } : undefined;
        const response = await axios.request<unknown>({ url: `${home.replace(/\/+$/, '')}${transport.path.replace(':machineId', encodeURIComponent(input.machineId))}`,
          method: transport.method, data: body,
          headers: { ...buildCurrentAccountStoredContentCompatibilityHttpHeaders(), Authorization: `Bearer ${credentials.token}` },
          validateStatus: () => true, ...(context.signal ? { signal: context.signal } : {}),
        });
        if (response.status >= 200 && response.status < 300) return { ok: true };
        const raw = response.data;
        const error = raw && typeof raw === 'object' && 'error' in raw && typeof raw.error === 'string'
          ? raw.error : `http_${response.status}`;
        return { ok: false, status: response.status, error };
      }
      if (actionId === 'machines.remove') {
        const credentials = params.savedSecretOperationContext?.credentials ?? params.credentials;
        if (!credentials || !params.savedSecretOperationContext && params.token !== credentials.token
          || context.runtimeAccountId && context.runtimeAccountId !== readAccountIdFromToken(credentials.token)) {
          return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
        }
        if (!await isMachineActionServerScopeCurrent({ serverId: input.serverId ?? context.serverId, machineId: input.machineId, context, signal: context.signal })) {
          return { ok: false, errorCode: 'server_scope_mismatch', error: 'server_scope_mismatch' };
        }
        const home = params.savedSecretOperationContext?.serverHttpBaseUrl ?? params.serverHttpBaseUrl ?? resolveServerHttpBaseUrl();
        return runWithServerHttpBaseUrl(home, async () => {
          const store = params.savedSecretOperationContext
            ? createCliProviderConnectionsStoreForOperation({ operationContext: params.savedSecretOperationContext, signal: context.signal })
            : createCliProviderConnectionsStore({ credentials, signal: context.signal,
              isCredentialCurrent: params.isCredentialCurrent });
          const outcome = await revokeMachineWithProviderCleanup(input.machineId, {
            revoke: async () => {
              try {
                await store.verifyCurrent();
                const response = await axios.post(`${home.replace(/\/+$/, '')}/v1/machines/${encodeURIComponent(input.machineId)}/revoke`, {}, {
                  headers: { ...buildCurrentAccountStoredContentCompatibilityHttpHeaders(), Authorization: `Bearer ${credentials.token}` },
                  validateStatus: () => true, ...(context.signal ? { signal: context.signal } : {}),
                });
                if (response.status >= 200 && response.status < 300) return { ok: true } as const;
                const rawError: unknown = response.data;
                const error = rawError && typeof rawError === 'object' && 'error' in rawError && typeof rawError.error === 'string'
                  ? rawError.error : `http_${response.status}`;
                return { ok: false, status: response.status, error } as const;
              } catch {
                return { ok: false, status: 503, error: 'revoke_outcome_unknown' } as const;
              }
            },
            readCatalog: () => store.readCatalog(),
            writeCatalog: value => store.mutateCatalog(value),
          });
          if (outcome.ok && outcome.providerCleanup === 'complete') {
            try {
              await refreshActiveProviderConnectionsCatalog({ credentials,
                operationContext: params.savedSecretOperationContext, signal: context.signal,
                isCredentialCurrent: params.isCredentialCurrent }, { afterChange: true });
            } catch { /* Projection failure cannot erase the durable Provider row receipt. */ }
          }
          return outcome;
        });
      }
      if (actionId !== 'machines.daemon.stop') {
        return { ok: false, errorCode: 'unavailable', error: 'noClient' };
      }
      const { machineId, serverId } = input;
      if (!params.credentials && params.machineActionDirectTargetTransport?.machineId !== machineId) {
        return { ok: false, errorCode: 'daemon_transport_unavailable', error: 'An authenticated machine transport is required.' };
      }
      return await callMachineAction({ machineId, serverId, method: RPC_METHODS.STOP_DAEMON,
        request: {}, context, effectActionId: actionId, authority: context.authority, exactMachine: true,
        ...(context.signal ? { signal: context.signal } : {}),
      });
    },
    machineTerminalAction: async ({ actionId, input, context, signal }) => {
      const { machineId, serverId, ...request } = input;
      if (!params.credentials && params.machineActionDirectTargetTransport?.machineId !== machineId) {
        return { ok: false, errorCode: 'terminal_transport_unavailable', error: 'An authenticated machine transport is required.' };
      }
      const spec = getActionSpec(actionId);
      const method = spec.bindings?.rpcMethod;
      if (!method) return { ok: false, errorCode: 'unsupported_action', error: 'unsupported_action' };
      try {
        return MACHINE_TERMINAL_ACTION_OUTPUT_SCHEMAS[actionId].parse(await callMachineAction({
          machineId, serverId, method, request, context, effectActionId: actionId,
          authority: context.authority, exactMachine: true,
          ...(signal ? { signal } : {}),
        }));
      } catch (error) {
        if (actionId === 'machines.terminal.list' && isRpcMethodNotAvailableError(error)) return null;
        throw error;
      }
    },
    machineAgentInstallStart: async ({ machineId, signal, serverId, ...request }) => {
      if (!params.credentials && params.machineActionDirectTargetTransport?.machineId !== machineId) {
        return { ok: false, errorCode: 'install_unavailable', error: 'An authenticated machine transport is required.' };
      }
      return DaemonAgentInstallStartResponseSchema.parse(await callMachineAction({
        machineId, serverId, method: RPC_METHODS.DAEMON_AGENTS_INSTALL_START, request,
        ...(signal ? { signal } : {}),
      }));
    },
    machineAgentInstallRead: async ({ machineId, signal, serverId, ...request }) => {
      if (!params.credentials && params.machineActionDirectTargetTransport?.machineId !== machineId) {
        return { ok: false, errorCode: 'install_unavailable', error: 'An authenticated machine transport is required.' };
      }
      return DaemonAgentInstallReadResponseSchema.parse(await callMachineAction({
        machineId, serverId, method: RPC_METHODS.DAEMON_AGENTS_INSTALL_READ, request,
        ...(signal ? { signal } : {}),
      }));
    },
    machineAgentInstallCancel: async ({ machineId, signal, serverId, ...request }) => {
      if (!params.credentials && params.machineActionDirectTargetTransport?.machineId !== machineId) {
        return { ok: false, errorCode: 'install_unavailable', error: 'An authenticated machine transport is required.' };
      }
      return DaemonAgentInstallCancelResponseSchema.parse(await callMachineAction({
        machineId, serverId, method: RPC_METHODS.DAEMON_AGENTS_INSTALL_CANCEL, request,
        ...(signal ? { signal } : {}),
      }));
    },
    sessionContinuationInspect: async ({ input }) => {
      if (!params.credentials) return { status: 'answered', inspection: { type: 'unavailable', reason: 'operation_unavailable' } };
      return { status: 'answered', inspection: await inspectSessionContinuation({ credentials: params.credentials,
        request: { v: 1, sourceSessionId: input.sessionId, selection: input.selection } }) };
    },
    sessionAgentTransition: async ({ request, context, sessionInputSource }) => {
      if (!params.credentials || !context.actionCaller || !context.authority) return rejectUndispatchedSessionAgentTransition('forbidden');
      const root = context.externalActionExecutionAuthorization;
      if (root && (!params.externalActionMachineRequestPrivateKey || !params.externalActionMachineInstallationId)) {
        return rejectUndispatchedSessionAgentTransition('forbidden');
      }
      const caller = context.actionCaller;
      if (sessionInputSource && caller?.kind !== 'session') return rejectUndispatchedSessionAgentTransition('forbidden');
      const inputAdmission = sessionInputSource && caller?.kind === 'session'
        ? buildCausalSessionInputAdmissionV1({ ...sessionInputSource, callerDepth: readAgentStartCallerWorkDepthV1(caller) })
        : caller?.kind === 'plugin'
          ? buildPluginSessionInputAdmissionV1({ caller, surface: context.surface })
          : caller?.kind === 'host' && (context.authority === 'present_user' || context.externalActionCredential)
            ? buildTrustedHostSessionInputAdmissionV1(context.surface)
            : undefined;
      if (context.authority !== 'present_user' && !inputAdmission) return rejectUndispatchedSessionAgentTransition('forbidden');
      let restrictedAdmission = inputAdmission;
      if (inputAdmission && context.authority !== 'present_user' && caller?.kind !== 'session') {
        let ceiling = (typeof context.callerPermissionMode === 'string'
          ? parsePermissionIntentAlias(context.callerPermissionMode) : null) ?? 'default';
        const constraints = [context.callerInputConstraints, context.externalActionCredential?.grant]
          .filter(value => value !== undefined);
        if (constraints.some(constraint => !isPermissionModeGrantedV1(constraint, ceiling))) {
          const restricted = constraints.find(constraint => constraint.permissionModes !== null);
          if (!restricted || restricted.permissionModes === null) return rejectUndispatchedSessionAgentTransition('forbidden');
          const permissionModes = restricted.permissionModes.filter(mode => {
            if (constraints.some(constraint => !isPermissionModeGrantedV1(constraint, mode))) return false;
            const narrowed = resolveEffectivePermissionMode({ currentMode: ceiling, admittedPermissionCeiling: mode });
            return narrowed.ok && narrowed.effectiveMode === parsePermissionIntentAlias(mode);
          });
          const granted = resolveEffectiveApiTokenPermissionModeV1({ permissionModes }, ceiling);
          if (!granted) return rejectUndispatchedSessionAgentTransition('forbidden');
          const narrowed = resolveEffectivePermissionMode({ currentMode: ceiling, admittedPermissionCeiling: granted });
          if (!narrowed.ok) return rejectUndispatchedSessionAgentTransition('forbidden');
          const canonicalCeiling = parsePermissionIntentAlias(narrowed.effectiveMode);
          if (!canonicalCeiling) return rejectUndispatchedSessionAgentTransition('forbidden');
          ceiling = canonicalCeiling;
        }
        if (constraints.some(constraint => !isPermissionModeGrantedV1(constraint, ceiling))) {
          return rejectUndispatchedSessionAgentTransition('forbidden');
        }
        restrictedAdmission = { ...inputAdmission, request: { ...inputAdmission.request, permission: {
          ...inputAdmission.request.permission, requestedPermissionCeiling: ceiling,
        } } };
      }
      return await runSessionAgentTransition({ credentials: params.credentials, request,
        ...(context.signal ? { signal: context.signal } : {}),
        ...(restrictedAdmission ? { inputAdmission: restrictedAdmission } : {}),
        ...(context.callerInputConstraints ? { callerInputConstraints: context.callerInputConstraints } : {}),
        ...(context.externalActionCredential ? { credentialInputConstraints: context.externalActionCredential.grant } : {}),
        ...(context.externalActionExecutionAuthorization ? { callerInputAuthorization: context.externalActionExecutionAuthorization } : {}),
        ...(root ? { externalAction: { context: { ...context, externalActionTarget: { kind: 'session' as const, sessionId: request.sessionId } },
          effectActionId: root.binding.actionId, installationId: params.externalActionMachineInstallationId!,
          privateKey: params.externalActionMachineRequestPrivateKey! } } : {}),
        ...(params.actionsSettingsProvider?.getAccountSettings ? { deps: { readAccountSettings: () => params.actionsSettingsProvider!.getAccountSettings!() ?? null } } : {}),
        ...(params.machineAdmissionTransport ? { machineAdmissionTransport: params.machineAdmissionTransport } : {}) });
    },
    sessionSendMessage: async ({
      callerInputConstraints,
      context,
      sessionId,
      message,
      recipient,
      displayText,
      messageMeta,
      requestedAction,
      actionCaller,
      idempotencyKey,
      localId,
      source,
      attachments,
      reply,
      returnToSessionId,
      wait,
      timeoutSeconds,
      permissionModeOverride,
      modelOverride,
      providerConnectionId,
      sessionInputSource,
      callerSurface,
      serverId,
      signal,
    }) => {
      const pluginCaller = actionCaller?.kind === 'plugin' ? actionCaller : null;
      if (callerInputConstraints && typeof permissionModeOverride === 'string' && permissionModeOverride.trim()) {
        const requestedMode = parsePermissionIntentAlias(permissionModeOverride.trim());
        if (!requestedMode || !isPermissionModeGrantedV1(callerInputConstraints, requestedMode)) {
          return { status: 'rejected' as const, code: 'session_input_invalid' as const };
        }
      }
      if (pluginCaller && typeof permissionModeOverride === 'string' && permissionModeOverride.trim().length > 0) {
        return {
          status: 'rejected' as const,
          code: 'session_input_invalid' as const,
        };
      }
      if (!params.credentials) {
        return pluginCaller
          ? { status: 'rejected' as const, code: 'session_input_unauthorized' as const }
          : { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
      }

      const normalizedWait = reply === undefined && wait === true;
      const normalizedTimeoutSeconds =
        typeof timeoutSeconds === 'number' && Number.isFinite(timeoutSeconds) && timeoutSeconds > 0
          ? timeoutSeconds
          : 300;
      const normalizedPermissionModeOverride = typeof permissionModeOverride === 'string' && permissionModeOverride.trim().length > 0
        ? permissionModeOverride.trim()
        : undefined;
      const normalizedProviderConnectionId = providerConnectionId === null
        ? null
        : providerConnectionId === undefined
          ? undefined
          : ProviderConnectionIdSchema.parse(providerConnectionId);
      const normalizedModelOverride = modelOverride === null
        ? null
        : typeof modelOverride === 'string' && modelOverride.trim().length > 0
          ? modelOverride.trim()
          : undefined;
      if (normalizedProviderConnectionId !== undefined
        && normalizedProviderConnectionId !== null
        && (normalizedModelOverride === undefined || normalizedModelOverride === null)) {
        return { ok: false, errorCode: 'invalid_parameters', error: 'invalid_parameters' };
      }
      const modelSelectionInput = normalizedModelOverride === undefined
        ? undefined
        : {
            ...(normalizedProviderConnectionId !== undefined
              ? { providerConnectionId: normalizedProviderConnectionId }
              : {}),
            modelId: normalizedModelOverride,
          };

      const externalActionRequest = context?.externalActionCredential !== undefined
        || context?.externalActionExecutionAuthorization !== undefined;
      const resolveAuthorizationHeaders = externalActionRequest
        ? (request: Readonly<{ method: string; path: string; body?: unknown }>) =>
            resolveServerRequestHeaders(context, 'session.message.send', request)
        : undefined;
      if (resolveAuthorizationHeaders && !resolveAuthorizationHeaders({
          method: 'GET',
          path: '/v1/account/encryption/currentness',
        })) {
        return {
          status: 'rejected' as const,
          code: 'session_input_unauthorized' as const,
        };
      }

      if (
        pluginCaller
        && (
          typeof pluginCaller.contributionLocalId !== 'string'
          || typeof idempotencyKey !== 'string'
        )
      ) {
        return {
          status: 'rejected' as const,
          code: 'session_input_untrusted_assertion' as const,
        };
      }
      const pluginLocalId = pluginCaller
        ? derivePluginSessionInputLocalIdV1({
            caller: pluginCaller,
            sessionId,
            idempotencyKey: idempotencyKey!,
          })
        : undefined;
      const pluginInputAdmission = pluginCaller
        ? buildPluginSessionInputAdmissionV1({
            caller: pluginCaller,
            surface: callerSurface,
            ...(source ? { source } : {}),
            ...(context?.actionRequestAttributionV1 ? { actionRequestAttributionV1: context.actionRequestAttributionV1 } : {}),
          })
        : undefined;
      const turnDepth = sessionInputSource ? params.getCurrentTurnWorkDepth?.(sessionInputSource.sourceTurnId) : undefined;
      const starterDepth = sessionInputSource ? params.getCurrentSessionWorkDepth?.() : undefined;
      if (sessionInputSource && (turnDepth === undefined || starterDepth === undefined)) {
        return { status: 'rejected' as const, code: 'session_input_untrusted_assertion' as const };
      }
      // A user turn resets turn depth to zero, but cannot reset the Session or
      // background Run's immutable starter depth when it sends to another Session.
      const callerDepth = turnDepth !== undefined && starterDepth !== undefined
        ? readAgentStartCallerWorkDepthV1({ kind: 'session', sessionId: params.sessionId, starterDepth, turnDepth })
        : undefined;
      const causalSessionInputAdmission = sessionInputSource && callerDepth !== undefined
        ? buildCausalSessionInputAdmissionV1({ ...sessionInputSource, callerDepth,
            ...(context?.actionRequestAttributionV1 ? { actionRequestAttributionV1: context.actionRequestAttributionV1 } : {}) })
        : undefined;
      if (returnToSessionId !== undefined && (reply !== 'return' || context?.authority !== 'present_user'
        || actionCaller && actionCaller.kind !== 'host' || sessionInputSource
        || callerSurface !== 'ui' && callerSurface !== 'voice' && callerSurface !== 'cli')) {
        return { status: 'rejected' as const, code: 'session_input_untrusted_assertion' as const };
      }
      const humanOrigin = returnToSessionId === undefined ? undefined : { sessionId: returnToSessionId };
      const canonicalReplyIntent = reply === 'wait' || reply === 'return'
        ? { mode: reply, ...(humanOrigin ? { humanOrigin } : {}) } : undefined;
      if (reply === 'return' && !causalSessionInputAdmission && !humanOrigin) {
        return { status: 'rejected' as const, code: 'session_input_untrusted_assertion' as const };
      }
      const needsSourceReplyRpc = (reply === 'wait' || reply === 'return') && sessionInputSource !== undefined
        && params.sessionMessageReplyPublisher?.sessionId !== sessionInputSource.sourceSessionId;
      if (needsSourceReplyRpc && (!params.sessionActionRpcTransport || !context)) {
        return { ok: false, errorCode: 'session_reply_source_unavailable', error: 'session_reply_source_unavailable' };
      }
      const sourceReplyTransport = needsSourceReplyRpc && sessionInputSource
        ? await resolveTransportForSession(sessionInputSource.sourceSessionId, signal) : null;
      if (sourceReplyTransport && !sourceReplyTransport.ok) {
        return { ok: false, errorCode: 'session_reply_source_unavailable', error: 'session_reply_source_unavailable' };
      }

      const authoredMessageText = String(message ?? '');

      // Declared attachments reach the canonical structured-input admission
      // owner before the Session writer, exactly as a Composer-authored draft
      // does. A retry first consults the durable Pending/transcript owner: the
      // plugin preparation callback is not an idempotent boundary and must not
      // run again after an outcome-unknown write.
      let admittedAttachmentMeta: Record<string, unknown> | undefined;
      let admittedComposerAttachments: readonly ComposerAttachmentInputV1[] = [];
      let admittedMessageText = authoredMessageText;
      let rejoinedMessageMeta: Record<string, unknown> | undefined;
      const composerAttachmentRegistry = params.resolveComposerAttachmentSendPreparation?.() ?? null;
      if (attachments && attachments.length > 0) {
        if (!pluginCaller || !pluginLocalId) {
          return {
            status: 'rejected' as const,
            code: 'session_input_untrusted_assertion' as const,
          };
        }
        const transport = await resolveTransportForSession(sessionId, signal);
        if (!transport.ok) {
          return {
            status: 'rejected' as const,
            code: 'session_input_target_unavailable' as const,
          };
        }
        const rawAttachmentMeta = {
          [HAPPIER_STRUCTURED_INPUT_METADATA_KEY_V1]: {
            v: 1 as const,
            composerAttachments: buildPluginSessionInputAttachmentDraftsV1({
              pluginId: pluginCaller.pluginId,
              messageLocalId: pluginLocalId,
              authored: attachments,
            }),
          },
        };
        let persisted: Awaited<ReturnType<typeof findPersistedSessionUserMessageAdmission>>;
        try {
          persisted = await findPersistedSessionUserMessageAdmission({
            token: params.credentials.token,
            sessionId: transport.sessionId,
            localId: pluginLocalId,
            queryContext: transport.mode === 'plain'
              ? { encryptionMode: 'plain' }
              : {
                  encryptionMode: 'e2ee',
                  encryptionKey: transport.ctx.encryptionKey,
                  encryptionVariant: transport.ctx.encryptionVariant,
                },
          });
        } catch {
          return {
            status: 'outcomeUnknown' as const,
            localId: pluginLocalId,
            code: 'session_input_rejoin_unavailable',
          };
        }
        if (persisted) {
          try {
            validateComposerAttachmentRejoinCorrespondenceV1({
              meta: rawAttachmentMeta,
              preparedComposerAttachments: persisted.composerAttachments,
            });
          } catch {
            return {
              status: 'rejected' as const,
              code: 'session_input_idempotency_conflict' as const,
            };
          }
          admittedMessageText = persisted.text;
          rejoinedMessageMeta = persisted.meta;
          admittedComposerAttachments = persisted.composerAttachments;
        } else {
          const attachmentAdmission = await admitPluginSessionInputAttachmentsV1({
            attachments: composerAttachmentRegistry,
            pluginId: pluginCaller.pluginId,
            sessionId: transport.sessionId,
            messageLocalId: pluginLocalId,
            text: authoredMessageText,
            authored: attachments,
            ...(signal ? { signal } : {}),
          });
          if (attachmentAdmission.status === 'rejected') {
            return { status: 'rejected' as const, code: attachmentAdmission.code };
          }
          admittedAttachmentMeta = attachmentAdmission.meta;
          admittedComposerAttachments = attachmentAdmission.attachments;
        }
      }

      if (hasRawSessionAttachmentSelectionV1(messageMeta)) {
        const ingress = RawIngressStructuredInputV1Schema.safeParse(messageMeta?.[HAPPIER_STRUCTURED_INPUT_METADATA_KEY_V1]);
        const preparationLocalId = pluginLocalId ?? (localId === undefined ? randomUUID() : readPendingLocalId(localId));
        if (!ingress.success || !preparationLocalId) {
          return { status: 'rejected' as const, code: 'session_input_invalid' as const };
        }
        localId = preparationLocalId;
        const transport = await resolveTransportForSession(sessionId, signal);
        if (!transport.ok) return { status: 'rejected' as const, code: 'session_input_target_unavailable' as const };
        const legacyMeta = { [HAPPIER_STRUCTURED_INPUT_METADATA_KEY_V1]: {
          v: 1 as const, sessionAttachments: ingress.data.sessionAttachments,
        } };
        const rawResponse = await callSessionRpcForTransport(transport,
          SESSION_RPC_METHODS.SESSION_PENDING_MESSAGE_COMPOSER_ADMISSION_PREPARE_V1,
          { localId: preparationLocalId, text: authoredMessageText,
            structuredInput: legacyMeta[HAPPIER_STRUCTURED_INPUT_METADATA_KEY_V1] }, signal, null);
        const response = SessionPendingMessageComposerAdmissionPrepareResponseV1Schema.safeParse(rawResponse);
        if (rawResponse && typeof rawResponse === 'object' && 'ok' in rawResponse && rawResponse.ok === false) {
          const errorCode = response.success && !response.data.ok
            && response.data.errorCode === 'session_attachment_upload_checkpoint_stale'
            ? response.data.errorCode : readRpcErrorCode(rawResponse) ?? 'session_rpc_failed';
          return { ok: false, errorCode, error: errorCode };
        }
        const unsupported = { ok: false as const, errorCode: 'session_input_target_update_required', error: 'session_input_target_update_required' };
        if (!response.success || !response.data.ok || !response.data.sessionAttachmentMetadata) return unsupported;
        const descriptors = response.data.sessionAttachmentMetadata.envelope.payload.attachments;
        if (descriptors.some(descriptor => !descriptor.sha256)) return unsupported;
        try {
          validateComposerAttachmentRejoinCorrespondenceV1({ meta: legacyMeta,
            preparedComposerAttachments: [], preparedSessionAttachments: descriptors });
        } catch { return unsupported; }
        const projected = projectSessionAttachmentInputV1({ text: authoredMessageText,
          meta: { ...(messageMeta ?? {}), ...(admittedAttachmentMeta ?? {}) },
          uploaded: descriptors.map(descriptor => buildUploadedAttachment(descriptor)) });
        if (projected.text !== response.data.text) return unsupported;
        admittedAttachmentMeta = projected.meta;
        admittedMessageText = projected.text;
      }

      const dispatchMessageHook = async (canonicalSessionId: string, source: 'plugin' | 'user') => {
        try {
          await dispatchSessionLifecycleHookEvent({
            eventId: 'session.message.send',
            happySessionId: canonicalSessionId,
            payload: {
              sessionId: canonicalSessionId,
              text: admittedMessageText,
              source,
            },
          });
        } catch {
          // Hook dispatch is best-effort so a misbehaving plugin cannot break message send.
        }
      };

      // Both admissions resolve the Session again inside the send service, so
      // the exact Home's feature snapshot this dependency is already bound to
      // must travel with them; without it that second resolution decides
      // `sharing.session` for a Home it never observed.
      const sendServerFeaturesSnapshot = await readServerFeaturesSnapshot();
      const sendModelSelection = {
        ...(sendServerFeaturesSnapshot ? { serverFeaturesSnapshot: sendServerFeaturesSnapshot } : {}),
        ...(modelSelectionInput ? { modelSelectionInput } : {}),
      } as const;

      const protectedInputAdmission = pluginInputAdmission ?? causalSessionInputAdmission;
      const replyCredentials = params.credentials;
      const settleCanonicalReply = async (sent: Extract<SendSessionMessageResult, { ok: true }>, admission: SessionMessageSendResultV1) => {
        if ((reply !== 'wait' && reply !== 'return') || (admission.status !== 'accepted' && admission.status !== 'alreadyAccepted')) return admission;
        const address = { credentials: replyCredentials, sessionId: sent.sessionId, localId: admission.localId,
          ...(resolveAuthorizationHeaders ? { resolveAuthorizationHeaders } : {}),
          ...(sessionInputSource && params.sessionMessageReplyPublisher ? { sourceSession: params.sessionMessageReplyPublisher } : {}) };
        const observe = async (operation: 'inline' | 'release', observationSignal?: AbortSignal) => {
          if (sourceReplyTransport?.ok && context) {
            // Ending a tool's wait releases observation without cancelling the
            // accepted ask. The transport and Session lifetime own that release.
            const { signal: _observerSignal, ...sourceContext } = context;
            const input = SessionMessageReplyObservationRequestV1Schema.parse({
              requestSessionId: sent.sessionId, requestLocalId: admission.localId, operation,
            });
            return SessionMessageReplyMutationResultV1Schema.parse(await callSessionActionRpc(sourceReplyTransport,
              SESSION_RPC_METHODS.SESSION_MESSAGE_REPLY_OBSERVE_V1, input,
              { ...sourceContext, ...(observationSignal ? { signal: observationSignal } : {}) }));
          }
          return mutateSessionMessageReplyObservation({ ...address, operation, ...(observationSignal ? { signal: observationSignal } : {}) });
        };
        const release = async () => {
          try { await observe('release'); }
          catch { /* Accepted execution and original progress survive an unavailable observer. */ }
        };
        if (reply === 'return') {
          try {
            const released = await observe('release');
            if (released.ok) return admission;
          } catch { /* The original admitted work is retained for a safe observation retry. */ }
          return { ok: false as const, errorCode: 'session_reply_return_unavailable', error: 'session_reply_return_unavailable',
            details: { admission } };
        }
        try {
          const observed = await waitForSessionInputResult({ credentials: replyCredentials,
            idOrPrefix: sent.sessionId, localId: admission.localId, observeReply: true,
            ...((serverId ?? params.serverId) ? { serverId: serverId ?? params.serverId } : {}),
            ...(resolveAuthorizationHeaders ? { resolveAuthorizationHeaders } : {}),
            observation: timeoutSeconds === undefined ? { kind: 'no_deadline' }
              : { kind: 'after_input', timeoutMs: timeoutSeconds * 1000 },
            ...(sendServerFeaturesSnapshot ? { serverFeaturesSnapshot: sendServerFeaturesSnapshot } : {}),
            ...(signal ? { signal } : {}),
          });
          if (!observed.ok) { await release(); return admission; }
          const result = observed.result;
          const saved = observed.replyOutcome;
          const outcome = result.kind === 'final_text' && result.messageRef
            && saved?.kind === 'answer' && 'result' in saved
            && saved.result.sessionId === result.messageRef.session.sessionId
            && saved.result.messageId === result.messageRef.messageId
            ? { kind: 'answer' as const, text: result.text, messageRef: result.messageRef }
            : result.kind === 'fulfilled' && (result.outcome.kind !== 'answer' || 'publicationRef' in result.outcome)
              ? result.outcome : null;
          if (!outcome) { await release(); return admission; }
          const consumed = await observe('inline', signal);
          if (!consumed.ok) { await release(); return admission; }
          return { status: 'replied', localId: admission.localId, outcome,
            ...(observed.inputMessageRef ? { inputMessageRef: observed.inputMessageRef } : {}) };
        } catch {
          await release();
          return admission;
        }
      };
      if (protectedInputAdmission) {
        const protectedResult = await sendSessionMessage({
          ...(context?.authority ? { executionAuthority: context.authority } : {}),
          ...(context?.externalActionExecutionAuthorization ? { callerInputAuthorization: context.externalActionExecutionAuthorization } : {}),
          credentials: params.credentials,
          idOrPrefix: sessionId,
          message: admittedMessageText,
          ...(recipient ? { recipient } : {}),
          requestedAction,
          wait: normalizedWait,
          timeoutMs: reply === undefined ? normalizedTimeoutSeconds * 1000 : resolveSessionMessageAdmissionTimeoutMs(),
          ...(canonicalReplyIntent ? { replyIntent: canonicalReplyIntent } : {}),
          ...(pluginLocalId
            ? { localId: pluginLocalId }
            : typeof localId === 'string' && localId.trim().length > 0
              ? { localId }
              : {}),
          inputAdmission: protectedInputAdmission,
          ...(rejoinedMessageMeta
            ? { messageMeta: rejoinedMessageMeta }
            : (admittedAttachmentMeta || messageMeta || displayText)
            ? {
                messageMeta: {
                  ...(messageMeta ?? {}),
                  ...(admittedAttachmentMeta ?? {}),
                  ...(displayText ? { displayText } : {}),
                },
              }
            : {}),
          ...(params.machineAdmissionTransport
            ? { machineAdmissionTransport: params.machineAdmissionTransport }
            : {}),
          ...(resolveAuthorizationHeaders ? { resolveAuthorizationHeaders } : {}),
          ...(params.machineActionDirectTargetTransport
            ? { machineResumeTransport: params.machineActionDirectTargetTransport.invoke }
            : {}),
          ...sendModelSelection,
          ...(signal ? { signal } : {}),
        });
        if (!protectedResult.ok && protectedResult.code === 'machine_admission_transport_unavailable') {
          return {
            ok: false,
            errorCode: protectedResult.code,
            error: protectedResult.message ?? protectedResult.code,
          };
        }
        const admissionResult = projectSessionMessageSendActionResult(protectedResult);
        if (!admissionResult) {
          return { status: 'rejected' as const, code: 'session_input_target_unavailable' as const };
        }
        if (!protectedResult.ok || protectedResult.suppressed) return admissionResult;
        const canonicalSessionId = typeof protectedResult.sessionId === 'string'
          && protectedResult.sessionId.trim().length > 0
          ? protectedResult.sessionId
          : sessionId;
        if (
          composerAttachmentRegistry
          && (admissionResult.status === 'accepted' || admissionResult.status === 'alreadyAccepted')
        ) {
          notifyComposerAttachmentsAfterMessageAccepted({
            sessionId: canonicalSessionId,
            localId: admissionResult.localId,
            attachments: admittedComposerAttachments,
            notify: ({ attachment, event, signal: notificationSignal }) => (
              composerAttachmentRegistry.afterMessageAccepted({
                attachment,
                event,
                signal: notificationSignal,
              })
            ),
            signal: signal ?? new AbortController().signal,
          });
        }
        await dispatchMessageHook(canonicalSessionId, pluginCaller ? 'plugin' : 'user');
        return settleCanonicalReply(protectedResult, admissionResult);
      }

      const executionRunLocalId = recipient?.kind === 'execution_run'
        ? (typeof localId === 'string' && localId.trim().length > 0 ? localId : randomUUID())
        : undefined;
      const result = await sendSessionMessage({
        ...(context?.authority ? { executionAuthority: context.authority } : {}),
        ...(context?.externalActionExecutionAuthorization ? { callerInputAuthorization: context.externalActionExecutionAuthorization } : {}),
        credentials: params.credentials,
        idOrPrefix: sessionId,
        message: admittedMessageText,
        ...(recipient ? { recipient } : {}),
        ...(messageMeta || admittedAttachmentMeta || displayText ? {
          messageMeta: { ...(messageMeta ?? {}), ...(admittedAttachmentMeta ?? {}), ...(displayText ? { displayText } : {}) },
        } : {}),
        requestedAction,
        // Ordinary CLI and exact Home-admitted original Session input are
        // host producers. Session/plugin callers retain their causal proofs above.
        ...((reply !== undefined || callerSurface === 'cli' || context?.externalActionExecutionAuthorization
          && isOriginalSessionInputAccountActionCustody(context.externalActionExecutionAuthorization.binding))
          && (!actionCaller || actionCaller.kind === 'host')
          ? { inputAdmission: buildTrustedHostSessionInputAdmissionV1(callerSurface) }
          : {}),
        wait: normalizedWait,
        timeoutMs: reply === undefined ? normalizedTimeoutSeconds * 1000 : resolveSessionMessageAdmissionTimeoutMs(),
        ...(canonicalReplyIntent ? { replyIntent: canonicalReplyIntent } : {}),
        ...(context?.authority ? { executionAuthority: context.authority } : {}),
        // A caller-retained localId makes an ambiguous send retryable: the
        // durable pending queue is keyed by it, so resubmitting rejoins the
        // existing input instead of enqueuing a second message.
        ...(executionRunLocalId
          ? { localId: executionRunLocalId }
          : typeof localId === 'string' && localId.trim().length > 0
            ? { localId }
            : {}),
        ...(normalizedPermissionModeOverride ? { permissionModeOverride: normalizedPermissionModeOverride } : {}),
        ...sendModelSelection,
        ...(resolveAuthorizationHeaders ? { resolveAuthorizationHeaders } : {}),
        ...(params.machineAdmissionTransport
          ? { machineAdmissionTransport: params.machineAdmissionTransport }
          : {}),
        ...(params.machineActionDirectTargetTransport
          ? { machineResumeTransport: params.machineActionDirectTargetTransport.invoke }
          : {}),
        ...(signal ? { signal } : {}),
      });
      if (!result.ok && result.code === 'machine_admission_transport_unavailable'
        && callerSurface === 'cli' && (!actionCaller || actionCaller.kind === 'host')
        && hasStoredSessionCredentialProvenance(params.credentials)
        && !context?.externalActionCredential && !context?.externalActionExecutionAuthorization
        && !context?.rpcSessionAuthorization && !sessionInputSource) {
        // No input was issued: the standalone CLI has no authenticated Machine
        // socket. Its host children use the same original-Account ingress as a
        // top-level protected Send, preserving input identity and caller authority.
        const transport = await resolveSessionTransportContext({ credentials: params.credentials, idOrPrefix: sessionId,
          ...(sendServerFeaturesSnapshot ? { serverFeaturesSnapshot: sendServerFeaturesSnapshot } : {}),
          ...(signal ? { signal } : {}) });
        if (!transport.ok) return { ok: false, errorCode: transport.code, error: transport.code };
        const machineId = resolveSessionInputTargetMachineId({ rawSession: transport.rawSession,
          decryptedMetadata: tryDecryptSessionOwnerMetadataView({ credentials: params.credentials, rawSession: transport.rawSession,
            accountEncryptionMode: transport.accountEncryptionCurrentness.mode }) });
        const selectedTarget = context?.externalActionTarget;
        if (!machineId || selectedTarget && (selectedTarget.kind === 'machine'
          ? selectedTarget.machineId !== machineId : selectedTarget.sessionId !== transport.sessionId)) {
          return { status: 'rejected' as const, code: 'session_input_target_unavailable' as const };
        }
        const execution = await dispatchOriginalAccountAction({ actionId: 'session.message.send',
          input: { sessionId: transport.sessionId, message: admittedMessageText, requestedAction,
            ...(recipient ? { recipient } : {}), ...(executionRunLocalId ? { localId: executionRunLocalId } : localId ? { localId } : {}),
            ...(messageMeta || admittedAttachmentMeta ? { messageMeta: { ...(messageMeta ?? {}), ...(admittedAttachmentMeta ?? {}) } } : {}), ...(displayText ? { displayText } : {}),
            ...(permissionModeOverride ? { permissionModeOverride } : {}),
            ...(modelOverride !== undefined ? { modelOverride } : {}), ...(providerConnectionId !== undefined ? { providerConnectionId } : {}),
            ...(reply === undefined ? { wait: normalizedWait, timeoutSeconds: normalizedTimeoutSeconds }
              : { reply, ...(timeoutSeconds === undefined ? {} : { timeoutSeconds }) }) },
          requestId: context?.actionRequestId ?? randomUUID(),
          target: resolveProtectedSessionInputActionTarget({ sessionId: transport.sessionId, machineId, active: transport.rawSession.active !== false }),
          credentials: params.credentials, authority: context?.authority,
          serverHttpBaseUrl: params.serverHttpBaseUrl ?? resolveServerHttpBaseUrl(),
          serverIdentityId: context?.serverIdentityId ?? params.serverIdentityId,
          ...(params.isCredentialCurrent ? { isCurrent: params.isCredentialCurrent } : {}),
          ...(signal ? { signal } : {}) });
        return execution.ok ? execution.result : execution;
      }
      const admissionResult = projectSessionMessageSendActionResult(result);
      if (!result.ok) {
        if (admissionResult) return admissionResult;
        return {
          ok: false,
          errorCode: result.code,
          error: result.code,
          ...(result.candidates ? { candidates: result.candidates } : {}),
          ...(result.message ? { message: result.message } : {}),
          ...(result.providerError ? { details: result.providerError } : {}),
        };
      }
      const canonicalSessionId = typeof result.sessionId === 'string' && result.sessionId.trim().length > 0
        ? result.sessionId
        : sessionId;
      await dispatchMessageHook(canonicalSessionId, 'user');
      // A successful send always projects an accepted admission from its
      // resolved local id, even for the legacy unprotected writer response.
      if (!admissionResult) throw new Error('Successful Session send is missing its admission projection');
      return settleCanonicalReply(result, admissionResult);
    },

    sessionMessageReply: async ({ sessionId, requestLocalId, reply, reviewDecision, context, serverId, signal }) => {
      if (reviewDecision) {
        if (context.authority !== 'present_user' || await projectAccountAdmission(serverId ?? undefined, context)) {
          return { v: 1 as const, ok: false as const, error: 'forbidden' as const };
        }
        const credentials = params.credentials;
        if (!credentials) return { v: 1 as const, ok: false as const, error: 'unavailable' as const };
        await assertProjectRequesterCurrent(context);
        return withProjectHome(() => mutateSessionMessageReplyObservation({ credentials,
          sessionId, localId: requestLocalId, operation: reviewDecision,
          resolveAuthorizationHeaders: request => resolveServerRequestHeaders(context, 'approval.request.decide', request),
          ...(signal ? { signal } : {}) }));
      }
      if (!params.sessionMessageReplyPublisher) return { v: 1 as const, ok: false as const, error: 'unavailable' as const };
      if (sessionId !== params.sessionMessageReplyPublisher.sessionId) return { v: 1 as const, ok: false as const, error: 'forbidden' as const };
      const source = context.sessionInputSource === undefined ? undefined
        : SessionInputSourceSessionV1Schema.safeParse(context.sessionInputSource);
      if (source && (!source.success || source.data.sourceSessionId !== sessionId)) {
        return { v: 1 as const, ok: false as const, error: 'forbidden' as const };
      }
      return params.sessionMessageReplyPublisher.publishSessionMessageReply({ requestLocalId, reply,
        ...(source?.success ? { sourceTurnId: source.data.sourceTurnId } : {}) },
        signal ? { signal } : undefined);
    },

    sessionExchangePrepare: async ({ sessionId, originInputLocalId, context, serverId, signal }) => {
      const homeServerId = params.serverId ?? configuration.activeServerId;
      if ((serverId && !await isServerProfileHomeIdentity(homeServerId, serverId))
        || (context.serverId && !await isServerProfileHomeIdentity(homeServerId, context.serverId))) return null;
      const path = autonomousExchangePath(sessionId, originInputLocalId);
      const headers = resolveServerRequestHeaders(context, 'session.exchange.control', { method: 'GET', path });
      if (!headers) return null;
      const status = await readAutonomousExchangeStatus({
        serverHttpBaseUrl: params.serverHttpBaseUrl ?? resolveServerHttpBaseUrl(), path, headers,
        ...(signal ? { signal } : {}),
      });
      return status?.observedRevision ?? null;
    },

    sessionExchangeControl: async ({ sessionId, originInputLocalId, request, context, serverId, signal }) => {
      const homeServerId = params.serverId ?? configuration.activeServerId;
      if ((serverId && !await isServerProfileHomeIdentity(homeServerId, serverId))
        || (context.serverId && !await isServerProfileHomeIdentity(homeServerId, context.serverId))) {
        return { ok: false, errorCode: 'server_scope_mismatch', error: 'server_scope_mismatch' };
      }
      const path = autonomousExchangePath(sessionId, originInputLocalId);
      const headers = resolveServerRequestHeaders(context, 'session.exchange.control', {
        method: 'POST', path, body: request,
      });
      if (!headers) return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
      const response = await mutateAutonomousExchangeControl({
        serverHttpBaseUrl: params.serverHttpBaseUrl ?? resolveServerHttpBaseUrl(), path, headers, request,
        ...(signal ? { signal } : {}),
      });
      if (response.status < 200 || response.status >= 300) {
        const code = response.status === 409 ? 'exchange_revision_conflict'
          : response.status === 403 ? 'forbidden' : response.status === 404 ? 'not_found' : 'exchange_unavailable';
        return { ok: false, errorCode: code, error: code };
      }
      return response.result
        ? response.result
        : { ok: false, errorCode: 'exchange_unavailable', error: 'exchange_unavailable' };
    },

    sessionTurnCancel: async ({ sessionId, serverId, context, signal: callerSignal }) => {
      if (!params.credentials) {
        return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
      }
      const credentials = params.credentials;
      const signal = callerSignal ?? context.signal;
      signal?.throwIfAborted();
      const homeServerId = params.serverId ?? configuration.activeServerId;
      const homeServerHttpBaseUrl = params.serverHttpBaseUrl ?? resolveServerHttpBaseUrl();
      if ((serverId && !await isServerProfileHomeIdentity(homeServerId, serverId))
        || (context.serverId && !await isServerProfileHomeIdentity(homeServerId, context.serverId))) {
        return { ok: false, errorCode: 'server_scope_mismatch', error: 'server_scope_mismatch' };
      }
      const externalRequest = context.externalActionCredential !== undefined
        || context.externalActionExecutionAuthorization !== undefined;
      const resolveAuthorizationHeaders = externalRequest
        ? (request: Readonly<{ method: string; path: string; body?: unknown }>) =>
            resolveServerRequestHeaders(context, 'session.turn.cancel', request)
        : undefined;
      if (externalRequest && (!params.externalActionMachineRequestPrivateKey
        || !params.externalActionMachineInstallationId
        || !resolveAuthorizationHeaders?.({ method: 'GET', path: '/v1/account/encryption/currentness' }))) {
        return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
      }
      return await runWithServerHttpBaseUrl(homeServerHttpBaseUrl, async () => {
        const serverFeaturesSnapshot = await readServerFeaturesSnapshot();
        const transport = await resolveSessionTransportContext({
          credentials, idOrPrefix: sessionId,
          ...(resolveAuthorizationHeaders ? { resolveAuthorizationHeaders } : {}),
          ...(serverFeaturesSnapshot ? { serverFeaturesSnapshot } : {}),
          ...(signal ? { signal } : {}),
        });
        if (!transport.ok) {
          return { ok: false, errorCode: transport.code, error: transport.code,
            ...(transport.candidates ? { candidates: transport.candidates } : {}) };
        }
        try {
          const result = await callSessionRpc({
            ...transport, token: credentials.token, sessionId: transport.sessionId,
            method: `${transport.sessionId}:abort`,
            request: { reason: `The user doesn't want to proceed with this tool use. The tool use was rejected (eg. if it was a file edit, the new_string was NOT written to the file). STOP what you are doing and wait for the user to tell you how to proceed.` },
            ...(context.authority !== 'present_user' ? { authorityCeiling: 'account_automation' as const } : {}),
            ...(externalRequest && params.externalActionMachineRequestPrivateKey
              && params.externalActionMachineInstallationId ? { externalAction: {
                context, effectActionId: 'session.turn.cancel',
                installationId: params.externalActionMachineInstallationId,
                privateKey: params.externalActionMachineRequestPrivateKey,
              } } : {}),
            ...(signal ? { signal } : {}),
          });
          // The host's abort callback acknowledges delivery without a result.
          // Project that receipt at the Action boundary, including encrypted RPC.
          return result ?? { requested: true };
        } catch (error) {
          const errorCode = readRpcErrorCode(error) ?? 'session_rpc_failed';
          return { ok: false, errorCode, error: errorCode,
            errorMessage: error instanceof Error ? error.message : errorCode, sessionId: transport.sessionId };
        }
      });
    },

    sessionRuntimeRefresh: async ({ sessionId, machineId, serverId, context, signal }) => {
      if (!params.credentials) return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
      const target = { machineId, serverId: serverId ?? context.serverId ?? params.serverId,
        context, effectActionId: 'session.runtime.refresh', exactMachine: true as const,
        ...(context.authority ? { authority: context.authority } : {}), ...(signal ? { signal } : {}) };
      const rawState = await callMachineAction({ ...target,
        method: RPC_METHODS.DAEMON_SESSION_RUNNER_STATUS_GET, request: { sessionId } });
      const state = SessionRunnerRuntimeStateV1Schema.safeParse(rawState);
      if (!state.success || state.data.sessionId !== sessionId || state.data.machineId !== machineId) {
        return { ok: false, status: 'unsupported_daemon', sessionId, reasonCode: 'unsupported_daemon_version' };
      }
      const request = buildSessionRunnerRuntimeRefreshRequestV1(state.data, 'daemon_restart_session_runners_command');
      if ('ok' in request) return request;
      // The daemon's existing planned-restart lifecycle owns completion and deferral.
      const result = RestartSessionRunnerResultV1Schema.safeParse(await callMachineAction({ ...target,
        method: RPC_METHODS.DAEMON_SESSION_RUNNER_RESTART, request, timeoutMs: null,
        authorization: { kind: SOCKET_RPC_AUTHORIZATION_CONTEXT_KINDS.SESSION_WRITE, sessionId },
      }));
      return result.success && result.data.sessionId === sessionId ? result.data
        : { ok: false, status: 'partial_failure', sessionId, diagnostics: { errorCode: 'invalid_response' } };
    },

    sessionStop: async ({ sessionId, context, signal }) => {
      if (!params.credentials) {
        return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
      }
      return await requestSessionStop({ credentials: params.credentials, idOrPrefix: sessionId,
        ...(signal ? { signal } : {}),
        ...(context ? { actionContext: context } : {}),
        resolveAuthorizationHeaders: request => resolveServerRequestHeaders(context, 'session.stop', request),
        ...(context?.externalActionExecutionAuthorization && params.externalActionMachineRequestPrivateKey
          && params.externalActionMachineInstallationId ? { externalAction: { context, effectActionId: 'session.stop',
            privateKey: params.externalActionMachineRequestPrivateKey, installationId: params.externalActionMachineInstallationId } } : {}),
      });
    },

    sessionUpdatePost: async ({ context, ...input }) => {
      if (context.actionCaller?.kind === 'session' && context.actionCaller.sessionId !== params.sessionId) {
        return { ok: false, errorCode: 'session_update_source_mismatch', error: 'session_update_source_mismatch' };
      }
      const caller = params.getAgentStartRunCaller?.();
      if (caller && 'runId' in caller) {
        return { ok: false, errorCode: 'session_update_run_step_requires_publish_draft', error: 'session_update_run_step_requires_publish_draft' };
      }
      if (!params.postSessionUpdate) {
        // Account callers reach the current Session publisher through its
        // registered Action; only that host commits the original transcript event.
        return await withProjectHome(async () => {
          const transport = await resolveTransportForSession(params.sessionId, context.signal, {
            context, actionId: 'session.update.post',
          });
          if (!transport.ok) return { ok: false, errorCode: transport.code, error: transport.code };
          return await callSessionActionRpc(transport, 'session.update.post', input, context);
        });
      }
      const read = () => fetchSessionById({
        token: params.token, sessionId: params.sessionId,
        ...(context.signal ? { signal: context.signal } : {}),
        resolveAuthorizationHeaders: (request) => resolveServerRequestHeaders(context, 'session.update.post', request),
      });
      const current = params.serverHttpBaseUrl ? await runWithServerHttpBaseUrl(params.serverHttpBaseUrl, read) : await read();
      if (!current) return { ok: false, errorCode: 'session_not_found', error: 'session_not_found' };
      if (current.origin?.kind === 'run_step') return { ok: false, errorCode: 'session_update_run_step_requires_publish_draft', error: 'session_update_run_step_requires_publish_draft' };
      const report = SessionUpdatePostInputV1Schema.safeParse(input);
      if (!report.success) return { ok: false, errorCode: 'invalid_parameters', error: 'invalid_parameters' };
      if (!workerDeliverablesBelongToSessionV1(report.data.deliverables, params.sessionId)) {
        return { ok: false, errorCode: 'session_update_deliverable_scope_mismatch', error: 'session_update_deliverable_scope_mismatch' };
      }
      context.signal?.throwIfAborted();
      const committed = await params.postSessionUpdate(report.data);
      if (!committed.persisted || !committed.localId) return { ok: false, errorCode: 'session_update_not_committed', error: 'session_update_not_committed' };
      return { sessionId: params.sessionId, localId: committed.localId, persisted: true };
    },

    sessionManagerSet: async ({ context, sessionId, managerSessionId, expectedManagerSessionId, serverId, signal }) => {
      const credentials = params.credentials;
      if (!credentials) return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
      if (params.serverId !== undefined && serverId != null && !isSameActionHomeId(serverId)) {
        return { ok: false, errorCode: 'server_target_mismatch', error: 'server_target_mismatch' };
      }
      const mutate = () => setSessionManager({
        token: credentials.token, sessionId, managerSessionId, expectedManagerSessionId,
        ...(signal ? { signal } : {}),
        resolveAuthorizationHeaders: (request) => resolveServerRequestHeaders(context, 'session.manager.set', request),
      });
      const committed = await (params.serverHttpBaseUrl ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, mutate) : mutate());
      if (!committed.ok || managerSessionId === null) return committed;
      const preparation = await prepareSourceKeyAfterCommit({ effectActionId: 'session.manager.set',
        sourceSessionId: sessionId, destinationSessionId: managerSessionId, context, ...(signal ? { signal } : {}) });
      return projectSessionManagerSourceKeyPreparationV1(committed, preparation);
    },

    sessionOrganizationPinSet: async ({ context, sessionId, request, serverId, signal }) => {
      const credentials = params.credentials;
      if (!credentials) return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
      if (params.serverId !== undefined && serverId != null
        && !isSameActionHomeId(serverId)) {
        return { ok: false, errorCode: 'server_target_mismatch', error: 'server_target_mismatch' };
      }
      const mutate = async () => {
        signal?.throwIfAborted();
        if (request.pinned && request.surface === 'rail') {
          // Re-read on every addition: a cached transport could retain a demoted Bot marker.
          const serverFeaturesSnapshot = await readServerFeaturesSnapshot();
          const transport = await resolveSessionTransportContext({ credentials, idOrPrefix: sessionId,
            resolveAuthorizationHeaders: (httpRequest) => resolveServerRequestHeaders(context, 'session.organization.pin.set', httpRequest),
            ...(signal ? { signal } : {}),
            ...(serverFeaturesSnapshot ? { serverFeaturesSnapshot } : {}),
          });
          if (!transport.ok) return { ok: false, errorCode: transport.code, error: transport.code };
          const metadata = tryDecryptSessionMetadata({ credentials, rawSession: transport.rawSession });
          if (!metadata) return { ok: false, errorCode: 'session_metadata_unavailable', error: 'session_metadata_unavailable' };
          if (!readSessionBotV1(metadata.bot)) return { ok: false, errorCode: 'session_not_bot', error: 'session_not_bot' };
        }
        signal?.throwIfAborted();
        return await setSessionOrganizationPin({ token: credentials.token, sessionId, request,
          ...(signal ? { signal } : {}),
          resolveAuthorizationHeaders: (httpRequest) => resolveServerRequestHeaders(context, 'session.organization.pin.set', httpRequest),
        });
      };
      return params.serverHttpBaseUrl ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, mutate) : mutate();
    },

    sessionAttentionSet: async ({ context, sessionId, request, serverId, signal }) => {
      if (!params.credentials) return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
      if (params.serverId !== undefined && serverId != null && !isSameActionHomeId(serverId)) return { ok: false, errorCode: 'server_target_mismatch', error: 'server_target_mismatch' };
      const credentials = params.credentials;
      const mutate = () => setSessionAttentionStanding({
        token: credentials.token, sessionId, request,
        ...(signal ? { signal } : {}),
        resolveAuthorizationHeaders: (httpRequest) => resolveServerRequestHeaders(context, 'session.attention.set', httpRequest),
      });
      return params.serverHttpBaseUrl ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, mutate) : mutate();
    },

    sessionApprovalReviewerSet: async ({ context, sessionId, enabled, serverId }) => {
      const credentials = params.credentials;
      if (!credentials) return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
      if (params.serverId !== undefined && serverId != null && !isSameActionHomeId(serverId)) return { ok: false, errorCode: 'server_target_mismatch', error: 'server_target_mismatch' };
      const mutate = () => updateSessionMetadataForTarget({
        credentials, idOrPrefix: sessionId,
        resolveAuthorizationHeaders: (request) => resolveServerRequestHeaders(context, 'session.approval_reviewer.set', request),
        updater: (metadata) => ({ ...metadata, approvalReviewerEnabled: enabled }),
      });
      const result = await (params.serverHttpBaseUrl ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, mutate) : mutate());
      return result.ok ? { updated: true } : { ok: false, errorCode: result.code, error: result.code };
    },

    sessionStateFieldSet: async (write) => {
      const { context, actionId, sessionId, fieldId, value, serverId } = write;
      const credentials = params.credentials;
      if (!credentials) {
        return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
      }
      if (params.serverId !== undefined && serverId != null && !isSameActionHomeId(serverId))
        return { ok: false, errorCode: 'server_target_mismatch', error: 'server_target_mismatch' };
      const metadataContext: ActionExecutorContext = context.externalActionExecutionAuthorization
        ? { ...context, externalActionTarget: { kind: 'session', sessionId } }
        : context;
      const resolveAuthorizationHeaders = (request: Readonly<{
        method: 'GET' | 'POST' | 'PATCH'; path: string; body?: unknown;
      }>) => resolveServerRequestHeaders(metadataContext, actionId, request);
      if (!resolveAuthorizationHeaders({
        method: 'GET', path: '/v1/account/encryption/currentness',
      })) {
        return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
      }
      if (fieldId === 'intent.context') {
        const readerServerId = credentials.requesterSessionCredentialScope?.serverId ?? projectHomeId;
        if (!isSameActionHomeId(readerServerId)) return executionRunActionFailure('server_target_mismatch');
        await withCliPromptLibraryArtifactReader(reader => admitSessionContextIntentV1(value, ref => reader.readArtifactHeader(
          ref.serverId && isSameActionHomeId(ref.serverId) ? { ...ref, serverId: readerServerId } : ref)), {
          credentials, serverId: readerServerId, signal: context.signal,
        });
        context.signal?.throwIfAborted();
      }
      if (fieldId === 'intent.voicePreference' && value !== null) {
        // Running hosts consume their admitted lease. Standalone CLI uses the
        // same current manifest projection owner without activating plugins.
        const builtIn = readBuiltInSessionVoiceDeclarationV1(value.providerContributionId);
        const voiceProviders = builtIn ? [] : params.readPluginVoiceProviders
          ? params.readPluginVoiceProviders()
          : (await (await import('@/plugins/projection/registry/createResolvedContributionRegistry'))
            .resolveMergedContributionRegistry({ happyHomeDir: params.happyHomeDir })).voiceProviders;
        context.signal?.throwIfAborted();
        const entry = voiceProviders.find(entry => buildQualifiedPluginContributionKey(entry.identity) === value.providerContributionId);
        const parsed = VoiceProviderContributionSchema.safeParse(entry?.definition);
        const declaration = builtIn ?? (parsed.success ? parsed.data : null);
        if (!declaration) return { ok: false, errorCode: 'override_unsupported', error: 'override_unsupported' };
        const providerConfig = Object.fromEntries((declaration.settings?.fields ?? []).map(field => [field.id, field.default ?? null]));
        const admitted = admitDeclaredSessionVoicePreferenceV1({ providerContributionId: value.providerContributionId,
          declaration, providerConfig, preference: value });
        if (admitted.kind === 'unavailable') return { ok: false, errorCode: admitted.reason, error: admitted.reason };
      }
      const mutate = () => updateSessionStateFieldForTarget({
        credentials,
        idOrPrefix: sessionId,
        fieldId,
        value: fieldId === 'display.title' ? { title: String(value), staleBehavior: 'bump-if-value-changed' as const } : value,
        metadataReason: `cli-${actionId}`,
        // The registered binding guards its field across retries; unrelated
        // runtime metadata must not pin this semantic Action to a whole tuple.
        currentness: { signal: context.signal },
        resolveAuthorizationHeaders,
      });
      const res = await (params.serverHttpBaseUrl ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, mutate) : mutate());
      if (!res.ok) {
        return { ok: false, errorCode: res.code, error: res.code, ...(res.candidates ? { candidates: res.candidates } : {}) };
      }
      return { ok: true, sessionId: res.sessionId, ...(fieldId === 'display.title' ? { title: value }
        : fieldId === 'display.statusReason' ? { reason: value }
        : fieldId === 'display.bot' ? { bot: value } : fieldId === 'intent.memoryEnabled' ? { enabled: value }
        : fieldId === 'intent.voicePreference' ? { preference: value }
        : fieldId === 'intent.context' ? { work: res.metadata.work } : { showToolCalls: value }), version: res.version };
    },

    sessionPermissionModeSet: async ({ context, callerInputConstraints, sessionId, permissionMode }) => {
      const credentials = params.credentials;
      if (!credentials) {
        return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
      }
      const parsed = parsePermissionIntentAlias(String(permissionMode ?? '').trim());
      if (!parsed) {
        return { ok: false, errorCode: 'invalid_parameters', error: 'invalid_parameters' };
      }
      const updatedAt = Date.now();
      const externalRequest = Boolean(context?.externalActionCredential || context?.externalActionExecutionAuthorization);
      const resolveAuthorizationHeaders = (request: Readonly<{ method: 'GET' | 'POST' | 'PATCH'; path: string; body?: unknown }>) =>
        resolveServerRequestHeaders(context, 'session.permission_mode.set', request);
      if (externalRequest && !resolveAuthorizationHeaders({ method: 'GET', path: '/v1/account/encryption/currentness' })) {
        return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
      }
      const mutate = () => setSessionPermissionMode({
        credentials,
        idOrPrefix: sessionId,
        permissionMode: parsed as PermissionIntent,
        updatedAt,
        ...(callerInputConstraints ? { callerInputConstraints } : {}),
        ...(externalRequest ? { resolveAuthorizationHeaders } : {}),
      });
      const res = await (params.serverHttpBaseUrl ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, mutate) : mutate());
      if (!res.ok) {
        return { ok: false, errorCode: res.code, error: res.code, ...('candidates' in res && res.candidates ? { candidates: res.candidates } : {}) };
      }
      return { ok: true, sessionId: res.sessionId, permissionMode: parsed, updatedAt };
    },

    modelFavoriteSet: async (input, context) => {
      const credentials = params.credentials;
      if (!credentials) throw Object.assign(new Error('not_authenticated'), { code: 'not_authenticated' });
      const mutate = () => updateAccountSettingsV2OnceAgainstLatest({ credentials,
        signal: context.signal, mutate: raw => setModelFavoriteV1(raw, input) });
      return params.serverHttpBaseUrl ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, mutate) : mutate();
    },
    sessionModelUnarm: async ({ sessionId, context }) => {
      if (!params.credentials) return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
      const externalRequest = Boolean(context.externalActionCredential || context.externalActionExecutionAuthorization);
      const resolveAuthorizationHeaders = (request: Readonly<{ method: 'GET' | 'POST' | 'PATCH'; path: string; body?: unknown }>) =>
        resolveServerRequestHeaders(context, 'session.model.unarm', request);
      if (externalRequest && (!params.externalActionMachineInstallationId || !params.externalActionMachineRequestPrivateKey
        || !resolveAuthorizationHeaders({ method: 'GET', path: '/v1/account/encryption/currentness' }))) {
        return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
      }
      const mutate = () => setSessionModel({ credentials: params.credentials!, idOrPrefix: sessionId, serverId: projectHomeId, unarm: true,
        ...(externalRequest ? { resolveAuthorizationHeaders } : {}),
        ...(externalRequest && params.externalActionMachineInstallationId && params.externalActionMachineRequestPrivateKey ? {
          externalAction: { context, effectActionId: 'session.model.unarm', installationId: params.externalActionMachineInstallationId,
            privateKey: params.externalActionMachineRequestPrivateKey },
        } : {}),
      });
      const result = await (params.serverHttpBaseUrl ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, mutate) : mutate());
      if ('code' in result) return { ok: false, errorCode: result.code, error: result.code };
      const { sessionId: _sessionId, ...transition } = result;
      return SessionModelTransitionResultV1Schema.parse(transition);
    },
    sessionModelSet: async ({ context, callerInputConstraints, sessionId, modelId, providerConnectionId, teamCredentialModel, teamVisibilityGrantConsent, captureBefore, expected, applyTiming }) => {
      const credentials = params.credentials;
      if (!credentials) {
        return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
      }
      const normalizedModelId = String(modelId ?? '').trim();
      if (!normalizedModelId && teamCredentialModel === undefined) {
        return { ok: false, errorCode: 'invalid_parameters', error: 'invalid_parameters' };
      }
      const externalRequest = Boolean(context?.externalActionCredential || context?.externalActionExecutionAuthorization);
      const resolveAuthorizationHeaders = (request: Readonly<{ method: 'GET' | 'POST' | 'PATCH'; path: string; body?: unknown }>) =>
        resolveServerRequestHeaders(context, 'session.model.set', request);
      if (externalRequest && (!params.externalActionMachineInstallationId || !params.externalActionMachineRequestPrivateKey
        || !resolveAuthorizationHeaders({ method: 'GET', path: '/v1/account/encryption/currentness' }))) {
        return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
      }
      const mutate = () => setSessionModel({
        credentials,
        idOrPrefix: sessionId,
        serverId: projectHomeId,
        ...(applyTiming ? { applyTiming } : {}),
        ...(captureBefore !== undefined ? { captureBefore } : {}),
        ...(expected ? { expected } : {}),
        ...(normalizedModelId ? { modelId: normalizedModelId } : {}),
        ...(providerConnectionId !== undefined ? { providerConnectionId } : {}),
        ...(teamCredentialModel !== undefined ? { teamCredentialModel } : {}),
        ...(teamVisibilityGrantConsent !== undefined ? { teamVisibilityGrantConsent } : {}),
        ...(callerInputConstraints ? { callerInputConstraints } : {}),
        ...(externalRequest ? { resolveAuthorizationHeaders } : {}),
        ...(externalRequest && context && params.externalActionMachineInstallationId && params.externalActionMachineRequestPrivateKey ? {
          externalAction: { context, effectActionId: 'session.model.set',
            installationId: params.externalActionMachineInstallationId, privateKey: params.externalActionMachineRequestPrivateKey },
        } : {}),
      });
      const res = await (params.serverHttpBaseUrl ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, mutate) : mutate());
      if (!res.ok) {
        const errorCode = 'code' in res ? res.code : res.status;
        return {
          ok: false,
          errorCode,
          error: errorCode,
          ...('candidates' in res && res.candidates ? { candidates: res.candidates } : {}),
          ...('status' in res
            ? {
                details: {
                  status: res.status,
                  activeSelection: 'activeSelection' in res ? res.activeSelection : undefined,
                  requestedSelection: 'requestedSelection' in res ? res.requestedSelection : undefined,
                  requestedTeamSelection: 'requestedTeamSelection' in res ? res.requestedTeamSelection : undefined,
                  ...('reason' in res && res.reason ? { reason: res.reason } : {}),
                },
              }
            : {}),
        };
      }
      if (res.status === 'intent_updated') {
        return {
          ok: true,
          status: res.status,
          sessionId: res.sessionId,
          modelId: 'ref' in res.selection ? res.selection.ref.modelId : res.selection.modelId,
          selection: res.selection,
          updatedAt: res.updatedAt,
          ...('reversal' in res && res.reversal ? { reversal: res.reversal } : {}),
        };
      }
      return {
        ...res,
        modelId: res.activeSelection.modelId,
      };
    },

    sessionArchiveSet: async ({ sessionId, archived, context }) => {
      if (!params.credentials) {
        return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
      }
      const effectActionId = archived ? 'session.archive' : 'session.unarchive';
      return await setSessionArchivedState({ credentials: params.credentials, idOrPrefix: sessionId, archived: archived === true,
        ...(context?.signal ? { signal: context.signal } : {}),
        resolveAuthorizationHeaders: request => resolveServerRequestHeaders(context, effectActionId, request),
        ...(context?.externalActionExecutionAuthorization && params.externalActionMachineRequestPrivateKey
          && params.externalActionMachineInstallationId ? { externalAction: { context, effectActionId,
            privateKey: params.externalActionMachineRequestPrivateKey, installationId: params.externalActionMachineInstallationId } } : {}),
      });
    },

    sessionStatusGet: async ({ sessionId, live, readiness, operation, credentialPurpose, credentialTeamSelection, context, signal, serverId }) => {
      const operationSignal = signal ?? context?.signal;
      operationSignal?.throwIfAborted();
      if (!params.credentials) {
        return { ok: false, code: 'not_authenticated' };
      }
      const denied = await projectHomeAdmission(serverId ?? undefined, context);
      if (denied) return denied;
      const credentials = params.credentials;
      const serverFeaturesSnapshot = await readServerFeaturesSnapshot();
      const read = () => getSessionStatus({ credentials, idOrPrefix: sessionId, live: live === true,
        ...(operation ? { operation } : {}), ...(credentialPurpose ? { credentialPurpose } : {}),
        ...(credentialTeamSelection ? { credentialTeamSelection } : {}),
        readiness: readiness === true, ...(operationSignal ? { signal: operationSignal } : {}),
        ...(serverFeaturesSnapshot ? { serverFeaturesSnapshot } : {}),
        ...(params.serverHttpBaseUrl ? { serverHttpBaseUrl: params.serverHttpBaseUrl } : {}),
        resolveAuthorizationHeaders: request => resolveServerRequestHeaders(context, 'session.status.get', request),
        ...(context?.externalActionExecutionAuthorization ? { authorization: context.externalActionExecutionAuthorization } : {}),
        // A credential-only external root has no requester Machine projection. Never use host custody instead.
        ...(!context?.externalActionCredential || context.externalActionExecutionAuthorization ? {
          readReadinessInventory: input => actionDeps.machinesAgentsList!(input, context ?? { surface: 'cli' }),
          readReadinessCredential: async ({ machineId, purpose, machineAccess, teamSelection }) => {
            const currentContext = context ?? { surface: 'cli' as const };
            const described = DaemonContributionRegistryProjectionDescribeResponseSchema.parse(await callMachineAction({
              machineId, method: RPC_METHODS.DAEMON_MERGED_CONTRIBUTION_REGISTRY_PROJECTION_DESCRIBE,
              request: { machineId }, context: currentContext, effectActionId: 'session.status.get', exactMachine: true,
              ...(operationSignal ? { signal: operationSignal } : {}),
            }));
            const authorizeRequest = (request: Readonly<{ method: string; path: string; body?: unknown }>) =>
              resolveServerRequestHeaders(currentContext, 'session.status.get', request);
            const store = teamSelection ? null : createCliConnectedAccountCatalogStore({ credentials, operationContext: params.savedSecretOperationContext,
              authorizeRequest, ...(operationSignal ? { signal: operationSignal } : {}) });
            const catalog = store ? await store.readAdmittedCatalog('purposes') : null;
            if (!teamSelection && (!catalog || catalog.status !== 'ready' || catalog.record.key !== 'purposes')) return { kind: 'unknown' as const };
            const profile = teamSelection ? null : await fetchAccountProfile({ token: credentials.token, authorizeRequest,
              ...(operationSignal ? { signal: operationSignal } : {}) });
            store?.assertCurrent();
            if (profile && homeAccountId && profile.id !== homeAccountId) return { kind: 'unknown' as const };
            const team = teamSelection;
            let resource: TeamCredentialResourceCatalogEntryV1 | null = null;
            const homeDomainAction = (readEffectiveDeps?.() ?? actionDeps).homeDomainAction;
            if (team && homeDomainAction) {
              let cursor: string | null = null;
              do {
                const page = TeamCredentialResourceEntitledPageV1Schema.parse(await homeDomainAction({
                  actionId: 'teams.credentials.entitled.list', input: { teamId: team.teamId, ...(cursor ? { cursor } : {}) },
                  context: currentContext, ...(operationSignal ? { signal: operationSignal } : {}),
                }));
                resource = page.resources.find(candidate => candidate.id === team.selection.resourceId) ?? null;
                cursor = page.nextCursor;
              } while (!resource && cursor);
            }
            store?.assertCurrent();
            const descriptors = Object.values(described.projection.familiesById.connectedAccounts?.entriesById ?? {}).flatMap(entry => {
              const parsed = ConnectedAccountUiProjectionEntryV1Schema.safeParse(entry);
              return parsed.success && parsed.data.availability.state === 'available' ? [parsed.data] : [];
            });
            return readSessionOperationCredentialReadinessV1({ purpose, machineId, machineAccess, executionAccountId: profile?.id ?? homeAccountId,
              repairAccess: resolveMachineRpcRoutePolicy(CONNECTED_ACCOUNT_AUTHENTICATION_COMMAND_RPC_METHOD).sharedMachineAccess,
              bindings: catalog?.status === 'ready' && catalog.record.key === 'purposes' ? catalog.record.value : { v: 1, bindings: [] },
              ...(teamSelection ? { teamSelection } : {}),
              projection: described.projection, accounts: profile?.connectedAccountsV4 ?? [], groups: profile?.connectedAccountGroupsV4 ?? [],
              now: Date.now(), teamResource: resource, readAuthentication: service => {
                const matching = descriptors.filter(descriptor => descriptor.pluginId === service.pluginId && descriptor.serviceId === service.localId);
                return matching.length === 1 ? matching[0]!.authentication : null;
              } });
          },
        } : {}),
      });
      return await withProjectHome(read);
    },

    sessionWorkStateGet: async ({ sessionId }) => {
      return await callResolvedSessionRpc(sessionId, SESSION_RPC_METHODS.SESSION_WORK_STATE_GET, {});
    },

    sessionTerminalComposerClear: async ({ sessionId, expectedStateAtMs }) => {
      return await callResolvedSessionRpc(sessionId, SESSION_RPC_METHODS.SESSION_TERMINAL_COMPOSER_CLEAR, {
        sessionId,
        ...(typeof expectedStateAtMs === 'number' ? { expectedStateAtMs } : {}),
      });
    },

    sessionPendingInputInterruptAndRun: async ({ sessionId, localId, expectedStateAtMs }) => {
      return await callResolvedSessionRpc(sessionId, SESSION_RPC_METHODS.SESSION_PENDING_INPUT_INTERRUPT_AND_RUN, {
        sessionId,
        localId,
        ...(typeof expectedStateAtMs === 'number' ? { expectedStateAtMs } : {}),
      });
    },
    sessionPendingActionSet: async ({ sessionId, localId, requestedAction, resumeWhenAvailable, serverId, context }) => {
      const denied = await projectHomeAdmission(serverId, context);
      if (denied) return denied;
      return withProjectHome(() => updatePendingQueueV2RequestedAction({ token: params.token, sessionId, localId, requestedAction,
        ...(resumeWhenAvailable !== undefined ? { resumeWhenAvailable } : {}),
        ...(context.signal ? { signal: context.signal } : {}),
        resolveAuthorizationHeaders: request => resolveServerRequestHeaders(context, 'session.pending.action.set', request),
      }));
    },
    sessionPendingWithdraw: async ({ sessionId, localId, serverId, targetExecutionRunId, context }) => {
      const denied = await projectHomeAdmission(serverId, context);
      if (denied) return denied;
      return withProjectHome(() => withdrawPendingQueueV2Message({ token: params.token, sessionId, localId,
        ...(targetExecutionRunId ? { targetExecutionRunId } : {}), ...(context.signal ? { signal: context.signal } : {}),
        resolveAuthorizationHeaders: request => resolveServerRequestHeaders(context, 'session.pending.withdraw', request),
      }));
    },
    sessionPendingMarkHandled: async ({ sessionId, localId, serverId, context }) => {
      const denied = await projectHomeAdmission(serverId, context);
      if (denied) return denied;
      return withProjectHome(async () => {
        await markPendingQueueV2DeliveryHandled({ token: params.token, sessionId, localId,
          ...(context.signal ? { signal: context.signal } : {}),
          resolveAuthorizationHeaders: request => resolveServerRequestHeaders(context, 'session.pending.markHandled', request),
        });
        return { ok: true };
      });
    },
    sessionPendingDismiss: async ({ sessionId, localId, serverId, targetExecutionRunId, context }) => {
      const denied = await projectHomeAdmission(serverId, context);
      if (denied) return denied;
      return withProjectHome(async () => {
        await dismissPendingQueueV2Delivery({ token: params.token, sessionId, localId,
          ...(targetExecutionRunId ? { targetExecutionRunId } : {}), ...(context.signal ? { signal: context.signal } : {}),
          resolveAuthorizationHeaders: request => resolveServerRequestHeaders(context, 'session.pending.dismiss', request),
        });
        return { ok: true };
      });
    },
    sessionPendingSendAsNew: async ({ sessionId, localId, serverId, targetExecutionRunId, context }) => {
      const denied = await projectHomeAdmission(serverId, context);
      if (denied) return denied;
      return withProjectHome(async () => {
        const { newLocalId } = await sendPendingQueueV2DeliveryAsNew({ token: params.token, sessionId, localId,
          ...(targetExecutionRunId ? { targetExecutionRunId } : {}), ...(context.signal ? { signal: context.signal } : {}),
          resolveAuthorizationHeaders: request => resolveServerRequestHeaders(context, 'session.pending.sendAsNew', request),
        });
        return { newLocalId };
      });
    },
    sessionPendingResetStartSet: async ({ sessionId, localId, serverId, reset, initialInput, context }) => {
      const denied = await projectHomeAdmission(serverId, context);
      if (denied) return denied;
      const credentials = params.credentials;
      if (!credentials) return executionRunActionFailure('not_authenticated');
      const assertCurrent = async () => {
        context.signal?.throwIfAborted();
        if (await projectHomeAdmission(serverId, context)) throw Object.assign(new Error('server_scope_mismatch'), { code: 'server_scope_mismatch' });
        await assertProjectRequesterCurrent(context);
      };
      const authorizeRequest = (request: Readonly<{ method: string; path: string; body?: unknown }>) => {
        const headers = resolveServerRequestHeaders(context, 'session.pending.resetStart.set', request);
        if (!headers) throw Object.assign(new Error('reset_start_unavailable'), { code: 'reset_start_unavailable', reason: 'authority_unavailable' });
        return headers;
      };
      try {
        return await withProjectHome(async () => {
          await assertCurrent();
          const snapshot = await readServerFeaturesSnapshot();
          await assertCurrent();
          if (snapshot?.status === 'ready' && (snapshot.features.capabilities.session.pendingInput?.protocolVersion ?? 0) < PENDING_INPUT_PROTOCOL_VERSION_V4) {
            throw Object.assign(new Error('reset_start_unsupported'), { code: 'reset_start_unsupported' });
          }
          const headers = authorizeRequest({ method: 'GET', path: '/v1/account/encryption/currentness' });
          const authority = await fetchAccountEncryptionCurrentness({ token: credentials.token, authorizationHeaders: headers,
            ...(context.signal ? { signal: context.signal } : {}) });
          await assertCurrent();
          const options = { credentials, accountMode: authority.mode, assertCurrent, authorizeRequest,
            includePendingWork: false, ...(context.signal ? { signal: context.signal } : {}) };
          const [quota, witness] = await Promise.all([
            readProviderAccountUsageQuotaV4({ source: reset.source }, options),
            readProviderAccountUsageHistoryWitnessV4({ recordId: reset.recordId, witness: reset.witness }, options),
          ]);
          await assertCurrent();
          const admission = evaluatePendingResetStartAdmissionV1({ reset, witness, current: quota.current, nowMs: Date.now(), authorityCurrent: true });
          if (admission.status === 'unavailable') throw Object.assign(new Error('reset_start_unavailable'), {
            code: 'reset_start_unavailable', reason: admission.reason,
          });
          return updatePendingQueueV2RequestedAction({ token: params.token, sessionId, localId,
            requestedAction: { v: 1, kind: 'reset_start', reset }, ...(initialInput ? { initialInput } : {}),
            ...(context.signal ? { signal: context.signal } : {}), resolveAuthorizationHeaders: authorizeRequest,
          });
        });
      } catch (error) {
        if (error instanceof Error && 'code' in error) {
          if (error.code === 'reset_start_unsupported') return executionRunActionFailure('reset_start_unsupported');
          if (error.code === 'reset_start_unavailable' && 'reason' in error) {
            const reason = PendingResetStartWaitingReasonV1Schema.safeParse(error.reason);
            if (reason.success) return ActionExecuteFailureSchema.parse({ ok: false, errorCode: 'reset_start_unavailable',
              error: 'reset_start_unavailable', details: { reason: reason.data } });
          }
        }
        throw error;
      }
    },
    sessionPendingResetStartCancel: async ({ sessionId, localId, serverId, context }) => {
      const denied = await projectHomeAdmission(serverId, context);
      if (denied) return denied;
      return withProjectHome(() => withdrawPendingQueueV2Message({ token: params.token, sessionId, localId,
        ...(context.signal ? { signal: context.signal } : {}),
        resolveAuthorizationHeaders: request => resolveServerRequestHeaders(context, 'session.pending.resetStart.cancel', request),
      }));
    },

    sessionGoalGet: async ({ sessionId, ...options }) => {
      return await callRoutedSessionGoalControl(sessionId, 'get', {}, options);
    },

    sessionGoalSet: async ({ sessionId, objective, status, tokenBudget, ...options }) => {
      return await callRoutedSessionGoalControl(sessionId, 'set', {
        ...(typeof objective === 'string' ? { objective } : {}),
        ...(typeof status === 'string' && status.trim().length > 0 ? { status: status.trim() } : {}),
        ...(typeof tokenBudget !== 'undefined' ? { tokenBudget: tokenBudget ?? null } : {}),
      }, options);
    },

    sessionGoalClear: async ({ sessionId, ...options }) => {
      return await callRoutedSessionGoalControl(sessionId, 'clear', {}, options);
    },

    sessionUsageLimitWaitResumeEnable: async ({ sessionId, issueFingerprint, remember, resumePromptMode }) => {
      if (!await isUsageLimitRecoveryEnabled()) {
        return normalizeUsageLimitRecoveryOperationResult(usageLimitRecoveryDisabledResult(), { sessionId });
      }
      const normalizedResumePromptMode = readResumePromptMode(resumePromptMode);
      const request = {
        sessionId,
        ...(typeof issueFingerprint === 'string' ? { issueFingerprint } : {}),
        ...(remember === true ? { rememberPreference: true } : {}),
        ...(normalizedResumePromptMode ? { resumePromptMode: normalizedResumePromptMode } : {}),
      };
      return await callRoutedUsageLimitRecoveryControl(sessionId, 'enable', request);
    },

    sessionUsageLimitWaitResumeCancel: async ({ sessionId, issueFingerprint, armedAtMs, runtimeAuthRecoveryAttemptId }) => {
      if (!await isUsageLimitRecoveryEnabled()) {
        return normalizeUsageLimitRecoveryOperationResult(usageLimitRecoveryDisabledResult(), { sessionId });
      }
      const request = {
        sessionId,
        ...(issueFingerprint !== undefined ? { issueFingerprint } : {}),
        ...(typeof armedAtMs === 'number' && Number.isFinite(armedAtMs)
          ? { armedAtMs: Math.trunc(armedAtMs) }
          : {}),
        ...(typeof runtimeAuthRecoveryAttemptId === 'string' && runtimeAuthRecoveryAttemptId.trim().length > 0
          ? { runtimeAuthRecoveryAttemptId: runtimeAuthRecoveryAttemptId.trim() }
          : {}),
      };
      return await callRoutedUsageLimitRecoveryControl(sessionId, 'cancel', request);
    },

    sessionUsageLimitCheckNow: async ({ sessionId, agentId, resumePromptMode }) => {
      if (!await isUsageLimitRecoveryEnabled()) {
        return normalizeUsageLimitRecoveryOperationResult(usageLimitRecoveryDisabledResult(), { sessionId });
      }
      const normalizedAgentId = typeof agentId === 'string' ? agentId.trim() : '';
      const normalizedResumePromptMode = readResumePromptMode(resumePromptMode);
      return await callRoutedUsageLimitRecoveryControl(sessionId, 'checkNow', {
        sessionId,
        ...(normalizedAgentId.length > 0 ? { agentId: normalizedAgentId } : {}),
        ...(normalizedResumePromptMode ? { resumePromptMode: normalizedResumePromptMode } : {}),
      });
    },

    sessionUsageLimitSwitchAccountNow: async ({ sessionId, agentId, resumePromptMode }) => {
      if (!await isUsageLimitRecoveryEnabled()) {
        return normalizeUsageLimitRecoveryOperationResult(usageLimitRecoveryDisabledResult(), { sessionId });
      }
      const normalizedAgentId = typeof agentId === 'string' ? agentId.trim() : '';
      const normalizedResumePromptMode = readResumePromptMode(resumePromptMode);
      return await callRoutedUsageLimitRecoveryControl(sessionId, 'switchAccountNow', {
        sessionId,
        operation: 'switch_account_now',
        ...(normalizedAgentId.length > 0 ? { agentId: normalizedAgentId } : {}),
        ...(normalizedResumePromptMode ? { resumePromptMode: normalizedResumePromptMode } : {}),
      });
    },

    sessionUsageLimitConsumeResetCredit: async ({ sessionId, agentId, issueFingerprint, resumePromptMode }) => {
      if (!await isUsageLimitRecoveryEnabled()) {
        return normalizeUsageLimitRecoveryOperationResult(usageLimitRecoveryDisabledResult(), { sessionId });
      }
      const normalizedAgentId = typeof agentId === 'string' ? agentId.trim() : '';
      const normalizedIssueFingerprint = typeof issueFingerprint === 'string' ? issueFingerprint.trim() : '';
      const normalizedResumePromptMode = readResumePromptMode(resumePromptMode);
      return await callRoutedUsageLimitRecoveryControl(sessionId, 'consumeResetCredit', {
        sessionId,
        operation: 'consume_reset_credit',
        ...(normalizedAgentId.length > 0 ? { agentId: normalizedAgentId } : {}),
        ...(normalizedIssueFingerprint.length > 0 ? { issueFingerprint: normalizedIssueFingerprint } : {}),
        ...(normalizedResumePromptMode ? { resumePromptMode: normalizedResumePromptMode } : {}),
      });
    },

    sessionVendorPluginCatalogList: async ({ sessionId, cwd }) => {
      return await callRoutedSessionCatalogControl(sessionId, 'vendorPlugins', { cwd });
    },

    sessionSkillCatalogList: async ({ sessionId, cwd }) => {
      return await callRoutedSessionCatalogControl(sessionId, 'skills', { cwd });
    },

    sessionHistoryGet: async ({ sessionId, limit, format, includeMeta, includeStructuredPayload }) => {
	      if (!params.credentials) {
	        return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
	      }
	      const normalizedLimit =
	        typeof limit === 'number' && Number.isFinite(limit) && limit > 0
	          ? Math.min(1000, Math.floor(limit))
	          : 50;
	      const normalizedFormat = format === 'raw' || format === 'compact' ? format : 'compact';
	      return await getSessionEvents({
	        credentials: params.credentials,
	        idOrPrefix: sessionId,
	        limit: normalizedLimit,
	        format: normalizedFormat,
	        includeMeta: includeMeta === true,
	        includeStructuredPayload: includeStructuredPayload === true,
	      });
	    },

    sessionTranscriptGet: async ({
      context,
      sessionId,
      projection,
      callerPluginId,
      limit,
      cursor,
      direction,
      scope,
      sidechainId,
      roles,
      includeTools,
      includeReasoning,
      includeEvents,
      includeMeta,
      includeRaw,
      includeStructuredPayload,
      maxCharsPerMessage,
      maxRawPayloadChars,
      signal,
    }) => {
      if (!params.credentials) {
        return { ok: false, errorCode: 'not_authenticated', errorMessage: 'not_authenticated' };
      }
      const resolveAuthorizationHeaders = (request: Readonly<{
        method: 'GET' | 'POST'; path: string; body?: unknown;
      }>) => resolveServerRequestHeaders(context,
        context?.externalActionExecutionAuthorization?.binding.actionId ?? 'session.transcript.get', request);
      if (!resolveAuthorizationHeaders({
        method: 'GET', path: '/v1/account/encryption/currentness',
      })) {
        return { ok: false, errorCode: 'not_authenticated', errorMessage: 'not_authenticated' };
      }
      return await getSessionTranscript({
        credentials: params.credentials,
        resolveAuthorizationHeaders,
        idOrPrefix: sessionId,
        ...(projection ? { projection } : {}),
        ...(callerPluginId ? { callerPluginId } : {}),
        ...(typeof limit === 'number' ? { limit } : {}),
        ...(cursor !== undefined ? { cursor } : {}),
        ...(direction ? { direction } : {}),
        ...(scope ? { scope } : {}),
        ...(sidechainId !== undefined ? { sidechainId } : {}),
        ...(roles ? { roles } : {}),
        ...(typeof includeTools === 'boolean' ? { includeTools } : {}),
        ...(typeof includeReasoning === 'boolean' ? { includeReasoning } : {}),
        ...(typeof includeEvents === 'boolean' ? { includeEvents } : {}),
        ...(typeof includeMeta === 'boolean' ? { includeMeta } : {}),
        ...(typeof includeRaw === 'boolean' ? { includeRaw } : {}),
        ...(typeof includeStructuredPayload === 'boolean' ? { includeStructuredPayload } : {}),
        ...(maxCharsPerMessage !== undefined ? { maxCharsPerMessage } : {}),
        ...(maxRawPayloadChars !== undefined ? { maxRawPayloadChars } : {}),
        ...(signal ? { signal } : {}),
      });
    },

    sessionEventsGet: async ({
      sessionId,
      limit,
      cursor,
      direction,
      scope,
      sidechainId,
      roles,
      kinds,
      format,
      includeMeta,
      includeRaw,
      includeStructuredPayload,
      maxTextChars,
      maxPayloadChars,
    }) => {
      if (!params.credentials) {
        return { ok: false, errorCode: 'not_authenticated', errorMessage: 'not_authenticated' };
      }
      return await getSessionEvents({
        credentials: params.credentials,
        idOrPrefix: sessionId,
        ...(typeof limit === 'number' ? { limit } : {}),
        ...(cursor !== undefined ? { cursor } : {}),
        ...(direction ? { direction } : {}),
        ...(scope ? { scope } : {}),
        ...(sidechainId !== undefined ? { sidechainId } : {}),
        ...(roles ? { roles } : {}),
        ...(kinds ? { kinds } : {}),
        ...(format ? { format } : {}),
        ...(typeof includeMeta === 'boolean' ? { includeMeta } : {}),
        ...(typeof includeRaw === 'boolean' ? { includeRaw } : {}),
        ...(typeof includeStructuredPayload === 'boolean' ? { includeStructuredPayload } : {}),
        ...(typeof maxTextChars === 'number' ? { maxTextChars } : {}),
        ...(typeof maxPayloadChars === 'number' ? { maxPayloadChars } : {}),
      });
    },

	    sessionWaitIdle: async ({ sessionId, timeoutSeconds, signal }) => {
	      if (!params.credentials) {
	        return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
	      }
	      const normalizedTimeoutSeconds =
	        typeof timeoutSeconds === 'number' && Number.isFinite(timeoutSeconds) && timeoutSeconds > 0
	          ? Math.min(3600, timeoutSeconds)
	          : 300;
	      return await waitForSessionIdle({
	        credentials: params.credentials,
	        idOrPrefix: sessionId,
	        timeoutMs: Math.max(1, Math.floor(normalizedTimeoutSeconds * 1000)),
	        ...(signal ? { signal } : {}),
	      });
	    },

    sessionPermissionRemoteAction: async (args) => {
      const rejectUnavailable = (
        code: 'canceled' | 'mediationStateUnavailable' | 'ownerMachineUnavailable',
      ) => args.actionId === 'session.permission.remote.pending.list'
        ? { ok: false as const, errorCode: code, error: code }
        : args.actionId === 'session.permission.remote.grants.list'
          ? { ok: false as const, errorCode: code, error: code }
        : { status: 'rejected' as const, code };

      if (args.signal?.aborted) {
        return rejectUnavailable('canceled');
      }

      // The existing current-session binding is the only live owner lookup.
      // Do not fall back to the Action deps' construction session, a registry,
      // or a Session RPC: a remote decision must reach the exact active owner.
      const binding = resolveCurrentSessionCapabilityBinding(args.input.sessionId);
      if (!binding) {
        return rejectUnavailable('ownerMachineUnavailable');
      }
      const bindingIsStillCurrent = (): boolean => {
        if (args.signal?.aborted || binding.signal.aborted) return false;
        try {
          if (binding.isCurrent() !== true) return false;
        } catch {
          return false;
        }
        return resolveCurrentSessionCapabilityBinding(args.input.sessionId)?.scopeId === binding.scopeId;
      };
      if (!bindingIsStillCurrent()) {
        return rejectUnavailable('ownerMachineUnavailable');
      }

      const permissionHandler = binding.permissionHandler;
      if (!permissionHandler) {
        return rejectUnavailable('mediationStateUnavailable');
      }

      if (args.actionId === 'session.permission.remote.pending.list') {
        if (args.caller.kind !== 'plugin') {
          return rejectUnavailable('mediationStateUnavailable');
        }
        const list = permissionHandler.listMediatedPendingRequests;
        if (typeof list !== 'function') {
          return rejectUnavailable('mediationStateUnavailable');
        }
        const result = list.call(permissionHandler, {
          mediatorPluginId: args.caller.pluginId,
          sourceRef: args.input.sourceRef,
          sourceRevisionOrEpoch: args.input.sourceRevisionOrEpoch,
          ...('cursor' in args.input && args.input.cursor !== undefined
            ? { cursor: args.input.cursor }
            : {}),
        });
        if (args.signal?.aborted) {
          return rejectUnavailable('canceled');
        }
        return bindingIsStillCurrent()
          ? result
          : rejectUnavailable('ownerMachineUnavailable');
      }

      if (args.actionId === 'session.permission.remote.respond') {
        if (args.caller.kind !== 'plugin') {
          return rejectUnavailable('mediationStateUnavailable');
        }
        const contributionLocalId = args.caller.contributionLocalId;
        if (!contributionLocalId?.trim()) {
          return rejectUnavailable('mediationStateUnavailable');
        }
        const respond = permissionHandler.respondToMediatedPendingPermission;
        if (typeof respond !== 'function') {
          return rejectUnavailable('mediationStateUnavailable');
        }
        const result = await respond.call(permissionHandler, {
          sessionId: args.input.sessionId,
          turnId: args.input.turnId,
          requestId: args.input.requestId,
          sourceRef: args.input.sourceRef,
          sourceRevisionOrEpoch: args.input.sourceRevisionOrEpoch,
          idempotencyKey: args.input.idempotencyKey,
          actor: args.input.actor,
          decision: args.input.decision,
          scope: args.input.scope,
          mediator: {
            pluginId: args.caller.pluginId,
            contributionLocalId,
          },
          ...(args.signal ? { signal: args.signal } : {}),
        });
        if (args.signal?.aborted) {
          return rejectUnavailable('canceled');
        }
        return bindingIsStillCurrent()
          ? result
          : rejectUnavailable('ownerMachineUnavailable');
      }

      if (args.actionId === 'session.user_action.remote.answer') {
        if (args.caller.kind !== 'plugin') {
          return rejectUnavailable('mediationStateUnavailable');
        }
        const contributionLocalId = args.caller.contributionLocalId;
        if (!contributionLocalId?.trim()) {
          return rejectUnavailable('mediationStateUnavailable');
        }
        const answer = permissionHandler.respondToMediatedPendingUserAction;
        if (typeof answer !== 'function') {
          return rejectUnavailable('mediationStateUnavailable');
        }
        const result = await answer.call(permissionHandler, {
          sessionId: args.input.sessionId,
          turnId: args.input.turnId,
          requestId: args.input.requestId,
          sourceRef: args.input.sourceRef,
          sourceRevisionOrEpoch: args.input.sourceRevisionOrEpoch,
          answers: args.input.answers,
          mediator: {
            pluginId: args.caller.pluginId,
            contributionLocalId,
          },
          ...(args.signal ? { signal: args.signal } : {}),
        });
        if (args.signal?.aborted) {
          return rejectUnavailable('canceled');
        }
        return bindingIsStillCurrent()
          ? result
          : rejectUnavailable('ownerMachineUnavailable');
      }

      const viewer = args.caller.kind === 'plugin'
        ? { kind: 'mediatorPlugin' as const, pluginId: args.caller.pluginId }
        : args.caller.kind === 'host'
          ? { kind: 'host' as const }
          : null;
      if (!viewer) {
        return rejectUnavailable('mediationStateUnavailable');
      }

      if (args.actionId === 'session.permission.remote.grants.list') {
        const listGrants = permissionHandler.listMediatedPermissionGrants;
        if (typeof listGrants !== 'function') {
          return rejectUnavailable('mediationStateUnavailable');
        }
        const result = await listGrants.call(permissionHandler, {
          viewer,
          limit: args.input.limit,
          ...(args.input.cursor !== undefined ? { cursor: args.input.cursor } : {}),
          ...(args.signal ? { signal: args.signal } : {}),
        });
        if (args.signal?.aborted) {
          return rejectUnavailable('canceled');
        }
        if (!bindingIsStillCurrent()) {
          return rejectUnavailable('ownerMachineUnavailable');
        }
        return result ?? rejectUnavailable('mediationStateUnavailable');
      }

      const revoke = permissionHandler.revokeMediatedPermissionGrant;
      if (typeof revoke !== 'function') {
        return rejectUnavailable('mediationStateUnavailable');
      }
      const result = await revoke.call(permissionHandler, {
        turnId: args.input.turnId,
        requestId: args.input.requestId,
        grantId: args.input.grantId,
        caller: viewer,
        ...(args.signal ? { signal: args.signal } : {}),
      });
      if (args.signal?.aborted) {
        return rejectUnavailable('canceled');
      }
      return bindingIsStillCurrent()
        ? result
        : rejectUnavailable('ownerMachineUnavailable');
    },

    sessionPermissionRespond: async ({
      sessionId,
      context,
      decision,
      requestId,
      turnId,
      mode,
      reason,
      answers,
      allowedTools,
      updatedPermissions,
      execPolicyAmendment,
      signal,
    }) => {
      if (!params.credentials) {
        return { ok: false, errorCode: 'not_authenticated', errorMessage: 'not_authenticated' };
      }

      const reqId = String(requestId ?? '').trim();
      if (!reqId) {
        return { ok: false, errorCode: 'permission_request_not_found', errorMessage: 'permission_request_not_found', sessionId };
      }

      const externalRequest = context?.externalActionCredential !== undefined
        || context?.externalActionExecutionAuthorization !== undefined;
      const resolveAuthorizationHeaders = externalRequest && context
        ? (request: Readonly<{ method: string; path: string; body?: unknown }>) =>
            resolveServerRequestHeaders(context, 'session.permission.respond', request)
        : undefined;
      if (externalRequest && (!context || !params.externalActionMachineRequestPrivateKey
        || !params.externalActionMachineInstallationId
        || !resolveAuthorizationHeaders?.({ method: 'GET', path: '/v1/account/encryption/currentness' }))) {
        return { ok: false, errorCode: 'not_authenticated', errorMessage: 'not_authenticated', sessionId };
      }
      const transport = resolveAuthorizationHeaders
        ? await resolveSessionTransportContext({
            credentials: params.credentials,
            idOrPrefix: sessionId,
            resolveAuthorizationHeaders,
            ...(signal ? { signal } : {}),
          })
        : await resolveTransportForSession(sessionId, signal);
      if (!transport.ok) {
        return {
          ok: false,
          errorCode: transport.code,
          errorMessage: transport.code,
          ...(transport.candidates ? { candidates: transport.candidates } : {}),
        };
      }
      try {
        const result = await callSessionRpc({
          ...transport,
          token: params.credentials.token,
          sessionId: transport.sessionId,
          method: `${transport.sessionId}:session.permission.respond`,
          // A decision can await durable publication beyond the generic ACK budget.
          timeoutMs: null,
          ...(externalRequest && context && params.externalActionMachineRequestPrivateKey
            && params.externalActionMachineInstallationId ? { externalAction: {
              context, effectActionId: 'session.permission.respond',
              installationId: params.externalActionMachineInstallationId,
              privateKey: params.externalActionMachineRequestPrivateKey,
            } } : {}),
          request: buildSessionPermissionRespondRpcParamsV1({
            id: reqId,
            ...(typeof turnId === 'string' && turnId.trim().length > 0 ? { turnId: turnId.trim() } : {}),
            decision,
            ...(mode === undefined ? {} : { mode }),
            ...(reason === undefined ? {} : { reason }),
            ...(answers === undefined ? {} : { answers }),
            ...(Array.isArray(allowedTools) ? { allowedTools: [...allowedTools] } : {}),
            ...(typeof updatedPermissions !== 'undefined' ? { updatedPermissions } : {}),
            ...(typeof execPolicyAmendment !== 'undefined' ? { execPolicyAmendment } : {}),
          }),
          ...(signal ? { signal } : {}),
        });
        // The Session RPC acknowledges applied decisions with void; Actions require explicit success.
        return result ?? { ok: true };
      } catch (error) {
        return {
          ok: false,
          errorCode: readRpcErrorCode(error) ?? (readRpcRequestDisposition(error) === 'outcomeUnknown'
            ? RPC_ERROR_CODES.OUTCOME_UNKNOWN : 'permission_update_failed'),
          errorMessage: error instanceof Error ? error.message : 'permission_update_failed',
          sessionId: transport.sessionId,
        };
      }
    },
    sessionNeedsYouRaise: async ({ sessionId, input, context, signal }) => {
      const transport = await resolveTransportForSession(sessionId, signal);
      if (!transport.ok) return { ok: false, errorCode: transport.code, errorMessage: transport.code };
      try {
        return await callSessionActionRpc(transport, SESSION_RPC_METHODS.SESSION_NEEDS_YOU_RAISE, input, context);
      } catch (error) {
        const errorCode = readRpcErrorCode(error) ?? 'question_request_failed';
        return { ok: false, errorCode, errorMessage: error instanceof Error ? error.message : errorCode };
      }
    },
    sessionUserActionAnswer: async ({
      sessionId,
      context,
      requestId,
      disposition,
      answers,
      decision,
      reason,
      updatedPermissions,
      allowedTools,
      execPolicyAmendment,
      signal,
    }) => {
      if (!params.credentials) {
        return { ok: false, errorCode: 'not_authenticated', errorMessage: 'not_authenticated' };
      }

      const reqId = String(requestId ?? '').trim();
      if (!reqId) {
        return { ok: false, errorCode: 'permission_request_not_found', errorMessage: 'permission_request_not_found', sessionId };
      }

      const externalRequest = context?.externalActionCredential !== undefined
        || context?.externalActionExecutionAuthorization !== undefined;
      const resolveAuthorizationHeaders = externalRequest && context
        ? (request: Readonly<{ method: string; path: string; body?: unknown }>) =>
            resolveServerRequestHeaders(context, 'session.user_action.answer', request)
        : undefined;
      if (externalRequest && (!context || !params.externalActionMachineRequestPrivateKey
        || !params.externalActionMachineInstallationId
        || !resolveAuthorizationHeaders?.({ method: 'GET', path: '/v1/account/encryption/currentness' }))) {
        return { ok: false, errorCode: 'not_authenticated', errorMessage: 'not_authenticated', sessionId };
      }
      const transport = resolveAuthorizationHeaders
        ? await resolveSessionTransportContext({
            credentials: params.credentials,
            idOrPrefix: sessionId,
            resolveAuthorizationHeaders,
            ...(signal ? { signal } : {}),
          })
        : await resolveTransportForSession(sessionId, signal);
      if (!transport.ok) {
        return {
          ok: false,
          errorCode: transport.code,
          errorMessage: transport.code,
          ...(transport.candidates ? { candidates: transport.candidates } : {}),
        };
      }
      if (isKnownCompletedRequestId({
        ...transport,
        rawSession: transport.rawSession,
        requestId: reqId,
        kind: 'user_action',
      })) {
        return permissionRequestNotFoundResult(transport.sessionId);
      }
      const normalizedAnswers = Object.create(null) as Record<string, readonly string[]>;
      for (const entry of Array.isArray(answers) ? answers : []) {
        const question = String(entry?.question ?? '');
        if (question.trim().length > 0 && entry.values.length > 0) {
          normalizedAnswers[question] = [...entry.values];
        }
      }
      if (disposition !== 'pass_up' && !decision && Object.keys(normalizedAnswers).length === 0) {
        return { ok: false, errorCode: 'invalid_parameters', errorMessage: 'invalid_parameters', sessionId: transport.sessionId };
      }

      const legacyDecision =
        decision === 'reject'
          ? 'denied'
          : decision === 'request_changes'
            ? 'abort'
            : 'approved';
      try {
        const request = disposition === 'pass_up'
          ? SessionUserActionPassUpRpcParamsV1Schema.parse({ id: reqId, disposition,
              ...(reason ? { reason } : {}),
              ...(decision ? { decision } : {}),
              ...(Object.keys(normalizedAnswers).length ? { answers: normalizedAnswers } : {}),
              ...(updatedPermissions === undefined ? {} : { updatedPermissions }),
              ...(allowedTools === undefined ? {} : { allowedTools }),
              ...(execPolicyAmendment === undefined ? {} : { execPolicyAmendment }),
            })
          : buildSessionPermissionRespondRpcParamsV1({
              id: reqId,
              decision: legacyDecision,
              ...(Object.keys(normalizedAnswers).length > 0 ? { answers: normalizedAnswers } : {}),
              ...(typeof reason === 'string' && reason.trim().length > 0 ? { reason: reason.trim() } : {}),
              ...(typeof updatedPermissions !== 'undefined' ? { updatedPermissions } : {}),
              ...(Array.isArray(allowedTools) ? { allowedTools } : {}),
              ...(typeof execPolicyAmendment !== 'undefined' ? { execPolicyAmendment } : {}),
            });
        const resumed = await resumeInactiveSessionTransport({ transport,
          localId: context?.actionRequestId ?? `session.user_action.answer:${randomUUID()}`,
          effectActionId: 'session.user_action.answer', context, waitForReady: true,
          ...(signal ? { signal } : {}),
        });
        if (!resumed.ok) return { ok: false, errorCode: resumed.code, errorMessage: resumed.message, sessionId: transport.sessionId };
        const result = (context?.actionCaller?.kind === 'session' || context?.readSessionActionRpcOrigin)
          && context.authority !== 'present_user' && !externalRequest
          ? await callSessionActionRpc(transport, 'session.user_action.answer', request, context)
          : await callSessionRpc({
          ...transport,
          token: params.credentials.token,
          sessionId: transport.sessionId,
          method: `${transport.sessionId}:session.user_action.answer`,
          timeoutMs: null,
          ...(externalRequest && context && params.externalActionMachineRequestPrivateKey
            && params.externalActionMachineInstallationId ? { externalAction: {
              context, effectActionId: 'session.user_action.answer',
              installationId: params.externalActionMachineInstallationId,
              privateKey: params.externalActionMachineRequestPrivateKey,
            } } : {}),
          request,
          ...(signal ? { signal } : {}),
        });
        return result ?? { ok: true };
      } catch (error) {
        return {
          ok: false,
          errorCode: readRpcErrorCode(error) ?? (readRpcRequestDisposition(error) === 'outcomeUnknown'
            ? RPC_ERROR_CODES.OUTCOME_UNKNOWN : 'permission_update_failed'),
          errorMessage: error instanceof Error ? error.message : 'permission_update_failed',
          sessionId: transport.sessionId,
        };
      }
    },
    sessionModeSet: async ({ sessionId, modeId }) => {
      if (!params.credentials) {
        return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
      }

      const normalizedModeId = String(modeId ?? '').trim();
      const updatedAt = Date.now();
      const res = await setSessionMode({
        credentials: params.credentials,
        idOrPrefix: sessionId,
        modeId: normalizedModeId,
        updatedAt,
      });
      if (!res.ok) {
        return { ok: false, errorCode: res.code, error: res.code, ...(res.candidates ? { candidates: res.candidates } : {}) };
      }
      return { ok: true, sessionId: res.sessionId, modeId: normalizedModeId, updatedAt };
    },
    sessionBoardAction: widgetBoardDeps?.sessionBoardAction
      ?? (async () => ({ ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' })),
    ...(widgetBoardDeps?.sessionBoardPrepareItem ? { sessionBoardPrepareItem: widgetBoardDeps.sessionBoardPrepareItem } : {}),
    readAgentHtmlNetworkPolicy: async () => params.actionsSettingsProvider?.getAccountSettings?.()?.agentHtmlNetworkPolicy ?? 'ask',

    currentSessionPresentationApply: async ({ input, context, signal }) => {
      const sessionId = normalizeStringValue(context.defaultSessionId);
      if (!sessionId) {
        return { ok: false, errorCode: 'session_not_selected', error: 'session_not_selected' };
      }
      const operationId = normalizeStringValue(context.actionRequestId);
      if (!operationId) {
        return { ok: false, errorCode: 'action_request_id_required', error: 'action_request_id_required' };
      }
      const presentation = resolveCurrentSessionUiBinding(sessionId)?.presentation;
      if (!presentation) {
        return {
          ok: false,
          errorCode: 'current_session_presentation_unavailable',
          error: 'current_session_presentation_unavailable',
        };
      }

      const result = await presentation.present(
        { operationId, intent: input.intent },
        signal ? { signal } : undefined,
      );
      return projectCurrentSessionPresentationActionResult(result);
    },

    discussionAction: params.credentials
      ? createDiscussionActionDeps({
          credentials: params.credentials,
          ...(params.postAgentDiscussionMessage ? { postAgentMessage: params.postAgentDiscussionMessage } : {}),
          ...(params.resolveServerFeaturesSnapshot
            ? { resolveServerFeaturesSnapshot: params.resolveServerFeaturesSnapshot }
            : {}),
          ...exactHome,
          ...(params.serverIdentityId ? { serverIdentityId: params.serverIdentityId } : {}),
          ...(params.externalActionMachineRequestPrivateKey
            ? { externalActionMachineRequestPrivateKey: params.externalActionMachineRequestPrivateKey }
            : {}),
          ...(params.externalActionMachineInstallationId
            ? { externalActionMachineInstallationId: params.externalActionMachineInstallationId }
            : {}),
        }).discussionAction
      : async () => ({ ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' }),

    sessionList,
    sessionFollowPreview,

    resolveSessionReference: async ({ sessionId, context, actionId, signal }) => {
      const operationSignal = signal ?? context.signal;
      operationSignal?.throwIfAborted();
      if (!sessionId || !actionId || await projectHomeAdmission(undefined, context)) return { kind: 'incomplete' };
      try {
        const target = await resolveTransportForSession(sessionId, operationSignal, { context, actionId });
        operationSignal?.throwIfAborted();
        if (target.ok) return { kind: 'unique', address: { serverId: actionHomeId, sessionId: target.sessionId } };
        if (target.code === 'session_not_found') return { kind: 'none' };
        if (target.code === 'session_id_ambiguous') return { kind: 'ambiguous',
          candidates: (target.candidates ?? []).map(sessionId => ({ serverId: actionHomeId, sessionId })) };
        return { kind: 'incomplete' };
      } catch {
        operationSignal?.throwIfAborted();
        return { kind: 'incomplete' };
      }
    },

    readSessionManager: async ({ address, context, actionId, signal }) => {
      const operationSignal = signal ?? context.signal;
      operationSignal?.throwIfAborted();
      if (await projectHomeAdmission(address.serverId, context)) return { kind: 'unavailable' };
      try {
        const target = await resolveTransportForSession(address.sessionId, operationSignal, { context, actionId });
        operationSignal?.throwIfAborted();
        if (!target.ok || target.sessionId !== address.sessionId) return { kind: 'unavailable' };
        const managerSessionId = readSessionManagerSessionIdV1(target.rawSession);
        return { kind: 'manager', address: managerSessionId ? { serverId: address.serverId, sessionId: managerSessionId } : null };
      } catch {
        operationSignal?.throwIfAborted();
        return { kind: 'unavailable' };
      }
    },

    sessionAwarenessWait: async ({ context, input, options, readAwareness }) => {
      if (input.target.kind !== 'session') return { disposition: 'unsupported_condition' };
      if (!params.credentials) return { disposition: 'permission_denied' };
      if (!params.serverId || input.target.serverId !== params.serverId) return { disposition: 'permission_denied' };
      const sessionId = input.target.sessionId;
      return waitForSessionAwarenessV1({
        condition: input.condition, deadlineMs: options.deadlineMs,
        ...(options.signal ? { signal: options.signal } : {}),
        ...(options.onSnapshot ? { onSnapshot: options.onSnapshot } : {}),
        read: async () => {
          const raw = await readAwareness();
          const parsed = SessionAwarenessProjectionV1Schema.safeParse(raw);
          if (!parsed.success) {
            if (raw && typeof raw === 'object' && 'ok' in raw && raw.ok === false) throw raw;
            throw new Error('session_awareness_wait_result_invalid');
          }
          if (input.condition.kind !== 'turn_terminal') return { awareness: parsed.data };
          const turns = await fetchSessionTurnsProjection({ token: params.token, sessionId,
            ...(options.signal ? { signal: options.signal } : {}),
            resolveAuthorizationHeaders: (request) => resolveServerRequestHeaders(context, 'session.activity.get', request),
          });
          if (!turns) return null;
          const turn = turns.turns.find((entry) => input.condition.kind === 'turn_terminal' && entry.turnId === input.condition.turnId);
          return { awareness: parsed.data, ...(turn ? { turn } : {}) };
        },
        open: () => openSessionEventSource({ token: params.token, sessionId, scope: 'user' }),
      });
    },

    sessionActivityGet: async ({ context, sessionId, view, windowSeconds, signal }) => {
      if (!params.credentials) {
        return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
      }
      if (windowSeconds !== undefined) {
        return {
          ok: false,
          errorCode: 'unsupported_action',
          error: 'unsupported_action:session.activity.get.windowSeconds',
        };
      }
      const resolveAuthorizationHeaders = (request: Readonly<{
        method: 'GET'; path: string;
      }>) => resolveServerRequestHeaders(context, 'session.activity.get', request);
      const currentnessAuthorizationHeaders = resolveAuthorizationHeaders({
        method: 'GET', path: '/v1/account/encryption/currentness',
      });
      if (!currentnessAuthorizationHeaders) {
        return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
      }
      signal?.throwIfAborted();
      const serverFeaturesSnapshot = await readServerFeaturesSnapshot();
      signal?.throwIfAborted();
      const session = await fetchSessionByIdCompat({
        token: params.credentials.token,
        sessionId,
        resolveAuthorizationHeaders,
        ...(serverFeaturesSnapshot ? { serverFeaturesSnapshot } : {}),
        signal,
      });
      if (!session) {
        return { ok: false, errorCode: 'session_not_found', error: 'session_not_found', sessionId };
      }
      const currentness = await fetchAccountEncryptionCurrentness({
        token: params.credentials.token,
        authorizationHeaders: currentnessAuthorizationHeaders,
        signal,
      });
      signal?.throwIfAborted();
      const awarenessInput = buildCliSessionAwarenessInputV1({
        credentials: params.credentials,
        accountEncryption: currentness,
        row: session,
        nowMs: Date.now(),
      });
      const awareness = projectSessionAwarenessV1(awarenessInput);
      // The requested representation, from the one projector this Action already derives its
      // released booleans from. Omission keeps the compatibility digest below.
      if (view === SESSION_LIST_AWARENESS_VIEW_V1) return awareness;
      return {
        ...projectSessionActivityCompatibilityV1({
          awareness,
          facts: {
            presence: awarenessInput.runtime.presence === 'unknown' ? null : awarenessInput.runtime.presence,
            active: session.active,
            thinking: session.thinking === true,
            updatedAt: session.updatedAt,
            // No `permissionRequestIds`: this path reads a V2 row, which carries pending counts
            // but no request identities. The released CLI/daemon response never had the field.
          },
        }),
        // cli-v0.2.11 and the current 0.2 daemon expose these ancillary raw counts.
        // Keep that response seam while status meaning comes only from awareness.
        pendingCount: session.pendingCount ?? 0,
        pendingPermissionRequestCount: session.pendingPermissionRequestCount ?? 0,
        pendingUserActionRequestCount: session.pendingUserActionRequestCount ?? 0,
      };
    },

    sessionRecentMessagesGet: async ({ sessionId, limit, cursor, includeUser, includeAssistant, maxCharsPerMessage }) => {
      if (!params.credentials) {
        return { ok: false, errorCode: 'not_authenticated', errorMessage: 'not_authenticated' };
      }
      return await getSessionTranscript({
        credentials: params.credentials,
        idOrPrefix: sessionId,
        ...(typeof limit === 'number' ? { limit } : {}),
        ...(Object.prototype.hasOwnProperty.call({ cursor }, 'cursor') ? { cursor: cursor ?? null } : {}),
        roles: [
          ...(includeUser === false ? [] : ['user' as const]),
          ...(includeAssistant === false ? [] : ['assistant' as const]),
        ],
        ...(Object.prototype.hasOwnProperty.call({ maxCharsPerMessage }, 'maxCharsPerMessage') ? { maxCharsPerMessage: maxCharsPerMessage ?? null } : {}),
      });
    },

    subagentsList: async (args) => {
      return await hostSubagentStore.list(args);
    },

    subagentsGet: async (args) => {
      return await hostSubagentStore.get(args);
    },

    subagentsWatch: async (args) => {
      try {
        return await new Promise((resolve, reject) => {
          try {
            let subscription: Readonly<{ unsubscribe(): void }> | null = null;
            let unsubscribeAfterRegister = false;
            subscription = hostSubagentStore.watch(args, (event) => {
              if (event.kind !== 'snapshot') return;
              resolve({
                kind: 'snapshot',
                subagents: event.subagents ?? [],
              });
              if (subscription) {
                subscription.unsubscribe();
              } else {
                unsubscribeAfterRegister = true;
              }
            });
            if (unsubscribeAfterRegister) {
              subscription.unsubscribe();
            }
          } catch (error) {
            reject(error);
          }
        });
      } catch (error) {
        return serializeHostSubagentStoreError(error);
      }
    },

    subagentsUpsert: async ({ input, caller }) => {
      try {
        return await hostSubagentStore.upsert({
          actor: deriveHostSubagentActor(caller),
          input,
        });
      } catch (error) {
        return serializeHostSubagentStoreError(error);
      }
    },

    subagentsUpdateStatus: async ({ input, caller }) => {
      try {
        return await hostSubagentStore.updateStatus({
          ...input,
          actor: deriveHostSubagentActor(caller),
        });
      } catch (error) {
        return serializeHostSubagentStoreError(error);
      }
    },

    subagentsComplete: async ({ input, caller }) => {
      try {
        return await hostSubagentStore.complete({
          ...input,
          actor: deriveHostSubagentActor(caller),
        });
      } catch (error) {
        return serializeHostSubagentStoreError(error);
      }
    },

    pluginsDevLoopAction: async ({ actionId, input, context }) => {
      const marketplaceInstall = actionId === 'plugins.install' && input !== null && typeof input === 'object'
        && 'source' in input && input.source !== null && typeof input.source === 'object'
        && 'kind' in input.source && input.source.kind === 'marketplace';
      if (marketplaceInstall) {
        if (!params.credentials || !approvalsStore) return notSupported();
        const requesterAccountId = context.externalActionCredential?.accountId
          ?? context.externalActionExecutionAuthorization?.binding.accountId;
        if (requesterAccountId && requesterAccountId !== readAccountIdFromToken(params.credentials.token)) {
          // Machine placement grants no custody of a foreign requester's private
          // source catalog. The incumbent Action admission failure stays explicit.
          return { ok: false, errorCode: 'approval_context_unavailable', error: 'approval_context_unavailable' };
        }
      }
      const operation = async () => {
        const registry = marketplaceInstall && params.credentials && approvalsStore
          ? createCliRegistryHostV1({ credentials: params.credentials,
            port: approvalsStore.promptLibraryStore.organization, signal: context.signal,
            operationContext: params.savedSecretOperationContext }) : null;
        const approvedInstallReview = actionId === 'plugins.install' && context.presentUserApproval && approvalsStore
          ? readPluginInstallApprovalPendingReview(readRecord(await approvalsStore.approvalsGet({
              artifactId: context.presentUserApproval.artifactId,
              serverId: null,
            })).preview)
          : null;
        if (actionId === 'plugins.install' && context.presentUserApproval && !approvedInstallReview) {
          return { ok: false, errorCode: 'approval_context_unavailable', error: 'approval_context_unavailable' };
        }
        return await executePluginDevLoopAction({ actionId, input,
          happyHomeDir: params.happyHomeDir,
          workspaceRoot: actionId === 'plugins.install'
            ? await resolvePluginInstallWorkspaceRoot(input, context.signal)
            : actionId === 'plugins.scaffold'
              ? await resolveCurrentSessionValue('path', context.signal) ?? undefined
              : undefined,
          context,
        }, {
          ...pluginChangeServices,
          ...(actionId === 'plugins.install' ? { installEffectAdmitted: true as const } : {}),
          ...(registry ? { marketplaceIndexService: createMarketplaceIndexService({ happyHomeDir: params.happyHomeDir,
            readRegistrySources: registry.readSources }) } : {}),
          ...(approvedInstallReview ? { approvedInstallReview } : {}),
        });
      };
      return params.serverHttpBaseUrl ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, operation) : operation();
    },

    pluginSettingsAdministrationAction: Object.assign(async ({ actionId, input, context }: Parameters<NonNullable<ActionExecutorDeps['pluginSettingsAdministrationAction']>>[0]) => (
      await executePluginSettingsAdministrationAction({
        actionId,
        input,
        happyHomeDir: params.happyHomeDir,
        ...(context.actionCaller ? { actionCaller: context.actionCaller } : {}),
        ...(context.signal ? { signal: context.signal } : {}),
      })
    ), {
      admitInput: async ({ actionId, input, context }: Parameters<NonNullable<ActionExecutorDeps['pluginSettingsAdministrationAction']>>[0]) => (
        await executePluginSettingsAdministrationAction.admitInput({
          actionId,
          input,
          happyHomeDir: params.happyHomeDir,
          ...(context.actionCaller ? { actionCaller: context.actionCaller } : {}),
          ...(context.signal ? { signal: context.signal } : {}),
        })
      ),
    }),

    pluginPermissionGrantAction: async (args) => pluginPermissionGrantAction
      ? await pluginPermissionGrantAction(args)
      : { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' },

    pluginWebhookAction: async (args) => pluginWebhookAction
      ? await pluginWebhookAction(args)
      : { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' },

    ...(automationEventAction ? {
      automationEventAction: async (args) => await automationEventAction(args),
    } : {}),

    workflowAction: async (args) => {
      if (!workflowAction) {
        return { ok: false, errorCode: 'target_unavailable', error: 'target_unavailable' };
      }
      const startedAtMs = Date.now();
      try {
        // A Machine/Account host's bound id is not a Workflow origin Session.
        // Keep Session identity explicit at ingress; only enrich Account identity.
        let context = accountCallerContext(args.context);
        const isTrustedCallingSession = normalizeStringValue(args.context.defaultSessionId) === normalizeStringValue(params.sessionId);
        if (args.actionId === 'workflow.run.start'
          && isTrustedCallingSession
          && !(context.externalActionTarget?.kind === 'machine' && context.externalActionTarget.project)) {
          // Signed custody must already contain the exact workspace target.
          if (context.externalActionExecutionAuthorization) return actionStartTargetUnavailableV1(context,
            'workflow_owner', 'target_binding_mismatch');
          const target = await resolveCliActionCallerWorkflowTarget({ ...callerSessionResolution(context),
            // Bound Workflow ingress needs only the live workspace, not an
            // Account metadata read before Workflow availability is decided.
            readBoundSession: async () => ({ metadata: null, workDepth: undefined, backendTarget: undefined,
              machineId: await resolveCurrentSessionValue('machineId', context.signal),
              directory: await resolveCurrentSessionValue('path', context.signal) }),
            ...(context.externalActionTarget ? { target: context.externalActionTarget } : {}) });
          if (!target) return actionStartTargetUnavailableV1(context, 'workflow_owner', 'caller_workspace_unavailable');
          context = {
            ...context,
            externalActionTarget: target,
          };
        }
        return await measureActionStartPhaseV1(context, 'workflow_owner',
          () => workflowAction({ ...args, context } as Parameters<typeof workflowAction>[0]));
      } catch (error) {
        return normalizeWorkflowActionThrownError(error, {
          operation: args.actionId, durationMs: Date.now() - startedAtMs,
          emit: diagnostic => logger.infoFile(JSON.stringify(diagnostic)),
        });
      }
    },

    automationConversationAction: async (args) => automationConversationAction
      ? await automationConversationAction(args)
      : { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' },

    pluginSessionHookManagementAction: async (args) => {
      const hookManagementAction =
        params.externalSessionPluginAdmissionOwner?.hookManagementAction;
      if (!hookManagementAction) {
        return {
          ok: false,
          errorCode: 'unsupported_action',
          error: `unsupported_action:${args.actionId}`,
        };
      }
      const execution = await hookManagementAction(
        args.actionId,
        args.input,
        {
          surface: 'action',
          ...(args.signal ? { signal: args.signal } : {}),
        },
      );
      return execution.ok ? execution.result : execution;
    },

    resolveApiTokenGrantSessionMachineId: async ({ actionId, sessionId, context }) => {
      if (!params.credentials || !context.externalActionCredential) return null;
      const transport = await resolveSessionTransportContext({
        credentials: params.credentials,
        idOrPrefix: sessionId,
        resolveAuthorizationHeaders: request => resolveServerRequestHeaders(context, actionId, request),
        ...(context.signal ? { signal: context.signal } : {}),
      });
      if (!transport.ok || transport.sessionId !== sessionId || transport.rawSession.id !== sessionId) return null;
      return readSessionOwnerLocality({ metadata: readTransportSessionOwnerMetadata(transport),
        rawSession: transport.rawSession })?.machineId ?? null;
    },

    hostExternalSessionAction: params.credentials ? createHostExternalSessionActionTransport({
      credentials: params.credentials,
      serverId: params.serverId ?? configuration.activeServerId,
      serverHttpBaseUrl: params.serverHttpBaseUrl ?? resolveServerHttpBaseUrl(),
      resolveSessionMachineId: async (sessionId, signal) => {
        const transport = await resolveTransportForSession(sessionId, signal);
        return transport.ok ? normalizeStringValue(readTransportSessionOwnerMetadata(transport)?.machineId) : null;
      },
    }) : undefined,

    externalSessionAction: async (args) => params.credentials
      ? await executePluginExternalSessionAction(
          { ...args, credentials: params.credentials },
          params.externalSessionPluginAdmissionOwner?.materializeStart
            ? {
                materializeStart:
                  params.externalSessionPluginAdmissionOwner.materializeStart,
              }
            : {},
        )
      : { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' },

    managedMachineReferences,
    machineEnvironmentApply: async ({ input, context, signal }) => {
      if (!params.credentials && params.machineActionDirectTargetTransport?.machineId !== input.machineId) {
        return { ok: false, errorCode: 'not_authenticated', error: 'not_authenticated' };
      }
      return await callMachineAction({ machineId: input.machineId, serverId: context.serverId ?? params.serverId,
        method: 'machines.environment.apply', request: input, context, effectActionId: 'machines.environment.apply',
        authority: context.authority, exactMachine: true, timeoutMs: null, ...(signal ? { signal } : {}) });
    },
    buildApprovalPreview: async ({ actionId, input, context, defaultPreview, machineReferences }) => {
      if (actionId === 'machines.managed.delete') {
        const references = machineReferences ?? await managedMachineReferences({ input: ManagedDeleteInputV1Schema.parse(input),
          context, signal: context.signal });
        return { ...defaultPreview, machineReferences: references };
      }
      if (actionId === 'session.spawn_new' && params.requesterSessionBootstrap
        && await params.requesterSessionBootstrap.isCurrent()) {
        const bootstrap = params.requesterSessionBootstrap;
        const parsed = SessionSpawnNewInputV2Schema.safeParse(input);
        if (parsed.success && parsed.data.executionTarget.serverId === bootstrap.attribution.serverId
          && parsed.data.executionTarget.machineId === bootstrap.attribution.machineId) {
          return { ...defaultPreview, requesterCredentialDisclosure: projectRequesterSessionCredentialDisclosure({
            disposition: 'ordinary_requester', accountId: bootstrap.attribution.accountId,
            machineId: bootstrap.attribution.machineId,
          }) };
        }
      }
      if (actionId === 'plugins.install') {
        const installInput = readRecord(input);
        const requestedSource = readRecord(installInput.source);
        const developmentPathInstall = installInput.dev === true && installInput.dryRun !== true
          && installInput.kind !== 'archive' && installInput.kind !== 'npm'
          && requestedSource.kind !== 'marketplace' && requestedSource.kind !== 'installed';
        // Development preparation and its retained daemon review never consult
        // Session-relative trust policy, so avoid a Session metadata round trip.
        const workspaceRoot = developmentPathInstall
          ? undefined
          : await resolvePluginInstallWorkspaceRoot(input, context.signal);
        const marketplaceInstall = input !== null && typeof input === 'object'
          && 'source' in input && input.source !== null && typeof input.source === 'object'
          && 'kind' in input.source && input.source.kind === 'marketplace';
        const registry = marketplaceInstall && params.credentials && approvalsStore
          ? createCliRegistryHostV1({ credentials: params.credentials,
            port: approvalsStore.promptLibraryStore.organization, signal: context.signal,
            operationContext: params.savedSecretOperationContext })
          : null;
        const evaluation = await executePluginDevLoopAction({
          actionId,
          input,
          happyHomeDir: params.happyHomeDir,
          workspaceRoot,
          context,
        }, {
          ...pluginInstallApprovalChangeServices,
          ...(registry ? { marketplaceIndexService: createMarketplaceIndexService({
            happyHomeDir: params.happyHomeDir,
            readRegistrySources: registry.readSources,
          }) } : {}),
        });
        const daemonEvaluation = readPluginInstallApprovalPendingReview({
          pluginInstall: { pendingReview: readRecord(evaluation).pendingReview },
        });
        if (!daemonEvaluation && installInput.dryRun !== true) {
          const result = readRecord(evaluation);
          const change = readRecord(result.change);
          const diagnostic = readRecord(Array.isArray(result.diagnostics) ? result.diagnostics[0] : null);
          const errorCode = normalizeStringValue(result.errorCode) ?? normalizeStringValue(change.code)
            ?? normalizeStringValue(diagnostic.code) ?? 'approval_context_unavailable';
          return { ok: false, errorCode,
            error: normalizeStringValue(result.error) ?? normalizeStringValue(diagnostic.message) ?? errorCode };
        }
        return await buildPluginInstallApprovalPreview({
          input,
          defaultPreview,
          workspaceRoot,
          ...(daemonEvaluation ? { daemonEvaluation } : {}),
        });
      }
      return defaultPreview;
    },

    settingsDeclarationAction: createCliSettingsDeclarationAction({ credentials: params.credentials,
      serverId: params.serverId ?? configuration.activeServerId,
      serverHttpBaseUrl: params.serverHttpBaseUrl, isCredentialCurrent: params.isCredentialCurrent,
      readMachineAgentProjection: async (machineId, context) => {
        const readProjection = async () => {
          let raw: unknown;
          try {
            raw = await callMachineAction({ machineId, serverId: params.serverId ?? configuration.activeServerId,
              method: RPC_METHODS.DAEMON_MERGED_CONTRIBUTION_REGISTRY_PROJECTION_DESCRIBE,
              request: { machineId, selection: 'agents' }, exactMachine: true,
              context, authority: context.authority, ...(context.signal ? { signal: context.signal } : {}),
            });
          } catch {
            context.signal?.throwIfAborted();
            return null;
          }
          const response = DaemonContributionRegistryProjectionDescribeResponseSchema.safeParse(raw);
          return response.success ? response.data.projection : null;
        };
        return await (params.serverHttpBaseUrl ? runWithServerHttpBaseUrl(params.serverHttpBaseUrl, readProjection) : readProjection());
      } }),
    resetGlobalVoiceAgent: () => {},
  };
  return actionDeps;
}
