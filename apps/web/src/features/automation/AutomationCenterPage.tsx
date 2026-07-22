import { useState } from 'react';
import { CenterPageHeader } from '@/components/center/CenterShell';
import { AutomationEditorModal, type AutomationEditorTarget } from '@/components/center/AutomationEditorModal';
import { AgentAvatar } from '@/components/brand/AgentAvatar';
import { getAgentPersona } from '@/domain/prototype/agentPersonas';
import { useMarketplaceStore } from '@/stores/marketplaceStore';

interface AutomationCenterPageProps {
  onRun: (automationId: string, agentId: string, name: string) => void;
}

export function AutomationCenterPage({ onRun }: AutomationCenterPageProps) {
  const { agents, automations, toggleAutomation, markAutomationRun, showToast } = useMarketplaceStore();
  const [editorTarget, setEditorTarget] = useState<AutomationEditorTarget>(null);

  return (
    <div className="center-surface center-page scroll-hidden flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl">
        <CenterPageHeader
          title="自动化模板"
          subtitle="场景化定时任务 · 周报生成 · 告警触发 · 到点自动跑"
          tip={
            <>
              每个模板绑定一位专家与触发规则。启用后点击「立即运行」会跳转到任务中心执行，适合定时周报与告警场景。
            </>
          }
          actions={
            <button
              type="button"
              onClick={() => setEditorTarget('new')}
              className="apple-btn-primary rounded-xl px-4 py-2 text-[12px] font-semibold text-white transition"
            >
              <i className="fa-solid fa-plus mr-1" />
              新建模板
            </button>
          }
        />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {automations.map((a) => {
            const agent = agents.find((ag) => ag.id === a.agentId);
            const persona = agent ? getAgentPersona(agent) : null;
            return (
              <div key={a.id} className="apple-card flex flex-col p-4">
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <h3 className="text-[13px] font-semibold text-zinc-900">{a.name}</h3>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      a.enabled ? 'bg-claw-50 text-zinc-700' : 'bg-black/[0.04] text-[#86868b]'
                    }`}
                  >
                    {a.enabled ? '运行中' : '已暂停'}
                  </span>
                </div>
                <p className="flex-1 text-[12px] leading-relaxed text-[#86868b]">{a.desc}</p>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-[#86868b]">
                  {agent ? <AgentAvatar agentId={agent.id} size={20} title={agent.name} /> : null}
                  <span className="truncate">
                    {persona ? `${persona.name} · ${persona.role}` : a.agentId}
                  </span>
                </div>
                <p className="mt-1.5 text-[10px] text-zinc-400">
                  <i className="fa-solid fa-clock mr-1" />
                  {a.schedule} · 上次 {a.lastRun}
                </p>
                <div className="mt-3 flex gap-2 border-t border-black/[0.04] pt-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      markAutomationRun(a.id);
                      onRun(a.id, a.agentId, a.name);
                      showToast(`自动化「${a.name}」已触发`);
                    }}
                    className="apple-btn-primary flex-1 rounded-lg py-1.5 text-[11px] font-semibold text-white"
                  >
                    立即运行
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAutomation(a.id)}
                    className="rounded-lg border border-black/8 px-3 py-1.5 text-[11px] font-medium transition hover:bg-black/[0.03]"
                  >
                    {a.enabled ? '暂停' : '启用'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTarget(a.id)}
                    className="rounded-lg px-2 py-1.5 text-[11px] text-zinc-400 transition hover:bg-black/[0.03] hover:text-zinc-700"
                    title="编辑模板"
                  >
                    <i className="fa-solid fa-pen" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AutomationEditorModal target={editorTarget} onClose={() => setEditorTarget(null)} />
    </div>
  );
}
