# Freya's Games

A hub page that lists every browser game Freya has made.

Live site: https://chrisns.github.io/freya-dev/

## How it works

A GitHub Actions workflow runs every night, and can also be run by hand:

1. It searches GitHub for every public `chrisns` repo tagged `freya-game`.
2. For each one, it reads the repo's own screenshot (from a `screenshots/`
   folder) for the thumbnail, and the game's own `<title>` for the card
   heading.
3. It renders `index.html` from `scripts/template.html` and commits it if
   anything changed.

There is no database and no manual step. Tag a new repo `freya-game`, add a
`screenshots/gameplay.png` (or `.jpg`/`.webp`) to it, and it appears on this
page the next night, or immediately if you run the workflow by hand.

## Adding a game

1. Tag the game's repo with the GitHub topic `freya-game`.
2. Make sure it has a screenshot under `screenshots/` (`gameplay.*` or
   `menu.*` is preferred; any image in that folder is used as a fallback).
3. Enable GitHub Pages for it, or set its `homepage` field, so there is
   somewhere to link to.

## Run the build locally

```
GITHUB_TOKEN=$(gh auth token) node scripts/build.mjs
```

This overwrites `index.html`. No dependencies to install.

## Design

Typography and spacing come from the
[CNS design system](https://github.com/chrisns/design)'s `tokens.css`,
loaded from jsDelivr. The colours are Freya's own palette: blue, purple,
pink, and green.
