const { GoogleGenAI, Modality } = require('@google/genai');
const { BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const { saveDebugAudio } = require('../audioUtils');
const { getSystemPrompt } = require('./prompts');
const { getAvailableModel, incrementLimitCount, getApiKey, getGroqApiKey, getDeepSeekApiKey, incrementCharUsage, getConfig } = require('../storage');
const { connectCloud, sendCloudAudio, sendCloudText, sendCloudImage, closeCloud, isCloudActive, setOnTurnComplete } = require('./cloud');
const { startTransportLog, logTransportEvent, closeTransportLog } = require('./transportLogger');
const { QwenRealtimeSession, DEFAULT_MODEL: DEFAULT_QWEN_REALTIME_MODEL } = require('./qwen-realtime');

const DEFAULT_QWEN_VISION_MODEL = 'qwen3-vl-plus';
const DEFAULT_QWEN_VISION_ENDPOINT = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const DEFAULT_QWEN_OMNI_REALTIME_MODEL = 'qwen3.8-omni-flash-realtime';

// Lazy-loaded to avoid circular dependency (localai.js imports from gemini.js)
let _localai = null;
function getLocalAi() {
    if (!_localai) _localai = require('./localai');
    return _localai;
}

// Provider mode: legacy providers plus 'qwen-realtime' and 'qwen-omni-realtime'.
let currentProviderMode = 'byok';

// Groq conversation history for context
let groqConversationHistory = [];
let deepseekConversationHistory = [];
let currentDeepSeekApiKey = '';
let currentDeepSeekModel = 'deepseek-flash';
let currentQwenApiKey = '';

// Conversation tracking variables
let currentSessionId = null;
let currentTranscription = '';
let conversationHistory = [];
let screenAnalysisHistory = [];
let currentProfile = null;
let currentCustomPrompt = null;
let isInitializingSession = false;
let currentSystemPrompt = null;
let qwenRealtimeSession = null;
let qwenCurrentUserTranscript = '';
let qwenCurrentResponseText = '';
let qwenCurrentResponseId = null;
let qwenFirstTokenAt = null;
let qwenResponseStartedAt = null;

function formatSpeakerResults(results) {
    let text = '';
    for (const result of results) {
        if (result.transcript && result.speakerId) {
            const speakerLabel = result.speakerId === 1 ? 'Interviewer' : 'Candidate';
            text += `[${speakerLabel}]: ${result.transcript}\n`;
        }
    }
    return text;
}

module.exports.formatSpeakerResults = formatSpeakerResults;

// Audio capture variables
let systemAudioProc = null;
let messageBuffer = '';
let groqRequestStartedForTurn = false;

const GROQ_MAX_COMPLETION_TOKENS = 16384;
const GROQ_EMPTY_RESPONSE_MESSAGE =
    'Groq reached the maximum completion-token limit before returning a final answer. Disable thinking in Home → AI responses and try again.';

// Reconnection variables
let isUserClosing = false;
let sessionParams = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY = 2000;

function sendToRenderer(channel, data) {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
        windows[0].webContents.send(channel, data);
    }
}

function getQwenSystemPrompt(profile, customPrompt, language) {
    const basePrompt = getSystemPrompt(profile, customPrompt, false);
    if (/^(zh|cmn)/i.test(language || '')) {
        return `${basePrompt}\n\n请始终使用简体中文回答。回答直接、准确、便于快速阅读，不要输出语音或无关说明。`;
    }
    return basePrompt;
}

function handleQwenRealtimeEvent(event) {
    const type = event?.type;

    if (type === 'session.created') {
        logTransportEvent('qwen.session_created', { sessionId: event.session?.id || null });
        return;
    }

    if (type === 'session.updated') {
        logTransportEvent('qwen.session_updated', {
            model: event.session?.model || null,
            turnDetection: event.session?.turn_detection?.type || null,
            modalities: event.session?.modalities || [],
        });
        sendToRenderer(
            'update-status',
            currentProviderMode === 'qwen-omni-realtime' ? 'Qwen Omni 实时会话已连接' : 'Qwen 实时会话已连接'
        );
        return;
    }

    if (type === 'input_audio_buffer.speech_started') {
        qwenCurrentUserTranscript = '';
        logTransportEvent('qwen.speech_started', { itemId: event.item_id || null });
        sendToRenderer('update-status', '正在聆听…');
        return;
    }

    if (type === 'input_audio_buffer.speech_stopped') {
        logTransportEvent('qwen.speech_stopped', {
            itemId: event.item_id || null,
            reason: event.reason || 'valid_turn',
            audioEndMs: event.audio_end_ms ?? null,
        });
        return;
    }

    if (type === 'conversation.item.input_audio_transcription.delta') {
        // `stash` is provisional and can be replaced by a later event, so only
        // accumulate the confirmed text here. The completed event is authoritative.
        qwenCurrentUserTranscript += event.text || '';
        return;
    }

    if (type === 'conversation.item.input_audio_transcription.completed') {
        qwenCurrentUserTranscript = String(event.transcript || qwenCurrentUserTranscript).trim();
        logTransportEvent('qwen.transcription_completed', {
            itemId: event.item_id || null,
            transcriptChars: qwenCurrentUserTranscript.length,
        });
        return;
    }

    if (type === 'conversation.item.input_audio_transcription.failed') {
        logTransportEvent('qwen.transcription_failed', {
            itemId: event.item_id || null,
            error: event.error?.message || 'unknown',
        });
        return;
    }

    if (type === 'response.created') {
        qwenCurrentResponseId = event.response?.id || null;
        qwenCurrentResponseText = '';
        qwenFirstTokenAt = null;
        qwenResponseStartedAt = Date.now();
        logTransportEvent('qwen.response_started', { responseId: qwenCurrentResponseId });
        sendToRenderer('new-response', '');
        sendToRenderer('update-status', '正在生成回答…');
        return;
    }

    if (type === 'response.text.delta') {
        if (qwenFirstTokenAt === null) {
            qwenFirstTokenAt = Date.now();
            logTransportEvent('qwen.first_text_received', { responseId: qwenCurrentResponseId });
        }
        qwenCurrentResponseText += event.delta || '';
        sendToRenderer('update-response', qwenCurrentResponseText);
        return;
    }

    if (type === 'response.text.done') {
        qwenCurrentResponseText = String(event.text || qwenCurrentResponseText);
        sendToRenderer('update-response', qwenCurrentResponseText);
        return;
    }

    if (type === 'response.done') {
        const status = event.response?.status || 'completed';
        const responseId = event.response?.id || qwenCurrentResponseId;
        logTransportEvent('qwen.response_completed', {
            responseId,
            status,
            transcriptChars: qwenCurrentUserTranscript.length,
            responseChars: qwenCurrentResponseText.length,
            firstTextMs: qwenFirstTokenAt === null || qwenResponseStartedAt === null ? null : qwenFirstTokenAt - qwenResponseStartedAt,
            totalResponseMs: qwenResponseStartedAt === null ? null : Date.now() - qwenResponseStartedAt,
        });

        if (status === 'cancelled' || status === 'canceled') {
            // A partial answer must not become a completed conversation turn.
            sendToRenderer('discard-current-response', { responseId });
        } else if (qwenCurrentUserTranscript && qwenCurrentResponseText.trim()) {
            saveConversationTurn(qwenCurrentUserTranscript, qwenCurrentResponseText);
        }

        qwenCurrentResponseId = null;
        qwenCurrentResponseText = '';
        qwenFirstTokenAt = null;
        qwenResponseStartedAt = null;
        sendToRenderer('update-status', '正在聆听…');
        return;
    }

    if (type === 'error') {
        const message = event.error?.message || 'Qwen 实时接口返回未知错误';
        logTransportEvent('qwen.api_error', {
            errorType: event.error?.type || null,
            code: event.error?.code || null,
            message,
        });
        sendToRenderer('update-status', 'Qwen 错误：' + message);
        return;
    }

    if (type === 'transport.error' || type === 'transport.closed') {
        if (!event.userInitiated) {
            const message = event.error?.message || `Qwen 连接已关闭（${event.code || 'unknown'}）`;
            sendToRenderer('update-status', 'Qwen 连接中断：' + message);
        }
    }
}

