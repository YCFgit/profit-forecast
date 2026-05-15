# 数据源接入指南

## 概述

系统支持两种数据源模式：

| 模式 | 配置 | 说明 |
|------|------|------|
| Mock | `DATAWORKS_ADAPTER=mock` | 55 家模拟门店，开发测试用 |
| StarRocks | `DATAWORKS_ADAPTER=starrocks` | 直连生产数据，需配置连接信息 |

切换方式：修改 `.env` 中的 `DATAWORKS_ADAPTER` 值。

---

## 环境变量配置

```bash
# .env
DATAWORKS_ADAPTER=starrocks

# StarRocks 连接（MySQL 协议）
STARROCKS_HOST=your-starrocks-fe-host
STARROCKS_PORT=9030
STARROCKS_USER=your_username
STARROCKS_PASSWORD=your_password
STARROCKS_DATABASE=default
```

---

## 数据源清单

系统需要 8 类数据，对应 `StarRocksCollector` 的 8 个方法：

| # | 方法 | 源表 | 用途 |
|---|------|------|------|
| 1 | `fetch_stores()` | `dws_pub.dws_dim_org_allinfo` | 门店主数据（500+ 门店） |
| 2 | `fetch_daily_sales()` | `proj_facana.dwd_f04_dayone_countbase_pp_new` | 日销售/损益数据 |
| 3 | `fetch_monthly_metrics()` | 同上（聚合） | 月度指标汇总 |
| 4 | `fetch_targets()` | `spark_catalog.ads_pub.ads_fact_pos_ord_analysis` | 目标数据 |
| 5 | `fetch_staff()` | `proj_facana.dwd_f04_dayone_s_store_info` | 门店人员数据 |
| 6 | `fetch_cost_structure()` | `proj_facana.ads_fin_fact_day_storeloss_pp` | 成本结构 |
| 7 | `fetch_daily_target_cost()` | `dws_pub.dws_fact_day_org_target_cost` | 日目标数据（v2 预估用） |
| 8 | `fetch_switch_status()` | `dws_pub.dws_dim_org_on_off` | 开关状态矩阵（v2 预估用） |

---

## 各数据源详细说明

### 1. 门店主数据 — `fetch_stores()`

**源表**: `dws_pub.dws_dim_org_allinfo`（DIM 机构信息维表，约 187 列）

**SQL**:
```sql
SELECT
    org_lno            AS store_code,       -- 门店编码（主键）
    org_name           AS store_name,       -- 门店名称
    store_abbr         AS store_short_name, -- 门店简称
    brd_dtl_abbr       AS brand,            -- 品牌（如"品牌A"）
    store_type_name    AS store_type,       -- 门店类型（直营/加盟等）
    store_channel_name1 AS channel_l1,      -- 渠道一级
    store_channel_name2 AS channel_l2,      -- 渠道二级
    store_channel_name3 AS channel_l3,      -- 渠道三级
    big_region_name    AS region,           -- 大区（华东/华南/...）
    region_name        AS sub_region,       -- 子区域
    mc_name            AS city,             -- 城市
    province_name      AS province,         -- 省份
    city_name          AS admin_city,       -- 行政城市
    biz_attr_name      AS business_attribute, -- 业态属性
    biz_attr_name2     AS business_category,  -- 业态分类
    biz_attr_name3     AS business_detail,    -- 业态明细
    store_level_name   AS store_level,     -- 门店等级
    mall_name          AS mall_name,       -- 商场名称
    biz_circle_name    AS commercial_circle, -- 商圈
    city_level         AS city_level,      -- 城市等级
    biz_area           AS business_area,   -- 营业面积
    area_total         AS total_area,      -- 总面积
    open_date          AS opening_date,    -- 开业日期
    close_date         AS closing_date,    -- 关闭日期
    actual_open_date   AS actual_open_date,-- 实际开业日期
    real_withdrawal_date AS withdrawal_date, -- 实际撤店日期
    store_status       AS status,          -- 状态（1=营业）
    is_entity          AS is_entity,       -- 是否实体（1=是）
    is_new_flag        AS is_new_store,    -- 新店标记
    property_cooperation AS cooperation_mode, -- 合作模式
    property_cooperation_cond AS cooperation_cond,
    settlement_mth     AS settlement_method, -- 结算方式
    self_checking_mode AS self_cash_mode,
    big_store_format   AS big_store_format,
    org_sal_biz_type   AS sales_biz_type,
    org_sal_mode       AS sales_mode,
    fin_code           AS fin_code,
    virtual_shop_type  AS virtual_shop_type, -- 虚拟店类型（非空=虚拟店）
    store_type         AS store_type_flag,   -- 门店类型标记
    etl_update_time    AS etl_update_time
FROM dws_pub.dws_dim_org_allinfo
WHERE store_status = 1   -- 只取营业中
  AND is_entity = 1      -- 只取实体门店
ORDER BY org_lno
```

