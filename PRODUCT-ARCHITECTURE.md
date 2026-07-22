# SilicoEco 产品与技术架构设计 v0.1

> 定位：面向个人与企业的 Agent Work OS。以 Task Graph 为唯一工作事实源，把人、Agent、模型、CLI、桌面 App、Web、浏览器与 IM 组织成可治理、可观测、可协作的执行网络。

> 本文降为后续实施参考稿。产品世界观、OS 内核、基本对象和运行规律以 [OS-CONCEPT-ARCHITECTURE.md](./OS-CONCEPT-ARCHITECTURE.md) 为上位设计；技术选择不得反向改变上位概念。

## 1. 结论先行

SilicoEco 不应被定义为“另一个聊天客户端”或“另一个 Agent Runtime”。它应当是由三个产品共同组成的一套 Agent 工作操作系统：

1. **Silico Node**：local-first 的通用运行节点，既可作为独立二进制/CLI/daemon 使用，也作为桌面端 sidecar，还可被 WorkBuddy、IDE、MCP Client、其他 Agent 平台调用。
2. **Silico Workspace**：桌面端和 Web 端共用的一套工作台，融合 Channel、Thread、Task、Browser、Project、Artifact、Approval、Activity，而不是维护两套产品。
3. **Silico Control Plane**：面向团队和企业的组织控制面，负责身份、组织、Agent 编制、策略、任务调度、审计、连接器和多节点协作，但默认不接触本地代码、浏览器 Cookie 和模型密钥。

产品的核心不是 Chat，而是 **Task Graph + Event Stream + Policy Engine**：

- Chat、IM、浏览器页面、CLI 命令都是 Task 的入口；
- Agent、外部 CLI、浏览器自动化、工作流都是 Task 的执行器；
- Comment、Progress、Artifact、Approval、Audit 都挂在 Task/Run 上；
- Desktop、Web、IM、WorkBuddy 只是同一状态的不同投影；
- FDD 是内置工作流模板，不应继续成为独立的第二套任务系统。

一句话价值主张：

> 让组织像管理员工一样管理 Agent，又让 Agent 像使用操作系统一样调用浏览器、应用、CLI、技能和其他 Agent；所有工作最终沉淀为可追踪的任务、证据和组织资产。

## 2. 对现有资产的判断

### 2.1 AnyClaw：能力丰富的 Agent Worker，不适合直接充当全平台内核

已有能力：

- CLI、daemon、FastAPI/SSE sidecar；
- Agent loop、tool loop、memory、session、subagent、cron；
- Skills、MCP Client、Feishu/Discord channel；
- workspace/persona、安全路径、凭证与 SSRF 防护；
- Python wheel 与 PyInstaller sidecar 打包。

建议复用方式：

- 第一阶段把 AnyClaw 作为 `RuntimeAdapter` 和兼容 worker 接入；
- 复用其 skills、channel、memory、MCP 和 provider 适配经验；
- 不直接把 Python Event Loop 作为桌面、CLI、企业调度的共同内核；
- 不让 AnyClaw 自己继续拥有平台级 Task 真相源。

原因：Python runtime 对快速扩展非常好，但 Silico Node 还要承担单二进制分发、daemon、进程监管、本地 IPC、权限隔离、跨平台升级和桌面共享内核。这个底层更适合沿用 SlockAI 已有 Rust 路线。

### 2.2 SlockAI / AgentsZone：最接近 Workspace 与 Node 的产品骨架

已有能力：

- Tauri v2 + React 桌面应用；
- Channel、Thread、@Agent、上下文压缩；
- Claude Code、Codex runtime 抽象和持久进程；
- SQLite + JSONL + Keyring；
- Task、Dependency、History、同步/异步执行；
- A2A、远端 connection、LAN/mDNS；
- 独立 Rust `az-bridge` 二进制。

建议复用方式：

- Tauri/React 界面演进成 Silico Workspace；
- Rust runtime、bridge 和 storage 演进成 `silico-core` 与 `silicod`；
- Task Engine 的状态模型升级为平台 Task Graph；
- A2A bridge 从“开放 workspace 文件”升级为经过授权的 Agent/Task 协议网关。

现状不足：

- Task 队列是进程内 `VecDeque`，daemon 重启后不能可靠恢复；
- Task、Run、Attempt 尚未分离，重试、恢复、迁移和审计会互相污染；
- `agent_busy` 只是内存状态，不足以支撑多节点租约与故障转移；
- Channel/Thread/Task 仍有相互驱动的耦合；
- 远程 bridge 的 `0.0.0.0 + CORS *` 只能用于原型，不能成为企业默认安全模型；
- 本地 SQLite 模型尚未包含 tenant、organization、policy、approval 与 workload identity。

### 2.3 feature-workflow：应升级为 Workflow Pack

已有 FDD 能力：

- project context；
- feature 需求澄清、用户价值切分、依赖图；
- pending/active/blocked/archive 生命周期；
- spec、task、checklist、evidence；
- git branch/worktree 并行；
- implement、verify、auto-fix、complete、归档；
- hook 与 subagent 工作流。

