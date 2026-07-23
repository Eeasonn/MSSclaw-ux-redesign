import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { PrototypeAgentSeed } from '@/domain/prototype/types';
import {
  FEATURED_SCENARIOS,
  buildScenarioBundles,
  type ScenarioBundle,
} from '@/domain/portalMap';
import { AgentAvatar } from '@/components/brand/AgentAvatar';
import { SharedComposer } from '@/components/chat/SharedComposer';
import { useHomeStore } from '@/stores/homeStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { usePortalContentStore } from '@/stores/portalContentStore';
import { useSessionStore } from '@/stores/sessionStore';

interface NewTaskPageProps {
  onSubmitTask: (text: string, agent?: PrototypeAgentSeed | null) => void;
}

function ExpertTeamChip({
  bundle,
  onClick,
}: {
  bundle: ScenarioBundle;
  onClick: (name: string) => void;
}) {
  const def = FEATURED_SCENARIOS.find((s) => s.id === bundle.id);
  const teamAgents = bundle.agents.slice(0, 3);
  return (
    <button
      type="button"
      onClick={() => onClick(def?.label ?? bundle.label)}
      className="flex shrink-0 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-left shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
      title={def?.desc ?? bundle.label}
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[12px]',
          def ? 'bg-zinc-100 text-zinc-600' : 'bg-zinc-100 text-zinc-500',
        )}
      >
        <i className={cn('fa-solid', def?.icon ?? 'fa-users')} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[12px] font-semibold text-zinc-800">
          {def?.label ?? bundle.label}
        </p>
        <div className="flex items-center gap-1">
          {teamAgents.map((card, idx) => {
            const agentId = card.action.type === 'agent' ? card.action.agentId : undefined;
            return agentId ? (
              <AgentAvatar
                key={card.id}
                agentId={agentId}
                size={16}
                title={card.title}
                className={idx > 0 ? '-ml-1.5' : ''}
              />
            ) : (
              <span
                key={card.id}
                className={cn(
                  'flex h-4 w-4 items-center justify-center rounded-full bg-zinc-200 text-[7px] text-zinc-600',
                  idx > 0 ? '-ml-1.5' : '',
                )}
              >
                {card.title.charAt(0)}
              </span>
            );
          })}
          <span className="ml-1 text-[10px] text-zinc-400">
            {bundle.agents.length} 位专家
          </span>
        </div>
      </div>
    </button>
  );
}

/**
 * 右侧主内容区的任务发起页。
 * 参考原版 AI 任务弹窗的大输入框，用干净的白色留白，顶部以英文品牌口号承载。
 */
export function NewTaskPage({ onSubmitTask }: NewTaskPageProps) {
  const draftText = useHomeStore((s) => s.draftText);
  const setDraftText = useHomeStore((s) => s.setDraftText);
  const requestComposerFocus = useHomeStore((s) => s.requestComposerFocus);
  const agents = useMarketplaceStore((s) => s.agents);
  const skills = useMarketplaceStore((s) => s.skills);
  const tools = useMarketplaceStore((s) => s.tools);
  const portalContent = usePortalContentStore((s) => s.items);
  const user = useSessionStore((s) => s.user);
  const [showTeams, setShowTeams] = useState(false);

  useEffect(() => {
    requestComposerFocus();
  }, [requestComposerFocus]);

  const affiliation = useMemo(
    () => ({
      deptIds: user?.deptIds ?? [],
      regionId: user?.regionId ?? null,
    }),
    [user],
  );

  const scenarioBundles = useMemo(
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

  const teamBundles = useMemo(
    () =>
      scenarioBundles.filter(
        (b): b is ScenarioBundle & { agents: NonNullable<ScenarioBundle['agents']> } =>
          b.agents.length > 1,
      ),
    [scenarioBundles],
  );

  const handleSelectTeam = (name: string) => {
    setDraftText(`@专家团：${name} `);
    setShowTeams(false);
    requestComposerFocus();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto scroll-hidden bg-white">
      <div className="mx-auto flex w-full max-w-[960px] flex-1 flex-col justify-center px-5 py-4 md:px-6 md:py-5">
        <header className="mb-6 text-center">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
            MSS CLAW
          </p>
          <h1 className="home-slogan-art">
            <span className="home-slogan-gradient">Command the Future of Work</span>
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-[12px] leading-relaxed text-zinc-500">
            说出来就干活 · 输入需求直接开工，或按场景找专家团一键打样
          </p>
        </header>

        <SharedComposer
          variant="landing"
          value={draftText}
          onChange={setDraftText}
          onSubmit={(text) =>
            onSubmitTask(text, useHomeStore.getState().resolveAgentFromText(text))
          }
          placeholder="例如：分析本周各代表处 SO 排名，剔除 IoT 后生成周报…"
        />

        {teamBundles.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowTeams((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
              >
                <i className="fa-solid fa-users-gear text-claw-600" />
                召唤专家团
                <i
                  className={cn(
                    'fa-solid fa-chevron-down text-[10px] text-zinc-400 transition',
                    showTeams && 'rotate-180',
                  )}
                />
              </button>
              <span className="text-[10px] text-zinc-400">选一个团队，自动填到输入框</span>
            </div>
            {showTeams && (
              <div className="flex flex-wrap gap-2 pb-1">
                {teamBundles.map((bundle) => (
                  <ExpertTeamChip
                    key={bundle.id}
                    bundle={bundle}
                    onClick={handleSelectTeam}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
