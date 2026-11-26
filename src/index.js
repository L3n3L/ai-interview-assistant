if (require('electron-squirrel-startup')) {
    process.exit(0);
}

const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const fs = require('fs/promises');
const path = require('path');
const { formatSessionMarkdown } = require('./utils/historyExport');
const { createWindow, updateGlobalShortcuts } = require('./utils/window');
const { setupGeminiIpcHandlers, stopMacOSAudioCapture, closeQwenRealtimeSession, sendToRenderer } = require('./utils/gemini');
const { logTransportEvent } = require('./utils/transportLogger');
const phoneCompanion = require('./utils/phoneCompanion');
const storage = require('./storage');
const { profilePrompts: defaultProfilePrompts } = require('./utils/prompts');

const geminiSessionRef = { current: null };
const QWEN_PROMPT_SCHEME_FORMAT = 'ai-interview-assistant-qwen-prompt-scheme';
const QWEN_PROMPT_SCHEME_FILE_VERSION = 1;
const QWEN_PROMPT_SCHEME_MAX_BYTES = 2 * 1024 * 1024;
let mainWindow = null;

function normalizeQwenPromptSchemeFile(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('文件内容必须是提示词方案 JSON 对象');
    }
    if (value.format && value.format !== QWEN_PROMPT_SCHEME_FORMAT) {
        throw new Error('文件格式不属于 AI 面试助手提示词方案');
    }
    if (value.version !== undefined && value.version !== QWEN_PROMPT_SCHEME_FILE_VERSION) {
        throw new Error(`不支持的提示词文件版本：${value.version}`);
    }

    const prompts = value.prompts;
    if (!prompts || typeof prompts !== 'object' || Array.isArray(prompts)) {
        throw new Error('文件缺少 prompts 提示词内容');
    }
    if (!prompts.profilePrompts || typeof prompts.profilePrompts !== 'object' || Array.isArray(prompts.profilePrompts)) {
        throw new Error('文件缺少 profilePrompts 场景提示词');
    }

    const normalizedProfilePrompts = {};
    for (const [profile, defaultFields] of Object.entries(defaultProfilePrompts)) {
        const sourceFields = prompts.profilePrompts[profile];
        if (!sourceFields || typeof sourceFields !== 'object' || Array.isArray(sourceFields)) {
            throw new Error(`文件缺少「${profile}」场景`);
        }

        normalizedProfilePrompts[profile] = {};
        for (const field of Object.keys(defaultFields)) {
            if (typeof sourceFields[field] !== 'string') {
                throw new Error(`「${profile}.${field}」必须是文本内容`);
            }
            normalizedProfilePrompts[profile][field] = sourceFields[field];
        }
    }

    if (typeof prompts.customPrompt !== 'string' || typeof prompts.qwenChineseInstruction !== 'string') {
        throw new Error('文件缺少自定义指令或简体中文回答要求');
    }

    return {
        name: typeof value.name === 'string' ? value.name.slice(0, 80) : '',
        prompts: {
            profilePrompts: normalizedProfilePrompts,
            customPrompt: prompts.customPrompt,
            qwenChineseInstruction: prompts.qwenChineseInstruction,
        },
    };
}

function makeQwenPromptSchemeFilename(name) {
    const safeName = String(name || '提示词方案')
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
        .trim()
        .slice(0, 80);
    return `${safeName || '提示词方案'}.json`;
}

function parseQwenPromptSchemeJson(rawContents) {
    let content = rawContents.replace(/^\uFEFF/, '').trim();
    const fencedJson = content.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fencedJson) content = fencedJson[1];
    return JSON.parse(content);
}

function createMainWindow() {
    mainWindow = createWindow(sendToRenderer, geminiSessionRef);
    return mainWindow;
}

app.whenReady().then(async () => {
    // Initialize storage (checks version, resets if needed)
    storage.initializeStorage();

    // Trigger screen recording permission prompt on macOS if not already granted
    if (process.platform === 'darwin') {
        const { desktopCapturer } = require('electron');
        desktopCapturer.getSources({ types: ['screen'] }).catch(() => {});
    }

    createMainWindow();
    setupGeminiIpcHandlers(geminiSessionRef);
    setupStorageIpcHandlers();
    setupGeneralIpcHandlers();
    phoneCompanion.startBridge().catch(error => console.error('Error starting phone companion bridge:', error));
});

app.on('window-all-closed', () => {
    stopMacOSAudioCapture();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    stopMacOSAudioCapture();
    phoneCompanion.shutdownBridge().catch(error => console.error('Error stopping phone companion bridge:', error));
    closeQwenRealtimeSession();
    require('./utils/localai').closeLocalSession();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});

