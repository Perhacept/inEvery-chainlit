import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useTranslation } from 'components/i18n/Translator';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  BrainCircuit,
  Boxes,
  CheckCircle2,
  CircuitBoard,
  Clipboard,
  Copy,
  GitBranch,
  Layers3,
  MessageSquare,
  Network,
  RotateCcw,
  Save,
  ServerCog,
  Settings2,
  ShieldCheck,
  Sparkles,
  Workflow,
  Wrench
} from 'lucide-react';

const STORAGE_KEY = 'inevery-harness-module-template-draft-v1';

type ModuleMode = 'current' | 'partial' | 'future' | 'fallback' | 'draft';

type ModuleConfig = {
  enabled: boolean;
  implementation: string;
  mode: ModuleMode;
};

type HarnessTemplate = {
  id: string;
  name: string;
  kind: 'code' | 'coordinator' | 'dynamic' | 'skeleton';
  status: string;
  description: string;
  notes: string;
  sceneIds: string[];
  modules: Record<string, ModuleConfig>;
  settings: {
    maxTurns: number;
    budgetUsd: string;
    mcpEnabled: boolean;
    hooksEnabled: boolean;
    deleteGuardEnabled: boolean;
    toolPack: string;
    memoryProvider: string;
    fixedFiles: string;
  };
};

type SceneBinding = {
  id: string;
  label: string;
  descriptionKey: string;
  templateId: string;
};

type DraftState = {
  activeTemplateId: string;
  selectedNodeId: string;
  templates: HarnessTemplate[];
  scenes: SceneBinding[];
};

type NodeDefinition = {
  id: string;
  icon: typeof CircuitBoard;
  tone?: 'green' | 'blue' | 'orange' | 'violet' | 'teal' | 'slate';
  titleKey: string;
  kickerKey: string;
  descriptionKey: string;
  detail: string;
};

const FOUNDATION_NODES: NodeDefinition[] = [
  {
    id: 'sceneRouter',
    icon: GitBranch,
    tone: 'blue',
    titleKey: 'harnessModules.nodes.sceneRouter.title',
    kickerKey: 'harnessModules.nodes.sceneRouter.kicker',
    descriptionKey: 'harnessModules.nodes.sceneRouter.description',
    detail: 'AgentFactory.create_agent(scene_type, project_id)'
  },
  {
    id: 'workspace',
    icon: Boxes,
    tone: 'slate',
    titleKey: 'harnessModules.nodes.workspace.title',
    kickerKey: 'harnessModules.nodes.workspace.kicker',
    descriptionKey: 'harnessModules.nodes.workspace.description',
    detail: 'WorkspaceManager(project_id)'
  },
  {
    id: 'runtimeServices',
    icon: ServerCog,
    tone: 'violet',
    titleKey: 'harnessModules.nodes.runtimeServices.title',
    kickerKey: 'harnessModules.nodes.runtimeServices.kicker',
    descriptionKey: 'harnessModules.nodes.runtimeServices.description',
    detail: 'RuntimeServices per project/thread'
  }
];

const LOOP_NODES: NodeDefinition[] = [
  {
    id: 'messages',
    icon: MessageSquare,
    tone: 'slate',
    titleKey: 'harnessModules.nodes.messages.title',
    kickerKey: 'harnessModules.nodes.messages.kicker',
    descriptionKey: 'harnessModules.nodes.messages.description',
    detail: 'transcript replay + current turn'
  },
  {
    id: 'preLlm',
    icon: Layers3,
    tone: 'green',
    titleKey: 'harnessModules.nodes.preLlm.title',
    kickerKey: 'harnessModules.nodes.preLlm.kicker',
    descriptionKey: 'harnessModules.nodes.preLlm.description',
    detail: 'memory + prompt + compact'
  },
  {
    id: 'llm',
    icon: Sparkles,
    tone: 'blue',
    titleKey: 'harnessModules.nodes.llm.title',
    kickerKey: 'harnessModules.nodes.llm.kicker',
    descriptionKey: 'harnessModules.nodes.llm.description',
    detail: 'LlmRouter intent tiering'
  },
  {
    id: 'gate',
    icon: ShieldCheck,
    tone: 'orange',
    titleKey: 'harnessModules.nodes.gate.title',
    kickerKey: 'harnessModules.nodes.gate.kicker',
    descriptionKey: 'harnessModules.nodes.gate.description',
    detail: 'PreToolUse hooks + PermissionManager'
  },
  {
    id: 'handlers',
    icon: Wrench,
    tone: 'teal',
    titleKey: 'harnessModules.nodes.handlers.title',
    kickerKey: 'harnessModules.nodes.handlers.kicker',
    descriptionKey: 'harnessModules.nodes.handlers.description',
    detail: 'AsyncToolExecutor tool handlers'
  }
];

