<template>
	<view class="page tab-root-page" :style="tabPageStyle">
		<!-- 汉字搜索 -->
		<view class="search-row">
			<text class="search-glyph">🔍</text>
			<input
				v-model="hanziInput"
				class="hanzi-input"
				type="text"
				maxlength="12"
				placeholder="输入汉字，如「萌」"
				confirm-type="search"
				@confirm="runHanziLookup"
			/>
			<text class="search-tool" @click="goSettings">⚙️</text>
		</view>
		<view class="quick-row">
			<button class="quick-btn" type="default" @click="openHandwritePad">
				<text class="quick-btn-text">✍️ 手写</text>
			</button>
			<button
				class="quick-btn"
				:class="radicalPanelOn ? 'quick-btn-active' : ''"
				type="default"
				@click="toggleRadicalPanel"
			>
				<text class="quick-btn-text">📖 部首检索</text>
			</button>
		</view>

		<!-- 部首筛选 -->
		<view v-if="radicalPanelOn" class="radical-panel">
			<text class="radical-title">按部首筛选字库（当前 {{ chars.length }} 字）</text>
			<view class="radical-chips">
				<text
					v-for="r in radicalOptions"
					:key="r"
					class="rad-chip"
					:class="radicalFilter === r ? 'rad-chip-on' : ''"
					@click="pickRadical(r)"
				>{{ r }}</text>
			</view>
			<text v-if="radicalFilter" class="radical-count">共 {{ radicalHits.length }} 个候选字 · 点字查看详情</text>
			<view v-if="radicalFilter && radicalHits.length" class="radical-grid">
				<view
					v-for="(row, i) in radicalHits"
					:key="row.id != null ? row.id : `${row.hanzi}-${i}`"
					class="rad-cell"
					@click="selectGridChar(row.hanzi)"
				>
					<text class="rad-cell-char">{{ row.hanzi }}</text>
				</view>
			</view>
		</view>

		<!-- 主体：查字结果卡片（田字格 + 属性 + 笔顺 + 组词 + 生字本） -->
		<view v-if="loadingEntry" class="loading-card">
			<text class="loading-text">加载中…</text>
		</view>
		<view v-else-if="activeEntry" class="hero-card">
			<!-- 左：田字格动画；右：拼音与部首等（并排省纵向空间，便于一屏看完） -->
			<view class="hero-top-row">
				<view class="hero-top-left" @click="playActiveDictionaryPinyin">
					<view class="tianzi-wrap-cnchar" :style="dictStrokeWrapStyle">
						<canvas
							v-if="dictStrokeReady && !dictAnimFallback"
							id="dict-stroke-box"
							canvas-id="dict-stroke-box"
							class="dict-stroke-canvas"
							disable-scroll
							:style="dictStrokeCanvasStyle"
						/>
						<text v-else-if="dictStrokeReady && dictAnimFallback" class="hero-char-fallback">{{ displayHanzi }}</text>
						<text v-else class="hero-char-fallback">{{ displayHanzi }}</text>
					</view>
				</view>
				<view class="hero-top-right">
					<view class="meta-compact" @click="playActiveDictionaryPinyin">
						<view class="meta-compact-row meta-compact-row-py">
							<text class="meta-compact-k">拼音</text>
							<view class="meta-compact-v meta-py-wrap">
								<view v-if="pinyinSyllableTokens.length" class="meta-py-row">
									<pinyin-four-lines-row :syllables="pinyinSyllableTokens" size="md" />
								</view>
								<text v-else class="meta-py-fallback font-pinyin">{{ pinyinDisplay }}</text>
							</view>
						</view>
						<view class="meta-compact-row">
							<text class="meta-compact-k">部首1</text>
							<text class="meta-compact-v">{{ activeEntry.radical }}</text>
						</view>
						<view class="meta-compact-row">
							<text class="meta-compact-k">结构</text>
							<text class="meta-compact-v">{{ activeEntry.structure }}</text>
						</view>
						<view class="meta-compact-row">
							<text class="meta-compact-k">笔画</text>
							<text class="meta-compact-v">{{ activeEntry.strokes }}</text>
						</view>
						<view v-if="activeEntry.tradForm" class="meta-compact-row meta-compact-row-trad">
							<text class="meta-compact-k">繁体</text>
							<text class="meta-compact-v">{{ activeEntry.tradForm }}</text>
						</view>
						<!-- <view class="meta-compact-speak" @click.stop="playActiveDictionaryPinyin">
							<image class="meta-compact-speak-img" :src="dictSpeakerIconSrc" mode="aspectFit" />
						</view> -->
					</view>
				</view>
			</view>
			<view class="stroke-box">
				<text class="stroke-title">✍️ 笔顺分解（对照左侧动画）</text>
				<text v-if="activeEntry.strokeShapes" class="stroke-glyphs">{{ activeEntry.strokeShapes }}</text>
				<text v-if="activeEntry.strokeNames" class="stroke-names">{{ activeEntry.strokeNames }}</text>
				<text class="stroke-desc">{{ strokeHint }}</text>
			</view>
			<view v-if="activeEntry.explainText" class="explain-box">
				<text class="explain-title">📙 释义（cnchar-explain）</text>
				<text class="explain-body">{{ activeEntry.explainText }}</text>
			</view>
			<view class="words-box">
				<text class="words-title">📖 组词 </text>
				<view class="words-wrap">
					<text v-for="(w, idx) in activeEntry.words" :key="`${w}-${idx}`" class="word-chip">{{ w }}</text>
				</view>
			</view>
			<view class="card-actions">
				<button class="notebook-btn" type="primary" @click="addToNotebook">➕ 加入生字本</button>
			</view>
		</view>
		<view v-else class="empty-card">
			<text class="empty-title">查一查汉字</text>
			<text class="empty-desc">
				输入汉字后即显示田字格内笔顺动画、拼音 / 部首 / 结构与组词释义等；手写练习请点「手写」进入实验室。部首检索结合 cnchar-radical 与教材字库。
			</text>
			<button type="default" size="mini" class="empty-btn" @click="tryDemoChar">试试「天」</button>
		</view>

		<!-- 汉字小侦探 -->
		<view class="detective" @click="playDetective">
			<text class="detective-emoji">🧸</text>
			<view class="detective-main">
				<text class="detective-label">汉字小侦探</text>
				<text class="detective-clue">{{ currentDetective.clue }}</text>
				<text class="detective-hint">点我揭晓并查看该字</text>
			</view>
		</view>

		<!-- 进阶：拼音筛选字表 -->
		<view class="advanced">
			<text class="advanced-toggle" @click="showPinyinTools = !showPinyinTools">
				{{ showPinyinTools ? '▼ 收起拼音筛选' : '▶ 拼音筛选（进阶）' }}
			</text>
			<text class="curriculum-hint">{{ summary }}</text>
			<view v-if="showPinyinTools" class="advanced-body">
				<input
					v-model="pinyinKeyword"
					class="pinyin-filter-input"
					type="text"
					placeholder="筛选拼音，如 tian"
					confirm-type="search"
				/>
				<text class="filter-tip">匹配到 {{ filteredChars.length }} 字</text>
				<view v-if="filteredChars.length" class="filter-grid">
					<view
						v-for="(row, i) in filteredChars"
						:key="row.id != null ? row.id : i"
						class="filter-cell"
						@click="selectGridChar(row.hanzi)"
					>
						<text class="filter-cell-char">{{ row.hanzi }}</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import cnchar from '@/utils/cnchar-setup.js'
