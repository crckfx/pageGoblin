import path from "path";
import { existsSync } from "fs";
import { loadJSON } from "./helpers.js";

export async function loadAndValidateConfig(projectRoot, configPath) {
    const absProjectRoot = path.resolve(projectRoot);
    const absConfigPath = path.resolve(absProjectRoot, configPath);

    if (!existsSync(absConfigPath)) {
        throw new Error(`Config file does not exist: ${absConfigPath}`);
    }

    // Load + merge defaults
    const rawConfig = await loadJSON(absConfigPath);
    const config = rawConfig.default ? { ...rawConfig, ...rawConfig.default } : rawConfig;
    delete config.default;

    // Mandatory: pagesJsonPath
    if (!config.pagesJsonPath || typeof config.pagesJsonPath !== "string") {
        throw new Error(`Missing or invalid "pagesJsonPath" in config: ${absConfigPath}`);
    }

    // Resolve all known paths relative to project root
    const resolveIfSet = (p) => (p ? path.resolve(absProjectRoot, p) : null);

    config.pagesJsonPath = resolveIfSet(config.pagesJsonPath);
    config.articlesJsonPath = resolveIfSet(config.articlesJsonPath);
    config.headContentPath = resolveIfSet(config.headContentPath);
    config.headerPath = resolveIfSet(config.headerPath);
    config.footerPath = resolveIfSet(config.footerPath);
    config.templatePath = resolveIfSet(config.templatePath);
    config.globalHtmlPath = resolveIfSet(config.globalHtmlPath);
    config.article = config.article || {};

    if (config.article.templatePath) {
        config.article.templatePath = resolveIfSet(config.article.templatePath);
    }
    if (config.article.articleCardTemplatePath) {
        config.article.articleCardTemplatePath = resolveIfSet(config.article.articleCardTemplatePath);
    }


    return config;
}
