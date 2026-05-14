<template>
	<view class="page">
		<view v-if="phase === 'follow'" class="follow-body">
			<text class="lesson-line">{{ lessonTitle }}</text>
			<text class="step-line">第 {{ idx + 1 }} / {{ rows.length }} 个字 · 跟着读一读</text>

			<view class="dots" aria-hidden="true">
				<text
					v-for="n in rows.length"
					:key="n"
					class="dot"
					:class="n - 1 <= idx ? 'dot-on' : 'dot-off'"
				>●</text>
			</view>

			<view class="char-card">
				<text class="huge-char">{{ currentChar }}</text>
				<view class="py-row" @click.stop="onTapSpeakPinyin">
					<text class="py-hint">拼音 · 点读</text>
					<pinyin-four-lines-row v-if="pyTokens.length" :syllables="pyTokens" size="lg" />
					<text v-else class="py-fallback">暂无拼音</text>
				</view>
			</view>

			<button class="btn-hear" type="default" @click="repeatSpeak">听这个字</button>
			<text class="soft-tip">先听示范，再试着说一说；不会就再点「听这个字」</text>

			<view class="btn-row">
				<button class="btn-side" type="default" :disabled="idx <= 0" @click="onPrev">上一个</button>
				<button class="btn-side btn-main" type="default" @click="onNext">
					{{ idx >= rows.length - 1 ? '完成' : '下一个' }}
				</button>
			</view>

			<button class="btn-back" type="default" @click="goBack">回字卡</button>
		</view>

		<view v-else class="done-body">
			<text class="done-emoji">🎉</text>
			<text class="done-title">跟读完成</text>
			<text class="done-sub">按课表顺序读完啦，可以多来几遍更熟哦</text>
			<button class="btn-restart" type="default" @click="restartFromHead">从头再来</button>
			<button class="btn-back-primary" type="primary" @click="goBack">回字卡</button>
		</view>
	</view>
</template>

<script>
import { takeLessonFollowTransfer } from '@/utils/lesson-mode-session.js'
import { playOpusForDisplayPinyin } from '@/utils/play-pinyin-local-audio.js'
import { logHanziSpeak } from '@/utils/hanzi-speak-debug-log.js'
import { playLessonTargetReading } from '@/utils/lesson-mode-play-target.js'
import PinyinFourLinesRow from '@/components/pinyin-four-lines-row.vue'
import { splitPinyinDisplayTokens } from '@/utils/pinyin-display-tokens.js'

function firstHanzi(text) {
	const s = String(text || '').trim()
	const m = s.match(/[\u4e00-\u9fff]/)
	return m ? m[0] : ''
}

export default {
	components: {
		PinyinFourLinesRow
	},
	data() {
		return {
			phase: 'follow',
			lessonTitle: '跟读',
			rows: [],
			idx: 0,
			autoSpeakTimer: null
		}
	},
	computed: {
		currentRow() {
			return this.rows[this.idx] || {}
		},
		currentChar() {
			return firstHanzi(this.currentRow.hanzi)
		},
		pyTokens() {
			let s = String(this.currentRow.pinyin || '').replace(/\s+/g, ' ').trim()
			if (!s || s === '-') return []
			const tokens = splitPinyinDisplayTokens(s)
			if (tokens.length) return tokens
			return s ? [s] : []
		}
	},
	onUnload() {
		this.clearAutoSpeak()
	},
	onLoad() {
		const payload = takeLessonFollowTransfer()
		if (!payload || !Array.isArray(payload.rows) || !payload.rows.length) {
			uni.showToast({ title: '数据已失效，请从课次字卡重新进入', icon: 'none' })
			setTimeout(() => uni.navigateBack(), 1600)
			return
		}
		const title = String(payload.lessonTitle || '').trim()
		if (title) {
			this.lessonTitle = title
			const nav = title.length > 16 ? `${title.slice(0, 15)}…` : title
			uni.setNavigationBarTitle({ title: `${nav} · 跟读` })
		}
		this.rows = payload.rows
			.map((r) => ({
				hanzi: String(r.hanzi || '').trim(),
				pinyin: r.pinyin != null ? String(r.pinyin) : ''
			}))
			.filter((r) => firstHanzi(r.hanzi))
		if (!this.rows.length) {
			uni.showToast({ title: '本课无生字可读', icon: 'none' })
			setTimeout(() => uni.navigateBack(), 1600)
			return
		}
		this.idx = 0
		this.phase = 'follow'
		this.scheduleAutoSpeak(true)
	},
	methods: {
		clearAutoSpeak() {
			if (this.autoSpeakTimer != null) {
				clearTimeout(this.autoSpeakTimer)
				this.autoSpeakTimer = null
			}
		},
		scheduleAutoSpeak(isFirst) {
			this.clearAutoSpeak()
			const delay = isFirst ? 350 : 220
			this.autoSpeakTimer = setTimeout(() => {
				this.autoSpeakTimer = null
				if (this.phase === 'follow' && this.currentChar) {
					const py = this.currentRow.pinyin
					playLessonTargetReading(this.currentChar, py)
				}
			}, delay)
		},
		repeatSpeak() {
			if (this.phase !== 'follow' || !this.currentChar) return
			this.clearAutoSpeak()
			playLessonTargetReading(this.currentChar, this.currentRow.pinyin)
		},
		async onTapSpeakPinyin() {
			const py = String(this.currentRow.pinyin || '').trim()
			logHanziSpeak('lesson-follow.py_row.tap', { py, hanzi: this.currentRow.hanzi })
			if (!py || py === '-') {
				uni.showToast({ title: '暂无拼音', icon: 'none' })
				return
			}
			await playOpusForDisplayPinyin(py)
			logHanziSpeak('lesson-follow.py_row.play_done', { py })
		},
		onPrev() {
			if (this.idx <= 0) return
			this.idx--
			this.scheduleAutoSpeak(false)
		},
		onNext() {
			if (this.idx >= this.rows.length - 1) {
				this.clearAutoSpeak()
				this.phase = 'done'
				return
			}
			this.idx++
			this.scheduleAutoSpeak(false)
		},
		restartFromHead() {
			this.phase = 'follow'
			this.idx = 0
			this.scheduleAutoSpeak(true)
		},
		goBack() {
			this.clearAutoSpeak()
			uni.navigateBack()
		}
	}
}
</script>

