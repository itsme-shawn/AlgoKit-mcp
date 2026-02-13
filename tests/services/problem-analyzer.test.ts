/**
 * ProblemAnalyzer 서비스 테스트 (Keyless Architecture)
 *
 * 테스트 범위:
 * - 문제 분석 및 힌트 포인트 생성
 * - 난이도 컨텍스트 생성
 * - 알고리즘 정보 추출
 * - 유사 문제 추천
 * - Edge Cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProblemAnalyzer } from '../../src/services/problem-analyzer.js';
import type { SolvedAcClient } from '../../src/api/solvedac-client.js';
import { mockProblem1000, mockProblem1927, mockProblem11053, mockSearchResult } from '../__mocks__/solved-ac-responses.js';
import type { Problem } from '../../src/api/types.js';

describe('ProblemAnalyzer (Keyless)', () => {
  let analyzer: ProblemAnalyzer;
  let mockApiClient: {
    getProblem: ReturnType<typeof vi.fn>;
    searchProblems: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockApiClient = {
      getProblem: vi.fn(),
      searchProblems: vi.fn(),
    };
    analyzer = new ProblemAnalyzer(mockApiClient as unknown as SolvedAcClient);
  });

  describe('TC-KL-1.1~1.3: 기본 기능 - 문제 분석', () => {
    it('TC-KL-1.1: DP 문제 분석 (1463번 - 1로 만들기, Silver III)', async () => {
      // Given: DP 문제 데이터
      const mockDPProblem: Problem = {
        problemId: 1463,
        titleKo: '1로 만들기',
        level: 8, // Silver III
        tags: [
          {
            key: 'dp',
            displayNames: [{ language: 'ko', name: '다이나믹 프로그래밍' }],
            problemCount: 1500,
          },
        ],
        acceptedUserCount: 89000,
        averageTries: 2.8,
        isSolvable: true,
        isPartial: false,
      };
      mockApiClient.getProblem.mockResolvedValue(mockDPProblem);
      mockApiClient.searchProblems.mockResolvedValue({ count: 0, items: [], page: 1 });

      // When
      const analysis = await analyzer.analyze(1463, false);

      // Then: 구조 검증
      expect(analysis).toHaveProperty('problem');
      expect(analysis).toHaveProperty('difficulty');
      expect(analysis).toHaveProperty('algorithm');
      expect(analysis).toHaveProperty('hint_points');
      expect(analysis).toHaveProperty('constraints');
      expect(analysis).toHaveProperty('gotchas');
      expect(analysis).toHaveProperty('similar_problems');

      // 문제 정보
      expect(analysis.problem.problemId).toBe(1463);
      expect(analysis.problem.titleKo).toBe('1로 만들기');

      // 난이도 컨텍스트
      expect(analysis.difficulty.tier).toBe('Silver III');
      expect(analysis.difficulty.level).toBe(8);
      expect(analysis.difficulty.emoji).toBe('⚪');

      // 알고리즘 정보
      expect(analysis.algorithm.primary_tags).toContain('다이나믹 프로그래밍');
      expect(analysis.algorithm.tag_explanations).toHaveProperty('dp');

      // 힌트 포인트 (3개: Level 1-3)
      expect(analysis.hint_points).toHaveLength(3);
    });

    it('TC-KL-1.2: Greedy 문제 분석', async () => {
      // Given: Greedy 문제 데이터
      const mockGreedyProblem: Problem = {
        problemId: 11399,
        titleKo: 'ATM',
        level: 7, // Silver IV
        tags: [
          {
            key: 'greedy',
            displayNames: [{ language: 'ko', name: '그리디 알고리즘' }],
          },
        ],
        acceptedUserCount: 60000,
        averageTries: 1.5,
        isSolvable: true,
        isPartial: false,
      };
      mockApiClient.getProblem.mockResolvedValue(mockGreedyProblem);
      mockApiClient.searchProblems.mockResolvedValue({ count: 0, items: [] });

      // When
      const analysis = await analyzer.analyze(11399, false);

      // Then
      expect(analysis.algorithm.primary_tags).toContain('그리디 알고리즘');
      expect(analysis.hint_points[0].key).toMatch(/그리디|greedy/i);
    });

    it('TC-KL-1.3: Graph 문제 분석', async () => {
      // Given: Graph 문제 데이터
      const mockGraphProblem: Problem = {
        problemId: 1260,
        titleKo: 'DFS와 BFS',
        level: 9, // Silver II
        tags: [
          {
            key: 'graphs',
            displayNames: [{ language: 'ko', name: '그래프 이론' }],
          },
          {
            key: 'graph_traversal',
            displayNames: [{ language: 'ko', name: '그래프 탐색' }],
          },
        ],
        acceptedUserCount: 100000,
        averageTries: 2.1,
        isSolvable: true,
        isPartial: false,
      };
      mockApiClient.getProblem.mockResolvedValue(mockGraphProblem);
      mockApiClient.searchProblems.mockResolvedValue({ count: 0, items: [] });

      // When
      const analysis = await analyzer.analyze(1260, false);

      // Then
      expect(analysis.algorithm.primary_tags).toContain('그래프 이론');
      expect(analysis.hint_points[0].key).toMatch(/그래프|graph/i);
    });
  });

  describe('TC-KL-1.4~1.6: 힌트 포인트 생성', () => {
    beforeEach(() => {
      mockApiClient.getProblem.mockResolvedValue(mockProblem11053);
      mockApiClient.searchProblems.mockResolvedValue({ count: 0, items: [] });
    });

    it('TC-KL-1.4: Level 1 힌트 (패턴 인식)', async () => {
      // When
      const analysis = await analyzer.analyze(11053, false);

      // Then
      const level1Hint = analysis.hint_points.find(h => h.level === 1);
      expect(level1Hint).toBeDefined();
      expect(level1Hint!.level).toBe(1);
      expect(level1Hint!.type).toBe('pattern');
      expect(level1Hint!.key).toBeTruthy();
      expect(level1Hint!.detail).toBeTruthy();
    });

    it('TC-KL-1.5: Level 2 힌트 (핵심 통찰)', async () => {
      // When
      const analysis = await analyzer.analyze(11053, false);

      // Then
      const level2Hint = analysis.hint_points.find(h => h.level === 2);
      expect(level2Hint).toBeDefined();
      expect(level2Hint!.level).toBe(2);
      expect(level2Hint!.type).toBe('insight');
      expect(level2Hint!.key).toBeTruthy();
      expect(level2Hint!.detail).toBeTruthy();
      // Level 2는 예시를 포함할 수 있음
      expect(level2Hint).toHaveProperty('example');
    });

    it('TC-KL-1.6: Level 3 힌트 (상세 전략)', async () => {
      // When
      const analysis = await analyzer.analyze(11053, false);

      // Then
      const level3Hint = analysis.hint_points.find(h => h.level === 3);
      expect(level3Hint).toBeDefined();
      expect(level3Hint!.level).toBe(3);
      expect(level3Hint!.type).toBe('strategy');
      expect(level3Hint!.key).toBeTruthy();
      // Level 3는 단계별 전략 포함
      expect(level3Hint!.steps).toBeDefined();
      expect(level3Hint!.steps).toBeInstanceOf(Array);
      expect(level3Hint!.steps!.length).toBeGreaterThan(0);
    });
  });

  describe('TC-KL-1.7~1.10: 난이도 컨텍스트', () => {
    it('TC-KL-1.7: Bronze 문제 컨텍스트', async () => {
      // Given
      mockApiClient.getProblem.mockResolvedValue(mockProblem1000);
      mockApiClient.searchProblems.mockResolvedValue({ count: 0, items: [] });

      // When
      const analysis = await analyzer.analyze(1000, false);

      // Then
      expect(analysis.difficulty.tier).toContain('Bronze');
      expect(analysis.difficulty.emoji).toBe('🟤');
      expect(analysis.difficulty.level).toBeLessThanOrEqual(5);
      expect(analysis.difficulty.percentile).toMatch(/입문/i);
    });

    it('TC-KL-1.8: Silver 문제 컨텍스트', async () => {
      // Given
      mockApiClient.getProblem.mockResolvedValue(mockProblem1927);
      mockApiClient.searchProblems.mockResolvedValue({ count: 0, items: [] });

      // When
      const analysis = await analyzer.analyze(1927, false);

      // Then
      expect(analysis.difficulty.tier).toContain('Silver');
      expect(analysis.difficulty.emoji).toBe('⚪');
      expect(analysis.difficulty.level).toBeGreaterThanOrEqual(6);
      expect(analysis.difficulty.level).toBeLessThanOrEqual(10);
    });

    it('TC-KL-1.9: Gold 문제 컨텍스트', async () => {
      // Given
      mockApiClient.getProblem.mockResolvedValue(mockProblem11053);
      mockApiClient.searchProblems.mockResolvedValue({ count: 0, items: [] });

      // When
      const analysis = await analyzer.analyze(11053, false);

      // Then
      expect(analysis.difficulty.tier).toContain('Gold');
      expect(analysis.difficulty.emoji).toBe('🟡');
      expect(analysis.difficulty.level).toBeGreaterThanOrEqual(11);
      expect(analysis.difficulty.level).toBeLessThanOrEqual(15);
    });

    it('TC-KL-1.10: Platinum+ 문제 컨텍스트', async () => {
      // Given: Platinum 문제
      const mockPlatinumProblem: Problem = {
        problemId: 2887,
        titleKo: '행성 터널',
        level: 16, // Platinum V
        tags: [
          {
            key: 'graphs',
            displayNames: [{ language: 'ko', name: '그래프 이론' }],
          },
        ],
        acceptedUserCount: 10000,
        averageTries: 3.5,
        isSolvable: true,
        isPartial: false,
      };
      mockApiClient.getProblem.mockResolvedValue(mockPlatinumProblem);
      mockApiClient.searchProblems.mockResolvedValue({ count: 0, items: [] });

      // When
      const analysis = await analyzer.analyze(2887, false);

      // Then
      expect(analysis.difficulty.tier).toContain('Platinum');
      expect(analysis.difficulty.emoji).toBe('🟢');
      expect(analysis.difficulty.level).toBeGreaterThanOrEqual(16);
      expect(analysis.difficulty.level).toBeLessThanOrEqual(20);
      expect(analysis.difficulty.percentile).toMatch(/중상급|고급/i);
    });
  });

  describe('TC-KL-1.11~1.14: 태그 매핑', () => {
    it('TC-KL-1.11: DP 태그 → 힌트 패턴', async () => {
      // Given
      const mockDPProblem: Problem = {
        ...mockProblem11053,
        tags: [
          {
            key: 'dp',
            displayNames: [{ language: 'ko', name: '다이나믹 프로그래밍' }],
          },
        ],
      };
      mockApiClient.getProblem.mockResolvedValue(mockDPProblem);
      mockApiClient.searchProblems.mockResolvedValue({ count: 0, items: [] });

      // When
      const analysis = await analyzer.analyze(11053, false);

      // Then
      expect(analysis.algorithm.primary_tags).toContain('다이나믹 프로그래밍');
      expect(analysis.algorithm.tag_explanations).toHaveProperty('dp');
      expect(analysis.hint_points[0].key).toMatch(/동적|dp/i);
    });

    it('TC-KL-1.12: Greedy 태그 → 힌트 패턴', async () => {
      // Given
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
      const analysis = await analyzer.analyze(11399, false);

      // Then
      expect(analysis.algorithm.primary_tags).toContain('그리디 알고리즘');
      expect(analysis.algorithm.tag_explanations).toHaveProperty('greedy');
    });

    it('TC-KL-1.13: Graph 태그 → 힌트 패턴', async () => {
      // Given
      const mockGraphProblem: Problem = {
        ...mockProblem1000,
        problemId: 1260,
        titleKo: 'DFS와 BFS',
        level: 9,
        tags: [
          {
            key: 'graphs',
            displayNames: [{ language: 'ko', name: '그래프 이론' }],
          },
        ],
      };
      mockApiClient.getProblem.mockResolvedValue(mockGraphProblem);
      mockApiClient.searchProblems.mockResolvedValue({ count: 0, items: [] });

      // When
      const analysis = await analyzer.analyze(1260, false);

      // Then
      expect(analysis.algorithm.primary_tags).toContain('그래프 이론');
      expect(analysis.algorithm.tag_explanations).toHaveProperty('graphs');
    });

    it('TC-KL-1.14: 복합 태그 (DP + Graph)', async () => {
      // Given
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
      const analysis = await analyzer.analyze(11053, false);

      // Then
      expect(analysis.algorithm.primary_tags).toContain('다이나믹 프로그래밍');
      expect(analysis.algorithm.primary_tags).toContain('그래프 이론');
      expect(analysis.algorithm.tag_explanations).toHaveProperty('dp');
      expect(analysis.algorithm.tag_explanations).toHaveProperty('graphs');
    });
  });

  describe('TC-KL-1.15~1.17: 유사 문제 추천', () => {
    it('TC-KL-1.15: 같은 태그 문제 검색', async () => {
      // Given
      mockApiClient.getProblem.mockResolvedValue(mockProblem11053);
      mockApiClient.searchProblems.mockResolvedValue({
        count: 3,
        items: [
          { ...mockProblem11053, problemId: 2579, titleKo: '계단 오르기' },
          { ...mockProblem11053, problemId: 1003, titleKo: '피보나치 함수' },
        ],
      });

      // When
      const analysis = await analyzer.analyze(11053, true);

      // Then
      expect(mockApiClient.searchProblems).toHaveBeenCalled();
      expect(analysis.similar_problems).toBeDefined();
      expect(analysis.similar_problems.length).toBeGreaterThan(0);
    });

    it('TC-KL-1.16: 비슷한 난이도 필터링 (±2 티어)', async () => {
      // Given: Gold II 문제 (level 14)
      mockApiClient.getProblem.mockResolvedValue(mockProblem11053);
      mockApiClient.searchProblems.mockResolvedValue({ count: 0, items: [] });

      // When
      await analyzer.analyze(11053, true);

      // Then: searchProblems가 ±2 티어 범위로 호출되었는지 확인
      expect(mockApiClient.searchProblems).toHaveBeenCalledWith(
        expect.objectContaining({
          tag: 'dp',
          level_min: expect.any(Number),
          level_max: expect.any(Number),
        })
      );
    });

    it('TC-KL-1.17: 최대 5개 제한', async () => {
      // Given: 유사 문제 6개 반환
      const manyProblems = Array.from({ length: 6 }, (_, i) => ({
        ...mockProblem11053,
        problemId: 10000 + i,
        titleKo: `문제 ${i}`,
      }));
      mockApiClient.getProblem.mockResolvedValue(mockProblem11053);
      mockApiClient.searchProblems.mockResolvedValue({
        count: 6,
        items: manyProblems,
      });

      // When
      const analysis = await analyzer.analyze(11053, true);

      // Then: 최대 5개만 반환
      expect(analysis.similar_problems.length).toBeLessThanOrEqual(5);
    });
  });

  describe('TC-KL-1.18~1.21: Edge Cases', () => {
    it('TC-KL-1.18: 태그 없는 문제', async () => {
      // Given
      const mockNoTagProblem: Problem = {
        ...mockProblem1000,
        tags: [],
      };
      mockApiClient.getProblem.mockResolvedValue(mockNoTagProblem);
      mockApiClient.searchProblems.mockResolvedValue({ count: 0, items: [] });

      // When
      const analysis = await analyzer.analyze(1000, false);

      // Then: 에러 발생하지 않음
      expect(analysis).toBeDefined();
      expect(analysis.algorithm.primary_tags).toBeDefined();
      expect(analysis.hint_points).toHaveLength(3);
    });

    it('TC-KL-1.19: 알 수 없는 태그', async () => {
      // Given
      const mockUnknownTagProblem: Problem = {
        ...mockProblem1000,
        tags: [
          {
            key: 'unknown_tag',
            displayNames: [{ language: 'ko', name: '알 수 없는 태그' }],
          },
        ],
      };
      mockApiClient.getProblem.mockResolvedValue(mockUnknownTagProblem);
      mockApiClient.searchProblems.mockResolvedValue({ count: 0, items: [] });

      // When
      const analysis = await analyzer.analyze(1000, false);

      // Then: fallback 처리
      expect(analysis).toBeDefined();
      expect(analysis.algorithm.primary_tags).toContain('알 수 없는 태그');
      expect(analysis.hint_points).toHaveLength(3);
    });

    it('TC-KL-1.20: 매우 쉬운 문제 (Bronze V)', async () => {
      // Given
      mockApiClient.getProblem.mockResolvedValue(mockProblem1000);
      mockApiClient.searchProblems.mockResolvedValue({ count: 0, items: [] });

      // When
      const analysis = await analyzer.analyze(1000, false);

      // Then
      expect(analysis.difficulty.tier).toBe('Bronze V');
      expect(analysis.difficulty.level).toBe(1);
      expect(analysis.difficulty.percentile).toMatch(/입문/i);
    });

    it('TC-KL-1.21: 매우 어려운 문제 (Ruby I)', async () => {
      // Given: Ruby I 문제
      const mockRubyProblem: Problem = {
        ...mockProblem1000,
        problemId: 1014,
        titleKo: '컨닝',
        level: 30, // Ruby I
        tags: [
          {
            key: 'dp',
            displayNames: [{ language: 'ko', name: '다이나믹 프로그래밍' }],
          },
        ],
        acceptedUserCount: 500,
        averageTries: 10.5,
      };
      mockApiClient.getProblem.mockResolvedValue(mockRubyProblem);
      mockApiClient.searchProblems.mockResolvedValue({ count: 0, items: [] });

      // When
      const analysis = await analyzer.analyze(1014, false);

      // Then
      expect(analysis.difficulty.tier).toBe('Ruby I');
      expect(analysis.difficulty.level).toBe(30);
      expect(analysis.difficulty.emoji).toBe('🔴');
      expect(analysis.difficulty.percentile).toMatch(/최상급|상위 1%/i);
    });
  });
});
