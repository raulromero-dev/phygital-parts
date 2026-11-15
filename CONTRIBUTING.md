# Contributing

Phygital is for finding parts, seeing how they fit and planning how to connect
them. Useful contributions include sourced components, clearer connector models,
new prebuilt examples, accessibility improvements and better research flows.

Start with [README.md](README.md) and [AGENTS.md](AGENTS.md). For structural changes
read [the architecture](docs/ARCHITECTURE.md); for hardware work use
[the part guide](docs/ADDING_PARTS.md). Agents can use the
[Phygital skill](skills/phygital/SKILL.md).

1. Create a branch in your checkout or fork and inspect existing changes.
2. Run `npm ci`, then `npm run dev`. Use built-in starters before connecting AI.
3. Keep changes focused. Preserve source files, CAD provenance and stable IDs.
4. Run appropriate tests and `npm run build`. Check visible UI changes in the
   browser; use mock API responses for repeatable research tests.
5. Describe the user-visible result, validation and known limitations in your PR.

Do not include API keys, private project exports, screenshots with personal
details, or local credentials. A request to contribute does not authorize paid
model calls, purchases or deployment to someone else's production project.

Report bugs with the starter URL, browser, reproduction steps and expected result.
For hardware corrections include the manufacturer revision and supporting source.
For security issues use GitHub's private vulnerability reporting when available;
do not post credentials or a working exploit against a live deployment publicly.

Original application code and documentation use the [MIT license](LICENSE).
Third-party files retain the attribution and terms documented with those assets.
