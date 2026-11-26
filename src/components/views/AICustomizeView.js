import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { unifiedPageStyles } from './sharedPageStyles.js';

const PROMPT_FIELDS = [
    { key: 'intro', label: '角色说明' },
    { key: 'formatRequirements', label: '回答格式' },
    { key: 'searchUsage', label: '搜索说明', hint: '此字段保留在提示词方案中；当前千问实时语音按原逻辑不发送此段。' },
    { key: 'content', label: '回答内容与示例' },
    { key: 'outputInstructions', label: '输出要求' },
];

const PROFILES = [
    { value: 'interview', label: '求职面试' },
    { value: 'sales', label: '销售通话' },
    { value: 'meeting', label: '商务会议' },
    { value: 'presentation', label: '演示汇报' },
    { value: 'negotiation', label: '商务谈判' },
    { value: 'exam', label: '考试助手' },
];

function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
}

function isCompletePromptSet(prompts) {
    return (
        Boolean(prompts?.profilePrompts) &&
        PROFILES.every(({ value }) => PROMPT_FIELDS.every(({ key }) => typeof prompts.profilePrompts?.[value]?.[key] === 'string')) &&
        typeof prompts.customPrompt === 'string' &&
        typeof prompts.qwenChineseInstruction === 'string'
    );
}

export class AICustomizeView extends LitElement {
    static styles = [
        unifiedPageStyles,
        css`
            .unified-page {
                height: 100%;
                overflow-y: auto;
                overflow-x: hidden;
            }
            .unified-wrap {
                height: auto;
                max-width: none;
                min-height: 100%;
                display: flex;
                flex-direction: column;
                gap: var(--space-sm);
                padding-bottom: var(--space-lg);
            }
            section.surface {
                flex: 0 0 auto;
                display: flex;
                flex-direction: column;
            }
            .scheme-controls {
                display: grid;
                grid-template-columns: minmax(180px, 260px) minmax(0, 1fr);
                align-items: center;
                gap: var(--space-sm);
            }
            .prompt-toolbar .form-group {
                min-width: 0;
                margin: 0;
                flex: 0 0 220px;
            }
            .prompt-toolbar .form-group,
            .prompt-field {
                display: flex;
                flex-direction: column;
                align-items: stretch;
                gap: var(--space-xs);
            }
            .prompt-toolbar .control {
                width: 100%;
                min-width: 0;
            }
            .scheme-controls select.control,
            .new-scheme-form input.control {
                width: 100%;
                min-width: 0;
            }
            .scheme-actions,
            .prompt-actions,
            .new-scheme-actions {
                display: flex;
                align-items: center;
                gap: var(--space-sm);
            }
            .scheme-actions {
                justify-content: flex-end;
            }
            .scheme-button {
                min-height: 36px;
                padding: 8px 12px;
                border: 1px solid var(--border-strong);
                border-radius: var(--radius-sm);
                background: transparent;
                color: var(--text-primary);
                font: inherit;
                font-size: var(--font-size-sm);
                line-height: 1.2;
                cursor: pointer;
                white-space: nowrap;
                transition:
                    background var(--transition),
                    border-color var(--transition),
                    opacity var(--transition);
            }
            .scheme-button:hover:not(:disabled) {
                background: var(--bg-hover);
                border-color: var(--border-strong);
            }
            .scheme-button.primary {
                border-color: var(--accent);
                background: var(--accent);
                color: #fff;
            }
            .scheme-button.primary:hover:not(:disabled) {
                border-color: var(--accent-hover);
                background: var(--accent-hover);
            }
            .scheme-button.danger {
                border-color: var(--danger);
                color: var(--danger);
            }
            .scheme-button:focus-visible {
                outline: 2px solid var(--accent);
                outline-offset: 2px;
            }
            .scheme-button:disabled {
                opacity: 0.45;
                cursor: not-allowed;
            }
            .new-scheme-form {
                display: grid;
                grid-template-columns: minmax(0, 1fr) auto;
                align-items: center;
                gap: var(--space-sm);
                margin-top: var(--space-xs);
            }
            .new-scheme-actions {
                justify-content: flex-end;
            }
            .scheme-status {
                margin-top: var(--space-sm);
                color: var(--text-secondary);
                font-size: var(--font-size-xs);
                line-height: 1.5;
            }
            .scheme-status.error {
                color: var(--danger);
            }
            .scheme-status.success {
                color: var(--success);
            }
            .prompt-toolbar {
                display: flex;
                align-items: flex-end;
                gap: var(--space-sm);
                padding-bottom: var(--space-sm);
                margin-bottom: var(--space-sm);
                border-bottom: 1px solid var(--border);
            }
            .prompt-scroll {
                flex: 0 0 auto;
                display: flex;
                flex-direction: column;
                gap: var(--space-md);
                overflow: visible;
                padding: var(--space-md) 0 var(--space-xs);
            }
            .profile-field-list {
                display: flex;
                flex-direction: column;
                gap: var(--space-sm);
            }
            .prompt-field textarea.control {
                width: 100%;
                height: 220px;
                min-height: 220px;
                resize: none;
                overflow-y: hidden;
                line-height: 1.5;
            }
            .prompt-field.field-intro textarea.control {
                height: 260px;
                min-height: 260px;
            }
            .prompt-field.field-content textarea.control {
                height: 460px;
                min-height: 460px;
            }
            .prompt-field.field-formatRequirements textarea.control {
                height: 300px;
                min-height: 300px;
            }
            .prompt-field.field-searchUsage textarea.control {
                height: 260px;
                min-height: 260px;
            }
            .prompt-field.field-outputInstructions textarea.control {
                height: 240px;
                min-height: 240px;
            }
            .prompt-field.user-context textarea.control {
                height: 460px;
                min-height: 460px;
            }
            .prompt-field.chinese-instructions textarea.control {
                height: 300px;
                min-height: 300px;
            }
            @media (max-width: 720px) {
                .prompt-toolbar .form-group {
                    flex: 1 1 180px;
                    max-width: 250px;
                }
                .prompt-actions {
                    margin-left: auto;
                }
            }
            @media (max-width: 560px) {
                .scheme-controls {
                    grid-template-columns: minmax(0, 1fr);
                }
                .scheme-actions {
                    justify-content: flex-start;
                    flex-wrap: wrap;
                }
            }
            @media (max-width: 480px) {
                .new-scheme-form {
                    grid-template-columns: minmax(0, 1fr);
                }
                .new-scheme-actions {
                    justify-content: flex-end;
                }
            }
        `,
    ];

