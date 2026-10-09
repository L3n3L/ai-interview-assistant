## AI面试助手

This repository is an unofficial Chinese-localized and rebranded fork maintained by **L3n3L**, based on
[sohzm/cheating-daddy](https://github.com/sohzm/cheating-daddy).

The distributed product name is **AI面试助手** and is not affiliated with or endorsed by the upstream project.

Compared with upstream, this fork adds:

- Chinese interface and Chinese speech-language defaults.
- DeepSeek API-key compatibility for text and screenshot replies.
- Local audio and transport timing logs for diagnosing speech-to-answer latency.
- Rebranded desktop application, installer metadata, and Chinese user interface.

The project remains licensed under **GPL-3.0**. See [NOTICE.md](NOTICE.md) for attribution and
fork details. Never commit API keys or local session data.

A real-time AI assistant that provides contextual help during video calls, interviews, presentations, and meetings using screen capture and audio analysis.

## Features

- **DeepSeek mode**: Use DeepSeek for text and screenshot replies while keeping speech-to-text local with Whisper
- **Screen & Audio Capture**: Analyzes what you see and hear for contextual responses
- **Multiple Profiles**: Interview, Sales Call, Business Meeting, Presentation, Negotiation
- **Transparent Overlay**: Always-on-top window that can be positioned anywhere
- **Click-through Mode**: Make window transparent to clicks when needed
- **Cross-platform**: Works on macOS, Windows, and Linux (kinda, dont use, just for testing rn)

## Setup

1. **Choose a provider**: DeepSeek or Local AI
2. **Install Dependencies**: `npm install`
3. **Run the App**: `npm start`

### DeepSeek mode

DeepSeek mode uses the OpenAI-compatible DeepSeek Chat Completions endpoint for text and image replies. It starts the local Whisper runner for audio transcription, then sends only the recognized text to DeepSeek. The default reply model is `deepseek-flash`.

Enter the key in the app’s DeepSeek settings. API keys are stored in the local data directory and are not part of the source tree.

### Local data location (Windows)

On the original Windows setup, configuration, local-AI binaries, models, history, and logs are stored under
the legacy-compatible directory:

`E:\\vsws\\家庭工具\\cheating-daddy-data`

To use a different location, set `CHEATING_DADDY_DATA_DIR` before starting the app. The legacy directory
name is retained for compatibility with existing local keys, logs, history, and downloaded models.

## Usage

1. Enter your DeepSeek API key in the main window
2. Choose your profile and language in settings
3. Click "Start Session" to begin
4. Position the window using keyboard shortcuts
5. The AI will provide real-time assistance based on your screen and what interview asks

## Keyboard Shortcuts

- **Window Movement**: `Ctrl/Cmd + Arrow Keys` - Move window
- **Click-through**: `Ctrl/Cmd + M` - Toggle mouse events
- **Close/Back**: `Ctrl/Cmd + \` - Close window or go back
- **Send Message**: `Enter` - Send text to AI

## Audio Capture

- **macOS**: [SystemAudioDump](https://github.com/Mohammed-Yasin-Mulla/Sound) for system audio
- **Windows**: Loopback audio capture
- **Linux**: Microphone input

## Requirements

- Electron-compatible OS (macOS, Windows, Linux)
- DeepSeek API key, when using online replies
- Screen recording permissions
- Microphone/audio permissions
