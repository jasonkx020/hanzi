/**
 * 从 static/pinyin/*.opus 预提取 MFCC（Meyda）
 * 运行：npm run pinyin:mfcc-fingerprints
 * 需本机 ffmpeg + meyda（devDependency）
 *
 * 仅 import .mjs，避免 Node 将项目内 .js 当 CommonJS 解析报错。
 */
import { execSync, spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
	PINYIN_AUDIO_SAMPLE_RATE,
	FFMPEG_PCM_ARGS
} from './lib/pinyin-audio-build-constants.mjs'
import {
	extractMfccFromInt16,
	serializeMfccEntry,
	buildPinyinMfccMeta,
	TARGET_SR
} from './lib/mfcc-node-test-core.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pinyinDir = path.join(__dirname, '../static/pinyin')
const outFile = path.join(__dirname, '../data/pinyin-mfcc-fingerprints.json')

function hasFfmpeg() {
	try {
		execSync('ffmpeg -version', { stdio: 'ignore' })
		return true
	} catch (_) {
		return false
	}
}

if (!hasFfmpeg()) {
	console.error('未找到 ffmpeg，请安装后重试：https://ffmpeg.org/download.html')
	process.exit(1)
}

function decodeOpusToPcm(filePath) {
	const r = spawnSync(
		'ffmpeg',
		['-y', '-i', filePath, ...FFMPEG_PCM_ARGS, 'pipe:1'],
		{ encoding: 'buffer', maxBuffer: 32 * 1024 * 1024 }
	)
	if (r.status !== 0) throw new Error(r.stderr?.toString?.() || 'ffmpeg fail')
	return new Int16Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 2)
}

let meydaVer = 'meyda'
try {
	const pkg = JSON.parse(
		fs.readFileSync(path.join(__dirname, '../node_modules/meyda/package.json'), 'utf8')
	)
	meydaVer = `meyda@${pkg.version || ''}`
} catch (_) {}

if (TARGET_SR !== PINYIN_AUDIO_SAMPLE_RATE) {
	console.warn(
		`[mfcc-build] TARGET_SR=${TARGET_SR} 与 PINYIN_AUDIO_SAMPLE_RATE=${PINYIN_AUDIO_SAMPLE_RATE} 不一致`
	)
}

const out = {
	_meta: buildPinyinMfccMeta(meydaVer)
}

const files = fs.existsSync(pinyinDir)
	? fs.readdirSync(pinyinDir).filter((f) => f.endsWith('.opus'))
	: []

let ok = 0
let fail = 0
for (const f of files) {
	const stem = f.replace(/\.opus$/i, '')
	try {
		const pcm = decodeOpusToPcm(path.join(pinyinDir, f))
		const feat = extractMfccFromInt16(pcm, TARGET_SR)
		if (!feat.frames?.length) throw new Error('no mfcc frames')
		out[stem] = serializeMfccEntry(feat)
		ok++
	} catch (e) {
		fail++
		if (fail <= 8) console.warn('skip', f, e.message)
	}
}

fs.mkdirSync(path.dirname(outFile), { recursive: true })
fs.writeFileSync(outFile, JSON.stringify(out))
console.log(`MFCC 指纹已写入 ${outFile}，成功 ${ok}，跳过 ${fail}`)