function setupStorageIpcHandlers() {
    // ============ CONFIG ============
    ipcMain.handle('storage:get-config', async () => {
        try {
            return { success: true, data: storage.getConfig() };
        } catch (error) {
            console.error('Error getting config:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-config', async (event, config) => {
        try {
            storage.setConfig(config);
            return { success: true };
        } catch (error) {
            console.error('Error setting config:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:update-config', async (event, key, value) => {
        try {
            storage.updateConfig(key, value);
            return { success: true };
        } catch (error) {
            console.error('Error updating config:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ CREDENTIALS ============
    ipcMain.handle('storage:get-credentials', async () => {
        try {
            return { success: true, data: storage.getCredentials() };
        } catch (error) {
            console.error('Error getting credentials:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-credentials', async (event, credentials) => {
        try {
            storage.setCredentials(credentials);
            return { success: true };
        } catch (error) {
            console.error('Error setting credentials:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:get-api-key', async () => {
        try {
            return { success: true, data: storage.getApiKey() };
        } catch (error) {
            console.error('Error getting API key:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-api-key', async (event, apiKey) => {
        try {
            storage.setApiKey(apiKey);
            return { success: true };
        } catch (error) {
            console.error('Error setting API key:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:get-groq-api-key', async () => {
        try {
            return { success: true, data: storage.getGroqApiKey() };
        } catch (error) {
            console.error('Error getting Groq API key:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-groq-api-key', async (event, groqApiKey) => {
        try {
            storage.setGroqApiKey(groqApiKey);
            return { success: true };
        } catch (error) {
            console.error('Error setting Groq API key:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:get-deepseek-api-key', async () => {
        try {
            return { success: true, data: storage.getDeepSeekApiKey() };
        } catch (error) {
            console.error('Error getting DeepSeek API key:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-deepseek-api-key', async (event, deepseekApiKey) => {
        try {
            storage.setDeepSeekApiKey(deepseekApiKey);
            return { success: true };
        } catch (error) {
            console.error('Error setting DeepSeek API key:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:get-qwen-realtime-api-key', async () => {
        try {
            return { success: true, data: storage.getQwenRealtimeApiKey() };
        } catch (error) {
            console.error('Error getting Qwen realtime API key:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-qwen-realtime-api-key', async (event, qwenRealtimeApiKey) => {
        try {
            storage.setQwenRealtimeApiKey(qwenRealtimeApiKey);
            return { success: true };
        } catch (error) {
            console.error('Error setting Qwen realtime API key:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ PREFERENCES ============
    ipcMain.handle('storage:get-preferences', async () => {
        try {
            return { success: true, data: storage.getPreferences() };
        } catch (error) {
            console.error('Error getting preferences:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-preferences', async (event, preferences) => {
        try {
            storage.setPreferences(preferences);
            return { success: true };
        } catch (error) {
            console.error('Error setting preferences:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:update-preference', async (event, key, value) => {
        try {
            storage.updatePreference(key, value);
            return { success: true };
        } catch (error) {
            console.error('Error updating preference:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ QWEN PROMPT SCHEME FILES ============
    ipcMain.handle('qwen-prompt:export-scheme', async (event, schemeData) => {
        try {
            const scheme = normalizeQwenPromptSchemeFile(schemeData);
            const result = await dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender), {
                title: '导出提示词方案',
                defaultPath: path.join(app.getPath('documents'), makeQwenPromptSchemeFilename(scheme.name)),
                filters: [{ name: '提示词方案 JSON', extensions: ['json'] }],
            });
            if (result.canceled || !result.filePath) return { success: true, canceled: true };

            const fileContents = {
                format: QWEN_PROMPT_SCHEME_FORMAT,
                version: QWEN_PROMPT_SCHEME_FILE_VERSION,
                name: scheme.name,
                prompts: scheme.prompts,
            };
            await fs.writeFile(result.filePath, JSON.stringify(fileContents, null, 2), 'utf8');
            return { success: true, fileName: path.basename(result.filePath) };
        } catch (error) {
            console.error('Error exporting Qwen prompt scheme:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('qwen-prompt:import-scheme', async event => {
        try {
            const result = await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender), {
                title: '导入提示词方案',
                defaultPath: app.getPath('documents'),
                filters: [{ name: '提示词方案 JSON', extensions: ['json'] }],
                properties: ['openFile'],
            });
            if (result.canceled || !result.filePaths?.[0]) return { success: true, canceled: true };

            const filePath = result.filePaths[0];
            const fileInfo = await fs.stat(filePath);
            if (fileInfo.size > QWEN_PROMPT_SCHEME_MAX_BYTES) {
                throw new Error('提示词文件超过 2 MB，无法导入');
            }

            const rawContents = await fs.readFile(filePath, 'utf8');
            const importedScheme = normalizeQwenPromptSchemeFile(parseQwenPromptSchemeJson(rawContents));
            return {
                success: true,
                data: {
                    ...importedScheme,
                    fileName: path.basename(filePath),
                },
            };
        } catch (error) {
            console.error('Error importing Qwen prompt scheme:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ KEYBINDS ============
    ipcMain.handle('storage:get-keybinds', async () => {
        try {
            return { success: true, data: storage.getKeybinds() };
        } catch (error) {
            console.error('Error getting keybinds:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:set-keybinds', async (event, keybinds) => {
        try {
            storage.setKeybinds(keybinds);
            return { success: true };
        } catch (error) {
            console.error('Error setting keybinds:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ HISTORY ============
    ipcMain.handle('storage:export-session', async (event, sessionId) => {
        try {
            if (typeof sessionId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(sessionId)) {
                throw new Error('无效的会话编号');
            }
            const session = storage.getSession(sessionId);
            if (!session) throw new Error('会话不存在，请刷新历史记录后重试');
            const result = await dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender), {
                title: '导出面试记录',
                defaultPath: path.join(app.getPath('documents'), `面试记录-${sessionId}.md`),
                filters: [{ name: 'Markdown 文档', extensions: ['md'] }],
            });
            if (result.canceled || !result.filePath) return { success: true, canceled: true };
            await fs.writeFile(result.filePath, '\uFEFF' + formatSessionMarkdown(session), 'utf8');
            return { success: true };
        } catch (error) {
            console.error('Error exporting session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:get-all-sessions', async () => {
        try {
            return { success: true, data: storage.getAllSessions() };
        } catch (error) {
            console.error('Error getting sessions:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:get-session', async (event, sessionId) => {
        try {
            return { success: true, data: storage.getSession(sessionId) };
        } catch (error) {
            console.error('Error getting session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:save-session', async (event, sessionId, data) => {
        try {
            storage.saveSession(sessionId, data);
            return { success: true };
        } catch (error) {
            console.error('Error saving session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:delete-session', async (event, sessionId) => {
        try {
            storage.deleteSession(sessionId);
            return { success: true };
        } catch (error) {
            console.error('Error deleting session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('storage:delete-all-sessions', async () => {
        try {
            storage.deleteAllSessions();
            return { success: true };
        } catch (error) {
            console.error('Error deleting all sessions:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ LIMITS ============
    ipcMain.handle('storage:get-today-limits', async () => {
        try {
            return { success: true, data: storage.getTodayLimits() };
        } catch (error) {
            console.error('Error getting today limits:', error);
            return { success: false, error: error.message };
        }
    });

    // ============ CLEAR ALL ============
    ipcMain.handle('storage:clear-all', async () => {
        try {
            storage.clearAllData();
            return { success: true };
        } catch (error) {
            console.error('Error clearing all data:', error);
            return { success: false, error: error.message };
        }
    });
}

function setupGeneralIpcHandlers() {
    const isLocalRenderer = event => typeof event.senderFrame?.url === 'string' && event.senderFrame.url.startsWith('file://');

    ipcMain.handle('phone-companion:start-session', async event => {
        if (!isLocalRenderer(event)) {
            return { success: false, error: 'Invalid renderer' };
        }
        try {
            return await phoneCompanion.startSession();
        } catch (error) {
            console.error('Error starting phone companion:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('phone-companion:get-info', async event => {
        if (!isLocalRenderer(event)) {
            return { success: false, error: 'Invalid renderer' };
        }
        try {
            return await phoneCompanion.getConnectionInfo();
        } catch (error) {
            console.error('Error getting phone companion info:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.on('phone-companion:view-state', (event, payload) => {
        if (!isLocalRenderer(event) || !payload || typeof payload !== 'object') return;
        const currentResponseIndex = Number.isInteger(payload.currentResponseIndex) ? payload.currentResponseIndex : undefined;
        phoneCompanion.setViewState({ currentResponseIndex });
    });

    ipcMain.on('phone-companion:scroll-command', (event, direction) => {
        if (!isLocalRenderer(event)) return;
        phoneCompanion.sendPhoneScrollCommand(direction);
    });

    ipcMain.handle('get-app-version', async () => {
        return app.getVersion();
    });

    ipcMain.handle('quit-application', async event => {
        try {
            stopMacOSAudioCapture();
            app.quit();
            return { success: true };
        } catch (error) {
            console.error('Error quitting application:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('open-external', async (event, url) => {
        try {
            await shell.openExternal(url);
            return { success: true };
        } catch (error) {
            console.error('Error opening external URL:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.on('update-keybinds', (event, newKeybinds) => {
        if (mainWindow) {
            // Also save to storage
            storage.setKeybinds(newKeybinds);
            updateGlobalShortcuts(newKeybinds, mainWindow, sendToRenderer, geminiSessionRef);
        }
    });

    // Debug logging from renderer
    ipcMain.on('log-message', (event, msg) => {
        console.log(msg);
    });

    ipcMain.handle('log-audio-diagnostic', async (event, payload = {}) => {
        const type = typeof payload.type === 'string' ? payload.type.slice(0, 80) : 'unknown';
        const data = payload.data && typeof payload.data === 'object' ? payload.data : {};
        console.log(`[AudioDiagnostics] ${type}`, data);
        logTransportEvent(`audio.${type}`, data);
        return { success: true };
    });
}
