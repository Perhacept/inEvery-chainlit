import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetRecoilState } from 'recoil';
import { toast } from 'sonner';

import {
  apiClient,
  InEveryHarnessSettings,
  InEveryHarnessSettingsResponse,
  InEverySceneType,
  InEveryToolDebugResponse,
  InEveryToolDefinition
} from 'api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'components/i18n/Translator';
import { userEnvState } from 'state/user';
import {
  Bug,
  CircuitBoard,
  Download,
  FolderOpen,
  Play,
  Search,
  Settings2,
  Upload,
  Wrench
} from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  sceneType?: InEverySceneType;
}

type FormState = {
  language: 'browser' | 'en-US' | 'zh-CN';
  error_max_turns: string;
  error_max_budget_usd: string;
  hooks_enabled: boolean;
  mcp_enabled: boolean;
  delete_guard_enabled: boolean;
};

const DEFAULT_FORM: FormState = {
  language: 'browser',
  error_max_turns: '8',
  error_max_budget_usd: '',
  hooks_enabled: true,
  mcp_enabled: true,
  delete_guard_enabled: true
};

export default function HarnessSettingsDialog({
  open,
  onOpenChange,
  projectId,
  sceneType
}: Props) {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<InEveryHarnessSettingsResponse>();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [tools, setTools] = useState<InEveryToolDefinition[]>([]);
  const [toolFilter, setToolFilter] = useState('');
  const [selectedToolName, setSelectedToolName] = useState('');
  const [debugInput, setDebugInput] = useState('{}');
  const [debugResult, setDebugResult] = useState<InEveryToolDebugResponse>();
  const [isDebugging, setIsDebugging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const setUserEnv = useSetRecoilState(userEnvState);
  const { t, i18n } = useTranslation();

  const storagePath = settings?.path || '';
  const isDirty = useMemo(() => {
    if (!settings) return false;
    const data = settings.data;
    return (
      form.language !== normalizeLanguage(data.language) ||
      Number(form.error_max_turns || 8) !== Number(data.error_max_turns || 8) ||
      form.error_max_budget_usd !==
        (data.error_max_budget_usd == null
          ? ''
          : String(data.error_max_budget_usd)) ||
      form.hooks_enabled !== Boolean(data.hooks_enabled) ||
      form.mcp_enabled !== Boolean(data.mcp_enabled) ||
      form.delete_guard_enabled !== Boolean(data.delete_guard_enabled)
    );
  }, [form, settings]);

  const filteredTools = useMemo(() => {
    const query = toolFilter.trim().toLowerCase();
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
  }, [toolFilter, tools]);

  const selectedTool = useMemo(
    () => tools.find((tool) => tool.name === selectedToolName),
    [selectedToolName, tools]
  );

  useEffect(() => {
    if (!open) return;
    apiClient
      .getInEverySettings()
      .then((payload) => {
        setSettings(payload);
        setForm(settingsToForm(payload.data));
        syncUserEnv(payload.userEnv);
      })
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : String(error))
      );
  }, [open]);

  useEffect(() => {
    if (!open) return;
    apiClient
      .listInEveryTools(resolveToolLocale(form.language, i18n.language))
      .then((payload) => {
        setTools(payload);
        setSelectedToolName((current) => current || payload[0]?.name || '');
      })
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : String(error))
      );
  }, [form.language, i18n.language, open]);

  const syncUserEnv = (userEnv: Record<string, string>) => {
    setUserEnv((previous) => {
      const next = { ...previous, ...userEnv };
      localStorage.setItem('userEnv', JSON.stringify(next));
      return next;
    });
  };

  const save = async (nextForm = form) => {
    setIsSaving(true);
    try {
      const payload = await apiClient.updateInEverySettings(formToSettings(nextForm));
      setSettings(payload);
      setForm(settingsToForm(payload.data));
      syncUserEnv(payload.userEnv);
      toast.success(t('harnessSettings.status.saved'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSaving(false);
    }
  };

  const exportSettings = () => {
    if (!settings) return;
    const blob = new Blob([JSON.stringify(settings.data, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'inevery-harness-settings.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error(t('harnessSettings.errors.jsonObject'));
      }
      const nextForm = settingsToForm(payload as InEveryHarnessSettings);
      setForm(nextForm);
      await save(nextForm);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  const runToolDebug = async (dryRun: boolean) => {
    if (!selectedToolName) return;
    let parsedInput: Record<string, unknown>;
    try {
      const parsed = JSON.parse(debugInput || '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(t('harnessSettings.errors.toolInputObject'));
      }
      parsedInput = parsed as Record<string, unknown>;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
      return;
    }

    setIsDebugging(true);
    try {
      const response = await apiClient.debugInEveryTool({
        toolName: selectedToolName,
        arguments: parsedInput,
        projectId,
        sceneType,
        language: resolveToolLocale(form.language, i18n.language),
        dryRun
      });
      setDebugResult(response);
      if (response.error) {
        toast.error(response.error);
      } else {
        toast.success(
          dryRun
            ? t('harnessSettings.status.validated')
            : t('harnessSettings.status.executed')
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsDebugging(false);
    }
  };

  const openModulesPage = () => {
    onOpenChange(false);
    navigate('/harness/modules');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-[860px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="size-5" />
            {t('harnessSettings.title')}
          </DialogTitle>
          <DialogDescription>
            {t('harnessSettings.description')}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="settings" className="min-h-0">
          <TabsList>
            <TabsTrigger value="settings">
              <Settings2 className="mr-2 size-4" />
              {t('harnessSettings.tabs.settings')}
            </TabsTrigger>
            <TabsTrigger value="tools">
              <Wrench className="mr-2 size-4" />
              {t('harnessSettings.tabs.tools')}
            </TabsTrigger>
            <TabsTrigger value="modules">
              <CircuitBoard className="mr-2 size-4" />
              {t('harnessSettings.tabs.modules')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="max-h-[58vh] overflow-y-auto">
            <div className="grid gap-5 py-2 pr-1">
              <section className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="ui-language">
                    {t('harnessSettings.fields.language')}
                  </Label>
                  <Select
                    value={form.language}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        language: value as FormState['language']
                      }))
                    }
                  >
                    <SelectTrigger id="ui-language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="browser">
                        {t('harnessSettings.fields.browserLanguage')}
                      </SelectItem>
                      <SelectItem value="en-US">
                        {t('harnessSettings.fields.english')}
                      </SelectItem>
                      <SelectItem value="zh-CN">
                        {t('harnessSettings.fields.chinese')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="max-turns">
                      {t('harnessSettings.fields.maxTurns')}
                    </Label>
                    <Input
                      id="max-turns"
                      type="number"
                      min={1}
                      value={form.error_max_turns}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          error_max_turns: event.target.value
                        }))
                      }
                    />
                    <p className="text-xs leading-5 text-muted-foreground">
                      {t('harnessSettings.fields.maxTurnsDescription')}
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="max-budget">
                      {t('harnessSettings.fields.maxBudget')}
                    </Label>
                    <Input
                      id="max-budget"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder={t('harnessSettings.fields.unlimited')}
                      value={form.error_max_budget_usd}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          error_max_budget_usd: event.target.value
                        }))
                      }
                    />
                  </div>
                </div>
              </section>

              <Separator />

              <section className="grid gap-3">
                <SettingSwitch
                  label={t('harnessSettings.fields.customHooks')}
                  checked={form.hooks_enabled}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({ ...current, hooks_enabled: checked }))
                  }
                />
                <SettingSwitch
                  label={t('harnessSettings.fields.mcpTools')}
                  checked={form.mcp_enabled}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({ ...current, mcp_enabled: checked }))
                  }
                />
                <SettingSwitch
                  label={t('harnessSettings.fields.deleteGuard')}
                  checked={form.delete_guard_enabled}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({
                      ...current,
                      delete_guard_enabled: checked
                    }))
                  }
                />
                <p className="px-1 text-xs text-muted-foreground">
                  {t('harnessSettings.fields.deleteGuardDescription')}
                </p>
              </section>

              <div className="rounded-md border bg-muted/35 p-3">
                <div className="flex items-start gap-2">
                  <FolderOpen className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      {t('harnessSettings.fields.savePath')}
                    </p>
                    <p className="break-all text-sm">
                      {storagePath || t('harnessSettings.fields.loading')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tools" className="max-h-[58vh] overflow-y-auto">
            <div className="grid gap-4 py-2 pr-1">
              <div className="grid gap-2">
                <Label htmlFor="tool-filter">
                  {t('harnessSettings.fields.toolSearch')}
                </Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input
                    id="tool-filter"
                    value={toolFilter}
                    onChange={(event) => setToolFilter(event.target.value)}
                    className="pl-9"
                    placeholder={t(
                      'harnessSettings.fields.toolSearchPlaceholder'
                    )}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>{t('harnessSettings.fields.availableTool')}</Label>
                <Select
                  value={selectedToolName}
                  onValueChange={(value) => {
                    setSelectedToolName(value);
                    setDebugResult(undefined);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t('harnessSettings.fields.selectTool')}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredTools.map((tool) => (
                      <SelectItem key={tool.name} value={tool.name}>
                        {tool.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTool ? (
                <section className="grid gap-3 rounded-md border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{selectedTool.category}</Badge>
                    {selectedTool.readOnly ? (
                      <Badge variant="outline">
                        {t('harnessSettings.badges.read')}
                      </Badge>
                    ) : null}
                    {selectedTool.destructive ? (
                      <Badge variant="destructive">
                        {t('harnessSettings.badges.destructive')}
                      </Badge>
                    ) : null}
                    {!selectedTool.enabled ? (
                      <Badge variant="destructive">
                        {t('harnessSettings.badges.disabled')}
                      </Badge>
                    ) : null}
                    {selectedTool.deferred ? (
                      <Badge variant="outline">
                        {t('harnessSettings.badges.deferred')}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {selectedTool.description}
                  </p>
                  <div className="grid gap-2">
                    <Label>{t('harnessSettings.fields.inputSchema')}</Label>
                    <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">
                      {JSON.stringify(selectedTool.schema, null, 2)}
                    </pre>
                  </div>
                </section>
              ) : null}

              <section className="grid gap-3">
                <Label htmlFor="tool-debug-input">
                  {t('harnessSettings.fields.debugInput')}
                </Label>
                <Textarea
                  id="tool-debug-input"
                  value={debugInput}
                  onChange={(event) => setDebugInput(event.target.value)}
                  className="min-h-32 font-mono text-xs"
                  spellCheck={false}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isDebugging || !selectedToolName}
                    onClick={() => runToolDebug(true)}
                  >
                    <Bug className="mr-2 size-4" />
                    {t('harnessSettings.actions.dryRun')}
                  </Button>
                  <Button
                    type="button"
                    disabled={isDebugging || !selectedToolName}
                    onClick={() => runToolDebug(false)}
                  >
                    <Play className="mr-2 size-4" />
                    {t('harnessSettings.actions.execute')}
                  </Button>
                </div>
              </section>

              {debugResult ? (
                <section className="grid gap-2">
                  <Label>{t('harnessSettings.fields.debugResult')}</Label>
                  <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs">
                    {JSON.stringify(debugResult, null, 2)}
                  </pre>
                </section>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="modules" className="max-h-[58vh] overflow-y-auto">
            <div className="grid gap-4 py-2 pr-1">
              <section className="rounded-md border bg-muted/30 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-background">
                    <CircuitBoard className="size-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold">
                      {t('harnessSettings.modules.title')}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {t('harnessSettings.modules.description')}
                    </p>
                    <Button
                      type="button"
                      className="mt-4"
                      onClick={openModulesPage}
                    >
                      <CircuitBoard className="mr-2 size-4" />
                      {t('harnessSettings.modules.open')}
                    </Button>
                  </div>
                </div>
              </section>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={importSettings}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 size-4" />
              {t('harnessSettings.actions.import')}
            </Button>
            <Button type="button" variant="outline" onClick={exportSettings}>
              <Download className="mr-2 size-4" />
              {t('harnessSettings.actions.export')}
            </Button>
          </div>
          <Button type="button" disabled={isSaving || !isDirty} onClick={() => save()}>
            {isSaving
              ? t('harnessSettings.actions.saving')
              : t('harnessSettings.actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SettingSwitch({
  label,
  checked,
  onCheckedChange
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border px-3 py-2">
      <Label className="text-sm">{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function settingsToForm(settings: InEveryHarnessSettings): FormState {
  return {
    language: normalizeLanguage(settings.language),
    error_max_turns: String(settings.error_max_turns || 8),
    error_max_budget_usd:
      settings.error_max_budget_usd == null ? '' : String(settings.error_max_budget_usd),
    hooks_enabled: settings.hooks_enabled !== false,
    mcp_enabled: settings.mcp_enabled !== false,
    delete_guard_enabled: settings.delete_guard_enabled !== false
  };
}

function formToSettings(form: FormState): Partial<InEveryHarnessSettings> {
  const turns = Number(form.error_max_turns || 8);
  const budget =
    form.error_max_budget_usd.trim() === ''
      ? null
      : Number(form.error_max_budget_usd);
  return {
    language: form.language,
    error_max_turns: Number.isFinite(turns) && turns > 0 ? turns : 8,
    error_max_budget_usd:
      budget == null || !Number.isFinite(budget) || budget <= 0 ? null : budget,
    hooks_enabled: form.hooks_enabled,
    mcp_enabled: form.mcp_enabled,
    delete_guard_enabled: form.delete_guard_enabled
  };
}

function normalizeLanguage(value: unknown): 'browser' | 'en-US' | 'zh-CN' {
  return value === 'en-US' || value === 'zh-CN' ? value : 'browser';
}

function resolveToolLocale(
  value: FormState['language'],
  fallbackLanguage: string
): string {
  return value === 'browser' ? fallbackLanguage : value;
}
