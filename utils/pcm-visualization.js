/**
 * PCM s16le 单声道 → 波形峰値 / 简易频谱（调试页用，无外部依赖）
 */

const DEFAULT_PEAK_POINTS = 240
const DEFAULT_SPECTRUM_BARS = 48
const FFT_SIZE = 256

/** @param {ArrayBuffer|null|undefined} buffer */
export function pcmBufferToInt16(buffer) {
	if (!buffer?.byteLength) return new Int16Array(0)
	const byteLen = buffer.byteLength - (buffer.byteLength % 2)
	if (byteLen < 2) return new Int16Array(0)
	return new Int16Array(buffer.slice(0, byteLen))
}

/**
 * 时域波形：每段取最大振幅，归一化到 0..1
 * @param {ArrayBuffer|Int16Array} pcm
 * @param {number} pointCount
 * @returns {number[]}
 */
export function peaksFromPcm(pcm, pointCount = DEFAULT_PEAK_POINTS) {
	const int16 = pcm instanceof Int16Array ? pcm : pcmBufferToInt16(pcm)
	const n = int16.length
	if (n < 2) return []
	const count = Math.max(8, Math.min(pointCount, n))
	const block = Math.max(1, Math.floor(n / count))
	const peaks = []
	for (let i = 0; i < count; i++) {
		const start = i * block
		const end = Math.min(n, start + block)
		let max = 0
		for (let j = start; j < end; j++) {
			const v = Math.abs(int16[j])
			if (v > max) max = v
		}
		peaks.push(max / 32768)
	}
	return peaks
}

function nextPow2(v) {
	let p = 1
	while (p < v) p <<= 1
	return p
}

/** 原地 radix-2 FFT，re/im 长度均为 2 的幂 */
function fftInPlace(re, im) {
	const n = re.length
	let j = 0
	for (let i = 1; i < n; i++) {
		let bit = n >> 1
		for (; j & bit; bit >>= 1) j ^= bit
		j ^= bit
		if (i < j) {
			let t = re[i]
			re[i] = re[j]
			re[j] = t
			t = im[i]
			im[i] = im[j]
			im[j] = t
		}
	}
	for (let len = 2; len <= n; len <<= 1) {
		const ang = (-2 * Math.PI) / len
		const wlenRe = Math.cos(ang)
		const wlenIm = Math.sin(ang)
		for (let i = 0; i < n; i += len) {
			let wRe = 1
			let wIm = 0
			for (let k = 0; k < len / 2; k++) {
				const uRe = re[i + k]
				const uIm = im[i + k]
				const vRe = re[i + k + len / 2] * wRe - im[i + k + len / 2] * wIm
				const vIm = re[i + k + len / 2] * wIm + im[i + k + len / 2] * wRe
				re[i + k] = uRe + vRe
				im[i + k] = uIm + vIm
				re[i + k + len / 2] = uRe - vRe
				im[i + k + len / 2] = uIm - vIm
				const nwRe = wRe * wlenRe - wIm * wlenIm
				wIm = wRe * wlenIm + wIm * wlenRe
				wRe = nwRe
			}
		}
	}
}

/**
 * 频谱柱状：对 PCM 中段做 Hanning + FFT，合并为 barCount 段能量（0..1）
 * @param {ArrayBuffer|Int16Array} pcm
 * @param {number} barCount
 * @returns {number[]}
 */
export function spectrumBarsFromPcm(pcm, barCount = DEFAULT_SPECTRUM_BARS) {
	const int16 = pcm instanceof Int16Array ? pcm : pcmBufferToInt16(pcm)
	const n = int16.length
	const bars = new Array(barCount).fill(0)
	if (n < 64) return bars

	const size = nextPow2(Math.min(FFT_SIZE, n))
	const half = size / 2
	const start = Math.max(0, Math.floor((n - size) / 2))
	const re = new Float32Array(size)
	const im = new Float32Array(size)
	for (let i = 0; i < size; i++) {
		const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / Math.max(1, size - 1)))
		re[i] = (int16[start + i] / 32768) * w
		im[i] = 0
	}
	fftInPlace(re, im)

	const mags = []
	for (let k = 1; k < half; k++) {
		mags.push(Math.sqrt(re[k] * re[k] + im[k] * im[k]))
	}
	if (!mags.length) return bars

	const perBar = Math.max(1, Math.floor(mags.length / barCount))
	let maxMag = 1e-9
	const raw = []
	for (let b = 0; b < barCount; b++) {
		const from = b * perBar
		const to = Math.min(mags.length, from + perBar)
		let sum = 0
		for (let i = from; i < to; i++) sum += mags[i]
		const avg = sum / Math.max(1, to - from)
		raw.push(avg)
		if (avg > maxMag) maxMag = avg
	}
	for (let b = 0; b < barCount; b++) {
		const v = raw[b] / maxMag
		bars[b] = Math.min(1, Math.pow(v, 0.65))
	}
	return bars
}

/** 从峰値序列估算是否「几乎静音」 */
export function isPcmPeaksMostlySilent(peaks, threshold = 0.008) {
	if (!peaks?.length) return true
	let sum = 0
	for (const p of peaks) sum += p
	return sum / peaks.length < threshold
}
