<template>
	<view class="page">
		<view v-if="phase === 'run'" class="body">
			<text class="tag">小耳朵找字</text>
			<text class="sub">{{ lessonTitle }}</text>
			<text class="progress-txt">第 {{ qIndex + 1 }} / {{ totalQ }} 题</text>

			<button class="hear-btn" type="default" @click="onHearAgain">再听一遍</button>

			<view class="opts" :class="optionColClass">
				<button
					v-for="(c, i) in options"
					:key="`${qIndex}-${i}-${c}`"
					class="opt-btn"
					type="default"
					:disabled="optDisabled"
					@click="onPick(c)"
				>
					<text class="opt-char">{{ c }}</text>
				</button>
			</view>

			<text class="hint-txt">先听一听，再点你听到的那个字</text>
			<button class="ghost-back" type="default" @click="goBackLesson">回字卡</button>
		</view>

		<view v-else class="done-body">
			<text class="done-emoji">👂</text>
			<text class="done-title">练习完成</text>
			<text class="done-score">点对 {{ score }} / {{ totalQ }} 题</text>
			<text class="done-msg">{{ doneEncourage }}</text>
			<button class="back-btn" type="primary" @click="goBackLesson">回字卡</button>
		</view>
	</view>
</template>

<script>
import { takeLessonDictationTransfer } from '@/utils/lesson-mode-session.js'
import { addCharWrongCount } from '@/utils/user-progress-storage.js'
import { getCurriculumPrefs } from '@/utils/curriculum-storage.js'
import { playLessonTargetReading } from '@/utils/lesson-mode-play-target.js'

function shuffle(arr) {
	const a = (arr || []).slice()
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[a[i], a[j]] = [a[j], a[i]]
	}
	return a
}

function firstHanzi(text) {
	const s = String(text || '').trim()
	const m = s.match(/[\u4e00-\u9fff]/)
	return m ? m[0] : ''
}

function uniquePoolRows(rows) {
	const seen = new Set()
	const out = []
	for (const r of rows || []) {
		const h = firstHanzi(r && r.hanzi)
		if (!h || seen.has(h)) continue
		seen.add(h)
		out.push({
			hanzi: h,
			pinyin: r && r.pinyin != null ? String(r.pinyin) : ''
		})
	}
	return out
}

export default {
	data() {
		return {
			phase: 'run',
			lessonTitle: '',
			pool: [],
			targets: [],
			qIndex: 0,
			options: [],
			attempt: 1,
			score: 0,
			totalQ: 0,
			targetHanzi: '',
			/** 与课次字卡一致的展示拼音（识字表 / pyShow），用于多音字播读 */
			targetPinyin: '',
			optDisabled: false,
			autoHearTimer: null
		}
	},
	computed: {
		optionColClass() {
			return this.options.length >= 3 ? 'opts-3' : 'opts-2'
		},
		doneEncourage() {
			if (!this.totalQ) return '继续加油！'
			const r = this.score / this.totalQ
			if (r >= 1) return '全对啦，小耳朵真灵！'
			if (r >= 0.6) return '很棒，多练几次会更准哦。'
			return '没关系，先跟读几遍再来找字也很好。'
		}
	},
	onUnload() {
		this.clearAutoHear()
	},
	onLoad() {
		const payload = takeLessonDictationTransfer()
		if (!payload || !Array.isArray(payload.rows) || !payload.rows.length) {
			uni.showToast({ title: '题目数据已失效，请从课次字卡重新进入', icon: 'none' })
			setTimeout(() => uni.navigateBack(), 1600)
			return
		}
		const title = String(payload.lessonTitle || '').trim()
		if (title) {
			this.lessonTitle = title
			const nav = title.length > 14 ? `${title.slice(0, 13)}…` : title
			uni.setNavigationBarTitle({ title: `${nav} · 听音找字` })
		} else {
			this.lessonTitle = '本课生字'
			uni.setNavigationBarTitle({ title: '听音找字' })
		}
		const pool = uniquePoolRows(payload.rows)
		if (pool.length < 2) {
			uni.showToast({ title: '本课至少需要 2 个不同生字', icon: 'none' })
			setTimeout(() => uni.navigateBack(), 1800)
			return
		}
		this.pool = pool
		const qCount = Math.min(5, pool.length)
		this.targets = shuffle(pool).slice(0, qCount)
		this.totalQ = this.targets.length
		this.qIndex = 0
		this.score = 0
		this.phase = 'run'
		this.loadQuestion(0)
	},
	methods: {
		clearAutoHear() {
			if (this.autoHearTimer != null) {
				clearTimeout(this.autoHearTimer)
				this.autoHearTimer = null
			}
		},
		scheduleAutoHear() {
			this.clearAutoHear()
			this.autoHearTimer = setTimeout(() => {
				this.autoHearTimer = null
				if (this.phase === 'run' && this.targetHanzi) this.playTargetSound()
			}, 400)
		},
		curriculumDims() {
			const p = getCurriculumPrefs()
			const g = Number(p.grade)
			return {
				textbook_version_id: p.textbook_version_id,
				grade: Number.isFinite(g) && g >= 0 ? g : 1,
				semester: p.semester === '下' ? '下' : '上'
			}
		},
		buildOptions(target) {
			const others = shuffle(this.pool.filter((r) => r.hanzi !== target.hanzi))
			if (this.pool.length >= 3) {
				return shuffle([target.hanzi, others[0].hanzi, others[1].hanzi])
			}
			return shuffle([target.hanzi, others[0].hanzi])
		},
		loadQuestion(idx) {
			const t = this.targets[idx]
			if (!t) {
				this.phase = 'done'
				return
			}
			this.targetHanzi = t.hanzi
			this.targetPinyin = t.pinyin != null ? String(t.pinyin) : ''
			this.options = this.buildOptions(t)
			this.attempt = 1
			this.optDisabled = false
			this.scheduleAutoHear()
		},
		async playTargetSound() {
			if (this.phase !== 'run' || !this.targetHanzi) return
			await playLessonTargetReading(this.targetHanzi, this.targetPinyin)
		},
		onHearAgain() {
			if (this.phase !== 'run' || !this.targetHanzi) return
			this.clearAutoHear()
			this.playTargetSound()
		},
		onPick(c) {
			if (this.phase !== 'run' || this.optDisabled) return
			const pick = firstHanzi(c)
			if (pick === this.targetHanzi) {
				this.score++
				this.clearAutoHear()
				this.advanceQuestion()
				return
			}
			if (this.attempt === 1) {
				this.attempt = 2
				uni.showToast({ title: '再听一遍', icon: 'none' })
				setTimeout(() => {
					if (this.phase === 'run' && this.targetHanzi) this.playTargetSound()
				}, 280)
				return
			}
			addCharWrongCount(this.targetHanzi, 1, this.curriculumDims())
			uni.showToast({ title: `是「${this.targetHanzi}」`, icon: 'none' })
			this.optDisabled = true
			this.clearAutoHear()
			setTimeout(() => {
				this.optDisabled = false
				this.advanceQuestion()
			}, 900)
		},
		advanceQuestion() {
			this.qIndex++
			if (this.qIndex >= this.totalQ) {
				this.clearAutoHear()
				this.phase = 'done'
				return
			}
			this.loadQuestion(this.qIndex)
		},
		goBackLesson() {
			this.clearAutoHear()
			uni.navigateBack()
		}
	}
}
</script>

