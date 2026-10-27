/**
 * 微信小程序发行前准备：
 * - 把课表 JSON 拷到 static/curriculum（小程序用 FileSystemManager 读取，不打进主包 JS）
 * - 可选：优化运行时图标（Python/Pillow：npm run assets:icons:optimize）
 * - 若本机有 ffmpeg，把 opus 转成 dist-mp-cdn 下的 mp3（上传 CDN，不要打进小程序包）
 * - 打印 static 体积，对照主包 2MB / 整包 20MB
 *
 * 运行：npm run assets:mp:prepare
 * 图标：npm run assets:mp:prepare -- --icons   或  npm run assets:icons:optimize
 */
import fs from 'fs'
import path from 'path'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function copyFile(from, to) {
	fs.mkdirSync(path.dirname(to), { recursive: true })
	fs.copyFileSync(from, to)
	console.log('[mp] copied', path.relative(root, to))
}

function dirSize(dir) {
	if (!fs.existsSync(dir)) return 0
	let n = 0
	for (const name of fs.readdirSync(dir)) {
		const p = path.join(dir, name)
		const st = fs.statSync(p)
		n += st.isDirectory() ? dirSize(p) : st.size
	}
	return n
}

function mb(n) {
	return `${(n / 1024 / 1024).toFixed(2)} MB`
}

function convertOpusDir(srcDir, destDir) {
	const ffmpeg = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' })
	if (ffmpeg.error || ffmpeg.status !== 0) {
		console.log('[mp] ffmpeg 不可用，跳过 opus→mp3。安装后执行 npm run assets:mp:prepare -- --audio')
		return
	}
	if (!fs.existsSync(srcDir)) return
	fs.mkdirSync(destDir, { recursive: true })
	const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.opus'))
	let ok = 0
	for (const f of files) {
		const out = path.join(destDir, f.replace(/\.opus$/i, '.mp3'))
		if (fs.existsSync(out)) {
			ok++
			continue
		}
		const r = spawnSync(
			'ffmpeg',
			['-y', '-i', path.join(srcDir, f), '-codec:a', 'libmp3lame', '-q:a', '6', out],
			{ encoding: 'utf8' }
		)
		if (r.status === 0) ok++
	}
	console.log(`[mp] mp3 ${ok}/${files.length} -> ${path.relative(root, destDir)}`)
}

function optimizeIcons() {
	const script = path.join(root, 'scripts', 'resize-mengmeng-assets.py')
	const r = spawnSync('python', [script, '--all'], { encoding: 'utf8', cwd: root })
	if (r.error || r.status !== 0) {
		console.log('[mp] 图标优化跳过（需 Python + Pillow）。可单独执行：npm run assets:icons:optimize')
		if (r.stderr) console.log(r.stderr.trim())
		return
	}
	if (r.stdout) console.log(r.stdout.trim())
	console.log('[mp] 运行时图标已按小程序规格优化')
}

