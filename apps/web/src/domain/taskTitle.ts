/** 侧栏可读的任务标题长度（汉字/字符） */
export const TASK_TITLE_MAX_LEN = 18;

const FILLER_PREFIX =
  /^(请你?|麻烦你?|帮我|帮忙|烦请|劳烦|可否|能否|想要|希望|需要)?(帮我|帮忙|为我|给我)?(一下|下)?/;

const ACTION_TRIM =
  /^(请|帮我|帮忙|麻烦)?(生成|撰写|起草|输出|分析|整理|汇总|总结|编写|完成|执行|创建|制作|给出|提供)/;

/**
 * 从一段普通描述中提炼核心意图（不含 @ / 调用前缀）。
 */
function extractCoreIntent(text: string, maxLen = TASK_TITLE_MAX_LEN): string {
  let t = text.trim();
  if (!t) return '';

  // 取首句 / 首分句
  t = t.split(/[。！？!?\n；;]/)[0]?.trim() ?? t;
  const comma = t.search(/[，,]/);
  if (comma > 6 && comma < maxLen + 4) {
    t = t.slice(0, comma).trim();
  }

  t = t.replace(FILLER_PREFIX, '').trim();
  // 保留动作语义：若去掉「生成/分析」后过短则保留动作词
  const withoutAction = t.replace(ACTION_TRIM, '').trim();
  if (withoutAction.length >= 4) t = withoutAction;

  t = t.replace(/^[:：\-\s]+/, '').replace(/[“”"']/g, '').trim();
  return t;
}

/**
 * 从用户输入/首条消息提炼短任务名（规则优先，即时可用）。
 */
export function deriveTaskTitle(
  raw: string,
  opts?: { agentName?: string; skillName?: string; maxLen?: number },
): string {
  const maxLen = opts?.maxLen ?? TASK_TITLE_MAX_LEN;
  let text = (raw ?? '').trim();
  if (!text) return fallbackTitle(opts?.agentName, opts?.skillName);

  // 附件引用行不进标题
  text = text
    .split('\n')
    .filter((line) => !/^\s*📎/.test(line) && !/附件[：:]/.test(line))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 专家团：保留完整标题
  const teamMatch = text.match(/^@专家团[：:]\s*(.+)$/);
  if (teamMatch) {
    const name = teamMatch[1]!.trim();
    return clampTitle(name ? `专家团：${name}` : '专家团任务', maxLen);
  }

  // @专家调用：若文本主要是 @Agent，用 Agent 实名作为标题，并追加后续意图
  if (opts?.agentName?.trim()) {
    const agentName = opts.agentName.trim();
    const shortName = agentName.replace(/\s*Agent\s*/i, '').trim();
    const escapedName = agentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedShort = shortName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const mentionRegex = new RegExp(`^@(?:${escapedName}|${escapedShort})\\b\\s*`);
    if (mentionRegex.test(text)) {
      const rest = text.replace(mentionRegex, '').trim();
      const intent = extractCoreIntent(rest, maxLen);
      if (!intent || intent.length < 2 || intent.replace(/\s*Agent\s*/gi, '').length < 2) {
        return clampTitle(agentName, maxLen);
      }
      return clampTitle(`${agentName}：${intent}`, maxLen);
    }
  }

  // 去掉开头 @专家（未识别到已绑定 Agent 时的兜底清理）
  text = text.replace(/^(?:@\S+\s*)+/, '').trim();

  // /技能指令：优先用技能名
  const skillMatch = text.match(/^\/([^\s]+)(?:\s+([\s\S]*))?$/);
  if (skillMatch) {
    if (opts?.skillName?.trim()) return clampTitle(opts.skillName.trim(), maxLen);
    const rest = (skillMatch[2] ?? '').trim();
    if (rest) text = rest;
    else return clampTitle(skillMatch[1]!.replace(/^\/+/, ''), maxLen);
  }

  text = extractCoreIntent(text, maxLen);

  if (!text || text.length < 2) return fallbackTitle(opts?.agentName, opts?.skillName);
  return clampTitle(text, maxLen);
}

export function clampTitle(title: string, maxLen = TASK_TITLE_MAX_LEN): string {
  const t = title.replace(/\s+/g, ' ').trim();
  if (t.length <= maxLen) return t;
  // 尽量在词边界截断
  const slice = t.slice(0, maxLen);
  const breakAt = Math.max(slice.lastIndexOf(' '), slice.lastIndexOf('·'), slice.lastIndexOf('-'));
  if (breakAt >= Math.floor(maxLen * 0.55)) {
    return `${slice.slice(0, breakAt).trimEnd()}…`;
  }
  return `${slice.trimEnd()}…`;
}

function fallbackTitle(agentName?: string, skillName?: string): string {
  if (skillName?.trim()) return clampTitle(skillName.trim());
  if (agentName?.trim()) {
    const short = agentName.replace(/\s*Agent\s*/gi, '').trim();
    return short ? `${short}任务` : '新任务';
  }
  return '新任务';
}

/** 校验 AI 回写标题是否可用 */
export function isUsableAiTaskTitle(title: string, maxLen = TASK_TITLE_MAX_LEN): boolean {
  const t = title.replace(/[\r\n]+/g, ' ').trim();
  if (t.length < 2 || t.length > maxLen + 4) return false;
  if (/^(标题|任务名|如下|以下)/.test(t)) return false;
  if (/[。！？!?]/.test(t)) return false;
  return true;
}
