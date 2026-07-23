import { useMemo, useState, type ReactNode } from 'react';
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
import { type PortalContentItem } from '@/domain/prototype/portalContent';
import {
  SCENARIO_CAPABILITY_CATEGORIES,
  SCENARIO_CAPABILITY_MAP,
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
import { PLAZA_TOOL_PICKS } from '@/domain/plazaToolPicks';
import { isHomeAiTool } from '@/domain/aiToolCategories';
import { openPortalCard } from '@/domain/portalNavigation';
import { openResourceWithReturn } from '@/domain/openResourceNav';
import { isNewScenario } from '@/domain/contentBadges';
import { AgentAvatar } from '@/components/brand/AgentAvatar';
import { ToolLogo } from '@/components/brand/ToolLogo';
import { ScenarioDetailModal } from '@/components/content/ScenarioDetailModal';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { usePortalContentStore } from '@/stores/portalContentStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useAppViewStore } from '@/stores/appViewStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import type { ScenarioDemoPlan } from '@/domain/scenarioPipeline';

interface PlazaRedesignProps {
  onInvokeAgent: (agent: PrototypeAgentSeed, prompt?: string) => void;
  onInvokeSkill: (skill: PrototypeSkillSeed) => void;
  onStartExpertTeam: (plan: ScenarioDemoPlan, fromIndex?: number) => void;
}

type Perspective =
  | { kind: 'global'; label: '全球管理者' }
  | { kind: 'region'; label: string; regionId: RegionId }
  | { kind: 'domain'; label: string; deptId: DeptId };

type BottomTab = 'skills' | 'agents' | 'teams';

const SCENARIO_OUTCOMES: Record<string, string> = {
  'price-offer-monitor': '每日破价清单 + 区域价监周报',
  'ecommerce-review': '评论情感报告 + Top 10 痛点清单',
  'retail-training': '门店培训课件 + 陪练对话脚本',
  'hr-interview': '候选人速评表 + 面试问题清单',
  'l10n-translation': '多语种本地化稿 + 术语对照表',
  'fulfillment-settlement': '结算异常清单 + 对账核验报告',
  'knowledge-deposit': '带引用标准答案 + 归档知识条目',
};

const ACCENT = '#c0512f';
const ACCENT_SOFT = '#fff0e8';
const SURFACE = '#faf7f2';
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

function isPublicInsight(item: PortalContentItem): boolean {
  return item.ownerRegionId === null;
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

function contentToCard(item: PortalContentItem): PortalMapCard {
  return {
    id: `portal:${item.id}`,
    kind: item.type,
    title: item.title,
    desc: item.desc,
    icon: item.icon,
    kindLabel:
      item.type === 'case'
        ? '场景案例'
        : item.type === 'training'
          ? '培训赋能'
          : '前沿洞察',
    publishedAt: item.publishedAt,
    ownerDeptIds: item.ownerDeptIds,
    ownerRegionId: item.ownerRegionId ?? null,
    action: { type: 'case', caseId: item.id },
  };
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

export function PlazaRedesign({
  onInvokeAgent,
  onInvokeSkill,
  onStartExpertTeam,
}: PlazaRedesignProps) {
  const agents = useMarketplaceStore((s) => s.agents);
  const skills = useMarketplaceStore((s) => s.skills);
  const tools = useMarketplaceStore((s) => s.tools);
  const portalContent = usePortalContentStore((s) => s.items);
  const showToast = useMarketplaceStore((s) => s.showToast);
  const user = useSessionStore((s) => s.user);
  const setAppView = useAppViewStore((s) => s.setAppView);
  const focusPortalType = useNavigationIntentStore((s) => s.focusPortalType);

  const { perspective, regionId: lockedRegionId, deptId: lockedDeptId, regionLocked, domainLocked } =
    usePlazaPerspective();

  const [regionId, setRegionId] = useState<RegionId | 'all'>(lockedRegionId);
  const [deptId, setDeptId] = useState<DeptId | 'all'>(lockedDeptId);
  const [capability, setCapability] = useState<ScenarioCapabilityId | 'all'>('all');
  const [bottomTab, setBottomTab] = useState<BottomTab>('skills');
  const [detailBundle, setDetailBundle] = useState<ScenarioBundle | null>(null);

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

  const publicInsights = useMemo(() => {
    return portalContent
      .filter((i) => i.published !== false && isPublicInsight(i))
      .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
      .slice(0, 3);
  }, [portalContent]);

  const filteredInsights = useMemo(() => {
    return portalContent
      .filter(
        (i) =>
          i.published !== false &&
          !isPublicInsight(i) &&
          regionMatch(i, effectiveRegionId) &&
          domainMatch(i, effectiveDeptId) &&
          capabilityMatch(i, capability),
      )
      .sort(
        (a, b) =>
          Number(Boolean(b.isGold)) - Number(Boolean(a.isGold)) ||
          (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''),
      );
  }, [portalContent, effectiveRegionId, effectiveDeptId, capability]);

  const featuredScenes = useMemo(() => {
    return FEATURED_SCENARIOS.filter((s) => {
      if (capability !== 'all' && !scenarioBelongsToCapability(s.id, capability)) return false;
      return true;
    })
      .map((s) => ({ def: s, bundle: bundleById.get(s.id) }))
      .filter(({ bundle }) => Boolean(bundle))
      .slice(0, 4);
  }, [bundleById, capability]);

  const hotScenarioIds = useMemo(() => {
    return [...FEATURED_SCENARIOS]
      .map((s) => ({ id: s.id, bundle: bundleById.get(s.id) }))
      .filter((x): x is { id: string; bundle: ScenarioBundle } => Boolean(x.bundle))
      .sort((a, b) => {
        const aScore = a.bundle.agents.length + a.bundle.tools.length + a.bundle.cases.length;
        const bScore = b.bundle.agents.length + b.bundle.tools.length + b.bundle.cases.length;
        return bScore - aScore;
      })
      .slice(0, 3)
      .map((x) => x.id);
  }, [bundleById]);

  const homeAiTools = useMemo(() => tools.filter(isHomeAiTool), [tools]);

  const chatTools = useMemo(() => {
    const picks = PLAZA_TOOL_PICKS.chat;
    const ids = [...picks.external, ...picks.internal].slice(0, 4);
    return ids
      .map((id) => homeAiTools.find((t) => t.id === id))
      .filter((t): t is PrototypeToolSeed => Boolean(t));
  }, [homeAiTools]);

  const searchOfficeTools = useMemo(() => {
    const search = PLAZA_TOOL_PICKS.search;
    const office = PLAZA_TOOL_PICKS.office;
    const ids = [...search.external, ...search.internal, ...office.external, ...office.internal].slice(0, 4);
    return ids
      .map((id) => homeAiTools.find((t) => t.id === id))
      .filter((t): t is PrototypeToolSeed => Boolean(t));
  }, [homeAiTools]);

  const filteredSkills = useMemo(() => {
    return skills
      .filter(
        (s) =>
          s.published &&
          regionMatch(s, effectiveRegionId) &&
          domainMatch(s, effectiveDeptId) &&
          capabilityMatch(s, capability),
      )
      .sort((a, b) => b.invokes - a.invokes)
      .slice(0, 4);
  }, [skills, effectiveRegionId, effectiveDeptId, capability]);

  const filteredAgents = useMemo(() => {
    return agents
      .filter(
        (a) =>
          a.published &&
          (effectiveRegionId === 'all' ||
            (a.ownerRegionIds?.includes(effectiveRegionId) ?? !a.ownerRegionIds?.length)) &&
          domainMatch(a, effectiveDeptId),
      )
      .sort((a, b) => b.invokes - a.invokes)
      .slice(0, 4);
  }, [agents, effectiveRegionId, effectiveDeptId]);

  const teamScenes = useMemo(() => {
    return featuredScenes.slice(0, 4);
  }, [featuredScenes]);

  function openScenarioMap() {
    openResourceWithReturn('ai-map');
  }

  function openOpsMore(type: 'news' | 'training' | 'case' = 'news') {
    focusPortalType(type);
    setAppView('portal-ops');
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

  function startScenario(bundle: ScenarioBundle) {
    const plan = resolveScenarioDemoPlan(bundle);
    if (!plan) {
      showToast('该场景暂无可执行任务');
      return;
    }
    if (plan.mode === 'team') {
      onStartExpertTeam(plan, 0);
    } else if (plan.soloSkill) {
      onInvokeSkill(plan.soloSkill);
    } else if (plan.soloAgent) {
      onInvokeAgent(plan.soloAgent);
    } else {
      showToast('该场景暂无可执行任务');
    }
  }

  function openScenarioDetail(bundle: ScenarioBundle) {
    setDetailBundle(bundle);
  }

  const perspectiveScope =
    perspective.kind === 'global'
      ? '全部区域 · 全部领域'
      : perspective.kind === 'region'
        ? '区域已锁定 · 领域可选'
        : '领域已锁定 · 区域可选';

  const containerStyle = { backgroundColor: SURFACE, color: FG };
  const surfaceStyle = { backgroundColor: '#ffffff', borderColor: LINE };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto scroll-hidden pb-4" style={containerStyle}>
      {/* 视角摘要条 */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3"
        style={{ backgroundColor: '#f3f0ec', borderColor: LINE }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>
            当前视角
          </span>
          <span className="text-[12px] font-semibold" style={{ color: FG }}>
            {perspective.label}
          </span>
          <span
            className="rounded-full border px-2 py-px text-[10px]"
            style={{ backgroundColor: '#fff', borderColor: LINE, color: MUTED }}
          >
            {perspectiveScope}
          </span>
        </div>
        <button
          type="button"
          className="text-[11px] font-medium transition hover:opacity-80"
          style={{ color: ACCENT }}
          onClick={() => showToast('视角切换需联系管理员调整权限')}
        >
          申请切换视角
        </button>
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
            className="w-[120px] rounded-lg border bg-white px-2.5 py-1.5 text-[11px] outline-none transition disabled:bg-[#f3f0ec] disabled:text-[#6b6966]"
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
            className="w-[120px] rounded-lg border bg-white px-2.5 py-1.5 text-[11px] outline-none transition disabled:bg-[#f3f0ec] disabled:text-[#6b6966]"
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

      {/* 上区主体 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-stretch">
        {/* 左侧 1/3：洞察 & 培训 */}
        <div
          className="flex flex-col gap-3 rounded-xl border p-4 lg:col-span-1"
          style={surfaceStyle}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: FG }}>
              洞察 & 培训
            </span>
            <button
              type="button"
              onClick={() => openOpsMore('news')}
              className="text-[11px] font-medium transition hover:opacity-80"
              style={{ color: ACCENT }}
            >
              查看更多 →
            </button>
          </div>

          <div>
            <div className="mb-2 text-[10px]" style={{ color: MUTED }}>
              公共洞察 · TOP 3
            </div>
            <div className="flex flex-col gap-2">
              {publicInsights.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleCard(contentToCard(item))}
                  className="flex flex-col gap-1 rounded-lg border p-2.5 text-left transition hover:bg-[#faf7f2]"
                  style={{ borderColor: LINE }}
                >
                  <span className="text-[12px] font-semibold" style={{ color: FG }}>
                    {item.title}
                  </span>
                  <span className="line-clamp-2 text-[10px]" style={{ color: MUTED }}>
                    {item.desc}
                  </span>
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {(item.scenarioTags ?? []).slice(0, 2).map((t) => (
                      <Tag key={t} className="border-[#d4d2cf] text-[#6b6966]">
                        {t}
                      </Tag>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="h-px" style={{ backgroundColor: LINE }} />

          <div className="flex flex-1 flex-col gap-2">
            <div className="mb-1 text-[10px]" style={{ color: MUTED }}>
              按区域 / 领域 TOP 10
            </div>
            {filteredInsights.slice(0, 3).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleCard(contentToCard(item))}
                className="flex flex-col gap-1 rounded-lg border p-2.5 text-left transition hover:bg-[#faf7f2]"
                style={{ borderColor: LINE }}
              >
                <span className="text-[12px] font-semibold" style={{ color: FG }}>
                  {item.title}
                </span>
                <div className="flex flex-wrap gap-1">
                  {item.isGold ? (
                    <Tag className="border-[#c0512f] bg-[#fff0e8] text-[#c0512f]">金案例</Tag>
                  ) : null}
                  {item.ownerRegionId ? (
                    <Tag className="border-[#4a7c59] text-[#4a7c59]">
                      {getRegionLabel(item.ownerRegionId)}
                    </Tag>
                  ) : null}
                  {(item.ownerDeptIds ?? []).slice(0, 1).map((d) => (
                    <Tag key={d} className="border-[#5b6b8c] text-[#5b6b8c]">
                      {getDeptLabel(d)}
                    </Tag>
                  ))}
                </div>
              </button>
            ))}
            {filteredInsights.length > 3 ? (
              <button
                type="button"
                onClick={() => openOpsMore('case')}
                className="mt-auto self-start text-[11px] font-medium transition hover:opacity-80"
                style={{ color: ACCENT }}
              >
                查看更多 TOP 内容 →
              </button>
            ) : null}
          </div>
        </div>

        {/* 右侧 2/3：精选场景 */}
        <div
          className="flex flex-col gap-3 rounded-xl border p-4 lg:col-span-2"
          style={surfaceStyle}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: FG }}>
              精选场景
            </span>
            <button
              type="button"
              onClick={openScenarioMap}
              className="text-[11px] font-medium transition hover:opacity-80"
              style={{ color: ACCENT }}
            >
              查看场景地图 →
            </button>
          </div>

          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
            {featuredScenes.map(({ def, bundle }) => {
              const b = bundle!;
              const experts = b.agents.slice(0, 2);
              const skillCards = b.tools.filter((c) => c.kind === 'skill').slice(0, 3);
              const isHot = hotScenarioIds.includes(def.id);
              const isNew = isNewScenario(def.id);
              const cap = SCENARIO_CAPABILITY_CATEGORIES.find((c) =>
                SCENARIO_CAPABILITY_MAP[def.id as keyof typeof SCENARIO_CAPABILITY_MAP]?.includes(c.id),
              );
              return (
                <div
                  key={def.id}
                  className="flex flex-col gap-2 rounded-lg border p-3 transition hover:shadow-sm"
                  style={{ borderColor: LINE, backgroundColor: '#fff' }}
                >
                  <button
                    type="button"
                    onClick={() => openScenarioDetail(b)}
                    className="flex flex-1 flex-col gap-2 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: '#f0eeeb', color: MUTED }}
                      >
                        <i className={cn('fa-solid text-[13px]', def.icon)} />
                      </span>
                      <span className="line-clamp-1 text-[13px] font-semibold" style={{ color: FG }}>
                        {def.label}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-[11px]" style={{ color: MUTED }}>
                      {def.desc}
                    </p>

                    <div>
                      <div className="mb-1 text-[10px]" style={{ color: MUTED }}>
                        参与专家
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {experts.map((card) => {
                          const targetAgent = resolveCardAgent(card, agents);
                          const p = targetAgent ? getAgentPersona(targetAgent) : null;
                          return (
                            <div key={card.id} className="flex items-center gap-1">
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
                                {p?.role ? <span style={{ color: MUTED }}> · {p.role}</span> : null}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="mb-1 text-[10px]" style={{ color: MUTED }}>
                        关键技能
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {skillCards.map((c) => (
                          <span
                            key={c.id}
                            className="rounded px-1.5 py-px text-[9px]"
                            style={{ backgroundColor: '#f5f3f0', color: MUTED }}
                          >
                            {c.meta || c.title}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div
                      className="rounded-md px-2 py-1.5 text-[10px]"
                      style={{ backgroundColor: '#f7f6f4', color: FG }}
                    >
                      预期产出：{SCENARIO_OUTCOMES[def.id] ?? '业务可用的交付物'}
                    </div>
                  </button>

                  <div className="mt-auto flex items-center justify-between pt-1">
                    <div className="flex flex-wrap gap-1">
                      {isHot ? (
                        <span
                          className="rounded px-1.5 py-px text-[9px] font-semibold"
                          style={{ backgroundColor: ACCENT_SOFT, color: ACCENT }}
                        >
                          热门
                        </span>
                      ) : null}
                      {isNew ? (
                        <span
                          className="rounded px-1.5 py-px text-[9px] font-semibold"
                          style={{ backgroundColor: '#e8f5e9', color: '#2e7d32' }}
                        >
                          New
                        </span>
                      ) : null}
                      {cap ? (
                        <span
                          className="rounded px-1.5 py-px text-[9px]"
                          style={{ backgroundColor: '#f0eeeb', color: MUTED }}
                        >
                          {cap.label}
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => startScenario(b)}
                      className="text-[11px] font-semibold transition hover:opacity-80"
                      style={{ color: ACCENT }}
                    >
                      开启任务 →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 下区：马上能用 */}
      <div className="rounded-xl border p-4" style={surfaceStyle}>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: FG }}>
            马上能用
          </span>
          <span className="text-[10px]" style={{ color: MUTED }}>
            全局公共入口，不受区域/领域筛选影响
          </span>
        </div>
        <div className="mb-4">
          <div className="mb-2 text-[11px] font-semibold" style={{ color: FG }}>
            AI 对话
          </div>
          <div className="flex flex-wrap gap-2">
            {chatTools.map((tool) => (
              <ToolPill key={tool.id} tool={tool} onClick={() => openTool(tool)} />
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 text-[11px] font-semibold" style={{ color: FG }}>
            AI 搜索 & 办公
          </div>
          <div className="flex flex-wrap gap-2">
            {searchOfficeTools.map((tool) => (
              <ToolPill key={tool.id} tool={tool} onClick={() => openTool(tool)} />
            ))}
          </div>
        </div>
      </div>

      {/* 下区：Tab 切换 */}
      <div className="rounded-xl border p-4" style={surfaceStyle}>
        <div className="mb-3 flex gap-1 border-b pb-2" style={{ borderColor: LINE }}>
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
                bottomTab === t.id ? 'text-white' : 'hover:bg-[#f3f0ec]',
              )}
              style={bottomTab === t.id ? { backgroundColor: FG } : { color: FG }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {bottomTab === 'skills' ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filteredSkills.map((skill) => (
              <div
                key={skill.id}
                className="flex flex-col gap-1 rounded-lg border p-3"
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
                <div className="flex flex-wrap gap-1 pt-1">
                  <Tag className="border-[#d4d2cf] text-[#6b6966]">调用 {formatInvokes(skill.invokes)}</Tag>
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
              </div>
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
                  onClick={() => onInvokeAgent(agent)}
                  className="flex items-start gap-3 rounded-lg border p-3 text-left transition hover:bg-[#faf7f2]"
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
                      <Tag className="border-[#d4d2cf] text-[#6b6966]">调用 {formatInvokes(agent.invokes)}</Tag>
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
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {teamScenes.map(({ def, bundle }) => {
              const b = bundle!;
              const teamAgents = b.agents.slice(0, 4);
              return (
                <div
                  key={def.id}
                  className="flex flex-col gap-2 rounded-lg border p-3"
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
                  <button
                    type="button"
                    onClick={() => startScenario(b)}
                    className="mt-auto self-start text-[11px] font-semibold transition hover:opacity-80"
                    style={{ color: ACCENT }}
                  >
                    开启任务 →
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ScenarioDetailModal
        bundle={detailBundle}
        onClose={() => setDetailBundle(null)}
        onStartExpertTeam={onStartExpertTeam}
        onInvokeAgent={onInvokeAgent}
        onInvokeSkill={onInvokeSkill}
        onStartScenario={detailBundle ? () => startScenario(detailBundle) : undefined}
      />
    </div>
  );
}

function ToolPill({ tool, onClick }: { tool: PrototypeToolSeed; onClick: () => void }) {
  const isExternal = tool.sourceType === 'external';
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-[11px] transition hover:bg-[#faf7f2]"
      style={{ borderColor: LINE, color: FG }}
    >
      <span className="flex h-4 w-4 items-center justify-center rounded-sm" style={{ backgroundColor: '#f0eeeb' }}>
        <ToolLogo name={tool.name} logoUrl={tool.logoUrl} icon={tool.icon} size={14} />
      </span>
      {tool.name}
      {isExternal ? <span style={{ color: MUTED }}>↗</span> : null}
    </button>
  );
}
