/**
 * 将 static/pinyin/*.opus 导出为 _pcm/{stem}.s16le（48kHz mono s16le），供 App MFCC 自检等。
 * 运行：npm run pinyin:export-pcm-sidecar
 * 单符号：node scripts/export-pinyin-pcm-sidecar.mjs m
 */
import { execSync, spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
	PINYIN_AUDIO_SAMPLE_RATE,
	FFMPEG_PCM_ARGS
} from './lib/pinyin-audio-build-constants.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pinyinDir = path.join(__dirname, '../static/pinyin')
const outDir = path.join(pinyinDir, '_pcm')
const onlyStem = process.argv[2] ? String(process.argv[2]).trim() : ''

function hasFfmpeg() {
	try {
		execSync('ffmpeg -version', { stdio: 'ignore' })
		return true
	} catch (_) {
		return false
	}
}

if (!hasFfmpeg()) {
	console.error('未找到 ffmpeg')
	process.exit(1)
}

fs.mkdirSync(outDir, { recursive: true })

const files = fs
	.readdirSync(pinyinDir)
	.filter((f) => f.endsWith('.opus') && (!onlyStem || f.replace(/\.opus$/i, '') === onlyStem))

let ok = 0
let fail = 0
for (const f of files) {
	const stem = f.replace(/\.opus$/i, '')
	const out = path.join(outDir, `${stem}.s16le`)
	const r = spawnSync(
		'ffmpeg',
		['-y', '-i', path.join(pinyinDir, f), ...FFMPEG_PCM_ARGS, out],
		{ stdio: 'inherit' }
	)
	if (r.status === 0) ok++
	else fail++
}
console.log(
	`PCM sidecar: ${outDir}，成功 ${ok}，失败 ${fail}（${PINYIN_AUDIO_SAMPLE_RATE}Hz mono s16le）`
)
