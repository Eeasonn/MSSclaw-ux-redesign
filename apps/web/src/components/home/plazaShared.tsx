import { useMemo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { PrototypeAgentSeed } from '@/domain/prototype/types';
import type { PortalMapCard, PortalCardAction } from '@/domain/portalMap';
import { FEATURED_SCENARIOS } from '@/domain/portalMap';
import {
  SCENARIO_CAPABILITY_MAP,
  type ScenarioCapabilityId,
} from '@/domain/scenarioCapabilities';
import {
  HQ_DEPTS,
  REGIONS,
  getDeptLabel,
  getRegionLabel,
  type DeptId,
  type RegionId,
} from '@/domain/orgTaxonomy';
import { hasGlobalOrgScope } from '@/domain/rolePerspective';
import { useSessionStore } from '@/stores/sessionStore';
import { useContentEngagementStore } from '@/stores/contentEngagementStore';
import { heatScore } from '@/domain/contentEngagement';

export const ACCENT = 'var(--brand)';
export const FG = 'var(--brand-fg)';
export const MUTED = 'var(--brand-muted)';
export const LINE = 'var(--brand-line)';

export function usePlazaPerspective(): {
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
      const deptId = user.deptIds[0];
      return {
        regionId: 'all',
        deptId,
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

export function regionMatch(
  item: { ownerRegionId?: RegionId | null },
  regionId: RegionId | 'all',
): boolean {
  if (regionId === 'all') return true;
  return item.ownerRegionId === regionId;
}

export function domainMatch(
  item: { ownerDeptIds?: DeptId[] },
  deptId: DeptId | 'all',
): boolean {
  if (deptId === 'all') return true;
  if (!item.ownerDeptIds?.length) return true;
  return item.ownerDeptIds.includes(deptId);
}

function getCapabilityTags(capabilityId: ScenarioCapabilityId): string[] {
  const tags = new Set<string>();
  (Object.entries(SCENARIO_CAPABILITY_MAP) as [string, ScenarioCapabilityId[]][])
    .filter(([_, caps]) => caps.includes(capabilityId))
    .forEach(([scenarioId]) => {
      const scenario = FEATURED_SCENARIOS.find((s) => s.id === scenarioId);
      scenario?.matchTags.forEach((t) => tags.add(t));
    });
  return [...tags];
}

export function capabilityMatch(
  item: { scenarioTags?: string[]; tags?: string[] },
  capabilityId: ScenarioCapabilityId | 'all',
): boolean {
  if (capabilityId === 'all') return true;
  const tags = getCapabilityTags(capabilityId);
  const source = [...(item.scenarioTags ?? []), ...(item.tags ?? [])];
  return source.some((t) => tags.includes(t));
}

export function formatInvokes(n: number): string {
  if (n >= 10000) return `${Math.round(n / 10000)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function Tag({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
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

export function LockHint() {
  return <span className="text-[10px] text-[var(--brand)]">由权限锁定</span>;
}

export function resolveCardAgent(
  card: PortalMapCard,
  agents: PrototypeAgentSeed[],
): PrototypeAgentSeed | undefined {
  if (card.action.type === 'agent') {
    return agents.find(
      (a) =>
        a.id ===
        (card.action as Extract<PortalCardAction, { type: 'agent' }>).agentId,
    );
  }
  return agents.find((a) => a.name === card.title);
}

export function MiniSelect<T extends string>({
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
    <div className="relative w-[92px] shrink-0">
      <select
        aria-label={ariaLabel}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full appearance-none rounded-full border border-zinc-200/90 bg-white py-1.5 pl-2.5 pr-6 text-[11px] font-medium text-zinc-700 outline-none transition hover:border-zinc-300 focus:border-zinc-400 disabled:bg-zinc-100 disabled:text-zinc-500"
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

export function CardEngagementFooter({
  contentId,
  baseUses = 0,
  publishedAt,
}: {
  contentId: string;
  baseUses?: number;
  publishedAt?: string | null;
}) {
  const e = useContentEngagementStore((s) => s.get(contentId));
  const uses = e.uses + baseUses;
  const h = Math.round(heatScore({ ...e, uses }));
  return (
    <div className="mt-auto flex flex-wrap items-center gap-3 text-[10px]" style={{ color: MUTED }}>
      {publishedAt ? <span>{publishedAt}</span> : null}
      <span title="浏览量">
        <i className="fa-regular fa-eye mr-0.5" />
        {uses}
      </span>
      <span title="点赞量">
        <i className="fa-solid fa-thumbs-up mr-0.5" />
        {e.likes}
      </span>
      <span title="热度">
        <i className="fa-solid fa-fire mr-0.5" style={{ color: ACCENT }} />
        {h}
      </span>
    </div>
  );
}

export { HQ_DEPTS, REGIONS, getDeptLabel, getRegionLabel };
export type { DeptId, RegionId };