async function initializeQwenRealtimeSession(
    apiKey,
    model = DEFAULT_QWEN_REALTIME_MODEL,
    customPrompt = '',
    profile = 'interview',
    language = 'cmn-CN'
) {
    if (!apiKey || !apiKey.trim()) return false;

    closeQwenRealtimeSession();
    currentProviderMode = 'qwen-realtime';
    currentQwenApiKey = apiKey.trim();
    qwenCurrentUserTranscript = '';
    qwenCurrentResponseText = '';
    initializeNewSession(profile, customPrompt);

    const session = new QwenRealtimeSession({
        apiKey: apiKey.trim(),
        model: model || DEFAULT_QWEN_REALTIME_MODEL,
        language,
        instructions: getQwenSystemPrompt(profile, customPrompt, language),
        onEvent: handleQwenRealtimeEvent,
    });
    qwenRealtimeSession = session;

    try {
        await session.connect();
        return true;
    } catch (error) {
        console.error('[QwenRealtime] Initialization failed:', error.message);
        logTransportEvent('qwen.initialization_failed', { error: error.message });
        closeQwenRealtimeSession();
        currentProviderMode = 'byok';
        sendToRenderer('update-status', 'Qwen 初始化失败：' + error.message);
        return false;
    }
}

async function initializeQwenOmniRealtimeSession(
    apiKey,
    model = DEFAULT_QWEN_OMNI_REALTIME_MODEL,
    workspaceId = '',
    customPrompt = '',
    profile = 'interview',
    language = 'cmn-CN'
) {
    if (!apiKey || !apiKey.trim()) return false;
    if (!workspaceId || !String(workspaceId).trim()) {
        sendToRenderer('update-status', 'Qwen Omni 初始化失败：缺少 Workspace ID');
        return false;
    }

    closeQwenRealtimeSession();
    currentProviderMode = 'qwen-omni-realtime';
    currentQwenApiKey = apiKey.trim();
    qwenCurrentUserTranscript = '';
    qwenCurrentResponseText = '';
    initializeNewSession(profile, customPrompt);

    const session = new QwenRealtimeSession({
        apiKey: apiKey.trim(),
        model: model || DEFAULT_QWEN_OMNI_REALTIME_MODEL,
        language,
        workspaceId: String(workspaceId).trim(),
        turnDetection: 'semantic_vad',
        maxHistoryTurns: 20,
        instructions: getQwenSystemPrompt(profile, customPrompt, language),
        onEvent: handleQwenRealtimeEvent,
    });
    qwenRealtimeSession = session;

    try {
        await session.connect();
        return true;
    } catch (error) {
        console.error('[QwenOmniRealtime] Initialization failed:', error.message);
        logTransportEvent('qwen_omni.initialization_failed', { error: error.message });
        closeQwenRealtimeSession();
        currentProviderMode = 'byok';
        sendToRenderer('update-status', 'Qwen Omni 初始化失败：' + error.message);
        return false;
    }
}

function closeQwenRealtimeSession() {
    if (qwenRealtimeSession) {
        qwenRealtimeSession.close();
        qwenRealtimeSession = null;
    }
    qwenCurrentUserTranscript = '';
    qwenCurrentResponseText = '';
    qwenCurrentResponseId = null;
    qwenResponseStartedAt = null;
    currentQwenApiKey = '';
}

// Build context message for session restoration
function buildContextMessage() {
    const lastTurns = conversationHistory.slice(-20);
    const validTurns = lastTurns.filter(turn => turn.transcription?.trim() && turn.ai_response?.trim());

    if (validTurns.length === 0) return null;

    const contextLines = validTurns.map(turn => `[Interviewer]: ${turn.transcription.trim()}\n[Your answer]: ${turn.ai_response.trim()}`);

    return `Session reconnected. Here's the conversation so far:\n\n${contextLines.join('\n\n')}\n\nContinue from here.`;
}

// Conversation management functions
function initializeNewSession(profile = null, customPrompt = null) {
    currentSessionId = Date.now().toString();
    startTransportLog(currentSessionId);
    currentTranscription = '';
    groqRequestStartedForTurn = false;
    conversationHistory = [];
    screenAnalysisHistory = [];
    groqConversationHistory = [];
    currentProfile = profile;
    currentCustomPrompt = customPrompt;
    console.log('New conversation session started:', currentSessionId, 'profile:', profile);

    // Save initial session with profile context
    if (profile) {
        sendToRenderer('save-session-context', {
            sessionId: currentSessionId,
            profile: profile,
            customPrompt: customPrompt || '',
        });
    }
}

function saveConversationTurn(transcription, aiResponse) {
    if (!currentSessionId) {
        initializeNewSession();
    }

    const conversationTurn = {
        timestamp: Date.now(),
        transcription: transcription.trim(),
        ai_response: aiResponse.trim(),
    };

    conversationHistory.push(conversationTurn);
    console.log('Saved conversation turn:', conversationTurn);

    // Send to renderer to save in IndexedDB
    sendToRenderer('save-conversation-turn', {
        sessionId: currentSessionId,
        turn: conversationTurn,
        fullHistory: conversationHistory,
    });
}

function saveScreenAnalysis(prompt, response, model) {
    if (!currentSessionId) {
        initializeNewSession();
    }

    const analysisEntry = {
        timestamp: Date.now(),
        prompt: prompt,
        response: response.trim(),
        model: model,
    };

    screenAnalysisHistory.push(analysisEntry);
    console.log('Saved screen analysis:', analysisEntry);

    // Send to renderer to save
    sendToRenderer('save-screen-analysis', {
        sessionId: currentSessionId,
        analysis: analysisEntry,
        fullHistory: screenAnalysisHistory,
        profile: currentProfile,
        customPrompt: currentCustomPrompt,
    });
}

function getCurrentSessionData() {
    return {
        sessionId: currentSessionId,
        history: conversationHistory,
    };
}

async function getEnabledTools() {
    const tools = [];

    // Check if Google Search is enabled (default: true)
    const googleSearchEnabled = await getStoredSetting('googleSearchEnabled', 'true');
    console.log('Google Search enabled:', googleSearchEnabled);

    if (googleSearchEnabled === 'true') {
        tools.push({ googleSearch: {} });
        console.log('Added Google Search tool');
    } else {
        console.log('Google Search tool disabled');
    }

    return tools;
}

async function getStoredSetting(key, defaultValue) {
    try {
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
            // Wait a bit for the renderer to be ready
            await new Promise(resolve => setTimeout(resolve, 100));

            // Try to get setting from renderer process localStorage
            const value = await windows[0].webContents.executeJavaScript(`
                (function() {
                    try {
                        if (typeof localStorage === 'undefined') {
                            console.log('localStorage not available yet for ${key}');
                            return '${defaultValue}';
                        }
                        const stored = localStorage.getItem('${key}');
                        console.log('Retrieved setting ${key}:', stored);
                        return stored || '${defaultValue}';
                    } catch (e) {
                        console.error('Error accessing localStorage for ${key}:', e);
                        return '${defaultValue}';
                    }
                })()
            `);
            return value;
        }
    } catch (error) {
        console.error('Error getting stored setting for', key, ':', error.message);
    }
    console.log('Using default value for', key, ':', defaultValue);
    return defaultValue;
}

// helper to check if groq has been configured
function hasGroqKey() {
    const key = getGroqApiKey();
    return key && key.trim() != '';
}

function getDeepSeekKey() {
    return currentDeepSeekApiKey || getDeepSeekApiKey();
}

