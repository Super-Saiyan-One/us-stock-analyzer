# US Stock Analyzer

> 通用项目上下文见 `AGENTS.md`（Codex / Copilot 也读取该文件）。
> 本文件包含 Claude Code 专用的详细规范。两份文件共同构成完整上下文。

美股分析工具 — 市场估值、个股分析、期权链数据的全栈 Web 应用。

## 技术栈

### 前端 (Next.js)
- **框架**: Next.js 16 (App Router) + React 19
- **样式**: TailwindCSS 4 + CSS 变量 (亮/暗主题自动适配)
- **状态管理**: Zustand (持久化到 localStorage) + TanStack React Query (服务端数据)
- **图表**: Recharts (dashboard 图表) + lightweight-charts (K线图)
- **国际化**: next-intl + Zustand locale 切换，支持 en/zh
- **图标**: lucide-react
- **测试**: node:test + tsx，用于纯 TypeScript 引擎测试

### 后端 (Python API)
- **框架**: FastAPI + uvicorn
- **数据源**: yfinance (个股基本面 + 期权链)
- 运行在 `localhost:8000`，由前端 Next.js API 路由代理

### 持久化
- **SQLite** (better-sqlite3): 时间序列数据持久化 + 分位数计算 + BTC/US Index 策略配置
- 数据库文件: `data/cache.db` (git-ignored)
- 用途: FRED 宏观数据持久化、Regime Radar 历史分位数

### 外部 API (直接在 Next.js API Routes 中调用)
- Yahoo Finance Chart API — 行情、K线、指数 (无需认证)
- Yahoo Finance Chart API (`^VIX`, `^VIX3M`, `^SKEW`) — 美股区间恐慌/风险代理 (无需认证)
- Yahoo Finance Search API — 股票搜索 (无需认证)
- Binance Spot Klines API — BTCUSDT 日线 (无需认证)
- Colin Talks Crypto CBBI — BTC 周期信心指标 (无需认证)
- FRED (圣路易斯联储) — 宏观指标 (国债利率、VIX、CPI、M2 等，需 API Key)
- Shiller CAPE Data — 席勒市盈率历史数据 (无需认证)
- CNN Fear & Greed graphdata — 情绪历史，约 2021-01 后可用 (无需认证)
- stockmarketperatio.com — 当前 forward PE 闸门 + trailing PE 历史 (无需认证)

## 项目结构

