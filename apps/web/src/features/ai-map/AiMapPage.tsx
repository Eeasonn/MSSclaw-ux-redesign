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
  CenterPageHeader,
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
            className="rounded-xl px-4 py-2 text-[12px] font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: '#c0512f' }}
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
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: '#c0512f' }}
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
                        className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-white"
                        style={{ backgroundColor: '#c0512f' }}
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
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-4 py-4 md:px-6">
        <CenterPageHeader
          title="场景案例"
          subtitle="按业务环节挑选可复制场景，点击进入案例样板间"
          tip={<>首页「逛广场」是橱窗发现，这里是完整场景案例库，可查看样板间并一键打样。</>}
          actions={
            <>
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
              {canEditCase ? (
                <button
                  type="button"
                  onClick={() => setEditorTarget('new')}
                  className="rounded-xl px-4 py-2 text-[12px] font-semibold text-white transition hover:opacity-90"
                  style={{ backgroundColor: '#c0512f' }}
                >
                  <i className="fa-solid fa-plus mr-1" />
                  新建案例
                </button>
              ) : null}
            </>
          }
        />

        {/* 功能场景 chips */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveCap('all')}
            className={cn(
              'rounded-full px-3 py-1 text-[12px] font-medium transition',
              activeCap === 'all'
                ? 'text-white'
                : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50',
            )}
            style={activeCap === 'all' ? { backgroundColor: '#c0512f' } : undefined}
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
                  ? 'text-white'
                  : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50',
              )}
              style={activeCap === cap.id ? { backgroundColor: '#c0512f' } : undefined}
            >
              {cap.label}
            </button>
          ))}
        </div>

        {/* 场景卡片网格 */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {filteredBundles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-16 text-center text-[13px] text-zinc-500">
              暂无匹配场景，试试调整筛选条件
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 pb-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredBundles.map((bundle) => {
                const isNew = isScenarioNew(bundle.id);
                const isGold = topBundles.some((b) => b.id === bundle.id);
                const capability = SCENARIO_CAPABILITY_CATEGORIES.find((c) =>
                  getScenarioCapabilities(bundle.id).includes(c.id),
                );
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
                const outcome = primaryCase ? outcomeFromNarrativeCard(primaryCase) : null;
                const plan = resolveScenarioDemoPlan(bundle);
                const engagement = useContentEngagementStore.getState().get(bundle.id);

                return (
                  <article
                    key={bundle.id}
                    className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm transition hover:shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
                        <i className={`fa-solid ${bundle.icon} text-[14px]`} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="text-[14px] font-semibold text-zinc-900">{bundle.label}</h3>
                          {isGold ? (
                            <span
                              className="rounded-full px-1.5 py-0 text-[9px] font-semibold text-white"
                              style={{ backgroundColor: '#c0512f' }}
                            >
                              金案例
                            </span>
                          ) : null}
                          {isNew ? (
                            <span className="rounded-full bg-zinc-900 px-1.5 py-0 text-[9px] font-semibold text-white">
                              New
                            </span>
                          ) : null}
                        </div>
                        {capability ? (
                          <p className="text-[11px] text-zinc-400">{capability.label}</p>
                        ) : null}
                      </div>
                    </div>

                    <p className="line-clamp-2 text-[12px] leading-relaxed text-zinc-600">
                      {bundle.desc}
                    </p>

                    {/* 痛点 / 成效 */}
                    {outcome ? (
                      <div className="space-y-1.5 rounded-xl bg-zinc-50/80 p-2.5">
                        <p className="line-clamp-1 text-[11px] text-zinc-600">
                          <span className="font-medium text-zinc-800">痛点：</span>
                          {outcome.painPoint}
                        </p>
                        <p className="line-clamp-1 text-[11px] text-zinc-600">
                          <span className="font-medium text-zinc-800">成效：</span>
                          {outcome.impactMetric}
                        </p>
                      </div>
                    ) : null}

                    {/* 专家链路缩略 */}
                    {plan?.mode === 'team' && plan.steps.length > 0 ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                        <i className="fa-solid fa-users-gear text-[10px] text-zinc-400" />
                        <span className="line-clamp-1">
                          专家链路：{plan.steps.map((s) => s.label).join(' → ')}
                        </span>
                      </div>
                    ) : null}

                    {/* 能力标签 */}
                    <div className="flex flex-wrap gap-1.5">
                      {bundle.agents.slice(0, 2).map((card) => (
                        <span
                          key={card.id}
                          className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600"
                        >
                          {card.title}
                        </span>
                      ))}
                      {bundle.tools.slice(0, 2).map((card) => (
                        <span
                          key={card.id}
                          className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600"
                        >
                          {card.title}
                        </span>
                      ))}
                    </div>

                    {/* 互动数据 */}
                    <div className="flex items-center gap-3 text-[10px] text-zinc-400">
                      <span>{engagement.updatedAt}</span>
                      <span>
                        <i className="fa-regular fa-eye mr-0.5" />
                        {formatNumber(engagement.uses)}
                      </span>
                      <span>
                        <i className="fa-regular fa-thumbs-up mr-0.5" />
                        {formatNumber(engagement.likes)}
                      </span>
                      <span>热度 {Math.round(heatScore(engagement))}</span>
                    </div>

                    {/* 操作 */}
                    <div className="mt-auto flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(bundle.id);
                          bumpUse(bundle.id);
                        }}
                        className="flex-1 rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-1.5 text-[11px] font-medium text-zinc-800 transition hover:bg-zinc-200"
                      >
                        查看详情
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          startScenarioTask(bundle);
                          toggleLike(bundle.id);
                        }}
                        className="flex-1 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition hover:opacity-90"
                        style={{ borderColor: '#c0512f', color: '#c0512f', backgroundColor: '#fff' }}
                      >
                        开启任务
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
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
