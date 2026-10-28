import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';

const RESPONSE_PAGE_SIZE = 3;

export class AssistantView extends LitElement {
    static styles = css`
        :host {
            height: 100%;
            display: flex;
            flex-direction: column;
        }

        * {
            font-family: var(--font);
            cursor: default;
        }

        /* ── Response area ── */

        .response-container {
            flex: 1;
            overflow-y: auto;
            font-size: var(--response-font-size, 15px);
            line-height: var(--line-height);
            background: var(--bg-app);
            padding: var(--space-sm) var(--space-md);
            scroll-behavior: smooth;
            user-select: text;
            cursor: text;
            color: var(--text-primary);
        }

        .response-container * {
            user-select: text;
            cursor: text;
        }

        .response-container a {
            cursor: pointer;
        }

        .response-container [data-word] {
            display: inline-block;
        }

        .response-item {
            padding: var(--space-sm) 0 var(--space-md);
            border-bottom: 1px solid var(--border);
        }

        .response-item:last-child {
            border-bottom: none;
        }

        .response-item-label {
            margin-bottom: var(--space-xs);
            color: var(--text-muted);
            font-size: var(--font-size-xs);
        }

        /* ── Markdown ── */

        .response-container h1,
        .response-container h2,
        .response-container h3,
        .response-container h4,
        .response-container h5,
        .response-container h6 {
            margin: 1em 0 0.5em 0;
            color: var(--text-primary);
            font-weight: var(--font-weight-semibold);
        }

        .response-container h1 {
            font-size: 1.5em;
        }
        .response-container h2 {
            font-size: 1.3em;
        }
        .response-container h3 {
            font-size: 1.15em;
        }
        .response-container h4 {
            font-size: 1.05em;
        }
        .response-container h5,
        .response-container h6 {
            font-size: 1em;
        }

        .response-container p {
            margin: 0.6em 0;
            color: var(--text-primary);
        }

        .response-container ul,
        .response-container ol {
            margin: 0.6em 0;
            padding-left: 1.5em;
            color: var(--text-primary);
        }

        .response-container li {
            margin: 0.3em 0;
        }

        .response-container blockquote {
            margin: 0.8em 0;
            padding: 0.5em 1em;
            border-left: 2px solid var(--border-strong);
            background: var(--bg-surface);
            border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
        }

        .response-container code {
            background: var(--bg-elevated);
            padding: 0.15em 0.4em;
            border-radius: var(--radius-sm);
            font-family: var(--font-mono);
            font-size: 0.85em;
        }

        .response-container pre {
            background: var(--bg-surface);
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            padding: var(--space-md);
            overflow-x: auto;
            margin: 0.8em 0;
        }

        .response-container pre code {
            background: none;
            padding: 0;
        }

        .response-container a {
            color: var(--accent);
            text-decoration: underline;
            text-underline-offset: 2px;
        }

        .response-container strong,
        .response-container b {
            font-weight: var(--font-weight-semibold);
        }

        .response-container hr {
            border: none;
            border-top: 1px solid var(--border);
            margin: 1.5em 0;
        }

        .response-container table {
            border-collapse: collapse;
            width: 100%;
            margin: 0.8em 0;
        }

        .response-container th,
        .response-container td {
            border: 1px solid var(--border);
            padding: var(--space-sm);
            text-align: left;
        }

        .response-container th {
            background: var(--bg-surface);
            font-weight: var(--font-weight-semibold);
        }

        .response-container::-webkit-scrollbar {
            width: 6px;
        }

        .response-container::-webkit-scrollbar-track {
            background: transparent;
        }

        .response-container::-webkit-scrollbar-thumb {
            background: var(--border-strong);
            border-radius: 3px;
        }

        .response-container::-webkit-scrollbar-thumb:hover {
            background: #444444;
        }

        /* ── Response navigation strip ── */

        .response-nav {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: var(--space-sm);
            padding: var(--space-xs) var(--space-md);
            border-top: 1px solid var(--border);
            background: var(--bg-app);
        }

        .nav-btn {
            background: none;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            padding: var(--space-xs);
            border-radius: var(--radius-sm);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color var(--transition);
        }

        .nav-btn:hover:not(:disabled) {
            color: var(--text-primary);
        }

        .nav-btn:disabled {
            opacity: 0.25;
            cursor: default;
        }

        .nav-btn svg {
            width: 14px;
            height: 14px;
        }

        .response-counter {
            font-size: var(--font-size-xs);
            color: var(--text-muted);
            font-family: var(--font-mono);
            min-width: 40px;
            text-align: center;
        }

        .phone-sync-control {
            position: absolute;
            z-index: 4;
            top: 50%;
            right: var(--space-md);
            transform: translateY(-50%);
        }

        .phone-sync-button {
            width: auto;
            min-width: 90px;
            height: 32px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 0 9px;
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            background: var(--bg-surface);
            color: var(--text-muted);
            cursor: pointer;
            font-size: var(--font-size-xs);
            white-space: nowrap;
            transition:
                color var(--transition),
                border-color var(--transition),
                background var(--transition);
        }

        .phone-sync-button:hover,
        .phone-sync-button:focus-visible,
        .phone-sync-button[aria-pressed='true'] {
            color: var(--text-primary);
            border-color: var(--accent);
            outline: none;
        }

        .phone-sync-button svg {
            width: 15px;
            height: 15px;
            flex: 0 0 auto;
        }

        .phone-sync-popover {
            position: absolute;
            right: 0;
            bottom: calc(100% + 10px);
            width: min(340px, 78vw);
            max-height: min(64vh, 440px);
            overflow: auto;
            padding: 14px;
            border: 1px solid var(--border-strong);
            border-radius: var(--radius-md);
            background: var(--bg-app);
            color: var(--text-primary);
            box-shadow: 0 12px 34px rgb(0 0 0 / 28%);
        }

        .phone-sync-title {
            margin: 0 0 4px;
            font-size: var(--font-size-sm);
            font-weight: var(--font-weight-semibold);
        }

        .phone-sync-hint,
        .phone-sync-error {
            margin: 0 0 10px;
            color: var(--text-muted);
            font-size: var(--font-size-xs);
            line-height: 1.5;
        }

        .phone-sync-error {
            color: var(--color-danger, #dc625e);
        }

        .phone-qr-list {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 9px;
        }

        .phone-qr-entry {
            min-width: 0;
            padding: 9px;
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            background: var(--bg-surface);
            text-align: center;
        }

        .phone-qr-entry img {
            display: block;
            width: min(100%, 132px);
            aspect-ratio: 1;
            margin: 7px auto;
            border-radius: 5px;
            background: white;
        }

        .phone-qr-label {
            overflow: hidden;
            color: var(--text-primary);
            font-size: var(--font-size-xs);
            font-weight: var(--font-weight-semibold);
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .phone-qr-address {
            overflow-wrap: anywhere;
            color: var(--text-muted);
            font-family: var(--font-mono);
            font-size: 10px;
            line-height: 1.4;
        }

        /* ── Bottom input bar ── */

        .input-bar {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            padding: var(--space-md);
            background: var(--bg-app);
        }

        .input-bar-inner {
            display: flex;
            align-items: center;
            flex: 1;
            background: var(--bg-elevated);
            border: 1px solid var(--border);
            border-radius: 100px;
            padding: 0 var(--space-md);
            height: 32px;
            transition: border-color var(--transition);
        }

        .input-bar-inner:focus-within {
            border-color: var(--accent);
        }

        .input-bar-inner input {
            flex: 1;
            background: none;
            color: var(--text-primary);
            border: none;
            padding: 0;
            font-size: var(--font-size-sm);
            font-family: var(--font);
            height: 100%;
            outline: none;
        }

        .input-bar-inner input::placeholder {
            color: var(--text-muted);
        }

        .analyze-btn {
            position: relative;
            background: var(--bg-elevated);
            border: 1px solid var(--border);
            color: var(--text-primary);
            cursor: pointer;
            font-size: var(--font-size-xs);
            font-family: var(--font-mono);
            white-space: nowrap;
            padding: var(--space-xs) var(--space-md);
            border-radius: 100px;
            height: 32px;
            display: flex;
            align-items: center;
            gap: 4px;
            transition:
                border-color 0.4s ease,
                background var(--transition);
            flex-shrink: 0;
            overflow: hidden;
        }

        .analyze-btn:hover:not(.analyzing) {
            border-color: var(--accent);
            background: var(--bg-surface);
        }

        .analyze-btn.analyzing {
            cursor: default;
            border-color: transparent;
        }

        .analyze-btn-content {
            display: flex;
            align-items: center;
            gap: 4px;
            transition: opacity 0.4s ease;
            z-index: 1;
            position: relative;
        }

        .analyze-btn.analyzing .analyze-btn-content {
            opacity: 0;
        }

        .analyze-canvas {
            position: absolute;
            inset: -1px;
            width: calc(100% + 2px);
            height: calc(100% + 2px);
            pointer-events: none;
        }
    `;