**关键字段说明**:
- `virtual_shop_type`: 非空值表示虚拟店（如"线上店"、"直播店"），用于 v2 预估的虚拟店分类
- `store_type_flag`: 用于判断临时特卖店
- `is_new_flag`: 新店标记
- `brd_dtl_abbr`: 品牌名称，用于季节指数计算（品牌×区域）

**输出格式**（约 35 列）:

| 字段 | 类型 | 说明 |
|------|------|------|
| store_code | string | 门店编码（如 "ST0001"） |
| store_name | string | 门店名称 |
| brand | string | 品牌名 |
| store_type | string | 门店类型 |
| region | string | 大区 |
| city | string | 城市 |
| province | string | 省份 |
| opening_date | date | 开业日期 |
| closing_date | date | 关闭日期（可空） |
| status | int | 状态 |
| virtual_shop_type | string | 虚拟店类型（可空） |
| store_type_flag | string | 门店类型标记 |
| ... | ... | ... |

---

### 2. 日销售/损益数据 — `fetch_daily_sales()`

**源表**: `proj_facana.dwd_f04_dayone_countbase_pp_new`（日实时损益表-业绩版，约 270 列）

**SQL**:
```sql
SELECT
    store_no                         AS store_code,
    base_date                        AS sale_date,
    brand_detail_abbreviation        AS brand,
    -- 销售额
    total_sal_amt                    AS sales_amount,
    total_prm_amt                    AS tag_price_amount,
    shoes_sal_amt                    AS shoes_sales,
    clothes_sal_amt                  AS clothes_sales,
    bag_sal_amt                      AS bag_sales,
    parts_sal_amt                    AS parts_sales,
    -- 成本
    taxcost                          AS tax_cost,
    hq_taxcost                       AS hq_tax_cost,
    notax_cost                       AS notax_cost,
    -- 毛利
    tax_gross_profit                 AS tax_gross_profit,
    notax_gross_profit               AS notax_gross_profit,
    hq_tax_gross_profit              AS hq_tax_gross_profit,
    hq_notax_gross_profit            AS hq_notax_gross_profit,
    -- 费用
    operating_exp                    AS operating_expense,
    total_operating_exp              AS total_operating_expense,
    bmanaging_exp                    AS b_managing_expense,
    managing_exp                     AS managing_expense,
    financial_exp                    AS financial_expense,
    additional_taxes                 AS additional_taxes,
    -- 利润
    notax_operating_profit           AS notax_operating_profit,
    hq_notax_operating_profit        AS hq_notax_operating_profit,
    notax_net_profit                 AS notax_net_profit,
    hq_notax_net_profit              AS hq_notax_net_profit,
    net_profit                       AS net_profit,
    -- 折扣
    sal_dct                          AS sales_deduction,
    deduction_rate                   AS deduction_rate,
    -- 收入
    stm_income                       AS settlement_income,
    notax_income                     AS notax_income,
    -- 人员 & 面积
    staff_number                     AS staff_count,
    store_area                       AS store_area,
    -- 门店属性
    affiliation                      AS affiliation,
    region                           AS region,
    province                         AS province,
    managing_city                    AS managing_city,
    business_city                    AS business_city,
    store_type                       AS store_type,
    store_status                     AS store_status,
    business_attribute               AS business_attribute,
    distribution_level               AS distribution_level,
    prop_cooperation_mode            AS cooperation_mode,
    prop_cooperation_conds           AS cooperation_cond,
    -- 目标
    total_sal_amt_pp                 AS total_sales_pp,
    total_sal_amt_dpp                AS total_sales_dpp,
    -- 税率
    income_tax_rate                  AS income_tax_rate,
    hq_income_tax_rate               AS hq_income_tax_rate,
    etl_update_time                  AS etl_update_time
FROM proj_facana.dwd_f04_dayone_countbase_pp_new
WHERE store_no IN (:store_codes)     -- 可选
  AND base_date >= :start_date       -- 可选
  AND base_date <= :end_date         -- 可选
ORDER BY store_no, base_date
```

