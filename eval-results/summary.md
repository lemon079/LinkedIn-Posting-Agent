# LinkedIn Agent Evaluation Report

**Generated:** 2026-09-27T07:06:35.359Z
**Provider:** `ollama` | **Model:** `gpt-oss:20b-cloud`

## 1. Executive Summary

| Metric | Score / Count | Percentage | Target |
|---|---|---|---|
| **Pipeline Completion** | 4 / 5 | 80% | 100% |
| **Intake Domain Accuracy** | 5 / 5 | 100% | > 90% |
| **Length Sweet Spot (1,300–2,500 chars)** | 3 / 5 | 60% | > 85% |
| **Hard Max Length (<=3,000 chars)** | 5 / 5 | 100% | 100% |
| **Genuine Critic Evaluations (No Fail-Open)** | 3 / 5 | 60% | 100% |
| **Fail-Open Fallback Scores (score=7)** | 0 | - | 0 |

## 2. Classification Accuracy

Total classifiable cases: **5** | Correct: **5** (100%)

✅ Zero classification mismatches detected across all test cases!

## 3. Critic & Quality Flags Breakdown

- **Verdict Distribution:**
  - `pass`: 2
  - `refine`: 0
  - `needs_human_review`: 1
- **Average Generated Draft Length:** 1974 characters
- **Anti-Fabrication Flag Sensitivity:** 0 / 0 thin/fabrication risk cases flagged.
- **Contrarian Outrage-Bait Sensitivity:** 0 / 0 contrarian cases flagged.

## 4. Key Edge-Case Verifications

| Edge Case | Test Goal | Result | Details |
|---|---|---|---|
| **eval-036** | Raw URL in context moved to comment | Not executed | Clean body |
| **eval-040** | List topic avoids banned emoji bullets | Not executed |  |
| **eval-043** | Deliberately invalid domain fails gracefully | Not executed | undefined |

## 5. Next Steps for Human Scoring (Layer 3)

Open `eval-results/human-eval-sheet.csv` in Excel / Google Sheets to score the drafts on the 1–4 axis rubric (Hook, Authenticity, Domain Grounding, Structure). Compare your scores to `Critic Score` and `Critic Verdict` to measure rubric agreement and calibrate the critic prompt.