建议：保留 FDD 思想和模板，但将 YAML 队列降级为“Git 可读投影/导出格式”。真正状态进入统一 Task Graph。这样研发 Feature、运营任务、浏览器任务和 HR Agent 任务可以共享一个基础模型，同时保持不同工作流的领域差异。

### 2.4 Edith / HS_jarvis：终端 Agent Harness 与企业知识引擎

项目已定位在 `/Users/ryan/mycode/HS_jarvis`，核心终端 Agent 位于 `HS_jarvis/agent`。它以 EDITH 为产品名，以 Jarvis 为仓库名，基于 `@mariozechner/pi-coding-agent`、TypeScript、React Ink 构建。

已实现或已有明确骨架的能力：

- npm CLI：通过 `edith` 命令启动，支持 `--init`、`--version` 和配置发现；
- Ink/React TUI：流式文本、thinking、tool call、warning、command palette 和状态栏；
- pi SDK Agent Session：多模型 registry、session manager、compaction 和事件订阅；
- 上下文压力监控：token、cache hit、剩余轮数和 warning/critical/emergency；
- EDITH Extension：scan、explore、distill、route、query、index、graphify、governance、obsidian 等工具；
- SubAgent：基于 `pi run --agent ... --json` 的 single/parallel/chain 调度；
- 企业知识三层架构：Layer 0 routing table、Layer 1 quick reference、Layer 2 distillates；
- Markdown/Git 作为开放知识产物，支持其他 Agent 零协议消费；
- Board、知识图谱、知识健康度和治理引擎方向。

它在 SilicoEco 中应承担两个角色：

1. **Silico Terminal Harness 的主要参考实现**：复用其 TUI 信息架构、session event 映射、上下文监控、多模型切换、工具时间线和 slash command 体验。
2. **Knowledge Runtime / Workflow Pack**：把 scan、distill、route、query、graphify、governance 封装成 `edith-adapter` 和 `knowledge-governance` workflow pack，为 Project Context、FDD 需求路由和企业知识沉淀服务。

不建议把 Edith 直接作为 Silico Node 内核：它目前是依赖 Node.js 的 npm CLI，领域目标偏知识生产，进程监管、持久任务租约、远程节点、安全策略和企业调度并不是其主职责。正确方式是由 Rust `silicod` 监管 Edith/pi session，并通过统一 `RuntimeAdapter` 把 pi SDK 事件转换为 RunEvent。

Edith 与其他资产的分工由此变为：

| 资产 | 最适合承担的层级 |
|---|---|
| SlockAI | Desktop/Web Workspace 骨架、Rust Node、Task/A2A 基础 |
| AnyClaw | Python 通用 Agent Worker、MCP/IM/Skill/Memory 生态 |
| Edith / Jarvis | Terminal Harness、pi 多模型 session、上下文监控、企业知识引擎 |
| feature-workflow | FDD Workflow Pack、研发任务切分和验收流程 |

## 3. 产品边界

### 3.1 SilicoEco 要解决什么

- 用户可以从桌面、Web、CLI、浏览器或 IM 创建同一个 Task；
- Task 可被一个 Agent、多个 Agent、工作流或人执行；
- Agent 可以跑在当前电脑、远程主机、企业节点或第三方平台；
- WorkBuddy 或其他 Agent 可以把 SilicoEco 当 MCP Server/CLI 使用；
- SilicoEco 也可以把 Claude Code、Codex、Gemini、AnyClaw、Edith/pi、外部 MCP/A2A Agent 当执行器使用；
- 企业可以决定什么 Agent 对谁可见、能处理什么数据、能调用哪些工具、何时必须审批；
- 每次工作都有状态、进度、成本、证据、产物和审计链。

### 3.2 第一阶段明确不做

- 不自研基础模型；
- 不重写 Claude Code/Codex 等成熟 coding harness；
- 不一开始制造完整 Chromium 浏览器；
- 不把所有 IM 消息复制成一套新的聊天历史；
- 不承诺跨所有平台完全相同的 GUI 自动化能力；
- 不直接做工资、招聘、绩效等完整 HR SaaS；只做 Agent Workforce Management。

## 4. 总体架构

