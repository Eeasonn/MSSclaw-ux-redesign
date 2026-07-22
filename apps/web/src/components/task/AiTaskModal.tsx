import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { cn } from '@/lib/utils';

interface AiTaskModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
}

/**
 * 侧栏「开启一个任务」AI 输入弹窗。
 * 去掉推荐技能等噪音，保持大面积留白与大输入区。
 */
export function AiTaskModal({ open, onClose, onSubmit }: AiTaskModalProps) {
  const [text, setText] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useFocusTrap(open, dialogRef);

  useEffect(() => {
    if (open) {
      setText('');
      const t = window.setTimeout(() => textareaRef.current?.focus(), 50);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  if (!open) return null;

  const trimmed = text.trim();

  const handleSubmit = () => {
    if (!trimmed) return;
    onSubmit(trimmed);
    setText('');
    onClose();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 280)}px`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm">
      <button type="button" aria-label="关闭" className="absolute inset-0" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-task-title"
        className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-white shadow-apple-lg"
      >
        {/* 深色头部 */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 px-8 py-10 text-center text-white">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="absolute -bottom-12 -right-12 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" />
            <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-400/10 blur-2xl" />
          </div>
          <div className="relative">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 shadow-inner backdrop-blur-sm">
              <i className="fa-solid fa-sparkles text-xl text-cyan-200" />
            </div>
            <h3 id="ai-task-title" className="text-xl font-bold tracking-tight">
              开启一个任务
            </h3>
            <p className="mx-auto mt-2 max-w-md text-[13px] font-medium text-slate-300">
              描述你想完成的事，AI 会自动匹配专家与技能。
            </p>
          </div>
        </div>

        {/* 大输入区 */}
        <div className="flex-1 bg-white px-6 pb-6 pt-5">
          <div
            className={cn(
              'relative overflow-hidden rounded-2xl border bg-zinc-50/80 transition focus-within:border-cyan-400/60 focus-within:ring-4 focus-within:ring-cyan-500/10',
              trimmed ? 'border-zinc-300' : 'border-zinc-200',
            )}
          >
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                autoGrow(e.target);
              }}
              onKeyDown={handleKeyDown}
              placeholder="例如：分析本周各代表处 SO 排名，剔除 IoT 后生成周报…"
              rows={4}
              className="w-full resize-none bg-transparent px-5 py-4 text-[15px] leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
            />
            <div className="flex items-center justify-between border-t border-zinc-200/80 px-4 py-2.5">
              <span className="text-[11px] text-zinc-400">Enter 发送 · Shift + Enter 换行</span>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!trimmed}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold text-white transition',
                  trimmed
                    ? 'bg-slate-900 shadow-md hover:bg-slate-800 hover:shadow-lg'
                    : 'cursor-not-allowed bg-zinc-300',
                )}
              >
                <span>发送</span>
                <i className="fa-solid fa-arrow-up text-[11px]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