async function readDeepSeekStream(response, onText) {
    if (!response.body) {
        const payload = await response.json();
        const text = payload.choices?.[0]?.message?.content || '';
        if (text) onText(text);
        return text;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending = '';
    let fullText = '';

    const consumeLine = line => {
        if (!line.startsWith('data:')) return;
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') return;

        try {
            const event = JSON.parse(data);
            const token = event.choices?.[0]?.delta?.content || '';
            if (token) {
                fullText += token;
                onText(fullText);
            }
        } catch (error) {
            logTransportEvent('deepseek.stream_parse_error', { error: error.message });
        }
    };

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        pending += decoder.decode(value, { stream: true });
        const lines = pending.split(/\r?\n/);
        pending = lines.pop() || '';
        lines.forEach(consumeLine);
    }

    if (pending) consumeLine(pending);
    return fullText;
}

function normalizeQwenVisionText(value) {
    if (typeof value === 'string') return value;
    if (!Array.isArray(value)) return '';

    return value
        .map(part => {
            if (typeof part === 'string') return part;
            return typeof part?.text === 'string' ? part.text : '';
        })
        .join('');
}

async function readQwenVisionStream(response, onText, onReasoning) {
    if (!response.body) {
        const payload = await response.json();
        const message = payload.choices?.[0]?.message || {};
        const text = normalizeQwenVisionText(message.content);
        const reasoning = normalizeQwenVisionText(message.reasoning_content);
        if (reasoning) onReasoning(reasoning);
        if (text) onText(text);
        return { text, reasoningChars: reasoning.length };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending = '';
    let fullText = '';
    let reasoningChars = 0;

    const consumeLine = line => {
        if (!line.startsWith('data:')) return;
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') return;

        try {
            const event = JSON.parse(data);
            const delta = event.choices?.[0]?.delta || {};
            const reasoning = normalizeQwenVisionText(delta.reasoning_content);
            const token = normalizeQwenVisionText(delta.content);

            if (reasoning) {
                reasoningChars += reasoning.length;
                onReasoning(reasoning);
            }

            if (token) {
                fullText += token;
                onText(fullText);
            }
        } catch (error) {
            logTransportEvent('qwen.vision.stream_parse_error', { error: error.message });
        }
    };

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        pending += decoder.decode(value, { stream: true });
        const lines = pending.split(/\r?\n/);
        pending = lines.pop() || '';
        lines.forEach(consumeLine);
    }

    if (pending) consumeLine(pending);
    return { text: fullText, reasoningChars };
}

const DEFAULT_QWEN_VISION_PROMPT = `
你是中文算法面试助手，请分析这张截图中的题目、代码或报错信息。

请优先回答：
1. 题目要求以及输入输出含义
2. 核心算法思路
3. 代码关键逻辑或修正方案
4. 边界情况
5. 时间复杂度和空间复杂度
6. 一段可以直接在面试中口述的简洁答案

如果截图中的代码或文字看不清，不要自行猜测，请明确指出需要重新截取的区域。
请使用简体中文，直接给出有用答案，不要描述你正在进行图片识别。
`.trim();

