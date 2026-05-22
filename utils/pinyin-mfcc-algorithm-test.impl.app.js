/**
 * MFCC 算法自检：示范 opus → PCM → MFCC，与预提取指纹 DTW 比对（与跟读评分同链路）
 */
import prebuiltMfccFingerprints from '@/data/pinyin-mfcc-fingerprints.json'
import { PINYIN_LETTER_SYMBOLS } from '@/data/pinyin-letter-symbols.js'
import { PINYIN_MFCC_PASS_SCORE } from '@/constants/pinyin-mfcc-config.js'
import { deserializeMfccEntry } from '@/utils/pinyin-mfcc-serialize.js'
import { extractMfccFromFloat32, extractMfccFromInt16 } from '@/utils/pinyin-mfcc-extract.js'
import { compareMfccFeatures, MFCC_PASS_SCORE } from '@/utils/pinyin-mfcc-compare.js'
import { buildFollowReadScoreFromMfcc } from '@/utils/pinyin-mfcc-score.js'
import { passesMfccSpeechGate } from '@/utils/pinyin-follow-read-speech-gate.js'
import {
	readAppStaticAsArrayBuffer,
	decodeArrayBufferToMono,
	decodePcmBufferForFeature,
	decodeUserRecordingForScore
} from '@/utils/pinyin-follow-read-audio-decode.js'
import { decodeRawPcmS16le, inferRecordingAudioHint } from '@/utils/pinyin-pcm-decode.js'
import { sniffRecordingAudioKind } from '@/utils/pinyin-audio-sniff.js'
import { isAppPlus } from '@/utils/pinyin-follow-read-platform.js'
import {
	PINYIN_MFCC_SAMPLE_RATE,
	PINYIN_RECORD_MIN_PCM_BYTES
} from '@/constants/pinyin-audio-sample-rate.js'
import { logFollowReadScore } from '@/utils/pinyin-follow-read-debug-log.js'

const DEFAULT_OPUS_WEB_PATH = '/static/pinyin/m.opus'

/**
 * @param {string} symbol 文件名 stem，如 m
 */
export function getPrebuiltMfccReference(symbol) {
	const stem = String(symbol || '').trim()
	const entry = prebuiltMfccFingerprints?.[stem]
	const feat = deserializeMfccEntry(entry)
	if (!feat?.frames?.length) {
		throw new Error(`预提取 MFCC 不存在或为空：${stem}`)
	}
	return feat
}

function buildUserMfccFromDecoded(decoded) {
	const sampleRate = decoded.sampleRate || PINYIN_MFCC_SAMPLE_RATE
	const userFeat =
		decoded.decodePath === 'pcm' && decoded.int16?.length
			? extractMfccFromInt16(decoded.int16, sampleRate)
			: extractMfccFromFloat32(decoded.samples, sampleRate)
	const pcmSamples = decoded.int16?.length || decoded.samples?.length || 0
	const recordDurationMs =
		sampleRate > 0 ? Math.round((pcmSamples / sampleRate) * 1000) : 0
	return {
		userFeat,
		decoded,
		pcmSamples,
		recordDurationMs
	}
}

/**
 * @param {ArrayBuffer} arrayBuffer opus/mp3/pcm 等
 * @param {string} [hint]
 * @param {string} [filePath] 含扩展名的路径，供 opus/wav 嗅探
 */
export async function buildUserMfccFromAudioBuffer(arrayBuffer, hint = 'opus', filePath = '') {
	const pathHint = filePath || hint
	const h = inferRecordingAudioHint(hint, pathHint)
	if (h === 'pcm' || h === 'wav') {
		try {
			const decoded = decodePcmBufferForFeature(arrayBuffer, h === 'wav' ? 'wav' : 'pcm')
			logFollowReadScore('score.mfcc_test.pcm_decode', {
				bytes: arrayBuffer.byteLength,
				sniff: decoded.sniff,
				samples: decoded.int16?.length || decoded.samples?.length || 0
			})
			return buildUserMfccFromDecoded(decoded)
		} catch (e) {
			logFollowReadScore('score.mfcc_test.pcm_decode_fallback', {
				err: String(e?.message || e)
			})
			const raw = decodeRawPcmS16le(arrayBuffer, PINYIN_MFCC_SAMPLE_RATE)
			return buildUserMfccFromDecoded({
				int16: raw.int16,
				samples: raw.samples,
				sampleRate: raw.sampleRate,
				decodePath: 'pcm',
				sniff: 'pcm_raw'
			})
		}
	}
	const dec = await decodeArrayBufferToMono(arrayBuffer, pathHint)
	return buildUserMfccFromDecoded({
		samples: dec.samples,
		sampleRate: dec.sampleRate,
		decodePath: 'compressed'
	})
}

