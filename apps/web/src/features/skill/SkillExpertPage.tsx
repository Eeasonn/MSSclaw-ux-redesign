import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { getEfficiencyLabel } from '@/domain/prototype/constants';
import { getSkillLabels } from '@/domain/plan';
import type { PrototypeAgentSeed, PrototypeSkillSeed } from '@/domain/prototype/types';
import { getAgentPersona } from '@/domain/prototype/agentPersonas';
import {
  FEATURED_SCENARIOS,
  buildScenarioBundles,
  type ScenarioBundle,
} from '@/domain/portalMap';
import type { ScenarioDemoPlan } from '@/domain/scenarioPipeline';
import { CenterModal, CenterSearchInput } from '@/components/center/CenterShell';
import { OrgAssetFilterBar } from '@/components/center/OrgAssetFilters';
import { AgentAvatar } from '@/components/brand/AgentAvatar';
import { SkillAvatar } from '@/components/brand/SkillAvatar';
import { ScenarioDetailModal } from '@/components/content/ScenarioDetailModal';
import {
  ASSET_VISIBILITY_LABELS,
  getDeptLabel,
  getRegionLabel,
} from '@/domain/orgTaxonomy';
import {
  getSkillReviewStatus,
  isSkillVisibleToUser,
  SKILL_REVIEW_BADGE_CLASSES,
  SKILL_REVIEW_LABELS,
} from '@/domain/skillReview';
import { getCurrentUserId, getCurrentUserName } from '@/domain/currentUser';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { usePortalContentStore } from '@/stores/portalContentStore';
import { useSessionStore } from '@/stores/sessionStore';
import { getAgentPack } from '@/domain/agents/catalog';
import { buildAgentDemoPrompt, getPrimarySkill } from '@/domain/agents/runtime';
import { PROTOTYPE_SKILLS } from '@/domain/prototype/skills';

type Tab = 'skills' | 'experts';

interface SkillExpertPageProps {
  onInvokeAgent: (agent: PrototypeAgentSeed, prompt?: string) => void;
  onInvokeSkill: (skill: PrototypeSkillSeed) => void;
  onStartExpertTeam: (plan: ScenarioDemoPlan, fromIndex?: number) => void;
}

