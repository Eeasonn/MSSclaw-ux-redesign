import type { PrototypeSkillSeed, SkillReviewStatus } from '@/domain/prototype/types';

/** 存量技能无 reviewStatus 字段，一律视为已上线 */
export function getSkillReviewStatus(skill: PrototypeSkillSeed): SkillReviewStatus {
  return skill.reviewStatus ?? 'approved';
}

export const SKILL_REVIEW_LABELS: Record<SkillReviewStatus, string> = {
  approved: '已上线',
  pending: '待审核',
  rejected: '已驳回',
};

export const SKILL_REVIEW_BADGE_CLASSES: Record<SkillReviewStatus, string> = {
  approved: 'border border-green-200 bg-green-50 text-green-700',
  pending: 'border border-amber-200 bg-amber-50 text-amber-700',
  rejected: 'border border-red-200 bg-red-50 text-red-700',
};

/** 列表可见性：已上线对所有人可见；未过审仅上传者本人可见（运营审核队列除外） */
export function isSkillVisibleToUser(
  skill: PrototypeSkillSeed,
  userId: string,
  userName: string,
): boolean {
  if (getSkillReviewStatus(skill) === 'approved') return true;
  if (userId && skill.publisherUserId === userId) return true;
  return Boolean(userName) && skill.publisher === userName;
}
