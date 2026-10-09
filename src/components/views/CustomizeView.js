import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { unifiedPageStyles } from './sharedPageStyles.js';

export class CustomizeView extends LitElement {
    static styles = [
        unifiedPageStyles,
        css`
            .danger-surface {
                border-color: var(--danger);
            }

            .warning-callout {
                position: relative;
                margin-top: 4px;
                padding: 8px 12px;
                border: 1px solid var(--danger);
                border-radius: var(--radius-sm);
                color: var(--danger);
                font-size: var(--font-size-xs);
                line-height: 1.4;
                background: rgba(239, 68, 68, 0.06);
            }

            .warning-callout::before {
                content: '';
                position: absolute;
                top: -6px;
                left: 16px;
                width: 10px;
                height: 10px;
                background: var(--bg-surface);
                border-top: 1px solid var(--danger);
                border-left: 1px solid var(--danger);
                transform: rotate(45deg);
            }

            .toggle-row {
                display: flex;
                align-items: center;
                gap: var(--space-sm);
                padding: var(--space-sm);
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                background: var(--bg-elevated);
            }

            .toggle-input {
                width: 14px;
                height: 14px;
                accent-color: var(--text-primary);
                cursor: pointer;
            }

            .toggle-label {
                color: var(--text-primary);
                font-size: var(--font-size-sm);
                cursor: pointer;
                user-select: none;
            }

            .slider-wrap {
                display: flex;
                flex-direction: column;
                align-items: stretch;
                gap: var(--space-xs);
            }

            .slider-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: var(--space-sm);
            }

            .slider-value {
                font-family: var(--font-mono);
                font-size: var(--font-size-xs);
                color: var(--text-secondary);
                background: var(--bg-elevated);
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                padding: 2px 8px;
            }

            .slider-input {
                -webkit-appearance: none;
                appearance: none;
                width: 100%;
                height: 4px;
                border-radius: 2px;
                background: var(--border);
                outline: none;
                cursor: pointer;
            }

            .slider-input::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background: var(--text-primary);
                border: none;
            }

            .slider-input::-moz-range-thumb {
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background: var(--text-primary);
                border: none;
            }

            .keybind-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: var(--space-sm) 0;
                border-bottom: 1px solid var(--border);
            }

            .keybind-row:last-of-type {
                border-bottom: none;
            }

            .keybind-name {
                color: var(--text-secondary);
                font-size: var(--font-size-sm);
            }

            .keybind-input {
                width: 140px;
                text-align: center;
                font-family: var(--font-mono);
                font-size: var(--font-size-xs);
            }

            .danger-button {
                border: 1px solid var(--danger);
                color: var(--danger);
                background: transparent;
                border-radius: var(--radius-sm);
                padding: 9px 12px;
                font-size: var(--font-size-sm);
                cursor: pointer;
                transition: background var(--transition);
            }

            .danger-button:hover {
                background: rgba(241, 76, 76, 0.11);
            }

            .danger-button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .status {
                margin-top: var(--space-sm);
                padding: var(--space-sm);
                border-radius: var(--radius-sm);
                border: 1px solid var(--border);
                font-size: var(--font-size-xs);
            }

            .status.success {
                border-color: var(--success);
                color: var(--success);
            }

            .status.error {
                border-color: var(--danger);
                color: var(--danger);
            }
        `,
    ];

    static properties = {
        selectedProfile: { type: String },
        selectedLanguage: { type: String },
        selectedImageQuality: { type: String },
        layoutMode: { type: String },
        keybinds: { type: Object },
        googleSearchEnabled: { type: Boolean },
        backgroundTransparency: { type: Number },
        fontSize: { type: Number },
        theme: { type: String },
        onProfileChange: { type: Function },
        onLanguageChange: { type: Function },
        onImageQualityChange: { type: Function },
        onLayoutModeChange: { type: Function },
        isClearing: { type: Boolean },
        isRestoring: { type: Boolean },
        clearStatusMessage: { type: String },
        clearStatusType: { type: String },
    };

    constructor() {
        super();
        this.selectedProfile = 'interview';
        this.selectedLanguage = 'en-US';
        this.selectedImageQuality = 'medium';
        this.layoutMode = 'normal';
        this.keybinds = this.getDefaultKeybinds();
        this.onProfileChange = () => {};
        this.onLanguageChange = () => {};
        this.onImageQualityChange = () => {};
        this.onLayoutModeChange = () => {};
        this.googleSearchEnabled = true;
        this.isClearing = false;
        this.isRestoring = false;
        this.clearStatusMessage = '';
        this.clearStatusType = '';
        this.backgroundTransparency = 0.8;
        this.fontSize = 20;
        this.audioMode = 'speaker_only';
        this.customPrompt = '';
        this.theme = 'dark';
        this._loadFromStorage();
    }