    updated(changedProperties) {
        if (changedProperties.has('_draftPrompts')) this._resizePromptEditors();
        if (changedProperties.has('_selectedSchemeId') || changedProperties.has('_promptSchemes')) {
            const schemeSelect = this.renderRoot.querySelector('.scheme-controls select');
            if (schemeSelect && this._selectedSchemeId && schemeSelect.value !== this._selectedSchemeId) {
                schemeSelect.value = this._selectedSchemeId;
            }
        }
    }

    static properties = {
        selectedProfile: { type: String },
        onProfileChange: { type: Function },
        _promptSchemes: { state: true },
        _activeSchemeId: { state: true },
        _selectedSchemeId: { state: true },
        _draftPrompts: { state: true },
        _newSchemeName: { state: true },
        _showNewSchemeForm: { state: true },
        _fileBusy: { state: true },
        _pendingImportedPrompts: { state: true },
        _dirty: { state: true },
        _statusMessage: { state: true },
        _statusType: { state: true },
        _loading: { state: true },
        _saving: { state: true },
    };

    constructor() {
        super();
        this.selectedProfile = 'interview';
        this.onProfileChange = () => {};
        this._promptSchemes = [];
        this._activeSchemeId = '';
        this._selectedSchemeId = '';
        this._draftPrompts = null;
        this._newSchemeName = '';
        this._showNewSchemeForm = false;
        this._fileBusy = false;
        this._pendingImportedPrompts = null;
        this._dirty = false;
        this._statusMessage = '';
        this._statusType = '';
        this._loading = true;
        this._saving = false;
        this._loadFromStorage();
    }

