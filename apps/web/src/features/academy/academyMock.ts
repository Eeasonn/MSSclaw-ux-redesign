export interface CourseInstructor {
  id: string;
  name: string;
  title: string;
  avatar?: string;
  bio: string;
}

export interface Course {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  coverColor: string;
  instructor: CourseInstructor;
  duration: string;
  heat: number;
  outline: string[];
  audience: string[];
  tags: string[];
}

export interface AiHotSpot {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  heat: number;
}

export const INSTRUCTORS: CourseInstructor[] = [
  {
    id: 'wang-yong',
    name: '王勇',
    title: '高级产品经理',
    bio: '10 年 B 端产品经验，专注 AI 在文档处理、知识管理领域的落地。曾主导多个长文档智能阅读项目，帮助业务团队把合同、研报、SOP 的阅读效率提升 3 倍以上。',
  },
  {
    id: 'li-wei',
    name: '李薇',
    title: 'AI 应用架构师',
    bio: '前大厂 AI 平台技术负责人，擅长提示词工程、Agent 编排与多模型路由。相信好的提示词是 AI 产品化最重要的「用户界面」。',
  },
  {
    id: 'zhang-min',
    name: '张敏',
    title: '数据分析专家',
    bio: '深耕零售与供应链数据分析 8 年，擅于把复杂业务指标拆解为可执行的 AI 分析任务，让业务同学也能用自然语言驱动数据洞察。',
  },
  {
    id: 'chen-hao',
    name: '陈浩',
    title: 'RAG 与知识库专家',
    bio: '企业知识库与 RAG 系统实战派，负责过多套内部文档问答系统的搭建与优化，关注检索精度、答案可溯源与权限隔离。',
  },
  {
    id: 'liu-xin',
    name: '刘欣',
    title: '办公效率顾问',
    bio: '微软/钉钉 AI 办公认证顾问，专注把 AI 嵌入日常办公场景：PPT、邮件、会议纪要、表格处理，让一线员工每天省出 1 小时。',
  },
  {
    id: 'zhao-yang',
    name: '赵阳',
    title: '供应链 AI 产品总监',
    bio: '15 年供应链数字化经验，主导需求预测、库存优化、履约协同等 AI 项目，擅长把供应链痛点转化为可量化的 AI 实战案例。',
  },
];

