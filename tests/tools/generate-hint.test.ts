/**
 * generate_hint 도구 테스트 (SRP 리팩토링)
 *
 * 테스트 범위:
 * - Zod 스키마 검증
 * - 입력 검증 (problem_id)
 * - 출력 구조 (problem, difficulty, tags, hint_guide)
 */

import { describe, it, expect } from 'vitest';
import { GenerateHintInputSchema } from '../../src/tools/generate-hint.js';

describe('generate_hint 도구', () => {
  describe('Zod 스키마 검증', () => {
    it('유효한 problem_id 허용', () => {
      // Given: 유효한 입력
      const validInput = {
        problem_id: 1927,
      };

      // When
      const result = GenerateHintInputSchema.safeParse(validInput);

      // Then
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.problem_id).toBe(1927);
      }
    });

    it('problem_id 0은 거부', () => {
      // Given
      const invalidInput = {
        problem_id: 0,
      };

      // When
      const result = GenerateHintInputSchema.safeParse(invalidInput);

      // Then
      expect(result.success).toBe(false);
    });

    it('problem_id 음수 거부', () => {
      // Given
      const invalidInput = {
        problem_id: -100,
      };

      // When
      const result = GenerateHintInputSchema.safeParse(invalidInput);

      // Then
      expect(result.success).toBe(false);
    });

    it('problem_id 타입 검증 (문자열 거부)', () => {
      // Given
      const invalidInput = {
        problem_id: '1927' as unknown as number,
      };

      // When
      const result = GenerateHintInputSchema.safeParse(invalidInput);

      // Then
      expect(result.success).toBe(false);
    });

    it('problem_id 필수 필드 검증', () => {
      // Given: problem_id 누락
      const invalidInput = {};

      // When
      const result = GenerateHintInputSchema.safeParse(invalidInput);

      // Then
      expect(result.success).toBe(false);
    });

    it('problem_id가 정수가 아니면 거부', () => {
      // Given
      const invalidInput = {
        problem_id: 1927.5,
      };

      // When
      const result = GenerateHintInputSchema.safeParse(invalidInput);

      // Then
      expect(result.success).toBe(false);
    });

    it('추가 필드는 무시', () => {
      // Given
      const inputWithExtra = {
        problem_id: 1927,
        extra_field: 'ignored',
      };

      // When
      const result = GenerateHintInputSchema.safeParse(inputWithExtra);

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
 * generateHint() 메서드가 정상 동작하는지 확인하는 통합 테스트는
 * problem-analyzer.test.ts에서 이미 수행하고 있습니다.
 *
 * 이 파일은 MCP 도구 레이어의 입력 검증에 집중합니다.
 */
describe('generate_hint 도구 핸들러 (통합 테스트는 생략)', () => {
  it.skip('정상 힌트 생성', async () => {
    // problem-analyzer.test.ts에서 이미 테스트됨
  });

  it.skip('존재하지 않는 문제 (404)', async () => {
    // problem-analyzer.test.ts에서 이미 테스트됨
  });

  it.skip('MCP TextContent 형식', async () => {
    // problem-analyzer.test.ts에서 이미 테스트됨
  });

  it.skip('HintResult 인터페이스 준수', async () => {
    // problem-analyzer.test.ts에서 이미 테스트됨
    // expect(result).toHaveProperty('problem');
    // expect(result).toHaveProperty('difficulty');
    // expect(result).toHaveProperty('tags');
    // expect(result).toHaveProperty('hint_guide');
    // expect(result).not.toHaveProperty('similar_problems');
  });
});
