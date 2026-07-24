import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { CenterSearchInput } from '@/components/center/CenterShell';
import { COURSES, type Course, type CourseInstructor } from './academyMock';
import { CourseDetailModal, InstructorModal } from './AiAcademyPage';

function formatHeat(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function AiAcademyAllPage() {
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<Course | null>(null);
  const [instructor, setInstructor] = useState<CourseInstructor | null>(null);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COURSES;
    return COURSES.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.subtitle.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q)) ||
        c.instructor.name.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <div className="center-surface center-page scroll-hidden flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-5 md:px-6">
        <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
              AI学院
            </p>
            <h2 className="text-[22px] font-semibold tracking-tight text-zinc-900">
              全部课程
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">
              {COURSES.length} 门精品课程，覆盖提示词、Agent、RAG、办公与行业实战
            </p>
          </div>
          <CenterSearchInput
            value={search}
            onChange={setSearch}
            placeholder="搜索课程、讲师或标签…"
            className="w-full md:w-64"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setDetail(c)}
              className="flex flex-col gap-3 rounded-2xl border border-zinc-100 bg-white p-4 text-left shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white',
                    c.coverColor,
                  )}
                >
                  <i className={cn('fa-solid text-lg', c.icon)} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[14px] font-semibold text-zinc-900">{c.title}</h3>
                  <p className="line-clamp-1 text-[11px] text-zinc-400">{c.subtitle}</p>
                </div>
              </div>
              <p className="line-clamp-2 flex-1 text-[12px] leading-relaxed text-zinc-500">
                {c.description}
              </p>
              <div className="flex flex-wrap gap-1">
                {c.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-zinc-100 pt-3 text-[11px] text-zinc-400">
                <span className="inline-flex items-center gap-1">
                  <i className="fa-regular fa-clock" />
                  {c.duration}
                </span>
                <span className="inline-flex items-center gap-1">
                  <i className="fa-solid fa-fire text-[var(--brand)]" />
                  {formatHeat(c.heat)}
                </span>
              </div>
            </button>
          ))}
        </div>

        {list.length === 0 && (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white py-16 text-center text-[13px] text-zinc-400">
            未找到匹配课程
          </div>
        )}
      </div>

      <CourseDetailModal
        course={detail}
        open={!!detail}
        onClose={() => setDetail(null)}
        onInstructor={(i) => {
          setDetail(null);
          setInstructor(i);
        }}
      />
      <InstructorModal
        instructor={instructor}
        open={!!instructor}
        onClose={() => setInstructor(null)}
      />
    </div>
  );
}
