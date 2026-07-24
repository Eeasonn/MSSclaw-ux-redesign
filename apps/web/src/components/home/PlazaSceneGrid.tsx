import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  SCENARIO_CAPABILITY_CATEGORIES,
  SCENARIO_CAPABILITY_MAP,
} from '@/domain/scenarioCapabilities';
import {
  RANK_MODE_OPTIONS,
  heatScore,
  type RankMode,
} from '@/domain/contentEngagement';
import { useContentEngagementStore } from '@/stores/contentEngagementStore';
import { outcomeFromNarrativeCard } from '@/domain/portalCase';
import { isNewScenario } from '@/domain/contentBadges';
import type { ScenarioBundle, ScenarioDef } from '@/domain/portalMap';
import {
  ACCENT,
  FG,
  MUTED,
  LINE,
  MiniSelect,
  CardEngagementFooter,
} from './plazaShared';

interface FeaturedSceneItem {
  id: string;
  def: ScenarioDef;
  bundle: ScenarioBundle;
  publishedAt: string;
}

interface PlazaSceneGridProps {
  featuredScenes: FeaturedSceneItem[];
  goldScenarioIds: string[];
  scenarioRankMode: RankMode;
  setScenarioRankMode: (v: RankMode) => void;
  onOpenScenarioMap: () => void;
  onOpenScenarioCase: (scenarioId: string, caseId?: string | null) => void;
  onPrefillScenarioTask: (bundle: ScenarioBundle) => void;
}

export function PlazaSceneGrid({
  featuredScenes,
  goldScenarioIds,
  scenarioRankMode,
  setScenarioRankMode,
  onOpenScenarioMap,
  onOpenScenarioCase,
  onPrefillScenarioTask,
}: PlazaSceneGridProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const engagementOf = useContentEngagementStore((s) => s.get);

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
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
            onClick={onOpenScenarioMap}
            className="text-[11px] font-medium transition hover:opacity-80"
            style={{ color: ACCENT }}
          >
            进案例样板间 →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2">
        {featuredScenes.map(({ def, bundle, publishedAt }) => {
          const b = bundle;
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
          const isExpanded = expandedIds.has(def.id);
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
                          style={{ backgroundColor: '#fff', borderColor: 'var(--brand)', color: 'var(--brand)' }}
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

              {/* 专家链路步骤 - 可折叠 */}
              {pipelineSteps.length > 0 ? (
                <div className="flex flex-col gap-2 rounded-lg border p-2.5" style={{ borderColor: '#eeebe7' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold" style={{ color: FG }}>
                      专家链路
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleExpanded(def.id)}
                      className="text-[10px] font-medium transition hover:opacity-80"
                      style={{ color: ACCENT }}
                    >
                      {isExpanded ? '收起专家链路' : '查看专家链路'}
                    </button>
                  </div>
                  {isExpanded ? (
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
                  ) : null}
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
                    onClick={() => onOpenScenarioCase(def.id, primaryCaseId)}
                    className="rounded-md border bg-zinc-50 px-3 py-1.5 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-100"
                    style={{ borderColor: LINE }}
                  >
                    查看详情
                  </button>
                  <button
                    type="button"
                    onClick={() => onPrefillScenarioTask(b)}
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
  );
}