import drawNative from '@/utils/draw-native.js'
import { spellDisplayString } from '@/utils/cnchar-spell-display.js'
import { getAudioNarrator } from '@/utils/audio-settings.js'
import { speakDictionaryEntryPinyin, DICTIONARY_LOCAL_PINYIN_OPTS } from '@/utils/dictionary-pinyin-speak.js'
import { stopLocalPinyinAudio } from '@/utils/play-pinyin-local-audio.js'
import { getCurriculumPrefs, formatCurriculumSummary } from '@/utils/curriculum-storage.js'
import { queryCurriculumChars } from '@/utils/curriculum-db.js'
import { getDictionaryEntry, getRadicalLabel } from '@/repositories/dictionary-repository.js'
import { recordCharLearned } from '@/repositories/learning-repository.js'
import tabMain from '@/mixins/tab-main-page.js'
import PinyinFourLinesRow from '@/components/pinyin-four-lines-row.vue'
import { splitPinyinDisplayTokens } from '@/utils/pinyin-display-tokens.js'

const DETECTIVES = [
	{ clue: '猜一猜「艹 + 明」是什么字？', answer: '萌' },
	{ clue: '「木 + 公」常组成？', answer: '松' },
	{ clue: '三点水加「青」', answer: '清' },
	{ clue: '「日 + 月」并排', answer: '明' },
	{ clue: '「女 + 子」合成', answer: '好' },
	{ clue: '「口 + 巴」是什么字？', answer: '吧' }
]

