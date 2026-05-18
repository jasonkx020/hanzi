<template>
	<meng-sub-page
		:title="lessonTitle || '本课小测'"
		subtitle="听音认字 · 看字选音"
		:full-height="true"
		:padded="false"
		:overlap-body="false"
	>
		<view v-if="phase === 'quiz'" class="run-shell">
			<view class="top-bar">
				<image class="top-logo" src="/static/mengmeng/logo-icon.png" mode="aspectFit" />
				<view class="top-meta">
					<text class="top-progress">小测 {{ qIndex + 1 }}/{{ totalQ }}</text>
					<text class="top-lesson">{{ lessonTitle }}</text>
				</view>
				<view
					v-if="qType === 'hear_pick'"
					class="top-hear"
					@click="onHearAgain"
				>
					<text class="top-hear-icon">🔊</text>
					<text class="top-hear-txt">再听</text>
				</view>
				<view v-else class="top-hear top-hear--muted">
					<text class="top-hear-txt">看字</text>
				</view>
			</view>

			<view class="chip-row">
				<text class="chip">本课 {{ charCount }} 字</text>
				<text class="chip chip--accent">{{ totalQ }} 题全覆盖</text>
			</view>

			<scroll-view
				v-if="totalQ > 1"
				class="dots-scroll"
				scroll-x
				:show-scrollbar="false"
				:scroll-into-view="dotScrollId"
				scroll-with-animation
			>
				<view class="dots-row">
					<view
						v-for="(_, i) in totalQ"
						:id="`quiz-dot-${i}`"
						:key="i"
						class="dot"
						:class="{
							'dot--done': i < qIndex,
							'dot--current': i === qIndex,
							'dot--wrong': wrongAt[i]
						}"
					/>
				</view>
			</scroll-view>

			<view class="quiz-card">
				<text class="q-type-label">{{ qTypeLabel }}</text>

				<view v-if="qType === 'hear_pick'" class="hear-prompt">
					<view class="hear-ring" @click="onHearAgain">
						<text class="hear-ring-icon">🔊</text>
					</view>
					<text class="hear-hint">听一听，选出听到的字</text>
				</view>

				<view v-else class="see-char-prompt">
					<text class="see-char">{{ targetHanzi }}</text>
					<text class="see-hint">选出这个字的读音</text>
				</view>

				<view
					v-if="qType === 'hear_pick'"
					class="opts opts-hear"
					:class="optionColClass"
				>
					<view
						v-for="(c, i) in options"
						:key="`h-${qIndex}-${i}-${c}`"
						class="opt-cell-wrap"
					>
						<view
							class="opt-square"
							:class="hanziSquareClass(c)"
							@click="onPickHanzi(c)"
						>
							<text class="opt-char">{{ c }}</text>
						</view>
						<text
							v-if="hanziOptionMark(c)"
							class="opt-mark"
							:class="'opt-mark--' + hanziOptionMark(c)"
						>{{ hanziOptionMark(c) === 'ok' ? '✓' : '✗' }}</text>
						<view v-else class="opt-mark-slot" />
					</view>
				</view>

				<view v-else class="opts opts-py">
					<view
						v-for="(py, i) in pyOptions"
						:key="`p-${qIndex}-${i}-${py}`"
						class="opt-tile opt-tile--py"
						:class="optTileClass(py, true)"
						@click="onPickPinyin(py)"
					>
						<text class="opt-py">{{ py }}</text>
					</view>
				</view>

				<text
					v-if="feedbackText && (qType !== 'hear_pick' || !hanziReveal)"
					class="feedback-line"
					:class="qType === 'hear_pick' ? 'feedback-line--hint' : ''"
				>{{ feedbackText }}</text>
			</view>
		</view>

		<view v-else class="done-shell">
			<image class="done-logo" src="/static/mengmeng/logo-icon.png" mode="aspectFit" />
			<text class="done-emoji">{{ quizJustPassed ? '🎉' : '💪' }}</text>
			<text class="done-title">小测完成</text>
			<text class="done-score">答对 {{ score }} / {{ totalQ }} 题</text>
			<text class="done-cover">本课 {{ charCount }} 个生字均已测到</text>
			<text v-if="quizJustPassed" class="pass-line">达标啦，已记入本课进度</text>
			<text v-else class="pass-line pass-line--muted">
				达标：答对 ≥ {{ passNeed }} 题（约八成），再练一次吧
			</text>
			<text class="done-msg">{{ doneEncourage }}</text>
			<view class="done-actions">
				<button
					v-if="!quizJustPassed"
					class="back-btn back-btn--ghost"
					type="default"
					@click="restartQuiz"
				>
					再测一遍
				</button>
				<button class="back-btn" type="primary" @click="goBackLesson">回字卡</button>
			</view>
		</view>
	</meng-sub-page>
