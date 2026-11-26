import assert from 'node:assert/strict';
import test from 'node:test';
import { clonePromptSchemePayload, resolvePromptSchemePayload } from '../src/utils/promptSchemeCopy.mjs';

test('a DOM click event is ignored and the active draft is selected', () => {
    const clickEvent = {
        isTrusted: true,
        preventDefault() {},
    };
    const activeDraft = { profilePrompts: { interview: {} }, customPrompt: '', qwenChineseInstruction: '' };

    assert.equal(resolvePromptSchemePayload(clickEvent, null, activeDraft), activeDraft);
});

test('explicit imported prompts take precedence over pending imports and the active draft', () => {
    const explicit = { customPrompt: 'explicit import' };
    const pending = { customPrompt: 'pending import' };
    const draft = { customPrompt: 'active draft' };

    assert.equal(resolvePromptSchemePayload(explicit, pending, draft), explicit);
});

test('pending imported prompts take precedence over the active draft', () => {
    const pending = { customPrompt: 'pending import' };
    const draft = { customPrompt: 'active draft' };

    assert.equal(resolvePromptSchemePayload(null, pending, draft), pending);
});

test('copying preserves an incomplete prompt payload without filling or rejecting fields', () => {
    const source = { customPrompt: '', qwenChineseInstruction: '简体中文回答' };
    const copy = clonePromptSchemePayload(source);

    assert.deepEqual(copy, source);
    assert.notEqual(copy, source);
    assert.equal(Object.hasOwn(copy, 'profilePrompts'), false);
});
