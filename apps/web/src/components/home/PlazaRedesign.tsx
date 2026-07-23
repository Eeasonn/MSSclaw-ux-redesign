import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type {
  PrototypeAgentSeed,
  PrototypeSkillSeed,
  PrototypeToolSeed,
} from '@/domain/prototype/types';
import {
  FEATURED_SCENARIOS,
  buildScenarioBundles,
  type PortalMapCard,
  type PortalCardAction,
  type ScenarioBundle,
} from '@/domain/portalMap';

import {
  SCENARIO_CAPABILITY_CATEGORIES,
  SCENARIO_CAPABILITY_MAP,
  SCENARIO_PUBLISHED_AT,
  scenarioBelongsToCapability,
  type ScenarioCapabilityId,
} from '@/domain/scenarioCapabilities';
import {
  HQ_DEPTS,
  REGIONS,
  getDeptLabel,
  getRegionLabel,
  type DeptId,
  type RegionId,
} from '@/domain/orgTaxonomy';
import { hasGlobalOrgScope } from '@/domain/rolePerspective';
import { getAgentPersona } from '@/domain/prototype/agentPersonas';
import { resolveScenarioDemoPlan } from '@/domain/scenarioPipeline';
import {
  AI_TOOL_NAV_CATEGORIES,
  type AiToolNavCategoryId,
} from '@/domain/aiToolCategories';
import { getPlazaToolPicks } from '@/domain/plazaToolPicks';
import {
  getPlazaToolGuides,
  PLAZA_GUIDE_TYPE_LABEL,
  type PlazaToolGuide,
} from '@/domain/plazaToolGuides';
import { openPortalCard } from '@/domain/portalNavigation';
import { openResourceWithReturn } from '@/domain/openResourceNav';
import { openNewTaskWithPrefill } from '@/domain/openNewTask';
import { isNewScenario } from '@/domain/contentBadges';
import {
  RANK_MODE_OPTIONS,
  heatScore,
  sortByRankMode,
  type RankMode,
} from '@/domain/contentEngagement';
import {
  ensureEngagementSeeds,
  useContentEngagementStore,
} from '@/stores/contentEngagementStore';
import { AgentAvatar } from '@/components/brand/AgentAvatar';
import { ToolLogo } from '@/components/brand/ToolLogo';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { usePortalContentStore } from '@/stores/portalContentStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useAppViewStore } from '@/stores/appViewStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';

import { outcomeFromNarrativeCard } from '@/domain/portalCase';


interface PlazaRedesignProps {
  onInvokeAgent: (agent: PrototypeAgentSeed, prompt?: string) => void;
  onInvokeSkill: (skill: PrototypeSkillSeed) => void;
}

type Perspective =
  | { kind: 'global'; label: '全球管理者' }
  | { kind: 'region'; label: string; regionId: RegionId }
  | { kind: 'domain'; label: string; deptId: DeptId };

type BottomTab = 'skills' | 'agents' | 'teams';

const ACCENT = '#c0512f';
const FG = '#1c1a17';
const MUTED = '#6b6966';
const LINE = '#d4d2cf';

function usePlazaPerspective(): {
  perspective: Perspective;
  regionId: RegionId | 'all';
  deptId: DeptId | 'all';
  regionLocked: boolean;
  domainLocked: boolean;
} {
  const user = useSessionStore((s) => s.user);
  return useMemo(() => {
    const role = user?.platformRole;
    if (hasGlobalOrgScope(role)) {
      return {
        perspective: { kind: 'global', label: '全球管理者' },
        regionId: 'all',
        deptId: 'all',
        regionLocked: false,
        domainLocked: false,
      };
    }
    if (user?.regionId) {
      return {
        perspective: {
          kind: 'region',
          label: `区域负责人 · ${getRegionLabel(user.regionId)}`,
          regionId: user.regionId,
        },
        regionId: user.regionId,
        deptId: user?.deptIds?.[0] ?? 'all',
        regionLocked: true,
        domainLocked: false,
      };
    }
    if (user?.deptIds?.length) {
      const deptId = user.deptIds[0];
      return {
        perspective: {
          kind: 'domain',
          label: `业务领域负责人 · ${getDeptLabel(deptId)}`,
          deptId,
        },
        regionId: 'all',
        deptId,
        regionLocked: false,
        domainLocked: true,
      };
    }
    return {
      perspective: { kind: 'global', label: '全球管理者' },
      regionId: 'all',
      deptId: 'all',
      regionLocked: false,
      domainLocked: false,
    };
  }, [user]);
}

