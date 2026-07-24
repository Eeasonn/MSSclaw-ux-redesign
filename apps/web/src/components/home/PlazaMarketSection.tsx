import { cn } from '@/lib/utils';
import type { PrototypeAgentSeed, PrototypeSkillSeed } from '@/domain/prototype/types';
import { getAgentPersona } from '@/domain/prototype/agentPersonas';
import { RANK_MODE_OPTIONS, type RankMode } from '@/domain/contentEngagement';
import { AgentAvatar } from '@/components/brand/AgentAvatar';
import type { ScenarioBundle } from '@/domain/portalMap';
import type { ScenarioDef } from '@/domain/portalMap';
import { getDeptLabel, getRegionLabel } from '@/domain/orgTaxonomy';
import {
  ACCENT,
  FG,
  MUTED,
  LINE,
  Tag,
  MiniSelect,
  CardEngagementFooter,
  resolveCardAgent,
} from './plazaShared';

type BottomTab = 'skills' | 'agents' | 'teams';

interface TeamSceneItem {
  id: string;
  def: ScenarioDef;
  bundle: ScenarioBundle;
  publishedAt: string;
}

interface PlazaMarketSectionProps {
  bottomTab: BottomTab;
  setBottomTab: (v: BottomTab) => void;
  bottomRankMode: RankMode;
  setBottomRankMode: (v: RankMode) => void;
  filteredSkills: PrototypeSkillSeed[];
  filteredAgents: PrototypeAgentSeed[];
  teamScenes: TeamSceneItem[];
  agents: PrototypeAgentSeed[];
  onOpenSkill: (skill: PrototypeSkillSeed) => void;
  onOpenAgent: (agent: PrototypeAgentSeed) => void;
  onOpenTeamTask: (label: string) => void;
}

const TABS: { id: BottomTab; label: string }[] = [
  { id: 'skills', label: '热门技能' },
  { id: 'agents', label: '热门专家' },
  { id: 'teams', label: '专家团' },
];

export function PlazaMarketSection({
  bottomTab,
  setBottomTab,
  bottomRankMode,
  setBottomRankMode,
  filteredSkills,
  filteredAgents,
  teamScenes,
  agents,
  onOpenSkill,
  onOpenAgent,
  onOpenTeamTask,
}: PlazaMarketSectionProps) {
  return (
    <div className="rounded-xl border bg-white p-4" style={{ borderColor: LINE }}>
      <div className="mb-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold tracking-tight" style={{ color: FG }}>
            能力市场
          </h3>
          <MiniSelect
            ariaLabel="Tab 排序"
            value={bottomRankMode}
            onChange={setBottomRankMode}
            options={[...RANK_MODE_OPTIONS]}
          />
        </div>

        {/* 分段控制器 */}
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setBottomTab(t.id)}
              className={cn(
                'rounded-md px-3 py-1 text-[11px] font-medium transition',
                bottomTab === t.id
                  ? 'text-white'
                  : 'border bg-white hover:bg-zinc-50',
              )}
              style={
                bottomTab === t.id
                  ? { backgroundColor: ACCENT }
                  : { borderColor: LINE, color: FG }
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {bottomTab === 'skills' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filteredSkills.map((skill) => (
            <button
              key={skill.id}
              type="button"
              onClick={() => onOpenSkill(skill)}
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
                  <Tag className="border-emerald-700 text-emerald-700">{getRegionLabel(skill.ownerRegionId)}</Tag>
                ) : (
                  <Tag className="border-emerald-700 text-emerald-700">全球</Tag>
                )}
                {(skill.ownerDeptIds ?? []).slice(0, 2).map((d) => (
                  <Tag key={d} className="border-slate-600 text-slate-600">
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
                onClick={() => onOpenAgent(agent)}
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
                        <Tag key={r} className="border-emerald-700 text-emerald-700">
                          {getRegionLabel(r)}
                        </Tag>
                      ))
                    ) : (
                      <Tag className="border-emerald-700 text-emerald-700">全球</Tag>
                    )}
                    {agentDepts.slice(0, 2).map((d) => (
                      <Tag key={d} className="border-slate-600 text-slate-600">
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
            const b = bundle;
            const teamAgents = b.agents.slice(0, 4);
            return (
              <button
                key={def.id}
                type="button"
                onClick={() => onOpenTeamTask(def.label)}
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
  );
}
