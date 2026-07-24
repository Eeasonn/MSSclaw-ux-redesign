import { cn } from '@/lib/utils';
import {
  SCENARIO_CAPABILITY_CATEGORIES,
  type ScenarioCapabilityId,
} from '@/domain/scenarioCapabilities';
import {
  HQ_DEPTS,
  REGIONS,
  type DeptId,
  type RegionId,
} from '@/domain/orgTaxonomy';
import {
  FG,
  MUTED,
  LINE,
  LockHint,
} from './plazaShared';

interface PlazaHeaderProps {
  capability: ScenarioCapabilityId | 'all';
  setCapability: (v: ScenarioCapabilityId | 'all') => void;
  setRegionId: (v: RegionId | 'all') => void;
  effectiveRegionId: RegionId | 'all';
  regionLocked: boolean;
  setDeptId: (v: DeptId | 'all') => void;
  effectiveDeptId: DeptId | 'all';
  domainLocked: boolean;
}

export function PlazaHeader({
  capability,
  setCapability,
  setRegionId,
  effectiveRegionId,
  regionLocked,
  setDeptId,
  effectiveDeptId,
  domainLocked,
}: PlazaHeaderProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-3">
        <div>
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: MUTED }}>
            MSS CLAW
          </p>
          <h1 className="text-[22px] font-semibold tracking-tight text-zinc-900">
            逛广场
          </h1>
          <p className="mt-0.5 text-[12px]" style={{ color: MUTED }}>
            发现场景、能力与灵感
          </p>
        </div>

        {/* 功能场景 chips */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCapability('all')}
            className={cn(
              'rounded-full border px-3 py-1 text-[11px] font-medium transition',
              capability === 'all'
                ? 'border-transparent text-white'
                : 'bg-white hover:border-zinc-500',
            )}
            style={capability === 'all' ? { backgroundColor: FG } : { borderColor: LINE, color: FG }}
          >
            全部场景
          </button>
          {SCENARIO_CAPABILITY_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCapability(c.id)}
              className={cn(
                'rounded-full border px-3 py-1 text-[11px] font-medium transition',
                capability === c.id
                  ? 'border-transparent text-white'
                  : 'bg-white hover:border-zinc-500',
              )}
              style={capability === c.id ? { backgroundColor: FG } : { borderColor: LINE, color: FG }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* 区域 / 领域筛选器 */}
      <div className="flex flex-wrap items-end gap-4">
        <div className={cn('flex flex-col gap-1', regionLocked && 'opacity-70')}>
          <span className="text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>
            区域
          </span>
          <select
            aria-label="区域"
            disabled={regionLocked}
            value={effectiveRegionId}
            onChange={(e) => setRegionId(e.target.value as RegionId | 'all')}
            className="w-[120px] rounded-lg border bg-white px-2.5 py-1.5 text-[11px] outline-none transition disabled:bg-zinc-100 disabled:text-zinc-500"
            style={{ borderColor: LINE, color: FG }}
          >
            <option value="all">全部区域</option>
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          {regionLocked ? <LockHint /> : null}
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
            className="w-[120px] rounded-lg border bg-white px-2.5 py-1.5 text-[11px] outline-none transition disabled:bg-zinc-100 disabled:text-zinc-500"
            style={{ borderColor: LINE, color: FG }}
          >
            <option value="all">全部领域</option>
            {HQ_DEPTS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
          {domainLocked ? <LockHint /> : null}
        </div>
      </div>
    </div>
  );
}
