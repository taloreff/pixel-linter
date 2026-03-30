You are a senior staff-level engineer and product-minded builder.

Your task is to build a production-quality Chrome extension called “Pixel Linter”.

Pixel Linter is a visual QA assistant for websites. It is designed for designers, product managers, QA, and frontend developers to inspect live UI implementations on staging/production websites and detect likely design-system inconsistencies.

This is NOT a DevTools clone.
This is NOT a generic CSS inspector.
This is a smart visual QA layer for final-phase review.

You should act as if you are building a polished MVP that should feel immediately useful and demo-ready.

==================================================
1. PRODUCT VISION
==================================================

Pixel Linter helps non-technical and semi-technical users answer questions like:

- Is this the right font?
- Is this text size consistent with the rest of the site?
- Is this button using an odd spacing value?
- Is this color on-brand?
- Is this contrast too low?
- Is this radius different from the likely design system?
- Is this component visually “off” compared to the rest of the page?

The core value is interpretation, not raw CSS.

Instead of only showing:
- font-size: 15px
- padding: 13px
- border-radius: 7px

Pixel Linter should interpret these values and say things like:
- likely off-system font size
- spacing not aligned to common grid
- radius differs from dominant pattern on page
- text contrast may be too low
- interactive target may be too small

==================================================
2. PRIMARY USERS
==================================================

Primary users:
- Product designers
- Product managers
- QA engineers doing visual QA
- Frontend developers doing self-review
- Marketing/design stakeholders reviewing staging pages

Usage phase:
- staging / pre-production review
- late implementation QA
- launch readiness checks
- regression review after UI changes

==================================================
3. MVP GOAL
==================================================

Build a Chrome extension that allows the user to:

1. Activate inspection mode on any page
2. Hover an element and see a polished overlay panel showing:
   - typography
   - colors
   - spacing
   - border radius
   - dimensions
   - basic smart warnings
3. Infer the page’s likely design system heuristically by scanning visible elements
4. Compare hovered element values against the inferred system
5. Flag suspicious one-off values and usability issues

The MVP should be genuinely useful on real websites without requiring any site integration.

==================================================
4. NON-GOALS FOR MVP
==================================================

Do NOT build these in v1:
- Figma integration
- screenshot comparison
- multi-page crawling/reporting
- AI-generated design advice
- automated fixing
- full accessibility audit suite
- browser sync / cloud backend
- account/authentication
- advanced analytics dashboards

Keep the scope tight and excellent.

==================================================
5. CORE UX
==================================================

The extension should support two main user flows:

A. Popup flow
- User clicks the extension icon
- Popup opens
- User can enable/disable Pixel Linter on the current tab
- User can enter “Inspect Mode”
- User sees quick summary of whether page analysis is ready
- User can toggle simple preferences

B. On-page flow
- Once Inspect Mode is enabled:
  - hover over elements to highlight them
  - show a small floating inspection panel near the hovered element
  - panel should be polished, readable, and not require DevTools knowledge
  - panel should explain values in human language
- Clicking an element can “lock” inspection
- Escape key exits inspect mode or unlocks selection

==================================================
6. SMART INSPECTION PANEL REQUIREMENTS
==================================================

When the user hovers an element, show a floating panel with these sections:

A. Element Summary
- inferred type if possible:
  - Button
  - Text
  - Heading
  - Link
  - Input
  - Image
  - Card
  - Container
  - Generic element
- tag name
- class list summary (trimmed)
- width / height

B. Typography
- font family
- font size
- font weight
- line height
- letter spacing
- text transform
- text alignment
- text color

C. Colors
- text color
- background color
- border color if relevant
- contrast ratio (text vs background when computable)
- interpretation:
  - pass / warning style, not legal compliance claims

D. Spacing
- margin top/right/bottom/left
- padding top/right/bottom/left
- gap (if flex/grid and available)
- interpretation:
  - aligned to common spacing scale
  - likely one-off spacing value
  - spacing mismatch

E. Shape and Structure
- border radius
- border width/style
- box shadow presence
- display type
- position type if relevant

