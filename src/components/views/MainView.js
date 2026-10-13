import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

const LOCAL_LLM_PRESETS = [
    { value: 'unsloth/Qwen3.5-0.8B-GGUF:Q4_K_M', label: 'Qwen 3.5 0.8B Q4 — 0.74 GB · 最快' },
    { value: 'unsloth/Qwen3.5-0.8B-GGUF:Q8_0', label: 'Qwen 3.5 0.8B Q8 — 1.02 GB' },
    { value: 'unsloth/Qwen3.5-2B-GGUF:Q4_K_M', label: 'Qwen 3.5 2B Q4 — 1.95 GB' },
    { value: 'unsloth/Qwen3.5-2B-GGUF:Q8_0', label: 'Qwen 3.5 2B Q8 — 2.68 GB' },
    { value: 'unsloth/Qwen3.5-4B-GGUF:Q4_K_M', label: 'Qwen 3.5 4B Q4 — 3.42 GB · 推荐' },
    { value: 'unsloth/Qwen3.5-4B-GGUF:Q8_0', label: 'Qwen 3.5 4B Q8 — 5.16 GB' },
    { value: 'unsloth/Qwen3.5-9B-GGUF:Q4_K_M', label: 'Qwen 3.5 9B Q4 — 6.60 GB' },
    { value: 'unsloth/Qwen3.5-9B-GGUF:Q8_0', label: 'Qwen 3.5 9B Q8 — 10.45 GB' },
    { value: 'unsloth/Qwen3.5-27B-GGUF:Q4_K_M', label: 'Qwen 3.5 27B Q4 — 17.67 GB' },
    { value: 'unsloth/Qwen3.5-35B-A3B-GGUF:Q4_K_M', label: 'Qwen 3.5 35B-A3B Q4 — 22.92 GB · 最大' },
];

