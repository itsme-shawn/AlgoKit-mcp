/**
 * 힌트 가이드 프롬프트 시스템
 *
 * Keyless 아키텍처에서 Claude Code가 문제별 맞춤 힌트를 생성할 수 있도록
 * 가이드 프롬프트를 제공합니다.
 *
 * 기존의 정적 HINT_PATTERNS (알고리즘별 고정 텍스트)를 대체하여,
 * Claude Code의 추론 능력을 활용한 문제 맞춤형 힌트를 생성합니다.
 *
 * ## 템플릿 변수
 * - {problemId}: 백준 문제 번호
 * - {problemTitle}: 문제 제목 (한글)
 * - {tier}: 티어 이름 (예: "Silver III")
 * - {tags}: 한글 태그 목록 (쉼표 구분)
 * - {tagKeys}: 태그 키 목록 (쉼표 구분)
 * - {percentile}: 백분위 설명
 * - {acceptedUsers}: 정답자 수
 * - {averageTries}: 평균 시도 횟수
 *
 * @module prompts/hint-guide
 */

import type { TagInfo, DifficultyContext, HintGuide, HintLevelGuide, ReviewPrompts } from '../types/analysis.js';
import type { Problem } from '../api/types.js';

/**
 * 3단계 힌트 레벨 프롬프트 템플릿
 *
 * 각 레벨은 Claude Code가 참고할 가이드를 제공합니다.
 * 템플릿 변수는 실제 문제 메타데이터로 치환됩니다.
 */
export const HINT_LEVEL_PROMPTS = {
  /**
   * Level 1: 패턴 인식
   * 알고리즘 이름을 직접 언급하지 않고 구조적 특징만 암시
   */
  level1: `사용자가 백준 {problemId}번 "{problemTitle}" 문제의 레벨 1 힌트를 요청했습니다.

[문제 정보]
- 난이도: {tier} ({percentile})
- 정답자: {acceptedUsers}명 | 평균 시도: {averageTries}회

[가이드라인]
1. 이 문제가 어떤 유형인지 간접적으로 암시하세요.
2. 구체적인 알고리즘 이름({tags})을 직접 언급하지 마세요.
3. 문제의 구조적 특징을 설명하세요.
4. 2-3문장으로 간결하게 작성하세요.

[금지 사항]
- 알고리즘 이름 직접 언급
- 구현 방법, 점화식, 수식, 의사코드
- 시간/공간 복잡도 언급`,

  /**
   * Level 2: 핵심 통찰
   * 알고리즘 유형을 명시하고, 핵심 아이디어를 설명
   */
  level2: `사용자가 백준 {problemId}번 "{problemTitle}" 문제의 레벨 2 힌트를 요청했습니다.

[문제 정보]
- 난이도: {tier} ({percentile})
- 알고리즘: {tags}
- 정답자: {acceptedUsers}명 | 평균 시도: {averageTries}회

[가이드라인]
1. 알고리즘 유형({tags})을 명시하세요.
2. 이 문제만의 핵심 통찰(key insight)을 설명하세요.
3. "무엇을 해야 하는지"는 알려주되 "어떻게 하는지"는 알려주지 마세요.
4. 3-5문장으로 작성하세요.

[금지 사항]
- 구체적 구현 방법 (코드, 의사코드)
- 정답에 직접 이르는 점화식이나 수식
- 단계별 풀이 절차`,

  /**
   * Level 3: 풀이 전략
   * 구체적인 단계별 접근법과 주의사항 제시
   */
  level3: `사용자가 백준 {problemId}번 "{problemTitle}" 문제의 레벨 3 힌트를 요청했습니다.

[문제 정보]
- 난이도: {tier} ({percentile})
- 알고리즘: {tags}
- 평균 시도: {averageTries}회

[가이드라인]
1. 이 문제를 풀기 위한 단계별 전략을 5-7단계로 작성하세요.
2. 핵심 자료구조 또는 상태 정의를 포함하세요.
3. 주의할 엣지 케이스나 흔한 실수를 1-2가지 언급하세요.
4. {tier} 수준에 맞게 설명 깊이를 조절하세요.
5. 의사코드 수준의 설명은 가능하지만, 완전한 코드는 제공하지 마세요.`,
} as const;

/**
 * 복습 가이드 프롬프트
 *
 * Claude Code가 학생과 대화형으로 복습 문서를 작성할 때 사용합니다.
 */
