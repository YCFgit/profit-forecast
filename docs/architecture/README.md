# 系统架构文档

## 文件说明

| 文件 | 说明 | 格式 |
|------|------|------|
| `agents.json` | 6 个 Agent 的完整定义（角色、输入输出、代码位置） | JSON |
| `org_chart.mmd` | Agent 组织架构图（Mermaid） | Mermaid |
| `swimlane.mmd` | 全流程泳道图（5 个 Phase 的协作时序） | Mermaid |
| `index.html` | 多 Agent 智能协作方案（汇报用） | HTML |
| `implementation_plan.html` | 实施方案（20 周 · 6 里程碑 · 团队/成本） | HTML |

## Agent 架构

```
👔 Orchestrator (Hub)
  ├── Phase 1: 🔍 DataAgent        → 数据采集
  ├── Phase 2: 📊 BaselineAgent    → 基线预估
  ├── Phase 3: 🏪 AllocationAgent  → 承压分配
  ├── Phase 4: 💰 ProfitAgent      → 利润测算
  │            📐 CostEstimator    → 真实成本结构
  └── Phase 5: 🛡️ RiskAgent        → 风险评估
```

## 核心数据流

```
StarRocks (ads_fin_fact_day_storeloss_pp)
    ↓ fetch_store_loss()
DataAgent.collect()
    ↓ DataCollectionResult.store_loss
CostEstimator.from_store_loss_data()
    ↓ cost_structures: dict[str, dict]
ProfitAgent.calculate(cost_structures=...)
    ↓ ProfitResult (P&L + 下钻)
RiskAgent.assess()
    ↓ RiskResult (风险报告)
```

## 查看图表

Mermaid 文件可以在以下工具中渲染：
- [Mermaid Live Editor](https://mermaid.live)
- VS Code Mermaid 插件
- GitHub（原生支持 .mmd 文件预览）

HTML 文件直接用浏览器打开即可查看。
