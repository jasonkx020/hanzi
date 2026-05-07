/**
 * App：plus.sqlite 接入（与 constants/curriculum-schema.js 一致）
 * H5 / 小程序：无 SQLite，查询返回空数组。
 */

import {
	SQL_CREATE_HANZI_CURRICULUM,
	SQL_CREATE_USER_CHAR_PROGRESS,
	TABLE_HANZI_CURRICULUM,
	COL,
	SQLITE_APP,
	LIST_TYPE_PREFERENCE,
	TABLE_USER_CHAR_PROGRESS,
	COL_PROGRESS
} from '@/constants/curriculum-schema.js'
import { buildCurriculumWhere, orderBySortOrderAsc, getCurriculumPrefs } from '@/utils/curriculum-storage.js'

const { DB_NAME, DOC_PATH, BUNDLED_RELATIVE_WWW } = SQLITE_APP

function escapeSqlLiteral(value) {
	return String(value ?? '').replace(/'/g, "''")
}

function splitSqlStatements(bundle) {
	return bundle
		.split(';')
		.map((s) => s.trim())
		.filter((s) => s.length > 0)
}

function getSchemaDDL() {
	return [SQL_CREATE_HANZI_CURRICULUM, SQL_CREATE_USER_CHAR_PROGRESS]
}

export { getSchemaDDL }

/** @returns {Promise<boolean>} */
function resolveExists(url) {
	return new Promise((resolve) => {
		plus.io.resolveLocalFileSystemURL(
			url,
			() => resolve(true),
			() => resolve(false)
		)
	})
}

/** 将包内 static/db 复制到 _doc，便于读写 */
function copyBundledDbIfNeeded() {
	return new Promise((resolve, reject) => {
		const dstName = 'hanzi_curriculum.db'
		plus.io.resolveLocalFileSystemURL(
			DOC_PATH,
			() => resolve(),
			() => {
				plus.io.resolveLocalFileSystemURL(
					BUNDLED_RELATIVE_WWW,
					(srcEntry) => {
						plus.io.resolveLocalFileSystemURL(
							'_doc/',
							(dstDir) => {
								srcEntry.copyTo(dstDir, dstName, () => resolve(), reject)
							},
							reject
						)
					},
					() => resolve()
				)
			}
		)
	})
}

function openDatabase() {
	return new Promise((resolve, reject) => {
		plus.sqlite.openDatabase({
			name: DB_NAME,
			path: DOC_PATH,
			success: () => resolve(),
			fail: (e) => reject(e || new Error('openDatabase failed'))
		})
	})
}

function executeSql(sql) {
	return new Promise((resolve, reject) => {
		plus.sqlite.executeSql({
			name: DB_NAME,
			path: DOC_PATH,
			sql,
			success: () => resolve(),
			fail: (e) => reject(e || new Error(`executeSql: ${sql.slice(0, 80)}`))
		})
	})
}

function selectSql(sql) {
	return new Promise((resolve, reject) => {
		plus.sqlite.selectSql({
			name: DB_NAME,
			path: DOC_PATH,
			sql,
			success: (data) => resolve(Array.isArray(data) ? data : []),
			fail: (e) => reject(e || new Error(`selectSql: ${sql.slice(0, 80)}`))
		})
	})
}

async function ensureTablesFromDDL() {
	const rows = await selectSql(
		`SELECT name FROM sqlite_master WHERE type='table' AND name='${TABLE_HANZI_CURRICULUM}'`
	)
	if (rows.length > 0) return
	for (const bundle of getSchemaDDL()) {
		for (const stmt of splitSqlStatements(bundle)) {
			await executeSql(stmt)
		}
	}
}

let initPromise = null

/**
 * 初始化：可选复制包内 db → _doc，打开库，缺表则执行 DDL。
 * @returns {Promise<boolean>}
 */
export async function ensureCurriculumDatabase() {
	if (!isSqliteAvailable()) return false
	if (initPromise) return initPromise
	initPromise = (async () => {
		try {
			await copyBundledDbIfNeeded()
		} catch (e) {
			console.warn('[curriculum-db] copy bundled db skipped', e)
		}
		await openDatabase()
		await ensureTablesFromDDL()
		return true
	})().catch((e) => {
		initPromise = null
		console.error('[curriculum-db] ensureCurriculumDatabase', e)
		throw e
	})
	return initPromise
}

function buildCurriculumSelectSql(prefs) {
	const p = prefs || getCurriculumPrefs()
	const tv = escapeSqlLiteral(p.textbook_version_id)
	const grade = Number(p.grade)
	const sem = escapeSqlLiteral(p.semester === '下' ? '下' : '上')
	let sql = `SELECT ${COL.id}, ${COL.hanzi}, ${COL.pinyin}, ${COL.list_type}, ${COL.sort_order}, ${COL.lesson_hint} FROM ${TABLE_HANZI_CURRICULUM} WHERE ${COL.textbook_version_id} = '${tv}' AND ${COL.grade} = ${Number.isFinite(grade) ? grade : 1} AND ${COL.semester} = '${sem}'`
	if (p.list_type_preference && p.list_type_preference !== LIST_TYPE_PREFERENCE.ALL) {
		sql += ` AND ${COL.list_type} = '${escapeSqlLiteral(p.list_type_preference)}'`
	}
	sql += ` ${orderBySortOrderAsc()}`
	return sql
}

/**
 * 查询当前教材偏好下的生字行
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function queryCurriculumChars(prefs) {
	if (!isSqliteAvailable()) return []
	try {
		await ensureCurriculumDatabase()
		const sql = buildCurriculumSelectSql(prefs)
		return await selectSql(sql)
	} catch (e) {
		console.warn('[curriculum-db] queryCurriculumChars', e)
		return []
	}
}

/** 拼接示例 SQL（调试） */
export function debugSelectSql(prefs) {
	const { whereSql, params } = buildCurriculumWhere(prefs)
	const sql = `SELECT ${COL.hanzi}, ${COL.pinyin}, ${COL.list_type}, ${COL.sort_order}, ${COL.lesson_hint} FROM ${TABLE_HANZI_CURRICULUM} WHERE ${whereSql} ${orderBySortOrderAsc()}`
	return { sql, params }
}

export function isSqliteAvailable() {
	return typeof plus !== 'undefined' && plus.sqlite && typeof plus.sqlite.openDatabase === 'function'
}

/**
 * 关闭库（例如切换账号前）；下次查询会重新 ensure。
 */
export function closeCurriculumDatabase() {
	initPromise = null
	if (!isSqliteAvailable()) return
	try {
		if (typeof plus.sqlite.closeDatabase === 'function') {
			plus.sqlite.closeDatabase({
				name: DB_NAME,
				path: DOC_PATH
			})
		}
	} catch (e) {
		console.warn('[curriculum-db] closeDatabase', e)
	}
}

/** 查询用户进度行（App）；失败返回 [] */
export async function queryUserCharProgressRows() {
	if (!isSqliteAvailable()) return []
	try {
		await ensureCurriculumDatabase()
		const sql = `SELECT * FROM ${TABLE_USER_CHAR_PROGRESS} ORDER BY ${COL_PROGRESS.updated_at_ms} DESC`
		return await selectSql(sql)
	} catch (e) {
		console.warn('[curriculum-db] queryUserCharProgressRows', e)
		return []
	}
}