```
src/
├── app/
│   ├── (app)/                  # 带侧边栏/底部导航的布局组
│   │   ├── dashboard/          # 市场总览仪表盘 (Regime Radar + 多版块)
│   │   ├── btc-strategy/       # BTC 区间信号看板 (区间时间带 + 可选硬止损)
│   │   ├── us-index-strategy/  # SPY/QQQ 抄底定投区 + 过热减仓区，默认参数来自 AutoQuantStock 搜索
│   │   ├── screener/           # 机会扫描器 (Phase 1)
│   │   ├── signal-lab/         # 信号验证实验室 (Phase 2)
│   │   ├── stock/              # 个股搜索 + 详情 + 期权
│   │   └── watchlist/          # 自选股
│   ├── api/                    # Next.js API 路由 (BFF 层)
│   │   ├── fred/               # FRED 宏观数据代理 (持久化到 SQLite)
│   │   ├── crypto/btc/strategy/ # BTC 区间信号 + 参数配置
│   │   ├── market/
│   │   │   ├── indices/        # 多指数行情 (S&P, NASDAQ, VIX, DJI)
│   │   │   ├── regime/         # 市场状态雷达 (聚合 6 维度信号)
│   │   │   ├── shiller/        # 席勒 CAPE 数据
│   │   │   ├── sp500/          # S&P 500 行情
│   │   │   ├── us-index-strategy/ # 美股区间信号 + 参数配置
│   │   │   └── fear-greed/     # 恐惧贪婪指数
│   │   ├── screener/           # 机会扫描器 (批量筛选 + 评分)
│   │   ├── signals/
│   │   │   ├── backtest/       # 信号回测统计
│   │   │   └── observations/   # 信号观察记录
│   │   └── stock/              # 个股行情、K线、基本面、期权
│   ├── layout.tsx              # 根布局 (字体、QueryProvider、I18nProvider)
│   └── page.tsx                # 根页面 → redirect /dashboard
├── components/
│   ├── charts/                 # 图表组件 (CAPE、K线、期权 OI)
│   ├── dashboard/              # 仪表盘卡片组件
│   │   ├── regime-radar.tsx    # 市场状态雷达 (6维信号聚合)
│   │   ├── index-card.tsx      # 指数卡片 (S&P, NASDAQ, VIX)
│   │   ├── fear-greed-gauge.tsx # VIX 恐惧贪婪仪表
│   │   ├── fred-metric-card.tsx # FRED 指标卡 (通用)
│   │   ├── fred-chart-card.tsx  # FRED 图表卡 (通用)
│   │   ├── yield-curve-card.tsx # 国债收益率曲线
│   │   ├── liquidity-card.tsx   # 净流动性 (Fed BS - TGA - RRP)
│   │   └── market-valuation-card.tsx # CAPE/PE/盈利收益率
│   ├── layout/                 # 导航栏 + 语言切换
│   ├── options/                # 期权链表格、IV Skew、到期日选择器
│   ├── screener/               # 扫描器表格 + 筛选器
│   ├── signal-lab/             # 回测表 + 观察记录表
│   ├── stock/                  # 个股行情头、关键指标
│   └── error-boundary.tsx      # 全局错误边界
├── hooks/                      # 自定义 React Query hooks
│   ├── use-regime.ts           # Market Regime Radar
│   ├── use-fred.ts             # FRED 系列数据
│   ├── use-indices.ts          # 多指数 + Fear&Greed
│   ├── use-market-data.ts      # Shiller CAPE + S&P 500
│   ├── use-stock-*.ts          # 个股相关
│   ├── use-options-chain.ts    # 期权链
│   ├── use-screener.ts         # 机会扫描器
│   └── use-signal-lab.ts       # 信号验证
├── i18n/
│   ├── context.tsx             # I18nProvider + useT() (dot-path 翻译)
│   └── locales.ts              # Locale 类型定义
├── lib/
│   ├── api.ts                  # API 工具 (apiFetch, validateSymbol)
│   ├── cache.ts                # 服务端内存缓存 (TTL Map, 热数据)
│   ├── db.ts                   # SQLite 持久化层 (时间序列 + 分位数 + 信号观察)
│   ├── btc-market-data.ts      # BTC 日线 + CBBI 获取/缓存
│   ├── btc-strategy-engine.ts  # BTC 区间信号 + 参考交易评估器 (硬止损默认关闭)
│   ├── us-index-market-data.ts # SPY/QQQ 日线 + VIX/Fear/估值数据
│   ├── us-index-strategy-engine.ts # 美股大盘抄底/过热区间评分器，包含研究优化默认参数
│   ├── constants.ts            # 所有常量 (API URL、缓存 TTL、staleTime)
│   ├── formatters.ts           # 数字/货币/百分比格式化
│   ├── screener-engine.ts      # 扫描器评分引擎 (分类 + 综合评分)
│   ├── universes.ts            # 股票池定义 (SP500 Top100)
│   └── utils.ts                # cn() tailwind 类名合并
├── providers/                  # QueryClientProvider
├── stores/                     # Zustand stores (settings, watchlist)
├── data/fallbacks/             # Vercel 上外部 API/SQLite 失败时使用的 BTC/美股区间静态快照
└── types/
    ├── data-meta.ts            # 数据元信息、Regime 类型
    ├── btc-strategy.ts         # BTC 策略配置、指标、交易记录类型
    ├── us-index-strategy.ts    # 美股区间策略配置、指标、区间类型
    ├── market.ts               # 市场数据类型
    ├── options.ts              # 期权类型
    ├── screener.ts             # 扫描器类型 (ScreenerStock, BacktestResult)
    └── stock.ts                # 个股类型

messages/
├── en.json                     # 英文翻译 (嵌套 JSON)
└── zh.json                     # 中文翻译

data/
└── cache.db                    # SQLite 持久化 (git-ignored)

python-api/
├── main.py                     # FastAPI 入口
├── utils.py                    # 共享工具函数 (safe_num)
├── routers/
│   ├── stock.py                # 个股基本面 + 搜索
│   ├── options.py              # 期权链 + 到期日
│   └── screener.py             # 批量筛选 (batch/screen, batch/fundamentals, universe/sp500)
└── requirements.txt
```

