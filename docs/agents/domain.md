# Domain Docs

How engineering skills should consume this repository's domain documentation.

## Before exploring

- Read the root `GLOSSARY-MAP.md`, then read the glossary entries relevant to the task. The map currently points to `docs/architecture/GLOSSARY.md`, the shared vocabulary for platform, organization, and cross-package concepts.
- Read relevant ADRs in `docs/adr/`. These are system-wide decisions. If a context later gains its own ADR directory, also read the ADRs scoped to that context.

If a referenced file does not exist, proceed without flagging its absence. Add context-specific glossaries or ADR directories only when a context has genuinely distinct vocabulary or decisions; avoid duplicating the shared glossary.

## Use the glossary's vocabulary

When output names a domain concept (in an issue title, refactor proposal, hypothesis, or test name), use the term as defined in the relevant glossary. Don't drift to synonyms the glossary explicitly avoids.

If the concept needed isn't in a glossary, reconsider whether you're inventing language the project doesn't use. If it is a real gap, note it for `/domain-modeling`.

## Flag ADR conflicts

If output contradicts an existing ADR, surface it explicitly rather than silently overriding it:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_
