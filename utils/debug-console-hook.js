/**
 * @file debug-console-hook.js
 * @module utils
 * @description 基础设施工具：debug-console-hook.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
/**
 * 拦截 console，环形缓冲最近若干条，供「调试日志」页查看（真机不便连电脑时用的简易控制台）。
 * 部分小程序/App 运行时 console 方法不可改写，需配合 appendDebugLog 或直接读 diagnostics。
 */

const MAX_ENTRIES = 1000

/** @type {{ ts: string, level: string, text: string }[]} */
const buffer = []

let installed = false
/** @type {string[]} */
let patchedLevels = []

/** @type {Record<string, Function>} */
const originals = {}

function padTime(d) {
	const h = String(d.getHours()).padStart(2, '0')
	const m = String(d.getMinutes()).padStart(2, '0')
	const s = String(d.getSeconds()).padStart(2, '0')
	const ms = String(d.getMilliseconds()).padStart(3, '0')
	return `${h}:${m}:${s}.${ms}`
}

function stringifyArg(a) {
	if (a === undefined) return 'undefined'
	if (a === null) return 'null'
	const t = typeof a
	if (t === 'string') return a
	if (t === 'number' || t === 'boolean' || t === 'bigint') return String(a)
	if (t === 'symbol') return String(a)
	if (t === 'function') return '[Function]'
	if (a instanceof Error) {
		const st = a.stack || ''
		return st ? `${a.message}\n${st}` : String(a.message || a)
	}
	try {
		return JSON.stringify(a)
	} catch (_) {
		try {
			return Object.prototype.toString.call(a)
		} catch (__) {
			return String(a)
		}
	}
}

function formatArgs(args) {
	try {
		return Array.from(args)
			.map(stringifyArg)
			.join(' ')
	} catch (_) {
		return '[format error]'
	}
}

export function pushDebugConsoleEntry(level, argsList) {
	try {
		const text = formatArgs(argsList)
		buffer.push({
			ts: padTime(new Date()),
			level: String(level || 'log'),
			text
		})
		while (buffer.length > MAX_ENTRIES) buffer.shift()
	} catch (_) {}
}

/**
 * 不经过改写后的 console：先写入缓冲，再尽量调用原生 console（避免递归）。
 */
export function appendDebugLog(level, ...args) {
	pushDebugConsoleEntry(level, args)
	try {
		const lv = String(level || 'log')
		const orig = originals[lv] || originals.log || originals.info
		if (typeof orig === 'function') {
			orig(...args)
			return
		}
		const c =
			(typeof globalThis !== 'undefined' && globalThis.console) ||
			(typeof console !== 'undefined' && console)
		const fn = c && typeof c[lv] === 'function' ? c[lv] : c && typeof c.log === 'function' ? c.log : null
		if (typeof fn === 'function') fn.apply(c, args)
	} catch (_) {}
}

function patchOneLevel(consoleRef, level) {
	const orig = consoleRef[level]
	if (typeof orig !== 'function') return false
	const bound = orig.bind(consoleRef)
	function patched(...args) {
		pushDebugConsoleEntry(level, args)
		try {
			bound(...args)
		} catch (_) {}
	}
	try {
		consoleRef[level] = patched
		originals[level] = bound
		return true
	} catch (_) {
		try {
			Object.defineProperty(consoleRef, level, {
				configurable: true,
				enumerable: true,
				writable: true,
				value: patched
			})
			originals[level] = bound
			return true
		} catch (__) {
			return false
		}
	}
}

/**
 * 在 App 启动尽早调用一次；重复调用无效。
 */
export function installDebugConsoleHook() {
	if (installed) return
	installed = true
	patchedLevels = []

	const refs = []
	try {
		if (typeof globalThis !== 'undefined' && globalThis.console) refs.push(globalThis.console)
	} catch (_) {}
	try {
		if (typeof console !== 'undefined' && console && refs.indexOf(console) === -1) refs.push(console)
	} catch (_) {}

	const levels = ['log', 'info', 'warn', 'error', 'debug']
	for (const level of levels) {
		let ok = false
		for (const ref of refs) {
			if (patchOneLevel(ref, level)) {
				ok = true
				break
			}
		}
		if (ok) patchedLevels.push(level)
	}

	appendDebugLog(
		'info',
		`[debug-console] hook 已装载 · 成功替换: ${patchedLevels.length ? patchedLevels.join(',') : '无（本端 console 可能不可改写，但仍可用 appendDebugLog / 下方自检）'}`
	)
}

export function getDebugConsoleLogs() {
	return buffer.slice()
}

export function clearDebugConsoleLogs() {
	buffer.length = 0
}

export function getDebugConsoleBufferSize() {
	return buffer.length
}

export function getDebugHookDiagnostics() {
	return {
		installed,
		patchedLevels: patchedLevels.slice(),
		bufferSize: buffer.length
	}
}
