import type {
  AgentApp,
  ClientApp,
  ParamsParser,
  PromptResponse,
  ReadTextFileRequest,
  ReadTextFileResponse,
  RequestPermissionRequest,
  RequestPermissionResponse,
  SessionNotification,
  Stream,
  WriteTextFileRequest,
  WriteTextFileResponse,
} from '@agentclientprotocol/sdk';
import { isAcpRequestError, requireLoadedAcpSdk } from './acpSdk';
import type { AcpPlanProjection, NormalizedAcpPlanSnapshot } from '../plans';
import type { AcpToolCallTracker } from '../updates/toolCalls/AcpToolCallTracker';

export type AcpClientTransport = Stream | AgentApp;

export type AcpClientConnectionHandlers = Readonly<{
  requestPermission: (
    params: RequestPermissionRequest,
  ) => RequestPermissionResponse | Promise<RequestPermissionResponse>;
  sessionUpdate: (params: SessionNotification) => void | Promise<void>;
  readTextFile?: (params: ReadTextFileRequest) => ReadTextFileResponse | Promise<ReadTextFileResponse>;
  writeTextFile?: (params: WriteTextFileRequest) => WriteTextFileResponse | Promise<WriteTextFileResponse>;
}>;

export type AcpExtensionHandlerContext = Readonly<{
  method: string;
  sessionId: string | null;
  signal: AbortSignal;
  agentName: string;
  turnId?: string;
  plans?: Pick<AcpPlanProjection, 'project'>;
  toolCalls?: Pick<AcpToolCallTracker, 'enrich'>;
  promptCompletion?: Readonly<{
    settle: (params: Readonly<{
      correlationId: string;
      outcome:
        | Readonly<{ kind: 'completed'; response: PromptResponse }>
        | Readonly<{ kind: 'failed'; error: Error }>;
    }>) => boolean;
  }>;
}>;

export type AcpExtensionContextFactory = (
  method: string,
  sdkSignal: AbortSignal,
) => AcpExtensionHandlerContext;

export type AcpExtensionRegistration = Readonly<{
  kind: 'request' | 'notification';
  method: string;
  register: (app: ClientApp, createContext: AcpExtensionContextFactory) => void;
}>;

function parseExtensionParams<Params>(parser: ParamsParser<Params>, value: unknown): Params {
  try {
    return typeof parser === 'function' ? parser(value) : parser.parse(value);
  } catch (error) {
    if (isAcpRequestError(error)) {
      throw error;
    }
    throw requireLoadedAcpSdk().RequestError.invalidParams(
      { details: 'Extension parameters failed validation' },
    );
  }
}

function wrapExtensionParamsParser<Params>(parser: ParamsParser<Params>): ParamsParser<Params> {
  return { parse: (value) => parseExtensionParams(parser, value) };
}

export function defineAcpExtensionRequest<Params, Response extends Record<string, unknown>>(definition: Readonly<{
  method: string;
  params: ParamsParser<Params>;
  handler: (
    params: Params,
    context: AcpExtensionHandlerContext,
  ) => Response | Promise<Response>;
}>): AcpExtensionRegistration {
  return {
    kind: 'request',
    method: definition.method,
    register: (app, createContext) => {
      app.onRequest(definition.method, wrapExtensionParamsParser(definition.params), (context) => (
        definition.handler(
          context.params,
          createContext(definition.method, context.signal),
        )
      ));
    },
  };
}

export function defineAcpExtensionNotification<Params>(definition: Readonly<{
  method: string;
  params: ParamsParser<Params>;
  handler: (
    params: Params,
    context: AcpExtensionHandlerContext,
  ) => void | Promise<void>;
}>): AcpExtensionRegistration {
  return {
    kind: 'notification',
    method: definition.method,
    register: (app, createContext) => {
      app.onNotification(definition.method, wrapExtensionParamsParser(definition.params), (context) => (
        definition.handler(
          context.params,
          createContext(definition.method, context.signal),
        )
      ));
    },
  };
}

export type AcpClientConnectionOptions = Readonly<{
  name: string;
  transport: AcpClientTransport;
  handlers: AcpClientConnectionHandlers;
  extensions?: ReadonlyArray<AcpExtensionRegistration>;
  createExtensionContext?: AcpExtensionContextFactory;
  /** Provider-owned fixed authentication setup category; arbitrary error data is never retained. */
  isAuthenticationSetupFailure?: (failure: Readonly<{ code: unknown; data: unknown }>) => boolean;
}>;
