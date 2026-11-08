import "dotenv/config";
import fs from "fs";
import path from "path";
import { agent } from "../src/modules/agent/graph";
import type { State } from "../src/modules/agent/core/state";
import { DOMAINS } from "../src/modules/agent/core/domains";

interface EvalCase {
  id: string;
  caseType: string;
  topic: string;
  context: string;
  domain: string;
  archetype: string;
  tone: string;
  expectedDomain?: string;
  notes?: string;
  groundedIn?: string;
  sourceUrl?: string;
}

interface EvalDataset {
  version: number;
  usage?: string;
  cases: EvalCase[];
}

interface CaseEvalResult {
  id: string;
  caseType: string;
  topic: string;
  context: string;
  expectedDomain?: string;
  inputDomain: string;
  inputArchetype: string;
  inputTone: string;
  actualDomain: string | null;
  actualArchetype: string | null;
  actualTone: string | null;
  classificationMatch: boolean | null;
  isExplicitBypass: boolean;
  draftLength: number;
  sweetSpotPass: boolean;
  hardCeilingPass: boolean;
  hasRawUrl: boolean;
  emojiBulletCount: number;
  linkRulePass: boolean;
  emojiRulePass: boolean;
  criticRan: boolean;
  isFailOpen: boolean;
  criticScore: number | null;
  criticVerdict: string | null;
  criticReasons: string[];
  fabricationFlag: boolean;
  contrarianBaitFlag: boolean;
  postContent: string;
  executedNodes: string[];
  durationMs: number;
  error: string | null;
  status: "success" | "error";
  timestamp: string;
}

// ── Argument Parsing ──────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dataset: "eval-dataset.json",
    provider: (process.env.EVAL_PROVIDER || "ollama").toLowerCase(),
    model: process.env.OLLAMA_MODEL || "gpt-oss:20b-cloud",
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    geminiApiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "",
    outputDir: "./eval-results",
    limit: 0,
    caseId: "",
    resume: true,
  };

  for (const arg of args) {
    if (arg.startsWith("--dataset=")) options.dataset = arg.split("=")[1];
    else if (arg.startsWith("--provider=")) options.provider = arg.split("=")[1].toLowerCase();
    else if (arg.startsWith("--model=")) options.model = arg.split("=")[1];
    else if (arg.startsWith("--base-url=")) options.ollamaBaseUrl = arg.split("=")[1];
    else if (arg.startsWith("--output-dir=")) options.outputDir = arg.split("=")[1];
    else if (arg.startsWith("--limit=")) options.limit = parseInt(arg.split("=")[1], 10);
    else if (arg.startsWith("--id=")) options.caseId = arg.split("=")[1];
    else if (arg === "--no-resume") options.resume = false;
  }

  return options;
}

// ── CSV Helpers ───────────────────────────────────────────────────────────────

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

// ── Ollama Health Check ───────────────────────────────────────────────────────