F. Smart Warnings
Examples:
- font size is uncommon on this page
- spacing value does not match dominant spacing scale
- border radius differs from common radius pattern
- interactive height below recommended comfort range
- low color contrast relative to current background
- button/icon looks undersized
- style appears inconsistent with nearby siblings

The panel should prioritize clarity over completeness.

==================================================
7. DESIGN SYSTEM DETECTION (CORE DIFFERENTIATOR)
==================================================

This is the most important smart feature.

The extension should scan the current page and infer a likely local design system using heuristics.

It does NOT need to know the “true” design system.
It should infer likely dominant patterns from the live DOM.

Infer at minimum:
- common font families
- common font sizes
- common font weights
- common line heights
- common text colors
- common background colors
- common spacing values (margin/padding/gap)
- common border radii
- common component heights for interactive controls

Suggested approach:
1. Scan a sample of visible and relevant elements
2. Extract computed styles
3. Normalize values
4. Build frequency distributions
5. Infer dominant tokens/scales
6. Compare hovered element against those inferred norms

Example:
If most spacing values are:
8, 16, 24, 32
and hovered element has padding 13,
show:
“Likely off spacing scale”

If most radii are:
4, 8
and hovered element has radius 7,
show:
“Radius differs from dominant page pattern”

If most body text is:
14 or 16 px
and hovered text is 15 px,
show:
“Uncommon font size on this page”

This should be heuristic and practical, not academic.

==================================================
8. SCORING / INTERPRETATION LOGIC
==================================================

Implement a lightweight interpretation engine.

Each hovered element may receive:
- informational observations
- warnings
- confidence level (optional)

Rules should be explainable and deterministic.

Possible rules:
- uncommon font size = not among top N most frequent text sizes
- off-grid spacing = value not near inferred spacing scale
- unusual radius = not among common radii
- low contrast = contrast below configurable threshold
- small tap target = interactive height below 40–44px heuristic
- excessive style variance = differs from siblings or common component class

Avoid fake precision.
Prefer language like:
- likely inconsistent
- uncommon on this page
- worth reviewing
- smaller than typical
- low readability risk

==================================================
9. TECHNICAL REQUIREMENTS
==================================================

Build as a modern Chrome extension using Manifest V3.

Architecture should align with current Chrome extension guidance:
- manifest v3
- action popup
- content script for page inspection and overlays
- background service worker only if actually useful
- use chrome.storage for persisted preferences
- support messaging between popup and content script if needed
- use MutationObserver for dynamic/SPA pages instead of deprecated mutation events

Chrome extension facts to follow:
- content scripts run in the context of web pages and can inspect/modify the DOM
- content scripts can use chrome.storage and runtime messaging APIs
- popup should be defined via the extension action
- persistent state should use chrome.storage, not localStorage as primary extension persistence
- MutationObserver is the modern DOM change approach

==================================================
10. STACK
==================================================

Required:
- TypeScript
- React for popup UI
- Vite for bundling/build tooling
- Manifest V3
- ESLint
- Prettier

Optional if useful:
- lightweight state management for popup only
- simple utility libraries
- no heavy UI framework unless justified

Keep the project lean.

==================================================
11. PROJECT STRUCTURE
==================================================

Use a clean modular structure like:

/src
  /background
    index.ts
  /content
    index.ts
    inspector/
      overlayManager.ts
      highlightManager.ts
      inspectMode.ts
      panelRenderer.ts
    analysis/
      styleExtractor.ts
      designSystemAnalyzer.ts
      heuristics.ts
      contrast.ts
      elementClassifier.ts
      spacingScale.ts
    utils/
      dom.ts
      geometry.ts
      format.ts
  /popup
    index.html
    main.tsx
    App.tsx
    components/
    hooks/
  /shared
    types.ts
    constants.ts
    storage.ts
    messaging.ts

Also include:
- manifest.json or generated manifest config
- README.md
- icons placeholder strategy
- sample screenshots if possible

==================================================
12. PAGE ELEMENT TARGETING RULES
==================================================

Only inspect meaningful visible elements.

