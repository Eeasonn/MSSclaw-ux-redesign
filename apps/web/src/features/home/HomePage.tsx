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

import { PlazaRedesign } from '@/components/home/PlazaRedesign';
import { useHomeStore } from '@/stores/homeStore';
import { useSessionStore } from '@/stores/sessionStore';

interface HomePageProps {
  onSubmitTask: (text: string, agent?: PrototypeAgentSeed | null) => void;
  onInvokeAgent: (agent: PrototypeAgentSeed, prompt?: string) => void;
  onInvokeSkill: (skill: PrototypeSkillSeed) => void;
  onAskKbDocument?: (doc: PrototypeKbDocument) => void;
}

export function HomePage({
  onSubmitTask,
  onInvokeAgent,
  onInvokeSkill,
}: HomePageProps) {
  const { category, regionId, setCategory, applyUserOrgDefaults } = useHomeStore();
  const user = useSessionStore((s) => s.user);

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

  void onSubmitTask;

  return (
    <div className="home-surface flex min-h-0 flex-1 flex-col overflow-y-auto scroll-hidden">
      <div className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col px-5 py-4 md:px-6 md:py-5">
        <PlazaRedesign
          onInvokeAgent={onInvokeAgent}
          onInvokeSkill={onInvokeSkill}
        />
      </div>
    </div>
  );
}
