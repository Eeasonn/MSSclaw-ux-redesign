import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type {
  PrototypeAgentSeed,
  PrototypeKbDocument,
  PrototypeSkillSeed,
} from '@/domain/prototype/types';
import {
  buildScenarioBundles,
  FEATURED_SCENARIOS,
  type PortalMapCard,
  type ScenarioBundle,
  type ScenarioListFilter,
} from '@/domain/portalMap';
import {
  SCENARIO_CAPABILITY_CATEGORIES,
  SCENARIO_CAPABILITY_MAP,
  SCENARIO_PUBLISHED_AT,
  type ScenarioCapabilityId,
} from '@/domain/scenarioCapabilities';
import {
  CenterModal,
  CenterSearchInput,
} from '@/components/center/CenterShell';
import { CaseEditorModal } from '@/components/center/CaseEditorModal';
import { OrgAssetFilterBar } from '@/components/center/OrgAssetFilters';
import { downloadScenarioCasePack } from '@/domain/caseExport';
import { isSystemAdmin } from '@/domain/currentUser';
import {
  getPortalItemById,
  outcomeFromNarrativeCard,
  resolveScenarioCaseItems,
  toCaseOutcomeCard,
  type CaseOutcomeCard,
} from '@/domain/portalCase';
import {
  resolvePipelineStepTargets,
  resolveScenarioDemoPlan,
  type ScenarioDemoPlan,
  type ScenarioPipelineStep,
} from '@/domain/scenarioPipeline';
import { buildSkillDemoPrompt } from '@/domain/skillRuntime';
import { buildAgentDemoPrompt } from '@/domain/agents/runtime';
import { getAgentPersona } from '@/domain/prototype/agentPersonas';
import { openNewTaskWithPrefill } from '@/domain/openNewTask';
import { useContentEngagementStore } from '@/stores/contentEngagementStore';
import { heatScore } from '@/domain/contentEngagement';
import { openPortalCard } from '@/domain/portalNavigation';
import type { DeptFilter, EfficiencyFilter, RegionFilter } from '@/domain/assetFilters';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { usePortalContentStore } from '@/stores/portalContentStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import { useAppViewStore } from '@/stores/appViewStore';
import { useHomeStore } from '@/stores/homeStore';
import { ExpertTeamModal } from '@/components/content/ExpertTeamModal';


interface AiMapPageProps {
  onInvokeAgent: (agent: PrototypeAgentSeed, prompt?: string) => void;
  onInvokeSkill: (skill: PrototypeSkillSeed) => void;
  onAskKbDocument?: (doc: PrototypeKbDocument) => void;
  /** 专家团同会话顺序接力 */
  onStartExpertTeam: (plan: ScenarioDemoPlan, fromIndex?: number) => void;
}

function isScenarioNew(scenarioId: string) {
  const publishedAt = SCENARIO_PUBLISHED_AT[scenarioId as keyof typeof SCENARIO_PUBLISHED_AT];
  if (!publishedAt) return false;
  const days = (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60 * 24);
  return days <= 14;
}

function getScenarioCapabilities(scenarioId: string): ScenarioCapabilityId[] {
  return SCENARIO_CAPABILITY_MAP[scenarioId as keyof typeof SCENARIO_CAPABILITY_MAP] ?? [];
}