/**
 * 与跟读 requestFollowReadScoreMfcc 同核心的比对结果
 * @param {{ frames: number[][], durationMs: number, voicedRatio?: number }} refFeat
 * @param {{ frames: number[][], durationMs: number, voicedRatio?: number }} userFeat
 * @param {{ decoded?: object, recordDurationMs?: number, label?: string }} [ctx]
 */
export function runMfccAlgorithmCompare(refFeat, userFeat, ctx = {}) {
	const recordDurationMs = Number(ctx.recordDurationMs) || Number(userFeat?.durationMs) || 0
	const gate = passesMfccSpeechGate(userFeat, ctx.decoded || {}, recordDurationMs)
	const cmp = compareMfccFeatures(refFeat, userFeat)
	const pass = cmp.matchScore >= MFCC_PASS_SCORE
	const score = buildFollowReadScoreFromMfcc(cmp, recordDurationMs, PINYIN_MFCC_SAMPLE_RATE)

	const lines = [
		ctx.label ? `—— ${ctx.label} ——` : '—— MFCC 比对 ——',
		`参考帧：${refFeat?.frames?.length || 0} · ${Math.round(refFeat?.durationMs || 0)} ms · voiced ${fmtRatio(refFeat?.voicedRatio)}`,
		`用户帧：${userFeat?.frames?.length || 0} · ${Math.round(userFeat?.durationMs || 0)} ms · voiced ${fmtRatio(userFeat?.voicedRatio)}`,
		`门控：${gate.pass ? '通过' : '未通过'} (${gate.reason})`,
		`DTW 相似：${pct(cmp.dtwSim)} · matchScore：${pct(cmp.matchScore)} · 及格线 ${pct(MFCC_PASS_SCORE)}`,
		`时长比 durRatio：${pct(cmp.durRatio)} · 判定：${pass ? '通过' : '未通过'} · 映射分 ${score}`
	]

	return {
		gate,
		cmp,
		pass,
		score,
		passThreshold: MFCC_PASS_SCORE,
		lines
	}
}

/**
 * 从 static 示范 opus 跑完整自检（H5 / 小程序等可 decodeAudioData 的端）
 * @param {string} [symbol]
 * @param {string} [opusWebPath]
 */
export async function runMfccSelfTestFromOpus(symbol = 'm', opusWebPath = DEFAULT_OPUS_WEB_PATH) {
	const stem = String(symbol || 'm').trim()
	const refPrebuilt = getPrebuiltMfccReference(stem)
	const { buffer: buf, hint: audioHint, sourcePath } = await loadDemoAudioForMfcc(stem)
	const userFromOpus = await buildUserMfccFromAudioBuffer(buf, audioHint, sourcePath)

	const prebuiltVsOpus = runMfccAlgorithmCompare(refPrebuilt, userFromOpus.userFeat, {
		decoded: userFromOpus.decoded,
		recordDurationMs: userFromOpus.recordDurationMs,
		label: `预提取 ${stem} vs ${stem}.opus 解码`
	})

	const liveRef = userFromOpus.userFeat
	const opusVsOpus = runMfccAlgorithmCompare(liveRef, userFromOpus.userFeat, {
		decoded: userFromOpus.decoded,
		recordDurationMs: userFromOpus.recordDurationMs,
		label: '同一段 opus 特征自比对（应≈100%）'
	})

	const prebuiltVsPrebuilt = runMfccAlgorithmCompare(refPrebuilt, refPrebuilt, {
		label: '预提取自比对（应≈100%）'
	})

	const lines = [
		`音源：${sourcePath}`,
		`PCM 样本：${userFromOpus.pcmSamples} · 约 ${userFromOpus.recordDurationMs} ms`,
		...prebuiltVsOpus.lines,
		...opusVsOpus.lines,
		...prebuiltVsPrebuilt.lines
	]

	return {
		symbol: stem,
		refPrebuilt,
		userFromOpus,
		prebuiltVsOpus,
		opusVsOpus,
		prebuiltVsPrebuilt,
		lines,
		/** 算法准不准主要看这条：示范音与预提取应高度一致 */
		mainPass: prebuiltVsOpus.pass,
		mainMatchScore: prebuiltVsOpus.cmp.matchScore
	}
}

