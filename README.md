## Fork Notice

> [!IMPORTANT]
> This is [fuzzywigg](https://github.com/fuzzywigg)'s security-patched fork of
> [companion-inc/feynman](https://github.com/companion-inc/feynman). It tracks upstream
> **v0.2.40** (the fork point; upstream has since moved on to the 0.3.x line) and layers
> local dependency security fixes on top. To use this fork, clone
> `https://github.com/fuzzywigg/feynman.git` — everything below the notice is the
> upstream README.

**Local security overrides** — pinned via the `overrides` field, which is the
authoritative list if this table ever drifts:

| File | Override path | Pinned version |
| --- | --- | --- |
| [`package.json`](package.json) | `basic-ftp` (top-level, and again under `proxy-agent → pac-proxy-agent → get-uri`) | 5.3.0 |
| [`package.json`](package.json) | `@modelcontextprotocol/sdk → @hono/node-server` | 1.19.14 |
| [`package.json`](package.json) | `@modelcontextprotocol/sdk → hono` | 4.12.34 |
| [`package.json`](package.json) | `express → router → path-to-regexp` | 8.4.2 |
| [`package.json`](package.json) | `protobufjs` | 7.5.5 |
| [`package.json`](package.json) | `minimatch → brace-expansion` | 5.0.9 |
| [`website/package.json`](website/package.json) | `@modelcontextprotocol/sdk → @hono/node-server` | 1.19.14 |
| [`website/package.json`](website/package.json) | `@modelcontextprotocol/sdk → hono` | 4.12.34 |
| [`website/package.json`](website/package.json) | `router → path-to-regexp` | 8.4.2 |
| [`website/package.json`](website/package.json) | `defu` | 6.1.7 |
| [`website/package.json`](website/package.json) | `js-yaml` | 4.3.1 |
| [`website/package.json`](website/package.json) | `vite` | 6.4.2 |
| [`website/package.json`](website/package.json) | `brace-expansion` | 1.1.17 |
| [`website/package.json`](website/package.json) | `yaml` | 2.8.3 |

**This fork never publishes to npm.** The release workflow
([`.github/workflows/publish.yml`](.github/workflows/publish.yml)) is fork-guarded with
`if: github.repository == 'companion-inc/feynman'` on its entry job, so all
publish/release jobs are skipped on this repository.

---

<p align="center">
  <a href="https://feynman.is">
    <img src="assets/hero.png" alt="Feynman CLI" width="800" />
  </a>
</p>
<p align="center">The open source AI research agent.</p>
<p align="center">
  <a href="https://feynman.is/docs"><img alt="Docs" src="https://img.shields.io/badge/docs-feynman.is-0d9668?style=flat-square" /></a>
  <a href="https://github.com/getcompanion-ai/feynman/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/github/license/getcompanion-ai/feynman?style=flat-square" /></a>
</p>

---

### Installation

**macOS / Linux:**

```bash
curl -fsSL https://feynman.is/install | bash
```

**Windows (PowerShell):**

```powershell
irm https://feynman.is/install.ps1 | iex
```

The one-line installer fetches the latest tagged release. To pin a version, pass it explicitly, for example `curl -fsSL https://feynman.is/install | bash -s -- 0.2.35`.

The installer downloads a standalone native bundle with its own Node.js runtime.

To upgrade the standalone app later, rerun the installer. `feynman update` only refreshes installed Pi packages inside Feynman's environment; it does not replace the standalone runtime bundle itself.

To uninstall the standalone app, remove the launcher and runtime bundle, then optionally remove `~/.feynman` if you also want to delete settings, sessions, and installed package state. If you also want to delete alphaXiv login state, remove `~/.ahub`. See the installation guide for platform-specific paths.

Local models are supported through the setup flow. For LM Studio, run `feynman setup`, choose `LM Studio`, and keep the default `http://localhost:1234/v1` unless you changed the server port. For LiteLLM, choose `LiteLLM Proxy` and keep the default `http://localhost:4000/v1`. For Ollama or vLLM, choose `Custom provider (baseUrl + API key)`, use `openai-completions`, and point it at the local `/v1` endpoint.

### Skills Only

If you want just the research skills without the full terminal app:

**macOS / Linux:**

```bash
curl -fsSL https://feynman.is/install-skills | bash
```

**Windows (PowerShell):**

```powershell
irm https://feynman.is/install-skills.ps1 | iex
```

That installs the skill library into `~/.codex/skills/feynman`.

For a repo-local install instead:

**macOS / Linux:**

```bash
curl -fsSL https://feynman.is/install-skills | bash -s -- --repo
```

**Windows (PowerShell):**

```powershell
& ([scriptblock]::Create((irm https://feynman.is/install-skills.ps1))) -Scope Repo
```

That installs into `.agents/skills/feynman` under the current repository.

These installers download the bundled `skills/` and `prompts/` trees plus the repo guidance files referenced by those skills. They do not install the Feynman terminal, bundled Node runtime, auth storage, or Pi packages.

---

### What you type → what happens

```
$ feynman "what do we know about scaling laws"
→ Searches papers and web, produces a cited research brief

$ feynman deepresearch "mechanistic interpretability"
→ Multi-agent investigation with parallel researchers, synthesis, verification

$ feynman lit "RLHF alternatives"
→ Literature review with consensus, disagreements, open questions

$ feynman audit 2401.12345
→ Compares paper claims against the public codebase

$ feynman replicate "chain-of-thought improves math"
→ Replicates experiments on local or cloud GPUs
```

---

### Workflows

Ask naturally or use slash commands as shortcuts.

| Command | What it does |
| --- | --- |
| `/deepresearch <topic>` | Source-heavy multi-agent investigation |
| `/lit <topic>` | Literature review from paper search and primary sources |
| `/review <artifact>` | Simulated peer review with severity and revision plan |
| `/audit <item>` | Paper vs. codebase mismatch audit |
| `/replicate <paper>` | Replicate experiments on local or cloud GPUs |
| `/compare <topic>` | Source comparison matrix |
| `/draft <topic>` | Paper-style draft from research findings |
| `/autoresearch <idea>` | Autonomous experiment loop |
| `/watch <topic>` | Recurring research watch |
| `/outputs` | Browse all research artifacts |

---

### Agents

Four bundled research agents, dispatched automatically.

- **Researcher** — gather evidence across papers, web, repos, docs
- **Reviewer** — simulated peer review with severity-graded feedback
- **Writer** — structured drafts from research notes
- **Verifier** — inline citations, source URL verification, dead link cleanup

---

### Skills & Tools

- **[AlphaXiv](https://www.alphaxiv.org/)** — paper search, Q&A, code reading, annotations (via `alpha` CLI)
- **Docker** — isolated container execution for safe experiments on your machine
- **Web search** — Gemini or Perplexity, zero-config default
- **Session search** — indexed recall across prior research sessions
- **Preview** — browser and PDF export of generated artifacts
- **Modal** — serverless GPU compute for burst training and inference
- **RunPod** — persistent GPU pods with SSH access for long-running experiments

---

### How it works

Built on [Pi](https://github.com/badlogic/pi-mono) for the agent runtime, [alphaXiv](https://www.alphaxiv.org/) for paper search and analysis, and CLI tools for compute and execution. Capabilities are delivered as [Pi skills](https://github.com/badlogic/pi-skills) — Markdown instruction files synced to `~/.feynman/agent/skills/` on startup. Every output is source-grounded — claims link to papers, docs, or repos with direct URLs.

---

### Star History

<a href="https://www.star-history.com/?repos=getcompanion-ai%2Ffeynman&type=date&legend=top-left">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=getcompanion-ai/feynman&type=date&theme=dark&legend=top-left" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=getcompanion-ai/feynman&type=date&legend=top-left" />
    <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=getcompanion-ai/feynman&type=date&legend=top-left" />
  </picture>
</a>

---

### Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contributor guide.

```bash
git clone https://github.com/getcompanion-ai/feynman.git
cd feynman
nvm use || nvm install
npm install
npm test
npm run typecheck
npm run build
```

[Docs](https://feynman.is/docs) · [Release Notes](RELEASES.md) · [MIT License](LICENSE)

