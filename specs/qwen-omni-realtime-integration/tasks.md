# Qwen Omni 实时链路实施任务

- [x] 1. 提交 Qwen 视觉链路基线
  - Commit: `977255c`
  - _Requirement: 7_

- [x] 2. 固化 Omni 需求与数据流
  - 保留旧 Qwen 和 DeepSeek
  - 移除 Gemini / 本地 AI 主界面入口
  - _Requirement: 1-8_

- [x] 3. 参数化 Qwen Realtime 会话
  - 支持 Workspace ID
  - 支持 `semantic_vad`
  - 保留旧 `smart_turn`
  - _Requirement: 1, 2, 3_

- [x] 4. 新增 Omni provider 初始化链路
  - 增加 `qwen-omni-realtime` 模式
  - 增加 IPC 和 Renderer 初始化函数
  - _Requirement: 1, 5, 8_

- [x] 5. 更新主界面模式选择
  - 新增 Omni 设置
  - 保留 DeepSeek / 旧 Qwen
  - 隐藏 Gemini / 本地 AI
  - _Requirement: 5, 6_

- [x] 6. 接入音频、文本、截图和日志
  - Omni 音频使用 100ms 分片
  - 复用回答分页和视觉识图
  - 增加 Omni 状态和错误日志
  - _Requirement: 2, 3, 4, 7, 8_

- [ ] 7. 构建与回归测试
  - 静态检查、打包
  - 旧链路回归
  - Omni 真实连接测试
  - _Requirement: 1-8_

  当前进度：静态检查和 Windows 打包已通过；旧链路和 Omni 真实连接仍需在有可用 Workspace ID 的环境中验证。
