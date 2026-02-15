/**
 * 프로그래머스 URL 파서
 *
 * URL 또는 문제 ID를 파싱하여 문제 번호를 추출합니다.
 */

/**
 * 프로그래머스 URL 파싱
 *
 * @param input - URL 또는 문제번호
 * @returns 문제번호 또는 null
 *
 * @example
 * ```typescript
 * parseProgrammersUrl('https://school.programmers.co.kr/learn/courses/30/lessons/42748')
 * // => '42748'
 *
 * parseProgrammersUrl(42748)
 * // => '42748'
 *
 * parseProgrammersUrl('42748')
 * // => '42748'
 * ```
 */
export function parseProgrammersUrl(input: string | number): string | null {
  // 1. 숫자면 문자열로 변환 후 반환
  if (typeof input === 'number') {
    return input.toString();
  }

  // 2. 빈 문자열 체크
  if (!input || input.trim() === '') {
    return null;
  }

  // 3. 이미 숫자 문자열이면 반환
  if (/^\d+$/.test(input)) {
    return input;
  }

  // 4. URL 파싱 (/lessons/숫자 패턴)
  const urlPattern = /\/lessons\/(\d+)/;
  const match = input.match(urlPattern);

  if (match && match[1]) {
    return match[1];
  }

  return null;
}
