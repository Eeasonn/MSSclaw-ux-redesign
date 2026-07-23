export const APP_VIEWS = [
  'home',
  'ai-campus',
  'ai-campus-all',
  'select-scenario',
  'skills-experts',
  'vibe-space',
  'ai-map',
  'world-view',
  'self-view',
  'task',
  'new-task',
  'messages',
  'agents',
  'agent-studio',
  'skills',
  'kb',
  'cases',
  'automation',
  'workflow',
  'tools',
  'memory',
  'prompts',
  'admin',
  'presentation',
  'workspace-config',
  'portal-ops',
] as const;
export type AppView = (typeof APP_VIEWS)[number];

/** Views that mount expert platform pages (iteration 9) */
export const PLATFORM_VIEWS = ['agent-studio', 'workflow', 'tools', 'memory', 'prompts', 'admin'] as const;
export type PlatformView = (typeof PLATFORM_VIEWS)[number];

export function isPlatformView(view: AppView): view is PlatformView {
  return (PLATFORM_VIEWS as readonly string[]).includes(view);
}

export const NAV_SECTIONS = ['workspace', 'platform', 'ops', 'system'] as const;
export type NavSection = (typeof NAV_SECTIONS)[number];

export interface AppViewNavItem {
  id: AppView;
  label: string;
  subtitle: string;
  icon: string;
  section: NavSection;
}

export const APP_VIEW_NAV: AppViewNavItem[] = [
  { id: 'home', label: '逛广场', subtitle: '发现场景、工具与灵感', icon: 'fa-store', section: 'workspace' },
  { id: 'ai-campus', label: 'AI学院', subtitle: '系统学 AI，把能力装进工作流', icon: 'fa-graduation-cap', section: 'workspace' },
  { id: 'select-scenario', label: '选场景', subtitle: '按业务环节挑选可复制场景', icon: 'fa-map', section: 'workspace' },
  { id: 'skills-experts', label: '找技能·专家', subtitle: '能力资产 · 人格化专家 · 专家团', icon: 'fa-toolbox', section: 'workspace' },
  { id: 'vibe-space', label: 'Vibe空间', subtitle: '看看大家用 AI 做出了什么', icon: 'fa-bolt', section: 'workspace' },
  { id: 'ai-map', label: '学案例', subtitle: '样板间 · 可复制业务场景包', icon: 'fa-map', section: 'platform' },
];

export const NAV_SECTION_LABELS: Record<NavSection, string> = {
  workspace: '工作平台',
  platform: '能力沉淀',
  ops: '运营编排',
  system: '系统设置',
};

/** AppView 占位页（尚未实现的视图） */
export const APP_VIEW_PLACEHOLDERS: Partial<
  Record<AppView, { title: string; description: string; icon: string; phase: string }>
> = {};

export function isAppViewPlaceholder(view: AppView): boolean {
  return view in APP_VIEW_PLACEHOLDERS;
}
