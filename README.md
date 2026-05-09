# DECO3801_project14_RainbowSix
Ranbowsix code base for project14, HTML exract, mapping and score.

## First update<br>
- **index.js**: input and output setting<br>
- **src/analyzer.js**: analysis the url, exract each features use for futer work<br>
- **output/**: jason vision output

## Second update<br>
- **src/scorer.js**: calculate cognitive accessibility scores (0-100) based on analyzer data, and map issues to WCAG and ISO 9241-11 standards.<br>
- **index.js**: updated to connect the scorer. Now it outputs a frontend-friendly JSON with status (good/warning/poor) and actionable insights.<br>

## Third Update<br>
- **index.js**: Added File System (`fs`) integration. Reports are now automatically timestamped and saved as `analysis-YYYY-MM-DD...json`.
- **src/analyzer.js**: 
    - **Media Intelligence**: Added specific logic to detect `<track>` captions in videos and identify autoplay behaviors.
    - **DOM Sanitization**: Implemented cloning and noise removal (scripts/styles) for accurate text metrics.
- **src/mapping.js**: Formalized the dictionary for all 5 dimensions, including weights, WCAG 2.2 success criteria, and ISO 9241 standards.
- **src/scorer.js**: Refined the `scoreMetric` function to handle three logic types: `lowerBetter`, `higherBetter`, and `range`. Added `generateInsights` to filter critical issues.

## Fourth Update 
- **server.js**: Added a new Express server to act as a bridge between the backend analyzer and the frontend UI.
  - **API Endpoint**: Exposed a `POST /api/analyze` route that accepts a URL.
  - **No Local Storage**: Shifted away from `fs.writeFile`. The server now processes the data entirely in-memory and returns the JSON directly over the network, ensuring a seamless, wait-free experience for the frontend.
  - **Data Packaging**: Bundled the raw `insights` array directly into their corresponding `scores.sections` cards. The frontend team can now render the UI directly without writing complex array-matching logic.
 
## Fifth Update 
- **src/analyzer.js**: Reconstruct the original 5 dimensions into 7, and add multiple independent functions to each dimension.
- **src/mapping.js**: Added support for the `boolean` type (`titleExists`, `hasSkipLink`, `langAttributeExists`, etc.), as well as the `info` type for purely statistical fields (`videoCount`, `formFieldCount`, etc., which do not participate in scoring).
- **src/scorer.js**: In `scoreMetric`, two types `boolean` and `info` has been added, and the `overallScore` has been modified to be scored by weight.

## Sixth Update 
- **src/scorer.js**:
  - **Conditional `SKIP_RULES`**: Refined skip rule logic so that metrics are only penalised when they are actually applicable. For example, `skipLinkWorks` is now only evaluated when `hasSkipLink` is `true` — a broken skip link is not penalised on pages that have no skip link at all.
  - **Penalty Multiplier Enhancement**: Improved score compression for low-quality sites. Sections scoring below the penalty threshold now apply a weighted miss-based multiplier to the overall score, with a configurable floor to prevent over-penalisation.
  - **Contrast-Based Score Expansion (Linear Stretching)**: After penalty adjustment, scores are linearly stretched around a midpoint (`CONTRAST_MID = 60`) using a configurable factor (`CONTRAST_FACTOR = 1.25`). This enhances score spread across the full range while preserving monotonic ordering — sites that scored better before stretching will still score better after.

## Seventh Update
- **src/codeExtractor.js** : A Puppeteer-based DOM auditor that extracts concrete "bad code" snippets directly from live pages. Fully decoupled from `analyzer.js` — the analyzer handles scoring metrics while `codeExtractor` collects raw DOM evidence for AI-driven fix suggestions. Detects issues across 7 categories:
  - **Clear Purpose**: missing/empty `alt` attributes on images, missing or duplicate `<h1>`, heading level skips, form inputs without associated labels.
  - **Findable**: anchor elements with no accessible text, generic link text ("click here", "read more", etc.).
  - **Media**: videos without caption tracks, autoplay media missing `muted` or `controls`.
  - **Clear Language**: `<html>` element missing a `lang` attribute.
  - **Visual Presentation**: inline styles suppressing focus outlines (`outline: none`), inline `text-align: justify`.
  - **Assistance & Support**: buttons with no accessible name, submit inputs with missing or generic `value`, forms with no ARIA-linked error/hint text.
  - **Distraction**: deprecated moving elements (`<marquee>`, `<blink>`), GIF images that may loop indefinitely.

  Each detected issue includes a `ruleId`, WCAG criterion, severity level (`critical` / `serious` / `moderate` / `minor`), offending `snippet` (outerHTML, truncated to 500 chars), best-effort CSS `selector`, and a plain-language `fix` direction for AI skill context.

- **src/ai-agent/agent.js** : A lightweight local agent that routes structured input payloads to registered AI skills. Skills are registered in an array and selected by `inputType`. Supports CLI commands for health checks, connectivity tests, and demo runs:
  - `node ai-agent/agent.js health` — Check Ollama connectivity.
  - `node ai-agent/agent.js test` — Send a test message to the configured model.
  - `node ai-agent/agent.js demo` — Run the cognitive accessibility skill with sample data.
  - `node ai-agent/agent.js demo-fix` — Run the code fix skill with a sample issue.

- **src/ai-agent/skills/cognitiveAccessibilityPrompt.js** : AI skill that receives structured section scores and insights from the scorer and asks a local Ollama model to generate a plain-language accessibility report. Returns a JSON object containing a 2–3 sentence summary, the top 3 identified problems, and 3–5 prioritised recommendations each with a title, action, reason, and priority level (`high` / `medium` / `low`).

- **src/ai-agent/skills/codeFixSuggestions.js** : AI skill that receives a list of `codeIssues` from `codeExtractor` and asks the local Ollama model to generate corrected HTML/CSS snippets for each issue. Issues are sorted by severity and capped at 10 per request to keep prompts compact. Returns a JSON `fixes` array with the original snippet, corrected snippet, a one-sentence explanation, and a `breakingChange` flag for each issue.

---
## Installation & Usage

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher
- [Ollama](https://ollama.com/) installed and running locally (required for AI skill features)
- The `qwen2.5:7b-instruct` model pulled in Ollama (or set `OLLAMA_MODEL` env var to your preferred model)

```bash
# Pull the default model (first time only)
ollama pull qwen2.5:7b-instruct
```

### 1. Install dependencies
```bash
npm install puppeteer express cors
```

### 2. Run the local test (saves report to file)
```bash
node index.js https://example.com
```

### 3. Run the backend API server (for frontend UI)
```bash
node server.js
```
*(Server will run on http://localhost:3000)*

### 4. Run the AI agent
```bash
# Check Ollama connectivity
node src/ai-agent/agent.js health

# Send a test message to the model
node src/ai-agent/agent.js test

# Demo: cognitive accessibility skill with sample data
node src/ai-agent/agent.js demo

# Demo: code fix skill with a sample issue
node src/ai-agent/agent.js demo-fix
```

### Environment Variables (optional)

| Variable | Default | Description |
| :--- | :--- | :--- |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `qwen2.5:7b-instruct` | Model to use for AI skills |
| `OLLAMA_ENABLED` | `true` | Set to `false` to disable AI skill calls |

---
## Appendix: Technical Documentation

This appendix provides a deep dive into the architecture, scoring logic, and data extraction methodology used in the **RainbowSix** analyzer.


### 1. System Architecture & Pipeline
The application follows a strictly decoupled architecture, separating data collection from evaluation logic.

1.  **Orchestrator (`index.js` / `server.js`)**: Handles CLI arguments or API requests, manages the asynchronous flow, and formats results.
2.  **Data Collector (`src/analyzer.js`)**: A Puppeteer-based engine extract DOM properties in the website. Convert raw DOM data into structured "Artifacts".
3.  **Knowledge Base (`src/mapping.js`)**: A dictionary defining thresholds, weights, and regulatory mappings (WCAG/ISO).
4.  **Scoring Engine (`src/scorer.js`)**: A stateless module that transforms raw data into normalized scores.

### 2. Advanced Extraction Methodology

#### 2.1 DOM Sanitization
To prevent "noise" (e.g., JavaScript code, CSS rules) from inflating word counts or complexity ratios, the analyzer performs a **Clone-and-Strip** operation:
* The `document.body` is cloned into a virtual fragment.
* `<script>`, `<style>`, and `<noscript>` tags are purged.
* Only the remaining `innerText` is passed to the NLP (Natural Language Processing) logic.

#### 2.2 Visibility Awareness
Unlike basic scrapers, this tool uses `window.getComputedStyle` to ensure that only elements actually rendered on the screen (where `display !== 'none'`) contribute to the **Visual Density Score**.


### 3. Scoring System

#### 3.1 Section Score — Weighted Average

For each section, the score is calculated as:

$$Score_{section} = \frac{\sum_{i=1}^{n} (S_i \times W_i)}{\sum_{i=1}^{n} W_i}$$

- **$S_i$** — Normalised score (0–100) of a specific metric
- **$W_i$** — Weight assigned to that metric in `mapping.js`


#### 3.2 Normalised Metric Types

| Type | Formula | Example |
| :--- | :--- | :--- |
| **Lower better** | $100 \times \left(1 - \dfrac{value - good}{bad - good}\right)$ | `complexWordRatio` |
| **Higher better** | $100 \times \dfrac{value - bad}{good - bad}$ | `labelCoverage` |
| **Range optimal** | $100 \times \left(1 - \dfrac{value - ideal}{max - ideal}\right)$ | `visualDensityScore` |
| **Boolean** | `value === good ? 100 : 0` | `titleExists` |
| **Info** | `null` — not scored | `videoCount` |

> All scored types clamp output to `[0, 100]`. Metrics returning `null` are excluded from the weighted sum entirely.


#### 3.3 Overall Score — Section Weights

$$Score_{overall} = \frac{\sum (Score_{section} \times weight_{section})}{\sum weight_{section}}$$

| Section | Weight |
| :--- | :---: |
| Clear Language | 0.20 |
| Clear Purpose | 0.15 |
| Findable | 0.15 |
| Visual Presentation | 0.15 |
| Distraction | 0.15 |
| Media | 0.10 |
| Assistance & Support | 0.10 |
| **Total** | **1.00** |

##### Status thresholds

| Status | Score range |
| :--- | :--- |
|  Good | ≥ 85 |
|  Caution | 70 – 84 |
|  Warning | 55 – 69 |
|  Poor | < 54 |

#### 3.4 Score Adjustment Pipeline

After section scores are computed, the overall score passes through two sequential adjustment stages designed to improve score distribution and more strongly differentiate low-quality sites.

##### Stage 1 — Penalty Multiplier

Sites with one or more sections scoring below `PENALTY_THRESHOLD` receive a compounding penalty applied to the arithmetic overall score. Each underperforming section contributes a weighted reduction proportional to how far it falls below the threshold:

```javascript
let penaltyMultiplier = 1.0;

for (const sec of sections) {
  if (sec.score !== null && sec.score < PENALTY_THRESHOLD) {
    const miss = (PENALTY_THRESHOLD - sec.score) / PENALTY_THRESHOLD;
    penaltyMultiplier *= 1 - miss * sec.weight * PENALTY_STRENGTH;
  }
}

penaltyMultiplier = Math.max(penaltyMultiplier, PENALTY_FLOOR);

const penalizedScore = arithmeticScore * penaltyMultiplier;
```

- **`PENALTY_THRESHOLD`** — Section score below which a penalty is applied.
- **`PENALTY_STRENGTH`** — Controls how aggressively each miss reduces the multiplier.
- **`PENALTY_FLOOR`** — Minimum value for the multiplier, preventing runaway penalisation.

The penalty is multiplicative and compounds across all underperforming sections, meaning sites with multiple weak areas are penalised more severely than sites with a single weak section.

##### Stage 2 — Contrast-Based Score Expansion (Linear Stretching)

After penalisation, scores are linearly stretched around a fixed midpoint to increase separation between sites of varying quality. This step preserves monotonic ordering — a site that scored higher before stretching will always score higher after.

```javascript
const CONTRAST_MID = 60;
const CONTRAST_FACTOR = 1.25;

let adjustedScore =
  CONTRAST_MID + (boostedScore - CONTRAST_MID) * CONTRAST_FACTOR;

adjustedScore = Math.max(0, Math.min(100, adjustedScore));
```

- Scores above `CONTRAST_MID` are pushed higher; scores below are pushed lower.
- The result is clamped to `[0, 100]`.
- Combined with the penalty multiplier, this produces a final score distribution that is more discriminating across the full quality spectrum.

#### 3.5 Conditional SKIP_RULES

Certain metrics are only meaningful in specific page contexts. `SKIP_RULES` defines per-metric conditions under which scoring is suppressed entirely — the metric is treated as not applicable and excluded from the weighted sum.

For example, `skipLinkWorks` (which checks whether a skip link functions correctly) is only penalised if a skip link actually exists on the page:

```javascript
// Only penalise a broken skip link if a skip link actually exists.
skipLinkWorks: (m) => m.hasSkipLink === false,
```

This prevents pages from being unfairly penalised for failing a check that was never relevant to them, keeping section scores grounded in what is actually present on the page.

### 4. AI Agent Architecture

#### 4.1 Overview

The AI agent layer (`src/ai-agent/`) is a lightweight, skill-based routing system that connects analysis output to a locally running Ollama model. It is fully decoupled from the scoring engine — the agent receives finished results and produces natural-language or structured-code output without modifying any scores.

#### 4.2 Skill Contract

Each skill module exports the following shape, making skills hot-swappable in the registry:

| Export | Type | Description |
| :--- | :--- | :--- |
| `name` | string | Unique skill identifier |
| `description` | string | Human-readable summary |
| `inputType` | string | Key used by the agent router |
| `run(payload)` | async function | Main skill entry point |
| `checkOllamaHealth()` | async function | Connectivity diagnostic |
| `testOllamaChat()` | async function | Minimal model round-trip test |

#### 4.3 Skill: Cognitive Accessibility Advice (`cognitive_accessibility_analysis`)

Accepts the scorer's section-level output (scores, statuses, and insights) and prompts the model to return a structured JSON report:

```json
{
  "summary": "2–3 sentence plain-language overview",
  "topProblems": ["problem 1", "problem 2", "problem 3"],
  "recommendations": [
    {
      "title": "string",
      "action": "string",
      "reason": "string",
      "priority": "high | medium | low"
    }
  ]
}
```

#### 4.4 Skill: Code Fix Suggestions (`code_fix_request`)

Accepts a list of issues from `codeExtractor.js`, sorts them by severity, caps the payload at 10 issues, and prompts the model to return corrected code:

```json
{
  "fixes": [
    {
      "ruleId": "string",
      "severity": "string",
      "originalSnippet": "string",
      "fixedSnippet": "string",
      "explanation": "string",
      "breakingChange": false
    }
  ]
}
```

Both skills use a `safeJsonParse` fallback that attempts to extract a JSON object from free-text model output if the model does not return clean JSON.

### 5. Regulatory & Standards Mapping (WCAG 2.2 & ISO 9241-11)

The RainbowSix analyzer is fully aligned with **WCAG 2.2** (published Oct 2023), with a specific focus on **Cognitive Accessibility** and **User Interaction Efficiency**.

### 5. Regulatory & Standards Mapping (WCAG 2.2 & ISO 9241-11)

The RainbowSix analyzer is fully aligned with **WCAG 2.2** (published Oct 2023), with a specific focus on **Cognitive Accessibility** and **User Interaction Efficiency**.

#### 5.1 WCAG 2.2 Success Criteria Mapping
Each metric is evaluated against the latest success criteria to ensure compliance for users with cognitive, motor, or sensory impairments.

| Principle | Metric | WCAG 2.2 Criteria | Cognitive Impact & Meaning |
| :--- | :--- | :--- | :--- |
| **Perceivable** | `contrastIssueCount`, `videosWithCaptionsRatio` | 1.4.3 Contrast / 1.2.2 Captions | **Ensuring Information Reception**: If contrast is low or captions are missing, users with visual or hearing impairments cannot "receive" the content. Ensures content is identifiable regardless of sensory ability. |
| **Operable** | `visualDensityScore`, `autoplayMediaCount` | 2.5.8 Target Size / 2.2.2 Pause, Stop, Hide | **Reducing Distraction & Mismatched Interaction**: Crowded layouts (2.5.8) lead to accidental clicks for users with limited motor skills. Autoplay content distracts users with ADHD or cognitive disabilities and can trigger seizures. Help prevents accidental clicks and reduces distractions/seizure risks. |
| **Understandable** | `sentenceAverageLength`, `complexWordRatio`, `labelCoverage` | 3.1.5 Reading Level / 3.3.8 Accessible Authentication | **Lowering Cognitive Load**: Long sentences and jargon cause mental fatigue. SC 3.3.8 (New in 2.2) requires that users are not forced into "cognitive function tests" (like complex puzzles) to authenticate or submit forms. Help reduces mental fatigue; ensures users don't need "cognitive function tests" to use the site. |
| **Robust** | `maxDepth` | 2.4.8 Location / 2.4.5 Multiple Ways | **Preventing Navigational Lostness**: Ensures site structures are predictable. If nesting is too deep, users on screen readers or mobile devices may become completely disoriented within the site architecture.|

#### 5.2 ISO 9241-11 Usability Pillars
We translate technical artifacts into the three pillars of the ISO 9241-11 quality model:

* **Effectiveness (Success Rate)**: Can the user achieve their goal?
    * *Mapped Metrics*: `labelCoverage`, `complexWordRatio`. 
    * *Focus*: Clear instructions and simplified vocabulary prevent task abandonment.
* **Efficiency (Resource Expenditure)**: How much mental/physical effort is required?
    * *Mapped Metrics*: `sentenceAverageLength`, `maxDepth`, `visualDensityScore`. 
    * *Focus*: Reducing reading time, minimizing navigation clicks, and optimizing visual search speed.
* **Satisfaction (User Comfort)**: Is the experience free from discomfort?
    * *Mapped Metrics*: `autoplayMediaCount`. 
    * *Focus*: Giving users control over their environment to prevent anxiety and sensory overload.

### 6. Technical Note on WCAG 2.2 Implementation
The analyzer specifically addresses the **Cognitive Load** aspect of WCAG 2.2. By evaluating `complexWordRatio` and `sentenceAverageLength`, the tool directly supports **SC 3.3.8 (Accessible Authentication)** by ensuring that the language used in help text and labels does not create an unnecessary "cognitive function test" for the user.