async function sendImageToQwenVision(base64Data, prompt) {
    const apiKey = currentQwenApiKey.trim();
    if (!apiKey) {
        return { success: false, error: '没有配置 Qwen API 密钥' };
    }

    const config = getConfig();
    const model = config.qwenVisionModel || DEFAULT_QWEN_VISION_MODEL;
    const endpoint = process.env.QWEN_VISION_ENDPOINT || DEFAULT_QWEN_VISION_ENDPOINT;
    const imageBytes = Buffer.byteLength(base64Data, 'base64');
    const startedAt = Date.now();
    let firstTokenAt = null;
    let reasoningChars = 0;
    let hasDisplayedResponse = false;

    const visionPrompt = [
        DEFAULT_QWEN_VISION_PROMPT,
        prompt?.trim() || '',
        currentCustomPrompt?.trim() ? `用户补充要求：\n${currentCustomPrompt.trim()}` : '',
    ]
        .filter(Boolean)
        .join('\n\n');

    logTransportEvent('qwen.vision.request_started', {
        model,
        imageBytes,
        base64Chars: base64Data.length,
        promptChars: visionPrompt.length,
        thinkingEnabled: true,
    });

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: visionPrompt },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/jpeg;base64,${base64Data}`,
                                },
                            },
                        ],
                    },
                ],
                stream: true,
                enable_thinking: true,
            }),
        });

        logTransportEvent('qwen.vision.http_response', {
            status: response.status,
            elapsedMs: Date.now() - startedAt,
        });

        if (!response.ok) {
            const errorText = await response.text();
            logTransportEvent('qwen.vision.http_error', {
                status: response.status,
                elapsedMs: Date.now() - startedAt,
                errorChars: errorText.length,
            });
            throw new Error(`Qwen 视觉接口返回 HTTP ${response.status}`);
        }

        const streamResult = await readQwenVisionStream(
            response,
            fullText => {
                if (firstTokenAt === null) {
                    firstTokenAt = Date.now();
                    logTransportEvent('qwen.vision.first_token', {
                        elapsedMs: firstTokenAt - startedAt,
                    });
                }

                sendToRenderer(hasDisplayedResponse ? 'update-response' : 'new-response', fullText);
                hasDisplayedResponse = true;
            },
            reasoning => {
                reasoningChars += reasoning.length;
            }
        );

        const fullText = streamResult.text.trim();
        reasoningChars = Math.max(reasoningChars, streamResult.reasoningChars);
        if (!fullText) {
            throw new Error('Qwen 视觉接口返回空答案');
        }

        saveScreenAnalysis(visionPrompt, fullText, model);
        logTransportEvent('qwen.vision.completed', {
            model,
            elapsedMs: Date.now() - startedAt,
            firstTokenMs: firstTokenAt === null ? null : firstTokenAt - startedAt,
            reasoningChars,
            responseChars: fullText.length,
        });
        sendToRenderer('update-status', '正在聆听…');
        return { success: true, text: fullText, model };
    } catch (error) {
        logTransportEvent('qwen.vision.failed', {
            model,
            elapsedMs: Date.now() - startedAt,
            firstTokenMs: firstTokenAt === null ? null : firstTokenAt - startedAt,
            reasoningChars,
            error: error.message,
        });
        console.error('Error calling Qwen vision API:', error.message);
        sendToRenderer('update-status', 'Qwen 视觉错误：' + error.message);
        return { success: false, error: error.message };
    }
}

async function requestDeepSeek(messages, onText) {
    const apiKey = getDeepSeekKey();
    if (!apiKey) {
        throw new Error('No DeepSeek API key configured');
    }

    const startedAt = Date.now();
    let firstTokenAt = null;
    const model = currentDeepSeekModel || 'deepseek-flash';
    const timedOnText = text => {
        if (firstTokenAt === null) {
            firstTokenAt = Date.now();
            logTransportEvent('deepseek.first_token', {
                elapsedMs: firstTokenAt - startedAt,
                textChars: text.length,
            });
        }
        onText(text);
    };

    logTransportEvent('deepseek.request_started', {
        model,
        messageCount: messages.length,
        inputChars: messages.reduce((total, message) => total + String(message.content || '').length, 0),
    });

    try {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                messages,
                stream: true,
                thinking: { type: 'disabled' },
                temperature: 0.4,
                max_tokens: 2048,
            }),
        });

        logTransportEvent('deepseek.http_response', {
            status: response.status,
            elapsedMs: Date.now() - startedAt,
        });

        if (!response.ok) {
            const errorText = await response.text();
            logTransportEvent('deepseek.http_error', {
                status: response.status,
                elapsedMs: Date.now() - startedAt,
            });
            throw new Error(`DeepSeek API returned HTTP ${response.status}: ${errorText.slice(0, 500)}`);
        }

        const fullText = await readDeepSeekStream(response, timedOnText);
        logTransportEvent('deepseek.completed', {
            elapsedMs: Date.now() - startedAt,
            firstTokenMs: firstTokenAt === null ? null : firstTokenAt - startedAt,
            responseChars: fullText.length,
        });
        return fullText;
    } catch (error) {
        logTransportEvent('deepseek.failed', {
            elapsedMs: Date.now() - startedAt,
            firstTokenMs: firstTokenAt === null ? null : firstTokenAt - startedAt,
            error: error.message,
        });
        throw error;
    }
}

async function sendToDeepSeek(transcription) {
    if (!transcription || transcription.trim() === '') return '';

    const trimmedText = transcription.trim();
    const turnStartedAt = Date.now();
    deepseekConversationHistory.push({ role: 'user', content: trimmedText });
    if (deepseekConversationHistory.length > 20) {
        deepseekConversationHistory = deepseekConversationHistory.slice(-20);
    }

    try {
        logTransportEvent('deepseek.turn_started', {
            transcriptChars: trimmedText.length,
            historyMessages: deepseekConversationHistory.length,
        });
        let isFirst = true;
        const fullText = await requestDeepSeek(
            [{ role: 'system', content: currentSystemPrompt || 'You are a helpful assistant.' }, ...deepseekConversationHistory],
            text => {
                const displayText = stripThinkingTags(text);
                if (displayText) {
                    sendToRenderer(isFirst ? 'new-response' : 'update-response', displayText);
                    isFirst = false;
                }
            }
        );

        const cleanedResponse = stripThinkingTags(fullText);
        if (cleanedResponse) {
            deepseekConversationHistory.push({ role: 'assistant', content: cleanedResponse });
            saveConversationTurn(trimmedText, cleanedResponse);
        }

        logTransportEvent('deepseek.turn_completed', {
            elapsedMs: Date.now() - turnStartedAt,
            responseChars: cleanedResponse.length,
        });
        sendToRenderer('update-status', 'Listening...');
        return cleanedResponse;
    } catch (error) {
        logTransportEvent('deepseek.turn_failed', {
            elapsedMs: Date.now() - turnStartedAt,
            error: error.message,
        });
        console.error('Error calling DeepSeek API:', error.message);
        sendToRenderer('update-status', 'DeepSeek error: ' + error.message);
        return '';
    }
}

async function sendImageToDeepSeek(base64Data, prompt) {
    try {
        let isFirst = true;
        const messages = [
            { role: 'system', content: currentSystemPrompt || 'You are a helpful assistant.' },
            ...deepseekConversationHistory.slice(-10),
            {
                role: 'user',
                content: [
                    { type: 'text', text: prompt || 'Analyze this image and provide the most useful concise answer.' },
                    {
                        type: 'image_url',
                        image_url: { url: `data:image/jpeg;base64,${base64Data}` },
                    },
                ],
            },
        ];

        const fullText = await requestDeepSeek(messages, text => {
            const displayText = stripThinkingTags(text);
            if (displayText) {
                sendToRenderer(isFirst ? 'new-response' : 'update-response', displayText);
                isFirst = false;
            }
        });
        const cleanedResponse = stripThinkingTags(fullText);

        if (!cleanedResponse) {
            return { success: false, error: 'DeepSeek returned an empty response' };
        }

        saveScreenAnalysis(prompt, cleanedResponse, currentDeepSeekModel || 'deepseek-flash');
        sendToRenderer('update-status', 'Listening...');
        return { success: true, text: cleanedResponse, model: currentDeepSeekModel || 'deepseek-flash' };
    } catch (error) {
        console.error('Error calling DeepSeek vision API:', error.message);
        sendToRenderer('update-status', 'DeepSeek error: ' + error.message);
        return { success: false, error: error.message };
    }
}

function sendFinalTranscriptionToGroq() {
    if (!hasGroqKey() || groqRequestStartedForTurn) {
        return;
    }

    const transcription = currentTranscription.trim();
    if (transcription === '') {
        return;
    }

    groqRequestStartedForTurn = true;
    sendToGroq(transcription);
}

function trimConversationHistoryForGemma(history, maxChars = 42000) {
    if (!history || history.length === 0) return [];
    let totalChars = 0;
    const trimmed = [];

    for (let i = history.length - 1; i >= 0; i--) {
        const turn = history[i];
        const turnChars = (turn.content || '').length;

        if (totalChars + turnChars > maxChars) break;
        totalChars += turnChars;
        trimmed.unshift(turn);
    }
    return trimmed;
}

function stripThinkingTags(text) {
    const trimmedStart = text.trimStart();
    if ('<think>'.startsWith(trimmedStart)) {
        return '';
    }

    return text.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '').trim();
}

function getGroqReasoningOptions(model, disableThinking) {
    if (model.includes('qwen3')) {
        const options = {
            reasoning_format: 'hidden',
        };

        if (disableThinking) {
            options.reasoning_effort = 'none';
        }

        return options;
    }

    if (model.startsWith('openai/gpt-oss-')) {
        return {
            include_reasoning: false,
        };
    }

    return {};
}

async function sendToGroq(transcription) {
    const groqApiKey = getGroqApiKey();
    if (!groqApiKey) {
        console.log('No Groq API key configured, skipping Groq response');
        return;
    }

    if (!transcription || transcription.trim() === '') {
        console.log('Empty transcription, skipping Groq');
        return;
    }

    const config = getConfig();
    const modelToUse = config.groqModel;

    console.log(`Sending to Groq (${modelToUse}):`, transcription.substring(0, 100) + '...');
    logTransportEvent('groq.text.request', {
        model: modelToUse,
        transcription,
    });

    groqConversationHistory.push({
        role: 'user',
        content: transcription.trim(),
    });

    if (groqConversationHistory.length > 20) {
        groqConversationHistory = groqConversationHistory.slice(-20);
    }

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${groqApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: modelToUse,
                messages: [{ role: 'system', content: currentSystemPrompt || 'You are a helpful assistant.' }, ...groqConversationHistory],
                stream: true,
                temperature: 0.7,
                max_completion_tokens: GROQ_MAX_COMPLETION_TOKENS,
                ...getGroqReasoningOptions(modelToUse, config.disableGroqThinking),
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Groq API error:', response.status, errorText);
            logTransportEvent('groq.text.http_error', {
                status: response.status,
                body: errorText,
            });
            sendToRenderer('update-status', `Groq error: ${response.status}`);
            return;
        }

        logTransportEvent('groq.text.http_response', {
            status: response.status,
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let isFirst = true;
        let finishReason = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            logTransportEvent('groq.text.stream_chunk', { chunk });
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;

                    try {
                        const json = JSON.parse(data);
                        logTransportEvent('groq.text.stream_event', json);
                        finishReason = json.choices?.[0]?.finish_reason || finishReason;
                        const token = json.choices?.[0]?.delta?.content || '';
                        if (token) {
                            fullText += token;
                            const displayText = stripThinkingTags(fullText);
                            if (displayText) {
                                sendToRenderer(isFirst ? 'new-response' : 'update-response', displayText);
                                isFirst = false;
                            }
                        }
                    } catch (parseError) {
                        logTransportEvent('groq.text.stream_parse_error', {
                            data,
                            error: parseError.message,
                        });
                    }
                }
            }
        }

        const cleanedResponse = stripThinkingTags(fullText);
        const modelKey = modelToUse.split('/').pop();

        const systemPromptChars = (currentSystemPrompt || 'You are a helpful assistant.').length;
        const historyChars = groqConversationHistory.reduce((sum, msg) => sum + (msg.content || '').length, 0);
        const inputChars = systemPromptChars + historyChars;
        const outputChars = cleanedResponse.length;

        incrementCharUsage('groq', modelKey, inputChars + outputChars);

        if (cleanedResponse) {
            groqConversationHistory.push({
                role: 'assistant',
                content: cleanedResponse,
            });

            saveConversationTurn(transcription, cleanedResponse);
        } else {
            console.warn(`Groq returned no final answer (${modelToUse})`);
            logTransportEvent('groq.text.empty_response', {
                model: modelToUse,
                fullText,
                finishReason,
            });
            sendToRenderer('new-response', GROQ_EMPTY_RESPONSE_MESSAGE);
            sendToRenderer('update-status', 'Groq reached the completion-token limit');
            return;
        }

        logTransportEvent('groq.text.completed', {
            model: modelToUse,
            response: cleanedResponse,
        });
        console.log(`Groq response completed (${modelToUse})`);
        sendToRenderer('update-status', 'Listening...');
    } catch (error) {
        console.error('Error calling Groq API:', error);
        logTransportEvent('groq.text.error', {
            error: error.message,
            stack: error.stack,
        });
        sendToRenderer('update-status', 'Groq error: ' + error.message);
    }
}

async function sendImageToGroq(base64Data, prompt) {
    const groqApiKey = getGroqApiKey();
    const config = getConfig();
    const model = config.groqImageModel;

    logTransportEvent('groq.image.request', {
        model,
        prompt,
        imageBytes: Buffer.byteLength(base64Data, 'base64'),
    });

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${groqApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: currentSystemPrompt || 'You are a helpful assistant.' },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/jpeg;base64,${base64Data}`,
                                },
                            },
                        ],
                    },
                ],
                stream: true,
                temperature: 0.7,
                max_completion_tokens: GROQ_MAX_COMPLETION_TOKENS,
                ...getGroqReasoningOptions(model, config.disableGroqThinking),
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Groq image API error:', response.status, errorText);
            logTransportEvent('groq.image.http_error', {
                status: response.status,
                body: errorText,
            });
            return { success: false, error: `Groq error: ${response.status}` };
        }

        logTransportEvent('groq.image.http_response', {
            status: response.status,
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let isFirst = true;
        let finishReason = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            logTransportEvent('groq.image.stream_chunk', { chunk });
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;

                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                    const json = JSON.parse(data);
                    logTransportEvent('groq.image.stream_event', json);
                    finishReason = json.choices?.[0]?.finish_reason || finishReason;
                    const token = json.choices?.[0]?.delta?.content || '';
                    if (!token) continue;

                    fullText += token;
                    const displayText = stripThinkingTags(fullText);
                    if (displayText) {
                        sendToRenderer(isFirst ? 'new-response' : 'update-response', displayText);
                        isFirst = false;
                    }
                } catch (parseError) {
                    logTransportEvent('groq.image.stream_parse_error', {
                        data,
                        error: parseError.message,
                    });
                }
            }
        }

        const cleanedResponse = stripThinkingTags(fullText);
        if (!cleanedResponse) {
            logTransportEvent('groq.image.empty_response', {
                model,
                fullText,
                finishReason,
            });
            return { success: false, error: GROQ_EMPTY_RESPONSE_MESSAGE };
        }

        saveScreenAnalysis(prompt, cleanedResponse, model);
        logTransportEvent('groq.image.completed', {
            model,
            response: cleanedResponse,
        });
        return { success: true, text: cleanedResponse, model };
    } catch (error) {
        console.error('Error calling Groq image API:', error);
        logTransportEvent('groq.image.error', {
            error: error.message,
            stack: error.stack,
        });
        return { success: false, error: error.message };
    }
}