export class MainView extends LitElement {
    static styles = css`
        * {
            font-family: var(--font);
            cursor: default;
            user-select: none;
            box-sizing: border-box;
        }

        :host {
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: var(--space-xl) var(--space-lg);
        }

        .form-wrapper {
            width: 100%;
            max-width: 420px;
            display: flex;
            flex-direction: column;
            gap: var(--space-md);
        }

        .page-title {
            font-size: var(--font-size-xl);
            font-weight: var(--font-weight-semibold);
            color: var(--text-primary);
            margin-bottom: var(--space-xs);
        }

        .page-title .mode-suffix {
            opacity: 0.5;
        }

        .page-subtitle {
            font-size: var(--font-size-sm);
            color: var(--text-muted);
            margin-bottom: var(--space-md);
        }

        /* ── Cloud promo card ── */

        .cloud-promo {
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 14px 16px;
            border-radius: var(--radius-md);
            border: 1px solid rgba(59, 130, 246, 0.45);
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(139, 92, 246, 0.09) 100%);
            cursor: pointer;
            transition:
                border-color 0.2s,
                background 0.2s;
        }

        .cloud-promo:hover {
            border-color: rgba(59, 130, 246, 0.65);
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.16) 0%, rgba(139, 92, 246, 0.12) 100%);
            box-shadow:
                0 0 20px rgba(59, 130, 246, 0.15),
                0 0 40px rgba(139, 92, 246, 0.08);
        }

        .cloud-promo-glow {
            position: absolute;
            top: -40%;
            right: -20%;
            width: 120px;
            height: 120px;
            background: radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%);
            pointer-events: none;
        }

        .cloud-promo-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .cloud-promo-title {
            font-size: var(--font-size-sm);
            font-weight: var(--font-weight-semibold);
            color: var(--text-primary);
        }

        .cloud-promo-arrow {
            color: var(--accent);
            font-size: 16px;
            transition: transform 0.2s;
        }

        .cloud-promo:hover .cloud-promo-arrow {
            transform: translateX(2px);
        }

        .cloud-promo-desc {
            font-size: var(--font-size-xs);
            color: var(--text-secondary);
            line-height: var(--line-height);
        }

        /* ── Form controls ── */

        .form-group {
            display: flex;
            flex-direction: column;
            gap: var(--space-xs);
        }

        .config-section {
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            background: var(--bg-surface);
            overflow: hidden;
        }

        .config-summary {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: var(--space-md);
            padding: 12px 14px;
            cursor: pointer;
            list-style: none;
        }

        .config-summary::-webkit-details-marker {
            display: none;
        }

        .config-summary-text {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .config-summary-title {
            font-size: var(--font-size-sm);
            font-weight: var(--font-weight-medium);
            color: var(--text-primary);
        }

        .config-summary-description {
            font-size: var(--font-size-xs);
            color: var(--text-muted);
        }

        .config-chevron {
            width: 16px;
            height: 16px;
            color: var(--text-muted);
            transition: transform var(--transition);
        }

        .config-section[open] .config-chevron {
            transform: rotate(180deg);
        }

        .config-content {
            display: flex;
            flex-direction: column;
            gap: var(--space-md);
            padding: 14px;
            border-top: 1px solid var(--border);
        }

        .config-note {
            padding: 10px 12px;
            border: 1px solid rgba(212, 160, 23, 0.28);
            border-radius: var(--radius-sm);
            background: rgba(212, 160, 23, 0.08);
            color: var(--text-secondary);
            font-size: var(--font-size-xs);
            line-height: var(--line-height);
        }

        .config-checkbox {
            display: flex;
            align-items: flex-start;
            gap: var(--space-sm);
            cursor: pointer;
        }

        .config-checkbox input {
            width: 16px;
            height: 16px;
            margin-top: 2px;
            padding: 0;
            accent-color: var(--accent);
            cursor: pointer;
        }

        .config-checkbox-text {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .form-label {
            font-size: var(--font-size-xs);
            font-weight: var(--font-weight-medium);
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        input,
        select,
        textarea {
            background: var(--bg-elevated);
            color: var(--text-primary);
            border: 1px solid var(--border);
            padding: 10px 12px;
            width: 100%;
            border-radius: var(--radius-sm);
            font-size: var(--font-size-sm);
            font-family: var(--font);
            transition:
                border-color var(--transition),
                box-shadow var(--transition);
        }

        input:hover:not(:focus),
        select:hover:not(:focus),
        textarea:hover:not(:focus) {
            border-color: var(--text-muted);
        }

        input:focus,
        select:focus,
        textarea:focus {
            outline: none;
            border-color: var(--accent);
            box-shadow: 0 0 0 1px var(--accent);
        }

        input::placeholder,
        textarea::placeholder {
            color: var(--text-muted);
        }

        input.error {
            border-color: var(--danger, #ef4444);
        }

        select {
            cursor: pointer;
            appearance: none;
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23999' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
            background-position: right 8px center;
            background-repeat: no-repeat;
            background-size: 14px;
            padding-right: 28px;
        }

        textarea {
            resize: vertical;
            min-height: 80px;
            line-height: var(--line-height);
        }

        .form-hint {
            font-size: var(--font-size-xs);
            color: var(--text-muted);
        }

        .form-hint a,
        .form-hint span.link {
            color: var(--accent);
            text-decoration: none;
            cursor: pointer;
        }

        .form-hint span.link:hover {
            text-decoration: underline;
        }

        .whisper-label-row {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .whisper-spinner {
            width: 12px;
            height: 12px;
            border: 2px solid var(--border);
            border-top-color: var(--accent);
            border-radius: 50%;
            animation: whisper-spin 0.8s linear infinite;
        }

        @keyframes whisper-spin {
            to {
                transform: rotate(360deg);
            }
        }

        /* ── Start button ── */

        .start-button {
            position: relative;
            overflow: hidden;
            background: #e8e8e8;
            color: #111111;
            border: none;
            padding: 12px var(--space-md);
            border-radius: var(--radius-sm);
            font-size: var(--font-size-base);
            font-weight: var(--font-weight-semibold);
            cursor: pointer;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: var(--space-sm);
        }

        .start-button canvas.btn-aurora {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            z-index: 0;
        }

        .start-button canvas.btn-dither {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            z-index: 1;
            opacity: 0.1;
            mix-blend-mode: overlay;
            pointer-events: none;
            image-rendering: pixelated;
        }

        .start-button .btn-label {
            position: relative;
            z-index: 2;
            display: flex;
            align-items: center;
            gap: var(--space-sm);
        }

        .start-button:hover {
            opacity: 0.9;
        }

        .start-button.disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .start-button.disabled:hover {
            opacity: 0.5;
        }

        .download-progress-fill {
            position: absolute;
            inset: 0 auto 0 0;
            z-index: 2;
            width: 0;
            background: rgba(17, 17, 17, 0.16);
            transition: width 0.2s ease;
            pointer-events: none;
        }

        .download-progress-fill.indeterminate {
            width: 38%;
            animation: download-progress-slide 1.2s ease-in-out infinite;
        }

        .download-controls {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: var(--space-md);
            margin-top: var(--space-xs);
            font-size: var(--font-size-xs);
            color: var(--text-muted);
        }

        .download-cancel {
            flex: none;
            padding: 0;
            border: none;
            background: none;
            color: var(--danger, #ef4444);
            font: inherit;
            cursor: pointer;
        }

        .download-cancel:hover {
            text-decoration: underline;
        }

        @keyframes download-progress-slide {
            from {
                transform: translateX(-105%);
            }
            to {
                transform: translateX(270%);
            }
        }

        .shortcut-hint {
            display: inline-flex;
            align-items: center;
            gap: 2px;
            opacity: 0.5;
            font-family: var(--font-mono);
        }

        /* ── Divider ── */

        .divider {
            display: flex;
            align-items: center;
            gap: var(--space-md);
            margin: var(--space-sm) 0;
        }

        .divider-line {
            flex: 1;
            height: 1px;
            background: var(--border);
        }

        .divider-text {
            font-size: var(--font-size-xs);
            color: var(--text-muted);
            text-transform: lowercase;
        }

        /* ── Mode switch links ── */

        .mode-links {
            display: flex;
            justify-content: center;
            gap: var(--space-lg);
        }

        .mode-link {
            font-size: var(--font-size-sm);
            color: var(--text-secondary);
            cursor: pointer;
            background: none;
            border: none;
            padding: 0;
            transition: color var(--transition);
        }

        .mode-link:hover {
            color: var(--text-primary);
        }

        /* ── Mode option cards ── */

        .mode-cards {
            display: flex;
            gap: var(--space-sm);
        }

        .mode-card {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 4px;
            padding: 12px 14px;
            border-radius: var(--radius-md);
            border: 1px solid var(--border);
            background: var(--bg-elevated);
            cursor: pointer;
            transition:
                border-color 0.2s,
                background 0.2s;
        }

        .mode-card:hover {
            border-color: var(--text-muted);
            background: var(--bg-hover);
        }

        .mode-card-title {
            font-size: var(--font-size-sm);
            font-weight: var(--font-weight-semibold);
            color: var(--text-primary);
        }

        .mode-card-desc {
            font-size: var(--font-size-xs);
            color: var(--text-muted);
            line-height: var(--line-height);
        }

        /* ── Title row with help ── */

        .title-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: var(--space-xs);
        }

        .title-row .page-title {
            margin-bottom: 0;
        }

        .help-btn {
            background: none;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            padding: 4px;
            border-radius: var(--radius-sm);
            transition: color 0.2s;
            display: flex;
            align-items: center;
        }

        .help-btn:hover {
            color: var(--text-secondary);
        }

        .help-btn * {
            pointer-events: none;
        }

        .help-dialog-backdrop {
            position: fixed;
            inset: 0;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: var(--space-lg);
            background: rgba(0, 0, 0, 0.62);
        }

        .help-dialog {
            width: min(680px, 100%);
            max-height: calc(100vh - 48px);
            display: flex;
            flex-direction: column;
            gap: var(--space-md);
            padding: var(--space-lg);
            overflow: hidden;
            background: var(--bg-surface);
            border: 1px solid var(--border-strong);
            border-radius: var(--radius-lg);
            color: var(--text-primary);
        }

        .help-dialog-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: var(--space-md);
        }

        .help-dialog-title {
            font-size: var(--font-size-lg);
            font-weight: var(--font-weight-semibold);
        }

        /* ── Help content ── */

        .help-content {
            display: flex;
            flex-direction: column;
            gap: var(--space-md);
            overflow-y: auto;
        }

        .help-section {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .help-section-title {
            font-size: var(--font-size-xs);
            font-weight: var(--font-weight-semibold);
            color: var(--text-primary);
        }

        .help-section-text {
            font-size: var(--font-size-xs);
            color: var(--text-secondary);
            line-height: var(--line-height);
        }

        .help-code {
            font-family: var(--font-mono);
            font-size: 11px;
            background: var(--bg-hover);
            padding: 6px 8px;
            border-radius: var(--radius-sm);
            color: var(--text-primary);
            display: block;
        }

        .help-link {
            color: var(--accent);
            cursor: pointer;
            text-decoration: none;
        }

        .help-link:hover {
            text-decoration: underline;
        }

        .help-models {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .help-model {
            font-size: var(--font-size-xs);
            color: var(--text-secondary);
            display: flex;
            justify-content: space-between;
        }

        .help-model-name {
            font-family: var(--font-mono);
            font-size: 11px;
            color: var(--text-primary);
        }

        .help-divider {
            border: none;
            border-top: 1px solid var(--border);
            margin: 0;
        }

        .help-cloud-btn {
            background: #e8e8e8;
            color: #111111;
            border: none;
            padding: 10px var(--space-md);
            border-radius: var(--radius-sm);
            font-size: var(--font-size-sm);
            font-family: var(--font);
            font-weight: var(--font-weight-semibold);
            cursor: pointer;
            width: 100%;
            transition: opacity 0.15s;
        }

        .help-cloud-btn:hover {
            opacity: 0.9;
        }

        .help-warn {
            font-size: var(--font-size-xs);
            color: var(--warning);
            line-height: var(--line-height);
        }
    `;

