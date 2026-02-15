/**
 * programmers-converter 유틸리티 테스트
 */

import { describe, it, expect } from 'vitest';
import { programmersToProblemContent } from '../../src/utils/programmers-converter.js';
import type { ProgrammersProblemDetail } from '../../src/types/programmers.js';

const mockDetail: ProgrammersProblemDetail = {
  problemId: '42748',
  title: 'K번째수',
  level: 1,
  category: '정렬',
  description: '배열 array의 i번째 숫자부터 j번째 숫자까지 자르고 정렬했을 때, k번째에 있는 수를 구하세요.',
  constraints: [
    'array의 길이는 1 이상 100 이하입니다.',
    'array의 각 원소는 1 이상 100 이하입니다.',
  ],
  examples: [
    { input: '[1, 5, 2, 6, 3, 7, 4]', output: '[5, 6, 3]', explanation: '설명' },
  ],
  tags: ['정렬'],
};

describe('programmersToProblemContent', () => {
  it('기본 변환 성공', () => {
    const result = programmersToProblemContent(mockDetail);

    expect(result.problemId).toBe(42748);
    expect(result.title).toBe('K번째수');
    expect(result.description).toBe(mockDetail.description);
  });

  it('제한사항을 inputFormat으로 변환', () => {
    const result = programmersToProblemContent(mockDetail);

    expect(result.inputFormat).toContain('1. array의 길이는 1 이상 100 이하입니다.');
    expect(result.inputFormat).toContain('2. array의 각 원소는 1 이상 100 이하입니다.');
  });

  it('빈 제한사항 처리', () => {
    const detail = { ...mockDetail, constraints: [] };
    const result = programmersToProblemContent(detail);

    expect(result.inputFormat).toBe('프로그래머스 제한사항 참조');
  });

  it('예제 변환', () => {
    const result = programmersToProblemContent(mockDetail);

    expect(result.examples).toHaveLength(1);
    expect(result.examples[0].input).toBe('[1, 5, 2, 6, 3, 7, 4]');
    expect(result.examples[0].output).toBe('[5, 6, 3]');
    expect(result.examples[0].note).toBe('설명');
  });

  it('outputFormat과 limits 기본값', () => {
    const result = programmersToProblemContent(mockDetail);

    expect(result.outputFormat).toBe('프로그래머스 문제 형식 참조');
    expect(result.limits.timeLimit).toBe('프로그래머스 제한사항 참조');
    expect(result.limits.memoryLimit).toBe('프로그래머스 제한사항 참조');
  });

  it('metadata 구조', () => {
    const result = programmersToProblemContent(mockDetail);

    expect(result.metadata).toHaveProperty('fetchedAt');
    expect(result.metadata.source).toBe('web');
    expect(result.metadata).toHaveProperty('cacheExpiresAt');
  });

  it('숫자가 아닌 problemId 처리', () => {
    const detail = { ...mockDetail, problemId: 'abc' };
    const result = programmersToProblemContent(detail);

    expect(result.problemId).toBe(0); // NaN → 0
  });
});
