<template>
	<view class="page">
		<!-- 顶区背景向下延伸，导航浮在上方（仿微信小程序自定义顶栏） -->
		<view class="page-header-bg" :style="headerBgStyle">
			<image class="page-header-bg-img" src="/static/mengmeng/hero-bg.png" mode="aspectFill" />
			<view class="page-header-bg-fade" />
		</view>

		<meng-page-nav title="查询详情结果" class="result-nav" @back="goBack">
			<template #right>
				<view class="nav-right" @click="speakCurrentPinyin">
					<text class="nav-right-icon">🔊</text>
				</view>
			</template>
		</meng-page-nav>

		<scroll-view scroll-y class="page-scroll">
			<!-- 左缘：部首/结构/笔画；右侧区域：田字格居中 -->
			<view class="hero-section">
				<view class="hero-meta-col">
					<view class="meta-side-card">
						<text class="meta-side-k">部首</text>
						<text class="meta-side-v">{{ ext.radical || '—' }}</text>
					</view>
					<view class="meta-side-card">
						<text class="meta-side-k">结构</text>
						<text class="meta-side-v">{{ ext.structure || '—' }}</text>
					</view>
					<view class="meta-side-card">
						<text class="meta-side-k">笔画</text>
						<text class="meta-side-v meta-side-v--num">{{ ext.strokes ?? '—' }}</text>
					</view>
					<view class="meta-side-card meta-side-card--tap" @click.stop="toggleStrokePlayer">
						<text class="meta-side-k">笔顺</text>
						<text class="meta-side-v meta-side-v--action">{{
							resultStrokeAnimating ? '暂停' : '动画'
						}}</text>
					</view>
				</view>
				<view class="hero-stage">
					<view class="hero-center">
						<view class="hero-tianzi-wrap" :style="tianziUnifiedStyle">
						<view class="hero-tianzi-unified">
							<view class="tianzi-pinyin-row">
								<view class="tianzi-pinyin-edge" @click.stop="speakCurrentPinyin">
									<pinyin-four-lines-row
										v-if="pinyinRowSyllables.length"
										class="pinyin-edge-full"
										:syllables="pinyinRowSyllables"
										size="md"
									/>
									<text v-else class="pinyin-edge-plain font-pinyin">{{ pinyinPlain }}</text>
								</view>
								<view
									class="tianzi-speak-btn"
									:class="{ 'tianzi-speak-btn--playing': dictPinyinPlaying }"
									role="button"
									aria-label="听读音"
									@click.stop="speakCurrentPinyin"
								>
									<image
										v-if="showLabaImg"
										:key="'laba-' + labaImgSrcIndex"
										class="tianzi-speak-img"
										:src="labaImgSrc"
										mode="aspectFit"
										:show-menu-by-longpress="false"
										@error="onLabaImgError"
									/>
									<image
										v-else
										class="tianzi-speak-img tianzi-speak-img--fallback"
										:src="labaFallbackIconSrc"
										mode="aspectFit"
									/>
									<!-- <text class="tianzi-speak-label">听读音</text> -->
								</view>
							</view>
							<view class="hero-tianzi-body" @click="speakCurrentPinyin">
								<hanzi-stroke-player
									ref="strokePlayer"
									canvas-id="result-stroke-box"
									:char="displayHanzi"
									:display-pinyin="pinyin"
									:narrator="narrator"
									:length="tianziLength"
									:show-play-fab="false"
									:stroke-audio-enabled="true"
									:hide-stroke-hint="true"
									@animating-change="onStrokeAnimatingChange"
									@click-canvas="speakCurrentPinyin"
								/>
							</view>
						</view>
						</view>
					</view>
				</view>
			</view>

			<view v-if="hasStrokeAnalysis" class="stroke-analysis-full">
				<!-- <text class="stroke-analysis-title">笔顺分解</text> -->
				<text v-if="ext.strokeShapes" class="stroke-analysis-glyphs">{{ ext.strokeShapes }}</text>
				<text v-if="ext.strokeNames" class="stroke-analysis-names">{{ ext.strokeNames }}</text>
			</view>

			<view v-if="ext.tradForm" class="trad-row">
				<text class="trad-k">繁体</text>
				<text class="trad-v">{{ ext.tradForm }}</text>
			</view>

			<text v-if="lessonHint" class="lesson-line">课次：{{ lessonHint }}</text>

			<view v-if="ext.explainText" class="info-card info-explain">
				<text class="info-card-title">释义</text>
				<text class="info-body">{{ ext.explainText }}</text>
			</view>

			<view v-if="wordsLine" class="info-card info-words" id="result-words-block">
				<text class="info-card-title">组词</text>
				<text class="info-body">{{ wordsLine }}</text>
			</view>

			<!-- 推荐区 -->
			<view v-if="sameLesson.length || similarChars.length" class="reco-section">
				<view class="reco-head">
					<text class="reco-head-left">同课推荐</text>
					<text class="reco-head-right">相近字</text>
				</view>
				<scroll-view scroll-x class="reco-scroll" :show-scrollbar="false" enable-flex>
					<view class="reco-scroll-inner">
						<view
							v-for="ch in sameLesson"
							:key="'s-' + ch"
							class="reco-card reco-card-same"
							@click="onPickRecoChar(ch)"
						>
							<view class="reco-avatar">
								<text class="reco-avatar-emoji">🐰</text>
							</view>
							<text class="reco-char">{{ ch }}</text>
							<text class="reco-tag">同课推荐</text>
						</view>
						<view
							v-for="ch in similarChars"
							:key="'p-' + ch"
							class="reco-card reco-card-sim"
							@click="onPickRecoChar(ch)"
						>
							<view class="reco-avatar reco-avatar-sim">
								<text class="reco-avatar-emoji">🐰</text>
							</view>
							<text class="reco-char">{{ ch }}</text>
							<text class="reco-tag reco-tag-sim">相近字</text>
						</view>
					</view>
				</scroll-view>
			</view>

			<view class="bottom-spacer" />
		</scroll-view>

		<view class="bottom-bar" :style="bottomBarStyle">
			<button class="bar-btn bar-learned" @click="markLearned">加入已学</button>
			<button class="bar-btn bar-wrong" @click="markWrong">加入易错</button>
		</view>
	</view>
