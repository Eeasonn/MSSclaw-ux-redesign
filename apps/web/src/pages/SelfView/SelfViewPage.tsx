import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { PrototypeAgentSeed, PrototypeSkillSeed } from '@/domain/prototype/types';
import type { PortalContentItem } from '@/domain/prototype/portalContent';
import {
  HQ_DEPTS,
  REGIONS,
  getDeptLabel,
  getRegionLabel,
  type DeptId,
  type RegionId,
} from '@/domain/orgTaxonomy';
import { hasGlobalOrgScope } from '@/domain/rolePerspective';
import {
  heatScore,
  sortByRankMode,
  type RankMode,
} from '@/domain/contentEngagement';
import {
  ensureEngagementSeeds,
  useContentEngagementStore,
} from '@/stores/contentEngagementStore';
import { usePortalContentStore } from '@/stores/portalContentStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useAppViewStore } from '@/stores/appViewStore';
import { useMarketplaceStore } from '@/stores/marketplaceStore';
import { useNavigationIntentStore } from '@/stores/navigationIntentStore';
import { openPortalCard } from '@/domain/portalNavigation';
import { contentToCard } from '@/components/home/PlazaRedesign';

interface SelfViewPageProps {
  onInvokeAgent: (agent: PrototypeAgentSeed, prompt?: string) => void;
  onInvokeSkill: (skill: PrototypeSkillSeed) => void;
}

type SelfContentType = 'all' | 'training';
type SelfSortMode = 'trending' | 'most_used' | 'newest';

const TYPE_OPTIONS: { id: SelfContentType; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'training', label: '培训赋能' },
];

const SORT_OPTIONS: { id: SelfSortMode; label: string }[] = [
  { id: 'trending', label: '最热' },
  { id: 'most_used', label: '最多使用' },
  { id: 'newest', label: '最新' },
];

const ACCENT = '#c0512f';
const FG = '#1c1a17';
const MUTED = '#6b6966';
const LINE = '#d4d2cf';

function useSelfViewPerspective(): {
  regionId: RegionId | 'all';
  deptId: DeptId | 'all';
  regionLocked: boolean;
  domainLocked: boolean;
} {
  const user = useSessionStore((s) => s.user);
  return useMemo(() => {
    const role = user?.platformRole;
    if (hasGlobalOrgScope(role)) {
      return {
        regionId: 'all',
        deptId: 'all',
        regionLocked: false,
        domainLocked: false,
      };
    }
    if (user?.regionId) {
      return {
        regionId: user.regionId,
        deptId: user?.deptIds?.[0] ?? 'all',
        regionLocked: true,
        domainLocked: false,
      };
    }
    if (user?.deptIds?.length) {
      return {
        regionId: 'all',
        deptId: user.deptIds[0],
        regionLocked: false,
        domainLocked: true,
      };
    }
    return {
      regionId: 'all',
      deptId: 'all',
      regionLocked: false,
      domainLocked: false,
    };
  }, [user]);
}

function regionMatch(item: { ownerRegionId?: RegionId | null }, regionId: RegionId | 'all'): boolean {
  if (regionId === 'all') return true;
  return item.ownerRegionId === regionId;
}

function domainMatch(item: { ownerDeptIds?: DeptId[] }, deptId: DeptId | 'all'): boolean {
  if (deptId === 'all') return true;
  if (!item.ownerDeptIds?.length) return true;
  return item.ownerDeptIds.includes(deptId);
}

function MiniSelect<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  disabled,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
  ariaLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="relative w-[110px] shrink-0">
      <select
        aria-label={ariaLabel}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full appearance-none rounded-lg border bg-white py-1.5 pl-2.5 pr-6 text-[11px] font-medium outline-none transition hover:border-zinc-300 focus:border-zinc-400 disabled:bg-[#f4f4f5] disabled:text-[#6b6966]"
        style={{ borderColor: LINE, color: FG }}
      >
        {options.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
      <i className="fa-solid fa-chevron-down pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-zinc-400" />
    </div>
  );
}