</template>

<script>
import MengSubPage from '@/components/meng-sub-page.vue'
import { takeLessonQuizTransfer } from '@/utils/lesson-mode-session.js'
import { addCharWrongCount } from '@/utils/user-progress-storage.js'
import { getCurriculumPrefs } from '@/utils/curriculum-storage.js'
import { buildStoredLessonKey, recordLessonQuizAttempt } from '@/utils/user-lesson-progress-storage.js'
import { playLessonTargetReading } from '@/utils/lesson-mode-play-target.js'
import { stopLocalPinyinAudio } from '@/utils/play-pinyin-local-audio.js'
import { spellDisplayString } from '@/utils/cnchar-spell-display.js'
import {
	orderedUniqueRows,
	buildLessonQuizPlan,
	buildHanziOptions,
	buildPinyinOptions,
	calcQuizPassNeed,
	firstHanzi,
	normDisplayPinyin
} from '@/utils/lesson-quiz-plan.js'
import { MENG_VOICE, playMengmengVoice } from '@/utils/mengmeng-voice.js'

function filterValidPlan(plan, pool) {
	return (plan || []).filter((item) => {
		if (item.type === 'see_py') {
			return buildPinyinOptions(item.target, pool, spellDisplayString).length >= 3
		}
		return true
	})
}