const MODULE_NODES: NodeDefinition[] = [
  {
    id: 'memory',
    icon: BrainCircuit,
    tone: 'green',
    titleKey: 'harnessModules.nodes.memory.title',
    kickerKey: 'harnessModules.nodes.memory.kicker',
    descriptionKey: 'harnessModules.nodes.memory.description',
    detail: 'CodeSceneMemory / DummyMemorySystem'
  },
  {
    id: 'prompt',
    icon: Clipboard,
    tone: 'blue',
    titleKey: 'harnessModules.nodes.prompt.title',
    kickerKey: 'harnessModules.nodes.prompt.kicker',
    descriptionKey: 'harnessModules.nodes.prompt.description',
    detail: 'harnesscore/prompts_registry'
  },
  {
    id: 'compact',
    icon: Workflow,
    tone: 'violet',
    titleKey: 'harnessModules.nodes.compact.title',
    kickerKey: 'harnessModules.nodes.compact.kicker',
    descriptionKey: 'harnessModules.nodes.compact.description',
    detail: 'CompactPipeline + PostCompactRestorer'
  },
  {
    id: 'hooks',
    icon: Network,
    tone: 'orange',
    titleKey: 'harnessModules.nodes.hooks.title',
    kickerKey: 'harnessModules.nodes.hooks.kicker',
    descriptionKey: 'harnessModules.nodes.hooks.description',
    detail: 'HookRegistry lifecycle'
  },
  {
    id: 'toolExecutor',
    icon: Wrench,
    tone: 'teal',
    titleKey: 'harnessModules.nodes.toolExecutor.title',
    kickerKey: 'harnessModules.nodes.toolExecutor.kicker',
    descriptionKey: 'harnessModules.nodes.toolExecutor.description',
    detail: 'default_code_tools + MCP + Composio'
  },
  {
    id: 'multiagent',
    icon: CircuitBoard,
    tone: 'violet',
    titleKey: 'harnessModules.nodes.multiagent.title',
    kickerKey: 'harnessModules.nodes.multiagent.kicker',
    descriptionKey: 'harnessModules.nodes.multiagent.description',
    detail: 'InProcessTeamRuntime'
  }
];

const ALL_NODES = [
  ...FOUNDATION_NODES,
  ...LOOP_NODES,
  ...MODULE_NODES,
  {
    id: 'transcript',
    icon: CheckCircle2,
    tone: 'slate',
    titleKey: 'harnessModules.nodes.transcript.title',
    kickerKey: 'harnessModules.nodes.transcript.kicker',
    descriptionKey: 'harnessModules.nodes.transcript.description',
    detail: 'JsonlTranscriptStore + ToolResultStore'
  }
] satisfies NodeDefinition[];

const TEMPLATE_IDS = ['cc-copy', 'cowork-brain', 'dynamic-freeze', 'skeleton'];

