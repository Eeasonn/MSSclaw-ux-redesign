import { useEffect, useMemo, useState } from 'react';
import type {
  PrototypeAgentSeed,
  PrototypeSkillSeed,
  PrototypeToolSeed,
} from '@/domain/prototype/types';
import {
  FEATURED_SCENARIOS,
  buildScenarioBundles,
  type PortalMapCard,
  type ScenarioBundle,
} from '@/domain/portalMap';
import {
  SCENARIO_PUBLISHED_AT,
  scenarioBelongsToCapability,
  type ScenarioCapabilityId,
} from '@/domain/scenarioCapabilities';
import {
  type DeptId,
  type RegionId,
} from '@/domain/orgTaxonomy';
import { getAgentPersona } from '@/domain/prototype/agentPersonas';
import { resolveScenarioDemoPlan } from '@/domain/scenarioPipeline';
import type { AiToolNavCategoryId } from '@/domain/aiToolCategories';
import { getPlazaToolPicks } from '@/domain/plazaToolPicks';
import { getPlazaToolGuides } from '@/domain/plazaToolGuides';
import { openPortalCard } from '@/domain/portalNavigation';
import { openResourceWithReturn } from '@/domain/openResourceNav';
import { openNewTaskWithPrefill } from '@/domain/openNewTask';
import {
  heatScore,
  sortByRankMode,
  type RankMode,
} from '@/domain/contentEngagement';
import { ensureEngagementSeeds, useContentEngagementStore } from '@/stores/contentEngagementStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { usePortalContentStore } from '@/stores/portalContentStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useAppViewStore } from '@/stores/appViewStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';

import { PlazaHeader } from './PlazaHeader';
import { PlazaSceneGrid } from './PlazaSceneGrid';
import { PlazaToolSection } from './PlazaToolSection';
import { PlazaMarketSection } from './PlazaMarketSection';
import { PlazaHowToDrawer } from './PlazaHowToDrawer';
import {
  usePlazaPerspective,
  regionMatch,
  domainMatch,
  capabilityMatch,
} from './plazaShared';

interface PlazaRedesignProps {
  onInvokeAgent: (agent: PrototypeAgentSeed, prompt?: string) => void;
  onInvokeSkill: (skill: PrototypeSkillSeed) => void;
}

type BottomTab = 'skills' | 'agents' | 'teams';

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

  const { regionId: lockedRegionId, deptId: lockedDeptId, regionLocked, domainLocked } =
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

  function openGuideResource(g: ReturnType<typeof getPlazaToolGuides>[number]) {
    if (!g.url || g.url === '#') {
      showToast(`指引「${g.title}」演示占位，后续可挂 PPT / 图片 / 视频`);
      return;
    }
    window.open(g.url, '_blank', 'noopener,noreferrer');
  }

  const currentToolPicks = useMemo(() => {
    const picks = getPlazaToolPicks(activeToolCategory);
    const external = picks.external
      .map((id) => toolsById.get(id))
      .filter((t): t is NonNullable<typeof t> => Boolean(t));
    const internal = picks.internal
      .map((id) => toolsById.get(id))
      .filter((t): t is NonNullable<typeof t> => Boolean(t));
    return { external, internal };
  }, [activeToolCategory, toolsById]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto scroll-hidden bg-white pb-4">
      <PlazaHeader
        capability={capability}
        setCapability={setCapability}
        setRegionId={setRegionId}
        effectiveRegionId={effectiveRegionId}
        regionLocked={regionLocked}
        setDeptId={setDeptId}
        effectiveDeptId={effectiveDeptId}
        domainLocked={domainLocked}
      />

      <PlazaSceneGrid
        featuredScenes={featuredScenes}
        goldScenarioIds={goldScenarioIds}
        scenarioRankMode={scenarioRankMode}
        setScenarioRankMode={setScenarioRankMode}
        onOpenScenarioMap={openScenarioMap}
        onOpenScenarioCase={openScenarioCaseInAiMap}
        onPrefillScenarioTask={prefillScenarioTask}
      />

      <PlazaToolSection
        activeToolCategory={activeToolCategory}
        setActiveToolCategory={setActiveToolCategory}
        externalTools={currentToolPicks.external}
        internalTools={currentToolPicks.internal}
        onOpenTool={openTool}
        onOpenHowTo={openHowTo}
      />

      <PlazaMarketSection
        bottomTab={bottomTab}
        setBottomTab={setBottomTab}
        bottomRankMode={bottomRankMode}
        setBottomRankMode={setBottomRankMode}
        filteredSkills={filteredSkills}
        filteredAgents={filteredAgents}
        teamScenes={teamScenes}
        agents={agents}
        onOpenSkill={(skill) => openNewTaskWithPrefill(`${skill.command} `)}
        onOpenAgent={(agent) => {
          const persona = getAgentPersona(agent);
          openNewTaskWithPrefill(`@${persona.name} `);
        }}
        onOpenTeamTask={(label) => openNewTaskWithPrefill(`@专家团：${label} `)}
      />

      {howToTool ? (
        <PlazaHowToDrawer
          toolName={howToTool.name}
          guides={getPlazaToolGuides(howToTool.id)}
          onClose={() => setHowToTool(null)}
          onOpenGuide={openGuideResource}
        />
      ) : null}
    </div>
  );
}