export default {
	components: { MengSubPage },
	data() {
		return {
			phase: 'quiz',
			lessonTitle: '本课小测',
			rjLessonIdx: null,
			pool: [],
			charCount: 0,
			plan: [],
			qIndex: 0,
			qType: 'hear_pick',
			options: [],
			pyOptions: [],
			attempt: 1,
			score: 0,
			totalQ: 0,
			targetHanzi: '',
			targetPinyin: '',
			optDisabled: false,
			quizJustPassed: false,
			passNeed: 0,
			feedbackText: '',
			/** 听音选字：已揭晓对错标记 */
			hanziReveal: false,
			revealCorrect: false,
			wrongAt: {},
			autoHearTimer: null,
			advanceTimer: null,
			dotScrollId: ''
		}
	},
	computed: {
		optionColClass() {
			return this.options.length >= 3 ? 'opts-3' : 'opts-2'
		},
		qTypeLabel() {
			return this.qType === 'see_py' ? '看字选音' : '听音选字'
		},
		doneEncourage() {
			if (!this.totalQ) return '继续加油！'
			const r = this.score / this.totalQ
			if (r >= 1) return '全对，太棒了！'
			if (r >= 0.8) return '很不错，再认几遍会更稳哦。'
			if (r >= 0.6) return '进步很大，多听多读就会更熟。'
			return '没关系，回字卡跟读几遍再来小测也很好。'
		}
	},
	onUnload() {
		this.clearAutoHear()
		this.clearAdvanceTimer()
		stopLocalPinyinAudio()
	},
	onHide() {
		stopLocalPinyinAudio()
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
			const nav = title.length > 14 ? `${title.slice(0, 13)}…` : title
			uni.setNavigationBarTitle({ title: `${nav} · 小测` })
		} else {
			this.lessonTitle = '本课生字'
			uni.setNavigationBarTitle({ title: '本课小测' })
		}
		const rj = payload.rjLessonIdx
		if (rj != null && rj !== '') {
			const n = Number(rj)
			this.rjLessonIdx = Number.isFinite(n) && n >= 0 ? n : null
		} else {
			this.rjLessonIdx = null
		}
		const pool = orderedUniqueRows(payload.rows)
		if (pool.length < 2) {
			uni.showToast({ title: '本课至少需要 2 个不同生字才能小测', icon: 'none' })
			setTimeout(() => uni.navigateBack(), 1800)
			return
		}
		this.pool = pool
		this.charCount = pool.length
		this.bootstrapQuiz()
	},
	methods: {
		bootstrapQuiz() {
			this.clearAutoHear()
			this.clearAdvanceTimer()
			stopLocalPinyinAudio()
			let plan = buildLessonQuizPlan(this.pool)
			plan = filterValidPlan(plan, this.pool)
			if (!plan.length) {
				uni.showToast({ title: '无法生成题目', icon: 'none' })
				setTimeout(() => uni.navigateBack(), 1600)
				return
			}
			this.plan = plan
			this.totalQ = plan.length
			this.passNeed = calcQuizPassNeed(this.totalQ)
			this.qIndex = 0
			this.score = 0
			this.wrongAt = {}
			this.quizJustPassed = false
			this.phase = 'quiz'
			this.loadQuestion(0)
		},
		restartQuiz() {
			this.bootstrapQuiz()
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
		clearAutoHear() {
			if (this.autoHearTimer != null) {
				clearTimeout(this.autoHearTimer)
				this.autoHearTimer = null
			}
		},
		clearAdvanceTimer() {
			if (this.advanceTimer != null) {
				clearTimeout(this.advanceTimer)
				this.advanceTimer = null
			}
		},
		scheduleAutoHear() {
			this.clearAutoHear()
			if (this.phase !== 'quiz' || this.qType !== 'hear_pick' || !this.targetHanzi) return
			this.autoHearTimer = setTimeout(() => {
				this.autoHearTimer = null
				this.onHearAgain()
			}, 420)
		},
		scrollDotIntoView() {
			const i = this.qIndex
			this.dotScrollId = ''
			this.$nextTick(() => {
				this.dotScrollId = `quiz-dot-${Math.max(0, i - 2)}`
			})
		},
		loadQuestion(idx) {
			const item = this.plan[idx]
			if (!item) {
				this.finalizeQuizSession()
				this.phase = 'done'
				return
			}
			this.qType = item.type
			this.targetHanzi = item.target.hanzi
			this.targetPinyin =
				item.target.pinyin != null ? String(item.target.pinyin) : ''
			this.attempt = 1
			this.optDisabled = false
			this.feedbackText = ''
			this.hanziReveal = false
			this.revealCorrect = false
			this.scrollDotIntoView()

			if (item.type === 'hear_pick') {
				this.options = buildHanziOptions(item.target, this.pool)
				this.pyOptions = []
				this.scheduleAutoHear()
				return
			}
			this.clearAutoHear()
			this.options = []
			this.pyOptions = buildPinyinOptions(
				item.target,
				this.pool,
				spellDisplayString
			)
			if (this.pyOptions.length < 3) {
				this.advanceQuestion()
				return
			}
		},
		hanziOptionMark(c) {
			if (!this.hanziReveal) return ''
			return firstHanzi(c) === this.targetHanzi ? 'ok' : 'bad'
		},
		hanziSquareClass(c) {
			const m = this.hanziOptionMark(c)
			if (m === 'ok') return 'opt-square--ok'
			if (m === 'bad') return 'opt-square--bad'
			return ''
		},
		optTileClass(val, isPy) {
			if (!this.revealCorrect || this.optDisabled === false) return ''
			const correct = normDisplayPinyin(this.targetPinyin, this.targetHanzi)
			if (val === correct) return 'opt-tile--correct'
			return ''
		},
		async onHearAgain() {
			if (this.phase !== 'quiz' || this.qType !== 'hear_pick' || !this.targetHanzi) return
			await playLessonTargetReading(this.targetHanzi, this.targetPinyin)
		},
		onPickHanzi(c) {
			if (
				this.phase !== 'quiz' ||
				this.optDisabled ||
				this.hanziReveal ||
				this.qType !== 'hear_pick'
			) {
				return
			}
			const pick = firstHanzi(c)
			if (pick === this.targetHanzi) {
				this.optDisabled = true
				this.advanceQuestion(true)
				return
			}
			if (this.attempt === 1) {
				this.attempt = 2
				this.feedbackText = '再想一想，可以再听一遍'
				return
			}
			this.revealHanziMarksAfterWrong()
		},
		revealHanziMarksAfterWrong() {
			this.hanziReveal = true
			this.optDisabled = true
			this.feedbackText = ''
			addCharWrongCount(this.targetHanzi, 1, this.curriculumDims())
			this.wrongAt = { ...this.wrongAt, [this.qIndex]: true }
			this.scheduleAdvance(false, 3000)
		},
		onPickPinyin(py) {
			if (this.phase !== 'quiz' || this.optDisabled || this.qType !== 'see_py') return
			const correct = normDisplayPinyin(this.targetPinyin, this.targetHanzi)
			if (py === correct) {
				this.feedbackText = '读音对了！'
				this.optDisabled = true
				this.scheduleAdvance(true)
				return
			}
			if (this.attempt === 1) {
				this.attempt = 2
				this.feedbackText = '再想想这个字的读音'
				return
			}
			this.markWrongAndReveal()
		},
		markWrongAndReveal() {
			addCharWrongCount(this.targetHanzi, 1, this.curriculumDims())
			this.wrongAt = { ...this.wrongAt, [this.qIndex]: true }
			this.optDisabled = true
			if (this.qType === 'see_py') {
				this.revealCorrect = true
				const py = normDisplayPinyin(this.targetPinyin, this.targetHanzi)
				this.feedbackText = `正确读音：${py || this.targetPinyin}`
				this.scheduleAdvance(false, 1100)
			}
		},
		scheduleAdvance(correct, delay = 480) {
			this.clearAdvanceTimer()
			this.advanceTimer = setTimeout(() => {
				this.advanceTimer = null
				this.advanceQuestion(correct)
			}, delay)
		},
		advanceQuestion(correct) {
			if (correct) this.score++
			this.qIndex++
			if (this.qIndex >= this.totalQ) {
				this.clearAutoHear()
				this.finalizeQuizSession()
				this.phase = 'done'
				return
			}
			this.loadQuestion(this.qIndex)
		},
		finalizeQuizSession() {
			const totalQ = this.totalQ
			const score = this.score
			const need = calcQuizPassNeed(totalQ)
			this.passNeed = need
			const passed = totalQ > 0 && score >= need
			this.quizJustPassed = passed
			if (passed) {
				playMengmengVoice(MENG_VOICE.LESSON_QUIZ_PASS, { debounceMs: 400 }).catch(() => {})
			}
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
			this.clearAutoHear()
			this.clearAdvanceTimer()
			stopLocalPinyinAudio()
			uni.navigateBack()
		}
	}
}
</script>