export const COURSES: Course[] = [
  {
    id: 'long-doc-reading',
    title: 'AI 辅助长文档阅读学习',
    subtitle: '让 AI 帮你读厚书、看长报告',
    description:
      '针对合同、研报、技术规范、培训手册等长文档，学习如何用 AI 快速提取核心观点、对比条款、生成摘要与问答。课程覆盖分块策略、提示词模板、溯源校验与知识沉淀方法。',
    icon: 'fa-book-open',
    coverColor: 'from-sky-500 to-indigo-600',
    instructor: INSTRUCTORS[0],
    duration: '2 小时 15 分',
    heat: 9820,
    outline: [
      '长文档阅读的常见痛点与 AI 解决思路',
      '分块、摘要与问答的三段式工作流',
      '提示词模板：观点提取、条款对比、风险扫描',
      '答案溯源与幻觉校验技巧',
      '把阅读成果沉淀为可复用的知识卡片',
    ],
    audience: ['产品经理', '法务/合规', '咨询顾问', '科研人员', '业务分析师'],
    tags: ['文档阅读', '知识沉淀', '提示词'],
  },
  {
    id: 'prompt-engineering',
    title: '提示词工程实战',
    subtitle: '写好提示词，让模型一次做对',
    description:
      '从 Zero-shot 到 Few-shot，从角色设定到思维链，系统学习如何为业务场景写出稳定、可复用的提示词。包含大量真实业务案例与模板库。',
    icon: 'fa-wand-magic-sparkles',
    coverColor: 'from-violet-500 to-fuchsia-600',
    instructor: INSTRUCTORS[1],
    duration: '1 小时 50 分',
    heat: 8750,
    outline: [
      '提示词设计原则：清晰、具体、可验证',
      '角色、上下文、输出格式三位一体',
      'Few-shot、CoT、ToT 高阶技巧',
      '提示词版本管理与 A/B 测试',
      '业务场景模板库（客服、运营、产品）',
    ],
    audience: ['运营', '产品', '业务骨干', 'AI 培训师'],
    tags: ['提示词', '基础必修'],
  },
  {
    id: 'data-analysis-agent',
    title: '数据分析 Agent 入门',
    subtitle: '用自然语言驱动数据洞察',
    description:
      '学习如何构建一个能听懂业务问题、自动写 SQL/Python、生成图表并给出结论的数据分析 Agent。适合有业务sense、想快速出数的产品与运营同学。',
    icon: 'fa-chart-line',
    coverColor: 'from-emerald-500 to-teal-600',
    instructor: INSTRUCTORS[2],
    duration: '2 小时 40 分',
    heat: 7430,
    outline: [
      '数据分析 Agent 的能力边界与选型',
      '业务问题 → 指标 → 查询的拆解方法',
      '让 Agent 安全访问数据：权限与沙箱',
      '自动可视化与结论生成',
      '案例：零售门店销售异动分析',
    ],
    audience: ['数据分析师', '运营', '产品经理', '区域负责人'],
    tags: ['数据分析', 'Agent'],
  },
  {
    id: 'multi-agent-collab',
    title: '多 Agent 协作编排',
    subtitle: '把复杂任务拆给一群专家',
    description:
      '当单一 Agent 无法完成复杂任务时，如何让多个专家 Agent 分工、接力、互相校验？课程以订单审核、内容生产等场景为例，讲解多 Agent 编排模式。',
    icon: 'fa-users-gear',
    coverColor: 'from-amber-500 to-orange-600',
    instructor: INSTRUCTORS[1],
    duration: '2 小时 55 分',
    heat: 6890,
    outline: [
      '为什么需要多 Agent 协作',
      '角色定义、任务拆分与状态机',
      '串行接力、并行投票、评审反思模式',
      '工具调用与记忆共享',
      '案例：订单风险审核专家团',
    ],
    audience: ['架构师', '产品经理', '技术负责人', '流程专家'],
    tags: ['Agent', '流程编排'],
  },
  {
    id: 'rag-knowledge-base',
    title: 'RAG 知识库搭建',
    subtitle: '企业文档问答系统实战',
    description:
      '从 0 到 1 搭建基于 RAG 的企业知识库：文档解析、分块策略、向量检索、重排序、答案生成与权限隔离。让你的内部文档「开口说话」。',
    icon: 'fa-database',
    coverColor: 'from-cyan-500 to-blue-600',
    instructor: INSTRUCTORS[3],
    duration: '3 小时 10 分',
    heat: 8150,
    outline: [
      'RAG 全景：检索、生成与评估',
      '文档解析与高质量分块',
      '向量库、索引与混合检索',
      '重排序与答案溯源',
      '权限、审计与持续运营',
    ],
    audience: ['知识管理', 'IT', '产品经理', '技术支持'],
    tags: ['RAG', '知识库'],
  },
  {
    id: 'ai-ppt',
    title: 'AI 辅助 PPT 制作',
    subtitle: '从大纲到成稿，效率翻倍',
    description:
      '学习用 AI 快速完成汇报 PPT：主题拆解、大纲生成、页面文案、配图建议与排版美化。适合经常需要做汇报、培训材料的职场人。',
    icon: 'fa-file-powerpoint',
    coverColor: 'from-rose-500 to-pink-600',
    instructor: INSTRUCTORS[4],
    duration: '1 小时 35 分',
    heat: 9280,
    outline: [
      'AI 做 PPT 的正确姿势：人定框架，AI 填血肉',
      '从一句话主题到完整大纲',
      '每页文案的生成与精炼',
      '数据页、故事页、总结页的结构化提示',
      '配图与排版建议',
    ],
    audience: ['所有职场人', '培训师', '销售', '管理者'],
    tags: ['办公提效', 'PPT'],
  },
  {
    id: 'ai-office-efficiency',
    title: 'AI 办公效率提升',
    subtitle: '每天省出 1 小时',
    description:
      '覆盖邮件、会议纪要、Excel、周报等高频办公场景，教你挑选合适的 AI 工具、设计最小可行工作流，并规避隐私与合规风险。',
    icon: 'fa-briefcase',
    coverColor: 'from-slate-500 to-zinc-600',
    instructor: INSTRUCTORS[4],
    duration: '2 小时 05 分',
    heat: 8560,
    outline: [
      '办公提效的 AI 工具地图',
      '邮件与会议纪要自动化',
      'Excel 公式、透视与数据清洗',
      '周报/日报的结构化生成',
      '安全与合规注意事项',
    ],
    audience: ['行政', '运营', '销售', '管理者'],
    tags: ['办公提效', '入门'],
  },
  {
    id: 'supply-chain-ai',
    title: '供应链 AI 实战',
    subtitle: '需求预测到履约协同',
    description:
      '面向供应链业务同学，讲解需求预测、库存优化、异常侦测、供应商协同等典型 AI 应用。每个模块都附带可落地的业务指标与实施 checklist。',
    icon: 'fa-truck-fast',
    coverColor: 'from-lime-600 to-green-700',
    instructor: INSTRUCTORS[5],
    duration: '3 小时 30 分',
    heat: 6120,
    outline: [
      '供应链 AI 的典型场景与价值衡量',
      '需求预测：从统计模型到机器学习',
      '库存优化与安全水位智能建议',
      '履约异常侦测与根因分析',
      '供应商协同与风险预警',
    ],
    audience: ['供应链计划', '采购', '物流', '运营'],
    tags: ['供应链', '行业案例'],
  },
];