export const REVIEW_GUIDE_PROMPT = `백준 {problemId}번 "{problemTitle}" ({tier}) 문제의 복습을 진행합니다.
알고리즘: {tags}

아래 순서대로 학생에게 질문하며 복습을 도와주세요:

1. 풀이 접근법: "어떤 알고리즘으로 접근했나요? 왜 그 방법을 선택했나요?"
2. 핵심 통찰: "이 문제의 핵심 아이디어는 무엇이었나요?"
3. 복잡도 분석: "시간/공간 복잡도를 분석해주세요."
4. 어려웠던 점: "어디서 막혔거나 실수했나요?"
5. 배운 점: "이 문제를 통해 배운 개념이나 패턴은?"` as const;

/**
 * 템플릿 문자열의 {변수}를 실제 값으로 치환합니다.
 *
 * @param template - 템플릿 변수가 포함된 문자열
 * @param variables - 치환할 변수 맵
 * @returns 변수가 치환된 문자열
 *
 * @example
 * interpolateTemplate("문제 {problemId}번", { problemId: "1463" })
 * // => "문제 1463번"
 */
export function interpolateTemplate(
  template: string,
  variables: Record<string, string | number>,
): string {
  return template.replace(
    /\{(\w+)\}/g,
    (match, key: string) => {
      const value = variables[key];
      return value !== undefined ? String(value) : match;
    },
  );
}

/**
 * 문제 메타데이터에서 템플릿 변수 맵을 생성합니다.
 */
export function buildTemplateVariables(
  problem: Problem,
  difficulty: DifficultyContext,
  tags: TagInfo[],
): Record<string, string | number> {
  return {
    problemId: problem.problemId,
    problemTitle: problem.titleKo,
    tier: difficulty.tier,
    percentile: difficulty.percentile,
    tags: tags.map(t => t.name_ko).join(', ') || '알고리즘',
    tagKeys: tags.map(t => t.key).join(', '),
    acceptedUsers: problem.acceptedUserCount.toLocaleString(),
    averageTries: problem.averageTries.toFixed(1),
  };
}

/**
 * 문제 데이터로부터 완성된 HintGuide 객체를 생성합니다.
 */
export function buildHintGuide(
  problem: Problem,
  difficulty: DifficultyContext,
  tags: TagInfo[],
): HintGuide {
  const vars = buildTemplateVariables(problem, difficulty, tags);
  const tagNames = tags.map(t => t.name_ko).join(', ') || '알고리즘';
  const primaryTag = tags[0]?.name_ko || '알고리즘';

  const context = [
    `백준 ${problem.problemId}번 "${problem.titleKo}" (${difficulty.emoji} ${difficulty.tier})`,
    `알고리즘: ${tagNames}`,
    `정답자: ${problem.acceptedUserCount.toLocaleString()}명 | 평균 시도: ${problem.averageTries.toFixed(1)}회`,
    difficulty.context,
  ].join('\n');

  const hintLevels: HintLevelGuide[] = [
    {
      level: 1,
      label: '패턴 인식',
      prompt: interpolateTemplate(HINT_LEVEL_PROMPTS.level1, vars),
    },
    {
      level: 2,
      label: '핵심 통찰',
      prompt: interpolateTemplate(HINT_LEVEL_PROMPTS.level2, vars),
    },
    {
      level: 3,
      label: '풀이 전략',
      prompt: interpolateTemplate(HINT_LEVEL_PROMPTS.level3, vars),
    },
  ];

  const reviewPrompts: ReviewPrompts = {
    solution_approach: `이 문제를 어떤 방법으로 풀었나요? ${primaryTag} 접근법을 사용했다면 어떻게 적용했는지 설명해주세요.`,
    time_complexity: `이 풀이의 시간 복잡도는 어떻게 되나요? 왜 그렇게 되는지 분석해주세요.`,
    space_complexity: `추가로 사용한 자료구조나 메모리가 있나요? 공간 복잡도를 분석해보세요.`,
    key_insights: `이 문제에서 가장 중요한 관찰이나 아이디어는 무엇이었나요? ${primaryTag}의 어떤 특성을 활용했나요?`,
    difficulties: `문제를 풀면서 막혔던 부분이 있었나요? 알고리즘 선택, 구현, 디버깅 등 어떤 점이 어려웠는지 돌아봐주세요.`,
  };

  return { context, hint_levels: hintLevels, review_prompts: reviewPrompts };
}
