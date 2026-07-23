import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { PrototypeAgentSeed, PrototypeSkillSeed } from '@/domain/prototype/types';
import { usePortalContentStore } from '@/stores/portalContentStore';
import { useSessionStore } from '@/stores/sessionStore';
import { getRegionLabel, getDeptLabel } from '@/domain/orgTaxonomy';
import { openPortalCard } from '@/domain/portalNavigation';
import { useMarketplaceStore } from '@/stores/marketplaceStore';

interface SelfViewPageProps {
  onInvokeAgent: (agent: PrototypeAgentSeed, prompt?: string) => void;
  onInvokeSkill: (skill: PrototypeSkillSeed) => void;
}

export function SelfViewPage({ onInvokeAgent, onInvokeSkill }: SelfViewPageProps) {
  const items = usePortalContentStore((s) => s.items);
  const showToast = useMarketplaceStore((s) => s.showToast);
  const user = useSessionStore((s) => s.user);

  const trainings = useMemo(
    () =>
      items
        .filter((i) => i.published !== false && i.type === 'training')
        .filter((i) => {
          const rid = user?.regionId;
          const did = user?.deptIds?.[0];
          if (rid && i.ownerRegionId && i.ownerRegionId !== rid) return false;
          if (did && i.ownerDeptIds?.length && !i.ownerDeptIds.includes(did)) return false;
          return true;
        }),
    [items, user],
  );

  const handleCard = (item: (typeof items)[number]) => {
    openPortalCard(
      {
        id: `portal:${item.id}`,
        kind: item.type,
        title: item.title,
        desc: item.desc,
        icon: item.icon,
        kindLabel: '培训赋能',
        action: { type: 'case', caseId: item.id },
      },
      { onInvokeAgent, onInvokeSkill, showToast },
    );
  };

  return (
    <div className="center-surface center-page scroll-hidden flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-5 md:px-6">
        <div className="mb-5">
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
            MSS Claw
          </p>
          <h2 className="text-[20px] font-semibold tracking-tight text-zinc-900 md:text-[22px]">
            看自己
          </h2>
          <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">培训赋能 · 与你相关的学习资源</p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {trainings.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleCard(item)}
              className="flex flex-col gap-2 rounded-2xl border border-zinc-100 bg-white p-4 text-left shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-center gap-2">
                <i className={cn('fa-solid text-[12px] text-zinc-500', item.icon)} />
                <span className="text-[12px] font-semibold text-zinc-900">培训赋能</span>
              </div>
              <h3 className="line-clamp-2 text-[14px] font-semibold leading-snug text-zinc-800">
                {item.title}
              </h3>
              <p className="line-clamp-2 flex-1 text-[11px] leading-relaxed text-zinc-500">
                {item.desc}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {item.ownerRegionId ? (
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600">
                    {getRegionLabel(item.ownerRegionId)}
                  </span>
                ) : null}
                {(item.ownerDeptIds ?? []).slice(0, 2).map((d) => (
                  <span key={d} className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600">
                    {getDeptLabel(d)}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>

        {trainings.length === 0 && (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white py-16 text-center text-[13px] text-zinc-400">
            当前视角下暂无培训内容
          </div>
        )}
      </div>
    </div>
  );
}