```text
┌──────────────────────────── Experience Plane ────────────────────────────┐
│ Desktop(Tauri) │ Web(B/S) │ CLI │ Browser Extension │ IM Bots │ SDK     │
└───────────────────────────────┬───────────────────────────────────────────┘
                                │ 同一 API / Event Stream
┌───────────────────────────────▼───────────────────────────────────────────┐
│                         Control Plane                                    │
│ Org/IAM │ Agent Registry │ Task Graph │ Scheduler │ Policy │ Audit       │
│ Channel/Thread │ Workflow Registry │ Connector Hub │ Realtime Gateway    │
└───────────────────────┬───────────────────────────┬───────────────────────┘
                        │ Dispatch/Event            │ MCP/A2A/Webhook
┌───────────────────────▼───────────────┐  ┌────────▼──────────────────────┐
│              Silico Node             │  │ External Platforms/Agents    │
│ silicod │ silico CLI │ MCP Gateway   │  │ WorkBuddy │ MCP │ A2A │ IDE  │
│ Runtime Manager │ Vault │ Local Store│  └───────────────────────────────┘
│ Browser/App Bridge │ Policy Enforcer │
└──────────────┬────────────────────────┘
               │ Adapter
┌──────────────▼────────────────────────────────────────────────────────────┐
│                         Execution Plane                                  │
│ AnyClaw │ Claude Code │ Codex │ Gemini │ Shell │ Browser │ Desktop Apps  │
│ Workflow Runner │ Remote Agent │ Human Executor                           │
└───────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Local-first 与 Cloud 协作不是二选一

建议采用“控制面云端可选、执行面本地优先”的混合模式：

- Personal/Offline：Node + Desktop + SQLite 可独立运行；
- Team Cloud：Control Plane 保存组织、Task、Comment、Policy 和脱敏后的 Artifact 元数据；
- Self-hosted：Control Plane 可企业私有部署；
- 敏感模式：代码、Cookie、密钥、完整 tool result 只留在 Node；云端只保存状态与摘要；
- 企业可按 Project/Data Classification 配置同步级别。

### 4.2 Desktop 与 Web 合并方式

Desktop 和 B/S Web 应共用一个 React 应用、路由和设计系统：

- Web 连接 Control Plane；需要本机能力时，通过已配对的 Silico Node；
- Desktop 使用同一前端，并通过 Tauri IPC 直接访问内置 Node；
- Desktop 额外提供 daemon 自启动、本地文件、系统通知、Keychain、快捷键和自动升级；
- 两端读取同一个 Task/Event 模型，不进行业务逻辑分叉。

这里的“合并”是共享产品和状态，不是把网页粗暴包进 WebView。

### 4.3 浏览器能力采用双后端

1. **Browser Extension + Native Messaging/安全 localhost bridge**：接管用户已有 Chrome/Edge 登录态，适合辅助式任务和读取当前上下文。
2. **Managed Browser Context（Playwright/CDP）**：使用隔离 profile 执行自动化，适合后台、可复现和高风险任务。

桌面工作台可以呈现 Tab、快照、录像和操作时间线，但第一阶段不自研浏览器内核。后续只有在 workspace tab 隔离、身份 profile 和深度浏览器 UI 成为核心壁垒后，再评估嵌入 Chromium。

## 5. Silico Node 设计

### 5.1 进程与发布形态

同一套 Rust core 产出：

```text
silico                 # CLI 客户端
silicod                # 常驻 daemon / task worker
Silico Desktop.app     # Tauri GUI，捆绑 silicod sidecar
silico-mcp             # 可独立 stdio 启动，也可由 silico mcp serve 启动
```

CLI 示例：

```bash
silico setup
silico login
silico node start
silico runtime detect
silico agent list
silico task create --project demo --title "修复登录问题"
silico task run TASK_ID --agent backend-dev --follow
silico task watch TASK_ID
silico workflow run feature-dev --input requirement.md
silico mcp serve --stdio
silico gateway serve --bind 127.0.0.1
```

### 5.2 内部组件

| 组件 | 职责 |
|---|---|
| Runtime Manager | 检测、注册、启动、复用和监管 Claude/Codex/AnyClaw 等 runtime |
| Task Worker | 基于租约 claim task，创建 Run/Attempt，心跳、取消、恢复 |
| Workflow Runner | 解释声明式工作流 DAG，执行 step、gate、retry、compensation |
| MCP Gateway | 向外暴露 Silico 能力，同时代理外部 MCP Server |
| Browser/App Bridge | 浏览器 tab、页面动作、桌面 automation 与 app connector |
| Local Policy Enforcer | 在操作发生的最后一跳再次校验 scope、路径、域名、审批 |
| Vault | OS Keychain/企业 Secret Provider，向子进程发短期凭证 |
| Local Store | SQLite/WAL、artifact cache、durable queue、outbox |
| Sync Engine | 与 Control Plane 双向同步事件，离线后幂等补传 |
| Supervisor | daemon、runtime、extension bridge、cron 的健康检查与升级 |

### 5.3 Runtime Adapter Contract

所有执行器必须实现统一能力描述，而不是只提供 `send(prompt)`：

```rust
trait RuntimeAdapter {
    fn manifest(&self) -> RuntimeManifest;
    fn detect(&self) -> DetectionResult;
    fn start_session(&self, ctx: SessionContext) -> SessionHandle;
    fn execute(&self, run: RunRequest) -> Stream<RunEvent>;
    fn respond_to_approval(&self, approval: ApprovalDecision);
    fn checkpoint(&self, session: SessionHandle) -> Checkpoint;
    fn resume(&self, checkpoint: Checkpoint) -> SessionHandle;
    fn cancel(&self, run_id: RunId);
    fn health(&self) -> RuntimeHealth;
}
```

`RuntimeManifest` 至少声明：streaming、session、resume、tool-use、MCP、structured-output、browser、computer-use、max concurrency、sandbox、cost model 和所需 credential scopes。调度器只根据 manifest 匹配任务，避免把 provider 名写死在业务层。

首批 adapter 的实现策略：

| Adapter | 接入方式 | 重点映射 |
|---|---|---|
| Claude Code | 持久子进程/ACP | session、permission、tool use、checkpoint |
| Codex | 持久子进程/协议适配 | thread、event、approval、token usage |
| AnyClaw | Python sidecar API/stdio | agent loop、skill、MCP、memory、IM capability |
| Edith/pi | Node child process 或嵌入 JS worker | TUI/session event、context pressure、knowledge tools、subagent |
| Browser | Playwright/CDP worker | snapshot、action、trace、consent gate |

Edith 已有的 `message_update`、`tool_execution_start/end`、`compaction_start/end`、`agent_end` 和 `error` 事件，可以直接成为 RuntimeAdapter contract test 的第一组真实样本；Silico 层再补充 `task_id/run_id/attempt_id`、approval、artifact 和 cancellation 语义。

### 5.4 协议职责分工

| 协议 | 用途 | 不承担 |
|---|---|---|
| MCP | 工具、资源、Prompt/Skill 的发现与调用 | 平台级任务生命周期真相源 |
| ACP | IDE/CLI Agent session 的双向交互和权限问答 | 企业组织管理 |
| A2A | 跨节点/跨平台委派 Agent Task、状态和 Artifact | 本地工具粒度操作 |
| REST/OpenAPI | 管理型 CRUD、第三方系统集成 | 高频实时事件 |
| WebSocket/SSE | Task/Run/Message/Approval 实时事件 | 权威存储 |
| Webhook | 对外通知和自动化触发 | 双向长会话 |

内部所有协议最终转为 canonical command/event，禁止 MCP Task、A2A Task、IM Task 各自落表。

## 6. 统一领域模型

### 6.1 最小核心实体

```text
Organization
 └─ Workspace
     ├─ Project
     ├─ Channel ─ Thread ─ Message
     ├─ AgentDefinition ─ AgentDeployment ─ RuntimeNode
     ├─ WorkflowDefinition ─ WorkflowVersion
     └─ Task ─ Run ─ Attempt ─ Step
                ├─ Event
                ├─ Artifact
                ├─ Approval
                └─ Usage/Cost
