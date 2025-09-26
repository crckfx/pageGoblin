## usage: pages.json
> *<strong>pages.json</strong>: mandatory file in root that defines all the pages for a build run*

required for a given entry:
- (a unique key)
- contentPath
- title

optional:
- outputPath
- imports
- scripts
- styles
- modules
- children


for example:
``` json
{
    "home": {
        "title": "Home",
        "contentPath": "pages/home/home.html",
        "outputPath": "dist/index.html",
        "imports": [
            "css",
            "js"
        ],
        "scripts": [ "/js/global.js" ],
        "modules": []
    },
    "away": {
        "title": "Away",
        "contentPath": "pages/away/away.html",
        "headerPath": "components/header_secondary.html",
        "children": {
            "beach-house": {
                "title": "Beach House",
                "contentPath": "pages/away/beach-house/beach-house.html",
                "imports": [ "pages/away/beach-house/beach-house.css" ],
                "styles": [ "/away/beach-house/beach-house.css" ],
                "scripts": [ "/js/global.js"],
                "children": {
                    "dont-tell-michael": {
                        "title": "Rule #1",
                        "contentPath": "pages/away/beach-house/dont-tell-michael/dont-tell-michael.html",
                        "styles": [ "/away/beach-house/beach-house.css" ],
                    }
                }
            }
        }
    }
}
```