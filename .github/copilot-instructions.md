# Developer portal review instructions

Review every change for technical accuracy, buildability, and whether a developer can follow the documentation from a fresh project to a working integration. Apply these checks to prose, code blocks, landing-page examples in `lib/hero-snippets.ts`, and changes to documentation rendering. Preserve existing code, comments, wording, and formatting outside the requested scope; do not suggest unrelated cleanup.

## Verify SDK APIs and indexd behavior

- For every change, check its impact against the public SDK APIs for all documented languages and the relevant `indexd` behavior. For changes with no API or behavior impact, explicitly record that assessment instead of inventing a verification claim.
- Verify each language independently. Do not translate method names or assume that wrappers expose the same options, defaults, return types, or capabilities. Check public exports, signatures, imports, constructors, argument types, async behavior, stream handling, resource cleanup, and error handling.
- Start with the official package references below, then follow their source links to the implementation, bindings, and tests for the version being documented. Package listings alone do not establish API behavior. Use released APIs that match the installation instructions; identify unreleased features or version requirements explicitly.
  - Rust: https://docs.rs/sia_storage
  - Go: https://pkg.go.dev/go.sia.tech/siastorage
  - Python: https://pypi.org/project/sia-storage/
  - Dart: https://pub.dev/packages/sia_storage
  - JavaScript: https://www.npmjs.com/package/@siafoundation/sia-storage
  - indexd: https://github.com/SiaFoundation/indexd
- Trace changed behavioral claims through the relevant SDK implementation and indexd handlers, persistence logic, and tests. Pay particular attention to app identity and authorization, key derivation and storage, object IDs, upload versus pinning, metadata, sharing, deletion versus physical removal, pruning, redundancy, repair, retries, and timeouts. Distinguish SDK guarantees, server behavior, and hosted-service policies.
- Check every language tab affected by a shared explanation. Preserve real language-specific differences and identify unsupported operations instead of fabricating parity. Check related quickstarts, recipes, concepts, and hero examples for contradictions introduced by the change.
- Cite the upstream symbol and source link, preferably pinned to a release or commit, when reporting an API or behavior mismatch. If sources or execution are unavailable, state what remains unverified; do not treat memory or another snippet in this repository as proof.

## Check buildability and the reader's path

- Verify `bun install --frozen-lockfile`, `bun run check`, and `bun run build`, using execution results or CI evidence for the reviewed revision. For container or deployment changes, also verify the Docker build. Report checks that could not run and distinguish existing failures from regressions. Do not use `check:fix` as part of a review.
- A successful Next.js build does not compile or execute fenced SDK examples. Compile or type-check affected examples with the documented dependencies and runtime; run them where possible. For partial snippets, use a minimal harness containing the stated prerequisites. Report the language, package version, command, and result or missing verification. Do not claim a live integration test passed based on compilation alone.
- Follow the changed flow as a new developer: create a project, install dependencies, configure the app and indexer, connect, upload and pin, download, and confirm the expected result. Require imports, runtime requirements, extra packages, file names, execution commands, and expected output where needed. A recipe may link to setup rather than repeat it, but must identify assumed variables and state.
- Check that placeholders are clearly marked and valid for their required format and length. Verify browser versus Node.js requirements, WASM initialization, async entry points, and file/stream APIs for the actual runtime shown. Flag examples that discard errors or expose credentials without making the demo limitation clear. Never require real secrets in review output.
- Inspect changed pages as rendered: frontmatter, `=== "Language"` tab indentation, code fences, callouts, Mermaid diagrams, heading anchors, and relative links. Check `docs/nav.json`, navigation, search, and copyable code where affected. Biome checks application code, not the correctness of documentation prose or SDK snippets.

## Write for developers trying to ship

- Lead with the task and the shortest complete working example. Put prerequisites before they are needed, then explain consequential choices and link to deeper concepts. Keep the path from setup to a verified result clear, including the next step and recovery from likely errors.
- Flag prose that sounds generated because it adds no useful information: ceremonial introductions, repeated summaries, rhetorical questions, excessive narration, generic encouragement, marketing claims, and stock phrases such as “delve into,” “seamlessly,” “unlock the power,” or “it's important to note.” Describe the concrete readability problem; do not speculate about authorship.
- Prefer direct verbs, short paragraphs, descriptive task headings, and precise terms. Flag vague claims such as “secure,” “simple,” or “production-ready” that lack an actual property, requirement, or limitation. Identify unfamiliar Sia concepts that are undefined when first needed or explained at excessive length for a recipe.
- Flag non-obvious steps that lack a reason, expected input, or success criteria. Point out narration that merely repeats the next command or comments that restate obvious code. Preserve explanations of constraints, ordering, security boundaries, and failure modes.
- Keep terminology and identifiers consistent across prose and examples. Avoid unnecessary jargon, forced metaphors, excessive bold text, repeated warnings, and long detours before runnable code. Concision must not remove setup, error handling, or details needed to finish the task.

## Make review findings actionable

Prioritize broken examples, incorrect behavior, missing prerequisites, unsafe credential handling, and build or rendering failures before editorial polish. Anchor each finding to a changed line, identify the problem, and explain its effect on the reader with supporting evidence. For prose, only point out the problem; do not suggest rewrites, replacement wording, patches, or suggested-change blocks. For code, including documentation examples, concrete fixes and suggested-change blocks are allowed. Group repeated issues; avoid preference-only findings and generic praise. Clearly separate confirmed defects from verification gaps.
