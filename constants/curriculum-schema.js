/**
 * 教材生字 / 用户进度字段约定（与生字 seed JSON、本地 Storage 一致）
 */

/** 本地 Storage 键 */
export const STORAGE_KEYS = {
	CURRICULUM_PREFS: 'curriculum_prefs_v1',
	/** 与 TABLE_USER_CHAR_PROGRESS 字段一致的对象映射 JSON */
	USER_CHAR_PROGRESS: 'user_char_progress_v1'
}

/** 教材版本标识 — 对应字段 textbook_version_id */
export const TEXTBOOK_VERSION_IDS = {
	TONGBIAN_RJ: '统编(人教版)',
	/** 《义务教育语文课程标准》附录4「识字、写字教学基本字表」（300字），幼小衔接常用官方依据 */
	MOE_JIBENZIBIAO_300: '教育部·识字写字基本字表（300字）'
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
	HUIZONG: '生字汇总',
	/** 课标附录4：识字、写字教学基本字表 */
	JIBENZIBIAO: '识字写字基本字表'
}

/**
 * 用户字表浏览偏好（可多选时用数组；当前简化单选 + 「全部」）
 * list_type_preference: 'all' | LIST_TYPE.*
 */
export const LIST_TYPE_PREFERENCE = {
	ALL: 'all',
	...LIST_TYPE
}

/** 默认本地偏好 */
export const DEFAULT_CURRICULUM_PREFS = {
	textbook_version_id: TEXTBOOK_VERSION_IDS.TONGBIAN_RJ,
	grade: 1,
	semester: SEMESTER.UP,
	list_type_preference: LIST_TYPE_PREFERENCE.ALL
}

/** 逻辑集合名：教材生字（数据来自 hanzi_curriculum_seed.json） */
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

/** 用户掌握进度（本地 uni.storage，见 user-progress-storage.js） */
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
