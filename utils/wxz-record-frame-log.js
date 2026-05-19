/**
 * wxz-record onFrame 调试日志：区分「回调触发但无 PCM」与「有 PCM 数据」。
 */

const sessions = new Map()

function getSession(source) {
	const key = source || 'default'
	if (!sessions.has(key)) {
		sessions.set(key, {
			seq: 0,
			withData: 0,
			empty: 0,
			firstDataAt: 0,
			firstEmptyAt: 0
		})
	}
	return sessions.get(key)
}

export function resetWxzRecordFrameLog(source) {
	const key = source || 'default'
	sessions.set(key, {
		seq: 0,
		withData: 0,
		empty: 0,
		firstDataAt: 0,
		firstEmptyAt: 0
	})
	console.log(`[wxz-record:onFrame] reset · source=${key}`)
}

/**
 * @param {*} data onFrame 第一个参数
 * @param {number} [decibel]
 * @param {string} [source] 如 record-test | follow-read
 * @returns {boolean} 是否有有效 PCM 字节
 */
export function logWxzRecordOnFrame(data, decibel, source = 'default') {
	const s = getSession(source)
	s.seq++
	const byteLength = Number(data?.byteLength) || 0
	const hasPcm = byteLength > 0
	if (hasPcm) {
		s.withData++
		if (!s.firstDataAt) s.firstDataAt = s.seq
	} else {
		s.empty++
		if (!s.firstEmptyAt) s.firstEmptyAt = s.seq
	}

	const payload = {
		source,
		seq: s.seq,
		hasPcm,
		byteLength,
		decibel,
		withDataTotal: s.withData,
		emptyTotal: s.empty,
		firstDataAtSeq: s.firstDataAt || null,
		dataCtor: data?.constructor?.name ?? (data == null ? 'null' : typeof data),
		isArrayBuffer: typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer
	}

	if (hasPcm) {
		if (s.withData <= 5 || s.withData % 20 === 0) {
			console.log('[wxz-record:onFrame] ✓ 有 PCM 数据', payload)
		}
	} else {
		if (s.empty <= 10 || s.empty % 30 === 0) {
			console.warn('[wxz-record:onFrame] ✗ 回调无 PCM（byteLength=0 或非 ArrayBuffer）', payload)
		}
	}

	return hasPcm
}

export function logWxzRecordFrameSummary(source, extra = {}) {
	const s = getSession(source)
	console.log('[wxz-record:onFrame] 会话汇总', {
		source,
		totalCallbacks: s.seq,
		withData: s.withData,
		empty: s.empty,
		firstDataAtSeq: s.firstDataAt || null,
		...extra
	})
}