function regionMatch(item: { ownerRegionId?: RegionId | null }, regionId: RegionId | 'all'): boolean {
  if (regionId === 'all') return true;
  return item.ownerRegionId === regionId;
}

function domainMatch(item: { ownerDeptIds?: DeptId[] }, deptId: DeptId | 'all'): boolean {
  if (deptId === 'all') return true;
  if (!item.ownerDeptIds?.length) return true;
  return item.ownerDeptIds.includes(deptId);
}

function getCapabilityTags(capabilityId: ScenarioCapabilityId): string[] {
  const tags = new Set<string>();
  (Object.entries(SCENARIO_CAPABILITY_MAP) as [string, ScenarioCapabilityId[]][])
    .filter(([_, caps]) => caps.includes(capabilityId))
    .forEach(([scenarioId]) => {
      const scenario = FEATURED_SCENARIOS.find((s) => s.id === scenarioId);
      scenario?.matchTags.forEach((t) => tags.add(t));
    });
  return [...tags];
}

function capabilityMatch(
  item: { scenarioTags?: string[]; tags?: string[] },
  capabilityId: ScenarioCapabilityId | 'all',
): boolean {
  if (capabilityId === 'all') return true;
  const tags = getCapabilityTags(capabilityId);
  const source = [...(item.scenarioTags ?? []), ...(item.tags ?? [])];
  return source.some((t) => tags.includes(t));
}