async function sendToGemma(transcription) {
    const apiKey = getApiKey();
    if (!apiKey) {
        console.log('No Gemini API key configured');
        return;
    }

    if (!transcription || transcription.trim() === '') {
        console.log('Empty transcription, skipping Gemma');
        return;
    }

    console.log('Sending to Gemma:', transcription.substring(0, 100) + '...');

    groqConversationHistory.push({
        role: 'user',
        content: transcription.trim(),
    });

    const trimmedHistory = trimConversationHistoryForGemma(groqConversationHistory, 42000);

    try {
        const ai = new GoogleGenAI({ apiKey: apiKey });

        const messages = trimmedHistory.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
        }));

        const systemPrompt = currentSystemPrompt || 'You are a helpful assistant.';
        const messagesWithSystem = [
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] },
            ...messages,
        ];

        const response = await ai.models.generateContentStream({
            model: 'gemma-4-26b-a4b-it',
            contents: messagesWithSystem,
        });

        let fullText = '';
        let isFirst = true;

        for await (const chunk of response) {
            const chunkText = chunk.text;
            if (chunkText) {
                fullText += chunkText;
                sendToRenderer(isFirst ? 'new-response' : 'update-response', fullText);
                isFirst = false;
            }
        }

        const systemPromptChars = (currentSystemPrompt || 'You are a helpful assistant.').length;
        const historyChars = trimmedHistory.reduce((sum, msg) => sum + (msg.content || '').length, 0);
        const inputChars = systemPromptChars + historyChars;
        const outputChars = fullText.length;

        incrementCharUsage('gemini', 'gemma-4-26b-a4b-it', inputChars + outputChars);

        if (fullText.trim()) {
            groqConversationHistory.push({
                role: 'assistant',
                content: fullText.trim(),
            });

            if (groqConversationHistory.length > 40) {
                groqConversationHistory = groqConversationHistory.slice(-40);
            }

            saveConversationTurn(transcription, fullText);
        }

        console.log('Gemma response completed');
        sendToRenderer('update-status', 'Listening...');
    } catch (error) {
        console.error('Error calling Gemma API:', error);
        sendToRenderer('update-status', 'Gemma error: ' + error.message);
    }
}

async function initializeGeminiSession(apiKey, customPrompt = '', profile = 'interview', language = 'en-US', isReconnect = false) {
    if (isInitializingSession) {
        console.log('Session initialization already in progress');
        return false;
    }

    isInitializingSession = true;
    if (!isReconnect) {
        sendToRenderer('session-initializing', true);
    }

    // Store params for reconnection
    if (!isReconnect) {
        sessionParams = { apiKey, customPrompt, profile, language };
        reconnectAttempts = 0;
    }

    const client = new GoogleGenAI({
        vertexai: false,
        apiKey: apiKey,
        httpOptions: { apiVersion: 'v1alpha' },
    });

    // Get enabled tools first to determine Google Search status
    const enabledTools = await getEnabledTools();
    const googleSearchEnabled = enabledTools.some(tool => tool.googleSearch);

    const systemPrompt = getSystemPrompt(profile, customPrompt, googleSearchEnabled);
    currentSystemPrompt = systemPrompt; // Store for Groq

    // Initialize new conversation session only on first connect
    if (!isReconnect) {
        initializeNewSession(profile, customPrompt);
    }

    try {
        const session = await client.live.connect({
            model: getConfig().geminiLiveModel,
            callbacks: {
                onopen: function () {
                    logTransportEvent('gemini.live.opened', {});
                    sendToRenderer('update-status', 'Live session connected');
                },
                onmessage: function (message) {
                    console.log('----------------', message);
                    logTransportEvent('gemini.live.message', message);

                    // Handle input transcription (what was spoken)
                    if (message.serverContent?.inputTranscription?.results) {
                        currentTranscription += formatSpeakerResults(message.serverContent.inputTranscription.results);
                    } else if (message.serverContent?.inputTranscription?.text) {
                        const text = message.serverContent.inputTranscription.text;
                        if (text.trim() !== '') {
                            currentTranscription += text;
                        }
                    }

                    if (message.serverContent?.inputTranscription) {
                        sendFinalTranscriptionToGroq();
                    }

                    if (!hasGroqKey() && message.serverContent?.outputTranscription?.text) {
                        const isFirstChunk = messageBuffer === '';
                        messageBuffer += message.serverContent.outputTranscription.text;
                        sendToRenderer(isFirstChunk ? 'new-response' : 'update-response', messageBuffer);
                    }

                    if (message.serverContent?.generationComplete) {
                        if (currentTranscription.trim() !== '') {
                            if (!hasGroqKey() && messageBuffer.trim() !== '') {
                                saveConversationTurn(currentTranscription, messageBuffer);
                            }
                            currentTranscription = '';
                        }
                        messageBuffer = '';
                    }

                    if (message.serverContent?.turnComplete) {
                        currentTranscription = '';
                        messageBuffer = '';
                        groqRequestStartedForTurn = false;
                        sendToRenderer('update-status', 'Listening...');
                    }
                },
                onerror: function (e) {
                    console.log('Session error:', e.message);
                    logTransportEvent('gemini.live.error', {
                        error: e.message,
                    });
                    sendToRenderer('update-status', 'Error: ' + e.message);
                },
                onclose: function (e) {
                    console.log('Session closed:', e.reason);
                    logTransportEvent('gemini.live.closed', {
                        reason: e.reason,
                    });

                    // Don't reconnect if user intentionally closed
                    if (isUserClosing) {
                        isUserClosing = false;
                        closeTransportLog();
                        sendToRenderer('update-status', 'Session closed');
                        return;
                    }

                    // Attempt reconnection
                    if (sessionParams && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                        attemptReconnect();
                    } else {
                        closeTransportLog();
                        sendToRenderer('update-status', 'Session closed');
                    }
                },
            },
            config: {
                responseModalities: [Modality.AUDIO],
                proactivity: { proactiveAudio: true },
                outputAudioTranscription: {},
                tools: enabledTools,
                // Enable speaker diarization
                inputAudioTranscription: {
                    enableSpeakerDiarization: true,
                    minSpeakerCount: 2,
                    maxSpeakerCount: 2,
                },
                contextWindowCompression: { slidingWindow: {} },
                speechConfig: { languageCode: language },
                systemInstruction: {
                    parts: [{ text: systemPrompt }],
                },
            },
        });

        isInitializingSession = false;
        if (!isReconnect) {
            sendToRenderer('session-initializing', false);
        }
        return session;
    } catch (error) {
        console.error('Failed to initialize Gemini session:', error);
        isInitializingSession = false;
        if (!isReconnect) {
            sendToRenderer('session-initializing', false);
        }
        return null;
    }
}

