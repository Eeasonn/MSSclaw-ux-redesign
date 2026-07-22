import type { PrototypeAgentSeed } from '@/domain/prototype/types';

/** 专家人格化展示数据：人名 + 角色头衔 + 一句话能力说明 */
export interface AgentPersona {
  /** 人名（如「林数」） */
  name: string;
  /** 角色头衔（如「资深数据分析师」） */
  role: string;
  /** 一句话能力说明 */
  tagline: string;
}

/** 按 Agent id 的人格化档案（展示层专用，不影响运行时名称） */
const AGENT_PERSONAS: Record<string, AgentPersona> = {
  'agent-data-analysis': {
    name: '林数',
    role: '资深数据分析师',
    tagline: '融合 ISRP/零售/电商多源数据，自动输出洞察报表',
  },
  'agent-doc-review': {
    name: '文岚',
    role: '文档合规审校专家',
    tagline: '营销物料、合同与招投标文档的正确性与合规筛查',
  },
  'agent-file-organize': {
    name: '井然',
    role: '文件归档助理',
    tagline: '本地文件夹、员工助手、邮件多源文件清洗归档',
  },
  'agent-ppt': {
    name: '章页',
    role: '演示文稿设计师',
    tagline: '多源数据驱动 PPT 自动生成，快速出片',
  },
  'agent-meeting': {
    name: '纪瑶',
    role: '会议纪要专员',
    tagline: '会议纪要自动成稿，结论与待办一目了然',
  },
  'agent-launch-sentiment': {
    name: '闻青',
    role: '舆情分析师',
    tagline: '产品发布舆情快报，第一时间掌握口碑动向',
  },
  'agent-survey': {
    name: '温研',
    role: '用户研究专家',
    tagline: '问卷调研设计与开放题洞察分析',
  },
  'agent-review-collect': {
    name: '蔡集',
    role: '评论采集专家',
    tagline: 'Amazon 等平台商品评论自动采集与清洗',
  },
  'agent-review-translate': {
    name: '易言',
    role: '多语种翻译专家',
    tagline: '多语种评论统一翻译中英双语，保留原文对照',
  },
  'agent-review': {
    name: '甄言',
    role: '评论洞察分析师',
    tagline: '评论情感判断与用户声音挖掘，定位改进点',
  },
  'agent-retail-insight': {
    name: '董琳',
    role: '零售洞察分析师',
    tagline: '门店 DOS/转化/陈列例行洞察报告',
  },
  'agent-price-monitor': {
    name: '钱观',
    role: '价格监测专家',
    tagline: '18 国多渠道价格与 offer 异动监测入表',
  },
  'agent-hr-resume': {
    name: '甄才',
    role: '招聘筛选专家',
    tagline: 'JD 解析、简历筛选与面试分析一条龙',
  },
  'agent-training': {
    name: '柯培',
    role: '培训内容专家',
    tagline: '新品培训脚本与课件要点生成调优',
  },
  'agent-knowledge': {
    name: '温故',
    role: '知识管理专家',
    tagline: '企业知识问答，带引用的文献溯源与 SOP 检索',
  },
  'agent-retail-coach': {
    name: '成琳',
    role: '门店陪练教练',
    tagline: '门店卖点演练、考核反馈与话术纠偏',
  },
};

/** 取专家人格化展示数据；未建档时从技术名兜底（去掉 Agent 后缀） */
export function getAgentPersona(agent: Pick<PrototypeAgentSeed, 'id' | 'name' | 'desc'>): AgentPersona {
  const hit = AGENT_PERSONAS[agent.id];
  if (hit) return hit;
  return {
    name: agent.name.replace(/\s*Agent\s*/i, '').trim() || agent.name,
    role: '业务专家',
    tagline: agent.desc.replace(/^【[^】]*】/, ''),
  };
}