    static properties = {
        responses: { type: Array },
        currentResponseIndex: { type: Number },
        selectedProfile: { type: String },
        onSendText: { type: Function },
        shouldAnimateResponse: { type: Boolean },
        isAnalyzing: { type: Boolean, state: true },
        _phoneBridgeInfo: { state: true },
        _phonePopoverVisible: { state: true },
        _phonePopoverPinned: { state: true },
    };

    constructor() {
        super();
        this.responses = [];
        this.currentResponseIndex = -1;
        this.selectedProfile = 'interview';
        this.onSendText = () => {};
        this.isAnalyzing = false;
        this._animFrame = null;
        this._phoneBridgeInfo = null;
        this._phoneBridgeInfoLoaded = false;
        this._phonePopoverVisible = false;
        this._phonePopoverPinned = false;
        this._phonePointerInside = false;
        this._phoneCloseTimer = null;
    }

    getProfileNames() {
        return {
            interview: '求职面试',
            sales: '销售通话',
            meeting: '商务会议',
            presentation: '演示汇报',
            negotiation: '商务谈判',
            exam: '考试助手',
        };
    }

    getCurrentResponse() {
        const profileNames = this.getProfileNames();
        return this.responses.length > 0 && this.currentResponseIndex >= 0
            ? this.responses[this.currentResponseIndex]
            : `正在聆听${profileNames[this.selectedProfile] || '会话'}……`;
    }

