import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { PrototypeAgentSeed, PrototypeSkillSeed, PrototypeToolSeed } from '@/domain/prototype/types';
import {
  FEATURED_SCENARIOS,
  buildScenarioBundles,
  filterAiMapCards,
  type PortalMapCard,
  type ScenarioBundle,
} from '@/domain/portalMap';
import type { ScenarioDemoPlan } from '@/domain/scenarioPipeline';
import {
  SCENE_AXIS_CATEGORIES,
  scenarioInSceneAxis,
  type SceneAxisId,
} from '@/domain/sceneAxis';
import { resolvePrimaryCaseIdForScenario } from '@/domain/portalCase';
import { openPortalCard } from '@/domain/portalNavigation';
import { isHomeAiTool } from '@/domain/aiToolCategories';
import {
  getPlazaToolGuides,
  PLAZA_GUIDE_TYPE_LABEL,
  type PlazaToolGuide,
} from '@/domain/plazaToolGuides';
import {
  DISCOVER_SCENARIO_IDS,
  SCENARIO_CAPABILITY_CATEGORIES,
  SCENARIO_PUBLISHED_AT,
  scenarioBelongsToCapability,
  type DiscoverScenarioId,
  type ScenarioCapabilityId,
} from '@/domain/scenarioCapabilities';
import {
  RANK_MODE_OPTIONS,
  heatScore,
  sortByRankMode,
  type RankMode,
} from '@/domain/contentEngagement';
import { ToolLogo } from '@/components/brand/ToolLogo';
import { ScenarioDetailModal } from '@/components/content/ScenarioDetailModal';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { usePortalContentStore } from '@/stores/portalContentStore';
import { useAppViewStore } from '@/stores/appViewStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import {
  ensureEngagementSeeds,
  useContentEngagementStore,
} from '@/stores/contentEngagementStore';
import { isNewScenario } from '@/domain/contentBadges';
import { openResourceWithReturn } from '@/domain/openResourceNav';

interface HomeScenePortalProps {
  onInvokeAgent: (agent: PrototypeAgentSeed, prompt?: string) => void;
  onInvokeSkill: (skill: PrototypeSkillSeed) => void;
  /** 场景详情弹窗 → 启动专家团同会话接力 */
  onStartExpertTeam: (plan: ScenarioDemoPlan, fromIndex?: number) => void;
}

/** 标题 + 同行筛选 + 右侧操作，压缩行高 */
function SectionToolbar({
  title,
  filters,
  trailing,
}: {
  title: string;
  filters?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="mb-3 flex min-w-0 items-center gap-2.5">
      <h2 className="shrink-0 text-[14px] font-semibold tracking-tight text-zinc-900">{title}</h2>
      {filters ? <div className="min-w-0 flex-1 overflow-hidden">{filters}</div> : null}
      {trailing ? <div className="ml-auto flex shrink-0 items-center gap-2">{trailing}</div> : null}
    </div>
  );
}

function FilterTrack({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-zinc-100/90 p-1 scroll-hidden',
        className,
      )}
    >
      {children}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition',
        active ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800',
      )}
    >
      {children}
    </button>
  );
}

