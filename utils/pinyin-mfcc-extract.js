/**
 * MFCC 特征提取（Meyda），构建脚本与运行时共用。
 * 使用 package main（dist/node 单文件打包），避免 esm 入口依赖 tslib。
 */
import Meyda from 'meyda'
import {
	PINYIN_MFCC_SAMPLE_RATE,
	PINYIN_MFCC_FRAME_SIZE,
	PINYIN_MFCC_HOP_SIZE,
	PINYIN_MFCC_COEFFS,
	PINYIN_MFCC_TRIM_THRESHOLD,
	PINYIN_MFCC_EXTRACTOR,
	buildPinyinMfccMeta
} from '../constants/pinyin-mfcc-config.js'
import {
	resampleMono,
	trimSilencePcm,
	FOLLOW_READ_TARGET_SR
} from './pinyin-follow-read-audio-features.js'

let meydaReady = false
/** @type {boolean|null} */
let mfccRuntimeOk = null

function ensureMeyda() {
	if (meydaReady) return
	Meyda.bufferSize = PINYIN_MFCC_FRAME_SIZE
	Meyda.sampleRate = PINYIN_MFCC_SAMPLE_RATE
	meydaReady = true
}

/** App / 小程序首次评分前探测 Meyda 是否可用 */
export function isMfccRuntimeAvailable() {
	if (mfccRuntimeOk !== null) return mfccRuntimeOk
	try {
		ensureMeyda()
		const frame = new Float32Array(PINYIN_MFCC_FRAME_SIZE)
		for (let i = 0; i < frame.length; i++) frame[i] = Math.sin((i / frame.length) * Math.PI * 2) * 0.2
		const out = Meyda.extract(PINYIN_MFCC_EXTRACTOR, frame)
		mfccRuntimeOk = !!(out && out.length >= PINYIN_MFCC_COEFFS)
	} catch (e) {
		console.warn('[pinyin-mfcc] runtime probe fail', e)
		mfccRuntimeOk = false
	}
	return mfccRuntimeOk
}

function frameRms(samples, from, to) {
	let s = 0
	const n = to - from
	if (n <= 0) return 0
	for (let i = from; i < to; i++) s += samples[i] * samples[i]
	return Math.sqrt(s / n)
}

function computeVoicedRatio(mono, sr) {
	if (!mono?.length) return 0
	const frame = Math.max(1, Math.floor(sr * 0.02))
	let voiced = 0
	let total = 0
	for (let i = 0; i < mono.length; i += frame) {
		const r = frameRms(mono, i, Math.min(mono.length, i + frame))
		total++
		if (r >= 0.02) voiced++
	}
	return total ? voiced / total : 0
}

/**
 * @param {Float32Array} frame
 * @returns {number[]|null}
 */
function extractMfccFrame(frame) {
	ensureMeyda()
	if (!frame?.length || frame.length < PINYIN_MFCC_FRAME_SIZE) return null
	const buf = frame.length === PINYIN_MFCC_FRAME_SIZE ? frame : frame.subarray(0, PINYIN_MFCC_FRAME_SIZE)
	const out = Meyda.extract(PINYIN_MFCC_EXTRACTOR, buf.length === PINYIN_MFCC_FRAME_SIZE ? buf : Float32Array.from(buf))
	if (!out || !out.length) return null
	const row = []
	for (let i = 0; i < PINYIN_MFCC_COEFFS; i++) {
		row.push(Number(out[i]) || 0)
	}
	return row
}

/**
 * @param {Float32Array} samples 单声道
 * @param {number} [sampleRate]
 * @returns {{ frames: number[][], durationMs: number, voicedRatio: number, meta: object }}
 */
export function extractMfccFromFloat32(samples, sampleRate = PINYIN_MFCC_SAMPLE_RATE) {
	const sr = sampleRate || PINYIN_MFCC_SAMPLE_RATE
	let mono = resampleMono(samples, sr, FOLLOW_READ_TARGET_SR)
	mono = trimSilencePcm(mono, FOLLOW_READ_TARGET_SR, PINYIN_MFCC_TRIM_THRESHOLD)
	const durationMs = mono.length ? (mono.length / FOLLOW_READ_TARGET_SR) * 1000 : 0
	const voicedRatio = computeVoicedRatio(mono, FOLLOW_READ_TARGET_SR)
	const frames = []

	if (mono.length >= PINYIN_MFCC_FRAME_SIZE) {
		for (let i = 0; i + PINYIN_MFCC_FRAME_SIZE <= mono.length; i += PINYIN_MFCC_HOP_SIZE) {
			const slice = mono.subarray(i, i + PINYIN_MFCC_FRAME_SIZE)
			const row = extractMfccFrame(slice)
			if (row) frames.push(row)
		}
	}

	return {
		frames,
		durationMs,
		voicedRatio,
		meta: buildPinyinMfccMeta(typeof Meyda !== 'undefined' ? 'meyda' : 'meyda')
	}
}

/**
 * Node 构建脚本：Int16 PCM
 * @param {Int16Array} int16
 */
export function extractMfccFromInt16(int16, sampleRate = PINYIN_MFCC_SAMPLE_RATE) {
	const samples = new Float32Array(int16.length)
	for (let i = 0; i < int16.length; i++) samples[i] = int16[i] / 32768
	return extractMfccFromFloat32(samples, sampleRate)
}

/** JSON 序列化：降低体积 */
export function serializeMfccEntry(feature) {
	return {
		durationMs: Math.round(feature.durationMs || 0),
		voicedRatio: +Number(feature.voicedRatio || 0).toFixed(4),
		frames: (feature.frames || []).map((row) =>
			row.map((v) => +Number(v).toFixed(3))
		)
	}
}

/** 反序列化为运行时结构 */
export function deserializeMfccEntry(entry) {
	if (!entry?.frames?.length) return null
	return {
		frames: entry.frames.map((row) => row.map((v) => Number(v))),
		durationMs: Number(entry.durationMs) || 0,
		voicedRatio: Number(entry.voicedRatio) || 0
	}
}
