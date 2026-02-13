/**
 * generate-review-template MCP 도구
 *
 * 복습 템플릿 및 가이드 제공 (Keyless Architecture)
 */

import { z } from 'zod';
import type { ReviewTemplateGenerator } from '../services/review-template-generator.js';
import { ProblemNotFoundError } from '../api/types.js';

/**
 * 입력 스키마
 */
export const GenerateReviewTemplateInputSchema = z.object({
  problem_id: z.number().int().positive()
    .describe('백준 문제 번호'),
  user_notes: z.string().optional()
    .describe('사용자가 미리 작성한 메모 (선택)'),
});

export type GenerateReviewTemplateInput = z.infer<typeof GenerateReviewTemplateInputSchema>;

/**
 * MCP TextContent 타입
 */
interface TextContent {
  type: 'text';
  text: string;
}

/**
 * generate-review-template 도구 핸들러
 */
export function generateReviewTemplateTool(generator: ReviewTemplateGenerator) {
  return {
    name: 'generate_review_template',
    description: '백준 문제 복습 템플릿 및 작성 가이드를 제공합니다. 마크다운 템플릿, 문제 분석, 관련 문제, 작성 프롬프트를 포함합니다.',
    inputSchema: GenerateReviewTemplateInputSchema,
    handler: async (input: GenerateReviewTemplateInput): Promise<TextContent> => {
      try {
        // 입력 검증
        const { problem_id, user_notes } = GenerateReviewTemplateInputSchema.parse(input);

        // 템플릿 생성
        const template = await generator.generate(problem_id, user_notes);

        // JSON 문자열로 반환
        return {
          type: 'text',
          text: JSON.stringify(template, null, 2),
        };
      } catch (error) {
        // Zod 검증 에러
        if (error instanceof z.ZodError) {
          throw new Error(`입력 검증 실패: ${error.issues[0].message}`);
        }

        // ProblemNotFoundError
        if (error instanceof ProblemNotFoundError) {
          throw new Error(`문제를 찾을 수 없습니다: ${(input as GenerateReviewTemplateInput).problem_id}번`);
        }

        // 기타 에러
        throw error;
      }
    },
  };
}
