<template>
	<view class="page tb-page">
		<view class="tb-hero">
			<image class="meng-hero-bg-layer" src="/static/mengmeng/hero-bg.png" mode="aspectFill" />
			<view class="meng-hero-sky-layer" />
			<view class="tb-hero-sky" />
			<meng-status-bar-spacer :height-px="statusBarPx" />
			<meng-page-nav title="萌萌识字" class="tb-nav" :inset-status-bar="false">
				<template #right>
					<view class="tb-circle-btn tb-circle-btn--nav" @click="reload">
						<text class="tb-circle-icon">🔄</text>
					</view>
				</template>
			</meng-page-nav>
			<view class="tb-hero-card">
				<view class="tb-hero-body">
					<view class="tb-cover-wrap">
						<image
							class="tb-cover-img"
							:src="heroBookCoverSrc"
							mode="aspectFit"
							:lazy-load="false"
						/>
						<text class="tb-cover-tag">萌萌常用字</text>
					</view>
					<view class="tb-hero-meta">
						<text class="tb-hero-sub">{{ summary }}</text>
						<view v-if="lessons.length" class="tb-stat-pill">
							<text class="tb-stat-txt">
								已闯 <text class="tb-stat-num">{{ clearedLevelCount }}</text> /
								共 <text class="tb-stat-num">{{ lessons.length }}</text> 关 ·
								<text class="tb-stat-num">{{ statSlotCount }}</text> 个字
							</text>
						</view>
					</view>
				</view>
			</view>
		</view>

		<view class="tb-sheet">
		<view class="section-head">
			<text class="section-title">一关一关认汉字</text>
			<text class="section-hint">本关小测全部答对后解锁下一关</text>
		</view>

		<view v-if="lessons.length" class="level-path">
			<!-- 已通关：默认折叠 -->
			<view v-if="clearedLevelCount > 0" class="level-cleared-block">
				<view class="level-cleared-summary" @click="toggleClearedExpand">
					<view class="level-dot level-dot--cleared">★</view>
					<view class="level-cleared-summary-main">
						<text class="level-cleared-title">已通关 1～{{ clearedLevelCount }}</text>
						<text class="level-cleared-sub">{{ clearedExpanded ? '收起回顾' : '点开可回顾' }}</text>
					</view>
					<text class="level-cleared-chevron">{{ clearedExpanded ? '▴' : '▾' }}</text>
				</view>
				<view v-if="clearedExpanded" class="level-cleared-list">
					<view
						v-for="node in clearedPathNodes"
						:key="'c-' + node.index"
						class="level-node level-node--cleared"
						@click="openLevel(node.lesson, node.index)"
					>
						<view class="level-rail">
							<view class="level-dot level-dot--cleared">{{ node.index + 1 }}</view>
							<view class="level-rail-line" />
						</view>
						<view class="level-card level-card--cleared">
							<text class="level-card-title">{{ displayLessonHint(node.lesson.hint, node.index) }}</text>
							<text class="level-card-meta">已通关 · 回顾</text>
						</view>
					</view>
				</view>
				<view class="level-rail-bridge" />
			</view>

			<!-- 当前关 -->
			<view
				v-if="currentPathNode"
				class="level-node level-node--current"
				@click="openLevel(currentPathNode.lesson, currentPathNode.index)"
			>
				<view class="level-rail">
					<view class="level-dot level-dot--current">{{ currentPathNode.index + 1 }}</view>
					<view v-if="lockedPathNode || remainingLockedHint > 0" class="level-rail-line" />
				</view>
				<view class="level-card level-card--current">
					<text class="level-card-kicker">{{ allLevelsCleared ? '全部通关' : '当前关卡' }}</text>
					<text class="level-card-title">{{
						displayLessonHint(currentPathNode.lesson.hint, currentPathNode.index)
					}}</text>
					<text class="level-card-meta">
						{{ currentPathNode.lesson.count }} 个字 ·
						{{ allLevelsCleared ? '再玩一遍' : '开始闯关' }}
					</text>
					<view class="level-card-cta">
						<text class="level-card-cta-text">{{
							allLevelsCleared ? '回顾本关' : '开始闯关'
						}}</text>
					</view>
				</view>
			</view>

			<!-- 下一关锁定预告 -->
			<view
				v-if="lockedPathNode"
				class="level-node level-node--locked"
				@click="openLevel(lockedPathNode.lesson, lockedPathNode.index)"
			>
				<view class="level-rail">
					<view class="level-dot level-dot--locked">锁</view>
					<view v-if="remainingLockedHint > 0" class="level-rail-line level-rail-line--faint" />
				</view>
				<view class="level-card level-card--locked">
					<text class="level-card-title">第 {{ lockedPathNode.index + 1 }} 关 · {{
						displayLessonHint(lockedPathNode.lesson.hint, lockedPathNode.index)
					}}</text>
					<text class="level-card-meta">通关上一关后解锁</text>
				</view>
			</view>

			<view v-if="remainingLockedHint > 0" class="level-more-hint">
				<text class="level-more-hint-text">还有 {{ remainingLockedHint }} 关等你解锁</text>
			</view>
		</view>

		<view v-else class="empty-box">
			<text class="empty-title">暂时没有字卡</text>
			<text class="empty-desc">点右上角刷新试试；若仍没有，请稍后再来。</text>
			<button class="empty-btn" type="primary" size="mini" @click="reload">刷新</button>
		</view>

		<view class="foot-tip">
			<image class="foot-icon-img" src="/static/mengmeng/logo-icon.png" mode="aspectFit" />
			<text class="foot-msg">和萌萌一起闯关：本关小测全部答对，就能解锁下一关。</text>
		</view>
		</view>
	</view>
