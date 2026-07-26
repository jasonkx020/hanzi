<template>
	<view v-if="compact" class="write-compact-root">
		<!-- 每日一练内嵌：仅田字格 + 极简辅助 -->
		<view class="write-compact">
			<view class="canvas-shell canvas-shell--compact">
				<canvas
					v-if="canvasReady"
					:id="canvasId"
					:canvas-id="canvasId"
					class="practice-canvas"
					disable-scroll
					:width="canvasPixelSize"
					:height="canvasPixelSize"
					:style="canvasStyle"
					@touchstart="onTouchStart"
					@touchmove="onTouchMove"
					@touchend="onTouchEnd"
					@touchcancel="onTouchCancel"
				/>
				<text v-else class="canvas-fallback canvas-fallback--compact">{{
					mountPending ? '…' : displayChar
				}}</text>
			</view>
			<view
				v-if="!completed && !demoPlaying"
				class="write-compact-hint"
				@click.stop="playCompactStrokeHint"
			>
				<text class="write-compact-caption">{{ compactHintLabel }}</text>
				<text class="write-compact-hint-btn">🔊 听提示</text>
			</view>
			<text v-else-if="compactStatusLine" class="write-compact-caption write-compact-caption--static">{{
				compactStatusLine
			}}</text>
			<view class="write-compact-actions">
				<text class="write-compact-link" @click.stop="showStrokeDemo">笔顺</text>
				<text class="write-compact-sep">·</text>
				<text class="write-compact-link" @click.stop="resetPractice">重写</text>
			</view>
		</view>
	</view>

	<meng-sub-page
		v-else
		title="写字练习"
		subtitle="跟着写，一笔一笔来"
		avatar-pose="happy"
		:overlap-body="false"
	>
		<view class="write-page">
			<view class="hero-card">
				<view class="hero-leading">
					<view class="char-badge">
						<text class="char-badge-text">{{ displayChar }}</text>
					</view>
					<view v-if="heroPinyinDisplay.length" class="pinyin-row">
						<pinyin-four-lines-row
							:syllables="heroPinyinDisplay"
							size="xl"
							:sheet-width-rpx="268"
						/>
					</view>
				</view>
				<view class="hero-detail">
					<text v-if="sessionProgressLine" class="progress-line session-progress">{{ sessionProgressLine }}</text>
					<text class="progress-line progress-line--stroke">第 {{ currentStrokeNo }} / {{ strokeTotal }} 笔</text>
					<text v-if="!completed" class="hero-stroke-name">{{ currentStrokeGuidancePhrase || '准备写' }}</text>
				</view>
			</view>

			<view v-if="practiceSession.length" class="session-strip">
				<view class="pace-bar">
					<text class="pace-bar-label">练习模式</text>
					<view class="pace-switch" role="tablist">
						<view
							class="pace-opt"
							:class="{ 'pace-opt--active': practicePace === 'normal' }"
							hover-class="pace-opt--pressed"
							:hover-stay-time="100"
							@click="setPracticePace('normal')"
						>
							<text class="pace-opt-text">普通</text>
						</view>
						<view
							class="pace-opt"
							:class="{ 'pace-opt--active': practicePace === 'fast' }"
							hover-class="pace-opt--pressed"
							:hover-stay-time="100"
							@click="setPracticePace('fast')"
						>
							<text class="pace-opt-text">快速</text>
						</view>
					</view>
				</view>
				<view class="session-chips">
					<view
						v-for="(item, si) in practiceSession"
						:key="'ses-' + item.hanzi + '-' + si"
						class="session-chip"
						:class="{
							'session-chip--done': si < sessionIndex || (si === sessionIndex && completed),
							'session-chip--current': si === sessionIndex && !completed
						}"
						hover-class="session-chip--pressed"
						:hover-stay-time="100"
						@click="onSessionChipTap(si)"
					>
						<text class="session-chip-text">{{ item.hanzi }}</text>
					</view>
				</view>
				<text v-if="sessionSourceHint" class="session-hint">{{ sessionSourceHint }}</text>
			</view>

			<view class="canvas-workspace">
				<view class="action-col">
					<button
						class="action-btn action-btn--hint"
						hover-class="action-btn--pressed"
						:hover-stay-time="120"
						:disabled="completed || demoPlaying || introBusy"
						@click="onActionTap('hint')"
					>
						<text class="action-btn-icon">🔊</text>
						<text class="action-btn-label">听提示</text>
					</button>
					<button
						class="action-btn action-btn--ghost"
						hover-class="action-btn--pressed"
						:hover-stay-time="120"
						:disabled="demoPlaying || introBusy || completed"
						@click="onActionTap('demo')"
					>
						<text class="action-btn-label">看笔顺</text>
					</button>
					<button
						class="action-btn action-btn--ghost"
						hover-class="action-btn--pressed"
						:hover-stay-time="120"
						:disabled="demoPlaying"
						@click="onActionTap('reset')"
					>
						<text class="action-btn-label">重写</text>
					</button>
					<button
						class="action-btn action-btn--ghost"
						hover-class="action-btn--pressed"
						:hover-stay-time="120"
						:disabled="introBusy || demoPlaying"
						@click="onActionTap('refresh')"
					>
						<text class="action-btn-label">换一组</text>
					</button>
				</view>

				<view
					class="canvas-card"
					:class="{ 'canvas-card--listening': introBusy && practicePace === 'normal' }"
				>
					<view class="canvas-shell">
						<canvas
							v-if="canvasReady"
							:id="canvasId"
							:canvas-id="canvasId"
							class="practice-canvas"
							disable-scroll
							:width="canvasPixelSize"
							:height="canvasPixelSize"
							:style="canvasStyle"
							@touchstart="onTouchStart"
							@touchmove="onTouchMove"
							@touchend="onTouchEnd"
							@touchcancel="onTouchCancel"
						/>
						<text v-else class="canvas-fallback">{{ displayChar }}</text>
					</view>
					<view v-if="strokeTotal > 0 && !completed" class="stroke-dots" aria-hidden="true">
						<view
							v-for="n in strokeTotal"
							:key="'dot-' + n"
							class="stroke-dot"
							:class="{
								'stroke-dot--done': n < currentStrokeNo,
								'stroke-dot--current': n === currentStrokeNo
							}"
						/>
					</view>
				</view>
			</view>

			<view
				class="feedback"
				:class="feedbackType === 'bad' ? 'feedback--bad' : feedbackType === 'ok' ? 'feedback--ok' : 'feedback--idle'"
			>
				<text v-if="feedbackIcon" class="feedback-icon">{{ feedbackIcon }}</text>
				<text class="feedback-text">{{ feedbackDisplayText }}</text>
			</view>

			<view class="more-card">
				<view class="more-toggle" @click="showCharPicker = !showCharPicker">
					<text class="more-toggle-text">{{ showCharPicker ? '收起' : '指定一个字练' }}</text>
					<text class="more-toggle-chevron">{{ showCharPicker ? '▲' : '▼' }}</text>
				</view>
				<view v-if="showCharPicker" class="input-row">
					<input
						v-model="inputHanzi"
						class="hanzi-input"
						type="text"
						maxlength="8"
						placeholder="输入汉字，如 人、大"
						confirm-type="done"
						@confirm="applyHanzi"
					/>
					<button class="apply-btn" size="mini" @click="applyHanzi">确定</button>
				</view>
			</view>
		</view>
	</meng-sub-page>
