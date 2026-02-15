/**
 * ProgrammersReviewTemplateGenerator 서비스
 *
 * 프로그래머스 문제 복습 템플릿 및 가이드 생성 (프롬프트 기반 아키텍처)
 */

import type {
  ProgrammersReviewTemplate,
  ProgrammersProblemData,
  ProgrammersProblemAnalysis,
} from '../types/analysis.js';
import { ProgrammersProblemAnalyzer } from './programmers-problem-analyzer.js';

/**
 * ProgrammersReviewTemplateGenerator 클래스
 */
export class ProgrammersReviewTemplateGenerator {
  constructor(private analyzer: ProgrammersProblemAnalyzer) {}

  /**
   * 복습 템플릿 생성
   */
  async generate(
    problemId: string,
    userNotes?: string,
  ): Promise<ProgrammersReviewTemplate> {
    // 1. 문제 분석
    const analysis = await this.analyzer.analyze(problemId, false);

    // 2. 마크다운 템플릿 생성
    const template = this.buildMarkdownTemplate(analysis, userNotes);

    // 3. 문제 데이터 추출
    const problemData = this.extractProblemData(analysis);

    return {
      template,
      problem_data: problemData,
      related_problems: [],
      hint_guide: analysis.hint_guide,
      guideline_uri: 'algokit://review-guideline',
      guideline_summary: {
        structure: [
          '문제 정보',
          '사고흐름',
          '핵심아이디어',
          '풀이 (내 코드 + AI 모범답안)',
          '비슷한 문제에서의 사고과정',
          '정리 요약',
        ],
        key_rules: [
          '전체 코드 먼저, 이후 설명과 코드 블록 병행',
          '자료구조 상태 변화 단계별 추적 (Trace)',
          '비슷한 문제 패턴 일반화',
          '자주 하는 실수/오해 포인트 명시',
          '각 섹션 끝에 구분선(---) 삽입',
        ],
      },
      suggested_filename: `programmers_${problemId}_REVIEW.md`,
    };
  }

  /**
   * 마크다운 템플릿 빌드 (7단계 가이드라인 준수)
   */
  private buildMarkdownTemplate(
    analysis: ProgrammersProblemAnalysis,
    userNotes?: string,
  ): string {
    const { problem, difficulty } = analysis;
    const tags = problem.tags.length > 0 ? problem.tags.join(', ') : '태그 정보 없음';
    const url = `https://school.programmers.co.kr/learn/courses/30/lessons/${problem.problemId}`;

    // 1. 문서 제목
    let md = `# Programmers ${problem.problemId} — ${problem.title}\n\n`;
    md += `(${difficulty.levelLabel}) <${url}>\n\n`;

    // 2. 문제 정보
    md += `## 문제 정보\n\n`;
    md += `**핵심 요구사항**: [문제의 핵심 요구사항 작성]\n\n`;
    md += `**제약 조건**:\n`;
    if (problem.constraints.length > 0) {
      for (const constraint of problem.constraints) {
        md += `- ${constraint}\n`;
      }
    } else {
      md += `- [제한사항 작성]\n`;
    }
    md += `\n`;
    md += `**메타데이터**:\n`;
    md += `- 난이도: ${difficulty.emoji} ${difficulty.levelLabel} (${difficulty.description})\n`;
    md += `- 카테고리: ${problem.category || '기타'}\n`;
    md += `- 태그: ${tags}\n\n`;
    md += `---\n\n`;

    // 3. 사고흐름
    md += `## 사고흐름\n\n`;
    md += `1. **첫 인상**: [문제를 보고 떠오른 첫 생각]\n`;
    md += `2. **자료구조/알고리즘 선택**: [어떤 자료구조나 알고리즘을 떠올렸는지]\n`;
    md += `   - 선택 근거: [왜 이 방법을 선택했는지]\n`;
    md += `3. **특이 조건 처리**: [예외 케이스나 특수 조건 처리 방법]\n`;
    md += `4. **시간 복잡도 검증**: [예상 시간 복잡도가 제한 조건을 만족하는지 확인]\n\n`;
    md += `---\n\n`;

    // 4. 핵심아이디어
    md += `## 핵심아이디어\n\n`;
    md += `**[이 문제의 가장 중요한 기술적 포인트를 한 문단으로 요약]**\n\n`;
    md += `---\n\n`;

    // 5. 풀이
    md += `## 풀이\n\n`;
    md += `### 풀이 1 (내 코드)\n\n`;
    md += `\`\`\`python\n`;
    md += `# 여기에 코드를 붙여넣으세요\n`;
    md += `\`\`\`\n\n`;
    md += `#### 핵심 포인트\n`;
    md += `- [코드에서 주의 깊게 봐야 할 구현 요소 1]\n`;
    md += `- [코드에서 주의 깊게 봐야 할 구현 요소 2]\n\n`;
    md += `#### 로직 설명\n\n`;
    md += `**[핵심 로직 제목]**\n\n`;
    md += `\`\`\`python\n`;
    md += `# 설명할 코드 부분만 발췌\n`;
    md += `\`\`\`\n\n`;
    md += `[위 코드에 대한 설명]\n\n`;
    md += `**입력 예시로 데이터 흐름 추적**:\n`;
    md += `\`\`\`\n`;
    md += `입력: ...\n`;
    md += `단계 1: [자료구조 상태]\n`;
    md += `단계 2: [자료구조 상태]\n`;
    md += `...\n`;
    md += `\`\`\`\n\n`;
    md += `#### 장단점\n`;
    md += `- **장점**: [시간/공간 효율성]\n`;
    md += `- **단점**: [구현 난이도]\n\n`;

    if (userNotes) {
      md += `#### 초기 메모\n\n${userNotes}\n\n`;
    }

    md += `### 풀이 2 (AI 모범답안)\n\n`;
    md += `[Claude가 생성한 개선된 풀이를 여기 작성]\n\n`;
    md += `---\n\n`;

    // 6. 비슷한 문제에서의 사고과정
    md += `## 비슷한 문제에서의 사고과정\n\n`;
    md += `**패턴 일반화**:\n`;
    md += `- [이 문제에서 얻은 지식을 다른 문제에 적용하는 방법]\n\n`;
    md += `**자주 하는 실수/오해 포인트**:\n`;
    md += `- [경계 조건 실수]\n`;
    md += `- [정렬/우선순위 착각]\n`;
    md += `- [중간 상태 전파 오류]\n\n`;
    md += `---\n\n`;

    // 7. 정리 요약
    md += `## 정리 요약\n\n`;
    md += `[전체 내용을 2~3줄로 요약]\n\n`;
    md += `**핵심 키워드**: [알고리즘 패턴, 자료구조, 기억할 점]\n\n`;

    const today = new Date().toISOString().split('T')[0];
    md += `**작성일**: ${today}\n`;

    return md;
  }

  /**
   * 문제 데이터 추출
   */
  private extractProblemData(
    analysis: ProgrammersProblemAnalysis,
  ): ProgrammersProblemData {
    const { problem, difficulty } = analysis;

    return {
      id: problem.problemId,
      title: problem.title,
      level: problem.level,
      levelLabel: difficulty.levelLabel,
      category: problem.category || '기타',
      tags: problem.tags,
    };
  }
}
