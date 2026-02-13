#!/usr/bin/env node

/**
 * cote-mcp-server
 * 백준 온라인 저지 알고리즘 문제 학습을 돕는 MCP 서버
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

// 도구 임포트
import {
  searchProblems,
  SearchProblemsInputSchema,
} from './tools/search-problems.js';
import {
  getProblem,
  GetProblemInputSchema,
} from './tools/get-problem.js';
import {
  searchTags,
  SearchTagsInputSchema,
} from './tools/search-tags.js';
import {
  analyzeProblemTool,
  AnalyzeProblemInputSchema,
} from './tools/analyze-problem.js';
import {
  generateReviewTemplateTool,
  GenerateReviewTemplateInputSchema,
} from './tools/generate-review-template.js';

// 서비스 임포트
import { SolvedAcClient } from './api/solvedac-client.js';
import { ProblemAnalyzer } from './services/problem-analyzer.js';
import { ReviewTemplateGenerator } from './services/review-template-generator.js';

/**
 * 서비스 초기화
 */
const apiClient = new SolvedAcClient();
const problemAnalyzer = new ProblemAnalyzer(apiClient);
const reviewTemplateGenerator = new ReviewTemplateGenerator(apiClient, problemAnalyzer);

// 도구 객체 생성
const analyzeProblemToolObj = analyzeProblemTool(problemAnalyzer);
const generateReviewTemplateToolObj = generateReviewTemplateTool(reviewTemplateGenerator);

/**
 * MCP 서버 초기화
 */
const server = new Server(
  {
    name: 'cote-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * 도구 목록 제공
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_problems',
        description:
          'BOJ 문제를 검색합니다. 키워드, 난이도 레벨, 알고리즘 태그로 필터링할 수 있습니다. ' +
          '예: Gold 티어의 DP 문제 검색, Silver 이하 그리디 문제 검색 등',
        inputSchema: zodToJsonSchema(SearchProblemsInputSchema as any) as any,
      },
      {
        name: 'get_problem',
        description:
          '특정 BOJ 문제의 상세 정보를 조회합니다. 문제 번호로 난이도, 태그, 통계 등을 확인할 수 있습니다.',
        inputSchema: zodToJsonSchema(GetProblemInputSchema as any) as any,
      },
      {
        name: 'search_tags',
        description:
          '알고리즘 태그를 검색합니다. 한글 또는 영문 키워드로 관련 태그를 찾을 수 있습니다. ' +
          '예: "다이나믹", "그래프", "이분 탐색" 등',
        inputSchema: zodToJsonSchema(SearchTagsInputSchema as any) as any,
      },
      {
        name: 'analyze_problem',
        description:
          'BOJ 문제를 분석하고 구조화된 힌트 데이터를 제공합니다. ' +
          '3단계 힌트 포인트, 난이도 컨텍스트, 알고리즘 정보, 유사 문제 추천을 포함합니다.',
        inputSchema: zodToJsonSchema(AnalyzeProblemInputSchema as any) as any,
      },
      {
        name: 'generate_review_template',
        description:
          'BOJ 문제 복습을 위한 마크다운 템플릿과 가이드 프롬프트를 생성합니다. ' +
          '템플릿을 기반으로 대화형으로 복습 문서를 작성할 수 있습니다.',
        inputSchema: zodToJsonSchema(GenerateReviewTemplateInputSchema as any) as any,
      },
      {
        name: 'health_check',
        description: 'MCP 서버 상태 확인',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

/**
 * 도구 호출 핸들러
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'search_problems': {
        const input = SearchProblemsInputSchema.parse(args);
        const result = await searchProblems(input);
        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      }

      case 'get_problem': {
        const input = GetProblemInputSchema.parse(args);
        const result = await getProblem(input);
        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      }

      case 'search_tags': {
        const input = SearchTagsInputSchema.parse(args);
        const result = await searchTags(input);
        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      }

      case 'analyze_problem': {
        const input = AnalyzeProblemInputSchema.parse(args);
        const result = await analyzeProblemToolObj.handler(input);
        return {
          content: [result],
        };
      }

      case 'generate_review_template': {
        const input = GenerateReviewTemplateInputSchema.parse(args);
        const result = await generateReviewTemplateToolObj.handler(input);
        return {
          content: [result],
        };
      }

      case 'health_check': {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'ok',
                  timestamp: new Date().toISOString(),
                  server: 'cote-mcp-server',
                  version: '1.0.0',
                  tools: [
                    'search_problems',
                    'get_problem',
                    'search_tags',
                    'analyze_problem',
                    'generate_review_template',
                    'health_check'
                  ],
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    // 에러 처리
    if (error instanceof Error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ 오류: ${error.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: '❌ 알 수 없는 오류가 발생했습니다.',
        },
      ],
      isError: true,
    };
  }
});

/**
 * 서버 시작
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
