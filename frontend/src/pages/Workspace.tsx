import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState
} from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSetRecoilState } from 'recoil';
import { toast } from 'sonner';

import {
  threadHistoryState,
  useChatInteract,
  useChatMessages,
  useConfig
} from '@chainlit/react-client';

import { apiClient, InEveryProject } from 'api';
import Alert from '@/components/Alert';
import { Loader } from '@/components/Loader';
import LeftSidebar from '@/components/LeftSidebar';
import { WorkspaceLeftPane } from '@/components/WorkspaceLeftPane';
import Chat from '@/components/chat';
import HarnessSettingsDialog from '@/components/HarnessSettingsDialog';
import Translator, { useTranslation } from 'components/i18n/Translator';
import Page from 'pages/Page';
import { userEnvState } from 'state/user';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen
} from 'lucide-react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup
} from '@/components/ui/resizable';
import {
  SidebarProvider,
  useSidebar
} from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';

interface ProjectSessionBridgeProps {
  project: InEveryProject;
  startNew: boolean;
  threadIdToResume?: string;
  activeThreadId?: string;
  newChatKey?: string;
}

interface WorkspaceChatPanelsProps {
  project: InEveryProject;
  chatReady: boolean;
  onBackToPlayground: () => void;
  onCollapseChat: () => void;
}

