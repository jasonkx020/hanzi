<template>
	<view class="page">
		<text class="title">每日一练</text>
		<text class="sub">{{ dateLine }}</text>

		<text v-if="poolSize === 0" class="empty-hint">
			当前教材与字表下暂无生字。请先在「教材与进度」中切换年级/字表，或通过「课本同步学」选课学习。
		</text>

		<template v-else>
			<view class="compact-head">
				<text class="head-main">{{ dateKey }} · 第 {{ currentIndex + 1 }}/{{ items.length }} 字 · 今日共 {{ items.length }} 字</text>
				<view class="head-meta">
					<text class="head-chip">字表 {{ poolSize }}</text>
					<text v-if="weakCount > 0" class="head-chip head-chip-warn">易错 {{ weakCount }}</text>
				</view>
				<view class="progress-dots">
					<view
						v-for="(_, i) in items"
						:key="'dot-' + i"
						class="dot"
						:class="{ 'dot-on': i === currentIndex, 'dot-done': i < currentIndex }"
					/>
				</view>
			</view>

			<view v-if="detailEntry" class="detail-card">
				<!-- 田字格：默认 drawNative NORMAL（完整笔顺字形，等同动画末帧）；点「看笔顺」后换 ANIMATION -->
				<view class="hero-row">
					<view class="hero-left">
						<view class="tianzi-wrap" :style="dailyStrokeWrapStyle">
							<canvas
								v-if="dailyStrokeReady && !dailyAnimFallback"
								id="daily-stroke-box"
								canvas-id="daily-stroke-box"
								class="daily-stroke-canvas"
								disable-scroll
								:style="dailyStrokeCanvasStyle"
							/>
							<text v-else-if="dailyStrokeReady && dailyAnimFallback" class="char-fallback">{{ detailEntry.hanzi }}</text>
							<text v-else class="char-fallback placeholder">{{ detailEntry.hanzi }}</text>
						</view>
						<view class="tianzi-actions">
							<text class="link-stroke" @click.stop="replayDailyStroke">{{
								dailyStrokeRevealed ? '重播笔顺' : '看笔顺动画'
							}}</text>
						</view>
					</view>
					<view class="hero-right">
						<text v-if="currentItem && currentItem.reason === 'weak'" class="weak-inline">易错</text>
						<view v-if="!dailyPinyinRevealed" class="py-tap" @click.stop="onTapPlayPinyin">
							<text class="py-tap-label">听拼音</text>
							<text class="py-tap-hint">点这里播放并显示</text>
						</view>
						<view v-else class="py-block" @click.stop="speakCurrentPinyin">
							<view v-if="pinyinSyllableTokens.length" class="py-rows">
								<view
									v-for="(tok, ti) in pinyinSyllableTokens"
									:key="'daily-py-' + ti"
									class="py-row"
								>
									<pinyin-four-lines-row class="py-core" :syllables="[tok]" size="xl" />
								</view>
							</view>
							<text v-else class="py-plain font-pinyin py-plain-xl">{{ pinyinPlain }}</text>
						</view>
						<text v-if="detailFetchComplete" class="meta-line"
							>部首 {{ detailEntry.radical }} · 结构 {{ detailEntry.structure }} · {{ detailEntry.strokes }} 画</text
						>
						<text v-else class="meta-line meta-pending">字义信息加载中…</text>
						<text v-if="detailEntry.lessonHint" class="lesson-mini">{{ detailEntry.lessonHint }}</text>
					</view>
				</view>

				<view
					v-if="dailyStrokeRevealed && (detailEntry.strokeShapes || detailEntry.strokeNames)"
					class="dense-row stroke-dense"
				>
					<text class="dense-k">笔顺</text>
					<view class="dense-v">
						<text v-if="detailEntry.strokeShapes" class="dense-glyphs">{{ detailEntry.strokeShapes }}</text>
						<text v-if="detailEntry.strokeNames" class="dense-names">{{ detailEntry.strokeNames }}</text>
					</view>
				</view>

				<view v-if="detailFetchComplete && detailEntry.explainText" class="dense-row explain-dense">
					<text class="dense-k">释义</text>
					<text class="dense-v clamp-2">{{ detailEntry.explainText }}</text>
				</view>

				<view v-if="detailFetchComplete" class="dense-row words-dense">
					<text class="dense-k">组词</text>
					<text class="dense-v clamp-1">{{ wordsLine }}</text>
				</view>

				<view class="btn-bar">
					<button class="btn-mini" size="mini" type="default" @click="markLearned">已学</button>
					<button class="btn-mini" size="mini" type="warn" @click="markWrong">易错</button>
					<button class="btn-mini" size="mini" type="default" @click="openFullDetail">详情</button>
					<button class="btn-mini" size="mini" type="primary" :disabled="currentIndex >= items.length - 1" @click="goNext">下一字</button>
				</view>
				<view class="btn-bar btn-bar-sub">
					<button class="btn-mini" size="mini" type="default" :disabled="currentIndex <= 0" @click="goPrev">上一字</button>
					<button class="btn-mini" size="mini" type="default" @click="bumpShuffle">换一批</button>
					<button class="btn-mini" size="mini" type="default" @click="goDictionary">查字</button>
				</view>
			</view>
		</template>

		<view v-if="poolSize > 0" class="foot-spacer" />
	</view>