    getCurrentPageStart() {
        if (this.responses.length === 0 || this.currentResponseIndex < 0) return 0;
        const safeIndex = Math.min(this.currentResponseIndex, this.responses.length - 1);
        return Math.floor(safeIndex / RESPONSE_PAGE_SIZE) * RESPONSE_PAGE_SIZE;
    }

    renderMarkdown(content) {
        if (typeof window !== 'undefined' && window.marked) {
            try {
                window.marked.setOptions({
                    breaks: true,
                    gfm: true,
                    sanitize: false,
                });
                let rendered = window.marked.parse(content);
                rendered = this.wrapWordsInSpans(rendered);
                return rendered;
            } catch (error) {
                console.warn('Error parsing markdown:', error);
                return content;
            }
        }
        return content;
    }

    wrapWordsInSpans(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const tagsToSkip = ['PRE'];

        function wrap(node) {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() && !tagsToSkip.includes(node.parentNode.tagName)) {
                const words = node.textContent.split(/(\s+)/);
                const frag = document.createDocumentFragment();
                words.forEach(word => {
                    if (word.trim()) {
                        const span = document.createElement('span');
                        span.setAttribute('data-word', '');
                        span.textContent = word;
                        frag.appendChild(span);
                    } else {
                        frag.appendChild(document.createTextNode(word));
                    }
                });
                node.parentNode.replaceChild(frag, node);
            } else if (node.nodeType === Node.ELEMENT_NODE && !tagsToSkip.includes(node.tagName)) {
                Array.from(node.childNodes).forEach(wrap);
            }
        }
        Array.from(doc.body.childNodes).forEach(wrap);
        return doc.body.innerHTML;
    }

    navigateToPreviousResponse() {
        const currentPageStart = this.getCurrentPageStart();
        if (currentPageStart > 0) {
            this.currentResponseIndex = currentPageStart - RESPONSE_PAGE_SIZE;
            this.dispatchEvent(
                new CustomEvent('response-index-changed', {
                    detail: { index: this.currentResponseIndex },
                })
            );
            this.requestUpdate();
        }
    }

    navigateToNextResponse() {
        const currentPageStart = this.getCurrentPageStart();
        const nextPageStart = currentPageStart + RESPONSE_PAGE_SIZE;
        if (nextPageStart < this.responses.length) {
            this.currentResponseIndex = nextPageStart;
            this.dispatchEvent(
                new CustomEvent('response-index-changed', {
                    detail: { index: this.currentResponseIndex },
                })
            );
            this.requestUpdate();
        }
    }

    scrollResponseUp() {
        const container = this.shadowRoot.querySelector('.response-container');
        if (container) {
            const scrollAmount = container.clientHeight * 0.3;
            container.scrollTop = Math.max(0, container.scrollTop - scrollAmount);
        }
    }

    scrollResponseDown() {
        const container = this.shadowRoot.querySelector('.response-container');
        if (container) {
            const scrollAmount = container.clientHeight * 0.3;
            container.scrollTop = Math.min(container.scrollHeight - container.clientHeight, container.scrollTop + scrollAmount);
        }
    }

    handlePhonePointerEnter() {
        this._phonePointerInside = true;
        clearTimeout(this._phoneCloseTimer);
        this.openPhonePopover();
    }

    handlePhonePointerLeave() {
        this._phonePointerInside = false;
        if (this._phonePopoverPinned) return;
        clearTimeout(this._phoneCloseTimer);
        this._phoneCloseTimer = setTimeout(() => {
            if (!this._phonePointerInside && !this._phonePopoverPinned) {
                this._phonePopoverVisible = false;
                this.requestUpdate();
            }
        }, 450);
    }

    async openPhonePopover() {
        this._phonePopoverVisible = true;
        this.requestUpdate();
        if (this._phoneBridgeInfoLoaded) return;

        this._phoneBridgeInfoLoaded = true;
        try {
            const { ipcRenderer } = window.require('electron');
            this._phoneBridgeInfo = await ipcRenderer.invoke('phone-companion:get-info');
        } catch (error) {
            this._phoneBridgeInfo = { success: false, error: error.message };
        }
        this.requestUpdate();
    }

    togglePhonePopover() {
        this._phonePopoverPinned = !this._phonePopoverPinned;
        if (this._phonePopoverPinned) {
            this.openPhonePopover();
            return;
        }
        if (!this._phonePointerInside) {
            this._phonePopoverVisible = false;
            this.requestUpdate();
        }
    }

    handlePhonePopoverKeydown(event) {
        if (event.key !== 'Escape') return;
        this._phonePopoverPinned = false;
        this._phonePopoverVisible = false;
        this.requestUpdate();
    }

    connectedCallback() {
        super.connectedCallback();

        if (window.require) {
            const { ipcRenderer } = window.require('electron');

            this._phoneAddressesChanged = (_event, info) => {
                this._phoneBridgeInfo = info;
                this._phoneBridgeInfoLoaded = true;
                this.requestUpdate();
            };
            ipcRenderer.on('phone-companion:addresses-updated', this._phoneAddressesChanged);

            this.handlePreviousResponse = () => this.navigateToPreviousResponse();
            this.handleNextResponse = () => this.navigateToNextResponse();
            this.handleScrollUp = () => {
                this.scrollResponseUp();
                ipcRenderer.send('phone-companion:scroll-command', 'up');
            };
            this.handleScrollDown = () => {
                this.scrollResponseDown();
                ipcRenderer.send('phone-companion:scroll-command', 'down');
            };

            ipcRenderer.on('navigate-previous-response', this.handlePreviousResponse);
            ipcRenderer.on('navigate-next-response', this.handleNextResponse);
            ipcRenderer.on('scroll-response-up', this.handleScrollUp);
            ipcRenderer.on('scroll-response-down', this.handleScrollDown);
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._stopWaveformAnimation();

        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            if (this._phoneAddressesChanged) ipcRenderer.removeListener('phone-companion:addresses-updated', this._phoneAddressesChanged);
            if (this.handlePreviousResponse) ipcRenderer.removeListener('navigate-previous-response', this.handlePreviousResponse);
            if (this.handleNextResponse) ipcRenderer.removeListener('navigate-next-response', this.handleNextResponse);
            if (this.handleScrollUp) ipcRenderer.removeListener('scroll-response-up', this.handleScrollUp);
            if (this.handleScrollDown) ipcRenderer.removeListener('scroll-response-down', this.handleScrollDown);
        }
        clearTimeout(this._phoneCloseTimer);
    }

    async handleSendText() {
        const textInput = this.shadowRoot.querySelector('#textInput');
        if (textInput && textInput.value.trim()) {
            const message = textInput.value.trim();
            textInput.value = '';
            await this.onSendText(message);
        }
    }

    handleTextKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.handleSendText();
        }
    }

    async handleScreenAnswer() {
        if (this.isAnalyzing) return;
        if (window.captureManualScreenshot) {
            this.isAnalyzing = true;
            this._responseCountWhenStarted = this.responses.length;
            window.captureManualScreenshot();
        }
    }

    _startWaveformAnimation() {
        const canvas = this.shadowRoot.querySelector('.analyze-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const dangerColor = getComputedStyle(this).getPropertyValue('--danger').trim() || '#EF4444';
        const startTime = performance.now();
        const FADE_IN = 0.5; // seconds
        const PARTICLE_SPREAD = 4; // px inward from border
        const PARTICLE_COUNT = 250;

        // Pill perimeter helpers
        const w = rect.width;
        const h = rect.height;
        const r = h / 2; // pill radius = half height
        const straightLen = w - 2 * r;
        const arcLen = Math.PI * r;
        const perimeter = 2 * straightLen + 2 * arcLen;

        // Given a distance along the perimeter, return {x, y, nx, ny} (position + inward normal)
        const pointOnPerimeter = d => {
            d = ((d % perimeter) + perimeter) % perimeter;
            // Top straight: left to right
            if (d < straightLen) {
                return { x: r + d, y: 0, nx: 0, ny: 1 };
            }
            d -= straightLen;
            // Right arc
            if (d < arcLen) {
                const angle = -Math.PI / 2 + (d / arcLen) * Math.PI;
                return {
                    x: w - r + Math.cos(angle) * r,
                    y: r + Math.sin(angle) * r,
                    nx: -Math.cos(angle),
                    ny: -Math.sin(angle),
                };
            }
            d -= arcLen;
            // Bottom straight: right to left
            if (d < straightLen) {
                return { x: w - r - d, y: h, nx: 0, ny: -1 };
            }
            d -= straightLen;
            // Left arc
            const angle = Math.PI / 2 + (d / arcLen) * Math.PI;
            return {
                x: r + Math.cos(angle) * r,
                y: r + Math.sin(angle) * r,
                nx: -Math.cos(angle),
                ny: -Math.sin(angle),
            };
        };

        // Pre-seed random offsets for stable particles
        const seeds = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            seeds.push({ pos: Math.random(), drift: Math.random(), depthSeed: Math.random() });
        }

        const draw = now => {
            const elapsed = (now - startTime) / 1000;
            const fade = Math.min(1, elapsed / FADE_IN);

            ctx.clearRect(0, 0, w, h);

            // ── Particle border ──
            ctx.fillStyle = dangerColor;
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                const s = seeds[i];
                const along = (s.pos + s.drift * elapsed * 0.03) * perimeter;
                const depth = s.depthSeed * PARTICLE_SPREAD;
                const density = 1 - depth / PARTICLE_SPREAD;

                if (Math.random() > density) continue;

                const p = pointOnPerimeter(along);
                const px = p.x + p.nx * depth;
                const py = p.y + p.ny * depth;
                const size = 0.8 + density * 0.6;

                ctx.globalAlpha = fade * density * 0.85;
                ctx.beginPath();
                ctx.arc(px, py, size, 0, Math.PI * 2);
                ctx.fill();
            }

            // ── Waveform ──
            const midY = h / 2;
            const waves = [
                { freq: 3, amp: 0.35, speed: 2.5, opacity: 0.9, width: 1.8 },
                { freq: 5, amp: 0.2, speed: 3.5, opacity: 0.5, width: 1.2 },
                { freq: 7, amp: 0.12, speed: 5, opacity: 0.3, width: 0.8 },
            ];

            for (const wave of waves) {
                ctx.beginPath();
                ctx.strokeStyle = dangerColor;
                ctx.globalAlpha = wave.opacity * fade;
                ctx.lineWidth = wave.width;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                for (let x = 0; x <= w; x++) {
                    const norm = x / w;
                    const envelope = Math.sin(norm * Math.PI);
                    const y = midY + Math.sin(norm * Math.PI * 2 * wave.freq + elapsed * wave.speed) * (midY * wave.amp) * envelope;
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
            }

            ctx.globalAlpha = 1;
            this._animFrame = requestAnimationFrame(draw);
        };

        this._animFrame = requestAnimationFrame(draw);
    }

    _stopWaveformAnimation() {
        if (this._animFrame) {
            cancelAnimationFrame(this._animFrame);
            this._animFrame = null;
        }
        const canvas = this.shadowRoot.querySelector('.analyze-canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    scrollToBottom() {
        setTimeout(() => {
            const container = this.shadowRoot.querySelector('.response-container');
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }, 0);
    }

    firstUpdated() {
        super.firstUpdated();
        this.updateResponseContent();
    }

    updated(changedProperties) {
        super.updated(changedProperties);
        if (changedProperties.has('responses') || changedProperties.has('currentResponseIndex')) {
            this.updateResponseContent();
        }

        if (changedProperties.has('isAnalyzing')) {
            if (this.isAnalyzing) {
                this._startWaveformAnimation();
            } else {
                this._stopWaveformAnimation();
            }
        }

        if (changedProperties.has('responses') && this.isAnalyzing) {
            if (this.responses.length > this._responseCountWhenStarted) {
                this.isAnalyzing = false;
            }
        }
    }

    updateResponseContent() {
        const container = this.shadowRoot.querySelector('#responseContainer');
        if (container) {
            let renderedResponse;
            if (this.responses.length === 0 || this.currentResponseIndex < 0) {
                renderedResponse = this.renderMarkdown(this.getCurrentResponse());
            } else {
                const pageStart = this.getCurrentPageStart();
                const visibleResponses = this.responses.slice(pageStart, pageStart + RESPONSE_PAGE_SIZE);
                renderedResponse = visibleResponses
                    .map(
                        (response, offset) => `
                            <article class="response-item">
                                <div class="response-item-label">第 ${pageStart + offset + 1} 条回复</div>
                                <div class="response-item-content">${this.renderMarkdown(response)}</div>
                            </article>
                        `
                    )
                    .join('');
            }
            container.innerHTML = renderedResponse;
            if (this.shouldAnimateResponse) {
                this.dispatchEvent(new CustomEvent('response-animation-complete', { bubbles: true, composed: true }));
            }
        }
    }

    render() {
        const hasMultipleResponses = this.responses.length > RESPONSE_PAGE_SIZE;
        const pageStart = this.getCurrentPageStart();
        const pageEnd = Math.min(pageStart + RESPONSE_PAGE_SIZE, this.responses.length);

        return html`
            <div class="response-container" id="responseContainer"></div>

            <div class="response-nav">
                ${
                    hasMultipleResponses
                        ? html`
                              <button class="nav-btn" @click=${this.navigateToPreviousResponse} ?disabled=${pageStart <= 0} title="上一组回复">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                      <path
                                          fill-rule="evenodd"
                                          d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
                                          clip-rule="evenodd"
                                      />
                                  </svg>
                              </button>
                              <span class="response-counter">第 ${pageStart + 1}-${pageEnd} / ${this.responses.length} 条</span>
                              <button
                                  class="nav-btn"
                                  @click=${this.navigateToNextResponse}
                                  ?disabled=${pageEnd >= this.responses.length}
                                  title="下一组回复"
                              >
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                      <path
                                          fill-rule="evenodd"
                                          d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
                                          clip-rule="evenodd"
                                      />
                                  </svg>
                              </button>
                          `
                        : html`<span class="response-counter">${this.responses.length ? `第 1-${pageEnd} / ${this.responses.length} 条` : ''}</span>`
                }
                <div
                    class="phone-sync-control"
                    @pointerenter=${() => this.handlePhonePointerEnter()}
                    @pointerleave=${() => this.handlePhonePointerLeave()}
                    @keydown=${event => this.handlePhonePopoverKeydown(event)}
                >
                    <button
                        class="phone-sync-button"
                        type="button"
                        aria-label="显示手机同步二维码"
                        aria-haspopup="dialog"
                        aria-expanded=${this._phonePopoverVisible}
                        aria-pressed=${this._phonePopoverPinned}
                        title="手机同步"
                        @focus=${() => this.openPhonePopover()}
                        @blur=${() => {
                            if (!this._phonePointerInside && !this._phonePopoverPinned) {
                                this._phonePopoverVisible = false;
                                this.requestUpdate();
                            }
                        }}
                        @click=${() => this.togglePhonePopover()}
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.7"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            aria-hidden="true"
                        >
                            <rect x="6" y="2.8" width="12" height="18.4" rx="2.1"></rect>
                            <path d="M10 18h4"></path>
                        </svg>
                        <span>手机同步</span>
                    </button>
                    ${
                        this._phonePopoverVisible
                            ? html`
                                  <section
                                      class="phone-sync-popover"
                                      role="dialog"
                                      aria-label="手机只读同步二维码"
                                      @pointerenter=${() => this.handlePhonePointerEnter()}
                                  >
                                      <h2 class="phone-sync-title">手机只读同步</h2>
                                      <p class="phone-sync-hint">连接同一网络后扫码。切换 Wi-Fi 或 USB 网络时，使用对应的新二维码。</p>
                                      ${
                                          !this._phoneBridgeInfo
                                              ? html`<p class="phone-sync-hint">正在获取本地连接地址…</p>`
                                              : this._phoneBridgeInfo.error
                                                ? html`<p class="phone-sync-error">${this._phoneBridgeInfo.error}</p>`
                                                : html`<div class="phone-qr-list">
                                                      ${(this._phoneBridgeInfo.addresses || []).map(
                                                          address => html`
                                                              <div class="phone-qr-entry">
                                                                  <div class="phone-qr-label">${address.name} · ${address.interfaceName}</div>
                                                                  <img src=${address.qrDataUrl} alt="${address.name} 手机同步二维码" />
                                                                  <div class="phone-qr-address">${address.address}</div>
                                                              </div>
                                                          `
                                                      )}
                                                  </div>`
                                      }
                                  </section>
                              `
                            : ''
                    }
                </div>
            </div>

            <div class="input-bar">
                <div class="input-bar-inner">
                    <input type="text" id="textInput" placeholder="输入消息……" @keydown=${this.handleTextKeydown} />
                </div>
                <button class="analyze-btn ${this.isAnalyzing ? 'analyzing' : ''}" @click=${this.handleScreenAnswer}>
                    <canvas class="analyze-canvas"></canvas>
                    <span class="analyze-btn-content">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
                            <path
                                fill="none"
                                stroke="currentColor"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M13 3v7h6l-8 11v-7H5z"
                            />
                        </svg>
                        分析屏幕
                    </span>
                </button>
            </div>
        `;
    }
}

customElements.define('assistant-view', AssistantView);