/** App 优先读预导出的 16k s16le（无 AudioContext 也可测） */
function pcmSidecarWebPath(stem) {
	return `/static/pinyin/_pcm/${String(stem || 'm').trim()}.s16le`
}

async function loadDemoAudioForMfcc(stem) {
	const s = String(stem || 'm').trim()
	const pcmPath = pcmSidecarWebPath(s)
	const opusPath = `/static/pinyin/${s}.opus`
	let pcmErr = null
	try {
		const pcmBuf = await readAppStaticAsArrayBuffer(pcmPath)
		if (pcmBuf?.byteLength >= PINYIN_RECORD_MIN_PCM_BYTES) {
			const sniff = sniffRecordingAudioKind(pcmBuf)
			if (sniff === 'pcm_raw' || sniff === 'wav') {
				return {
					buffer: pcmBuf,
					hint: sniff === 'wav' ? 'wav' : 'pcm',
					sourcePath: pcmPath
				}
			}
			pcmErr = new Error(`旁路文件不是 PCM（嗅探 ${sniff}）`)
		} else {
			pcmErr = new Error(`PCM 过小：${pcmBuf?.byteLength || 0} 字节`)
		}
	} catch (e) {
		pcmErr = e
		console.warn('[mfcc-algorithm-test] pcm sidecar', pcmPath, e)
	}

	try {
		const buf = await loadStaticOpusArrayBuffer(opusPath)
		return { buffer: buf, hint: 'opus', sourcePath: opusPath }
	} catch (opusErr) {
		const msg = isAppPlus()
			? `App 无法加载示范音：${pcmPath}（${pcmErr?.message || '失败'}）；${opusPath}（${opusErr?.message || '失败'}）。请执行 npm run pinyin:export-pcm-sidecar ${s} 并重新打包，或确认 ${opusPath} 已打进包。`
			: `无法加载示范音：${pcmErr?.message || ''} / ${opusErr?.message || opusErr}`
		throw new Error(msg)
	}
}

/**
 * App 端 uni.request 会把 /static 变成 file://，须走 plus.io（与跟读读示范音一致）
 * @param {string} webPath 如 /static/pinyin/m.opus
 */
async function loadStaticOpusArrayBuffer(webPath) {
	const url = String(webPath || '').trim()
	if (!url.startsWith('/static/')) {
		throw new Error('loadStaticOpus: 需要 /static/ 路径')
	}
	if (isAppPlus()) {
		return readAppStaticAsArrayBuffer(url)
	}
	try {
		return await readAppStaticAsArrayBuffer(url)
	} catch (_) {
		/* H5 / 小程序再试 request */
	}
	return loadStaticOpusViaHttp(url)
}

function loadStaticOpusViaHttp(url) {
	return new Promise((resolve, reject) => {
		uni.request({
			url,
			method: 'GET',
			responseType: 'arraybuffer',
			success: (res) => {
				if (res.statusCode >= 200 && res.statusCode < 300 && res.data) {
					resolve(res.data)
					return
				}
				reject(new Error(`HTTP ${res.statusCode}`))
			},
			fail: (e) => reject(e?.errMsg ? new Error(e.errMsg) : e)
		})
	})
}

function pct(v) {
	return `${Math.round((Number(v) || 0) * 100)}%`
}

function fmtRatio(v) {
	const n = Number(v)
	if (!Number.isFinite(n)) return '—'
	return `${Math.round(n * 1000) / 10}%`
}

/** 声母 + 韵母字母，且已有预提取 MFCC（用于录音测试下拉） */
export function listMfccLetterSymbols() {
	const have = new Set(listMfccFingerprintSymbols())
	return PINYIN_LETTER_SYMBOLS.filter((s) => have.has(s))
}

/** 已有预提取 MFCC 的音节名（与 static/pinyin/*.opus stem 一致） */
export function listMfccFingerprintSymbols() {
	const raw = prebuiltMfccFingerprints || {}
	const out = []
	for (const k of Object.keys(raw)) {
		if (k === '_meta' || !k) continue
		const feat = deserializeMfccEntry(raw[k])
		if (feat?.frames?.length) out.push(k)
	}
	out.sort((a, b) => {
		const la = a.length
		const lb = b.length
		if (la !== lb) return la - lb
		return a.localeCompare(b, 'zh')
	})
	return out
}

export function hasMfccFingerprint(symbol) {
	try {
		getPrebuiltMfccReference(symbol)
		return true
	} catch (_) {
		return false
	}
}