## 架构规范

### 数据流 (三层缓存)
```
外部 API ← Next.js API Routes ← React Query hooks ← 页面/组件
                 ↑
           Python API (yfinance)

缓存层级:
  L1: 内存缓存 (lib/cache.ts)     → 热数据, 秒级 TTL (行情、VIX)
  L2: SQLite (lib/db.ts)          → 时间序列持久化, 跨重启存活 (FRED 宏观数据)
  L3: React Query (客户端)         → 客户端缓存, staleTime 控制
```

1. **所有外部请求**必须经过 `src/app/api/` 路由，前端组件不直接调用外部 API
2. **FRED 数据**走 SQLite 持久化: API 路由先查 SQLite，过期才请求 FRED，结果写入 SQLite
3. **行情数据**走内存缓存: 高频更新、不需要历史持久化
4. **分位数计算** (`computePercentile`) 基于 SQLite 中的历史数据
5. Python API 仅处理需要 yfinance 的场景 (基本面、期权)，其余直接在 Node 端处理

### SQLite 持久化层 (lib/db.ts)
- 表 `time_series`: (series_id, date, value, source, fetched_at) — FRED 时间序列
- 表 `cache_meta`: (key, data, expires_at) — 通用 JSON 持久化缓存
- 表 `btc_strategy_config`: (id, name, params, updated_at) — BTC 策略参数配置，`params` JSON 包含模板参数和默认关闭的 `hardStopEnabled`
- 表 `us_index_strategy_config`: (id, name, params, updated_at) — SPY/QQQ 区间策略参数配置，`params` JSON 包含权重、阈值、指标周期、forward PE 实时闸门；精确匹配旧 60/60 默认参数时读取时升级为 AutoQuantStock 搜索默认值
- Vercel 容错: BTC 和 US Index 策略 API 正常优先实时计算；如果外部数据或 SQLite 失败，返回 `src/data/fallbacks/*.json` 静态快照，并带 `X-Data-Fallback: static-snapshot` 响应头。
- 关键函数:
  - `upsertTimeSeries()` — 批量写入时间序列
  - `getTimeSeries()` — 查询时间序列 (支持 limit + startDate)
  - `computePercentile()` — 基于历史数据计算当前值的分位数 (默认 252 交易日 ≈ 1 年)
  - `getLatestPoint()` — 获取最新一条数据
  - `insertSignalObservation()` — 记录信号触发观察
  - `getSignalObservations()` — 查询信号观察 (支持 signalId/symbol 筛选)
  - `upsertPriceSnapshots()` — 批量写入价格快照
  - `getForwardReturns()` — 计算信号触发后 1D/5D/20D 前瞻收益
- 表 `signal_observations`: (symbol, signal_id, category, score, price_at_signal, observed_at, triggers, regime)
- 表 `price_snapshots`: (symbol, date, close) — 用于前瞻收益计算
- **数据库文件**: `data/cache.db`, 自动创建, git-ignored
- **并发安全**: WAL 模式, 单进程内 better-sqlite3 是同步的不需要锁

