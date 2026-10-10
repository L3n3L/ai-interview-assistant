const WebSocket = require('ws');
const { logTransportEvent } = require('./transportLogger');

const DEFAULT_MODEL = 'qwen-audio-3.1-realtime-plus';
const DEFAULT_ENDPOINT = 'wss://dashscope.aliyuncs.com/api-ws/v1/realtime';
const DEFAULT_CONNECT_TIMEOUT_MS = 15000;

function normalizeLanguage(language) {
    return /^(zh|cmn)/i.test(language || '') ? 'zh' : 'en';
}

function buildRealtimeUrl(model, endpoint = DEFAULT_ENDPOINT, workspaceId = '') {
    const trimmedEndpoint = String(endpoint || DEFAULT_ENDPOINT).replace(/\/$/, '');
    const baseEndpoint = trimmedEndpoint.includes('?') ? trimmedEndpoint.split('?')[0] : trimmedEndpoint;
    const resolvedEndpoint = workspaceId ? `wss://${workspaceId}.cn-beijing.maas.aliyuncs.com/api-ws/v1/realtime` : baseEndpoint;
    return `${resolvedEndpoint}?model=${encodeURIComponent(model || DEFAULT_MODEL)}`;
}

function resample24kTo16k(inputBuffer, remainder) {
    const combined = Buffer.concat([remainder, inputBuffer]);
    const inputSamples = Math.floor(combined.length / 2);
    const outputSamples = Math.floor((inputSamples * 2) / 3);

    if (outputSamples <= 0) {
        return { buffer: Buffer.alloc(0), remainder: combined };
    }

    const outputBuffer = Buffer.alloc(outputSamples * 2);
    for (let i = 0; i < outputSamples; i++) {
        const sourcePosition = (i * 3) / 2;
        const sourceIndex = Math.floor(sourcePosition);
        const fraction = sourcePosition - sourceIndex;
        const firstSample = combined.readInt16LE(sourceIndex * 2);
        const secondSample = sourceIndex + 1 < inputSamples ? combined.readInt16LE((sourceIndex + 1) * 2) : firstSample;
        const interpolated = Math.round(firstSample + fraction * (secondSample - firstSample));
        outputBuffer.writeInt16LE(Math.max(-32768, Math.min(32767, interpolated)), i * 2);
    }

    const consumedInputSamples = Math.ceil((outputSamples * 3) / 2);
    const remainderStart = consumedInputSamples * 2;
    return {
        buffer: outputBuffer,
        remainder: remainderStart < combined.length ? combined.slice(remainderStart) : Buffer.alloc(0),
    };
}

class QwenRealtimeSession {
    constructor({ apiKey, model = DEFAULT_MODEL, language = 'cmn-CN', instructions = '', endpoint, workspaceId, onEvent }) {
        this.apiKey = String(apiKey || '').trim();
        this.model = model || DEFAULT_MODEL;
        this.language = normalizeLanguage(language);
        this.instructions = instructions || '';
        this.endpoint = endpoint || process.env.QWEN_REALTIME_ENDPOINT || DEFAULT_ENDPOINT;
        this.workspaceId = workspaceId || process.env.QWEN_WORKSPACE_ID || '';
        this.url = buildRealtimeUrl(this.model, this.endpoint, this.workspaceId);
        this.onEvent = typeof onEvent === 'function' ? onEvent : () => {};
        this.socket = null;
        this.state = 'idle';
        this.closedByUser = false;
        this.resampleRemainder = Buffer.alloc(0);
        this.connectPromise = null;
    }

