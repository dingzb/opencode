# OpenCode Workspace UI/UX 设计文档（v0.1）

## 1. 产品定位

本项目不是一个单纯的 OpenCode 前端，而是一个：

> 基于 OpenCode Runtime 的 AI Workspace（智能工作台）

系统允许：

* 使用 OpenCode 作为 Agent Runtime
* 扩展甚至修改 OpenCode Server 行为
* 构建独立功能模块
* 支持插件化能力
* 演化为完整的 Agent 工作环境

因此：

> 本产品不是聊天软件，也不是 OpenCode Skin。

而是：

> 面向 AI Agent 的专业工作台。

整体定位更接近：

* IDE
* 桌面生产力工具
* Agent Workspace

而非传统 Web SaaS 页面。

---

# 2. 设计哲学

整体视觉风格参考：

* macOS Desktop App
* GNOME Application
* VSCode / JetBrains 等 IDE
* OpenAI Codex 的简洁消息流

但避免直接模仿任何单一产品。

核心设计原则：

### 2.1 沉浸式桌面工具体验

整体应更像：

> 桌面工具

而不是：

> 网站

避免：

* 后台管理系统感
* 过强边框
* 高饱和 UI
* 大量视觉装饰

推荐：

* 留白
* 轻边界
* 弱阴影
* 柔和层级
* 长时间使用不疲劳

整体气质：

> 专业、克制、安静。

---

### 2.2 聊天优先，但不是聊天产品

聊天是核心能力。

但系统最终目标是：

> Workspace（工作台）

因此未来需要支持：

* Plugin
* MCP
* Knowledge
* Project
* Multi-Agent
* Memory
* Workflow

所以 UI 不应围绕：

> 单纯聊天页面

设计。

---

## 3. 信息架构（IA）

整体结构：

```text
Workspace
├── Chats
├── Agent Runtime
├── Project
├── Plugin
├── Knowledge
├── Settings
└── Inspector
```

原则：

> 所有新增能力都应该自然融入现有导航体系。

避免：

> 功能越做越乱。

---

## 4. 页面整体布局

整体采用：

> Rich Title Bar + 三栏布局

结构：

```text
┌─────────────────────────────────────────────┐
│ Rich Title Bar                              │
├────────────┬────────────────┬──────────────┤
│ 左侧边栏    │ 主对话区域      │ Inspector   │
├────────────┼────────────────┼──────────────┤
│ 会话/功能   │ Markdown消息流 │ 标签面板     │
└────────────┴────────────────┴──────────────┘
```

原则：

* 中央区域始终是视觉中心
* 左右面板可折叠
* 不牺牲聊天体验

---

## 5. Rich Title Bar（富标题栏）

使用：

> 自定义富标题栏

而不是系统默认标题栏。

标题栏承担：

* 当前上下文显示
* 当前会话名
* 页面名称
* 全局入口
* 快捷操作

示例：

```text
Buzi > 会话 > PPT解析实验
```

而不是简单：

```text
OpenCode
```

标题栏建议结构：

```text
TitleBar
├── WindowControls
├── TitleContent
└── TitleActions
```

### 5.1 标题栏内容

TitleContent：

显示：

* 当前会话
* 页面名称
* 面包屑路径

例如：

```text
Buzi > 会话 > OpenCode Event Stream 调试
```

---

### 5.2 标题栏操作区

右侧建议包含：

* 新建会话
* 搜索
* Inspector 开关
* 面板切换
* Workspace Menu

保持轻量。

不要过于拥挤。

---

### 5.3 Workspace Menu

不推荐：

> 用户头像中心

即：

```text
🙂 Avatar
```

更推荐：

> Workspace Menu

例如：

```text
Buzi ▾
```

展开：

* 工作区切换
* 设置
* 同步状态
* 帮助
* 关于

整体更符合：

> IDE / Workspace 气质

而不是聊天产品。

---

## 6. 跨平台窗口控制逻辑

由于采用富标题栏。

桌面版需要自行处理：

> Window Controls

但 Web 不需要。

### macOS

位于：

> 左上角

样式：

```text
● ● ●
```

traffic lights 风格。

---

### Windows / Linux

位于：

> 右上角

样式：

```text
_ □ ✕
```

保持接近系统原生。

不强行自定义奇怪样式。

---

### Web

不显示：

> 窗口控制按钮

仅保留：

> 应用标题栏

---

### 核心原则

平台差异：

> 属于 Shell

不是业务 UI。

业务组件不应该知道：

* 当前系统
* 按钮位置
* 平台差异

统一由：

```text
DesktopShell
WebShell
```

处理。

---

## 7. 标题栏拖拽区域

桌面版标题栏需要支持：

> 窗口拖动

注意：

拖拽区域与交互区域必须分离。

允许拖动：

* 空白标题区域

