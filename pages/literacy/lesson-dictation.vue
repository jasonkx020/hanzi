<!--
  @file lesson-dictation.vue
  @layer L1 表现层
  @description 路由页面源文件：lesson-dictation.vue
  @software 萌萌识字移动应用软件 V1.0
  @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
-->
<template>
	<meng-sub-page
		:title="lessonTitle || '听写'"
		subtitle="听音 · 写完再评分"
		:full-height="true"
		:padded="false"
		:overlap-body="false"
	>
		<view v-if="phase === 'run'" class="run-shell">
			<view class="head">
				<view class="head-main">
					<text class="head-progress">{{ qIndex + 1 }}/{{ totalQ }}</text>
					<view class="head-track">
						<view class="head-fill" :style="{ width: progressPct + '%' }" />
					</view>
					<view v-if="totalQ > 1" class="dots">
						<view
							v-for="(_, i) in totalQ"
							:id="`dict-dot-${i}`"
							:key="i"
							class="dot"
							:class="dotClass(i)"
						/>
					</view>
				</view>
				<view class="head-side">
					<view class="hear-btn" @click="onHearAgain">
						<image class="hear-icon" :src="labaSrc" mode="aspectFit" @error="onLabaError" />
						<text class="hear-txt">再听</text>
					</view>
					<view v-if="scoreRadarVisible" class="score-card">
						<text class="score-card-title">本字评分</text>
						<score-radar-chart
							:key="'radar-' + qIndex + '-' + scoreRadarKey"
							canvas-id="dictation-score-radar"
							:axes="scoreRadarAxes"
							:size="radarSizePx"
							:show-legend="true"
							:compact="true"
							fill-color="rgba(232, 122, 74, 0.42)"
							stroke-color="#d4562a"
						/>
					</view>
				</view>
			</view>

			<view class="status-row">
				<image class="status-meng" :src="mengPoseSrc" mode="aspectFit" />
				<view class="status-body">
					<view class="status-line">
						<text class="status-mark">？</text>
						<text class="status-stroke">
							{{ strokeTotal > 0 ? `${currentStrokeNo}/${strokeTotal} 笔` : '听音书写' }}
						</text>
						<view v-if="strokeTotal > 1" class="pills">
							<view
								v-for="n in strokeTotal"
								:key="n"
								class="pill"
								:class="{
									'pill--done': n <= activeStroke || (completed && n <= strokeTotal),
									'pill--now': !completed && n === currentStrokeNo
								}"
							/>
						</view>
					</view>
					<text class="status-tip">{{ promptSubline }}</text>
				</view>
			</view>

			<view class="stage">
				<view class="canvas-shell">
					<canvas
						v-if="canvasReady"
						id="lesson-dictation-canvas"
						canvas-id="lesson-dictation-canvas"
						class="dictation-canvas"
						disable-scroll
						:style="canvasStyle"
						@touchstart="onTouchStart"
						@touchmove="onTouchMove"
						@touchend="onTouchEnd"
						@touchcancel="onTouchCancel"
					/>
					<text v-else class="canvas-fallback">…</text>
					<view
						v-if="canvasReady && !completed && !advancing && showCanvasGuide"
						class="canvas-guide"
					>
						<text class="canvas-guide-txt">写完后点「写好了」</text>
					</view>
				</view>
			</view>

			<view class="dock">
				<text
					class="dock-msg"
					:class="{
						'dock-msg--ok': feedbackType === 'ok',
						'dock-msg--bad': feedbackType === 'bad'
					}"
				>{{ feedbackIcon ? feedbackIcon + ' ' : '' }}{{ feedbackText }}</text>
				<view v-if="awaitingRetryChoice" class="dock-actions">
					<button class="btn btn--ghost" size="mini" @click="onChooseRetryPractice">再练</button>
					<button class="btn btn--primary" size="mini" @click="onChooseSkipToNext">下一个</button>
				</view>
				<view v-else class="dock-actions">
					<button
						class="btn btn--ghost"
						size="mini"
						:disabled="!canvasReady || advancing || completed"
						@click="resetWriting"
					>
						重写
					</button>
					<button
						class="btn btn--primary"
						size="mini"
						:disabled="!canvasReady || advancing"
						@click="onManualComplete"
					>
						{{ primaryActionLabel }}
					</button>
				</view>
			</view>
		</view>

		<view v-else class="done-shell" :class="'done-shell--' + doneTier">
			<image class="done-meng" :src="doneMengSrc" mode="aspectFit" />
			<view class="done-stars">
				<text
					v-for="i in 3"
					:key="i"
					class="done-star"
					:class="{ 'done-star--on': i <= doneStarCount }"
				>★</text>
			</view>
			<text class="done-title">{{ doneTitle }}</text>
			<text class="done-score">全对 {{ score }}/{{ totalQ }}</text>
			<text class="pass-line" :class="{ 'pass-line--muted': !dictationJustPassed }">
				{{ dictationJustPassed ? '已达标，记入本课进度' : `达标需 ≥ ${passNeed} 字` }}
			</text>
			<view v-if="imperfectChars.length" class="wrong-block">
				<text class="wrong-label">需巩固</text>
				<view class="wrong-chips">
					<text
						v-for="(ch, i) in imperfectChars"
						:key="`w-${i}-${ch.hanzi}`"
						class="wrong-chip"
					>{{ ch.hanzi }}</text>
				</view>
			</view>
			<text class="done-msg">{{ doneEncourage }}</text>
			<view class="done-actions">
				<button
					v-if="!dictationJustPassed"
					class="back-btn back-btn--ghost"
					type="default"
					@click="restartDictation"
				>
					再听写
				</button>
				<button
					v-if="imperfectChars.length"
					class="back-btn back-btn--ghost"
					type="default"
					@click="goWritePractice"
				>
					去写字
				</button>
				<button class="back-btn" type="primary" @click="goBackLesson">回字卡</button>
			</view>
		</view>
	</meng-sub-page>
