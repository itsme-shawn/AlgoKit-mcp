/**
 * generate-hint MCP 도구
 *
 * 백준 문제 힌트 가이드 생성 (SRP: 힌트만)
 */

import { z } from 'zod';
import type { ProblemAnalyzer } from '../services/problem-analyzer.js';
import { ProblemNotFoundError } from '../api/types.js';

/**
 * 입력 스키마
 */
export const GenerateHintInputSchema = z.object({
  problem_id: z.number().int().positive()
    .describe('백준 문제 번호'),
});

export type GenerateHintInput = z.infer<typeof GenerateHintInputSchema>;

/**
 * MCP TextContent 타입
 */
interface TextContent {
  type: 'text';
  text: string;
}

/**
 * generate-hint 도구 핸들러
 */
export function generateHintTool(analyzer: ProblemAnalyzer) {
  return {
    name: 'generate_hint',
    description: `백준 문제 힌트 생성. 3단계 가이드 프롬프트 제공.

응답 구조:
- problem: 문제 메타데이터 (제목, 레벨 등)
- difficulty: 난이도 컨텍스트
- tags: 알고리즘 태그 목록
- hint_guide: 힌트 가이드 프롬프트
  - context: 문제 요약
  - hint_levels: 3단계 힌트 (level, label, prompt)
  - review_prompts: 복습용 가이드

**CRITICAL - 사용자에게 힌트 레벨을 묻지 마세요. 자동으로 선택하여 즉시 제공하세요.**

자동 레벨 선택:
- 사용자 코드 없음 or 기초 구현만 → Level 1 문제 분석 (hint_levels[0].prompt)
- 부분 구현 (로직 시작) → Level 2 핵심 아이디어 (hint_levels[1].prompt)
- 거의 완성 (버그/최적화) → Level 3 상세 풀이 (hint_levels[2].prompt)

선택된 레벨의 prompt로 문제별 맞춤 힌트를 생성하세요. 사용자가 "더 자세히" 요청 시 다음 레벨로 진행하세요.

**정답 제공 정책**: 기본적으로 힌트만 제공하되, 사용자가 "정답 알려줘", "코드 보여줘", "풀이 알려줘" 등 명시적으로 요청하면 정답 코드 및 상세 풀이를 제공할 수 있습니다.`,
    inputSchema: GenerateHintInputSchema,
    handler: async (input: GenerateHintInput): Promise<TextContent> => {
      try {
        // 입력 검증
        const { problem_id } = GenerateHintInputSchema.parse(input);

        // 힌트 가이드 생성
        const result = await analyzer.generateHint(problem_id);

        // JSON 문자열로 반환 (Claude Code가 파싱)
        return {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        };
      } catch (error) {
        // Zod 검증 에러
        if (error instanceof z.ZodError) {
          throw new Error(`입력 검증 실패: ${error.issues[0].message}`);
        }

        // ProblemNotFoundError
        if (error instanceof ProblemNotFoundError) {
          throw new Error(`문제를 찾을 수 없습니다: ${(input as GenerateHintInput).problem_id}번`);
        }

        // 기타 에러
        throw error;
      }
    },
  };
}
