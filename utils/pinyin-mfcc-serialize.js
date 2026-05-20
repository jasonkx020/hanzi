/** MFCC 指纹 JSON 序列化（无 Meyda，各端可引用） */

export function serializeMfccEntry(feature) {
	return {
		durationMs: Math.round(feature.durationMs || 0),
		voicedRatio: +Number(feature.voicedRatio || 0).toFixed(4),
		frames: (feature.frames || []).map((row) =>
			row.map((v) => +Number(v).toFixed(3))
		)
	}
}

export function deserializeMfccEntry(entry) {
	if (!entry?.frames?.length) return null
	return {
		frames: entry.frames.map((row) => row.map((v) => Number(v))),
		durationMs: Number(entry.durationMs) || 0,
		voicedRatio: Number(entry.voicedRatio) || 0
	}
}
