# Installation
```bash
git clone git@github.org:crckfx/pageGoblin
cd pageGoblin
npm install
```

# Required files

## 1. `config.json`
this file specifies the essentials
```json
{
    "pagesJsonPath": "pages.json",
    "globalHtmlPath": "components/global.html",
    "headContentPath": "components/head-content.html",
    "headerPath": "components/header/header.html",
    "footerPath": "components/footer/footer.html",
    "templatePath": "templates/page.ejs",
}
```


## 2. `pages.json`
this file is the website's structural blueprint. it describes the plan to translate source files into a public html.


for each unique 'page' entry found in `pages.json`, pageGoblin will:
- render static HTML files (if `contentPath` is provided) 
- copy in assets (if `imports` is provided)

### directory structure
structure can be encoded in `pages.json` by nesting `children` in entries.
- entries at the top level of the JSON will create a folder inside the build root
- nested entries will create a folder inside their parent entry's directory 

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
        "contentPath": "home_content.html",
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
4.   `homepage` renders a root `index.html` imports a file and a folder

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

# building: `resolve-all.js`

to build the website, call **resolve-all.js**, feeding it the following three paths as args:
1. project root directory
2. build directory
3. pageGoblin config file

for example:
```bash
node resolve-all.js <projectRoot> <distRoot> <pagesJson> <configJson> [--write] [--clean] [--verbose]
```
note: you must specify `--write` to actually build. without the flag, it does a dry run, printing the plan.

## doctoring: run-img-goblin.js
*for modifying already built files using pageGoblin's cache*
- (currently specifically for Learnfully)
- for replacing img tags with default and srcset

```bash
node run-img-goblin.js . ./dist --write
```