<style scoped>
.run-shell {
	width: 100%;
	height: 100%;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	min-height: 0;
}

.done-shell {
	width: 100%;
	box-sizing: border-box;
}

.top-bar {
	flex-shrink: 0;
	display: flex;
	flex-direction: row;
	align-items: center;
	padding: 8rpx 12rpx;
	margin-bottom: 8rpx;
	border-radius: 20rpx;
	background: rgba(255, 255, 255, 0.92);
	border: 1rpx solid rgba(255, 160, 190, 0.45);
	box-shadow: 0 6rpx 20rpx rgba(255, 140, 170, 0.1);
}

.top-logo {
	width: 52rpx;
	height: 52rpx;
	flex-shrink: 0;
	margin-right: 12rpx;
}

.top-meta {
	flex: 1;
	min-width: 0;
}

.top-progress {
	display: block;
	font-size: 28rpx;
	font-weight: 800;
	color: #c44d6a;
	line-height: 1.2;
}

.top-lesson {
	display: block;
	font-size: 22rpx;
	color: #9a7a86;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	line-height: 1.25;
}

.top-hear {
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 6rpx 14rpx;
	border-radius: 14rpx;
	background: #ff9ec4;
}

.top-hear:active {
	opacity: 0.9;
}

.top-hear--muted {
	background: #efe0e8;
}

