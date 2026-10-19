const profileNames = {
    interview: '求职面试',
    sales: '销售通话',
    meeting: '商务会议',
    presentation: '演示汇报',
    negotiation: '商务谈判',
    exam: '考试助手',
};

function formatDate(timestamp) {
    if (timestamp == null || timestamp === '') return '时间未知';
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? '时间未知' : date.toLocaleString('zh-CN', { hour12: false });
}

function formatSessionMarkdown(session) {
    const lines = ['# 面试记录', '', `会话时间：${formatDate(session.createdAt)}`, ''];
    if (session.profile) lines.push(`场景：${profileNames[session.profile] || session.profile}`, '');
    if (session.customPrompt) lines.push('## 背景信息', '', session.customPrompt, '');
    lines.push('## 对话记录', '');
    const turns = Array.isArray(session.conversationHistory) ? session.conversationHistory : [];
    if (!turns.length) lines.push('暂无对话记录。', '');
    turns.forEach((turn, index) => {
        lines.push(`### 第 ${index + 1} 轮 · ${formatDate(turn.timestamp)}`, '');
        if (turn.transcription) lines.push('#### 语音转写 / 输入', '', turn.transcription, '');
        if (turn.ai_response) lines.push('#### AI 回答', '', turn.ai_response, '');
    });
    const screens = Array.isArray(session.screenAnalysisHistory) ? session.screenAnalysisHistory : [];
    if (screens.length) {
        lines.push('## 屏幕分析', '');
        screens.forEach((entry, index) => {
            lines.push(`### 第 ${index + 1} 次 · ${formatDate(entry.timestamp)}`, '');
            if (entry.model) lines.push(`模型：${entry.model}`, '');
            if (entry.prompt) lines.push('#### 提问', '', entry.prompt, '');
            if (entry.response) lines.push('#### AI 回答', '', entry.response, '');
        });
    }
    return lines.join('\n');
}

module.exports = { formatSessionMarkdown };