</template>

<script>
import MengSubPage from '@/components/meng-sub-page.vue'
import drawNative from '@/utils/draw-native.js'
import { spellDisplayString } from '@/utils/cnchar-spell-display.js'
import {
	getCncharStrokeNameList,
	playStrokeGuidanceAudio,
	formatStrokeGuidancePhrase,
	resetStrokeAudioQueue
} from '@/utils/stroke-order-audio.js'
import {
	playOpusForDisplayPinyin,
	playPinyinLocalAudioSequence,
	sleepUnlessCancelled,
	stopLocalPinyinAudio
} from '@/utils/play-pinyin-local-audio.js'
import { speakHanzi, stopHanziSpeech } from '@/utils/speak-hanzi.js'
import { getAudioNarrator } from '@/utils/audio-settings.js'
import { formatStrokeLabelDisplay } from '@/data/stroke-name-pinyin.js'
import { getCurriculumPrefs } from '@/utils/curriculum-storage.js'
import { addCharWrongCount } from '@/utils/user-progress-storage.js'
import { recordStrokePractice } from '@/utils/achievement-stats-storage.js'
import {
	WRITE_PRACTICE_SESSION_SIZE,
	buildWritePracticeSession
} from '@/utils/write-practice-char-pool.js'
import {
	MENG_VOICE,
	playMengmengVoice,
	playMengmengVoiceOnce,
	stopMengmengVoice,
	waitForMengmengVoiceIdle
} from '@/utils/mengmeng-voice.js'
import PinyinFourLinesRow from '@/components/pinyin-four-lines-row.vue'
import { splitPinyinDisplayTokens } from '@/utils/pinyin-display-tokens.js'
import {
	WRITE_KID_AUDIO,
	WRITE_KID_STROKE_GUIDANCE_OPTS,
	settleWritePracticeAudio,
	sleepWriteMs
} from '@/utils/write-practice-audio.js'
import {
	WRITE_PRACTICE_PACE_FAST,
	WRITE_PRACTICE_PACE_NORMAL,
	getWritePracticePace,
	setWritePracticePace as persistWritePracticePace
} from '@/utils/write-practice-settings.js'

const CANVAS_LENGTH_FULL = 200
const CANVAS_LENGTH_COMPACT = 200
const CHAR_TO_STROKE_AUDIO_GAP_MS_COMPACT = 600

function fallbackSessionItems() {
	return ['大', '小', '天', '口', '手', '人', '山', '水']
		.slice(0, WRITE_PRACTICE_SESSION_SIZE)
		.map((hanzi) => ({ hanzi, pinyin: null }))
}

