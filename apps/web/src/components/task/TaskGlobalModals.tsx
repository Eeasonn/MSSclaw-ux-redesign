import { AiTaskModal } from '@/components/task/AiTaskModal';
import { CreateTaskDialog } from '@/components/task/CreateTaskDialog';
import { TaskResourceExplorer } from '@/components/task/TaskResourceExplorer';
import { useAppViewStore } from '@/stores/appViewStore';
import { useConversationStore } from '@/stores/conversationStore';
import { useHomeStore } from '@/stores/homeStore';
import { useTaskStore } from '@/stores/taskStore';

interface TaskGlobalModalsProps {
  onWorkspaceSwitch?: (workspaceId: string) => void;
  onSubmitTask?: (text: string) => void;
}

/** 侧栏「新建群聊 / 资源 / AI任务」入口：挂在 App 级 */
export function TaskGlobalModals({ onWorkspaceSwitch, onSubmitTask }: TaskGlobalModalsProps) {
  const createDialogOpen = useTaskStore((s) => s.createDialogOpen);
  const closeCreateDialog = useTaskStore((s) => s.closeCreateDialog);
  const aiTaskModalOpen = useTaskStore((s) => s.aiTaskModalOpen);
  const closeAiTaskModal = useTaskStore((s) => s.closeAiTaskModal);
  const createWarRoomSession = useConversationStore((s) => s.createWarRoomSession);
  const setAppView = useAppViewStore((s) => s.setAppView);
  const setDraftText = useHomeStore((s) => s.setDraftText);

  const handleAiSubmit = (text: string) => {
    setDraftText('');
    onSubmitTask?.(text);
  };

  return (
    <>
      {onWorkspaceSwitch ? <TaskResourceExplorer onWorkspaceSwitch={onWorkspaceSwitch} /> : null}
      <CreateTaskDialog
        open={createDialogOpen}
        onClose={closeCreateDialog}
        onCreateWarRoom={(title) => {
          createWarRoomSession(title);
          setAppView('task');
        }}
      />
      <AiTaskModal open={aiTaskModalOpen} onClose={closeAiTaskModal} onSubmit={handleAiSubmit} />
    </>
  );
}
