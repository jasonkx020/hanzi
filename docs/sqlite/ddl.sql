-- 参考用 DDL：当前 App 使用内嵌 JSON（constants/hanzi_curriculum_seed.json）与 uni.storage，不再打包 SQLite。
-- 若需本地 sqlite3 实验：sqlite3 hanzi.db < docs/sqlite/ddl.sql
-- 字段含义与 constants/curriculum-schema.js 一致。

PRAGMA foreign_keys = OFF;

-- ---------------------------------------------------------------------------
-- 教材生字
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hanzi_curriculum (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  textbook_version_id TEXT NOT NULL,
  grade INTEGER NOT NULL,
  semester TEXT NOT NULL,
  list_type TEXT NOT NULL,
  hanzi TEXT NOT NULL,
  pinyin TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  lesson_hint TEXT,
  source_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_hanzi_curriculum_lookup
  ON hanzi_curriculum (textbook_version_id, grade, semester, list_type);

CREATE INDEX IF NOT EXISTS idx_hanzi_curriculum_char
  ON hanzi_curriculum (hanzi);

-- ---------------------------------------------------------------------------
-- 用户字进度（可与 hanzi_curriculum 用 版本+年级+学期+字 逻辑对齐）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_char_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  textbook_version_id TEXT NOT NULL,
  grade INTEGER NOT NULL,
  semester TEXT NOT NULL,
  hanzi TEXT NOT NULL,
  learned INTEGER NOT NULL DEFAULT 0,
  mastered INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  updated_at_ms INTEGER NOT NULL,
  UNIQUE(textbook_version_id, grade, semester, hanzi)
);

CREATE INDEX IF NOT EXISTS idx_user_progress_wrong
  ON user_char_progress (textbook_version_id, wrong_count);
