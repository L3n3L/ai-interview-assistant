<img width="1299" height="424" alt="cd (1)" src="https://github.com/user-attachments/assets/b25fff4d-043d-4f38-9985-f832ae0d0f6e" />

## Recall.ai - API for desktop recording

If you’re looking for a hosted desktop recording API, consider checking out [Recall.ai](https://www.recall.ai/product/desktop-recording-sdk/?utm_source=github&utm_medium=sponsorship&utm_campaign=sohzm-cheating-daddy), an API that records Zoom, Google Meet, Microsoft Teams, in-person meetings, and more.

This project is sponsored by Recall.ai.

---

> [!NOTE]  
> Use latest MacOS and Windows version, older versions have limited support

> [!NOTE]  
> During testing it wont answer if you ask something, you need to simulate interviewer asking question, which it will answer

A real-time AI assistant that provides contextual help during video calls, interviews, presentations, and meetings using screen capture and audio analysis.

## Features

- **Live AI Assistance**: Real-time help powered by Google Gemini 2.0 Flash Live
- **DeepSeek Flash mode**: Use DeepSeek for text and screenshot replies while keeping speech-to-text local with Whisper
- **Screen & Audio Capture**: Analyzes what you see and hear for contextual responses
- **Multiple Profiles**: Interview, Sales Call, Business Meeting, Presentation, Negotiation
- **Transparent Overlay**: Always-on-top window that can be positioned anywhere
- **Click-through Mode**: Make window transparent to clicks when needed
- **Cross-platform**: Works on macOS, Windows, and Linux (kinda, dont use, just for testing rn)

## Setup

1. **Choose a provider**: Gemini/Groq, DeepSeek Flash, or Local AI
2. **Install Dependencies**: `npm install`
3. **Run the App**: `npm start`

### DeepSeek Flash mode

DeepSeek mode uses the OpenAI-compatible DeepSeek Chat Completions endpoint for text and image replies. It starts the local Whisper runner for audio transcription, then sends only the recognized text to DeepSeek. The default reply model is `deepseek-flash`.

Enter the key in the app’s DeepSeek settings. API keys are stored in the local data directory and are not part of the source tree.

### Local data location (Windows)

On this setup, configuration, local-AI binaries, models, history, and logs are stored under:

`E:\\vsws\\家庭工具\\cheating-daddy-data`

To use a different location, set `CHEATING_DADDY_DATA_DIR` before starting the app.

## Usage

1. Enter your Gemini API key in the main window
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
- Gemini or DeepSeek API key, depending on the selected mode
- Screen recording permissions
- Microphone/audio permissions
