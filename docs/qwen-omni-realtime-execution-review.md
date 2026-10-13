# Qwen Omni 实时链路执行与复盘

## 执行基线

- 视觉识图基线已提交：`977255c`
- 旧 Qwen 实时链路继续保留
- DeepSeek 链路继续保留
- Gemini / 本地 AI 只从主界面下线，后端代码不在本阶段删除

## 本阶段目标

新增用户可选的：

```text
Qwen Omni 实时
模型：qwen3.8-omni-flash-realtime
协议：Workspace WebSocket
输出：文本
VAD：semantic_vad
```

## 复盘重点

1. 新模型不能覆盖旧链路，必须通过 providerMode 独立选择。
2. Workspace ID 必须与 API Key 处于同地域和同业务空间。
3. 新链路使用 100ms 音频分片，旧链路行为保持不变。
4. 截图识图继续走独立视觉 HTTP 请求，避免图片和实时音频互相影响。
5. 主界面隐藏不用的 Gemini / 本地 AI，但后端保留以便回滚。

## 执行记录

- 已实现独立 `qwen-omni-realtime` provider；旧 Qwen 和 DeepSeek 初始化入口未覆盖。
- 已实现 Workspace ID 配置、Workspace WebSocket URL、`semantic_vad` 和 20 轮会话历史；旧 Qwen 仍使用 `smart_turn` 和 8 轮历史。
- 已接入系统音频、麦克风音频、文本输入、截图识图和现有回答分页。
- 主界面已只展示 Qwen Omni、旧 Qwen 实时和 DeepSeek；Gemini / 本地 AI 后端保留但不再作为主界面可选入口。
- `node --check`、`git diff --check` 和 Windows x64 打包已通过。
- Omni 真实连接测试暂未执行：当前环境没有可用于验证的 Workspace ID；配置完成后需要记录首字延迟、完整回答延迟、VAD 断句和截图回归结果。
