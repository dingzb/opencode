# OpenCode Desktop Client UI Design Spec

版本：v0.1  
目标：用于 Codex/OpenCode 风格 Agent Desktop Client 的 UI/UX 实现规范

参考：

- OpenCode
- Claude Desktop
- Visual Studio Code
- Cursor

OpenCode 官方说明中也明确强调其同时支持 Terminal、Desktop App 与 IDE Extension 形态。

---

# 一、设计目标

整体产品方向：

> 不是 AI 聊天软件  
> 而是 Agent Operating System

核心设计思想：

- 极简
- 专业
- IDE 风格
- 高信息密度
- 强工作流感
- Tool 可视化
- Event 驱动
- 非聊天气泡化

---

# 二、整体布局结构

```text
┌──────────────────────────────────────────────┐
│ 顶部状态栏                                   │
├──────────┬───────────────────────────────────┤
│ 左侧栏    │                                   │
│           │                                   │
│ Sessions  │           主工作区                │
│ Agents    │                                   │
│ KB        │                                   │
│ Files     │                                   │
│           │                                   │
│           │                                   │
│           │                                   │
├──────────┴───────────────────────────────────┤
│ 输入区域 / Agent 状态栏                       │
└──────────────────────────────────────────────┘
```

---

# 三、整体风格

## 风格关键词

```text
Minimal
Professional
Terminal-inspired
IDE-style
Dense Information
Focused
```

---

# 四、顶部状态栏

高度：

```text
32px ~ 40px
```

布局：

```text
[Logo] [Workspace]        [Session Title]        [Model] [Agent] [Status] [Settings]
```

要求：

- 极简
- 无阴影
- 深色背景
- 类似 VSCode Title Bar

推荐颜色：

```css
background: #111111;
border-bottom: 1px solid #1E1E1E;
```

---

# 五、左侧栏设计

宽度：

```text
220px
```

设计原则：

不要：

- 卡片化
- 大图标
- 花哨背景

要：

- IDE Explorer 风格
- 小字号
- hover 高亮
- Tree View 风格

---

## 左侧结构

```text
● New Session

Sessions
├── PPT 解析与教学设计
├── 高等物理期末复习
├── 教案生成：光学章节
└── SmartArt 结构分析

────────────

Agents
├── Default Agent
├── Teacher Agent
├── PPT Parser

────────────

Knowledge Base
├── 我的资料库
├── 教学经验库
├── 试题题库

────────────

Workspace
├── uploads/
├── output/
├── cache/
└── logs/
```

---

# 六、主工作区设计

核心思想：

> 不是聊天窗口  
> 而是 Agent 工作流窗口

不要：

- 聊天气泡
- 圆角消息框
- IM 风格布局

要：

- 日志流
- Tool 流
- Event 流
- 状态流

---

# 七、消息结构

推荐结构：

```text
User
├── Prompt
├── Attachments

Assistant
├── Thinking
├── Tool Calls
├── Tool Output
├── Files Generated
└── Final Answer
```

---

## 示例

```text
Assistant

Thinking
正在解析 PPT 中的 SmartArt 结构...

Tool Call
execute_python()

Tool Output
发现组织结构图：
学院
└── 教务处
    ├── 教学管理
    └── 学籍管理

Files Generated
+ output/outline.md
+ output/images/001.png

Final
已完成 PPT 解析。
```

---

# 八、Tool Call UI

这是整个系统最重要的部分。

Agent 的“动作”必须可视化。

---

## Tool UI 结构

折叠式：

```text
▶ read_file
▶ execute_python
▶ search_web
▶ write_markdown
```

展开后：

```text
Command
python parse.py

Stdout
...

Files
...
```

---

## Tool 状态颜色

| 类型 | 颜色 |
|---|---|
| read | 蓝灰 |
| write | 绿色 |
| execute | 紫色 |
| network | 青色 |
| error | 红色 |

要求：

- 低饱和
- 不使用高亮霓虹
- IDE 风格

---

# 九、流式输出系统

必须实现：

```text
Token Streaming
Event Streaming
```

不要：

```text
一次性输出全文
```

要：

```text
Thinking...
正在分析...

Tool Call...
execute_python()

stdout streaming...
parsing page 1...
parsing page 2...
```

目标：

让用户感觉：

> Agent 正在真实工作

---

# 十、输入区域

固定底部。

布局：

```text
┌──────────────────────────────┐
│ 输入框                        │
├──────────────────────────────┤
│ @Agent  @Model  Attach  Run  │
└──────────────────────────────┘
```

---

## 输入框设计原则

不要：

- 巨型聊天输入框
- IM 风格输入区

要：

- IDE Command 风格
- 紧凑
- 专注输入

推荐高度：

```text
44px ~ 64px
```

---

# 十一、右侧 Inspector 面板（高级模式）

后期可增加：

```text
Inspector
├── Session Info
├── Context
├── Files
├── Agent State
├── Tool Usage
├── Token Usage
└── Logs
```

目标：

增强：

- 可观测性
- 专业感
- Agent 状态透明度

---

# 十二、颜色系统

## Dark Graphite Theme

主背景：

```css
#0F1115
#151922
#1B2230
```

文字：

```css
#D7DBE0
#AAB2BF
#7D8590
```

强调色：

```css
#4D8DFF
```

边框：

```css
#232834
```

---

# 十三、字体系统

Windows：

```text
Segoe UI
```

代码字体：

```text
JetBrains Mono
```

中文：

```text
MiSans
HarmonyOS Sans
```

---

# 十四、动画系统

原则：

```text
Subtle Motion
```

不要：

- 大范围动画
- 弹簧动画
- 浮夸过渡

推荐：

- opacity
- translateY(2px)
- caret pulse
- smooth collapse

动画时间：

```text
120ms ~ 180ms
```

---

# 十五、状态机设计

推荐状态：

```text
IDLE
THINKING
TOOL_RUNNING
STREAMING
WAITING_INPUT
ERROR
```

系统必须：

```text
event-driven
```

不要：

```text
message-driven only
```

---

# 十六、推荐技术架构

```text
Electron
 ├── React
 ├── Vite
 ├── Tailwind
 ├── shadcn/ui
 ├── Zustand
 ├── React Query
 ├── xterm.js
 └── monaco-editor
```

---

# 十七、MVP 阶段建议

第一阶段仅实现：

## 1. Session 页面

核心 Agent 工作区。

---

## 2. 文件上传

支持：

- drag & drop
- markdown preview
- upload progress

---

## 3. Knowledge Base 页面

树形结构即可。

---

# 十八、产品核心定位

不要做成：

```text
AI Chat App
```

而是：

```text
Agent Operating System
```

这是整个产品最重要的设计哲学。

