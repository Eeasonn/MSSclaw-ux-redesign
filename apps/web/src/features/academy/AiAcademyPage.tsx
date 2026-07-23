import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { CenterModal } from '@/components/center/CenterShell';
import { useAppViewStore } from '@/stores/appViewStore';
import { COURSES, AI_HOT_SPOTS, type Course, type CourseInstructor } from './academyMock';

function formatHeat(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function CourseCard({
  course,
  size,
  onClick,
}: {
  course: Course;
  size: 'lg' | 'sm';
  onClick: () => void;
}) {
  const isLg = size === 'lg';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-white text-left shadow-sm transition hover:shadow-md',
        isLg ? 'h-full min-h-[280px] p-5' : 'min-h-[84px] p-4',
      )}
    >
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r opacity-80',
          course.coverColor,
        )}
      />
      <div className={cn('flex', isLg ? 'flex-col gap-3' : 'items-center gap-3')}>
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm',
            course.coverColor,
            isLg ? 'h-14 w-14 text-xl' : 'h-10 w-10 text-sm',
          )}
        >
          <i className={cn('fa-solid', course.icon)} />
        </span>
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              'font-semibold text-zinc-900',
              isLg ? 'text-[16px]' : 'text-[13px]',
            )}
          >
            {course.title}
          </h3>
          {isLg ? (
            <p className="mt-1 text-[12px] text-zinc-500">{course.subtitle}</p>
          ) : (
            <p className="line-clamp-1 text-[11px] text-zinc-400">{course.subtitle}</p>
          )}
        </div>
      </div>
      {isLg && (
        <>
          <p className="mt-2 line-clamp-3 flex-1 text-[12px] leading-relaxed text-zinc-500">
            {course.description}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
            <span className="inline-flex items-center gap-1">
              <i className="fa-regular fa-clock" />
              {course.duration}
            </span>
            <span className="inline-flex items-center gap-1">
              <i className="fa-solid fa-fire text-orange-500" />
              {formatHeat(course.heat)}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-semibold text-zinc-600">
              {course.instructor.name.charAt(0)}
            </span>
            <span className="text-[11px] text-zinc-600">{course.instructor.name}</span>
            <span className="text-[10px] text-zinc-400">· {course.instructor.title}</span>
          </div>
        </>
      )}
    </button>
  );
}

