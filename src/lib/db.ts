import Database from "better-sqlite3";
import path from "path";
import { existsSync, mkdirSync } from "fs";
import type { BtcStrategyConfig } from "@/types/btc-strategy";

const DB_PATH = process.env.VERCEL
  ? "/tmp/cache.db"
  : path.join(process.cwd(), "data", "cache.db");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");

    db.exec(`
      CREATE TABLE IF NOT EXISTS time_series (
        series_id TEXT NOT NULL,
        date TEXT NOT NULL,
        value REAL NOT NULL,
        source TEXT NOT NULL DEFAULT '',
        fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (series_id, date)
      );
      CREATE INDEX IF NOT EXISTS idx_series_date ON time_series(series_id, date DESC);

      CREATE TABLE IF NOT EXISTS pit_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity TEXT NOT NULL,
        event_type TEXT NOT NULL,
        observed_at TEXT NOT NULL,
        available_at TEXT NOT NULL,
        source TEXT NOT NULL,
        data TEXT NOT NULL,
        fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_pit_entity ON pit_events(entity, event_type, observed_at DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_pit_unique
        ON pit_events(entity, event_type, observed_at, available_at, source);

      CREATE TABLE IF NOT EXISTS cache_meta (
        key TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS signal_observations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        signal_id TEXT NOT NULL,
        category TEXT NOT NULL,
        score REAL NOT NULL,
        price_at_signal REAL NOT NULL,
        observed_at TEXT NOT NULL,
        triggers TEXT NOT NULL DEFAULT '[]',
        regime TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_sigobs_dedup
        ON signal_observations(symbol, signal_id, observed_at);
      CREATE INDEX IF NOT EXISTS idx_sigobs_symbol ON signal_observations(symbol, observed_at DESC);
      CREATE INDEX IF NOT EXISTS idx_sigobs_signal ON signal_observations(signal_id, observed_at DESC);

      CREATE TABLE IF NOT EXISTS price_snapshots (
        symbol TEXT NOT NULL,
        date TEXT NOT NULL,
        close REAL NOT NULL,
        fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (symbol, date)
      );
      CREATE INDEX IF NOT EXISTS idx_prices_symbol ON price_snapshots(symbol, date DESC);

      CREATE TABLE IF NOT EXISTS btc_strategy_config (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        params TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  }
  return db;
}

// --- Time Series ---

export function upsertTimeSeries(
  seriesId: string,
  points: { date: string; value: number }[],
  source: string
) {
  const d = getDb();
  const stmt = d.prepare(
    `INSERT OR REPLACE INTO time_series (series_id, date, value, source, fetched_at)
     VALUES (?, ?, ?, ?, datetime('now'))`
  );
  const tx = d.transaction(() => {
    for (const p of points) {
      stmt.run(seriesId, p.date, p.value, source);
    }
  });
  tx();
}

export function getTimeSeries(
  seriesId: string,
  limit = 250,
  startDate?: string
): { date: string; value: number }[] {
  const d = getDb();
  if (startDate) {
    return d
      .prepare(
        `SELECT date, value FROM time_series
         WHERE series_id = ? AND date >= ?
         ORDER BY date ASC LIMIT ?`
      )
      .all(seriesId, startDate, limit) as { date: string; value: number }[];
  }
  const rows = d
    .prepare(
      `SELECT date, value FROM time_series
       WHERE series_id = ?
       ORDER BY date DESC LIMIT ?`
    )
    .all(seriesId, limit) as { date: string; value: number }[];
  return rows.reverse();
}

export function getLatestPoint(
  seriesId: string
): { date: string; value: number } | null {
  const d = getDb();
  return (
    (d
      .prepare(
        `SELECT date, value FROM time_series
         WHERE series_id = ? ORDER BY date DESC LIMIT 1`
      )
      .get(seriesId) as { date: string; value: number } | undefined) ?? null
  );
}

export function getSeriesCount(seriesId: string): number {
  const d = getDb();
  const row = d
    .prepare(`SELECT COUNT(*) as cnt FROM time_series WHERE series_id = ?`)
    .get(seriesId) as { cnt: number };
  return row.cnt;
}

export function computePercentile(
  seriesId: string,
  currentValue: number,
  lookbackDays = 252
): number {
  const d = getDb();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lookbackDays);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const rows = d
    .prepare(
      `SELECT value FROM time_series
       WHERE series_id = ? AND date >= ?
       ORDER BY date ASC`
    )
    .all(seriesId, cutoffStr) as { value: number }[];

  if (rows.length < 5) return -1;

  const below = rows.filter((r) => r.value <= currentValue).length;
  return Math.round((below / rows.length) * 100);
}

// --- Point-in-Time Events ---

export interface PitEvent {
  entity: string;
  eventType: string;
  observedAt: string;
  availableAt: string;
  source: string;
  data: Record<string, unknown>;
}

export function insertPitEvent(event: PitEvent) {
  const d = getDb();
  d.prepare(
    `INSERT OR IGNORE INTO pit_events (entity, event_type, observed_at, available_at, source, data)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    event.entity,
    event.eventType,
    event.observedAt,
    event.availableAt,
    event.source,
    JSON.stringify(event.data)
  );
}