    getThemes() {
        return cheatingDaddy.theme.getAll();
    }

    async _loadFromStorage() {
        try {
            const [prefs, keybinds] = await Promise.all([cheatingDaddy.storage.getPreferences(), cheatingDaddy.storage.getKeybinds()]);
            this.googleSearchEnabled = prefs.googleSearchEnabled ?? true;
            this.backgroundTransparency = prefs.backgroundTransparency ?? 0.8;
            this.fontSize = prefs.fontSize ?? 20;
            this.audioMode = prefs.audioMode ?? 'speaker_only';
            this.customPrompt = prefs.customPrompt ?? '';
            this.theme = prefs.theme ?? 'dark';
            if (keybinds) {
                this.keybinds = { ...this.getDefaultKeybinds(), ...keybinds };
            }
            this.updateBackgroundAppearance();
            this.updateFontSize();
            this.requestUpdate();
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    getProfiles() {
        return [
            { value: 'interview', name: '求职面试' },
            { value: 'sales', name: '销售通话' },
            { value: 'meeting', name: '商务会议' },
            { value: 'presentation', name: '演示汇报' },
            { value: 'negotiation', name: '商务谈判' },
            { value: 'exam', name: '考试助手' },
        ];
    }

    getLanguages() {
        return [
            { value: 'en-US', name: '英语（美国）' },
            { value: 'en-GB', name: '英语（英国）' },
            { value: 'en-AU', name: '英语（澳大利亚）' },
            { value: 'en-IN', name: '英语（印度）' },
            { value: 'de-DE', name: '德语（德国）' },
            { value: 'es-US', name: '西班牙语（美国）' },
            { value: 'es-ES', name: '西班牙语（西班牙）' },
            { value: 'fr-FR', name: '法语（法国）' },
            { value: 'fr-CA', name: '法语（加拿大）' },
            { value: 'hi-IN', name: '印地语（印度）' },
            { value: 'pt-BR', name: '葡萄牙语（巴西）' },
            { value: 'ar-XA', name: '阿拉伯语（通用）' },
            { value: 'id-ID', name: '印度尼西亚语（印度尼西亚）' },
            { value: 'it-IT', name: '意大利语（意大利）' },
            { value: 'ja-JP', name: '日语（日本）' },
            { value: 'tr-TR', name: '土耳其语（土耳其）' },
            { value: 'vi-VN', name: '越南语（越南）' },
            { value: 'bn-IN', name: '孟加拉语（印度）' },
            { value: 'gu-IN', name: '古吉拉特语（印度）' },
            { value: 'kn-IN', name: '卡纳达语（印度）' },
            { value: 'ml-IN', name: '马拉雅拉姆语（印度）' },
            { value: 'mr-IN', name: '马拉地语（印度）' },
            { value: 'ta-IN', name: '泰米尔语（印度）' },
            { value: 'te-IN', name: '泰卢固语（印度）' },
            { value: 'nl-NL', name: '荷兰语（荷兰）' },
            { value: 'ko-KR', name: '韩语（韩国）' },
            { value: 'cmn-CN', name: '中文普通话（中国）' },
            { value: 'pl-PL', name: '波兰语（波兰）' },
            { value: 'ru-RU', name: '俄语（俄罗斯）' },
            { value: 'th-TH', name: '泰语（泰国）' },
        ];
    }

    getDefaultKeybinds() {
        const isMac = cheatingDaddy.isMacOS || navigator.platform.includes('Mac');
        return {
            moveUp: isMac ? 'Alt+Up' : 'Ctrl+Up',
            moveDown: isMac ? 'Alt+Down' : 'Ctrl+Down',
            moveLeft: isMac ? 'Alt+Left' : 'Ctrl+Left',
            moveRight: isMac ? 'Alt+Right' : 'Ctrl+Right',
            toggleVisibility: isMac ? 'Cmd+\\' : 'Ctrl+\\',
            toggleClickThrough: isMac ? 'Cmd+M' : 'Ctrl+M',
            nextStep: isMac ? 'Cmd+Enter' : 'Ctrl+Enter',
            previousResponse: isMac ? 'Cmd+[' : 'Ctrl+[',
            nextResponse: isMac ? 'Cmd+]' : 'Ctrl+]',
            scrollUp: isMac ? 'Cmd+Shift+Up' : 'Ctrl+Shift+Up',
            scrollDown: isMac ? 'Cmd+Shift+Down' : 'Ctrl+Shift+Down',
        };
    }

    getKeybindActions() {
        return [
            { key: 'moveUp', name: '窗口上移', description: '向上移动应用窗口' },
            { key: 'moveDown', name: '窗口下移', description: '向下移动应用窗口' },
            { key: 'moveLeft', name: '窗口左移', description: '向左移动应用窗口' },
            { key: 'moveRight', name: '窗口右移', description: '向右移动应用窗口' },
            { key: 'toggleVisibility', name: '切换显示/隐藏', description: '显示或隐藏应用窗口' },
            { key: 'toggleClickThrough', name: '切换鼠标穿透', description: '启用或关闭鼠标穿透模式' },
            { key: 'nextStep', name: '询问下一步', description: '截取屏幕并询问下一步操作' },
            { key: 'previousResponse', name: '上一条回复', description: '切换到上一条 AI 回复' },
            { key: 'nextResponse', name: '下一条回复', description: '切换到下一条 AI 回复' },
            { key: 'scrollUp', name: '向上滚动回复', description: '向上滚动回复内容' },
            { key: 'scrollDown', name: '向下滚动回复', description: '向下滚动回复内容' },
        ];
    }

    async saveKeybinds() {
        await cheatingDaddy.storage.setKeybinds(this.keybinds);
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('update-keybinds', this.keybinds);
        }
    }

    handleProfileSelect(e) {
        this.selectedProfile = e.target.value;
        this.onProfileChange(this.selectedProfile);
    }

    handleLanguageSelect(e) {
        this.selectedLanguage = e.target.value;
        this.onLanguageChange(this.selectedLanguage);
    }

    handleImageQualitySelect(e) {
        this.selectedImageQuality = e.target.value;
        this.onImageQualityChange(this.selectedImageQuality);
    }

    handleLayoutModeSelect(e) {
        this.layoutMode = e.target.value;
        this.onLayoutModeChange(this.layoutMode);
    }

    async handleCustomPromptInput(e) {
        this.customPrompt = e.target.value;
        await cheatingDaddy.storage.updatePreference('customPrompt', this.customPrompt);
    }

    async handleAudioModeSelect(e) {
        this.audioMode = e.target.value;
        await cheatingDaddy.storage.updatePreference('audioMode', this.audioMode);
        this.requestUpdate();
    }

    async handleThemeChange(e) {
        this.theme = e.target.value;
        await cheatingDaddy.theme.save(this.theme);
        this.updateBackgroundAppearance();
        this.requestUpdate();
    }

    async handleGoogleSearchChange(e) {
        this.googleSearchEnabled = e.target.checked;
        await cheatingDaddy.storage.updatePreference('googleSearchEnabled', this.googleSearchEnabled);
        if (window.require) {
            try {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('update-google-search-setting', this.googleSearchEnabled);
            } catch (error) {
                console.error('Failed to notify main process:', error);
            }
        }
        this.requestUpdate();
    }

    async handleBackgroundTransparencyChange(e) {
        this.backgroundTransparency = parseFloat(e.target.value);
        await cheatingDaddy.storage.updatePreference('backgroundTransparency', this.backgroundTransparency);
        this.updateBackgroundAppearance();
        this.requestUpdate();
    }

    updateBackgroundAppearance() {
        const colors = cheatingDaddy.theme.get(this.theme);
        cheatingDaddy.theme.applyBackgrounds(colors.background, this.backgroundTransparency);
    }

    async handleFontSizeChange(e) {
        this.fontSize = parseInt(e.target.value, 10);
        await cheatingDaddy.storage.updatePreference('fontSize', this.fontSize);
        this.updateFontSize();
        this.requestUpdate();
    }

    updateFontSize() {
        document.documentElement.style.setProperty('--response-font-size', `${this.fontSize}px`);
    }

    handleKeybindChange(action, value) {
        this.keybinds = { ...this.keybinds, [action]: value };
        this.saveKeybinds();
        this.requestUpdate();
    }

    handleKeybindFocus(e) {
        e.target.placeholder = 'Press key combination...';
        e.target.select();
    }

    handleKeybindInput(e) {
        e.preventDefault();
        const modifiers = [];
        if (e.ctrlKey) modifiers.push('Ctrl');
        if (e.metaKey) modifiers.push('Cmd');
        if (e.altKey) modifiers.push('Alt');
        if (e.shiftKey) modifiers.push('Shift');
        let mainKey = e.key;

        switch (e.code) {
            case 'ArrowUp':
                mainKey = 'Up';
                break;
            case 'ArrowDown':
                mainKey = 'Down';
                break;
            case 'ArrowLeft':
                mainKey = 'Left';
                break;
            case 'ArrowRight':
                mainKey = 'Right';
                break;
            case 'Enter':
                mainKey = 'Enter';
                break;
            case 'Space':
                mainKey = 'Space';
                break;
            case 'Backslash':
                mainKey = '\\';
                break;
            default:
                if (e.key.length === 1) mainKey = e.key.toUpperCase();
                break;
        }

        if (['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) return;

        const action = e.target.dataset.action;
        const keybind = [...modifiers, mainKey].join('+');
        this.handleKeybindChange(action, keybind);
        e.target.value = keybind;
        e.target.blur();
    }

    async resetKeybinds() {
        this.keybinds = this.getDefaultKeybinds();
        await cheatingDaddy.storage.setKeybinds(null);
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('update-keybinds', this.keybinds);
        }
        this.requestUpdate();
    }

    async restoreAllSettings() {
        if (this.isRestoring) return;
        this.isRestoring = true;
        this.clearStatusMessage = '';
        this.clearStatusType = '';
        this.requestUpdate();
        try {
            // Restore all preferences to defaults
            const defaults = {
                customPrompt: '',
                selectedProfile: 'interview',
                selectedLanguage: 'en-US',
                selectedScreenshotInterval: '5',
                selectedImageQuality: 'medium',
                audioMode: 'speaker_only',
                fontSize: 20,
                backgroundTransparency: 0.8,
                googleSearchEnabled: false,
                theme: 'dark',
            };
            for (const [key, value] of Object.entries(defaults)) {
                await cheatingDaddy.storage.updatePreference(key, value);
            }

            // Restore keybinds
            this.keybinds = this.getDefaultKeybinds();
            await cheatingDaddy.storage.setKeybinds(null);
            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                ipcRenderer.send('update-keybinds', this.keybinds);
            }

            // Apply to local state
            this.selectedProfile = defaults.selectedProfile;
            this.selectedLanguage = defaults.selectedLanguage;
            this.selectedImageQuality = defaults.selectedImageQuality;
            this.audioMode = defaults.audioMode;
            this.fontSize = defaults.fontSize;
            this.backgroundTransparency = defaults.backgroundTransparency;
            this.googleSearchEnabled = defaults.googleSearchEnabled;
            this.customPrompt = defaults.customPrompt;
            this.theme = defaults.theme;

            // Notify parent callbacks
            this.onProfileChange(defaults.selectedProfile);
            this.onLanguageChange(defaults.selectedLanguage);
            this.onImageQualityChange(defaults.selectedImageQuality);

            // Apply visual changes
            this.updateBackgroundAppearance();
            this.updateFontSize();
            await cheatingDaddy.theme.save(defaults.theme);

            this.clearStatusMessage = '已恢复全部默认设置';
            this.clearStatusType = 'success';
        } catch (error) {
            console.error('Error restoring settings:', error);
            this.clearStatusMessage = `恢复设置失败：${error.message}`;
            this.clearStatusType = 'error';
        } finally {
            this.isRestoring = false;
            this.requestUpdate();
        }
    }

    async clearLocalData() {
        if (this.isClearing) return;
        this.isClearing = true;
        this.clearStatusMessage = '';
        this.clearStatusType = '';
        this.requestUpdate();
        try {
            await cheatingDaddy.storage.clearAll();
            this.clearStatusMessage = '已成功清除全部本地数据';
            this.clearStatusType = 'success';
            this.requestUpdate();
            setTimeout(() => {
                this.clearStatusMessage = '正在关闭应用……';
                this.requestUpdate();
                setTimeout(async () => {
                    if (window.require) {
                        const { ipcRenderer } = window.require('electron');
                        await ipcRenderer.invoke('quit-application');
                    }
                }, 1000);
            }, 2000);
        } catch (error) {
            console.error('Error clearing data:', error);
            this.clearStatusMessage = `清除数据失败：${error.message}`;
            this.clearStatusType = 'error';
        } finally {
            this.isClearing = false;
            this.requestUpdate();
        }
    }

    renderAudioSection() {
        return html`
            <section class="surface">
                <div class="surface-title">音频输入</div>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">音频模式</label>
                        <select class="control" .value=${this.audioMode} @change=${this.handleAudioModeSelect}>
                            <option value="speaker_only">仅扬声器（面试官）</option>
                            <option value="mic_only">仅麦克风（我）</option>
                            <option value="both">扬声器和麦克风</option>
                        </select>
                    </div>
                    ${this.audioMode !== 'speaker_only' ? html`
                        <div class="warning-callout">可能导致异常行为。请确认了解其作用后再修改。</div>
                    ` : ''}
                    <div class="form-group">
                        <label class="form-label">图片质量</label>
                        <select class="control" .value=${this.selectedImageQuality} @change=${this.handleImageQualitySelect}>
                            <option value="high">高</option>
                            <option value="medium">中</option>
                            <option value="low">低</option>
                        </select>
                    </div>
                </div>
            </section>
        `;
    }

    renderLanguageSection() {
        return html`
            <section class="surface">
                <div class="surface-title">语言</div>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">语音语言</label>
                        <select class="control" .value=${this.selectedLanguage} @change=${this.handleLanguageSelect}>
                            ${this.getLanguages().map(language => html`<option value=${language.value}>${language.name}</option>`)}
                        </select>
                    </div>
                </div>
            </section>
        `;
    }

    renderAppearanceSection() {
        return html`
            <section class="surface">
                <div class="surface-title">外观</div>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">主题</label>
                        <select class="control" .value=${this.theme} @change=${this.handleThemeChange}>
                            ${this.getThemes().map(theme => html`<option value=${theme.value}>${theme.name}</option>`)}
                        </select>
                    </div>
                    <div class="form-group slider-wrap">
                        <div class="slider-header">
                            <label class="form-label">背景透明度</label>
                            <span class="slider-value">${Math.round(this.backgroundTransparency * 100)}%</span>
                        </div>
                        <input
                            class="slider-input"
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            .value=${this.backgroundTransparency}
                            @input=${this.handleBackgroundTransparencyChange}
                        />
                    </div>
                    <div class="form-group slider-wrap">
                        <div class="slider-header">
                            <label class="form-label">回复字体大小</label>
                            <span class="slider-value">${this.fontSize}px</span>
                        </div>
                        <input
                            class="slider-input"
                            type="range"
                            min="12"
                            max="32"
                            step="1"
                            .value=${this.fontSize}
                            @input=${this.handleFontSizeChange}
                        />
                    </div>
                </div>
            </section>
        `;
    }

    renderKeyboardSection() {
        return html`
            <section class="surface">
                <div class="surface-title">键盘快捷键</div>
                ${this.getKeybindActions().map(action => html`
                    <div class="keybind-row">
                        <span class="keybind-name">${action.name}</span>
                        <input
                            type="text"
                            class="control keybind-input"
                            .value=${this.keybinds[action.key]}
                            data-action=${action.key}
                            @keydown=${this.handleKeybindInput}
                            @focus=${this.handleKeybindFocus}
                            readonly
                        />
                    </div>
                `)}
                <div style="margin-top: var(--space-sm);">
                    <button class="control" style="width:auto;padding:8px 10px;" @click=${this.resetKeybinds}>恢复默认</button>
                </div>
            </section>
        `;
    }

    renderPrivacySection() {
        return html`
            <section class="surface danger-surface">
                <div class="surface-title danger">隐私与数据</div>
                <div style="display:flex;gap:var(--space-sm);flex-wrap:wrap;">
                    <button class="danger-button" @click=${this.restoreAllSettings} ?disabled=${this.isRestoring}>
                        ${this.isRestoring ? '正在恢复……' : '恢复全部设置'}
                    </button>
                    <button class="danger-button" @click=${this.clearLocalData} ?disabled=${this.isClearing}>
                        ${this.isClearing ? '正在清除……' : '删除全部数据'}
                    </button>
                </div>
                ${this.clearStatusMessage ? html`
                    <div class="status ${this.clearStatusType === 'success' ? 'success' : 'error'}">${this.clearStatusMessage}</div>
                ` : ''}
            </section>
        `;
    }

    render() {
        return html`
            <div class="unified-page">
                <div class="unified-wrap">
                    <div class="page-title">设置</div>
                    ${this.renderAudioSection()}
                    ${this.renderLanguageSection()}
                    ${this.renderAppearanceSection()}
                    ${this.renderKeyboardSection()}
                    ${this.renderPrivacySection()}
                </div>
            </div>
        `;
    }
}

customElements.define('customize-view', CustomizeView);