const DEFAULT_STATE: DraftState = {
  activeTemplateId: 'cc-copy',
  selectedNodeId: 'memory',
  templates: [
    {
      id: 'cc-copy',
      name: 'cc-copy',
      kind: 'code',
      status: 'current',
      description: 'harnessModules.templates.ccCopy.description',
      notes: 'AgentFactory code branch + CodeSceneMemory + default_code_tools.',
      sceneIds: ['code'],
      modules: {
        sceneRouter: moduleConfig('code_branch', 'current'),
        workspace: moduleConfig('WorkspaceManager', 'current'),
        runtimeServices: moduleConfig('RuntimeServices', 'current'),
        messages: moduleConfig('Transcript replay', 'current'),
        preLlm: moduleConfig('memory + prompt + compact', 'current'),
        llm: moduleConfig('LlmRouter.from_env', 'current'),
        gate: moduleConfig('PermissionManager + hooks', 'current'),
        handlers: moduleConfig('AsyncToolExecutor', 'current'),
        transcript: moduleConfig('JsonlTranscriptStore', 'current'),
        memory: moduleConfig('CodeSceneMemory', 'current'),
        prompt: moduleConfig('Prompt Registry', 'current'),
        compact: moduleConfig('CompactPipeline + PostCompactRestorer', 'current'),
        hooks: moduleConfig('HookRegistry + scene/external hooks', 'current'),
        toolExecutor: moduleConfig('default_code_tools + dynamic MCP/Composio', 'current'),
        multiagent: moduleConfig('InProcessTeamRuntime', 'current')
      },
      settings: {
        maxTurns: 8,
        budgetUsd: '',
        mcpEnabled: true,
        hooksEnabled: true,
        deleteGuardEnabled: true,
        toolPack: 'default_code_tools',
        memoryProvider: 'CodeSceneMemory',
        fixedFiles: ''
      }
    },
    {
      id: 'cowork-brain',
      name: 'cowork-brain',
      kind: 'coordinator',
      status: 'reserved',
      description: 'harnessModules.templates.coworkBrain.description',
      notes: 'Reserved dispatcher brain for Codex, Claude Code and other harnesses.',
      sceneIds: [],
      modules: {
        sceneRouter: moduleConfig('future_scene_branch', 'future'),
        runtimeServices: moduleConfig('RuntimeServices', 'current'),
        llm: moduleConfig('LlmRouter', 'current'),
        gate: moduleConfig('PermissionManager + hooks', 'current'),
        memory: moduleConfig('empty_interface', 'future', false),
        prompt: moduleConfig('Coordinator prompt assembler', 'partial'),
        compact: moduleConfig('CompactPipeline', 'current'),
        hooks: moduleConfig('HookRegistry', 'current'),
        toolExecutor: moduleConfig('coordinator tool subset', 'partial'),
        multiagent: moduleConfig('team runtime + external dispatch', 'future')
      },
      settings: {
        maxTurns: 10,
        budgetUsd: '',
        mcpEnabled: true,
        hooksEnabled: true,
        deleteGuardEnabled: true,
        toolPack: 'coordinator_tools',
        memoryProvider: 'empty_interface',
        fixedFiles: ''
      }
    },
    {
      id: 'dynamic-freeze',
      name: 'dynamic-freeze',
      kind: 'dynamic',
      status: 'reserved',
      description: 'harnessModules.templates.dynamicFreeze.description',
      notes: 'Reserved for fixed knowledge-base scenes. Requires fixed file paths.',
      sceneIds: ['notebook'],
      modules: {
        sceneRouter: moduleConfig('future_scene_branch', 'future'),
        runtimeServices: moduleConfig('RuntimeServices', 'current'),
        llm: moduleConfig('LlmRouter', 'current'),
        memory: moduleConfig('fixed_file_provider', 'future'),
        prompt: moduleConfig('Prompt Registry', 'current'),
        compact: moduleConfig('CompactPipeline', 'current'),
        hooks: moduleConfig('scene hooks + fixed file RAG', 'future'),
        toolExecutor: moduleConfig('scene tool pack', 'future'),
        multiagent: moduleConfig('optional', 'future', false)
      },
      settings: {
        maxTurns: 8,
        budgetUsd: '',
        mcpEnabled: false,
        hooksEnabled: true,
        deleteGuardEnabled: true,
        toolPack: 'scene_tools',
        memoryProvider: 'fixed_file_provider',
        fixedFiles: 'docs/**/*.md\nmaterials/**/*.txt'
      }
    },
    {
      id: 'skeleton',
      name: 'skeleton',
      kind: 'skeleton',
      status: 'current-fallback',
      description: 'harnessModules.templates.skeleton.description',
      notes: 'Non-code scenes currently use DummyMemorySystem and default_code_tools fallback.',
      sceneIds: ['video-generate', 'writing', '3d-art-generate'],
      modules: {
        sceneRouter: moduleConfig('shared_agent_loop fallback', 'fallback'),
        runtimeServices: moduleConfig('RuntimeServices', 'current'),
        llm: moduleConfig('LlmRouter', 'current'),
        memory: moduleConfig('DummyMemorySystem', 'fallback', false),
        prompt: moduleConfig('empty interface', 'future', false),
        compact: moduleConfig('CompactPipeline', 'current'),
        hooks: moduleConfig('scene_hooks fallback', 'fallback'),
        toolExecutor: moduleConfig('default_code_tools fallback', 'fallback'),
        multiagent: moduleConfig('optional', 'future', false)
      },
      settings: {
        maxTurns: 8,
        budgetUsd: '',
        mcpEnabled: false,
        hooksEnabled: true,
        deleteGuardEnabled: true,
        toolPack: 'default_code_tools fallback',
        memoryProvider: 'DummyMemorySystem',
        fixedFiles: ''
      }
    }
  ],
  scenes: [
    {
      id: 'code',
      label: 'code',
      descriptionKey: 'playground.scenes.code',
      templateId: 'cc-copy'
    },
    {
      id: 'notebook',
      label: 'notebook',
      descriptionKey: 'playground.scenes.notebook',
      templateId: 'dynamic-freeze'
    },
    {
      id: 'video-generate',
      label: 'video-generate',
      descriptionKey: 'playground.scenes.video-generate',
      templateId: 'skeleton'
    },
    {
      id: '3d-art-generate',
      label: '3d-art-generate',
      descriptionKey: 'playground.scenes.3d-art-generate',
      templateId: 'skeleton'
    },
    {
      id: 'writing',
      label: 'writing',
      descriptionKey: 'playground.scenes.writing',
      templateId: 'skeleton'
    }
  ]
};

