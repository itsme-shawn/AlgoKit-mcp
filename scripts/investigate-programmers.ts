/**
 * 프로그래머스 검색 페이지 CSS Selector 조사 스크립트
 */
import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function investigateSelectors() {
  console.log('🔍 프로그래머스 검색 페이지 조사 시작...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    const testUrl =
      'https://school.programmers.co.kr/learn/challenges?order=recent&page=1&levels=1';
    console.log(`📄 페이지 로딩: ${testUrl}`);

    await page.goto(testUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    console.log('✅ 페이지 로딩 완료\n');

    // JavaScript 렌더링 대기
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 스크린샷 저장
    const screenshotPath = path.join(
      __dirname,
      '../docs/02-development/programmers-search-screenshot.png'
    );
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 스크린샷 저장: ${screenshotPath}\n`);

    // HTML 구조 분석
    console.log('🔎 HTML 구조 분석 중...\n');

    // 1. 문제 목록 컨테이너 찾기
    const containers = await page.evaluate(() => {
      const selectors = [
        'div[class*="challenge"]',
        'div[class*="problem"]',
        'div[class*="list"]',
        'ul[class*="challenge"]',
        'ul[class*="problem"]',
        'table',
        '[data-testid*="challenge"]',
        '[data-testid*="problem"]',
      ];

      const results: { selector: string; count: number; sample: string }[] = [];

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          results.push({
            selector,
            count: elements.length,
            sample:
              elements[0].className || elements[0].tagName || 'no-class',
          });
        }
      }

      return results;
    });

    console.log('📦 컨테이너 후보:\n');
    containers.forEach((c) => {
      console.log(`  - ${c.selector}: ${c.count}개 (예: ${c.sample})`);
    });

    // 2. 문제 카드/항목 찾기
    const items = await page.evaluate(() => {
      const selectors = [
        'div[class*="item"]',
        'li[class*="item"]',
        'div[class*="card"]',
        'a[href*="lessons"]',
        'tr',
      ];

      const results: { selector: string; count: number; sample: string }[] = [];

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          results.push({
            selector,
            count: elements.length,
            sample:
              elements[0].className || elements[0].tagName || 'no-class',
          });
        }
      }

      return results;
    });

    console.log('\n📝 문제 항목 후보:\n');
    items.forEach((i) => {
      console.log(`  - ${i.selector}: ${i.count}개 (예: ${i.sample})`);
    });

    // 3. 첫 번째 문제의 상세 정보 추출
    console.log('\n🎯 첫 번째 문제 정보 추출 시도...\n');

    const firstProblem = await page.evaluate(() => {
      // 여러 패턴 시도
      const possibleSelectors = [
        'a[href*="/learn/courses/"][href*="/lessons/"]',
        'div[class*="challenge-item"]',
        'li[class*="challenge"]',
        'tr',
      ];

      for (const selector of possibleSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          const first = elements[0] as HTMLElement;
          return {
            selector,
            outerHTML: first.outerHTML.substring(0, 500) + '...',
            textContent: first.textContent?.substring(0, 200),
            classList: Array.from(first.classList),
            children: Array.from(first.children).map((c) => ({
              tag: c.tagName,
              class: c.className,
            })),
          };
        }
      }

      return null;
    });

    if (firstProblem) {
      console.log('✅ 첫 번째 문제 발견:');
      console.log(`  Selector: ${firstProblem.selector}`);
      console.log(`  Classes: ${firstProblem.classList.join(', ')}`);
      console.log(`  Text: ${firstProblem.textContent?.substring(0, 100)}...`);
      console.log('\n  자식 요소:');
      firstProblem.children.forEach((c) => {
        console.log(`    - <${c.tag}> class="${c.class}"`);
      });
      console.log('\n  HTML 샘플:');
      console.log(firstProblem.outerHTML);
    } else {
      console.log('❌ 문제를 찾을 수 없습니다');
    }

    // 4. 페이지 전체 HTML 저장 (디버깅용)
    const html = await page.content();
    const htmlPath = path.join(
      __dirname,
      '../docs/02-development/programmers-search-page.html'
    );
    fs.writeFileSync(htmlPath, html);
    console.log(`\n💾 HTML 저장: ${htmlPath}`);

    // 5. 특정 요소 검색 (추가 조사)
    console.log('\n🔍 추가 요소 검색...\n');

    const additionalInfo = await page.evaluate(() => {
      return {
        titles: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
          .slice(0, 10)
          .map((el) => ({
            tag: el.tagName,
            text: el.textContent?.substring(0, 50),
            class: el.className,
          })),
        links: Array.from(document.querySelectorAll('a[href*="lessons"]'))
          .slice(0, 5)
          .map((el) => ({
            href: (el as HTMLAnchorElement).href,
            text: el.textContent?.substring(0, 50),
            class: el.className,
          })),
        levels: Array.from(
          document.querySelectorAll(
            '[class*="level"], [class*="difficulty"], [class*="tier"]'
          )
        )
          .slice(0, 5)
          .map((el) => ({
            text: el.textContent,
            class: el.className,
          })),
      };
    });

    console.log('📌 제목 요소:');
    additionalInfo.titles.forEach((t) => {
      console.log(`  ${t.tag}: "${t.text}" (class: ${t.class})`);
    });

    console.log('\n🔗 문제 링크:');
    additionalInfo.links.forEach((l) => {
      console.log(`  "${l.text}"`);
      console.log(`  → ${l.href}`);
      console.log(`  class: ${l.class}\n`);
    });

    console.log('⭐ 난이도 요소:');
    additionalInfo.levels.forEach((l) => {
      console.log(`  "${l.text}" (class: ${l.class})`);
    });

    console.log('\n✅ 조사 완료!');
  } catch (error) {
    console.error('❌ 에러 발생:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

investigateSelectors().catch(console.error);