</template>

<script>
import drawNative from '@/utils/draw-native.js'
import { getCurriculumPrefs } from '@/utils/curriculum-storage.js'
import { buildDailyTrainingQueue, countWeakInDailyItems } from '@/services/daily-training-service.js'
import { getDictionaryEntry } from '@/repositories/dictionary-repository.js'
import { recordCharLearned, recordCharWrong } from '@/repositories/learning-repository.js'
import {
	speakDictionaryEntryPinyin,
	DICTIONARY_LOCAL_PINYIN_OPTS
} from '@/utils/dictionary-pinyin-speak.js'
import { stopLocalPinyinAudio } from '@/utils/play-pinyin-local-audio.js'
import { getAudioNarrator } from '@/utils/audio-settings.js'
import PinyinFourLinesRow from '@/components/pinyin-four-lines-row.vue'
import { splitPinyinDisplayTokens } from '@/utils/pinyin-display-tokens.js'

/** 田字格略小，便于一屏容纳拼音与说明 */
const DAILY_STROKE_LENGTH = 118

export default {
	components: {
		PinyinFourLinesRow
	},
	data() {
		return {
			dateKey: '',
			poolSize: 0,
			items: [],
			weakCount: 0,
			shuffleSalt: 0,
			currentIndex: 0,
			/** 当前字的查字结果（getDictionaryEntry） */
			detailEntry: null,
			narrator: 'kid',
			dictPinyinPlaying: false,
			dailyStrokeReady: false,
			dailyAnimFallback: false,
			dailyDrawWriter: null,
			dailyStrokeMountGen: 0,
			dailyStrokeAttachTimer: null,
			dailyWordNotFoundRegistered: false,
			/** 用户点「听拼音」后才显示大字拼音 */
			dailyPinyinRevealed: false,
			/** 用户点「看笔顺动画」后才显示笔顺画布与笔顺分解 */
			dailyStrokeRevealed: false,
			/** 字典详情是否已拉取完成（避免切换字时部首/释义等闪空白） */
			detailFetchComplete: false
		}
	},
	computed: {
		dateLine() {
			if (!this.dateKey) return ''
			return `今日 ${this.dateKey} · 与当前教材偏好一致`
		},
		currentItem() {
			return this.items[this.currentIndex] || null
		},
		pinyinPlain() {
			const t = String(this.detailEntry?.pinyin || '').replace(/[()（）]/g, '').trim()
			return t || '—'
		},
		pinyinSyllableTokens() {
			const py = this.detailEntry?.pinyin || ''
			const tokens = splitPinyinDisplayTokens(py)
			if (tokens.length) return tokens
			const s = String(py || '').trim().replace(/[()（）]/g, '').trim()
			if (s && s !== '—' && s !== '-') return [s]
			return []
		},
		wordsLine() {
			const w = this.detailEntry?.words
			return Array.isArray(w) && w.length ? w.join(' / ') : '暂无组词'
		},
		dailyStrokeCanvasStyle() {
			const px = DAILY_STROKE_LENGTH + 30
			return { width: px + 'px', height: px + 'px', display: 'block' }
		},
		dailyStrokeWrapStyle() {
			const px = DAILY_STROKE_LENGTH + 30
			return { width: px + 'px', height: px + 'px' }
		}
	},
	async onShow() {
		this.narrator = getAudioNarrator()
		await this.reload()
	},
	onHide() {
		stopLocalPinyinAudio()
		this.teardownDailyStroke({ resetReady: true })
	},
	onUnload() {
		stopLocalPinyinAudio()
		this.teardownDailyStroke({ resetReady: true })
	},
	methods: {
		async reload() {
			const p = getCurriculumPrefs()
			const plan = await buildDailyTrainingQueue(p, {
				limit: 10,
				shuffleSalt: this.shuffleSalt
			})
			this.dateKey = plan.dateKey
			this.poolSize = plan.poolSize
			this.items = plan.items
			this.weakCount = countWeakInDailyItems(plan.items)
			if (this.currentIndex >= this.items.length) {
				this.currentIndex = Math.max(0, this.items.length - 1)
			}
			await this.loadCurrentDetail()
		},
		bumpShuffle() {
			this.shuffleSalt += 1
			this.currentIndex = 0
			void this.reload()
		},
		async goNext() {
			if (this.currentIndex >= this.items.length - 1) return
			this.currentIndex += 1
			await this.loadCurrentDetail()
		},
		async goPrev() {
			if (this.currentIndex <= 0) return
			this.currentIndex -= 1
			await this.loadCurrentDetail()
		},
		async loadCurrentDetail() {
			const it = this.currentItem
			if (!it || !it.hanzi) {
				this.teardownDailyStroke({ resetReady: true })
				this.dailyPinyinRevealed = false
				this.dailyStrokeRevealed = false
				this.detailFetchComplete = false
				this.detailEntry = null
				return
			}
			const prevH = String(this.detailEntry?.hanzi || '')
				.trim()
				.charAt(0)
			const nextH = String(it.hanzi)
				.trim()
				.charAt(0)
			const keepCanvasSlot = !!(this.dailyStrokeReady && prevH && prevH === nextH)
			this.teardownDailyStroke({ resetReady: !keepCanvasSlot })
			this.dailyPinyinRevealed = false
			this.dailyStrokeRevealed = false
			this.detailFetchComplete = false
			this.detailEntry = this.buildDetailStubFromItem(it)
			try {
				const hint = it.lesson_hint != null ? String(it.lesson_hint) : ''
				const entry = await getDictionaryEntry(it.hanzi, hint)
				if (entry) {
					const pyFromRow = it.pinyin != null ? String(it.pinyin).replace(/\s+/g, ' ').trim() : ''
					this.detailEntry = {
						...entry,
						pinyin: pyFromRow || entry.pinyin || ''
					}
					this.detailFetchComplete = true
				} else {
					this.detailEntry = null
				}
			} catch (e) {
				console.warn('[daily] loadCurrentDetail', e)
				this.detailEntry = null
			} finally {
				if (this.detailEntry?.hanzi && !this.dailyStrokeRevealed) {
					const c = String(this.detailEntry.hanzi).trim().charAt(0)
					this.$nextTick(() => {
						this.$nextTick(() => {
							this.mountDailyPreviewWriter(c)
						})
					})
				}
			}
		},
		buildDetailStubFromItem(it) {
			const h = it.hanzi
			const pyRaw = it.pinyin != null ? String(it.pinyin).replace(/\s+/g, ' ').trim() : ''
			return {
				hanzi: h,
				pinyin: pyRaw,
				radical: '',
				structure: '',
				strokes: 0,
				lessonHint: it.lesson_hint != null ? String(it.lesson_hint) : '',
				strokeShapes: '',
				strokeNames: '',
				explainText: '',
				words: []
			}
		},
		registerDailyWordNotFoundOnce() {
			if (this.dailyWordNotFoundRegistered) return
			drawNative.onWordNotFound(() => {})
			this.dailyWordNotFoundRegistered = true
		},
		destroyDailyDrawWriterOnly() {
			if (this.dailyDrawWriter && typeof this.dailyDrawWriter.destroy === 'function') {
				this.dailyDrawWriter.destroy()
			}
			this.dailyDrawWriter = null
		},
		teardownDailyStroke(opts = {}) {
			const resetReady = opts.resetReady !== false
			if (this.dailyStrokeAttachTimer) {
				clearTimeout(this.dailyStrokeAttachTimer)
				this.dailyStrokeAttachTimer = null
			}
			this.dailyStrokeMountGen++
			if (resetReady) {
				this.dailyStrokeReady = false
			}
			this.dailyAnimFallback = false
			this.destroyDailyDrawWriterOnly()
		},
		dailyDrawSharedOpts(vm) {
			return {
				vm,
				style: {
					length: DAILY_STROKE_LENGTH,
					charInsetRatio: 0.15,
					strokeColor: '#2c3e50',
					outlineColor: '#d5d5d5',
					currentColor: '#e74c3c'
				},
				line: {
					show: true,
					borderColor: '#d7d7d7',
					centerColor: '#cfcfcf',
					diagonalColor: '#e2e2e2'
				},
				watermark: {
					text: 'HanziStroke.com',
					alpha: 0.22,
					fontSize: 10,
					position: 'bottom-right'
				},
				test: { onTestStatus: () => {} }
			}
		},
		startDailyStrokeReveal() {
			if (!this.detailEntry?.hanzi) return
			this.dailyStrokeRevealed = true
			this.$nextTick(() => {
				this.playDailyStrokeAnimation()
			})
		},
		async onTapPlayPinyin() {
			if (!this.detailEntry?.hanzi || this.dictPinyinPlaying) return
			this.dailyPinyinRevealed = true
			await this.speakCurrentPinyin()
		},
		playDailyStrokeAnimation() {
			const c = String(this.detailEntry?.hanzi || '').trim().charAt(0)
			if (!c) return
			if (typeof drawNative !== 'function') {
				uni.showToast({ title: '当前环境暂不支持笔顺', icon: 'none' })
				return
			}
			this.registerDailyWordNotFoundOnce()
			this.dailyStrokeReady = true
			this.dailyAnimFallback = false
			this.destroyDailyDrawWriterOnly()
			if (this.dailyStrokeAttachTimer) {
				clearTimeout(this.dailyStrokeAttachTimer)
				this.dailyStrokeAttachTimer = null
			}
			const token = ++this.dailyStrokeMountGen
			const attach = () => {
				this.dailyStrokeAttachTimer = null
				if (token !== this.dailyStrokeMountGen) return
				this.mountDailyStrokeWriter(c)
			}
			this.$nextTick(() => {
				this.$nextTick(() => {
					this.dailyStrokeAttachTimer = setTimeout(attach, 48)
				})
			})
		},
		mountDailyPreviewWriter(char) {
			if (!char || typeof drawNative !== 'function') {
				this.dailyStrokeReady = true
				this.dailyAnimFallback = true
				return
			}
			this.registerDailyWordNotFoundOnce()
			this.dailyAnimFallback = false
			this.destroyDailyDrawWriterOnly()
			if (this.dailyStrokeAttachTimer) {
				clearTimeout(this.dailyStrokeAttachTimer)
				this.dailyStrokeAttachTimer = null
			}
			const token = ++this.dailyStrokeMountGen
			const attach = () => {
				this.dailyStrokeAttachTimer = null
				if (token !== this.dailyStrokeMountGen) return
				const vm = this
				const base = this.dailyDrawSharedOpts(vm)
				try {
					this.dailyDrawWriter = drawNative(char, {
						...base,
						el: '#daily-stroke-box',
						type: drawNative.TYPE.NORMAL
					})
					this.dailyStrokeReady = true
					this.dailyAnimFallback = false
				} catch (e) {
					console.warn('[daily] preview stroke mount failed', e)
					this.dailyDrawWriter = null
					this.dailyStrokeReady = true
					this.dailyAnimFallback = true
				}
			}
			this.$nextTick(() => {
				this.$nextTick(() => {
					this.dailyStrokeAttachTimer = setTimeout(attach, 48)
				})
			})
		},
		mountDailyStrokeWriter(char) {
			if (typeof drawNative !== 'function') {
				this.dailyStrokeReady = true
				this.dailyAnimFallback = true
				return
			}
			const vm = this
			const base = this.dailyDrawSharedOpts(vm)
			try {
				this.dailyDrawWriter = drawNative(char, {
					...base,
					el: '#daily-stroke-box',
					type: drawNative.TYPE.ANIMATION,
					animation: {
						autoAnimate: true,
						loopAnimate: true,
						strokeAnimationSpeed: 1.15,
						delayBetweenStrokes: 400,
						delayBetweenLoops: 1000
					}
				})
			} catch (e) {
				console.warn('[daily] stroke mount failed', e)
				this.dailyDrawWriter = null
				this.dailyAnimFallback = true
				this.dailyStrokeReady = true
			}
		},
		async speakCurrentPinyin() {
			if (!this.detailEntry?.hanzi || this.dictPinyinPlaying) return
			this.dictPinyinPlaying = true
			try {
				await speakDictionaryEntryPinyin({
					hanzi: this.detailEntry.hanzi,
					fallbackPinyin: this.detailEntry.pinyin,
					narrator: this.narrator,
					...DICTIONARY_LOCAL_PINYIN_OPTS
				})
			} finally {
				this.dictPinyinPlaying = false
			}
		},
		markLearned() {
			if (!this.detailEntry?.hanzi) return
			recordCharLearned(this.detailEntry.hanzi, getCurriculumPrefs())
			uni.showToast({ title: '已加入学过字库', icon: 'success' })
		},
		markWrong() {
			if (!this.detailEntry?.hanzi) return
			recordCharWrong(this.detailEntry.hanzi, 1, getCurriculumPrefs())
			uni.showToast({ title: '已加入易错字', icon: 'none' })
		},
		openFullDetail() {
			if (!this.detailEntry?.hanzi) return
			const hanzi = encodeURIComponent(this.detailEntry.hanzi)
			const py = this.detailEntry.pinyin ? encodeURIComponent(this.detailEntry.pinyin) : ''
			const lesson = this.detailEntry.lessonHint ? encodeURIComponent(this.detailEntry.lessonHint) : ''
			uni.navigateTo({
				url: `/pages/char/detail?hanzi=${hanzi}&pinyin=${py}&lesson=${lesson}`
			})
		},
		replayDailyStroke() {
			if (!this.dailyStrokeRevealed) {
				this.startDailyStrokeReveal()
				return
			}
			if (this.dailyDrawWriter && typeof this.dailyDrawWriter.restartAnimation === 'function') {
				this.dailyDrawWriter.restartAnimation()
				return
			}
			this.playDailyStrokeAnimation()
		},
		goDictionary() {
			uni.switchTab({ url: '/pages/dictionary/index' })
		}
	}
}
</script>