.top-hear-icon {
	font-size: 28rpx;
	line-height: 1;
}

.top-hear-txt {
	font-size: 20rpx;
	color: #a83258;
	font-weight: 700;
}

.top-hear--muted .top-hear-txt {
	color: #8a6a78;
}

.chip-row {
	flex-shrink: 0;
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	gap: 10rpx;
	margin-bottom: 10rpx;
	padding: 0 4rpx;
}

.chip {
	display: inline-flex;
	padding: 6rpx 16rpx;
	font-size: 22rpx;
	font-weight: 600;
	color: #8a6a78;
	background: rgba(255, 255, 255, 0.75);
	border-radius: 999rpx;
	border: 1rpx solid rgba(255, 160, 190, 0.35);
}

.chip--accent {
	color: #c44d6a;
	background: #ffd4f0;
}

.dots-scroll {
	flex-shrink: 0;
	width: 100%;
	margin-bottom: 12rpx;
	white-space: nowrap;
}

.dots-row {
	display: inline-flex;
	flex-direction: row;
	align-items: center;
	gap: 10rpx;
	padding: 4rpx 8rpx 8rpx;
}

.dot {
	width: 14rpx;
	height: 14rpx;
	border-radius: 50%;
	background: rgba(255, 180, 200, 0.35);
	flex-shrink: 0;
}

.dot--done {
	background: #f48fb1;
}

.dot--current {
	width: 18rpx;
	height: 18rpx;
	background: #e91e63;
	box-shadow: 0 0 0 4rpx rgba(233, 30, 99, 0.2);
}

.dot--wrong {
	background: #ffab91;
}

.quiz-card {
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	padding: 24rpx 20rpx 20rpx;
	border-radius: 28rpx;
	background: rgba(255, 255, 255, 0.9);
	border: 2rpx solid rgba(255, 255, 255, 0.95);
	box-shadow:
		0 12rpx 40rpx rgba(255, 150, 180, 0.12),
		0 8rpx 24rpx var(--meng-shadow, rgba(44, 36, 25, 0.05));
	box-sizing: border-box;
}

.q-type-label {
	display: block;
	text-align: center;
	font-size: 24rpx;
	font-weight: 700;
	color: #c44d6a;
	margin-bottom: 20rpx;
}

.hear-prompt {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-bottom: 28rpx;
}

.hear-ring {
	width: 120rpx;
	height: 120rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #ffe0ec;
	border: 3rpx solid rgba(255, 120, 160, 0.45);
	box-shadow: 0 8rpx 24rpx rgba(255, 120, 160, 0.2);
}

.hear-ring:active {
	transform: scale(0.97);
}

.hear-ring-icon {
	font-size: 52rpx;
	line-height: 1;
}

.hear-hint {
	margin-top: 16rpx;
	font-size: 26rpx;
	color: #8a6a78;
	font-weight: 600;
}

.see-char-prompt {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-bottom: 28rpx;
}

