// mapping.js

const mapping = {

  // ===== 1. CLEAR PURPOSE =====

  titleExists: {
    type: "boolean", 
    good: true, 
    weight: 2,
    problem: "Page has no title",
    suggestion: "Add a descriptive <title> tag to the page",
    wcag: "2.4.2 Page Titled", iso: "Effectiveness"
  },
  titleLength: {
    type: "range", 
    ideal: 30, 
    max: 70, 
    weight: 1,
    problem: "Page title is too short or missing",
    suggestion: "Use a descriptive title between 10-70 characters",
    wcag: "2.4.2 Page Titled", iso: "Effectiveness"
  },
  pageTitleMeaningfulScore: {
    type: "higherBetter", 
    good: 80, 
    bad: 0, 
    weight: 1.5,
    problem: "Page title is not descriptive enough",
    suggestion: "Use a specific, meaningful title that describes the page content",
    wcag: "2.4.2 Page Titled", iso: "Effectiveness"
  },
  h1Count: {
    type: "range", 
    ideal: 1, 
    max: 3, 
    weight: 1.5,
    problem: "Page has no H1 or too many H1s",
    suggestion: "Use exactly one H1 to define the main page topic",
    wcag: "2.4.6 Headings and Labels", iso: "Effectiveness"
  },
  headingCount: {
    type: "range", 
    ideal: 5, 
    max: 30, 
    weight: 1,
    problem: "Too few or too many headings",
    suggestion: "Use headings to structure content clearly",
    wcag: "2.4.6 Headings and Labels", iso: "Efficiency"
  },
  headingMeaningfulScore: {
    type: "higherBetter", 
    good: 80, 
    bad: 0, 
    weight: 1.2,
    problem: "Headings are not descriptive enough",
    suggestion: "Use meaningful heading text that summarises the section content",
    wcag: "2.4.6 Headings and Labels", iso: "Effectiveness"
  },
  labelCount: {
    type: "info", 
    weight: 0, 
    problem: "", 
    suggestion: "",
    wcag: "2.4.6 Headings and Labels", iso: "Effectiveness"
  },
  inputWithLabelRatio: {
    type: "higherBetter", 
    good: 1, 
    bad: 0.3, 
    weight: 1.5,
    problem: "Form inputs are missing associated labels",
    suggestion: "Associate every input with a <label> using for/id, aria-label, or aria-labelledby",
    wcag: "2.4.6 Headings and Labels", iso: "Effectiveness"
  },
  labelMeaningfulScore: {
    type: "higherBetter", 
    good: 90, 
    bad: 20, 
    weight: 1.2,
    problem: "Labels are not descriptive enough",
    suggestion: "Use clear, descriptive label text rather than placeholders or symbols alone",
    wcag: "2.4.6 Headings and Labels", iso: "Effectiveness"
  },


  // ===== 2. FINDABLE =====

  hasSkipLink: {
    type: "boolean", good: true, weight: 1.5,
    problem: "No skip link detected",
    suggestion: "Add a 'Skip to main content' link at the top of the page",
    wcag: "2.4.1 Bypass Blocks", iso: "Efficiency"
  },
  // scorer SKIP_RULES: skipped when hasSkipLink === false
  skipLinkWorks: {
    type: "boolean", good: true, weight: 2,
    problem: "Skip link is broken - target ID not found on page",
    suggestion: "Ensure the href of the skip link matches an actual id on the main content element",
    wcag: "2.4.1 Bypass Blocks", iso: "Effectiveness"
  },
  hasMainLandmark: {
    type: "boolean", good: true, weight: 1.5,
    problem: "No <main> landmark detected",
    suggestion: "Add a <main> element or role='main' to identify the primary content area",
    wcag: "2.4.1 Bypass Blocks", iso: "Efficiency"
  },
  hasSearch: {
    type: "boolean", good: true, weight: 1.2,
    problem: "No search functionality detected",
    suggestion: "Add a search input or site search to help users locate content",
    wcag: "2.4.5 Multiple Ways", iso: "Efficiency"
  },
  navCount: {
    type: "range", ideal: 1, max: 4, weight: 1,
    problem: "No navigation landmark or too many nav regions",
    suggestion: "Use one primary <nav> element for consistent navigation",
    wcag: "2.4.5 Multiple Ways", iso: "Efficiency"
  },
  avgLinksPerNav: {
    type: "range", ideal: 7, max: 30, weight: 1.5,
    problem: "Navigation menus contain too many links (cognitive overload)",
    suggestion: "Group navigation links into smaller chunks (7-10 items max) to prevent decision fatigue",
    wcag: "2.4.5 Multiple Ways", iso: "Efficiency"
  },
  internalLinkCount: {
    type: "range", ideal: 10, max: 150, weight: 1,
    problem: "Too few or too many internal links",
    suggestion: "Provide meaningful internal links to aid navigation",
    wcag: "2.4.5 Multiple Ways", iso: "Efficiency"
  },
  hasBreadcrumb: {
    type: "boolean", good: true, weight: 1,
    problem: "No breadcrumb navigation detected",
    suggestion: "Add breadcrumb navigation to help users understand their location within the site",
    wcag: "2.4.5 Multiple Ways", iso: "Efficiency"
  },
  // null returned by analyzer when no sheets were readable (scored as N/A)
  focusVisibleDetected: {
    type: "boolean", good: true, weight: 1.5,
    problem: "No visible focus indicator detected in stylesheets",
    suggestion: "Ensure all focusable elements have a visible :focus outline",
    wcag: "2.4.7 Focus Visible", iso: "Effectiveness"
  },


  // ===== 3. MEDIA =====

  // --- info-only counters (no direct score, used by SKIP_RULES) -----------
  videoCount: {
    type: "info", weight: 0, problem: "", suggestion: "",
    wcag: "1.2.1 Audio-only and Video-only", iso: "Effectiveness"
  },
  audioCount: {
    type: "info", weight: 0, problem: "", suggestion: "",
    wcag: "1.2.1 Audio-only and Video-only", iso: "Effectiveness"
  },
  captionTrackCount: {
    type: "info", weight: 0, problem: "", suggestion: "",
    wcag: "1.2.2 Captions", iso: "Effectiveness"
  },
  imgTotal: {
    type: "info", weight: 0, problem: "", suggestion: "",
    wcag: "1.1.1 Non-text Content", iso: "Effectiveness"
  },
  decorativeImgCount: {
    type: "info", weight: 0, problem: "", suggestion: "",
    wcag: "1.1.1 Non-text Content", iso: "Effectiveness"
  },

  // --- scored metrics -----------------------------------------------------

  // 1.1.1 – Always scored anchor metric (never skipped).
  // Measures whether the page has ANY accessible labelling for non-text
  // content. Derived in the scorer from whichever signals are available:
  // imgAltRatio when images exist, svgLabelRatio when SVGs exist, or a
  // combined score. When neither is available (no images, no SVGs, no video)
  // the scorer uses mediaAccessibilityScore directly from the analyzer.
  // The analyzer sets this to a composite 0-100 value so it always
  // contributes to the section and prevents all-null pages from coasting to 100.
  mediaAccessibilityScore: {
    type: "higherBetter", good: 95, bad: 20, weight: 2,
    problem: "Non-text content lacks sufficient accessible alternatives",
    suggestion: "Ensure all meaningful images have alt text, SVG icons have labels, and videos have captions",
    wcag: "1.1.1 Non-text Content", iso: "Effectiveness"
  },

  // scorer SKIP_RULES: skipped when videoCount === 0
  videosWithCaptionsRatio: {
    type: "higherBetter", good: 1, bad: 0, weight: 1.5,
    problem: "Videos lack captions",
    suggestion: "Add a <track kind='captions'> element to every <video>",
    wcag: "1.2.2 Captions", iso: "Effectiveness"
  },
  // scorer SKIP_RULES: skipped when videoCount === 0 && audioCount === 0
  transcriptLinkCount: {
    type: "higherBetter", good: 1, bad: 0, weight: 1,
    problem: "No transcript links found for audio/video content",
    suggestion: "Provide text transcripts linked near each media element",
    wcag: "1.2.3 Audio Description", iso: "Effectiveness"
  },
  autoplayMediaCount: {
    type: "lowerBetter", good: 0, bad: 5, weight: 1.2,
    problem: "Too many autoplay media elements",
    suggestion: "Disable autoplay or add user controls",
    wcag: "1.2.2 Captions / 2.2.2 Pause, Stop, Hide", iso: "Satisfaction"
  },

  // scorer SKIP_RULES: skipped when imgTotal === 0
  // 1.1.1 – proportion of meaningful images that carry alt text or aria-label.
  // Kept as a detail metric; the aggregate signal is mediaAccessibilityScore.
  imgAltRatio: {
    type: "higherBetter", good: 1, bad: 0.5, weight: 1.2,
    problem: "Meaningful images are missing alternative text",
    suggestion: "Add descriptive alt attributes (or aria-label) to all informative <img> elements; use alt='' for purely decorative images",
    wcag: "1.1.1 Non-text Content", iso: "Effectiveness"
  },

  // scorer SKIP_RULES: skipped when imgTotal === 0
  // Penalises filename-like or generic alt text (e.g. "image001.jpg", "photo")
  lowQualityAltCount: {
    type: "lowerBetter", good: 0, bad: 5, weight: 0.8,
    problem: "Some images have generic or filename-like alt text that provides no useful description",
    suggestion: "Replace auto-generated or generic alt text with a concise description of what the image shows",
    wcag: "1.1.1 Non-text Content", iso: "Effectiveness"
  },

  // scorer SKIP_RULES: skipped when svgLabelRatio === null (no meaningful SVGs)
  // 1.1.1 – inline SVGs used as icons should carry <title> or aria-label
  svgLabelRatio: {
    type: "higherBetter", good: 1, bad: 0.3, weight: 1.2,
    problem: "Inline SVG icons are missing accessible labels",
    suggestion: "Add a <title> element or aria-label to each meaningful inline SVG; add aria-hidden='true' to decorative ones",
    wcag: "1.1.1 Non-text Content", iso: "Effectiveness"
  },

  // scorer SKIP_RULES: skipped when bgVideoAriaHiddenRatio === null (no bg videos)
  // Background videos that loop & are muted should be aria-hidden
  bgVideoAriaHiddenRatio: {
    type: "higherBetter", good: 1, bad: 0, weight: 1.2,
    problem: "Background videos (muted, looping) are not hidden from assistive technology",
    suggestion: "Add aria-hidden='true' to decorative background <video> elements so screen readers ignore them",
    wcag: "1.1.1 Non-text Content", iso: "Effectiveness"
  },


  // ===== 4. CLEAR LANGUAGE =====

  // null returned by analyzer when word count < 50 (scored as N/A)
  readabilityScore: {
    type: "higherBetter", good: 70, bad: 30, weight: 2,
    problem: "Content readability is too low",
    suggestion: "Simplify sentence structure and vocabulary for a general audience",
    wcag: "3.1.5 Reading Level", iso: "Effectiveness"
  },
  sentenceAverageLength: {
    type: "range", ideal: 15, max: 30, weight: 1.5,
    problem: "Sentences are too long",
    suggestion: "Use shorter sentences or bullet points",
    wcag: "3.1.5 Reading Level", iso: "Efficiency"
  },
  paragraphAverageLength: {
    type: "range", ideal: 50, max: 150, weight: 1,
    problem: "Paragraphs are too long",
    suggestion: "Break long paragraphs into shorter, focused chunks",
    wcag: "3.1.5 Reading Level", iso: "Efficiency"
  },
  complexWordRatio: {
    type: "lowerBetter", good: 0.1, bad: 0.3, weight: 1,
    problem: "Too many complex words",
    suggestion: "Simplify vocabulary or provide definitions for technical terms",
    wcag: "3.1.3 Unusual Words", iso: "Effectiveness"
  },
  langAttributeExists: {
    type: "boolean", good: true, weight: 1.5,
    problem: "Missing lang attribute on <html> element",
    suggestion: "Add a lang attribute to the <html> tag (e.g. lang='en')",
    wcag: "3.1.2 Language of Parts", iso: "Effectiveness"
  },


  // ===== 5. VISUAL PRESENTATION =====

  lineLengthEstimate: {
    type: "range", ideal: 66, max: 100, weight: 1,
    problem: "Line length may be too wide for comfortable reading",
    suggestion: "Keep line length to approximately 60-80 characters",
    wcag: "1.4.8 Visual Presentation", iso: "Satisfaction"
  },
  // 1.4.3
  contrastIssueCount: {
    type: "lowerBetter", good: 0, bad: 10, weight: 1.2,
    problem: "Text contrast issues detected",
    suggestion: "Improve text/background contrast ratio (4.5:1 for normal text, 3:1 for large text)",
    wcag: "1.4.3 Contrast (Minimum)", iso: "Effectiveness"
  },
  // 1.4.11
  nonTextContrastIssueCount: {
    type: "lowerBetter", good: 0, bad: 15, weight: 1.3,
    problem: "UI component boundaries (buttons, inputs) have insufficient contrast against their background",
    suggestion: "Ensure interactive element borders/outlines meet a 3:1 contrast ratio against adjacent colours (WCAG 1.4.11)",
    wcag: "1.4.11 Non-text Contrast", iso: "Effectiveness"
  },
  reflowIssueCount: {
    type: "lowerBetter", good: 0, bad: 100, weight: 1.2,
    problem: "Fixed-width containers detected that may break content reflow at 320 CSS pixels",
    suggestion: "Replace fixed pixel widths with max-width or percentage-based widths so content reflows without horizontal scrolling (WCAG 1.4.10)",
    wcag: "1.4.10 Reflow", iso: "Effectiveness"
  },
  visualDensityScore: {
    type: "range", ideal: 400, max: 1200, weight: 1.5,
    problem: "Page too visually dense",
    suggestion: "Reduce clutter and group related content",
    wcag: "1.4.8 Visual Presentation", iso: "Efficiency"
  },
  fontResizeSupport: {
    type: "boolean", good: true, weight: 1.2,
    problem: "Font sizes may not use relative units (em/rem)",
    suggestion: "Use em or rem units for font sizes to support browser zoom",
    wcag: "1.4.8 Visual Presentation", iso: "Effectiveness"
  },
  textJustifyCount: {
    type: "lowerBetter", good: 0, bad: 3, weight: 1.5,
    problem: "Text is justified (aligned to both margins), causing rivers of white space",
    suggestion: "Use left-aligned text to help users with dyslexia track lines",
    wcag: "1.4.8 Visual Presentation", iso: "Effectiveness"
  },
  lineSpacingIssueCount: {
    type: "lowerBetter", good: 0, bad: 20, weight: 1.5,
    problem: "Line spacing is too tight (below 1.5x font size)",
    suggestion: "Ensure line-height is at least 1.5 times the font size for better readability",
    wcag: "1.4.12 Text Spacing", iso: "Satisfaction"
  },


  // ===== 6. ASSISTANCE & SUPPORT =====

  formFieldCount: {
    type: "info", weight: 0, problem: "", suggestion: "",
    wcag: "3.3.2 Labels or Instructions", iso: "Effectiveness"
  },
  // scorer SKIP_RULES: the following are skipped when formFieldCount === 0
  labelCoverage: {
    type: "higherBetter", good: 0.9, bad: 0.3, weight: 1.5,
    problem: "Form inputs lack labels",
    suggestion: "Add visible <label> elements or aria-label to all form inputs",
    wcag: "3.3.2 Labels or Instructions", iso: "Effectiveness"
  },
  hasErrorMessage: {
    type: "boolean", good: true, weight: 1.5,
    problem: "No error message pattern detected",
    suggestion: "Add ARIA live regions or visible error messages for form validation",
    wcag: "3.3.3 Error Suggestion", iso: "Effectiveness"
  },
  accessibleValidationRatio: {
    type: "higherBetter", good: 0.8, bad: 0.2, weight: 1.5,
    problem: "Form inputs lack accessible validation bindings (e.g. aria-describedby)",
    suggestion: "Use ARIA attributes to programmatically link error messages to their corresponding input fields",
    wcag: "3.3.1 Error Identification", iso: "Effectiveness"
  },
  requiredFieldCount: {
    type: "lowerBetter", good: 0, bad: 10, weight: 1,
    problem: "Too many required fields may overwhelm users",
    suggestion: "Minimise required fields and clearly mark which are mandatory",
    wcag: "3.3.4 Error Prevention", iso: "Effectiveness"
  },
  hasSubmissionReviewMechanism: {
    type: "boolean", good: true, weight: 1.5,
    problem: "No review, confirm, or undo mechanism detected for form submissions",
    suggestion: "Provide a review step or an undo option before finalising important form submissions",
    wcag: "3.3.4 Error Prevention", iso: "Satisfaction"
  },
  // 1.3.5 - scorer SKIP_RULES: skipped when formFieldCount === 0
  autocompleteRatio: {
    type: "higherBetter", good: 0.8, bad: 0, weight: 1.3,
    problem: "Personal data inputs (name, email, address) are missing autocomplete purpose attributes",
    suggestion: "Add meaningful autocomplete tokens (e.g. autocomplete='email', 'given-name', 'tel') to help users and password managers fill forms correctly (WCAG 1.3.5)",
    wcag: "1.3.5 Identify Input Purpose", iso: "Effectiveness"
  },
  // scorer SKIP_RULES: skipped when formFieldCount === 0
  inputTypeMismatchCount: {
    type: "lowerBetter", good: 0, bad: 3, weight: 1.2,
    problem: "Input fields use generic type='text' despite their name/placeholder indicating a specific data type",
    suggestion: "Use the correct HTML input type (e.g. type='email', 'tel', 'url', 'date', 'number') to trigger native keyboards, validation, and autofill",
    wcag: "3.3.2 Labels or Instructions", iso: "Effectiveness"
  },
  // scorer SKIP_RULES: skipped when formFieldCount === 0
  inlineErrorCoverageRatio: {
    type: "higherBetter", good: 1, bad: 0, weight: 1.3,
    problem: "One or more forms lack an inline error region (role='alert', aria-live, or .error class)",
    suggestion: "Add an inline error container inside each form and link it to its inputs via aria-describedby so screen readers announce validation failures immediately",
    wcag: "3.3.1 Error Identification", iso: "Effectiveness"
  },


  // ===== 7. DISTRACTION =====

  // 2.2.2
  gifCount: {
    type: "lowerBetter", good: 0, bad: 5, weight: 1.2,
    problem: "Looping GIF images detected - a leading cause of visual distraction",
    suggestion: "Replace looping GIFs with <video> (autoplay disabled) or CSS animations that respect prefers-reduced-motion",
    wcag: "2.2.2 Pause, Stop, Hide", iso: "Satisfaction"
  },
  animationCount: {
    type: "lowerBetter", good: 0, bad: 10, weight: 1.2,
    problem: "Long-running or infinite CSS animations detected",
    suggestion: "Reduce persistent animations or respect the prefers-reduced-motion media query",
    wcag: "2.2.2 Pause, Stop, Hide", iso: "Satisfaction"
  },
  autoUpdatingContentCount: {
    type: "lowerBetter", good: 0, bad: 5, weight: 1.2,
    problem: "Auto-updating content detected without user control",
    suggestion: "Allow users to pause, stop, or control auto-updating content",
    wcag: "2.2.2 Pause, Stop, Hide", iso: "Satisfaction"
  },
  hasPauseControl: {
    type: "boolean", good: true, weight: 0.8,
    problem: "No pause or stop control found for animated/moving content",
    suggestion: "Add pause/stop/hide controls near any moving or auto-playing content",
    wcag: "2.2.2 Pause, Stop, Hide", iso: "Satisfaction"
  },
  // null returned by analyzer when no stylesheet was readable (CDN-only sites)
  respectsReducedMotion: {
    type: "boolean", good: true, weight: 1.5,
    problem: "No prefers-reduced-motion media query detected in stylesheets",
    suggestion: "Add @media (prefers-reduced-motion: reduce) rules to disable or tone down animations for users who request reduced motion in their OS settings",
    wcag: "2.2.2 Pause, Stop, Hide", iso: "Satisfaction"
  },
  // 2.3.2
  flashingElementCount: {
    type: "lowerBetter", good: 0, bad: 1, weight: 2.0,
    problem: "Elements detected that may flash faster than 3 times per second (seizure risk)",
    suggestion: "Remove or throttle animations whose cycle is shorter than 333 ms, or ensure the flashing area is below the WCAG small safe area threshold",
    wcag: "2.3.2 Three Flashes", iso: "Effectiveness"
  },
  // 2.2.1
  timedInteractionCount: {
    type: "lowerBetter", good: 0, bad: 3, weight: 1.5,
    problem: "Timed interactions or session countdowns detected",
    suggestion: "Allow users to turn off, adjust, or extend any time limit (at least 10x the default)",
    wcag: "2.2.1 Timing Adjustable", iso: "Effectiveness"
  },
  // scorer SKIP_RULES: skipped when timedInteractionCount === 0
  hasExtendTimeOption: {
    type: "boolean", good: true, weight: 1.5,
    problem: "No option detected to extend or disable the time limit",
    suggestion: "Provide a clearly labelled control (e.g. 'Stay logged in') before the time limit expires",
    wcag: "2.2.1 Timing Adjustable", iso: "Satisfaction"
  },
  stickyCount: {
    type: "lowerBetter", good: 2, bad: 10, weight: 1.0,
    problem: "High number of fixed or sticky elements detected, reducing usable viewport space",
    suggestion: "Limit sticky elements to one primary navigation bar; avoid stacking multiple fixed bars that compress the reading area",
    wcag: "1.4.10 Reflow", iso: "Satisfaction"
  }

};

module.exports = { mapping };