</template>

<script>
import MengSubPage from '@/components/meng-sub-page.vue'
import ScoreRadarChart from '@/components/score-radar-chart.vue'
import { buildScoreRadarAxes } from '@/utils/score-radar-axes.js'
import {
	putLessonWriteTransfer,
	takeLessonDictationTransfer
} from '@/utils/lesson-mode-session.js'
import { addCharWrongCount, markCharLearned } from '@/utils/user-progress-storage.js'
import { getCurriculumPrefs } from '@/utils/curriculum-storage.js'
import {
	buildStoredLessonKey,
	recordLessonDictationAttempt
} from '@/utils/user-lesson-progress-storage.js'
import { calcQuizPassNeed } from '@/utils/lesson-quiz-plan.js'
import { stopLocalPinyinAudio } from '@/utils/play-pinyin-local-audio.js'
import {
	playLessonHintThenTargetReading,
	playLessonReplayThenTargetReading,
	playLessonTargetReadingAfterVoice
} from '@/utils/lesson-mode-audio.js'
import {
	MENG_VOICE,
	getMengmengVoiceCopy,
	playMengmengVoice,
	stopMengmengVoice
} from '@/utils/mengmeng-voice.js'
import {
	MENG_ASSETS,
	buildMengAssetSrcCandidates,
	mengIp,
	resolveMengAssetUrl
} from '@/utils/mengmeng-assets.js'
import drawNative from '@/utils/draw-native.js'
import { getCncharStrokeNameList } from '@/utils/stroke-order-audio.js'

function firstHanzi(text) {
	const s = String(text || '').trim()
	const m = s.match(/[\u4e00-\u9fff]/)
	return m ? m[0] : ''
}

