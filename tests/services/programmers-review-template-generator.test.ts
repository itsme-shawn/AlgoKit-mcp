/**
 * ProgrammersReviewTemplateGenerator 서비스 테스트
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProgrammersReviewTemplateGenerator } from '../../src/services/programmers-review-template-generator.js';
import type { ProgrammersProblemAnalyzer } from '../../src/services/programmers-problem-analyzer.js';
import type { ProgrammersProblemAnalysis } from '../../src/types/analysis.js';

const mockAnalysis: ProgrammersProblemAnalysis = {
  problem: {
    problemId: '42748',
    title: 'K번째수',
    level: 1,
    category: '정렬',
    description: '배열을 자르고 정렬하는 문제',
    constraints: ['array 길이 1~100'],
    examples: [{ input: '[1,5,2]', output: '[5]' }],
    tags: ['정렬'],
  },
  difficulty: {
    levelLabel: 'Lv. 1',
    level: 1,
    emoji: '🟡',
    description: '초급',
    context: 'Lv. 1 난이도의 정렬 문제',
  },
  similar_problems: [],
  hint_guide: {
    context: '프로그래머스 "K번째수"',
    hint_levels: [
      { level: 1, label: '문제 분석', prompt: '힌트 1' },
      { level: 2, label: '핵심 아이디어', prompt: '힌트 2' },
      { level: 3, label: '상세 풀이', prompt: '힌트 3' },
    ],
    review_prompts: {
      solution_approach: '접근법은?',
      time_complexity: '시간 복잡도는?',
      space_complexity: '공간 복잡도는?',
      key_insights: '핵심 인사이트는?',
      difficulties: '어려웠던 점은?',
    },
  },
};

describe('ProgrammersReviewTemplateGenerator', () => {
  let mockAnalyzer: { analyze: ReturnType<typeof vi.fn> };
  let generator: ProgrammersReviewTemplateGenerator;

  beforeEach(() => {
    mockAnalyzer = {
      analyze: vi.fn().mockResolvedValue(mockAnalysis),
    };
    generator = new ProgrammersReviewTemplateGenerator(
      mockAnalyzer as unknown as ProgrammersProblemAnalyzer,
    );
  });

  it('ReviewTemplate 구조 반환', async () => {
    const result = await generator.generate('42748');

    expect(result).toHaveProperty('template');
    expect(result).toHaveProperty('problem_data');
    expect(result).toHaveProperty('related_problems');
    expect(result).toHaveProperty('hint_guide');
    expect(result).toHaveProperty('guideline_uri');
    expect(result).toHaveProperty('guideline_summary');
    expect(result).toHaveProperty('suggested_filename');
  });

  it('마크다운 템플릿 포함', async () => {
    const result = await generator.generate('42748');

    expect(result.template).toContain('# Programmers 42748');
    expect(result.template).toContain('K번째수');
    expect(result.template).toContain('school.programmers.co.kr');
    expect(result.template).toContain('Lv. 1');
  });

  it('문제 데이터 추출', async () => {
    const result = await generator.generate('42748');

    expect(result.problem_data.id).toBe('42748');
    expect(result.problem_data.title).toBe('K번째수');
    expect(result.problem_data.level).toBe(1);
    expect(result.problem_data.levelLabel).toBe('Lv. 1');
    expect(result.problem_data.category).toBe('정렬');
    expect(result.problem_data.tags).toEqual(['정렬']);
  });

  it('관련 문제 항상 빈 배열', async () => {
    const result = await generator.generate('42748');

    expect(result.related_problems).toEqual([]);
  });

  it('가이드라인 URI', async () => {
    const result = await generator.generate('42748');

    expect(result.guideline_uri).toBe('algokit://review-guideline');
  });

  it('권장 파일명', async () => {
    const result = await generator.generate('42748');

    expect(result.suggested_filename).toBe('programmers_42748_REVIEW.md');
  });

  it('사용자 메모 포함', async () => {
    const result = await generator.generate('42748', '정렬 기본 문제');

    expect(result.template).toContain('정렬 기본 문제');
    expect(result.template).toContain('초기 메모');
  });

  it('사용자 메모 없으면 초기 메모 섹션 없음', async () => {
    const result = await generator.generate('42748');

    expect(result.template).not.toContain('초기 메모');
  });

  it('가이드라인 요약 구조', async () => {
    const result = await generator.generate('42748');

    expect(result.guideline_summary.structure).toHaveLength(6);
    expect(result.guideline_summary.key_rules).toHaveLength(5);
  });

  it('제한사항 포함', async () => {
    const result = await generator.generate('42748');

    expect(result.template).toContain('array 길이 1~100');
  });

  it('analyze 호출 시 includeSimilar=false', async () => {
    await generator.generate('42748');

    expect(mockAnalyzer.analyze).toHaveBeenCalledWith('42748', false);
  });

  it('에러 전파', async () => {
    mockAnalyzer.analyze.mockRejectedValue(new Error('분석 실패'));

    await expect(generator.generate('42748')).rejects.toThrow('분석 실패');
  });
});
