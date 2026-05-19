/**
 * 从 static/pinyin/*.opus 预提取 MFCC（Meyda），与 utils/pinyin-mfcc-extract.js 同参。
 * 运行：npm run pinyin:mfcc-fingerprints
 * 需 meyda；解码优先系统 ffmpeg，否则 `ffmpeg-static`（devDependency）。
 */
import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { buildPinyinMfccMeta } from '../constants/pinyin-mfcc-config.js'
import { extractMfccFromInt16, serializeMfccEntry } from '../utils/pinyin-mfcc-extract.js'
import { resolveFfmpegExecutable } from './resolve-ffmpeg-bin.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pinyinDir = path.join(__dirname, '../static/pinyin')
const outFile = path.join(__dirname, '../data/pinyin-mfcc-fingerprints.json')

const TARGET_SR = 16000

const ffmpegBin = resolveFfmpegExecutable()
if (!ffmpegBin) {
	console.error(
		'未找到 ffmpeg：请安装系统 ffmpeg，或执行 npm i -D ffmpeg-static 后重试'
	)
	process.exit(1)
}

function decodeOpusToPcm(filePath) {
	const r = spawnSync(
		ffmpegBin,
		['-y', '-i', filePath, '-ac', '1', '-ar', String(TARGET_SR), '-f', 's16le', 'pipe:1'],
		{ encoding: 'buffer', maxBuffer: 16 * 1024 * 1024 }
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
