import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { unifiedPageStyles } from './sharedPageStyles.js';

export class AICustomizeView extends LitElement {
    static styles = [
        unifiedPageStyles,
        css`
            .unified-page {
                height: 100%;
            }
            .unified-wrap {
                height: 100%;
            }
            section.surface {
                flex: 1;
                display: flex;
                flex-direction: column;
            }
            .form-grid {
                flex: 1;
                display: flex;
                flex-direction: column;
            }
            .form-group.vertical {
                flex: 1;
                display: flex;
                flex-direction: column;
            }
            textarea.control {
                flex: 1;
                resize: none;
                overflow-y: auto;
                min-height: 0;
            }
        `,
    ];

    static properties = {
        selectedProfile: { type: String },
        onProfileChange: { type: Function },
        _context: { state: true },
    };

    constructor() {
        super();
        this.selectedProfile = 'interview';
        this.onProfileChange = () => {};
        this._context = '';
        this._loadFromStorage();
    }

    async _loadFromStorage() {
        try {
            const prefs = await cheatingDaddy.storage.getPreferences();
            this._context = prefs.customPrompt || '';
            this.requestUpdate();
        } catch (error) {
            console.error('Error loading AI customize storage:', error);
        }
    }

    _handleProfileChange(e) {
        this.onProfileChange(e.target.value);
    }

    async _saveContext(val) {
        this._context = val;
        await cheatingDaddy.storage.updatePreference('customPrompt', val);
    }

    _getProfileName(profile) {
        const names = {
            interview: '求职面试',
            sales: '销售通话',
            meeting: '商务会议',
            presentation: '演示汇报',
            negotiation: '商务谈判',
            exam: '考试助手',
        };
        return names[profile] || profile;
    }

    render() {
        const profiles = [
            { value: 'interview', label: '求职面试' },
            { value: 'sales', label: '销售通话' },
            { value: 'meeting', label: '商务会议' },
            { value: 'presentation', label: '演示汇报' },
            { value: 'negotiation', label: '商务谈判' },
            { value: 'exam', label: '考试助手' },
        ];

        return html`
            <div class="unified-page">
                <div class="unified-wrap">
                    <div>
                        <div class="page-title">AI 背景信息</div>
                    </div>

                    <section class="surface">
                        <div class="form-grid">
                            <div class="form-group">
                                <label class="form-label">场景</label>
                                <select class="control" .value=${this.selectedProfile} @change=${this._handleProfileChange}>
                                    ${profiles.map(profile => html`<option value=${profile.value}>${profile.label}</option>`)}
                                </select>
                            </div>
                            <div class="form-group vertical">
                                <label class="form-label">自定义指令</label>
                                <textarea
                                    class="control"
                                    placeholder="简历信息、岗位要求、限制条件……"
                                    .value=${this._context}
                                    @input=${e => this._saveContext(e.target.value)}
                                ></textarea>
                                <div class="form-help">会在会话开始时作为背景信息发送。建议保持简短。</div>
                            </div>
                        </div>
                    </section>

                </div>
            </div>
        `;
    }
}

customElements.define('ai-customize-view', AICustomizeView);