不可拖动：

* 输入框
* Tab
* Button
* Search
* Dropdown

避免：

> 点击按钮时拖动窗口

---

## 8. 左侧边栏

左侧边栏承担两个职责：

### 8.1 会话模式（默认）

默认：

> 会话优先

上方：

会话列表。

支持：

* 时间分组
* 搜索
* Pin
* 收藏（后期）

下方：

收紧的工具栏。

形式：

```text
⚙ ❓ 🧩 📁 ⋯
```

特点：

* 固定底部
* icon-only
* 极简
* 不打扰聊天

类似：

> Dock / Quick Action

---

### 8.2 功能模式（展开）

点击工具栏后：

进入：

> 功能模式

展示：

```text
设置
帮助
插件
项目
知识库
更多
```

形式：

> icon + label

规则：

* 一级最多 5 个
* 超出进入“更多”

避免侧边栏膨胀。

建议：

> 会话模式与功能模式切换

而不是强堆叠。

避免认知负担。

---

## 9. 中央对话区域

核心区域。

风格：

> Codex 风格消息流

但更清晰。

### 用户消息

* 靠右
* 简洁气泡
* 不夸张

---

### Agent 消息

Markdown 渲染。

支持：

* Code Block
* Table
* Mermaid
* 引用
* 数学公式（后期）

强调：

> 可读性

而不是视觉花哨。

---

### Tool Call

独立卡片展示。

例如：

```text
Tool: read_file
状态：已完成
```

要求：

* 可折叠
* 可查看详情
* 展示状态

---

### Thinking

默认：

> 折叠

用户按需查看。

原则：

> 能力透明，但不打扰。

---

## 10. 输入区域

输入框固定底部。

长期稳定存在。

不要跳动。

支持：

* 文本
* 文件
* Slash Command
* 快捷动作

右侧：

模型切换。

例如：

```text
Claude / GPT / DeepSeek
```

---

## 11. Right Inspector（右侧 Inspector）

右侧不是普通侧栏。

而是：

> Agent Runtime Inspector

作用：

> 观察 Agent 行为

采用：

> Tab 模式

例如：

```text
模型
上下文
Token
变更
事件
```

包含：

### 模型

* Provider
* Model
* Thinking
* Context

### Token

* Input
* Output
* Reasoning
* Cost

### Context

显示：

* Context 使用量
* 当前上下文状态

### Event Timeline

展示：

* Tool 执行
* LLM 响应
* Agent 行为

### File Changes

展示：

* 新建文件
* 修改文件
* 删除文件

形成：

> 可观测 AI Runtime

---

## 12. Desktop / Web 共用 UI 策略

目标：

> 一套 UI

同时支持：

* Desktop
* Web

原则：

> Shared UI + Different Shell

结构建议：

```text
AppShell
├── DesktopShell
├── WebShell
└── SharedWorkspace
```

核心业务组件共享：

* Sidebar
* ChatView
* Inspector
* Composer
* MessageList

不要：

在每个组件里：

```ts
if (desktop)
if (web)
```

平台差异统一在：

> Shell 层

处理。

---

## 13. 响应式布局策略

需要从第一天规划。

不是后补。

### Large

完整三栏：

```text
Sidebar + Chat + Inspector
```

---

### Medium

默认：

> Inspector 折叠

只保留：

```text
Sidebar + Chat
```

---

### Narrow

主聊天优先。

左右栏：

> Overlay Panel

形式：

Drawer。

---

### Mobile（后期）

单栏模式。

仅保留：

> Chat

其他：

抽屉化。

---

### 原则

功能：

> 不消失

只改变：

> 承载方式

例如：

```text
Sidebar → Drawer
Inspector → Overlay
Toolbar → More Menu
```

---

## 14. 动效原则

动画轻量。

建议：

> 200~250ms

强调：

> 桌面工具感

避免：

* 飞入飞出
* 大幅缩放
* 花哨动画

保持：

> 稳定、克制。

---

## 15. 给 Codex 的实现建议

推荐组件结构：

```text
AppShell
 ├── TitleBar
 ├── LeftSidebar
 ├── ChatView
 ├── MessageList
 ├── Composer
 └── RightInspector
```

状态抽象：

不要直接绑定：

> OpenCode 数据结构

建议抽象：

```text
Chat
Workspace
AgentRuntime
ToolExecution
EventStream
```

方便未来：

* 修改 OpenCode Server
* 替换 Runtime
* 增加能力

避免后期重构。

---

## 16. 核心原则总结

本产品：

不是：

> 聊天软件

不是：

> OpenCode UI Skin

而是：

> 面向 AI Agent 的 Workspace。

UI 目标：

> 专业、沉浸、可扩展、长期使用不疲劳。

所有设计决策优先满足：

> 长期可扩展性与专业工作流体验。
