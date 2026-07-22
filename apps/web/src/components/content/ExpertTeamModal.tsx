import {
  type ScenarioDemoPlan,
  type ScenarioPipelineStep,
} from '@/domain/scenarioPipeline';
import { CenterModal } from '@/components/center/CenterShell';
import { PipelineStepFlow } from '@/components/content/ScenarioDetailModal';

interface ExpertTeamModalProps {
  plan: ScenarioDemoPlan | null;
  onClose: () => void;
  /** 启动专家团：从第 index 步开始（默认 0） */
  onStartTeam: (fromIndex?: number) => void;
  /** 单独调用某一步的专家/技能 */
  onInvokeStep: (step: ScenarioPipelineStep) => void;
}

export function ExpertTeamModal({
  plan,
  onClose,
  onStartTeam,
  onInvokeStep,
}: ExpertTeamModalProps) {
  if (!plan || plan.mode !== 'team') return null;

  return (
    <CenterModal
      open
      title={`专家团 · ${plan.scenarioLabel}`}
      onClose={onClose}
      size="lg"
      actions={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-black/8 px-4 py-2 text-[12px] font-medium"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onStartTeam(0)}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-[12px] font-semibold text-white hover:bg-zinc-800"
          >
            启动专家团（同会话跑完全程）
          </button>
        </>
      }
    >
      <div className="space-y-3 text-left">
        <p className="text-[12px] leading-relaxed text-zinc-600">
          本场景需要 <span className="font-semibold text-zinc-900">{plan.steps.length}</span>{' '}
          位专家协作。启动后将在同一任务对话中顺序接力（计划自动确认）；也可单独调用某一步。
        </p>
        <PipelineStepFlow plan={plan} onInvokeStep={onInvokeStep} />
      </div>
    </CenterModal>
  );
}
