/**
 * ReviewTemplateGenerator 서비스
 *
 * 복습 템플릿 및 가이드 생성 (Keyless Architecture)
 */

import type { SolvedAcClient } from '../api/solvedac-client.js';
import type { Problem } from '../api/types.js';
import type {
  ReviewTemplate,
  ProblemData,
  AnalysisInfo,
  GuidePrompts,
  ProblemAnalysis,
  AlgorithmInfo,
  DifficultyContext,
} from '../types/analysis.js';
import { ProblemAnalyzer } from './problem-analyzer.js';
import { getTierBadge } from '../utils/tier-converter.js';

/**
 * ReviewTemplateGenerator 클래스
 */
export class ReviewTemplateGenerator {
  constructor(
    private apiClient: SolvedAcClient,
    private analyzer: ProblemAnalyzer
  ) {}

  /**
   * 복습 템플릿 생성
   */
  async generate(
    problemId: number,
    userNotes?: string
  ): Promise<ReviewTemplate> {
    // 1. 문제 분석 (ProblemAnalyzer 재사용)
    const analysis = await this.analyzer.analyze(problemId, true);

    // 2. 마크다운 템플릿 생성
    const template = this.buildMarkdownTemplate(analysis, userNotes);

    // 3. 문제 데이터 추출
    const problemData = this.extractProblemData(analysis.problem);

    // 4. 분석 정보 구조화
    const analysisInfo = this.structureAnalysis(analysis);

    // 5. 가이드 프롬프트 생성
    const prompts = this.generatePrompts(analysis);

    return {
      template,
      problem_data: problemData,
      analysis: analysisInfo,
      related_problems: analysis.similar_problems,
      prompts,
    };
  }

  /**
   * 마크다운 템플릿 빌드
   */
  private buildMarkdownTemplate(
    analysis: ProblemAnalysis,
    userNotes?: string
  ): string {
    const { problem, difficulty, algorithm } = analysis;

    let md = `# ${problem.problemId}. ${problem.titleKo}\n\n`;

    // 문제 정보
    md += `## 문제 정보\n\n`;
    md += `**티어**: ${difficulty.emoji} ${difficulty.tier}\n`;
    md += `**태그**: ${algorithm.primary_tags.join(', ') || '태그 정보 없음'}\n`;
    md += `**링크**: [BOJ ${problem.problemId}](https://www.acmicpc.net/problem/${problem.problemId})\n`;
    md += `**해결자 수**: ${problem.acceptedUserCount.toLocaleString()}명\n`;
    md += `**평균 시도**: ${problem.averageTries.toFixed(1)}회\n\n`;

    // 사용자 메모 (있으면)
    if (userNotes) {
      md += `## 초기 메모\n\n${userNotes}\n\n`;
    }

    // 풀이 접근법 (빈 섹션)
    md += `## 풀이 접근법\n\n`;
    md += `[여기에 풀이 방법을 작성해주세요]\n\n`;

    // 복잡도 분석 (빈 섹션)
    md += `## 시간/공간 복잡도\n\n`;
    md += `- **시간 복잡도**: [작성 예정]\n`;
    md += `- **공간 복잡도**: [작성 예정]\n\n`;

    // 핵심 인사이트 (빈 섹션)
    md += `## 핵심 인사이트\n\n`;
    md += `[작성 예정]\n\n`;

    // 어려웠던 점 (빈 섹션)
    md += `## 어려웠던 점\n\n`;
    md += `[작성 예정]\n\n`;

    // 관련 문제 (자동 생성)
    md += `## 관련 문제\n\n`;
    if (analysis.similar_problems.length > 0) {
      analysis.similar_problems.forEach(p => {
        const tier = getTierBadge(p.level);
        md += `- [${p.problemId}. ${p.titleKo}](https://www.acmicpc.net/problem/${p.problemId}) (${tier})\n`;
      });
    } else {
      md += `관련 문제를 찾을 수 없습니다.\n`;
    }
    md += `\n`;

    // 해결 날짜
    const today = new Date().toISOString().split('T')[0];
    md += `## 해결 날짜\n\n`;
    md += `${today}\n`;

    return md;
  }

