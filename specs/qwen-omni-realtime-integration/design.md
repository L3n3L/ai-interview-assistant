# Qwen Omni 实时面试链路设计

## 1. 链路选择

```text
providerMode = qwen-realtime
    → qwen-audio-3.1-realtime-plus（旧链路）

providerMode = qwen-omni-realtime
    → qwen3.8-omni-flash-realtime（新链路）

providerMode = deepseek
    → DeepSeek 回复 + 本地 Whisper（旧链路）
```

Gemini / 本地 AI 入口从主界面移除，后端保留。

## 2. 新链路数据流

```text
用户启动
  ↓
读取 API Key + Workspace ID
  ↓
Workspace 专属 WebSocket
  ↓
session.update（中文、文本输出、semantic_vad）
  ↓
系统扬声器采集
  ↓
16kHz 单声道 PCM / 100ms 分片
  ↓
Renderer → Electron IPC → WebSocket
  ↓
Qwen 语义 VAD + 实时转写
  ↓
response.text.delta
  ↓
现有 new-response / update-response
  ↓
现有 responses 三条分页
```

## 3. 代码边界

- `qwen-realtime.js`：保留原类，参数化 `turnDetection`、`workspaceId`、历史轮数。
- `gemini.js`：新增 Omni 初始化 IPC 和 provider 分支，复用事件处理、音频转发、截图视觉函数。
- `renderer.js`：新增 Omni 初始化方法，Omni 模式使用 100ms 音频分片。
- `MainView.js`：新增 Omni 设置页，移除 Gemini / 本地 AI 的模式按钮。
- `CheatingDaddyApp.js`：按 provider 分发初始化，补充 Omni 状态文字。
- `storage.js`：新增 Omni 默认模式和 Workspace ID。

## 4. 会话配置

```json
{
  "modalities": ["text"],
  "instructions": "中文实时面试助手提示词",
  "input_audio_format": "pcm",
  "input_audio_transcription": { "language": "zh" },
  "max_history_turns": 20,
  "turn_detection": { "type": "semantic_vad" }
}
```

客户端只请求文字输出，避免不需要的语音输出占用资源。

## 5. 配置和地域

- `qwenRealtimeApiKey` 继续作为共享 Qwen Key。
- `qwenWorkspaceId` 保存 Workspace ID，不视为密钥。
- `qwenOmniRealtimeModel` 默认 `qwen3.8-omni-flash-realtime`。
- 连接端点由 `workspaceId` 和地域决定；首版默认北京，保留环境变量覆盖能力。

## 6. 截图策略

新 Omni 模式截图仍调用已经完成的 `sendImageToQwenVision`，默认视觉模型 `qwen3-vl-plus`。原因是单张代码截图需要高分辨率和独立思考，不把截图时序与实时音频 VAD 绑定。

## 7. 验证

1. 旧 Qwen 模式回归。
2. DeepSeek 模式回归。
3. Omni Key / Workspace ID 错误提示。
4. Omni WebSocket `session.updated` 成功。
5. 真实系统音频转写和文本回答。
6. 识图结果进入现有回答分页。
7. 主界面不再出现 Gemini / 本地 AI 入口。
