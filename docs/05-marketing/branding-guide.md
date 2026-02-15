# AlgoKit 브랜딩 가이드

> **문서 목적**: AlgoKit 프로젝트의 핵심 메시지와 사용 가이드

**작성일**: 2026-02-15
**버전**: 2.0.0 (컴팩트)

---

## 📌 프로젝트 정의

### 이름
```
AlgoKit
```

### 한 줄 정의
```
코딩테스트 학습용 MCP Server, Skills 툴킷
```

---

## 💬 핵심 메시지

```
AlgoKit
Your AI-Powered Coding Test Companion

Claude Code와 함께하는 스마트한 코딩테스트 학습.
문제 추천부터 단계적 힌트, 자동 복기까지 —
백준/프로그래머스 알고리즘 학습을 AI 에이전트로 더 효율적으로.
```

---

## ✨ 주요 기능

- 🎯 **Smart Recommendations** — 난이도·알고리즘 기반 문제 추천
- 💡 **Stepwise Hints** — 3단계 학습 시스템 (접근→구현→정답)
- 📝 **Auto Reviews** — 대화형 복습 템플릿 자동 생성
- 🔄 **Interactive Reflection** — AI와 함께하는 체계적 복기

---

## 🚀 Quick Start (Claude Code)

### 1. MCP 서버 설치
```bash
cd /path/to/cote-mcp-server
npm install
npm run build
```

### 2. Claude Desktop 설정
`~/Library/Application Support/Claude/claude_desktop_config.json` 편집:
```json
{
  "mcpServers": {
    "algokit": {
      "command": "node",
      "args": ["/absolute/path/to/cote-mcp-server/build/index.js"]
    }
  }
}
```

### 3. Claude Desktop 재시작
설정 적용 후 Claude Desktop 재시작

---

## 💬 사용 예시

### 문제 힌트 받기
```
You: 백준 1003번 힌트 줘

Claude: 1003번 (피보나치 함수) 문제를 분석했습니다.

Level 1 힌트:
이 문제는 동적 프로그래밍(DP) 문제입니다.
피보나치를 재귀로 구현하면 중복 계산이 발생합니다...
```

### 복습 문서 자동 생성
```
You: 1003번 복습 문서 만들어줘

Claude: 복습 템플릿을 생성했습니다.
[reviews/1003-피보나치함수.md 파일 생성]

이제 대화형으로 복습을 작성해보겠습니다.
Q: 이 문제에서 가장 어려웠던 부분은 무엇인가요?
```

### 문제 검색
```
You: Gold 난이도 DP 문제 추천해줘

Claude: [알고리즘 태그와 난이도로 필터링된 문제 목록 제공]
- 1003: 피보나치 함수 (Silver III)
- 1149: RGB거리 (Silver I)
- 9251: LCS (Gold V)
```

---

## 🎓 학습 철학

```
"Learn by thinking, not by seeing answers"
```

AlgoKit은 답을 주지 않습니다. 대신 **생각하는 법**을 안내합니다:

- 🧠 **Level 1**: 문제 접근법 (What to think)
- 🛠️ **Level 2**: 구현 힌트 (How to implement)
- ✅ **Level 3**: 정답 검증 (Verify your solution)

프롬프트 기반 아키텍처로 문제마다 맞춤형 힌트를 제공합니다.

---

## 🎯 네이밍 규칙

| 용도 | 표기법 | 예시 |
|------|--------|------|
| 브랜드명 | CamelCase | `AlgoKit` |
| 패키지명 | kebab-case | `algo-kit` |
| MCP 서버명 | lowercase | `algokit` |
| npm scope | @lowercase | `@algokit/mcp-server` |

---

## 🔗 참고 문서

- [프로젝트 개요](../CLAUDE.md)
- [아키텍처 설계](../01-planning/architecture.md)
- [프롬프트 아키텍처](../01-planning/prompt-architecture-design.md)
- [MCP 도구 레퍼런스](../02-development/tools-reference.md)