</template>

<script>
import { getAudioNarrator } from '@/utils/audio-settings.js'
import {
	speakDictionaryEntryPinyin,
	DICTIONARY_LOCAL_PINYIN_OPTS
} from '@/utils/dictionary-pinyin-speak.js'
import { stopLocalPinyinAudio } from '@/utils/play-pinyin-local-audio.js'
import { getCurriculumPrefs } from '@/utils/curriculum-storage.js'
import { recordCharLearned, recordCharWrong } from '@/repositories/learning-repository.js'
import { getDictionaryEntry, getDictionaryRelated } from '@/repositories/dictionary-repository.js'
import PinyinFourLinesRow from '@/components/pinyin-four-lines-row.vue'
import HanziStrokePlayer from '@/components/hanzi-stroke-player.vue'
import MengPageNav from '@/components/meng-page-nav.vue'
import { getMengNavMetrics, mengHeaderBgHeightStyle } from '@/utils/meng-nav-metrics.js'
import { splitPinyinDisplayTokens } from '@/utils/pinyin-display-tokens.js'
import cnchar from '@/utils/cnchar-setup.js'
import {
	MENG_ASSETS,
	buildMengAssetSrcCandidates,
	resolveMengAssetUrl
} from '@/utils/mengmeng-assets.js'
import { navigateToDictionaryHome } from '@/utils/root-nav.js'
import { stopStrokeOrderAudio } from '@/utils/stroke-order-audio.js'