function formatNumber(n: number) {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function ScenarioShowcaseModal({
  bundle,
  onClose,
  onStart,
  onDownload,
  onInvokeStep,
  onOpenCard,
}: {
  bundle: ScenarioBundle;
  onClose: () => void;
  onStart: () => void;
  onDownload: () => void;
  onInvokeStep: (step: ScenarioPipelineStep, index: number) => void;
  onOpenCard: (card: PortalMapCard) => void;
}) {
  const agents = useMarketplaceStore((s) => s.agents);
  const skills = useMarketplaceStore((s) => s.skills);
  const plan = useMemo(() => resolveScenarioDemoPlan(bundle), [bundle]);

  const primaryOutcome = useMemo<CaseOutcomeCard | null>(() => {
    const primaryCase =
      bundle.cases.find(
        (c) =>
          c.action.type === 'case' &&
          getPortalItemById(c.action.caseId)?.isGold &&
          getPortalItemById(c.action.caseId)?.type === 'case',
      ) ??
      bundle.cases.find(
        (c) => c.action.type === 'case' && getPortalItemById(c.action.caseId)?.type === 'case',
      ) ??
      bundle.cases[0] ??
      null;
    if (!primaryCase) return null;
    return outcomeFromNarrativeCard(primaryCase);
  }, [bundle]);

  const relatedItems = useMemo(() => {
    const items = resolveScenarioCaseItems(bundle).slice(0, 6);
    return items.map((item) => ({
      ...toCaseOutcomeCard(item),
      type: item.type,
    }));
  }, [bundle]);

  const capability = useMemo(
    () => SCENARIO_CAPABILITY_CATEGORIES.find((c) => getScenarioCapabilities(bundle.id).includes(c.id)),
    [bundle],
  );

  return (
    <CenterModal
      open
      title={bundle.label}
      onClose={onClose}
      size="lg"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-[12px] font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            关闭
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="rounded-xl border border-zinc-200 bg-zinc-100 px-4 py-2 text-[12px] font-medium text-zinc-800 transition hover:bg-zinc-200"
          >
            <i className="fa-solid fa-download mr-1 text-[10px]" />
            下载案例包
          </button>
          <button
            type="button"
            onClick={onStart}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-zinc-800"
          >
            {plan?.mode === 'team' ? '一键打样（专家团）' : '一键打样（专家）'}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* 弹窗标题区 */}
        <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white"
          >
            <i className={`fa-solid ${bundle.icon} text-[13px]`} />
          </span>
          <div>
            <div className="text-[16px] font-semibold text-zinc-900">{bundle.label}</div>
            {capability ? (
              <div className="text-[11px] text-zinc-500">{capability.label}</div>
            ) : null}
          </div>
        </div>

        {/* 业务描述 */}
        <section>
          <h4 className="mb-2 text-[12px] font-semibold text-zinc-900">业务描述</h4>
          <p className="text-[13px] leading-relaxed text-zinc-600">{bundle.desc}</p>
        </section>

        {/* 痛点 + 成效 */}
        {primaryOutcome ? (
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-200/80 bg-white p-3">
              <h4 className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-zinc-900">
                <i className="fa-solid fa-bolt text-[10px] text-zinc-400" />
                痛点
              </h4>
              <p className="text-[12px] leading-relaxed text-zinc-600">{primaryOutcome.painPoint}</p>
            </div>
            <div className="rounded-xl border border-zinc-200/80 bg-white p-3">
              <h4 className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-zinc-900">
                <i className="fa-solid fa-chart-line text-[10px] text-zinc-400" />
                成效指标
              </h4>
              <p className="text-[12px] leading-relaxed text-zinc-600">{primaryOutcome.impactMetric}</p>
            </div>
          </section>
        ) : null}

        {/* 专家链路 */}
        {plan?.mode === 'team' && plan.steps.length > 0 ? (
          <section>
            <h4 className="mb-2 text-[12px] font-semibold text-zinc-900">
              专家链路 · {plan.steps.length} 步
            </h4>
            <div className="space-y-2">
              {plan.steps.map((step, idx) => {
                const { agent, skill } = resolvePipelineStepTargets(step);
                const agentName = agent ? getAgentPersona(agent).name : step.label;
                return (
                  <div
                    key={`${step.agentId ?? ''}-${step.skillId ?? ''}-${idx}`}
                    className="flex items-center gap-3 rounded-xl border border-zinc-200/80 bg-white p-3"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-semibold text-white">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-semibold text-zinc-900">
                        {step.label}
                        {agentName && agentName !== step.label ? (
                          <span className="ml-1 font-normal text-zinc-500">· {agentName}</span>
                        ) : null}
                      </div>
                      {skill ? (
                        <div className="mt-0.5 text-[11px] text-zinc-500">
                          调用技能 {skill.command} · {skill.name}
                        </div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => onInvokeStep(step, idx)}
                      className="shrink-0 rounded-lg border border-zinc-200 px-2.5 py-1 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-50"
                    >
                      调用
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* 关联内容 */}
        {relatedItems.length > 0 ? (
          <section>
            <h4 className="mb-2 text-[12px] font-semibold text-zinc-900">关联内容</h4>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {relatedItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    const card = bundle.cases.find(
                      (c) => c.action.type === 'case' && c.action.caseId === item.id,
                    );
                    if (card) onOpenCard(card);
                  }}
                  className="rounded-xl border border-zinc-200/80 bg-white p-3 text-left transition hover:border-zinc-300 hover:bg-zinc-50"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-500">
                      {item.typeLabel}
                    </span>
                    {item.isGold ? (
                      <span
                        className="rounded-full bg-zinc-900 px-1.5 py-0.5 text-[9px] font-semibold text-white"
                      >
                        金
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[12px] font-semibold text-zinc-900">{item.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-500">{item.desc}</p>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {/* 能力组合 */}
        <section>
          <h4 className="mb-2 text-[12px] font-semibold text-zinc-900">能力组合</h4>
          <div className="flex flex-wrap gap-2">
            {bundle.agents.slice(0, 4).map((card) => {
              const agentAction = card.action.type === 'agent' ? card.action : null;
              const name = agentAction
                ? getAgentPersona(agents.find((a) => a.id === agentAction.agentId)!).name
                : card.title;
              return (
                <span
                  key={card.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] text-zinc-700"
                >
                  <i className="fa-solid fa-user text-[9px] text-zinc-400" />
                  {name}
                </span>
              );
            })}
            {bundle.tools.slice(0, 4).map((card) => {
              const skillAction = card.action.type === 'skill' ? card.action : null;
              const skill = skillAction
                ? skills.find((s) => s.id === skillAction.skillId)
                : null;
              return (
                <span
                  key={card.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] text-zinc-700"
                >
                  <i className="fa-solid fa-wand-magic-sparkles text-[9px] text-zinc-400" />
                  {skill ? skill.command : card.title}
                </span>
              );
            })}
            {bundle.knowledge.slice(0, 2).map((card) => (
              <span
                key={card.id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] text-zinc-700"
              >
                <i className="fa-solid fa-book text-[9px] text-zinc-400" />
                {card.title}
              </span>
            ))}
          </div>
        </section>
      </div>
    </CenterModal>
  );
}

function ScenarioDetailPane({
  bundle,
  onOpenModal,
  onStartTask,
  onDownload,
  onStartScenario,
  onOpenCard,
}: {
  bundle: ScenarioBundle;
  onOpenModal: () => void;
  onStartTask: () => void;
  onDownload: () => void;
  onStartScenario: () => void;
  onOpenCard: (card: PortalMapCard) => void;
}) {
  const agents = useMarketplaceStore((s) => s.agents);
  const skills = useMarketplaceStore((s) => s.skills);
  const plan = useMemo(() => resolveScenarioDemoPlan(bundle), [bundle]);

  const primaryOutcome = useMemo<CaseOutcomeCard | null>(() => {
    const primaryCase =
      bundle.cases.find(
        (c) =>
          c.action.type === 'case' &&
          getPortalItemById(c.action.caseId)?.isGold &&
          getPortalItemById(c.action.caseId)?.type === 'case',
      ) ??
      bundle.cases.find(
        (c) => c.action.type === 'case' && getPortalItemById(c.action.caseId)?.type === 'case',
      ) ??
      bundle.cases[0] ??
      null;
    if (!primaryCase) return null;
    return outcomeFromNarrativeCard(primaryCase);
  }, [bundle]);

  const relatedItems = useMemo(() => {
    const items = resolveScenarioCaseItems(bundle).slice(0, 6);
    return items.map((item) => ({
      ...toCaseOutcomeCard(item),
      type: item.type,
    }));
  }, [bundle]);

  const capability = useMemo(
    () => SCENARIO_CAPABILITY_CATEGORIES.find((c) => getScenarioCapabilities(bundle.id).includes(c.id)),
    [bundle],
  );

  const isNew = isScenarioNew(bundle.id);
  const engagement = useContentEngagementStore.getState().get(bundle.id);

  return (
    <div className="flex flex-col gap-4">
      {/* hero */}
      <article className="grid grid-cols-1 gap-4 rounded-2xl border border-zinc-200/80 bg-white p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-5 md:p-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white">
              <i className={`fa-solid ${bundle.icon} text-[16px]`} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h2 className="m-0 text-[20px] font-semibold tracking-[-0.015em] text-zinc-900 md:text-[24px]">{bundle.label}</h2>
                {isNew ? (
                  <span className="rounded-full bg-zinc-900 px-1.5 py-0 text-[9px] font-semibold text-white">New</span>
                ) : null}
              </div>
              {capability ? (
                <p className="mt-0.5 text-[11px] text-zinc-400">{capability.label}</p>
              ) : null}
            </div>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-zinc-600">{bundle.desc}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-zinc-400">
            <span>
              <i className="fa-solid fa-users mr-0.5 text-[9px]" />
              专家 {bundle.agents.length}
            </span>
            <span>
              <i className="fa-solid fa-wand-magic-sparkles mr-0.5 text-[9px]" />
              工具 {bundle.tools.length}
            </span>
            <span>
              <i className="fa-solid fa-folder-open mr-0.5 text-[9px]" />
              案例 {bundle.cases.length}
            </span>
            <span>{engagement.updatedAt}</span>
            <span>
              <i className="fa-regular fa-eye mr-0.5" />
              {formatNumber(engagement.uses)}
            </span>
            <span>热度 {Math.round(heatScore(engagement))}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
          <button
            type="button"
            onClick={onDownload}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-[12px] font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            <i className="fa-solid fa-download mr-1 text-[10px]" />
            下载案例包
          </button>
          <button
            type="button"
            onClick={onOpenModal}
            className="rounded-xl border border-zinc-200 bg-zinc-100 px-4 py-2 text-[12px] font-medium text-zinc-800 transition hover:bg-zinc-200"
          >
            查看详情
          </button>
          <button
            type="button"
            onClick={onStartTask}
            className="rounded-xl border border-zinc-900 bg-white px-4 py-2 text-[12px] font-semibold text-zinc-900 transition hover:bg-zinc-50"
          >
            开启任务
          </button>
          <button
            type="button"
            onClick={onStartScenario}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-zinc-800"
          >
            {plan?.mode === 'team' ? '一键打样（专家团）' : '一键打样（专家）'}
          </button>
        </div>
      </article>

      {/* 痛点 + 成效 */}
      {primaryOutcome ? (
        <article className="rounded-2xl border border-zinc-200/80 bg-white p-5">
          <h3 className="m-0 text-[15px] font-semibold text-zinc-900">业务成效</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-3">
              <h4 className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-zinc-900">
                <i className="fa-solid fa-bolt text-[10px] text-zinc-400" />
                痛点
              </h4>
              <p className="m-0 text-[12px] leading-relaxed text-zinc-600">{primaryOutcome.painPoint}</p>
            </div>
            <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-3">
              <h4 className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-zinc-900">
                <i className="fa-solid fa-chart-line text-[10px] text-zinc-400" />
                成效指标
              </h4>
              <p className="m-0 text-[12px] leading-relaxed text-zinc-600">{primaryOutcome.impactMetric}</p>
            </div>
          </div>
        </article>
      ) : null}

      {/* 专家链路 */}
      {plan?.mode === 'team' && plan.steps.length > 0 ? (
        <article className="rounded-2xl border border-zinc-200/80 bg-white p-5">
          <h3 className="m-0 text-[15px] font-semibold text-zinc-900">专家链路 · {plan.steps.length} 步</h3>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {plan.steps.map((step, idx) => {
              const { agent } = resolvePipelineStepTargets(step);
              const agentName = agent ? getAgentPersona(agent).name : step.label;
              return (
                <span key={`${step.agentId ?? ''}-${step.skillId ?? ''}-${idx}`} className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[12px] text-zinc-700">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-semibold text-white">{idx + 1}</span>
                  {step.label}
                  {agentName && agentName !== step.label ? (
                    <span className="text-zinc-500">· {agentName}</span>
                  ) : null}
                </span>
              );
            })}
          </div>
        </article>
      ) : null}

      {/* 关联内容 */}
      {relatedItems.length > 0 ? (
        <article className="rounded-2xl border border-zinc-200/80 bg-white p-5">
          <h3 className="m-0 text-[15px] font-semibold text-zinc-900">关联内容</h3>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            {relatedItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  const card = bundle.cases.find((c) => c.action.type === 'case' && c.action.caseId === item.id);
                  if (card) onOpenCard(card);
                }}
                className="rounded-xl border border-zinc-200/80 bg-white p-3 text-left transition hover:border-zinc-300 hover:bg-zinc-50"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-500">{item.typeLabel}</span>
                  {item.isGold ? (
                    <span className="rounded-full bg-zinc-900 px-1.5 py-0.5 text-[9px] font-semibold text-white">金</span>
                  ) : null}
                </div>
                <p className="m-0 text-[12px] font-semibold text-zinc-900">{item.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-500">{item.desc}</p>
              </button>
            ))}
          </div>
        </article>
      ) : null}

      {/* 能力组合 */}
      <article className="rounded-2xl border border-zinc-200/80 bg-white p-5">
        <h3 className="m-0 text-[15px] font-semibold text-zinc-900">能力组合</h3>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {bundle.agents.slice(0, 4).map((card) => {
            const agentAction = card.action.type === 'agent' ? card.action : null;
            const name = agentAction
              ? getAgentPersona(agents.find((a) => a.id === agentAction.agentId)!).name
              : card.title;
            return (
              <span
                key={card.id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] text-zinc-700"
              >
                <i className="fa-solid fa-user text-[9px] text-zinc-400" />
                {name}
              </span>
            );
          })}
          {bundle.tools.slice(0, 4).map((card) => {
            const skillAction = card.action.type === 'skill' ? card.action : null;
            const skill = skillAction ? skills.find((s) => s.id === skillAction.skillId) : null;
            return (
              <span
                key={card.id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] text-zinc-700"
              >
                <i className="fa-solid fa-wand-magic-sparkles text-[9px] text-zinc-400" />
                {skill ? skill.command : card.title}
              </span>
            );
          })}
          {bundle.knowledge.slice(0, 2).map((card) => (
            <span
              key={card.id}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] text-zinc-700"
            >
              <i className="fa-solid fa-book text-[9px] text-zinc-400" />
              {card.title}
            </span>
          ))}
        </div>
      </article>
    </div>
  );
}

export function AiMapPage({
  onInvokeAgent,
  onInvokeSkill,
  onAskKbDocument,
  onStartExpertTeam,
}: AiMapPageProps) {
  const agents = useMarketplaceStore((s) => s.agents);
  const skills = useMarketplaceStore((s) => s.skills);
  const tools = useMarketplaceStore((s) => s.tools);
  const portalContent = usePortalContentStore((s) => s.items);
  const showToast = useMarketplaceStore((s) => s.showToast);
  const user = useSessionStore((s) => s.user);
  const setAppView = useAppViewStore((s) => s.setAppView);

  const [listFilter, setListFilter] = useState<ScenarioListFilter>('related');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorTarget, setEditorTarget] = useState<string | 'new' | null>(null);
  const [teamPlan, setTeamPlan] = useState<ScenarioDemoPlan | null>(null);
  const [activeCap, setActiveCap] = useState<ScenarioCapabilityId | 'all'>('all');
  const canEditCase = isSystemAdmin(user?.platformRole);
  const [deptFilter, setDeptFilter] = useState<DeptFilter>('all');
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('all');
  const [efficiencyFilter, setEfficiencyFilter] = useState<EfficiencyFilter>('all');
  const pendingCaseId = useNavigationIntentStore((s) => s.pendingCaseId);
  const consumeCaseId = useNavigationIntentStore((s) => s.consumeCaseId);
  const pendingScenarioId = useNavigationIntentStore((s) => s.pendingScenarioId);
  const consumeScenarioId = useNavigationIntentStore((s) => s.consumeScenarioId);
  const bumpUse = useContentEngagementStore((s) => s.bumpUse);
  const toggleLike = useContentEngagementStore((s) => s.toggleLike);

  const affiliation = useMemo(
    () => ({
      deptIds: user?.deptIds ?? [],
      regionId: user?.regionId ?? null,
    }),
    [user?.deptIds, user?.regionId],
  );

  const bundles = useMemo(
    () =>
      buildScenarioBundles({
        agents,
        skills,
        tools,
        portalContent,
        affiliation,
        userId: user?.id ?? '',
        userName: user?.name ?? '',
        role: user?.platformRole,
        filter: listFilter,
        search,
        deptFilter,
        regionFilter,
        efficiencyFilter,
      }),
    [
      agents,
      skills,
      tools,
      portalContent,
      affiliation,
      user?.id,
      user?.name,
      user?.platformRole,
      listFilter,
      search,
      deptFilter,
      regionFilter,
      efficiencyFilter,
    ],
  );

  /** 深链定位用不带搜索的全量场景列表 */
  const allBundles = useMemo(
    () =>
      buildScenarioBundles({
        agents,
        skills,
        tools,
        portalContent,
        affiliation,
        userId: user?.id ?? '',
        userName: user?.name ?? '',
        role: user?.platformRole,
        filter: 'all',
        search: '',
      }),
    [agents, skills, tools, portalContent, affiliation, user?.id, user?.name, user?.platformRole],
  );

  const bundleById = useMemo(() => new Map(allBundles.map((b) => [b.id, b])), [allBundles]);

  const filteredBundles = useMemo(() => {
    if (activeCap === 'all') return bundles;
    return bundles.filter((b) =>
      FEATURED_SCENARIOS.find((s) => s.id === b.id && getScenarioCapabilities(s.id).includes(activeCap)),
    );
  }, [bundles, activeCap]);

  // 深链：定位场景并打开弹窗
  useEffect(() => {
    if (!pendingScenarioId && !pendingCaseId) return;
    if (!allBundles.length) return;
    const id = pendingScenarioId;
    if (id) {
      const hit = allBundles.find((b) => b.id === id);
      if (!hit) {
        consumeScenarioId();
        showToast(`未找到场景：${id}`);
        return;
      }
      consumeScenarioId();
      setActiveCap('all');
      setListFilter('all');
      setDeptFilter('all');
      setRegionFilter('all');
      setEfficiencyFilter('all');
      setSearch('');
      setSelectedId(hit.id);
    }
  }, [pendingScenarioId, allBundles, consumeScenarioId, showToast]);

  useEffect(() => {
    if (!pendingCaseId) return;
    if (!allBundles.length) return;
    const id = pendingCaseId;
    const hit = allBundles.find((b) =>
      b.cases.some((c) => c.action.type === 'case' && c.action.caseId === id),
    );
    if (!hit) {
      consumeCaseId();
      showToast(`未在场景案例中找到：${id}`);
      return;
    }
    consumeCaseId();
    setActiveCap('all');
    setListFilter('all');
    setDeptFilter('all');
    setRegionFilter('all');
    setEfficiencyFilter('all');
    setSearch('');
    setSelectedId(hit.id);
  }, [pendingCaseId, allBundles, consumeCaseId, showToast]);

  const selected = useMemo(
    () => (selectedId ? bundleById.get(selectedId) ?? null : null),
    [selectedId, bundleById],
  );

  const startScenario = (bundle: ScenarioBundle) => {
    const plan = resolveScenarioDemoPlan(bundle);
    if (!plan) {
      showToast('该场景尚无可用专家或技能');
      return;
    }
    if (plan.mode === 'team') {
      setTeamPlan(plan);
      return;
    }
    if (plan.soloSkill) {
      onInvokeSkill(plan.soloSkill);
      showToast(`已启动主能力（单专家）：${plan.label}`);
      return;
    }
    if (plan.soloAgent) {
      onInvokeAgent(plan.soloAgent);
      showToast(`已启动主专家：${plan.soloAgent.name}`);
      return;
    }
    showToast('该场景尚无可用专家或技能');
  };

  const startScenarioTask = (bundle: ScenarioBundle) => {
    const plan = resolveScenarioDemoPlan(bundle);
    if (!plan) return;
    const label = FEATURED_SCENARIOS.find((s) => s.id === bundle.id)?.label ?? bundle.label;
    if (plan.mode === 'team') {
      openNewTaskWithPrefill(`@专家团：${label} `);
    } else if (plan.soloSkill) {
      openNewTaskWithPrefill(`${plan.soloSkill.command} `);
    } else if (plan.soloAgent) {
      openNewTaskWithPrefill(`@${getAgentPersona(plan.soloAgent).name} `);
    }
  };

  const downloadScenarioPack = (bundle: ScenarioBundle) => {
    const items = resolveScenarioCaseItems(bundle);
    if (!items.length) {
      showToast('该场景暂无可下载的案例包');
      return;
    }
    downloadScenarioCasePack(bundle.label, items);
    const bump = useContentEngagementStore.getState().bumpDownload;
    items.forEach((i) => bump(i.id));
    showToast(
      items.length === 1
        ? `已下载案例包：${items[0]!.title}`
        : `已下载场景案例包（${items.length} 个）`,
    );
  };

  const handleCard = (card: PortalMapCard) => {
    openPortalCard(card, { onInvokeAgent, onInvokeSkill, onAskKbDocument, showToast });
  };

  const invokePipelineStep = (plan: ScenarioDemoPlan, step: ScenarioPipelineStep, stepIndex: number) => {
    const { agent, skill } = resolvePipelineStepTargets(step);
    const total = plan.steps.length;
    const prefix = `【专家团 ${stepIndex + 1}/${total} · ${plan.scenarioLabel} · ${step.label}】`;
    if (skill) {
      const body = buildSkillDemoPrompt(skill);
      if (agent) {
        onInvokeAgent(agent, `${prefix} ${body}`);
      } else {
        onInvokeSkill(skill);
      }
      showToast(`专家团第 ${stepIndex + 1}/${total} 步：${step.label}`);
      return;
    }
    if (agent) {
      onInvokeAgent(agent, `${prefix} ${buildAgentDemoPrompt(agent)}`);
      showToast(`专家团第 ${stepIndex + 1}/${total} 步：${agent.name}`);
      return;
    }
    showToast(`未找到可调用的专家/技能：${step.label}`);
  };

  const topBundles = useMemo(() => {
    const get = useContentEngagementStore.getState().get;
    return [...filteredBundles]
      .sort((a, b) => heatScore(get(b.id)) - heatScore(get(a.id)))
      .slice(0, 2);
  }, [filteredBundles]);

  return (
    <div className="center-surface center-page scroll-hidden flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mx-auto flex min-h-0 w-full max-w-[1280px] flex-1 flex-col">
        {/* v2.6 风格 header: 12px uppercase kicker + 28-36px h1 + 副标题 + 右侧 actions */}
        <header className="grid grid-cols-1 gap-4 px-6 pt-6 md:grid-cols-[minmax(360px,1fr)_auto] md:items-start md:gap-6 md:px-10 md:pt-7">
          <div>
            <p className="mb-0.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-zinc-500">MSS Claw</p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="m-0 text-[28px] font-bold leading-tight tracking-[-0.025em] text-zinc-900 md:text-[36px]">场景案例</h1>
            </div>
            <p className="mt-1.5 text-[14px] text-zinc-500">从 AI 广场发现，到场景详情确认，再一键进入任务执行</p>
          </div>
          <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
            <CenterSearchInput
              value={search}
              onChange={setSearch}
              placeholder="搜索场景名称…"
            />
            <OrgAssetFilterBar
              deptFilter={deptFilter}
              regionFilter={regionFilter}
              efficiencyFilter={efficiencyFilter}
              scenarioFilter={listFilter}
              onDeptChange={setDeptFilter}
              onRegionChange={setRegionFilter}
              onEfficiencyChange={setEfficiencyFilter}
              onScenarioFilterChange={setListFilter}
              triggerLabel="高级筛选"
              collapsible
            />
            <button
              type="button"
              onClick={() => {
                useHomeStore.getState().setHomeMode('portal');
                useNavigationIntentStore.getState().clearReturnTarget();
                setAppView('home');
              }}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-[13px] font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              返回 AI 广场
            </button>
            {canEditCase ? (
              <button
                type="button"
                onClick={() => setEditorTarget('new')}
                className="rounded-xl bg-zinc-900 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-zinc-800"
              >
                <i className="fa-solid fa-plus mr-1" />
                提交案例建议
              </button>
            ) : null}
          </div>
        </header>

        {/* 5 个能力分类 tab (v2.6 视觉) */}
        <div className="flex flex-wrap items-center gap-2 px-6 pt-6 md:px-10">
          <button
            type="button"
            onClick={() => setActiveCap('all')}
            className={cn(
              'rounded-full px-3 py-1 text-[12px] font-medium transition',
              activeCap === 'all'
                ? 'bg-zinc-900 text-white'
                : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50',
            )}
          >
            全部场景
          </button>
          {SCENARIO_CAPABILITY_CATEGORIES.map((cap) => (
            <button
              key={cap.id}
              type="button"
              onClick={() => setActiveCap(cap.id)}
              className={cn(
                'rounded-full px-3 py-1 text-[12px] font-medium transition',
                activeCap === cap.id
                  ? 'bg-zinc-900 text-white'
                  : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50',
              )}
            >
              {cap.label}
            </button>
          ))}
        </div>

        {/* 二栏布局: 左侧场景列表 + 右侧详情面板 */}
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(260px,25%)_minmax(0,1fr)] gap-5 px-6 pt-9 pb-8 md:px-10">
          <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white">
            <div className="border-b border-zinc-100 px-4 py-3.5">
              <h2 className="m-0 text-[15px] font-semibold text-zinc-900">业务场景</h2>
              <p className="mt-1 text-[11px] text-zinc-400">
                {activeCap === 'all' ? '全部场景' : SCENARIO_CAPABILITY_CATEGORIES.find((c) => c.id === activeCap)?.label} · {filteredBundles.length}
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {filteredBundles.length === 0 ? (
                <p className="m-2 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-8 text-center text-[11px] text-zinc-400">
                  暂无匹配场景，试试调整筛选条件
                </p>
              ) : (
                <ul className="m-0 list-none space-y-1 p-0">
                  {filteredBundles.map((bundle) => {
                    const isSelected = selectedId === bundle.id;
                    const isGold = topBundles.some((b) => b.id === bundle.id);
                    return (
                      <li key={bundle.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(bundle.id);
                            bumpUse(bundle.id);
                          }}
                          className={cn(
                            'flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition',
                            isSelected
                              ? 'bg-zinc-900 text-white'
                              : 'text-zinc-700 hover:bg-zinc-50',
                          )}
                        >
                          <span
                            className={cn(
                              'mt-0.5 flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px]',
                              isSelected ? 'bg-white/15 text-white' : 'bg-zinc-100 text-zinc-700',
                            )}
                          >
                            <i className={`fa-solid ${bundle.icon} text-[13px]`} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-1">
                              <span className="truncate text-[13px] font-semibold">{bundle.label}</span>
                              {isGold ? (
                                <span
                                  className={cn(
                                    'shrink-0 rounded-full px-1.5 py-0 text-[9px] font-semibold',
                                    isSelected ? 'bg-white/15 text-white' : 'bg-zinc-900 text-white',
                                  )}
                                >
                                  金
                                </span>
                              ) : null}
                            </span>
                            <span
                              className={cn(
                                'mt-0.5 block truncate text-[11px]',
                                isSelected ? 'text-white/65' : 'text-zinc-400',
                              )}
                            >
                              {bundle.desc}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          <section className="min-h-0 overflow-y-auto pr-0.5">
            {selected ? (
              <ScenarioDetailPane
                bundle={selected}
                onOpenModal={() => setSelectedId(selected.id)}
                onStartTask={() => startScenarioTask(selected)}
                onDownload={() => downloadScenarioPack(selected)}
                onStartScenario={() => startScenario(selected)}
                onOpenCard={handleCard}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-16 text-center text-[13px] text-zinc-500">
                请从左侧选择一个业务场景
              </div>
            )}
          </section>
        </div>
      </div>

      {selected ? (
        <ScenarioShowcaseModal
          bundle={selected}
          onClose={() => setSelectedId(null)}
          onStart={() => startScenario(selected)}
          onDownload={() => downloadScenarioPack(selected)}
          onInvokeStep={(step, idx) => {
            const plan = resolveScenarioDemoPlan(selected);
            if (!plan) return;
            invokePipelineStep(plan, step, idx);
            setSelectedId(null);
          }}
          onOpenCard={handleCard}
        />
      ) : null}

      <ExpertTeamModal
        plan={teamPlan}
        onClose={() => setTeamPlan(null)}
        onStartTeam={(fromIndex = 0) => {
          if (!teamPlan) return;
          onStartExpertTeam(teamPlan, fromIndex);
          setTeamPlan(null);
        }}
        onInvokeStep={(step) => {
          if (!teamPlan) return;
          const idx = teamPlan.steps.findIndex(
            (s) => s.agentId === step.agentId && s.skillId === step.skillId,
          );
          invokePipelineStep(teamPlan, step, idx >= 0 ? idx : 0);
          setTeamPlan(null);
        }}
      />

      <CaseEditorModal
        target={editorTarget}
        onClose={() => setEditorTarget(null)}
        onSaved={(_item) => {
          // store 已更新，弹窗关闭后重新渲染即可
        }}
      />

    </div>
  );
}