async function attemptReconnect() {
    reconnectAttempts++;
    console.log(`Reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);

    // Clear stale buffers
    messageBuffer = '';
    currentTranscription = '';
    // Don't reset groqConversationHistory to preserve context across reconnects

    sendToRenderer('update-status', `Reconnecting... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);

    // Wait before attempting
    await new Promise(resolve => setTimeout(resolve, RECONNECT_DELAY));

    try {
        const session = await initializeGeminiSession(
            sessionParams.apiKey,
            sessionParams.customPrompt,
            sessionParams.profile,
            sessionParams.language,
            true // isReconnect
        );

        if (session && global.geminiSessionRef) {
            global.geminiSessionRef.current = session;

            // Restore context from conversation history via text message
            const contextMessage = buildContextMessage();
            if (contextMessage) {
                try {
                    console.log('Restoring conversation context...');
                    await session.sendRealtimeInput({ text: contextMessage });
                } catch (contextError) {
                    console.error('Failed to restore context:', contextError);
                    // Continue without context - better than failing
                }
            }

            // Don't reset reconnectAttempts here - let it reset on next fresh session
            sendToRenderer('update-status', 'Reconnected! Listening...');
            console.log('Session reconnected successfully');
            return true;
        }
    } catch (error) {
        console.error(`Reconnection attempt ${reconnectAttempts} failed:`, error);
    }

    // If we still have attempts left, try again
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        return attemptReconnect();
    }

    // Max attempts reached - notify frontend
    console.log('Max reconnection attempts reached');
    sendToRenderer('reconnect-failed', {
        message: 'Tried 3 times to reconnect. Must be upstream/network issues. Try restarting or download updated app from site.',
    });
    sessionParams = null;
    return false;
}

function killExistingSystemAudioDump() {
    return new Promise(resolve => {
        console.log('Checking for existing SystemAudioDump processes...');

        // Kill any existing SystemAudioDump processes
        const killProc = spawn('pkill', ['-f', 'SystemAudioDump'], {
            stdio: 'ignore',
        });

        killProc.on('close', code => {
            if (code === 0) {
                console.log('Killed existing SystemAudioDump processes');
            } else {
                console.log('No existing SystemAudioDump processes found');
            }
            resolve();
        });

        killProc.on('error', err => {
            console.log('Error checking for existing processes (this is normal):', err.message);
            resolve();
        });

        // Timeout after 2 seconds
        setTimeout(() => {
            killProc.kill();
            resolve();
        }, 2000);
    });
}

async function startMacOSAudioCapture(geminiSessionRef) {
    if (process.platform !== 'darwin') return false;

    // Kill any existing SystemAudioDump processes first
    await killExistingSystemAudioDump();

    console.log('Starting macOS audio capture with SystemAudioDump...');

    const { app } = require('electron');
    const path = require('path');

    let systemAudioPath;
    if (app.isPackaged) {
        systemAudioPath = path.join(process.resourcesPath, 'SystemAudioDump');
    } else {
        systemAudioPath = path.join(__dirname, '../assets', 'SystemAudioDump');
    }

    console.log('SystemAudioDump path:', systemAudioPath);

    const spawnOptions = {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
            ...process.env,
        },
    };

    systemAudioProc = spawn(systemAudioPath, [], spawnOptions);

    if (!systemAudioProc.pid) {
        console.error('Failed to start SystemAudioDump');
        return false;
    }

    console.log('SystemAudioDump started with PID:', systemAudioProc.pid);

    const CHUNK_DURATION = 0.1;
    const SAMPLE_RATE = 24000;
    const BYTES_PER_SAMPLE = 2;
    const CHANNELS = 2;
    const CHUNK_SIZE = SAMPLE_RATE * BYTES_PER_SAMPLE * CHANNELS * CHUNK_DURATION;

    let audioBuffer = Buffer.alloc(0);

    systemAudioProc.stdout.on('data', data => {
        audioBuffer = Buffer.concat([audioBuffer, data]);

        while (audioBuffer.length >= CHUNK_SIZE) {
            const chunk = audioBuffer.slice(0, CHUNK_SIZE);
            audioBuffer = audioBuffer.slice(CHUNK_SIZE);

            const monoChunk = CHANNELS === 2 ? convertStereoToMono(chunk) : chunk;

            if (currentProviderMode === 'qwen-realtime' || currentProviderMode === 'qwen-omni-realtime') {
                if (qwenRealtimeSession) {
                    qwenRealtimeSession.sendAudio(monoChunk);
                }
            } else if (currentProviderMode === 'cloud') {
                sendCloudAudio(monoChunk);
            } else if (currentProviderMode === 'local') {
                getLocalAi().processLocalAudio(monoChunk);
            } else if (currentProviderMode === 'deepseek') {
                getLocalAi().processLocalAudio(monoChunk);
            } else {
                const base64Data = monoChunk.toString('base64');
                sendAudioToGemini(base64Data, geminiSessionRef);
            }

            if (process.env.DEBUG_AUDIO) {
                console.log(`Processed audio chunk: ${chunk.length} bytes`);
                saveDebugAudio(monoChunk, 'system_audio');
            }
        }

        const maxBufferSize = SAMPLE_RATE * BYTES_PER_SAMPLE * 1;
        if (audioBuffer.length > maxBufferSize) {
            audioBuffer = audioBuffer.slice(-maxBufferSize);
        }
    });

    systemAudioProc.stderr.on('data', data => {
        console.error('SystemAudioDump stderr:', data.toString());
    });

    systemAudioProc.on('close', code => {
        console.log('SystemAudioDump process closed with code:', code);
        systemAudioProc = null;
    });

    systemAudioProc.on('error', err => {
        console.error('SystemAudioDump process error:', err);
        systemAudioProc = null;
    });

    return true;
}

function convertStereoToMono(stereoBuffer) {
    const samples = stereoBuffer.length / 4;
    const monoBuffer = Buffer.alloc(samples * 2);

    for (let i = 0; i < samples; i++) {
        const leftSample = stereoBuffer.readInt16LE(i * 4);
        monoBuffer.writeInt16LE(leftSample, i * 2);
    }

    return monoBuffer;
}

