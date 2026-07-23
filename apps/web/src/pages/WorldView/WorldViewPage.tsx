import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { PrototypeAgentSeed, PrototypeSkillSeed } from '@/domain/prototype/types';
import { usePortalContentStore } from '@/stores/portalContentStore';
import { useSessionStore } from '@/stores/sessionStore';
import { getRegionLabel, getDeptLabel } from '@/domain/orgTaxonomy';
import { openPortalCard } from '@/domain/portalNavigation';
import { useMarketplaceStore } from '@/stores/marketplaceStore';

interface WorldViewPageProps {
  onInvokeAgent: (agent: PrototypeAgentSeed, prompt?: string) => void;
  onInvokeSkill: (skill: PrototypeSkillSeed) => void;
}

export function WorldViewPage({ onInvokeAgent, onInvokeSkill }: WorldViewPageProps) {
  const items = usePortalContentStore((s) => s.items);
  const showToast = useMarketplaceStore((s) => s.showToast);
  const user = useSessionStore((s) => s.user);
  const [tab, setTab] = useState<'public' | 'region' | 'domain'>('public');

  const filtered = useMemo(() => {
    const list = items.filter((i) => i.published !== false && i.type !== 'case');
    if (tab === 'public') return list.filter((i) => i.ownerRegionId === null);
    if (tab === 'region') {
      const rid = user?.regionId ?? null;
      return list.filter((i) => i.ownerRegionId && (rid ? i.ownerRegionId === rid : true));
    }
    const did = user?.deptIds?.[0];
    return list.filter(
      (i) => !did || (i.ownerDeptIds?.length ? i.ownerDeptIds.includes(did) : true),
    );
  }, [items, tab, user]);

  const handleCard = (item: (typeof items)[number]) => {
    openPortalCard(
      {
        id: `portal:${item.id}`,
        kind: item.type,
        title: item.title,
        desc: item.desc,
        icon: item.icon,
        kindLabel:
          item.type === 'case'
            ? '场景案例'
            : item.type === 'training'
              ? '培训赋能'
              : '前沿洞察',
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
            看世界
          </h2>
          <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">公共 · 区域 · 领域洞察与培训</p>
        </div>

        <div className="mb-4 inline-flex rounded-xl border border-zinc-200 bg-white p-0.5">
          {[
            { id: 'public' as const, label: '公共' },
            { id: 'region' as const, label: '区域' },
            { id: 'domain' as const, label: '领域' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'rounded-lg px-4 py-1.5 text-[12px] font-semibold transition',
                tab === t.id ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-50',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleCard(item)}
              className="flex flex-col gap-2 rounded-2xl border border-zinc-100 bg-white p-4 text-left shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-center gap-2">
                <i className={cn('fa-solid text-[12px] text-zinc-500', item.icon)} />
                <span className="text-[12px] font-semibold text-zinc-900">
                  {item.type === 'insight' || item.type === 'news' ? '前沿洞察' : '培训赋能'}
                </span>
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
                ) : (
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600">
                    公共
                  </span>
                )}
                {(item.ownerDeptIds ?? []).slice(0, 2).map((d) => (
                  <span key={d} className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600">
                    {getDeptLabel(d)}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white py-16 text-center text-[13px] text-zinc-400">
            当前视角下暂无内容
          </div>
        )}
      </div>
    </div>
  );
}
