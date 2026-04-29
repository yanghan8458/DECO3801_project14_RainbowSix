// src/scorer.js

const { mapping } = require("./mapping");

// -- Metric scoring --------------------------------------------------------
function scoreMetric(value, config) {
  if (value === null || value === undefined) return null;
  if (config.type === "info") return null;

  if (config.type === "boolean") {
    if (typeof value !== "boolean") return null;
    return value === config.good ? 100 : 0;
  }
  if (config.type === "lowerBetter") {
    if (value <= config.good) return 100;
    if (value >= config.bad)  return 0;
    return Math.round(100 * (1 - (value - config.good) / (config.bad - config.good)));
  }
  if (config.type === "higherBetter") {
    if (value >= config.good) return 100;
    if (value <= config.bad)  return 0;
    return Math.round(100 * ((value - config.bad) / (config.good - config.bad)));
  }
  if (config.type === "range") {
    if (value <= config.ideal) return 100;
    if (value >= config.max)   return 0;
    return Math.round(100 * (1 - (value - config.ideal) / (config.max - config.ideal)));
  }
  return 100;
}

// -- Conditional skip rules ------------------------------------------------
// Each rule receives the full section metrics object and returns true when
// the metric should be excluded from scoring (treated as N/A).
const SKIP_RULES = {
  // Only penalise a broken skip link if a skip link actually exists.
  skipLinkWorks: (m) => m.hasSkipLink === false,

  // Only score caption ratio when there are actual videos on the page.
  videosWithCaptionsRatio: (m) => (m.videoCount ?? 0) === 0,

  // Only penalise missing transcripts when the page has audio or video.
  transcriptLinkCount: (m) => (m.videoCount ?? 0) === 0 && (m.audioCount ?? 0) === 0,

  // Only score image alt metrics when there are visible images.
  // imgTotal counts ALL visible imgs; if it's 0, these are N/A.
  imgAltRatio:        (m) => (m.imgTotal ?? 0) === 0,
  lowQualityAltCount: (m) => (m.imgTotal ?? 0) === 0,

  // Only score SVG label ratio when the analyzer found meaningful SVGs.
  // The analyzer returns null when no meaningful SVGs exist.
  svgLabelRatio: (m) => m.svgLabelRatio === null,

  // Only score background-video aria-hidden when background videos exist.
  // The analyzer returns null when no background videos exist.
  bgVideoAriaHiddenRatio: (m) => m.bgVideoAriaHiddenRatio === null,

  // Form-specific metrics are N/A when there are no form fields.
  labelCoverage:              (m) => (m.formFieldCount ?? 0) === 0,
  accessibleValidationRatio:  (m) => (m.formFieldCount ?? 0) === 0,
  autocompleteRatio:          (m) => (m.formFieldCount ?? 0) === 0,
  inputTypeMismatchCount:     (m) => (m.formFieldCount ?? 0) === 0,
  inlineErrorCoverageRatio:   (m) => (m.formFieldCount ?? 0) === 0,

  // Only penalise "no extend-time option" when timed interactions exist.
  hasExtendTimeOption: (m) => (m.timedInteractionCount ?? 0) === 0,
};

// -- Section scoring -------------------------------------------------------
// Returns { score, activeMetricCount }.
// score is null when NO metrics in the section contributed (all skipped/info).
// This lets calculateScores exclude the section from the weighted total
// rather than polluting the overall score with a meaningless 100.
function scoreSection(metrics) {
  let total     = 0;
  let weightSum = 0;

  for (const key in metrics) {
    const config = mapping[key];
    if (!config) continue;

    const skip = SKIP_RULES[key];
    if (skip && skip(metrics)) continue;

    const score = scoreMetric(metrics[key], config);
    if (score === null) continue;

    const w = config.weight || 1;
    total     += score * w;
    weightSum += w;
  }

  return {
    score:             weightSum ? Math.round(total / weightSum) : null,
    activeMetricCount: weightSum > 0 ? 1 : 0  // flag: >0 means scorable
  };
}

// -- Insights --------------------------------------------------------------
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
          problem:    config.problem,
          suggestion: config.suggestion,
          mapping: { wcag: config.wcag, iso: config.iso }
        });
      }
    }
  }

  // Most severe first
  insights.sort((a, b) => a.score - b.score);
  return insights;
}

// Section weights - must sum to 1.0
const SECTION_WEIGHTS = {
  purpose:     0.15,
  findable:    0.15,
  media:       0.10,
  language:    0.20,
  visual:      0.15,
  assistance:  0.10,
  distraction: 0.15
};

// -- Main entry point ------------------------------------------------------
function calculateScores(artifacts) {
  const sections      = [];
  let weightedTotal   = 0;
  let weightSum       = 0;

  for (const section in artifacts) {
    const { score, activeMetricCount } = scoreSection(artifacts[section]);
    const nominalWeight = SECTION_WEIGHTS[section] ?? (1 / Object.keys(artifacts).length);

    // If the section produced no scorable metrics (e.g. media on a page
    // with no images, videos, or audio) treat it as N/A: exclude its weight
    // from the denominator so it doesn't pull the overall score toward 100.
    const isScored = score !== null && activeMetricCount > 0;

    sections.push({
      category: section,
      score:    isScored ? score : null,
      weight:   nominalWeight,
      // "na" status makes it easy for UIs to grey out the section tile
      status:   !isScored ? "na"
               : score >= 80 ? "good"
               : score >= 60 ? "warning"
               : "poor"
    });

    if (isScored) {
      weightedTotal += score * nominalWeight;
      weightSum     += nominalWeight;
    }
  }

  const overallScore = weightSum
    ? Math.round((weightedTotal / weightSum) * 10) / 10
    : 0;

  return {
    scores: {
      overallScore,
      overallStatus: overallScore >= 80 ? "good" : overallScore >= 60 ? "warning" : "poor",
      sections
    },
    insights: generateInsights(artifacts)
  };
}

module.exports = { calculateScores };
