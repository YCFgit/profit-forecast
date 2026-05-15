# 鞋服零售利润测算系统

基线预估 × 承压分配 × 利润测算 — 多 Agent 智能协作

## 快速开始

### 1. 启动基础设施

```bash
cd docker
docker compose up -d
```

### 2. 安装依赖

```bash
pip install -e .
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，配置数据源等
```

### 4. 启动应用

```bash
python run.py
```

API 文档: http://localhost:8000/docs

## 项目结构

```
profit-forecast/
├── src/
│   ├── agents/           # Agent 编排层（Phase 5）
│   ├── allocation/       # 承压分配算法（Phase 3）
│   ├── api/              # FastAPI 路由
│   │   └── routes/       # API 端点
│   ├── baseline/         # 基线预估（Phase 2）
│   ├── core/             # 配置、日志
│   ├── data/
│   │   ├── collectors/   # 数据采集器（DataWorks/Mock/Excel）
│   │   ├── validators/   # 数据校验和质量检查
│   │   └── storage/      # 存储层
│   ├── db/               # SQLAlchemy 模型和连接
│   ├── forecasting/      # 预测模型（Phase 2）
│   ├── profit/           # 利润测算（Phase 4）
│   └── risk/             # 风险评估（Phase 4）
├── docker/               # Docker Compose 配置
├── scripts/              # 启动脚本
├── tests/                # 测试
├── .env.example          # 环境变量模板
├── pyproject.toml        # Python 项目配置
└── run.py                # 应用入口
```

## 数据源配置

在 `.env` 中设置 `DATAWORKS_ADAPTER`：

| 值 | 说明 |
|---|---|
| `mock` | 模拟数据（开发测试用） |
| `dataworks_api` | DataWorks Open API |
| `maxcompute` | MaxCompute 直连 |
| `database` | 从 DataWorks 同步到的中间库 |

## 当前进度

- [x] M1: 项目结构 + Docker + 数据库 Schema
- [x] M1: 数据采集层（可扩展适配器模式）
- [x] M1: FastAPI 应用骨架
- [x] M2: 基线预估模型（v2 业务规则引擎：6 分类 + 季节指数 + 6 预估器）
- [x] M3: 承压分配算法（TargetAllocator + 公平性/约束检查 + 情景模拟）
- [x] M4: 利润测算 + 风险评估（ProfitCalculator + RiskAgent）
- [x] M5: Agent 编排 + Web 界面（Orchestrator + React 前端 4 页面）
- [x] M6: 测试上线（150 测试通过 + Docker Compose + Alembic 迁移）
