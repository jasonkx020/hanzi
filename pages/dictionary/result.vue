<template>
	<view class="page">
		<view class="nav-bar" :style="navBarStyle">
			<view class="nav-inner">
				<view class="nav-back" @click="goBack">
					<text class="nav-back-icon">‹</text>
				</view>
				<text class="nav-title">查询详情结果</text>
				<view class="nav-right" @click="speakCurrentPinyin">
					<text class="nav-right-icon">🔊</text>
				</view>
			</view>
		</view>

		<scroll-view scroll-y class="page-scroll">
			<!-- 田字格 + 吉祥物 + 笔顺播放 -->
			<view class="hero-block">
				<view class="hero-mascot-wrap" aria-hidden="true">
					<image
						v-if="mascotImgOk"
						class="hero-mascot"
						src="/static/db.png"
						mode="aspectFit"
						@error="mascotImgOk = false"
					/>
					<text v-else class="hero-mascot-fallback">🐰</text>
				</view>
				<view class="hero-tianzi-card">
					<hanzi-stroke-player
						ref="strokePlayer"
						canvas-id="result-stroke-box"
						:char="displayHanzi"
						:display-pinyin="pinyin"
						:narrator="narrator"
						:length="168"
						:show-play-fab="true"
						:stroke-audio-enabled="true"
						@animating-change="onStrokeAnimatingChange"
						@click-canvas="speakCurrentPinyin"
					/>
				</view>
			</view>

			<!-- 主拼音 -->
			<view class="pinyin-block" @click="speakCurrentPinyin">
				<view v-if="pinyinSyllableTokens.length" class="pinyin-tokens">
					<view
						v-for="(tok, ti) in pinyinSyllableTokens"
						:key="'hero-py-' + ti"
						class="pinyin-token-row"
					>
						<pinyin-four-lines-row class="pinyin-token-core" :syllables="[tok]" size="md" />
					</view>
				</view>
				<text v-else class="pinyin-plain font-pinyin">{{ pinyinPlain }}</text>
			</view>

			<!-- 属性横向芯片 -->
			<scroll-view scroll-x class="meta-scroll" :show-scrollbar="false" enable-flex>
				<view class="meta-scroll-inner">
					<view
						v-for="(chip, idx) in metaChips"
						:key="chip.key"
						class="meta-chip"
						:class="{ 'meta-chip-active': idx === 0 }"
					>
						<text class="meta-chip-py font-pinyin">{{ chip.pyHint }}</text>
						<text class="meta-chip-val">{{ chip.value }}</text>
						<text class="meta-chip-label">{{ chip.label }}</text>
					</view>
				</view>
			</scroll-view>

			<text v-if="lessonHint" class="lesson-line">课次：{{ lessonHint }}</text>

			<!-- 快捷操作 -->
			<view class="quick-actions">
				<view class="quick-wide" @click="toggleStrokePlayer">
					<text class="quick-wide-text">部首 · {{ ext.radical }}</text>
					<text class="quick-wide-arrow">›</text>
				</view>
				<view class="quick-pair">
					<view class="quick-pill pill-warm" @click="toggleStrokePlayer">
						<text>{{ resultStrokeAnimating ? '停笔顺' : '笔顺动画' }}</text>
					</view>
					<view class="quick-pill pill-leaf" @click="speakCurrentPinyin">
						<text>听读音</text>
					</view>
				</view>
			</view>

			<view v-if="ext.strokeShapes || ext.strokeNames" class="info-card info-stroke">
				<text class="info-card-title">笔顺分解</text>
				<text v-if="ext.strokeShapes" class="info-glyphs">{{ ext.strokeShapes }}</text>
				<text v-if="ext.strokeNames" class="info-names">{{ ext.strokeNames }}</text>
			</view>

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
							@click="goOther(ch)"
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
							@click="goOther(ch)"
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
import { splitPinyinDisplayTokens } from '@/utils/pinyin-display-tokens.js'
import cnchar from '@/utils/cnchar-setup.js'