**使用场景**: 大中店预估的"当月前12天推全月"机制需要近 2 个月的日销数据；季节指数计算需要 18-24 个月历史数据。

---

### 3. 月度指标 — `fetch_monthly_metrics()`

**源表**: 同 `fetch_daily_sales()`，按月聚合

**SQL**:
```sql
SELECT
    store_no                         AS store_code,
    SUBSTR(base_date, 1, 7)          AS year_month,  -- YYYY-MM
    brand_detail_abbreviation        AS brand,
    SUM(total_sal_amt)               AS sales_amount,
    SUM(total_prm_amt)               AS tag_price_amount,
    SUM(shoes_sal_amt)               AS shoes_sales,
    SUM(clothes_sal_amt)             AS clothes_sales,
    SUM(bag_sal_amt)                 AS bag_sales,
    SUM(parts_sal_amt)               AS parts_sales,
    SUM(taxcost)                     AS tax_cost,
    SUM(hq_taxcost)                  AS hq_tax_cost,
    SUM(hq_notax_gross_profit)       AS hq_notax_gross_profit,
    SUM(tax_gross_profit)            AS tax_gross_profit,
    SUM(operating_exp)               AS operating_expense,
    SUM(bmanaging_exp)               AS b_managing_expense,
    SUM(additional_taxes)            AS additional_taxes,
    SUM(notax_operating_profit)      AS notax_operating_profit,
    SUM(hq_notax_operating_profit)   AS hq_notax_operating_profit,
    SUM(notax_net_profit)            AS notax_net_profit,
    SUM(hq_notax_net_profit)         AS hq_notax_net_profit,
    SUM(net_profit)                  AS net_profit,
    CASE WHEN SUM(total_prm_amt) > 0
         THEN SUM(sal_dct) / SUM(total_prm_amt)
         ELSE 0 END                  AS deduction_rate,
    CASE WHEN MAX(store_area) > 0
         THEN SUM(total_sal_amt) / MAX(store_area)
         ELSE 0 END                  AS sales_per_sqm,
    CASE WHEN MAX(staff_number) > 0
         THEN SUM(total_sal_amt) / MAX(staff_number)
         ELSE 0 END                  AS revenue_per_staff,
    CASE WHEN SUM(total_sal_amt) > 0
         THEN SUM(hq_notax_gross_profit) / SUM(total_sal_amt)
         ELSE 0 END                  AS gross_margin,
    CASE WHEN SUM(total_sal_amt) > 0
         THEN SUM(notax_operating_profit) / SUM(total_sal_amt)
         ELSE 0 END                  AS operating_margin,
    CASE WHEN SUM(total_sal_amt) > 0
         THEN SUM(notax_net_profit) / SUM(total_sal_amt)
         ELSE 0 END                  AS net_margin,
    MAX(store_area)                  AS store_area,
    MAX(staff_number)                AS staff_count
FROM proj_facana.dwd_f04_dayone_countbase_pp_new
WHERE SUBSTR(base_date, 1, 7) >= :start_month
  AND SUBSTR(base_date, 1, 7) <= :end_month
GROUP BY store_no, SUBSTR(base_date, 1, 7), brand_detail_abbreviation
ORDER BY store_no, year_month
```

