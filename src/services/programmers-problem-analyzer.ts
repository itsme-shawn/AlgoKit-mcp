/**
 * ProgrammersProblemAnalyzer 서비스
 *
 * 프로그래머스 문제 분석 및 힌트 가이드 생성 (프롬프트 기반 아키텍처)
 *
 * ProblemAnalyzer(BOJ)와 동일한 역할이지만
 * ProgrammersScraper와 프로그래머스 전용 타입을 사용합니다.
 */

import type { ProgrammersScraper } from '../api/programmers-scraper.js';
import type { ProgrammersProblemDetail } from '../types/programmers.js';
import type {
  ProgrammersProblemAnalysis,
  ProgrammersDifficultyContext,
} from '../types/analysis.js';
import { buildProgrammersHintGuide } from '../prompts/programmers-hint-guide.js';

/**
 * 레벨별 난이도 정보 맵
 */
const LEVEL_INFO: Record<number, { description: string; emoji: string }> = {
  0: { description: '입문', emoji: '🟢' },
  1: { description: '초급', emoji: '🟡' },
  2: { description: '중급', emoji: '🟠' },
  3: { description: '중상급', emoji: '🔴' },
  4: { description: '고급', emoji: '🟣' },
  5: { description: '최고급', emoji: '⚫' },
};

/**
 * ProgrammersProblemAnalyzer 클래스
 */
export class ProgrammersProblemAnalyzer {
  constructor(private scraper: ProgrammersScraper) {}

  /**
   * 문제 분석 및 힌트 가이드 생성
   */
  async analyze(
    problemId: string,
    _includeSimilar = true,
  ): Promise<ProgrammersProblemAnalysis> {
    // 1. 문제 정보 조회
    const problem = await this.scraper.getProblem(problemId);

    // 2. 난이도 컨텍스트 생성
    const difficulty = this.buildDifficultyContext(problem);

    // 3. 힌트 가이드 생성
    const hintGuide = buildProgrammersHintGuide(problem, difficulty);

    return {
      problem,
      difficulty,
      similar_problems: [],
      hint_guide: hintGuide,
    };
  }

  /**
   * 난이도 컨텍스트 빌드
   */
  private buildDifficultyContext(
    problem: ProgrammersProblemDetail,
  ): ProgrammersDifficultyContext {
    const level = problem.level;
    const info = LEVEL_INFO[level] || LEVEL_INFO[0];
    const levelLabel = `Lv. ${level}`;
    const category = problem.category || '기타';
    const context = `${levelLabel} 난이도의 ${category} 문제`;

    return {
      levelLabel,
      level,
      emoji: info.emoji,
      description: info.description,
      context,
    };
  }
}