async function checkOllama(baseUrl: string, model: string): Promise<void> {
  console.log(`Connecting to Ollama at ${baseUrl}...`);
  try {
    const res = await fetch(`${baseUrl}/api/tags`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = (await res.json()) as { models?: Array<{ name: string }> };
    const available = (data.models || []).map((m) => m.name);
    console.log(`Available Ollama models: ${available.join(", ")}`);
    if (!available.includes(model)) {
      const match = available.find((m) => m.startsWith(model.split(":")[0]));
      if (match) {
        console.log(`Configured model "${model}" mapped to available "${match}".`);
      } else {
        console.warn(`WARNING: Model "${model}" not found in Ollama tags! Available: ${available.join(", ")}`);
      }
    }
  } catch (err) {
    console.error(`FATAL: Failed to connect to Ollama at ${baseUrl}:`, err);
    process.exit(1);
  }
}

// ── Main Evaluation Runner ───────────────────────────────────────────────────

async function run() {
  const opts = parseArgs();

  console.log("===============================================================");
  console.log("             LINKEDIN AGENT EVALUATION RUNNER                  ");
  console.log("===============================================================");
  console.log(`Dataset:    ${opts.dataset}`);
  console.log(`Provider:   ${opts.provider}`);
  console.log(`Model:      ${opts.model}`);
  console.log(`Output Dir: ${opts.outputDir}`);
  console.log(`Resume:     ${opts.resume ? "Enabled" : "Disabled"}\n`);

  if (!fs.existsSync(opts.dataset)) {
    console.error(`FATAL: Dataset file "${opts.dataset}" not found.`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(opts.dataset, "utf-8");
  const dataset: EvalDataset = JSON.parse(rawData);

  if (opts.provider === "ollama") {
    await checkOllama(opts.ollamaBaseUrl, opts.model);
  }

  fs.mkdirSync(opts.outputDir, { recursive: true });

  const checkpointFile = path.join(opts.outputDir, "checkpoint.json");
  let completedResults: Record<string, CaseEvalResult> = {};

  if (opts.resume && fs.existsSync(checkpointFile)) {
    try {
      completedResults = JSON.parse(fs.readFileSync(checkpointFile, "utf-8"));
      console.log(`Loaded ${Object.keys(completedResults).length} already completed cases from checkpoint.\n`);
    } catch {
      console.warn("Could not parse existing checkpoint. Starting fresh.");
      completedResults = {};
    }
  }

  let casesToRun = dataset.cases;
  if (opts.caseId) {
    casesToRun = casesToRun.filter((c) => c.id === opts.caseId);
    if (casesToRun.length === 0) {
      console.error(`Case ID "${opts.caseId}" not found in dataset.`);
      process.exit(1);
    }
  }
  if (opts.limit > 0) {
    casesToRun = casesToRun.slice(0, opts.limit);
  }

  const totalCases = casesToRun.length;
  console.log(`Starting evaluation on ${totalCases} test cases...\n`);

  for (let idx = 0; idx < totalCases; idx++) {
    const c = casesToRun[idx];
    const caseNum = idx + 1;

    if (opts.resume && completedResults[c.id]) {
      console.log(`[${caseNum}/${totalCases}] Skipping already completed case: ${c.id}`);
      continue;
    }

    console.log(`[${caseNum}/${totalCases}] Evaluating ${c.id} (${c.caseType}): "${c.topic.slice(0, 50)}..."`);
    const startTime = Date.now();

    const initialState: State = {
      topic: c.topic,
      context: c.context,
      domain: c.domain,
      archetype: c.archetype,
      tone: c.tone,
      activeDomain: c.domain !== "auto" && DOMAINS[c.domain] ? c.domain : "general",
      activeArchetype: c.archetype,
      activeTone: c.tone,
      userId: null,
      llmProvider: opts.provider,
      llmModel: opts.model,
      llmApiKey: opts.provider === "gemini" ? opts.geminiApiKey : null,
      ollamaBaseUrl: opts.provider === "ollama" ? opts.ollamaBaseUrl : null,
      deadlineTimestamp: Date.now() + 180_000,
      intake: null,
      plan: "",
      searchContext: "",
      draft: "",
      userFeedback: null,
      changeNote: null,
      refinementPasses: 0,
      critique: null,
      critiqueCount: 0,
      critiqueScores: [],
      bestDraft: "",
      bestScore: 0,
      postContent: null,
      postUrl: null,
      retries: 0,
      error: null,
      reasoningSteps: [],
      linkedinToken: null,
      linkedinUrn: null,
      mediaFiles: null,
      failedNode: null,
      lastFailedNode: null,
      errorRecoveryCount: 0,
      nodeRecoveryCounts: {},
      rawLlmResponse: null,
      servingProvider: null,
    };

    const threadConfig = {
      configurable: {
        thread_id: `eval-${c.id}-${Date.now()}`,
      },
    };

    const executedNodes: string[] = [];

    try {
      const stream = agent.streamEvents(initialState, {
        version: "v2",
        configurable: threadConfig.configurable,
      });

      for await (const event of stream) {
        if (event.event === "on_chain_start" && event.name) {
          if (!executedNodes.includes(event.name) && [
            "analyzeIntake",
            "generateDraft",
            "critiqueDraft",
            "refineDraft",
            "promoteBestDraft",
            "runGuardrails",
            "validatePost",
            "handleAgentError",
          ].includes(event.name)) {
            executedNodes.push(event.name);
          }
        }
      }

      const finalState = await agent.getState(threadConfig);
      const durationMs = Date.now() - startTime;
      const values = finalState.values;

      const actualDomain = values.intake?.domain || values.activeDomain || null;
      const actualArchetype = values.intake?.archetype || values.activeArchetype || null;
      const actualTone = values.intake?.tone || values.activeTone || null;

      let classificationMatch: boolean | null = null;
      if (c.expectedDomain && !c.expectedDomain.startsWith("n/a")) {
        classificationMatch = actualDomain === c.expectedDomain;
      }

      const isExplicitBypass = c.domain !== "auto" && c.archetype !== "auto" && c.tone !== "auto";
      const postText = values.postContent || values.bestDraft || values.draft || "";
      const draftLength = postText.length;
      const sweetSpotPass = draftLength >= 1300 && draftLength <= 2500;
      const hardCeilingPass = draftLength <= 3000;

      const hasRawUrl = /(https?:\/\/|www\.)\S+/i.test(postText);
      const emojiBulletCount = postText.split("\n").filter((l: string) => /^\s*(🚀|👉|✅|🔥)/.test(l)).length;
      const linkRulePass = c.id === "eval-036" ? !hasRawUrl : true;
      const emojiRulePass = emojiBulletCount < 3;

      const critique = values.critique;
      const criticRan = Boolean(critique);
      const isFailOpen = critique?.hookReason === "Fallback evaluation";

      const resultRecord: CaseEvalResult = {
        id: c.id,
        caseType: c.caseType,
        topic: c.topic,
        context: c.context,
        expectedDomain: c.expectedDomain,
        inputDomain: c.domain,
        inputArchetype: c.archetype,
        inputTone: c.tone,
        actualDomain,
        actualArchetype,
        actualTone,
        classificationMatch,
        isExplicitBypass,
        draftLength,
        sweetSpotPass,
        hardCeilingPass,
        hasRawUrl,
        emojiBulletCount,
        linkRulePass,
        emojiRulePass,
        criticRan,
        isFailOpen,
        criticScore: critique?.score ?? null,
        criticVerdict: critique?.verdict ?? null,
        criticReasons: critique?.reasons ?? [],
        fabricationFlag: critique?.fabricationFlag ?? false,
        contrarianBaitFlag: critique?.contrarianBaitFlag ?? false,
        postContent: postText,
        executedNodes,
        durationMs,
        error: values.error || null,
        status: values.error ? "error" : "success",
        timestamp: new Date().toISOString(),
      };

      completedResults[c.id] = resultRecord;
      fs.writeFileSync(checkpointFile, JSON.stringify(completedResults, null, 2), "utf-8");

      console.log(
        `   -> [DONE] ${Math.round(durationMs / 1000)}s | Domain: ${actualDomain} (${classificationMatch === null ? "N/A" : classificationMatch ? "MATCH" : "MISMATCH"}) | Length: ${draftLength} chars | Critic: ${critique?.score ?? "N/A"} (${critique?.verdict ?? "none"})`
      );
    } catch (caseErr) {
      const durationMs = Date.now() - startTime;
      const msg = caseErr instanceof Error ? caseErr.message : String(caseErr);
      console.error(`   -> [ERROR] ${c.id} failed after ${Math.round(durationMs / 1000)}s: ${msg}`);

      const resultRecord: CaseEvalResult = {
        id: c.id,
        caseType: c.caseType,
        topic: c.topic,
        context: c.context,
        expectedDomain: c.expectedDomain,
        inputDomain: c.domain,
        inputArchetype: c.archetype,
        inputTone: c.tone,
        actualDomain: null,
        actualArchetype: null,
        actualTone: null,
        classificationMatch: null,
        isExplicitBypass: false,
        draftLength: 0,
        sweetSpotPass: false,
        hardCeilingPass: false,
        hasRawUrl: false,
        emojiBulletCount: 0,
        linkRulePass: false,
        emojiRulePass: false,
        criticRan: false,
        isFailOpen: false,
        criticScore: null,
        criticVerdict: null,
        criticReasons: [],
        fabricationFlag: false,
        contrarianBaitFlag: false,
        postContent: "",
        executedNodes,
        durationMs,
        error: msg,
        status: "error",
        timestamp: new Date().toISOString(),
      };

      completedResults[c.id] = resultRecord;
      fs.writeFileSync(checkpointFile, JSON.stringify(completedResults, null, 2), "utf-8");
    }
  }

  console.log("\n===============================================================");
  console.log("           GENERATING EVALUATION REPORTS & DATASETS            ");
  console.log("===============================================================\n");

  const allResults = Object.values(completedResults);

  // 1. JSON Export
  const resultsJsonPath = path.join(opts.outputDir, "results.json");
  fs.writeFileSync(resultsJsonPath, JSON.stringify(allResults, null, 2), "utf-8");
  console.log(`Saved JSON results: ${resultsJsonPath}`);

  // 2. CSV Export for Human Scoring
  const csvPath = path.join(opts.outputDir, "human-eval-sheet.csv");
  const csvHeaders = [
    "Case ID",
    "Case Type",
    "Topic",
    "Context",
    "Expected Domain",
    "Actual Domain",
    "Domain Match",
    "Draft Length",
    "Sweet Spot (1300-2500)",
    "Critic Score (1-10)",
    "Critic Verdict",
    "Critic Reasons",
    "Fabrication Flag",
    "Contrarian Bait Flag",
    "Generated Post",
    "Human Hook (1-4)",
    "Human Authenticity (1-4)",
    "Human Grounding (1-4)",
    "Human Structure (1-4)",
    "Human Overall Score (1-10)",
    "Human Verdict (pass/refine/reject)",
    "Human Notes",
  ];

  const csvRows = [csvHeaders.join(",")];
  for (const r of allResults) {
    const row = [
      escapeCsv(r.id),
      escapeCsv(r.caseType),
      escapeCsv(r.topic),
      escapeCsv(r.context),
      escapeCsv(r.expectedDomain || "N/A"),
      escapeCsv(r.actualDomain || "N/A"),
      escapeCsv(r.classificationMatch === null ? "N/A" : r.classificationMatch ? "PASS" : "FAIL"),
      r.draftLength,
      escapeCsv(r.sweetSpotPass ? "YES" : "NO"),
      escapeCsv(r.criticScore ?? ""),
      escapeCsv(r.criticVerdict ?? ""),
      escapeCsv(r.criticReasons.join("; ")),
      escapeCsv(r.fabricationFlag ? "TRUE" : "FALSE"),
      escapeCsv(r.contrarianBaitFlag ? "TRUE" : "FALSE"),
      escapeCsv(r.postContent),
      '""', // Human Hook
      '""', // Human Authenticity
      '""', // Human Grounding
      '""', // Human Structure
      '""', // Human Overall Score
      '""', // Human Verdict
      '""', // Human Notes
    ];
    csvRows.push(row.join(","));
  }
  fs.writeFileSync(csvPath, csvRows.join("\n"), "utf-8");
  console.log(`Saved Human Scoring Sheet: ${csvPath}`);

  // 3. Markdown Summary Report
  const summaryPath = path.join(opts.outputDir, "summary.md");
  const summaryMd = generateMarkdownSummary(allResults, opts);
  fs.writeFileSync(summaryPath, summaryMd, "utf-8");
  console.log(`Saved Markdown Summary: ${summaryPath}\n`);

  console.log("Evaluation run complete!");
}

// ── Markdown Summary Generator ───────────────────────────────────────────────

function generateMarkdownSummary(results: CaseEvalResult[], opts: ReturnType<typeof parseArgs>): string {
  const total = results.length;
  const successful = results.filter((r) => r.status === "success").length;
  const errored = total - successful;

  // Classification Metrics
  const classifiable = results.filter((r) => r.classificationMatch !== null);
  const correctClass = classifiable.filter((r) => r.classificationMatch === true).length;
  const classAccuracy = classifiable.length > 0 ? Math.round((correctClass / classifiable.length) * 100) : 0;

  // Length Metrics
  const sweetSpotCount = results.filter((r) => r.sweetSpotPass).length;
  const sweetSpotPct = total > 0 ? Math.round((sweetSpotCount / total) * 100) : 0;
  const ceilingPassCount = results.filter((r) => r.hardCeilingPass).length;
  const lengths = results.filter((r) => r.draftLength > 0).map((r) => r.draftLength);
  const avgLength = lengths.length > 0 ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length) : 0;

  // Critic Metrics
  const validCritics = results.filter((r) => r.criticRan && !r.isFailOpen).length;
  const failOpenCritics = results.filter((r) => r.isFailOpen).length;
  const verdictPass = results.filter((r) => r.criticVerdict === "pass").length;
  const verdictRefine = results.filter((r) => r.criticVerdict === "refine").length;
  const verdictReview = results.filter((r) => r.criticVerdict === "needs_human_review").length;

  // Edge Case Flags
  const fabRiskCases = results.filter((r) => r.caseType === "edge-fabrication-risk" || r.caseType === "edge-thin-context");
  const fabTriggered = fabRiskCases.filter((r) => r.fabricationFlag).length;

  const contrarianCases = results.filter((r) => r.caseType === "edge-contrarian-bait");
  const contrarianTriggered = contrarianCases.filter((r) => r.contrarianBaitFlag).length;

  // Deterministic checks
  const linkStressCase = results.find((r) => r.id === "eval-036");
  const emojiStressCase = results.find((r) => r.id === "eval-040");

  let md = `# LinkedIn Agent Evaluation Report\n\n`;
  md += `**Generated:** ${new Date().toISOString()}\n`;
  md += `**Provider:** \`${opts.provider}\` | **Model:** \`${opts.model}\`\n\n`;

  md += `## 1. Executive Summary\n\n`;
  md += `| Metric | Score / Count | Percentage | Target |\n`;
  md += `|---|---|---|---|\n`;
  md += `| **Pipeline Completion** | ${successful} / ${total} | ${Math.round((successful / total) * 100)}% | 100% |\n`;
  md += `| **Intake Domain Accuracy** | ${correctClass} / ${classifiable.length} | ${classAccuracy}% | > 90% |\n`;
  md += `| **Length Sweet Spot (1,300–2,500 chars)** | ${sweetSpotCount} / ${total} | ${sweetSpotPct}% | > 85% |\n`;
  md += `| **Hard Max Length (<=3,000 chars)** | ${ceilingPassCount} / ${total} | ${Math.round((ceilingPassCount / total) * 100)}% | 100% |\n`;
  md += `| **Genuine Critic Evaluations (No Fail-Open)** | ${validCritics} / ${total} | ${Math.round((validCritics / total) * 100)}% | 100% |\n`;
  md += `| **Fail-Open Fallback Scores (score=7)** | ${failOpenCritics} | - | 0 |\n\n`;

  md += `## 2. Classification Accuracy\n\n`;
  md += `Total classifiable cases: **${classifiable.length}** | Correct: **${correctClass}** (${classAccuracy}%)\n\n`;

  const mismatches = classifiable.filter((r) => r.classificationMatch === false);
  if (mismatches.length > 0) {
    md += `### Classification Mismatches\n\n`;
    md += `| Case ID | Topic | Expected | Actual | Case Type |\n`;
    md += `|---|---|---|---|---|\n`;
    for (const m of mismatches) {
      md += `| \`${m.id}\` | ${m.topic.slice(0, 45)}... | **${m.expectedDomain}** | **${m.actualDomain}** | ${m.caseType} |\n`;
    }
    md += `\n`;
  } else {
    md += `✅ Zero classification mismatches detected across all test cases!\n\n`;
  }

  md += `## 3. Critic & Quality Flags Breakdown\n\n`;
  md += `- **Verdict Distribution:**\n`;
  md += `  - \`pass\`: ${verdictPass}\n`;
  md += `  - \`refine\`: ${verdictRefine}\n`;
  md += `  - \`needs_human_review\`: ${verdictReview}\n`;
  md += `- **Average Generated Draft Length:** ${avgLength} characters\n`;
  md += `- **Anti-Fabrication Flag Sensitivity:** ${fabTriggered} / ${fabRiskCases.length} thin/fabrication risk cases flagged.\n`;
  md += `- **Contrarian Outrage-Bait Sensitivity:** ${contrarianTriggered} / ${contrarianCases.length} contrarian cases flagged.\n\n`;

  md += `## 4. Key Edge-Case Verifications\n\n`;
  md += `| Edge Case | Test Goal | Result | Details |\n`;
  md += `|---|---|---|---|\n`;
  md += `| **eval-036** | Raw URL in context moved to comment | ${linkStressCase ? (linkStressCase.hasRawUrl ? "❌ FAILED (URL in body)" : "✅ PASSED (No URL in body)") : "Not executed"} | ${linkStressCase?.hasRawUrl ? "Found raw link in body" : "Clean body"} |\n`;
  md += `| **eval-040** | List topic avoids banned emoji bullets | ${emojiStressCase ? (emojiStressCase.emojiBulletCount >= 3 ? "❌ FAILED" : "✅ PASSED") : "Not executed"} | ${emojiStressCase ? `${emojiStressCase.emojiBulletCount} emoji bullet lines` : ""} |\n`;

  const invalidDomainCase = results.find((r) => r.id === "eval-043");
  md += `| **eval-043** | Deliberately invalid domain fails gracefully | ${invalidDomainCase ? (invalidDomainCase.error || invalidDomainCase.actualDomain === "general" ? "✅ PASSED" : "⚠️ UNEXPECTED") : "Not executed"} | ${invalidDomainCase?.error || invalidDomainCase?.actualDomain} |\n\n`;

  md += `## 5. Next Steps for Human Scoring (Layer 3)\n\n`;
  md += `Open \`eval-results/human-eval-sheet.csv\` in Excel / Google Sheets to score the drafts on the 1–4 axis rubric (Hook, Authenticity, Domain Grounding, Structure). Compare your scores to \`Critic Score\` and \`Critic Verdict\` to measure rubric agreement and calibrate the critic prompt.\n`;

  return md;
}

run().catch((err) => {
  console.error("Fatal unhandled error in eval runner:", err);
  process.exit(1);
});
