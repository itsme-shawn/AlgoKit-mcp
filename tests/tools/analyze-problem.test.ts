/**
 * analyze_problem 도구 테스트 (Keyless Architecture)
 *
 * 테스트 범위:
 * - Happy Path
 * - Zod 스키마 검증
 * - 에러 처리
 * - 출력 형식
 */

import { describe, it, expect } from 'vitest';
import { AnalyzeProblemInputSchema } from '../../src/tools/analyze-problem.js';

describe('analyze_problem 도구 (Keyless)', () => {
  describe('TC-KL-3.3~3.5: Zod 스키마 검증', () => {
    it('TC-KL-3.3: problem_id 양수 검증', () => {
      // Given: 유효한 입력
      const validInput = {
        problem_id: 1927,
        include_similar: true,
      };

      // When
      const result = AnalyzeProblemInputSchema.safeParse(validInput);

      // Then
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.problem_id).toBe(1927);
        expect(result.data.include_similar).toBe(true);
      }
    });

    it('TC-KL-3.3: problem_id 0은 거부', () => {
      // Given
      const invalidInput = {
        problem_id: 0,
      };

      // When
      const result = AnalyzeProblemInputSchema.safeParse(invalidInput);

      // Then
      expect(result.success).toBe(false);
    });

    it('TC-KL-3.3: problem_id 음수 거부', () => {
      // Given
      const invalidInput = {
        problem_id: -100,
      };

      // When
      const result = AnalyzeProblemInputSchema.safeParse(invalidInput);

      // Then
      expect(result.success).toBe(false);
    });

    it('TC-KL-3.4: problem_id 타입 검증 (문자열 거부)', () => {
      // Given
      const invalidInput = {
        problem_id: '1927' as unknown as number,
      };

      // When
      const result = AnalyzeProblemInputSchema.safeParse(invalidInput);

      // Then
      expect(result.success).toBe(false);
    });

    it('TC-KL-3.5: include_similar boolean 검증', () => {
      // Given: include_similar가 boolean이 아님
      const invalidInput = {
        problem_id: 1927,
        include_similar: 'yes' as unknown as boolean,
      };

      // When
      const result = AnalyzeProblemInputSchema.safeParse(invalidInput);

      // Then
      expect(result.success).toBe(false);
    });

    it('include_similar 기본값 검증', () => {
      // Given: include_similar 생략
      const input = {
        problem_id: 1927,
      };

      // When
      const result = AnalyzeProblemInputSchema.safeParse(input);

      // Then
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.include_similar).toBe(true); // 기본값
      }
    });
  });

  describe('스키마 추가 검증', () => {
    it('problem_id 필수 필드 검증', () => {
      // Given: problem_id 누락
      const invalidInput = {
        include_similar: true,
      };

      // When
      const result = AnalyzeProblemInputSchema.safeParse(invalidInput);

      // Then
      expect(result.success).toBe(false);
    });

    it('problem_id가 정수가 아니면 거부', () => {
      // Given
      const invalidInput = {
        problem_id: 1927.5,
      };

      // When
      const result = AnalyzeProblemInputSchema.safeParse(invalidInput);

      // Then
      expect(result.success).toBe(false);
    });

    it('추가 필드는 무시', () => {
      // Given
      const inputWithExtra = {
        problem_id: 1927,
        include_similar: false,
        extra_field: 'ignored',
      };

      // When
      const result = AnalyzeProblemInputSchema.safeParse(inputWithExtra);

      // Then
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty('extra_field');
      }
    });
  });
});

/**
 * 통합 테스트 (구현 후 작성)
 *
 * 구현 파일이 없으므로 아래 테스트는 실패할 것입니다.
 * 이것은 TDD Red Phase의 예상된 동작입니다.
 */
describe('analyze_problem 도구 핸들러 (구현 필요)', () => {
  // TC-KL-3.1~3.2: Happy Path
  it.skip('TC-KL-3.1: 정상 분석 (include_similar=true)', async () => {
    // 구현 후 작성
    // const analyzeProblemTool = analyzeProblemTool(mockAnalyzer);
    // const result = await analyzeProblemTool.handler({ problem_id: 1927, include_similar: true });
    // expect(result.type).toBe('text');
    // const analysis = JSON.parse(result.text);
    // expect(analysis).toHaveProperty('problem');
    // expect(analysis).toHaveProperty('similar_problems');
  });

  it.skip('TC-KL-3.2: 정상 분석 (include_similar=false)', async () => {
    // 구현 후 작성
    // const result = await analyzeProblemTool.handler({ problem_id: 1927, include_similar: false });
    // const analysis = JSON.parse(result.text);
    // expect(analysis.similar_problems).toEqual([]);
  });

  // TC-KL-3.6~3.7: 에러 처리
  it.skip('TC-KL-3.6: 존재하지 않는 문제 (404)', async () => {
    // 구현 후 작성
    // mockAnalyzer.analyze.mockRejectedValue(new ProblemNotFoundError(999999));
    // await expect(analyzeProblemTool.handler({ problem_id: 999999 }))
    //   .rejects.toThrow('문제를 찾을 수 없습니다');
  });

  it.skip('TC-KL-3.7: API 에러 전파', async () => {
    // 구현 후 작성
    // mockAnalyzer.analyze.mockRejectedValue(new SolvedAcAPIError(500, 'Internal Server Error'));
    // await expect(analyzeProblemTool.handler({ problem_id: 1927 }))
    //   .rejects.toThrow();
  });

  // TC-KL-3.8~3.10: 출력 형식
  it.skip('TC-KL-3.8: MCP TextContent 형식', async () => {
    // 구현 후 작성
    // const result = await analyzeProblemTool.handler({ problem_id: 1927 });
    // expect(result).toHaveProperty('type');
    // expect(result.type).toBe('text');
    // expect(result).toHaveProperty('text');
    // expect(typeof result.text).toBe('string');
  });

  it.skip('TC-KL-3.9: JSON 구조 검증', async () => {
    // 구현 후 작성
    // const result = await analyzeProblemTool.handler({ problem_id: 1927 });
    // expect(() => JSON.parse(result.text)).not.toThrow();
  });

  it.skip('TC-KL-3.10: ProblemAnalysis 인터페이스 준수', async () => {
    // 구현 후 작성
    // const result = await analyzeProblemTool.handler({ problem_id: 1927 });
    // const analysis = JSON.parse(result.text);
    // expect(analysis).toHaveProperty('problem');
    // expect(analysis).toHaveProperty('difficulty');
    // expect(analysis).toHaveProperty('algorithm');
    // expect(analysis).toHaveProperty('hint_points');
    // expect(analysis).toHaveProperty('constraints');
    // expect(analysis).toHaveProperty('gotchas');
    // expect(analysis).toHaveProperty('similar_problems');
  });
});