export default {
	components: {
		PinyinFourLinesRow,
		HanziStrokePlayer,
		MengPageNav
	},
	data() {
		return {
			statusBarPx: 0,
			assets: MENG_ASSETS,
			/** 听读音图 src 候选下标（App 逐级重试） */
			labaImgSrcIndex: 0,
			labaImgFailed: false,
			narrator: 'kid',
			dictPinyinPlaying: false,
			hanzi: '',
			pinyin: '',
			lessonHint: '',
			ext: {
				radical: '-',
				structure: '-',
				strokes: '-',
				words: ['暂无组词'],
				explainText: '',
				strokeShapes: '',
				strokeNames: '',
				tradForm: ''
			},
			sameLesson: [],
			similarChars: [],
			resultStrokeAnimating: false,
			/** 与 hanzi-stroke-player 默认 length 一致，用于统一拼音/田字格宽度 */
			tianziLength: 168
		}
	},
	computed: {
		tianziShellPx() {
			return this.tianziLength + 30
		},
		tianziUnifiedStyle() {
			return {
				width: `${this.tianziShellPx}px`,
				maxWidth: '100%'
			}
		},
		pinyinRowSyllables() {
			if (this.pinyinSyllableTokens.length) return this.pinyinSyllableTokens
			const s = this.pinyinPlain
			if (s && s !== '—' && s !== '-') return [s]
			return []
		},
		hasStrokeAnalysis() {
			return !!(this.ext.strokeShapes || this.ext.strokeNames)
		},
		labaImgSrcList() {
			return buildMengAssetSrcCandidates(MENG_ASSETS.laba)
		},
		labaImgSrc() {
			const list = this.labaImgSrcList
			if (!list.length) return MENG_ASSETS.laba
			const i = Math.min(this.labaImgSrcIndex, list.length - 1)
			return list[i]
		},
		showLabaImg() {
			return !this.labaImgFailed
		},
		labaFallbackIconSrc() {
			return resolveMengAssetUrl(MENG_ASSETS.laba)
		},
		/** 顶图区高度：状态栏 + 导航 + 向下延伸一段，与下方内容自然衔接 */
		headerBgStyle() {
			return mengHeaderBgHeightStyle(this.statusBarPx, 56)
		},
		bottomBarStyle() {
			return { paddingBottom: 'calc(16rpx + env(safe-area-inset-bottom))' }
		},
		displayHanzi() {
			const c = String(this.hanzi || '').trim().charAt(0)
			if (!c || c === '—') return this.hanzi || '—'
			try {
				if (typeof cnchar.isCnChar === 'function' && !cnchar.isCnChar(c)) return c
			} catch (_) {}
			return c
		},
		pinyinPlain() {
			const t = String(this.pinyin || '').replace(/[()（）]/g, '').trim()
			return t || '—'
		},
		pinyinSyllableTokens() {
			const tokens = splitPinyinDisplayTokens(this.pinyin)
			if (tokens.length) return tokens
			const s = String(this.pinyin || '').trim().replace(/[()（）]/g, '').trim()
			if (s && s !== '—' && s !== '-') return [s]
			return []
		},
		wordsLine() {
			const w = this.ext.words
			if (!Array.isArray(w) || !w.length) return ''
			if (w.length === 1 && w[0] === '暂无组词') return ''
			return w.join(' / ')
		},
	},
	onLoad(query) {
		this.statusBarPx = getMengNavMetrics().statusBarPx
		const hanzi = query.hanzi ? decodeURIComponent(query.hanzi) : ''
		const pinyin = query.pinyin ? decodeURIComponent(query.pinyin) : ''
		const lessonHint = query.lesson ? decodeURIComponent(query.lesson) : ''
		this.resetLabaImgSrc()
		this.loadResultPage({ hanzi, pinyin, lessonHint })
	},
	onShow() {
		this.statusBarPx = getMengNavMetrics().statusBarPx
		this.narrator = getAudioNarrator()
	},
	onHide() {
		stopLocalPinyinAudio()
		this.$refs.strokePlayer?.stopAnimation()
	},
	onUnload() {
		stopLocalPinyinAudio()
		this.$refs.strokePlayer?.stopAnimation()
	},
	methods: {
		resetLabaImgSrc() {
			this.labaImgSrcIndex = 0
			this.labaImgFailed = false
		},
		onLabaImgError(e) {
			const list = this.labaImgSrcList
			if (this.labaImgSrcIndex < list.length - 1) {
				this.labaImgSrcIndex += 1
				return
			}
			this.labaImgFailed = true
			console.warn('[result] laba.png load failed', this.labaImgSrc, e)
		},
		onStrokeAnimatingChange(v) {
			this.resultStrokeAnimating = !!v
		},
		toggleStrokePlayer() {
			this.$refs.strokePlayer?.toggleAnimation()
		},
		reloadStrokePlayer() {
			this.$nextTick(() => {
				this.$refs.strokePlayer?.reload()
			})
		},
		goBack() {
			this.navigateBackAfterAction()
		},
		navigateBackAfterAction() {
			stopLocalPinyinAudio()
			const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
			if (pages.length > 1) {
				uni.navigateBack({ delta: 1 })
				return
			}
			navigateToDictionaryHome()
		},
		markCurrentAsLearned() {
			const h = String(this.hanzi || '')
				.trim()
				.match(/[\u4e00-\u9fff]/)?.[0]
			if (!h) return false
			recordCharLearned(h, getCurriculumPrefs())
			return true
		},
		async loadResultPage(payload) {
			const hanzi = String(payload.hanzi || '').trim()
			let lessonHint = String(payload.lessonHint || '').trim()
			let pinyin = String(payload.pinyin || '').trim()
			this.$refs.strokePlayer?.stopAnimation()
			if (!hanzi || hanzi === '—') {
				this.hanzi = hanzi || '—'
				this.pinyin = pinyin
				this.lessonHint = lessonHint
				this.ext = {
					radical: '-',
					structure: '-',
					strokes: '-',
					words: ['暂无组词'],
					explainText: '',
					strokeShapes: '',
					strokeNames: '',
					tradForm: ''
				}
				this.sameLesson = []
				this.similarChars = []
				this.reloadStrokePlayer()
				return
			}
			const entry = await getDictionaryEntry(hanzi, lessonHint)
			if (entry) {
				pinyin = String(pinyin || entry.pinyin || '').replace(/\s+/g, ' ').trim()
				lessonHint = lessonHint || entry.lessonHint || ''
			} else if (pinyin) {
				pinyin = String(pinyin).replace(/\s+/g, ' ').trim()
			}
			const related = await getDictionaryRelated(hanzi, lessonHint)
			const ext = entry
				? {
						radical: entry.radical,
						structure: entry.structure,
						strokes: entry.strokes,
						words: entry.words,
						explainText: entry.explainText || '',
						strokeShapes: entry.strokeShapes || '',
						strokeNames: entry.strokeNames || '',
						tradForm: entry.tradForm || ''
					}
				: {
						radical: '-',
						structure: '-',
						strokes: '-',
						words: ['暂无组词'],
						explainText: '',
						strokeShapes: '',
						strokeNames: '',
						tradForm: ''
					}
			this.resetLabaImgSrc()
			this.hanzi = hanzi
			this.pinyin = pinyin
			this.lessonHint = lessonHint
			this.ext = ext
			this.sameLesson = related.sameLesson || []
			this.similarChars = related.similar || []
			this.reloadStrokePlayer()
			try {
				uni.pageScrollTo({ scrollTop: 0, duration: 0 })
			} catch (_) {}
		},
		async speakCurrentPinyin() {
			if (!this.hanzi || this.hanzi === '—' || this.dictPinyinPlaying) return
			if (this.resultStrokeAnimating) stopStrokeOrderAudio()
			this.dictPinyinPlaying = true
			try {
				const ok = await speakDictionaryEntryPinyin({
					hanzi: this.hanzi,
					fallbackPinyin: this.pinyin,
					narrator: this.narrator,
					...DICTIONARY_LOCAL_PINYIN_OPTS
				})
				if (!ok) {
					uni.showToast({ title: '未播放成功，请检查静音或重试', icon: 'none' })
				}
			} finally {
				this.dictPinyinPlaying = false
			}
		},
		markLearned() {
			if (!this.markCurrentAsLearned()) return
			uni.showToast({ title: '已加入学过字库', icon: 'success', duration: 1000 })
			setTimeout(() => this.navigateBackAfterAction(), 450)
		},
		markWrong() {
			const h = String(this.hanzi || '')
				.trim()
				.match(/[\u4e00-\u9fff]/)?.[0]
			if (!h) return
			recordCharWrong(h, 1, getCurriculumPrefs())
			uni.showToast({ title: '已加入易错字', icon: 'none', duration: 1000 })
			setTimeout(() => this.navigateBackAfterAction(), 450)
		},
		async onPickRecoChar(ch) {
			const c = String(ch || '')
				.trim()
				.match(/[\u4e00-\u9fff]/)?.[0]
			if (!c) return
			const prev = String(this.hanzi || '')
				.trim()
				.match(/[\u4e00-\u9fff]/)?.[0]
			if (prev) {
				recordCharLearned(prev, getCurriculumPrefs())
			}
			stopLocalPinyinAudio()
			if (c === prev) {
				uni.showToast({ title: '已标为已学', icon: 'success', duration: 1000 })
				setTimeout(() => this.navigateBackAfterAction(), 450)
				return
			}
			await this.loadResultPage({
				hanzi: c,
				pinyin: '',
				lessonHint: this.lessonHint
			})
			if (prev) {
				uni.showToast({ title: `「${prev}」已学，正在看「${c}」`, icon: 'none', duration: 1400 })
			}
			await this.$nextTick()
			await this.speakCurrentPinyin()
		}
	}
}
</script>