.see-char {
	font-size: 120rpx;
	font-weight: 800;
	color: var(--meng-text, #2c2419);
	line-height: 1.1;
}

.see-hint {
	margin-top: 12rpx;
	font-size: 26rpx;
	color: #8a6a78;
	font-weight: 600;
}

.opts {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	justify-content: center;
	gap: 16rpx;
	flex: 1;
	align-content: flex-start;
}

.opts-hear {
	align-items: flex-start;
	padding-top: 8rpx;
}

.opts-hear.opts-2 {
	gap: 28rpx;
}

.opts-hear.opts-2 .opt-square {
	width: 200rpx;
	height: 200rpx;
}

.opts-hear.opts-2 .opt-char {
	font-size: 108rpx;
}

.opt-cell-wrap {
	display: flex;
	flex-direction: column;
	align-items: center;
	flex-shrink: 0;
}

.opt-square {
	width: 176rpx;
	height: 176rpx;
	border-radius: 8rpx;
	border: 3rpx solid #d4a8b8;
	background: #fff;
	box-sizing: border-box;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 4rpx 14rpx rgba(255, 140, 170, 0.1);
}

.opt-square:active {
	opacity: 0.92;
}

.opt-square--ok {
	border-color: #66bb6a;
	background: #fff;
	box-shadow: 0 4rpx 16rpx rgba(102, 187, 106, 0.2);
}

.opt-square--bad {
	border-color: #e57373;
	background: #fff;
	box-shadow: 0 4rpx 16rpx rgba(229, 115, 115, 0.15);
}

.opt-mark-slot {
	width: 1rpx;
	height: 44rpx;
	margin-top: 10rpx;
}

.opt-mark {
	display: block;
	margin-top: 10rpx;
	height: 44rpx;
	line-height: 44rpx;
	font-size: 40rpx;
	font-weight: 800;
	text-align: center;
}

.opt-mark--ok {
	color: #43a047;
}

.opt-mark--bad {
	color: #e53935;
}

.opts-py {
	flex-direction: column;
	align-items: stretch;
}

.opt-tile {
	padding: 28rpx 16rpx;
	border-radius: 20rpx;
	background: #fff;
	border: 2rpx solid rgba(255, 180, 200, 0.5);
	box-sizing: border-box;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 4rpx 14rpx rgba(255, 140, 170, 0.08);
}

.opt-tile:active {
	opacity: 0.92;
}

.opt-tile--correct {
	border-color: #66bb6a;
	background: #fff;
}

.opt-tile--py {
	width: 100% !important;
	min-width: 0;
	padding: 32rpx 20rpx;
}

.opt-char {
	font-size: 96rpx;
	font-weight: 800;
	color: var(--meng-text, #2c2419);
	line-height: 1;
}

.opt-py {
	font-size: 40rpx;
	font-weight: 700;
	color: #5d4037;
	line-height: 1.35;
	text-align: center;
}

.feedback-line {
	flex-shrink: 0;
	display: block;
	margin-top: 20rpx;
	text-align: center;
	font-size: 26rpx;
	color: #c44d6a;
	font-weight: 600;
	line-height: 1.4;
	min-height: 36rpx;
}

.feedback-line--hint {
	color: #8a6a78;
	font-weight: 500;
}

.done-shell {
	height: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 24rpx;
	box-sizing: border-box;
}

.done-logo {
	width: 88rpx;
	height: 88rpx;
	margin-bottom: 8rpx;
}

.done-emoji {
	font-size: 64rpx;
	margin-bottom: 8rpx;
}

.done-title {
	font-size: 36rpx;
	font-weight: 800;
	color: var(--meng-text, #2c2419);
	margin-bottom: 12rpx;
}

.done-score {
	font-size: 30rpx;
	color: #c44d6a;
	font-weight: 700;
	margin-bottom: 8rpx;
}

.done-cover {
	font-size: 24rpx;
	color: #8a6a78;
	margin-bottom: 16rpx;
}

.pass-line {
	display: block;
	font-size: 26rpx;
	color: #2e7d32;
	font-weight: 600;
	text-align: center;
	margin-bottom: 12rpx;
	padding: 0 20rpx;
}

.pass-line--muted {
	color: #8a6a78;
	font-weight: 500;
}

.done-msg {
	font-size: 26rpx;
	color: #9a7a86;
	text-align: center;
	line-height: 1.5;
	margin-bottom: 28rpx;
	padding: 0 24rpx;
}

.done-actions {
	width: 100%;
	max-width: 480rpx;
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.back-btn {
	width: 100%;
	border-radius: 18rpx;
	font-size: 28rpx;
	background: #f06292;
	color: #fff;
	border: none;
}

.back-btn--ghost {
	background: #fff !important;
	color: #c44d6a !important;
	border: 2rpx solid rgba(255, 140, 170, 0.55) !important;
}
</style>