/** draw-native canvas 绘制边长（与 utils/draw-native 中 length+30 为画布外边一致） */
const DICTIONARY_STROKE_LENGTH = 148

export default {
	mixins: [tabMain],
	components: {
		PinyinFourLinesRow
	},
	data() {
		return {
			dictStrokeReady: false,
			dictAnimFallback: false,
			dictDrawWriter: null,
			dictStrokeMountGen: 0,
			dictStrokeAttachTimer: null,
			dictWordNotFoundRegistered: false,
			summary: '',
			chars: [],
			hanziInput: '',
			pinyinKeyword: '',
			activeEntry: null,
			pinyinDisplay: '',
			loadingEntry: false,
			radicalPanelOn: false,
			radicalFilter: '',
			radicalOptions: [],
			showPinyinTools: false,
			detectiveIndex: 0,
			narrator: 'kid',
			dictPinyinPlaying: false,
			/** 属性区右下角喇叭：按当前条目拼音播本地 opus（与拼音页一致） */
			dictSpeakerIconSrc:
				'data:image/svg+xml,' +
				encodeURIComponent(
					'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#9a9289"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>'
				)
		}
	},
	computed: {
		pinyinSyllableTokens() {
			const tokens = splitPinyinDisplayTokens(this.pinyinDisplay)
			if (tokens.length) return tokens
			const s = String(this.pinyinDisplay || '').trim()
			if (s && s !== '—' && s !== '-') return [s]
			return []
		},
		filteredChars() {
			const kw = this.normalizePinyin(this.pinyinKeyword)
			if (!kw) return this.chars
			return this.chars.filter((row) => {
				let py = this.normalizePinyin(row?.pinyin || '')
				if (!py) {
					const h = String(row?.hanzi || '').trim().charAt(0)
					if (h) {
						try {
							py = this.normalizePinyin(spellDisplayString(h, 'tone', 'poly', 'low'))
						} catch (_) {}
					}
				}
				return py.includes(kw)
			})
		},
		radicalHits() {
			if (!this.radicalFilter) return []
			return this.chars.filter((row) => getRadicalLabel(row.hanzi) === this.radicalFilter)
		},
		strokeHint() {
			if (!this.activeEntry) return ''
			const n = this.activeEntry.strokes
			const tail =
				this.dictStrokeReady && !this.dictAnimFallback
					? '可看左侧动画并对照下方笔画名'
					: '左侧动画加载中，可先对照下方笔画字形'
			return `共 ${n} 笔 · ${tail}`
		},
		dictStrokeCanvasStyle() {
			const px = DICTIONARY_STROKE_LENGTH + 30
			return {
				width: px + 'px',
				height: px + 'px',
				display: 'block'
			}
		},
		/** 外包框与画布逻辑像素一致；原先固定 268rpx 小于 178px 画布会导致右侧、底边被 overflow 裁切 */
		dictStrokeWrapStyle() {
			const px = DICTIONARY_STROKE_LENGTH + 30
			return {
				width: px + 'px',
				height: px + 'px',
				boxSizing: 'border-box'
			}
		},
		currentDetective() {
			return DETECTIVES[this.detectiveIndex % DETECTIVES.length]
		},
		/** 经 cnchar 校验的展示用单字（与 draw/cnchar 数据同源） */
		displayHanzi() {
			const e = this.activeEntry
			if (!e) return ''
			return this.resolveDictHanzi(e.hanzi)
		}
	},
	onShow() {
		this.setTabBarIndex(2)
		this.narrator = getAudioNarrator()
		this.summary = formatCurriculumSummary(getCurriculumPrefs())
		this.reloadDb()
	},
	onHide() {
		stopLocalPinyinAudio()
	},
	onUnload() {
		stopLocalPinyinAudio()
		this.teardownDictStroke()
	},
	methods: {
		registerDictWordNotFoundOnce() {
			if (this.dictWordNotFoundRegistered) return
			drawNative.onWordNotFound(() => {})
			this.dictWordNotFoundRegistered = true
		},
		/** 取 cnchar 认可的单个汉字；非法则返回首字供降级展示 */
		resolveDictHanzi(raw) {
			const c = String(raw || '').trim().charAt(0)
			if (!c) return ''
			try {
				if (typeof cnchar.isCnChar === 'function' && !cnchar.isCnChar(c)) return c
			} catch (_) {}
			return c
		},
		dictDrawSharedOpts(vm) {
			return {
				vm,
				style: {
					length: DICTIONARY_STROKE_LENGTH,
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
				test: {
					onTestStatus: () => {}
				}
			}
		},
		teardownDictStroke() {
			if (this.dictStrokeAttachTimer) {
				clearTimeout(this.dictStrokeAttachTimer)
				this.dictStrokeAttachTimer = null
			}
			this.dictStrokeMountGen++
			this.dictStrokeReady = false
			this.dictAnimFallback = false
			if (this.dictDrawWriter && typeof this.dictDrawWriter.destroy === 'function') {
				this.dictDrawWriter.destroy()
			}
			this.dictDrawWriter = null
		},
		destroyDictWritersOnly() {
			if (this.dictDrawWriter && typeof this.dictDrawWriter.destroy === 'function') {
				this.dictDrawWriter.destroy()
			}
			this.dictDrawWriter = null
		},
		scheduleDictStrokeMount() {
			const hanzi = this.resolveDictHanzi(this.activeEntry && this.activeEntry.hanzi)
			if (!hanzi || typeof drawNative !== 'function') {
				this.dictStrokeReady = false
				this.destroyDictWritersOnly()
				return
			}
			this.registerDictWordNotFoundOnce()
			this.dictStrokeReady = true
			this.dictAnimFallback = false
			this.destroyDictWritersOnly()
			if (this.dictStrokeAttachTimer) {
				clearTimeout(this.dictStrokeAttachTimer)
				this.dictStrokeAttachTimer = null
			}
			const token = ++this.dictStrokeMountGen
			const attach = () => {
				this.dictStrokeAttachTimer = null
				if (token !== this.dictStrokeMountGen) return
				this.mountDictStrokeWriters(hanzi)
			}
			this.$nextTick(() => {
				this.$nextTick(() => {
					this.dictStrokeAttachTimer = setTimeout(attach, 48)
				})
			})
		},
		mountDictStrokeWriters(char) {
			if (typeof drawNative !== 'function') {
				this.dictStrokeReady = false
				return
			}
			const vm = this
			const base = this.dictDrawSharedOpts(vm)
			try {
				this.dictDrawWriter = drawNative(char, {
					...base,
					el: '#dict-stroke-box',
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
				console.warn('[dictionary] dict animation mount failed', e)
				this.dictDrawWriter = null
				this.dictAnimFallback = true
			}
		},
		async reloadDb() {
			this.chars = await queryCurriculumChars(getCurriculumPrefs())
			this.rebuildRadicalOptions()
		},
		rebuildRadicalOptions() {
			const set = new Set()
			for (const row of this.chars) {
				const ch = String(row.hanzi || '').trim().charAt(0)
				if (!ch) continue
				const rad = getRadicalLabel(ch)
				if (rad && rad !== '—') set.add(rad)
			}
			this.radicalOptions = Array.from(set).sort((a, b) =>
				String(a).localeCompare(String(b), 'zh-Hans-CN')
			)
		},
		normalizePinyin(s) {
			return String(s || '')
				.toLowerCase()
				.normalize('NFD')
				.replace(/[\u0300-\u036f]/g, '')
				.replace(/\s+/g, '')
		},
		firstHanziFromInput(s) {
			const m = String(s || '').match(/[\u4e00-\u9fff]/)
			return m ? m[0] : ''
		},
		async runHanziLookup() {
			const ch = this.firstHanziFromInput(this.hanziInput)
			if (!ch) {
				uni.showToast({ title: '请输入汉字', icon: 'none' })
				return
			}
			await this.loadEntryForChar(ch)
		},
		async loadEntryForChar(ch) {
			const c = String(ch || '').trim().charAt(0)
			if (!c) return
			this.teardownDictStroke()
			this.loadingEntry = true
			this.activeEntry = null
			try {
				const row = this.chars.find((r) => String(r.hanzi || '').trim() === c)
				const lessonHint = row ? String(row.lesson_hint || '') : ''
				const entry = await getDictionaryEntry(c, lessonHint)
				if (!entry) {
					uni.showToast({ title: '未找到该字', icon: 'none' })
					return
				}
				this.activeEntry = entry
				this.hanziInput = c
				this.pinyinDisplay = entry.pinyin ? entry.pinyin : '—'
				this.scheduleDictStrokeMount()
			} finally {
				this.loadingEntry = false
			}
		},
		async playActiveDictionaryPinyin() {
			if (!this.activeEntry?.hanzi || this.dictPinyinPlaying) return
			this.dictPinyinPlaying = true
			try {
				await speakDictionaryEntryPinyin({
					hanzi: this.activeEntry.hanzi,
					// fallbackPinyin: this.pinyinDisplay,
					narrator: this.narrator,
					...DICTIONARY_LOCAL_PINYIN_OPTS
				})
			} finally {
				this.dictPinyinPlaying = false
			}
		},
		async selectGridChar(hanzi) {
			const c = String(hanzi || '').trim().charAt(0)
			if (!c) return
			const row = this.chars.find((r) => String(r.hanzi || '').trim() === c)
			const fp = row?.pinyin ? String(row.pinyin).replace(/\s+/g, ' ').trim() : ''
			if (!this.dictPinyinPlaying) {
				this.dictPinyinPlaying = true
				try {
					await speakDictionaryEntryPinyin({
						hanzi: c,
						fallbackPinyin: fp,
						narrator: this.narrator,
						...DICTIONARY_LOCAL_PINYIN_OPTS
					})
				} finally {
					this.dictPinyinPlaying = false
				}
			}
			this.hanziInput = c
			this.loadEntryForChar(c)
		},
		tryDemoChar() {
			this.hanziInput = '天'
			this.loadEntryForChar('天')
		},
		toggleRadicalPanel() {
			this.radicalPanelOn = !this.radicalPanelOn
			if (this.radicalPanelOn && !this.radicalOptions.length) this.rebuildRadicalOptions()
		},
		pickRadical(r) {
			this.radicalFilter = this.radicalFilter === r ? '' : r
		},
		openHandwritePad() {
			const q = this.activeEntry?.hanzi
				? `?hanzi=${encodeURIComponent(this.activeEntry.hanzi)}`
				: ''
			uni.navigateTo({ url: `/pages/tools/stroke${q}` })
		},
		addToNotebook() {
			if (!this.activeEntry?.hanzi) return
			recordCharLearned(this.activeEntry.hanzi, getCurriculumPrefs())
			uni.showToast({ title: '已加入生字本（已学字库）', icon: 'success' })
		},
		goSettings() {
			uni.navigateTo({ url: '/pages/settings/curriculum' })
		},
		playDetective() {
			const d = DETECTIVES[this.detectiveIndex % DETECTIVES.length]
			this.detectiveIndex++
			this.loadEntryForChar(d.answer)
			uni.showToast({ title: `揭晓：${d.answer}`, icon: 'none' })
		}
	}
}
</script>

<style scoped>
.page {
	min-height: 100vh;
	padding: 20rpx 24rpx 48rpx;
	background: #fff8e7;
	box-sizing: border-box;
}

.search-tool {
	font-size: 34rpx;
	padding: 8rpx 12rpx;
	margin-left: 8rpx;
	opacity: 0.9;
}

.search-row {
	display: flex;
	flex-direction: row;
	align-items: center;
	background: #fff;
	border-radius: 16rpx;
	padding: 6rpx 16rpx 6rpx 12rpx;
	box-shadow: 0 4rpx 16rpx rgba(78, 78, 78, 0.08);
	border: 1rpx solid #f0e6d4;
}

.search-glyph {
	font-size: 30rpx;
	margin-right: 10rpx;
	opacity: 0.85;
}

.hanzi-input {
	flex: 1;
	min-width: 0;
	height: 80rpx;
	font-size: 30rpx;
	color: #4e4e4e;
}

.quick-row {
	display: flex;
	flex-direction: row;
	margin-top: 18rpx;
}

.quick-btn {
	flex: 1;
	min-width: 0;
	height: 76rpx;
	line-height: 76rpx;
	border-radius: 14rpx;
	background: #fff;
	border: 1rpx solid #ffe0b2;
	padding: 0;
}

.quick-btn + .quick-btn {
	margin-left: 16rpx;
}

.quick-btn-active {
	background: #ffe8cc;
	border-color: #ffa726;
}

.quick-btn-text {
	font-size: 28rpx;
	color: #5d4037;
	font-weight: 600;
}

.radical-panel {
	margin-top: 20rpx;
	padding: 20rpx;
	background: #fff;
	border-radius: 16rpx;
	border: 1rpx solid #f0e6d4;
}

.radical-title {
	display: block;
	font-size: 24rpx;
	color: #9e9e9e;
	margin-bottom: 14rpx;
}

.radical-chips {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	margin: -6rpx;
}

.rad-chip {
	margin: 6rpx;
	padding: 10rpx 20rpx;
	border-radius: 999rpx;
	background: #f5f5f5;
	font-size: 26rpx;
	color: #4e4e4e;
}

.rad-chip-on {
	background: #fff3e0;
	color: #e65100;
	font-weight: 600;
	border: 1rpx solid #ffa726;
}

.radical-count {
	display: block;
	font-size: 24rpx;
	color: #8bc34a;
	margin-top: 12rpx;
	font-weight: 600;
}

.radical-grid {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	margin-top: 16rpx;
}

.rad-cell {
	flex: 0 0 22%;
	width: 22%;
	max-width: 22%;
	box-sizing: border-box;
	margin-right: 4%;
	margin-bottom: 12rpx;
	min-height: 72rpx;
	background: #fffef9;
	border-radius: 12rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1rpx solid #eee;
}

.rad-cell:nth-child(4n) {
	margin-right: 0;
}

.rad-cell-char {
	font-size: 38rpx;
	font-weight: 600;
	color: #2c2419;
}

.loading-card {
	margin-top: 24rpx;
	padding: 48rpx;
	background: #fff;
	border-radius: 20rpx;
	text-align: center;
}

.loading-text {
	font-size: 28rpx;
	color: #9e9e9e;
}

.hero-card {
	margin-top: 24rpx;
	padding: 28rpx 22rpx 32rpx;
	background: #fff;
	border-radius: 24rpx;
	box-shadow: 0 8rpx 28rpx rgba(78, 78, 78, 0.08);
	border: 1rpx solid #f5ebe0;
}

.hero-top-row {
	display: flex;
	flex-direction: row;
	align-items: flex-start;
	justify-content: space-between;
	gap: 16rpx;
	margin-bottom: 16rpx;
	box-sizing: border-box;
}

.hero-top-left {
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.hero-top-right {
	flex: 1;
	min-width: 0;
	padding-top: 2rpx;
	box-sizing: border-box;
}

.meta-compact {
	position: relative;
	background: #fffaf2;
	border-radius: 12rpx;
	border: 1rpx solid #fce8c8;
	padding: 12rpx 40rpx 36rpx 14rpx;
	box-sizing: border-box;
}

.meta-compact-speak {
	position: absolute;
	right: 6rpx;
	bottom: 6rpx;
	width: 36rpx;
	height: 36rpx;
	padding: 4rpx;
	box-sizing: border-box;
	opacity: 0.92;
}

.meta-compact-speak-img {
	width: 100%;
	height: 100%;
	display: block;
}

.meta-compact-row {
	display: flex;
	flex-direction: row;
	align-items: flex-start;
	margin-bottom: 8rpx;
}

.meta-compact-row:last-child {
	margin-bottom: 0;
}

.meta-compact-row-trad .meta-compact-v {
	color: #1565c0;
}

.meta-compact-k {
	flex-shrink: 0;
	width: 64rpx;
	font-size: 22rpx;
	color: #9e9e9e;
	line-height: 1.4;
	padding-top: 2rpx;
}

.meta-compact-v {
	flex: 1;
	min-width: 0;
	font-size: 26rpx;
	font-weight: 600;
	color: #4e4e4e;
	line-height: 1.4;
	word-break: break-all;
}

.meta-compact-row-py {
	align-items: flex-end;
}

.meta-py-row {
	width: 100%;
	min-width: 0;
	box-sizing: border-box;
}

.meta-py-fallback {
	font-size: 26rpx;
	font-weight: 600;
	color: #4e4e4e;
	line-height: 1.4;
}

/* 外包框尺寸与画布一致（由内联 dictStrokeWrapStyle 控制），田字线由 draw-native 绘制 */
.tianzi-wrap-cnchar {
	margin: 0 auto;
	border-radius: 12rpx;
	overflow: visible;
	padding: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	background: transparent;
	border: none;
}

.stroke-anim-caption {
	margin-top: 6rpx;
	font-size: 20rpx;
	color: #8a8279;
	text-align: center;
	line-height: 1.3;
}

.dict-stroke-canvas {
	display: block;
}

.hero-char-fallback {
	font-size: 132rpx;
	line-height: 1;
	font-weight: 700;
	color: #6d6560;
}

.tap-speak-tip {
	margin-top: 8rpx;
	font-size: 20rpx;
	color: #b8875c;
	text-align: center;
	padding: 6rpx 14rpx;
	border-radius: 999rpx;
	background: #fff8ed;
	border: 1rpx solid #f0e0cc;
}

.stroke-box {
	margin-top: 6rpx;
	padding: 14rpx 16rpx;
	background: #f9fbe7;
	border-radius: 14rpx;
	border: 1rpx dashed #c5e1a5;
}

.stroke-title {
	display: block;
	font-size: 24rpx;
	font-weight: 700;
	color: #558b2f;
	margin-bottom: 6rpx;
}

.stroke-glyphs {
	display: block;
	font-size: 30rpx;
	letter-spacing: 3rpx;
	color: #2c2419;
	margin-bottom: 8rpx;
	word-break: break-all;
	line-height: 1.35;
}

.stroke-names {
	display: block;
	font-size: 22rpx;
	color: #5d4037;
	margin-bottom: 10rpx;
	line-height: 1.45;
}

.stroke-desc {
	display: block;
	font-size: 22rpx;
	color: #6d4c41;
	line-height: 1.45;
	margin-bottom: 0;
}

.explain-box {
	margin-top: 14rpx;
	padding: 14rpx 16rpx;
	background: #fce4ec;
	border-radius: 14rpx;
	border: 1rpx solid #f48fb1;
}

.explain-title {
	display: block;
	font-size: 24rpx;
	font-weight: 700;
	color: #880e4f;
	margin-bottom: 10rpx;
}

.explain-body {
	display: block;
	font-size: 24rpx;
	color: #4e4e4e;
	line-height: 1.55;
}

.words-box {
	margin-top: 14rpx;
}

.words-title {
	display: block;
	font-size: 24rpx;
	font-weight: 700;
	color: #42a5f5;
	margin-bottom: 12rpx;
}

.words-wrap {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	margin: -8rpx;
}

.word-chip {
	margin: 6rpx;
	padding: 8rpx 14rpx;
	border-radius: 999rpx;
	background: #e3f2fd;
	font-size: 24rpx;
	color: #1565c0;
}

.card-actions {
	margin-top: 18rpx;
	display: flex;
	flex-direction: column;
	align-items: stretch;
}

.notebook-btn {
	border-radius: 999rpx;
	background: #8bc34a !important;
	border: none !important;
	font-size: 30rpx;
	font-weight: 600;
}

.empty-card {
	margin-top: 24rpx;
	padding: 40rpx 28rpx;
	background: #fff;
	border-radius: 24rpx;
	border: 2rpx dashed #ffe0b2;
}

.empty-title {
	display: block;
	font-size: 32rpx;
	font-weight: 700;
	color: #4e4e4e;
	margin-bottom: 12rpx;
	text-align: center;
}

.empty-desc {
	display: block;
	font-size: 26rpx;
	color: #9e9e9e;
	line-height: 1.55;
	margin-bottom: 24rpx;
	text-align: center;
}

.empty-btn {
	align-self: center;
}

.detective {
	margin-top: 28rpx;
	padding: 22rpx 20rpx;
	background: linear-gradient(135deg, #fff8e7 0%, #ffe4ec 100%);
	border-radius: 18rpx;
	border: 1rpx solid #f8bbd9;
	display: flex;
	flex-direction: row;
	align-items: flex-start;
}

.detective-emoji {
	font-size: 44rpx;
	margin-right: 14rpx;
}

.detective-main {
	flex: 1;
	min-width: 0;
}

.detective-label {
	display: block;
	font-size: 22rpx;
	color: #ad1457;
	font-weight: 700;
	margin-bottom: 6rpx;
}

.detective-clue {
	display: block;
	font-size: 28rpx;
	color: #4e4e4e;
	line-height: 1.45;
	font-weight: 600;
}

.detective-hint {
	display: block;
	font-size: 22rpx;
	color: #f48fb1;
	margin-top: 10rpx;
}

.advanced {
	margin-top: 32rpx;
	padding-bottom: 24rpx;
}

.advanced-toggle {
	display: block;
	font-size: 26rpx;
	color: #42a5f5;
	font-weight: 600;
	margin-bottom: 10rpx;
}

.curriculum-hint {
	display: block;
	font-size: 22rpx;
	color: #9e9e9e;
	line-height: 1.45;
	margin-bottom: 12rpx;
}

.advanced-body {
	margin-top: 12rpx;
	padding: 20rpx;
	background: #fff;
	border-radius: 16rpx;
	border: 1rpx solid #eee;
}

.pinyin-filter-input {
	height: 72rpx;
	border: 1px solid #e0e0e0;
	border-radius: 12rpx;
	padding: 0 16rpx;
	font-size: 28rpx;
	background: #fafafa;
}

.filter-tip {
	display: block;
	font-size: 22rpx;
	color: #9e9e9e;
	margin-top: 10rpx;
}

.filter-grid {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	margin-top: 16rpx;
}

.filter-cell {
	flex: 0 0 22%;
	width: 22%;
	max-width: 22%;
	box-sizing: border-box;
	margin-right: 4%;
	margin-bottom: 12rpx;
	min-height: 80rpx;
	background: #fffef9;
	border-radius: 12rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 2rpx 8rpx rgba(44, 36, 25, 0.06);
}

.filter-cell:nth-child(4n) {
	margin-right: 0;
}

.filter-cell-char {
	font-size: 40rpx;
	font-weight: 600;
	color: #2c2419;
}
</style>