<style scoped>
.page {
	min-height: 100vh;
	padding: 28rpx 24rpx 48rpx;
	background: #fff8e7;
	box-sizing: border-box;
}

.follow-body {
	display: flex;
	flex-direction: column;
	align-items: stretch;
}

.lesson-line {
	display: block;
	font-size: 26rpx;
	color: #8a8279;
	text-align: center;
	margin-bottom: 8rpx;
}

.step-line {
	display: block;
	font-size: 28rpx;
	font-weight: 600;
	color: #5d4037;
	text-align: center;
	margin-bottom: 16rpx;
}

.dots {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	justify-content: center;
	margin-bottom: 24rpx;
}

.dot {
	font-size: 18rpx;
	margin: 0 6rpx;
	line-height: 1;
}

.dot-on {
	color: #ff9800;
}

.dot-off {
	color: #e0e0e0;
}

.char-card {
	background: #fff;
	border-radius: 20rpx;
	border: 2rpx solid #f0e6d4;
	padding: 36rpx 24rpx 28rpx;
	margin-bottom: 28rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.huge-char {
	display: block;
	text-align: center;
	font-size: 160rpx;
	font-weight: 700;
	color: #4e342e;
	line-height: 1.15;
	margin-bottom: 20rpx;
}

.py-row {
	padding-top: 12rpx;
	border-top: 1rpx solid #f5f0e6;
}

.py-hint {
	display: block;
	font-size: 22rpx;
	color: #9e9e9e;
	margin-bottom: 10rpx;
}

.py-fallback {
	display: block;
	font-size: 26rpx;
	color: #bdbdbd;
	text-align: center;
	padding: 16rpx 0;
}

.btn-hear {
	margin-bottom: 16rpx;
	background: #ffe082;
	color: #5d4037;
	font-size: 30rpx;
	border-radius: 16rpx;
	border: none;
}

.soft-tip {
	display: block;
	font-size: 22rpx;
	color: #9e9e9e;
	text-align: center;
	line-height: 1.45;
	margin-bottom: 32rpx;
	padding: 0 8rpx;
}

.btn-row {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	margin-bottom: 24rpx;
}

.btn-side {
	flex: 1;
	margin: 0 10rpx;
	font-size: 28rpx;
	border-radius: 16rpx;
	background: #fff;
	border: 2rpx solid #e0d5c5;
	color: #5d4037;
}

.btn-main {
	background: #c8e6c9;
	border-color: #a5d6a7;
	font-weight: 600;
}

.btn-back {
	font-size: 26rpx;
	color: #8a8279;
	background: transparent;
	border: none;
}

.done-body {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding-top: 72rpx;
}

.done-emoji {
	font-size: 80rpx;
	margin-bottom: 16rpx;
}

.done-title {
	font-size: 40rpx;
	font-weight: 700;
	color: #5d4037;
	margin-bottom: 16rpx;
}

.done-sub {
	font-size: 26rpx;
	color: #8a8279;
	text-align: center;
	line-height: 1.5;
	margin-bottom: 40rpx;
	padding: 0 32rpx;
}

.btn-restart {
	width: 70%;
	max-width: 420rpx;
	margin-bottom: 20rpx;
	border-radius: 16rpx;
	background: #fff;
	border: 2rpx solid #e0d5c5;
	color: #5d4037;
}

.btn-back-primary {
	width: 70%;
	max-width: 420rpx;
	border-radius: 16rpx;
}
</style>
