/**
 * programmers-hint-guide 프롬프트 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  PROGRAMMERS_HINT_LEVEL_PROMPTS,
  buildProgrammersTemplateVariables,
  buildProgrammersHintGuide,
} from '../../src/prompts/programmers-hint-guide.js';
import type { ProgrammersProblemDetail } from '../../src/types/programmers.js';
import type { ProgrammersDifficultyContext } from '../../src/types/analysis.js';

const mockProblem: ProgrammersProblemDetail = {
  problemId: '42748',
  title: 'K번째수',
  level: 1,
  category: '정렬',
  description: '배열을 자르고 정렬하는 문제',
  constraints: ['array 길이 1~100'],
  examples: [{ input: '[1,5,2]', output: '[5]' }],
  tags: ['정렬'],
};

const mockDifficulty: ProgrammersDifficultyContext = {
  levelLabel: 'Lv. 1',
  level: 1,
  emoji: '🟡',
  description: '초급',
  context: 'Lv. 1 난이도의 정렬 문제',
};

describe('PROGRAMMERS_HINT_LEVEL_PROMPTS', () => {
  it('3개 레벨 프롬프트 존재', () => {
    expect(PROGRAMMERS_HINT_LEVEL_PROMPTS).toHaveProperty('level1');
    expect(PROGRAMMERS_HINT_LEVEL_PROMPTS).toHaveProperty('level2');
    expect(PROGRAMMERS_HINT_LEVEL_PROMPTS).toHaveProperty('level3');
  });

  it('프로그래머스 관련 텍스트 포함', () => {
    expect(PROGRAMMERS_HINT_LEVEL_PROMPTS.level1).toContain('프로그래머스');
    expect(PROGRAMMERS_HINT_LEVEL_PROMPTS.level2).toContain('프로그래머스');
    expect(PROGRAMMERS_HINT_LEVEL_PROMPTS.level3).toContain('프로그래머스');
  });

  it('템플릿 변수 포함', () => {
    expect(PROGRAMMERS_HINT_LEVEL_PROMPTS.level1).toContain('{problemTitle}');
    expect(PROGRAMMERS_HINT_LEVEL_PROMPTS.level1).toContain('{problemId}');
    expect(PROGRAMMERS_HINT_LEVEL_PROMPTS.level1).toContain('{level}');
  });
});

describe('buildProgrammersTemplateVariables', () => {
  it('올바른 변수 맵 생성', () => {
    const vars = buildProgrammersTemplateVariables(mockProblem, mockDifficulty);

    expect(vars.problemId).toBe('42748');
    expect(vars.problemTitle).toBe('K번째수');
    expect(vars.level).toBe('Lv. 1');
    expect(vars.description).toBe('초급');
    expect(vars.category).toBe('정렬');
    expect(vars.tags).toBe('정렬');
  });

  it('빈 태그 시 기본값', () => {
    const problem = { ...mockProblem, tags: [] };
    const vars = buildProgrammersTemplateVariables(problem, mockDifficulty);

    expect(vars.tags).toBe('알고리즘');
  });

  it('빈 카테고리 시 기본값', () => {
    const problem = { ...mockProblem, category: '' };
    const vars = buildProgrammersTemplateVariables(problem, mockDifficulty);

    expect(vars.category).toBe('기타');
  });
});

describe('buildProgrammersHintGuide', () => {
  it('HintGuide 구조 반환', () => {
    const guide = buildProgrammersHintGuide(mockProblem, mockDifficulty);

    expect(guide).toHaveProperty('context');
    expect(guide).toHaveProperty('hint_levels');
    expect(guide).toHaveProperty('review_prompts');
  });

  it('3단계 힌트 레벨', () => {
    const guide = buildProgrammersHintGuide(mockProblem, mockDifficulty);

    expect(guide.hint_levels).toHaveLength(3);
    expect(guide.hint_levels[0].level).toBe(1);
    expect(guide.hint_levels[1].level).toBe(2);
    expect(guide.hint_levels[2].level).toBe(3);
  });

  it('프롬프트에 문제 정보 포함', () => {
    const guide = buildProgrammersHintGuide(mockProblem, mockDifficulty);

    expect(guide.hint_levels[0].prompt).toContain('K번째수');
    expect(guide.hint_levels[0].prompt).toContain('42748');
    expect(guide.hint_levels[0].prompt).toContain('Lv. 1');
  });

  it('컨텍스트에 문제 정보 포함', () => {
    const guide = buildProgrammersHintGuide(mockProblem, mockDifficulty);

    expect(guide.context).toContain('K번째수');
    expect(guide.context).toContain('42748');
    expect(guide.context).toContain('🟡');
  });

  it('리뷰 프롬프트 5개 모두 존재', () => {
    const guide = buildProgrammersHintGuide(mockProblem, mockDifficulty);

    expect(guide.review_prompts).toHaveProperty('solution_approach');
    expect(guide.review_prompts).toHaveProperty('time_complexity');
    expect(guide.review_prompts).toHaveProperty('space_complexity');
    expect(guide.review_prompts).toHaveProperty('key_insights');
    expect(guide.review_prompts).toHaveProperty('difficulties');
  });

  it('힌트 레벨 라벨', () => {
    const guide = buildProgrammersHintGuide(mockProblem, mockDifficulty);

    expect(guide.hint_levels[0].label).toBe('문제 분석');
    expect(guide.hint_levels[1].label).toBe('핵심 아이디어');
    expect(guide.hint_levels[2].label).toBe('상세 풀이');
  });
});
