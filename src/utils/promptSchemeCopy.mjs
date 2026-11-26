export function resolvePromptSchemePayload(explicitPrompts, pendingImportedPrompts, draftPrompts) {
    const isEventArgument =
        explicitPrompts !== null &&
        typeof explicitPrompts === 'object' &&
        typeof explicitPrompts.preventDefault === 'function';
    const suppliedPrompts = isEventArgument ? undefined : explicitPrompts;

    return suppliedPrompts ?? pendingImportedPrompts ?? draftPrompts;
}

export function clonePromptSchemePayload(prompts) {
    return JSON.parse(JSON.stringify(prompts));
}
