import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useAuth } from '@chainlit/react-client';

import { apiClient, InEveryProject, InEverySceneType } from 'api';
import { useTranslation } from 'components/i18n/Translator';

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
import { Textarea } from '@/components/ui/textarea';
import HarnessSettingsDialog from '@/components/HarnessSettingsDialog';

import {
  Box,
  Code2,
  FileText,
  LayoutGrid,
  NotebookTabs,
  PenLine,
  Plus,
  Settings2,
  Video
} from 'lucide-react';

const SCENES: Array<{
  value: InEverySceneType;
  icon: typeof Code2;
}> = [
  { value: 'code', icon: Code2 },
  { value: 'notebook', icon: NotebookTabs },
  { value: 'video-generate', icon: Video },
  { value: '3d-art-generate', icon: Box },
  { value: 'writing', icon: PenLine }
];

const TEMPLATE_SCENE: InEverySceneType = 'code';

function sceneIcon(scene: InEverySceneType) {
  return SCENES.find((item) => item.value === scene)?.icon || FileText;
}

export default function Playground() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [projects, setProjects] = useState<InEveryProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [scene, setScene] = useState<InEverySceneType>(TEMPLATE_SCENE);
  const [brief, setBrief] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const sortedProjects = useMemo(
    () =>
      [...projects].sort((a, b) =>
        (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt)
      ),
    [projects]
  );

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      setProjects(await apiClient.listInEveryProjects());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const openCreateDialog = (defaults?: {
    name?: string;
    scene?: InEverySceneType;
  }) => {
    setProjectName(defaults?.name || '');
    setScene(defaults?.scene || TEMPLATE_SCENE);
    setBrief('');
    setDialogOpen(true);
  };

  const handleCreateProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!projectName.trim()) {
      return;
    }

    try {
      setIsCreating(true);
      const project = await apiClient.createInEveryProject({
        name: projectName.trim(),
        scene,
        config: {
          brief: brief.trim(),
          template: scene === 'code' ? 'code-harness-starter' : 'blank'
        }
      });
      setDialogOpen(false);
      navigate(`/workspace/${project.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-background/95">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md border bg-muted">
              <LayoutGrid className="size-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold">
                {t('playground.title')}
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                {user?.display_name || user?.identifier}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettingsOpen(true)}
              type="button"
            >
              <Settings2 className="mr-2 size-4" />
              {t('playground.actions.settings')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logout(true)}
              type="button"
            >
              {t('navigation.user.menu.logout')}
            </Button>
            <Button size="sm" onClick={() => openCreateDialog()} type="button">
              <Plus className="mr-2 size-4" />
              {t('playground.actions.newProject')}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6">
        <section className="grid gap-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase text-muted-foreground">
                {t('playground.templates.title')}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('playground.templates.subtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              openCreateDialog({
                name: t('playground.templates.codeHarness.defaultName'),
                scene: 'code'
              })
            }
            className="group grid min-h-36 rounded-lg border bg-card p-5 text-left shadow-sm transition hover:border-primary/60 hover:bg-accent/30 sm:max-w-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Code2 className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold">
                    {t('playground.templates.codeHarness.title')}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t('playground.templates.codeHarness.description')}
                  </p>
                </div>
              </div>
              <Badge variant="secondary">
                {t('playground.scenes.code')}
              </Badge>
            </div>
          </button>
        </section>

        <section className="grid gap-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase text-muted-foreground">
                {t('playground.projects.title')}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('playground.projects.subtitle')}
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-lg border p-6 text-sm text-muted-foreground">
              {t('common.status.loading')}
            </div>
          ) : sortedProjects.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {sortedProjects.map((project) => {
                const Icon = sceneIcon(project.scene);
                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => navigate(`/workspace/${project.id}`)}
                    className="group min-h-40 rounded-lg border bg-card p-5 text-left shadow-sm transition hover:border-primary/60 hover:bg-accent/30"
                  >
                    <div className="flex h-full flex-col justify-between gap-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate font-semibold">
                            {project.name}
                          </h3>
                          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                            {String(project.config?.brief || '') ||
                              t('playground.projects.emptyBrief')}
                          </p>
                        </div>
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted">
                          <Icon className="size-4" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <Badge variant="outline">
                          {t(`playground.scenes.${project.scene}`)}
                        </Badge>
                        <span className="truncate text-xs text-muted-foreground">
                          {project.updatedAt?.slice(0, 10)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border p-6 text-sm text-muted-foreground">
              {t('playground.projects.empty')}
            </div>
          )}
        </section>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleCreateProject}>
            <DialogHeader>
              <DialogTitle>{t('playground.dialog.title')}</DialogTitle>
              <DialogDescription>
                {t('playground.dialog.description')}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-5">
              <div className="grid gap-2">
                <Label htmlFor="project-name">
                  {t('playground.dialog.fields.name.label')}
                </Label>
                <Input
                  id="project-name"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  placeholder={t('playground.dialog.fields.name.placeholder')}
                  autoFocus
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label>{t('playground.dialog.fields.scene.label')}</Label>
                <Select
                  value={scene}
                  onValueChange={(value) => setScene(value as InEverySceneType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCENES.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {t(`playground.scenes.${item.value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="project-brief">
                  {t('playground.dialog.fields.brief.label')}
                </Label>
                <Textarea
                  id="project-brief"
                  value={brief}
                  onChange={(event) => setBrief(event.target.value)}
                  placeholder={t('playground.dialog.fields.brief.placeholder')}
                  rows={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                {t('common.actions.cancel')}
              </Button>
              <Button type="submit" disabled={isCreating || !projectName.trim()}>
                {isCreating
                  ? t('playground.dialog.actions.creating')
                  : t('playground.dialog.actions.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <HarnessSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </div>
  );
}