Prioritize:
- buttons
- links
- headings
- paragraphs
- text blocks
- inputs
- textareas
- selects
- cards
- containers with visual styling
- icons / icon wrappers when detectable

Ignore or deprioritize:
- script/style/meta/link tags
- hidden elements
- zero-size elements
- fully transparent elements
- large decorative wrappers with no useful styles
- elements deep inside extension overlay itself
- extremely noisy nodes that add no value

The extension must never inspect its own injected UI.

==================================================
13. ELEMENT CLASSIFICATION
==================================================

Implement a lightweight classifier for hovered elements.

Possible inferred types:
- heading
- paragraph/text
- button
- link
- input
- textarea
- image
- icon
- card/container
- nav item
- generic block

Use heuristics based on:
- tag name
- role
- computed styles
- dimensions
- text presence
- interactivity
- ARIA role
- child structure

This classification is for better UX, not strict correctness.

==================================================
14. HOVER + HIGHLIGHT INTERACTION
==================================================

When hovering:
- draw a clean outline around the current target
- avoid flicker
- position the panel smartly so it stays in viewport
- panel should not block hover detection unnecessarily
- support lock-on-click
- support unlock on Escape or click outside

Need robust hover target resolution:
- avoid selecting tiny nested spans if parent is the meaningful element
- consider promoting to a more sensible parent when appropriate
- but do not over-promote and lose specificity

==================================================
15. DESIGN SYSTEM ANALYSIS DETAILS
==================================================

Build an analyzer that runs:
- on initial activation
- on demand refresh
- after major DOM changes with debounce

Analyzer pipeline:
1. Collect candidate visible elements
2. Extract computed styles
3. Normalize values:
   - strip decimal noise
   - convert line-height if needed
   - normalize colors to hex/rgb consistently
   - normalize spacing/radius values to numeric px values
4. Build histograms for:
   - font families
   - font sizes
   - weights
   - line heights
   - text colors
   - background colors
   - spacing values
   - radius values
   - component heights
5. Infer likely dominant system tokens
6. Save page analysis in memory for hover-time comparisons

Should be efficient and bounded.
Do not scan thousands of nodes blindly without filtering.

==================================================
16. CONTRAST HANDLING
==================================================

Implement text/background contrast calculation where possible.

Requirements:
- derive effective text color from computed style
- derive nearest useful background color, walking up DOM if needed
- calculate contrast ratio
- show simple interpretation:
  - good
  - borderline
  - low
- avoid legal/compliance claims unless clearly labeled heuristic

Be practical. If background is impossible to determine reliably, show “background unclear” instead of lying.

==================================================
17. SPACING SCALE DETECTION
==================================================

A special part of analysis should infer spacing systems.

For visible elements, extract:
- margin values
- padding values
- gap values

Create a likely spacing scale from the most frequent positive values.
Look for common patterns like:
- 4, 8, 12, 16, 24, 32
- 5, 10, 15, 20 in some systems

The app should not assume 8px only.
It should infer the page’s actual dominant rhythm.

Warnings should say:
- consistent with page spacing scale
- uncommon spacing token
- mixed spacing pattern
- likely one-off value

==================================================
18. INTERACTIVE TARGET HEURISTICS
==================================================

For buttons, links acting as buttons, and inputs:
- flag likely small touch/click targets
- use practical heuristics around 40–44px height
- note if icon-only controls are especially small

Language should be:
- “Smaller than typical interactive target”
not:
- “This is broken”

==================================================
19. POPUP REQUIREMENTS
==================================================

The popup should be simple and polished.

Include:
- product name + short description
- enable/disable on current site/tab
- toggle Inspect Mode
- refresh page analysis
- basic settings:
  - show warnings on/off
  - compact panel on/off
  - lock inspect on click on/off (optional)
- analysis status:
  - ready
  - analyzing
  - inactive

Nice to have:
- mini preview of detected design tokens summary:
  - primary font
  - top spacing values
  - dominant radii

==================================================
20. STORAGE REQUIREMENTS
==================================================

Use chrome.storage to persist:
- extension enabled state per site
- user settings
- maybe cached site preferences

