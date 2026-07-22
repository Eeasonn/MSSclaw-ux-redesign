import { useMemo, useState } from 'react';
import { isWarRoom } from '@/domain/chat';
import { cn } from '@/lib/utils';
import { useAppViewStore } from '@/stores/appViewStore';
import { useConversationStore } from '@/stores/conversationStore';

const MAX_VISIBLE = 8;

function formatRelativeTime(ts?: number): string {
  if (!ts || ts <= 0) return '';
  const now = Date.now();
  const diff = now - ts;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 10) return '刚刚';
  if (seconds < 60) return `${seconds}秒前`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return new Date(ts).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

export function SidebarTaskPanel() {
  const [expanded, setExpanded] = useState(true);
  const appView = useAppViewStore((s) => s.appView);
  const setAppView = useAppViewStore((s) => s.setAppView);
  const chats = useConversationStore((s) => s.chats);
  const currentChatId = useConversationStore((s) => s.currentChatId);
  const switchChat = useConversationStore((s) => s.switchChat);

  const tasks = useMemo(() => {
    return Object.values(chats)
      .filter((c) => c.type === 'bot' || isWarRoom(c))
      .sort((a, b) => (b.pinnedAt ?? b.createdAt ?? 0) - (a.pinnedAt ?? a.createdAt ?? 0));
  }, [chats]);

  const visible = tasks.slice(0, MAX_VISIBLE);
  const total = tasks.length;

  const openTask = (chatId: string) => {
    switchChat(chatId);
    setAppView('task');
  };

  if (total === 0 && !expanded) {
    return null;
  }

  return (
    <div className="sidebar-task-panel border-t border-black/[0.06] bg-zinc-50/60">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-[12px] font-semibold text-zinc-600 transition hover:bg-black/[0.03]"
        title={expanded ? '收起任务' : '展开任务'}
      >
        <span>
          任务 <span className="ml-0.5 text-[11px] font-normal text-zinc-400">({total})</span>
        </span>
        <i
          className={cn(
            'fa-solid fa-chevron-down text-[10px] text-zinc-400 transition-transform',
            !expanded && '-rotate-90',
          )}
        />
      </button>

      {expanded && (
        <div className="max-h-[260px] overflow-y-auto scroll-hidden px-2 pb-2">
          {visible.map((chat) => {
            const warroom = isWarRoom(chat);
            const active = appView === 'task' && currentChatId === chat.id;
            return (
              <button
                key={chat.id}
                type="button"
                onClick={() => openTask(chat.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] text-zinc-600 transition hover:bg-black/[0.04] hover:text-zinc-900',
                  active && 'bg-black/[0.05] font-medium text-zinc-900',
                )}
                title={warroom ? `协作室：${chat.title}` : chat.title}
              >
                <span className="min-w-0 flex-1 truncate">
                  {warroom ? `协作室：${chat.title}` : chat.title}
                </span>
                <span className="flex shrink-0 items-center gap-1 text-[10px] text-zinc-400">
                  {warroom && <i className="fa-solid fa-users text-[10px] text-indigo-500" />}
                  {formatRelativeTime(chat.pinnedAt ?? chat.createdAt)}
                </span>
              </button>
            );
          })}
          {total === 0 && (
            <div className="px-2 py-2 text-[11px] text-zinc-400">暂无任务，点击上方按钮开启</div>
          )}
        </div>
      )}
    </div>
  );
}