function syncMpTabbar() {
	/**
	 * 原生 tabBar 图标必须在 static/ 下，HBuilder 才会每次编译拷进产物。
	 * 同时同步到 dist，并强制关闭「过滤无依赖文件」。
	 */
	const names = [
		'home.png',
		'home-active.png',
		'catalog.png',
		'catalog-active.png',
		'me.png',
		'me-active.png'
	]
	const staticTabbar = path.join(root, 'static', 'tabbar')
	const legacyTab = path.join(root, 'static', 'tab')
	const rootTabbar = path.join(root, 'tabbar')
	fs.mkdirSync(staticTabbar, { recursive: true })
	fs.mkdirSync(rootTabbar, { recursive: true })
	for (const name of names) {
		const candidates = [
			path.join(staticTabbar, name),
			path.join(rootTabbar, name),
			path.join(legacyTab, name)
		]
		const from = candidates.find((p) => fs.existsSync(p))
		if (!from) {
			console.log('[mp] missing tabbar icon', name)
			continue
		}
		fs.copyFileSync(from, path.join(staticTabbar, name))
		fs.copyFileSync(from, path.join(rootTabbar, name))
	}

	const pathMap = [
		['static/tabbar/home.png', 'static/tabbar/home-active.png'],
		['static/tabbar/catalog.png', 'static/tabbar/catalog-active.png'],
		['static/tabbar/me.png', 'static/tabbar/me-active.png']
	]

	const distRoots = [
		path.join(root, 'unpackage', 'dist', 'dev', 'mp-weixin'),
		path.join(root, 'unpackage', 'dist', 'build', 'mp-weixin')
	]
	for (const dist of distRoots) {
		if (!fs.existsSync(dist)) continue
		const dest = path.join(dist, 'static', 'tabbar')
		fs.mkdirSync(dest, { recursive: true })
		for (const name of names) {
			const from = path.join(staticTabbar, name)
			if (fs.existsSync(from)) fs.copyFileSync(from, path.join(dest, name))
		}

		const appJsonPath = path.join(dist, 'app.json')
		if (fs.existsSync(appJsonPath)) {
			const app = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'))
			const list = app.tabBar && app.tabBar.list
			if (Array.isArray(list)) {
				list.forEach((item, i) => {
					if (!pathMap[i]) return
					item.iconPath = pathMap[i][0]
					item.selectedIconPath = pathMap[i][1]
				})
				fs.writeFileSync(appJsonPath, JSON.stringify(app, null, 2))
			}
		}

		for (const cfgName of ['project.config.json', 'project.private.config.json']) {
			const cfgPath = path.join(dist, cfgName)
			let cfg = {}
			if (fs.existsSync(cfgPath)) {
				try {
					cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
				} catch (_) {
					cfg = {}
				}
			}
			cfg.setting = cfg.setting || {}
			cfg.setting.ignoreDevUnusedFiles = false
			cfg.setting.ignoreUploadUnusedFiles = false
			cfg.packOptions = cfg.packOptions || {}
			const include = cfg.packOptions.include || []
			if (!include.some((x) => x && x.value === 'static/tabbar')) {
				include.push({ type: 'folder', value: 'static/tabbar' })
			}
			cfg.packOptions.include = include
			fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2))
		}
		console.log('[mp] synced tabbar ->', path.relative(root, dest))
	}
}

function printIconSizes() {
	const dirs = [
		path.join(root, 'tabbar'),
		path.join(root, 'static', 'tab'),
		path.join(root, 'static', 'mengmeng', 'entry'),
		path.join(root, 'static', 'mengmeng', 'medals'),
		path.join(root, 'static', 'mengmeng', 'ip')
	]
	for (const dir of dirs) {
		if (!fs.existsSync(dir)) continue
		const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png'))
		let sum = 0
		for (const f of files) sum += fs.statSync(path.join(dir, f)).size
		console.log(`[mp] ${path.relative(root, dir)}: ${files.length} png, ${mb(sum)}`)
	}
}

function main() {
	const seed = path.join(root, 'constants', 'hanzi_curriculum_seed.json')
	if (!fs.existsSync(seed)) {
		console.error('[mp] 缺少课表，请先 npm run db:build')
		process.exit(1)
	}
	copyFile(seed, path.join(root, 'static', 'curriculum', 'hanzi_curriculum_seed.json'))

	if (process.argv.includes('--icons')) {
		optimizeIcons()
	} else {
		console.log('[mp] 跳过图标优化。需要时：npm run assets:mp:prepare -- --icons 或 npm run assets:icons:optimize')
	}

	syncMpTabbar()

	if (process.argv.includes('--audio')) {
		convertOpusDir(
			path.join(root, 'static', 'pinyin'),
			path.join(root, 'dist-mp-cdn', 'pinyin')
		)
		convertOpusDir(
			path.join(root, 'static', 'voice', 'mengmeng'),
			path.join(root, 'dist-mp-cdn', 'voice', 'mengmeng')
		)
	} else {
		console.log('[mp] 跳过 opus→mp3。需要时：npm run assets:mp:prepare -- --audio')
	}

	printIconSizes()
	const staticBytes = dirSize(path.join(root, 'static'))
	console.log('[mp] static 合计', mb(staticBytes))
	console.log('[mp] 目标：主包 ≤ 2MB，主包+分包 ≤ 20MB')
	console.log('[mp] 请在 manifest / project.config 的 packOptions.ignore 排除 splash、hanzi-writer-data、pinyin、svg、opus')
	console.log('[mp] CDN 根地址填写 config/mp-cdn-config.js 的 MP_CDN_BASE，并配置微信 downloadFile 合法域名')
	if (!process.env.MP_WEIXIN_APPID) {
		console.log('[mp] AppID 仍为空：把微信 AppID 写入 manifest.json → mp-weixin.appid')
	}
}

main()
