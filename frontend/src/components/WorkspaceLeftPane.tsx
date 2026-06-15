import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  apiClient,
  InEveryProject,
  InEveryProjectMcpConfig,
  InEveryProjectMcpServerConfig,
  InEveryProjectToolsConfig,
  InEveryToolDefinition
} from 'api';
import { useTranslation } from 'components/i18n/Translator';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

import {
  Box,
  BrainCircuit,
  Code2,
  LayoutPanelLeft,
  RotateCcw,
  Save,
  Search,
  Server,
  Wrench
} from 'lucide-react';

interface LeftPaneProps {
  project: InEveryProject;
}

type ProjectConfig = Record<string, unknown>;

type ProjectToolsDraft = {
  selectionMode: 'inherit' | 'enabled' | 'disabled';
  enabledToolNames: string[];
  disabledToolNames: string[];
  mcpText: string;
};

const EMPTY_MCP_CONFIG: Record<string, unknown> = {};

function EmptyPanel({
  action,
  icon: Icon,
  title,
  description
}: {
  action?: ReactNode;
  icon: typeof Code2;
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-full min-h-0 items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-md border bg-background">
          <Icon className="size-5 text-muted-foreground" />
        </div>
        <h3 className="mt-4 font-semibold">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  );
}

export function WorkspaceLeftPane({ project }: LeftPaneProps) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [currentProject, setCurrentProject] = useState(project);
  const [tools, setTools] = useState<InEveryToolDefinition[]>([]);
  const [isLoadingTools, setIsLoadingTools] = useState(false);
  const [toolSearch, setToolSearch] = useState('');
  const [toolDraft, setToolDraft] = useState<ProjectToolsDraft>(() =>
    draftFromProjectConfig(project.config)
  );
  const [baselineDraft, setBaselineDraft] = useState<ProjectToolsDraft>(() =>
    draftFromProjectConfig(project.config)
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const nextProject = project;
    const nextDraft = draftFromProjectConfig(nextProject.config);
    setCurrentProject(nextProject);
    setBaselineDraft(nextDraft);
    setToolDraft(nextDraft);
  }, [project.id, project.updatedAt]);

  useEffect(() => {
    let active = true;
    setIsLoadingTools(true);
    apiClient
      .listInEveryTools(i18n.language)
      .then((payload) => {
        if (!active) return;
        setTools(payload);
      })
      .catch((error) => {
        if (!active) return;
        toast.error(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (!active) return;
        setIsLoadingTools(false);
      });

    return () => {
      active = false;
    };
  }, [i18n.language]);

  const visibleTools = useMemo(() => {
    const query = toolSearch.trim().toLowerCase();
    if (!query) return tools;
    return tools.filter((tool) =>
      [
        tool.name,
        tool.category,
        tool.description,
        tool.searchHint,
        ...tool.aliases
      ]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [toolSearch, tools]);

  const selectedToolNames = useMemo(
    () => getSelectedToolNames(toolDraft, tools),
    [toolDraft, tools]
  );

  const baselineSelectedToolNames = useMemo(
    () => getSelectedToolNames(baselineDraft, tools),
    [baselineDraft, tools]
  );

  const isDirty =
    toolDraft.selectionMode !== baselineDraft.selectionMode ||
    !sameStringArrays(selectedToolNames, baselineSelectedToolNames) ||
    normalizeJsonText(toolDraft.mcpText) !== normalizeJsonText(baselineDraft.mcpText);

  const enabledToolCount = selectedToolNames.length;
  const totalToolCount = tools.length;

  const saveToolsConfig = async () => {
    try {
      setIsSaving(true);
      const nextConfig = buildProjectConfig(
        currentProject.config,
        toolDraft.selectionMode,
        selectedToolNames,
        toolDraft.disabledToolNames,
        toolDraft.mcpText,
        t('workspace.tools.errors.invalidMcpJson')
      );
      const updatedProject = await apiClient.updateInEveryProject(currentProject.id, {
        config: nextConfig
      });
      const nextDraft = draftFromProjectConfig(updatedProject.config);
      setCurrentProject(updatedProject);
      setBaselineDraft(nextDraft);
      setToolDraft(nextDraft);
      toast.success(t('workspace.tools.status.saved'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSaving(false);
    }
  };

  const resetDraft = () => {
    const nextDraft = draftFromProjectConfig(currentProject.config);
    setToolDraft(nextDraft);
    setBaselineDraft(nextDraft);
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col border-r bg-muted/20">
      <div className="flex min-h-16 items-center justify-between gap-3 border-b bg-background px-4">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate font-semibold">{currentProject.name}</h2>
            <Badge variant="secondary">
              {t(`playground.scenes.${currentProject.scene}`)}
            </Badge>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {currentProject.id}
          </p>
        </div>
      </div>

      <Tabs defaultValue="harness" className="flex min-h-0 flex-1 flex-col">
        <div className="border-b bg-background px-3 py-2">
          <TabsList className="h-auto justify-start gap-1 overflow-x-auto">
            <TabsTrigger value="harness" className="shrink-0 gap-2">
              <Code2 className="size-4" />
              {t('workspace.tabs.harness')}
            </TabsTrigger>
            <TabsTrigger value="tools" className="shrink-0 gap-2">
              <Wrench className="size-4" />
              {t('workspace.tabs.tools')}
            </TabsTrigger>
            <TabsTrigger value="memory" className="shrink-0 gap-2">
              <BrainCircuit className="size-4" />
              {t('workspace.tabs.memory')}
            </TabsTrigger>
            <TabsTrigger value="scene" className="shrink-0 gap-2">
              <Box className="size-4" />
              {t('workspace.tabs.scene')}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="harness" className="m-0 min-h-0 flex-1">
          <EmptyPanel
            icon={Code2}
            title={t('workspace.panels.harness.title')}
            description={t('workspace.panels.harness.description')}
            action={
              <Button type="button" onClick={() => navigate('/harness/modules')}>
                <LayoutPanelLeft className="mr-2 size-4" />
                {t('workspace.panels.harness.openModules')}
              </Button>
            }
          />
        </TabsContent>

        <TabsContent value="tools" className="m-0 min-h-0 flex-1 overflow-y-auto">
          <div className="grid gap-4 p-4">
            <section className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">
                    {t('workspace.tools.sections.enabled.title')}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {t('workspace.tools.sections.enabled.description')}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">
                    {enabledToolCount}/{totalToolCount || 0}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="workspace-tool-search">
                  {t('workspace.tools.fields.search')}
                </Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input
                    id="workspace-tool-search"
                    value={toolSearch}
                    onChange={(event) => setToolSearch(event.target.value)}
                    className="pl-9"
                    placeholder={t('workspace.tools.fields.searchPlaceholder')}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setToolDraft((current) => ({
                      ...current,
                      selectionMode: 'enabled',
                      enabledToolNames: tools.map((tool) => tool.name),
                      disabledToolNames: []
                    }))
                  }
                >
                  {t('workspace.tools.actions.enableAll')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setToolDraft((current) => ({
                      ...current,
                      selectionMode: 'enabled',
                      enabledToolNames: [],
                      disabledToolNames: []
                    }))
                  }
                >
                  {t('workspace.tools.actions.clearAll')}
                </Button>
              </div>

              <div className="grid max-h-72 gap-1 overflow-y-auto rounded-md border bg-background p-2">
                {isLoadingTools ? (
                  <div className="px-2 py-3 text-sm text-muted-foreground">
                    {t('common.status.loading')}
                  </div>
                ) : visibleTools.length ? (
                  visibleTools.map((tool) => {
                    const checked = isToolChecked(tool.name, toolDraft, tools);
                    return (
                      <label
                        key={tool.name}
                        className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-accent/50"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(nextChecked) =>
                            setToolDraft((current) => {
                              const names = new Set(
                                getSelectedToolNames(current, tools)
                              );
                              if (nextChecked === true) {
                                names.add(tool.name);
                              } else {
                                names.delete(tool.name);
                              }
                              return {
                                ...current,
                                selectionMode: 'enabled',
                                enabledToolNames: sortStrings([...names]),
                                disabledToolNames: []
                              };
                            })
                          }
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-medium">
                              {tool.name}
                            </span>
                            <Badge variant="secondary">{tool.category}</Badge>
                            {!tool.enabled ? (
                              <Badge variant="outline">
                                {t('workspace.tools.badges.disabled')}
                              </Badge>
                            ) : null}
                            {tool.readOnly ? (
                              <Badge variant="outline">
                                {t('workspace.tools.badges.readOnly')}
                              </Badge>
                            ) : null}
                            {tool.destructive ? (
                              <Badge variant="destructive">
                                {t('workspace.tools.badges.destructive')}
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                            {tool.description}
                          </p>
                        </div>
                      </label>
                    );
                  })
                ) : (
                  <div className="px-2 py-3 text-sm text-muted-foreground">
                    {t('workspace.tools.empty')}
                  </div>
                )}
              </div>
            </section>

            <Separator />

            <section className="grid gap-2">
              <div className="flex items-center gap-2">
                <Server className="size-4 text-muted-foreground" />
                <div>
                  <h3 className="text-sm font-semibold">
                    {t('workspace.tools.sections.mcp.title')}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {t('workspace.tools.sections.mcp.description')}
                  </p>
                </div>
              </div>

              <Textarea
                value={toolDraft.mcpText}
                onChange={(event) =>
                  setToolDraft((current) => ({
                    ...current,
                    mcpText: event.target.value
                  }))
                }
                className="min-h-56 font-mono text-xs"
                spellCheck={false}
                placeholder={t('workspace.tools.fields.mcpPlaceholder')}
              />

              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {t('workspace.tools.fields.mcpHint')}
                </p>
                <Badge variant="outline">
                  {mcpServerCount(toolDraft.mcpText)}
                </Badge>
              </div>
            </section>

            <div className="flex items-center justify-between gap-2 border-t pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetDraft}
                disabled={!isDirty || isSaving}
              >
                <RotateCcw className="mr-2 size-4" />
                {t('workspace.tools.actions.reset')}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={saveToolsConfig}
                disabled={isSaving || !isDirty}
              >
                <Save className="mr-2 size-4" />
                {isSaving
                  ? t('workspace.tools.actions.saving')
                  : t('workspace.tools.actions.save')}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="memory" className="m-0 min-h-0 flex-1">
          <EmptyPanel
            icon={BrainCircuit}
            title={t('workspace.panels.memory.title')}
            description={t('workspace.panels.memory.description')}
          />
        </TabsContent>

        <TabsContent value="scene" className="m-0 min-h-0 flex-1">
          <EmptyPanel
            icon={LayoutPanelLeft}
            title={t('workspace.panels.scene.title')}
            description={t('workspace.panels.scene.description')}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function draftFromProjectConfig(config: ProjectConfig | undefined): ProjectToolsDraft {
  const toolsConfig = readToolsConfig(config);
  const mcpConfig = readMcpConfig(config);
  const selectionMode = normalizeSelectionMode(toolsConfig.selectionMode, config);
  const enabledToolNames = normalizeStringArray(
    toolsConfig.enabled || toolsConfig.enabledTools || config?.enabledTools
  );
  const disabledToolNames = normalizeStringArray(
    toolsConfig.disabled || toolsConfig.disabledTools || config?.disabledTools
  );

  return {
    selectionMode,
    enabledToolNames,
    disabledToolNames,
    mcpText: JSON.stringify(mcpConfig === EMPTY_MCP_CONFIG ? {} : mcpConfig, null, 2)
  };
}

function readToolsConfig(config: ProjectConfig | undefined): InEveryProjectToolsConfig {
  const rawTools = asRecord(config?.tools);
  return rawTools || {};
}

function readMcpConfig(config: ProjectConfig | undefined): InEveryProjectMcpConfig {
  const direct = asRecord(config?.mcp);
  if (direct) return direct;

  const legacyServers = asMcpServersConfig(config?.mcpServers);
  if (legacyServers) {
    return { servers: legacyServers };
  }

  return EMPTY_MCP_CONFIG;
}

function buildProjectConfig(
  baseConfig: ProjectConfig | undefined,
  selectionMode: ProjectToolsDraft['selectionMode'],
  enabledToolNames: string[],
  disabledToolNames: string[],
  mcpText: string,
  invalidMcpJsonMessage: string
): ProjectConfig {
  const nextConfig: ProjectConfig = { ...(baseConfig || {}) };
  const normalizedSelectionMode =
    selectionMode === 'inherit' &&
    !normalizeStringArray(enabledToolNames).length &&
    !normalizeStringArray(disabledToolNames).length
      ? 'inherit'
      : selectionMode;

  if (normalizedSelectionMode === 'inherit') {
    delete nextConfig.tools;
    delete nextConfig.enabledTools;
    delete nextConfig.disabledTools;
  } else {
    const existingTools = asRecord(nextConfig.tools);
    const nextTools = {
      ...(existingTools || {}),
      selectionMode: normalizedSelectionMode,
      ...(normalizedSelectionMode === 'enabled'
        ? { enabled: enabledToolNames }
        : { disabled: disabledToolNames })
    };
    nextConfig.tools = nextTools;
    delete nextConfig.enabledTools;
    delete nextConfig.disabledTools;
  }

  if (mcpText.trim()) {
    const parsedMcp = parseJsonObject(mcpText, invalidMcpJsonMessage);
    nextConfig.mcp = parsedMcp;
    nextConfig.mcpServers = asRecord(parsedMcp.servers || parsedMcp.mcpServers) || parsedMcp;
  } else {
    delete nextConfig.mcp;
    delete nextConfig.mcpServers;
  }

  return nextConfig;
}

function normalizeSelectionMode(
  value: unknown,
  config: ProjectConfig | undefined
): ProjectToolsDraft['selectionMode'] {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'enabled' || normalized === 'disabled' || normalized === 'inherit') {
    return normalized;
  }
  if (Array.isArray((config as Record<string, unknown> | undefined)?.enabledTools)) {
    return 'enabled';
  }
  if (Array.isArray((config as Record<string, unknown> | undefined)?.disabledTools)) {
    return 'disabled';
  }
  return 'inherit';
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return sortStrings(
    value
      .map((item) => String(item || '').trim())
      .filter(Boolean)
  );
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function asMcpServersConfig(
  value: unknown
): Record<string, InEveryProjectMcpServerConfig> | undefined {
  const record = asRecord(value);
  if (!record) return undefined;
  return record as Record<string, InEveryProjectMcpServerConfig>;
}

function parseJsonObject(
  value: string,
  errorMessage: string
): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error();
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error(errorMessage);
  }
}

function normalizeJsonText(value: string): string {
  if (!value.trim()) return '';
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return value.trim();
    }
    return JSON.stringify(parsed, null, 2);
  } catch {
    return value.trim();
  }
}

function getSelectedToolNames(
  draft: ProjectToolsDraft,
  tools: InEveryToolDefinition[]
): string[] {
  if (draft.selectionMode === 'enabled') {
    const enabled = normalizeStringArray(draft.enabledToolNames);
    if (enabled.length) {
      return sortStrings(
        enabled.filter((name) => tools.some((tool) => tool.name === name))
      );
    }
    return [];
  }

  const disabled = new Set(normalizeStringArray(draft.disabledToolNames));
  return sortStrings(
    tools.filter((tool) => !disabled.has(tool.name)).map((tool) => tool.name)
  );
}

function isToolChecked(
  toolName: string,
  draft: ProjectToolsDraft,
  tools: InEveryToolDefinition[]
): boolean {
  const selected = getSelectedToolNames(draft, tools);
  return selected.includes(toolName);
}

function sameStringArrays(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function sortStrings(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function mcpServerCount(text: string) {
  try {
    const parsed = JSON.parse(text || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return '0 servers';
    }
    const rawServers = asRecord(
      (parsed as Record<string, unknown>).servers ||
        (parsed as Record<string, unknown>).mcpServers
    );
    return `${Object.keys(rawServers || {}).length} servers`;
  } catch {
    return 'invalid JSON';
  }
}
