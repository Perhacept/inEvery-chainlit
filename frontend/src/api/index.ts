import getRouterBasename from '@/lib/router';
import { toast } from 'sonner';

import {
  ChainlitAPI,
  ClientError,
  IPageInfo,
  IPagination,
  IThread,
  IThreadFilters
} from '@chainlit/react-client';

const devServer =
  (import.meta.env.VITE_API_URL || 'http://localhost:8000') +
  getRouterBasename();
const url = import.meta.env.DEV
  ? devServer
  : window.origin + getRouterBasename();
const serverUrl = new URL(url);

const httpEndpoint = serverUrl.toString();

const on401 = () => {
  if (window.location.pathname !== getRouterBasename() + '/login') {
    // The credentials aren't correct, remove the token and redirect to login
    window.location.href = getRouterBasename() + '/login';
  }
};

const onError = (error: ClientError) => {
  toast.error(error.toString());
};

export type InEverySceneType =
  | 'code'
  | 'notebook'
  | 'video-generate'
  | '3d-art-generate'
  | 'writing';

export interface InEveryProject {
  id: string;
  threadId: string;
  name: string;
  scene: InEverySceneType;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  userIdentifier?: string;
}

export interface CreateInEveryProjectPayload {
  name: string;
  scene: InEverySceneType;
  config?: Record<string, unknown>;
}

export interface UpdateInEveryProjectPayload {
  name?: string;
  scene?: InEverySceneType;
  config?: Record<string, unknown>;
}

export type InEveryMcpTransport =
  | 'stdio'
  | 'sse'
  | 'streamable-http'
  | 'streamable_http'
  | string;

export interface InEveryProjectMcpServerConfig {
  enabled?: boolean;
  transport?: InEveryMcpTransport;
  type?: InEveryMcpTransport;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  url?: string;
  endpoint?: string;
  headers?: Record<string, string>;
  timeout?: number;
  sseReadTimeout?: number;
  sse_read_timeout?: number;
  terminateOnClose?: boolean;
  terminate_on_close?: boolean;
  [key: string]: unknown;
}

export interface InEveryProjectMcpConfig {
  servers?: Record<string, InEveryProjectMcpServerConfig>;
  mcpServers?: Record<string, InEveryProjectMcpServerConfig>;
  [key: string]: unknown;
}

export interface InEveryProjectToolsConfig {
  enabled?: string[];
  enabledTools?: string[];
  disabled?: string[];
  disabledTools?: string[];
  mcp?: InEveryProjectMcpConfig;
  [key: string]: unknown;
}

export interface InEveryHarnessSettings {
  permission_mode?: 'default' | 'bypass' | string;
  error_max_turns: number;
  error_max_budget_usd: number | null;
  hooks_enabled: boolean;
  mcp_enabled: boolean;
  delete_guard_enabled: boolean;
  language: 'browser' | 'en-US' | 'zh-CN' | string;
  [key: string]: unknown;
}

export interface InEveryHarnessSettingsResponse {
  data: InEveryHarnessSettings;
  userEnv: Record<string, string>;
  path: string;
  defaults: InEveryHarnessSettings;
}

export interface InEveryToolDefinition {
  name: string;
  aliases: string[];
  description: string;
  category: string;
  enabled: boolean;
  deferred: boolean;
  readOnly: boolean;
  destructive: boolean;
  concurrencySafe: boolean;
  searchHint: string;
  schema: Record<string, unknown>;
}

export interface InEveryToolDebugResponse {
  dryRun: boolean;
  tool: InEveryToolDefinition;
  input: Record<string, unknown>;
  validatedInput?: Record<string, unknown>;
  result?: {
    toolCallId: string;
    name: string;
    content: string;
    isError: boolean;
    metadata: Record<string, unknown>;
    newMessages: unknown[];
  };
  workspace?: string;
  error?: string;
  errorType?: string;
}

function getWorkspaceProjectId() {
  const match = window.location.pathname.match(/\/workspace\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

class ExtendedChainlitAPI extends ChainlitAPI {
  async listThreads(
    pagination: IPagination,
    filter: IThreadFilters
  ): Promise<{
    pageInfo: IPageInfo;
    data: IThread[];
  }> {
    const projectId = getWorkspaceProjectId();
    const payload: {
      pagination: IPagination;
      filter: IThreadFilters;
      projectId?: string;
    } = { pagination, filter };

    if (projectId) {
      payload.projectId = projectId;
    }

    const res = await this.post(`/project/threads`, payload);

    return res.json();
  }

  async listInEveryProjects(): Promise<InEveryProject[]> {
    const res = await this.get(`/inevery/projects`);
    const payload = await res.json();
    return payload.data || [];
  }

  async createInEveryProject(
    payload: CreateInEveryProjectPayload
  ): Promise<InEveryProject> {
    const res = await this.post(`/inevery/projects`, payload);
    return res.json();
  }

  async getInEveryProject(projectId: string): Promise<InEveryProject> {
    const res = await this.get(`/inevery/projects/${projectId}`);
    return res.json();
  }

  async updateInEveryProject(
    projectId: string,
    payload: UpdateInEveryProjectPayload
  ): Promise<InEveryProject> {
    const res = await this.put(`/inevery/projects/${projectId}`, payload);
    return res.json();
  }

  async getInEverySettings(): Promise<InEveryHarnessSettingsResponse> {
    const res = await this.get(`/inevery/settings`);
    return res.json();
  }

  async updateInEverySettings(
    payload: Partial<InEveryHarnessSettings>
  ): Promise<InEveryHarnessSettingsResponse> {
    const res = await this.put(`/inevery/settings`, payload);
    return res.json();
  }

  async listInEveryTools(language?: string): Promise<InEveryToolDefinition[]> {
    const query = language ? `?language=${encodeURIComponent(language)}` : '';
    const res = await this.get(`/inevery/tools${query}`);
    const payload = await res.json();
    return payload.data || [];
  }

  async debugInEveryTool(payload: {
    toolName: string;
    arguments: Record<string, unknown>;
    projectId?: string;
    sceneType?: InEverySceneType;
    language?: string;
    dryRun?: boolean;
  }): Promise<InEveryToolDebugResponse> {
    const res = await this.post(`/inevery/tools/debug`, payload);
    return res.json();
  }

  async shareThread(
    threadId: string,
    isShared: boolean
  ): Promise<{ success: boolean }> {
    const res = await this.put(`/project/thread/share`, {
      threadId,
      isShared
    });
    return res.json();
  }

  connectStreamableHttpMCP(
    sessionId: string,
    name: string,
    url: string,
    headers?: Record<string, string>
  ) {
    // Assumes the backend expects { clientType, name, url }
    return fetch(
      new URL(
        'mcp',
        this.httpEndpoint.endsWith('/')
          ? this.httpEndpoint
          : `${this.httpEndpoint}/`
      ),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionId ? { 'x-session-id': sessionId } : {})
        },
        body: JSON.stringify({
          clientType: 'streamable-http',
          name,
          url,
          sessionId,
          ...(headers ? { headers } : {})
        })
      }
    ).then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to connect MCP');
      }
      return { success: true, mcp: data.mcp };
    });
  }
}

export const apiClient = new ExtendedChainlitAPI(
  httpEndpoint,
  'webapp',
  {}, // Optional - additionalQueryParams property.
  on401,
  onError
);
