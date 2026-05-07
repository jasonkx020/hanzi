/**
 * 与 SQLite 字库表字段一一对应（命名保持一致，便于 ORM / 手写 SQL）
 */

/** App 端 SQLite：openDatabase 的 name / 可写路径 / 包内预置库（见 scripts/build-db.mjs） */
export const SQLITE_APP = {
	DB_NAME: 'hanzi_curriculum',
	DOC_PATH: '_doc/hanzi_curriculum.db',
	BUNDLED_RELATIVE_WWW: '_www/static/db/hanzi_curriculum.db'
}

/** 本地 Storage 键（非 SQLite） */
export const STORAGE_KEYS = {
	CURRICULUM_PREFS: 'curriculum_prefs_v1',
	/** 与 TABLE_USER_CHAR_PROGRESS 字段一致的对象映射 JSON */
	USER_CHAR_PROGRESS: 'user_char_progress_v1'
}

/** 教材版本标识 — 对应表字段 textbook_version_id */
export const TEXTBOOK_VERSION_IDS = {
	TONGBIAN_RJ: 'tongbian-rj'
}

/** 学期 — 对应 semester */
export const SEMESTER = {
	UP: '上',
	DOWN: '下'
}

/**
 * 字表类型 — 对应 list_type
 * 与生字条「识字表 / 写字表 / 生字汇总」一致
 */
export const LIST_TYPE = {
	SHIZI: '识字表',
	XIEZI: '写字表',
	HUIZONG: '生字汇总'
}

/**
 * 用户字表浏览偏好（可多选时用数组；当前简化单选 + 「全部」）
 * list_type_preference: 'all' | LIST_TYPE.*
 */
export const LIST_TYPE_PREFERENCE = {
	ALL: 'all',
	...LIST_TYPE
}

/** 默认本地偏好（插入 DB 前筛选条件） */
export const DEFAULT_CURRICULUM_PREFS = {
	textbook_version_id: TEXTBOOK_VERSION_IDS.TONGBIAN_RJ,
	grade: 1,
	semester: SEMESTER.UP,
	list_type_preference: LIST_TYPE_PREFERENCE.ALL
}

/**
 * 表：hanzi_curriculum — 与后续 SQLite 一致
 * 列：id, textbook_version_id, grade, semester, list_type, hanzi, pinyin,
 *     sort_order, lesson_hint, source_url
 */
export const TABLE_HANZI_CURRICULUM = 'hanzi_curriculum'

export const COL = {
	id: 'id',
	textbook_version_id: 'textbook_version_id',
	grade: 'grade',
	semester: 'semester',
	list_type: 'list_type',
	hanzi: 'hanzi',
	pinyin: 'pinyin',
	sort_order: 'sort_order',
	lesson_hint: 'lesson_hint',
	source_url: 'source_url'
}

/** 建表 SQL（App 内首次打开 DB 时执行） */
export const SQL_CREATE_HANZI_CURRICULUM = `
CREATE TABLE IF NOT EXISTS ${TABLE_HANZI_CURRICULUM} (
  ${COL.id} INTEGER PRIMARY KEY AUTOINCREMENT,
  ${COL.textbook_version_id} TEXT NOT NULL,
  ${COL.grade} INTEGER NOT NULL,
  ${COL.semester} TEXT NOT NULL,
  ${COL.list_type} TEXT NOT NULL,
  ${COL.hanzi} TEXT NOT NULL,
  ${COL.pinyin} TEXT,
  ${COL.sort_order} INTEGER NOT NULL DEFAULT 0,
  ${COL.lesson_hint} TEXT,
  ${COL.source_url} TEXT
);
CREATE INDEX IF NOT EXISTS idx_hanzi_curriculum_lookup
  ON ${TABLE_HANZI_CURRICULUM} (${COL.textbook_version_id}, ${COL.grade}, ${COL.semester}, ${COL.list_type});
CREATE INDEX IF NOT EXISTS idx_hanzi_curriculum_char
  ON ${TABLE_HANZI_CURRICULUM} (${COL.hanzi});
`.trim()

/**
 * 可选：用户掌握进度（本地可先 Storage，后续同步 SQLite）
 */
export const TABLE_USER_CHAR_PROGRESS = 'user_char_progress'

export const COL_PROGRESS = {
	id: 'id',
	textbook_version_id: 'textbook_version_id',
	grade: 'grade',
	semester: 'semester',
	hanzi: 'hanzi',
	/** 是否已学过（出现在「我学过的字库」） */
	learned: 'learned',
	mastered: 'mastered',
	/** 累计错误次数（笔顺/测验等），用于「我经常错的」排序 */
	wrong_count: 'wrong_count',
	updated_at_ms: 'updated_at_ms'
}

export const SQL_CREATE_USER_CHAR_PROGRESS = `
CREATE TABLE IF NOT EXISTS ${TABLE_USER_CHAR_PROGRESS} (
  ${COL_PROGRESS.id} INTEGER PRIMARY KEY AUTOINCREMENT,
  ${COL_PROGRESS.textbook_version_id} TEXT NOT NULL,
  ${COL_PROGRESS.grade} INTEGER NOT NULL,
  ${COL_PROGRESS.semester} TEXT NOT NULL,
  ${COL_PROGRESS.hanzi} TEXT NOT NULL,
  ${COL_PROGRESS.learned} INTEGER NOT NULL DEFAULT 0,
  ${COL_PROGRESS.mastered} INTEGER NOT NULL DEFAULT 0,
  ${COL_PROGRESS.wrong_count} INTEGER NOT NULL DEFAULT 0,
  ${COL_PROGRESS.updated_at_ms} INTEGER NOT NULL,
  UNIQUE(${COL_PROGRESS.textbook_version_id}, ${COL_PROGRESS.grade}, ${COL_PROGRESS.semester}, ${COL_PROGRESS.hanzi})
);
CREATE INDEX IF NOT EXISTS idx_user_progress_wrong
  ON ${TABLE_USER_CHAR_PROGRESS} (${COL_PROGRESS.textbook_version_id}, ${COL_PROGRESS.wrong_count});
`.trim()
