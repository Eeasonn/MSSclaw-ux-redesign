import { cn } from '@/lib/utils';
import {
  resolvePipelineStepTargets,
  resolveScenarioDemoPlan,
  buildExpertTeamStepPrompt,
  type ScenarioDemoPlan,
  type ScenarioPipelineStep,
} from '@/domain/scenarioPipeline';
import type { ScenarioBundle } from '@/domain/portalMap';
import type { PrototypeAgentSeed, PrototypeSkillSeed } from '@/domain/prototype/types';
import { getAgentPersona } from '@/domain/prototype/agentPersonas';
import { CenterModal } from '@/components/center/CenterShell';
import { AgentAvatar } from '@/components/brand/AgentAvatar';
import { useMarketplaceStore } from '@/stores/marketplaceStore';

/** 专家团步骤流（场景详情 / 专家团弹窗共用） */
export function PipelineStepFlow({
  plan,
  onInvokeStep,
}: {
  plan: ScenarioDemoPlan;
  onInvokeStep: (step: ScenarioPipelineStep) => void;
}) {
  return (
    <ol className="space-y-2">
      {plan.steps.map((step, idx) => {
        const { agent, skill } = resolvePipelineStepTargets(step);
        return (
          <li
            key={`${step.agentId}-${step.skillId ?? idx}`}
            className="flex flex-wrap items-start gap-3 rounded-xl border border-zinc-100 bg-zinc-50/70 px-3 py-2.5"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-[10px] font-semibold text-white">
              {idx + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-zinc-900">
                {step.label}
                {agent ? (
                  <span className="ml-1.5 font-normal text-zinc-500">· {agent.name}</span>
                ) : null}
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500">{step.blurb}</p>
              <p className="mt-1 font-mono text-[10px] text-claw-700">
                {step.command || skill?.command || '—'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onInvokeStep(step)}
              className={cn(
                'shrink-0 rounded-lg border border-black/8 bg-white px-2.5 py-1.5 text-[11px] font-medium text-zinc-700',
                'transition hover:bg-zinc-50',
              )}
            >
              单独调用
            </button>
          </li>
        );
      })}
    </ol>
  );
}

interface ScenarioDetailModalProps {
  bundle: ScenarioBundle | null;
  onClose: () => void;
  /** 启动专家团同会话接力（team 模式） */
  onStartExpertTeam: (plan: ScenarioDemoPlan, fromIndex?: number) => void;
  onInvokeAgent: (agent: PrototypeAgentSeed, prompt?: string) => void;
  onInvokeSkill: (skill: PrototypeSkillSeed) => void;
}

/** 场景详情弹窗：专家团步骤流 + 参与专家 + 主行动（启动专家团 / 立即体验） */
export function ScenarioDetailModal({
  bundle,
  onClose,
  onStartExpertTeam,
  onInvokeAgent,
  onInvokeSkill,
}: ScenarioDetailModalProps) {
  const agents = useMarketplaceStore((s) => s.agents);
  const showToast = useMarketplaceStore((s) => s.showToast);

  if (!bundle) return null;
  const plan = resolveScenarioDemoPlan(bundle);

  const invokeStep = (step: ScenarioPipelineStep) => {
    if (!plan) return;
    const idx = plan.steps.findIndex(
      (s) => s.agentId === step.agentId && s.skillId === step.skillId,
    );
    const { agent, skill } = resolvePipelineStepTargets(step);
    const prompt = buildExpertTeamStepPrompt(plan, idx >= 0 ? idx : 0);
    if (agent) {
      onInvokeAgent(agent, prompt);
      showToast(`专家团第 ${(idx >= 0 ? idx : 0) + 1}/${plan.steps.length} 步：${step.label}`);
      onClose();
      return;
    }
    if (skill) {
      onInvokeSkill(skill);
      onClose();
      return;
    }
    showToast(`未找到可调用的专家/技能：${step.label}`);
  };

  const invokeBundleAgent = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) {
      showToast('未找到该专家');
      return;
    }
    useMarketplaceStore.getState().bumpAgentInvokes(agent.id);
    onInvokeAgent(agent);
    onClose();
  };

  const startSolo = () => {
    if (!plan) return;
    if (plan.soloSkill) {
      onInvokeSkill(plan.soloSkill);
      showToast(`已启动主能力（单专家）：${plan.label}`);
    } else if (plan.soloAgent) {
      onInvokeAgent(plan.soloAgent);
      showToast(`已启动主专家：${plan.soloAgent.name}`);
    }
    onClose();
  };

  const expertCards = bundle.agents
    .map((c) => {
      const action = c.action;
      return action.type === 'agent'
        ? agents.find((a) => a.id === action.agentId)
        : undefined;
    })
    .filter((a): a is PrototypeAgentSeed => Boolean(a))
    .slice(0, 6);

  return (
    <CenterModal
      open
      title={`场景 · ${bundle.label}`}
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
          {plan?.mode === 'team' ? (
            <button
              type="button"
              onClick={() => {
                onStartExpertTeam(plan, 0);
                onClose();
              }}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-[12px] font-semibold text-white hover:bg-zinc-800"
            >
              启动专家团（同会话接力跑完全程）
            </button>
          ) : plan ? (
            <button
              type="button"
              onClick={startSolo}
              className="apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white"
            >
              立即体验
            </button>
          ) : null}
        </>
      }
    >
      <div className="space-y-4 text-left">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
            <i className={cn('fa-solid text-[16px]', bundle.icon)} />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-zinc-900">{bundle.label}</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-zinc-500">{bundle.desc}</p>
          </div>
        </div>

        {plan?.mode === 'team' ? (
          <div>
            <p className="mb-2 text-[12px] leading-relaxed text-zinc-600">
              本场景由 <span className="font-semibold text-zinc-900">{plan.steps.length}</span>{' '}
              位专家接力完成。启动后将在同一任务对话中顺序接力（计划自动确认）；也可单独调用某一步。
            </p>
            <PipelineStepFlow plan={plan} onInvokeStep={invokeStep} />
          </div>
        ) : null}

        {expertCards.length ? (
          <div>
            <p className="mb-2 text-[11px] font-semibold text-zinc-700">
              参与专家（{expertCards.length} 位）
            </p>
            <ul className="space-y-1.5">
              {expertCards.map((agent) => {
                const persona = getAgentPersona(agent);
                return (
                  <li
                    key={agent.id}
                    className="flex items-center gap-2.5 rounded-xl border border-zinc-100 bg-white px-3 py-2"
                  >
                    <AgentAvatar agentId={agent.id} size={28} title={agent.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold text-zinc-900">
                        {persona.name}
                        <span className="ml-1.5 font-normal text-zinc-500">{persona.role}</span>
                      </p>
                      <p className="truncate text-[10px] text-zinc-400">{persona.tagline}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => invokeBundleAgent(agent.id)}
                      className="apple-btn-primary shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white transition"
                    >
                      调用
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {!plan ? (
          <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-4 text-center text-[11px] text-zinc-400">
            该场景尚无可用专家或技能
          </p>
        ) : null}
      </div>
    </CenterModal>
  );
}