  /**
   * 문제 데이터 추출
   */
  private extractProblemData(problem: Problem): ProblemData {
    const tier = getTierBadge(problem.level);
    const tags = problem.tags.map(tag =>
      tag.displayNames.find(dn => dn.language === 'ko')?.name || tag.key
    );

    return {
      id: problem.problemId,
      title: problem.titleKo,
      tier,
      tags,
      stats: {
        acceptedUserCount: problem.acceptedUserCount,
        averageTries: problem.averageTries,
      },
    };
  }

  /**
   * 분석 정보 구조화
   */
  private structureAnalysis(analysis: ProblemAnalysis): AnalysisInfo {
    // 일반적인 실수 생성
    const commonMistakes = this.generateCommonMistakes(analysis);

    return {
      tags_explanation: analysis.algorithm.tag_explanations,
      difficulty_context: analysis.difficulty.context,
      common_approaches: analysis.algorithm.typical_approaches,
      time_complexity_typical: analysis.algorithm.time_complexity_typical,
      space_complexity_typical: analysis.algorithm.space_complexity_typical,
      common_mistakes: commonMistakes,
    };
  }

  /**
   * 일반적인 실수 생성
   */
  private generateCommonMistakes(analysis: ProblemAnalysis): string[] {
    const mistakes: string[] = [];

    // Gotchas에서 추출
    for (const gotcha of analysis.gotchas) {
      mistakes.push(gotcha.description);
    }

    // 난이도에 따른 일반적인 실수
    if (analysis.difficulty.level <= 5) {
      mistakes.push('입출력 형식 오류');
    } else if (analysis.difficulty.level <= 10) {
      mistakes.push('경계 조건 처리 누락');
    } else {
      mistakes.push('시간 복잡도 최적화 부족');
    }

    return mistakes;
  }

  /**
   * 가이드 프롬프트 생성
   */
  private generatePrompts(analysis: ProblemAnalysis): GuidePrompts {
    const { difficulty, algorithm } = analysis;

    return {
      solution_approach: this.buildSolutionPrompt(algorithm),
      time_complexity: this.buildComplexityPrompt(algorithm),
      space_complexity: this.buildSpacePrompt(algorithm),
      key_insights: this.buildInsightPrompt(difficulty, algorithm),
      difficulties: this.buildDifficultyPrompt(difficulty),
    };
  }

  /**
   * 풀이 접근법 프롬프트
   */
  private buildSolutionPrompt(algorithm: AlgorithmInfo): string {
    const primaryTag = algorithm.primary_tags[0] || '알고리즘';
    return `이 문제를 어떻게 해결했나요? ${primaryTag} 접근법을 사용했다면 어떤 방식으로 적용했는지 설명해주세요.`;
  }

  /**
   * 시간 복잡도 프롬프트
   */
  private buildComplexityPrompt(algorithm: AlgorithmInfo): string {
    const typical = algorithm.time_complexity_typical;
    return `이 풀이의 시간 복잡도를 분석해주세요. 일반적으로 ${algorithm.typical_approaches[0] || '이 접근법'}는 ${typical} 정도입니다.`;
  }

  /**
   * 공간 복잡도 프롬프트
   */
  private buildSpacePrompt(algorithm: AlgorithmInfo): string {
    const typical = algorithm.space_complexity_typical;
    return `추가로 사용한 메모리가 있나요? 공간 복잡도를 분석해보세요. 일반적으로 ${typical} 정도입니다.`;
  }

  /**
   * 핵심 인사이트 프롬프트
   */
  private buildInsightPrompt(
    difficulty: { context: string },
    algorithm: AlgorithmInfo
  ): string {
    const primaryTag = algorithm.primary_tags[0] || '알고리즘';
    return `이 문제에서 배운 ${primaryTag}의 핵심 개념은 무엇인가요? 어떤 점을 발견했나요?`;
  }

  /**
   * 어려웠던 점 프롬프트
   */
  private buildDifficultyPrompt(difficulty: { context: string }): string {
    return `문제를 풀면서 어려웠던 부분이 있었나요? 예를 들어, 알고리즘 선택, 구현 상의 어려움, 디버깅 등이 있을 수 있습니다.`;
  }
}