**使用场景**: 门店分类（计算月均业绩）、季节指数计算、大中店预估（加权近月）。

---

### 4. 目标数据 — `fetch_targets()`

**源表**: `spark_catalog.ads_pub.ads_fact_pos_ord_analysis`（POS 订单分析表）

**SQL**:
```sql
SELECT
    store_no              AS store_code,
    base_date             AS target_date,
    brand                 AS brand,
    channel_name          AS channel,
    sal_amt               AS sales_amount,
    sal_qty               AS sales_qty,
    tag_price_amt         AS tag_price_amount,
    cost_amt              AS cost_amount,
    discount_rate         AS discount_rate,
    return_amt            AS return_amount,
    return_qty            AS return_qty,
    customer_count        AS customer_count
FROM spark_catalog.ads_pub.ads_fact_pos_ord_analysis
WHERE store_no IN (:store_codes)
  AND base_date >= :start_date
  AND base_date <= :end_date
ORDER BY store_no, base_date
```

**使用场景**: 承压分配的目标设定。

---

### 5. 门店人员数据 — `fetch_staff()`

**源表**: `proj_facana.dwd_f04_dayone_s_store_info`（日实时扩充店铺信息）

**SQL**:
```sql
SELECT
    store_no              AS store_code,
    staff_name            AS staff_name,
    role                  AS role,
    base_salary           AS base_salary,
    commission_rate       AS commission_rate,
    hire_date             AS hire_date,
    leave_date            AS leave_date,
    status                AS status
FROM proj_facana.dwd_f04_dayone_s_store_info
WHERE store_no IN (:store_codes)
ORDER BY store_no, staff_name
```

**使用场景**: 利润测算中的人力成本计算。

---

### 6. 成本结构 — `fetch_cost_structure()`

**源表**: `proj_facana.ads_fin_fact_day_storeloss_pp`（日门店损益表）

**SQL**:
```sql
SELECT
    store_no              AS store_code,
    SUBSTR(base_date, 1, 7) AS year_month,
    SUM(procurement_cost) AS procurement_cost,
    SUM(labor_cost)       AS labor_cost,
    SUM(rent_cost)        AS rent_cost,
    SUM(logistics_cost)   AS logistics_cost,
    SUM(marketing_cost)   AS marketing_cost,
    SUM(commission_cost)  AS commission_cost,
    SUM(other_cost)       AS other_cost,
    SUM(total_cost)       AS total_cost
FROM proj_facana.ads_fin_fact_day_storeloss_pp
WHERE store_no IN (:store_codes)
  AND SUBSTR(base_date, 1, 7) >= :start_month
  AND SUBSTR(base_date, 1, 7) <= :end_month
GROUP BY store_no, SUBSTR(base_date, 1, 7)
ORDER BY store_no, year_month
```

**使用场景**: 利润测算中的成本拆分。

---

### 7. 日目标数据 — `fetch_daily_target_cost()` ⭐ v2 预估新增

**源表**: `dws_pub.dws_fact_day_org_target_cost`（日店铺基础目标表）

**SQL**:
```sql
SELECT
    org_lno                AS store_code,
    period_sdate           AS target_date,       -- 目标日期（YYYYMMDD）
    brd_dtl_no             AS brand_code,
    store_brd              AS store_brand,
    day_amt_target         AS daily_sales_target,  -- 日目标
    mon_amt_target         AS monthly_sales_target,-- 月目标
    year_amt_target        AS yearly_sales_target, -- 年目标
    cust_sal_nos_qty_target AS customer_qty_target,
    cust_sal_price_target  AS customer_price_target,
    avg_price_target       AS avg_price_target,
    virtual_mon_amt_target AS virtual_monthly_target,
    clg_mon_amt_target     AS challenge_monthly_target,
    offline_mon_amt_target AS offline_monthly_target,
    sy_mon_amt_target      AS private_domain_target,
    live_mon_amt_target    AS live_stream_target,
    wholesale_amt_target   AS wholesale_target,
    p_mon                  AS partition_month      -- 分区字段（YYYYMM）
FROM dws_pub.dws_fact_day_org_target_cost
WHERE p_mon = :p_mon                   -- 必须指定分区
  AND org_lno IN (:store_codes)        -- 可选
  AND period_sdate >= :start_date      -- 可选
  AND period_sdate <= :end_date        -- 可选
ORDER BY org_lno, period_sdate
```