<style scoped>
.page {
	min-height: 100vh;
	padding: 20rpx 24rpx 24rpx;
	background: #f4f1ea;
	box-sizing: border-box;
}
.title {
	display: block;
	font-size: 32rpx;
	font-weight: 700;
	color: #2c2419;
	margin-bottom: 4rpx;
}
.sub {
	display: block;
	font-size: 20rpx;
	color: #8a8278;
	margin-bottom: 10rpx;
}
.empty-hint {
	display: block;
	font-size: 24rpx;
	color: #8b4513;
	line-height: 1.55;
	background: #fff4de;
	padding: 16rpx;
	border-radius: 12rpx;
	margin-bottom: 16rpx;
}
.compact-head {
	margin-bottom: 10rpx;
}
.head-main {
	display: block;
	font-size: 22rpx;
	color: #5a534c;
	line-height: 1.35;
	margin-bottom: 6rpx;
}
.head-meta {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	gap: 8rpx;
	margin-bottom: 6rpx;
}
.head-chip {
	font-size: 20rpx;
	color: #5a6b4a;
	background: #e8f0e4;
	padding: 4rpx 12rpx;
	border-radius: 999rpx;
}
.head-chip-warn {
	background: #ffe4d6;
	color: #a14c2a;
}
.progress-dots {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	gap: 8rpx;
}
.dot {
	width: 12rpx;
	height: 12rpx;
	border-radius: 50%;
	background: #e0dcd4;
}
.dot-on {
	background: #ff9800;
	transform: scale(1.12);
}
.dot-done {
	background: #a5d6a7;
}
.detail-card {
	background: #fff;
	border-radius: 16rpx;
	padding: 16rpx 16rpx 14rpx;
	margin-bottom: 0;
	box-shadow: 0 6rpx 20rpx rgba(44, 36, 25, 0.07);
}
.hero-row {
	display: flex;
	flex-direction: row;
	align-items: flex-start;
	gap: 14rpx;
	margin-bottom: 10rpx;
}
.hero-left {
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
}
.hero-right {
	flex: 1;
	min-width: 0;
	padding-top: 2rpx;
}
.weak-inline {
	display: inline-block;
	font-size: 18rpx;
	color: #c45c26;
	background: #fff0e6;
	padding: 2rpx 10rpx;
	border-radius: 6rpx;
	margin-bottom: 6rpx;
}
.py-tap {
	padding: 12rpx 14rpx;
	margin-bottom: 8rpx;
	background: #f3f6f0;
	border-radius: 10rpx;
	border: 1rpx dashed #b8c9ae;
}
.py-tap-label {
	display: block;
	font-size: 28rpx;
	font-weight: 600;
	color: #3d6b4a;
	margin-bottom: 4rpx;
}
.py-tap-hint {
	display: block;
	font-size: 20rpx;
	color: #8a8278;
	line-height: 1.3;
}
.py-block {
	margin-bottom: 6rpx;
}
.py-rows {
	display: flex;
	flex-direction: column;
	gap: 2rpx;
}
.py-row {
	width: 100%;
}
.py-core {
	width: 100%;
}
.py-plain {
	font-size: 28rpx;
	color: #3d6b4a;
	line-height: 1.25;
}
.py-plain-xl {
	font-size: 56rpx;
	line-height: 1.2;
}
.meta-line {
	display: block;
	font-size: 28rpx;
	color: #6d4c41;
	line-height: 1.35;
	margin-bottom: 4rpx;
}
.meta-pending {
	color: #9a9288;
	font-weight: 400;
}
.lesson-mini {
	display: block;
	font-size: 20rpx;
	color: #9a9288;
	line-height: 1.3;
}
.tianzi-wrap {
	position: relative;
	border-radius: 10rpx;
	overflow: hidden;
	background: #faf8f5;
}
.daily-stroke-canvas {
	display: block;
	margin: 0 auto;
}
.char-fallback {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
	font-size: 72rpx;
	color: #c4bbb0;
}
.char-fallback.placeholder {
	opacity: 0.65;
}
.tianzi-actions {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	gap: 12rpx;
	margin-top: 4rpx;
}
.link-stroke {
	font-size: 22rpx;
	color: #5d4037;
	text-decoration: underline;
}
.dense-row {
	display: flex;
	flex-direction: row;
	align-items: flex-start;
	gap: 10rpx;
	padding: 6rpx 0;
	border-top: 1rpx solid #f0ebe3;
}
.stroke-dense {
	border-top: none;
	padding-top: 0;
}
.dense-k {
	flex-shrink: 0;
	width: 56rpx;
	font-size: 22rpx;
	font-weight: 700;
	color: #6d4c41;
	line-height: 1.35;
}
.dense-v {
	flex: 1;
	min-width: 0;
	font-size: 32rpx;
	color: #5d4037;
	line-height: 1.38;
}
.dense-glyphs {
	display: block;
	font-size: 36rpx;
	color: #2c2419;
	line-height: 1.35;
	margin-bottom: 2rpx;
}
.dense-names {
	display: block;
	font-size: 20rpx;
	color: #6d4c41;
	line-height: 1.35;
}
.clamp-1 {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 1;
	overflow: hidden;
}
.clamp-2 {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
}
.btn-bar {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	gap: 8rpx;
	margin-top: 8rpx;
}
.btn-bar-sub {
	margin-top: 6rpx;
}
.btn-mini {
	margin: 6rpx;
	flex: 1;
	min-width: 22%;
}
.foot-spacer {
	height: 8rpx;
}
.font-pinyin {
	font-family: 'Pinyin Regular', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
</style>
