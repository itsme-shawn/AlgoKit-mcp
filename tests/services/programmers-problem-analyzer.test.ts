/**
 * ProgrammersProblemAnalyzer 서비스 테스트
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProgrammersProblemAnalyzer } from '../../src/services/programmers-problem-analyzer.js';
import type { ProgrammersScraper } from '../../src/api/programmers-scraper.js';
import type { ProgrammersProblemDetail } from '../../src/types/programmers.js';

const mockProblemDetail: ProgrammersProblemDetail = {
  problemId: '42748',
  title: 'K번째수',
  level: 1,
  category: '정렬',
  description: '배열을 자르고 정렬하는 문제',
  constraints: ['array 길이 1~100'],
  examples: [{ input: '[1,5,2]', output: '[5]' }],
  tags: ['정렬'],
};

describe('ProgrammersProblemAnalyzer', () => {
  let mockScraper: { getProblem: ReturnType<typeof vi.fn> };
  let analyzer: ProgrammersProblemAnalyzer;

  beforeEach(() => {
    mockScraper = {
      getProblem: vi.fn().mockResolvedValue(mockProblemDetail),
    };
    analyzer = new ProgrammersProblemAnalyzer(mockScraper as unknown as ProgrammersScraper);
  });

  it('분석 결과 구조 검증', async () => {
    const result = await analyzer.analyze('42748');

    expect(result).toHaveProperty('problem');
    expect(result).toHaveProperty('difficulty');
    expect(result).toHaveProperty('similar_problems');
    expect(result).toHaveProperty('hint_guide');
  });

  it('문제 데이터 전달', async () => {
    const result = await analyzer.analyze('42748');

    expect(result.problem.problemId).toBe('42748');
    expect(result.problem.title).toBe('K번째수');
    expect(mockScraper.getProblem).toHaveBeenCalledWith('42748');
  });

  it('유사 문제 항상 빈 배열', async () => {
    const result = await analyzer.analyze('42748', true);

    expect(result.similar_problems).toEqual([]);
  });

  it('난이도 컨텍스트 Lv. 0', async () => {
    mockScraper.getProblem.mockResolvedValue({ ...mockProblemDetail, level: 0 });
    const result = await analyzer.analyze('42748');

    expect(result.difficulty.levelLabel).toBe('Lv. 0');
    expect(result.difficulty.level).toBe(0);
    expect(result.difficulty.description).toBe('입문');
    expect(result.difficulty.emoji).toBe('🟢');
  });

  it('난이도 컨텍스트 Lv. 1', async () => {
    const result = await analyzer.analyze('42748');

    expect(result.difficulty.levelLabel).toBe('Lv. 1');
    expect(result.difficulty.description).toBe('초급');
    expect(result.difficulty.emoji).toBe('🟡');
  });

  it('난이도 컨텍스트 Lv. 2', async () => {
    mockScraper.getProblem.mockResolvedValue({ ...mockProblemDetail, level: 2 });
    const result = await analyzer.analyze('42748');

    expect(result.difficulty.levelLabel).toBe('Lv. 2');
    expect(result.difficulty.description).toBe('중급');
    expect(result.difficulty.emoji).toBe('🟠');
  });

  it('난이도 컨텍스트 Lv. 3', async () => {
    mockScraper.getProblem.mockResolvedValue({ ...mockProblemDetail, level: 3 });
    const result = await analyzer.analyze('42748');

    expect(result.difficulty.levelLabel).toBe('Lv. 3');
    expect(result.difficulty.description).toBe('중상급');
    expect(result.difficulty.emoji).toBe('🔴');
  });

  it('난이도 컨텍스트 Lv. 4', async () => {
    mockScraper.getProblem.mockResolvedValue({ ...mockProblemDetail, level: 4 });
    const result = await analyzer.analyze('42748');

    expect(result.difficulty.levelLabel).toBe('Lv. 4');
    expect(result.difficulty.description).toBe('고급');
    expect(result.difficulty.emoji).toBe('🟣');
  });

  it('난이도 컨텍스트 Lv. 5', async () => {
    mockScraper.getProblem.mockResolvedValue({ ...mockProblemDetail, level: 5 });
    const result = await analyzer.analyze('42748');

    expect(result.difficulty.levelLabel).toBe('Lv. 5');
    expect(result.difficulty.description).toBe('최고급');
    expect(result.difficulty.emoji).toBe('⚫');
  });

  it('힌트 가이드 포함', async () => {
    const result = await analyzer.analyze('42748');

    expect(result.hint_guide).toHaveProperty('context');
    expect(result.hint_guide).toHaveProperty('hint_levels');
    expect(result.hint_guide.hint_levels).toHaveLength(3);
    expect(result.hint_guide).toHaveProperty('review_prompts');
  });

  it('컨텍스트에 카테고리 포함', async () => {
    const result = await analyzer.analyze('42748');

    expect(result.difficulty.context).toContain('정렬');
    expect(result.difficulty.context).toContain('Lv. 1');
  });

  it('스크래퍼 에러 전파', async () => {
    mockScraper.getProblem.mockRejectedValue(new Error('스크래핑 실패'));

    await expect(analyzer.analyze('42748')).rejects.toThrow('스크래핑 실패');
  });
});