<style scoped>
.page {
	height: 100vh;
	min-height: 100vh;
	background: var(--meng-page-bg);
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	position: relative;
}

/* 顶区背景（延伸至导航栏下方） */
.page-header-bg {
	position: absolute;
	left: 0;
	right: 0;
	top: 0;
	z-index: 0;
	overflow: hidden;
	pointer-events: none;
}

.page-header-bg-img {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
}

.page-header-bg-fade {
	position: absolute;
	inset: 0;
	background: var(--meng-page-bg);
}

.result-nav {
	position: relative;
	z-index: 2;
	flex-shrink: 0;
}

.nav-right {
	width: 72rpx;
	height: 72rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.nav-right-icon {
	font-size: 36rpx;
}

.page-scroll {
	position: relative;
	z-index: 1;
	flex: 1;
	height: 0;
	width: 100%;
	box-sizing: border-box;
}

/* 整行：左缘属性列 + 右侧田字格舞台 */
.hero-section {
	width: 100%;
	box-sizing: border-box;
	display: flex;
	flex-direction: row;
	align-items: flex-start;
	min-height: 320rpx;
	margin-top: -8rpx;
}

.hero-meta-col {
	flex-shrink: 0;
	align-self: stretch;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	justify-content: flex-start;
	gap: 10rpx;
	padding-top: 56rpx;
	padding-left: env(safe-area-inset-left, 0px);
	padding-right: 0;
	margin: 0;
}

.meta-side-card {
	width: 100rpx;
	padding: 12rpx 10rpx 12rpx 8rpx;
	border-radius: 0 18rpx 18rpx 0;
	background: #fffef9;
	border: 1rpx solid rgba(255, 154, 69, 0.28);
	border-left: none;
	box-shadow: 4rpx 6rpx 16rpx var(--meng-shadow);
	box-sizing: border-box;
	text-align: center;
}

.meta-side-k {
	display: block;
	font-size: 22rpx;
	color: var(--meng-text-muted);
	margin-bottom: 6rpx;
}

.meta-side-v {
	display: block;
	font-size: 36rpx;
	font-weight: 700;
	color: var(--meng-text);
	line-height: 1.2;
	word-break: break-all;
}

.meta-side-v--num {
	font-size: 40rpx;
	font-variant-numeric: tabular-nums;
}

.meta-side-card--tap:active {
	opacity: 0.88;
	transform: scale(0.98);
}

.meta-side-v--action {
	font-size: 30rpx;
	letter-spacing: 0.02em;
}

.hero-stage {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: row;
	justify-content: center;
	align-items: flex-start;
	padding: 24rpx 20rpx 12rpx 4rpx;
	box-sizing: border-box;
}

.hero-center {
	position: relative;
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding-right: 12rpx;
	padding-bottom: 8rpx;
	box-sizing: border-box;
}

.hero-tianzi-wrap {
	position: relative;
	flex-shrink: 0;
	box-sizing: border-box;
}

.hero-tianzi-unified {
	position: relative;
	width: 100%;
	background: var(--meng-card-solid);
	border-radius: 28rpx;
	box-shadow: 0 12rpx 36rpx var(--meng-shadow);
	border: 2rpx solid rgba(255, 255, 255, 0.9);
	overflow: hidden;
	box-sizing: border-box;
}

.tianzi-pinyin-row {
	display: flex;
	flex-direction: row;
	align-items: center;
	width: 100%;
	box-sizing: border-box;
	background: #fff8f0;
	border-bottom: 2rpx solid #e8d5c8;
}

.tianzi-speak-btn {
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 96rpx;
	padding: 6rpx 10rpx 4rpx 4rpx;
	background: transparent;
	border: none;
}

.tianzi-speak-btn--playing .tianzi-speak-img {
	animation: tianzi-speak-pulse 0.85s ease-in-out infinite;
}

@keyframes tianzi-speak-pulse {
	0%,
	100% {
		transform: scale(1);
	}
	50% {
		transform: scale(1.06);
	}
}

.tianzi-speak-img {
	width: 80rpx;
	height: 80rpx;
	display: block;
}

.tianzi-speak-img--fallback {
	opacity: 0.92;
}

.tianzi-speak-label {
	margin-top: 0;
	font-size: 18rpx;
	font-weight: 700;
	color: var(--meng-tab-active-text);
	white-space: nowrap;
	pointer-events: none;
}

.tianzi-pinyin-edge {
	flex: 1;
	min-width: 0;
	padding: 8rpx 0 6rpx 4rpx;
	box-sizing: border-box;
}

.pinyin-edge-full {
	width: 100%;
	display: block;
}

.pinyin-edge-plain {
	display: block;
	text-align: center;
	font-size: 30rpx;
	line-height: 1.2;
	color: var(--meng-text);
	padding: 12rpx 8rpx;
}

.hero-tianzi-body {
	padding: 6rpx;
	display: flex;
	justify-content: center;
	box-sizing: border-box;
}

.hero-tianzi-body :deep(.hanzi-stroke-player) {
	width: 100%;
}

.hero-tianzi-body :deep(.tianzi-shell) {
	margin: 0 auto;
}

/* 笔顺分解：通栏全宽 */
.stroke-analysis-full {
	width: 100%;
	box-sizing: border-box;
	padding: 20rpx 28rpx 24rpx;
	margin: 0 0 8rpx;
	background: #f9fbe7;
	border-top: 2rpx solid #c5e1a5;
	border-bottom: 2rpx solid #c5e1a5;
}

.stroke-analysis-title {
	display: block;
	font-size: 26rpx;
	font-weight: 700;
	color: var(--meng-text);
	margin-bottom: 12rpx;
}

.stroke-analysis-glyphs {
	display: block;
	width: 100%;
	font-size: 30rpx;
	color: var(--meng-text);
	letter-spacing: 0.14em;
	line-height: 1.5;
	word-break: break-all;
	text-align: center;
	margin-bottom: 8rpx;
}

.stroke-analysis-names {
	display: block;
	width: 100%;
	font-size: 26rpx;
	color: var(--meng-text-secondary);
	line-height: 1.55;
	word-break: break-all;
	text-align: center;
}

.trad-row {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	gap: 12rpx;
	margin: 0 28rpx 12rpx;
	padding: 12rpx 20rpx;
	border-radius: 16rpx;
	background: rgba(255, 255, 255, 0.88);
	border: 1rpx solid var(--meng-border);
}

.trad-k {
	font-size: 24rpx;
	color: var(--meng-text-muted);
}

.trad-v {
	font-size: 32rpx;
	font-weight: 700;
	color: var(--meng-text);
}

.lesson-line {
	display: block;
	margin: 0 28rpx 16rpx;
	font-size: 24rpx;
	color: var(--meng-text-muted);
}

/* 快捷操作 */
.quick-actions {
	margin: 0 24rpx 20rpx;
}

.quick-pair {
	display: flex;
	flex-direction: row;
	gap: 16rpx;
}

.quick-pair--single .quick-pill {
	flex: 1;
}

.quick-pill {
	flex: 1;
	text-align: center;
	padding: 18rpx 12rpx;
	border-radius: 999rpx;
	font-size: 26rpx;
	font-weight: 600;
}

.pill-warm {
	background: var(--meng-accent-solid);
	color: #fffef9;
	box-shadow: 0 6rpx 16rpx var(--meng-shadow-warm);
}

.pill-leaf {
	background: var(--meng-leaf);
	color: #fffef9;
}

/* 信息卡 */
.info-card {
	margin: 0 24rpx 16rpx;
	padding: 20rpx 22rpx;
	border-radius: 20rpx;
	background: rgba(255, 255, 255, 0.92);
	border: 1rpx solid var(--meng-border);
}

.info-explain {
	background: #fff8f5;
}

.info-card-title {
	display: block;
	font-size: 26rpx;
	font-weight: 700;
	color: var(--meng-text);
	margin-bottom: 10rpx;
}

.info-glyphs {
	display: block;
	font-size: 30rpx;
	color: var(--meng-text);
	margin-bottom: 6rpx;
	word-break: break-all;
}

.info-names {
	display: block;
	font-size: 24rpx;
	color: var(--meng-text-secondary);
	line-height: 1.45;
}

.info-body {
	display: block;
	font-size: 26rpx;
	color: var(--meng-text);
	line-height: 1.55;
}

/* 推荐 */
.reco-section {
	margin: 8rpx 0 24rpx;
}

.reco-head {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	padding: 0 28rpx 12rpx;
}

.reco-head-left,
.reco-head-right {
	font-size: 26rpx;
	font-weight: 700;
	color: var(--meng-text-secondary);
}

.reco-scroll {
	width: 100%;
	white-space: nowrap;
}

.reco-scroll-inner {
	display: flex;
	flex-direction: row;
	padding: 0 24rpx 8rpx;
	gap: 18rpx;
}

.reco-card {
	flex-shrink: 0;
	width: 160rpx;
	padding: 18rpx 14rpx 16rpx;
	border-radius: 22rpx;
	background: var(--meng-card-solid);
	display: flex;
	flex-direction: column;
	align-items: center;
	box-sizing: border-box;
}

.reco-card-same {
	border: 3rpx solid var(--meng-accent-solid);
	box-shadow: 0 6rpx 18rpx var(--meng-shadow-warm);
}

.reco-card-sim {
	border: 3rpx solid #5c9fd6;
	box-shadow: 0 6rpx 16rpx rgba(92, 159, 214, 0.25);
}

.reco-avatar {
	width: 72rpx;
	height: 72rpx;
	border-radius: 50%;
	background: var(--meng-banner-soft);
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 10rpx;
}

.reco-avatar-sim {
	background: #e8f4fc;
}

.reco-avatar-emoji {
	font-size: 40rpx;
}

.reco-char {
	font-size: 44rpx;
	font-weight: 700;
	color: var(--meng-text);
	margin-bottom: 6rpx;
}

.reco-tag {
	font-size: 20rpx;
	color: var(--meng-tab-active-text);
}

.reco-tag-sim {
	color: #2e6ea8;
}

.bottom-spacer {
	height: 32rpx;
}

/* 底栏 */
.bottom-bar {
	flex-shrink: 0;
	display: flex;
	flex-direction: row;
	gap: 20rpx;
	padding: 16rpx 24rpx 0;
	background: rgba(255, 252, 248, 0.96);
	border-top: 1rpx solid var(--meng-border);
	box-shadow: 0 -8rpx 24rpx var(--meng-shadow);
}

.bar-btn {
	flex: 1;
	height: 88rpx;
	line-height: 88rpx;
	border-radius: 999rpx;
	font-size: 30rpx;
	font-weight: 700;
	border: none;
	padding: 0;
	margin: 0;
}

.bar-btn::after {
	border: none;
}

.bar-learned {
	background: var(--meng-leaf);
	color: #fffef9;
}

.bar-wrong {
	background: var(--meng-accent-solid);
	color: #fffef9;
	box-shadow: 0 6rpx 18rpx var(--meng-shadow-warm);
}
</style>
