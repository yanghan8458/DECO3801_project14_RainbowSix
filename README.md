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
  - Add `SKIP_RULES` to skip the indicator that "not applicable" to the current page.
  - Introduce Penalty Multiplier in `calculateScores` function to give more penalty to Low-quality sites.
  - Introduce Contrast-Based Score Expansion (Linear Stretching) after penalty adjustment, enhancing score spread while preserving monotonic ordering.
  - Four-Level Status Threshold.
---
## Installation & Usage
### 1.Install dependencies:
 `npm install puppeteer express cors`
### 2. Run the local test (Save to file):
 `node index.js https://example.com`
 ### 3. Run the Backend API Server (For Frontend UI):
 `node server.js` 
 *(Server will run on http://localhost:3000)*

---
## Appendix: Technical Documentation

This appendix provides a deep dive into the architecture, scoring logic, and data extraction methodology used in the **RainbowSix** analyzer.


### 1. System Architecture & Pipeline
The application follows a strictly decoupled architecture, separating data collection from evaluation logic.

1.  **Orchestrator (`index.js` / `server.js`)**: Handles CLI arguments or API requests, manages the asynchronous flow, and formats results.
2.  **Data Collector (`src/analyzer.js`)**: A Puppeteer-based engine extract DOM properties in the website. Convert raw DOM data into structured “Artifacts”.
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

### 4. Regulatory & Standards Mapping (WCAG 2.2 & ISO 9241-11)

The RainbowSix analyzer is fully aligned with **WCAG 2.2** (published Oct 2023), with a specific focus on **Cognitive Accessibility** and **User Interaction Efficiency**.

#### 4.1 WCAG 2.2 Success Criteria Mapping
Each metric is evaluated against the latest success criteria to ensure compliance for users with cognitive, motor, or sensory impairments.

| Principle | Metric | WCAG 2.2 Criteria | Cognitive Impact & Meaning |
| :--- | :--- | :--- | :--- |
| **Perceivable** | `contrastIssueCount`, `videosWithCaptionsRatio` | 1.4.3 Contrast / 1.2.2 Captions | **Ensuring Information Reception**: If contrast is low or captions are missing, users with visual or hearing impairments cannot "receive" the content. Ensures content is identifiable regardless of sensory ability. |
| **Operable** | `visualDensityScore`, `autoplayMediaCount` | 2.5.8 Target Size / 2.2.2 Pause, Stop, Hide | **Reducing Distraction & Mismatched Interaction**: Crowded layouts (2.5.8) lead to accidental clicks for users with limited motor skills. Autoplay content distracts users with ADHD or cognitive disabilities and can trigger seizures. Help prevents accidental clicks and reduces distractions/seizure risks. |
| **Understandable** | `sentenceAverageLength`, `complexWordRatio`, `labelCoverage` | 3.1.5 Reading Level / 3.3.8 Accessible Authentication | **Lowering Cognitive Load**: Long sentences and jargon cause mental fatigue. SC 3.3.8 (New in 2.2) requires that users are not forced into "cognitive function tests" (like complex puzzles) to authenticate or submit forms. Help reduces mental fatigue; ensures users don't need "cognitive function tests" to use the site. |
| **Robust** | `maxDepth` | 2.4.8 Location / 2.4.5 Multiple Ways | **Preventing Navigational Lostness**: Ensures site structures are predictable. If nesting is too deep, users on screen readers or mobile devices may become completely disoriented within the site architecture.|

#### 4.2 ISO 9241-11 Usability Pillars
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

### 5. Technical Note on WCAG 2.2 Implementation
The analyzer specifically addresses the **Cognitive Load** aspect of WCAG 2.2. By evaluating `complexWordRatio` and `sentenceAverageLength`, the tool directly supports **SC 3.3.8 (Accessible Authentication)** by ensuring that the language used in help text and labels does not create an unnecessary "cognitive function test" for the user.