export default {
	components: { MengSubPage, PinyinFourLinesRow },
	props: {
		/** 每日一练内嵌：无换字输入、紧凑布局 */
		compact: {
			type: Boolean,
			default: false
		},
		initialHanzi: {
			type: String,
			default: ''
		},
		initialPinyin: {
			type: String,
			default: ''
		},
		canvasId: {
			type: String,
			default: 'write-practice-canvas'
		},
		/** 播放萌萌语音提示（每日一练内嵌建议开启） */
		mengVoice: {
			type: Boolean,
			default: false
		}
	},
	emits: ['compact-complete'],
	data() {
		return {
			hanzi: '人',
			inputHanzi: '人',
			pinyinText: '',
			strokeNames: [],
			strokeTotal: 0,
			activeStroke: 0,
			canvasReady: false,
			writer: null,
			mountGen: 0,
			attachTimer: null,
			feedbackText: '',
			feedbackType: '',
			completed: false,
			demoPlaying: false,
			introGen: 0,
			introBusy: false,
			introDelayTimer: null,
			history: [],
			practiceSession: [],
			sessionIndex: 0,
			sessionSourceHint: '',
			wrongAddedAt: 0,
			mountPending: false,
			showCharPicker: false,
			_welcomeTimer: null,
			/** normal | fast：快速模式无语音引导，保留写完一字后的文字反馈 */
			practicePace: WRITE_PRACTICE_PACE_NORMAL
		}
	},
	computed: {
		isFastPace() {
			return !this.compact && this.practicePace === WRITE_PRACTICE_PACE_FAST
		},
		displayChar() {
			const c = String(this.hanzi || '').trim().charAt(0)
			return c || '—'
		},
		pinyinTokens() {
			const tokens = splitPinyinDisplayTokens(this.pinyinText)
			if (tokens.length) return tokens
			const s = String(this.pinyinText || '').trim()
			return s ? [s] : []
		},
		/** 顶栏只展示一个音节，格高与汉字徽章对齐 */
		heroPinyinDisplay() {
			const t = this.pinyinTokens
			return t.length ? [t[0]] : []
		},
		sessionCharNo() {
			if (!this.practiceSession.length) return 0
			return Math.min(this.practiceSession.length, this.sessionIndex + 1)
		},
		sessionProgressLine() {
			if (!this.practiceSession.length) return ''
			return `本组第 ${this.sessionCharNo} / ${this.practiceSession.length} 个字`
		},
		currentStrokeNo() {
			return Math.min(this.strokeTotal || 1, this.activeStroke + 1)
		},
		currentStrokeLabel() {
			const name = this.strokeNames[this.activeStroke]
			return name ? formatStrokeLabelDisplay(name) : ''
		},
		currentStrokeGuidance() {
			const label = this.strokeNames[this.activeStroke]
			if (!label) return ''
			return `请写：${formatStrokeGuidancePhrase(this.activeStroke, label)}`
		},
		currentStrokeGuidancePhrase() {
			const label = this.strokeNames[this.activeStroke]
			if (!label) return ''
			return formatStrokeGuidancePhrase(this.activeStroke, label)
		},
		canvasLength() {
			return this.compact ? CANVAS_LENGTH_COMPACT : CANVAS_LENGTH_FULL
		},
		canvasPixelSize() {
			return this.canvasLength + 30
		},
		canvasStyle() {
			const px = this.canvasPixelSize
			return { width: px + 'px', height: px + 'px', display: 'block' }
		},
		feedbackIcon() {
			if (this.introBusy || this.demoPlaying) return ''
			if (this.feedbackType === 'ok') return '✓'
			if (this.feedbackType === 'bad') return '✗'
			return ''
		},
		feedbackDisplayText() {
			if (this.demoPlaying) return '笔顺动画播放中，看完再写'
			if (this.introBusy && !this.isFastPace) return '正在播放提示，听一听再写'
			if (this.feedbackText) return this.feedbackText
			if (this.completed) return '全部写对了，太棒了！'
			return '用手指按住田字格，写出当前这一笔，松手自动判断'
		},
		compactHintLabel() {
			if (!this.compact || this.completed || this.demoPlaying) return ''
			if (this.currentStrokeGuidancePhrase) return this.currentStrokeGuidancePhrase
			if (this.strokeTotal > 0) {
				return `第 ${this.currentStrokeNo} / ${this.strokeTotal} 笔`
			}
			return '当前笔画'
		},
		compactStatusLine() {
			if (!this.compact) return ''
			if (this.completed) return '全部写对了'
			if (this.demoPlaying) return '笔顺演示中'
			return ''
		},
		charToStrokeGapMs() {
			return this.compact ? CHAR_TO_STROKE_AUDIO_GAP_MS_COMPACT : WRITE_KID_AUDIO.AFTER_CHAR_MS
		}
	},
	onLoad(query) {
		if (this.compact) return
		this.practicePace = getWritePracticePace()
		const from = query?.hanzi ? decodeURIComponent(query.hanzi) : ''
		const pure = String(from || '').match(/[\u4e00-\u9fff]/)?.[0]
		if (pure) {
			this.hanzi = pure
			this.inputHanzi = pure
		}
	},
	watch: {
		initialHanzi(val, oldVal) {
			if (!this.compact || !val || val === oldVal) return
			const pure = String(val || '').match(/[\u4e00-\u9fff]/)?.[0]
			if (!pure || (pure === this.hanzi && this.writer)) return
			this.initCompactPractice(pure, this.initialPinyin)
		}
	},
	mounted() {
		if (this.compact) {
			this.initCompactPractice()
		}
	},
	onReady() {
		if (this.compact) return
		this.bootstrap()
	},
	onShow() {
		if (this.compact || this.isFastPace) return
		this.clearWelcomeTimer()
		this._welcomeTimer = setTimeout(() => {
			this._welcomeTimer = null
			if (this.introBusy || this.demoPlaying || this.completed) return
			playMengmengVoiceOnce(MENG_VOICE.STROKE_WELCOME, 'meng_voice_write_practice_welcome', {
				debounceMs: 600
			}).catch(() => {})
		}, WRITE_KID_AUDIO.WELCOME_DELAY_MS)
	},
	onUnload() {
		this.clearWelcomeTimer()
		this.stopAllPracticeAudio()
		stopMengmengVoice()
	},
	onHide() {
		this.clearWelcomeTimer()
		this.stopAllPracticeAudio()
		stopMengmengVoice()
	},
	methods: {
		clearWelcomeTimer() {
			if (this._welcomeTimer != null) {
				clearTimeout(this._welcomeTimer)
				this._welcomeTimer = null
			}
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
		/** 内嵌在每日一练：子组件无 onReady，须在 mounted 后挂载 canvas */
		initCompactPractice(hanzi, pinyin) {
			const pure =
				String(hanzi || this.initialHanzi || '')
					.match(/[\u4e00-\u9fff]/)?.[0] || ''
			if (!pure) return
			const py = pinyin != null ? pinyin : this.initialPinyin
			this.$nextTick(() => {
				this.$nextTick(() => {
					this.applyChar(pure, py)
				})
			})
		},
		async bootstrap() {
			const pin = this.displayChar
			await this.loadPracticeSession(pin, true, { pinFirst: pin })
			this.startSessionChar(this.sessionIndex)
		},
		startSessionChar(index) {
			const i = Math.max(0, Math.min(this.practiceSession.length - 1, Number(index) || 0))
			this.sessionIndex = i
			const cur = this.practiceSession[i]
			if (!cur) {
				this.mountTestWriter()
				return
			}
			this.hanzi = cur.hanzi
			this.inputHanzi = cur.hanzi
			this.history = []
			this.completed = false
			this.activeStroke = 0
			this.refreshMeta(cur.pinyin)
			this.mountTestWriter()
		},
		async loadPracticeSession(excludeChar, forceNew = false, opts = {}) {
			if (!forceNew && this.practiceSession.length) return
			try {
				const session = await buildWritePracticeSession({
					excludeChar: excludeChar != null ? excludeChar : this.displayChar,
					shuffleSalt: Date.now(),
					pinFirst: opts.pinFirst || ''
				})
				this.practiceSession = session.items || []
				this.sessionSourceHint = session.sourceHint || ''
			} catch (_) {
				this.practiceSession = fallbackSessionItems()
				this.sessionSourceHint = ''
			}
			if (!this.practiceSession.length) {
				this.practiceSession = fallbackSessionItems()
			}
			this.sessionIndex = 0
		},
		refreshMeta(externalPinyin) {
			const pyIn = String(externalPinyin != null ? externalPinyin : this.initialPinyin || '')
				.replace(/\s+/g, ' ')
				.trim()
			if (pyIn) {
				this.pinyinText = pyIn
			} else {
				try {
					this.pinyinText = spellDisplayString(this.displayChar, 'poly', 'tone', 'array', 'low')
				} catch (_) {
					this.pinyinText = ''
				}
			}
			this.strokeNames = getCncharStrokeNameList(this.displayChar)
			this.strokeTotal = this.strokeNames.length || 0
		},
		applyChar(hanzi, pinyin) {
			const pure = String(hanzi || '').match(/[\u4e00-\u9fff]/)?.[0]
			if (!pure) return
			this.mountPending = true
			this.stopAllPracticeAudio()
			this.hanzi = pure
			this.inputHanzi = pure
			this.history = []
			this.completed = false
			this.activeStroke = 0
			this.refreshMeta(pinyin)
			this.mountTestWriter()
		},
		pushHistory(text) {
			this.history = [...this.history, text].slice(-12)
		},
		historyItemClass(line) {
			const s = String(line || '')
			if (s.includes('✓')) return 'history-item--ok'
			if (s.includes('✗')) return 'history-item--bad'
			return ''
		},
		/** 停字音 / 笔画音 / TTS，并作废进行中的引导（不销毁 canvas） */
		stopPracticePlayback() {
			this.clearWelcomeTimer()
			this.introGen++
			this.introBusy = false
			if (this.introDelayTimer != null) {
				clearTimeout(this.introDelayTimer)
				this.introDelayTimer = null
			}
			if (this.writer && typeof this.writer.stop === 'function') {
				try {
					this.writer.stop()
				} catch (_) {}
			}
			resetStrokeAudioQueue()
			stopLocalPinyinAudio()
			stopHanziSpeech()
		},
		async settlePracticeAudio(extraMs = 0) {
			await settleWritePracticeAudio({ stopMeng: true, extraMs })
		},
		/** 换字、演示、离开页：停音 + 取消挂载 + 销毁 writer */
		stopAllPracticeAudio() {
			stopMengmengVoice()
			this.demoPlaying = false
			this.stopPracticePlayback()
			if (this.attachTimer != null) {
				clearTimeout(this.attachTimer)
				this.attachTimer = null
			}
			this.mountGen++
			if (this.writer) {
				try {
					if (typeof this.writer.destroy === 'function') {
						this.writer.destroy()
					}
				} catch (_) {}
				this.writer = null
			}
		},
		cancelWriteIntro() {
			this.stopPracticePlayback()
		},
		waitIntroGap(ms, gen) {
			const delay = Math.max(0, Number(ms) || 0)
			if (!delay || gen !== this.introGen) return Promise.resolve()
			return new Promise((resolve) => {
				this.introDelayTimer = setTimeout(() => {
					this.introDelayTimer = null
					resolve()
				}, delay)
			})
		},
		isFastPaceActive() {
			return this.isFastPace
		},
		shouldPlayPracticeVoice() {
			if (this.compact) return !!this.mengVoice
			return this.practicePace === WRITE_PRACTICE_PACE_NORMAL
		},
		setPracticePace(pace) {
			const next =
				pace === WRITE_PRACTICE_PACE_FAST ? WRITE_PRACTICE_PACE_FAST : WRITE_PRACTICE_PACE_NORMAL
			if (next === this.practicePace) return
			this.tactileFeedback()
			this.practicePace = persistWritePracticePace(next)
			this.clearWelcomeTimer()
			this.stopAllPracticeAudio()
			if (this.compact || this.demoPlaying) return
			if (!this.writer) return
			if (this.completed) {
				this.startSessionChar(this.sessionIndex)
				return
			}
			this.$nextTick(() => {
				if (this.isFastPaceActive()) {
					this.runWriteIntroFast(this.activeStroke, {
						playCharFirst: this.activeStroke === 0
					})
				} else {
					this.runWriteIntro(this.activeStroke, {
						playCharFirst: this.activeStroke === 0
					})
				}
			})
		},
		/** 快速模式：无语音，直接高亮当前应收笔 */
		runWriteIntroFast(strokeIndex, opts = {}) {
			const idx = Number(strokeIndex)
			if (!Number.isFinite(idx) || idx < 0) return
			const label = this.strokeNames[idx]
			this.feedbackType = ''
			if (label) {
				this.feedbackText = `请写：${formatStrokeGuidancePhrase(idx, label)}`
			} else if (opts.playCharFirst) {
				this.feedbackText = `写「${this.displayChar}」`
			} else {
				this.feedbackText = '快速模式：直接写当前这一笔'
			}
			this.$nextTick(() => this.applyStrokeGuideBlink(idx))
		},
		/** 进入/换字：先整字读音；之后仅高亮+笔画名 */
		async runWriteIntro(strokeIndex, opts = {}) {
			if (this.isFastPaceActive()) {
				this.runWriteIntroFast(strokeIndex, opts)
				return
			}
			this.clearWelcomeTimer()
			stopMengmengVoice()
			const playCharFirst = opts.playCharFirst === true
			const gen = ++this.introGen
			this.introBusy = true
			try {
				if (playCharFirst) {
					if (!this.compact) {
						this.feedbackText = `先听「${this.displayChar}」的读音`
						this.feedbackType = ''
					}
					await this.playCharReading(gen)
					if (gen !== this.introGen || this.completed || this.demoPlaying) return
					if (!this.compact) {
						this.feedbackText = '想一想，准备写第一笔…'
						this.feedbackType = ''
					}
					await this.waitIntroGap(this.charToStrokeGapMs, gen)
					if (gen !== this.introGen || this.completed || this.demoPlaying) return
				}
				await this.beginStrokeGuidance(strokeIndex, gen)
			} finally {
				if (gen === this.introGen) this.introBusy = false
			}
		},
		/** @param {number} [introGen] runWriteIntro 会话 id，换字后丢弃在途播放 */
		async playCharReading(introGen) {
			const gen = introGen != null ? introGen : this.introGen
			const charSnap = this.displayChar
			const cancelled = () => gen !== this.introGen || this.displayChar !== charSnap
			stopMengmengVoice()
			stopLocalPinyinAudio()
			stopHanziSpeech()
			const narrator = getAudioNarrator()
			const tokens = this.pinyinTokens
			if (tokens.length > 1) {
				await playPinyinLocalAudioSequence(tokens, {
					narrator,
					gapMs: WRITE_KID_AUDIO.PINYIN_TOKEN_GAP_MS,
					isCancelled: cancelled
				})
				if (cancelled()) return
				return
			}
			if (tokens.length === 1) {
				await playOpusForDisplayPinyin(tokens[0], {
					narrator,
					gapMs: 0,
					isCancelled: cancelled
				})
				if (cancelled()) return
				return
			}
			const py = String(this.pinyinText || '').trim()
			if (py) {
				await playOpusForDisplayPinyin(py, {
					narrator,
					gapMs: 0,
					isCancelled: cancelled
				})
				if (cancelled()) return
				return
			}
			if (cancelled()) return
			speakHanzi(this.displayChar)
			await sleepUnlessCancelled(850, cancelled)
		},
		/** 笔画引导高亮：须在对应语音播完后调用，避免声画抢步 */
		applyStrokeGuideBlink(strokeIndex) {
			const idx = Number(strokeIndex)
			if (!Number.isFinite(idx) || idx < 0 || this.completed || this.demoPlaying) return
			if (this.writer && typeof this.writer.setTestStrokeGuide === 'function') {
				this.writer.setTestStrokeGuide(true, { blink: true, blinkTimes: 3 })
			}
		},
		async beginStrokeGuidance(strokeIndex, introGen) {
			const gen = introGen != null ? introGen : this.introGen
			const charSnap = this.displayChar
			const cancelled = () => gen !== this.introGen || this.displayChar !== charSnap
			const idx = Number(strokeIndex)
			if (!Number.isFinite(idx) || idx < 0 || this.completed || this.demoPlaying) return
			if (cancelled()) return
			const label = this.strokeNames[idx]
			if (label && !this.compact) {
				this.feedbackText = `请写：${formatStrokeGuidancePhrase(idx, label)}`
				this.feedbackType = ''
			}
			if (this.isFastPaceActive()) {
				if (cancelled()) return
				this.applyStrokeGuideBlink(idx)
				return
			}
			if (label) {
				await settleWritePracticeAudio({ stopMeng: false })
				if (cancelled()) return
				await playStrokeGuidanceAudio(idx, label, {
					narrator: getAudioNarrator(),
					isCancelled: cancelled,
					...WRITE_KID_STROKE_GUIDANCE_OPTS
				})
				if (cancelled()) return
				await waitForMengmengVoiceIdle().catch(() => {})
				if (cancelled()) return
			}
			this.applyStrokeGuideBlink(idx)
		},
		async playCurrentStrokeAudio() {
			if (this.completed || this.demoPlaying) return
			this.clearWelcomeTimer()
			stopMengmengVoice()
			// 允许打断进行中的引导并重播（勿因 introBusy 静默 return）
			this.cancelWriteIntro()
			if (this.isFastPaceActive()) {
				await this.beginStrokeGuidance(this.activeStroke)
				return
			}
			const gen = ++this.introGen
			this.introBusy = true
			try {
				await this.beginStrokeGuidance(this.activeStroke, gen)
			} finally {
				if (gen === this.introGen) this.introBusy = false
			}
		},
		async playMengThenStrokeGuidance(voiceId, strokeIndex) {
			const gen = this.introGen
			const cancelled = () => gen !== this.introGen || this.completed || this.demoPlaying
			if (voiceId) {
				await this.playMengVoiceIf(voiceId, { minGapMs: 0 })
				if (cancelled()) return
				await waitForMengmengVoiceIdle()
				if (cancelled()) return
				await sleepWriteMs(WRITE_KID_AUDIO.AFTER_MENG_MS)
				if (cancelled()) return
			}
			await this.beginStrokeGuidance(strokeIndex, gen)
		},
		/** 内嵌模式：高亮当前应收笔（与全页共用，须在语音后调用） */
		applyCompactStrokeGuideVisual(strokeIndex) {
			if (!this.compact || this.completed || this.demoPlaying) return
			const idx =
				strokeIndex != null && Number.isFinite(Number(strokeIndex))
					? Number(strokeIndex)
					: this.activeStroke
			if (idx < 0) return
			this.applyStrokeGuideBlink(idx)
		},
		tactileFeedback() {
			try {
				uni.vibrateShort({ type: 'light' })
			} catch (_) {}
		},
		onActionTap(kind) {
			this.tactileFeedback()
			if (kind === 'hint') this.playCurrentStrokeAudio()
			else if (kind === 'demo') this.showStrokeDemo()
			else if (kind === 'reset') this.resetPractice()
			else if (kind === 'refresh') this.refreshPracticeSession()
		},
		/** 点击本组推荐字，切换到该字练习 */
		onSessionChipTap(index) {
			if (this.demoPlaying) return
			const i = Number(index)
			if (!Number.isFinite(i) || i < 0 || i >= this.practiceSession.length) return
			if (i === this.sessionIndex && !this.completed) return
			this.tactileFeedback()
			this.stopAllPracticeAudio()
			if (!this.compact) {
				const item = this.practiceSession[i]
				this.feedbackType = ''
				this.feedbackText = item ? `切换到「${item.hanzi}」` : '切换练习字'
			}
			this.startSessionChar(i)
		},
		/** 内嵌模式：用户点击后直接播当前笔画名（不先播萌萌「点听提示」以免占住链路） */
		playCompactStrokeHint() {
			if (this.completed || this.demoPlaying) return
			this.playCurrentStrokeAudio()
		},
		playMengVoiceIf(id, opts) {
			if (!this.shouldPlayPracticeVoice()) return Promise.resolve(false)
			return playMengmengVoice(id, opts).catch(() => false)
		},
		compactToast() {
			/* 每日一练内嵌：不弹 Toast，避免打断书写 */
		},
		handleTestStatus(index, status, data = {}) {
			const strokeNo = Number(index) + 1
			if (status === 'correct') {
				if (this.compact) {
					this.scheduleCompactCorrectFeedback(strokeNo)
				} else {
					this.feedbackType = 'ok'
					this.feedbackText =
						strokeNo >= this.strokeTotal
							? `第 ${strokeNo} 笔写对了`
							: `第 ${strokeNo} 笔写对了，请写第 ${strokeNo + 1} 笔`
				}
				this.activeStroke = strokeNo
				if (!this.compact) this.pushHistory(`第 ${strokeNo} 笔 ✓`)
				if (!this.completed && strokeNo < this.strokeTotal) {
					if (this.compact) {
						this.$nextTick(() => this.applyCompactStrokeGuideVisual(strokeNo))
					} else {
						this.scheduleNextStrokeGuidance(strokeNo)
					}
				}
				return
			}
			if (status === 'mistake') {
				if (data.reason === 'wrongStroke') {
					if (!this.compact) {
						this.feedbackType = 'bad'
						this.feedbackText = '这一笔顺序不对，请按提示写当前这一笔'
					} else {
						this.compactToast('请写当前笔')
					}
					return
				}
				if (
					data.reason === 'direction' ||
					data.reason === 'directionReverse' ||
					data.reason === 'endpoints'
				) {
					if (!this.compact) {
						this.feedbackType = 'bad'
						if (data.reason === 'directionReverse') {
							this.feedbackText = '笔顺反了，请从起笔写到收笔'
						} else if (data.reason === 'endpoints') {
							this.feedbackText = '起笔或收笔位置不对，请按标准笔顺从头写到尾'
						} else {
							this.feedbackText = `书写方向偏差过大（约 ${data.directionAngleDeg || '?'}°），请顺着这一笔写，不要横穿`
						}
					} else {
						this.compactToast('请按笔顺方向写')
					}
					return
				}
				if (data.reason === 'tooShort') {
					if (!this.compact) {
						this.feedbackType = 'bad'
						this.feedbackText = '笔画太短啦，请按住田字格多拖一段再松手'
					}
					this.compactToast('请画完整一笔')
					if (!this.compact) this.pushHistory(`第 ${strokeNo} 笔 ✗ 笔画太短`)
					return
				}
				const expectedNo = Number(data.expectedStroke) + 1
				const expectedLabel =
					this.strokeNames[data.expectedStroke] != null
						? this.strokeNames[data.expectedStroke]
						: ''
				const expectedPhrase = expectedLabel
					? formatStrokeGuidancePhrase(data.expectedStroke, expectedLabel)
					: ''
				if (!this.compact) {
					this.feedbackType = 'bad'
					const shapeHint =
						data.reason === 'unstable'
							? '笔画不够贴合，'
							: typeof data.meanDist === 'number' &&
								  typeof data.meanMax === 'number' &&
								  data.meanDist > data.meanMax * 0.85
								? '与标准字不够重合，'
								: ''
					this.feedbackText = expectedPhrase
						? `${shapeHint}这一笔不对。应先写${expectedPhrase}，请重画`
						: `${shapeHint}这一笔不对，请按提示重画第 ${expectedNo} 笔`
					this.pushHistory(`第 ${strokeNo} 笔 ✗ → 应收第 ${expectedNo} 笔`)
				} else {
					this.compactToast(expectedPhrase ? `应写${expectedPhrase}` : '再试一次')
				}
				if (Number.isFinite(data.expectedStroke) && data.expectedStroke >= 0) {
					const expected = data.expectedStroke
					if (this.compact) {
						this.activeStroke = expected
						this.scheduleRetryStrokeGuidance(expected, true)
					} else {
						this.activeStroke = expected
						this.scheduleRetryStrokeGuidance(expected, false)
					}
				}
				const now = Date.now()
				if (now - this.wrongAddedAt > 300) {
					addCharWrongCount(this.displayChar, 1, this.curriculumDims())
					this.wrongAddedAt = now
				}
				return
			}
			if (status === 'complete') {
				this.completed = true
				this.activeStroke = this.strokeTotal
				recordStrokePractice(1)
				this.scheduleCompleteFeedback()
			}
		},
		scheduleCompactCorrectFeedback(_strokeNo) {
			// 每日一练：鼓励音与书写并行，切勿 introBusy 锁田字格（否则下一笔要点「听提示」才能写）
			this.playMengVoiceIf(MENG_VOICE.DAILY_STROKE_OK, { minGapMs: 400 }).catch(() => {})
		},
		scheduleNextStrokeGuidance(nextStrokeIndex) {
			if (this.isFastPaceActive()) {
				const strokeNo = Number(nextStrokeIndex) + 1
				this.feedbackType = 'ok'
				this.feedbackText =
					strokeNo >= this.strokeTotal
						? `第 ${strokeNo} 笔写对了`
						: `第 ${strokeNo} 笔写对了，请写第 ${strokeNo + 1} 笔`
				this.$nextTick(() => this.applyStrokeGuideBlink(nextStrokeIndex))
				return
			}
			const gen = ++this.introGen
			this.introBusy = true
			;(async () => {
				try {
					await settleWritePracticeAudio({ stopMeng: true })
					await this.playMengVoiceIf(MENG_VOICE.STROKE_WRITE_OK, { minGapMs: 0 })
					await waitForMengmengVoiceIdle()
					await sleepWriteMs(WRITE_KID_AUDIO.AFTER_OK_MS)
					if (gen !== this.introGen || this.completed || this.demoPlaying) return
					await this.beginStrokeGuidance(nextStrokeIndex, gen)
				} finally {
					if (gen === this.introGen) this.introBusy = false
				}
			})()
		},
		scheduleRetryStrokeGuidance(strokeIndex, compact) {
			if (!compact && this.isFastPaceActive()) {
				this.$nextTick(() => this.applyStrokeGuideBlink(strokeIndex))
				return
			}
			// 每日一练内嵌：只高亮 + 轻提示音，不锁书写
			if (compact) {
				this.$nextTick(() => this.applyCompactStrokeGuideVisual(strokeIndex))
				this.playMengVoiceIf(MENG_VOICE.DAILY_STROKE_WRONG, { minGapMs: 400 }).catch(() => {})
				return
			}
			const gen = ++this.introGen
			this.introBusy = true
			;(async () => {
				try {
					await settleWritePracticeAudio({ stopMeng: true })
					await this.playMengVoiceIf(MENG_VOICE.STROKE_WRITE_WRONG, { minGapMs: 0 })
					await waitForMengmengVoiceIdle()
					await sleepWriteMs(WRITE_KID_AUDIO.AFTER_WRONG_MS)
					if (gen !== this.introGen || this.completed || this.demoPlaying) return
					await this.beginStrokeGuidance(strokeIndex, gen)
				} finally {
					if (gen === this.introGen) this.introBusy = false
				}
			})()
		},
		scheduleCompleteFeedback() {
			const gen = ++this.introGen
			if (this.isFastPaceActive()) {
				;(async () => {
					this.feedbackType = 'ok'
					this.feedbackText = '全部笔画写对了，笔顺正确！'
					this.pushHistory('✓ 全部通过')
					await sleepWriteMs(450)
					if (gen !== this.introGen) return
					await this.advanceAfterCharComplete(gen)
				})()
				return
			}
			this.introBusy = true
			;(async () => {
				try {
					await settleWritePracticeAudio({ stopMeng: true })
					if (this.compact) {
						this.compactToast('全部写对了', 'success')
						await this.playMengVoiceIf(MENG_VOICE.DAILY_COMPLETE, { minGapMs: 0 })
						await waitForMengmengVoiceIdle()
						this.$emit('compact-complete')
					} else {
						this.feedbackType = 'ok'
						this.feedbackText = '全部笔画写对了，笔顺正确！'
						this.pushHistory('✓ 全部通过')
						await this.playMengVoiceIf(MENG_VOICE.STROKE_ALL_DONE, { minGapMs: 0 })
						await waitForMengmengVoiceIdle()
						await sleepWriteMs(WRITE_KID_AUDIO.AFTER_SESSION_CHAR_MS)
						if (gen !== this.introGen) return
						await this.advanceAfterCharComplete(gen)
					}
				} finally {
					if (gen === this.introGen) this.introBusy = false
				}
			})()
		},
		async advanceAfterCharComplete(gen) {
			if (gen != null && gen !== this.introGen) return
			if (this.sessionIndex < this.practiceSession.length - 1) {
				const next = this.practiceSession[this.sessionIndex + 1]
				this.feedbackType = 'ok'
				this.feedbackText = `写得好！下一个字：${next.hanzi}`
				await sleepWriteMs(400)
				if (gen != null && gen !== this.introGen) return
				this.startSessionChar(this.sessionIndex + 1)
				return
			}
			this.feedbackType = 'ok'
			this.feedbackText = `一组 ${WRITE_PRACTICE_SESSION_SIZE} 个字写完啦，再来一组新的`
			await sleepWriteMs(500)
			if (gen != null && gen !== this.introGen) return
			await this.refreshPracticeSession()
		},
		async refreshPracticeSession() {
			this.stopAllPracticeAudio()
			this.canvasReady = false
			const prev = this.displayChar
			await this.loadPracticeSession(prev, true)
			this.startSessionChar(0)
		},
		sharedDrawOpts() {
			return {
				vm: this,
				style: {
					length: this.canvasLength,
					charInsetRatio: 0.12,
					strokeColor: '#2c3e50',
					outlineColor: '#d5d5d5',
					currentColor: '#ff7043',
					drawingColor: '#ff7043',
					drawingWidth: 5,
					guideStrokeColor: '#ff6b9d',
					highlightColor: '#ffab40'
				},
				line: {
					show: true,
					borderColor: '#e0cfc0',
					centerColor: '#d4c4b4',
					diagonalColor: '#ebe0d6'
				},
				watermark: { text: '', alpha: 0 }
			}
		},
		teardownWriter() {
			this.stopPracticePlayback()
			if (this.attachTimer) {
				clearTimeout(this.attachTimer)
				this.attachTimer = null
			}
			this.mountGen++
			if (this.writer) {
				try {
					if (typeof this.writer.destroy === 'function') {
						this.writer.destroy()
					}
				} catch (_) {}
				this.writer = null
			}
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
			const delayMs = this.compact ? 120 : 48
			this.$nextTick(() => {
				this.$nextTick(() => {
					this.attachTimer = setTimeout(attach, delayMs)
				})
			})
		},
		onTestWriterReady(writer) {
			const total = writer?.charData?.medians?.length || 0
			if (total) this.strokeTotal = total
			if (writer && typeof writer.updateCanvasRect === 'function') {
				writer.updateCanvasRect()
			}
			if (this.completed || this.demoPlaying) return
			if (this.compact) {
				this.$nextTick(() => this.applyCompactStrokeGuideVisual(this.activeStroke))
			} else {
				this.$nextTick(() =>
					this.runWriteIntro(this.activeStroke, { playCharFirst: this.activeStroke === 0 })
				)
			}
		},
		mountTestWriter() {
			this.stopAllPracticeAudio()
			this.completed = false
			this.activeStroke = 0
			if (!this.compact) {
				this.feedbackText = this.isFastPaceActive()
					? '快速模式：直接写当前这一笔'
					: '请用手指在下方田字格写出当前这一笔，写完后松手'
				this.feedbackType = ''
			}
			this.demoPlaying = false
			const ch = this.displayChar
			if (!ch || ch === '—') return
			this.scheduleMount(() => {
				try {
					const vm = this
					this.writer = drawNative(ch, {
						...this.sharedDrawOpts(),
						el: `#${this.canvasId}`,
						type: drawNative.TYPE.TEST,
						animation: { autoAnimate: false },
						test: {
							testStrictOrder: true,
							testDebugLog: true,
							showHintAfterMisses: 2,
							onWriterReady: (writer) => vm.onTestWriterReady(writer),
							onTestStatus: ({ index, status, data }) => {
								vm.handleTestStatus(index, status, data || {})
							}
						}
					})
					vm.mountPending = false
				} catch (e) {
					vm.mountPending = false
					vm.canvasReady = false
					console.warn('[write-practice] mount test', e)
					if (!vm.compact) {
						uni.showToast({ title: '该字暂不支持练习', icon: 'none' })
					}
				}
			})
		},
		mountDemoWriter() {
			const ch = this.displayChar
			if (!ch || ch === '—') return
			this.demoPlaying = true
			if (!this.compact) this.feedbackText = '笔顺演示中…'
			this.scheduleMount(() => {
				try {
					const vm = this
					this.writer = drawNative(ch, {
						...this.sharedDrawOpts(),
						el: `#${this.canvasId}`,
						type: drawNative.TYPE.ANIMATION,
						animation: {
							autoAnimate: true,
							loopAnimate: false,
							strokeAnimationSpeed: 0.55,
							strokeDurationMs: 880,
							delayBetweenStrokes: 120,
							animateComplete() {
								vm.demoPlaying = false
								vm.mountTestWriter()
							}
						}
					})
				} catch (e) {
					this.demoPlaying = false
					if (!this.compact) {
						uni.showToast({ title: '笔顺演示失败', icon: 'none' })
					}
					this.mountTestWriter()
				}
			})
		},
		async showStrokeDemo() {
			if (this.demoPlaying || this.completed) return
			if (!this.isFastPaceActive() && this.introBusy) return
			this.clearWelcomeTimer()
			if (this.isFastPaceActive()) {
				this.stopAllPracticeAudio()
				this.mountDemoWriter()
				return
			}
			const gen = ++this.introGen
			this.introBusy = true
			try {
				await settleWritePracticeAudio({ stopMeng: true })
				await this.playMengVoiceIf(MENG_VOICE.STROKE_MODE_ANIM, { minGapMs: 0 })
				await waitForMengmengVoiceIdle()
				await sleepWriteMs(WRITE_KID_AUDIO.AFTER_MENG_MS)
				if (gen !== this.introGen) return
				this.stopAllPracticeAudio()
				this.mountDemoWriter()
			} finally {
				if (gen === this.introGen) this.introBusy = false
			}
		},
		resetPractice() {
			this.stopPracticePlayback()
			this.completed = false
			this.activeStroke = 0
			if (!this.compact) {
				this.feedbackText = this.isFastPaceActive()
					? '已重置，请写第一笔'
					: '已重置，先听字音再写第一笔'
				this.feedbackType = ''
			}
			if (this.writer && typeof this.writer.resetStrokeTest === 'function') {
				this.writer.resetStrokeTest()
				if (this.compact) {
					this.$nextTick(() => this.applyCompactStrokeGuideVisual(0))
				} else if (this.isFastPaceActive()) {
					this.$nextTick(() => this.runWriteIntroFast(0, { playCharFirst: true }))
				} else {
					this.$nextTick(() => this.runWriteIntro(0, { playCharFirst: true }))
				}
				return
			}
			this.mountTestWriter()
		},
		async applyHanzi() {
			const pure = String(this.inputHanzi || '').match(/[\u4e00-\u9fff]/)?.[0]
			if (!pure) {
				uni.showToast({ title: '请输入汉字', icon: 'none' })
				return
			}
			this.stopAllPracticeAudio()
			this.inputHanzi = pure
			await this.loadPracticeSession(pure, true, { pinFirst: pure })
			this.startSessionChar(0)
		},
		pickCanvasTouch(e) {
			if (!e) return null
			return (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || null
		},
		onTouchStart(e) {
			if (this.completed || this.demoPlaying || this.introBusy) return
			const t = this.pickCanvasTouch(e)
			if (t && this.writer?.handleTouchStart) {
				this.writer.handleTouchStart(t, e.detail)
			}
		},
		onTouchMove(e) {
			if (this.completed || this.demoPlaying || this.introBusy) return
			const t = this.pickCanvasTouch(e)
			if (t && this.writer?.handleTouchMove) {
				this.writer.handleTouchMove(t, e.detail)
			}
		},
		onTouchEnd(e) {
			if (this.completed || this.demoPlaying || this.introBusy) return
			const t =
				(e && e.changedTouches && e.changedTouches[0]) ||
				this.pickCanvasTouch(e)
			if (this.writer?.handleTouchEnd) {
				this.writer.handleTouchEnd(t, e && e.detail)
			}
		},
		onTouchCancel(e) {
			this.onTouchEnd(e)
		}
	}
}
</script>

<style scoped>
.write-compact-root {
	width: 100%;
	box-sizing: border-box;
}

.write-compact {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 100%;
}

.write-compact-hint {
	margin-top: 12rpx;
	padding: 12rpx 18rpx;
	border-radius: 16rpx;
	background: rgba(255, 252, 248, 0.98);
	border: 1rpx solid rgba(235, 227, 216, 0.9);
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	flex-wrap: wrap;
	gap: 10rpx 16rpx;
}

.write-compact-caption {
	font-size: 26rpx;
	color: var(--meng-text);
	font-weight: 600;
	line-height: 1.4;
	text-align: center;
}

.write-compact-caption--static {
	display: block;
	margin-top: 12rpx;
	width: 100%;
	font-weight: 500;
	color: var(--meng-text-muted);
}

.write-compact-hint-btn {
	font-size: 24rpx;
	color: #c44d6a;
	font-weight: 600;
}

.write-compact-actions {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	gap: 12rpx;
	margin-top: 10rpx;
}

.write-compact-link {
	font-size: 24rpx;
	color: #c44d6a;
	font-weight: 600;
	padding: 6rpx 12rpx;
}

.write-compact-sep {
	font-size: 22rpx;
	color: var(--meng-text-muted);
}

.hero-card {
	--hero-char-h: 112rpx;
	display: flex;
	flex-direction: row;
	align-items: stretch;
	gap: 12rpx;
	padding: 20rpx 24rpx;
	margin-bottom: 20rpx;
	border-radius: 28rpx;
	background: rgba(255, 255, 255, 0.92);
	box-shadow: 0 8rpx 28rpx rgba(255, 140, 170, 0.12);
	box-sizing: border-box;
}

.hero-leading {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 12rpx;
	flex-shrink: 0;
}

.char-badge {
	width: var(--hero-char-h);
	height: var(--hero-char-h);
	border-radius: 24rpx;
	background: #ffe8f0;
	border: 2rpx solid rgba(255, 180, 200, 0.4);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.char-badge-text {
	font-size: 72rpx;
	font-weight: 800;
	color: var(--meng-text);
	line-height: 1;
}

.pinyin-row {
	flex-shrink: 0;
	width: 268rpx;
	min-width: 268rpx;
	max-width: 268rpx;
}

.pinyin-row :deep(.pflr) {
	--pfl-cell-h: var(--hero-char-h);
}

.pinyin-row :deep(.pflr-glyphs-row) {
	padding-left: 0.35em;
	padding-right: 0.35em;
	font-size: calc(var(--hero-char-h) * 48 / 58);
}

.pinyin-row :deep(.pflr-cell) {
	flex: 1 1 auto;
}

.hero-detail {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	justify-content: center;
	gap: 6rpx;
	padding-left: 16rpx;
	border-left: 1rpx solid rgba(255, 180, 200, 0.28);
	box-sizing: border-box;
}

.progress-line {
	display: block;
	font-size: 26rpx;
	font-weight: 700;
	color: #c44d6a;
	line-height: 1.3;
}

.progress-line.session-progress {
	font-size: 24rpx;
	color: #8b4a62;
}

.progress-line--stroke {
	font-size: 22rpx;
	font-weight: 600;
	color: var(--meng-text-secondary);
}

.hero-stroke-name {
	display: block;
	font-size: 28rpx;
	font-weight: 700;
	color: var(--meng-text);
	line-height: 1.35;
}

.write-page {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
	padding-left: calc(32rpx + constant(safe-area-inset-left));
	padding-left: calc(32rpx + env(safe-area-inset-left));
	padding-right: calc(32rpx + constant(safe-area-inset-right));
	padding-right: calc(32rpx + env(safe-area-inset-right));
	box-sizing: border-box;
}

.session-strip {
	padding: 12rpx 8rpx 4rpx;
}

.pace-bar {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	gap: 16rpx;
	margin-bottom: 14rpx;
}

.pace-bar-label {
	font-size: 24rpx;
	font-weight: 600;
	color: var(--meng-text-muted);
	flex-shrink: 0;
}

.pace-switch {
	display: flex;
	flex-direction: row;
	padding: 6rpx;
	border-radius: 999rpx;
	background: #f0ebe4;
	border: 2rpx solid #e8dfd6;
}

.pace-opt {
	padding: 10rpx 28rpx;
	border-radius: 999rpx;
	transition: transform 0.1s ease, opacity 0.1s ease;
}

.pace-opt--pressed {
	opacity: 0.85;
	transform: scale(0.96);
}

.pace-opt--active {
	background: #fff;
	box-shadow: 0 4rpx 12rpx rgba(44, 36, 25, 0.1);
}

.pace-opt-text {
	font-size: 26rpx;
	font-weight: 700;
	color: var(--meng-text-secondary);
	line-height: 1.2;
}

.pace-opt--active .pace-opt-text {
	color: #c44d6a;
}

.session-chips {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	justify-content: center;
	gap: 16rpx;
	row-gap: 14rpx;
	padding: 4rpx 8rpx;
}

.session-chip {
	min-width: 60rpx;
	padding: 10rpx 16rpx;
	border-radius: 16rpx;
	background: #f5f0ea;
	border: 2rpx solid #e8dfd6;
	text-align: center;
	box-sizing: border-box;
	transition: transform 0.1s ease, opacity 0.1s ease;
}

.session-chip-text {
	font-size: 30rpx;
	font-weight: 700;
	color: var(--meng-text-secondary);
	line-height: 1.2;
}

.session-chip--pressed {
	transform: scale(0.94);
	opacity: 0.85;
}

.session-chip--current {
	background: #ffe8f0;
	border-color: #ff8aab;
	box-shadow: 0 0 0 4rpx rgba(255, 140, 170, 0.2);
}

.session-chip--current .session-chip-text {
	color: #c44d6a;
}

.session-chip--done {
	background: #eefaf2;
	border-color: #9fd4ad;
}

.session-chip--done .session-chip-text {
	color: #3d9a5c;
}

.session-hint {
	display: block;
	margin-top: 10rpx;
	text-align: center;
	font-size: 22rpx;
	color: var(--meng-text-muted);
	line-height: 1.4;
}

.canvas-workspace {
	display: flex;
	flex-direction: row;
	align-items: stretch;
	justify-content: center;
	gap: 24rpx;
	margin-bottom: 4rpx;
	padding: 8rpx 0;
	box-sizing: border-box;
}

.action-col {
	display: flex;
	flex-direction: column;
	justify-content: center;
	flex-shrink: 0;
	width: 132rpx;
	gap: 16rpx;
	margin-left: 12rpx;
	padding: 12rpx 8rpx 12rpx 0;
	box-sizing: border-box;
}

.canvas-card {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 14rpx;
}

.canvas-card--listening .canvas-shell {
	opacity: 0.92;
}

.canvas-shell {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 20rpx;
	border-radius: 32rpx;
	background: #fffefb;
	border: 2rpx solid rgba(235, 227, 216, 0.95);
	box-shadow: 0 12rpx 36rpx rgba(44, 36, 25, 0.08);
	box-sizing: border-box;
}

.stroke-dots {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	flex-wrap: wrap;
	gap: 10rpx;
	padding: 0 8rpx;
}

.stroke-dot {
	width: 16rpx;
	height: 16rpx;
	border-radius: 50%;
	background: #e8dfd6;
	border: 2rpx solid #d4c4b4;
	box-sizing: border-box;
}

.stroke-dot--done {
	background: #9fd4ad;
	border-color: #6bae7d;
}

.stroke-dot--current {
	width: 22rpx;
	height: 22rpx;
	background: #ffd4f0;
	border-color: #ff8aab;
	box-shadow: 0 0 0 4rpx rgba(255, 140, 170, 0.25);
}

.canvas-shell--compact {
	width: 100%;
	padding: 10rpx;
	box-shadow: none;
	border-radius: 24rpx;
	background: #fffefb;
	border: 2rpx solid rgba(235, 227, 216, 0.95);
}

.canvas-fallback--compact {
	min-height: 200px;
	font-size: 100rpx;
}

.practice-canvas {
	margin: 0 auto;
}

.canvas-fallback {
	font-size: 120rpx;
	color: var(--meng-text-muted);
}

.feedback {
	display: flex;
	flex-direction: row;
	align-items: flex-start;
	gap: 14rpx;
	padding: 20rpx 24rpx;
	border-radius: 20rpx;
	margin-bottom: 18rpx;
	min-height: 88rpx;
	box-sizing: border-box;
	background: #fff8f0;
	border: 2rpx solid var(--meng-border);
}

.feedback--idle {
	background: #faf8f5;
}

.feedback--ok {
	background: #eefaf2;
	border-color: #6bae7d;
}

.feedback--bad {
	background: #fff0f0;
	border-color: #e88;
}

.feedback-icon {
	font-size: 44rpx;
	font-weight: 800;
	line-height: 1;
	flex-shrink: 0;
}

.feedback--ok .feedback-icon {
	color: #3d9a5c;
}

.feedback--bad .feedback-icon {
	color: #d44;
}

.feedback-text {
	flex: 1;
	font-size: 28rpx;
	font-weight: 600;
	color: var(--meng-text);
	line-height: 1.5;
}

.action-btn {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 100%;
	min-height: 104rpx;
	margin: 0;
	padding: 16rpx 10rpx !important;
	border-radius: 20rpx !important;
	box-sizing: border-box;
	line-height: 1.25 !important;
	transition: transform 0.12s ease, opacity 0.12s ease, box-shadow 0.12s ease;
}

.action-btn::after {
	border: none;
}

.action-btn--pressed {
	transform: scale(0.94);
	opacity: 0.82;
	box-shadow: inset 0 4rpx 12rpx rgba(44, 36, 25, 0.12);
}

.action-btn--hint.action-btn--pressed {
	background: #ffc0e0 !important;
}

.action-btn--ghost.action-btn--pressed {
	background: #f5f0ea !important;
}

.action-btn-icon {
	font-size: 32rpx;
	line-height: 1;
	margin-bottom: 6rpx;
}

.action-btn-label {
	font-size: 26rpx;
	font-weight: 700;
	line-height: 1.2;
	text-align: center;
}

.action-btn--hint {
	background: #ffd4f0 !important;
	border: 2rpx solid #ff8aab !important;
}

.action-btn--hint .action-btn-label {
	color: #c44d6a;
}

.action-btn--ghost {
	background: #fff !important;
	border: 2rpx solid var(--meng-border-warm) !important;
}

.action-btn--ghost .action-btn-label {
	color: var(--meng-text);
}

.action-btn[disabled] {
	opacity: 0.45;
}

.more-card {
	padding: 4rpx 0 8rpx;
}

.more-toggle {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
	padding: 14rpx 8rpx;
}

.more-toggle-text {
	font-size: 26rpx;
	font-weight: 600;
	color: var(--meng-text-secondary);
}

.more-toggle-chevron {
	font-size: 22rpx;
	color: var(--meng-text-muted);
}

.input-row {
	display: flex;
	flex-direction: row;
	align-items: center;
	flex-wrap: wrap;
	gap: 12rpx;
	padding: 0 4rpx 8rpx;
}

.hanzi-input {
	flex: 1;
	height: 72rpx;
	padding: 0 20rpx;
	font-size: 32rpx;
	background: #faf8f5;
	border-radius: 16rpx;
}

.apply-btn {
	flex-shrink: 0;
	background: var(--meng-accent-solid) !important;
	color: #fff !important;
	border: none !important;
	border-radius: 16rpx !important;
	font-size: 26rpx !important;
}

.apply-btn--alt {
	background: #fff !important;
	color: var(--meng-text) !important;
	border: 2rpx solid var(--meng-border-warm) !important;
}

</style>