export const AI_HOT_SPOTS: AiHotSpot[] = [
  {
    id: 'hs-1',
    title: 'OpenAI 发布新一代推理模型，数学与代码能力大幅提升',
    summary:
      '新模型在复杂推理任务上表现显著优于前代，支持更长的思维链输出。企业级应用可望在财务分析、代码审查、科研辅助等场景获得更稳定的结果。',
    source: 'AI 前线',
    publishedAt: '2026-07-22',
    heat: 12400,
  },
  {
    id: 'hs-2',
    title: '多 Agent 协作框架成企业落地新热点',
    summary:
      '从单 Agent 问答走向多 Agent 分工协作，成为 2026 年企业 AI 落地的明显趋势。报告分析了审批、客服、研发等 6 个高价值场景的实施路径。',
    source: '机器之心',
    publishedAt: '2026-07-21',
    heat: 9800,
  },
  {
    id: 'hs-3',
    title: 'RAG 进入 2.0：从「能问答」到「可审计」',
    summary:
      '新一代 RAG 系统强调答案溯源、权限隔离与审计日志，满足金融、医疗、法律等强合规行业的知识库需求。',
    source: 'InfoQ',
    publishedAt: '2026-07-20',
    heat: 8750,
  },
  {
    id: 'hs-4',
    title: '提示词工程岗位需求同比增长 210%',
    summary:
      '随着大模型应用爆发，能够把业务问题转化为高质量提示词的「AI 翻译」角色成为招聘市场新宠，薪资水平持续走高。',
    source: '36 氪',
    publishedAt: '2026-07-19',
    heat: 8200,
  },
  {
    id: 'hs-5',
    title: 'AI 辅助长文档阅读工具在企业法务场景落地',
    summary:
      '多家头部企业引入 AI 合同审查与法规比对工具，平均审查时间从 4 小时缩短至 30 分钟，关键风险条款召回率超过 95%。',
    source: '虎嗅',
    publishedAt: '2026-07-18',
    heat: 7600,
  },
  {
    id: 'hs-6',
    title: '供应链需求预测 Agent 帮助零售企业降低库存 15%',
    summary:
      '某零售巨头通过 AI 需求预测与自动补货建议，在旺季实现缺货率下降与库存周转双提升，ROI 在 6 个月内回正。',
    source: '亿邦动力',
    publishedAt: '2026-07-17',
    heat: 6900,
  },
  {
    id: 'hs-7',
    title: 'AI PPT 工具进入「结构化叙事」阶段',
    summary:
      '新一代工具不再只生成单页文案，而是能够理解汇报目标、受众与决策点，自动设计故事线与页面节奏。',
    source: '极客公园',
    publishedAt: '2026-07-16',
    heat: 6400,
  },
  {
    id: 'hs-8',
    title: '企业 AI 学院建设成为组织能力落地关键',
    summary:
      '越来越多企业把 AI 培训从「选修课」升级为「必修课」，并通过内部 AI 学院沉淀最佳实践、培养内部超级用户。',
    source: '哈佛商业评论中文版',
    publishedAt: '2026-07-15',
    heat: 5900,
  },
];
