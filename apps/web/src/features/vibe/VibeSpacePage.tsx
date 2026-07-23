import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

const ACCENTS = [
  'from-rose-400 via-pink-500 to-fuchsia-500',
  'from-sky-400 via-cyan-500 to-teal-500',
  'from-amber-400 via-orange-500 to-red-500',
  'from-violet-400 via-indigo-500 to-blue-600',
];

const SHAPES = [
  'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.35) 0%, transparent 40%)',
  'radial-gradient(circle at 70% 70%, rgba(255,255,255,0.35) 0%, transparent 40%)',
  'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 50%)',
  'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.3) 0%, transparent 60%)',
];

type SortMode = 'latest' | 'hottest' | 'liked';

interface VibeWork {
  id: string;
  title: string;
  author: string;
  authorInitial: string;
  publishedAt: string;
  views: number;
  likes: number;
  heat: number;
  file: string;
  icon: string;
  accent: string;
  shape: string;
}

const WORKS: VibeWork[] = [
  {
    id: 'vibe-1',
    title: 'Open Design — Designing intelligence with skills, taste, and your own agent',
    author: 'Open Design',
    authorInitial: 'O',
    publishedAt: '2026-07-20',
    views: 7650,
    likes: 624,
    heat: 9820,
    file: '/vibe/Open-Design.html',
    icon: 'fa-wand-magic-sparkles',
    accent: ACCENTS[3],
    shape: SHAPES[3],
  },
  {
    id: 'vibe-2',
    title: 'Growth Squad · Sprint 38 Board',
    author: 'Eason',
    authorInitial: 'E',
    publishedAt: '2026-07-19',
    views: 5180,
    likes: 412,
    heat: 6890,
    file: '/vibe/artifact.html',
    icon: 'fa-rocket',
    accent: ACCENTS[0],
    shape: SHAPES[0],
  },
  {
    id: 'vibe-3',
    title: 'Social Media Management Dashboard',
    author: 'MSS Team',
    authorInitial: 'M',
    publishedAt: '2026-07-18',
    views: 3420,
    likes: 286,
    heat: 4120,
    file: '/vibe/artifact1.html',
    icon: 'fa-chart-simple',
    accent: ACCENTS[1],
    shape: SHAPES[1],
  },
  {
    id: 'vibe-4',
    title: 'Write a Seed Pitch like a Top Pre-Seed Founder',
    author: 'Founder Lab',
    authorInitial: 'F',
    publishedAt: '2026-07-17',
    views: 2890,
    likes: 198,
    heat: 3250,
    file: '/vibe/pre-seed.html',
    icon: 'fa-seedling',
    accent: ACCENTS[2],
    shape: SHAPES[2],
  },
];

function formatNumber(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function WorkCover({ work }: { work: VibeWork }) {
  return (
    <div
      className={cn(
        'relative h-44 w-full overflow-hidden rounded-2xl bg-gradient-to-br',
        work.accent,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: work.shape }}
      />
      <div className="pointer-events-none absolute -left-6 -top-6 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-8 -right-8 h-40 w-40 rounded-full bg-white/15 blur-3xl" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/30 bg-white/20 text-3xl text-white/90 shadow-lg backdrop-blur-sm">
          <i className={cn('fa-solid', work.icon)} />
        </span>
      </div>
      <div className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 shadow-sm">
        <i className="fa-solid fa-sparkles mr-1 text-amber-500" />
        Vibe
      </div>
    </div>
  );
}

export function VibeSpacePage() {
  const [sort, setSort] = useState<SortMode>('hottest');

  const sortedWorks = useMemo(() => {
    const next = [...WORKS];
    if (sort === 'latest') {
      next.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    } else if (sort === 'hottest') {
      next.sort((a, b) => b.heat - a.heat);
    } else {
      next.sort((a, b) => b.likes - a.likes);
    }
    return next;
  }, [sort]);

  return (
    <div className="center-surface center-page scroll-hidden flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-5 md:px-6">
        <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
              MSS Claw
            </p>
            <h2 className="text-[22px] font-semibold tracking-tight text-zinc-900 md:text-[26px]">
              Vibe空间
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">
              看看大家用 AI 做出了什么
            </p>
          </div>
          <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-0.5 shadow-sm">
            {[
              { id: 'latest' as SortMode, label: '最新' },
              { id: 'hottest' as SortMode, label: '最热' },
              { id: 'liked' as SortMode, label: '最多赞' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSort(t.id)}
                className={cn(
                  'rounded-lg px-4 py-1.5 text-[12px] font-semibold transition',
                  sort === t.id ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-50',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {sortedWorks.map((work) => (
            <a
              key={work.id}
              href={work.file}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-4 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <WorkCover work={work} />
              <div>
                <h3 className="text-[15px] font-semibold leading-snug text-zinc-900 group-hover:text-zinc-700">
                  {work.title}
                </h3>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-semibold text-zinc-600">
                      {work.authorInitial}
                    </span>
                    <span className="text-[12px] text-zinc-600">{work.author}</span>
                  </div>
                  <span className="text-[11px] text-zinc-400">{work.publishedAt}</span>
                </div>
                <div className="mt-3 flex items-center gap-4 text-[11px] text-zinc-400">
                  <span className="inline-flex items-center gap-1">
                    <i className="fa-regular fa-eye" />
                    {formatNumber(work.views)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <i className="fa-solid fa-heart text-rose-500" />
                    {formatNumber(work.likes)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <i className="fa-solid fa-fire text-orange-500" />
                    {formatNumber(work.heat)}
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