function stopMacOSAudioCapture() {
    if (systemAudioProc) {
        console.log('Stopping SystemAudioDump...');
        systemAudioProc.kill('SIGTERM');
        systemAudioProc = null;
    }
}

async function sendAudioToGemini(base64Data, geminiSessionRef) {
    if (!geminiSessionRef.current) return;

    try {
        process.stdout.write('.');
        await geminiSessionRef.current.sendRealtimeInput({
            audio: {
                data: base64Data,
                mimeType: 'audio/pcm;rate=24000',
            },
        });
    } catch (error) {
        console.error('Error sending audio to Gemini:', error);
    }
}

async function sendImageToGeminiHttp(base64Data, prompt) {
    // Get available model based on rate limits
    const model = getAvailableModel();

    const apiKey = getApiKey();
    if (!apiKey) {
        return { success: false, error: 'No API key configured' };
    }

    try {
        const ai = new GoogleGenAI({ apiKey: apiKey });

        const contents = [
            {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64Data,
                },
            },
            { text: prompt },
        ];

        console.log(`Sending image to ${model} (streaming)...`);
        const response = await ai.models.generateContentStream({
            model: model,
            contents: contents,
        });

        // Increment count after successful call
        incrementLimitCount(model);

        // Stream the response
        let fullText = '';
        let isFirst = true;
        for await (const chunk of response) {
            const chunkText = chunk.text;
            if (chunkText) {
                fullText += chunkText;
                // Send to renderer - new response for first chunk, update for subsequent
                sendToRenderer(isFirst ? 'new-response' : 'update-response', fullText);
                isFirst = false;
            }
        }

        console.log(`Image response completed from ${model}`);

        // Save screen analysis to history
        saveScreenAnalysis(prompt, fullText, model);

        return { success: true, text: fullText, model: model };
    } catch (error) {
        console.error('Error sending image to Gemini HTTP:', error);
        return { success: false, error: error.message };
    }
}

