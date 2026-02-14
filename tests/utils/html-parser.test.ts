/**
 * HTML Parser 테스트
 *
 * Phase 6 - P6-002: 문제 본문 스크래퍼 구현
 */

import { describe, it, expect } from 'vitest';
import {
  parseProblemContent,
  decodeHtmlEntities,
  HtmlParseError,
} from '../../src/utils/html-parser.js';

describe('HTML Parser', () => {
  describe('parseProblemContent', () => {
    it('완전한 HTML을 올바르게 파싱한다', () => {
      const html = `
        <html>
          <head><title>1000번: A+B</title></head>
          <body>
            <div id="problem_title">A+B</div>
            <div id="problem_description">
              <p>두 정수 A와 B를 입력받은 다음, A+B를 출력하는 프로그램을 작성하시오.</p>
            </div>
            <div id="problem_input">
              <p>첫째 줄에 A와 B가 주어진다. (0 &lt; A, B &lt; 10)</p>
            </div>
            <div id="problem_output">
              <p>첫째 줄에 A+B를 출력한다.</p>
            </div>
            <pre id="sample-input-1">1 2</pre>
            <pre id="sample-output-1">3</pre>
            <table id="problem-info">
              <tbody>
                <tr>
                  <td>2 초 </td>
                  <td>128 MB</td>
                </tr>
              </tbody>
            </table>
          </body>
        </html>
      `;

      const content = parseProblemContent(html, 1000);

      expect(content.problemId).toBe(1000);
      expect(content.title).toBe('A+B');
      expect(content.description).toContain('두 정수');
      expect(content.inputFormat).toContain('첫째 줄');
      expect(content.outputFormat).toContain('A+B를 출력');
      expect(content.examples).toHaveLength(1);
      expect(content.examples[0].input).toBe('1 2');
      expect(content.examples[0].output).toBe('3');
      expect(content.limits.timeLimit).toContain('2');
      expect(content.limits.memoryLimit).toContain('128');
      expect(content.metadata.source).toBe('web');
      expect(content.metadata.fetchedAt).toBeTruthy();
      expect(content.metadata.cacheExpiresAt).toBeTruthy();
    });

    it('여러 예제를 올바르게 파싱한다', () => {
      const html = `
        <html>
          <body>
            <div id="problem_title">두 수 비교하기</div>
            <div id="problem_description">두 수를 비교하세요.</div>
            <div id="problem_input">입력</div>
            <div id="problem_output">출력</div>
            <pre id="sample-input-1">1 2</pre>
            <pre id="sample-output-1">&lt;</pre>
            <pre id="sample-input-2">10 2</pre>
            <pre id="sample-output-2">&gt;</pre>
            <pre id="sample-input-3">5 5</pre>
            <pre id="sample-output-3">==</pre>
            <table id="problem-info">
              <tbody>
                <tr>
                  <td>1 초</td>
                  <td>256 MB</td>
                </tr>
              </tbody>
            </table>
          </body>
        </html>
      `;

      const content = parseProblemContent(html, 1330);

      expect(content.examples).toHaveLength(3);
      expect(content.examples[0]).toEqual({ input: '1 2', output: '<' });
      expect(content.examples[1]).toEqual({ input: '10 2', output: '>' });
      expect(content.examples[2]).toEqual({ input: '5 5', output: '==' });
    });

    it('공백이 많은 텍스트를 정규화한다', () => {
      const html = `
        <html>
          <body>
            <div id="problem_title">  제목   </div>
            <div id="problem_description">
              여러
              줄로
              나뉜
              텍스트
            </div>
            <div id="problem_input">   입력   형식   </div>
            <div id="problem_output">   출력   형식   </div>
            <pre id="sample-input-1">1</pre>
            <pre id="sample-output-1">2</pre>
            <table id="problem-info">
              <tbody>
                <tr>
                  <td>1 초</td>
                  <td>128 MB</td>
                </tr>
              </tbody>
            </table>
          </body>
        </html>
      `;

      const content = parseProblemContent(html, 1000);

      expect(content.title).toBe('제목');
      expect(content.description).toBe('여러 줄로 나뉜 텍스트');
      expect(content.inputFormat).toBe('입력 형식');
      expect(content.outputFormat).toBe('출력 형식');
    });

    it('HTML 엔티티를 올바르게 처리한다', () => {
      const html = `
        <html>
          <body>
            <div id="problem_title">부등호</div>
            <div id="problem_description">
              <p>0 &lt; A, B &lt; 10 범위의 수를 입력받습니다.</p>
            </div>
            <div id="problem_input">입력</div>
            <div id="problem_output">출력</div>
            <pre id="sample-input-1">1 2</pre>
            <pre id="sample-output-1">&lt;</pre>
            <table id="problem-info">
              <tbody>
                <tr>
                  <td>1 초</td>
                  <td>128 MB</td>
                </tr>
              </tbody>
            </table>
          </body>
        </html>
      `;

      const content = parseProblemContent(html, 1000);

      // cheerio는 자동으로 HTML 엔티티를 디코딩
      expect(content.description).toContain('<');
      expect(content.examples[0].output).toBe('<');
    });
  });

  describe('에러 케이스', () => {
    it('제목이 없으면 에러를 던진다', () => {
      const html = `
        <html>
          <body>
            <div id="problem_description">설명</div>
            <div id="problem_input">입력</div>
            <div id="problem_output">출력</div>
            <pre id="sample-input-1">1</pre>
            <pre id="sample-output-1">2</pre>
            <table id="problem-info">
              <tbody><tr><td>1 초</td><td>128 MB</td></tr></tbody>
            </table>
          </body>
        </html>
      `;

      expect(() => parseProblemContent(html, 1000)).toThrow(HtmlParseError);
      expect(() => parseProblemContent(html, 1000)).toThrow(/제목/);
    });

    it('설명이 없으면 에러를 던진다', () => {
      const html = `
        <html>
          <body>
            <div id="problem_title">제목</div>
            <div id="problem_input">입력</div>
            <div id="problem_output">출력</div>
            <pre id="sample-input-1">1</pre>
            <pre id="sample-output-1">2</pre>
            <table id="problem-info">
              <tbody><tr><td>1 초</td><td>128 MB</td></tr></tbody>
            </table>
          </body>
        </html>
      `;

      expect(() => parseProblemContent(html, 1000)).toThrow(HtmlParseError);
      expect(() => parseProblemContent(html, 1000)).toThrow(/설명/);
    });

    it('입력 형식이 없으면 에러를 던진다', () => {
      const html = `
        <html>
          <body>
            <div id="problem_title">제목</div>
            <div id="problem_description">설명</div>
            <div id="problem_output">출력</div>
            <pre id="sample-input-1">1</pre>
            <pre id="sample-output-1">2</pre>
            <table id="problem-info">
              <tbody><tr><td>1 초</td><td>128 MB</td></tr></tbody>
            </table>
          </body>
        </html>
      `;

      expect(() => parseProblemContent(html, 1000)).toThrow(HtmlParseError);
      expect(() => parseProblemContent(html, 1000)).toThrow(/입력/);
    });

    it('출력 형식이 없으면 에러를 던진다', () => {
      const html = `
        <html>
          <body>
            <div id="problem_title">제목</div>
            <div id="problem_description">설명</div>
            <div id="problem_input">입력</div>
            <pre id="sample-input-1">1</pre>
            <pre id="sample-output-1">2</pre>
            <table id="problem-info">
              <tbody><tr><td>1 초</td><td>128 MB</td></tr></tbody>
            </table>
          </body>
        </html>
      `;

      expect(() => parseProblemContent(html, 1000)).toThrow(HtmlParseError);
      expect(() => parseProblemContent(html, 1000)).toThrow(/출력/);
    });

    it('예제가 없으면 에러를 던진다', () => {
      const html = `
        <html>
          <body>
            <div id="problem_title">제목</div>
            <div id="problem_description">설명</div>
            <div id="problem_input">입력</div>
            <div id="problem_output">출력</div>
            <table id="problem-info">
              <tbody><tr><td>1 초</td><td>128 MB</td></tr></tbody>
            </table>
          </body>
        </html>
      `;

      expect(() => parseProblemContent(html, 1000)).toThrow(HtmlParseError);
      expect(() => parseProblemContent(html, 1000)).toThrow(/예제/);
    });

    it('시간 제한이 없으면 에러를 던진다', () => {
      const html = `
        <html>
          <body>
            <div id="problem_title">제목</div>
            <div id="problem_description">설명</div>
            <div id="problem_input">입력</div>
            <div id="problem_output">출력</div>
            <pre id="sample-input-1">1</pre>
            <pre id="sample-output-1">2</pre>
            <table id="problem-info">
              <tbody><tr><td></td><td>128 MB</td></tr></tbody>
            </table>
          </body>
        </html>
      `;

      expect(() => parseProblemContent(html, 1000)).toThrow(HtmlParseError);
      expect(() => parseProblemContent(html, 1000)).toThrow(/제한/);
    });

    it('메모리 제한이 없으면 에러를 던진다', () => {
      const html = `
        <html>
          <body>
            <div id="problem_title">제목</div>
            <div id="problem_description">설명</div>
            <div id="problem_input">입력</div>
            <div id="problem_output">출력</div>
            <pre id="sample-input-1">1</pre>
            <pre id="sample-output-1">2</pre>
            <table id="problem-info">
              <tbody><tr><td>1 초</td><td></td></tr></tbody>
            </table>
          </body>
        </html>
      `;

      expect(() => parseProblemContent(html, 1000)).toThrow(HtmlParseError);
      expect(() => parseProblemContent(html, 1000)).toThrow(/제한/);
    });
  });

  describe('경계 케이스', () => {
    it('예제가 10개를 초과하면 10개까지만 파싱한다', () => {
      let html = `
        <html>
          <body>
            <div id="problem_title">제목</div>
            <div id="problem_description">설명</div>
            <div id="problem_input">입력</div>
            <div id="problem_output">출력</div>
      `;

      // 15개 예제 생성
      for (let i = 1; i <= 15; i++) {
        html += `<pre id="sample-input-${i}">${i}</pre>`;
        html += `<pre id="sample-output-${i}">${i * 2}</pre>`;
      }

      html += `
            <table id="problem-info">
              <tbody><tr><td>1 초</td><td>128 MB</td></tr></tbody>
            </table>
          </body>
        </html>
      `;

      const content = parseProblemContent(html, 1000);

      // 최대 10개까지만
      expect(content.examples).toHaveLength(10);
      expect(content.examples[9].input).toBe('10');
      expect(content.examples[9].output).toBe('20');
    });

    it('빈 HTML에서는 에러를 던진다', () => {
      const html = '<html><body></body></html>';

      expect(() => parseProblemContent(html, 1000)).toThrow(HtmlParseError);
    });
  });

  describe('decodeHtmlEntities', () => {
    it('HTML 엔티티를 올바르게 디코딩한다', () => {
      expect(decodeHtmlEntities('&lt;')).toBe('<');
      expect(decodeHtmlEntities('&gt;')).toBe('>');
      expect(decodeHtmlEntities('&amp;')).toBe('&');
      expect(decodeHtmlEntities('&quot;')).toBe('"');
      expect(decodeHtmlEntities('&#39;')).toBe("'");
      expect(decodeHtmlEntities('&nbsp;')).toBe(' ');
    });

    it('여러 엔티티를 포함한 문자열을 디코딩한다', () => {
      const input = '0 &lt; A &amp; B &lt; 10';
      const expected = '0 < A & B < 10';
      expect(decodeHtmlEntities(input)).toBe(expected);
    });

    it('엔티티가 없는 문자열은 그대로 반환한다', () => {
      const input = 'Hello World';
      expect(decodeHtmlEntities(input)).toBe(input);
    });

    it('알 수 없는 엔티티는 그대로 유지한다', () => {
      const input = '&unknown;';
      expect(decodeHtmlEntities(input)).toBe(input);
    });
  });

  describe('메타데이터 검증', () => {
    it('fetchedAt이 유효한 ISO 8601 날짜다', () => {
      const html = `
        <html>
          <body>
            <div id="problem_title">제목</div>
            <div id="problem_description">설명</div>
            <div id="problem_input">입력</div>
            <div id="problem_output">출력</div>
            <pre id="sample-input-1">1</pre>
            <pre id="sample-output-1">2</pre>
            <table id="problem-info">
              <tbody><tr><td>1 초</td><td>128 MB</td></tr></tbody>
            </table>
          </body>
        </html>
      `;

      const content = parseProblemContent(html, 1000);

      const fetchedAt = new Date(content.metadata.fetchedAt);
      expect(fetchedAt.toString()).not.toBe('Invalid Date');
      expect(content.metadata.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('cacheExpiresAt이 fetchedAt보다 30일 후다', () => {
      const html = `
        <html>
          <body>
            <div id="problem_title">제목</div>
            <div id="problem_description">설명</div>
            <div id="problem_input">입력</div>
            <div id="problem_output">출력</div>
            <pre id="sample-input-1">1</pre>
            <pre id="sample-output-1">2</pre>
            <table id="problem-info">
              <tbody><tr><td>1 초</td><td>128 MB</td></tr></tbody>
            </table>
          </body>
        </html>
      `;

      const content = parseProblemContent(html, 1000);

      const fetchedAt = new Date(content.metadata.fetchedAt);
      const expiresAt = new Date(content.metadata.cacheExpiresAt);

      const diffMs = expiresAt.getTime() - fetchedAt.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      expect(diffDays).toBeCloseTo(30, 0);
    });

    it('source가 web로 설정된다', () => {
      const html = `
        <html>
          <body>
            <div id="problem_title">제목</div>
            <div id="problem_description">설명</div>
            <div id="problem_input">입력</div>
            <div id="problem_output">출력</div>
            <pre id="sample-input-1">1</pre>
            <pre id="sample-output-1">2</pre>
            <table id="problem-info">
              <tbody><tr><td>1 초</td><td>128 MB</td></tr></tbody>
            </table>
          </body>
        </html>
      `;

      const content = parseProblemContent(html, 1000);

      expect(content.metadata.source).toBe('web');
    });
  });
});
