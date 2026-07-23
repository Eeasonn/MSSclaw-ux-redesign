import type { PlatformRole } from '@/domain/rbac';

/** 侧栏三壳：角色决定默认壳，用户可手动切换（手动选择持久化） */
export type ShellPerspective = 'business' | 'ops' | 'it';

export const SHELL_PERSPECTIVES: readonly ShellPerspective[] = ['business', 'ops', 'it'];

export const SHELL_PERSPECTIVE_LABELS: Record<ShellPerspective, string> = {
  business: '业务工作台',
  ops: '平台运营台',
  it: '技术管理台',
};

/** 切换器短标签 */
export const SHELL_PERSPECTIVE_SHORT_LABELS: Record<ShellPerspective, string> = {
  business: '业务',
  ops: '运营',
  it: 'IT',
};

/** 业务侧栏偶发资源（不常驻一级，走顶栏/情境入口） */
export const BUSINESS_RESOURCE_VIEWS = ['ai-map'] as const;

/** 业务/只读 → 业务菜单；超管/能力运营 → 运营菜单；IT 壳仅手动切换进入 */
export function defaultShellPerspective(role: PlatformRole | undefined): ShellPerspective {
  if (!role) return 'business';
  if (role === 'business_user' || role === 'viewer') return 'business';
  return 'ops';
}

export function loadShellPerspective(role: PlatformRole | undefined): ShellPerspective {
  return defaultShellPerspective(role);
}

/**
 * 各壳在「分组式侧栏」中可见的视图（业务壳走定制平铺菜单，不在此列）。
 * 在 navPresentation / navRbac 过滤之上再做一层壳过滤。
 */
export const PERSPECTIVE_SECTIONED_VIEWS: Record<
  Exclude<ShellPerspective, 'business'>,
  readonly string[]
> = {
  ops: [
    'home',
    'ai-campus',
    'select-scenario',
    'skills-experts',
    'vibe-space',
    'task',
    'new-task',
    'messages',
    'ai-map',
    'agents',
    'skills',
    'tools',
    'memory',
    'kb',
    'prompts',
    'automation',
    'workflow',
    'portal-ops',
    'admin',
    'presentation',
    'workspace-config',
  ],
  it: [
    'home',
    'ai-campus',
    'select-scenario',
    'skills-experts',
    'vibe-space',
    'task',
    'new-task',
    'messages',
    'ai-map',
    'skills',
    'tools',
    'workflow',
    'admin',
    'workspace-config',
  ],
};

export function isViewInSectionedPerspective(
  view: string,
  perspective: ShellPerspective,
): boolean {
  if (perspective === 'business') return true;
  return PERSPECTIVE_SECTIONED_VIEWS[perspective].includes(view);
}

/** 运营台专属视图：业务角色深链时用于跳回首页（技能/专家中心已对业务开放只读浏览） */
export function isOpsOnlyView(view: string): boolean {
  return (
    view === 'tools' ||
    view === 'memory' ||
    view === 'kb' ||
    view === 'prompts' ||
    view === 'automation' ||
    view === 'workflow' ||
    view === 'portal-ops' ||
    view === 'admin' ||
    view === 'presentation' ||
    view === 'workspace-config' ||
    view === 'agent-studio'
  );
}
