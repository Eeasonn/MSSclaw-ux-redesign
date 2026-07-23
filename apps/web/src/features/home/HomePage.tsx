import { useEffect, useMemo } from 'react';
import type {
  PrototypeAgentSeed,
  PrototypeKbDocument,
  PrototypeSkillSeed,
} from '@/domain/prototype/types';
import {
  getVisibleHomeDepts,
  getVisibleHomeRegions,
} from '@/domain/rolePerspective';
import { canExecuteChat } from '@/domain/permissions';
import type { ScenarioDemoPlan } from '@/domain/scenarioPipeline';
import { HomeCommandBox } from '@/components/home/HomeCommandBox';
import { PlazaRedesign } from '@/components/home/PlazaRedesign';
import { useHomeStore } from '@/stores/homeStore';
import { useSessionStore } from '@/stores/sessionStore';

interface HomePageProps {
  onSubmitTask: (text: string, agent?: PrototypeAgentSeed | null) => void;
  onInvokeAgent: (agent: PrototypeAgentSeed, prompt?: string) => void;
  onInvokeSkill: (skill: PrototypeSkillSeed) => void;
  onAskKbDocument?: (doc: PrototypeKbDocument) => void;
  /** 场景详情弹窗 → 启动专家团同会话接力 */
  onStartExpertTeam: (plan: ScenarioDemoPlan, fromIndex?: number) => void;
}

/** 高频意图快捷指令（偏技能命令） */
const INTENT_PROMPTS = [
  '/价格监测 分析本周竞品价格异动',
  '/评论分析 聚类本周电渠差评并给建议',
  '/培训内容 生成门店话术并准备陪练',
] as const;

const HERO_SUBTITLE = '说出来就干活 · 输入需求直接开工，或按场景找专家团一键打样';

export function HomePage({
  onSubmitTask,
  onInvokeAgent,
  onInvokeSkill,
  onStartExpertTeam,
}: HomePageProps) {
  const { category, regionId, setCategory, setDraftText, applyUserOrgDefaults } = useHomeStore();
  const user = useSessionStore((s) => s.user);
  const executeAllowed = canExecuteChat(user?.platformRole);

  const affiliation = useMemo(
    () => ({
      deptIds: user?.deptIds ?? [],
      regionId: user?.regionId ?? null,
    }),
    [user?.deptIds, user?.regionId],
  );

  const visibleDepts = useMemo(
    () => getVisibleHomeDepts(affiliation, user?.platformRole),
    [affiliation, user?.platformRole],
  );
  const visibleRegions = useMemo(
    () => getVisibleHomeRegions(affiliation, user?.platformRole),
    [affiliation, user?.platformRole],
  );

  // 组织默认值供输入框联想（SharedComposer 读取 homeStore 的 category/regionId）
  useEffect(() => {
    if (!user) return;
    applyUserOrgDefaults(
      {
        deptIds: user.deptIds,
        regionId: user.regionId,
      },
      user.platformRole,
    );
  }, [user?.id, user?.deptIds?.join(','), user?.regionId, user?.platformRole, applyUserOrgDefaults]);

  useEffect(() => {
    if (!visibleDepts.includes(category) && visibleDepts[0]) {
      setCategory(visibleDepts[0]);
    }
  }, [visibleDepts, category, setCategory]);

  useEffect(() => {
    if (!visibleRegions.includes(regionId) && visibleRegions[0]) {
      useHomeStore.setState({ regionId: visibleRegions[0] });
    }
  }, [visibleRegions, regionId]);

  return (
    <div className="home-surface flex min-h-0 flex-1 flex-col overflow-y-auto scroll-hidden">
      <div className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col px-5 py-4 md:px-6 md:py-5">
        <header className="mb-3 text-center">
          <h1 className="home-slogan-art">
            <span className="home-slogan-gradient">MSS AI提效作战平台，好学又好用！</span>
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-[12px] leading-relaxed text-zinc-500">
            {HERO_SUBTITLE}
          </p>
        </header>

        {executeAllowed ? (
          <div className="mb-5">
            <HomeCommandBox
              onSubmit={(text) =>
                onSubmitTask(text, useHomeStore.getState().resolveAgentFromText(text))
              }
            />

            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {INTENT_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setDraftText(prompt)}
                  className="rounded-full border border-zinc-200/90 bg-white px-3 py-1 text-[11px] font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-4 rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-center text-[11px] leading-relaxed text-amber-900">
            当前为只读访客：可浏览案例与任务结果，不可发起执行
          </div>
        )}

        <PlazaRedesign
          onInvokeAgent={onInvokeAgent}
          onInvokeSkill={onInvokeSkill}
          onStartExpertTeam={onStartExpertTeam}
        />
      </div>
    </div>
  );
}
