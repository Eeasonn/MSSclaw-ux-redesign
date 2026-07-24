import { PLAZA_GUIDE_TYPE_LABEL, type PlazaToolGuide } from '@/domain/plazaToolGuides';

interface PlazaHowToDrawerProps {
  toolName: string;
  guides: PlazaToolGuide[];
  onClose: () => void;
  onOpenGuide: (g: PlazaToolGuide) => void;
}

export function PlazaHowToDrawer({
  toolName,
  guides,
  onClose,
  onOpenGuide,
}: PlazaHowToDrawerProps) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-[320px] flex-col border-l border-zinc-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3.5">
          <div className="min-w-0">
            <p className="font-serif text-[12px] italic text-zinc-400">How to</p>
            <h3 className="mt-0.5 truncate text-[14px] font-semibold text-zinc-900">{toolName}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-[12px] text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700"
          >
            关闭
          </button>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
          {guides.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => onOpenGuide(g)}
              className="flex w-full items-start gap-2.5 rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-3 py-2.5 text-left transition hover:border-zinc-300 hover:bg-white"
            >
              <span className="mt-0.5 shrink-0 rounded-md bg-zinc-900/90 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                {PLAZA_GUIDE_TYPE_LABEL[g.type]}
              </span>
              <span className="min-w-0">
                <span className="block text-[12px] font-semibold text-zinc-800">{g.title}</span>
                {g.blurb ? (
                  <span className="mt-0.5 block text-[10px] leading-snug text-zinc-400">{g.blurb}</span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
