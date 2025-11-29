# todo

- [x] support single values (non-array) to be provided for all multi-value options in pages.json 
    
    (probably doesn't make sense to support fragments here)
    - [x] done for `imports`
    - [x] done for `contentPath`
    - [x] done for `styles`, `scripts`, `modules`

    (is that all of them? ticking it for now lol)

- [x] support multiple values for contentPath (ie. allow a `pages.json` entry to dump several HTML snippets into its `body`)

- [x] allow grafts
- [ ] write documentation for grafts
- [x] cache and compare function body for grafts 
- [x] pass the whole cache around instead of passing around *goblinCache.pages* as cache
- [x] separate page and graft rebuild logic
- [x] rebuild (force) if a page's graft function output changed
- [x] fix stale page deletion from cache (bug born from *pass around whole cache* change)
- [x] delete stale graft entries from cache
- [ ] delete stale graft files from .pageGoblin
- [ ] fix some bad names 
    - [ ] rename the now-misnomer "htmlChanges" (it now carries all the page build things)
- [ ] make grafts available for contentPath (and possibly more) too (they currently are only for fragments)
