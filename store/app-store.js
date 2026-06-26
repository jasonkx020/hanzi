/**
 * @file app-store.js
 * @module store
 * @description 状态存储源文件：app-store.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
const appState = {
	appName: '萌萌识字',
	theme: 'warm',
	ready: false
}

export function getAppState() {
	return appState
}

export function setAppReady(ready = true) {
	appState.ready = !!ready
}