</template>

<script>
import { TEXTBOOK_VERSION_IDS, LIST_TYPE } from '@/constants/curriculum-schema.js'
import {
	getCurriculumPrefs,
	formatCurriculumSummary,
	ensurePreschoolCurriculumPrefs
} from '@/utils/curriculum-storage.js'
import { queryCurriculumChars } from '@/utils/curriculum-db.js'
import {
	buildTextbookSyncLessonList,
	getRenjiaoTextbookLoaderParams,
	isRenjiaoTextbookSyncPrefs,
	loadRenjiaoTextbookTexts
} from '@/utils/renjiao-textbook-loader.js'
import {
	buildStoredLessonKey,
	hasLessonQuizPassed
} from '@/utils/user-lesson-progress-storage.js'
import { resolveAppStaticAbsoluteUrl } from '@/utils/resolve-app-static-url.js'
import MengPageNav from '@/components/meng-page-nav.vue'
import MengStatusBarSpacer from '@/components/meng-status-bar-spacer.vue'
import { getMengNavMetrics } from '@/utils/meng-nav-metrics.js'
import { reLaunchHome } from '@/utils/root-nav.js'

const COVER_BOOKS = [
	{ grade: 1, semester: '上', cover: '/static/images/yuwen0101.jpg' },
	{ grade: 1, semester: '下', cover: '/static/images/yuwen0102.jpg' },
	{ grade: 2, semester: '上', cover: '/static/images/yuwen0201.jpg' },
	{ grade: 2, semester: '下', cover: '/static/images/yuwen0202.jpg' },
	{ grade: 3, semester: '上', cover: '/static/images/yuwen0301.jpg' },
	{ grade: 3, semester: '下', cover: '/static/images/yuwen0302.jpg' },
	{ grade: 4, semester: '上', cover: '/static/images/yuwen0401.jpg' },
	{ grade: 4, semester: '下', cover: '/static/images/yuwen0402.jpg' },
	{ grade: 5, semester: '上', cover: '/static/images/yuwen0501.jpg' },
	{ grade: 5, semester: '下', cover: '/static/images/yuwen0502.jpg' },
	{ grade: 6, semester: '上', cover: '/static/images/yuwen0601.jpg' },
	{ grade: 6, semester: '下', cover: '/static/images/yuwen0602.jpg' }
]

const VERSION_OPTIONS = [
	{
		label: '萌萌常用字',
		value: TEXTBOOK_VERSION_IDS.MOE_JIBENZIBIAO_300,
		icon: '/static/images/yuwen_youxiao.jpg'
	}
]