function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-px text-[10px]',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SelfViewPage({ onInvokeAgent, onInvokeSkill }: SelfViewPageProps) {
  const items = usePortalContentStore((s) => s.items);
  const showToast = useMarketplaceStore((s) => s.showToast);
  const setAppView = useAppViewStore((s) => s.setAppView);
  const engagementOf = useContentEngagementStore((s) => s.get);
  const engagementById = useContentEngagementStore((s) => s.byId);

  const { regionId: lockedRegionId, deptId: lockedDeptId, regionLocked, domainLocked } =
    useSelfViewPerspective();

  const consumePortalItemId = useNavigationIntentStore((s) => s.consumePortalItemId);

  const [regionId, setRegionId] = useState<RegionId | 'all'>(lockedRegionId);
  const [deptId, setDeptId] = useState<DeptId | 'all'>(lockedDeptId);
  const [typeFilter, setTypeFilter] = useState<SelfContentType>('all');
  const [sortMode, setSortMode] = useState<SelfSortMode>('trending');
  const [highlightItemId, setHighlightItemId] = useState<string | null>(null);

  useEffect(() => {
    const id = consumePortalItemId();
    if (id) {
      setHighlightItemId(id);
    }
  }, [consumePortalItemId]);

  useEffect(() => {
    if (highlightItemId) {
      const t = setTimeout(() => setHighlightItemId(null), 3000);
      return () => clearTimeout(t);
    }
  }, [highlightItemId]);

  const effectiveRegionId = regionLocked ? lockedRegionId : regionId;
  const effectiveDeptId = domainLocked ? lockedDeptId : deptId;

  const filteredItems = useMemo(() => {
    return items.filter(
      (i) =>
        i.published !== false &&
        i.type === 'training' &&
        (typeFilter === 'all' || i.type === typeFilter) &&
        regionMatch(i, effectiveRegionId) &&
        domainMatch(i, effectiveDeptId),
    );
  }, [items, typeFilter, effectiveRegionId, effectiveDeptId]);

  const sortedItems = useMemo(() => {
    return sortByRankMode(filteredItems, sortMode as RankMode, engagementOf);
  }, [filteredItems, sortMode, engagementOf, engagementById]);

  useEffect(() => {
    ensureEngagementSeeds(items.filter((i) => i.type === 'training').map((i) => i.id));
  }, [items]);

  function handleItem(item: PortalContentItem) {
    openPortalCard(contentToCard(item), { onInvokeAgent, onInvokeSkill, showToast });
  }

  function formatDate(d?: string | null): string {
    if (!d) return '';
    return d;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto scroll-hidden bg-white">
      <div className="mx-auto w-full max-w-[1100px] px-5 py-4 md:px-6 md:py-5">
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setAppView('home')}
            className="text-[12px] font-medium transition hover:opacity-80"
            style={{ color: ACCENT }}
          >
            ← 返回广场
          </button>
          <h1 className="text-[16px] font-semibold" style={{ color: FG }}>
            看自己
          </h1>
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <MiniSelect
            ariaLabel="内容类型"
            value={typeFilter}
            onChange={setTypeFilter}
            options={TYPE_OPTIONS}
          />
          <MiniSelect
            ariaLabel="排序方式"
            value={sortMode}
            onChange={setSortMode}
            options={SORT_OPTIONS}
          />
          <div className={cn('flex flex-col gap-1', regionLocked && 'opacity-70')}>
            <span className="text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>
              区域
            </span>
            <select
              aria-label="区域"
              disabled={regionLocked}
              value={effectiveRegionId}
              onChange={(e) => setRegionId(e.target.value as RegionId | 'all')}
              className="w-[120px] rounded-lg border bg-white px-2.5 py-1.5 text-[11px] outline-none transition disabled:bg-[#f4f4f5] disabled:text-[#6b6966]"
              style={{ borderColor: LINE, color: FG }}
            >
              <option value="all">全部区域</option>
              {REGIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className={cn('flex flex-col gap-1', domainLocked && 'opacity-70')}>
            <span className="text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>
              领域
            </span>
            <select
              aria-label="领域"
              disabled={domainLocked}
              value={effectiveDeptId}
              onChange={(e) => setDeptId(e.target.value as DeptId | 'all')}
              className="w-[120px] rounded-lg border bg-white px-2.5 py-1.5 text-[11px] outline-none transition disabled:bg-[#f4f4f5] disabled:text-[#6b6966]"
              style={{ borderColor: LINE, color: FG }}
            >
              <option value="all">全部领域</option>
              {HQ_DEPTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          {(regionLocked || domainLocked) && (
            <span className="text-[10px] text-[#c0512f]">由权限锁定</span>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {sortedItems.map((item) => {
            const e = engagementOf(item.id);
            const h = Math.round(heatScore({ ...e, uses: e.uses }));
            const highlighted = highlightItemId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItem(item)}
                className={cn(
                  'flex flex-col gap-2 rounded-xl border bg-white p-4 text-left transition hover:border-zinc-300 hover:bg-zinc-50/60',
                  highlighted && 'ring-1',
                )}
                style={{ borderColor: highlighted ? ACCENT : LINE }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded border px-1.5 py-px text-[10px] font-semibold"
                    style={{ backgroundColor: '#fff', borderColor: ACCENT, color: ACCENT }}
                  >
                    培训赋能
                  </span>
                  {item.ownerRegionId ? (
                    <Tag className="border-[#4a7c59] text-[#4a7c59]">
                      {getRegionLabel(item.ownerRegionId)}
                    </Tag>
                  ) : null}
                  {(item.ownerDeptIds ?? []).slice(0, 2).map((d) => (
                    <Tag key={d} className="border-[#5b6b8c] text-[#5b6b8c]">
                      {getDeptLabel(d)}
                    </Tag>
                  ))}
                </div>
                <h3 className="text-[14px] font-semibold" style={{ color: FG }}>
                  {item.title}
                </h3>
                <p className="line-clamp-2 text-[12px]" style={{ color: MUTED }}>
                  {item.desc}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-[10px]" style={{ color: MUTED }}>
                  <span title="发布时间">{formatDate(item.publishedAt)}</span>
                  <span title="浏览量">
                    <i className="fa-regular fa-eye mr-0.5" />
                    {e.uses}
                  </span>
                  <span title="点赞量">
                    <i className="fa-solid fa-thumbs-up mr-0.5" />
                    {e.likes}
                  </span>
                  <span title="热度">
                    <i className="fa-solid fa-fire mr-0.5 text-[#c0512f]" />
                    {h}
                  </span>
                </div>
              </button>
            );
          })}
          {!sortedItems.length && (
            <p className="py-8 text-center text-[12px]" style={{ color: MUTED }}>
              该筛选下暂无培训内容
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