export default {
	components: {
		PinyinFourLinesRow,
		HanziStrokePlayer
	},
	data() {
		return {
			statusBarPx: 0,
			mascotImgOk: true,
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
			resultStrokeAnimating: false
		}
	},
	computed: {
		navBarStyle() {
			return { paddingTop: this.statusBarPx + 'px' }
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
		metaChips() {
			const py = this.pinyinPlain
			const chips = [
				{ key: 'radical', label: '部首', value: this.ext.radical || '—', pyHint: py },
				{ key: 'structure', label: '结构', value: this.ext.structure || '—', pyHint: py },
				{ key: 'strokes', label: '笔画', value: String(this.ext.strokes ?? '—'), pyHint: py }
			]
			if (this.ext.tradForm) {
				chips.push({ key: 'trad', label: '繁体', value: this.ext.tradForm, pyHint: py })
			}
			return chips
		}
	},
	onLoad(query) {
		try {
			const sys = uni.getSystemInfoSync()
			this.statusBarPx = sys.statusBarHeight || 0
		} catch (_) {
			this.statusBarPx = 0
		}
		const hanzi = query.hanzi ? decodeURIComponent(query.hanzi) : ''
		const pinyin = query.pinyin ? decodeURIComponent(query.pinyin) : ''
		const lessonHint = query.lesson ? decodeURIComponent(query.lesson) : ''
		this.loadResultPage({ hanzi, pinyin, lessonHint })
	},
	onShow() {
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
			const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
			if (pages.length > 1) {
				uni.navigateBack()
				return
			}
			uni.switchTab({ url: '/pages/dictionary/index' })
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
			if (!this.hanzi) return
			recordCharLearned(this.hanzi, getCurriculumPrefs())
			uni.showToast({ title: '已加入学过字库', icon: 'success' })
		},
		markWrong() {
			if (!this.hanzi) return
			recordCharWrong(this.hanzi, 1, getCurriculumPrefs())
			uni.showToast({ title: '已加入易错字', icon: 'none' })
		},
		async goOther(ch) {
			const c = String(ch || '').trim().charAt(0)
			if (!c || c === this.hanzi) return
			stopLocalPinyinAudio()
			await this.loadResultPage({
				hanzi: c,
				pinyin: '',
				lessonHint: this.lessonHint
			})
			await new Promise((resolve) => {
				this.$nextTick(() => resolve())
			})
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
	background-image: url('/static/db.png');
	background-size: cover;
	background-position: center top;
	background-repeat: no-repeat;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
}

/* 顶栏 */
.nav-bar {
	flex-shrink: 0;
	background: rgba(255, 252, 248, 0.92);
	border-bottom: 1rpx solid var(--meng-border);
}

.nav-inner {
	height: 88rpx;
	display: flex;
	flex-direction: row;
	align-items: center;
	padding: 0 20rpx;
	box-sizing: border-box;
}

.nav-back {
	width: 72rpx;
	height: 72rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	background: var(--meng-card-solid);
	box-shadow: 0 4rpx 12rpx var(--meng-shadow);
}

.nav-back-icon {
	font-size: 48rpx;
	line-height: 1;
	color: var(--meng-text);
	margin-top: -4rpx;
}

.nav-title {
	flex: 1;
	text-align: center;
	font-size: 32rpx;
	font-weight: 700;
	color: var(--meng-text);
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
	flex: 1;
	height: 0;
	width: 100%;
	box-sizing: border-box;
}

/* 田字格区 */
.hero-block {
	position: relative;
	display: flex;
	flex-direction: row;
	align-items: flex-end;
	justify-content: center;
	padding: 28rpx 24rpx 8rpx;
	min-height: 320rpx;
}

.hero-mascot-wrap {
	position: absolute;
	left: 16rpx;
	bottom: 24rpx;
	width: 140rpx;
	height: 140rpx;
	z-index: 2;
	pointer-events: none;
}

.hero-mascot {
	width: 100%;
	height: 100%;
}

.hero-mascot-fallback {
	font-size: 100rpx;
	line-height: 1;
}

.hero-tianzi-card {
	position: relative;
	background: var(--meng-card-solid);
	border-radius: 28rpx;
	padding: 20rpx;
	box-shadow: 0 12rpx 36rpx var(--meng-shadow);
	border: 2rpx solid rgba(255, 255, 255, 0.9);
}

/* 拼音 */
.pinyin-block {
	margin: 8rpx 28rpx 16rpx;
	padding: 16rpx 20rpx;
	background: rgba(255, 255, 255, 0.88);
	border-radius: 20rpx;
	border: 1rpx solid var(--meng-border);
}

.pinyin-tokens {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8rpx;
}

.pinyin-token-row {
	width: 100%;
	display: flex;
	justify-content: center;
}

.pinyin-plain {
	display: block;
	text-align: center;
	font-size: 36rpx;
	color: var(--meng-text);
}

/* 属性芯片 */
.meta-scroll {
	width: 100%;
	white-space: nowrap;
	margin-bottom: 12rpx;
}

.meta-scroll-inner {
	display: flex;
	flex-direction: row;
	padding: 0 24rpx 8rpx;
	gap: 16rpx;
}

.meta-chip {
	flex-shrink: 0;
	width: 148rpx;
	padding: 14rpx 12rpx;
	border-radius: 18rpx;
	background: rgba(255, 255, 255, 0.9);
	border: 2rpx solid var(--meng-border);
	text-align: center;
	box-sizing: border-box;
}

.meta-chip-active {
	background: var(--meng-leaf-soft);
	border-color: var(--meng-leaf);
}

.meta-chip-py {
	display: block;
	font-size: 20rpx;
	color: var(--meng-text-muted);
	margin-bottom: 4rpx;
	overflow: hidden;
	text-overflow: ellipsis;
}

.meta-chip-val {
	display: block;
	font-size: 32rpx;
	font-weight: 700;
	color: var(--meng-text);
	margin-bottom: 4rpx;
}

.meta-chip-label {
	display: block;
	font-size: 22rpx;
	color: var(--meng-text-secondary);
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

.quick-wide {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	padding: 22rpx 24rpx;
	margin-bottom: 14rpx;
	border-radius: 20rpx;
	background: linear-gradient(90deg, #fff8f0, #ffece0);
	border: 1rpx solid rgba(255, 154, 69, 0.35);
}

.quick-wide-text {
	font-size: 28rpx;
	font-weight: 600;
	color: var(--meng-tab-active-text);
}

.quick-wide-arrow {
	font-size: 36rpx;
	color: var(--meng-accent-solid);
}

.quick-pair {
	display: flex;
	flex-direction: row;
	gap: 16rpx;
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
	background: linear-gradient(135deg, var(--meng-accent-from), var(--meng-accent-to));
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

.info-stroke {
	background: #f9fbe7;
	border-color: #c5e1a5;
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
	background: linear-gradient(135deg, var(--meng-accent-from), var(--meng-accent-to));
	color: #fffef9;
	box-shadow: 0 6rpx 18rpx var(--meng-shadow-warm);
}
</style>
