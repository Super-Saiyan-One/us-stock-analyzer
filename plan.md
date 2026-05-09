# 美股大盘抄底/过热区间策略计划

## 目标

做一个类似 BTC Strategy 的美股大盘区间工具，但不是 SPY/QQQ 轮动策略。

核心目标是回答两个问题：

1. 当前是不是适合对 SPY、QQQ 做定投抄底？
2. 当前是不是过热，适合分批减仓？

Web 页面只做轻量展示和参数调节；真正的参数搜索和策略验证放在 `E:\code\AutoQuantStock` 本地跑。

## 核心原则

### 1. 有历史数据的指标参与回测调参

这些指标可以用于历史评分、参数搜索、收益/回撤验证：

- SPY 日线价格
- QQQ 日线价格
- VIX 日线
- VIX3M 日线
- SKEW 日线
- CNN Fear & Greed 历史值，当前可稳定拿到约 2021-01-04 之后的数据
- Shiller CAPE 月度历史
- S&P 500 trailing PE 月度历史

### 2. 找不到稳定历史数据的指标只做实时判断条件

这些指标不进入历史评分，不参与参数搜索，避免用今天的数据污染过去的回测：

- 当前 S&P 500 forward PE
- 其他只有当前值、没有稳定历史序列的估值/情绪指标

用法示例：

- `forwardPE > 24`：当前估值偏高，过热判断加一条提示或闸门
- `forwardPE < 18`：当前估值不贵，允许抄底信号更积极
- 没有 forward PE 时：不阻断技术/恐慌信号，只显示估值数据缺失

### 3. 技术评分和估值闸门分开

技术评分只回答“价格行为现在像不像低位/高位”。

估值闸门只回答“当前估值会不会让这个信号更可信或更危险”。

这样更容易解释，也更适合用户调参。

## 已验证的数据可用性

### 免费可用

用 `uv run python` 在 `E:\code\AutoQuantStock` 测试：

- `SPY`：2019-01-02 到 2026-05-08，1848 条日线
- `QQQ`：2019-01-02 到 2026-05-08，1848 条日线
- `^VIX`：2019-01-02 到 2026-05-08，1848 条日线
- `^VIX3M`：2019-01-02 到 2026-05-08，1848 条日线
- `^SKEW`：2019-01-02 到 2026-05-08，1805 条日线

CNN Fear & Greed：

- Node fetch 加完整 browser headers 可用
- 2021-01-01 请求返回 2021-01-04 到 2026-05-08 的历史
- 2020 年请求返回 500，不能依赖 2020 以前 CNN 历史
- Python urllib 会被 418 拦截，所以本地研究脚本要么用 `requests` 配完整 headers，要么直接用 VIX 作为 fallback

估值：

- Shiller CAPE 历史可用，月度数据，1871 年开始
- stockmarketperatio trailing PE 历史可用，1990-01 到 2026-04
- stockmarketperatio 当前 forward PE 可用，例如当前页面能解析 `forwardPE = 24.98`

### 不稳定或暂不采用

- 免费稳定的 S&P 500 forward PE 历史暂未找到
- Trendonify 页面被 Cloudflare 403 拦截
- stockmarketperatio 没有发现 forward PE 历史 JS 文件

## 策略模型

每个资产独立评分：

- SPY 使用 SPY 的技术指标
- QQQ 使用 QQQ 的技术指标
- 恐慌指标和估值指标共用全市场数据

### Bottom Score，0-100

用于判断定投抄底区间。

组成：

- 恐慌分：VIX 分位高、Fear & Greed 低
- 技术超跌分：RSI 偏低、短期跌幅大、价格低于均线
- 趋势修复分：短期均线修复、20 日动量转正
- 估值辅助：CAPE/trailing PE 历史分位偏低

### Heat Score，0-100

用于判断过热减仓区间。

组成：

- 贪婪分：VIX 分位低、Fear & Greed 高
- 技术超买分：RSI 偏高、价格远高于 SMA200
- 趋势转弱分：高位后短期均线转弱、20 日动量转负
- 估值辅助：CAPE/trailing PE 历史分位偏高

### 当前-only 估值闸门

当前 forward PE 不参与历史分数，但影响实时解释：

- forward PE 高于阈值：增加“当前估值偏高”标签，减仓信号可信度提高
- forward PE 低于阈值：增加“当前估值不贵”标签，定投信号可信度提高
- forward PE 缺失：显示“估值闸门未启用”

