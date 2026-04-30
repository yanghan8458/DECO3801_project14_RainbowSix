// src/scorer.js

const { mapping } = require("./mapping");

// ---------------------------------------------------------------------------
// Metric scoring
// ---------------------------------------------------------------------------
function scoreMetric(value, config) {
  if (value === null || value === undefined) return null;
  if (config.type === "info") return null;

  if (config.type === "boolean") {
    if (typeof value !== "boolean") return null;
    return value === config.good ? 100 : 0;
  }

  if (config.type === "lowerBetter") {
    if (value <= config.good) return 100;
    if (value >= config.bad) return 0;
    return Math.round(
      100 * (1 - (value - config.good) / (config.bad - config.good))
    );
  }

  if (config.type === "higherBetter") {
    if (value >= config.good) return 100;
    if (value <= config.bad) return 0;
    return Math.round(
      100 * ((value - config.bad) / (config.good - config.bad))
    );
  }

  if (config.type === "range") {
    if (value <= config.ideal) return 100;
    if (value >= config.max) return 0;
    return Math.round(
      100 * (1 - (value - config.ideal) / (config.max - config.ideal))
    );
  }

  return 100;
}

// ---------------------------------------------------------------------------
// Skip rules
// ---------------------------------------------------------------------------
const SKIP_RULES = {
  skipLinkWorks: (m) => m.hasSkipLink === false,
  videosWithCaptionsRatio: (m) => (m.videoCount ?? 0) === 0,
  transcriptLinkCount: (m) =>
    (m.videoCount ?? 0) === 0 && (m.audioCount ?? 0) === 0,

  imgAltRatio: (m) => (m.imgTotal ?? 0) === 0,
  lowQualityAltCount: (m) => (m.imgTotal ?? 0) === 0,

  svgLabelRatio: (m) => m.svgLabelRatio === null,
  bgVideoAriaHiddenRatio: (m) => m.bgVideoAriaHiddenRatio === null,

  labelCoverage: (m) => (m.formFieldCount ?? 0) === 0,
  accessibleValidationRatio: (m) => (m.formFieldCount ?? 0) === 0,
  autocompleteRatio: (m) => (m.formFieldCount ?? 0) === 0,
  inputTypeMismatchCount: (m) => (m.formFieldCount ?? 0) === 0,
  inlineErrorCoverageRatio: (m) => (m.formFieldCount ?? 0) === 0,

  hasExtendTimeOption: (m) => (m.timedInteractionCount ?? 0) === 0,
};

// ---------------------------------------------------------------------------
// Section scoring
// ---------------------------------------------------------------------------
function scoreSection(metrics) {
  let total = 0;
  let weightSum = 0;

  for (const key in metrics) {
    const config = mapping[key];
    if (!config) continue;

    const skip = SKIP_RULES[key];
    if (skip && skip(metrics)) continue;

    const score = scoreMetric(metrics[key], config);
    if (score === null) continue;

    const w = config.weight || 1;
    total += score * w;
    weightSum += w;
  }

  return {
    score: weightSum ? Math.round(total / weightSum) : null,
    activeMetricCount: weightSum > 0 ? 1 : 0,
  };
}

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------
function generateInsights(artifacts) {
  const insights = [];

  for (const section in artifacts) {
    const metrics = artifacts[section];
    if (!metrics) continue;

    for (const key in metrics) {
      const config = mapping[key];
      if (!config) continue;

      const skip = SKIP_RULES[key];
      if (skip && skip(metrics)) continue;

      const value = metrics[key];
      const score = scoreMetric(value, config);

      if (score !== null && score < 60) {
        insights.push({
          section,
          metric: key,
          value,
          score,
          severity: score === 0 ? "critical" : score < 30 ? "serious" : "moderate",
          problem: config.problem,
          suggestion: config.suggestion,
          mapping: { wcag: config.wcag, iso: config.iso },
        });
      }
    }
  }

  insights.sort((a, b) => a.score - b.score);
  return insights;
}

// ---------------------------------------------------------------------------
// Weights
// ---------------------------------------------------------------------------
const SECTION_WEIGHTS = {
  purpose: 0.15,
  findable: 0.15,
  media: 0.1,
  language: 0.2,
  visual: 0.15,
  assistance: 0.1,
  distraction: 0.15,
};

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------
function statusLabel(score) {
  if (score >= 85) return "good";
  if (score >= 70) return "caution";
  if (score >= 55) return "warning";
  return "poor";
}

// ---------------------------------------------------------------------------
// Penalty system (stable version)
// ---------------------------------------------------------------------------
const PENALTY_THRESHOLD = 50;
const PENALTY_STRENGTH = 1.5;
const PENALTY_FLOOR = 0.5;

// ---------------------------------------------------------------------------
// Contrast + Differentiation tuning
// ---------------------------------------------------------------------------
const CONTRAST_MID = 60;
const CONTRAST_FACTOR = 1.25;
const VARIANCE_BOOST = 1.35;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function calculateScores(artifacts) {
  const sections = [];
  let weightedTotal = 0;
  let weightSum = 0;

  for (const section in artifacts) {
    const { score, activeMetricCount } = scoreSection(artifacts[section]);

    const nominalWeight =
      SECTION_WEIGHTS[section] ??
      1 / Object.keys(artifacts).length;

    const isScored = score !== null && activeMetricCount > 0;

    sections.push({
      category: section,
      score: isScored ? score : null,
      weight: nominalWeight,
      status: !isScored ? "na" : statusLabel(score),
    });

    if (isScored) {
      weightedTotal += score * nominalWeight;
      weightSum += nominalWeight;
    }
  }

  // -----------------------------------------------------------------------
  // Step 1: arithmetic mean
  // -----------------------------------------------------------------------
  const arithmeticScore = weightSum ? weightedTotal / weightSum : 0;

  // -----------------------------------------------------------------------
  // Step 2: penalty (failure suppression)
  // -----------------------------------------------------------------------
  let penaltyMultiplier = 1.0;

  for (const sec of sections) {
    if (sec.score !== null && sec.score < PENALTY_THRESHOLD) {
      const miss = (PENALTY_THRESHOLD - sec.score) / PENALTY_THRESHOLD;
      penaltyMultiplier *=
        1 - miss * sec.weight * PENALTY_STRENGTH;
    }
  }

  penaltyMultiplier = Math.max(penaltyMultiplier, PENALTY_FLOOR);

  const penalizedScore = arithmeticScore * penaltyMultiplier;

  // -----------------------------------------------------------------------
  // Step 3: variance amplification 
  // -----------------------------------------------------------------------
  const deviation = penalizedScore - arithmeticScore;
  const boostedScore = arithmeticScore + deviation * VARIANCE_BOOST;

  // -----------------------------------------------------------------------
  // Step 4: contrast stretch
  // -----------------------------------------------------------------------
  let adjustedScore =
    CONTRAST_MID +
    (boostedScore - CONTRAST_MID) * CONTRAST_FACTOR;

  adjustedScore = Math.max(0, Math.min(100, adjustedScore));

  const overallScore = Math.round(adjustedScore * 10) / 10;

  return {
    scores: {
      overallScore,
      overallStatus: statusLabel(overallScore),
      sections,
    },
    insights: generateInsights(artifacts),
  };
}

module.exports = { calculateScores };
