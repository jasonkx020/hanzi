/**

 * 跟读录音进度条：按有效发声时长推进（非墙钟定时）

 */



/**

 * @param {() => { progress: number, effectiveMs: number, speechStarted: boolean }} getProgress

 * @param {(progress: number, effectiveMs: number, speechStarted: boolean) => void} onUpdate

 * @param {() => void} [onComplete] 有效时长达到目标时（双保险，主结束在 service）

 * @param {() => boolean} [isRecording] 录音已结束时触发 onComplete（超时停录等）

 * @returns {() => void} stop

 */

export function startFollowReadEffectiveProgressTicker(getProgress, onUpdate, onComplete, isRecording) {

	let timer = null

	let stopped = false

	let completed = false

	let sawRecording = false



	const tick = () => {

		if (stopped) return

		let progress = 0

		let effectiveMs = 0

		let speechStarted = false

		let targetMs = 0
		let wallAssist = false

		try {

			const s = getProgress?.() || {}

			progress = Number(s.progress) || 0

			effectiveMs = Number(s.effectiveMs) || 0

			speechStarted = !!s.speechStarted

			targetMs = Number(s.targetMs) || 0
			wallAssist = !!s.wallAssist

		} catch (_) {}

		try {

			onUpdate(progress, effectiveMs, speechStarted)

		} catch (_) {}

		if (typeof isRecording === 'function') {

			if (isRecording()) sawRecording = true

			else if (sawRecording) {

				if (!completed) {

					completed = true

					try {

						onComplete?.()

					} catch (_) {}

				}

				return

			}

		}

		if (
			!wallAssist &&
			speechStarted &&
			targetMs > 0 &&
			effectiveMs >= targetMs
		) {

			if (!completed) {

				completed = true

				try {

					onComplete?.()

				} catch (_) {}

			}

			return

		}

		timer = setTimeout(tick, 40)

	}



	tick()



	return () => {

		stopped = true

		if (timer != null) {

			clearTimeout(timer)

			timer = null

		}

	}

}



/**

 * @deprecated 墙钟进度；跟读已改用 startFollowReadEffectiveProgressTicker

 */

export function startFollowReadRecordProgressTicker(durationMs, onUpdate, onComplete) {

	const total = Math.max(300, Number(durationMs) || 1000)

	const start = Date.now()

	let timer = null

	let stopped = false

	let completed = false



	const tick = () => {

		if (stopped) return

		const elapsed = Date.now() - start

		const progress = Math.min(100, (elapsed / total) * 100)

		try {

			onUpdate(progress, elapsed, true)

		} catch (_) {}

		if (progress >= 100) {

			if (!completed) {

				completed = true

				try {

					onComplete?.()

				} catch (_) {}

			}

			return

		}

		timer = setTimeout(tick, 40)

	}



	tick()



	return () => {

		stopped = true

		if (timer != null) {

			clearTimeout(timer)

			timer = null

		}

		try {

			onUpdate(0, 0, false)

		} catch (_) {}

	}

}