```

关键区分：

- **Task**：用户/业务期望完成的工作，稳定 ID，可有父子和依赖；
- **Run**：Task 的一次执行，可换 Agent、换节点或重新执行；
- **Attempt**：Run 因故障产生的具体尝试；
- **Step**：工作流内部可观察单元；
- **Event**：发生过的不可变事实；
- **Artifact**：文档、代码提交、截图、trace、报告等产物；
- **Approval**：等待人或策略系统作出的决策；
- **Message**：沟通记录，可触发或关联 Task，但不等于 Task。

### 6.2 Task Graph

Task 支持两种关系：

- `parent_of`：工作分解，父任务由所有必要子任务聚合完成；
- `depends_on`：执行前置条件，必须是 DAG，写入时检查环。

建议 Task 状态：

```text
draft → ready → queued → leased → running → review → done
                     ↘ waiting_approval
                     ↘ blocked
                     ↘ paused
任意非终态 → cancelled
running/leased → retrying → queued
```

Task 和 Run 状态不能混用。例如 Task 仍是 `running`，某个 Run 可以 `failed`，随后新 Run 接管；不能因为一次 CLI 进程退出就把业务任务永久标记失败。

### 6.3 Task 必要字段

```yaml
id: uuid
tenant_id: uuid
workspace_id: uuid
project_id: uuid|null
title: string
description: markdown
status: enum
priority: 0..100
creator: PrincipalRef
owner: PrincipalRef|null
assignee: PrincipalRef|null
workflow_ref: name@version|null
parent_id: uuid|null
dependencies: [uuid]
source:
  type: desktop|web|cli|im|api|browser|agent|workflow
  external_id: string|null
context_refs: [ResourceRef]
required_capabilities: [string]
data_classification: public|internal|confidential|restricted
approval_policy_ref: string|null
due_at: datetime|null
version: integer
created_at: datetime
updated_at: datetime
```

所有来自 IM/Webhook 的写入必须携带 `source.external_id` 和 idempotency key，避免重试产生重复任务。

### 6.4 Event Stream

事件示例：

```text
task.created
task.assigned
task.dependency_satisfied
run.queued
run.leased
run.started
run.progressed
tool.requested
approval.requested
approval.decided
artifact.created
run.completed
task.review_requested
task.completed
```

数据库当前状态是事件的投影；外部客户端订阅事件流。个人离线模式可先使用 SQLite event log，团队模式使用 PostgreSQL outbox + realtime gateway。早期不必引入 Kafka。

## 7. FDD / Harness 工作流内置方案

### 7.1 Workflow Pack，而不是硬编码页面

`feature-workflow` 变为内置包 `silico.workflow.feature-development@1`，包含：

```text
manifest.yaml
workflow.yaml
schemas/
  input.schema.json
templates/
  project-context.md
  spec.md
  task.md
  checklist.md
skills/
hooks/
policies/
ui/
```

声明式 DAG：

```text
Intake
  → Explore Project
  → Enrich Requirement
  → Review Spec [gate]
  → Split Feature [conditional]
  → Plan
  → Start Worktree
  → Implement
  → Verify
  → Human/Policy Review [gate]
  → Merge
  → Archive + Learn
