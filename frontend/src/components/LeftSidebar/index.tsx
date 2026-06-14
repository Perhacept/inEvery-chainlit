import { useNavigate } from 'react-router-dom';

import { Sidebar, SidebarHeader, SidebarRail } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

import NewChatButton from '../header/NewChat';
import SearchChats from './Search';
import { ThreadHistory } from './ThreadHistory';

type LeftSidebarProps = React.ComponentProps<typeof Sidebar> & {
  showRail?: boolean;
};

export default function LeftSidebar({
  className,
  showRail = true,
  ...props
}: LeftSidebarProps) {
  const navigate = useNavigate();
  return (
    <Sidebar {...props} className={cn('border-none', className)}>
      <SidebarHeader className="py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center">
            <SearchChats />
          </div>
          <div className="flex items-center gap-1">
            <NewChatButton navigate={navigate} />
          </div>
        </div>
      </SidebarHeader>
      <ThreadHistory />
      {showRail ? <SidebarRail /> : null}
    </Sidebar>
  );
}
