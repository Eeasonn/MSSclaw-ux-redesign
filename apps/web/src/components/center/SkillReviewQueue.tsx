import { useState } from 'react';
import { CenterModal } from '@/components/center/CenterShell';
import { FormField, FormTextarea, ModalActions } from '@/components/center/CenterFormFields';
import { SkillAvatar } from '@/components/brand/SkillAvatar';
import type { PrototypeSkillSeed } from '@/domain/prototype/types';
import { useMarketplaceStore } from '@/stores/marketplaceStore';

/** 运营视角：业务上传技能的待审核队列（通过 / 驳回） */
export function SkillReviewQueue() {
  const { skills, reviewSkill } = useMarketplaceStore();
  const [rejectTarget, setRejectTarget] = useState<PrototypeSkillSeed | null>(null);
  const [reason, setReason] = useState('');

  const pending = skills.filter((s) => (s.reviewStatus ?? 'approved') === 'pending');
  if (!pending.length) return null;

  return (
    <div className="apple-card mb-4 p-4">
      <div className="mb-3 flex items-center gap-2">
        <i className="fa-solid fa-clipboard-check text-[13px] text-amber-600" />
        <h2 className="text-[13px] font-semibold text-zinc-900">待审核</h2>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
          {pending.length}
        </span>
        <span className="text-[10px] text-zinc-400">业务用户上传的技能，审核通过后正式上线</span>
      </div>
      <div className="space-y-2">
        {pending.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-3 rounded-xl border border-black/[0.05] bg-black/[0.015] px-3 py-2.5"
          >
            <SkillAvatar skillId={s.id} icon={s.icon} size={32} title={s.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-zinc-900">{s.name}</p>
              <p className="truncate text-[11px] text-zinc-500">{s.desc}</p>
              <p className="mt-0.5 text-[10px] text-zinc-400">
                上传者：{s.publisher ?? s.author}
                {s.uploadedAt ? ` · ${s.uploadedAt}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => reviewSkill(s.id, true)}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-green-700"
            >
              通过
            </button>
            <button
              type="button"
              onClick={() => {
                setRejectTarget(s);
                setReason('');
              }}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-[11px] font-semibold text-red-600 transition hover:bg-red-50"
            >
              驳回
            </button>
          </div>
        ))}
      </div>

      <CenterModal
        open={!!rejectTarget}
        elevate
        title={`驳回技能「${rejectTarget?.name ?? ''}」`}
        onClose={() => setRejectTarget(null)}
        actions={
          <ModalActions
            onCancel={() => setRejectTarget(null)}
            onSave={() => {
              if (rejectTarget) reviewSkill(rejectTarget.id, false, reason);
              setRejectTarget(null);
            }}
            saveLabel="确认驳回"
          />
        }
      >
        <FormField label="驳回原因" hint="将展示给上传者；留空则使用默认原因">
          <FormTextarea
            rows={4}
            placeholder="例如：与现有技能能力重复 / 内容不符合上架规范…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </FormField>
      </CenterModal>
    </div>
  );
}