    connect() {
        if (this.connectPromise) return this.connectPromise;
        if (!this.apiKey) return Promise.reject(new Error('Qwen API 密钥为空'));

        this.closedByUser = false;
        this.state = 'connecting';
        const startedAt = Date.now();
        logTransportEvent('qwen.session_connect_started', { model: this.model });

        this.connectPromise = new Promise((resolve, reject) => {
            let settled = false;
            let sessionUpdated = false;
            const timeout = setTimeout(() => {
                if (settled) return;
                settled = true;
                this.state = 'error';
                this.connectPromise = null;
                this.socket?.close();
                reject(new Error('Qwen 实时连接超时'));
            }, DEFAULT_CONNECT_TIMEOUT_MS);

            const socket = new WebSocket(this.url, {
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    'User-Agent': 'AI-Interview-Assistant',
                },
            });
            this.socket = socket;

            socket.on('open', () => {
                this.state = 'configuring';
                this.sendEvent({
                    type: 'session.update',
                    session: {
                        modalities: ['text'],
                        instructions: this.instructions,
                        input_audio_format: 'pcm',
                        input_audio_transcription: {
                            language: this.language,
                        },
                        max_history_turns: 8,
                        turn_detection: {
                            type: 'smart_turn',
                        },
                    },
                });
            });

            socket.on('message', raw => {
                let event;
                try {
                    event = JSON.parse(raw.toString());
                } catch (error) {
                    logTransportEvent('qwen.event_parse_failed', { error: error.message });
                    return;
                }

                if (event.type === 'session.updated') {
                    sessionUpdated = true;
                    this.state = 'ready';
                    clearTimeout(timeout);
                    logTransportEvent('qwen.session_connected', {
                        model: this.model,
                        elapsedMs: Date.now() - startedAt,
                    });
                }

                if (event.type === 'error' && !sessionUpdated && !settled) {
                    settled = true;
                    clearTimeout(timeout);
                    this.state = 'error';
                    this.connectPromise = null;
                    reject(new Error(event.error?.message || 'Qwen 会话配置失败'));
                }

                this.emit(event);

                if (sessionUpdated && !settled) {
                    settled = true;
                    this.connectPromise = null;
                    resolve(this);
                }
            });

            socket.on('error', error => {
                logTransportEvent('qwen.session_error', { error: error.message });
                this.emit({ type: 'transport.error', error: { message: error.message } });
                if (!settled) {
                    settled = true;
                    clearTimeout(timeout);
                    this.state = 'error';
                    this.connectPromise = null;
                    reject(error);
                }
            });

            socket.on('close', (code, reason) => {
                this.state = 'closed';
                this.connectPromise = null;
                logTransportEvent('qwen.session_closed', {
                    code,
                    reason: reason?.toString() || '',
                    userInitiated: this.closedByUser,
                });
                this.emit({
                    type: 'transport.closed',
                    code,
                    reason: reason?.toString() || '',
                    userInitiated: this.closedByUser,
                });
                if (!settled) {
                    settled = true;
                    clearTimeout(timeout);
                    reject(new Error(`Qwen 连接已关闭（${code}）`));
                }
            });
        });

        return this.connectPromise;
    }

    emit(event) {
        try {
            this.onEvent(event);
        } catch (error) {
            console.error('[QwenRealtime] Event handler failed:', error);
        }
    }

    sendEvent(event) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            throw new Error('Qwen 实时连接尚未就绪');
        }
        this.socket.send(JSON.stringify(event));
    }

    sendAudio(pcm24kBuffer) {
        if (!Buffer.isBuffer(pcm24kBuffer) || pcm24kBuffer.length === 0) return false;
        const result = resample24kTo16k(pcm24kBuffer, this.resampleRemainder);
        this.resampleRemainder = result.remainder;
        if (result.buffer.length === 0) return false;

        this.sendEvent({
            type: 'input_audio_buffer.append',
            audio: result.buffer.toString('base64'),
        });
        logTransportEvent('qwen.audio_sent', {
            inputBytes: pcm24kBuffer.length,
            outputBytes: result.buffer.length,
        });
        return true;
    }

    sendTextMessage(text) {
        const normalizedText = String(text || '').trim();
        if (!normalizedText) return false;
        this.sendEvent({
            type: 'conversation.item.create',
            item: {
                type: 'message',
                role: 'user',
                content: [{ type: 'input_text', text: normalizedText }],
            },
        });
        this.sendEvent({
            type: 'response.create',
            response: { modalities: ['text'] },
        });
        logTransportEvent('qwen.text_sent', { textChars: normalizedText.length });
        return true;
    }

    cancelResponse() {
        if (this.socket?.readyState !== WebSocket.OPEN) return false;
        this.sendEvent({ type: 'response.cancel' });
        logTransportEvent('qwen.response_cancel_requested');
        return true;
    }

    close() {
        this.closedByUser = true;
        this.resampleRemainder = Buffer.alloc(0);
        if (this.socket && this.socket.readyState < WebSocket.CLOSING) {
            this.socket.close(1000, 'client_closed');
        }
        this.socket = null;
        this.state = 'closed';
        this.connectPromise = null;
    }
}

module.exports = {
    DEFAULT_MODEL,
    DEFAULT_ENDPOINT,
    QwenRealtimeSession,
};
