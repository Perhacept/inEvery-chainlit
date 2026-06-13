import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useSetRecoilState } from 'recoil';
import { toast } from 'sonner';

import {
  apiClient,
  InEveryHarnessSettings,
  InEveryHarnessSettingsResponse
} from 'api';
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
import { userEnvState } from 'state/user';
import { Download, FolderOpen, Settings2, Upload } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FormState = {
  permission_mode: 'default' | 'bypass';
  error_max_turns: string;
  error_max_budget_usd: string;
  hooks_enabled: boolean;
  mcp_enabled: boolean;
};

const DEFAULT_FORM: FormState = {
  permission_mode: 'default',
  error_max_turns: '8',
  error_max_budget_usd: '',
  hooks_enabled: true,
  mcp_enabled: true
};

export default function HarnessSettingsDialog({ open, onOpenChange }: Props) {
  const [settings, setSettings] = useState<InEveryHarnessSettingsResponse>();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const setUserEnv = useSetRecoilState(userEnvState);

  const storagePath = settings?.path || '';
  const isDirty = useMemo(() => {
    if (!settings) return false;
    const data = settings.data;
    return (
      form.permission_mode !== normalizePermission(data.permission_mode) ||
      Number(form.error_max_turns || 8) !== Number(data.error_max_turns || 8) ||
      form.error_max_budget_usd !==
        (data.error_max_budget_usd == null
          ? ''
          : String(data.error_max_budget_usd)) ||
      form.hooks_enabled !== Boolean(data.hooks_enabled) ||
      form.mcp_enabled !== Boolean(data.mcp_enabled)
    );
  }, [form, settings]);

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
      toast.success('Harness settings saved');
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
        throw new Error('Settings file must contain a JSON object');
      }
      const nextForm = settingsToForm(payload as InEveryHarnessSettings);
      setForm(nextForm);
      await save(nextForm);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="size-5" />
            Harness settings
          </DialogTitle>
          <DialogDescription>
            User-level defaults for agent loop limits, tool approval, hooks and MCP.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          <section className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="permission-mode">Tool permission mode</Label>
              <Select
                value={form.permission_mode}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    permission_mode: value as FormState['permission_mode']
                  }))
                }
              >
                <SelectTrigger id="permission-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Ask for approval</SelectItem>
                  <SelectItem value="bypass">Full access</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="max-turns">Max turns</Label>
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
              </div>
              <div className="grid gap-2">
                <Label htmlFor="max-budget">Max budget USD</Label>
                <Input
                  id="max-budget"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Unlimited"
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
              label="Custom hooks"
              checked={form.hooks_enabled}
              onCheckedChange={(checked) =>
                setForm((current) => ({ ...current, hooks_enabled: checked }))
              }
            />
            <SettingSwitch
              label="Project MCP tools"
              checked={form.mcp_enabled}
              onCheckedChange={(checked) =>
                setForm((current) => ({ ...current, mcp_enabled: checked }))
              }
            />
          </section>

          <div className="rounded-md border bg-muted/35 p-3">
            <div className="flex items-start gap-2">
              <FolderOpen className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Save path
                </p>
                <p className="break-all text-sm">{storagePath || 'Loading...'}</p>
              </div>
            </div>
          </div>
        </div>

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
              Import
            </Button>
            <Button type="button" variant="outline" onClick={exportSettings}>
              <Download className="mr-2 size-4" />
              Export
            </Button>
          </div>
          <Button type="button" disabled={isSaving || !isDirty} onClick={() => save()}>
            {isSaving ? 'Saving...' : 'Save'}
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
    permission_mode: normalizePermission(settings.permission_mode),
    error_max_turns: String(settings.error_max_turns || 8),
    error_max_budget_usd:
      settings.error_max_budget_usd == null ? '' : String(settings.error_max_budget_usd),
    hooks_enabled: settings.hooks_enabled !== false,
    mcp_enabled: settings.mcp_enabled !== false
  };
}

function formToSettings(form: FormState): Partial<InEveryHarnessSettings> {
  const turns = Number(form.error_max_turns || 8);
  const budget =
    form.error_max_budget_usd.trim() === ''
      ? null
      : Number(form.error_max_budget_usd);
  return {
    permission_mode: form.permission_mode,
    error_max_turns: Number.isFinite(turns) && turns > 0 ? turns : 8,
    error_max_budget_usd:
      budget == null || !Number.isFinite(budget) || budget <= 0 ? null : budget,
    hooks_enabled: form.hooks_enabled,
    mcp_enabled: form.mcp_enabled
  };
}

function normalizePermission(value: unknown): 'default' | 'bypass' {
  return value === 'bypass' || value === 'full_access' ? 'bypass' : 'default';
}