export default function HarnessModules() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [draft, setDraft] = useState<DraftState>(() => loadDraft());

  const activeTemplate = useMemo(
    () =>
      draft.templates.find((template) => template.id === draft.activeTemplateId) ||
      draft.templates[0],
    [draft.activeTemplateId, draft.templates]
  );
  const selectedNode = useMemo(
    () => ALL_NODES.find((node) => node.id === draft.selectedNodeId) || MODULE_NODES[0],
    [draft.selectedNodeId]
  );
  const selectedConfig = getModuleConfig(activeTemplate, selectedNode.id);
  const activeSceneCount = draft.scenes.filter(
    (scene) => scene.templateId === activeTemplate.id
  ).length;
  const preview = JSON.stringify(
    {
      activeTemplateId: draft.activeTemplateId,
      selectedNodeId: draft.selectedNodeId,
      templates: syncTemplateScenes(draft).templates,
      scenes: draft.scenes,
      persistence: 'localStorage draft only',
      futureBackend: 'template CRUD + scene template binding'
    },
    null,
    2
  );

  const updateDraft = (updater: (current: DraftState) => DraftState) => {
    setDraft((current) => syncTemplateScenes(updater(structuredClone(current))));
  };

  const updateActiveTemplate = (updater: (template: HarnessTemplate) => void) => {
    updateDraft((current) => {
      const template = current.templates.find(
        (item) => item.id === current.activeTemplateId
      );
      if (template) updater(template);
      return current;
    });
  };

  const saveDraft = () => {
    const nextDraft = syncTemplateScenes(draft);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDraft));
    setDraft(nextDraft);
    toast.success(t('harnessModules.status.saved'));
  };

  const resetDraft = () => {
    const nextDraft = structuredClone(DEFAULT_STATE);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDraft));
    setDraft(nextDraft);
    toast.success(t('harnessModules.status.reset'));
  };

  const copyPreview = async () => {
    try {
      await navigator.clipboard.writeText(preview);
      toast.success(t('harnessModules.status.copied'));
    } catch {
      toast.error(t('harnessModules.status.copyFailed'));
    }
  };

  const bindScene = (sceneId: string) => {
    updateDraft((current) => {
      const scene = current.scenes.find((item) => item.id === sceneId);
      if (scene) scene.templateId = current.activeTemplateId;
      current.selectedNodeId = 'sceneRouter';
      return current;
    });
  };

  const chooseTemplate = (templateId: string) => {
    updateDraft((current) => ({
      ...current,
      activeTemplateId: templateId,
      selectedNodeId: 'sceneRouter'
    }));
  };

  const chooseNode = (nodeId: string) => {
    updateDraft((current) => ({ ...current, selectedNodeId: nodeId }));
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-background/95">
        <div className="mx-auto flex min-h-16 max-w-[1800px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md border bg-muted">
              <CircuitBoard className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                {t('harnessModules.eyebrow')}
              </p>
              <h1 className="truncate text-lg font-semibold">
                {t('harnessModules.title')}
              </h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="mr-2 size-4" />
              {t('harnessModules.actions.back')}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={resetDraft}>
              <RotateCcw className="mr-2 size-4" />
              {t('harnessModules.actions.reset')}
            </Button>
            <Button type="button" size="sm" onClick={saveDraft}>
              <Save className="mr-2 size-4" />
              {t('harnessModules.actions.save')}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1800px] gap-4 px-4 py-4 sm:px-6 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
        <aside className="grid content-start gap-4">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-base">
                {t('harnessModules.templates.title')}
              </CardTitle>
              <CardDescription>
                {t('harnessModules.templates.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 p-4 pt-0">
              {draft.templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={cn(
                    'rounded-md border bg-card p-3 text-left transition hover:border-primary/60 hover:bg-accent/30',
                    template.id === activeTemplate.id &&
                      'border-primary bg-accent/30 ring-2 ring-primary/15'
                  )}
                  onClick={() => chooseTemplate(template.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{template.name}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {t(template.description)}
                      </p>
                    </div>
                    <Badge variant="secondary">{template.kind}</Badge>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-base">
                {t('harnessModules.scenes.title')}
              </CardTitle>
              <CardDescription>
                {t('harnessModules.scenes.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 p-4 pt-0">
              {draft.scenes.map((scene) => (
                <button
                  key={scene.id}
                  type="button"
                  className={cn(
                    'rounded-md border bg-card p-3 text-left transition hover:border-primary/60 hover:bg-accent/30',
                    scene.templateId === activeTemplate.id &&
                      'border-primary bg-accent/30'
                  )}
                  onClick={() => bindScene(scene.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{scene.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t(scene.descriptionKey)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        scene.templateId === activeTemplate.id ? 'default' : 'outline'
                      }
                    >
                      {scene.templateId}
                    </Badge>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </aside>

        <section className="grid min-w-0 content-start gap-4">
          <Card className="overflow-hidden">
            <CardContent className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  {t('harnessModules.summary.eyebrow')}
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-normal">
                  {activeTemplate.name}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  {t(activeTemplate.description)}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <SummaryButton
                  label={t('harnessModules.summary.scenes')}
                  value={String(activeSceneCount)}
                  active={draft.selectedNodeId === 'sceneRouter'}
                  onClick={() => chooseNode('sceneRouter')}
                />
                <SummaryButton
                  label={t('harnessModules.summary.runtime')}
                  value="Runtime"
                  active={draft.selectedNodeId === 'runtimeServices'}
                  onClick={() => chooseNode('runtimeServices')}
                />
                <SummaryButton
                  label={t('harnessModules.summary.tools')}
                  value="Tools"
                  active={draft.selectedNodeId === 'toolExecutor'}
                  onClick={() => chooseNode('toolExecutor')}
                />
              </div>
            </CardContent>
          </Card>

          <ModuleSection
            title={t('harnessModules.sections.foundation')}
            description={t('harnessModules.sections.foundationDescription')}
            nodes={FOUNDATION_NODES}
            selectedNodeId={draft.selectedNodeId}
            onSelect={chooseNode}
          />

          <Card className="overflow-hidden">
            <CardHeader className="p-4">
              <CardTitle className="text-base">
                {t('harnessModules.sections.loop')}
              </CardTitle>
              <CardDescription>
                {t('harnessModules.sections.loopDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid gap-2 2xl:grid-cols-[1fr_24px_1.2fr_24px_1fr_24px_1fr_24px_1fr]">
                {LOOP_NODES.map((node, index) => (
                  <FragmentedLoopNode
                    key={node.id}
                    node={node}
                    selected={node.id === draft.selectedNodeId}
                    showArrow={index < LOOP_NODES.length - 1}
                    onSelect={() => chooseNode(node.id)}
                  />
                ))}
              </div>
              <button
                type="button"
                className={cn(
                  'mt-3 w-full rounded-md border border-dashed bg-muted/30 p-3 text-left transition hover:border-primary/60 hover:bg-accent/30',
                  draft.selectedNodeId === 'transcript' &&
                    'border-primary bg-accent/30 ring-2 ring-primary/15'
                )}
                onClick={() => chooseNode('transcript')}
              >
                <p className="text-sm font-semibold">
                  {t('harnessModules.nodes.transcript.title')}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('harnessModules.nodes.transcript.description')}
                </p>
              </button>
            </CardContent>
          </Card>

          <ModuleSection
            title={t('harnessModules.sections.modules')}
            description={t('harnessModules.sections.modulesDescription')}
            nodes={MODULE_NODES}
            selectedNodeId={draft.selectedNodeId}
            onSelect={chooseNode}
            columns="xl:grid-cols-3 2xl:grid-cols-6"
          />

          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-base">
                {t('harnessModules.sections.variants')}
              </CardTitle>
              <CardDescription>
                {t('harnessModules.sections.variantsDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 p-4 pt-0 md:grid-cols-2 2xl:grid-cols-4">
              {TEMPLATE_IDS.map((templateId) => {
                const template = draft.templates.find((item) => item.id === templateId);
                if (!template) return null;
                return (
                  <button
                    key={template.id}
                    type="button"
                    className={cn(
                      'min-h-28 rounded-md border bg-card p-3 text-left transition hover:border-primary/60 hover:bg-accent/30',
                      template.id === activeTemplate.id &&
                        'border-primary bg-accent/30 ring-2 ring-primary/15'
                    )}
                    onClick={() => chooseTemplate(template.id)}
                  >
                    <p className="font-semibold">{template.name}</p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {t(template.description)}
                    </p>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </section>

        <aside className="grid content-start gap-4 xl:sticky xl:top-4">
          <Card>
            <CardHeader className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    {t(selectedNode.kickerKey)}
                  </p>
                  <CardTitle className="mt-1 text-lg">
                    {t(selectedNode.titleKey)}
                  </CardTitle>
                </div>
                <Badge variant={selectedConfig.enabled ? 'default' : 'outline'}>
                  {selectedConfig.enabled
                    ? t('harnessModules.status.enabled')
                    : t('harnessModules.status.disabled')}
                </Badge>
              </div>
              <CardDescription>{t(selectedNode.descriptionKey)}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 p-4 pt-0">
              <div className="grid gap-3 rounded-md border bg-muted/30 p-3">
                <ReadonlyField
                  label={t('harnessModules.fields.source')}
                  value={selectedNode.detail}
                />
                <ReadonlyField
                  label={t('harnessModules.fields.mode')}
                  value={selectedConfig.mode}
                />
              </div>

              <InspectorEditor
                template={activeTemplate}
                selectedNodeId={selectedNode.id}
                onUpdate={updateActiveTemplate}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">
                  {t('harnessModules.preview.title')}
                </CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={copyPreview}>
                  <Copy className="mr-2 size-4" />
                  {t('harnessModules.actions.copy')}
                </Button>
              </div>
              <CardDescription>
                {t('harnessModules.preview.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <pre className="max-h-72 overflow-auto rounded-md bg-slate-950 p-3 text-xs leading-5 text-slate-100">
                {preview}
              </pre>
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  );
}

function SummaryButton({
  active,
  label,
  onClick,
  value
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  value: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        'rounded-md border bg-card p-3 text-left transition hover:border-primary/60 hover:bg-accent/30',
        active && 'border-primary bg-accent/30 ring-2 ring-primary/15'
      )}
      onClick={onClick}
    >
      <p className="truncate text-sm font-semibold">{value}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
    </button>
  );
}

function ModuleSection({
  columns = 'lg:grid-cols-3',
  description,
  nodes,
  onSelect,
  selectedNodeId,
  title
}: {
  columns?: string;
  description: string;
  nodes: NodeDefinition[];
  onSelect: (nodeId: string) => void;
  selectedNodeId: string;
  title: string;
}) {
  return (
    <Card>
      <CardHeader className="p-4">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className={cn('grid gap-2 p-4 pt-0', columns)}>
        {nodes.map((node) => (
          <ModuleButton
            key={node.id}
            node={node}
            selected={node.id === selectedNodeId}
            onSelect={() => onSelect(node.id)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function FragmentedLoopNode({
  node,
  onSelect,
  selected,
  showArrow
}: {
  node: NodeDefinition;
  onSelect: () => void;
  selected: boolean;
  showArrow: boolean;
}) {
  return (
    <>
      <ModuleButton node={node} selected={selected} onSelect={onSelect} />
      {showArrow ? (
        <div className="hidden items-center justify-center 2xl:flex">
          <div className="h-px w-full bg-border after:block after:size-2 after:translate-x-[18px] after:-translate-y-[3.5px] after:rotate-45 after:border-r after:border-t after:border-border" />
        </div>
      ) : null}
    </>
  );
}

function ModuleButton({
  node,
  onSelect,
  selected
}: {
  node: NodeDefinition;
  onSelect: () => void;
  selected: boolean;
}) {
  const { t } = useTranslation();
  const Icon = node.icon;
  return (
    <button
      type="button"
      className={cn(
        'min-h-32 rounded-md border bg-card p-3 text-left transition hover:border-primary/60 hover:bg-accent/30',
        selected && 'border-primary bg-accent/30 ring-2 ring-primary/15',
        toneClasses(node.tone)
      )}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-background/85">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            {t(node.kickerKey)}
          </p>
          <p className="mt-1 font-semibold">{t(node.titleKey)}</p>
          <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
            {t(node.descriptionKey)}
          </p>
        </div>
      </div>
    </button>
  );
}

function InspectorEditor({
  onUpdate,
  selectedNodeId,
  template
}: {
  onUpdate: (updater: (template: HarnessTemplate) => void) => void;
  selectedNodeId: string;
  template: HarnessTemplate;
}) {
  const { t } = useTranslation();
  const config = getModuleConfig(template, selectedNodeId);

  if (selectedNodeId === 'sceneRouter') {
    return (
      <div className="grid gap-3">
        <EditableField
          label={t('harnessModules.fields.templateName')}
          value={template.name}
          onChange={(value) => onUpdate((item) => void (item.name = value))}
        />
        <EditableArea
          label={t('harnessModules.fields.notes')}
          value={template.notes}
          onChange={(value) => onUpdate((item) => void (item.notes = value))}
        />
      </div>
    );
  }

  if (selectedNodeId === 'memory') {
    return (
      <div className="grid gap-3">
        <div className="grid gap-2">
          <Label>{t('harnessModules.fields.memoryProvider')}</Label>
          <Select
            value={template.settings.memoryProvider}
            onValueChange={(value) =>
              onUpdate((item) => {
                item.settings.memoryProvider = value;
                ensureModuleConfig(item, 'memory').implementation = value;
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CodeSceneMemory">CodeSceneMemory</SelectItem>
              <SelectItem value="DummyMemorySystem">DummyMemorySystem</SelectItem>
              <SelectItem value="empty_interface">empty_interface</SelectItem>
              <SelectItem value="fixed_file_provider">
                fixed_file_provider
              </SelectItem>
              <SelectItem value="future_provider">future_provider</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <EditableArea
          label={t('harnessModules.fields.fixedFiles')}
          value={template.settings.fixedFiles}
          onChange={(value) =>
            onUpdate((item) => void (item.settings.fixedFiles = value))
          }
        />
      </div>
    );
  }

  if (selectedNodeId === 'toolExecutor') {
    return (
      <div className="grid gap-3">
        <div className="grid gap-2">
          <Label>{t('harnessModules.fields.toolPack')}</Label>
          <Select
            value={template.settings.toolPack}
            onValueChange={(value) =>
              onUpdate((item) => {
                item.settings.toolPack = value;
                ensureModuleConfig(item, 'toolExecutor').implementation = value;
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default_code_tools">default_code_tools</SelectItem>
              <SelectItem value="coordinator_tools">coordinator_tools</SelectItem>
              <SelectItem value="scene_tools">scene_tools</SelectItem>
              <SelectItem value="default_code_tools fallback">
                default_code_tools fallback
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ToggleRow
          label="MCP"
          checked={template.settings.mcpEnabled}
          onCheckedChange={(checked) =>
            onUpdate((item) => void (item.settings.mcpEnabled = checked))
          }
        />
        <ToggleRow
          label={t('harnessModules.fields.deleteGuard')}
          checked={template.settings.deleteGuardEnabled}
          onCheckedChange={(checked) =>
            onUpdate((item) => void (item.settings.deleteGuardEnabled = checked))
          }
        />
      </div>
    );
  }

  if (selectedNodeId === 'runtimeServices' || selectedNodeId === 'compact') {
    return (
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <EditableField
            label={t('harnessModules.fields.maxTurns')}
            type="number"
            value={String(template.settings.maxTurns)}
            onChange={(value) =>
              onUpdate(
                (item) => void (item.settings.maxTurns = Number(value || 1))
              )
            }
          />
          <EditableField
            label={t('harnessModules.fields.budgetUsd')}
            value={template.settings.budgetUsd}
            onChange={(value) =>
              onUpdate((item) => void (item.settings.budgetUsd = value))
            }
          />
        </div>
        <ToggleRow
          label={t('harnessModules.fields.hooksEnabled')}
          checked={template.settings.hooksEnabled}
          onCheckedChange={(checked) =>
            onUpdate((item) => void (item.settings.hooksEnabled = checked))
          }
        />
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between rounded-md border px-3 py-2">
        <Label className="text-sm">{t('harnessModules.fields.enabled')}</Label>
        <Checkbox
          checked={config.enabled}
          onCheckedChange={(checked) =>
            onUpdate(
              (item) =>
                void (ensureModuleConfig(item, selectedNodeId).enabled =
                  checked === true)
            )
          }
        />
      </div>
      <EditableField
        label={t('harnessModules.fields.implementation')}
        value={config.implementation}
        onChange={(value) =>
          onUpdate(
            (item) =>
              void (ensureModuleConfig(item, selectedNodeId).implementation = value)
          )
        }
      />
      <EditableArea
        label={t('harnessModules.fields.notes')}
        value={template.notes}
        onChange={(value) => onUpdate((item) => void (item.notes = value))}
      />
    </div>
  );
}

function ToggleRow({
  checked,
  label,
  onCheckedChange
}: {
  checked: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <Label className="text-sm">{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="break-all text-sm">{value}</p>
    </div>
  );
}

function EditableField({
  label,
  onChange,
  type = 'text',
  value
}: {
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function EditableArea({
  label,
  onChange,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-24"
      />
    </div>
  );
}

function moduleConfig(
  implementation: string,
  mode: ModuleMode,
  enabled = true
): ModuleConfig {
  return { enabled, implementation, mode };
}

function getModuleConfig(template: HarnessTemplate, nodeId: string): ModuleConfig {
  return template.modules[nodeId] || moduleConfig(nodeId, 'draft');
}

function ensureModuleConfig(template: HarnessTemplate, nodeId: string): ModuleConfig {
  if (!template.modules[nodeId]) {
    template.modules[nodeId] = moduleConfig(nodeId, 'draft');
  }
  return template.modules[nodeId];
}

function loadDraft(): DraftState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    return syncTemplateScenes({
      ...structuredClone(DEFAULT_STATE),
      ...JSON.parse(raw)
    });
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function syncTemplateScenes(draft: DraftState): DraftState {
  draft.templates.forEach((template) => {
    template.sceneIds = draft.scenes
      .filter((scene) => scene.templateId === template.id)
      .map((scene) => scene.id);
  });
  return draft;
}

function toneClasses(tone: NodeDefinition['tone']) {
  switch (tone) {
    case 'green':
      return 'border-emerald-500/30 bg-emerald-500/5';
    case 'blue':
      return 'border-blue-500/30 bg-blue-500/5';
    case 'orange':
      return 'border-orange-500/30 bg-orange-500/5';
    case 'violet':
      return 'border-violet-500/30 bg-violet-500/5';
    case 'teal':
      return 'border-teal-500/30 bg-teal-500/5';
    default:
      return 'border-border';
  }
}
