<template>
	<view class="page">
		<!-- 顶栏：品牌 + 快捷入口（对齐线框图） -->
		<view class="top-bar">
			<text class="top-brand">萌萌识字</text>
			<view class="top-actions">
				<text class="top-icon" @click="onBell">🔔</text>
				<text class="top-icon" @click="goSettings">⚙️</text>
			</view>
		</view>

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
			<view class="tianzi">
				<text class="hero-char">{{ activeEntry.hanzi }}</text>
			</view>
			<view v-if="activeEntry.tradForm" class="trad-row">
				<text class="trad-label">繁体</text>
				<text class="trad-val">{{ activeEntry.tradForm }}</text>
			</view>
			<view class="meta-grid">
				<view class="meta-cell">
					<text class="meta-k">拼音</text>
					<text class="meta-v">{{ pinyinDisplay }}</text>
				</view>
				<view class="meta-cell">
					<text class="meta-k">部首</text>
					<text class="meta-v">{{ activeEntry.radical }}</text>
				</view>
				<view class="meta-cell">
					<text class="meta-k">结构</text>
					<text class="meta-v">{{ activeEntry.structure }}</text>
				</view>
				<view class="meta-cell">
					<text class="meta-k">笔画</text>
					<text class="meta-v">{{ activeEntry.strokes }}</text>
				</view>
			</view>
			<view class="stroke-box">
				<text class="stroke-title">✍️ 笔顺（cnchar-order）</text>
				<text v-if="activeEntry.strokeShapes" class="stroke-glyphs">{{ activeEntry.strokeShapes }}</text>
				<text v-if="activeEntry.strokeNames" class="stroke-names">{{ activeEntry.strokeNames }}</text>
				<text class="stroke-desc">{{ strokeHint }}</text>
				<button class="anim-btn" type="primary" size="mini" @click="openStrokeAnim">动画演示</button>
			</view>
			<view v-if="activeEntry.explainText" class="explain-box">
				<text class="explain-title">📙 释义（cnchar-explain）</text>
				<text class="explain-body">{{ activeEntry.explainText }}</text>
			</view>
			<view class="words-box">
				<text class="words-title">📖 组词（cnchar-words + 本地）</text>
				<view class="words-wrap">
					<text v-for="(w, idx) in activeEntry.words" :key="`${w}-${idx}`" class="word-chip">{{ w }}</text>
				</view>
			</view>
			<view class="card-actions">
				<button class="notebook-btn" type="primary" @click="addToNotebook">➕ 加入生字本</button>
				<button class="sub-btn" type="default" size="mini" @click="openResultPage">全屏详情</button>
			</view>
		</view>
		<view v-else class="empty-card">
			<text class="empty-title">查一查汉字</text>
			<text class="empty-desc">
				拼音 / 部首 / 结构 / 笔画 / 笔顺 / 组词 / 释义 / 繁体 由 cnchar 及官方扩展库计算；用手写板练笔顺；部首检索结合 cnchar-radical 与教材字库。
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
import { normalizeLatinAlphaForMatch } from '@/utils/pinyin-display.js'
import { spellDisplayString } from '@/utils/cnchar-spell-display.js'
import { getCurriculumPrefs, formatCurriculumSummary } from '@/utils/curriculum-storage.js'
import { queryCurriculumChars } from '@/utils/curriculum-db.js'
import { getDictionaryEntry, getRadicalLabel } from '@/repositories/dictionary-repository.js'
import { recordCharLearned } from '@/repositories/learning-repository.js'

const DETECTIVES = [
	{ clue: '猜一猜「艹 + 明」是什么字？', answer: '萌' },
	{ clue: '「木 + 公」常组成？', answer: '松' },
	{ clue: '三点水加「青」', answer: '清' },
	{ clue: '「日 + 月」并排', answer: '明' },
	{ clue: '「女 + 子」合成', answer: '好' },
	{ clue: '「口 + 巴」是什么字？', answer: '吧' }
]

