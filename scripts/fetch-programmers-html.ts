/**
 * Puppeteer로 프로그래머스 HTML 가져와서 저장
 */
import puppeteer from 'puppeteer';
import fs from 'fs/promises';

async function main() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const url = 'https://school.programmers.co.kr/learn/courses/30/lessons/389632';
  console.log(`📥 ${url} 로딩 중...`);

  await page.goto(url, { waitUntil: 'networkidle2' });

  const html = await page.content();
  await fs.writeFile('programmers-problem-sample.html', html, 'utf-8');

  console.log(`✅ HTML 저장 완료: ${html.length} bytes`);
  console.log(`파일: programmers-problem-sample.html`);

  await browser.close();
}

main().catch(console.error);
