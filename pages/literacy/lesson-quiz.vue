<template>
	<view class="page">
		<view v-if="phase === 'quiz'" class="quiz-body">
			<text class="sub">{{ lessonTitle }}</text>
			<text class="progress-txt">第 {{ qIndex + 1 }} / {{ totalQ }} 题</text>

			<button class="hear-btn" type="default" @click="onHearAgain">听一听这个字</button>

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

			<text class="hint-txt">点你认为听到的那个字</text>
		</view>

		<view v-else class="done-body">
			<text class="done-emoji">🌟</text>
			<text class="done-title">小测完成</text>
			<text class="done-score">答对 {{ score }} / {{ totalQ }} 题</text>
			<text v-if="quizJustPassed" class="pass-line">达标啦，已记入本课进度</text>
			<text v-else class="pass-line pass-line-muted">达标线：答对 ≥ {{ passNeed }} 题（约八成），再练一次吧</text>
			<text class="done-msg">{{ doneEncourage }}</text>
			<button class="back-btn" type="primary" @click="goBackLesson">回字卡</button>
		</view>
	</view>
</template>

<script>
import { takeLessonQuizTransfer } from '@/utils/lesson-mode-session.js'
import { addCharWrongCount } from '@/utils/user-progress-storage.js'
import { getCurriculumPrefs } from '@/utils/curriculum-storage.js'
import { buildStoredLessonKey, recordLessonQuizAttempt } from '@/utils/user-lesson-progress-storage.js'
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
			phase: 'quiz',
			lessonTitle: '本课小测',
			/** 人教课次下标；非人教为 null */
			rjLessonIdx: null,
			pool: [],
			targets: [],
			qIndex: 0,
			options: [],
			attempt: 1,
			score: 0,
			totalQ: 0,
			targetHanzi: '',
			/** 与课次字卡一致的展示拼音，多音字播读以字表为准 */
			targetPinyin: '',
			optDisabled: false,
			/** 本轮结算是否达到课级「小测通过」线 */
			quizJustPassed: false,
			passNeed: 0
		}
	},
	computed: {
		optionColClass() {
			return this.options.length >= 3 ? 'opts-3' : 'opts-2'
		},
		doneEncourage() {
			if (!this.totalQ) return '继续加油！'
			const r = this.score / this.totalQ
			if (r >= 1) return '全对，太棒了！'
			if (r >= 0.6) return '很不错，再认几遍会更稳哦。'
			return '没关系，多听听多读读就会了。'
		}
	},
	onLoad() {
		const payload = takeLessonQuizTransfer()
		if (!payload || !Array.isArray(payload.rows) || !payload.rows.length) {
			uni.showToast({ title: '题目数据已失效，请从课次字卡重新进入', icon: 'none' })
			setTimeout(() => uni.navigateBack(), 1600)
			return
		}
		const title = String(payload.lessonTitle || '').trim()
		if (title) {
			this.lessonTitle = title
			const nav = title.length > 16 ? `${title.slice(0, 15)}…` : title
			uni.setNavigationBarTitle({ title: nav })
		}
		const rj = payload.rjLessonIdx
		if (rj != null && rj !== '') {
			const n = Number(rj)
			this.rjLessonIdx = Number.isFinite(n) && n >= 0 ? n : null
		} else {
			this.rjLessonIdx = null
		}
		const pool = uniquePoolRows(payload.rows)
		if (pool.length < 2) {
			uni.showToast({ title: '本课至少需要 2 个不同生字才能小测', icon: 'none' })
			setTimeout(() => uni.navigateBack(), 1800)
			return
		}
		this.pool = pool
		const qCount = Math.min(5, pool.length)
		this.targets = shuffle(pool).slice(0, qCount)
		this.totalQ = this.targets.length
		this.qIndex = 0
		this.score = 0
		this.phase = 'quiz'
		this.loadQuestion(0)
	},
	methods: {
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
		},
		async onHearAgain() {
			if (this.phase !== 'quiz' || !this.targetHanzi) return
			await playLessonTargetReading(this.targetHanzi, this.targetPinyin)
		},
		onPick(c) {
			if (this.phase !== 'quiz' || this.optDisabled) return
			const pick = firstHanzi(c)
			if (pick === this.targetHanzi) {
				this.score++
				this.advanceQuestion()
				return
			}
			if (this.attempt === 1) {
				this.attempt = 2
				uni.showToast({ title: '再想一想', icon: 'none' })
				return
			}
			addCharWrongCount(this.targetHanzi, 1, this.curriculumDims())
			uni.showToast({ title: `答案是「${this.targetHanzi}」`, icon: 'none' })
			this.optDisabled = true
			setTimeout(() => {
				this.optDisabled = false
				this.advanceQuestion()
			}, 900)
		},
		advanceQuestion() {
			this.qIndex++
			if (this.qIndex >= this.totalQ) {
				this.finalizeQuizSession()
				this.phase = 'done'
				return
			}
			this.loadQuestion(this.qIndex)
		},
		finalizeQuizSession() {
			const totalQ = this.totalQ
			const score = this.score
			const need = totalQ > 0 ? Math.ceil(0.8 * totalQ) : 0
			this.passNeed = need
			const passed = totalQ > 0 && score >= need
			this.quizJustPassed = passed
			const lessonKey = buildStoredLessonKey(this.rjLessonIdx, this.lessonTitle)
			const d = this.curriculumDims()
			recordLessonQuizAttempt({
				lesson_key: lessonKey,
				textbook_version_id: d.textbook_version_id,
				grade: d.grade,
				semester: d.semester,
				score,
				totalQ,
				passed
			})
		},
		goBackLesson() {
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

.quiz-body {
	display: flex;
	flex-direction: column;
	align-items: stretch;
}

.sub {
	display: block;
	font-size: 26rpx;
	color: #8a8279;
	margin-bottom: 12rpx;
	text-align: center;
}

.progress-txt {
	display: block;
	font-size: 28rpx;
	font-weight: 600;
	color: #5d4037;
	margin-bottom: 32rpx;
	text-align: center;
}

.hear-btn {
	margin-bottom: 40rpx;
	background: #ffe082;
	color: #5d4037;
	font-size: 30rpx;
	border-radius: 16rpx;
	border: none;
}

.opts {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	justify-content: center;
	margin-bottom: 24rpx;
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
	border: 2rpx solid #e0d5c5;
	box-sizing: border-box;
}

.opt-btn:active {
	opacity: 0.9;
}

.opt-char {
	font-size: 72rpx;
	font-weight: 700;
	color: #4e342e;
}

.hint-txt {
	display: block;
	text-align: center;
	font-size: 24rpx;
	color: #9e9e9e;
	margin-top: 16rpx;
}

.done-body {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding-top: 80rpx;
}

.done-emoji {
	font-size: 80rpx;
	margin-bottom: 16rpx;
}

.done-title {
	font-size: 40rpx;
	font-weight: 700;
	color: #5d4037;
	margin-bottom: 24rpx;
}

.done-score {
	font-size: 34rpx;
	color: #6d4c41;
	margin-bottom: 20rpx;
}

.pass-line {
	display: block;
	font-size: 26rpx;
	color: #558b2f;
	font-weight: 600;
	text-align: center;
	margin-bottom: 16rpx;
	padding: 0 20rpx;
}

.pass-line-muted {
	color: #8a8279;
	font-weight: 500;
}

.done-msg {
	font-size: 28rpx;
	color: #8a8279;
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