**重要**: `p_mon` 是分区字段，必须指定以避免全表扫描。格式为 `YYYYMM`（如 `"202605"`）。

**使用场景**: 大中店预估的"当月前12天推全月"机制需要日目标数据。

---

### 8. 开关状态矩阵 — `fetch_switch_status()` ⭐ v2 预估新增

**源表**: `dws_pub.dws_dim_org_on_off`（店铺开改关表）

**SQL**:
```sql
SELECT
    org_lno                AS store_code,
    org_name               AS store_name,
    brd_dtl_no             AS brand_code,
    on_off_type            AS event_type,    -- '开店'/'关店'/'改造'
    plan_time              AS plan_time,     -- 计划时间
    real_time              AS actual_time,   -- 实际时间
    region_name            AS region,
    biz_city_name          AS city,
    biz_area               AS store_area,
    mon_avg_sal_amt        AS avg_monthly_sales,
    diff_status            AS diff_status,
    last_plan_time         AS latest_plan_time
FROM dws_pub.dws_dim_org_on_off
ORDER BY org_lno, plan_time
```

**输出**: 原始事件表会被 `_build_switch_matrix()` 转换为月度状态矩阵：

| store_code | year_month | status |
|------------|------------|--------|
| ST0001 | 2026-01 | on |
| ST0001 | 2026-02 | on |
| ST0002 | 2026-01 | off |
| ST0003 | 2026-03 | renovating |

**使用场景**: 门店分类（识别关店）、预估排除影响月。

---

## v2 预估引擎数据需求（最小集）

如果只使用 v2 业务规则引擎（推荐），最少需要以下 3 个数据源：

| 优先级 | 数据源 | 用途 |
|--------|--------|------|
| **P0** | `fetch_stores()` | 门店主数据，6 分类基础 |
| **P0** | `fetch_monthly_metrics()` | 月度业绩，分类 + 季节指数 + 预估 |
| **P0** | `fetch_switch_status()` | 开关状态，识别关店 |

可选增强：

| 数据源 | 增强效果 |
|--------|---------|
| `fetch_daily_target_cost()` | 大中店"前12天推全月"机制更准确 |
| `fetch_daily_sales()` | 日粒度分析 |
| `fetch_cost_structure()` | 成本拆分，利润测算更精细 |

---

## 数据量估算

| 数据源 | 预估行数 | 存储 |
|--------|---------|------|
| 门店主数据 | ~500 行 | < 1 MB |
| 日销售数据（24个月） | ~500×30×24 = 360K 行 | ~50 MB |
| 月度指标（24个月） | ~500×24 = 12K 行 | ~2 MB |
| 日目标数据（1个月） | ~500×30 = 15K 行 | ~2 MB |
| 开关状态 | ~500 行 | < 1 MB |

---

## 快速验证步骤

1. 配置 `.env`：
```bash
DATAWORKS_ADAPTER=starrocks
STARROCKS_HOST=your-host
STARROCKS_PORT=9030
STARROCKS_USER=your-user
STARROCKS_PASSWORD=your-password
```

2. 测试连接：
```python
from src.data.collectors.starrocks_collector import StarRocksCollector
import asyncio

async def test():
    async with StarRocksCollector() as c:
        stores = await c.fetch_stores()
        print(f"门店数: {len(stores)}")
        print(stores[['store_code', 'store_name', 'brand', 'region']].head())

asyncio.run(test())
```

3. 启动系统：
```bash
python run.py
# 访问 http://localhost:8000/docs 查看 API
# 访问 http://localhost:3000 查看前端
```
