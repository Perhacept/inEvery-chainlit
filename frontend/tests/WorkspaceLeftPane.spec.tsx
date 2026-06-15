import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { WorkspaceLeftPane } from '@/components/WorkspaceLeftPane';

const apiMocks = vi.hoisted(() => ({
  updateInEveryProjectMock: vi.fn(),
  listInEveryToolsMock: vi.fn()
}));

vi.mock('components/i18n/Translator', () => ({
  useTranslation: () => ({
    i18n: { language: 'en-US' },
    t: (key: string) => {
      const translations: Record<string, string> = {
        'workspace.tabs.harness': 'Harness',
        'workspace.tabs.tools': 'Tools',
        'workspace.tabs.memory': 'Memory',
        'workspace.tabs.scene': 'Scene',
        'workspace.tabs.workflow': 'Workflow',
        'workspace.panels.harness.title': 'Code Harness',
        'workspace.panels.harness.description': 'Harness panel',
        'workspace.panels.memory.title': 'Memory Graph',
        'workspace.panels.memory.description': 'Memory panel',
        'workspace.panels.scene.title': 'Scene View',
        'workspace.panels.scene.description': 'Scene panel',
        'workspace.panels.workflow.title': 'Workflow Editor',
        'workspace.panels.workflow.description': 'Workflow panel',
        'workspace.tools.sections.enabled.title': 'Enabled tools',
        'workspace.tools.sections.enabled.description': 'Pick tools',
        'workspace.tools.sections.mcp.title': 'MCP config',
        'workspace.tools.sections.mcp.description': 'Edit MCP JSON',
        'workspace.tools.fields.search': 'Tool search',
        'workspace.tools.fields.searchPlaceholder': 'Search tools',
        'workspace.tools.fields.mcpPlaceholder': '{}',
        'workspace.tools.fields.mcpHint': 'Supports servers',
        'workspace.tools.badges.disabled': 'disabled',
        'workspace.tools.badges.readOnly': 'read only',
        'workspace.tools.badges.destructive': 'destructive',
        'workspace.tools.actions.enableAll': 'Enable all',
        'workspace.tools.actions.clearAll': 'Clear all',
        'workspace.tools.actions.reset': 'Reset',
        'workspace.tools.actions.save': 'Save project',
        'workspace.tools.actions.saving': 'Saving...',
        'workspace.tools.status.saved': 'Project tools saved',
        'workspace.tools.errors.invalidMcpJson': 'Invalid MCP JSON',
        'workspace.tools.empty': 'No tools match the current filter.',
        'common.status.loading': 'Loading...',
        'playground.scenes.code': 'Code'
      };
      return translations[key] || key;
    }
  })
}));

vi.mock('api', async () => {
  const actual = await vi.importActual<typeof import('api')>('api');
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      listInEveryTools: apiMocks.listInEveryToolsMock,
      updateInEveryProject: apiMocks.updateInEveryProjectMock
    }
  };
});

describe('WorkspaceLeftPane', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.listInEveryToolsMock.mockResolvedValue([
      {
        name: 'bash',
        aliases: [],
        description: 'Run shell commands',
        category: 'core',
        enabled: true,
        deferred: false,
        readOnly: false,
        destructive: true,
        concurrencySafe: false,
        searchHint: 'shell',
        schema: {}
      }
    ]);
    apiMocks.updateInEveryProjectMock.mockResolvedValue({
      id: 'project-1',
      threadId: 'thread-1',
      name: 'Demo Project',
      scene: 'code',
      config: {
        tools: { enabled: ['bash'] },
        mcp: { servers: { local: { transport: 'stdio', command: 'python' } } }
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the Tools tab and saves project-scoped config', async () => {
    render(
      <MemoryRouter>
        <WorkspaceLeftPane
          project={{
            id: 'project-1',
            threadId: 'thread-1',
            name: 'Demo Project',
            scene: 'code',
            config: {
              tools: { enabled: ['bash'] },
              mcp: {
                servers: { local: { transport: 'stdio', command: 'python' } }
              }
            },
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
          }}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('tab', { name: 'Tools' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Workflow' })).toBeInTheDocument();

    const toolsTab = screen.getByRole('tab', { name: 'Tools' });
    fireEvent.mouseDown(toolsTab);
    fireEvent.click(toolsTab);

    await waitFor(() =>
      expect(screen.getByLabelText('Tool search')).toBeInTheDocument()
    );

    await waitFor(() => expect(screen.getByText('bash')).toBeInTheDocument());

    const [, mcpEditor] = screen.getAllByRole('textbox');
    fireEvent.change(mcpEditor, {
      target: {
        value:
          '{"servers":{"local":{"transport":"stdio","command":"python","args":["-m","server"]}}}'
      }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save project' }));

    await waitFor(() =>
      expect(apiMocks.updateInEveryProjectMock).toHaveBeenCalledWith(
        'project-1',
        expect.objectContaining({
          config: expect.objectContaining({
            mcp: expect.objectContaining({
              servers: expect.objectContaining({
                local: expect.objectContaining({ command: 'python' })
              })
            })
          })
        })
      )
    );
  });

  it('embeds the workflow editor for the current project', () => {
    render(
      <MemoryRouter>
        <WorkspaceLeftPane
          project={{
            id: 'project-1',
            threadId: 'thread-1',
            name: 'Demo Project',
            scene: 'code',
            config: {},
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
          }}
        />
      </MemoryRouter>
    );

    const workflowTab = screen.getByRole('tab', { name: 'Workflow' });
    fireEvent.mouseDown(workflowTab);
    fireEvent.click(workflowTab);

    const iframe = screen.getByTitle('Workflow Editor');
    expect(iframe).toHaveAttribute(
      'src',
      '/workflow-editor/index.html?projectId=project-1'
    );
  });
});