### Market Regime Radar (核心信号层)
- API: `/api/market/regime`
- 聚合 6 个维度: Trend, Volatility, Credit, Rates, Liquidity, Valuation
- 每个维度输出: signal (risk-on/neutral/caution/risk-off), percentile (1Y), direction, data provenance
- **信号计算逻辑**: 基于当前值在 1 年历史中的分位数排名
  - 0-40th → risk-on (低风险)
  - 40-60th → neutral
  - 60-80th → caution
  - 80-100th → risk-off (高风险)
  - 部分维度需要反转 (如利率: 高分位 = 紧缩 = risk-off)
- Overall signal = 6 个维度信号的加权平均

### 数据元信息 (types/data-meta.ts)
所有信号数据都携带 `DataMeta`:
- `source`: 数据来源 (如 "FRED/ICE BofA")
- `asOf`: 数据日期 (非获取日期)
- `fetchedAt`: 实际获取时间
- `frequency`: 更新频率 (realtime/daily/weekly/monthly)
- `releaseLag`: 发布延迟 (如 FINRA short interest "~10 days")
- `confidence`: 数据可信度 (high/medium/low)

### 常量管理
- 所有 API URL 集中在 `lib/constants.ts`（包括 `PYTHON_API_URL`）
- 所有缓存 TTL 使用 `CACHE_TTL` 对象中的命名常量，禁止魔法数字
- 所有 React Query staleTime 使用 `STALE_TIME` 对象

### 缓存策略规范 (双层缓存)

#### 对齐规则
- **`STALE_TIME` 必须 >= 对应的 `CACHE_TTL`**，避免客户端在服务端缓存未刷新时发起无效请求
- 新增 API 必须同时在 `CACHE_TTL` 和 `STALE_TIME` 中添加对应条目
- 禁止在 hooks 或 API 路由中硬编码 TTL 数值，必须引用 `constants.ts` 中的常量

#### 服务端缓存 (API Routes)
- 高频行情数据 → `cacheGet/cacheSet` 内存缓存 (重启丢失，可接受)
- 低频时间序列 (FRED) → SQLite 持久化 + 内存缓存双层
- FRED 按数据发布频率分级: `CACHE_TTL.FRED_DAILY` (2h) / `FRED_WEEKLY` (12h) / `FRED_MONTHLY` (24h)
- 通过 `WEEKLY_SERIES` 和 `MONTHLY_SERIES` 集合判断，其余默认 DAILY

#### 客户端缓存 (React Query)
- 实时行情 (指数/个股报价): `refetchOnWindowFocus: true` + 可选 `refetchInterval`
- 低频数据 (FRED/Shiller/搜索): 仅依赖 `staleTime`，不设 `refetchInterval`
- 全局默认 `refetchOnWindowFocus: false`，仅对实时性强的 hook 单独开启
- `refetchInterval` 设置时应 >= `staleTime`，避免不必要的请求窗口

#### 当前 TTL 对照表

| 数据 | CACHE_TTL | STALE_TIME | refetchInterval | refetchOnWindowFocus |
|------|-----------|------------|-----------------|---------------------|
| SP500 | 30s (盘中) / 5min (盘后) | 30s | — | true |
| Market Indices | 30s | 30s | 30s | true |
| Stock Quote | 15s | 15s | — | true |
| Stock Chart | 5min | 5min | — | — |
| Stock Financials | 5min | 5min | — | — |
| Options Chain | 1min | 1min | — | true |
| Options Expirations | 1h | 1h | — | — |
| Fear & Greed | 30min | 30min | — | — |
| Regime | 5min | 5min | 5min | — |
| Search | 24h | 24h | — | — |
| Shiller | 24h | 1h | — | — |
| FRED Daily | 2h | 30min | — | — |
| FRED Weekly | 12h | 30min | — | — |
| FRED Monthly | 24h | 30min | — | — |
| Screener | 5min | 5min | — | — |
| Signal Lab | 30min | 30min | — | — |
| BTC Daily Candles | 6h | 30min | — | — |
| BTC CBBI | 12h | 30min | — | — |
| BTC Strategy | 30min | 30min | — | — |
| US Index Daily/VIX | 6h | 30min | — | — |
| US Index Strategy | 30min | 30min | — | — |

