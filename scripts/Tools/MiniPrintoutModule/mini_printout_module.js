import { DevExpressConverter, Utils, applyMiniPrintoutConfig } from './core/tool_printoutFromForm.js';

const DEFAULT_PAKO_CDN = 'https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js';
const DEFAULT_CONFIG_URL = './printout-config.dxs';

let pakoLoadPromise = null;
let configLoadPromise = null;

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
            existing.addEventListener('load', () => resolve(), { once: true });
            existing.addEventListener('error', () => reject(new Error(`Failed to load script: ${src}`)), { once: true });
            if (existing.dataset.loaded === 'true') resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.addEventListener('load', () => {
            script.dataset.loaded = 'true';
            resolve();
        }, { once: true });
        script.addEventListener('error', () => reject(new Error(`Failed to load script: ${src}`)), { once: true });
        document.head.appendChild(script);
    });
}

async function ensurePako(pakoCdnUrl = DEFAULT_PAKO_CDN) {
    if (window.pako) return;

    if (!pakoLoadPromise) {
        pakoLoadPromise = loadScript(pakoCdnUrl).then(() => {
            if (!window.pako) {
                throw new Error('Pako loaded but window.pako is unavailable.');
            }
        });
    }

    await pakoLoadPromise;
}

async function loadConfig(configUrl) {
    const response = await fetch(configUrl, { cache: 'no-cache' });
    if (!response.ok) {
        throw new Error(`Failed to load mini printout config from ${configUrl} (HTTP ${response.status}).`);
    }

    const text = await response.text();
    return JSON.parse(text);
}

async function ensureConfigApplied(options = {}) {
    if (options.config && typeof options.config === 'object') {
        applyMiniPrintoutConfig(options.config);
        return;
    }

    if (options.useConfigFile === false) {
        return;
    }

    const configUrl = options.configUrl || DEFAULT_CONFIG_URL;

    if (!configLoadPromise || options.forceReloadConfig) {
        configLoadPromise = loadConfig(configUrl).then((config) => {
            applyMiniPrintoutConfig(config);
            return config;
        });
    }

    await configLoadPromise;
}

function normalizeFormPayload(payload) {
    const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;

    if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid Form.io payload. Expected an object.');
    }

    if (!parsed.FormioTemplate) {
        throw new Error('Invalid Form.io payload. Missing FormioTemplate.');
    }

    if (typeof parsed.FormioTemplate === 'string') {
        return {
            ...parsed,
            FormioTemplate: JSON.parse(parsed.FormioTemplate)
        };
    }

    return parsed;
}

function sanitizeFileNamePart(value, fallback) {
    const safe = String(value || fallback)
        .replace(/[\\/:*?"<>|]+/g, '_')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');

    return safe || fallback;
}

function buildOutputFileName(formData) {
    const dept = sanitizeFileNamePart(formData.DepartmentName, 'FormIO');
    const name = sanitizeFileNamePart(formData.FormName, 'Report');
    return `${dept}_${name}.json`;
}

function buildSqlFileName(formData) {
    const dept = sanitizeFileNamePart(formData.DepartmentName, 'FormIO');
    const name = sanitizeFileNamePart(formData.FormName, 'Report');
    return `${dept}_${name}.sql`;
}

function downloadJson(content, fileName) {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export async function convertFormPayloadToReportJson(payload, options = {}) {
    await ensurePako(options.pakoCdnUrl);
    await ensureConfigApplied(options);

    const formData = normalizeFormPayload(payload);
    const reportJson = DevExpressConverter.transformToDevExpress(formData);
    const sqlText = Utils.generateSqlQuery(formData);

    return {
        formData,
        reportJson,
        sqlText,
        fileName: options.outputFileName || buildOutputFileName(formData),
        sqlFileName: options.sqlFileName || buildSqlFileName(formData)
    };
}

export function attachMiniPrintoutModule(options = {}) {
    const button = options.button || (options.buttonId ? document.getElementById(options.buttonId) : null);

    if (!button) {
        throw new Error('attachMiniPrintoutModule requires options.button or options.buttonId.');
    }

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,application/json';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    const onError = typeof options.onError === 'function'
        ? options.onError
        : (error) => console.error('[MiniPrintoutModule] Conversion failed:', error);

    const onSuccess = typeof options.onSuccess === 'function'
        ? options.onSuccess
        : null;

    button.addEventListener('click', () => {
        fileInput.value = '';
        fileInput.click();
    });

    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const result = await convertFormPayloadToReportJson(text, {
                pakoCdnUrl: options.pakoCdnUrl,
                config: options.config,
                configUrl: options.configUrl,
                useConfigFile: options.useConfigFile,
                forceReloadConfig: options.forceReloadConfig,
                outputFileName: typeof options.outputFileName === 'function'
                    ? options.outputFileName(file.name)
                    : options.outputFileName
            });

            const output = JSON.stringify(result.reportJson, null, 2);
            downloadJson(output, result.fileName);

            const shouldDownloadSql = options.downloadSql !== false;
            if (shouldDownloadSql && result.sqlText) {
                downloadJson(result.sqlText, result.sqlFileName);
            }

            if (onSuccess) {
                onSuccess({
                    file,
                    fileName: result.fileName,
                    sqlFileName: result.sqlFileName,
                    reportJson: result.reportJson,
                    sqlText: result.sqlText,
                    formData: result.formData
                });
            }
        } catch (error) {
            onError(error);
        }
    });

    return {
        destroy() {
            fileInput.remove();
        }
    };
}
