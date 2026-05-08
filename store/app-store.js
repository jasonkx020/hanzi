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