```

### 7.2 与统一 Task 映射

| feature-workflow 现有概念 | 新模型 |
|---|---|
| Feature | Task，`type=feature` |
| 子 Feature | child Task |
| dependencies | TaskDependency |
| pending/active/blocked/archive | Task 状态投影 |
| task.md checklist | Step/Checklist + Markdown 投影 |
| worktree | Execution Resource |
| verification evidence | Artifact |
| archive-log | 完成事件与报表投影 |
| hook | Workflow Hook |
| subagent | child Run / delegated Task |

### 7.3 保留 Git 可读性

平台数据库是真相源，但研发项目仍生成：

```text
.silico/project.yaml
.silico/context.md
features/<task-id>/spec.md
features/<task-id>/task.md
features/<task-id>/evidence/
```

这些文件便于 Agent 在代码仓中直接读取、PR review 和离线协作。写回时使用版本号/ETag，冲突进入 `needs_reconcile`，不能静默覆盖数据库状态。

### 7.4 FDD 的完成门槛

“verify 失败仍自动 complete”不适合作为企业默认值。建议分层：

- Personal Fast：失败可带 warning 完成；
- Team Standard：required checks 必须通过；
- Restricted：检查通过 + 指定角色审批 + Artifact 完整才可完成；
- 工作流显式定义 exception path，并完整审计谁批准了例外。

## 8. Workspace 产品设计

### 8.1 信息架构

```text
Home / Inbox
Projects
Tasks
Channels & Threads
Agents
Browser
Artifacts
Activity & Audit
Admin
```

默认首页不应是空聊天框，而是：我的待决策、运行中任务、等待审批、失败/阻塞、Agent 容量、最近产物。

### 8.2 Task Detail 是核心工作面

一个 Task 页面应同时包含：

- 目标、验收条件、依赖和子任务；
- 关联 Channel/Thread 与外部 IM 来源；
- 当前 Run、Agent、Node、模型、工具调用和实时进度；
- Browser/App 操作时间线；
- Approval 与风险提示；
- Artifact、diff、截图、trace、提交和最终结果；
- 成本、token、耗时、重试；
- 审计与可重放事件。

Chat 是 Task 的协作面板之一，而不是产品导航的唯一中心。

### 8.3 Agent 作为一等成员

Agent 既能加入 Channel、被 @、领取 Task，也必须显示：

- 职位/职责、owner、所属部门；
- runtime 与部署节点；
- skills/capabilities；
- 可见范围与数据权限；
- 当前容量、SLA 和预算；
- 最近任务、成功率、人工接管率、异常；
- 版本和变更记录。

## 9. WorkBuddy、MCP 与 Skills 开放生态

### 9.1 Silico 作为 MCP Server

首批工具：

```text
tasks.list / tasks.get / tasks.create / tasks.update
tasks.claim / tasks.delegate / tasks.cancel
runs.get / runs.watch
approvals.list / approvals.decide
agents.list / agents.get / agents.invoke
projects.get_context
artifacts.list / artifacts.read
browser.list_tabs / browser.snapshot / browser.act
apps.list / apps.invoke
messages.post
```

资源：

```text
silico://workspace/{id}
silico://task/{id}
silico://project/{id}/context
silico://agent/{id}
silico://artifact/{id}
```

对 WorkBuddy 的典型链路：

```text
WorkBuddy → MCP tasks.list(filter=assigned_to_me)
          → tasks.claim(task_id, lease)
          → browser.snapshot / apps.invoke / 自身能力
          → artifacts.create + runs.progress
          → tasks.update(status=review)
```

MCP 调用使用 OAuth 2.1/OIDC 或本地一次性配对 token；scope 至少细化到 workspace、project、task action 和 resource class。`browser.act`、发送消息、写文件等高风险操作还要经过本地 policy/approval。

### 9.2 Silico 作为 MCP Client

MCP Server 注册后生成 capability catalog，绑定到：

- 指定 Agent；
- 指定 Role/Department；
- 指定 Project/Workflow；
- 指定 data classification；
- read/write/execute 管控与审批规则。

Skill 不是天然可信代码。安装时要解析 manifest、来源、签名、所需 scopes、可执行文件和网络域名；更新版本重新评估权限。

### 9.3 Skill 包规范

建议统一为：

```yaml
name: browser-research
version: 1.2.0
description: ...
entrypoints:
  prompt: SKILL.md
  workflow: workflow.yaml
requires:
  capabilities: [browser.read, artifact.write]
  secrets: []
  domains: [example.com]
compatibility:
  runtimes: [silico, anyclaw, claude-code, codex]
