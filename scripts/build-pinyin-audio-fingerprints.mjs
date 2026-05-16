/**
 * 从 static/pinyin/*.opus 生成音频特征指纹（需本机 ffmpeg）。
 * 运行：node scripts/build-pinyin-audio-fingerprints.mjs
 */
import { execSync, spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pinyinDir = path.join(__dirname, '../static/pinyin')
const outFile = path.join(__dirname, '../data/pinyin-audio-fingerprints.json')

const TARGET_SR = 16000
const ENV_BINS = 32
const BAND_HZ = [200, 350, 500, 800, 1200, 1800, 2600, 3800]

function hasFfmpeg() {
	try {
		execSync('ffmpeg -version', { stdio: 'ignore' })
		return true
	} catch (_) {
		return false
	}
}

function decodeOpusToPcm(filePath) {
	const r = spawnSync(
		'ffmpeg',
		['-y', '-i', filePath, '-ac', '1', '-ar', String(TARGET_SR), '-f', 's16le', 'pipe:1'],
		{ encoding: 'buffer', maxBuffer: 8 * 1024 * 1024 }
	)
	if (r.status !== 0) throw new Error(r.stderr?.toString?.() || 'ffmpeg fail')
	return new Int16Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 2)
}

function frameRms(samples, from, to) {
	let s = 0
	const n = to - from
	if (n <= 0) return 0
	for (let i = from; i < to; i++) s += samples[i] * samples[i]
	return Math.sqrt(s / n) / 32768
}

function goertzelEnergy(samples, sr, freq) {
	const n = samples.length
	if (n < 8) return 0
	const k = Math.round((n * freq) / sr)
	const w = (2 * Math.PI * k) / n
	const coeff = 2 * Math.cos(w)
	let s0 = 0
	let s1 = 0
	let s2 = 0
	for (let i = 0; i < n; i++) {
		const x = samples[i] / 32768
		s0 = x + coeff * s1 - s2
		s2 = s1
		s1 = s0
	}
	const p = s1 * s1 + s2 * s2 - coeff * s1 * s2
	return Math.max(0, p) / n
}

function normalize(arr) {
	let sum = 0
	for (let i = 0; i < arr.length; i++) sum += arr[i] * arr[i]
	const norm = Math.sqrt(sum) || 1
	return arr.map((v) => v / norm)
}

function extract(int16) {
	const bins = ENV_BINS
	const env = new Array(bins).fill(0)
	if (int16.length >= bins) {
		const seg = Math.floor(int16.length / bins)
		for (let b = 0; b < bins; b++) {
			env[b] = frameRms(int16, b * seg, Math.min(int16.length, (b + 1) * seg))
		}
	}
	const bands = BAND_HZ.map((hz) => {
		const frame = Math.min(int16.length, Math.floor(TARGET_SR * 0.12))
		if (frame < 64) return 0
		const mid = Math.floor((int16.length - frame) / 2)
		return Math.sqrt(goertzelEnergy(int16.subarray(mid, mid + frame), TARGET_SR, hz))
	})
	return {
		e: normalize(env.map((x) => +x.toFixed(5))),
		b: normalize(bands.map((x) => +x.toFixed(5))),
		d: Math.round((int16.length / TARGET_SR) * 1000)
	}
}

if (!hasFfmpeg()) {
	console.error('未找到 ffmpeg，请安装后重试：https://ffmpeg.org/download.html')
	process.exit(1)
}

const files = fs.readdirSync(pinyinDir).filter((f) => f.endsWith('.opus'))
const out = {}
let ok = 0
let fail = 0
for (const f of files) {
	const stem = f.replace(/\.opus$/i, '')
	try {
		const pcm = decodeOpusToPcm(path.join(pinyinDir, f))
		out[stem] = extract(pcm)
		ok++
	} catch (e) {
		fail++
		if (fail <= 5) console.warn('skip', f, e.message)
	}
}

fs.mkdirSync(path.dirname(outFile), { recursive: true })
fs.writeFileSync(outFile, JSON.stringify(out))
console.log(`指纹已写入 ${outFile}，成功 ${ok}，跳过 ${fail}`)
