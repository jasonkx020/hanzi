const STORAGE_KEY = 'dictionary_detail_cache_v2'
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

function readCacheMap() {
	try {
		const raw = uni.getStorageSync(STORAGE_KEY)
		if (raw && typeof raw === 'object' && !Array.isArray(raw)) return { ...raw }
	} catch (_) {}
	return {}
}

function writeCacheMap(map) {
	try {
		uni.setStorageSync(STORAGE_KEY, map)
	} catch (_) {}
}

export function getCachedDictionaryDetail(hanzi) {
	const key = String(hanzi || '').trim()
	if (!key) return null
	const map = readCacheMap()
	const row = map[key] || null
	if (!row) return null
	const updated = Number(row.updated_at_ms) || 0
	if (updated > 0 && Date.now() - updated > CACHE_TTL_MS) {
		delete map[key]
		writeCacheMap(map)
		return null
	}
	return row
}

export function setCachedDictionaryDetail(hanzi, detail) {
	const key = String(hanzi || '').trim()
	if (!key || !detail || typeof detail !== 'object') return
	const map = readCacheMap()
	map[key] = {
		...detail,
		updated_at_ms: Date.now()
	}
	writeCacheMap(map)
}

export function clearDictionaryCache() {
	try {
		uni.removeStorageSync(STORAGE_KEY)
	} catch (_) {}
}

export function getDictionaryCacheStats() {
	const map = readCacheMap()
	const keys = Object.keys(map)
	return {
		count: keys.length,
		ttl_ms: CACHE_TTL_MS
	}
}
