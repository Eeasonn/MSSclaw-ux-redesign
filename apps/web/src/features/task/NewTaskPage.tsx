import { useEffect } from 'react';
import type { PrototypeAgentSeed } from '@/domain/prototype/types';
import { SharedComposer } from '@/components/chat/SharedComposer';
import { useHomeStore } from '@/stores/homeStore';

interface NewTaskPageProps {
  onSubmitTask: (text: string, agent?: PrototypeAgentSeed | null) => void;
}

/**
 * 右侧主内容区的任务发起页。
 * 参考原版 AI 任务弹窗的大输入框，但用干净的白色留白、去掉推荐技能区。
 */
export function NewTaskPage({ onSubmitTask }: NewTaskPageProps) {
  const draftText = useHomeStore((s) => s.draftText);
  const setDraftText = useHomeStore((s) => s.setDraftText);
  const requestComposerFocus = useHomeStore((s) => s.requestComposerFocus);

  useEffect(() => {
    requestComposerFocus();
  }, [requestComposerFocus]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto scroll-hidden bg-white">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-md">
            <i className="fa-solid fa-sparkles text-xl" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">开启一个任务</h1>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-zinc-500">
            描述你想完成的事，AI 会自动匹配专家与技能。
          </p>
        </div>

        <SharedComposer
          variant="landing"
          value={draftText}
          onChange={setDraftText}
          onSubmit={(text) =>
            onSubmitTask(text, useHomeStore.getState().resolveAgentFromText(text))
          }
          placeholder="例如：分析本周各代表处 SO 排名，剔除 IoT 后生成周报…"
        />
      </div>
    </div>
  );
}
