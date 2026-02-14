/**
 * ReviewTemplateGenerator 서비스
 *
 * 복습 템플릿 및 가이드 생성 (프롬프트 기반 아키텍처)
 */

import type { Problem } from '../api/types.js';
import type {
  ReviewTemplate,
  ProblemData,
  ProblemAnalysis,
} from '../types/analysis.js';
import { ProblemAnalyzer } from './problem-analyzer.js';
import { getTierBadge } from '../utils/tier-converter.js';

/**
 * ReviewTemplateGenerator 클래스
 */
export class ReviewTemplateGenerator {
  constructor(private analyzer: ProblemAnalyzer) {}

  /**
   * 복습 템플릿 생성
   */
  async generate(
    problemId: number,
    userNotes?: string,
  ): Promise<ReviewTemplate> {
    // 1. 문제 분석 (ProblemAnalyzer 재사용)
    const analysis = await this.analyzer.analyze(problemId, true);

    // 2. 마크다운 템플릿 생성
    const template = this.buildMarkdownTemplate(analysis, userNotes);

    // 3. 문제 데이터 추출
    const problemData = this.extractProblemData(analysis.problem);

    return {
      template,
      problem_data: problemData,
      related_problems: analysis.similar_problems,
      hint_guide: analysis.hint_guide,
    };
  }

  /**
   * 마크다운 템플릿 빌드
   */
  private buildMarkdownTemplate(
    analysis: ProblemAnalysis,
    userNotes?: string,
  ): string {
    const { problem, difficulty, tags } = analysis;
    const tagNames = tags.map(t => t.name_ko).join(', ') || '태그 정보 없음';

    let md = `# ${problem.problemId}. ${problem.titleKo}\n\n`;

    // 문제 정보
    md += `## 문제 정보\n\n`;
    md += `**티어**: ${difficulty.emoji} ${difficulty.tier}\n`;
    md += `**태그**: ${tagNames}\n`;
    md += `**링크**: [BOJ ${problem.problemId}](https://www.acmicpc.net/problem/${problem.problemId})\n`;
    md += `**해결자 수**: ${problem.acceptedUserCount.toLocaleString()}명\n`;
    md += `**평균 시도**: ${problem.averageTries.toFixed(1)}회\n\n`;

    // 사용자 메모
    if (userNotes) {
      md += `## 초기 메모\n\n${userNotes}\n\n`;
    }

    // 빈 섹션들
    md += `## 풀이 접근법\n\n[여기에 풀이 방법을 작성해주세요]\n\n`;
    md += `## 시간/공간 복잡도\n\n`;
    md += `- **시간 복잡도**: [작성 예정]\n`;
    md += `- **공간 복잡도**: [작성 예정]\n\n`;
    md += `## 핵심 인사이트\n\n[작성 예정]\n\n`;
    md += `## 어려웠던 점\n\n[작성 예정]\n\n`;

    // 관련 문제
    md += `## 관련 문제\n\n`;
    if (analysis.similar_problems.length > 0) {
      for (const p of analysis.similar_problems) {
        const tier = getTierBadge(p.level);
        md += `- [${p.problemId}. ${p.titleKo}](https://www.acmicpc.net/problem/${p.problemId}) (${tier})\n`;
      }
    } else {
      md += `관련 문제를 찾을 수 없습니다.\n`;
    }
    md += `\n`;

    // 해결 날짜
    const today = new Date().toISOString().split('T')[0];
    md += `## 해결 날짜\n\n${today}\n`;

    return md;
  }

  /**
   * 문제 데이터 추출
   */
  private extractProblemData(problem: Problem): ProblemData {
    const tier = getTierBadge(problem.level);
    const tags = problem.tags.map(
      tag =>
        tag.displayNames.find(dn => dn.language === 'ko')?.name || tag.key,
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
}
