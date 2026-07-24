import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  SCENARIO_CAPABILITY_CATEGORIES,
  SCENARIO_CAPABILITY_MAP,
  isDiscoverScenarioId,
  type ScenarioCapabilityId,
} from '@/domain/scenarioCapabilities';
import { FEATURED_SCENARIOS, buildScenarioBundles, type ScenarioBundle } from '@/domain/portalMap';
import { resolveScenarioDemoPlan } from '@/domain/scenarioPipeline';
import { getAgentPersona } from '@/domain/prototype/agentPersonas';
import { openNewTaskWithPrefill } from '@/domain/openNewTask';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { usePortalContentStore } from '@/stores/portalContentStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useAppViewStore } from '@/stores/appViewStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';

function getScenarioStats(bundle: ScenarioBundle | undefined) {
  if (!bundle) return { cases: 0, training: 0, insight: 0, hotCaseTitle: '-' };
  const cases = bundle.cases.filter((c) => c.kind === 'case').length;
  const training = bundle.cases.filter((c) => c.kind === 'training').length;
  const insight = bundle.cases.filter((c) => c.kind === 'insight' || c.kind === 'news').length;
  const hotCase = bundle.cases.find((c) => c.kind === 'case');
  return { cases, training, insight, hotCaseTitle: hotCase?.title ?? '-' };
}

export function ScenarioPickerPage() {
  const agents = useMarketplaceStore((s) => s.agents);
  const skills = useMarketplaceStore((s) => s.skills);
  const tools = useMarketplaceStore((s) => s.tools);
  const portalContent = usePortalContentStore((s) => s.items);
  const user = useSessionStore((s) => s.user);
  const setAppView = useAppViewStore((s) => s.setAppView);
  const focusScenario = useNavigationIntentStore((s) => s.focusScenario);

  const affiliation = useMemo(
    () => ({
      deptIds: user?.deptIds ?? [],
      regionId: user?.regionId ?? null,
    }),
    [user],
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
        filter: 'all',
      }),
    [agents, skills, tools, portalContent, affiliation, user],
  );

  const bundleById = useMemo(() => new Map(bundles.map((b) => [b.id, b])), [bundles]);

  const scenariosByCapability = useMemo(() => {
    const map = new Map<ScenarioCapabilityId, typeof FEATURED_SCENARIOS>();
    for (const cap of SCENARIO_CAPABILITY_CATEGORIES) {
      map.set(
        cap.id,
        FEATURED_SCENARIOS.filter(
          (s) => isDiscoverScenarioId(s.id) && SCENARIO_CAPABILITY_MAP[s.id].includes(cap.id),
        ),
      );
    }
    return map;
  }, []);

  const handleSelectScenario = (scenarioId: string) => {
    focusScenario(scenarioId);
    setAppView('ai-map');
  };

  const handleStartScenarioTask = (scenarioId: string) => {
    const bundle = bundleById.get(scenarioId);
    if (!bundle) return;
    const plan = resolveScenarioDemoPlan(bundle);
    if (!plan) return;
    const label = FEATURED_SCENARIOS.find((s) => s.id === scenarioId)?.label ?? bundle.label;
    if (plan.mode === 'team') {
      openNewTaskWithPrefill(`@专家团：${label} `);
    } else if (plan.soloSkill) {
      openNewTaskWithPrefill(`${plan.soloSkill.command} `);
    } else if (plan.soloAgent) {
      openNewTaskWithPrefill(`@${getAgentPersona(plan.soloAgent).name} `);
    }
  };

  return (
    <div className="center-surface center-page scroll-hidden flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-5 md:px-6">
        <div className="mb-5">
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
            MSS Claw
          </p>
          <h2 className="text-[22px] font-semibold tracking-tight text-zinc-900">
            选场景
          </h2>
          <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">
            按业务环节挑选可复制场景，点击进入案例样板间
          </p>
        </div>

        <div className="space-y-8">
          {SCENARIO_CAPABILITY_CATEGORIES.map((cap) => {
            const scenarios = scenariosByCapability.get(cap.id) ?? [];
            return (
              <section key={cap.id}>
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
                    <i className={cn('fa-solid text-[12px]', cap.icon)} />
                  </span>
                  <div>
                    <h3 className="text-[15px] font-semibold text-zinc-900">{cap.label}</h3>
                    <p className="text-[11px] text-zinc-400">{cap.blurb}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {scenarios.map((s) => {
                    const bundle = bundleById.get(s.id);
                    const stats = getScenarioStats(bundle);
                    return (
                      <div
                        key={s.id}
                        className="flex flex-col gap-3 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm transition hover:shadow-md"
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectScenario(s.id)}
                          className="flex flex-col gap-3 text-left"
                        >
                          <div className="flex items-start gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
                              <i className={cn('fa-solid text-[14px]', s.icon)} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-[14px] font-semibold text-zinc-900">{s.label}</h4>
                              <p className="line-clamp-2 text-[11px] leading-relaxed text-zinc-500">
                                {s.desc}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600">
                              案例 {stats.cases}
                            </span>
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600">
                              培训 {stats.training}
                            </span>
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600">
                              洞察 {stats.insight}
                            </span>
                          </div>
                          <div className="mt-auto rounded-lg bg-zinc-50 px-3 py-2">
                            <p className="text-[10px] text-zinc-400">热门案例</p>
                            <p className="line-clamp-1 text-[12px] font-medium text-zinc-700">
                              {stats.hotCaseTitle}
                            </p>
                          </div>
                        </button>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleSelectScenario(s.id)}
                            className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-100"
                          >
                            查看详情 →
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartScenarioTask(s.id)}
                            className="flex-1 rounded-lg border border-zinc-900 bg-white px-3 py-1.5 text-[11px] font-semibold text-zinc-900 transition hover:bg-zinc-50"
                          >
                            开启任务
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
