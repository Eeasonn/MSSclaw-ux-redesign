import { canExecuteChat, READONLY_EXECUTE_HINT } from '@/domain/permissions';
import { useAppViewStore } from '@/stores/appViewStore';
import { useConversationStore } from '@/stores/conversationStore';
import { useHomeStore } from '@/stores/homeStore';

/**
 * 新建 Agent 任务的唯一入口：打开右侧主内容区的「开启一个任务」页。
 */
export function openAiAssistantForNewTask() {
  if (!canExecuteChat()) {
    useConversationStore.setState({ pushToast: READONLY_EXECUTE_HINT });
    useAppViewStore.getState().setAppView('home');
    return;
  }
  useHomeStore.getState().setDraftText('');
  useHomeStore.getState().requestComposerFocus();
  useAppViewStore.getState().setAppView('new-task');
}
