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
		subtitle="按笔顺在田字格里写"
		avatar-pose="happy"
		:overlap-body="false"
	>
			<view class="hero-card">
				<view class="char-badge">
					<text class="char-badge-text">{{ displayChar }}</text>
				</view>
				<view class="hero-meta">
					<view v-if="pinyinTokens.length" class="pinyin-row">
						<pinyin-four-lines-row :syllables="pinyinTokens" size="md" />
					</view>
					<text class="progress-line">第 {{ currentStrokeNo }} / {{ strokeTotal }} 笔</text>
					<view class="hint-row">
						<text class="hint-line">
							{{ completed ? '全部笔画正确，太棒了！' : (currentStrokeGuidance || '请按笔顺写…') }}
						</text>
						<view
							v-if="!completed && currentStrokeLabel"
							class="hint-speak"
							@click.stop="playCurrentStrokeAudio"
						>
							<text class="hint-speak-icon">🔊</text>
							<text class="hint-speak-text">听笔画</text>
						</view>
					</view>
				</view>
			</view>

			<view class="write-stage">
				<view class="history-float">
					<text class="history-title">书写记录</text>
					<scroll-view scroll-y class="history-scroll" :show-scrollbar="false">
						<text v-if="!history.length" class="history-empty">写完后这里会显示每一笔的结果</text>
						<text
							v-for="(line, i) in history"
							:key="i"
							class="history-item"
							:class="historyItemClass(line)"
						>{{ line }}</text>
					</scroll-view>
				</view>

				<view class="canvas-shell">
					<canvas
						v-if="canvasReady"
						:id="canvasId"
						:canvas-id="canvasId"
						class="practice-canvas"
						disable-scroll
						:style="canvasStyle"
						@touchstart="onTouchStart"
						@touchmove="onTouchMove"
						@touchend="onTouchEnd"
						@touchcancel="onTouchCancel"
					/>
					<text v-else class="canvas-fallback">{{ displayChar }}</text>
					<view v-if="!demoPlaying && !introBusy && canvasReady && !completed" class="canvas-hint">
						<text class="canvas-hint-icon">👆</text>
						<text class="canvas-hint-text">按住田字格，写出「{{ currentStrokeGuidancePhrase || '当前笔' }}」，松手自动判断</text>
					</view>
				</view>
			</view>

			<view
				class="feedback"
				:class="feedbackType === 'bad' ? 'feedback--bad' : feedbackType === 'ok' ? 'feedback--ok' : 'feedback--idle'"
			>
				<text v-if="feedbackIcon" class="feedback-icon">{{ feedbackIcon }}</text>
				<text class="feedback-text">{{ feedbackText }}</text>
			</view>

			<view class="tool-row">
				<view class="tool-cell">
					<button class="tool-btn tool-btn--ghost" size="mini" :disabled="demoPlaying" @click="showStrokeDemo">
						看笔顺
					</button>
					<text class="tool-caption">先看动画怎么写</text>
				</view>
				<view class="tool-cell">
					<button class="tool-btn tool-btn--ghost" size="mini" @click="resetPractice">重写</button>
					<text class="tool-caption">从第一笔重来</text>
				</view>
				<view class="tool-cell">
					<button class="tool-btn tool-btn--primary" size="mini" @click="nextChar">换一字</button>
					<text class="tool-caption">练别的生字</text>
				</view>
			</view>

		<view class="input-card">
			<text class="input-label">想练哪个字？输入一个汉字后点确定</text>
			<view class="input-row">
				<input
					v-model="inputHanzi"
					class="hanzi-input"
					type="text"
					maxlength="8"
					placeholder="例如：人、大、国"
					confirm-type="done"
					@confirm="applyHanzi"
				/>
				<button class="apply-btn" size="mini" @click="applyHanzi">确定</button>
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
import { stopHanziSpeech } from '@/utils/speak-hanzi.js'
import { getAudioNarrator } from '@/utils/audio-settings.js'
import { formatStrokeLabelDisplay } from '@/data/stroke-name-pinyin.js'
import { getCurriculumPrefs } from '@/utils/curriculum-storage.js'
import { addCharWrongCount } from '@/utils/user-progress-storage.js'
import { recordStrokePractice } from '@/utils/achievement-stats-storage.js'
import { buildWritePracticeCharPool } from '@/utils/write-practice-char-pool.js'
import {
	MENG_VOICE,
	playMengmengVoice,
	playMengmengVoiceOnce,
	stopMengmengVoice,
	waitForMengmengVoiceIdle
} from '@/utils/mengmeng-voice.js'
import { LESSON_AUDIO_GAP_MS, sleepMs } from '@/utils/lesson-mode-audio.js'
import PinyinFourLinesRow from '@/components/pinyin-four-lines-row.vue'
import { splitPinyinDisplayTokens } from '@/utils/pinyin-display-tokens.js'