    static properties = {
        onStart: { type: Function },
        onExternalLink: { type: Function },
        selectedProfile: { type: String },
        onProfileChange: { type: Function },
        isInitializing: { type: Boolean },
        whisperDownloading: { type: Boolean },
        downloadProgress: { type: Object },
        onCancelDownload: { type: Function },
        // Internal state
        _mode: { state: true },
        _token: { state: true },
        _geminiKey: { state: true },
        _groqKey: { state: true },
        _deepseekKey: { state: true },
        _qwenKey: { state: true },
        _openaiKey: { state: true },
        _geminiLiveModel: { state: true },
        _groqModel: { state: true },
        _groqImageModel: { state: true },
        _deepseekModel: { state: true },
        _qwenModel: { state: true },
        _qwenOmniModel: { state: true },
        _qwenWorkspaceId: { state: true },
        _qwenVisionModel: { state: true },
        _disableGroqThinking: { state: true },
        _tokenError: { state: true },
        _keyError: { state: true },
        // Local AI state
        _localLlmModel: { state: true },
        _useCustomLocalLlmModel: { state: true },
        _whisperModel: { state: true },
        _showLocalHelp: { state: true },
    };

    constructor() {
        super();
        this.onStart = () => {};
        this.onExternalLink = () => {};
        this.selectedProfile = 'interview';
        this.onProfileChange = () => {};
        this.isInitializing = false;
        this.whisperDownloading = false;
        this.downloadProgress = { active: false, label: '', percentage: null };
        this.onCancelDownload = () => {};

        this._mode = 'byok';
        this._token = '';
        this._geminiKey = '';
        this._groqKey = '';
        this._deepseekKey = '';
        this._qwenKey = '';
        this._openaiKey = '';
        this._geminiLiveModel = 'gemini-3.1-flash-live-preview';
        this._groqModel = 'qwen/qwen3.6-27b';
        this._groqImageModel = 'qwen/qwen3.6-27b';
        this._deepseekModel = 'deepseek-flash';
        this._qwenModel = 'qwen-audio-3.1-realtime-plus';
        this._qwenOmniModel = 'qwen3.8-omni-flash-realtime';
        this._qwenWorkspaceId = '';
        this._qwenVisionModel = 'qwen3-vl-plus';
        this._disableGroqThinking = true;
        this._tokenError = false;
        this._keyError = false;
        this._showLocalHelp = false;
        this._localLlmModel = 'unsloth/Qwen3.5-4B-GGUF:Q4_K_M';
        this._useCustomLocalLlmModel = false;
        this._whisperModel = 'tiny';

        this._animId = null;
        this._time = 0;
        this._mouseX = -1;
        this._mouseY = -1;

        this.boundKeydownHandler = this._handleKeydown.bind(this);
        this._loadFromStorage();
    }

    async _loadFromStorage() {
        try {
            const [config, prefs, creds] = await Promise.all([
                cheatingDaddy.storage.getConfig(),
                cheatingDaddy.storage.getPreferences(),
                cheatingDaddy.storage.getCredentials().catch(() => ({})),
            ]);

            const storedMode = prefs.providerMode || 'qwen-omni-realtime';
            const visibleModes = new Set(['deepseek', 'qwen-realtime', 'qwen-omni-realtime']);
            this._mode = visibleModes.has(storedMode) ? storedMode : 'qwen-omni-realtime';

            if (storedMode !== this._mode) {
                await cheatingDaddy.storage.updatePreference('providerMode', this._mode);
            }

            // Load keys
            this._token = creds.cloudToken || '';
            this._geminiKey = (await cheatingDaddy.storage.getApiKey().catch(() => '')) || '';
            this._groqKey = (await cheatingDaddy.storage.getGroqApiKey().catch(() => '')) || '';
            this._deepseekKey = (await cheatingDaddy.storage.getDeepSeekApiKey().catch(() => '')) || '';
            this._qwenKey = (await cheatingDaddy.storage.getQwenRealtimeApiKey().catch(() => '')) || '';
            this._openaiKey = creds.openaiKey || '';
            this._geminiLiveModel = config.geminiLiveModel || 'gemini-3.1-flash-live-preview';
            this._groqModel = config.groqModel || 'qwen/qwen3.6-27b';
            this._groqImageModel = config.groqImageModel || 'qwen/qwen3.6-27b';
            this._deepseekModel = config.deepseekModel || 'deepseek-flash';
            this._qwenModel = config.qwenRealtimeModel || 'qwen-audio-3.1-realtime-plus';
            this._qwenOmniModel = config.qwenOmniRealtimeModel || 'qwen3.8-omni-flash-realtime';
            this._qwenWorkspaceId = config.qwenWorkspaceId || '';
            this._qwenVisionModel = config.qwenVisionModel || 'qwen3-vl-plus';
            this._disableGroqThinking = config.disableGroqThinking === true;

            // Load local AI settings
            this._localLlmModel = prefs.localLlmModel || 'unsloth/Qwen3.5-4B-GGUF:Q4_K_M';
            this._useCustomLocalLlmModel = !LOCAL_LLM_PRESETS.some(preset => preset.value === this._localLlmModel);
            this._whisperModel = 'tiny';

            this.requestUpdate();
        } catch (e) {
            console.error('Error loading MainView storage:', e);
        }
    }

