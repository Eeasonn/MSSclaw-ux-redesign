import {
  FG,
  MUTED,
} from './plazaShared';

export function PlazaHeader() {
  return (
    <div className="flex flex-col gap-1">
      <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: MUTED }}>
        MSS CLAW
      </p>
      <h1 className="text-[22px] font-semibold tracking-tight" style={{ color: FG }}>
        逛广场
      </h1>
      <p className="mt-0.5 text-[12px]" style={{ color: MUTED }}>
        发现场景、能力与灵感
      </p>
    </div>
  );
}