<style scoped>
.page {
	min-height: 100vh;
	padding: 28rpx 24rpx 48rpx;
	background: #edf5fa;
	box-sizing: border-box;
}

.body {
	display: flex;
	flex-direction: column;
	align-items: stretch;
}

.tag {
	display: block;
	text-align: center;
	font-size: 30rpx;
	font-weight: 700;
	color: #1565c0;
	margin-bottom: 8rpx;
}

.sub {
	display: block;
	font-size: 24rpx;
	color: #78909c;
	margin-bottom: 10rpx;
	text-align: center;
}

.progress-txt {
	display: block;
	font-size: 28rpx;
	font-weight: 600;
	color: #37474f;
	margin-bottom: 28rpx;
	text-align: center;
}

.hear-btn {
	margin-bottom: 36rpx;
	background: #bbdefb;
	color: #0d47a1;
	font-size: 30rpx;
	border-radius: 16rpx;
	border: 2rpx solid #90caf9;
}

.opts {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	justify-content: center;
	margin-bottom: 20rpx;
}

.opts-3 .opt-btn {
	width: 30%;
	min-width: 160rpx;
}

.opts-2 .opt-btn {
	width: 42%;
	min-width: 200rpx;
}

.opt-btn {
	margin: 12rpx;
	padding: 36rpx 20rpx;
	background: #fff;
	border-radius: 16rpx;
	border: 2rpx solid #cfd8dc;
	box-sizing: border-box;
}

.opt-btn:active {
	opacity: 0.92;
}

.opt-char {
	font-size: 72rpx;
	font-weight: 700;
	color: #263238;
}

.hint-txt {
	display: block;
	text-align: center;
	font-size: 24rpx;
	color: #78909c;
	margin-top: 8rpx;
	margin-bottom: 28rpx;
}

.ghost-back {
	font-size: 26rpx;
	color: #78909c;
	background: transparent;
	border: none;
}

.done-body {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding-top: 80rpx;
}

.done-emoji {
	font-size: 76rpx;
	margin-bottom: 16rpx;
}

.done-title {
	font-size: 40rpx;
	font-weight: 700;
	color: #37474f;
	margin-bottom: 24rpx;
}

.done-score {
	font-size: 34rpx;
	color: #546e7a;
	margin-bottom: 20rpx;
}

.done-msg {
	font-size: 28rpx;
	color: #78909c;
	text-align: center;
	line-height: 1.5;
	margin-bottom: 48rpx;
	padding: 0 24rpx;
}

.back-btn {
	width: 70%;
	max-width: 400rpx;
	border-radius: 16rpx;
}
</style>
