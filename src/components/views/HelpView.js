import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { unifiedPageStyles } from './sharedPageStyles.js';

export class HelpView extends LitElement {
    static styles = [
        unifiedPageStyles,
        css`
            .shortcut-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: var(--space-sm);
            }

            .shortcut-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: var(--space-sm);
                padding: var(--space-sm);
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                background: var(--bg-elevated);
            }

            .shortcut-label {
                color: var(--text-secondary);
                font-size: var(--font-size-xs);
            }

            .shortcut-keys {
                display: inline-flex;
                gap: 4px;
                flex-wrap: wrap;
                justify-content: flex-end;
            }

            .key {
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                padding: 2px 6px;
                font-size: var(--font-size-xs);
                color: var(--text-primary);
                background: var(--bg-surface);
                font-family: var(--font-mono);
            }

            .list {
                display: grid;
                gap: var(--space-sm);
            }

            .list-item {
                padding: var(--space-sm);
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                color: var(--text-secondary);
                font-size: var(--font-size-sm);
                line-height: 1.45;
                background: var(--bg-elevated);
            }

            .link-row {
                display: flex;
                flex-wrap: wrap;
                gap: var(--space-sm);
            }

            .link-button {
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                padding: 8px 10px;
                background: var(--bg-elevated);
                color: var(--text-primary);
                font-size: var(--font-size-sm);
                cursor: pointer;
                transition:
                    border-color var(--transition),
                    color var(--transition),
                    background var(--transition);
            }

            .link-button:hover {
                color: var(--text-primary);
                border-color: var(--accent);
                background: rgba(63, 125, 229, 0.14);
            }

            @media (max-width: 820px) {
                .shortcut-grid {
                    grid-template-columns: 1fr;
                }
            }
        `,
    ];

    static properties = {
        onExternalLinkClick: { type: Function },
        keybinds: { type: Object },
    };

    constructor() {
        super();
        this.onExternalLinkClick = () => {};
        this.keybinds = this.getDefaultKeybinds();
        this._loadKeybinds();
    }

    async _loadKeybinds() {
        try {
            const keybinds = await cheatingDaddy.storage.getKeybinds();
            if (keybinds) {
                this.keybinds = { ...this.getDefaultKeybinds(), ...keybinds };
                this.requestUpdate();
            }
        } catch (error) {
            console.error('Error loading keybinds:', error);
        }
    }

    getDefaultKeybinds() {
        const isMac = cheatingDaddy.isMacOS || navigator.platform.includes('Mac');
        return {
            moveUp: isMac ? 'Alt+Up' : 'Ctrl+Alt+Up',
            moveDown: isMac ? 'Alt+Down' : 'Ctrl+Alt+Down',
            moveLeft: isMac ? 'Cmd+Shift+Left' : 'Ctrl+Shift+Left',
            moveRight: isMac ? 'Cmd+Shift+Right' : 'Ctrl+Shift+Right',
            toggleVisibility: isMac ? 'Cmd+\\' : 'Ctrl+\\',
            toggleClickThrough: isMac ? 'Cmd+M' : 'Ctrl+M',
            nextStep: isMac ? 'Cmd+Enter' : 'Ctrl+Enter',
            previousResponse: isMac ? 'Cmd+Left' : 'Ctrl+Left',
            nextResponse: isMac ? 'Cmd+Right' : 'Ctrl+Right',
            scrollUp: isMac ? 'Cmd+Up' : 'Ctrl+Up',
            scrollDown: isMac ? 'Cmd+Down' : 'Ctrl+Down',
        };
    }

    _formatKeybind(keybind) {
        return keybind.split('+').map(key => html`<span class="key">${key}</span>`);
    }

    _open(url) {
        this.onExternalLinkClick(url);
    }

    render() {
        const shortcutRows = [
            ['窗口上移', this.keybinds.moveUp],
            ['窗口下移', this.keybinds.moveDown],
            ['窗口左移', this.keybinds.moveLeft],
            ['窗口右移', this.keybinds.moveRight],
            ['切换显示/隐藏', this.keybinds.toggleVisibility],
            ['切换鼠标穿透', this.keybinds.toggleClickThrough],
            ['询问下一步', this.keybinds.nextStep],
            ['上一组回复（三条）', this.keybinds.previousResponse],
            ['下一组回复（三条）', this.keybinds.nextResponse],
            ['向上滚动回答（同步手机）', this.keybinds.scrollUp],
            ['向下滚动回答（同步手机）', this.keybinds.scrollDown],
        ];

        return html`
            <div class="unified-page">
                <div class="unified-wrap">
                    <div class="page-title">帮助</div>

                    <section class="surface">
                        <div class="surface-title">支持</div>
                        <div class="link-row">
                            <button class="link-button" @click=${() => this._open('https://github.com/L3n3L/ai-interview-assistant')}>
                                项目主页
                            </button>
                            <button class="link-button" @click=${() => this._open('https://github.com/L3n3L/ai-interview-assistant/issues')}>
                                问题反馈
                            </button>
                            <button class="link-button" @click=${() => this._open('https://discord.gg/GCBdubnXfJ')}>Discord 社区</button>
                        </div>
                    </section>

                    <section class="surface">
                        <div class="surface-title">键盘快捷键</div>
                        <div class="shortcut-grid">
                            ${shortcutRows.map(
                                ([label, keys]) => html`
                                    <div class="shortcut-row">
                                        <span class="shortcut-label">${label}</span>
                                        <span class="shortcut-keys">${this._formatKeybind(keys)}</span>
                                    </div>
                                `
                            )}
                        </div>
                    </section>
                </div>
            </div>
        `;
    }
}

customElements.define('help-view', HelpView);
