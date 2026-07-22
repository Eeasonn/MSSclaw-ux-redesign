/** 首页场景卡的任务类型轴：业务语言分类，映射到 FEATURED_SCENARIOS 场景 id */

export interface SceneAxisCategory {
  id: string;
  label: string;
  icon: string;
  /** 该分类命中的场景 id（可重叠） */
  scenarioIds: readonly string[];
}

export const SCENE_AXIS_CATEGORIES: readonly SceneAxisCategory[] = [
  {
    id: 'market-insight',
    label: '市场洞察',
    icon: 'fa-chart-line',
    scenarioIds: ['price-offer-monitor', 'ecommerce-review'],
  },
  {
    id: 'content-create',
    label: '内容创作',
    icon: 'fa-pen-nib',
    scenarioIds: ['retail-training', 'l10n-translation'],
  },
  {
    id: 'data-analysis',
    label: '数据分析',
    icon: 'fa-magnifying-glass-chart',
    scenarioIds: ['price-offer-monitor', 'ecommerce-review', 'hr-interview'],
  },
  {
    id: 'process-auto',
    label: '流程自动化',
    icon: 'fa-diagram-project',
    scenarioIds: ['hr-interview', 'fulfillment-settlement'],
  },
  {
    id: 'training',
    label: '培训赋能',
    icon: 'fa-graduation-cap',
    scenarioIds: ['retail-training'],
  },
  {
    id: 'knowledge',
    label: '知识管理',
    icon: 'fa-book-open',
    scenarioIds: ['knowledge-deposit'],
  },
] as const;

export type SceneAxisId = (typeof SCENE_AXIS_CATEGORIES)[number]['id'];

/** 场景是否命中任务类型筛选（all 表示不过滤） */
export function scenarioInSceneAxis(scenarioId: string, axis: SceneAxisId | 'all'): boolean {
  if (axis === 'all') return true;
  const cat = SCENE_AXIS_CATEGORIES.find((c) => c.id === axis);
  return cat ? cat.scenarioIds.includes(scenarioId) : true;
}
