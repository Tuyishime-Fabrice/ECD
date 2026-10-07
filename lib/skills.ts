import type { ChallengeResult } from "./progress";

export type SkillStatus = "mastered" | "practicing" | "not_started";

/**
 * From the latest attempt of each challenge: a skill is "mastered" when every
 * question for it was right on the first try, "practicing" once attempted,
 * otherwise "not started".
 */
export function skillStatuses(
  skillIds: string[],
  challenges: Record<string, ChallengeResult>,
): Record<string, SkillStatus> {
  const answers = new Map<string, boolean[]>();
  for (const result of Object.values(challenges)) {
    for (const q of result.latest.questions) {
      answers.set(q.skill, [...(answers.get(q.skill) ?? []), q.firstTryCorrect]);
    }
  }
  return Object.fromEntries(
    skillIds.map((id) => {
      const list = answers.get(id);
      const status: SkillStatus = !list?.length ? "not_started" : list.every(Boolean) ? "mastered" : "practicing";
      return [id, status];
    }),
  );
}
