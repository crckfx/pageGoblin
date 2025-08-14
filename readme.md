# Installation
```bash
git clone git@github.org:crckfx/pageGoblin
cd pageGoblin
npm install
```

# Usage

### resolve-all.js
*for building an entire site from structured json*
```bash
node resolve-all.js <projectRoot> <distRoot> <pagesJson> <configJson> [--write] [--clean] [--verbose]
```

### run-img-goblin.js
- (currently specifically for Learnfully)
- for replacing img tags with default and srcset

```bash
node run-img-goblin.js . ./dist --write
```