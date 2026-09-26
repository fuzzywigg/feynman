---
title: Web Search
description: Web search routing, configuration, and usage within Feynman.
section: Tools
order: 2
---

Feynman's web search tool retrieves current information from the web during research workflows. It supports multiple simultaneous queries, domain filtering, recency filtering, and optional full-page content retrieval. The researcher agent uses web search alongside AlphaXiv to gather evidence from non-academic sources like blog posts, documentation, news, and code repositories.

## Routing modes

Feynman supports four web search route values (`auto`, `perplexity`, `exa`, `gemini`). You can force a provider or let Feynman choose automatically:

| Mode | Description |
| --- | --- |
| `auto` | Try Perplexity, then Exa, then Gemini API, then Gemini Browser |
| `perplexity` | Force Perplexity Sonar for all web searches |
| `exa` | Force Exa for all web searches |
| `gemini` | Force Gemini grounding (default, zero-config) |

## Default behavior

The default path is zero-config Gemini grounding via a signed-in Chromium profile. No API keys are required. This works on macOS and Linux where a Chromium-based browser is installed and signed in to a Google account.

For headless environments, CI pipelines, or servers without a browser, configure an explicit API key for Perplexity, Exa, or Gemini in `~/.feynman/web-search.json`.

## Configuration

Check the current search configuration:

```bash
feynman search status
```

Prefer the CLI to set the route and optional API key:

```bash
feynman search set auto
feynman search set perplexity <api-key>
feynman search set exa <api-key>
feynman search set gemini <api-key>
```

You can also edit `~/.feynman/web-search.json` directly:

```json
{
  "route": "auto",
  "perplexityApiKey": "pplx-...",
  "exaApiKey": "exa-...",
  "geminiApiKey": "AIza..."
}
```

Set `route` to `auto`, `perplexity`, `exa`, or `gemini`. When using `auto`, Feynman tries Perplexity, then Exa, then Gemini API, then Gemini Browser.

## Search features

The web search tool supports several capabilities that the researcher agent leverages automatically:

- **Multiple queries** -- Send 2-4 varied-angle queries simultaneously for broader coverage of a topic
- **Domain filtering** -- Restrict results to specific domains like `arxiv.org`, `github.com`, or `nature.com`
- **Recency filtering** -- Filter results by date, useful for fast-moving topics where only recent work matters
- **Full content retrieval** -- Fetch complete page content for the most important results rather than relying on snippets

## When it runs

Web search is used automatically by researcher agents during workflows. You do not need to invoke it directly. The researcher decides when to use web search versus paper search based on the topic and source availability. Academic topics lean toward AlphaXiv; engineering and applied topics lean toward web search.
