import path from "path";
import { existsSync } from "fs";
import { loadJSON } from "./helpers.js";

export async function loadAndValidateConfig(projectRoot, configPath) {
    const absProjectRoot = path.resolve(projectRoot);
    const absConfigPath = path.resolve(absProjectRoot, configPath);

    if (!existsSync(absConfigPath))
        throw new Error(`Config file does not exist: ${absConfigPath}`);

    const config = await loadJSON(absConfigPath);

    const resolveIfSet = (p) => (p ? path.resolve(absProjectRoot, p) : null);

    // Resolve fragments
    if (config.fragments) {
        for (const [k, v] of Object.entries(config.fragments))
            config.fragments[k] = resolveIfSet(v);
    }

    // Resolve profile paths
    if (config.profiles) {
        for (const [name, profile] of Object.entries(config.profiles)) {
            if (profile.templatePath)
                profile.templatePath = resolveIfSet(profile.templatePath);

            if (profile.outDirRule)
                profile.outDirRule = profile.outDirRule.replaceAll("\\", "/");
        }
    }

    // Resolve sources
    if (Array.isArray(config.sources)) {
        config.sources = config.sources.map((src) => ({
            profile: src.profile,
            path: resolveIfSet(src.path)
        }));
    } else {
        throw new Error(`Missing or invalid "sources" array in config`);
    }

    return config;
}
