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
      <div className="mx-auto flex w-full max-w-[960px] flex-1 flex-col justify-center px-5 py-4 md:px-6 md:py-5">
        <header className="mb-6 text-center">
          <h1 className="home-slogan-art">
            <span className="home-slogan-gradient">MSS AI提效作战平台，好学又好用！</span>
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-[12px] leading-relaxed text-zinc-500">
            说出来就干活 · 输入需求直接开工，或按场景找专家团一键打样
          </p>
        </header>

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
