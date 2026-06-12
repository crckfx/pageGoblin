# todo

- [x] support single values (non-array) to be provided for all multi-value options in pages.json 
    
    (probably doesn't make sense to support fragments here)
    - [x] done for `imports`
    - [x] done for `contentPath`
    - [x] done for `styles`, `scripts`, `modules`

    (is that all of them? ticking it for now lol)

- [x] support multiple values for contentPath (ie. allow a `pages.json` entry to dump several HTML snippets into its `body`)

- [x] allow grafts
- [x] write usage documentation for `grafts`
- [x] cache and compare function body for `grafts` 
- [x] pass the whole cache around instead of passing around *goblinCache.pages* as cache
- [x] separate page and graft rebuild logic
- [x] rebuild (force) if a page's graft function output changed
- [x] fix stale page deletion from cache (bug born from *pass around whole cache* change)
- [x] delete stale graft entries from cache
- [x] delete stale graft files from .pageGoblin
- [ ] fix some bad names 
    - [x] rename the now-misnomer `htmlChanges` (it now carries all the page build things) DONE - renamed to `pageChanges`
- [x] make grafts available for `contentPath` 
- [ ] make grafts available for something *beyond* `fragments` and `contentPath` (please define this idea better lol)

# etc
## re: boundaries and 'grafts as non-universal' problem
>"url-or-not" should be the true boundary between a `page` vs. a `content`

>currently: contentPath (multi-file resolve) does an "amalgamate contents from path(s)" operation

>currently, technically: all "nested EJS renders" where a template is used **must** be implemented as `grafts` as per current architecture

>hopefully, nested renders can be used such that render order is a pure analogy to regular maths' parenthetical expansion order (ie. "bottom-up", or "deepest first")

## re: uhh write this heading
>currently, potentially: an entry in pages has a local URL as derived from tree, but not from a custom outputPath? (ie. *write code to test this premise*)