    async _loadFromStorage() {
        try {
            const prefs = await cheatingDaddy.storage.getPreferences();
            const schemes = Array.isArray(prefs.qwenPromptSchemes) ? prefs.qwenPromptSchemes : [];
            const activeMatches = schemes.filter(scheme => scheme?.id === prefs.activeQwenPromptSchemeId);
            const activeScheme = activeMatches.length === 1 ? activeMatches[0] : null;

            this._promptSchemes = schemes;
            this._activeSchemeId = activeScheme?.id || '';
            this._selectedSchemeId = activeScheme?.id || '';
            this._draftPrompts = activeScheme?.prompts ? cloneJson(activeScheme.prompts) : null;
            this._statusMessage = !activeScheme
                ? activeMatches.length > 1
                    ? '当前方案 ID 重复，无法确定唯一方案；未加载任何方案内容。请检查方案数据。'
                    : '当前方案 ID 无效，未加载其他方案。请从方案菜单中明确选择一套方案。'
                : isCompletePromptSet(activeScheme.prompts)
                  ? ''
                  : '当前方案内容不完整；千问不会使用其他方案代替。请补齐提示词后保存。';
            this._statusType = this._statusMessage ? 'error' : '';
            this._loading = false;
            this.requestUpdate();
        } catch (error) {
            this._loading = false;
            this._statusMessage = `读取提示词方案失败：${error.message}`;
            this._statusType = 'error';
            this.requestUpdate();
        }
    }

    _handleProfileChange(e) {
        this.onProfileChange(e.target.value);
    }

    async _handleSchemeSelect(e) {
        const schemeId = e.target.value;
        if (schemeId === this._activeSchemeId) return;

        if (this._dirty) {
            this._selectedSchemeId = this._activeSchemeId;
            this._statusMessage = '当前方案有未保存修改；先保存修改，或新增方案保留这些内容，再切换。';
            this._statusType = 'error';
            return;
        }

        const schemeMatches = this._promptSchemes.filter(item => item?.id === schemeId);
        if (schemeMatches.length !== 1) {
            this._selectedSchemeId = this._activeSchemeId;
            this._statusMessage = '所选方案 ID 无效或重复，无法确定唯一方案；未切换当前方案。';
            this._statusType = 'error';
            return;
        }
        const scheme = schemeMatches[0];

        this._selectedSchemeId = schemeId;
        this._saving = true;
        try {
            const result = await cheatingDaddy.storage.updatePreference('activeQwenPromptSchemeId', scheme.id);
            if (result?.success === false) throw new Error(result.error || '切换方案失败');

            this._activeSchemeId = scheme.id;
            this._draftPrompts = cloneJson(scheme.prompts);
            this._dirty = false;
            this._statusMessage = isCompletePromptSet(scheme.prompts)
                ? `已切换到「${scheme.name}」。`
                : `已切换到「${scheme.name}」，但提示词内容不完整；千问不会使用其他方案代替。请补齐后保存。`;
            this._statusType = isCompletePromptSet(scheme.prompts) ? 'success' : 'error';
        } catch (error) {
            this._selectedSchemeId = this._activeSchemeId;
            this._statusMessage = `切换方案失败：${error.message}`;
            this._statusType = 'error';
        } finally {
            this._saving = false;
        }
    }

    _updatePromptContent(path, value) {
        if (!this._draftPrompts) return;

        const next = cloneJson(this._draftPrompts);
        if (path === 'customPrompt' || path === 'qwenChineseInstruction') {
            next[path] = value;
        } else {
            const [profile, field] = path.split('.');
            if (!next.profilePrompts?.[profile] || !(field in next.profilePrompts[profile])) return;
            next.profilePrompts[profile][field] = value;
        }

        this._draftPrompts = next;
        this._dirty = true;
        this._statusMessage = '有未保存的修改；保存修改后，新会话才会使用这些内容。';
        this._statusType = '';
    }

    _resizePromptEditors() {
        this.renderRoot.querySelectorAll('.prompt-field textarea.control').forEach(textarea => {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        });
    }

    _toggleNewSchemeForm() {
        this._showNewSchemeForm = !this._showNewSchemeForm;
        this._newSchemeName = '';
        this._pendingImportedPrompts = null;
        this._statusMessage = '';
        this._statusType = '';
    }

