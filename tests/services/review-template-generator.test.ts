/**
 * ReviewTemplateGenerator 서비스 테스트 (Keyless Architecture)
 *
 * 테스트 범위:
 * - 템플릿 생성
 * - 메타데이터 포맷팅
 * - 태그 설명
 * - 가이드 프롬프트
 * - 관련 문제 추천
 * - Edge Cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReviewTemplateGenerator } from '../../src/services/review-template-generator.js';
import { ProblemAnalyzer } from '../../src/services/problem-analyzer.js';
import type { SolvedAcClient } from '../../src/api/solvedac-client.js';
import { mockProblem1000, mockProblem1927, mockProblem11053 } from '../__mocks__/solved-ac-responses.js';
import type { Problem } from '../../src/api/types.js';

describe('ReviewTemplateGenerator (Keyless)', () => {
  let generator: ReviewTemplateGenerator;
  let mockApiClient: {
    getProblem: ReturnType<typeof vi.fn>;
    searchProblems: ReturnType<typeof vi.fn>;
  };
  let mockAnalyzer: ProblemAnalyzer;

  beforeEach(() => {
    mockApiClient = {
      getProblem: vi.fn(),
      searchProblems: vi.fn(),
    };
    mockAnalyzer = new ProblemAnalyzer(mockApiClient as unknown as SolvedAcClient);
    generator = new ReviewTemplateGenerator(
      mockApiClient as unknown as SolvedAcClient,
      mockAnalyzer
    );
  });

  describe('TC-KL-2.1~2.3: 템플릿 생성', () => {
    it('TC-KL-2.1: 기본 템플릿 구조', async () => {
      // Given
      mockApiClient.getProblem.mockResolvedValue(mockProblem1927);
      mockApiClient.searchProblems.mockResolvedValue({ count: 0, items: [] });

      // When
      const template = await generator.generate(1927);

      // Then: ReviewTemplate 인터페이스 검증
      expect(template).toHaveProperty('template');
      expect(template).toHaveProperty('problem_data');
      expect(template).toHaveProperty('analysis');
      expect(template).toHaveProperty('related_problems');
      expect(template).toHaveProperty('prompts');

      // template은 문자열
      expect(typeof template.template).toBe('string');
      expect(template.template.length).toBeGreaterThan(0);
    });

    it('TC-KL-2.2: 모든 필드 포함 확인', async () => {
      // Given
      mockApiClient.getProblem.mockResolvedValue(mockProblem1927);
      mockApiClient.searchProblems.mockResolvedValue({ count: 0, items: [] });

      // When
      const template = await generator.generate(1927);

      // Then: problem_data 필드
      expect(template.problem_data).toHaveProperty('id');
      expect(template.problem_data).toHaveProperty('title');
      expect(template.problem_data).toHaveProperty('tier');
      expect(template.problem_data).toHaveProperty('tags');
      expect(template.problem_data).toHaveProperty('stats');
      expect(template.problem_data.stats).toHaveProperty('acceptedUserCount');
      expect(template.problem_data.stats).toHaveProperty('averageTries');

      // Then: analysis 필드
      expect(template.analysis).toHaveProperty('tags_explanation');
      expect(template.analysis).toHaveProperty('difficulty_context');
      expect(template.analysis).toHaveProperty('common_approaches');
      expect(template.analysis).toHaveProperty('time_complexity_typical');
      expect(template.analysis).toHaveProperty('space_complexity_typical');
      expect(template.analysis).toHaveProperty('common_mistakes');

      // Then: prompts 필드
      expect(template.prompts).toHaveProperty('solution_approach');
      expect(template.prompts).toHaveProperty('time_complexity');
      expect(template.prompts).toHaveProperty('space_complexity');
      expect(template.prompts).toHaveProperty('key_insights');
      expect(template.prompts).toHaveProperty('difficulties');
    });

    it('TC-KL-2.3: 마크다운 형식 검증', async () => {
      // Given
      mockApiClient.getProblem.mockResolvedValue(mockProblem1927);
      mockApiClient.searchProblems.mockResolvedValue({ count: 0, items: [] });

      // When
      const template = await generator.generate(1927);

      // Then: 마크다운 구조
      expect(template.template).toMatch(/^# \d+\./); // H1 제목
      expect(template.template).toContain('## 문제 정보'); // H2 섹션
      expect(template.template).toContain('## 풀이 접근법');
      expect(template.template).toContain('## 시간/공간 복잡도');
      expect(template.template).toContain('## 핵심 인사이트');
      expect(template.template).toContain('## 관련 문제');
      expect(template.template).toContain('## 해결 날짜');

      // 링크 형식
      expect(template.template).toMatch(/\[BOJ \d+\]\(https:\/\/www\.acmicpc\.net\/problem\/\d+\)/);
    });
  });

  describe('TC-KL-2.4~2.6: 메타데이터 포맷팅', () => {
    it('TC-KL-2.4: 문제 정보 (제목, 번호, 티어)', async () => {
      // Given
      mockApiClient.getProblem.mockResolvedValue(mockProblem1927);
      mockApiClient.searchProblems.mockResolvedValue({ count: 0, items: [] });

      // When
      const template = await generator.generate(1927);

      // Then
      expect(template.template).toContain('1927');
      expect(template.template).toContain('최소 힙');
      expect(template.template).toContain('Silver I');

      expect(template.problem_data.id).toBe(1927);
      expect(template.problem_data.title).toBe('최소 힙');
      expect(template.problem_data.tier).toContain('Silver I');
    });

    it('TC-KL-2.5: 티어 이모지 표시', async () => {
      // Given: Bronze V 문제
      mockApiClient.getProblem.mockResolvedValue(mockProblem1000);
      mockApiClient.searchProblems.mockResolvedValue({ count: 0, items: [] });

      // When
      const template = await generator.generate(1000);

      // Then: Bronze 이모지
      expect(template.template).toMatch(/🟤|Bronze/);
    });

    it('TC-KL-2.6: 통계 정보 (해결자 수, 평균 시도)', async () => {
      // Given
      mockApiClient.getProblem.mockResolvedValue(mockProblem1927);
      mockApiClient.searchProblems.mockResolvedValue({ count: 0, items: [] });

      // When
      const template = await generator.generate(1927);

      // Then
      expect(template.problem_data.stats.acceptedUserCount).toBe(50000);
      expect(template.problem_data.stats.averageTries).toBe(2.5);

      // 템플릿에 통계 정보 포함 (숫자 형식)
      expect(template.template).toMatch(/50,?000|50000/);
      expect(template.template).toMatch(/2\.5/);
    });
  });

  describe('TC-KL-2.7~2.9: 태그 설명', () => {
    it('TC-KL-2.7: DP 태그 설명 생성', async () => {
      // Given
      mockApiClient.getProblem.mockResolvedValue(mockProblem11053);
      mockApiClient.searchProblems.mockResolvedValue({ count: 0, items: [] });

      // When
      const template = await generator.generate(11053);

      // Then
      expect(template.analysis.tags_explanation).toHaveProperty('dp');
      expect(template.analysis.tags_explanation['dp']).toContain('동적');
    });

    it('TC-KL-2.8: Greedy 태그 설명 생성', async () => {
      // Given: Greedy 문제
      const mockGreedyProblem: Problem = {
        ...mockProblem1000,
        problemId: 11399,
        titleKo: 'ATM',
        level: 7,
        tags: [
          {
            key: 'greedy',
            displayNames: [{ language: 'ko', name: '그리디 알고리즘' }],
          },
        ],
      };
      mockApiClient.getProblem.mockResolvedValue(mockGreedyProblem);
      mockApiClient.searchProblems.mockResolvedValue({ count: 0, items: [] });

      // When
      const template = await generator.generate(11399);

      // Then
      expect(template.analysis.tags_explanation).toHaveProperty('greedy');
      expect(template.analysis.tags_explanation['greedy']).toContain('그리디');
    });

    it('TC-KL-2.9: 복합 태그 설명', async () => {
      // Given: 복합 태그 문제
      const mockComplexProblem: Problem = {
        ...mockProblem11053,
        tags: [
          {
            key: 'dp',
            displayNames: [{ language: 'ko', name: '다이나믹 프로그래밍' }],
          },
          {
            key: 'graphs',
            displayNames: [{ language: 'ko', name: '그래프 이론' }],
          },
        ],
      };
      mockApiClient.getProblem.mockResolvedValue(mockComplexProblem);
      mockApiClient.searchProblems.mockResolvedValue({ count: 0, items: [] });

      // When
      const template = await generator.generate(11053);

      // Then
      expect(template.analysis.tags_explanation).toHaveProperty('dp');
      expect(template.analysis.tags_explanation).toHaveProperty('graphs');
    });
  });

  describe('TC-KL-2.10~2.13: 가이드 프롬프트', () => {
    beforeEach(() => {
      mockApiClient.getProblem.mockResolvedValue(mockProblem1927);
      mockApiClient.searchProblems.mockResolvedValue({ count: 0, items: [] });
    });

    it('TC-KL-2.10: solution_approach 프롬프트', async () => {
      // When
      const template = await generator.generate(1927);

      // Then
      expect(template.prompts.solution_approach).toBeDefined();
      expect(typeof template.prompts.solution_approach).toBe('string');
      expect(template.prompts.solution_approach.length).toBeGreaterThan(10);
      expect(template.prompts.solution_approach).toMatch(/어떻게|풀이|접근/);
    });

    it('TC-KL-2.11: time_complexity 프롬프트', async () => {
      // When
      const template = await generator.generate(1927);

      // Then
      expect(template.prompts.time_complexity).toBeDefined();
      expect(template.prompts.time_complexity).toMatch(/시간|복잡도|O\(/);
    });

    it('TC-KL-2.12: key_insights 프롬프트', async () => {
      // When
      const template = await generator.generate(1927);

      // Then
      expect(template.prompts.key_insights).toBeDefined();
      expect(template.prompts.key_insights).toMatch(/핵심|인사이트|배운/);
    });

    it('TC-KL-2.13: difficulties 프롬프트', async () => {
      // When
      const template = await generator.generate(1927);

      // Then
      expect(template.prompts.difficulties).toBeDefined();
      expect(template.prompts.difficulties).toMatch(/어려웠|어려움|문제/);
    });
  });

  describe('TC-KL-2.14~2.15: 관련 문제 추천', () => {
    it('TC-KL-2.14: 같은 태그 문제 포함', async () => {
      // Given: 유사 문제 있음
      mockApiClient.getProblem.mockResolvedValue(mockProblem1927);
      mockApiClient.searchProblems.mockResolvedValue({
        count: 2,
        items: [
          { ...mockProblem1927, problemId: 11279, titleKo: '최대 힙' },
          { ...mockProblem1927, problemId: 1655, titleKo: '가운데를 말해요' },
        ],
      });

      // When
      const template = await generator.generate(1927);

      // Then
      expect(template.related_problems).toBeDefined();
      expect(template.related_problems.length).toBeGreaterThan(0);
      expect(template.related_problems[0].problemId).toBe(11279);
    });

    it('TC-KL-2.15: 마크다운 링크 형식', async () => {
      // Given
      mockApiClient.getProblem.mockResolvedValue(mockProblem1927);
      mockApiClient.searchProblems.mockResolvedValue({
        count: 1,
        items: [{ ...mockProblem1927, problemId: 11279, titleKo: '최대 힙' }],
      });

      // When
      const template = await generator.generate(1927);

      // Then: 템플릿에 링크 형식으로 포함
      expect(template.template).toMatch(/\[\d+\..+\]\(https:\/\/www\.acmicpc\.net\/problem\/\d+\)/);
    });
  });

  describe('TC-KL-2.16~2.17: Edge Cases', () => {
    it('TC-KL-2.16: 태그 없는 문제', async () => {
      // Given
      const mockNoTagProblem: Problem = {
        ...mockProblem1000,
        tags: [],
      };
      mockApiClient.getProblem.mockResolvedValue(mockNoTagProblem);
      mockApiClient.searchProblems.mockResolvedValue({ count: 0, items: [] });

      // When
      const template = await generator.generate(1000);

      // Then: 에러 발생하지 않음
      expect(template).toBeDefined();
      expect(template.template).toContain('태그 정보 없음');
    });

    it('TC-KL-2.17: 관련 문제 없음', async () => {
      // Given
      mockApiClient.getProblem.mockResolvedValue(mockProblem1000);
      mockApiClient.searchProblems.mockResolvedValue({ count: 0, items: [] });

      // When
      const template = await generator.generate(1000);

      // Then
      expect(template.related_problems).toBeDefined();
      expect(template.related_problems.length).toBe(0);
      expect(template.template).toMatch(/관련 문제를 찾을 수 없습니다|관련 문제 없음/);
    });
  });

  describe('사용자 메모 포함 테스트', () => {
    it('사용자 메모가 템플릿에 포함되어야 함', async () => {
      // Given
      mockApiClient.getProblem.mockResolvedValue(mockProblem1927);
      mockApiClient.searchProblems.mockResolvedValue({ count: 0, items: [] });
      const userNotes = '우선순위 큐를 사용하여 풀이했습니다. heapq 모듈을 활용했습니다.';

      // When
      const template = await generator.generate(1927, userNotes);

      // Then
      expect(template.template).toContain(userNotes);
      expect(template.template).toMatch(/초기 메모|사용자 메모|메모/);
    });
  });
});