function WorkspaceChatPanels({
  project,
  chatReady,
  onBackToPlayground,
  onCollapseChat
}: WorkspaceChatPanelsProps) {
  const { t } = useTranslation();
  const { isMobile, open, openMobile, setOpen, setOpenMobile } = useSidebar();
  const historyOpen = isMobile ? openMobile : open;
  const showHistoryPanel = open && !isMobile;
  const historyToggleLabel = historyOpen
    ? t('workspace.chat.history.close')
    : t('workspace.chat.history.open');
  const toggleHistory = () => {
    if (isMobile) {
      setOpenMobile(!openMobile);
      return;
    }
    setOpen(!open);
  };

  return (
    <ResizablePanelGroup
      key={showHistoryPanel ? 'with-chat-history' : 'chat-only'}
      direction="horizontal"
      className="h-full w-full"
    >
      {showHistoryPanel ? (
        <>
          <ResizablePanel
            minSize={18}
            defaultSize={24}
            className="min-w-[220px]"
          >
            <LeftSidebar
              side="left"
              collapsible="offcanvas"
              embedded
              className="border-r"
              showRail={false}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
        </>
      ) : null}
      <ResizablePanel minSize={30} defaultSize={showHistoryPanel ? 76 : 100}>
        <aside className="flex h-full min-h-0 w-full min-w-[320px] flex-col bg-background">
          <div className="flex min-h-16 items-center justify-between gap-3 border-b px-4">
            <div className="flex min-w-0 items-center gap-2">
              <WorkspaceTooltipButton
                label={historyToggleLabel}
                onClick={toggleHistory}
                className="hidden lg:inline-flex"
              >
                {historyOpen ? (
                  <PanelLeftClose className="size-4" />
                ) : (
                  <PanelLeftOpen className="size-4" />
                )}
              </WorkspaceTooltipButton>
              <div className="min-w-0">
                <h2 className="truncate font-semibold">
                  {t('workspace.chat.title')}
                </h2>
                <p className="truncate text-xs text-muted-foreground">
                  {project.name}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <WorkspaceTooltipButton
                label={t('workspace.chat.collapsePanel')}
                onClick={onCollapseChat}
                className="hidden lg:inline-flex"
              >
                <PanelRightClose className="size-4" />
              </WorkspaceTooltipButton>
              <button
                type="button"
                onClick={onBackToPlayground}
                className="rounded-md border px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                {t('workspace.actions.backToPlayground')}
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            {chatReady ? (
              <Chat />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Loader className="!size-6" />
              </div>
            )}
          </div>
        </aside>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

function WorkspaceTooltipButton({
  children,
  className,
  label,
  onClick
}: {
  children: ReactNode;
  className?: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={label}
            onClick={onClick}
            className={cn(
              'h-8 w-8 text-muted-foreground hover:text-foreground',
              className
            )}
          >
            {children}
            <span className="sr-only">{label}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ProjectChatCollapsedRail({ onOpen }: { onOpen: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="flex h-12 w-full shrink-0 items-center justify-center border-t bg-background px-2 py-2 lg:h-full lg:w-12 lg:items-start lg:border-l lg:border-t-0 lg:py-3">
      <WorkspaceTooltipButton
        label={t('workspace.chat.expandPanel')}
        onClick={onOpen}
      >
        <PanelRightOpen className="size-4" />
      </WorkspaceTooltipButton>
    </div>
  );
}

function ProjectSessionBridge({
  project,
  startNew,
  threadIdToResume,
  activeThreadId,
  newChatKey
}: ProjectSessionBridgeProps) {
  const initializedProjectRef = useRef<string>();
  const setUserEnv = useSetRecoilState(userEnvState);
  const setThreadHistory = useSetRecoilState(threadHistoryState);
  const { clear, setIdToResume } = useChatInteract();
  const { config } = useConfig();

  useEffect(() => {
    apiClient
      .getInEverySettings()
      .then((settings) => {
        setUserEnv((previous) => {
          const next = { ...previous, ...settings.userEnv };
          localStorage.setItem('userEnv', JSON.stringify(next));
          return next;
        });
      })
      .catch(() => undefined);
  }, [setUserEnv]);

  useEffect(() => {
    if (!config?.threadResumable) return;
    const targetThreadId = startNew
      ? undefined
      : threadIdToResume || project.threadId;
    const bridgeKey = `${project.id}:${targetThreadId || 'new'}:${
      startNew ? newChatKey || '' : ''
    }`;

    if (initializedProjectRef.current === bridgeKey) return;

    initializedProjectRef.current = bridgeKey;

    if (!startNew && targetThreadId && activeThreadId === targetThreadId) {
      setThreadHistory((previous) => ({
        ...previous,
        currentThreadId: targetThreadId
      }));
      return;
    }

    setUserEnv((previous) => {
      const next = {
        ...previous,
        inevery_project_id: project.id,
        inevery_project_name: project.name,
        inevery_scene_type: project.scene
      };
      localStorage.setItem('userEnv', JSON.stringify(next));
      return next;
    });

    clear();
    setThreadHistory((previous) => ({
      ...previous,
      currentThreadId: targetThreadId,
      pageInfo: undefined,
      threads: undefined,
      timeGroupedThreads: undefined
    }));
    setIdToResume(targetThreadId);
  }, [
    clear,
    config?.threadResumable,
    project.id,
    project.name,
    project.scene,
    project.threadId,
    setIdToResume,
    setThreadHistory,
    setUserEnv,
    startNew,
    threadIdToResume,
    activeThreadId,
    newChatKey
  ]);

  return null;
}

export default function Workspace() {
  const { projectId, threadId: routeThreadId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { config } = useConfig();
  const { threadId } = useChatMessages();
  const [project, setProject] = useState<InEveryProject>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [projectChatOpen, setProjectChatOpen] = useState(true);
  const startNew = location.pathname.endsWith('/new');
  const targetThreadId = project && !startNew
    ? routeThreadId || project.threadId
    : undefined;

  useEffect(() => {
    if (!projectId) return;

    const loadProject = async () => {
      try {
        setIsLoading(true);
        setProject(await apiClient.getInEveryProject(projectId));
        setError(undefined);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    loadProject();
  }, [projectId]);

  useEffect(() => {
    if (!startNew || !threadId || !project) return;

    navigate(`/workspace/${project.id}/thread/${threadId}`, { replace: true });
  }, [navigate, project, startNew, threadId]);

  if (isLoading) {
    return (
      <Page
        showGlobalSidebar={false}
        showHeaderNewChatButton={false}
        showRightRail={false}
      >
        <div className="flex flex-grow items-center justify-center">
          <Loader className="!size-6" />
        </div>
      </Page>
    );
  }

  if (error || !project) {
    return (
      <Page
        showGlobalSidebar={false}
        showHeaderNewChatButton={false}
        showRightRail={false}
      >
        <div className="flex flex-grow items-center justify-center p-6">
          <Alert variant="error" className="max-w-lg">
            {error || <Translator path="workspace.errors.notFound" />}
          </Alert>
        </div>
      </Page>
    );
  }

  const chatReady =
    !config?.threadResumable || startNew || threadId === targetThreadId;

  return (
    <Page
      showGlobalSidebar={false}
      showHeaderNewChatButton={false}
      showRightRail={false}
      onOpenGlobalSettings={() => setSettingsOpen(true)}
    >
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden lg:flex-row">
        <ProjectSessionBridge
          project={project}
          startNew={startNew}
          threadIdToResume={routeThreadId}
          activeThreadId={threadId}
          newChatKey={location.search}
        />
        <WorkspaceLeftPane project={project} />
        {projectChatOpen ? (
          <SidebarProvider
            defaultOpen
            persistState={false}
            className="min-h-[44vh] w-full border-t bg-background lg:min-h-0 lg:flex-1 lg:border-l lg:border-t-0"
            style={
              {
                '--sidebar-width': '100%'
              } as CSSProperties
            }
          >
            <WorkspaceChatPanels
              project={project}
              chatReady={chatReady}
              onBackToPlayground={() => navigate('/')}
              onCollapseChat={() => setProjectChatOpen(false)}
            />
          </SidebarProvider>
        ) : (
          <ProjectChatCollapsedRail onOpen={() => setProjectChatOpen(true)} />
        )}
        <HarnessSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          projectId={project.id}
          sceneType={project.scene}
        />
      </div>
    </Page>
  );
}
