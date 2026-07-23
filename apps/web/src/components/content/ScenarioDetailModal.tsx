import { cn } from '@/lib/utils';
import {
  resolvePipelineStepTargets,
  resolveScenarioDemoPlan,
  buildExpertTeamStepPrompt,
  type ScenarioDemoPlan,
  type ScenarioPipelineStep,
} from '@/domain/scenarioPipeline';
import type { PortalMapCard, ScenarioBundle } from '@/domain/portalMap';
import type { PrototypeAgentSeed, PrototypeSkillSeed } from '@/domain/prototype/types';
import { getAgentPersona } from '@/domain/prototype/agentPersonas';
import { CenterModal } from '@/components/center/CenterShell';
import { AgentAvatar } from '@/components/brand/AgentAvatar';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { getPortalItemById, outcomeFromNarrativeCard } from '@/domain/portalCase';
import { heatScore } from '@/domain/contentEngagement';
import { useContentEngagementStore } from '@/stores/contentEngagementStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import { useAppViewStore } from '@/stores/appViewStore';

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
  /** V5 广场统一入口：点击后直接按场景计划开启任务 */
  onStartScenario?: () => void;
  /** 可选：直接指定要展示的案例卡片；否则自动取场景下最热案例 */
  primaryCard?: PortalMapCard | null;
}

/** 场景详情弹窗：以场景下最热案例为主体，展示专家链路 / 痛点 / 成效 */
export function ScenarioDetailModal({
  bundle,
  onClose,
  onStartExpertTeam,
  onInvokeAgent,
  onInvokeSkill,
  onStartScenario,
  primaryCard,
}: ScenarioDetailModalProps) {
  const agents = useMarketplaceStore((s) => s.agents);
  const showToast = useMarketplaceStore((s) => s.showToast);
  const engagementOf = useContentEngagementStore((s) => s.get);
  const setAppView = useAppViewStore((s) => s.setAppView);
  const focusScenario = useNavigationIntentStore((s) => s.focusScenario);
  const focusPortalItem = useNavigationIntentStore((s) => s.focusPortalItem);

  if (!bundle) return null;
  const plan = resolveScenarioDemoPlan(bundle);

  // 取最热案例作为弹窗主体
  const narrativeCard =
    primaryCard ??
    (bundle.cases.length
      ? [...bundle.cases].sort(
          (a, b) => heatScore(engagementOf(b.id)) - heatScore(engagementOf(a.id)),
        )[0]!
      : null);
  const narrativeOutcome = narrativeCard ? outcomeFromNarrativeCard(narrativeCard) : null;
  const narrativeItem =
    narrativeCard?.action.type === 'case'
      ? getPortalItemById(narrativeCard.action.caseId)
      : null;

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

  const goToCaseDetail = () => {
    if (narrativeCard?.action.type === 'case') {
      focusPortalItem(narrativeCard.action.caseId);
    }
    focusScenario(bundle.id);
    setAppView('ai-map');
    onClose();
  };

  const title = narrativeOutcome?.title ?? bundle.label;
  const typeLabel = narrativeOutcome?.typeLabel ?? '场景案例';

  return (
    <CenterModal
      open
      title={title}
      onClose={onClose}
      size="lg"
      actions={
        <>
          <button
            type="button"
            onClick={goToCaseDetail}
            className="rounded-xl border border-black/8 bg-zinc-50 px-4 py-2 text-[12px] font-medium text-zinc-700 transition hover:bg-zinc-100"
          >
            查看详情
          </button>
          {onStartScenario ? (
            <button
              type="button"
              onClick={() => {
                onStartScenario();
                onClose();
              }}
              className="rounded-xl border border-zinc-900 bg-white px-4 py-2 text-[12px] font-semibold text-zinc-900 transition hover:bg-zinc-50"
            >
              开启任务
            </button>
          ) : plan?.mode === 'team' ? (
            <button
              type="button"
              onClick={() => {
                onStartExpertTeam(plan, 0);
                onClose();
              }}
              className="rounded-xl border border-zinc-900 bg-white px-4 py-2 text-[12px] font-semibold text-zinc-900 transition hover:bg-zinc-50"
            >
              开启任务
            </button>
          ) : plan ? (
            <button
              type="button"
              onClick={startSolo}
              className="rounded-xl border border-zinc-900 bg-white px-4 py-2 text-[12px] font-semibold text-zinc-900 transition hover:bg-zinc-50"
            >
              开启任务
            </button>
          ) : null}
        </>
      }
    >
      <div className="space-y-4 text-left">
        {/* 类型标签 + 场景描述 */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] text-zinc-600">
              {typeLabel}
            </span>
            {narrativeItem?.isGold ? (
              <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">
                金案例
              </span>
            ) : null}
          </div>
          <p className="text-[12px] leading-relaxed text-zinc-700">
            {narrativeOutcome?.desc ?? bundle.desc}
          </p>
        </div>

        {/* 专家链路步骤 */}
        {narrativeOutcome?.steps?.length ? (
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
            <p className="mb-2 text-[11px] font-semibold text-zinc-700">
              专家链路
              {plan?.mode === 'team' ? (
                <span className="ml-1 font-normal text-zinc-400">
                  · {plan.steps.length} 步接力
                </span>
              ) : null}
            </p>
            <ol className="space-y-2">
              {narrativeOutcome.steps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-[10px] font-semibold text-white">
                    {idx + 1}
                  </span>
                  <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-zinc-700">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        ) : plan?.mode === 'team' ? (
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
            <p className="mb-2 text-[11px] font-semibold text-zinc-700">
              专家链路 · {plan.steps.length} 步接力
            </p>
            <PipelineStepFlow plan={plan} onInvokeStep={invokeStep} />
          </div>
        ) : null}

        {/* 痛点 + 成效指标 */}
        {narrativeOutcome ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-100 bg-white p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                痛点
              </p>
              <p className="text-[11px] leading-relaxed text-zinc-700">
                {narrativeOutcome.painPoint.replace(/^业务痛点[：:]?\s?/, '')}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-100 bg-white p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                成效指标
              </p>
              <p className="text-[12px] font-semibold leading-relaxed text-[#2e7d32]">
                {narrativeOutcome.impactMetric.replace(/^提效效果[：:]?\s?/, '')}
              </p>
            </div>
          </div>
        ) : null}

        {/* 参与专家 */}
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
                      className="shrink-0 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-50"
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