    _cancelNewScheme() {
        this._showNewSchemeForm = false;
        this._newSchemeName = '';
        this._pendingImportedPrompts = null;
        this._statusMessage = '';
        this._statusType = '';
    }

    _handleNewSchemeKeydown(e) {
        if (e.key === 'Enter' && !e.isComposing) {
            e.preventDefault();
            this._addScheme();
        }
    }

    async _exportScheme() {
        const activeScheme = this._promptSchemes.find(scheme => scheme.id === this._activeSchemeId);
        if (!activeScheme || !this._draftPrompts) return;

        this._fileBusy = true;
        try {
            const result = await cheatingDaddy.storage.exportQwenPromptScheme({
                name: activeScheme.name,
                prompts: cloneJson(this._draftPrompts),
            });
            if (result?.success === false) throw new Error(result.error || '导出失败');
            if (result?.canceled) return;

            this._statusMessage = `已导出「${result.fileName || activeScheme.name}」，包含当前编辑内容。`;
            this._statusType = 'success';
        } catch (error) {
            this._statusMessage = `导出失败：${error.message}`;
            this._statusType = 'error';
        } finally {
            this._fileBusy = false;
        }
    }

    async _importScheme() {
        if (!this._activeSchemeId || !this._draftPrompts) return;

        this._fileBusy = true;
        try {
            const result = await cheatingDaddy.storage.importQwenPromptScheme();
            if (result?.success === false) throw new Error(result.error || '导入失败');
            if (result?.canceled) return;
            if (!result?.data?.prompts) throw new Error('导入文件中没有可用的提示词内容');

            this._pendingImportedPrompts = cloneJson(result.data.prompts);
            this._newSchemeName = String(result.data.name || result.data.fileName?.replace(/\.json$/i, '') || '导入方案')
                .trim()
                .slice(0, 80);
            this._showNewSchemeForm = true;
            this._statusMessage = '导入内容将作为一套新方案加入。';
            this._statusType = '';
            await this._addScheme(this._pendingImportedPrompts);
        } catch (error) {
            this._statusMessage = `导入失败：${error.message}`;
            this._statusType = 'error';
        } finally {
            this._fileBusy = false;
        }
    }

    async _saveCurrentScheme() {
        if (this._selectedSchemeId !== this._activeSchemeId) {
            this._statusMessage = '请先切换到选中的方案，再修改保存。';
            this._statusType = 'error';
            return;
        }
        if (!isCompletePromptSet(this._draftPrompts)) {
            this._statusMessage = '提示词方案内容不完整；请补齐六个场景的五个字段、自定义指令和中文回答要求后再保存。';
            this._statusType = 'error';
            return;
        }

        this._saving = true;
        try {
            const prefs = await cheatingDaddy.storage.getPreferences();
            const schemes = Array.isArray(prefs.qwenPromptSchemes) ? prefs.qwenPromptSchemes : [];
            const index = schemes.findIndex(scheme => scheme.id === this._activeSchemeId);
            if (index < 0) throw new Error('当前方案不存在，请重新打开设置页');

            const updatedScheme = {
                ...schemes[index],
                updatedAt: Date.now(),
                prompts: cloneJson(this._draftPrompts),
            };
            const nextSchemes = [...schemes];
            nextSchemes[index] = updatedScheme;
            const result = await cheatingDaddy.storage.setPreferences({ qwenPromptSchemes: nextSchemes });
            if (result?.success === false) throw new Error(result.error || '保存方案失败');

            this._promptSchemes = nextSchemes;
            this._selectedSchemeId = updatedScheme.id;
            this._draftPrompts = cloneJson(updatedScheme.prompts);
            this._dirty = false;
            this._statusMessage = `已保存「${updatedScheme.name}」；新会话会使用修改后的内容。`;
            this._statusType = 'success';
        } catch (error) {
            this._statusMessage = `保存方案失败：${error.message}`;
            this._statusType = 'error';
        } finally {
            this._saving = false;
        }
    }