/** 与当前教材偏好对应的静态封面路径（再经 resolveAppStaticImg） */
function rawCoverPathForPrefs(prefs) {
	const p = prefs || {}
	if (p.textbook_version_id === TEXTBOOK_VERSION_IDS.MOE_JIBENZIBIAO_300) {
		return '/static/images/yuwen_youxiao.jpg'
	}
	const g = Number(p.grade)
	const sem = p.semester === '下' ? '下' : '上'
	if (p.textbook_version_id === TEXTBOOK_VERSION_IDS.TONGBIAN_RJ && g >= 1 && g <= 6) {
		const hit = COVER_BOOKS.find((b) => b.grade === g && b.semester === sem)
		if (hit) return hit.cover
	}
	return '/static/images/yuwen0101.jpg'
}

export default {
	components: { MengPageNav, MengStatusBarSpacer },
	data() {
		return {
			statusBarPx: 44,
			summary: '',
			chars: [],
			lessons: [],
			loading: false,
			showCurriculumPicker: false,
			curriculumPickerRequired: false,
			modalVersion: TEXTBOOK_VERSION_IDS.MOE_JIBENZIBIAO_300,
			versionOptions: VERSION_OPTIONS,
			/** 顶部封面：萌萌常用字 */
			heroBookCoverSrc: '',
			/** 已通关列表是否展开 */
			clearedExpanded: false
		}
	},
	computed: {
		currentBookRows() {
			if (this.modalVersion === TEXTBOOK_VERSION_IDS.MOE_JIBENZIBIAO_300) {
				const book = {
					grade: 0,
					semester: '上',
					key: `${this.modalVersion}-0-上`,
					label: '萌萌常用字',
					cover: this.resolveAppStaticImg('/static/images/yuwen_youxiao.jpg')
				}
				return [{ grade: 0, up: book, down: null }]
			}
			const map = {}
			COVER_BOOKS.forEach((b) => {
				const book = {
					...b,
					cover: this.resolveAppStaticImg(b.cover),
					key: `${this.modalVersion}-${b.grade}-${b.semester}`,
					label: `${b.grade}年级${b.semester === '下' ? '下册' : '上册'}`
				}
				if (!map[b.grade]) map[b.grade] = { grade: b.grade, up: null, down: null }
				if (b.semester === '下') map[b.grade].down = book
				else map[b.grade].up = book
			})
			return Object.values(map).sort((a, b) => a.grade - b.grade)
		},
		/** 字卡站：识字+写字条数之和；其它版本用生字库行数 */
		statSlotCount() {
			if (this.lessons.length && typeof this.lessons[0].rjIdx === 'number') {
				return this.lessons.reduce((s, l) => s + (Number(l.count) || 0), 0)
			}
			return this.chars.length
		},
		/** 连续通关数量（从第 1 关起） */
		clearedLevelCount() {
			let n = 0
			for (let i = 0; i < this.lessons.length; i++) {
				if (!this.isLessonCleared(this.lessons[i])) break
				n += 1
			}
			return n
		},
		/** 当前可闯关下标；全通则为最后一关 */
		currentLevelIndex() {
			const len = this.lessons.length
			if (!len) return 0
			const c = this.clearedLevelCount
			if (c >= len) return len - 1
			return c
		},
		allLevelsCleared() {
			return this.lessons.length > 0 && this.clearedLevelCount >= this.lessons.length
		},
		clearedPathNodes() {
			const n = this.clearedLevelCount
			const out = []
			for (let i = 0; i < n; i++) {
				out.push({ type: 'cleared', lesson: this.lessons[i], index: i })
			}
			return out
		},
		currentPathNode() {
			const i = this.currentLevelIndex
			const lesson = this.lessons[i]
			if (!lesson) return null
			return { type: 'current', lesson, index: i }
		},
		lockedPathNode() {
			if (this.allLevelsCleared) return null
			const i = this.currentLevelIndex + 1
			const lesson = this.lessons[i]
			if (!lesson) return null
			return { type: 'locked', lesson, index: i }
		},
		/** 锁定预告之后还有几关未展示 */
		remainingLockedHint() {
			if (this.allLevelsCleared) return 0
			const afterLocked = this.lessons.length - (this.currentLevelIndex + 2)
			return afterLocked > 0 ? afterLocked : 0
		}
	},
	onShow() {
		this.statusBarPx = getMengNavMetrics().statusBarPx
		this.ensureCurriculumSelected()
	},
	created() {
		this.statusBarPx = getMengNavMetrics().statusBarPx
		this.syncHeroBookCover()
	},
	methods: {
		/**
		 * App 端：低版本 WebView 对「/static/…」解析不稳，转为 5+ 运行时本地路径（适配 Android 5+）。
		 * H5/小程序等无 plus 时原样返回。
		 */
		resolveAppStaticImg(src) {
			return resolveAppStaticAbsoluteUrl(src)
		},
		syncHeroBookCover() {
			const prefs = getCurriculumPrefs()
			this.heroBookCoverSrc = this.resolveAppStaticImg(rawCoverPathForPrefs(prefs))
		},
		refreshProgressOnly() {
			ensurePreschoolCurriculumPrefs()
			this.curriculumPickerRequired = false
			this.showCurriculumPicker = false
			const prefs = getCurriculumPrefs()
			this.syncHeroBookCover()
			this.summary = formatCurriculumSummary(prefs)
			this.patchLessonDoneBadges()
		},
		async reload() {
			ensurePreschoolCurriculumPrefs()
			if (this.loading) return
			this.loading = true
			try {
				const prefs = getCurriculumPrefs()
				this.syncHeroBookCover()
				this.summary = formatCurriculumSummary(prefs)
				if (isRenjiaoTextbookSyncPrefs(prefs)) {
					const loaderParams = getRenjiaoTextbookLoaderParams(prefs)
					const raw = await loadRenjiaoTextbookTexts(loaderParams)
					this.chars = []
					this.lessons = buildTextbookSyncLessonList(raw)
				} else {
					this.chars = await queryCurriculumChars(prefs)
					const map = Object.create(null)
					this.chars.forEach((row) => {
						const hint = String(row.lesson_hint || '未分站')
						if (!map[hint]) map[hint] = { hint, rows: [] }
						map[hint].rows.push(row)
					})
					this.lessons = Object.values(map)
						.sort((a, b) => String(a.hint).localeCompare(String(b.hint)))
						.map(({ hint, rows }) => {
							const shizi = rows.filter((r) => r.list_type === LIST_TYPE.SHIZI)
							const pool = shizi.length ? shizi : rows
							const learnCheckKeys = this.collectLessonLearnCharKeys(pool)
							return {
								hint,
								count: rows.length,
								learnCheckKeys,
								doneBadgeKind: shizi.length ? 'literacy' : 'lesson',
								doneBadgeText: ''
							}
						})
				}
				this.patchLessonDoneBadges()
			} catch (e) {
				console.warn('[textbook] reload', e)
				uni.showToast({ title: '加载失败，请重试', icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		displayLessonHint(hint, index) {
			const raw = String(hint || '').trim()
			if (!raw) return `第 ${Number(index) + 1} 站`
			if (/课|课文|单元/.test(raw)) {
				return `第 ${Number(index) + 1} 站`
			}
			return raw
		},
		collectLessonLearnCharKeys(rows) {
			const set = new Set()
			for (const r of rows || []) {
				const c = String(r && r.hanzi != null ? r.hanzi : '')
					.trim()
					.charAt(0)
				const m = c.match(/[\u4e00-\u9fff]/)
				if (m) set.add(m[0])
			}
			return Array.from(set)
		},
		patchLessonDoneBadges() {
			const prefs = getCurriculumPrefs()
			for (const lesson of this.lessons) {
				const lessonKey = buildStoredLessonKey(
					typeof lesson.rjIdx === 'number' ? lesson.rjIdx : null,
					lesson.hint
				)
				const cleared = hasLessonQuizPassed(prefs, lessonKey)
				this.$set(lesson, 'doneBadgeText', cleared ? '已通关' : '')
			}
		},
		isLessonCleared(lesson) {
			if (!lesson) return false
			if (lesson.doneBadgeText === '已通关') return true
			const prefs = getCurriculumPrefs()
			const lessonKey = buildStoredLessonKey(
				typeof lesson.rjIdx === 'number' ? lesson.rjIdx : null,
				lesson.hint
			)
			return hasLessonQuizPassed(prefs, lessonKey)
		},
		isLevelUnlocked(index) {
			const i = Number(index)
			if (!Number.isFinite(i) || i < 0) return false
			if (i === 0) return true
			return this.clearedLevelCount >= i
		},
		toggleClearedExpand() {
			this.clearedExpanded = !this.clearedExpanded
		},
		ensureCurriculumSelected() {
			ensurePreschoolCurriculumPrefs()
			this.curriculumPickerRequired = false
			this.showCurriculumPicker = false
			if (this.lessons && this.lessons.length) {
				this.refreshProgressOnly()
				return
			}
			this.reload()
		},
		openCurriculumPicker() {
			/* 已锁定萌萌常用字，不再换教材 */
		},
		onPickerMaskTap() {},
		closeCurriculumPicker() {
			this.showCurriculumPicker = false
		},
		chooseVersion() {},
		selectBook() {
			ensurePreschoolCurriculumPrefs()
			this.showCurriculumPicker = false
			this.curriculumPickerRequired = false
			this.reload()
		},
		goHome() {
			reLaunchHome()
		},
		openLevel(lesson, index) {
			if (!this.isLevelUnlocked(index)) {
				const need = Number(index)
				uni.showToast({
					title: need > 0 ? `先闯过第 ${need} 站哦` : '关卡未解锁',
					icon: 'none'
				})
				return
			}
			this.openLesson(lesson)
		},
		openLesson(lesson) {
			if (typeof lesson.rjIdx === 'number') {
				uni.navigateTo({
					url: `/pages/dictionary/result?rjLesson=${lesson.rjIdx}`
				})
				return
			}
			uni.navigateTo({
				url: `/pages/dictionary/result?lesson=${encodeURIComponent(lesson.hint)}`
			})
		}
	}
}
</script>

<style scoped>
.tb-page {
	min-height: 100vh;
	padding: 0 0 48rpx;
	box-sizing: border-box;
	background: var(--meng-page-bg);
}

/* —— 顶区（对齐首页 Hero 粉奶油氛围）—— */
.tb-hero {
	position: relative;
	padding: 0 20rpx 36rpx;
	box-sizing: border-box;
	overflow: hidden;
}

.tb-nav {
	position: relative;
	z-index: 3;
	margin-left: -20rpx;
	margin-right: -20rpx;
}

.tb-circle-btn--nav {
	width: 64rpx;
	height: 64rpx;
}

.tb-hero-sky {
	position: absolute;
	left: 0;
	right: 0;
	top: 0;
	height: 280rpx;
	background: rgba(255, 255, 255, 0);
	pointer-events: none;
}

.tb-hero-card {
	position: relative;
	z-index: 1;
	padding: 24rpx 22rpx 22rpx;
	border-radius: 32rpx;
	background: rgba(255, 255, 255, 0.9);
	border: 2rpx solid rgba(255, 255, 255, 0.95);
	box-shadow:
		0 12rpx 40rpx rgba(255, 150, 180, 0.14),
		0 8rpx 24rpx var(--meng-shadow, rgba(44, 36, 25, 0.06));
}

.tb-hero-head {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 20rpx;
}

.tb-hero-title {
	font-size: 38rpx;
	font-weight: 800;
	color: var(--meng-text, #2c2419);
	letter-spacing: 2rpx;
}

.tb-hero-tools {
	display: flex;
	flex-direction: row;
	align-items: center;
}

.tb-circle-btn {
	width: 72rpx;
	height: 72rpx;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.95);
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 8rpx 22rpx rgba(255, 120, 160, 0.2);
	border: 2rpx solid rgba(255, 200, 215, 0.5);
}

.tb-circle-icon {
	font-size: 30rpx;
}

.tb-hero-body {
	display: flex;
	flex-direction: row;
	align-items: center;
}

.tb-cover-wrap {
	flex-shrink: 0;
	position: relative;
	width: 152rpx;
	height: 0;
	padding-bottom: 200rpx;
	margin-right: 22rpx;
	border-radius: 18rpx;
	background: #fff8f0;
	overflow: hidden;
	box-shadow: 0 10rpx 28rpx rgba(44, 36, 25, 0.1);
	border: 2rpx solid rgba(255, 200, 180, 0.35);
}

.tb-cover-img {
	position: absolute;
	left: 0;
	top: 0;
	width: 100%;
	height: 100%;
}

.tb-cover-tag {
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	padding: 8rpx 0;
	text-align: center;
	font-size: 20rpx;
	font-weight: 700;
	color: #fff;
	background: rgba(196, 77, 106, 0.35);
}

.tb-hero-meta {
	flex: 1;
	min-width: 0;
}

.tb-hero-sub {
	display: block;
	font-size: 26rpx;
	color: var(--meng-text-secondary, #6d5e52);
	line-height: 1.5;
	word-break: break-all;
}

.tb-stat-pill {
	display: inline-flex;
	margin-top: 14rpx;
	padding: 10rpx 18rpx;
	border-radius: 999rpx;
	background: #d4f0dc;
	border: 2rpx solid rgba(111, 186, 125, 0.35);
}

.tb-stat-txt {
	font-size: 24rpx;
	color: #3d6b4a;
	font-weight: 600;
}

.tb-stat-num {
	font-weight: 800;
	color: #2e7d32;
}

/* —— 主内容玻璃区（对齐首页 dock-glass）—— */
.tb-sheet {
	position: relative;
	z-index: 2;
	margin: -32rpx 20rpx 0;
	padding: 24rpx 22rpx 20rpx;
	border-radius: 36rpx 36rpx 28rpx 28rpx;
	background: rgba(255, 255, 255, 0.88);
	border: 2rpx solid rgba(255, 255, 255, 0.95);
	box-shadow:
		0 -8rpx 36rpx rgba(255, 150, 180, 0.1),
		0 16rpx 40rpx var(--meng-shadow, rgba(44, 36, 25, 0.06));
	box-sizing: border-box;
}

.section-head {
	margin-bottom: 14rpx;
	padding-left: 4rpx;
}

.section-title {
	display: block;
	font-size: 30rpx;
	font-weight: 800;
	color: var(--meng-text, #2c2419);
	margin-bottom: 6rpx;
}

.section-hint {
	display: block;
	font-size: 22rpx;
	color: var(--meng-text-muted, #8a8076);
	line-height: 1.45;
}

.level-path {
	display: flex;
	flex-direction: column;
	padding: 4rpx 0 8rpx;
}

.level-cleared-block {
	margin-bottom: 4rpx;
}

.level-cleared-summary {
	display: flex;
	flex-direction: row;
	align-items: center;
	padding: 16rpx 18rpx;
	border-radius: 20rpx;
	background: rgba(127, 212, 154, 0.16);
	border: 1rpx solid rgba(127, 212, 154, 0.35);
	box-sizing: border-box;
}

.level-cleared-summary:active {
	opacity: 0.92;
}

.level-cleared-summary-main {
	flex: 1;
	min-width: 0;
	margin-left: 14rpx;
}

.level-cleared-title {
	display: block;
	font-size: 26rpx;
	font-weight: 700;
	color: #2e7d4f;
}

.level-cleared-sub {
	display: block;
	margin-top: 4rpx;
	font-size: 22rpx;
	color: #6b9080;
}

.level-cleared-chevron {
	font-size: 28rpx;
	color: #5a9a72;
	margin-left: 8rpx;
}

.level-cleared-list {
	margin-top: 10rpx;
}

.level-rail-bridge {
	width: 4rpx;
	height: 18rpx;
	margin: 6rpx 0 6rpx 30rpx;
	background: rgba(127, 212, 154, 0.45);
	border-radius: 4rpx;
}

.level-node {
	display: flex;
	flex-direction: row;
	align-items: stretch;
	margin-bottom: 12rpx;
}

.level-rail {
	width: 64rpx;
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.level-dot {
	width: 52rpx;
	height: 52rpx;
	border-radius: 18rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 22rpx;
	font-weight: 800;
	color: #fff;
	box-sizing: border-box;
}

.level-dot--cleared {
	background: #7fd49a;
	box-shadow: 0 6rpx 14rpx rgba(90, 160, 110, 0.28);
}

.level-dot--current {
	width: 60rpx;
	height: 60rpx;
	border-radius: 20rpx;
	font-size: 26rpx;
	background: #ec407a;
	box-shadow: 0 8rpx 18rpx rgba(236, 64, 122, 0.35);
}

.level-dot--locked {
	background: #c5bdb4;
	color: #fff;
	font-size: 22rpx;
}

.level-rail-line {
	flex: 1;
	width: 4rpx;
	min-height: 24rpx;
	margin-top: 6rpx;
	background: rgba(236, 64, 122, 0.28);
	border-radius: 4rpx;
}

.level-rail-line--faint {
	background: rgba(180, 170, 160, 0.35);
}

.level-card {
	flex: 1;
	min-width: 0;
	padding: 18rpx 20rpx;
	border-radius: 22rpx;
	box-sizing: border-box;
}

.level-card--cleared {
	background: #fff;
	border: 1rpx solid rgba(127, 212, 154, 0.4);
}

.level-card--current {
	padding: 24rpx 22rpx;
	background: linear-gradient(145deg, #fff7fa 0%, #ffe8f0 100%);
	border: 2rpx solid rgba(236, 64, 122, 0.35);
	box-shadow: 0 10rpx 28rpx rgba(236, 64, 122, 0.12);
}

.level-card--locked {
	background: #f5f2ef;
	border: 1rpx dashed rgba(160, 150, 140, 0.45);
	opacity: 0.92;
}

.level-card-kicker {
	display: block;
	font-size: 22rpx;
	font-weight: 700;
	color: #ec407a;
	margin-bottom: 6rpx;
}

.level-card-title {
	display: block;
	font-size: 28rpx;
	font-weight: 800;
	color: var(--meng-text, #2c2419);
	line-height: 1.35;
	word-break: break-all;
}

.level-card--locked .level-card-title {
	font-size: 26rpx;
	font-weight: 600;
	color: #8a8279;
}

.level-card-meta {
	display: block;
	margin-top: 8rpx;
	font-size: 24rpx;
	font-weight: 600;
	color: #c44d6a;
}

.level-card--cleared .level-card-meta {
	color: #43a047;
}

.level-card--locked .level-card-meta {
	color: #9e958c;
	font-weight: 500;
}

.level-card-cta {
	margin-top: 16rpx;
	align-self: flex-start;
	display: inline-flex;
	padding: 12rpx 28rpx;
	border-radius: 999rpx;
	background: #ec407a;
	box-shadow: 0 6rpx 14rpx rgba(236, 64, 122, 0.28);
}

.level-card-cta-text {
	font-size: 26rpx;
	font-weight: 800;
	color: #fff;
}

.level-node--current:active .level-card--current,
.level-node--cleared:active .level-card--cleared {
	opacity: 0.94;
	transform: scale(0.995);
}

.level-more-hint {
	margin: 4rpx 0 8rpx 64rpx;
	padding: 12rpx 16rpx;
}

.level-more-hint-text {
	font-size: 22rpx;
	color: #9e958c;
	font-weight: 500;
}

.empty-box {
	padding: 48rpx 28rpx;
	background: #fff0f5;
	border-radius: 24rpx;
	border: 2rpx dashed rgba(255, 180, 200, 0.45);
	text-align: center;
}

.empty-title {
	display: block;
	font-size: 30rpx;
	font-weight: 700;
	color: #6d4c41;
	margin-bottom: 12rpx;
}

.empty-desc {
	display: block;
	font-size: 24rpx;
	color: #9e9e9e;
	line-height: 1.55;
	margin-bottom: 24rpx;
}

.empty-btn {
	border-radius: 999rpx !important;
}

.foot-tip {
	display: flex;
	flex-direction: row;
	align-items: flex-start;
	margin-top: 8rpx;
	padding: 16rpx 18rpx;
	background: #fff0f5;
	border-radius: 20rpx;
	border: 1rpx solid rgba(255, 200, 180, 0.35);
}

.foot-icon-img {
	width: 44rpx;
	height: 44rpx;
	margin-right: 10rpx;
	flex-shrink: 0;
}

.foot-msg {
	flex: 1;
	font-size: 22rpx;
	color: #6b6560;
	line-height: 1.5;
}

.picker-mask {
	position: fixed;
	left: 0;
	top: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.38);
	display: flex;
	align-items: flex-end;
	z-index: 999;
}

.picker-mask--required {
	background: rgba(0, 0, 0, 0.52);
}

.picker-panel {
	width: 100%;
	max-height: 1200rpx;
	max-height: 78vh;
	background: #fff6fa;
	border-radius: 36rpx 36rpx 0 0;
	padding: 28rpx 24rpx 32rpx;
	box-sizing: border-box;
	border-top: 2rpx solid rgba(255, 255, 255, 0.9);
}

.picker-head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	margin-bottom: 20rpx;
	gap: 16rpx;
}

.picker-head-text {
	flex: 1;
	min-width: 0;
}

.picker-title {
	display: block;
	font-size: 32rpx;
	font-weight: 700;
	color: var(--meng-text);
}

.picker-required-hint {
	display: block;
	margin-top: 8rpx;
	font-size: 24rpx;
	color: var(--meng-text-secondary);
	line-height: 1.45;
}

.picker-close {
	font-size: 44rpx;
	line-height: 1;
	color: #8a8279;
	padding: 4rpx 8rpx;
}

.version-row {
	display: flex;
	flex-direction: row;
	margin-bottom: 18rpx;
}

.version-chip {
	flex: 1;
	display: flex;
	align-items: center;
	background: rgba(255, 255, 255, 0.95);
	border: 2rpx solid rgba(255, 180, 200, 0.25);
	border-radius: 20rpx;
	padding: 14rpx 12rpx;
	box-sizing: border-box;
	box-shadow: 0 4rpx 12rpx rgba(44, 36, 25, 0.04);
}

.version-chip + .version-chip {
	margin-left: 12rpx;
}

.version-chip-on {
	background: #ffd4f0;
	border-color: var(--meng-chip-active-border, rgba(255, 107, 66, 0.42));
	box-shadow: 0 6rpx 16rpx rgba(255, 120, 160, 0.18);
}

.version-icon {
	width: 46rpx;
	height: 62rpx;
	border-radius: 6rpx;
	margin-right: 10rpx;
}

.version-label {
	font-size: 26rpx;
	font-weight: 700;
	color: #5a534c;
}

.version-chip-on .version-label {
	color: #c44d6a;
}

.book-scroll {
	max-height: 880rpx;
	max-height: 56vh;
}

.book-columns-head {
	display: flex;
	flex-direction: row;
	margin-bottom: 10rpx;
}

.book-col-title {
	flex: 1;
	text-align: center;
	font-size: 24rpx;
	font-weight: 600;
	color: #7a746e;
}

.book-row {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	margin-bottom: 18rpx;
}

.book-card {
	width: 48%;
}

/*
 * 竖版课本封面 3:4（宽:高）。不用 aspect-ratio：Android 5+ 旧系统 WebView 不支持，会导致高度为 0、图片不显示。
 * 使用 padding-bottom 占位 + 绝对定位铺满（兼容 Android 5 WebView / Chrome 37 级）。
 */
.book-cover-wrap {
	position: relative;
	width: 100%;
	height: 0;
	padding-bottom: 133.3333%;
	border-radius: 12rpx;
	background: #f3ebe0;
	overflow: hidden;
}

.book-cover {
	position: absolute;
	left: 0;
	top: 0;
	width: 100%;
	height: 100%;
}

.book-label {
	display: block;
	text-align: center;
	margin-top: 8rpx;
	font-size: 23rpx;
	color: #5a534c;
}
</style>