function setupGeminiIpcHandlers(geminiSessionRef) {
    // Store the geminiSessionRef globally for reconnection access
    global.geminiSessionRef = geminiSessionRef;

    ipcMain.handle('initialize-cloud', async (event, token, profile, userContext) => {
        try {
            currentProviderMode = 'cloud';
            initializeNewSession(profile);
            setOnTurnComplete((transcription, response) => {
                saveConversationTurn(transcription, response);
            });
            sendToRenderer('session-initializing', true);
            await connectCloud(token, profile, userContext);
            sendToRenderer('session-initializing', false);
            return true;
        } catch (err) {
            console.error('[Cloud] Init error:', err);
            currentProviderMode = 'byok';
            sendToRenderer('session-initializing', false);
            return false;
        }
    });

    ipcMain.handle('initialize-gemini', async (event, apiKey, customPrompt, profile = 'interview', language = 'en-US') => {
        currentProviderMode = 'byok';
        const session = await initializeGeminiSession(apiKey, customPrompt, profile, language);
        if (session) {
            geminiSessionRef.current = session;
            return true;
        }
        return false;
    });

    ipcMain.handle(
        'initialize-deepseek',
        async (event, apiKey, model = 'deepseek-flash', customPrompt = '', profile = 'interview', language = 'cmn-CN', whisperModel = 'tiny') => {
            if (!apiKey || !apiKey.trim()) {
                return false;
            }

            currentProviderMode = 'deepseek';
            currentDeepSeekApiKey = apiKey.trim();
            currentDeepSeekModel = model || 'deepseek-flash';
            deepseekConversationHistory = [];

            const basePrompt = getSystemPrompt(profile, customPrompt, false);
            const deepSeekPrompt = /^(zh|cmn)/i.test(language || '')
                ? `${basePrompt}\n\nAlways answer in Simplified Chinese unless the user explicitly asks for another language.`
                : basePrompt;

            const success = await getLocalAi().initializeWhisperSession(whisperModel, profile, customPrompt, language, transcription =>
                sendToDeepSeek(transcription)
            );
            if (!success) {
                currentProviderMode = 'byok';
                currentDeepSeekApiKey = '';
            } else {
                currentSystemPrompt = deepSeekPrompt;
            }
            return success;
        }
    );

    ipcMain.handle(
        'initialize-qwen-realtime',
        async (event, apiKey, model = DEFAULT_QWEN_REALTIME_MODEL, customPrompt = '', profile = 'interview', language = 'cmn-CN') => {
            return initializeQwenRealtimeSession(apiKey, model, customPrompt, profile, language);
        }
    );

    ipcMain.handle(
        'initialize-qwen-omni-realtime',
        async (
            event,
            apiKey,
            model = DEFAULT_QWEN_OMNI_REALTIME_MODEL,
            workspaceId = '',
            customPrompt = '',
            profile = 'interview',
            language = 'cmn-CN'
        ) => {
            return initializeQwenOmniRealtimeSession(apiKey, model, workspaceId, customPrompt, profile, language);
        }
    );

    ipcMain.handle('cancel-qwen-response', async () => {
        try {
            if (!qwenRealtimeSession) return { success: false, error: '没有活动的 Qwen 会话' };
            return { success: qwenRealtimeSession.cancelResponse() };
        } catch (error) {
            console.error('Error cancelling Qwen response:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('initialize-local', async (event, localLlmModel, whisperModel, profile, customPrompt) => {
        currentProviderMode = 'local';
        const success = await getLocalAi().initializeLocalSession(localLlmModel, whisperModel, profile, customPrompt);
        if (!success) {
            currentProviderMode = 'byok';
        }
        return success;
    });

    ipcMain.handle('cancel-local-initialization', async () => {
        const cancelled = await getLocalAi().cancelLocalInitialization();
        if (cancelled) {
            currentProviderMode = 'byok';
        }
        return cancelled;
    });

    ipcMain.handle('send-audio-content', async (event, { data, mimeType }) => {
        if (currentProviderMode === 'qwen-realtime' || currentProviderMode === 'qwen-omni-realtime') {
            try {
                if (!qwenRealtimeSession) return { success: false, error: 'No active Qwen realtime session' };
                const pcmBuffer = Buffer.from(data, 'base64');
                qwenRealtimeSession.sendAudio(pcmBuffer);
                return { success: true };
            } catch (error) {
                console.error('Error sending Qwen system audio:', error);
                return { success: false, error: error.message };
            }
        }
        if (currentProviderMode === 'cloud') {
            try {
                const pcmBuffer = Buffer.from(data, 'base64');
                sendCloudAudio(pcmBuffer);
                return { success: true };
            } catch (error) {
                console.error('Error sending cloud audio:', error);
                return { success: false, error: error.message };
            }
        }
        if (currentProviderMode === 'local') {
            try {
                const pcmBuffer = Buffer.from(data, 'base64');
                getLocalAi().processLocalAudio(pcmBuffer);
                return { success: true };
            } catch (error) {
                console.error('Error sending local audio:', error);
                return { success: false, error: error.message };
            }
        }
        if (currentProviderMode === 'deepseek') {
            try {
                const pcmBuffer = Buffer.from(data, 'base64');
                getLocalAi().processLocalAudio(pcmBuffer);
                return { success: true };
            } catch (error) {
                console.error('Error sending DeepSeek audio:', error);
                return { success: false, error: error.message };
            }
        }
        if (!geminiSessionRef.current) return { success: false, error: 'No active Gemini session' };
        try {
            process.stdout.write('.');
            await geminiSessionRef.current.sendRealtimeInput({
                audio: { data: data, mimeType: mimeType },
            });
            return { success: true };
        } catch (error) {
            console.error('Error sending system audio:', error);
            return { success: false, error: error.message };
        }
    });

    // Handle microphone audio on a separate channel
    ipcMain.handle('send-mic-audio-content', async (event, { data, mimeType }) => {
        if (currentProviderMode === 'qwen-realtime' || currentProviderMode === 'qwen-omni-realtime') {
            try {
                if (!qwenRealtimeSession) return { success: false, error: 'No active Qwen realtime session' };
                const pcmBuffer = Buffer.from(data, 'base64');
                qwenRealtimeSession.sendAudio(pcmBuffer);
                return { success: true };
            } catch (error) {
                console.error('Error sending Qwen microphone audio:', error);
                return { success: false, error: error.message };
            }
        }
        if (currentProviderMode === 'cloud') {
            try {
                const pcmBuffer = Buffer.from(data, 'base64');
                sendCloudAudio(pcmBuffer);
                return { success: true };
            } catch (error) {
                console.error('Error sending cloud mic audio:', error);
                return { success: false, error: error.message };
            }
        }
        if (currentProviderMode === 'local') {
            try {
                const pcmBuffer = Buffer.from(data, 'base64');
                getLocalAi().processLocalAudio(pcmBuffer);
                return { success: true };
            } catch (error) {
                console.error('Error sending local mic audio:', error);
                return { success: false, error: error.message };
            }
        }
        if (currentProviderMode === 'deepseek') {
            try {
                const pcmBuffer = Buffer.from(data, 'base64');
                getLocalAi().processLocalAudio(pcmBuffer);
                return { success: true };
            } catch (error) {
                console.error('Error sending DeepSeek mic audio:', error);
                return { success: false, error: error.message };
            }
        }
        if (!geminiSessionRef.current) return { success: false, error: 'No active Gemini session' };
        try {
            process.stdout.write(',');
            await geminiSessionRef.current.sendRealtimeInput({
                audio: { data: data, mimeType: mimeType },
            });
            return { success: true };
        } catch (error) {
            console.error('Error sending mic audio:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('send-image-content', async (event, { data, prompt }) => {
        try {
            if (!data || typeof data !== 'string') {
                console.error('Invalid image data received');
                return { success: false, error: 'Invalid image data' };
            }

            const buffer = Buffer.from(data, 'base64');

            if (buffer.length < 1000) {
                console.error(`Image buffer too small: ${buffer.length} bytes`);
                return { success: false, error: 'Image buffer too small' };
            }

            process.stdout.write('!');

            if (currentProviderMode === 'cloud') {
                const sent = sendCloudImage(data);
                if (!sent) {
                    return { success: false, error: 'Cloud connection not active' };
                }
                return { success: true, model: 'cloud' };
            }

            if (currentProviderMode === 'local') {
                const result = await getLocalAi().sendLocalImage(data, prompt);
                return result;
            }

            if (currentProviderMode === 'deepseek') {
                return await sendImageToDeepSeek(data, prompt);
            }

            if (currentProviderMode === 'qwen-realtime' || currentProviderMode === 'qwen-omni-realtime') {
                return await sendImageToQwenVision(data, prompt);
            }

            const result = hasGroqKey() ? await sendImageToGroq(data, prompt) : await sendImageToGeminiHttp(data, prompt);
            return result;
        } catch (error) {
            console.error('Error sending image:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('send-text-message', async (event, text) => {
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return { success: false, error: 'Invalid text message' };
        }

        if (currentProviderMode === 'cloud') {
            try {
                console.log('Sending text to cloud:', text);
                sendCloudText(text.trim());
                return { success: true };
            } catch (error) {
                console.error('Error sending cloud text:', error);
                return { success: false, error: error.message };
            }
        }

        if (currentProviderMode === 'local') {
            try {
                console.log('Sending text to local Llama:', text);
                return await getLocalAi().sendLocalText(text.trim());
            } catch (error) {
                console.error('Error sending local text:', error);
                return { success: false, error: error.message };
            }
        }

        if (currentProviderMode === 'deepseek') {
            const response = await sendToDeepSeek(text.trim());
            return response
                ? { success: true, text: response, model: currentDeepSeekModel }
                : { success: false, error: 'DeepSeek returned no response' };
        }

        if (currentProviderMode === 'qwen-realtime' || currentProviderMode === 'qwen-omni-realtime') {
            try {
                if (!qwenRealtimeSession) return { success: false, error: 'No active Qwen realtime session' };
                qwenCurrentUserTranscript = text.trim();
                qwenRealtimeSession.sendTextMessage(text.trim());
                return { success: true };
            } catch (error) {
                console.error('Error sending Qwen text:', error);
                return { success: false, error: error.message };
            }
        }

        if (!geminiSessionRef.current) return { success: false, error: 'No active Gemini session' };

        try {
            console.log('Sending text message:', text);

            if (hasGroqKey()) {
                groqRequestStartedForTurn = true;
                sendToGroq(text.trim());
            }

            await geminiSessionRef.current.sendRealtimeInput({ text: text.trim() });
            return { success: true };
        } catch (error) {
            console.error('Error sending text:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('start-macos-audio', async event => {
        if (process.platform !== 'darwin') {
            return {
                success: false,
                error: 'macOS audio capture only available on macOS',
            };
        }

        try {
            const success = await startMacOSAudioCapture(geminiSessionRef);
            return { success };
        } catch (error) {
            console.error('Error starting macOS audio capture:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('stop-macos-audio', async event => {
        try {
            stopMacOSAudioCapture();
            return { success: true };
        } catch (error) {
            console.error('Error stopping macOS audio capture:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('close-session', async event => {
        try {
            stopMacOSAudioCapture();

            if (currentProviderMode === 'qwen-realtime' || currentProviderMode === 'qwen-omni-realtime') {
                closeQwenRealtimeSession();
                currentProviderMode = 'byok';
                closeTransportLog();
                return { success: true };
            }

            if (currentProviderMode === 'cloud') {
                closeCloud();
                currentProviderMode = 'byok';
                closeTransportLog();
                return { success: true };
            }

            if (currentProviderMode === 'local') {
                getLocalAi().closeLocalSession();
                currentProviderMode = 'byok';
                closeTransportLog();
                return { success: true };
            }

            if (currentProviderMode === 'deepseek') {
                getLocalAi().closeLocalSession();
                currentDeepSeekApiKey = '';
                deepseekConversationHistory = [];
                currentProviderMode = 'byok';
                closeTransportLog();
                return { success: true };
            }

            // Set flag to prevent reconnection attempts
            isUserClosing = true;
            sessionParams = null;

            // Cleanup session
            if (geminiSessionRef.current) {
                await geminiSessionRef.current.close();
                geminiSessionRef.current = null;
            } else {
                closeTransportLog();
            }

            return { success: true };
        } catch (error) {
            console.error('Error closing session:', error);
            return { success: false, error: error.message };
        }
    });

    // Conversation history IPC handlers
    ipcMain.handle('get-current-session', async event => {
        try {
            return { success: true, data: getCurrentSessionData() };
        } catch (error) {
            console.error('Error getting current session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('start-new-session', async event => {
        try {
            initializeNewSession();
            return { success: true, sessionId: currentSessionId };
        } catch (error) {
            console.error('Error starting new session:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('update-google-search-setting', async (event, enabled) => {
        try {
            console.log('Google Search setting updated to:', enabled);
            // The setting is already saved in localStorage by the renderer
            // This is just for logging/confirmation
            return { success: true };
        } catch (error) {
            console.error('Error updating Google Search setting:', error);
            return { success: false, error: error.message };
        }
    });
}

module.exports = {
    initializeGeminiSession,
    getEnabledTools,
    getStoredSetting,
    sendToRenderer,
    initializeNewSession,
    saveConversationTurn,
    getCurrentSessionData,
    killExistingSystemAudioDump,
    startMacOSAudioCapture,
    convertStereoToMono,
    stopMacOSAudioCapture,
    sendAudioToGemini,
    sendImageToGeminiHttp,
    setupGeminiIpcHandlers,
    formatSpeakerResults,
    initializeQwenRealtimeSession,
    initializeQwenOmniRealtimeSession,
    closeQwenRealtimeSession,
};
