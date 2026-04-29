// src/analyzer.js

const puppeteer = require("puppeteer");

async function analyzePage(url) {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    const artifacts = await page.evaluate(() => {

      // -- 1. Clear Purpose ------------------------------------------------
      function analyzePurpose() {
        const title    = document.title || "";
        const h1s      = document.querySelectorAll("h1");
        const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");

        const titleWords       = title.trim().split(/\s+/).filter(Boolean);
        const genericPatterns  = /^(home|index|untitled|welcome|page)$/i;
        const pageTitleMeaningfulScore = (() => {
          if (!title.trim()) return 0;
          if (titleWords.length < 2) return 30;
          if (genericPatterns.test(title.trim())) return 40;
          if (titleWords.length >= 3 && /[|\-:]/.test(title)) return 100;
          if (titleWords.length >= 2) return 80;
          return 60;
        })();

        const headingArr = Array.from(headings);
        const meaningfulHeadings = headingArr.filter(h => {
          const text = (h.innerText || h.textContent || "").trim();
          return text.split(/\s+/).filter(Boolean).length >= 2 && text.length > 4;
        });
        const headingMeaningfulScore = headingArr.length
          ? Math.round((meaningfulHeadings.length / headingArr.length) * 100)
          : 100;

        const allLabels  = Array.from(document.querySelectorAll("label"));
        const labelCount = allLabels.length;
        const inputs = Array.from(document.querySelectorAll(
          "input:not([type='hidden']), textarea, select"
        ));
        const labeledInputs = inputs.filter(input =>
          input.closest("label") ||
          (input.id && document.querySelector(`label[for="${input.id}"]`)) ||
          input.getAttribute("aria-label") ||
          input.getAttribute("aria-labelledby")
        );
        const inputWithLabelRatio = inputs.length
          ? labeledInputs.length / inputs.length : 1;

        const meaningfulLabels = allLabels.filter(l =>
          (l.innerText || l.textContent || "").trim().replace(/\*/g, "").trim().length >= 2
        );
        const labelMeaningfulScore = labelCount
          ? Math.round((meaningfulLabels.length / labelCount) * 100) : 100;

        return {
          titleExists: title.trim().length > 0,
          titleLength: title.trim().length,
          pageTitleMeaningfulScore,
          h1Count: h1s.length,
          headingCount: headings.length,
          headingMeaningfulScore,
          labelCount,
          inputWithLabelRatio,
          labelMeaningfulScore
        };
      }

      // -- 2. Findable -----------------------------------------------------
      function analyzeFindable() {
        const allLinks = Array.from(document.querySelectorAll("a[href]"));

        const skipLink    = allLinks.find(a =>
          /^#(main|content|skip|primary|maincontent)/i.test(a.getAttribute("href"))
        );
        const hasSkipLink = !!skipLink;

        let skipLinkWorks = null;
        if (hasSkipLink) {
          const targetId = skipLink.getAttribute("href").substring(1);
          skipLinkWorks  = !!(
            document.getElementById(targetId) ||
            document.querySelector(`[name="${targetId}"]`)
          );
        }

        const hasMainLandmark = !!document.querySelector("main, [role='main']");
        const hasSearch       = !!document.querySelector(
          "input[type='search'], [role='search'], form[role='search']"
        );

        const navCount = document.querySelectorAll("nav").length;
        const navs     = Array.from(document.querySelectorAll("nav"));
        const totalNavLinks  = navs.reduce((n, nav) => n + nav.querySelectorAll("a").length, 0);
        const avgLinksPerNav = navs.length ? totalNavLinks / navs.length : 0;

        const internalLinkCount = allLinks.filter(a => {
          const href = a.getAttribute("href") || "";
          return href.startsWith("/") || href.startsWith("#") ||
            href.startsWith(window.location.origin);
        }).length;

        const hasBreadcrumb = !!document.querySelector(
          "[aria-label*='breadcrumb' i], [class*='breadcrumb' i], [itemtype*='BreadcrumbList']"
        );

        let focusVisibleDetected = false;
        let anySheetReadable     = false;
        try {
          for (const sheet of Array.from(document.styleSheets)) {
            try {
              const rules = Array.from(sheet.cssRules || []);
              anySheetReadable = true;
              for (const rule of rules) {
                if (
                  rule.selectorText?.includes(":focus") &&
                  rule.style?.outline !== "none" &&
                  rule.style?.outline !== "0"
                ) { focusVisibleDetected = true; }
              }
            } catch (_) { /* cross-origin sheet, skip */ }
          }
        } catch (_) {}

        return {
          hasSkipLink, skipLinkWorks, hasMainLandmark, hasSearch,
          navCount, avgLinksPerNav, internalLinkCount, hasBreadcrumb,
          focusVisibleDetected: anySheetReadable ? focusVisibleDetected : null
        };
      }

      // -- 3. Media --------------------------------------------------------
      function analyzeMedia() {
        const videos = Array.from(document.querySelectorAll("video"));
        const audios = Array.from(document.querySelectorAll("audio"));

        const captionTrackCount = videos.reduce(
          (n, v) => n + v.querySelectorAll("track[kind='captions']").length, 0
        );
        const videosWithCaptionsRatio = videos.length
          ? videos.filter(v => v.querySelector("track[kind='captions']")).length / videos.length
          : null; // null = no videos, scorer skips

        const transcriptLinkCount = Array.from(document.querySelectorAll("a")).filter(a =>
          /transcript/i.test(a.textContent) || /transcript/i.test(a.getAttribute("href") || "")
        ).length;

        const autoplayMediaCount = [
          ...videos.filter(v => v.autoplay),
          ...audios.filter(a => a.autoplay)
        ].length;

        // -- NEW: Image alternative text (WCAG 1.1.1) ---------------------
        // Collect all <img> elements that are visible and meaningful
        // (not hidden, not inside <picture> with a source that already has alt).
        const allImgs = Array.from(document.querySelectorAll("img"));
        const visibleImgs = allImgs.filter(img => {
          const s = window.getComputedStyle(img);
          return s.display !== "none" && s.visibility !== "hidden";
        });

        // An image is "decorative" when it intentionally has alt=""
        const decorativeImgCount = visibleImgs.filter(
          img => img.getAttribute("alt") === ""
        ).length;

        // Meaningful images = visible, not explicitly decorative
        const meaningfulImgs = visibleImgs.filter(
          img => img.getAttribute("alt") !== ""
        );

        // Among meaningful images, count those with a non-empty alt
        const imgsWithAlt = meaningfulImgs.filter(img => {
          const alt = (img.getAttribute("alt") || "").trim();
          return alt.length > 0;
        });

        // Also accept aria-label / aria-labelledby as alt equivalents
        const imgsWithAltOrAria = meaningfulImgs.filter(img => {
          const alt = (img.getAttribute("alt") || "").trim();
          return (
            alt.length > 0 ||
            img.getAttribute("aria-label") ||
            (img.getAttribute("aria-labelledby") &&
              document.getElementById(img.getAttribute("aria-labelledby")))
          );
        });

        // imgAltRatio: proportion of meaningful images that have alt text.
        // null when there are no meaningful images (nothing to score).
        const imgAltRatio = meaningfulImgs.length
          ? imgsWithAltOrAria.length / meaningfulImgs.length
          : null;

        // Proportion of imgs whose alt text looks auto-generated / filename-like
        // e.g. "image001.jpg", "banner_2024", "photo_5" — a quality signal.
        const filenamePattern = /\.(jpe?g|png|gif|webp|svg|avif)$/i;
        const genericAltPattern = /^(image|img|photo|pic|banner|icon|logo|thumb|untitled)[\s_\-\d]*$/i;
        const lowQualityAltCount = imgsWithAlt.filter(img => {
          const alt = (img.getAttribute("alt") || "").trim();
          return filenamePattern.test(alt) || genericAltPattern.test(alt);
        }).length;

        // -- NEW: SVG / icon accessibility (WCAG 1.1.1) -------------------
        // Inline SVGs used as meaningful icons should carry a title or aria-label.
        const inlineSvgs = Array.from(document.querySelectorAll("svg"));
        const meaningfulSvgs = inlineSvgs.filter(svg => {
          // SVGs with aria-hidden="true" or role="presentation" are decorative
          if (
            svg.getAttribute("aria-hidden") === "true" ||
            svg.getAttribute("role") === "presentation" ||
            svg.getAttribute("role") === "none"
          ) return false;
          const s = window.getComputedStyle(svg);
          return s.display !== "none" && s.visibility !== "hidden";
        });
        const svgsWithLabel = meaningfulSvgs.filter(svg =>
          svg.querySelector("title") ||
          svg.getAttribute("aria-label") ||
          svg.getAttribute("aria-labelledby")
        );
        // svgLabelRatio: null when no meaningful inline SVGs
        const svgLabelRatio = meaningfulSvgs.length
          ? svgsWithLabel.length / meaningfulSvgs.length
          : null;

        // -- NEW: Background video accessibility --------------------------
        // Background videos (muted, loop, no controls) should be aria-hidden.
        const bgVideos = videos.filter(v => v.muted && v.loop && !v.controls);
        const bgVideosAriaHidden = bgVideos.filter(
          v => v.getAttribute("aria-hidden") === "true"
        );
        // bgVideoAriaHiddenRatio: null when no background videos
        const bgVideoAriaHiddenRatio = bgVideos.length
          ? bgVideosAriaHidden.length / bgVideos.length
          : null;

        // -- Composite anchor metric: mediaAccessibilityScore ----------------
        // Always a number (never null). Weighted combination of whichever
        // signals are available: img alt coverage (40 pts), SVG labelling
        // (30 pts), video caption coverage (30 pts).
        //
        // Key design: when a component is ABSENT (no images / no SVGs / no
        // video), we do NOT redistribute its weight as a perfect score.
        // Instead, absent components contribute a neutral 70 pts at their
        // full weight, so a page that has nothing to evaluate is gently
        // penalised relative to one that actually does the work correctly.
        // This prevents all-null pages from coasting to 100.
        const _masComponents = [];
        // Image alt component
        if (visibleImgs.length > 0) {
          const altScore = imgAltRatio !== null ? imgAltRatio * 100 : 0;
          const qualityPenalty = imgsWithAlt.length > 0
            ? Math.min(lowQualityAltCount / imgsWithAlt.length, 1) * 20
            : 0;
          _masComponents.push({ score: Math.max(0, altScore - qualityPenalty), weight: 40 });
        } else {
          // No images: neutral contribution (not penalised, not rewarded)
          _masComponents.push({ score: 70, weight: 40 });
        }
        // SVG labelling component
        if (meaningfulSvgs.length > 0) {
          _masComponents.push({ score: (svgLabelRatio || 0) * 100, weight: 30 });
        } else {
          // No meaningful SVGs detected: neutral contribution
          _masComponents.push({ score: 70, weight: 30 });
        }
        // Video caption component
        if (videos.length > 0) {
          _masComponents.push({ score: (videosWithCaptionsRatio || 0) * 100, weight: 30 });
        } else {
          // No videos: neutral contribution
          _masComponents.push({ score: 70, weight: 30 });
        }
        const mediaAccessibilityScore = Math.round(
          _masComponents.reduce((s, c) => s + c.score * c.weight, 0) /
          _masComponents.reduce((s, c) => s + c.weight, 0)
        );

        return {
          // Original metrics
          videoCount: videos.length,
          audioCount: audios.length,
          captionTrackCount,
          videosWithCaptionsRatio,
          transcriptLinkCount,
          autoplayMediaCount,
          // Image alt metrics
          imgTotal: visibleImgs.length,
          decorativeImgCount,
          imgAltRatio,
          lowQualityAltCount,
          // SVG metric
          svgLabelRatio,
          // Background-video metric
          bgVideoAriaHiddenRatio,
          // Composite anchor — always a number, never null
          mediaAccessibilityScore
        };
      }

      // -- 4. Clear Language -----------------------------------------------
      function analyzeLanguage() {
        const clone = document.body.cloneNode(true);
        clone.querySelectorAll("script, style, noscript").forEach(el => el.remove());

        const text      = clone.innerText || "";
        const words     = text.split(/\s+/).filter(Boolean);
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const paragraphs = Array.from(document.querySelectorAll("p")).filter(
          p => p.innerText?.trim().length > 0
        );

        const sentenceAverageLength  = sentences.length ? words.length / sentences.length : 0;
        const paragraphAverageLength = paragraphs.length
          ? paragraphs.reduce((sum, p) =>
              sum + p.innerText.split(/\s+/).filter(Boolean).length, 0) / paragraphs.length
          : 0;
        const complexWordRatio = words.length
          ? words.filter(w => w.length > 10).length / words.length : 0;

        function countSyllables(word) {
          word = word.toLowerCase().replace(/[^a-z]/g, "");
          if (!word) return 0;
          const groups = word.match(/[aeiouy]+/g);
          let n = groups ? groups.length : 1;
          if (word.endsWith("e") && n > 1) n--;
          return Math.max(1, n);
        }
        const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

        let readabilityScore = null;
        if (words.length >= 50 && sentences.length >= 3) {
          const fkGrade = 0.39 * (words.length / sentences.length) +
            11.8 * (totalSyllables / words.length) - 15.59;
          readabilityScore = Math.max(0, Math.min(100, Math.round(100 - fkGrade * 5)));
        }

        return {
          readabilityScore,
          sentenceAverageLength,
          paragraphAverageLength,
          complexWordRatio,
          langAttributeExists: !!document.documentElement.getAttribute("lang")
        };
      }

      // -- 5. Visual Presentation ------------------------------------------
      function analyzeVisual() {

        function parseRGB(str) {
          const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          return m ? [+m[1], +m[2], +m[3]] : null;
        }
        function linearize(c) {
          const s = c / 255;
          return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        }
        function luminance([r, g, b]) {
          return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
        }
        function contrastRatio(a, b) {
          const l1 = Math.max(luminance(a), luminance(b));
          const l2 = Math.min(luminance(a), luminance(b));
          return (l1 + 0.05) / (l2 + 0.05);
        }
        function resolveBackground(el) {
          let node = el;
          while (node && node !== document.documentElement) {
            const bg = window.getComputedStyle(node).backgroundColor;
            if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return bg;
            node = node.parentElement;
          }
          return "rgb(255, 255, 255)";
        }

        const TEXT_TAGS = "p,h1,h2,h3,h4,h5,h6,li,td,th,label,a,span,button";
        const candidates = Array.from(document.querySelectorAll(TEXT_TAGS))
          .filter(el => {
            const s = window.getComputedStyle(el);
            if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0") return false;
            return Array.from(el.childNodes).some(
              n => n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0
            );
          }).slice(0, 300);

        let contrastIssueCount = 0;
        for (const el of candidates) {
          const s   = window.getComputedStyle(el);
          const fg  = parseRGB(s.color);
          const bg  = parseRGB(resolveBackground(el));
          if (!fg || !bg) continue;
          const fs  = parseFloat(s.fontSize) || 16;
          const fw  = parseInt(s.fontWeight) || 400;
          const thr = (fs >= 24 || (fs >= 18.67 && fw >= 700)) ? 3 : 4.5;
          if (contrastRatio(fg, bg) < thr) contrastIssueCount++;
        }

        let nonTextContrastIssueCount = 0;
        Array.from(document.querySelectorAll(
          "button,input,select,textarea,[role='checkbox'],[role='radio'],[role='slider'],[role='switch']"
        )).filter(el => {
          const s = window.getComputedStyle(el);
          return s.display !== "none" && s.visibility !== "hidden";
        }).slice(0, 100).forEach(el => {
          const s   = window.getComputedStyle(el);
          const bdr = parseRGB(s.borderColor || s.outlineColor || "");
          const bg  = parseRGB(resolveBackground(el));
          if (bdr && bg && contrastRatio(bdr, bg) < 3) nonTextContrastIssueCount++;
        });

        let reflowIssueCount = 0;
        Array.from(document.querySelectorAll("div,section,article,table,figure,aside"))
          .slice(0, 600)
          .forEach(el => {
            const s = window.getComputedStyle(el);
            if (s.position === "fixed" || s.position === "absolute") return;
            const rawW = s.width || "";
            const w    = parseFloat(rawW);
            if (
              rawW.includes("px") && w > 320 &&
              (s.maxWidth === "none" || !s.maxWidth) &&
              s.overflow === "visible"
            ) { reflowIssueCount++; }
          });
        reflowIssueCount = Math.min(reflowIssueCount, 100);

        const paragraphs = Array.from(document.querySelectorAll("p"));
        let textJustifyCount     = 0;
        let lineSpacingIssueCount = 0;
        const lineLengthEstimate = paragraphs.length
          ? paragraphs.reduce((sum, p) => {
              const s  = window.getComputedStyle(p);
              const w  = p.getBoundingClientRect().width;
              const fs = parseFloat(s.fontSize) || 16;
              if (s.textAlign === "justify") textJustifyCount++;
              const lh = s.lineHeight;
              if (lh === "normal") {
                lineSpacingIssueCount++;
              } else {
                const lhVal = parseFloat(lh);
                if (lhVal && lhVal / fs < 1.45) lineSpacingIssueCount++;
              }
              return sum + w / (fs * 0.5);
            }, 0) / paragraphs.length
          : 0;

        let fontResizeSupport = false;
        try {
          for (const sheet of Array.from(document.styleSheets)) {
            try {
              for (const rule of Array.from(sheet.cssRules || [])) {
                if (rule.style?.fontSize?.includes("em")) fontResizeSupport = true;
              }
            } catch (_) {}
          }
        } catch (_) {}

        const visibleElements = Array.from(document.querySelectorAll("*")).filter(el => {
          const s = window.getComputedStyle(el);
          return s.display !== "none" && s.visibility !== "hidden" && s.opacity !== "0";
        });

        return {
          lineLengthEstimate,
          contrastIssueCount,
          nonTextContrastIssueCount,
          reflowIssueCount,
          visualDensityScore: visibleElements.length,
          fontResizeSupport,
          textJustifyCount,
          lineSpacingIssueCount
        };
      }

      // -- 6. Assistance & Support -----------------------------------------
      function analyzeAssistance() {
        const inputs = Array.from(document.querySelectorAll(
          "input:not([type='hidden']), textarea, select"
        ));
        const labels        = Array.from(document.querySelectorAll("label"));
        const requiredFields = Array.from(document.querySelectorAll(
          "input[required], textarea[required], select[required]"
        ));

        const hasErrorMessage = !!document.querySelector(
          "[role='alert'], [aria-live='assertive'], .error, .error-message, [aria-invalid='true']"
        );

        const inputsWithValidation = inputs.filter(i =>
          i.hasAttribute("aria-describedby") || i.hasAttribute("aria-errormessage") ||
          i.hasAttribute("pattern")          || i.hasAttribute("aria-invalid")
        );
        const accessibleValidationRatio = inputs.length
          ? inputsWithValidation.length / inputs.length : 1;

        const hasSubmissionReviewMechanism = Array.from(document.querySelectorAll(
          "button, input[type='submit'], input[type='button'], a.button"
        )).some(btn => {
          const text = (btn.innerText || btn.value || btn.getAttribute("aria-label") || "").toLowerCase();
          return /review|confirm|undo|back|edit|change|check|validate/.test(text);
        });

        const personalTypes  = ["text", "email", "tel", "password", "url"];
        const acTokens       = [
          "name", "given-name", "family-name", "email", "tel",
          "current-password", "new-password", "username",
          "street-address", "postal-code", "country", "bday", "url",
          "organization", "cc-name", "cc-number"
        ];
        const personalInputs = inputs.filter(i =>
          personalTypes.includes((i.getAttribute("type") || "text").toLowerCase())
        );
        const inputsWithAutocomplete = personalInputs.filter(i => {
          const ac = (i.getAttribute("autocomplete") || "").toLowerCase().trim();
          if (!ac || ac === "on" || ac === "off") return false;
          return acTokens.some(t => ac.includes(t));
        });
        const autocompleteRatio = personalInputs.length
          ? inputsWithAutocomplete.length / personalInputs.length : 1;

        let inputTypeMismatchCount = 0;
        inputs.forEach(i => {
          if ((i.getAttribute("type") || "text").toLowerCase() !== "text") return;
          const hint = (
            i.getAttribute("name") || i.getAttribute("id") ||
            i.getAttribute("placeholder") || i.getAttribute("aria-label") || ""
          ).toLowerCase();
          if (/\bemail\b/.test(hint))                       inputTypeMismatchCount++;
          if (/phone|tel|mobile/.test(hint))                inputTypeMismatchCount++;
          if (/\bpassword\b|\bpasswd\b/.test(hint))         inputTypeMismatchCount++;
          if (/\burl\b|website/.test(hint))                 inputTypeMismatchCount++;
          if (/\bdate\b|birthday|\bdob\b/.test(hint))       inputTypeMismatchCount++;
          if (/\bnumber\b|\bquantity\b|\bcount\b/.test(hint)) inputTypeMismatchCount++;
        });

        const forms = Array.from(document.querySelectorAll("form"));
        const formsWithInlineErrors = forms.filter(form =>
          !!form.querySelector(
            "[role='alert'], [aria-live], .error, .field-error, .input-error, [aria-invalid]"
          )
        ).length;
        const inlineErrorCoverageRatio = forms.length
          ? formsWithInlineErrors / forms.length : 1;

        return {
          formFieldCount: inputs.length,
          labelCoverage: inputs.length ? labels.length / inputs.length : 1,
          hasErrorMessage,
          requiredFieldCount: requiredFields.length,
          accessibleValidationRatio,
          hasSubmissionReviewMechanism,
          autocompleteRatio,
          inputTypeMismatchCount,
          inlineErrorCoverageRatio
        };
      }

      // -- 7. Distraction --------------------------------------------------
      function analyzeDistraction() {
        const allElements = Array.from(document.querySelectorAll("*"));

        const gifCount = [
          ...Array.from(document.querySelectorAll("img[src]")).filter(img =>
            /\.gif(\?.*)?$/i.test(img.getAttribute("src"))
          ),
          ...Array.from(document.querySelectorAll("source[srcset]")).filter(src =>
            /\.gif(\?.*)?$/i.test(src.getAttribute("srcset"))
          )
        ].length;

        const animationCount = allElements.filter(el => {
          const s    = window.getComputedStyle(el);
          const name = s.animationName;
          if (!name || name === "none") return false;
          const iter = s.animationIterationCount || "1";
          const dur  = parseFloat(s.animationDuration) || 0;
          if (iter === "infinite") return true;
          return dur * (parseFloat(iter) || 1) > 5;
        }).length;

        const videos = Array.from(document.querySelectorAll("video"));
        const audios  = Array.from(document.querySelectorAll("audio"));
        const autoplayMediaCount = [
          ...videos.filter(v => v.autoplay),
          ...audios.filter(a => a.autoplay)
        ].length;

        const metaRefresh = document.querySelector("meta[http-equiv='refresh']");
        const autoUpdatingContentCount =
          (metaRefresh ? 1 : 0) +
          document.querySelectorAll("[aria-live='polite'], [aria-live='assertive']").length;

        const hasPauseControl = !!document.querySelector(
          "button[aria-label*='pause' i], button[aria-label*='stop' i]," +
          "button.pause, button.stop, [role='button'][aria-label*='pause' i]"
        );

        let respectsReducedMotion = false;
        let anyMotionSheetReadable = false;
        try {
          for (const sheet of Array.from(document.styleSheets)) {
            try {
              for (const rule of Array.from(sheet.cssRules || [])) {
                anyMotionSheetReadable = true;
                if (
                  rule.type === CSSRule.MEDIA_RULE &&
                  rule.conditionText?.includes("prefers-reduced-motion")
                ) { respectsReducedMotion = true; }
              }
            } catch (_) {}
          }
        } catch (_) {}

        const FLASH_MS = 333;
        const LUMINANCE = /\bcolor\b|\bbackground\b|\bopacity\b|\bvisibility\b/;
        const AUTO_TRIGGERS = [
          "[aria-live]", "[role='status']", "[role='alert']",
          "[role='marquee']", "[role='timer']",
          ".carousel", ".slider", ".banner", ".ticker", ".marquee",
          "[data-autoplay]", "[data-auto-rotate]"
        ].join(", ");
        const autoTriggers = new Set(Array.from(document.querySelectorAll(AUTO_TRIGGERS)));

        const flashingElementCount = allElements.filter(el => {
          const s    = window.getComputedStyle(el);
          const name = s.animationName;
          if (name && name !== "none") {
            const durMs = parseFloat(s.animationDuration) * 1000;
            const iter  = s.animationIterationCount || "1";
            if (durMs > 0 && durMs < FLASH_MS &&
                (iter === "infinite" || parseFloat(iter) > 1) &&
                s.display !== "none") return true;
          }
          const tDurMs = parseFloat(s.transitionDuration) * 1000;
          if (tDurMs > 0 && tDurMs < FLASH_MS &&
              LUMINANCE.test(s.transitionProperty || "") &&
              autoTriggers.has(el)) return true;
          return false;
        }).length;

        const timerTextPatterns = [
          "countdown", "count down", "timer", "session timeout", "session expires",
          "expires in", "time remaining", "auto-submit", "automatic logout",
          "you will be logged out"
        ];
        const pageText         = (document.body.innerText || "").toLowerCase();
        const timerTextMatches = timerTextPatterns.filter(p => pageText.includes(p)).length;
        const timerElementCount = document.querySelectorAll(
          "[data-countdown],[data-timer],[data-timeout],.countdown,.timer,.session-timer," +
          "[aria-label*='timer' i],[aria-label*='countdown' i],[aria-label*='session' i]"
        ).length;
        const timedInteractionCount = timerTextMatches + timerElementCount;

        const extensionKeywords =
          /extend|more time|stay logged in|keep.?session|renew session|continue session/i;
        const hasExtendTimeOption = Array.from(document.querySelectorAll(
          "button, a, input[type='button'], input[type='submit'], [role='button']"
        )).some(el => extensionKeywords.test(
          el.innerText || el.value ||
          el.getAttribute("aria-label") || el.getAttribute("title") || ""
        ));

        const stickyCount = allElements.filter(el => {
          const pos = window.getComputedStyle(el).position;
          return pos === "fixed" || pos === "sticky";
        }).length;

        return {
          gifCount,
          animationCount,
          autoplayMediaCount,
          autoUpdatingContentCount,
          hasPauseControl,
          respectsReducedMotion: anyMotionSheetReadable ? respectsReducedMotion : null,
          flashingElementCount,
          timedInteractionCount,
          hasExtendTimeOption,
          stickyCount
        };
      }

      return {
        purpose:     analyzePurpose(),
        findable:    analyzeFindable(),
        media:       analyzeMedia(),
        language:    analyzeLanguage(),
        visual:      analyzeVisual(),
        assistance:  analyzeAssistance(),
        distraction: analyzeDistraction()
      };
    });

    return { url, artifacts };

  } catch (error) {
    console.error(`Analysis failed: ${error.message}`);
    return { url, error: error.message };
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { analyzePage };
