import { cn } from '@/lib/utils';
import type { PrototypeToolSeed } from '@/domain/prototype/types';
import {
  AI_TOOL_NAV_CATEGORIES,
  type AiToolNavCategoryId,
} from '@/domain/aiToolCategories';
import { getPlazaToolGuides } from '@/domain/plazaToolGuides';
import { ToolLogo } from '@/components/brand/ToolLogo';
import { FG, MUTED, LINE, ACCENT, formatInvokes } from './plazaShared';

interface PlazaToolStripProps {
  activeToolCategory: AiToolNavCategoryId;
  setActiveToolCategory: (v: AiToolNavCategoryId) => void;
  externalTools: PrototypeToolSeed[];
  internalTools: PrototypeToolSeed[];
  onOpenTool: (tool: PrototypeToolSeed) => void;
  onOpenHowTo: (tool: PrototypeToolSeed) => void;
  onMoreTools?: () => void;
}

export function PlazaToolStrip({
  activeToolCategory,
  setActiveToolCategory,
  externalTools,
  internalTools,
  onOpenTool,
  onOpenHowTo,
  onMoreTools,
}: PlazaToolStripProps) {
  const visibleTools = [...externalTools, ...internalTools].slice(0, 6);

  return (
    <div
      className="rounded-xl border p-3"
      style={{ borderColor: LINE, backgroundColor: '#f8f7f4' }}
      data-od-id="plaza-tool-strip"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-xs font-semibold" style={{ color: FG }}>
          马上能用
        </span>

        <div className="flex flex-wrap items-center gap-1.5">
          {AI_TOOL_NAV_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveToolCategory(c.id)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition',
                activeToolCategory === c.id
                  ? 'border-transparent text-white'
                  : 'bg-white hover:border-zinc-500',
              )}
              style={
                activeToolCategory === c.id
                  ? { backgroundColor: FG }
                  : { borderColor: LINE, color: FG }
              }
              title={c.blurb}
            >
              <i className={cn('fa-solid text-[10px]', c.icon)} />
              {c.label}
            </button>
          ))}
        </div>

        {onMoreTools ? (
          <button
            type="button"
            onClick={onMoreTools}
            className="ml-auto text-[11px] font-medium transition hover:opacity-80"
            style={{ color: ACCENT }}
          >
            更多工具 →
          </button>
        ) : null}
      </div>

      {visibleTools.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {visibleTools.map((tool) => (
            <ToolChip
              key={tool.id}
              tool={tool}
              onClick={() => onOpenTool(tool)}
              onHowTo={() => onOpenHowTo(tool)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ToolChip({
  tool,
  onClick,
  onHowTo,
}: {
  tool: PrototypeToolSeed;
  onClick: () => void;
  onHowTo: () => void;
}) {
  const hasGuide = getPlazaToolGuides(tool.id).length > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex items-center gap-2 rounded-lg border bg-white px-2.5 py-1.5 text-left transition hover:bg-zinc-50/60"
      style={{ borderColor: LINE }}
      title={tool.desc}
    >
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: 'var(--brand-surface, #f5f3f0)' }}
      >
        <ToolLogo name={tool.name} logoUrl={tool.logoUrl} icon={tool.icon} size={16} />
      </span>
      <span className="max-w-[120px] truncate text-[11px] font-medium" style={{ color: FG }}>
        {tool.name}
      </span>
      <span className="text-[10px]" style={{ color: MUTED }}>
        调用 {formatInvokes(tool.invokes)}
      </span>
      {hasGuide ? (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onHowTo();
          }}
          className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border text-[10px] font-semibold transition hover:border-zinc-400 hover:text-zinc-700"
          style={{ borderColor: LINE, color: ACCENT }}
          title="How to 指引"
        >
          ?
        </span>
      ) : null}
    </button>
  );
}
