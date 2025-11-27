import path from "path";
import { existsSync } from "fs";
import { loadJSON } from "./helpers.js";
import { pathToFileURL } from "url";

export async function loadAndValidateConfig(projectRoot, configPath) {
    // first, hard the project root
    const absProjectRoot = path.resolve(projectRoot);
    // second, hard the config path (at this point we're expecting "it is located somewhere within the root folder; not necessarily at the top-level though")
    const absConfigPath = path.resolve(absProjectRoot, configPath);
    if (!existsSync(absConfigPath))
        throw new Error(`Config file does not exist: ${absConfigPath}`);

    const config = await loadJSON(absConfigPath);

    // todo: define the use case for this helper properly. possibly refactor out.
    const resolveIfSet = (p) => (p ? path.resolve(absProjectRoot, p) : null);

    // get absPath for config-level default fragments (fragments level 0)
    if (config.fragments) {
        for (const [k, v] of Object.entries(config.fragments)) {
            if (typeof v === "string" && v.startsWith("graft:")) {
                config.fragments[k] = v; // keep it exactly as-is
            } else {
                config.fragments[k] = resolveIfSet(v);
            }
        }
    }
    // get absPath for config-level default template (template level 0)
    if (config.templatePath) config.templatePath = resolveIfSet(config.templatePath);


    // ***************************************************
    // ESSENTIAL (as per current design)
    // ***************************************************
    //
    // profiles
    if (config.profiles) {
        for (const [name, profile] of Object.entries(config.profiles)) {
            // // some rule... it's <maybe> necessary
            // if (profile.outDirRule)
            //     profile.outDirRule = profile.outDirRule.replaceAll("\\", "/");

            // get absPath for profile-level template (template level 1)
            if (profile.templatePath)
                profile.templatePath = resolveIfSet(profile.templatePath);

            // get absPath for profile-level fragments (fragments level 1)
            if (profile.fragments) {
                for (const [k, v] of Object.entries(profile.fragments)) {
                    if (typeof v === "string" && v.startsWith("graft:")) {
                        profile.fragments[k] = v; // keep it exactly as-is
                    } else {
                        profile.fragments[k] = resolveIfSet(v);
                    }
                }
            }
        }
    }
    // sources 
    if (!Array.isArray(config.sources)) throw new Error(`Missing or invalid "sources" array in config`);
    for (const src of config.sources) {
        if (!src.profile || !src.path)
            throw new Error(`Invalid source entry: ${JSON.stringify(src)}`);
        src.path = resolveIfSet(src.path);
    }

    // providers (experimental)
    if (config.providersFile) {
        const abs = path.resolve(absProjectRoot, config.providersFile);
        const fileUrl = pathToFileURL(abs).href;
        try {
            config.providers = await import(fileUrl);
        } catch (err) {
            config.providers = {};
        }
    } else {
        config.providers = {};
    }


    // ***************************************************

    return config;
}
