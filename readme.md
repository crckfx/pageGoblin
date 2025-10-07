# Installation
```bash
git clone git@github.org:crckfx/pageGoblin
cd pageGoblin
npm install
```

# Building

> use `resolve-all.js`.

to build the site from its config, call ***`resolve-all.js`***, feeding it the following three paths as args:
1. project root *directory*
2. target build *directory*
3. pageGoblin config *file*

for example:
```bash
node resolve-all.js <projectRoot> <distRoot> <pagesJson> <configJson> [--write] [--clean] [--verbose]
```
> note: you must actually specify `--write` in order to build. without the flag, it does a dry run, only printing the plan; not executing it.

# Config
> provide a config file in JSON form.

when running `resolve-all.js`, it is assumed that you will provide a path to a config file as an arg.

`config` will specify the site's top-level essentials: 
- ***build profile(s)***: per-zone default settings + template
- ***source lists***: paths to zone files, along with corresponding build profiles
- ***fragments***: paths to files whose contents are auto-passed as plaintext to a zone's build context

example config:
```json
{
    "profiles": {
        "default": {
            "templatePath": "templates/page.ejs"
        }
    },
    "sources": [
        {
            "profile": "default",
            "path": "pages.json"
        }
    ],
    "fragments": {
        "header": "components/header/header.html",
        "footer": "components/footer/footer.html",
        "global": "components/global.html",
        "head": "components/head-content.html"
    }
}
```


# zone list(s) *(FKA `pages.json`)*
> when running `resolve-all.js`, it is assumed that at least one list of zones (provided as JSON) exists somewhere in the project, and that all lists to be used are specified in the config's `sources:[]`.

a *zone list* file describes a plan to copy or render source files into a public html location. pageGoblin will iterate over any zone list(s) provided in the project config's `"sources":[{"path": "some/path/to/zone1.JSON"},{"path": "some/path/to/zone2.JSON"}]` and process all of its/their pages.

a zone list can be nested via its. `children` pageGoblin does not care whether you provide 1 or 20 zone lists. for example:
- *for example*: a website's structural blueprint might be defined in a single zone list file 
- *alternatively*: a website might instead comprise a multitude of zones; all read from different files; thrown together into a unified 'public HTML folder'.

source lists will be read as JSON, and each 'page entry' (regardless of nesting/structure) will each be individually processed as a 'page'.

## defining a 'zone' (or 'page')
- from pageGoblin's perspective: a 'zone' is *an object contained inside a source list*
- from runtime's perspective: a 'zone' is *a directory location nested recursively inside a public HTML folder*

### a zone may be:
- situated at the top level of a zone list.
- nested within another zones's `children` field (this rule applies recursively).

### for each zone: 
pageGoblin will decide (using nesting) upon a canonical public location, doing one or both of either:
- rendering a static HTML file (if `contentPath` is provided) to the location
- copying in assets (if `imports` is provided) to the location

### directory structure
structure can be encoded into a source list by nesting `children` in an entry.
- entries at the top level of the JSON will (by default) create a folder inside the build root
- nested entries will (by default) create a folder inside their parent entry's directory 

by default, an entry's folder assumes the same name as its JSON key. however, specifying `outDir` for the entry will override this, along with any inferred nesting.

### example `pages.json`
```json
{
    "someLocation": {                   // 1. someLocation
        "contentPath": "some_content.html",
        "children": {
            "someNestedLocation": {     // 2. someNestedLocation
                "contentPath": "some_content.html",
                "imports": "some_styles.css"
            },
        }
    },
    "someSpecialPage": {            // 3.
        "contentPath": "some_special_content.html",
        "outDir": "/someLocation/someSpecificLocation"
    },
    "homepage": {                   // 4.
        "contentPath": [
            "home_content.html",
            "extra_home_content.html"
        ],
        "outDir": "/",
        "imports": [
            "assets/favicon.ico",
            "someGlobalFolder"
        ]
    }
}
```
in this example:
1.   `someLocation` renders `/someLocation/index.html`
2.   `someNestedLocation` renders its own `index.html` and imports `some_styles.css`
3.   `someSpecialPage` renders `/someLocation/someSpecificLocation/index.html`
4.   `homepage` renders a root `index.html` from multiple contentPaths, and imports a file and a folder

the output would look like:
```text
public/
├── favicon.ico
├── index.html
├── someGlobalFolder/
│   ├── (contents of someGlobalFolder...)
│   │   ├── (...recursively)
├── someLocation/
│   ├── index.html
│   ├── someNestedLocation/
│   │   ├── index.html
│   │   └── some_styles.css
│   └── someSpecificLocation/
│       └── index.html
```


#  more

### *core* keys:
- outDir
- contentPath
- imports
- children
- outFile

### *ejs-specific* keys:
- title
- scripts
- styles
- modules
- global (?)


## doctoring: run-img-goblin.js
*for modifying already built files using pageGoblin's cache*
- (currently specifically for Learnfully)
- for replacing regular old img tags with beefed up tags using `default` and `srcset`

```bash
node run-img-goblin.js . ./dist --write
```