function formatInvokes(n: number): string {
  if (n >= 10000) return `${Math.round(n / 10000)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-px text-[10px]',
        className,
      )}
    >
      {children}
    </span>
  );
}

function LockHint() {
  return <span className="text-[10px] text-[#c0512f]">由权限锁定</span>;
}

function resolveCardAgent(
  card: PortalMapCard,
  agents: PrototypeAgentSeed[],
): PrototypeAgentSeed | undefined {
  if (card.action.type === 'agent') {
    return agents.find((a) => a.id === (card.action as Extract<PortalCardAction, { type: 'agent' }>).agentId);
  }
  return agents.find((a) => a.name === card.title);
}

function MiniSelect<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  disabled,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
  ariaLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="relative w-[92px] shrink-0">
      <select
        aria-label={ariaLabel}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full appearance-none rounded-full border border-zinc-200/90 bg-white py-1.5 pl-2.5 pr-6 text-[11px] font-medium text-zinc-700 outline-none transition hover:border-zinc-300 focus:border-zinc-400 disabled:bg-zinc-100 disabled:text-zinc-500"
      >
        {options.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
      <i className="fa-solid fa-chevron-down pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-zinc-400" />
    </div>
  );
}

function HowToDrawer({
  toolName,
  guides,
  onClose,
  onOpenGuide,
}: {
  toolName: string;
  guides: PlazaToolGuide[];
  onClose: () => void;
  onOpenGuide: (g: PlazaToolGuide) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-[320px] flex-col border-l border-zinc-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3.5">
          <div className="min-w-0">
            <p className="font-serif text-[12px] italic text-zinc-400">How to</p>
            <h3 className="mt-0.5 truncate text-[14px] font-semibold text-zinc-900">{toolName}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-[12px] text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700"
          >
            关闭
          </button>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
          {guides.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => onOpenGuide(g)}
              className="flex w-full items-start gap-2.5 rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-3 py-2.5 text-left transition hover:border-zinc-300 hover:bg-white"
            >
              <span className="mt-0.5 shrink-0 rounded-md bg-zinc-900/90 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                {PLAZA_GUIDE_TYPE_LABEL[g.type]}
              </span>
              <span className="min-w-0">
                <span className="block text-[12px] font-semibold text-zinc-800">{g.title}</span>
                {g.blurb ? (
                  <span className="mt-0.5 block text-[10px] leading-snug text-zinc-400">{g.blurb}</span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}

function CardEngagementFooter({
  contentId,
  baseUses = 0,
  publishedAt,
}: {
  contentId: string;
  baseUses?: number;
  publishedAt?: string | null;
}) {
  const e = useContentEngagementStore((s) => s.get(contentId));
  const uses = e.uses + baseUses;
  const h = Math.round(heatScore({ ...e, uses }));
  return (
    <div className="mt-auto flex flex-wrap items-center gap-3 text-[10px]" style={{ color: MUTED }}>
      {publishedAt ? <span>{publishedAt}</span> : null}
      <span title="浏览量">
        <i className="fa-regular fa-eye mr-0.5" />
        {uses}
      </span>
      <span title="点赞量">
        <i className="fa-solid fa-thumbs-up mr-0.5" />
        {e.likes}
      </span>
      <span title="热度">
        <i className="fa-solid fa-fire mr-0.5" style={{ color: ACCENT }} />
        {h}
      </span>
    </div>
  );
}

export function PlazaRedesign({
  onInvokeAgent,
  onInvokeSkill,
}: PlazaRedesignProps) {
  const agents = useMarketplaceStore((s) => s.agents);
  const skills = useMarketplaceStore((s) => s.skills);
  const tools = useMarketplaceStore((s) => s.tools);
  const portalContent = usePortalContentStore((s) => s.items);
  const showToast = useMarketplaceStore((s) => s.showToast);
  const user = useSessionStore((s) => s.user);
  const setAppView = useAppViewStore((s) => s.setAppView);
  const engagementOf = useContentEngagementStore((s) => s.get);
  const engagementById = useContentEngagementStore((s) => s.byId);

  const { perspective, regionId: lockedRegionId, deptId: lockedDeptId, regionLocked, domainLocked } =
    usePlazaPerspective();

  const [regionId, setRegionId] = useState<RegionId | 'all'>(lockedRegionId);
  const [deptId, setDeptId] = useState<DeptId | 'all'>(lockedDeptId);
  const [capability, setCapability] = useState<ScenarioCapabilityId | 'all'>('all');
  const [bottomTab, setBottomTab] = useState<BottomTab>('skills');
  const [scenarioRankMode, setScenarioRankMode] = useState<RankMode>('trending');
  const [bottomRankMode, setBottomRankMode] = useState<RankMode>('trending');
  const [activeToolCategory, setActiveToolCategory] = useState<AiToolNavCategoryId>('chat');
  const [howToTool, setHowToTool] = useState<PrototypeToolSeed | null>(null);

  const effectiveRegionId = regionLocked ? lockedRegionId : regionId;
  const effectiveDeptId = domainLocked ? lockedDeptId : deptId;

  const affiliation = useMemo(
    () => ({
      deptIds: user?.deptIds ?? [],
      regionId: user?.regionId ?? null,
    }),
    [user],
  );

  const userId = user?.id ?? '';
  const userName = user?.name ?? '';
  const role = user?.platformRole;

  const bundles = useMemo(() => {
    return buildScenarioBundles({
      agents,
      skills,
      tools,
      portalContent,
      affiliation,
      userId,
      userName,
      role,
      filter: 'all',
      deptFilter: effectiveDeptId,
      regionFilter: effectiveRegionId,
    });
  }, [agents, skills, tools, portalContent, affiliation, userId, userName, role, effectiveDeptId, effectiveRegionId]);

  const bundleById = useMemo(() => {
    return new Map(bundles.map((b) => [b.id, b]));
  }, [bundles]);

  const toolsById = useMemo(() => {
    return new Map(tools.map((t) => [t.id, t]));
  }, [tools]);

  const featuredScenes = useMemo(() => {
    const list = FEATURED_SCENARIOS.filter((s) => {
      if (capability !== 'all' && !scenarioBelongsToCapability(s.id, capability)) return false;
      return true;
    }).map((s) => ({
      id: s.id,
      def: s,
      bundle: bundleById.get(s.id),
      publishedAt: SCENARIO_PUBLISHED_AT[s.id as keyof typeof SCENARIO_PUBLISHED_AT] ?? '',
    }));
    const withBundle = list.filter(
      (x): x is typeof x & { bundle: ScenarioBundle } => Boolean(x.bundle),
    );
    return sortByRankMode(withBundle, scenarioRankMode, engagementOf).slice(0, 4);
  }, [bundleById, capability, scenarioRankMode, engagementOf, engagementById]);

  const goldScenarioIds = useMemo(() => {
    return [...FEATURED_SCENARIOS]
      .map((s) => ({ id: s.id, bundle: bundleById.get(s.id) }))
      .filter((x): x is { id: string; bundle: ScenarioBundle } => Boolean(x.bundle))
      .sort((a, b) => heatScore(engagementOf(b.id)) - heatScore(engagementOf(a.id)))
      .slice(0, 2)
      .map((x) => x.id);
  }, [bundleById, engagementOf, engagementById]);

  const filteredSkills = useMemo(() => {
    const list = skills
      .filter(
        (s) =>
          s.published &&
          regionMatch(s, effectiveRegionId) &&
          domainMatch(s, effectiveDeptId) &&
          capabilityMatch(s, capability),
      )
      .map((s) => ({ ...s, publishedAt: s.uploadedAt ?? '' }));
    return sortByRankMode(list, bottomRankMode, engagementOf).slice(0, 4);
  }, [skills, effectiveRegionId, effectiveDeptId, capability, bottomRankMode, engagementOf, engagementById]);

  const filteredAgents = useMemo(() => {
    const list = agents.filter(
      (a) =>
        a.published &&
        (effectiveRegionId === 'all' ||
          (a.ownerRegionIds?.includes(effectiveRegionId) ?? !a.ownerRegionIds?.length)) &&
        domainMatch(a, effectiveDeptId),
    );
    return sortByRankMode(list, bottomRankMode, engagementOf).slice(0, 4);
  }, [agents, effectiveRegionId, effectiveDeptId, bottomRankMode, engagementOf, engagementById]);

  const teamScenes = useMemo(() => {
    return sortByRankMode(featuredScenes, bottomRankMode, engagementOf).slice(0, 4);
  }, [featuredScenes, bottomRankMode, engagementOf, engagementById]);

  useEffect(() => {
    const ids = [
      ...portalContent.map((p) => p.id),
      ...FEATURED_SCENARIOS.map((s) => s.id),
      ...skills.map((s) => s.id),
      ...agents.map((a) => a.id),
    ];
    ensureEngagementSeeds(ids);
  }, [portalContent, skills, agents]);

  function openScenarioMap() {
    openResourceWithReturn('ai-map');
  }

  const focusScenario = useNavigationIntentStore((s) => s.focusScenario);
  const focusCase = useNavigationIntentStore((s) => s.focusCase);

  function openScenarioCaseInAiMap(scenarioId: string, caseId?: string | null) {
    if (caseId) focusCase(caseId);
    focusScenario(scenarioId);
    setAppView('ai-map');
  }

  function handleCard(card: PortalMapCard) {
    openPortalCard(card, { onInvokeAgent, onInvokeSkill, showToast });
  }

  function openTool(tool: PrototypeToolSeed) {
    const card: PortalMapCard = {
      id: `tool:${tool.id}`,
      kind: tool.sourceType === 'external' ? 'external_tool' : 'tool',
      title: tool.name,
      desc: tool.desc,
      icon: tool.icon,
      kindLabel: tool.sourceType === 'external' ? '外部工具' : '内部工具',
      action:
        tool.sourceType === 'external' && tool.homepageUrl
          ? { type: 'external', url: tool.homepageUrl }
          : { type: 'tool', toolId: tool.id, homepageUrl: tool.homepageUrl },
    };
    handleCard(card);
  }

  function prefillScenarioTask(bundle: ScenarioBundle) {
    const plan = resolveScenarioDemoPlan(bundle);
    if (!plan) {
      showToast('该场景暂无可执行任务');
      return;
    }
    const label = FEATURED_SCENARIOS.find((s) => s.id === bundle.id)?.label ?? bundle.label;
    if (plan.mode === 'team') {
      openNewTaskWithPrefill(`@专家团：${label} `);
    } else if (plan.soloSkill) {
      openNewTaskWithPrefill(`${plan.soloSkill.command} `);
    } else if (plan.soloAgent) {
      const persona = getAgentPersona(plan.soloAgent);
      openNewTaskWithPrefill(`@${persona.name} `);
    } else {
      showToast('该场景暂无可执行任务');
    }
  }

  function openHowTo(tool: PrototypeToolSeed) {
    setHowToTool(tool);
  }

  function openGuideResource(g: PlazaToolGuide) {
    if (!g.url || g.url === '#') {
      showToast(`指引「${g.title}」演示占位，后续可挂 PPT / 图片 / 视频`);
      return;
    }
    window.open(g.url, '_blank', 'noopener,noreferrer');
  }

  const perspectiveScope =
    perspective.kind === 'global'
      ? '全部区域 · 全部领域'
      : perspective.kind === 'region'
        ? '区域已锁定 · 领域可选'
        : '领域已锁定 · 区域可选';

  const currentToolPicks = useMemo(() => {
    const picks = getPlazaToolPicks(activeToolCategory);
    const external = picks.external
      .map((id) => toolsById.get(id))
      .filter((t): t is PrototypeToolSeed => Boolean(t));
    const internal = picks.internal
      .map((id) => toolsById.get(id))
      .filter((t): t is PrototypeToolSeed => Boolean(t));
    return { external, internal };
  }, [activeToolCategory, toolsById]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto scroll-hidden bg-white pb-4">
      {/* 逛广场大标题 */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: MUTED }}>
            MSS CLAW
          </p>
          <h1 className="text-[22px] font-semibold tracking-tight text-zinc-900 md:text-[26px]">
            逛广场
          </h1>
          <p className="mt-0.5 text-[12px]" style={{ color: MUTED }}>
            发现场景、能力与灵感
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]" style={{ color: MUTED }}>
          <span className="rounded-full border px-2.5 py-1" style={{ borderColor: LINE }}>
            {perspective.label}
          </span>
          <span>{perspectiveScope}</span>
        </div>
      </div>

      {/* 顶部控制区 */}
      <div className="flex flex-wrap items-end gap-4">
        <div className={cn('flex flex-col gap-1', regionLocked && 'opacity-70')}>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>
              区域
            </span>
            {regionLocked ? <LockHint /> : null}
          </div>
          <select
            aria-label="区域"
            disabled={regionLocked}
            value={effectiveRegionId}
            onChange={(e) => setRegionId(e.target.value as RegionId | 'all')}
            className="w-[120px] rounded-lg border bg-white px-2.5 py-1.5 text-[11px] outline-none transition disabled:bg-[#f4f4f5] disabled:text-[#6b6966]"
            style={{ borderColor: LINE, color: FG }}
          >
            <option value="all">全部区域</option>
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div className={cn('flex flex-col gap-1', domainLocked && 'opacity-70')}>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>
              领域
            </span>
            {domainLocked ? <LockHint /> : null}
          </div>
          <select
            aria-label="领域"
            disabled={domainLocked}
            value={effectiveDeptId}
            onChange={(e) => setDeptId(e.target.value as DeptId | 'all')}
            className="w-[120px] rounded-lg border bg-white px-2.5 py-1.5 text-[11px] outline-none transition disabled:bg-[#f4f4f5] disabled:text-[#6b6966]"
            style={{ borderColor: LINE, color: FG }}
          >
            <option value="all">全部领域</option>
            {HQ_DEPTS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 功能场景 chips */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCapability('all')}
          className={cn(
            'rounded-full border px-3 py-1 text-[11px] font-medium transition',
            capability === 'all'
              ? 'border-transparent text-white'
              : 'bg-white hover:border-[#6b6966]',
          )}
          style={capability === 'all' ? { backgroundColor: FG } : { borderColor: LINE, color: FG }}
        >
          全部场景
        </button>
        {SCENARIO_CAPABILITY_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCapability(c.id)}
            className={cn(
              'rounded-full border px-3 py-1 text-[11px] font-medium transition',
              capability === c.id
                ? 'border-transparent text-white'
                : 'bg-white hover:border-[#6b6966]',
            )}
            style={capability === c.id ? { backgroundColor: FG } : { borderColor: LINE, color: FG }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* 上区：精选场景 */}
      <div className="flex flex-col gap-3 rounded-xl border bg-white p-4" style={{ borderColor: LINE }}>
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold tracking-tight" style={{ color: FG }}>
            精选场景
          </h3>
          <div className="flex items-center gap-2">
            <MiniSelect
              ariaLabel="场景排序"
              value={scenarioRankMode}
              onChange={setScenarioRankMode}
              options={[...RANK_MODE_OPTIONS]}
            />
            <button
              type="button"
              onClick={openScenarioMap}
              className="text-[11px] font-medium transition hover:opacity-80"
              style={{ color: ACCENT }}
            >
              进案例样板间 →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2">
          {featuredScenes.map(({ def, bundle, publishedAt }) => {
            const b = bundle!;
            const skillCards = b.tools.slice(0, 4);
            const topCase = [...b.cases].sort(
              (a, bb) => heatScore(engagementOf(bb.id)) - heatScore(engagementOf(a.id)),
            )[0];
            const narrative = topCase ? outcomeFromNarrativeCard(topCase) : null;
            const primaryCaseId = topCase?.action.type === 'case' ? topCase.action.caseId : null;
            const isGold = goldScenarioIds.includes(def.id);
            const isNew = isNewScenario(def.id);
            const cap = SCENARIO_CAPABILITY_CATEGORIES.find((c) =>
              SCENARIO_CAPABILITY_MAP[def.id as keyof typeof SCENARIO_CAPABILITY_MAP]?.includes(c.id),
            );
            const pipelineSteps = narrative?.steps?.length ? narrative.steps.slice(0, 3) : [];
            return (
              <div
                key={def.id}
                className="flex flex-col gap-3 rounded-xl border p-4"
                style={{ borderColor: LINE, backgroundColor: '#fff' }}
              >
                {/* 顶部标题行：图标 + 标题 + 分类标签 + 徽章 */}
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: '#f0eeeb', color: MUTED }}
                  >
                    <i className={cn('fa-solid text-[18px]', def.icon)} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="line-clamp-1 text-[14px] font-semibold" style={{ color: FG }}>
                          {def.label}
                        </h3>
                        {cap ? (
                          <span
                            className="rounded border px-1.5 py-px text-[9px]"
                            style={{ backgroundColor: '#fff', borderColor: LINE, color: MUTED }}
                          >
                            {cap.label}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-1">
                        {isGold ? (
                          <span
                            className="rounded border px-1.5 py-px text-[9px] font-semibold"
                            style={{ backgroundColor: '#fff', borderColor: '#e6a23c', color: '#b45309' }}
                          >
                            金案例
                          </span>
                        ) : null}
                        {isNew ? (
                          <span
                            className="rounded border px-1.5 py-px text-[9px] font-semibold"
                            style={{ backgroundColor: '#fff', borderColor: '#2e7d32', color: '#2e7d32' }}
                          >
                            New
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <p className="line-clamp-2 text-[11px] leading-relaxed" style={{ color: MUTED }}>
                      {narrative?.desc ?? def.desc}
                    </p>
                  </div>
                </div>

                {/* 专家链路步骤 */}
                {pipelineSteps.length > 0 ? (
                  <div className="flex flex-col gap-2 rounded-lg border p-2.5" style={{ borderColor: '#eeebe7' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold" style={{ color: FG }}>
                        专家链路
                      </span>
                      <span className="text-[9px]" style={{ color: MUTED }}>
                        {pipelineSteps.length} 步接力
                      </span>
                    </div>
                    <ol className="flex flex-col gap-2">
                      {pipelineSteps.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span
                            className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[8px] font-semibold text-white"
                            style={{ backgroundColor: FG }}
                          >
                            {idx + 1}
                          </span>
                          <span className="line-clamp-2 flex-1 text-[10px] leading-relaxed" style={{ color: MUTED }}>
                            {step}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}

                {/* 痛点 + 成效 */}
                {narrative ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border p-2.5" style={{ borderColor: '#eeebe7' }}>
                      <span className="mb-1 block text-[9px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>
                        痛点
                      </span>
                      <p className="line-clamp-3 text-[10px] leading-relaxed" style={{ color: FG }}>
                        {narrative.painPoint.replace(/^业务痛点[：:]?\s?/, '')}
                      </p>
                    </div>
                    <div className="rounded-lg border p-2.5" style={{ borderColor: '#eeebe7' }}>
                      <span className="mb-1 block text-[9px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>
                        成效指标
                      </span>
                      <p className="line-clamp-3 text-[10px] font-semibold leading-relaxed" style={{ color: '#2e7d32' }}>
                        {narrative.impactMetric.replace(/^提效效果[：:]?\s?/, '')}
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* 关键技能 / 工具标签 */}
                {skillCards.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {skillCards.map((c) => (
                      <span
                        key={c.id}
                        className="inline-flex items-center gap-1 rounded-full border px-2 py-px text-[9px]"
                        style={{ borderColor: LINE, color: MUTED }}
                      >
                        <i className={cn('fa-solid text-[8px]', c.icon)} />
                        {c.meta || c.title}
                      </span>
                    ))}
                  </div>
                ) : null}

                {/* 底部：互动数据 + 操作 */}
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
                  <CardEngagementFooter contentId={def.id} publishedAt={publishedAt} />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openScenarioCaseInAiMap(def.id, primaryCaseId)}
                      className="rounded-md border bg-zinc-50 px-3 py-1.5 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-100"
                      style={{ borderColor: LINE }}
                    >
                      查看详情
                    </button>
                    <button
                      type="button"
                      onClick={() => prefillScenarioTask(b)}
                      className="rounded-md border bg-white px-3 py-1.5 text-[11px] font-semibold transition hover:bg-zinc-50"
                      style={{ borderColor: FG, color: FG }}
                    >
                      开启任务
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 下区：马上能用 */}
      <div className="rounded-xl border bg-white p-4" style={{ borderColor: LINE }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xl font-semibold tracking-tight" style={{ color: FG }}>
            马上能用
          </h3>
          <span className="text-[10px]" style={{ color: MUTED }}>
            全局公共入口，不受区域/领域筛选影响
          </span>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          {AI_TOOL_NAV_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveToolCategory(c.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition',
                activeToolCategory === c.id
                  ? 'border-transparent text-white'
                  : 'bg-white hover:border-[#6b6966]',
              )}
              style={
                activeToolCategory === c.id
                  ? { backgroundColor: FG }
                  : { borderColor: LINE, color: FG }
              }
              title={c.blurb}
            >
              <i className={cn('fa-solid text-[10px]', c.icon)} />
              {c.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <div className="text-[11px] font-semibold" style={{ color: FG }}>
              外部
            </div>
            <div className="flex flex-col gap-2">
              {currentToolPicks.external.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  onClick={() => openTool(tool)}
                  onHowTo={() => openHowTo(tool)}
                />
              ))}
              {!currentToolPicks.external.length && (
                <p className="text-[10px]" style={{ color: MUTED }}>
                  该分类暂无外部推荐
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-[11px] font-semibold" style={{ color: FG }}>
              内部
            </div>
            <div className="flex flex-col gap-2">
              {currentToolPicks.internal.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  onClick={() => openTool(tool)}
                  onHowTo={() => openHowTo(tool)}
                />
              ))}
              {!currentToolPicks.internal.length && (
                <p className="text-[10px]" style={{ color: MUTED }}>
                  该分类暂无内部推荐
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 下区：能力市场 */}
      <div className="rounded-xl border bg-white p-4" style={{ borderColor: LINE }}>
        <h3 className="mb-3 text-xl font-semibold tracking-tight" style={{ color: FG }}>
          能力市场
        </h3>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-2" style={{ borderColor: LINE }}>
          <div className="flex gap-1">
            {[
              { id: 'skills', label: '热门技能' },
              { id: 'agents', label: '热门专家' },
              { id: 'teams', label: '专家团' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setBottomTab(t.id as BottomTab)}
                className={cn(
                  'rounded-md px-3 py-1 text-[11px] font-medium transition',
                  bottomTab === t.id ? 'text-white' : 'hover:bg-[#f4f4f5]',
                )}
                style={bottomTab === t.id ? { backgroundColor: FG } : { color: FG }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <MiniSelect
            ariaLabel="Tab 排序"
            value={bottomRankMode}
            onChange={setBottomRankMode}
            options={[...RANK_MODE_OPTIONS]}
          />
        </div>

        {bottomTab === 'skills' ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filteredSkills.map((skill) => (
              <button
                key={skill.id}
                type="button"
                onClick={() => openNewTaskWithPrefill(`${skill.command} `)}
                className="flex flex-col gap-2 rounded-lg border bg-white p-3 text-left transition hover:bg-zinc-50/60"
                style={{ borderColor: LINE }}
              >
                <div className="flex items-center gap-2">
                  <i className={cn('fa-solid text-[12px]', skill.icon)} style={{ color: MUTED }} />
                  <span className="text-[12px] font-semibold" style={{ color: FG }}>
                    {skill.command} · {skill.name}
                  </span>
                </div>
                <p className="line-clamp-2 text-[10px]" style={{ color: MUTED }}>
                  {skill.desc.replace(/^【[^】]*】/, '')}
                </p>
                <div className="flex flex-wrap gap-1">
                  {skill.ownerRegionId ? (
                    <Tag className="border-[#4a7c59] text-[#4a7c59]">{getRegionLabel(skill.ownerRegionId)}</Tag>
                  ) : (
                    <Tag className="border-[#4a7c59] text-[#4a7c59]">全球</Tag>
                  )}
                  {(skill.ownerDeptIds ?? []).slice(0, 2).map((d) => (
                    <Tag key={d} className="border-[#5b6b8c] text-[#5b6b8c]">
                      {getDeptLabel(d)}
                    </Tag>
                  ))}
                </div>
                <CardEngagementFooter
                  contentId={skill.id}
                  baseUses={skill.invokes}
                  publishedAt={skill.uploadedAt}
                />
              </button>
            ))}
          </div>
        ) : bottomTab === 'agents' ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filteredAgents.map((agent) => {
              const persona = getAgentPersona(agent);
              const agentDepts = agent.ownerDeptIds ?? (agent.homeTag ? [agent.homeTag] : []);
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => openNewTaskWithPrefill(`@${persona.name} `)}
                  className="flex items-start gap-3 rounded-lg border bg-white p-3 text-left transition hover:bg-zinc-50/60"
                  style={{ borderColor: LINE }}
                >
                  <AgentAvatar agentId={agent.id} size={36} title={persona.name} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold" style={{ color: FG }}>
                      {persona.name}
                      <span className="ml-1 font-normal" style={{ color: MUTED }}>
                        · {persona.role}
                      </span>
                    </p>
                    <p className="line-clamp-2 text-[10px]" style={{ color: MUTED }}>
                      {persona.tagline}
                    </p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {agent.ownerRegionIds?.length ? (
                        agent.ownerRegionIds.slice(0, 2).map((r) => (
                          <Tag key={r} className="border-[#4a7c59] text-[#4a7c59]">
                            {getRegionLabel(r)}
                          </Tag>
                        ))
                      ) : (
                        <Tag className="border-[#4a7c59] text-[#4a7c59]">全球</Tag>
                      )}
                      {agentDepts.slice(0, 2).map((d) => (
                        <Tag key={d} className="border-[#5b6b8c] text-[#5b6b8c]">
                          {getDeptLabel(d)}
                        </Tag>
                      ))}
                    </div>
                    <CardEngagementFooter contentId={agent.id} baseUses={agent.invokes} />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {teamScenes.map(({ def, bundle, publishedAt }) => {
              const b = bundle!;
              const teamAgents = b.agents.slice(0, 4);
              return (
                <button
                  key={def.id}
                  type="button"
                  onClick={() => openNewTaskWithPrefill(`@专家团：${def.label} `)}
                  className="flex flex-col gap-2 rounded-lg border bg-white p-3 text-left transition hover:bg-zinc-50/60"
                  style={{ borderColor: LINE }}
                >
                  <div className="flex items-center gap-2">
                    <i className={cn('fa-solid text-[12px]', def.icon)} style={{ color: MUTED }} />
                    <span className="text-[12px] font-semibold" style={{ color: FG }}>
                      {def.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {teamAgents.map((card) => {
                      const targetAgent = resolveCardAgent(card, agents);
                      const p = targetAgent ? getAgentPersona(targetAgent) : null;
                      return (
                        <div
                          key={card.id}
                          className="flex items-center gap-1.5 rounded-full border px-2 py-1"
                          style={{ borderColor: LINE }}
                        >
                          {targetAgent ? (
                            <AgentAvatar agentId={targetAgent.id} size={18} title={p?.name ?? card.title} />
                          ) : (
                            <span
                              className="flex h-[18px] w-[18px] items-center justify-center rounded-full text-[8px]"
                              style={{ backgroundColor: '#e8e4df', color: MUTED }}
                            >
                              {(p?.name ?? card.title).charAt(0)}
                            </span>
                          )}
                          <span className="text-[10px]" style={{ color: FG }}>
                            {p?.name ?? card.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <CardEngagementFooter contentId={def.id} publishedAt={publishedAt} />
                  <span
                    className="mt-1 self-start text-[11px] font-semibold transition hover:opacity-80"
                    style={{ color: ACCENT }}
                  >
                    开启任务 →
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {howToTool ? (
        <HowToDrawer
          toolName={howToTool.name}
          guides={getPlazaToolGuides(howToTool.id)}
          onClose={() => setHowToTool(null)}
          onOpenGuide={openGuideResource}
        />
      ) : null}
    </div>
  );
}

function ToolCard({
  tool,
  onClick,
  onHowTo,
}: {
  tool: PrototypeToolSeed;
  onClick: () => void;
  onHowTo: () => void;
}) {
  const hasGuide = getPlazaToolGuides(tool.id).length > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-3 rounded-lg border bg-white p-3 text-left transition hover:bg-zinc-50/60"
      style={{ borderColor: LINE }}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: '#f0eeeb' }}>
        <ToolLogo name={tool.name} logoUrl={tool.logoUrl} icon={tool.icon} size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold" style={{ color: FG }}>
            {tool.name}
          </span>
          <span className="text-[10px]" style={{ color: MUTED }}>
            {tool.sourceType === 'external' ? '外部' : '内部'}
          </span>
        </div>
        <p className="line-clamp-2 text-[10px]" style={{ color: MUTED }}>
          {tool.desc}
        </p>
        <div className="mt-1 flex items-center gap-2 text-[10px]" style={{ color: MUTED }}>
          <span>调用 {formatInvokes(tool.invokes)}</span>
          {hasGuide ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onHowTo();
              }}
              className="flex h-4 w-4 items-center justify-center rounded-full border text-[10px] font-semibold transition hover:border-zinc-400 hover:text-zinc-700"
              style={{ borderColor: LINE, color: ACCENT }}
              title="How to 指引"
            >
              ?
            </button>
          ) : null}
        </div>
      </div>
    </button>
  );
}