Design storage cleanly with typed helpers.

==================================================
21. SPA / DYNAMIC PAGE SUPPORT
==================================================

Many modern websites are React/Vue/SPA apps.

Requirements:
- support route changes
- support dynamic content rendering
- use MutationObserver with debounce
- avoid expensive full re-analysis on every small mutation
- only trigger partial or delayed refresh when needed

Performance matters.

==================================================
22. PERFORMANCE REQUIREMENTS
==================================================

Must feel lightweight.

Requirements:
- no visible lag during hover
- no constant expensive recomputation
- cache page analysis
- cache extracted styles where helpful
- debounce mutation-triggered analysis
- limit candidate scan count sensibly
- avoid memory leaks from listeners and observers

==================================================
23. VISUAL DESIGN REQUIREMENTS
==================================================

The extension UI should feel polished and modern.

Style direction:
- minimal
- clean
- professional
- slightly “design-tool” aesthetic
- subtle shadows
- rounded corners
- strong readability
- compact but not cramped

The panel should look like a premium QA/design tool, not a dev-only debugging box.

==================================================
24. ERROR HANDLING / SAFETY
==================================================

The extension must degrade gracefully.

Requirements:
- if a value cannot be inferred, display “unknown” or omit it
- if design system analysis fails, inspection should still work with raw values
- if contrast background cannot be determined, say so
- never crash page interaction
- avoid interfering with form inputs or site functionality
- make cleanup reliable when disabling extension

==================================================
25. ACCESSIBILITY OF THE EXTENSION UI
==================================================

The extension’s own popup and panel should be accessible:
- keyboard navigable where reasonable
- readable contrast
- semantic labels in popup
- clear interaction states

==================================================
26. README REQUIREMENTS
==================================================

Write a professional README including:
- product overview
- why it exists
- feature list
- architecture
- setup
- local development
- build and load unpacked extension steps
- permissions explanation
- known limitations
- roadmap ideas

==================================================
27. TESTING REQUIREMENTS
==================================================

Add at least basic tests for the core logic if practical.

Priority testable units:
- spacing scale inference
- common token detection
- warning generation heuristics
- contrast calculation
- value normalization

If end-to-end automation is too much for MVP, prioritize solid unit coverage for analysis logic.

==================================================
28. IMPLEMENTATION ORDER
==================================================

Implement in this order:

1. Scaffold project and manifest
2. Build popup with enable/disable and inspect mode controls
3. Build content script activation and cleanup lifecycle
4. Build hover detection and highlight box
5. Build floating panel renderer
6. Build computed style extraction
7. Build design system analyzer
8. Build warning heuristics
9. Add contrast logic
10. Add mutation observer refresh behavior
11. Polish popup and panel UX
12. Write README

==================================================
29. SUCCESS CRITERIA
==================================================

The MVP is successful if:

- I can load the extension locally in Chrome
- I can enable it on a real website
- I can hover a button/text/input/card and see a clean inspection panel
- The panel shows useful style data
- The extension infers likely design tokens from the page
- The hovered element gets meaningful “worth reviewing” warnings
- It works reasonably on modern websites without breaking them
- It feels like a real visual QA tool, not a toy

==================================================
30. DELIVERABLES
==================================================

Deliver:
- complete project source
- manifest v3 extension
- popup UI
- content script inspection system
- design system analyzer
- smart warning heuristics
- README
- clean code and comments where useful

==================================================
31. IMPORTANT ENGINEERING STYLE
==================================================

Code quality expectations:
- modular
- typed
- readable
- production-minded
- minimal hacks
- no giant monolithic files
- explain non-obvious heuristics in comments
- favor maintainability

When a tradeoff is needed, choose:
- practical usefulness
- reliability
- clarity
over overly clever architecture

==================================================
32. FINAL INSTRUCTION
==================================================

Build the project end-to-end as a serious MVP.
Do not stop at scaffolding.
Do not just output a plan.
Implement the actual extension code, structure, and README.

When uncertain, make strong, reasonable product decisions consistent with this PRD.