const CANVAS_LENGTH_FULL = 200
const CANVAS_LENGTH_COMPACT = 200
/** 整字读音播完后，再过多久才播笔画名 / 闪笔画 */
const CHAR_TO_STROKE_AUDIO_GAP_MS = 2000
const CHAR_TO_STROKE_AUDIO_GAP_MS_COMPACT = 600

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
			charPool: [],
			poolIndex: 0,
			wrongAddedAt: 0,
			mountPending: false
		}
	},
	computed: {
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
		canvasStyle() {
			const px = this.canvasLength + 30
			return { width: px + 'px', height: px + 'px', display: 'block' }
		},
		feedbackIcon() {
			if (this.feedbackType === 'ok') return '✓'
			if (this.feedbackType === 'bad') return '✗'
			return ''
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
			return this.compact ? CHAR_TO_STROKE_AUDIO_GAP_MS_COMPACT : CHAR_TO_STROKE_AUDIO_GAP_MS
		}
	},
	onLoad(query) {
		if (this.compact) return
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
		if (this.compact) return
		playMengmengVoiceOnce(MENG_VOICE.STROKE_WELCOME, 'meng_voice_write_practice_welcome', {
			debounceMs: 480
		}).catch(() => {})
	},
	onUnload() {
		this.stopAllPracticeAudio()
		stopMengmengVoice()
	},
	onHide() {
		this.stopAllPracticeAudio()
		stopMengmengVoice()
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
			await this.loadCharPool()
			this.refreshMeta()
			this.mountTestWriter()
		},
		async loadCharPool(excludeChar) {
			try {
				this.charPool = await buildWritePracticeCharPool({
					excludeChar: excludeChar != null ? excludeChar : this.displayChar,
					shuffleSalt: Date.now()
				})
			} catch (_) {
				this.charPool = ['大', '小', '天', '口', '手', '人']
			}
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
		/** 进入/换字：先整字读音；之后仅高亮+笔画名 */
		async runWriteIntro(strokeIndex, opts = {}) {
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
			stopLocalPinyinAudio()
			stopHanziSpeech()
			const narrator = getAudioNarrator()
			const tokens = this.pinyinTokens
			if (tokens.length > 1) {
				await playPinyinLocalAudioSequence(tokens, {
					narrator,
					gapMs: 90,
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
		},
		async beginStrokeGuidance(strokeIndex, introGen) {
			const gen = introGen != null ? introGen : this.introGen
			const charSnap = this.displayChar
			const cancelled = () => gen !== this.introGen || this.displayChar !== charSnap
			const idx = Number(strokeIndex)
			if (!Number.isFinite(idx) || idx < 0 || this.completed || this.demoPlaying) return
			if (cancelled()) return
			if (this.writer && typeof this.writer.setTestStrokeGuide === 'function') {
				this.writer.setTestStrokeGuide(true, { blink: true, blinkTimes: 3 })
			}
			const label = this.strokeNames[idx]
			if (label && !this.compact) {
				this.feedbackText = `请写：${formatStrokeGuidancePhrase(idx, label)}`
				this.feedbackType = ''
			}
			if (!label) return
			stopLocalPinyinAudio()
			await playStrokeGuidanceAudio(idx, label, {
				narrator: getAudioNarrator(),
				isCancelled: cancelled
			})
			if (cancelled()) return
		},
		playCurrentStrokeAudio() {
			if (this.completed || this.demoPlaying || this.introBusy) return
			this.cancelWriteIntro()
			this.runWriteIntro(this.activeStroke, { playCharFirst: false })
		},
		/** 内嵌模式：仅高亮当前应收笔（不播音） */
		applyCompactStrokeGuideVisual(strokeIndex) {
			if (!this.compact || this.completed || this.demoPlaying) return
			const idx =
				strokeIndex != null && Number.isFinite(Number(strokeIndex))
					? Number(strokeIndex)
					: this.activeStroke
			if (idx < 0) return
			if (this.writer && typeof this.writer.setTestStrokeGuide === 'function') {
				this.writer.setTestStrokeGuide(true, { blink: true, blinkTimes: 3 })
			}
		},
		/** 内嵌模式：用户点击后播放当前应收笔画提示 */
		playCompactStrokeHint() {
			if (this.completed || this.demoPlaying || this.introBusy) return
			const voiceId = this.compact ? MENG_VOICE.DAILY_STROKE_HINT : MENG_VOICE.STROKE_HINT_PLAY
			this.cancelWriteIntro()
			const gen = ++this.introGen
			this.introBusy = true
			this.applyCompactStrokeGuideVisual(this.activeStroke)
			const run = async () => {
				try {
					await this.playMengVoiceIf(voiceId, { minGapMs: 700 })
					await waitForMengmengVoiceIdle()
					await sleepMs(LESSON_AUDIO_GAP_MS)
					await this.beginStrokeGuidance(this.activeStroke, gen)
				} finally {
					if (gen === this.introGen) this.introBusy = false
				}
			}
			run()
		},
		playMengVoiceIf(id, opts) {
			if (this.compact && !this.mengVoice) return Promise.resolve(false)
			return playMengmengVoice(id, opts).catch(() => false)
		},
		compactToast() {
			/* 每日一练内嵌：不弹 Toast，避免打断书写 */
		},
		handleTestStatus(index, status, data = {}) {
			const strokeNo = Number(index) + 1
			if (status === 'correct') {
				if (this.compact) {
					this.playMengVoiceIf(MENG_VOICE.DAILY_STROKE_OK, { minGapMs: 900 })
				} else {
					this.feedbackType = 'ok'
					this.feedbackText =
						strokeNo >= this.strokeTotal
							? `第 ${strokeNo} 笔写对了`
							: `第 ${strokeNo} 笔写对了，请写第 ${strokeNo + 1} 笔`
					this.playMengVoiceIf(MENG_VOICE.STROKE_WRITE_OK, { minGapMs: 900 })
				}
				this.activeStroke = strokeNo
				if (!this.compact) this.pushHistory(`第 ${strokeNo} 笔 ✓`)
				if (!this.completed && strokeNo < this.strokeTotal) {
					if (this.compact) {
						this.$nextTick(() => this.applyCompactStrokeGuideVisual(strokeNo))
					} else {
						this.$nextTick(() =>
							this.runWriteIntro(strokeNo, { playCharFirst: false })
						)
					}
				}
				return
			}
			if (status === 'mistake') {
				if (data.reason === 'tooShort') {
					if (!this.compact) {
						this.feedbackType = 'bad'
						this.feedbackText = '笔画太短啦，请按住田字格多拖一段再松手'
					}
					this.compactToast('请画完整一笔')
					if (!this.compact) {
						uni.showToast({ title: '请画完整一笔', icon: 'none' })
					}
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
						typeof data.score === 'number' && data.score > 30
							? '形状或方向不太像，'
							: ''
					this.feedbackText = expectedPhrase
						? `${shapeHint}这一笔不对。应先写${expectedPhrase}，请重画`
						: `${shapeHint}这一笔不对，请按提示重画第 ${expectedNo} 笔`
					this.pushHistory(`第 ${strokeNo} 笔 ✗ → 应收第 ${expectedNo} 笔`)
					uni.showToast({ title: '再试一次', icon: 'none', duration: 1500 })
				} else {
					this.compactToast(expectedPhrase ? `应写${expectedPhrase}` : '再试一次')
					this.playMengVoiceIf(
						this.compact ? MENG_VOICE.DAILY_STROKE_WRONG : MENG_VOICE.STROKE_WRITE_WRONG,
						{ minGapMs: 800 }
					)
				}
				if (Number.isFinite(data.expectedStroke) && data.expectedStroke >= 0) {
					if (this.compact) {
						this.activeStroke = data.expectedStroke
						this.$nextTick(() =>
							this.applyCompactStrokeGuideVisual(data.expectedStroke)
						)
					} else {
						this.$nextTick(() =>
							this.runWriteIntro(data.expectedStroke, { playCharFirst: false })
						)
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
				if (this.compact) {
					this.compactToast('全部写对了', 'success')
					this.playMengVoiceIf(MENG_VOICE.DAILY_COMPLETE, { minGapMs: 2000 })
					this.$emit('compact-complete')
				} else {
					this.playMengVoiceIf(MENG_VOICE.STROKE_ALL_DONE, { minGapMs: 2000 })
					this.feedbackType = 'ok'
					this.feedbackText = '全部笔画写对了，笔顺正确！'
					this.pushHistory('✓ 全部通过')
				}
			}
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
		mountTestWriter() {
			this.stopAllPracticeAudio()
			this.completed = false
			this.activeStroke = 0
			if (!this.compact) {
				this.feedbackText = '请用手指在下方田字格写出当前这一笔，写完后松手'
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
							testDirectionWeight: 0.32,
							testScoreThreshold: 26,
							showHintAfterMisses: 2,
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
					vm.mountPending = false
					if (vm.compact) {
						vm.$nextTick(() => vm.applyCompactStrokeGuideVisual(0))
					} else {
						vm.$nextTick(() => vm.runWriteIntro(0, { playCharFirst: true }))
					}
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
		showStrokeDemo() {
			if (this.demoPlaying || this.completed) return
			this.playMengVoiceIf(MENG_VOICE.STROKE_MODE_ANIM, { minGapMs: 1500 })
			this.stopAllPracticeAudio()
			this.mountDemoWriter()
		},
		resetPractice() {
			this.stopPracticePlayback()
			this.completed = false
			this.activeStroke = 0
			if (!this.compact) {
				this.feedbackText = '已重置，先听字音再写第一笔'
				this.feedbackType = ''
			}
			if (this.writer && typeof this.writer.resetStrokeTest === 'function') {
				this.writer.resetStrokeTest()
				if (this.compact) {
					this.$nextTick(() => this.applyCompactStrokeGuideVisual(0))
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
			this.hanzi = pure
			this.inputHanzi = pure
			this.history = []
			this.refreshMeta()
			await this.loadCharPool(pure)
			this.mountTestWriter()
		},
		async nextChar() {
			this.stopAllPracticeAudio()
			this.canvasReady = false
			const prev = this.displayChar
			await this.loadCharPool(prev)
			if (!this.charPool.length) {
				this.applyHanzi()
				return
			}
			this.poolIndex = 0
			this.hanzi = this.charPool[0]
			this.inputHanzi = this.hanzi
			this.history = []
			this.refreshMeta()
			this.mountTestWriter()
		},
		pickCanvasTouch(e) {
			if (!e) return null
			return (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || null
		},
		onTouchStart(e) {
			if (this.completed || this.demoPlaying) return
			const t = this.pickCanvasTouch(e)
			if (t && this.writer?.handleTouchStart) {
				this.writer.handleTouchStart(t, e.detail)
			}
		},
		onTouchMove(e) {
			if (this.completed || this.demoPlaying) return
			const t = this.pickCanvasTouch(e)
			if (t && this.writer?.handleTouchMove) {
				this.writer.handleTouchMove(t, e.detail)
			}
		},
		onTouchEnd(e) {
			if (this.completed || this.demoPlaying) return
			if (this.writer?.handleTouchEnd) {
				this.writer.handleTouchEnd()
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
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 24rpx;
	padding: 24rpx;
	margin-bottom: 20rpx;
	border-radius: 28rpx;
	background: rgba(255, 255, 255, 0.92);
	box-shadow: 0 8rpx 28rpx rgba(255, 140, 170, 0.12);
}

.char-badge {
	width: 120rpx;
	height: 120rpx;
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

.hero-meta {
	flex: 1;
	min-width: 0;
}

.pinyin-row {
	margin-bottom: 8rpx;
}

.progress-line {
	display: block;
	font-size: 26rpx;
	font-weight: 700;
	color: #c44d6a;
	margin-bottom: 6rpx;
}

.hint-row {
	display: flex;
	flex-direction: row;
	align-items: center;
	flex-wrap: wrap;
	gap: 12rpx;
}

.hint-line {
	flex: 1;
	min-width: 200rpx;
	font-size: 24rpx;
	color: var(--meng-text-secondary);
	line-height: 1.45;
}

.hint-speak {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 6rpx;
	padding: 8rpx 16rpx;
	border-radius: 999rpx;
	background: rgba(255, 240, 248, 0.95);
	border: 1rpx solid rgba(255, 160, 190, 0.5);
}

.hint-speak-icon {
	font-size: 26rpx;
}

.hint-speak-text {
	font-size: 22rpx;
	color: #c44d6a;
	font-weight: 600;
}

.write-stage {
	position: relative;
	margin-bottom: 20rpx;
}

.history-float {
	position: absolute;
	left: 12rpx;
	top: 20rpx;
	bottom: 20rpx;
	z-index: 12;
	width: 212rpx;
	max-width: 42%;
	padding: 14rpx 12rpx;
	box-sizing: border-box;
	border-radius: 20rpx;
	background: rgba(255, 255, 255, 0.94);
	border: 2rpx solid rgba(255, 200, 220, 0.65);
	box-shadow: 0 8rpx 28rpx rgba(44, 36, 25, 0.12);
	display: flex;
	flex-direction: column;
	pointer-events: auto;
}

.history-title {
	display: block;
	font-size: 22rpx;
	font-weight: 700;
	color: #c44d6a;
	margin-bottom: 8rpx;
	flex-shrink: 0;
}

.history-scroll {
	flex: 1;
	min-height: 0;
	width: 100%;
}

.history-empty {
	display: block;
	font-size: 22rpx;
	color: var(--meng-text-muted);
	line-height: 1.5;
}

.history-item {
	display: block;
	font-size: 22rpx;
	color: var(--meng-text-secondary);
	line-height: 1.5;
	margin-top: 6rpx;
	word-break: break-all;
}

.history-item--ok {
	color: #3d9a5c;
	font-weight: 600;
}

.history-item--bad {
	color: #c44;
	font-weight: 600;
}

.canvas-shell {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 16rpx 16rpx 16rpx 228rpx;
	border-radius: 32rpx;
	background: #fff;
	box-shadow: 0 12rpx 36rpx rgba(44, 36, 25, 0.08);
	box-sizing: border-box;
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

.canvas-hint {
	position: absolute;
	left: 228rpx;
	right: 16rpx;
	bottom: 16rpx;
	padding: 14rpx 18rpx;
	border-radius: 16rpx;
	background: rgba(255, 255, 255, 0.92);
	box-shadow: 0 4rpx 16rpx rgba(44, 36, 25, 0.1);
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 10rpx;
	pointer-events: none;
}

.canvas-hint-icon {
	font-size: 32rpx;
	flex-shrink: 0;
}

.canvas-hint-text {
	flex: 1;
	font-size: 24rpx;
	color: var(--meng-text);
	line-height: 1.4;
	font-weight: 600;
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

.tool-row {
	display: flex;
	flex-direction: row;
	gap: 12rpx;
	margin-bottom: 20rpx;
}

.tool-cell {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8rpx;
}

.tool-caption {
	font-size: 20rpx;
	color: var(--meng-text-muted);
	text-align: center;
	line-height: 1.3;
}

.tool-btn {
	width: 100%;
	border-radius: 999rpx !important;
	font-size: 26rpx !important;
}

.tool-btn--ghost {
	background: #fff !important;
	color: var(--meng-text) !important;
	border: 2rpx solid var(--meng-border-warm) !important;
}

.tool-btn--primary {
	background: var(--meng-accent-solid) !important;
	color: #fff !important;
	border: none !important;
}

.input-card {
	padding: 18rpx 20rpx;
	border-radius: 20rpx;
	background: rgba(255, 255, 255, 0.9);
}

.input-label {
	display: block;
	font-size: 24rpx;
	color: var(--meng-text-secondary);
	margin-bottom: 12rpx;
}

.input-row {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 16rpx;
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
	background: var(--meng-accent-solid) !important;
	color: #fff !important;
	border: none !important;
	border-radius: 16rpx !important;
}

</style>