    async _addScheme(importedPrompts = null) {
        if (this._selectedSchemeId !== this._activeSchemeId) {
            this._statusMessage = '请先切换到选中的方案，再从当前内容新增方案。';
            this._statusType = 'error';
            return;
        }
        const name = this._newSchemeName.trim();
        if (!name) {
            this._statusMessage = '请先填写新方案名称。';
            this._statusType = 'error';
            return;
        }
        if (
            this._promptSchemes.some(
                scheme =>
                    String(scheme?.name || '')
                        .trim()
                        .toLocaleLowerCase() === name.toLocaleLowerCase()
            )
        ) {
            this._statusMessage = '已有同名方案，请使用不同名称。';
            this._statusType = 'error';
            return;
        }
        const promptsToSave = importedPrompts || this._pendingImportedPrompts || this._draftPrompts;

        this._saving = true;
        try {
            const prefs = await cheatingDaddy.storage.getPreferences();
            const createdAt = Date.now();
            const schemes = Array.isArray(prefs.qwenPromptSchemes) ? prefs.qwenPromptSchemes : [];
            let schemeId;
            do {
                schemeId = `qwen-scheme-${createdAt}-${Math.random().toString(36).slice(2, 8)}`;
            } while (schemes.some(existing => existing?.id === schemeId));
            const scheme = {
                id: schemeId,
                name,
                createdAt,
                updatedAt: createdAt,
                prompts: cloneJson(promptsToSave),
            };
            const nextSchemes = [...schemes, scheme];
            const result = await cheatingDaddy.storage.setPreferences({
                qwenPromptSchemes: nextSchemes,
                activeQwenPromptSchemeId: scheme.id,
            });
            if (result?.success === false) throw new Error(result.error || '新增方案失败');

            this._promptSchemes = nextSchemes;
            this._activeSchemeId = scheme.id;
            this._selectedSchemeId = scheme.id;
            this._draftPrompts = cloneJson(scheme.prompts);
            this._newSchemeName = '';
            this._showNewSchemeForm = false;
            this._pendingImportedPrompts = null;
            this._dirty = false;
            this._statusMessage = `已新增并切换到「${name}」。`;
            this._statusType = 'success';
        } catch (error) {
            this._statusMessage = `新增方案失败：${error.message}`;
            this._statusType = 'error';
        } finally {
            this._saving = false;
        }
    }

    async _deleteCurrentScheme() {
        if (this._saving || this._fileBusy || this._pendingImportedPrompts) return;

        const currentScheme = this._promptSchemes.find(scheme => scheme.id === this._activeSchemeId);
        if (!currentScheme) {
            this._statusMessage = '当前方案不存在，无法删除。';
            this._statusType = 'error';
            return;
        }
        if (currentScheme.isDefault) {
            this._statusMessage = '默认方案不能删除。';
            this._statusType = 'error';
            return;
        }

        const confirmMessage = `确定删除方案「${currentScheme.name}」吗？删除后无法恢复，并会切回「默认方案」。${this._dirty ? '\n当前未保存的修改也会丢失。' : ''}`;
        if (!window.confirm(confirmMessage)) return;

        this._saving = true;
        try {
            const prefs = await cheatingDaddy.storage.getPreferences();
            const schemes = Array.isArray(prefs.qwenPromptSchemes) ? prefs.qwenPromptSchemes : [];
            const schemeToDelete = schemes.find(scheme => scheme.id === this._activeSchemeId);
            const defaultScheme = schemes.find(scheme => scheme.isDefault);
            if (!schemeToDelete) throw new Error('当前方案不存在，请重新打开设置页');
            if (schemeToDelete.isDefault) throw new Error('默认方案不能删除');
            if (!defaultScheme?.prompts?.profilePrompts) throw new Error('找不到有效的默认方案，未执行删除');

            const nextSchemes = schemes.filter(scheme => scheme.id !== schemeToDelete.id);
            const result = await cheatingDaddy.storage.setPreferences({
                qwenPromptSchemes: nextSchemes,
                activeQwenPromptSchemeId: defaultScheme.id,
            });
            if (result?.success === false) throw new Error(result.error || '删除方案失败');

            this._promptSchemes = nextSchemes;
            this._activeSchemeId = defaultScheme.id;
            this._selectedSchemeId = defaultScheme.id;
            this._draftPrompts = cloneJson(defaultScheme.prompts);
            this._newSchemeName = '';
            this._showNewSchemeForm = false;
            this._pendingImportedPrompts = null;
            this._dirty = false;
            this._statusMessage = `已删除「${schemeToDelete.name}」，当前方案已切回「默认方案」。`;
            this._statusType = 'success';
        } catch (error) {
            this._statusMessage = `删除方案失败：${error.message}`;
            this._statusType = 'error';
        } finally {
            this._saving = false;
        }
    }

