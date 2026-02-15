/**
 * 프로그래머스 힌트 가이드 프롬프트 시스템
 *
 * BOJ hint-guide.ts의 프로그래머스 버전.
 * 프로그래머스 문제 메타데이터(레벨, 카테고리)에 맞춘 프롬프트 제공.
 *
 * ## 템플릿 변수
 * - {problemId}: 프로그래머스 문제 ID
 * - {problemTitle}: 문제 제목
 * - {level}: 레벨 라벨 (예: "Lv. 2")
 * - {description}: 난이도 설명 (예: "중급")
 * - {category}: 카테고리
 * - {tags}: 태그 목록 (쉼표 구분)
 */

import type { ProgrammersProblemDetail } from '../types/programmers.js';
import type { ProgrammersDifficultyContext } from '../types/analysis.js';
import type { HintGuide, HintLevelGuide, ReviewPrompts } from '../types/analysis.js';
import { interpolateTemplate } from './hint-guide.js';

/**
 * 3단계 힌트 레벨 프롬프트 템플릿 (프로그래머스)
 */
export const PROGRAMMERS_HINT_LEVEL_PROMPTS = {
  level1: `사용자가 프로그래머스 "{problemTitle}" (ID: {problemId}) 문제의 레벨 1 힌트를 요청했습니다.

[문제 정보]
- 난이도: {level} ({description})
- 카테고리: {category}

[가이드라인]
1. 이 문제가 어떤 유형인지 간접적으로 암시하세요.
2. 구체적인 알고리즘 이름({tags})을 직접 언급하지 마세요.
3. 문제의 구조적 특징을 설명하세요.
4. 2-3문장으로 간결하게 작성하세요.

[금지 사항]
- 알고리즘 이름 직접 언급
- 구현 방법, 점화식, 수식, 의사코드
- 시간/공간 복잡도 언급`,

  level2: `사용자가 프로그래머스 "{problemTitle}" (ID: {problemId}) 문제의 레벨 2 힌트를 요청했습니다.

[문제 정보]
- 난이도: {level} ({description})
- 카테고리: {category}
- 관련 알고리즘: {tags}

[가이드라인]
1. 알고리즘 유형({tags})을 명시하세요.
2. 이 문제만의 핵심 아이디어(key insight)를 설명하세요.
3. "무엇을 해야 하는지"는 알려주되 "어떻게 하는지"는 알려주지 마세요.
4. 3-5문장으로 작성하세요.

[금지 사항]
- 구체적 구현 방법 (코드, 의사코드)
- 정답에 직접 이르는 점화식이나 수식
- 단계별 풀이 절차`,

  level3: `사용자가 프로그래머스 "{problemTitle}" (ID: {problemId}) 문제의 레벨 3 힌트를 요청했습니다.

[문제 정보]
- 난이도: {level} ({description})
- 카테고리: {category}
- 관련 알고리즘: {tags}

[가이드라인]
1. 이 문제를 풀기 위한 단계별 전략을 5-7단계로 작성하세요.
2. 핵심 자료구조 또는 상태 정의를 포함하세요.
3. 주의할 엣지 케이스나 흔한 실수를 1-2가지 언급하세요.
4. {level} 수준에 맞게 설명 깊이를 조절하세요.
5. 의사코드 수준의 설명은 가능하지만, 완전한 코드는 제공하지 마세요.`,
} as const;

/**
 * 프로그래머스 복습 가이드 프롬프트
 */
export const PROGRAMMERS_REVIEW_GUIDE_PROMPT = `프로그래머스 "{problemTitle}" ({level}) 문제의 복습을 진행합니다.
카테고리: {category}

아래 순서대로 학생에게 질문하며 복습을 도와주세요:

1. 풀이 접근법: "어떤 알고리즘으로 접근했나요? 왜 그 방법을 선택했나요?"
2. 핵심 아이디어: "이 문제의 핵심 아이디어는 무엇이었나요?"
3. 복잡도 분석: "시간/공간 복잡도를 분석해주세요."
4. 어려웠던 점: "어디서 막혔거나 실수했나요?"
5. 배운 점: "이 문제를 통해 배운 개념이나 패턴은?"` as const;

/**
 * 프로그래머스 문제 메타데이터에서 템플릿 변수 맵을 생성합니다.
 */
export function buildProgrammersTemplateVariables(
  problem: ProgrammersProblemDetail,
  difficulty: ProgrammersDifficultyContext,
): Record<string, string | number> {
  return {
    problemId: problem.problemId,
    problemTitle: problem.title,
    level: difficulty.levelLabel,
    description: difficulty.description,
    category: problem.category || '기타',
    tags: problem.tags.length > 0 ? problem.tags.join(', ') : '알고리즘',
  };
}

/**
 * 프로그래머스 문제 데이터로부터 완성된 HintGuide 객체를 생성합니다.
 */
export function buildProgrammersHintGuide(
  problem: ProgrammersProblemDetail,
  difficulty: ProgrammersDifficultyContext,
): HintGuide {
  const vars = buildProgrammersTemplateVariables(problem, difficulty);
  const category = problem.category || '기타';
  const tags = problem.tags.length > 0 ? problem.tags.join(', ') : '알고리즘';

  const context = [
    `프로그래머스 "${problem.title}" (ID: ${problem.problemId})`,
    `난이도: ${difficulty.emoji} ${difficulty.levelLabel} (${difficulty.description})`,
    `카테고리: ${category}`,
    `태그: ${tags}`,
    difficulty.context,
  ].join('\n');

  const hintLevels: HintLevelGuide[] = [
    {
      level: 1,
      label: '문제 분석',
      prompt: interpolateTemplate(PROGRAMMERS_HINT_LEVEL_PROMPTS.level1, vars),
    },
    {
      level: 2,
      label: '핵심 아이디어',
      prompt: interpolateTemplate(PROGRAMMERS_HINT_LEVEL_PROMPTS.level2, vars),
    },
    {
      level: 3,
      label: '상세 풀이',
      prompt: interpolateTemplate(PROGRAMMERS_HINT_LEVEL_PROMPTS.level3, vars),
    },
  ];

  const primaryTag = problem.tags[0] || category;
  const reviewPrompts: ReviewPrompts = {
    solution_approach: `이 문제를 어떤 방법으로 풀었나요? ${primaryTag} 접근법을 사용했다면 어떻게 적용했는지 설명해주세요.`,
    time_complexity: `이 풀이의 시간 복잡도는 어떻게 되나요? 왜 그렇게 되는지 분석해주세요.`,
    space_complexity: `추가로 사용한 자료구조나 메모리가 있나요? 공간 복잡도를 분석해보세요.`,
    key_insights: `이 문제에서 가장 중요한 관찰이나 아이디어는 무엇이었나요? ${primaryTag}의 어떤 특성을 활용했나요?`,
    difficulties: `문제를 풀면서 막혔던 부분이 있었나요? 알고리즘 선택, 구현, 디버깅 등 어떤 점이 어려웠는지 돌아봐주세요.`,
  };

  return { context, hint_levels: hintLevels, review_prompts: reviewPrompts };
}
