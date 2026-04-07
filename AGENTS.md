## Project Context

A JavaScript project using Next.js, React. Contains 34 files across 4 directories.

## Stack

**Languages:**
- JavaScript (93%)
- CSS (7%)

**Frameworks & Tools:**
- Next.js (web)
- React (web)

## Commands

```bash
npm run dev  # dev
npm run build  # build
npm run start  # start
npm run lint  # lint
```

## Conventions

- **Naming**: mixed
- **File organization**: flat
- **Config files**: jsconfig.json, eslint.config.mjs

## Architecture

**Key directories:**
- `app/` - Application code
- `public/` - Static public assets

## Boundaries

**Always:**
- Run existing tests before committing changes
- Run `npm run lint` before committing
- Follow mixed naming convention
- Follow flat file organization

**Ask first:**
- Adding new dependencies
- Changing project configuration files

**Never:**
- Commit secrets, API keys, or .env files
- Delete or overwrite test files without understanding them
- Force push to main/master branch

<!-- agentseed:meta {"sha":"ac03a107fe39e409cd027afff8da66d698a5ad02","timestamp":"2026-03-19T03:32:37.310Z","format":"agentseed-v1"} -->