    _renderPromptField(profile, field) {
        const value = this._draftPrompts?.profilePrompts?.[profile]?.[field.key] || '';

        return html`
            <div class="form-group prompt-field field-${field.key}">
                <label class="form-label">${field.label}</label>
                <textarea
                    class="control"
                    .value=${value}
                    ?disabled=${this._saving || this._fileBusy}
                    @input=${e => this._updatePromptContent(`${profile}.${field.key}`, e.target.value)}
                ></textarea>
                ${field.hint ? html`<div class="form-help">${field.hint}</div>` : ''}
            </div>
        `;
    }

    render() {
        const profilePrompts = this._draftPrompts?.profilePrompts;
        const profilePrompt = profilePrompts?.[this.selectedProfile];
        const activeScheme = this._promptSchemes.find(scheme => scheme.id === this._activeSchemeId);

        return html`
            <div class="unified-page">
                <div class="unified-wrap">
                    <div>
                        <div class="page-title">AI 提示词设置</div>
                    </div>

                    ${
                        this._loading
                            ? html`<section class="surface"><div class="empty">正在读取提示词方案……</div></section>`
                            : html`
                                  <div class="scheme-toolbar">
                                      <div class="scheme-controls">
                                          <select
                                              class="control"
                                              aria-label="当前提示词方案"
                                              .value=${this._selectedSchemeId}
                                              ?disabled=${this._saving || this._fileBusy}
                                              @change=${this._handleSchemeSelect}
                                          >
                                              ${this._selectedSchemeId ? '' : html`<option value="" disabled>当前方案无效，请重新选择</option>`}
                                              ${this._promptSchemes.map(scheme => html`<option value=${scheme.id}>${scheme.name}</option>`)}
                                          </select>
                                          <div class="scheme-actions">
                                              <button
                                                  class="scheme-button"
                                                  ?disabled=${this._saving || this._fileBusy || !this._draftPrompts}
                                                  @click=${this._importScheme}
                                              >
                                                  ${this._fileBusy ? '处理中……' : '导入新方案'}
                                              </button>
                                              <button
                                                  class="scheme-button"
                                                  ?disabled=${this._saving || this._fileBusy || !this._draftPrompts}
                                                  @click=${this._exportScheme}
                                              >
                                                  ${this._fileBusy ? '处理中……' : '导出方案'}
                                              </button>
                                              <button
                                                  class="scheme-button"
                                                  aria-controls="new-scheme-form"
                                                  aria-expanded=${this._showNewSchemeForm}
                                                  ?disabled=${this._saving || this._fileBusy}
                                                  @click=${this._toggleNewSchemeForm}
                                              >
                                                  ${this._showNewSchemeForm ? '收起' : '新增方案'}
                                              </button>
                                              <button
                                                  class="scheme-button danger"
                                                  title=${activeScheme?.isDefault ? '默认方案不能删除' : '删除当前方案并切回默认方案'}
                                                  ?disabled=${
                                                      this._saving ||
                                                      this._fileBusy ||
                                                      this._pendingImportedPrompts ||
                                                      this._showNewSchemeForm ||
                                                      this._selectedSchemeId !== this._activeSchemeId ||
                                                      !activeScheme ||
                                                      activeScheme.isDefault
                                                  }
                                                  @click=${this._deleteCurrentScheme}
                                              >
                                                  删除该方案
                                              </button>
                                          </div>
                                      </div>

                                      ${
                                          this._showNewSchemeForm
                                              ? html`
                                                    <div class="new-scheme-form" id="new-scheme-form">
                                                        <input
                                                            class="control"
                                                            type="text"
                                                            maxlength="80"
                                                            aria-label="新方案名称"
                                                            placeholder="输入新方案名称，例如：运营"
                                                            .value=${this._newSchemeName}
                                                            ?disabled=${this._saving || this._fileBusy}
                                                            @input=${e => (this._newSchemeName = e.target.value)}
                                                            @keydown=${this._handleNewSchemeKeydown}
                                                        />
                                                        <div class="new-scheme-actions">
                                                            <button
                                                                class="scheme-button"
                                                                ?disabled=${this._saving || this._fileBusy}
                                                                @click=${this._cancelNewScheme}
                                                            >
                                                                取消
                                                            </button>
                                                            <button
                                                                class="scheme-button primary"
                                                                ?disabled=${this._saving || this._fileBusy || this._selectedSchemeId !== this._activeSchemeId}
                                                                @click=${this._addScheme}
                                                            >
                                                                ${this._saving ? '创建中……' : this._pendingImportedPrompts ? '导入并创建' : '创建并切换'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                `
                                              : ''
                                      }
                                      ${
                                          this._statusMessage
                                              ? html`
                                                    <div
                                                        class="scheme-status ${this._statusType}"
                                                        role=${this._statusType === 'error' ? 'alert' : 'status'}
                                                        aria-live=${this._statusType === 'error' ? 'assertive' : 'polite'}
                                                    >
                                                        ${this._statusMessage}
                                                    </div>
                                                `
                                              : ''
                                      }
                                  </div>

                                  <section class="surface prompt-surface">
                                      ${
                                          activeScheme
                                              ? html`
                                                    <div class="prompt-toolbar">
                                                        <div class="form-group">
                                                            <label class="form-label" for="prompt-scene-select">场景</label>
                                                            <select
                                                                id="prompt-scene-select"
                                                                class="control"
                                                                .value=${this.selectedProfile}
                                                                ?disabled=${this._saving || this._fileBusy}
                                                                @change=${this._handleProfileChange}
                                                            >
                                                                ${PROFILES.map(profile => html`<option value=${profile.value}>${profile.label}</option>`)}
                                                            </select>
                                                        </div>
                                                        <div class="prompt-actions">
                                                            <button
                                                                class="scheme-button primary"
                                                                ?disabled=${this._saving || this._fileBusy || Boolean(this._pendingImportedPrompts) || !this._dirty || this._selectedSchemeId !== this._activeSchemeId}
                                                                @click=${this._saveCurrentScheme}
                                                            >
                                                                ${this._saving ? '保存中……' : '保存修改'}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div class="prompt-scroll">
                                                        <div class="profile-field-list">
                                                            ${
                                                                profilePrompt
                                                                    ? PROMPT_FIELDS.map(field => this._renderPromptField(this.selectedProfile, field))
                                                                    : html`<div class="empty">当前方案没有这个场景的提示词内容。</div>`
                                                            }
                                                        </div>

                                                        <div class="form-group prompt-field user-context">
                                                            <label class="form-label">自定义指令</label>
                                                            <textarea
                                                                class="control"
                                                                placeholder="简历信息、岗位要求、限制条件……"
                                                                .value=${this._draftPrompts?.customPrompt || ''}
                                                                ?disabled=${this._saving || this._fileBusy || !activeScheme}
                                                                @input=${e => this._updatePromptContent('customPrompt', e.target.value)}
                                                            ></textarea>
                                                        </div>

                                                        <div class="form-group prompt-field chinese-instructions">
                                                            <label class="form-label">简体中文回答要求</label>
                                                            <textarea
                                                                class="control"
                                                                .value=${this._draftPrompts?.qwenChineseInstruction || ''}
                                                                ?disabled=${this._saving || this._fileBusy || !activeScheme}
                                                                @input=${e => this._updatePromptContent('qwenChineseInstruction', e.target.value)}
                                                            ></textarea>
                                                            <div class="form-help">仅中文语言设置时附加到千问会话指令。</div>
                                                        </div>
                                                    </div>
                                                `
                                              : html`<div class="empty">当前方案 ID 无效，未加载任何方案内容。请从上方菜单中明确选择方案。</div>`
                                      }
                                  </section>
                              `
                    }
                </div>
            </div>
        `;
    }
}

customElements.define('ai-customize-view', AICustomizeView);