export function getPitEvents(
  entity: string,
  eventType?: string,
  limit = 20
): (PitEvent & { id: number; fetchedAt: string })[] {
  const d = getDb();
  const where = eventType
    ? `WHERE entity = ? AND event_type = ?`
    : `WHERE entity = ?`;
  const params = eventType ? [entity, eventType] : [entity];

  const rows = d
    .prepare(
      `SELECT id, entity, event_type, observed_at, available_at, source, data, fetched_at
       FROM pit_events ${where}
       ORDER BY observed_at DESC LIMIT ?`
    )
    .all(...params, limit) as {
    id: number;
    entity: string;
    event_type: string;
    observed_at: string;
    available_at: string;
    source: string;
    data: string;
    fetched_at: string;
  }[];

  return rows.map((r) => ({
    id: r.id,
    entity: r.entity,
    eventType: r.event_type,
    observedAt: r.observed_at,
    availableAt: r.available_at,
    source: r.source,
    data: JSON.parse(r.data),
    fetchedAt: r.fetched_at,
  }));
}

// --- Signal Observations ---

export interface SignalObsRow {
  symbol: string;
  signalId: string;
  category: string;
  score: number;
  priceAtSignal: number;
  observedAt: string;
  triggers: string[];
  regime: string | null;
}

export function insertSignalObservation(obs: SignalObsRow) {
  const d = getDb();
  d.prepare(
    `INSERT OR IGNORE INTO signal_observations (symbol, signal_id, category, score, price_at_signal, observed_at, triggers, regime)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    obs.symbol,
    obs.signalId,
    obs.category,
    obs.score,
    obs.priceAtSignal,
    obs.observedAt,
    JSON.stringify(obs.triggers),
    obs.regime
  );
}

export function getSignalObservations(
  signalId?: string,
  symbol?: string,
  limit = 500
): (SignalObsRow & { id: number; createdAt: string })[] {
  const d = getDb();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (signalId) {
    conditions.push("signal_id = ?");
    params.push(signalId);
  }
  if (symbol) {
    conditions.push("symbol = ?");
    params.push(symbol);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  params.push(limit);

  const rows = d
    .prepare(
      `SELECT id, symbol, signal_id, category, score, price_at_signal, observed_at, triggers, regime, created_at
       FROM signal_observations ${where}
       ORDER BY observed_at DESC LIMIT ?`
    )
    .all(...params) as {
    id: number;
    symbol: string;
    signal_id: string;
    category: string;
    score: number;
    price_at_signal: number;
    observed_at: string;
    triggers: string;
    regime: string | null;
    created_at: string;
  }[];

  return rows.map((r) => ({
    id: r.id,
    symbol: r.symbol,
    signalId: r.signal_id,
    category: r.category,
    score: r.score,
    priceAtSignal: r.price_at_signal,
    observedAt: r.observed_at,
    triggers: JSON.parse(r.triggers),
    regime: r.regime,
    createdAt: r.created_at,
  }));
}

export function getDistinctSignalIds(): string[] {
  const d = getDb();
  const rows = d
    .prepare(`SELECT DISTINCT signal_id FROM signal_observations ORDER BY signal_id`)
    .all() as { signal_id: string }[];
  return rows.map((r) => r.signal_id);
}

// --- Price Snapshots ---

export function upsertPriceSnapshots(
  snapshots: { symbol: string; date: string; close: number }[]
) {
  const d = getDb();
  const stmt = d.prepare(
    `INSERT OR REPLACE INTO price_snapshots (symbol, date, close, fetched_at)
     VALUES (?, ?, ?, datetime('now'))`
  );
  const tx = d.transaction(() => {
    for (const s of snapshots) {
      stmt.run(s.symbol, s.date, s.close);
    }
  });
  tx();
}

export function getPriceSnapshot(
  symbol: string,
  date: string
): { close: number } | null {
  const d = getDb();
  const row = d
    .prepare(`SELECT close FROM price_snapshots WHERE symbol = ? AND date <= ? ORDER BY date DESC LIMIT 1`)
    .get(symbol, date) as { close: number } | undefined;
  return row ?? null;
}

export function getForwardReturns(
  symbol: string,
  fromDate: string,
  priceAtSignal: number
): { return1D: number | null; return5D: number | null; return20D: number | null } {
  const d = getDb();
  const rows = d
    .prepare(
      `SELECT date, close FROM price_snapshots
       WHERE symbol = ? AND date > ?
       ORDER BY date ASC LIMIT 25`
    )
    .all(symbol, fromDate) as { date: string; close: number }[];

  if (rows.length === 0) return { return1D: null, return5D: null, return20D: null };

  const ret = (idx: number) => {
    if (idx >= rows.length) return null;
    return ((rows[idx].close - priceAtSignal) / priceAtSignal) * 100;
  };

  return {
    return1D: ret(0),
    return5D: rows.length >= 5 ? ret(4) : null,
    return20D: rows.length >= 20 ? ret(19) : null,
  };
}

// --- Cache ---

export function cacheGetPersist<T>(key: string): T | null {
  const d = getDb();
  const row = d
    .prepare(`SELECT data, expires_at FROM cache_meta WHERE key = ?`)
    .get(key) as { data: string; expires_at: number } | undefined;
  if (!row) return null;
  if (row.expires_at <= Date.now()) {
    d.prepare(`DELETE FROM cache_meta WHERE key = ?`).run(key);
    return null;
  }
  return JSON.parse(row.data) as T;
}

export function cacheSetPersist<T>(key: string, data: T, ttlMs: number) {
  const d = getDb();
  d.prepare(
    `INSERT OR REPLACE INTO cache_meta (key, data, expires_at)
     VALUES (?, ?, ?)`
  ).run(key, JSON.stringify(data), Date.now() + ttlMs);
}

// --- BTC Strategy Config ---

const BTC_STRATEGY_CONFIG_ID = "default";

export function getBtcStrategyConfig(): BtcStrategyConfig | null {
  const d = getDb();
  const row = d
    .prepare(`SELECT name, params FROM btc_strategy_config WHERE id = ?`)
    .get(BTC_STRATEGY_CONFIG_ID) as
    | { name: string; params: string }
    | undefined;
  if (!row) return null;
  return {
    name: row.name,
    ...(JSON.parse(row.params) as Omit<BtcStrategyConfig, "name">),
  };
}

export function saveBtcStrategyConfig(config: BtcStrategyConfig): void {
  const d = getDb();
  const { name, ...params } = config;
  d.prepare(
    `INSERT OR REPLACE INTO btc_strategy_config (id, name, params, updated_at)
     VALUES (?, ?, ?, datetime('now'))`
  ).run(BTC_STRATEGY_CONFIG_ID, name, JSON.stringify(params));
}