## 区间输出

默认映射：

- `score >= 70`：100% 强度
- `55 <= score < 70`：75% 强度
- `40 <= score < 55`：50% 强度
- `25 <= score < 40`：25% 强度
- `< 25`：无操作

如果 Bottom Score 和 Heat Score 同时高：

- 分差大于等于 15：选择更高的一边
- 分差小于 15：显示持有区，避免信号互相打架

输出动作：

- `dca_buy`：定投区
- `hold`：持有区
- `dca_sell`：减仓区

## AutoQuantStock 本地研究计划

不直接改 `run.py/config.py`。

原因：

- 当前 `run.py/config.py` 是 AutoQuantStock 的评估合约
- 先改它们会让旧策略结果失去可比性
- 更好的做法是新增 investigation 脚本验证指标组合

新增文件：

- `investigations/us_index_zone_research.py`

功能：

- 读取 `data/SPY.parquet` 和 `data/QQQ.parquet`
- 拉取或缓存 VIX、VIX3M、SKEW
- 拉取或缓存 CNN Fear & Greed，失败时用 VIX percentile 作为恐慌代理
- 拉取或缓存 Shiller CAPE 和 trailing PE
- 不把当前 forward PE 放进历史回测
- 网格搜索 Bottom/Heat 的权重和阈值
- 输出 `investigations/us_index_zone_results.json`
- 输出 `investigations/us_index_zone_report.md`

研究评价指标：

- 定投区出现后 3/6/12 个月平均收益是否高于普通日期
- 减仓区出现后 1/3/6 个月最大回撤是否高于普通日期
- 信号频率是否合理，不能天天提示
- 策略参考收益是否优于 Buy & Hold 或至少降低回撤
- 单独验证 SPY 和 QQQ，不能只看一个资产

## Web 实现计划

新增页面：

- `/us-index-strategy`

页面内容：

- SPY / QQQ 切换
- 当前价格
- 当前 Bottom Score
- 当前 Heat Score
- 当前区间：定投、持有、减仓
- 定投程度或减仓程度
- 当前 forward PE 闸门解释
- 图表：价格线 + 定投/减仓开始点 + 底部区间时间带
- 参考收益：策略参考收益、Buy & Hold 收益、超额收益、最大回撤
- 参数表单：技术指标权重、恐慌权重、估值权重、触发阈值、forward PE 闸门阈值

新增 TypeScript 类型：

- `UsIndexStrategyConfig`
- `UsIndexStrategyTemplate`
- `UsIndexStrategyIndicatorPoint`
- `UsIndexStrategyZonePoint`
- `UsIndexStrategyStats`
- `UsIndexStrategyResponse`

新增引擎：

- `src/lib/us-index-strategy-engine.ts`

新增数据层：

- `src/lib/us-index-market-data.ts`

新增 API：

- `GET /api/market/us-index-strategy?symbol=SPY|QQQ`
- `POST /api/market/us-index-strategy/config`

新增 hook：

- `src/hooks/use-us-index-strategy.ts`

## 测试计划

### AutoQuantStock

命令：

```bash
cd E:\code\AutoQuantStock
uv run python investigations/us_index_zone_research.py --symbol SPY
uv run python investigations/us_index_zone_research.py --symbol QQQ
```

需要检查：

- 数据源是否都能拉到
- CNN 失败时 fallback 是否生效
- forward PE 是否只出现在当前判断，不进入历史回测
- report 是否包含区间命中次数、未来收益、未来回撤、参考收益

### us-stock-analyzer

新增测试：

- `tests/us-index-strategy-engine.test.ts`

覆盖：

- 配置归一化
- Bottom Score 计算
- Heat Score 计算
- 当前-only forward PE 闸门
- Bottom/Heat 冲突处理
- 区间强度映射
- Buy & Hold baseline
- 缺失 CNN/Fear 数据 fallback

验证命令：

```bash
npm run test:us-index
npm run test:btc
npx tsc --noEmit
npm run lint
npm run build
```

## 默认假设

- SPY 代表 S&P 500。
- QQQ 代表 Nasdaq 100。
- 不做 SPY/QQQ 动态轮动。
- 不在 Web 后端跑复杂参数搜索。
- Web 的收益只是参考收益，不包装成精确交易系统。
- 找不到稳定历史数据的指标，都按 current-only gate 处理。
