#!/usr/bin/env node
// Builds index.html from every public chrisns repo tagged "freya-game".
// ponytail: one script, no dependencies — Node's built-in fetch is enough
// for a small nightly static build, so npm install would be pure overhead.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OWNER = "chrisns";
const TOPIC = "freya-game";
const __dirname = dirname(fileURLToPath(import.meta.url));

const token = process.env.GITHUB_TOKEN;
const headers = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) return null;
  return res.json();
}

// Prefer a "gameplay" or "menu" screenshot from the repo's screenshots/
// folder; fall back to GitHub's own auto-generated social preview image,
// which always exists, so every card gets a thumbnail either way.
async function findThumbnail(repo) {
  const contents = await gh(`/repos/${OWNER}/${repo}/contents/screenshots`);
  if (Array.isArray(contents)) {
    const images = contents.filter((f) => /\.(png|jpe?g|webp)$/i.test(f.name));
    const priority = ["gameplay", "menu", "screenshot", "home", "cover"];
    images.sort((a, b) => {
      const rank = (n) => {
        const i = priority.findIndex((p) => n.toLowerCase().includes(p));
        return i === -1 ? 99 : i;
      };
      return rank(a.name) - rank(b.name);
    });
    if (images[0]) return images[0].download_url;
  }
  return `https://opengraph.githubassets.com/1/${OWNER}/${repo}`;
}

// Pulls a proper game title out of "Squishy Fish — a browser game by..."
// Best source of truth: the game's own <title>. Falls back to parsing
// "Squishy Fish — a browser game by..." style descriptions, then to a
// humanised repo name if neither is available.
async function titleFor(repo, description, pageUrl) {
  try {
    const res = await fetch(pageUrl);
    if (res.ok) {
      const html = await res.text();
      const m = html.match(/<title>([^<]+)<\/title>/i);
      if (m && m[1].trim()) return m[1].trim();
    }
  } catch {
    // Pages site not reachable yet (DNS/first deploy) — fall through.
  }
  const m = description && description.match(/^([A-Z][\w' ]{1,30}?)\s+[—-]\s/);
  if (m) return m[1].trim();
  return repo
    .replace(/^freya-/i, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

async function main() {
  const search = await gh(
    `/search/repositories?q=user:${OWNER}+topic:${TOPIC}&sort=updated&per_page=100`
  );
  // Archived repos still get listed — archiving just means "finished", not
  // "not a game" — the Pages site under it keeps working. Forks are excluded.
  const repos = (search?.items || []).filter((r) => !r.fork);

  const games = [];
  for (const r of repos) {
    const url = r.homepage || `https://${OWNER}.github.io/${r.name}/`;
    const [thumbnail, title] = await Promise.all([
      findThumbnail(r.name),
      titleFor(r.name, r.description, url),
    ]);
    games.push({
      name: r.name,
      title,
      description: r.description || "",
      url,
      repoUrl: r.html_url,
      thumbnail,
      updated: r.pushed_at,
      stars: r.stargazers_count,
    });
  }
  games.sort((a, b) => new Date(b.updated) - new Date(a.updated));

  const template = readFileSync(join(__dirname, "template.html"), "utf8");
  const builtAt = new Date().toISOString();

  const cards = games
    .map(
      (g) => `        <a class="card" href="${esc(g.url)}" target="_blank" rel="noopener">
          <div class="thumb"><img src="${esc(g.thumbnail)}" alt="${esc(g.title)} screenshot" loading="lazy"></div>
          <div class="card-body">
            <h2>${esc(g.title)}</h2>
            <p>${esc(g.description)}</p>
            <span class="play">Play now &rarr;</span>
          </div>
        </a>`
    )
    .join("\n");

  const empty = `        <p class="empty">No games found yet. Tag a repo <code>freya-game</code> to add it here.</p>`;

  const html = template
    .replace("<!--GAMES-->", games.length ? cards : empty)
    .replace("<!--COUNT-->", String(games.length))
    .replace("<!--BUILT-->", builtAt);

  writeFileSync(join(__dirname, "..", "index.html"), html);
  console.log(`Built index.html with ${games.length} game(s).`);
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
