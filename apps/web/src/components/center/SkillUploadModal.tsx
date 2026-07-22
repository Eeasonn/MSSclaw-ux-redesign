import { useEffect, useState } from 'react';
import { CenterModal } from '@/components/center/CenterShell';
import {
  EFFICIENCY_OPTIONS,
  FormField,
  FormInput,
  FormSelect,
  FormTextarea,
  ModalActions,
} from '@/components/center/CenterFormFields';
import type { EfficiencyCategory } from '@/domain/prototype/types';
import { useMarketplaceStore } from '@/stores/marketplaceStore';

interface SkillUploadModalProps {
  open: boolean;
  onClose: () => void;
}

const EMPTY_FORM = { name: '', desc: '', category: 'office' as EfficiencyCategory, instructions: '' };

/** 业务用户上传技能：提交后进入运营审核（pending） */
export function SkillUploadModal({ open, onClose }: SkillUploadModalProps) {
  const { uploadSkill, showToast } = useMarketplaceStore();
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (open) setForm(EMPTY_FORM);
  }, [open]);

  const handleSubmit = () => {
    const name = form.name.trim();
    const desc = form.desc.trim();
    const instructions = form.instructions.trim();
    if (!name) return showToast('请填写技能名称');
    if (!desc) return showToast('请填写一句话描述');
    if (!instructions) return showToast('请填写技能内容 / Prompt');
    uploadSkill({ name, desc, category: form.category, instructions });
    onClose();
  };

  return (
    <CenterModal
      open={open}
      elevate
      size="lg"
      title="上传技能"
      onClose={onClose}
      actions={<ModalActions onCancel={onClose} onSave={handleSubmit} saveLabel="提交审核" />}
    >
      <div className="space-y-3 text-left">
        <p className="rounded-xl bg-amber-50/70 px-3 py-2 text-[11px] text-amber-700">
          提交后技能进入「待审核」，由平台运营审核通过后正式对全团队上线。
        </p>
        <FormField label="技能名称 *">
          <FormInput
            placeholder="例如：门店日报速览"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </FormField>
        <FormField label="一句话描述 *">
          <FormInput
            placeholder="这个技能帮业务解决什么问题？"
            value={form.desc}
            onChange={(e) => setForm({ ...form, desc: e.target.value })}
          />
        </FormField>
        <FormField label="分类 *">
          <FormSelect
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value as EfficiencyCategory })}
          >
            {EFFICIENCY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </FormSelect>
        </FormField>
        <FormField label="技能内容 / Prompt *" hint="对话执行时注入的正文；写清能力范围、输入与输出要求">
          <FormTextarea
            rows={8}
            className="font-mono text-[12px] leading-relaxed"
            placeholder={'你是某某技能。\n\n## 能力范围\n...\n\n## 必须输出\n...'}
            value={form.instructions}
            onChange={(e) => setForm({ ...form, instructions: e.target.value })}
          />
        </FormField>
      </div>
    </CenterModal>
  );
}