export function InstructorModal({
  instructor,
  open,
  onClose,
}: {
  instructor: CourseInstructor | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!instructor) return null;
  const courses = COURSES.filter((c) => c.instructor.id === instructor.id);
  return (
    <CenterModal open={open} title={instructor.name} onClose={onClose}>
      <div className="space-y-4 text-[13px]">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-lg font-semibold text-white">
            {instructor.name.charAt(0)}
          </span>
          <div>
            <p className="text-[15px] font-semibold text-zinc-900">{instructor.name}</p>
            <p className="text-[12px] text-zinc-500">{instructor.title}</p>
          </div>
        </div>
        <p className="leading-relaxed text-zinc-600">{instructor.bio}</p>
        <div>
          <p className="mb-2 text-[11px] font-semibold text-zinc-700">代表课程</p>
          <div className="space-y-2">
            {courses.map((c) => (
              <div key={c.id} className="rounded-lg border border-zinc-100 bg-zinc-50/60 px-3 py-2">
                <p className="text-[12px] font-medium text-zinc-800">{c.title}</p>
                <p className="text-[11px] text-zinc-400">{c.subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CenterModal>
  );
}

export function CourseDetailModal({
  course,
  open,
  onClose,
  onInstructor,
}: {
  course: Course | null;
  open: boolean;
  onClose: () => void;
  onInstructor: (instructor: CourseInstructor) => void;
}) {
  if (!course) return null;
  return (
    <CenterModal
      open={open}
      title={course.title}
      onClose={onClose}
      size="lg"
      actions={
        <>
          <button
            type="button"
            onClick={onClose}
            className="apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white"
          >
            开始学习
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-black/8 px-4 py-2 text-[12px]"
          >
            关闭
          </button>
        </>
      }
    >
      <div className="space-y-4 text-[13px]">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white',
              course.coverColor,
            )}
          >
            <i className={cn('fa-solid text-xl', course.icon)} />
          </span>
          <div>
            <p className="text-[12px] text-zinc-500">{course.subtitle}</p>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
              <span className="inline-flex items-center gap-1">
                <i className="fa-regular fa-clock" />
                {course.duration}
              </span>
              <span className="inline-flex items-center gap-1">
                <i className="fa-solid fa-fire text-orange-500" />
                {formatHeat(course.heat)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-500">讲师：</span>
          <button
            type="button"
            onClick={() => onInstructor(course.instructor)}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-50 px-2.5 py-1 text-[12px] font-medium text-zinc-700 transition hover:bg-zinc-100"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-semibold text-white">
              {course.instructor.name.charAt(0)}
            </span>
            {course.instructor.name} · {course.instructor.title}
          </button>
        </div>

        <p className="leading-relaxed text-zinc-600">{course.description}</p>

        <div>
          <p className="mb-2 text-[11px] font-semibold text-zinc-700">课程大纲</p>
          <ol className="list-decimal space-y-1.5 pl-4 text-[12px] text-zinc-600">
            {course.outline.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ol>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold text-zinc-700">适合人群</p>
          <div className="flex flex-wrap gap-1.5">
            {course.audience.map((a) => (
              <span key={a} className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] text-zinc-600">
                {a}
              </span>
            ))}
          </div>
        </div>
      </div>
    </CenterModal>
  );
}

function HotSpotItem({ item, isLast }: { item: (typeof AI_HOT_SPOTS)[number]; isLast: boolean }) {
  return (
    <div className="relative flex gap-4 pb-6">
      {!isLast && (
        <div className="absolute left-[7px] top-5 bottom-0 w-px bg-zinc-200" />
      )}
      <div className="relative z-10 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-zinc-200">
        <div className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-zinc-400">
          <span>{item.publishedAt}</span>
          <span className="inline-flex items-center gap-1 text-orange-500">
            <i className="fa-solid fa-fire" />
            {formatHeat(item.heat)}
          </span>
        </div>
        <h4 className="mt-1 text-[13px] font-semibold leading-snug text-zinc-800">
          {item.title}
        </h4>
        {item.imageUrl ? (
          <div className="mt-2 overflow-hidden rounded-xl border border-zinc-100">
            <img
              src={item.imageUrl}
              alt={item.title}
              className="h-32 w-full object-cover"
              loading="lazy"
            />
          </div>
        ) : null}
        <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">{item.summary}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[10px] text-zinc-400">{item.sources.length} 个信源</span>
          {item.sources.slice(0, 4).map((s) => (
            <span
              key={s.name}
              className="rounded-full border border-zinc-100 bg-zinc-50 px-2 py-0.5 text-[10px] text-zinc-500"
            >
              {s.name}
            </span>
          ))}
        </div>
        <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2">
          <p className="text-[10px] font-semibold text-amber-800">推荐理由</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-amber-700/80">
            {item.recommendation}
          </p>
        </div>
      </div>
    </div>
  );
}

export function AiAcademyPage() {
  const setAppView = useAppViewStore((s) => s.setAppView);
  const [detail, setDetail] = useState<Course | null>(null);
  const [instructor, setInstructor] = useState<CourseInstructor | null>(null);

  const featured = COURSES[0];
  const secondary = COURSES.slice(1, 4);

  const groupedHotSpots = useMemo(() => {
    const groups: { dateLabel: string; items: typeof AI_HOT_SPOTS }[] = [];
    AI_HOT_SPOTS.forEach((item) => {
      const last = groups[groups.length - 1];
      if (last && last.dateLabel === item.dateLabel) {
        last.items.push(item);
      } else {
        groups.push({ dateLabel: item.dateLabel, items: [item] });
      }
    });
    return groups;
  }, []);

  return (
    <div className="center-surface center-page scroll-hidden flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-5 md:px-6">
        <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
              MSS CLAW
            </p>
            <h2 className="text-[22px] font-semibold tracking-tight text-zinc-900 md:text-[26px]">
              AI学院
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-zinc-500">
              系统学 AI，把能力装进工作流
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAppView('ai-campus-all')}
            className="self-start text-[12px] font-medium text-zinc-600 transition hover:text-zinc-900 md:self-auto"
          >
            全部课程 →
          </button>
        </div>

        {/* 主推区：左侧大卡 + 右侧三张次卡，底部对齐 */}
        <section className="mb-8">
          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <CourseCard course={featured} size="lg" onClick={() => setDetail(featured)} />
            </div>
            <div className="flex flex-col justify-between lg:col-span-2">
              {secondary.map((c) => (
                <CourseCard key={c.id} course={c} size="sm" onClick={() => setDetail(c)} />
              ))}
            </div>
          </div>
        </section>

        {/* AI 热点：左侧日期/时间轴，右侧条目 */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[18px] font-semibold text-zinc-900">AI热点</h3>
            <span className="text-[11px] text-zinc-400">精选行业动态与落地案例</span>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {groupedHotSpots.map((group) => (
              <div key={group.dateLabel} className="flex gap-4">
                <div className="sticky top-0 h-fit pt-0.5">
                  <span className="whitespace-nowrap text-[13px] font-semibold text-zinc-800">
                    {group.dateLabel}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  {group.items.map((item, idx) => (
                    <HotSpotItem
                      key={item.id}
                      item={item}
                      isLast={idx === group.items.length - 1}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
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
