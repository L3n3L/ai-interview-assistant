# Qwen 视觉识图接入设计

## 1. 总体架构

```text
屏幕视频流
    ↓
Renderer Canvas 截图
    ↓ Base64
send-image-content IPC
    ↓
Electron 主进程
    ↓ HTTPS / SSE
DashScope qwen3-vl-plus
    ↓ 文本增量
new-response / update-response
    ↓
responses 数组
    ↓
现有三条分页
```

实时语音继续走：

```text
音频 → Qwen Realtime WebSocket → 语音转写/文本回答
```

两个请求共享 API Key 和会话日志，但视觉请求不进入实时音频 WebSocket。

## 2. 模块职责

### Renderer

- 复用现有 `captureManualScreenshot`。
- Qwen 识图时优先保留更高分辨率和图片质量。
- 通过 `send-image-content` IPC 发送 Base64 与提示词。

### Electron 主进程

- 在 `gemini.js` 中新增 `sendImageToQwenVision`。
- 从当前 Qwen 实时初始化流程保存 API Key，仅主进程使用。
- 组装 OpenAI 兼容的多模态 `messages`。
- 解析 SSE 流中的 `delta.content` 和 `delta.reasoning_content`。
- 只把正式回答发送到 Renderer。

### Storage / Settings

- 新增 `qwenVisionModel`，默认 `qwen3-vl-plus`。
- 继续复用 `qwenRealtimeApiKey`，不新增密钥字段。

### UI / Response

- 识图首次文本发送 `new-response`。
- 后续文本发送累计后的 `update-response`。
- 复用 `CheatingDaddyApp` 的回答数组和三条分页。

## 3. 请求协议

默认请求：

```http
POST https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
Authorization: Bearer <Qwen Key>
Content-Type: application/json
```

请求体核心字段：

```json
{
  "model": "qwen3-vl-plus",
  "stream": true,
  "enable_thinking": true,
  "messages": [
    {
      "role": "user",
      "content": [
        { "type": "text", "text": "中文算法题分析提示词" },
        {
          "type": "image_url",
          "image_url": {
            "url": "data:image/jpeg;base64,..."
          }
        }
      ]
    }
  ]
}
```

Qwen 的思考增量 `reasoning_content` 只记录字符数，不展示给用户；正式回答使用 `content`。

## 4. 上下文策略

- 识图请求默认使用当前系统提示词、当前自定义提示词和当前截图提示词。
- 不自动将图片回灌到实时语音会话。
- 识图结果保存为 `screenAnalysisHistory`，用户后续追问功能以后再单独增加。
- 图片请求不加入 `conversationHistory`，避免语音上下文被重复污染。

## 5. 图片策略

- 手动截图在 Qwen 模式下提高最大宽度，优先代码可读性。
- 仍使用 JPEG 以控制请求体大小；后续可增加用户选择 PNG 或代码区域裁剪。
- 日志只记录图片字节数、Base64 字符数和宽高，不保存图片内容。

## 6. 错误和日志

日志事件：

- `qwen.vision.request_started`
- `qwen.vision.http_response`
- `qwen.vision.first_token`
- `qwen.vision.completed`
- `qwen.vision.http_error`
- `qwen.vision.stream_parse_error`
- `qwen.vision.failed`

记录字段包括模型、图片大小、耗时、首 token 耗时、思考字符数、回答字符数和 HTTP 状态，不记录 Key、Base64 和回答全文。

## 7. 验证策略

1. 静态语法检查。
2. 使用无效 Key 验证错误提示和日志脱敏。
3. 使用真实代码截图验证模型请求成功。
4. 确认首 token 创建一条回答、后续 token 更新同一条回答。
5. 确认识图回答可以参与三条分页。
6. 确认 Qwen 语音仍可正常转写和回答。

## 8. 官方依据

- [Qwen 视觉理解](https://help.aliyun.com/zh/model-studio/vision/)
- [Qwen OpenAI 兼容 Chat 接口](https://help.aliyun.com/zh/model-studio/qwen-api-via-openai-chat-completions/)
- [视觉推理模型用法](https://help.aliyun.com/zh/model-studio/visual-reasoning)
