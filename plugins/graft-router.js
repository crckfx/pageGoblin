// graft-router.js
import path from "path";
import fs from "fs";

export function routeGrafts(projectRoot, graftConfig, providers = {}) {
    if (!graftConfig || typeof graftConfig !== "object") return [];

    const routed = [];

    for (const [name, entry] of Object.entries(graftConfig)) {

        const resolvedInputs = {};
        const templateAbs = path.resolve(projectRoot, entry.template);
        const templateExists = fs.existsSync(templateAbs)
        let inputsAllExist = true;


        for (const [key, input] of Object.entries(entry.inputs || {})) {
            if (!input || typeof input !== "object") continue;

            const { type } = input;

            switch (type) {

                case "text":
                    resolvedInputs[key] = {
                        type: "text",
                        value: input.value || "",
                        exists: true
                    };
                    break;

                case "file":
                    const abs = path.resolve(projectRoot, input.path);
                    resolvedInputs[key] = {
                        type: "file",
                        path: input.path,
                        absPath: abs,
                        exists: fs.existsSync(abs)
                    };
                    break;

                case "function":
                    resolvedInputs[key] = {
                        type: "function",
                        name: input.name,
                        exists: typeof providers[input.name] === "function",
                        fn: providers[input.name] || null
                    };
                    break;

                default:
                    resolvedInputs[key] = { type: "unknown", raw: input };
                    break;
            }

            if (!resolvedInputs[key].exists) {
                inputsAllExist = false;
            }
        }

        routed.push({
            name,
            template: templateAbs,
            inputs: resolvedInputs,
            looksGood: (templateExists && inputsAllExist)
        });
    }

    return routed;
}