function MiniSelect<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
  ariaLabel: string;
}) {
  return (
    <div className="relative w-[92px] shrink-0">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full appearance-none rounded-full border border-zinc-200/90 bg-white py-1.5 pl-2.5 pr-6 text-[11px] font-medium text-zinc-700 outline-none transition hover:border-zinc-300 focus:border-zinc-400"
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

/** 本周精选 · 自动横向广播滚动 */
function PlazaPromoBanner({
  items,
  onOpen,
  onMore,
}: {
  items: PortalMapCard[];
  onOpen: (card: PortalMapCard) => void;
  onMore: () => void;
}) {
  const [paused, setPaused] = useState(false);
  // 单元内容铺满后再复制一份，配合 translateX(-50%) 无缝循环
  const track = useMemo(() => {
    if (!items.length) return [];
    let unit = [...items];
    while (unit.length < 5) unit = [...unit, ...items];
    return [...unit, ...unit];
  }, [items]);

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-zinc-200/70 bg-gradient-to-r from-zinc-50 via-white to-zinc-50 px-2.5 py-2">
      <span className="shrink-0 rounded-md bg-zinc-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">
        本周精选
      </span>
      <div
        className="plaza-marquee min-w-0 flex-1 overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {items.length ? (
          <div
            className={cn('plaza-marquee-track flex w-max gap-2.5', paused && 'plaza-marquee-paused')}
            style={{ animationDuration: `${Math.max(18, items.length * 5)}s` }}
          >
            {track.map((c, i) => (
              <button
                key={`${c.id}-${i}`}
                type="button"
                onClick={() => onOpen(c)}
                className="flex max-w-[240px] shrink-0 items-center gap-2 rounded-lg border border-zinc-200/60 bg-white/90 px-3 py-1.5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:border-zinc-300"
              >
                <span className="shrink-0 rounded bg-zinc-100 px-1 py-0.5 text-[9px] font-medium text-zinc-500">
                  {c.kind === 'training' ? '培训' : '洞察'}
                </span>
                <span className="truncate text-[12px] font-semibold text-zinc-800">{c.title}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="px-2 py-1 text-[12px] text-zinc-400">暂无精选内容</p>
        )}
      </div>
      <button
        type="button"
        onClick={onMore}
        className="shrink-0 text-[11px] font-medium text-zinc-400 transition hover:text-zinc-700"
      >
        更多
      </button>
    </div>
  );
}

export function HomeScenePortal({ onInvokeAgent, onInvokeSkill, onStartExpertTeam }: HomeScenePortalProps) {
  const agents = useMarketplaceStore((s) => s.agents);
  const skills = useMarketplaceStore((s) => s.skills);
  const tools = useMarketplaceStore((s) => s.tools);
  const portalContent = usePortalContentStore((s) => s.items);
  const showToast = useMarketplaceStore((s) => s.showToast);
  const setAppView = useAppViewStore((s) => s.setAppView);
  const user = useSessionStore((s) => s.user);

  const [rankMode, setRankMode] = useState<RankMode>('trending');
  const [capability, setCapability] = useState<ScenarioCapabilityId | 'all'>('all');
  const [sceneAxis, setSceneAxis] = useState<SceneAxisId | 'all'>('all');
  const [howToTool, setHowToTool] = useState<PrototypeToolSeed | null>(null);
  const [detailBundle, setDetailBundle] = useState<ScenarioBundle | null>(null);
  const focusPortalType = useNavigationIntentStore((s) => s.focusPortalType);
  const focusScenario = useNavigationIntentStore((s) => s.focusScenario);
  const focusCase = useNavigationIntentStore((s) => s.focusCase);
  const engagementOf = useContentEngagementStore((s) => s.get);
  const engagementById = useContentEngagementStore((s) => s.byId);
  const bumpUse = useContentEngagementStore((s) => s.bumpUse);

  const affiliation = useMemo(
    () => ({
      deptIds: user?.deptIds ?? [],
      regionId: user?.regionId ?? null,
    }),
    [user?.deptIds, user?.regionId],
  );

  const homeAiTools = useMemo(() => tools.filter(isHomeAiTool), [tools]);

  /** 即开即用工具：并入场景流，按调用量取前 3（点开即用，无需派任务） */
  const quickTools = useMemo(
    () => [...homeAiTools].sort((a, b) => b.invokes - a.invokes).slice(0, 3),
    [homeAiTools],
  );

  const discoverScenarios = useMemo(
    () =>
      FEATURED_SCENARIOS.filter((s) =>
        (DISCOVER_SCENARIO_IDS as readonly string[]).includes(s.id),
      ),
    [],
  );

  /** 场景包：参与专家 / 技能工具计数（精选场景卡用） */
  const bundleById = useMemo(() => {
    const bundles = buildScenarioBundles({
      agents,
      skills,
      tools,
      portalContent,
      affiliation,
      userId: user?.id ?? '',
      userName: user?.name ?? '',
      role: user?.platformRole,
      filter: 'all',
    });
    return new Map(bundles.map((b) => [b.id, b]));
  }, [agents, skills, tools, portalContent, affiliation, user]);

  /**
   * 场景流：精选与热门同源混排 —— 编辑精选（编辑顺序）在前，
   * 热门按热度紧随其后；切换排序方式时整体按所选热度维度重排
   */
  const flowScenarios = useMemo(() => {
    const filtered = discoverScenarios.filter(
      (s) => scenarioInSceneAxis(s.id, sceneAxis) && scenarioBelongsToCapability(s.id, capability),
    );
    const enriched = filtered.map((s) => {
      const caseId = resolvePrimaryCaseIdForScenario(s.id);
      const caseItem = caseId
        ? portalContent.find((p) => p.id === caseId)
        : undefined;
      return {
        ...s,
        publishedAt: SCENARIO_PUBLISHED_AT[s.id as DiscoverScenarioId],
        primaryCaseId: caseId,
        primaryCaseTitle: caseItem?.title,
      };
    });
    if (rankMode !== 'trending') {
      return sortByRankMode(enriched, rankMode, engagementOf);
    }
    const featuredFirst = enriched.slice(0, 3);
    const hotRest = sortByRankMode(enriched, 'trending', engagementOf).filter(
      (s) => !featuredFirst.some((f) => f.id === s.id),
    );
    return [...featuredFirst, ...hotRest];
  }, [discoverScenarios, sceneAxis, capability, rankMode, engagementOf, engagementById, portalContent]);

  /** 案例墙：已发布案例，金案例优先、新的在前，取前 6 条 */
  const caseWallItems = useMemo(
    () =>
      portalContent
        .filter((i) => i.type === 'case' && i.published !== false)
        .sort(
          (a, b) =>
            Number(Boolean(b.isGold)) - Number(Boolean(a.isGold)) ||
            (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''),
        )
        .slice(0, 6),
    [portalContent],
  );

  const hotTop3Ids = useMemo(() => {
    return [...discoverScenarios]
      .sort((a, b) => heatScore(engagementOf(b.id)) - heatScore(engagementOf(a.id)))
      .slice(0, 3)
      .map((s) => s.id);
  }, [discoverScenarios, engagementOf, engagementById]);

  const catalog = useMemo(
    () =>
      filterAiMapCards({
        agents,
        skills,
        tools,
        portalContent,
        affiliation,
        userId: user?.id ?? '',
        userName: user?.name ?? '',
        role: user?.platformRole,
        selection: { kind: 'all' },
        search: '',
      }),
    [agents, skills, tools, portalContent, affiliation, user],
  );

  useEffect(() => {
    const ids = [
      ...DISCOVER_SCENARIO_IDS,
      ...catalog.filter((c) => c.kind === 'news' || c.kind === 'training').map((c) => c.id),
      ...portalContent.filter((p) => p.type === 'news' || p.type === 'training').map((p) => p.id),
    ];
    ensureEngagementSeeds(ids);
  }, [catalog, portalContent]);

  /** 洞察 + 培训混排，供横幅轮播 */
  const promoItems = useMemo(() => {
    const news = catalog.filter((c) => c.kind === 'news');
    const training = catalog.filter((c) => c.kind === 'training');
    const ranked = sortByRankMode(
      [...news, ...training].map((c) => ({ ...c, publishedAt: c.publishedAt })),
      'trending',
      engagementOf,
    );
    return ranked.slice(0, 8);
  }, [catalog, engagementOf, engagementById]);

  const handleCard = (card: PortalMapCard) => {
    bumpUse(card.id);
    openPortalCard(card, { onInvokeAgent, onInvokeSkill, showToast });
  };

  const openTool = (toolId: string) => {
    const tool = tools.find((t) => t.id === toolId);
    if (!tool?.homepageUrl) {
      showToast('暂无入口链接');
      return;
    }
    const win = window.open(tool.homepageUrl, '_blank', 'noopener,noreferrer');
    useMarketplaceStore.getState().bumpToolInvokes(toolId);
    if (!win) {
      showToast('浏览器拦截了弹窗，请允许本站弹窗后重试，或复制链接手动打开');
      return;
    }
    showToast(`已打开：${tool.name}`);
  };

  const openHowTo = (tool: PrototypeToolSeed) => {
    setHowToTool(tool);
  };

  const openGuideResource = (g: PlazaToolGuide) => {
    if (!g.url || g.url === '#') {
      showToast(`指引「${g.title}」演示占位，后续可挂 PPT / 图片 / 视频`);
      return;
    }
    window.open(g.url, '_blank', 'noopener,noreferrer');
  };

  const goOpsMore = () => {
    focusPortalType('news');
    setAppView('portal-ops');
  };

  const openScenario = (scenarioId: string) => {
    bumpUse(scenarioId);
    const caseId = resolvePrimaryCaseIdForScenario(scenarioId);
    focusScenario(scenarioId);
    if (caseId) focusCase(caseId);
    openResourceWithReturn('ai-map');
  };

  /** 精选场景卡：点击卡面先看场景详情（专家团步骤 / 参与专家） */
  const openScenarioDetail = (scenarioId: string) => {
    const bundle = bundleById.get(scenarioId);
    if (!bundle) {
      openScenario(scenarioId);
      return;
    }
    bumpUse(scenarioId);
    setDetailBundle(bundle);
  };

  /** 案例墙：跳到案例样板间并打开对应案例叙事 */
  const openCase = (caseId: string) => {
    bumpUse(caseId);
    focusCase(caseId);
    openResourceWithReturn('ai-map');
  };

  const linkBtnClass =
    'text-[11px] font-medium text-zinc-400 transition hover:text-zinc-700';

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[1.35rem] pb-2">
      {/* 0. 本周精选横幅 */}
      <PlazaPromoBanner items={promoItems} onOpen={handleCard} onMore={goOpsMore} />

      {/* 1. 场景流：精选 + 热门同源混排的一张卡片网格；即开即用工具以徽章卡并入 */}
      <section>
        <SectionToolbar
          title="场景直达"
          filters={
            <div className="flex min-w-0 flex-col items-start gap-1">
              <FilterTrack>
                <FilterChip active={sceneAxis === 'all'} onClick={() => setSceneAxis('all')}>
                  全部
                </FilterChip>
                {SCENE_AXIS_CATEGORIES.map((c) => (
                  <FilterChip
                    key={c.id}
                    active={sceneAxis === c.id}
                    onClick={() => setSceneAxis(c.id)}
                  >
                    <i className={cn('fa-solid text-[9px]', c.icon)} />
                    {c.label}
                  </FilterChip>
                ))}
              </FilterTrack>
              <FilterTrack>
                <FilterChip active={capability === 'all'} onClick={() => setCapability('all')}>
                  全部
                </FilterChip>
                {SCENARIO_CAPABILITY_CATEGORIES.map((c) => (
                  <FilterChip
                    key={c.id}
                    active={capability === c.id}
                    onClick={() => setCapability(c.id)}
                    title={c.blurb}
                  >
                    <i className={cn('fa-solid text-[9px]', c.icon)} />
                    {c.label}
                  </FilterChip>
                ))}
              </FilterTrack>
            </div>
          }
          trailing={
            <>
              <MiniSelect
                ariaLabel="排序方式"
                value={rankMode}
                onChange={setRankMode}
                options={[...RANK_MODE_OPTIONS]}
              />
              <button
                type="button"
                onClick={() => openResourceWithReturn('ai-map')}
                className={linkBtnClass}
              >
                更多
              </button>
            </>
          }
        />

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {flowScenarios.slice(0, 9).map((s) => {
            const bundle = bundleById.get(s.id);
            const expertCount = bundle?.agents.length ?? 0;
            const capabilityCount = bundle?.tools.length ?? 0;
            return (
              <div
                key={s.id}
                className="relative flex flex-col gap-2 rounded-xl border border-zinc-200/80 bg-white px-3 py-2.5 transition hover:border-zinc-300 hover:bg-zinc-50/60"
              >
                {(hotTop3Ids.includes(s.id) || isNewScenario(s.id)) ? (
                  <span className="pointer-events-none absolute right-2 top-2 z-10 flex items-center gap-1">
                    {isNewScenario(s.id) ? (
                      <span
                        className="rounded px-1 py-px text-[9px] font-bold uppercase tracking-wide text-white"
                        style={{ backgroundColor: '#C8102E' }}
                        title="编辑精选 · 新上架"
                        aria-label="New"
                      >
                        New
                      </span>
                    ) : null}
                    {hotTop3Ids.includes(s.id) ? (
                      <span
                        className="flex h-5 w-5 items-center justify-center text-[#E85D04]"
                        title="最火 Top3"
                        aria-label="最火"
                      >
                        <i className="fa-solid fa-fire text-[11px]" />
                      </span>
                    ) : null}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => openScenarioDetail(s.id)}
                  className="flex min-w-0 items-start gap-2.5 pr-5 text-left"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
                    <i className={cn('fa-solid text-[14px]', s.icon)} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-semibold text-zinc-900">
                      {s.label}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-[10px] leading-snug text-zinc-400">
                      {s.desc}
                    </span>
                  </span>
                </button>
                <div className="mt-auto flex items-center justify-between gap-2">
                  <span className="text-[10px] text-zinc-400">
                    {expertCount > 0 ? `${expertCount} 位专家` : '专家团'}
                    {capabilityCount > 0 ? ` · ${capabilityCount} 项技能工具` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => openScenario(s.id)}
                    className="apple-btn-primary shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-white transition"
                  >
                    立即体验
                  </button>
                </div>
              </div>
            );
          })}
          {quickTools.map((t) => {
            const hasGuide = getPlazaToolGuides(t.id).length > 0;
            return (
              <div
                key={t.id}
                className="relative flex flex-col gap-2 rounded-xl border border-zinc-200/80 bg-white px-3 py-2.5 transition hover:border-zinc-300 hover:bg-zinc-50/60"
              >
                <span
                  className="pointer-events-none absolute right-2 top-2 z-10 rounded px-1 py-px text-[9px] font-bold text-white"
                  style={{ backgroundColor: '#0A7C66' }}
                  title="点开即用，无需派任务"
                >
                  即开即用
                </span>
                <button
                  type="button"
                  onClick={() => openTool(t.id)}
                  className="flex min-w-0 items-start gap-2.5 pr-5 text-left"
                  title={t.desc}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                    <ToolLogo name={t.name} logoUrl={t.logoUrl} icon={t.icon} size={20} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-semibold text-zinc-900">
                      {t.name}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-[10px] leading-snug text-zinc-400">
                      {t.desc}
                    </span>
                  </span>
                </button>
                <div className="mt-auto flex items-center justify-between gap-2">
                  <span className="text-[10px] text-zinc-400">
                    {t.sourceType === 'external' ? '外部工具' : '内部工具'}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {hasGuide ? (
                      <button
                        type="button"
                        onClick={() => openHowTo(t)}
                        className="font-serif text-[10px] italic text-zinc-300 transition hover:text-zinc-500"
                        title="试用前有疑问？查看 How to 指引"
                      >
                        How to
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => openTool(t.id)}
                      className="apple-btn-primary shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-white transition"
                    >
                      打开
                    </button>
                  </span>
                </div>
              </div>
            );
          })}
          {!flowScenarios.length ? (
            <p className="col-span-full py-6 text-center text-[12px] text-zinc-400">
              该筛选下暂无场景
            </p>
          ) : null}
        </div>
      </section>

      {/* 2. 案例墙：看到别人用场景拿到了什么结果 */}
      <section>
        <SectionToolbar
          title="案例墙"
          trailing={
            <button
              type="button"
              onClick={() => openResourceWithReturn('ai-map')}
              className={linkBtnClass}
            >
              更多
            </button>
          }
        />
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {caseWallItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openCase(item.id)}
              className="relative flex flex-col gap-2 rounded-xl border border-zinc-200/80 bg-white px-3 py-2.5 text-left transition hover:border-zinc-300 hover:bg-zinc-50/60"
            >
              {item.isGold ? (
                <span
                  className="pointer-events-none absolute right-2 top-2 z-10 rounded px-1 py-px text-[9px] font-bold text-white"
                  style={{ backgroundColor: '#B8860B' }}
                  title="金牌案例"
                >
                  金案例
                </span>
              ) : null}
              <span className="flex min-w-0 items-start gap-2.5 pr-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
                  <i className={cn('fa-solid text-[14px]', item.icon)} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-semibold text-zinc-900">
                    {item.title}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-[10px] leading-snug text-zinc-400">
                    {item.desc}
                  </span>
                </span>
              </span>
              {item.impactMetric ? (
                <span className="mt-auto block rounded-lg bg-emerald-50/80 px-2 py-1 text-[10px] leading-snug text-emerald-700">
                  结果：{item.impactMetric}
                </span>
              ) : null}
            </button>
          ))}
          {!caseWallItems.length ? (
            <p className="col-span-full py-6 text-center text-[12px] text-zinc-400">
              暂无已发布案例
            </p>
          ) : null}
        </div>
      </section>

      {howToTool ? (
        <HowToDrawer
          toolName={howToTool.name}
          guides={getPlazaToolGuides(howToTool.id)}
          onClose={() => setHowToTool(null)}
          onOpenGuide={openGuideResource}
        />
      ) : null}

      <ScenarioDetailModal
        bundle={detailBundle}
        onClose={() => setDetailBundle(null)}
        onStartExpertTeam={onStartExpertTeam}
        onInvokeAgent={onInvokeAgent}
        onInvokeSkill={onInvokeSkill}
      />
    </div>
  );
}