/** 预提取指纹摘要（调试页展示，不跑解码） */
export function getMfccFingerprintPreview(symbol) {
	const stem = String(symbol || '').trim()
	if (!stem) return null
	const raw = prebuiltMfccFingerprints?.[stem]
	const feat = deserializeMfccEntry(raw)
	if (!feat?.frames?.length) return null
	return {
		symbol: stem,
		frameCount: feat.frames.length,
		durationMs: Math.round(feat.durationMs || 0),
		voicedRatio: feat.voicedRatio,
		meta: prebuiltMfccFingerprints?._meta || null
	}
}

/**
 * 用户按住录音的 PCM 与所选音节预提取指纹比对（与跟读评分同链路）
 * @param {string} symbol
 * @param {ArrayBuffer} recordPcmBuffer
 * @param {{ durationMs?: number }} [opts]
 */
export async function runMfccCompareUserRecording(symbol, recordPcmBuffer, opts = {}) {
	const stem = String(symbol || '').trim()
	if (!stem) throw new Error('请选择音节')
	const tempFilePath = String(opts.tempFilePath || '').trim()
	if (!recordPcmBuffer?.byteLength && !tempFilePath) {
		throw new Error('无录音数据，请先按住说话')
	}
	const refPrebuilt = getPrebuiltMfccReference(stem)
	const decoded = await decodeUserRecordingForScore(
		tempFilePath,
		opts.recordFormat || 'pcm',
		{
			recordPcmBuffer,
			recordDurationMs: Number(opts.durationMs) || 0
		}
	)
	const userFromRec = buildUserMfccFromDecoded(decoded)
	const recordDurationMs = userFromRec.recordDurationMs || Number(opts.durationMs) || 0
	const pcmBytes = recordPcmBuffer?.byteLength || 0
	const compare = runMfccAlgorithmCompare(refPrebuilt, userFromRec.userFeat, {
		decoded: userFromRec.decoded,
		recordDurationMs,
		label: `预提取 ${stem} vs 你的录音`
	})
	const refPreview = getMfccFingerprintPreview(stem)
	const pctMatch = Math.round((compare.cmp.matchScore || 0) * 100)
	const lines = [
		`模式：录音 PCM vs 预提取 MFCC（跟读评分同链路）`,
		`目标音节：${stem}`,
		`预提取：${refPreview?.frameCount || refPrebuilt.frames.length} 帧 · ${refPreview?.durationMs || Math.round(refPrebuilt.durationMs || 0)} ms · voiced ${fmtRatio(refPrebuilt.voicedRatio)}`,
		`录音 PCM：${pcmBytes} 字节 · ${userFromRec.pcmSamples} 采样 · ${Math.round(recordDurationMs)} ms · 解码 ${userFromRec.decoded?.decodePath || '—'}`,
		...compare.lines
	]
	const summaryText = compare.pass
		? `与「${stem}」相似 ${pctMatch}% · 映射分 ${compare.score} · 通过`
		: `与「${stem}」相似 ${pctMatch}% · 映射分 ${compare.score} · 未通过`
	logFollowReadScore('score.mfcc_test.user_compare', {
		symbol: stem,
		pass: compare.pass,
		matchScore: compare.cmp.matchScore,
		bytes: pcmBytes
	})
	return {
		symbol: stem,
		refPreview,
		refFeat: {
			frameCount: refPrebuilt.frames?.length || 0,
			durationMs: Math.round(refPrebuilt.durationMs || 0),
			voicedRatio: refPrebuilt.voicedRatio
		},
		userFeat: {
			frameCount: userFromRec.userFeat?.frames?.length || 0,
			durationMs: Math.round(userFromRec.userFeat?.durationMs || 0),
			voicedRatio: userFromRec.userFeat?.voicedRatio,
			pcmBytes,
			pcmSamples: userFromRec.pcmSamples,
			sampleRate: userFromRec.decoded?.sampleRate || PINYIN_MFCC_SAMPLE_RATE
		},
		compare,
		lines,
		summaryText,
		mainPass: compare.pass,
		mainMatchScore: compare.cmp.matchScore,
		dtwSim: compare.cmp.dtwSim,
		durRatio: compare.cmp.durRatio,
		score: compare.score,
		gate: compare.gate
	}
}

/** 评分调试：预提取 vs 录音 PCM（runMfccCompareUserRecording 别名） */
export async function runMfccScoreDebugCompare(symbol, recordPcmBuffer, opts = {}) {
	return runMfccCompareUserRecording(symbol, recordPcmBuffer, opts)
}

export { DEFAULT_OPUS_WEB_PATH, PINYIN_MFCC_PASS_SCORE }
