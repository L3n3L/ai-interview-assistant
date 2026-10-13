# Qwen Omni 实时面试链路需求

## 1. 目标

新增可选的 `qwen3.8-omni-flash-realtime` 实时面试链路，保留现有 DeepSeek 链路和 `qwen-audio-3.1-realtime-plus` 链路。用户可以在主界面选择不同链路。

Gemini / Groq 与本地 AI 不再作为主界面可选入口，但后端旧实现暂不删除，避免破坏历史数据和回滚能力。

## 2. 用户故事

- 用户可以选择旧 Qwen 实时语音链路。
- 用户可以选择新 Qwen Omni 实时语音链路。
- 用户可以选择 DeepSeek 链路。
- 用户不再在主界面看到 Gemini、Groq 或本地 AI 入口。
- 新链路使用同一个 Qwen API Key，并额外支持 Workspace ID 配置。
- 新链路实时接收系统声音，只输出文字回答。
- 新链路截图继续复用已经完成的 Qwen 视觉识图接口。

## 3. 验收标准

1. **当**用户选择 Qwen Omni 模式并填写 API Key 与 Workspace ID，**系统应**通过 Workspace 专属 WebSocket 建立 `qwen3.8-omni-flash-realtime` 会话。
2. **当**用户开始面试，**系统应**使用系统扬声器音频、16kHz PCM、约 100ms 分片向新链路发送音频。
3. **当**模型检测到说话轮次结束，**系统应**返回中文转写和文字回答，并继续使用现有回答列表。
4. **当**模型返回回答增量，**系统应**使用现有 `new-response` / `update-response` 事件，不新增分页系统。
5. **当**用户选择旧 Qwen 或 DeepSeek，**系统应**继续走旧链路。
6. **当**用户配置状态是 Gemini、Groq、本地 AI 或旧云模式，**系统应**迁移到可见的 Qwen Omni 入口，不显示已下线入口。
7. **当**用户触发截图，**系统应**在新 Qwen Omni 模式下继续使用独立 Qwen 视觉接口，不阻塞实时音频协议。
8. **当**连接失败或 Workspace ID 缺失，**系统应**显示明确错误并记录脱敏日志。

## 4. 非目标

- 不删除 DeepSeek 或旧 Qwen 实时后端。
- 不把新模型强行覆盖为旧模型默认值。
- 不把截图直接作为第一阶段的实时视频帧发送。
- 不把 API Key、音频内容或图片 Base64 写入日志。