function orderedUniqueRows(rows) {
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

/** 屏上提示与萌萌语音文案对齐 */
const FEEDBACK = {
	idle: '听一听读音，按笔顺写完再点「写好了」',
	retryClear: '已清空，再听一遍写',
	/** 单笔写错（过程内），语气柔和、不报「第几笔」 */
	strokeWrong: '笔顺不太对哦，继续加油',
	strokeShort: '笔画再长一点哦，继续加油',
	strokeCount: (exp, act) =>
		act < exp
			? `还差 ${exp - act} 笔，写完再点「写好了」`
			: `多写了 ${act - exp} 笔，重写后再试`,
	batchFail: '方向或字形还差一点，要不要再练一遍？',
	charPass: (ch) => `全写对了，是「${ch}」！点「下一个」`,
	charFinishWithMistakes: (n) =>
		n > 1 ? `写过 ${n} 处小失误，要不要再练一遍？` : '有过小失误，要不要再练一遍？'
}

export default {
	components: { MengSubPage, ScoreRadarChart },
	data() {
		return {
			phase: 'run',
			lessonTitle: '',
			rjLessonIdx: null,
			targets: [],
			qIndex: 0,
			score: 0,
			totalQ: 0,
			targetHanzi: '',
			targetPinyin: '',
			autoHearTimer: null,
			advanceTimer: null,
			canvasReady: false,
			canvasLength: 168,
			writer: null,
			mountGen: 0,
			attachTimer: null,
			strokeNames: [],
			strokeTotal: 0,
			activeStroke: 0,
			completed: false,
			/** 本轮是否全程无笔顺/笔画失误 */
			charPerfect: false,
			/** 当前字本轮曾有过失误（重练后仍保留，用于不计分） */
			charHadMistakesThisRound: false,
			/** 已写完但过程有误，等待选「重新练习」或「先下一个」 */
			awaitingRetryChoice: false,
			feedbackText: FEEDBACK.idle,
			feedbackType: '',
			/** 当前字本轮书写中的笔顺/笔画错误次数 */
			charStrokeMistakes: 0,
			advancing: false,
			dictationWelcomed: false,
			/** 取消未完成的自动听音 / 切题 */
			hearSeq: 0,
			labaSrcIndex: 0,
			logoSrc: resolveMengAssetUrl(MENG_ASSETS.logoIcon),
			/** @type {Array<{ hanzi: string, pinyin: string, perfect: boolean, mistakeCount: number }>} */
			roundResults: [],
			/** 本轮已记过错题的字 */
			imperfectRecorded: {},
			passNeed: 0,
			dictationJustPassed: false,
			scoreRadarVisible: false,
			scoreRadarAxes: [],
			scoreRadarKey: 0
		}
	},
	computed: {
		canvasStyle() {
			const px = this.canvasLength + 30
			return { width: px + 'px', height: px + 'px', display: 'block' }
		},
		radarSizePx() {
			return 88
		},
		currentStrokeNo() {
			if (this.completed) return this.strokeTotal
			return Math.min(this.strokeTotal || 1, this.activeStroke + 1)
		},
		progressPct() {
			if (!this.totalQ) return 0
			const base = this.qIndex / this.totalQ
			const bump = this.charPerfect && this.completed ? 1 / this.totalQ : 0
			return Math.min(100, Math.round((base + bump) * 100))
		},
		primaryActionLabel() {
			if (this.completed) return '下一个'
			return '写好了'
		},
		dotScrollId() {
			const i = Math.max(0, this.qIndex - 2)
			return `dict-dot-${i}`
		},
		labaSrcCandidates() {
			return buildMengAssetSrcCandidates(MENG_ASSETS.laba)
		},
		labaSrc() {
			const list = this.labaSrcCandidates
			if (list.length && this.labaSrcIndex < list.length) return list[this.labaSrcIndex]
			return resolveMengAssetUrl(MENG_ASSETS.logoIcon)
		},
		mengPoseSrc() {
			if (this.charPerfect && this.completed) return resolveMengAssetUrl(mengIp('happy'))
			if (this.awaitingRetryChoice || this.feedbackType === 'bad') {
				return resolveMengAssetUrl(mengIp('trying'))
			}
			return resolveMengAssetUrl(mengIp('book'))
		},
		feedbackIcon() {
			if (this.feedbackType === 'bad') return '💪'
			if (this.charPerfect && this.completed) return '✓'
			return ''
		},
		promptSubline() {
			if (this.completed) return getMengmengVoiceCopy(MENG_VOICE.DICTATION_CHAR_PASS) || '这个字写对啦'
			if (this.feedbackType === 'bad') return '萌萌陪你再试一次'
			const idle = !this.feedbackType && this.feedbackText === FEEDBACK.idle
			if (idle && this.qIndex > 0) {
				return getMengmengVoiceCopy(MENG_VOICE.DICTATION_CHAR_ENTER) || '听一听，再写一写'
			}
			if (idle && this.qIndex === 0) {
				return getMengmengVoiceCopy(MENG_VOICE.DICTATION_WELCOME) || '听一听，按笔顺写'
			}
			return '写完所有笔画后点「写好了」'
		},
		showCanvasGuide() {
			return !this.feedbackType && !this.charStrokeMistakes && !this.awaitingRetryChoice
		},
		doneTier() {
			if (!this.totalQ) return 'encourage'
			const r = this.score / this.totalQ
			if (r >= 1) return 'perfect'
			if (r >= 0.6) return 'good'
			return 'encourage'
		},
		doneStarCount() {
			if (this.doneTier === 'perfect') return 3
			if (this.doneTier === 'good') return 2
			return 1
		},
		doneTitle() {
			if (this.doneTier === 'perfect') return '全写对啦'
			if (this.doneTier === 'good') return '听写完成'
			return '完成啦'
		},
		doneMengSrc() {
			if (this.doneTier === 'perfect') {
				return resolveMengAssetUrl(mengIp('happy'))
			}
			if (this.doneTier === 'good') {
				return resolveMengAssetUrl(mengIp('wave'))
			}
			return resolveMengAssetUrl(mengIp('trying'))
		},
		doneEncourage() {
			if (!this.totalQ) return '继续加油！'
			const id =
				this.doneTier === 'perfect'
					? MENG_VOICE.DICTATION_DONE_PERFECT
					: this.doneTier === 'good'
						? MENG_VOICE.DICTATION_DONE_GOOD
						: MENG_VOICE.DICTATION_DONE_ENCOURAGE
			return getMengmengVoiceCopy(id) || '继续加油！'
		},
		imperfectChars() {
			return (this.roundResults || []).filter((r) => r && r.hanzi && !r.perfect)
		}
	},
	onUnload() {
		this.clearAutoHear()
		this.clearAdvanceTimer()
		this.teardownWriter()
		stopLocalPinyinAudio()
		stopMengmengVoice()
	},
	onHide() {
		stopLocalPinyinAudio()
		stopMengmengVoice()
	},
	onLoad() {
		this.calcCanvasSize()
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
			uni.setNavigationBarTitle({ title: `${nav} · 听一听写` })
		} else {
			this.lessonTitle = '本课生字'
			uni.setNavigationBarTitle({ title: '听一听写' })
		}
		const pool = orderedUniqueRows(payload.rows)
		if (!pool.length) {
			uni.showToast({ title: '本课无生字可听写', icon: 'none' })
			setTimeout(() => uni.navigateBack(), 1800)
			return
		}
		const rj = payload.rjLessonIdx
		const rjN = Number(rj)
		this.rjLessonIdx =
			rj != null && rj !== '' && Number.isFinite(rjN) && rjN >= 0 ? Math.floor(rjN) : null
		this.targets = pool
		this.totalQ = pool.length
		this.passNeed = calcQuizPassNeed(pool.length)
		this.qIndex = 0
		this.score = 0
		this.roundResults = []
		this.imperfectRecorded = {}
		this.dictationJustPassed = false
		this.dictationWelcomed = false
		this.phase = 'run'
		this.loadQuestion(0)
	},
	methods: {
		dotClass(i) {
			if (i > this.qIndex) return { 'dot--pending': true }
			if (i === this.qIndex) {
				if (this.awaitingRetryChoice) return { 'dot--imperfect': true }
				if (this.charPerfect && this.completed) return { 'dot--done': true }
				if (this.completed && !this.charPerfect) return { 'dot--imperfect': true }
				return { 'dot--current': true }
			}
			const r = this.roundResults[i]
			if (r && !r.perfect) return { 'dot--imperfect-done': true }
			return { 'dot--done': true }
		},
		onLabaError() {
			if (this.labaSrcIndex < this.labaSrcCandidates.length - 1) {
				this.labaSrcIndex += 1
			}
		},
		calcCanvasSize() {
			try {
				const sys = uni.getSystemInfoSync()
				const h = Number(sys.windowHeight) || 667
				const w = Number(sys.windowWidth) || 375
				const reserved = 268
				const avail = h - reserved
				const maxW = w - 40
				const side = Math.min(avail, maxW, 240)
				this.canvasLength = Math.max(132, Math.floor(side - 30))
			} catch (_) {
				this.canvasLength = 168
			}
		},
		clearAutoHear() {
			this.hearSeq++
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
		/** 进入新字：萌萌提示播完后再自动播生字读音 */
		queueIntroHear(idx) {
			this.clearAutoHear()
			const token = this.hearSeq
			let voiceId = null
			let voiceOpts = {}
			if (idx === 0 && !this.dictationWelcomed) {
				this.dictationWelcomed = true
				voiceId = MENG_VOICE.DICTATION_WELCOME
			} else if (idx > 0) {
				voiceId = MENG_VOICE.DICTATION_CHAR_ENTER
				voiceOpts = { debounceMs: 200, minGapMs: 1500 }
			}
			const run = async () => {
				if (token !== this.hearSeq || this.phase !== 'run' || !this.targetHanzi) return
				try {
					await playLessonHintThenTargetReading(
						this.targetHanzi,
						this.targetPinyin,
						voiceId,
						voiceOpts
					)
				} catch (e) {
					console.warn('[lesson-dictation] intro hear', e)
				}
			}
			if (voiceId) {
				run()
				return
			}
			this.autoHearTimer = setTimeout(() => {
				this.autoHearTimer = null
				if (token !== this.hearSeq) return
				run()
			}, 480)
		},
		/** 提示音已单独触发时，仅排队播生字 */
		scheduleTargetReadingAfterVoice() {
			this.clearAutoHear()
			const token = this.hearSeq
			const hanzi = this.targetHanzi
			const py = this.targetPinyin
			const run = async () => {
				if (token !== this.hearSeq || this.phase !== 'run' || !hanzi) return
				try {
					await playLessonTargetReadingAfterVoice(hanzi, py)
				} catch (e) {
					console.warn('[lesson-dictation] after-voice hear', e)
				}
			}
			run()
		},
		playDictVoice(id, opts = {}) {
			stopLocalPinyinAudio()
			return playMengmengVoice(id, opts).catch(() => false)
		},
		/** 听写过程单笔写错：屏上文案 + 口播 */
		playStrokeWrongHint(reason) {
			this.feedbackType = 'bad'
			this.feedbackText = reason === 'tooShort' ? FEEDBACK.strokeShort : FEEDBACK.strokeWrong
			const voiceId =
				reason === 'tooShort' ? MENG_VOICE.DICTATION_STROKE_SHORT : MENG_VOICE.DAILY_STROKE_WRONG
			return this.playDictVoice(voiceId, { minGapMs: reason === 'tooShort' ? 800 : 1400 })
		},
		playDictationDoneVoice() {
			if (!this.totalQ) return
			const id =
				this.doneTier === 'perfect'
					? MENG_VOICE.DICTATION_DONE_PERFECT
					: this.doneTier === 'good'
						? MENG_VOICE.DICTATION_DONE_GOOD
						: MENG_VOICE.DICTATION_DONE_ENCOURAGE
			this.playDictVoice(id, { debounceMs: 320 })
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
		commitRoundResult(perfect) {
			const entry = {
				hanzi: this.targetHanzi,
				pinyin: this.targetPinyin,
				perfect: !!perfect,
				mistakeCount: this.charRoundMistakeCount()
			}
			const next = this.roundResults.slice()
			next[this.qIndex] = entry
			this.roundResults = next
		},
		finalizeDictationSession() {
			const totalQ = this.totalQ
			const score = this.score
			const need = calcQuizPassNeed(totalQ)
			this.passNeed = need
			const passed = totalQ > 0 && score >= need
			this.dictationJustPassed = passed
			const lessonKey = buildStoredLessonKey(this.rjLessonIdx, this.lessonTitle)
			const d = this.curriculumDims()
			try {
				recordLessonDictationAttempt({
					lesson_key: lessonKey,
					textbook_version_id: d.textbook_version_id,
					grade: d.grade,
					semester: d.semester,
					score,
					totalQ,
					passed
				})
			} catch (e) {
				console.warn('[lesson-dictation] recordLessonDictationAttempt', e)
			}
			this.playDictationDoneVoice()
		},
		loadQuestion(idx) {
			const t = this.targets[idx]
			if (!t) {
				this.finalizeDictationSession()
				this.phase = 'done'
				return
			}
			this.clearAdvanceTimer()
			this.advancing = false
			this.targetHanzi = t.hanzi
			this.targetPinyin = t.pinyin != null ? String(t.pinyin) : ''
			this.completed = false
			this.charPerfect = false
			this.charHadMistakesThisRound = false
			this.awaitingRetryChoice = false
			this.activeStroke = 0
			this.charStrokeMistakes = 0
			this.feedbackType = ''
			this.feedbackText = FEEDBACK.idle
			this.clearScoreRadar()
			this.strokeNames = getCncharStrokeNameList(this.targetHanzi)
			this.strokeTotal = this.strokeNames.length || 0
			/** 先排队播音；稍后再挂 canvas，避免主线程被画布占满导致无声 */
			this.queueIntroHear(idx)
			setTimeout(() => {
				if (this.phase === 'run' && this.targetHanzi) this.mountTestWriter()
			}, 120)
		},
		onHearAgain() {
			if (this.phase !== 'run' || !this.targetHanzi) return
			this.clearAutoHear()
			const hanzi = this.targetHanzi
			const py = this.targetPinyin
			const token = this.hearSeq
			playLessonReplayThenTargetReading(hanzi, py, MENG_VOICE.DAILY_PINYIN_REPLAY).catch((e) => {
				if (token === this.hearSeq) console.warn('[lesson-dictation] hear again', e)
			})
		},
		sharedDrawOpts() {
			return {
				vm: this,
				style: {
					length: this.canvasLength,
					charInsetRatio: 0.12,
					strokeColor: '#2c2419',
					/** 关闭灰底稿，避免听写泄题 */
					showOutline: false,
					outlineColor: '#fffcf8',
					/** 评分后对比用的标准轮廓色（书写中仍不显示） */
					revealOutlineColor: '#cfc6b8',
					revealFailColor: '#ff6b9d',
					backgroundColor: '#fffcf8',
					currentColor: '#e87a4a',
					drawingColor: '#e87a4a',
					drawingWidth: 5,
					guideStrokeColor: '#ff6b9d',
					highlightColor: '#ffab40'
				},
				line: {
					show: true,
					borderColor: '#ebe3d8',
					centerColor: '#f0e8dc',
					diagonalColor: '#f5efe6'
				},
				watermark: { text: '', alpha: 0 }
			}
		},
		teardownWriter() {
			if (this.attachTimer) {
				clearTimeout(this.attachTimer)
				this.attachTimer = null
			}
			this.mountGen++
			if (this.writer && typeof this.writer.destroy === 'function') {
				this.writer.destroy()
			}
			this.writer = null
			this.canvasReady = false
		},
		scheduleMount(fn) {
			this.teardownWriter()
			this.canvasReady = true
			const token = ++this.mountGen
			const attach = () => {
				this.attachTimer = null
				if (token !== this.mountGen) return
				fn()
			}
			this.$nextTick(() => {
				this.$nextTick(() => {
					this.attachTimer = setTimeout(attach, 48)
				})
			})
		},
		mountTestWriter() {
			const ch = this.targetHanzi
			if (!ch) return
			this.scheduleMount(() => {
				const vm = this
				try {
					this.writer = drawNative(ch, {
						...this.sharedDrawOpts(),
						el: '#lesson-dictation-canvas',
						type: drawNative.TYPE.TEST,
						animation: { autoAnimate: false },
						test: {
							/** 中途只记书写顺序；写好了再综合判方向+贴合度 */
							testJudgeMode: 'direction',
							testDirectionMinCos: 0.45,
							testFitRefRatio: 0.28,
							testStrokePassScore: 0.55,
							testDirWeight: 0.35,
							testFitWeight: 0.65,
							showHintAfterMisses: 1,
							onTestStatus: ({ index, status, data }) => {
								vm.handleTestStatus(index, status, data || {})
							}
						}
					})
					const total = this.writer?.charData?.medians?.length || 0
					if (total) this.strokeTotal = total
					if (typeof this.writer.updateCanvasRect === 'function') {
						this.writer.updateCanvasRect()
					}
				} catch (e) {
					console.warn('[lesson-dictation] mount test', e)
					vm.playDictVoice(MENG_VOICE.DICTATION_UNSUPPORTED)
					uni.showToast({ title: '这个字暂时不能写', icon: 'none' })
					setTimeout(() => vm.advanceQuestion(), 1200)
				}
			})
		},
		clearScoreRadar() {
			this.scoreRadarVisible = false
			this.scoreRadarAxes = []
		},
		showScoreRadarFromResult(data = {}) {
			const axes = buildScoreRadarAxes(data.strokeResults, {
				expectedCount: data.expectedCount != null ? data.expectedCount : this.strokeTotal,
				actualCount:
					data.actualCount != null
						? data.actualCount
						: Array.isArray(data.strokeResults)
							? data.strokeResults.length
							: this.activeStroke
			})
			this.scoreRadarAxes = axes
			this.scoreRadarKey += 1
			this.scoreRadarVisible = true
		},
		handleTestStatus(index, status, data = {}) {
			if (this.phase !== 'run' || this.advancing) return
			if (status === 'stroke_recorded') {
				const n = Number(data.recordedCount) || Number(index) || 0
				this.activeStroke = n
				if (this.feedbackType === 'bad' && !this.awaitingRetryChoice && !this.completed) {
					this.feedbackType = ''
					this.feedbackText = FEEDBACK.idle
				}
				return
			}
			if (status === 'correct') {
				this.activeStroke = Number(index) + 1
				if (this.feedbackType === 'bad' && !this.awaitingRetryChoice && !this.completed) {
					this.feedbackType = ''
					this.feedbackText = FEEDBACK.idle
				}
				return
			}
			if (status === 'mistake') {
				/** 中途过短：只提示，不记整字失误 */
				if (data.reason === 'tooShort' && data.deferred) {
					this.playStrokeWrongHint('tooShort')
					return
				}
				if (data.deferred && data.reason === 'strokeCount') {
					const exp = Number(data.expectedCount) || this.strokeTotal
					const act = Number(data.actualCount) || 0
					/** 笔数不够：提醒继续写，不进失败结算 */
					if (act < exp) {
						this.feedbackType = ''
						this.feedbackText = FEEDBACK.strokeCount(exp, act)
						return
					}
					this.showScoreRadarFromResult(data)
					this.charStrokeMistakes += 1
					this.charHadMistakesThisRound = true
					this.onCharFinishedWithMistakes()
					this.feedbackText = FEEDBACK.strokeCount(exp, act)
					return
				}
				if (data.deferred && data.reason === 'lowScore') {
					this.showScoreRadarFromResult(data)
					this.charStrokeMistakes += 1
					this.charHadMistakesThisRound = true
					this.onCharFinishedWithMistakes()
					this.feedbackText = FEEDBACK.batchFail
					return
				}
				this.charStrokeMistakes += 1
				this.charHadMistakesThisRound = true
				this.playStrokeWrongHint(data.reason)
				return
			}
			if (status === 'complete') {
				if (data.deferred) this.showScoreRadarFromResult(data)
				this.onCharRoundFinished()
			}
		},
		charRoundMistakeCount() {
			const local = Number(this.charStrokeMistakes) || 0
			const fromWriter = Number(this.writer?.testState?.totalMistakes) || 0
			return Math.max(local, fromWriter)
		},
		onCharRoundFinished() {
			if (this.advancing || this.completed || this.awaitingRetryChoice) return
			if (this.charRoundMistakeCount() > 0) {
				this.onCharFinishedWithMistakes()
				return
			}
			if (this.charHadMistakesThisRound) {
				this.onCharWriteRecovered()
				return
			}
			this.onCharWriteSuccess()
		},
		/** 笔画都画完，但过程中有过失误：询问是否重练，不记已学 */
		onCharFinishedWithMistakes() {
			if (this.advancing || this.awaitingRetryChoice) return
			this.charHadMistakesThisRound = true
			const n = this.charRoundMistakeCount()
			this.completed = true
			this.charPerfect = false
			this.awaitingRetryChoice = true
			this.feedbackType = 'bad'
			this.feedbackText = FEEDBACK.charFinishWithMistakes(n)
			this.playDictVoice(MENG_VOICE.DICTATION_CHAR_RETRY, { minGapMs: 1500 })
		},
		/** 重练后写完且本趟无新失误：不计分，记为需巩固 */
		onCharWriteRecovered() {
			if (this.advancing || this.completed || this.awaitingRetryChoice) return
			this.completed = true
			this.charPerfect = false
			this.activeStroke = this.strokeTotal
			this.feedbackType = 'ok'
			this.feedbackText = `「${this.targetHanzi}」写完啦，点「下一个」继续`
			this.recordImperfectChar()
			this.commitRoundResult(false)
			this.playDictVoice(MENG_VOICE.DICTATION_CHAR_PASS, { minGapMs: 1200 })
		},
		recordImperfectChar() {
			const h = this.targetHanzi
			if (!h || this.imperfectRecorded[h]) return
			this.imperfectRecorded = { ...this.imperfectRecorded, [h]: true }
			try {
				addCharWrongCount(h, 1, this.curriculumDims())
			} catch (e) {
				console.warn('[lesson-dictation] addCharWrongCount', e)
			}
		},
		onChooseRetryPractice() {
			if (!this.awaitingRetryChoice || this.phase !== 'run') return
			this.awaitingRetryChoice = false
			this.completed = false
			this.charPerfect = false
			this.recordImperfectChar()
			this.resetWritingForRetry()
		},
		onChooseSkipToNext() {
			if (!this.awaitingRetryChoice || this.phase !== 'run') return
			this.awaitingRetryChoice = false
			this.recordImperfectChar()
			this.commitRoundResult(false)
			this.completed = false
			this.charPerfect = false
			this.advanceQuestion()
		},
		resetWritingForRetry() {
			if (this.phase !== 'run' || this.advancing) return
			this.awaitingRetryChoice = false
			this.charStrokeMistakes = 0
			this.completed = false
			this.charPerfect = false
			this.activeStroke = 0
			this.feedbackType = ''
			this.feedbackText = FEEDBACK.retryClear
			this.clearScoreRadar()
			if (this.writer && typeof this.writer.resetStrokeTest === 'function') {
				this.writer.resetStrokeTest()
				this.scheduleTargetReadingAfterVoice()
				return
			}
			this.mountTestWriter()
			this.scheduleTargetReadingAfterVoice()
		},
		onCharWriteSuccess() {
			if (this.advancing || this.completed || this.awaitingRetryChoice) return
			this.completed = true
			this.charPerfect = true
			this.activeStroke = this.strokeTotal
			this.feedbackType = 'ok'
			this.feedbackText = FEEDBACK.charPass(this.targetHanzi)
			this.score++
			this.commitRoundResult(true)
			try {
				markCharLearned(this.targetHanzi, this.curriculumDims())
			} catch (e) {
				console.warn('[lesson-dictation] markCharLearned', e)
			}
			this.playDictVoice(MENG_VOICE.DICTATION_CHAR_PASS, { minGapMs: 1200 })
		},
		onManualComplete() {
			if (this.phase !== 'run' || this.advancing || this.awaitingRetryChoice) return
			if (this.completed) {
				this.advanceQuestion()
				return
			}
			if (this.writer && typeof this.writer.judgeDeferredTest === 'function') {
				const recorded = this.writer.testState?.recordedStrokes?.length || 0
				if (!recorded) {
					this.feedbackType = ''
					this.feedbackText = '先在格子里写一写，再点「写好了」'
					return
				}
				this.writer.judgeDeferredTest()
				return
			}
			const total = this.strokeTotal || this.writer?.charData?.medians?.length || 0
			const doneStrokes = this.writer?.testState?.activeStroke ?? this.activeStroke
			if (total > 0 && doneStrokes >= total) {
				this.onCharRoundFinished()
				return
			}
			const remaining = Math.max(0, total - doneStrokes)
			this.feedbackType = ''
			this.feedbackText = remaining > 0 ? `还有 ${remaining} 笔哦` : '请按笔顺写完'
		},
		resetWriting() {
			if (this.phase !== 'run' || this.advancing || this.completed) return
			this.resetWritingForRetry()
		},
		advanceQuestion() {
			if (this.advancing) return
			this.advancing = true
			this.clearAutoHear()
			this.clearAdvanceTimer()
			this.teardownWriter()
			this.qIndex++
			if (this.qIndex >= this.totalQ) {
				this.finalizeDictationSession()
				this.phase = 'done'
				this.advancing = false
				return
			}
			this.advancing = false
			this.loadQuestion(this.qIndex)
		},
		restartDictation() {
			if (!this.targets.length) return
			this.clearAutoHear()
			this.clearAdvanceTimer()
			this.teardownWriter()
			stopLocalPinyinAudio()
			stopMengmengVoice()
			this.qIndex = 0
			this.score = 0
			this.roundResults = []
			this.imperfectRecorded = {}
			this.dictationJustPassed = false
			this.dictationWelcomed = false
			this.passNeed = calcQuizPassNeed(this.totalQ)
			this.phase = 'run'
			this.loadQuestion(0)
		},
		goWritePractice() {
			const rows = this.imperfectChars.map((r) => ({
				hanzi: r.hanzi,
				pinyin: r.pinyin || ''
			}))
			if (!rows.length) return
			putLessonWriteTransfer({
				lessonTitle: this.lessonTitle,
				rjLessonIdx: this.rjLessonIdx,
				rows
			})
			uni.redirectTo({ url: '/pages/literacy/write-practice' })
		},
		pickCanvasTouch(e) {
			if (!e) return null
			return (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || null
		},
		onTouchStart(e) {
			if (this.completed || this.advancing || this.awaitingRetryChoice) return
			const t = this.pickCanvasTouch(e)
			if (t && this.writer?.handleTouchStart) {
				this.writer.handleTouchStart(t, e.detail)
			}
		},
		onTouchMove(e) {
			if (this.completed || this.advancing || this.awaitingRetryChoice) return
			const t = this.pickCanvasTouch(e)
			if (t && this.writer?.handleTouchMove) {
				this.writer.handleTouchMove(t, e.detail)
			}
		},
		onTouchEnd() {
			if (this.completed || this.advancing || this.awaitingRetryChoice) return
			if (this.writer?.handleTouchEnd) {
				this.writer.handleTouchEnd()
			}
		},
		onTouchCancel() {
			this.onTouchEnd()
		},
		goBackLesson() {
			this.clearAutoHear()
			this.clearAdvanceTimer()
			this.teardownWriter()
			stopLocalPinyinAudio()
			stopMengmengVoice()
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
	padding: 8rpx 20rpx 12rpx;
}

.head {
	flex-shrink: 0;
	position: relative;
	z-index: 5;
	display: flex;
	flex-direction: row;
	align-items: flex-start;
	gap: 16rpx;
	margin-bottom: 10rpx;
}

.head-side {
	flex-shrink: 0;
	position: relative;
	width: 100rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.head-main {
	flex: 1;
	min-width: 0;
}

.head-progress {
	display: block;
	font-size: 26rpx;
	font-weight: 800;
	color: var(--meng-chocolate, #5c3d2e);
	letter-spacing: 1rpx;
	margin-bottom: 8rpx;
}

.head-track {
	height: 6rpx;
	border-radius: 6rpx;
	background: rgba(232, 122, 74, 0.14);
	overflow: hidden;
}

.head-fill {
	height: 100%;
	border-radius: 6rpx;
	background: var(--meng-accent-solid, #e87a4a);
	transition: width 0.3s ease;
}

.dots {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	gap: 6rpx;
	margin-top: 8rpx;
}

.dot {
	width: 10rpx;
	height: 10rpx;
	border-radius: 50%;
	background: #e5ddd3;
	flex-shrink: 0;
}

.dot--done {
	background: var(--meng-leaf, #7ec8a0);
}

.dot--current {
	background: var(--meng-accent-solid, #e87a4a);
	transform: scale(1.2);
}

.dot--imperfect,
.dot--imperfect-done {
	background: #ffb74d;
}

.hear-btn {
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 88rpx;
	padding: 10rpx 0;
	border-radius: 16rpx;
	background: rgba(255, 244, 232, 0.95);
}

.hear-btn:active {
	opacity: 0.85;
}

.hear-icon {
	width: 40rpx;
	height: 40rpx;
}

.hear-txt {
	margin-top: 2rpx;
	font-size: 18rpx;
	font-weight: 700;
	color: var(--meng-tab-active-text, #b84a28);
}

.status-row {
	flex-shrink: 0;
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 10rpx;
	margin-bottom: 10rpx;
	padding: 8rpx 12rpx;
	border-radius: 16rpx;
	background: rgba(255, 252, 248, 0.9);
}

.status-meng {
	width: 52rpx;
	height: 52rpx;
	flex-shrink: 0;
}

.status-body {
	flex: 1;
	min-width: 0;
}

.status-line {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 8rpx;
	flex-wrap: wrap;
}

.status-mark {
	font-size: 28rpx;
	font-weight: 800;
	color: #a8cfe6;
	line-height: 1;
}

.status-stroke {
	font-size: 24rpx;
	font-weight: 700;
	color: var(--meng-chocolate, #5c3d2e);
}

.pills {
	display: flex;
	flex-direction: row;
	gap: 4rpx;
	margin-left: 4rpx;
}

.pill {
	width: 14rpx;
	height: 6rpx;
	border-radius: 3rpx;
	background: #e5ddd3;
}

.pill--done {
	background: var(--meng-leaf, #7ec8a0);
}

.pill--now {
	background: var(--meng-accent-solid, #e87a4a);
}

.status-tip {
	display: block;
	margin-top: 4rpx;
	font-size: 20rpx;
	color: var(--meng-text-muted, #8a8076);
	line-height: 1.3;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.stage {
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.canvas-shell {
	position: relative;
	padding: 8rpx;
	border-radius: 18rpx;
	background: #fff;
	border: 1rpx solid var(--meng-border-warm, #e3d9c8);
	box-shadow: 0 4rpx 16rpx rgba(44, 36, 25, 0.06);
	flex-shrink: 0;
}

.score-card {
	position: absolute;
	top: calc(100% + 8rpx);
	right: 0;
	z-index: 20;
	width: 220rpx;
	padding: 8rpx 8rpx 10rpx;
	box-sizing: border-box;
	border-radius: 14rpx;
	background: rgba(255, 252, 248, 0.96);
	border: 1rpx solid rgba(232, 122, 74, 0.35);
	box-shadow: 0 6rpx 16rpx rgba(44, 36, 25, 0.14);
	pointer-events: none;
}

.score-card-title {
	display: block;
	font-size: 20rpx;
	font-weight: 800;
	color: #b84a28;
	text-align: center;
	margin-bottom: 2rpx;
	letter-spacing: 1rpx;
}

.dictation-canvas {
	display: block;
	border-radius: 6rpx;
}

.canvas-fallback {
	display: block;
	width: 140rpx;
	height: 140rpx;
	line-height: 140rpx;
	text-align: center;
	font-size: 26rpx;
	color: var(--meng-text-muted, #8a8076);
}

.canvas-guide {
	position: absolute;
	left: 8rpx;
	right: 8rpx;
	bottom: 8rpx;
	padding: 6rpx 8rpx;
	border-radius: 10rpx;
	background: rgba(255, 252, 248, 0.9);
	pointer-events: none;
}

.canvas-guide-txt {
	display: block;
	font-size: 18rpx;
	color: var(--meng-tip-text, #7a5f2a);
	text-align: center;
	line-height: 1.3;
}

.dock {
	flex-shrink: 0;
	padding-top: 8rpx;
}

.dock-msg {
	display: block;
	min-height: 36rpx;
	margin-bottom: 10rpx;
	padding: 0 4rpx;
	font-size: 22rpx;
	line-height: 1.4;
	text-align: center;
	color: var(--meng-text-secondary, #6d5e52);
}

.dock-msg--ok {
	color: #2e6b45;
	font-weight: 600;
}

.dock-msg--bad {
	color: #a85a28;
	font-weight: 600;
}

.dock-actions {
	display: flex;
	flex-direction: row;
	gap: 12rpx;
}

.btn {
	flex: 1;
	margin: 0 !important;
	padding: 0 12rpx !important;
	height: 68rpx !important;
	line-height: 68rpx !important;
	font-size: 28rpx !important;
	border-radius: 16rpx !important;
}

.btn--ghost {
	background: #fff !important;
	border: 1rpx solid var(--meng-border-warm, #e3d9c8) !important;
	color: var(--meng-chocolate, #5c3d2e) !important;
}

.btn--primary {
	background: var(--meng-accent-solid, #e87a4a) !important;
	color: #fff !important;
	border: none !important;
	font-weight: 700 !important;
}

.done-shell {
	height: 100%;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 28rpx 28rpx 40rpx;
}

.done-meng {
	width: 100rpx;
	height: 100rpx;
	margin-bottom: 8rpx;
}

.done-stars {
	display: flex;
	flex-direction: row;
	gap: 6rpx;
	margin-bottom: 10rpx;
}

.done-star {
	font-size: 34rpx;
	color: #e8e0d6;
}

.done-star--on {
	color: #ffb300;
}

.done-shell--perfect .done-title {
	color: var(--meng-tab-active-text, #b84a28);
}

.done-title {
	font-size: 36rpx;
	font-weight: 800;
	color: var(--meng-chocolate, #5c3d2e);
	margin-bottom: 8rpx;
}

.done-score {
	font-size: 28rpx;
	color: var(--meng-text-secondary, #6d5e52);
	font-weight: 700;
	margin-bottom: 8rpx;
}

.pass-line {
	font-size: 24rpx;
	color: #2e6b45;
	font-weight: 600;
	margin-bottom: 14rpx;
	text-align: center;
}

.pass-line--muted {
	color: var(--meng-text-muted, #8a8076);
}

.wrong-block {
	width: 100%;
	max-width: 480rpx;
	margin-bottom: 12rpx;
	padding: 10rpx 12rpx;
	box-sizing: border-box;
	border-radius: 14rpx;
	background: #fff8f0;
}

.wrong-label {
	display: block;
	font-size: 20rpx;
	color: var(--meng-text-muted, #8a8076);
	margin-bottom: 8rpx;
	text-align: center;
}

.wrong-chips {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	justify-content: center;
	gap: 8rpx;
}

.wrong-chip {
	min-width: 48rpx;
	padding: 4rpx 12rpx;
	border-radius: 10rpx;
	background: #fff;
	border: 1rpx solid rgba(232, 122, 74, 0.28);
	font-size: 30rpx;
	font-weight: 700;
	color: var(--meng-chocolate, #5c3d2e);
	text-align: center;
}

.done-msg {
	font-size: 24rpx;
	color: var(--meng-text-muted, #8a8076);
	text-align: center;
	line-height: 1.45;
	margin-bottom: 28rpx;
	padding: 0 16rpx;
}

.done-actions {
	width: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12rpx;
}

.back-btn {
	width: 58%;
	max-width: 360rpx;
	margin: 0 !important;
	border-radius: 18rpx;
	font-size: 28rpx;
	font-weight: 700;
	background: var(--meng-accent-solid, #e87a4a);
	border: none;
	color: #fff;
}

.back-btn--ghost {
	background: #fff !important;
	color: var(--meng-chocolate, #5c3d2e) !important;
	border: 1rpx solid var(--meng-border-warm, #e3d9c8) !important;
}
</style>
