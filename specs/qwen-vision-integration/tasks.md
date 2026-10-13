# Qwen 视觉识图实施任务

- [x] 1. 固化需求边界和验收标准
  - 明确视觉链路独立于实时语音链路
  - 明确回答复用现有三条分页
  - _Requirement: 1-8_

- [x] 2. 完成接口和数据流设计
  - 明确 Base64 图片输入、OpenAI 兼容请求、SSE 输出
  - 明确思考字段隐藏策略和日志脱敏策略
  - _Requirement: 1-8_

- [x] 3. 增加 Qwen 视觉模型配置
  - 新增默认 `qwenVisionModel`
  - 在 Qwen 设置中提供视觉模型配置项
  - _Requirement: 8_

- [x] 4. 实现 Qwen 视觉 HTTP 流式请求
  - 复用 Qwen 实时 Key
  - 发送图片和算法分析提示词
  - 解析正式回答和思考字段
  - _Requirement: 1, 5, 6_

- [x] 5. 接入截图 IPC 和现有回答事件
  - Qwen 模式改为调用视觉请求
  - 使用 `new-response` / `update-response`
  - 保存屏幕分析结果
  - _Requirement: 2, 3, 4, 7_

- [x] 6. 提升 Qwen 截图代码可读性
  - 调整手动截图最大宽度和高质量参数
  - 保持非 Qwen 模式行为不变
  - _Requirement: 1, 7_

- [ ] 7. 静态检查与运行验证
  - 验证错误路径、日志、分页和语音回归
  - 更新本文件状态和执行复盘
  - _Requirement: 1-8_
