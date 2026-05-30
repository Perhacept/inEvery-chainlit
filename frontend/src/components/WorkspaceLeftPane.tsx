import { InEveryProject } from 'api';
import { useTranslation } from 'components/i18n/Translator';

import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { Box, BrainCircuit, Code2, LayoutPanelLeft } from 'lucide-react';

interface LeftPaneProps {
  project: InEveryProject;
}

function EmptyPanel({
  icon: Icon,
  title,
  description
}: {
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
      </div>
    </div>
  );
}

export function WorkspaceLeftPane({ project }: LeftPaneProps) {
  const { t } = useTranslation();

  return (
    <div className="flex min-w-0 flex-1 flex-col border-r bg-muted/20">
      <div className="flex min-h-16 items-center justify-between gap-3 border-b bg-background px-4">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate font-semibold">{project.name}</h2>
            <Badge variant="secondary">
              {t(`playground.scenes.${project.scene}`)}
            </Badge>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {project.id}
          </p>
        </div>
      </div>

      <Tabs defaultValue="harness" className="flex min-h-0 flex-1 flex-col">
        <div className="border-b bg-background px-3 py-2">
          <TabsList className="h-9 justify-start">
            <TabsTrigger value="harness" className="gap-2">
              <Code2 className="size-4" />
              {t('workspace.tabs.harness')}
            </TabsTrigger>
            <TabsTrigger value="memory" className="gap-2">
              <BrainCircuit className="size-4" />
              {t('workspace.tabs.memory')}
            </TabsTrigger>
            <TabsTrigger value="scene" className="gap-2">
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
          />
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