signature: ...
```

对 Claude/Codex/WorkBuddy 等格式使用 adapter 转换；平台内部只保存 canonical manifest。

## 10. IM 与外部通讯平台

### 10.1 Connector 统一接口

Feishu/Lark、Slack、Teams、Discord、Telegram、企业微信等实现相同接口：

```text
receive_event
resolve_identity
send_message
update_message
open_thread
upload_artifact
request_approval
verify_signature
```

AnyClaw 已有 Feishu/Discord channel 可作为第一批 adapter 的参考，但 connector 只负责通讯，不自己运行独立 Agent loop。

### 10.2 消息与任务流转规则

- 普通聊天可只做 Message 镜像；
- `/task`、表单、@Agent 或策略识别后创建 Task；
- 平台返回一个稳定 Task Card/链接；
- 后续进度更新原卡片或 thread，不连续刷屏；
- 用户在任意 surface 的评论都写到同一 Thread；
- 完成、失败、审批只由平台事件触发通知；
- connector 保存 external tenant/channel/thread/message ID 映射；
- 所有入站事件以平台 idempotency key 去重。

### 10.3 身份绑定

同一个人可能有 Silico、Feishu、Slack、GitHub 多个身份。使用 `ExternalIdentity → HumanPrincipal` 显式绑定，禁止仅凭显示名合并。未绑定用户只能以 guest policy 操作。

## 11. 企业 Agent Workforce Management

### 11.1 将“Agent HR”产品化

建议命名为 **Agent Workforce / AgentOps HR**，管理的是 Agent 的完整任职周期：

```text
申请岗位 → 定义职责 → 选择模板/runtime → 安全审查 → 入职
→ 试运行 → 授权 → 排班/容量 → 任务履约 → 评估
→ 升级/调岗 → 暂停 → 离职/归档 → 权限回收
```

HR/部门主管可以管理编制和可见性；安全管理员管理敏感权限；项目负责人管理任务范围；平台管理员管理基础设施。不能把全部权限交给“HR”一个角色。

### 11.2 身份模型

统一 Principal：

- Human Principal；
- Agent Principal；
- Service Account；
- Runtime Node / Workload Identity；
- External Agent Principal。

需要区分：

- `AgentDefinition`：名字、职责、提示词、skills、默认策略；
- `AgentVersion`：不可变配置版本；
- `AgentDeployment`：某版本部署到某个 Node/runtime；
- `AgentSession`：一次上下文会话；
- `AgentPrincipal`：被授权和审计的身份。

### 11.3 权限模型：RBAC + ABAC + Relationship

只做 RBAC 不够。决策示例：

```text
allow if
  principal.role includes "finance-agent"
  AND task.project in principal.assigned_projects
  AND resource.classification <= principal.clearance
  AND action in agent_version.approved_capabilities
  AND runtime_node.trust_level >= policy.required_trust
  AND current_time within schedule
  AND budget.remaining > estimated_cost