export default {
	data() {
		return {
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
			detectiveIndex: 0
		}
	},
	computed: {
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
			return `共 ${n} 笔 · 点击下方「动画演示」逐笔观看`
		},
		currentDetective() {
			return DETECTIVES[this.detectiveIndex % DETECTIVES.length]
		}
	},
	onShow() {
		this.summary = formatCurriculumSummary(getCurriculumPrefs())
		this.reloadDb()
	},
	methods: {
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
			return normalizeLatinAlphaForMatch(String(s || ''))
				.toLowerCase()
				.replace(/\s+/g, '')
				.normalize('NFD')
				.replace(/[\u0300-\u036f]/g, '')
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
			} finally {
				this.loadingEntry = false
			}
		},
		selectGridChar(hanzi) {
			const c = String(hanzi || '').trim().charAt(0)
			if (!c) return
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
		openStrokeAnim() {
			if (!this.activeEntry?.hanzi) return
			uni.navigateTo({
				url: `/pages/tools/stroke?hanzi=${encodeURIComponent(this.activeEntry.hanzi)}&mode=animation`
			})
		},
		openResultPage() {
			if (!this.activeEntry?.hanzi) return
			const h = encodeURIComponent(this.activeEntry.hanzi)
			const p = encodeURIComponent(this.pinyinDisplay === '—' ? '' : this.pinyinDisplay)
			const l = encodeURIComponent(this.activeEntry.lessonHint || '')
			uni.navigateTo({
				url: `/pages/dictionary/result?hanzi=${h}&pinyin=${p}&lesson=${l}`
			})
		},
		addToNotebook() {
			if (!this.activeEntry?.hanzi) return
			recordCharLearned(this.activeEntry.hanzi, getCurriculumPrefs())
			uni.showToast({ title: '已加入生字本（已学字库）', icon: 'success' })
		},
		goSettings() {
			uni.navigateTo({ url: '/pages/settings/curriculum' })
		},
		onBell() {
			uni.showToast({ title: '学习提醒即将上线', icon: 'none' })
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

.top-bar {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	padding: 12rpx 8rpx 20rpx;
}

.top-brand {
	font-size: 34rpx;
	font-weight: 700;
	color: #4e4e4e;
}

.top-actions {
	display: flex;
	flex-direction: row;
	align-items: center;
}

.top-icon {
	font-size: 36rpx;
	padding: 8rpx 16rpx;
	margin-left: 4rpx;
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

.tianzi {
	width: 280rpx;
	height: 280rpx;
	margin: 0 auto 28rpx;
	border-radius: 16rpx;
	border: 3rpx solid #e8dfd0;
	background-color: #fffef9;
	background-image: linear-gradient(#dccfb8 0, #dccfb8 100%), linear-gradient(#dccfb8 0, #dccfb8 100%);
	background-size: 100% 2rpx, 2rpx 100%;
	background-position: center center, center center;
	background-repeat: no-repeat;
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
}

.hero-char {
	font-size: 168rpx;
	line-height: 1;
	font-weight: 700;
	color: #4e4e4e;
}

.trad-row {
	display: flex;
	flex-direction: row;
	align-items: center;
	flex-wrap: wrap;
	margin-bottom: 16rpx;
	padding: 12rpx 16rpx;
	background: #e3f2fd;
	border-radius: 12rpx;
	border: 1rpx solid #90caf9;
}

.trad-label {
	font-size: 24rpx;
	color: #1565c0;
	font-weight: 700;
	margin-right: 12rpx;
}

.trad-val {
	font-size: 32rpx;
	color: #0d47a1;
	font-weight: 700;
}

.meta-grid {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	margin-bottom: 8rpx;
}

.meta-cell {
	flex: 0 0 48%;
	width: 48%;
	max-width: 48%;
	box-sizing: border-box;
	margin-right: 4%;
	margin-bottom: 14rpx;
	padding: 14rpx 12rpx;
	background: #fffaf2;
	border-radius: 12rpx;
	border: 1rpx solid #fce8c8;
}

.meta-cell:nth-child(2n) {
	margin-right: 0;
}

.meta-k {
	display: block;
	font-size: 22rpx;
	color: #9e9e9e;
	margin-bottom: 6rpx;
}

.meta-v {
	display: block;
	font-size: 28rpx;
	color: #4e4e4e;
	font-weight: 700;
}

.stroke-box {
	margin-top: 10rpx;
	padding: 18rpx;
	background: #f9fbe7;
	border-radius: 14rpx;
	border: 1rpx dashed #c5e1a5;
}

.stroke-title {
	display: block;
	font-size: 26rpx;
	font-weight: 700;
	color: #558b2f;
	margin-bottom: 8rpx;
}

.stroke-glyphs {
	display: block;
	font-size: 34rpx;
	letter-spacing: 3rpx;
	color: #2c2419;
	margin-bottom: 8rpx;
	word-break: break-all;
	line-height: 1.35;
}

.stroke-names {
	display: block;
	font-size: 24rpx;
	color: #5d4037;
	margin-bottom: 10rpx;
	line-height: 1.45;
}

.stroke-desc {
	display: block;
	font-size: 24rpx;
	color: #6d4c41;
	line-height: 1.5;
	margin-bottom: 14rpx;
}

.anim-btn {
	border-radius: 999rpx;
	background: #ffa726 !important;
	border: none !important;
}

.explain-box {
	margin-top: 20rpx;
	padding: 18rpx;
	background: #fce4ec;
	border-radius: 14rpx;
	border: 1rpx solid #f48fb1;
}

.explain-title {
	display: block;
	font-size: 26rpx;
	font-weight: 700;
	color: #880e4f;
	margin-bottom: 10rpx;
}

.explain-body {
	display: block;
	font-size: 26rpx;
	color: #4e4e4e;
	line-height: 1.55;
}

.words-box {
	margin-top: 22rpx;
}

.words-title {
	display: block;
	font-size: 26rpx;
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
	margin: 8rpx;
	padding: 10rpx 18rpx;
	border-radius: 999rpx;
	background: #e3f2fd;
	font-size: 26rpx;
	color: #1565c0;
}

.card-actions {
	margin-top: 28rpx;
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

.sub-btn {
	margin-top: 16rpx;
	align-self: center;
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