### 类型系统
- 共享数据类型定义在 `src/types/` 目录下
- hooks 和组件通过 import type 引用，不在本地重新定义接口
- Python API 返回的字段命名使用 camelCase (与前端一致)

### 国际化 (i18n)
- 基于 `next-intl`，翻译文件: `messages/en.json` 和 `messages/zh.json` (嵌套 JSON)
- Provider: `I18nProvider` (在 `src/i18n/context.tsx`)，包裹在根 layout 中
- 两种使用方式:
  - **推荐 (有 namespace)**: `const t = useTranslations("stock"); t("keyMetrics")`
  - **兼容 (无 namespace)**: `const t = useT(); t("stock.keyMetrics")` (dot-path 访问)
- `useT()` 实现: 直接从 messages JSON 中按 dot-path 查找，不经过 `next-intl` 的 `useTranslations()`
- 新增文案: 在 `messages/en.json` 和 `messages/zh.json` 对应 namespace 下添加 key
- Locale 切换通过 Zustand `settingsStore.locale` 控制，持久化到 localStorage
- 所有面向用户的文本必须使用翻译 key，不允许硬编码字符串

### 组件规范
- 页面文件是 `"use client"` 客户端组件 (因需要 hooks)
- 组件按功能分目录: `charts/`, `dashboard/`, `layout/`, `options/`, `stock/`
- 使用 `cn()` 合并 Tailwind 类名
- Loading 状态使用 `animate-pulse` 骨架屏
- 颜色变量: `--success` (涨/正), `--destructive` (跌/负), `--warning` (警告)
- **Hooks 规则**: 所有 `useT()` / `useTranslations()` / 任何 hook 必须在组件函数体顶部调用，不能放在 `if (isLoading) return` 等条件 return 之后

### 状态管理
- **服务端数据** → React Query (自动缓存、重新获取、窗口聚焦刷新)
- **客户端持久化** → Zustand + persist middleware (settings, watchlist)
- 不使用 React Context 做数据传递 (除 i18n)

### Python API 规范
- 工具函数放 `utils.py`（如 `safe_num`），路由文件 import 引用
- 所有 yfinance 返回的数值字段必须经过 `safe_num()` 处理 (NaN/Inf → None)
- 错误统一抛 `HTTPException(status_code=502)`

### 输入校验
- API 路由层使用 `validateSymbol()` 校验股票代码格式
- 规则: 1-20 个字符，仅允许 `A-Z 0-9 ^ . = -`

## 开发命令

```bash
# 前端
npm run dev          # 启动 Next.js 开发服务器 (port 3000)
npm run build        # 生产构建
npm run lint         # ESLint 检查
npm run test:btc     # BTC 策略引擎测试
npm run test:fallbacks # Vercel 静态快照 fallback 测试
npm run test:us-index # 美股区间策略引擎测试
npx tsc --noEmit     # TypeScript 类型检查

# Python API
cd python-api
source venv/bin/activate
uvicorn main:app --reload --port 8000

# Docker
docker-compose up    # 同时启动前端 + Python API
```

## 环境变量

| 变量名 | 用途 | 默认值 |
|--------|------|--------|
| `PYTHON_API_URL` | Python API 地址 | `http://localhost:8000` |
| `FRED_API_KEY` | FRED 宏观数据 API 密钥 | (必须配置) |

配置文件: `.env.local` (不提交到 git)，参考 `.env.example`

## 添加新功能清单