else require approval or deny
```

关系权限覆盖“Agent owner”“项目成员”“Task assignee”“直属主管”等情形。建议策略对象包含：subject、action、resource、context、effect、obligations。

### 11.4 默认企业角色

| 角色 | 主要权限 |
|---|---|
| Org Owner | 组织与计费最终控制 |
| Platform Admin | 节点、runtime、全局配置，不默认读取业务内容 |
| Security Admin | policy、secret、审计、隔离与紧急停止 |
| Agent HR | Agent 岗位、owner、部门、入离职和可见性 |
| Department Manager | 部门 Agent 容量、任务与预算 |
| Project Lead | 项目上下文、Task、workflow 和项目 Agent |
| Auditor | 只读审计与报表 |
| Member | 创建/协作被授权 Task |
| Guest | 限定 workspace/resource 访问 |

### 11.5 绩效不是“模型回答好不好”

Agent 评估维度：

- Task success/SLA；
- 验收一次通过率；
- 回滚和缺陷逃逸率；
- 人工接管/审批驳回率；
- 成本与时延；
- 权限越界尝试；
- Artifact/证据完整度；
- 在相同任务集与固定版本下的回归趋势。

不能用 token 多寡或消息数量作为主要绩效指标。

## 12. 安全架构

### 12.1 关键原则

- 每个 Task 带执行身份、数据分级和 capability scope；
- 调度器校验一次，Node 在最后执行点再校验一次；
- browser、shell、filesystem、message、payment、delete 均为独立高风险 scope；
- 密钥不进入 prompt、Task 描述或 Control Plane 日志；
- 子进程只获得短期、最小权限凭证；
- Artifact 与 tool result 支持本地-only、摘要同步和全量同步三级策略；
- 所有审批绑定具体 action digest，批准后参数变化则审批失效。

### 12.2 Browser/Computer Use 特殊风险

- 网页内容属于不可信输入，不能把页面指令当系统指令；
- 读取与操作权限分开；
- 用户浏览 profile 与自动化 profile 默认隔离；
- 表单提交、发信、上传、购买、删除等动作设置 consent gate；
- 录制 DOM/a11y snapshot、URL、截图和关键动作，敏感字段脱敏；
- domain allowlist/denylist 与数据外发策略在 Node 执行；
- 用户可随时 pause/kill run，紧急停止不依赖云端在线。

### 12.3 Node 连接安全

- 默认只监听 Unix Domain Socket/Named Pipe 或 `127.0.0.1`；
- LAN/Remote 必须显式开启；
- 设备配对采用短期 code + 双向密钥确认；
- 后续使用 mTLS/workload identity、证书轮换和节点吊销；
- Node 心跳携带版本、capability 和 trust posture，不上传 secret；
- 企业可要求设备合规、磁盘加密和特定 sandbox 才能接 restricted task。

## 13. 数据与部署

### 13.1 存储建议

| 场景 | 存储 |
|---|---|
| Node 离线与缓存 | SQLite WAL |
| Control Plane | PostgreSQL |
| Artifact | 本地目录或 S3 兼容对象存储 |
| 搜索 | PostgreSQL FTS/pgvector 起步 |
| Event realtime | PostgreSQL outbox + WebSocket/SSE |
| Secret | OS Keychain / Vault / KMS |

早期不要引入过多微服务和消息中间件。先做模块化单体；当 dispatch、connector、artifact 出现独立伸缩需求时再拆。

### 13.2 一致性策略

- Control Plane 是团队 Task 的权威；
- Node 使用 lease + fencing token，避免断网后两个 worker 同时提交；
- 命令使用 idempotency key；
- 状态更新使用 optimistic version；
- Node durable outbox 保存未上传事件；
- 离线创建 Task 使用 client-generated UUID；
- 冲突不可简单 last-write-wins，Task status/approval/permission 必须按领域规则合并。

## 14. 推荐仓库结构

建议 SilicoEco 采用 monorepo，并以“复制后重构”或保留历史的 subtree 方式吸收成熟代码，不要长期通过跨仓相对路径运行：

```text
SilicoEco/
├─ apps/
│  ├─ desktop/                 # Tauri + shared web UI
│  ├─ web/                     # B/S Web
│  ├─ browser-extension/
│  └─ admin/
├─ crates/
│  ├─ silico-core/             # domain、commands、events
│  ├─ silico-node/             # daemon/worker/supervisor
│  ├─ silico-cli/
│  ├─ silico-policy/
│  ├─ silico-runtime/
│  ├─ silico-mcp/
│  ├─ silico-a2a/
│  └─ silico-browser-bridge/
├─ services/
│  └─ control-plane/           # 初期模块化单体
├─ packages/
│  ├─ ui/
│  ├─ sdk-ts/
│  ├─ protocol/
│  └─ workflow-sdk/
├─ runtimes/
│  ├─ anyclaw-adapter/
│  ├─ edith-adapter/
│  ├─ claude-adapter/
│  ├─ codex-adapter/
│  └─ gemini-adapter/
├─ connectors/
│  ├─ feishu/
│  ├─ slack/
│  ├─ teams/
│  └─ discord/
├─ workflow-packs/
│  └─ feature-development/
├─ schemas/
│  ├─ task.schema.json
│  ├─ event.schema.json
│  └─ agent-manifest.schema.json
└─ docs/
```

技术基线建议：Rust 作为 Node/Core/协议网关；React/TypeScript 作为 Desktop/Web UI；Control Plane 第一阶段采用 Rust + Axum + PostgreSQL，统一 domain type，再由 OpenAPI/JSON Schema 生成 TypeScript SDK。

## 15. 分阶段路线

### Phase 0：架构收口与协议骨架（2–3 周）

目标：不做大 UI，先消灭双任务模型。

- 建立 monorepo 与 ADR；
- 定义 Task/Run/Attempt/Event/Artifact/Approval schema；
- 定义 RuntimeAdapter、Connector、Workflow Pack manifest；
- 从 SlockAI 提取 Rust core、CLI、bridge；
- 设计 feature-workflow → Task Graph 迁移器；
- 用 contract tests 固定事件和状态机。

退出标准：同一 Task 能通过 Rust API 创建、持久化、执行、重启恢复并产出事件。

### Phase 1：Personal Local-first MVP（6–8 周）

- `silico` / `silicod` 单二进制安装体验；
- Tauri Desktop 复用 SlockAI UI；
- Claude Code、Codex、AnyClaw adapter；
- Edith/pi adapter 与可复用 Terminal TUI；
- 本地 Task Graph、Run、Approval、Artifact；
- FDD Workflow Pack：intake → split → implement → verify → review；
- MCP Server 首批 task/project/agent/artifact 工具；
- browser extension 读取 tab、snapshot，写操作必须审批；
- 本地 Activity/Audit 与 kill switch。

退出标准：用户可从 Desktop、Silico Terminal、CLI 或 WorkBuddy 创建同一研发任务，由本机 Agent 执行，浏览器中查看进度并完成审批，所有状态一致；同一 Project 的 EDITH 三层知识可以被 FDD 和其他 Runtime 按需消费。

### Phase 2：Team Control Plane（8–10 周）

- Workspace/Project/Members；
- PostgreSQL control plane、realtime、node pairing；
- 多节点 dispatch、lease、heartbeat、offline outbox；
- Web App 与 Desktop 共用 UI；
- Channel/Thread/Task 统一；
- Feishu + Slack/Discord connector；
- RBAC、Agent owner、project scope、基础预算；
- self-hosted 单机部署。

退出标准：多个人、多个 Agent、两台机器能通过 Web/Desktop/IM 协作同一个 Task Graph，断线恢复不重复执行。

### Phase 3：Enterprise Governance（10–14 周）

- OIDC/SAML/SCIM；
- RBAC + ABAC + relationship policy；
- Agent onboarding/offboarding、version approval；
- Secret/KMS/Vault、短期凭证；
- 数据分级、DLP、审计导出、retention；
- 高风险审批、四眼原则、emergency revoke；
- HA/self-hosted、备份恢复、可观测性。

退出标准：能用真实企业权限矩阵证明“某 Agent 在某项目、某节点、某时间仅能执行已授权能力”，且全过程可审计。

### Phase 4：生态与规模化

- Workflow/Skill/Connector marketplace；
- 签名、信任等级、组织私有市场；
- A2A federation 与外部 Agent；
- 可复现 benchmark、Agent evaluation；
- workflow replay/optimization；
- 移动审批与管理视图。

## 16. 首批纵向用例

不要按基础设施模块分别做完再集成，应选择三条端到端 vertical slice：

### 用例 A：研发 Feature

Web/桌面输入需求 → FDD 切分 → Codex/Claude 在 worktree 执行 → Playwright 证据 → 人审 → 合并 → IM 通知。

验证 Task Graph、workflow、runtime、artifact、approval。

### 用例 B：浏览器运营任务

Feishu 群创建任务 → Agent 打开隔离浏览器收集信息/填写草稿 → 提交前审批 → 结果和截图回到同一 Task。

验证 IM、browser、权限、prompt injection 防护。

### 用例 C：企业 Agent 入职

Agent HR 创建“财务助理”岗位 → 安全管理员批准 skills/domain → 部署到合规 Node → 仅财务 Project 可见 → 完成试运行 benchmark → 正式启用。

验证组织、身份、权限、版本和审计。

## 17. 关键决策与取舍

1. **Task-first，不是 chat-first**：聊天自然，但不能承载可靠状态、依赖、重试和审计。
2. **Node 与 Control Plane 分离**：企业协作需要中心真相，本地敏感执行又不能全部上云。
3. **Rust core + Python worker 共存**：复用 AnyClaw 生态，不让 Python sidecar 决定全平台生命周期。
4. **FDD 是 pack，不是特例**：否则未来运营、HR、销售工作流都会复制一套 task engine。
5. **Desktop/Web 同构**：共享 UI 与 API，桌面只增加 privileged capabilities。
6. **先 extension/Playwright，后浏览器内核**：把资源投入 Task、权限和生态这一真正壁垒。
7. **事件驱动但不过早 Kafka**：PostgreSQL outbox 足够支撑早期可靠性。
8. **Agent 是 Principal，不只是配置文件**：只有成为身份主体，授权、审计和入离职才成立。
9. **MCP 是能力入口，不是内部总线**：内部领域模型不能受某个外部协议限制。
10. **审批绑定动作摘要**：用户批准的是具体行为，而不是给 Agent 一张无限期通行证。

## 18. 主要风险

| 风险 | 表现 | 缓解 |
|---|---|---|
| 范围爆炸 | 同时做 runtime、Slack、Jira、浏览器、HR | 以三条 vertical slice 驱动，冻结非核心 connector |
| 双真相源 | YAML、SQLite、云 DB、IM 各有状态 | canonical Task/Event + projection，所有写入走 command |
| 协议误用 | MCP/A2A/ACP 互相替代 | 明确协议职责与内部 canonical model |
| 远程执行重复 | 断网、重试、daemon 重启 | lease、fencing token、idempotency、durable outbox |
| Prompt injection | 网页/IM 指令诱导越权 | trust boundary、read/write 分权、本地 policy、approval |
| Agent 权限蔓延 | skills 更新后能力悄然扩大 | signed manifest、版本审批、scope diff、定期 recertification |
| UI 退化成 Slack 克隆 | 有消息没有工作闭环 | Task Detail、Inbox、Approval、Artifact 为核心导航 |
| 过早自研浏览器 | 大量精力耗在 Chromium | extension + managed context 先验证需求 |
| 复用变复制债务 | 多仓代码直接拼接 | 先 schema/contract，再迁移模块并删除重复实现 |

## 19. 接下来应立即产出的工程件

按优先级：

1. `ADR-001-product-boundary.md`：确认 Agent Work OS、三产品结构；
2. `task.schema.json`、`event.schema.json`、`agent-manifest.schema.json`；
3. Task/Run 状态机与 transition contract tests；
4. `RuntimeAdapter` Rust trait 和 AnyClaw/Claude/Codex adapter spike；
5. `silico mcp serve` 的最小 `tasks.list/get/create/watch`；
6. feature-workflow YAML 导入器与 Markdown projection；
7. Node pairing、lease、fencing 的 threat model；
8. 从 SlockAI 迁移第一版 Desktop shell 和 Task Detail。

在这些工程件完成前，不建议先大规模重做视觉 UI，也不建议先接十个 IM 平台。

## 20. 外部参考所带来的启示

- WorkBuddy 证明了 local gateway、MCP capabilities、persistent workflow、consent 和 sidecar 组合对个人工作流成立；SilicoEco 应在此基础上增加团队 Task 真相源和企业治理。
- Multica 证明了 server 管状态、daemon 在本机驱动已有 coding CLI 的三层模式成立；SilicoEco 的差异应是更通用的 browser/app/IM 工作面，以及 FDD harness 和企业 Agent Workforce。
- Slock/Raft 证明了把 Agent 作为 channel/thread/task 中的一等成员具有强交互价值；SilicoEco 需要进一步把“聊天协作”提升为“受治理的任务执行”。

参考：

- WorkBuddy Docs: https://docs.work-buddy.ai/
- Multica Architecture: https://multica.ai/docs/how-multica-works
- Multica Desktop: https://multica.ai/docs/desktop-app
- Multica Agents: https://multica.ai/docs/agents
- Raft: https://raft.build/