export function SkillExpertPage({
  onInvokeAgent,
  onInvokeSkill,
  onStartExpertTeam,
}: SkillExpertPageProps) {
  const [tab, setTab] = useState<Tab>('skills');
  const [search, setSearch] = useState('');

  return (
    <div className="center-surface center-page scroll-hidden flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-5 md:px-6">
        <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
              MSS Claw
            </p>
            <h2 className="text-[20px] font-semibold tracking-tight text-zinc-900 md:text-[22px]">
              找技能·专家
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">
              能力资产 · 人格化专家 · 专家团
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CenterSearchInput
              value={search}
              onChange={setSearch}
              placeholder={tab === 'skills' ? '搜索 Skill…' : '搜索专家…'}
              className="w-48"
            />
            <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-0.5">
              {[
                { id: 'skills' as const, label: '技能' },
                { id: 'experts' as const, label: '专家' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'rounded-lg px-4 py-1.5 text-[12px] font-semibold transition',
                    tab === t.id
                      ? 'bg-zinc-900 text-white'
                      : 'text-zinc-600 hover:bg-zinc-50',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {tab === 'skills' ? (
          <SkillTab search={search} onInvoke={onInvokeSkill} />
        ) : (
          <ExpertTab
            search={search}
            onInvoke={onInvokeAgent}
            onInvokeSkill={onInvokeSkill}
            onStartExpertTeam={onStartExpertTeam}
          />
        )}
      </div>
    </div>
  );
}

function SkillTab({
  search,
  onInvoke,
}: {
  search: string;
  onInvoke: (skill: PrototypeSkillSeed) => void;
}) {
  const {
    skillFilter,
    setSkillFilter,
    skillDeptFilter,
    skillRegionFilter,
    skillScopeFilter,
    setSkillDeptFilter,
    setSkillRegionFilter,
    setSkillScopeFilter,
    filteredSkills,
    bumpSkillInvokes,
  } = useMarketplaceStore();

  const list = useMemo(
    () =>
      filteredSkills()
        .filter((s) => isSkillVisibleToUser(s, getCurrentUserId(), getCurrentUserName()))
        .filter(
          (s) =>
            !search.trim() ||
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.command.toLowerCase().includes(search.toLowerCase()) ||
            s.desc.toLowerCase().includes(search.toLowerCase()),
        ),
    [filteredSkills, search],
  );

  const [detail, setDetail] = useState<PrototypeSkillSeed | null>(null);

  const handleInvoke = (skill: PrototypeSkillSeed) => {
    bumpSkillInvokes(skill.id);
    if (skill.sourceType === 'external' && skill.homepageUrl) {
      window.open(skill.homepageUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    onInvoke(skill);
  };

  return (
    <>
      <OrgAssetFilterBar
        deptFilter={skillDeptFilter}
        regionFilter={skillRegionFilter}
        efficiencyFilter={skillFilter === 'experience' ? 'all' : skillFilter}
        scopeFilter={skillScopeFilter}
        onDeptChange={setSkillDeptFilter}
        onRegionChange={setSkillRegionFilter}
        onEfficiencyChange={(id) => setSkillFilter(id)}
        onScopeChange={setSkillScopeFilter}
        showScope
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {list.length ? (
          list.map((s) => (
            <div key={s.id} className="market-card apple-card flex flex-col p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <SkillAvatar skillId={s.id} icon={s.icon} size={36} title={s.name} />
                <div className="flex flex-col items-end gap-1">
                  {getSkillReviewStatus(s) !== 'approved' ? (
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        SKILL_REVIEW_BADGE_CLASSES[getSkillReviewStatus(s)],
                      )}
                    >
                      {SKILL_REVIEW_LABELS[getSkillReviewStatus(s)]}
                    </span>
                  ) : (
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        s.published
                          ? 'border border-zinc-200 bg-claw-50 text-zinc-700'
                          : 'bg-black/[0.04] text-[#86868b]',
                      )}
                    >
                      {s.published ? '已发布' : '草稿'}
                    </span>
                  )}
                  {s.sourceType === 'external' && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-700">
                      外部
                    </span>
                  )}
                </div>
              </div>
              <span className="text-[10px] font-semibold text-claw-600">
                {getEfficiencyLabel(s.category)}
              </span>
              <h3 className="text-[13px] font-semibold text-zinc-900">{s.name}</h3>
              <p className="mt-1 flex-1 text-[11px] text-zinc-500">{s.desc}</p>
              <p className="mono mt-1.5 text-[10px] text-zinc-600">{s.command}</p>
              <p className="mt-1 text-[10px] text-zinc-400">
                {(s.ownerDeptIds ?? []).slice(0, 2).map(getDeptLabel).join(' · ') || '未指定职能'}
                {s.ownerRegionId ? ` · ${getRegionLabel(s.ownerRegionId)}` : ''}
                {' · '}
                {ASSET_VISIBILITY_LABELS[s.visibility ?? 'public']}
              </p>
              <div className="mt-3 flex gap-2 border-t border-black/[0.04] pt-2.5">
                {getSkillReviewStatus(s) === 'approved' ? (
                  <button
                    type="button"
                    onClick={() => handleInvoke(s)}
                    className="apple-btn-primary flex-1 rounded-lg py-1.5 text-[11px] font-semibold text-white transition"
                  >
                    调用
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="flex-1 cursor-not-allowed rounded-lg bg-black/[0.04] py-1.5 text-[11px] font-semibold text-[#86868b]"
                  >
                    {getSkillReviewStatus(s) === 'pending' ? '审核中 · 暂不可调用' : '已驳回 · 不可调用'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDetail(s)}
                  className="rounded-lg border border-black/8 px-2.5 py-1.5 text-[11px] font-medium transition hover:bg-black/[0.03]"
                >
                  详情
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="apple-card col-span-3 p-8 text-center text-[#86868b]">未找到匹配的 Skill</div>
        )}
      </div>

      <CenterModal
        open={!!detail}
        title={detail?.name ?? ''}
        onClose={() => setDetail(null)}
        actions={
          detail && (
            <>
              {getSkillReviewStatus(detail) === 'approved' && (
                <button
                  type="button"
                  onClick={() => {
                    handleInvoke(detail);
                    setDetail(null);
                  }}
                  className="apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white"
                >
                  调用
                </button>
              )}
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded-xl border border-black/8 px-4 py-2 text-[12px]"
              >
                关闭
              </button>
            </>
          )
        }
      >
        {detail && (
          <div className="space-y-3 text-[13px]">
            <p className="text-[#86868b]">{detail.desc}</p>
            <p className="mono text-claw-600">{detail.command}</p>
            <p className="text-[11px] text-[#86868b]">
              {getEfficiencyLabel(detail.category)} · v{detail.version} · {detail.connector}
              {detail.ownerRegionId ? ` · ${getRegionLabel(detail.ownerRegionId)}` : ''}
            </p>
            {detail.instructions ? (
              <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3">
                <p className="mb-1.5 text-[11px] font-semibold text-sky-800">Skill 正文（对话执行时注入）</p>
                <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap text-[11px] leading-relaxed text-zinc-700">
                  {detail.instructions}
                </pre>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-2 text-[11px] text-zinc-500">
                尚未配置 Skill 正文。
              </p>
            )}
          </div>
        )}
      </CenterModal>
    </>
  );
}

function ExpertTab({
  search,
  onInvoke,
  onInvokeSkill,
  onStartExpertTeam,
}: {
  search: string;
  onInvoke: (agent: PrototypeAgentSeed, prompt?: string) => void;
  onInvokeSkill: (skill: PrototypeSkillSeed) => void;
  onStartExpertTeam: (plan: ScenarioDemoPlan, fromIndex?: number) => void;
}) {
  const {
    agents,
    agentFilter,
    setAgentFilter,
    agentDeptFilter,
    agentRegionFilter,
    agentScopeFilter,
    setAgentDeptFilter,
    setAgentRegionFilter,
    setAgentScopeFilter,
    filteredAgents,
    bumpAgentInvokes,
    skills,
    tools,
  } = useMarketplaceStore();
  const portalContent = usePortalContentStore((s) => s.items);
  const user = useSessionStore((s) => s.user);
  const [detail, setDetail] = useState<PrototypeAgentSeed | null>(null);
  const [scenarioBundle, setScenarioBundle] = useState<ScenarioBundle | null>(null);

  const list = useMemo(
    () =>
      filteredAgents().filter(
        (a) =>
          !search.trim() ||
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.desc.toLowerCase().includes(search.toLowerCase()) ||
          getAgentPersona(a).name.toLowerCase().includes(search.toLowerCase()),
      ),
    [filteredAgents, search],
  );

  const scenarioBundles = useMemo(
    () =>
      buildScenarioBundles({
        agents,
        skills,
        tools,
        portalContent,
        affiliation: { deptIds: user?.deptIds ?? [], regionId: user?.regionId ?? null },
        userId: user?.id ?? '',
        userName: user?.name ?? '',
        role: user?.platformRole,
        filter: 'all',
      }),
    [agents, skills, tools, portalContent, user],
  );
  const bundleById = useMemo(
    () => new Map(scenarioBundles.map((b) => [b.id, b])),
    [scenarioBundles],
  );

  const handleInvoke = (agent: PrototypeAgentSeed) => {
    bumpAgentInvokes(agent.id);
    onInvoke(agent);
  };

  const skillName = (id: string) =>
    skills.find((s) => s.id === id)?.name ??
    PROTOTYPE_SKILLS.find((s) => s.id === id)?.name ??
    id;

  return (
    <>
      <section className="mb-5">
        <div className="mb-2.5 flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-zinc-900">按场景找专家团</h3>
          <span className="text-[10px] text-zinc-400">点击场景查看专家团与接力步骤</span>
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-1 scroll-hidden">
          {FEATURED_SCENARIOS.map((s) => {
            const bundle = bundleById.get(s.id);
            const expertCount = bundle?.agents.length ?? 0;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => bundle && setScenarioBundle(bundle)}
                className="flex w-[220px] shrink-0 flex-col gap-1.5 rounded-xl border border-zinc-200/80 bg-white px-3 py-2.5 text-left transition hover:border-zinc-300 hover:bg-zinc-50/60"
              >
                <span className="flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
                    <i className={cn('fa-solid text-[12px]', s.icon)} />
                  </span>
                  <span className="truncate text-[12px] font-semibold text-zinc-900">{s.label}</span>
                </span>
                <span className="line-clamp-2 text-[10px] leading-snug text-zinc-400">{s.desc}</span>
                <span className="mt-auto text-[10px] font-medium text-claw-600">
                  {expertCount > 0 ? `${expertCount} 位专家` : '专家团'}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <OrgAssetFilterBar
        deptFilter={agentDeptFilter}
        regionFilter={agentRegionFilter}
        efficiencyFilter={agentFilter === 'experience' ? 'all' : agentFilter}
        scopeFilter={agentScopeFilter}
        onDeptChange={setAgentDeptFilter}
        onRegionChange={setAgentRegionFilter}
        onEfficiencyChange={(id) => setAgentFilter(id)}
        onScopeChange={setAgentScopeFilter}
        showScope
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {list.length ? (
          list.map((a) => {
            const pack = getAgentPack(a.id);
            const runnable = Boolean(a.systemPrompt || pack?.systemPrompt);
            const persona = getAgentPersona(a);
            return (
              <div key={a.id} className="market-card apple-card flex flex-col p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <AgentAvatar agentId={a.id} size={36} title={a.name} />
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        a.published
                          ? 'border border-zinc-200 bg-claw-50 text-zinc-700'
                          : 'bg-black/[0.04] text-[#86868b]',
                      )}
                    >
                      {a.published ? '已发布' : '草稿'}
                    </span>
                    {runnable ? (
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-semibold text-sky-700">
                        可对话执行
                      </span>
                    ) : null}
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-claw-600">
                  {getEfficiencyLabel(a.category)} · {a.bizLine}
                </span>
                <h3 className="mt-0.5 text-[14px] font-semibold text-zinc-900">
                  {persona.name}
                  <span className="ml-1.5 text-[11px] font-medium text-zinc-500">{persona.role}</span>
                </h3>
                <p className="mt-1 flex-1 text-[11px] leading-relaxed text-zinc-500">
                  {persona.tagline}
                </p>
                <p className="mt-1.5 text-[10px] text-zinc-400">
                  {a.name} · {a.author} · {a.invokes.toLocaleString()} 次调用
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {getSkillLabels(a.id)
                    .slice(0, 4)
                    .map((s) => (
                      <span
                        key={s}
                        className="rounded-md bg-black/[0.04] px-1.5 py-0.5 text-[9px] text-[#1d1d1f]"
                      >
                        {s}
                      </span>
                    ))}
                </div>
                <div className="mt-3 flex gap-2 border-t border-black/[0.04] pt-2.5">
                  <button
                    type="button"
                    onClick={() => handleInvoke(a)}
                    className="apple-btn-primary flex-1 rounded-lg py-1.5 text-[11px] font-semibold text-white transition"
                  >
                    调用
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetail(a)}
                    className="rounded-lg border border-black/8 px-3 py-1.5 text-[11px] font-medium transition hover:bg-black/[0.03]"
                  >
                    详情
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="apple-card col-span-3 p-8 text-center text-[#86868b]">未找到匹配的专家</div>
        )}
      </div>

      <CenterModal
        open={!!detail}
        title={detail ? `${getAgentPersona(detail).name} · ${getAgentPersona(detail).role}` : ''}
        size="lg"
        onClose={() => setDetail(null)}
        actions={
          detail && (
            <>
              <button
                type="button"
                onClick={() => {
                  handleInvoke(detail);
                  setDetail(null);
                }}
                className="apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white"
              >
                调用
              </button>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded-xl border border-black/8 px-4 py-2 text-[12px]"
              >
                关闭
              </button>
            </>
          )
        }
      >
        {detail && (
          <div className="space-y-3 text-[13px] text-left">
            <p className="text-[#86868b]">{detail.desc}</p>
            <p className="text-[11px] text-[#86868b]">
              {detail.name} · {getEfficiencyLabel(detail.category)} · {detail.bizLine} · {detail.invokes} 次调用
            </p>
            {(detail.systemPrompt || getAgentPack(detail.id)?.systemPrompt) && (
              <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3">
                <p className="mb-1.5 text-[11px] font-semibold text-sky-800">Persona（对话注入）</p>
                <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap text-[11px] leading-relaxed text-zinc-700">
                  {detail.systemPrompt || getAgentPack(detail.id)?.systemPrompt}
                </pre>
              </div>
            )}
            <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
              <p className="mb-1.5 text-[11px] font-semibold text-zinc-700">挂载技能</p>
              <ul className="space-y-1 text-[11px] text-zinc-600">
                {detail.skillIds.map((id) => (
                  <li key={id}>
                    {skillName(id)}
                    {(detail.primarySkillId || getPrimarySkill(detail)?.id) === id ? (
                      <span className="ml-1 text-sky-700">· 主</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
            {(detail.planSteps?.length || getAgentPack(detail.id)?.planSteps?.length) && (
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
                <p className="mb-1.5 text-[11px] font-semibold text-zinc-700">编排计划</p>
                <ol className="list-decimal space-y-1 pl-4 text-[11px] text-zinc-600">
                  {(detail.planSteps?.length
                    ? detail.planSteps
                    : getAgentPack(detail.id)?.planSteps ?? []
                  ).map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
            <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-3">
              <p className="mb-1.5 text-[11px] font-semibold text-zinc-700">演示任务（调用自动发送）</p>
              <pre className="whitespace-pre-wrap text-[11px] text-zinc-600">
                {detail.demoPrompt || buildAgentDemoPrompt(detail)}
              </pre>
            </div>
          </div>
        )}
      </CenterModal>

      <ScenarioDetailModal
        bundle={scenarioBundle}
        onClose={() => setScenarioBundle(null)}
        onStartExpertTeam={onStartExpertTeam}
        onInvokeAgent={onInvoke}
        onInvokeSkill={onInvokeSkill}
      />
    </>
  );
}