### 新增 API 数据源
1. 在 `lib/constants.ts` 同时添加 `CACHE_TTL.XXX` 和 `STALE_TIME.XXX`，确保 `STALE_TIME >= CACHE_TTL`
2. 在 `src/app/api/` 下创建路由文件
   - 高频数据 (行情): 使用 `cacheGet/cacheSet` 内存缓存
   - 时间序列 (FRED 等): 使用 `upsertTimeSeries` 写入 SQLite
3. 在 `src/types/` 添加响应类型，信号类数据包含 `DataMeta`
4. 在 `src/hooks/` 创建 React Query hook，使用 `STALE_TIME.XXX` 常量 (禁止硬编码)
5. 在组件中调用 hook

### 新增 Regime 维度
1. 在 `/api/market/regime/route.ts` 的 `GET` 函数中添加 `buildDimension()` 调用
2. 指定 FRED series ID、source、frequency、是否 invert
3. 确保该 series 在 FRED 路由中有对应的 TTL 配置
4. 在 `messages/en.json` 和 `messages/zh.json` 添加维度名称翻译

### 新增页面
1. 在 `src/app/(app)/` 下创建目录和 `page.tsx`
2. 在 `src/components/layout/bottom-nav.tsx` 和 `desktop-sidebar.tsx` 的 `items` 数组中添加导航项
3. 在 `messages/en.json` 和 `messages/zh.json` 中添加翻译

### 新增翻译
1. 在 `messages/en.json` 对应 namespace 下添加 key-value
2. 在 `messages/zh.json` 同位置添加中文翻译
3. 在组件中使用: `const t = useTranslations("namespace"); t("key")` 或 `const t = useT(); t("namespace.key")`

## FRED 数据系列参考

| Series ID | 含义 | 频率 | Dashboard 用途 |
|-----------|------|------|----------------|
| DGS2, DGS5, DGS10, DGS30 | 国债收益率 | 日 | 收益率曲线 |
| T10Y2Y | 10Y-2Y 利差 | 日 | 利率/倒挂信号 |
| DFF | 联邦基金利率 | 日 | Fed 政策 |
| VIXCLS | VIX 收盘 | 日 | 波动率 |
| BAMLH0A0HYM2 | 高收益信用利差 | 日 | 信用风险 |
| BAMLC0A0CM | 投资级信用利差 | 日 | 信用风险 |
| WALCL | 美联储总资产 | 周 | 流动性 |
| WTREGEN | 财政部 TGA | 周 | 流动性 |
| RRPONTSYD | 隔夜逆回购 | 日 | 流动性 |
| M2SL | M2 货币供应 | 月 | 流动性 |
| ICSA | 首次失业救济 | 周 | 宏观 |
| CPIAUCSL | CPI | 月 | 通胀 |
| PCEPILFE | 核心 PCE | 月 | 通胀 (Fed 偏好) |
| FEDFUNDS | 联邦基金利率(月) | 月 | Fed 政策 |

## 文档同步规则

本文件 (`CLAUDE.md`) 和 `AGENTS.md` 必须保持同步。完成任何任务后，检查是否命中以下触发条件：

- **新增/删除 API 路由** → 更新两份文档的项目结构
- **新增/修改 CACHE_TTL 或 STALE_TIME** → 更新本文件的 TTL 对照表
- **新增环境变量** → 更新两份文档的环境变量表
- **新增外部数据源** → 更新 `AGENTS.md` 的 Data Sources Reference
- **新增 FRED series** → 更新本文件的 FRED 数据系列参考表
- **修复了 Known Issues 中的问题** → 在 `AGENTS.md` 中勾掉对应项
- **发现新的架构/技术问题** → 添加到 `AGENTS.md` 的 Known Issues
- **修改了编码规范** → 同步到两份文档

**判断标准**: 如果不更新文档，下一个来读代码的 agent（或人）会被误导，那就必须更新。
