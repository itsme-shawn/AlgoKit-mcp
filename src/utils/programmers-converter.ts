/**
 * 프로그래머스 문제 데이터 변환 유틸리티
 *
 * ProgrammersProblemDetail → ProblemContent 변환
 */

import type { ProgrammersProblemDetail } from '../types/programmers.js';
import type { ProblemContent } from '../types/problem-content.js';

/**
 * ProgrammersProblemDetail을 ProblemContent로 변환
 *
 * CodeAnalyzer가 플랫폼 독립적으로 동작할 수 있도록
 * 프로그래머스 데이터를 BOJ ProblemContent 형태로 변환합니다.
 */
export function programmersToProblemContent(
  detail: ProgrammersProblemDetail,
): ProblemContent {
  // 제한사항 → inputFormat (join)
  const inputFormat = detail.constraints.length > 0
    ? detail.constraints.map((c, i) => `${i + 1}. ${c}`).join('\n')
    : '프로그래머스 제한사항 참조';

  // 예제 변환
  const examples = detail.examples.map(ex => ({
    input: ex.input,
    output: ex.output,
    note: ex.explanation,
  }));

  return {
    problemId: parseInt(detail.problemId, 10) || 0,
    title: detail.title,
    description: detail.description,
    inputFormat,
    outputFormat: '프로그래머스 문제 형식 참조',
    examples,
    limits: {
      timeLimit: '프로그래머스 제한사항 참조',
      memoryLimit: '프로그래머스 제한사항 참조',
    },
    metadata: {
      fetchedAt: new Date().toISOString(),
      source: 'web',
      cacheExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
  };
}
