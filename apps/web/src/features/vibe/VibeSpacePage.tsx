import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

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
  accent: string;
  emoji: string;
}

const WORKS: VibeWork[] = [
  {
    id: 'vibe-1',
    title: 'Growth Squad · Sprint 38 Board',
    author: 'Eason',
    authorInitial: 'E',
    publishedAt: '2026-07-21',
    views: 3420,
    likes: 286,
    heat: 4120,
    file: '/vibe/artifact.html',
    accent: 'from-indigo-500 to-violet-600',
    emoji: '🚀',
  },
  {
    id: 'vibe-2',
    title: 'Social Media Management Dashboard',
    author: 'MSS Team',
    authorInitial: 'M',
    publishedAt: '2026-07-20',
    views: 5180,
    likes: 412,
    heat: 6890,
    file: '/vibe/artifact1.html',
    accent: 'from-sky-500 to-cyan-600',
    emoji: '📊',
  },
  {
    id: 'vibe-3',
    title: 'Write a Seed Pitch like a Top Pre-Seed Founder',
    author: 'Founder Lab',
    authorInitial: 'F',
    publishedAt: '2026-07-19',
    views: 2890,
    likes: 198,
    heat: 3250,
    file: '/vibe/pre-seed.html',
    accent: 'from-amber-500 to-orange-600',
    emoji: '🌱',
  },
  {
    id: 'vibe-4',
    title: 'Open Design — Designing intelligence with skills, taste, and your own agent',
    author: 'Open Design',
    authorInitial: 'O',
    publishedAt: '2026-07-18',
    views: 7650,
    likes: 624,
    heat: 9820,
    file: '/vibe/Open-Design.html',
    accent: 'from-rose-500 to-pink-600',
    emoji: '✨',
  },
];

function formatNumber(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
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
        <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
              MSS Claw
            </p>
            <h2 className="text-[20px] font-semibold tracking-tight text-zinc-900 md:text-[22px]">
              Vibe空间
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">
              看看大家用 AI 做出了什么
            </p>
          </div>
          <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-0.5">
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {sortedWorks.map((work) => (
            <a
              key={work.id}
              href={work.file}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-4 rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div
                className={cn(
                  'flex h-40 items-center justify-center rounded-xl bg-gradient-to-br text-5xl text-white/90',
                  work.accent,
                )}
              >
                {work.emoji}
              </div>
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
