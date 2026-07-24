import { cn } from '@/lib/utils';
import type { PrototypeToolSeed } from '@/domain/prototype/types';
import {
  AI_TOOL_NAV_CATEGORIES,
  type AiToolNavCategoryId,
} from '@/domain/aiToolCategories';
import { getPlazaToolGuides } from '@/domain/plazaToolGuides';
import { ToolLogo } from '@/components/brand/ToolLogo';
import {
  ACCENT,
  FG,
  MUTED,
  LINE,
  formatInvokes,
} from './plazaShared';

interface PlazaToolSectionProps {
  activeToolCategory: AiToolNavCategoryId;
  setActiveToolCategory: (v: AiToolNavCategoryId) => void;
  externalTools: PrototypeToolSeed[];
  internalTools: PrototypeToolSeed[];
  onOpenTool: (tool: PrototypeToolSeed) => void;
  onOpenHowTo: (tool: PrototypeToolSeed) => void;
}

export function PlazaToolSection({
  activeToolCategory,
  setActiveToolCategory,
  externalTools,
  internalTools,
  onOpenTool,
  onOpenHowTo,
}: PlazaToolSectionProps) {
  return (
    <div className="rounded-xl border bg-white p-4" style={{ borderColor: LINE }}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xl font-semibold tracking-tight" style={{ color: FG }}>
          马上能用
        </h3>
        <span className="text-[10px]" style={{ color: MUTED }}>
          全局公共入口，不受区域/领域筛选影响
        </span>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {AI_TOOL_NAV_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActiveToolCategory(c.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition',
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <div className="text-[11px] font-semibold" style={{ color: FG }}>
            外部
          </div>
          <div className="flex flex-col gap-2">
            {externalTools.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                onClick={() => onOpenTool(tool)}
                onHowTo={() => onOpenHowTo(tool)}
              />
            ))}
            {!externalTools.length && (
              <p className="text-[10px]" style={{ color: MUTED }}>
                该分类暂无外部推荐
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-[11px] font-semibold" style={{ color: FG }}>
            内部
          </div>
          <div className="flex flex-col gap-2">
            {internalTools.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                onClick={() => onOpenTool(tool)}
                onHowTo={() => onOpenHowTo(tool)}
              />
            ))}
            {!internalTools.length && (
              <p className="text-[10px]" style={{ color: MUTED }}>
                该分类暂无内部推荐
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolCard({
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
      className="flex items-start gap-3 rounded-lg border bg-white p-3 text-left transition hover:bg-zinc-50/60"
      style={{ borderColor: LINE }}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: '#f0eeeb' }}>
        <ToolLogo name={tool.name} logoUrl={tool.logoUrl} icon={tool.icon} size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold" style={{ color: FG }}>
            {tool.name}
          </span>
          <span className="text-[10px]" style={{ color: MUTED }}>
            {tool.sourceType === 'external' ? '外部' : '内部'}
          </span>
        </div>
        <p className="line-clamp-2 text-[10px]" style={{ color: MUTED }}>
          {tool.desc}
        </p>
        <div className="mt-1 flex items-center gap-2 text-[10px]" style={{ color: MUTED }}>
          <span>调用 {formatInvokes(tool.invokes)}</span>
          {hasGuide ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onHowTo();
              }}
              className="flex h-4 w-4 items-center justify-center rounded-full border text-[10px] font-semibold transition hover:border-zinc-400 hover:text-zinc-700"
              style={{ borderColor: LINE, color: ACCENT }}
              title="How to 指引"
            >
              ?
            </button>
          ) : null}
        </div>
      </div>
    </button>
  );
}