    connectedCallback() {
        super.connectedCallback();
        document.addEventListener('keydown', this.boundKeydownHandler);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        document.removeEventListener('keydown', this.boundKeydownHandler);
        if (this._animId) cancelAnimationFrame(this._animId);
    }

    updated(changedProperties) {
        super.updated(changedProperties);
        if (changedProperties.has('_mode')) {
            // Stop old animation when switching modes
            if (this._animId) {
                cancelAnimationFrame(this._animId);
                this._animId = null;
            }
        }
    }

    _initButtonAurora() {
        const btn = this.shadowRoot.querySelector('.start-button');
        const aurora = this.shadowRoot.querySelector('canvas.btn-aurora');
        const dither = this.shadowRoot.querySelector('canvas.btn-dither');
        if (!aurora || !dither || !btn) return;

        // Mouse tracking
        this._mouseX = -1;
        this._mouseY = -1;
        btn.addEventListener('mousemove', e => {
            const rect = btn.getBoundingClientRect();
            this._mouseX = (e.clientX - rect.left) / rect.width;
            this._mouseY = (e.clientY - rect.top) / rect.height;
        });
        btn.addEventListener('mouseleave', () => {
            this._mouseX = -1;
            this._mouseY = -1;
        });

        // Dither
        const blockSize = 8;
        const cols = Math.ceil(aurora.offsetWidth / blockSize);
        const rows = Math.ceil(aurora.offsetHeight / blockSize);
        dither.width = cols;
        dither.height = rows;
        const dCtx = dither.getContext('2d');
        const img = dCtx.createImageData(cols, rows);
        for (let i = 0; i < img.data.length; i += 4) {
            const v = Math.random() > 0.5 ? 255 : 0;
            img.data[i] = v;
            img.data[i + 1] = v;
            img.data[i + 2] = v;
            img.data[i + 3] = 255;
        }
        dCtx.putImageData(img, 0, 0);

        // Aurora
        const ctx = aurora.getContext('2d');
        const scale = 0.4;
        aurora.width = Math.floor(aurora.offsetWidth * scale);
        aurora.height = Math.floor(aurora.offsetHeight * scale);

        const blobs = [
            { color: [120, 160, 230], x: 0.1, y: 0.3, vx: 0.25, vy: 0.2, phase: 0 },
            { color: [150, 120, 220], x: 0.8, y: 0.5, vx: -0.2, vy: 0.25, phase: 1.5 },
            { color: [200, 140, 210], x: 0.5, y: 0.6, vx: 0.18, vy: -0.22, phase: 3.0 },
            { color: [100, 190, 190], x: 0.3, y: 0.7, vx: 0.3, vy: 0.15, phase: 4.5 },
            { color: [220, 170, 130], x: 0.7, y: 0.4, vx: -0.22, vy: -0.25, phase: 6.0 },
        ];

        const draw = () => {
            this._time += 0.008;
            const w = aurora.width;
            const h = aurora.height;
            const maxDim = Math.max(w, h);

            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, w, h);

            const hovering = this._mouseX >= 0;

            for (const blob of blobs) {
                const t = this._time;
                const cx = (blob.x + Math.sin(t * blob.vx + blob.phase) * 0.4) * w;
                const cy = (blob.y + Math.cos(t * blob.vy + blob.phase * 0.7) * 0.4) * h;
                const r = maxDim * 0.45;

                let boost = 1;
                if (hovering) {
                    const dx = cx / w - this._mouseX;
                    const dy = cy / h - this._mouseY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    boost = 1 + 2.5 * Math.max(0, 1 - dist / 0.6);
                }

                const a0 = Math.min(1, 0.18 * boost);
                const a1 = Math.min(1, 0.08 * boost);
                const a2 = Math.min(1, 0.02 * boost);

                const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
                grad.addColorStop(0, `rgba(${blob.color[0]}, ${blob.color[1]}, ${blob.color[2]}, ${a0})`);
                grad.addColorStop(0.3, `rgba(${blob.color[0]}, ${blob.color[1]}, ${blob.color[2]}, ${a1})`);
                grad.addColorStop(0.6, `rgba(${blob.color[0]}, ${blob.color[1]}, ${blob.color[2]}, ${a2})`);
                grad.addColorStop(1, `rgba(${blob.color[0]}, ${blob.color[1]}, ${blob.color[2]}, 0)`);
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, w, h);
            }

            this._animId = requestAnimationFrame(draw);
        };

        draw();
    }

    _handleKeydown(e) {
        if (e.key === 'Escape' && this._showLocalHelp) {
            this._closeLocalHelp();
            return;
        }

        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        if ((isMac ? e.metaKey : e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            this._handleStart();
        }
    }

    // ── Persistence ──

    async _saveMode(mode) {
        this._mode = mode;
        this._tokenError = false;
        this._keyError = false;
        await cheatingDaddy.storage.updatePreference('providerMode', mode);
        this.requestUpdate();
    }

    async _saveToken(val) {
        this._token = val;
        this._tokenError = false;
        try {
            const creds = await cheatingDaddy.storage.getCredentials().catch(() => ({}));
            await cheatingDaddy.storage.setCredentials({ ...creds, cloudToken: val });
        } catch (e) {}
        this.requestUpdate();
    }

    async _saveGeminiKey(val) {
        this._geminiKey = val;
        this._keyError = false;
        await cheatingDaddy.storage.setApiKey(val);
        this.requestUpdate();
    }

    async _saveGroqKey(val) {
        this._groqKey = val;
        await cheatingDaddy.storage.setGroqApiKey(val);
        this.requestUpdate();
    }

    async _saveDeepSeekKey(val) {
        this._deepseekKey = val;
        this._keyError = false;
        await cheatingDaddy.storage.setDeepSeekApiKey(val);
        this.requestUpdate();
    }

    async _saveQwenKey(val) {
        this._qwenKey = val;
        this._keyError = false;
        await cheatingDaddy.storage.setQwenRealtimeApiKey(val);
        this.requestUpdate();
    }

    async _saveGeminiLiveModel(val) {
        this._geminiLiveModel = val;
        await cheatingDaddy.storage.updateConfig('geminiLiveModel', val);
        this.requestUpdate();
    }

    async _saveGroqModel(val) {
        this._groqModel = val;
        await cheatingDaddy.storage.updateConfig('groqModel', val);
        this.requestUpdate();
    }

    async _saveGroqImageModel(val) {
        this._groqImageModel = val;
        await cheatingDaddy.storage.updateConfig('groqImageModel', val);
        this.requestUpdate();
    }

    async _saveDeepSeekModel(val) {
        this._deepseekModel = val;
        await cheatingDaddy.storage.updateConfig('deepseekModel', val);
        this.requestUpdate();
    }

    async _saveQwenModel(val) {
        this._qwenModel = val;
        await cheatingDaddy.storage.updateConfig('qwenRealtimeModel', val);
        this.requestUpdate();
    }

    async _saveQwenOmniModel(val) {
        this._qwenOmniModel = val;
        await cheatingDaddy.storage.updateConfig('qwenOmniRealtimeModel', val);
        this.requestUpdate();
    }

    async _saveQwenWorkspaceId(val) {
        this._qwenWorkspaceId = val;
        await cheatingDaddy.storage.updateConfig('qwenWorkspaceId', val);
        this._keyError = false;
        this.requestUpdate();
    }

    async _saveQwenVisionModel(val) {
        this._qwenVisionModel = val;
        await cheatingDaddy.storage.updateConfig('qwenVisionModel', val);
        this.requestUpdate();
    }

    async _saveDisableGroqThinking(disabled) {
        this._disableGroqThinking = disabled;
        await cheatingDaddy.storage.updateConfig('disableGroqThinking', disabled);
        this.requestUpdate();
    }

    async _saveOpenaiKey(val) {
        this._openaiKey = val;
        try {
            const creds = await cheatingDaddy.storage.getCredentials().catch(() => ({}));
            await cheatingDaddy.storage.setCredentials({ ...creds, openaiKey: val });
        } catch (e) {}
        this.requestUpdate();
    }

    async _saveLocalLlmModel(val) {
        this._localLlmModel = val;
        await cheatingDaddy.storage.updatePreference('localLlmModel', val);
        this.requestUpdate();
    }

    async _selectLocalLlmModel(value) {
        if (value === 'custom') {
            this._useCustomLocalLlmModel = true;
            this.requestUpdate();
            return;
        }

        this._useCustomLocalLlmModel = false;
        await this._saveLocalLlmModel(value);
    }

    async _saveWhisperModel(val) {
        this._whisperModel = val;
        await cheatingDaddy.storage.updatePreference('whisperModel', val);
        this.requestUpdate();
    }

    _handleProfileChange(e) {
        this.onProfileChange(e.target.value);
    }

    _openLocalHelp() {
        this._showLocalHelp = true;
    }

    _closeLocalHelp() {
        this._showLocalHelp = false;
    }

    _handleHelpDialogClick(e) {
        e.stopPropagation();
    }

    // ── Start ──

    _handleStart() {
        if (this.isInitializing || this.downloadProgress.active) return;

        if (this._mode === 'byok') {
            if (!this._geminiKey.trim()) {
                this._keyError = true;
                this.requestUpdate();
                return;
            }
        } else if (this._mode === 'deepseek') {
            if (!this._deepseekKey.trim()) {
                this._keyError = true;
                this.requestUpdate();
                return;
            }
        } else if (this._mode === 'qwen-realtime') {
            if (!this._qwenKey.trim()) {
                this._keyError = true;
                this.requestUpdate();
                return;
            }
        } else if (this._mode === 'qwen-omni-realtime') {
            if (!this._qwenKey.trim() || !this._qwenWorkspaceId.trim()) {
                this._keyError = true;
                this.requestUpdate();
                return;
            }
        } else if (this._mode === 'local') {
            if (!this._localLlmModel.trim()) {
                return;
            }
        }

        this.onStart();
    }

    triggerApiKeyError() {
        this._keyError = this._mode !== 'local';
        this.requestUpdate();
        setTimeout(() => {
            this._tokenError = false;
            this._keyError = false;
            this.requestUpdate();
        }, 2000);
    }

    // ── Render helpers ──

    _renderStartButton() {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const isDownloading = (this._mode === 'local' || this._mode === 'deepseek') && this.downloadProgress.active;
        const percentage = this.downloadProgress.percentage;
        const hasPercentage = Number.isFinite(percentage);

        const cmdIcon = html`<svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path
                d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"
            />
        </svg>`;
        const ctrlIcon = html`<svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path d="M6 15l6-6 6 6" />
        </svg>`;
        const enterIcon = html`<svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path d="M9 10l-5 5 5 5" />
            <path d="M20 4v7a4 4 0 0 1-4 4H4" />
        </svg>`;

        return html`
            <button
                class="start-button ${this.isInitializing || isDownloading ? 'disabled' : ''}"
                ?disabled=${this.isInitializing || isDownloading}
                @click=${() => this._handleStart()}
            >
                <canvas class="btn-aurora"></canvas>
                <canvas class="btn-dither"></canvas>
                ${
                    isDownloading
                        ? html`<span
                              class="download-progress-fill ${hasPercentage ? '' : 'indeterminate'}"
                              style=${hasPercentage ? `width: ${percentage}%` : ''}
                          ></span>`
                        : ''
                }
                <span class="btn-label">
                    ${isDownloading ? (hasPercentage ? `${percentage}%` : '准备中……') : '开始会话'}
                    ${isDownloading ? '' : html`<span class="shortcut-hint">${isMac ? cmdIcon : ctrlIcon}${enterIcon}</span>`}
                </span>
            </button>
            ${
                isDownloading
                    ? html`
                          <div class="download-controls">
                              <span>正在下载：${this.downloadProgress.label || '本地 AI 文件'}</span>
                              <button class="download-cancel" @click=${() => this.onCancelDownload()}>取消</button>
                          </div>
                      `
                    : ''
            }
        `;
    }

    _renderDivider() {
        return html`
            <div class="divider">
                <div class="divider-line"></div>
                <span class="divider-text">or</span>
                <div class="divider-line"></div>
            </div>
        `;
    }

    // ── Cloud mode ──
    // Cloud UI intentionally disabled. Backend cloud wiring is still present in
    // the codebase, but the renderer no longer exposes this setup path.

    // ── BYOK mode ──

    _renderConfigChevron() {
        return html`
            <svg class="config-chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="m5 7.5 5 5 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
        `;
    }

    _renderByokMode() {
        return html`
            <details class="config-section">
                <summary class="config-summary">
                    <span class="config-summary-text">
                        <span class="config-summary-title">语音转写</span>
                        <span class="config-summary-description">Gemini 实时连接</span>
                    </span>
                    ${this._renderConfigChevron()}
                </summary>
                <div class="config-content">
                    <div class="form-group">
                        <label class="form-label">Gemini API 密钥</label>
                        <input
                            type="password"
                            placeholder="必填"
                            .value=${this._geminiKey}
                            @input=${e => this._saveGeminiKey(e.target.value)}
                            class=${this._keyError ? 'error' : ''}
                        />
                        <div class="form-hint">
                            <span class="link" @click=${() => this.onExternalLink('https://aistudio.google.com/apikey')}>获取 Gemini 密钥</span>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Gemini 实时模型</label>
                        <input type="text" .value=${this._geminiLiveModel} @input=${e => this._saveGeminiLiveModel(e.target.value)} />
                    </div>
                </div>
            </details>

            <details class="config-section">
                <summary class="config-summary">
                    <span class="config-summary-text">
                        <span class="config-summary-title">AI 回复</span>
                        <span class="config-summary-description">Groq 密钥和回复模型</span>
                    </span>
                    ${this._renderConfigChevron()}
                </summary>
                <div class="config-content">
                    <div class="form-group">
                        <label class="form-label">Groq API 密钥</label>
                        <input type="password" placeholder="可选" .value=${this._groqKey} @input=${e => this._saveGroqKey(e.target.value)} />
                        <div class="form-hint">
                            <span class="link" @click=${() => this.onExternalLink('https://console.groq.com/keys')}>获取 Groq 密钥</span>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Groq 模型</label>
                        <input type="text" .value=${this._groqModel} @input=${e => this._saveGroqModel(e.target.value)} />
                    </div>

                    <div class="form-group">
                        <label class="form-label">Groq 图片模型</label>
                        <input type="text" .value=${this._groqImageModel} @input=${e => this._saveGroqImageModel(e.target.value)} />
                    </div>

                    <label class="config-checkbox">
                        <input
                            type="checkbox"
                            .checked=${this._disableGroqThinking}
                            @change=${e => this._saveDisableGroqThinking(e.target.checked)}
                        />
                        <span class="config-checkbox-text">
                            <span class="config-summary-title">关闭思考</span>
                            <span class="config-summary-description">减少内部推理以获得更快回复</span>
                        </span>
                    </label>

                    <div class="config-note">如果没有填写 Groq API 密钥，将使用 Gemini Live 回复，回答质量可能有所不同。</div>
                </div>
            </details>

            ${this._renderStartButton()} ${this._renderDivider()}

            <!-- Cloud promo intentionally removed from the active UI. -->

            <div class="mode-links">
                <button class="mode-link" @click=${() => this._saveMode('qwen-omni-realtime')}>使用 qwen3.8-omni-flash-realtime（稍微慢一点，但更聪明）</button>
                <button class="mode-link" @click=${() => this._saveMode('qwen-realtime')}>使用 qwen-audio-3.1-realtime-plus（更快，但质量稍低）</button>
                <button class="mode-link" @click=${() => this._saveMode('deepseek')}>使用 DeepSeek Flash</button>
            </div>
        `;
    }

    // ── Qwen realtime mode ──

    _renderQwenRealtimeMode() {
        return html`
            <details class="config-section" open>
                <summary class="config-summary">
                    <span class="config-summary-text">
                        <span class="config-summary-title">qwen-audio-3.1-realtime-plus</span>
                        <span class="config-summary-description">更快，但质量稍低；官方实时语音理解 + 纯文本回答</span>
                    </span>
                    ${this._renderConfigChevron()}
                </summary>
                <div class="config-content">
                    <div class="form-group">
                        <label class="form-label">Qwen API 密钥</label>
                        <input
                            type="password"
                            placeholder="必填"
                            .value=${this._qwenKey}
                            @input=${e => this._saveQwenKey(e.target.value)}
                            class=${this._keyError ? 'error' : ''}
                        />
                        <div class="form-hint">
                            <span class="link" @click=${() => this.onExternalLink('https://bailian.console.aliyun.com/')}>获取百炼密钥</span>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">实时模型</label>
                        <input type="text" .value=${this._qwenModel} @input=${e => this._saveQwenModel(e.target.value)} />
                        <div class="form-hint">更快，但质量稍低。输入音频由官方实时接口转写，回答只返回文本。</div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">截图识图模型</label>
                        <input type="text" .value=${this._qwenVisionModel} @input=${e => this._saveQwenVisionModel(e.target.value)} />
                        <div class="form-hint">默认使用 qwen3-vl-plus；截图通过独立视觉接口分析，思考模式开启。</div>
                    </div>
                </div>
            </details>

            ${this._renderStartButton()} ${this._renderDivider()}

            <div class="mode-links">
                <button class="mode-link" @click=${() => this._saveMode('qwen-omni-realtime')}>使用 qwen3.8-omni-flash-realtime（稍微慢一点，但更聪明）</button>
                <button class="mode-link" @click=${() => this._saveMode('deepseek')}>使用 DeepSeek Flash</button>
            </div>
        `;
    }

    // ── Qwen Omni realtime mode ──

    _renderQwenOmniRealtimeMode() {
        return html`
            <details class="config-section" open>
                <summary class="config-summary">
                    <span class="config-summary-text">
                        <span class="config-summary-title">qwen3.8-omni-flash-realtime</span>
                        <span class="config-summary-description">稍微慢一点，但更聪明；实时音频理解 + 高质量文本回答</span>
                    </span>
                    ${this._renderConfigChevron()}
                </summary>
                <div class="config-content">
                    <div class="form-group">
                        <label class="form-label">Qwen API 密钥</label>
                        <input
                            type="password"
                            placeholder="必填"
                            .value=${this._qwenKey}
                            @input=${e => this._saveQwenKey(e.target.value)}
                            class=${this._keyError ? 'error' : ''}
                        />
                        <div class="form-hint">
                            <span class="link" @click=${() => this.onExternalLink('https://bailian.console.aliyun.com/')}>获取百炼密钥</span>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Workspace ID</label>
                        <input
                            type="text"
                            placeholder="必填，例如 ws-xxxxxxxx"
                            .value=${this._qwenWorkspaceId}
                            @input=${e => this._saveQwenWorkspaceId(e.target.value)}
                            class=${this._keyError && !this._qwenWorkspaceId.trim() ? 'error' : ''}
                        />
                        <div class="form-hint">需要与 API 密钥同地域的百炼 Workspace ID，用于连接 Omni 实时接口。</div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">实时模型</label>
                        <input type="text" .value=${this._qwenOmniModel} @input=${e => this._saveQwenOmniModel(e.target.value)} />
                        <div class="form-hint">稍微慢一点，但更聪明。语音由官方实时模型理解，回答只返回文本。</div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">截图识图模型</label>
                        <input type="text" .value=${this._qwenVisionModel} @input=${e => this._saveQwenVisionModel(e.target.value)} />
                        <div class="form-hint">默认使用 qwen3-vl-plus；截图识图继续走独立视觉接口，不改变实时音频链路。</div>
                    </div>
                </div>
            </details>

            ${this._renderStartButton()} ${this._renderDivider()}

            <div class="mode-links">
                <button class="mode-link" @click=${() => this._saveMode('qwen-realtime')}>使用 qwen-audio-3.1-realtime-plus（更快，但质量稍低）</button>
                <button class="mode-link" @click=${() => this._saveMode('deepseek')}>使用 DeepSeek Flash</button>
            </div>
        `;
    }

    // ── DeepSeek mode ──

    _renderDeepSeekMode() {
        return html`
            <details class="config-section" open>
                <summary class="config-summary">
                    <span class="config-summary-text">
                        <span class="config-summary-title">DeepSeek</span>
                        <span class="config-summary-description">线上回复模型 + 本地 Whisper 转写</span>
                    </span>
                    ${this._renderConfigChevron()}
                </summary>
                <div class="config-content">
                    <div class="form-group">
                        <label class="form-label">DeepSeek API 密钥</label>
                        <input
                            type="password"
                            placeholder="必填"
                            .value=${this._deepseekKey}
                            @input=${e => this._saveDeepSeekKey(e.target.value)}
                            class=${this._keyError ? 'error' : ''}
                        />
                        <div class="form-hint">
                            <span class="link" @click=${() => this.onExternalLink('https://platform.deepseek.com/api_keys')}>获取 DeepSeek 密钥</span>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">回复模型</label>
                        <input type="text" .value=${this._deepseekModel} @input=${e => this._saveDeepSeekModel(e.target.value)} />
                        <div class="form-hint">默认使用 deepseek-flash。音频留在本地转写，文字和截图发送给 DeepSeek。</div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Whisper 模型</label>
                        <select .value=${this._whisperModel} @change=${e => this._saveWhisperModel(e.target.value)}>
                            <option value="tiny" ?selected=${this._whisperModel === 'tiny'}>Tiny 多语言（75 MB，支持中文）</option>
                        </select>
                        <div class="form-hint">语音会在本机使用中文多语言 Tiny 模型转写。</div>
                    </div>
                </div>
            </details>

            ${this._renderStartButton()} ${this._renderDivider()}

            <div class="mode-links">
                <button class="mode-link" @click=${() => this._saveMode('qwen-omni-realtime')}>使用 qwen3.8-omni-flash-realtime（稍微慢一点，但更聪明）</button>
                <button class="mode-link" @click=${() => this._saveMode('qwen-realtime')}>使用 qwen-audio-3.1-realtime-plus（更快，但质量稍低）</button>
            </div>
        `;
    }

    // ── Local AI mode ──

    _renderLocalMode() {
        return html`
            <details class="config-section">
                <summary class="config-summary">
                    <span class="config-summary-text">
                        <span class="config-summary-title">语言模型</span>
                        <span class="config-summary-description">本地 GGUF 模型</span>
                    </span>
                    ${this._renderConfigChevron()}
                </summary>
                <div class="config-content">
                    <div class="form-group">
                        <label class="form-label">模型</label>
                        <select
                            .value=${this._useCustomLocalLlmModel ? 'custom' : this._localLlmModel}
                            @change=${event => this._selectLocalLlmModel(event.target.value)}
                        >
                            ${LOCAL_LLM_PRESETS.map(preset => html`<option value=${preset.value}>${preset.label}</option>`)}
                            <option value="custom">自定义 Hugging Face 模型或本地 GGUF……</option>
                        </select>
                        ${
                            this._useCustomLocalLlmModel
                                ? html`
                                      <input
                                          type="text"
                                          placeholder="owner/repository:quant or /absolute/model.gguf"
                                          .value=${this._localLlmModel}
                                          @input=${event => this._saveLocalLlmModel(event.target.value)}
                                      />
                                  `
                                : ''
                        }
                        <div class="form-hint">大小包含视觉模型。Q4 占用更少内存，Q8 保留更高质量。</div>
                    </div>
                </div>
            </details>

            <details class="config-section">
                <summary class="config-summary">
                    <span class="config-summary-text">
                        <span class="config-summary-title">语音转写</span>
                        <span class="config-summary-description">Whisper 语音转文字模型</span>
                    </span>
                    ${this._renderConfigChevron()}
                </summary>
                <div class="config-content">
                    <div class="form-group">
                        <div class="whisper-label-row">
                            <label class="form-label">Whisper 模型</label>
                            ${this.whisperDownloading ? html`<div class="whisper-spinner"></div>` : ''}
                        </div>
                        <select .value=${this._whisperModel} @change=${e => this._saveWhisperModel(e.target.value)}>
                            <option value="tiny" ?selected=${this._whisperModel === 'tiny'}>Tiny 多语言（75 MB，支持中文）</option>
                        </select>
                        <div class="form-hint">${this.whisperDownloading ? '正在下载模型……' : '首次使用时自动下载'}</div>
                    </div>
                </div>
            </details>

            ${this._renderStartButton()} ${this._renderDivider()}

            <!-- Cloud promo intentionally removed from the active UI. -->

            <div class="mode-links">
                <button class="mode-link" @click=${() => this._saveMode('qwen-omni-realtime')}>使用 qwen3.8-omni-flash-realtime（稍微慢一点，但更聪明）</button>
                <button class="mode-link" @click=${() => this._saveMode('qwen-realtime')}>使用 qwen-audio-3.1-realtime-plus（更快，但质量稍低）</button>
                <button class="mode-link" @click=${() => this._saveMode('deepseek')}>使用 DeepSeek Flash</button>
            </div>
        `;
    }

    // ── Main render ──

    render() {
        const helpIcon = html`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
                <path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0m9 5v.01" />
                <path d="M12 13.5a1.5 1.5 0 0 1 1-1.5a2.6 2.6 0 1 0-3-4" />
            </g>
        </svg>`;
        const closeIcon = html`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 6L6 18M6 6l12 12" />
        </svg>`;

        return html`
            <div class="form-wrapper">
                ${
                    this._mode === 'local' || this._mode === 'deepseek' || this._mode === 'qwen-realtime' || this._mode === 'qwen-omni-realtime'
                        ? html`
                              <div class="title-row">
                                  <div class="page-title">
                                      AI面试助手
                                      <span class="mode-suffix"
                                          >${this._mode === 'deepseek'
                                              ? 'DeepSeek'
                                              : this._mode === 'qwen-omni-realtime'
                                                ? 'qwen3.8-omni-flash-realtime'
                                                : this._mode === 'qwen-realtime'
                                                  ? 'qwen-audio-3.1-realtime-plus'
                                                  : '本地 AI'}</span
                                      >
                                  </div>
                                  ${this._mode === 'local' ? html`<button class="help-btn" @click=${this._openLocalHelp} aria-label="打开本地 AI 帮助">${helpIcon}</button>` : ''}
                              </div>
                          `
                        : html` <div class="page-title">${html`AI面试助手 <span class="mode-suffix">BYOK</span>`}</div> `
                }
                <div class="page-subtitle">
                    ${
                        this._mode === 'byok'
                            ? '使用你自己的 API 密钥'
                            : this._mode === 'deepseek'
                              ? 'DeepSeek 负责回复，本地负责语音转写'
                              : this._mode === 'qwen-omni-realtime'
                                ? 'qwen3.8-omni-flash-realtime：稍微慢一点，但更聪明'
                                : this._mode === 'qwen-realtime'
                                  ? 'qwen-audio-3.1-realtime-plus：更快，但质量稍低'
                                  : '在本机运行模型'
                    }
                </div>

                <!-- Cloud mode render branch intentionally disabled. -->
                ${this._mode === 'byok' ? this._renderByokMode() : ''}
                ${this._mode === 'qwen-omni-realtime' ? this._renderQwenOmniRealtimeMode() : ''}
                ${this._mode === 'qwen-realtime' ? this._renderQwenRealtimeMode() : ''}
                ${this._mode === 'deepseek' ? this._renderDeepSeekMode() : ''} ${this._mode === 'local' ? this._renderLocalMode() : ''}
            </div>
            ${this._mode === 'local' && this._showLocalHelp ? this._renderLocalHelp(closeIcon) : ''}
        `;
    }

    _renderLocalHelp(closeIcon) {
        return html`
            <div class="help-dialog-backdrop" @click=${this._closeLocalHelp}>
                <section class="help-dialog" role="dialog" aria-modal="true" aria-labelledby="local-help-title" @click=${this._handleHelpDialogClick}>
                    <div class="help-dialog-header">
                        <div id="local-help-title" class="help-dialog-title">本地 AI 设置</div>
                        <button class="help-btn" @click=${this._closeLocalHelp} aria-label="关闭本地 AI 帮助">${closeIcon}</button>
                    </div>

                    <div class="help-content">
                        <div class="help-section">
                            <div class="help-section-title">原生本地 AI</div>
                            <div class="help-section-text">
                                AI面试助手直接运行 llama.cpp 和 whisper.cpp。所有数据都留在本机，不需要外部 AI 服务或安装 Ollama。
                            </div>
                        </div>

                        <div class="help-section">
                            <div class="help-section-title">自动配置</div>
                            <div class="help-section-text">
                                首次使用时会自动下载并校验原生运行器、选定的 Whisper 模型和语言模型，并存放在本地数据目录中。
                            </div>
                        </div>

                        <div class="help-section">
                            <div class="help-section-title">默认模型</div>
                            <div class="help-models">
                                <div class="help-model">
                                    <span class="help-model-name">Qwen3.5 4B Q4_K_M</span><span>约 2.7 GB — 质量和速度均衡</span>
                                </div>
                            </div>
                        </div>

                        <div class="help-section">
                            <div class="help-section-title">Whisper</div>
                            <div class="help-section-text">选定的 whisper.cpp 模型只需自动下载一次，之后会保存在数据目录中。</div>
                        </div>

                        <hr class="help-divider" />

                        <div class="help-section">
                            <div class="help-section-title">电脑卡顿或变慢？</div>
                            <div class="help-section-text">
                                本地运行模型会占用较多内存和 CPU。如果电脑变慢或卡顿，通常是语言模型负载较高。需要使用线上模型时，可以切换回 API
                                模式。
                            </div>
                        </div>

                        <button
                            class="help-cloud-btn"
                            @click=${() => {
                                this._closeLocalHelp();
                                this._saveMode('byok');
                            }}
                        >
                            切换到 API 模式
                        </button>
                    </div>
                </section>
            </div>
        `;
    }
}

customElements.define('main-view', MainView);
