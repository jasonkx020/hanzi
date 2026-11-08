<!--
  @file textbook.vue
  @layer L1 表现层
  @description 路由页面源文件：textbook.vue
  @software 萌萌识字移动应用软件 V1.0
  @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
-->
<template>
	<view class="page tb-page">
		<view class="tb-hero">
			<image
				class="meng-hero-bg-layer"
				:src="staticImg('hero-bg', '/static/mengmeng/hero-bg.png')"
				mode="aspectFill"
				@error="onStaticImgError('hero-bg', '/static/mengmeng/hero-bg.png')"
			/>
			<view class="meng-hero-sky-layer" />
			<meng-status-bar-spacer :height-px="statusBarPx" />
			<meng-page-nav title="课本同步学" class="tb-nav" :inset-status-bar="false" />
			<view class="tb-hero-bar">
				<view class="tb-hero-meta">
					<text class="tb-hero-sub">{{ summary }}</text>
					<text v-if="lessons.length" class="tb-hero-stat"
						>{{ lessons.length }} 课 · {{ statSlotCount }} 字</text
					>
				</view>
				<text class="tb-switch-link" @click="openCurriculumPicker">换教材</text>
			</view>
		</view>

		<view v-if="!curriculumPickerRequired" class="tb-body">
			<view v-if="lessonUnitGroups.length" class="lesson-list">
				<view
					v-for="group in lessonUnitGroups"
					:key="group.key"
					class="lesson-unit-block"
				>
					<view v-if="group.showHeader" class="unit-head">
						<text class="unit-name">{{ unitHeadTitle(group) }}</text>
					</view>
					<view
						v-for="lesson in group.lessons"
						:key="`${lesson.hint}-${lesson.index1}`"
						class="lesson-card"
						@click="openLesson(lesson)"
					>
						<text class="lesson-num">{{ lesson.index1 }}</text>
						<view class="lesson-main">
							<view class="lesson-title-row">
								<text class="lesson-title">{{ lesson.hint }}</text>
								<text v-if="lesson.doneBadgeText" class="lesson-done-badge">{{
									lesson.doneBadgeText
								}}</text>
							</view>
							<text class="lesson-meta">{{ lessonMetaText(lesson) }}</text>
						</view>
						<text class="lesson-arrow">›</text>
					</view>
				</view>
			</view>

			<view v-else class="empty-box">
				<text class="empty-title">暂无课次</text>
				<text class="empty-desc">请先选择教材与年级册别</text>
				<button class="empty-btn" type="primary" size="mini" @click="goHome">回识字首页</button>
			</view>
		</view>

		<view
			v-if="showCurriculumPicker"
			class="picker-mask"
			:class="{ 'picker-mask--required': curriculumPickerRequired }"
			@click="onPickerMaskTap"
		>
			<view class="picker-panel" @click.stop>
				<view class="picker-head">
					<view class="picker-head-text">
						<text class="picker-title">选择教材</text>
						<text v-if="curriculumPickerRequired" class="picker-required-hint">
							首次进入请先选一本教材，选好后才能使用课本同步
						</text>
					</view>
					<text
						v-if="!curriculumPickerRequired"
						class="picker-close"
						@click="closeCurriculumPicker"
					>×</text>
				</view>

				<view class="version-row">
					<view
						v-for="v in versionOptions"
						:key="v.value"
						class="version-chip"
						:class="{ 'version-chip-on': modalVersion === v.value }"
						@click="chooseVersion(v.value)"
					>
						<image
							class="version-icon"
							:src="staticImg(v.icon, v.icon)"
							mode="aspectFill"
							@error="onStaticImgError(v.icon, v.icon)"
						/>
						<text class="version-label">{{ v.label }}</text>
					</view>
				</view>

				<scroll-view scroll-y class="book-scroll">
					<!-- <view class="book-columns-head">
						<text class="book-col-title">上册</text>
						<text class="book-col-title">下册</text>
					</view> -->
					<view
						v-for="row in currentBookRows"
						:key="`grade-${row.grade}`"
						class="book-row"
					>
						<view
							v-for="book in [row.up, row.down].filter(Boolean)"
							:key="book.key"
							class="book-card"
							@click="selectBook(book)"
						>
							<view class="book-cover-wrap">
								<image
									class="book-cover"
									:src="staticImg(book.coverRaw, book.coverRaw)"
									mode="aspectFit"
									:lazy-load="false"
									@error="onStaticImgError(book.coverRaw, book.coverRaw)"
								/>
							</view>
							<text class="book-label">{{ book.label }}</text>
						</view>
					</view>
				</scroll-view>
			</view>
		</view>
	</view>
</template>

<script>
import { TEXTBOOK_VERSION_IDS, COL_PROGRESS, LIST_TYPE } from '@/constants/curriculum-schema.js'
import {
	getCurriculumPrefs,
	setCurriculumPrefs,
	formatCurriculumSummary,
	hasUserCurriculumPrefsSaved
} from '@/utils/curriculum-storage.js'
import { queryCurriculumChars } from '@/utils/curriculum-db.js'
import {
	buildLessonCharRowsFromRenjiaoItem,
	buildLiteracyOnlyCharRowsFromRenjiaoItem,
	buildLessonPinyinItemsFromRenjiaoItem,
	filterRenjiaoTextbookSyncLessons,
	getRenjiaoTextbookLoaderParams,
	isRenjiaoTextbookSyncPrefs,
	loadRenjiaoTextbookTexts
} from '@/utils/renjiao-textbook-loader.js'
import { makeProgressKey, getUserProgressMap } from '@/utils/user-progress-storage.js'
import {
	buildAppStaticImageSrcCandidates,
	resolveAppStaticImageUrl
} from '@/utils/resolve-app-static-url.js'
import MengPageNav from '@/components/meng-page-nav.vue'
import MengStatusBarSpacer from '@/components/meng-status-bar-spacer.vue'
import { getMengNavMetrics } from '@/utils/meng-nav-metrics.js'

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
	{ label: '人教版', value: TEXTBOOK_VERSION_IDS.TONGBIAN_RJ, icon: '/static/images/yuwen0101.jpg' },
	{
		label: '幼小衔接',
		value: TEXTBOOK_VERSION_IDS.MOE_JIBENZIBIAO_300,
		icon: '/static/images/yuwen_youxiao.jpg'
	}//,
	// { label: '苏教版', value: 'sujiao', icon: '/static/images/yuwen0201.jpg' }
]

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
			/** 未保存过教材偏好：须选一本教材后才能使用本页 */
			curriculumPickerRequired: false,
			modalVersion: '统编(人教版)',
			versionOptions: VERSION_OPTIONS,
			/** 静态图 @error 回退：key → 候选下标（云打包优先 /static/） */
			staticImgTryIndex: {}
		}
	},
	computed: {
		currentBookRows() {
			if (this.modalVersion === TEXTBOOK_VERSION_IDS.MOE_JIBENZIBIAO_300) {
				const book = {
					grade: 0,
					semester: '上',
					key: `${this.modalVersion}-0-上`,
					label: '课标300基本字',
					coverRaw: '/static/images/yuwen_youxiao.jpg'
				}
				return [{ grade: 0, up: book, down: null }]
			}
			const map = {}
			COVER_BOOKS.forEach((b) => {
				const book = {
					...b,
					coverRaw: b.cover,
					key: `${this.modalVersion}-${b.grade}-${b.semester}`,
					label: `${b.grade}年级${b.semester === '下' ? '下册' : '上册'}`
				}
				if (!map[b.grade]) map[b.grade] = { grade: b.grade, up: null, down: null }
				if (b.semester === '下') map[b.grade].down = book
				else map[b.grade].up = book
			})
			return Object.values(map).sort((a, b) => a.grade - b.grade)
		},
		/** 人教版 JSON 课次为识字+写字条数之和；其它版本用生字库行数 */
		statSlotCount() {
			if (this.lessons.length && typeof this.lessons[0].rjIdx === 'number') {
				return this.lessons.reduce((s, l) => s + (Number(l.count) || 0), 0)
			}
			return this.chars.length
		},
		/**
		 * 按 unitName 连续分组合并；带全局序号 index1。
		 * 无人教单元字段时整表一组且 showHeader=false（平铺）。
		 */
		lessonUnitGroups() {
			const list = Array.isArray(this.lessons) ? this.lessons : []
			if (!list.length) return []
			const hasAnyUnit = list.some((l) => String(l.unitName || '').trim())
			if (!hasAnyUnit) {
				return [
					{
						key: 'flat',
						unitName: '',
						unitTheme: '',
						showHeader: false,
						lessons: list.map((lesson, i) => ({
							...lesson,
							index1: i + 1
						}))
					}
				]
			}
			const groups = []
			let cur = null
			list.forEach((lesson, i) => {
				const name = String(lesson.unitName || '').trim() || '其他'
				const theme = String(lesson.unitTheme || '').trim()
				const row = { ...lesson, index1: i + 1 }
				if (!cur || cur.unitName !== name) {
					cur = {
						key: `u-${groups.length}-${name}`,
						unitName: name,
						unitTheme: theme,
						showHeader: true,
						lessons: [row]
					}
					groups.push(cur)
				} else {
					if (!cur.unitTheme && theme) cur.unitTheme = theme
					cur.lessons.push(row)
				}
			})
			return groups
		}
	},
	onShow() {
		this.statusBarPx = getMengNavMetrics().statusBarPx
		this.ensureCurriculumSelected()
	},
	created() {
		this.statusBarPx = getMengNavMetrics().statusBarPx
	},
	methods: {
		staticImg(key, webPath) {
			const list = buildAppStaticImageSrcCandidates(webPath)
			const i = Math.min(this.staticImgTryIndex[key] || 0, Math.max(0, list.length - 1))
			return list[i] || resolveAppStaticImageUrl(webPath) || webPath
		},
		onStaticImgError(key, webPath) {
			const list = buildAppStaticImageSrcCandidates(webPath)
			const next = (this.staticImgTryIndex[key] || 0) + 1
			if (next < list.length) {
				this.$set(this.staticImgTryIndex, key, next)
			} else {
				console.warn('[textbook] image load failed', key, webPath, list)
			}
		},
		async reload() {
			if (!hasUserCurriculumPrefsSaved()) {
				this.ensureCurriculumSelected()
				return
			}
			if (this.loading) return
			this.loading = true
			try {
				const prefs = getCurriculumPrefs()
				this.summary = formatCurriculumSummary(prefs)
				if (isRenjiaoTextbookSyncPrefs(prefs)) {
					const loaderParams = getRenjiaoTextbookLoaderParams(prefs)
					const raw = await loadRenjiaoTextbookTexts(loaderParams)
					const syncLessons = filterRenjiaoTextbookSyncLessons(raw)
					this.chars = []
					this.lessons = syncLessons.map((item, idx) => {
						const charRows = buildLessonCharRowsFromRenjiaoItem(item)
						const litRows = buildLiteracyOnlyCharRowsFromRenjiaoItem(item)
						const pinyinItems = buildLessonPinyinItemsFromRenjiaoItem(item)
						const learnCheckKeys = this.collectLessonLearnCharKeys(litRows)
						const unitNum = Number(item.unit)
						return {
							hint: String(item.title || `第${idx + 1}课`),
							count: charRows.length,
							pinyinCount: pinyinItems.length,
							rjIdx: idx,
							unit: Number.isFinite(unitNum) ? unitNum : null,
							unitName: String(item.unitName || '').trim(),
							unitTheme:
								item.unitTheme != null ? String(item.unitTheme).trim() : '',
							learnCheckKeys,
							doneBadgeKind: learnCheckKeys.length ? 'literacy' : '',
							doneBadgeText: ''
						}
					})
				} else {
					this.chars = await queryCurriculumChars(prefs)
					const map = Object.create(null)
					this.chars.forEach((row) => {
						const hint = String(row.lesson_hint || '未分课次')
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
			const map = getUserProgressMap()
			const learned = (ch) => {
				const key = makeProgressKey(prefs.textbook_version_id, prefs.grade, prefs.semester, ch)
				const rec = map[key]
				return !!(rec && Number(rec[COL_PROGRESS.learned]) === 1)
			}
			for (const lesson of this.lessons) {
				const keys = lesson.learnCheckKeys
				let text = ''
				if (keys && keys.length && keys.every((c) => learned(c))) {
					text = lesson.doneBadgeKind === 'lesson' ? '本课已学' : '识字已学'
				}
				this.$set(lesson, 'doneBadgeText', text)
			}
		},
		ensureCurriculumSelected() {
			if (!hasUserCurriculumPrefsSaved()) {
				this.curriculumPickerRequired = true
				this.lessons = []
				this.chars = []
				this.summary = '请先选择教材'
				this.openCurriculumPicker()
				return
			}
			this.curriculumPickerRequired = false
			this.reload()
		},
		openCurriculumPicker() {
			const p = getCurriculumPrefs()
			this.modalVersion = p.textbook_version_id || TEXTBOOK_VERSION_IDS.TONGBIAN_RJ
			this.showCurriculumPicker = true
		},
		onPickerMaskTap() {
			if (this.curriculumPickerRequired) return
			this.closeCurriculumPicker()
		},
		closeCurriculumPicker() {
			if (this.curriculumPickerRequired) return
			this.showCurriculumPicker = false
		},
		chooseVersion(versionId) {
			this.modalVersion = versionId
		},
		async selectBook(book) {
			setCurriculumPrefs({
				textbook_version_id: this.modalVersion,
				grade: book.grade,
				semester: book.semester
			})
			const wasRequired = this.curriculumPickerRequired
			this.curriculumPickerRequired = false
			this.showCurriculumPicker = false
			await this.reload()
			uni.showToast({
				title: wasRequired ? `已选择${book.label}` : `已切换到${book.label}`,
				icon: 'success'
			})
		},
		goHome() {
			uni.switchTab({ url: '/pages/home/home' })
		},
		/** 单元头：unitName.unitTheme（无主题则仅单元名） */
		unitHeadTitle(group) {
			const name = String((group && group.unitName) || '').trim()
			const theme = String((group && group.unitTheme) || '').trim()
			if (name && theme) return `${name}.${theme}`
			return name || theme
		},
		lessonMetaText(lesson) {
			const chars = Number(lesson && lesson.count) || 0
			const py = Number(lesson && lesson.pinyinCount) || 0
			if (chars > 0 && py > 0) return `${chars} 字 · ${py} 拼音`
			if (py > 0) return `${py} 拼音`
			return `${chars} 字`
		},
		openLesson(lesson) {
			if (this.curriculumPickerRequired) {
				this.openCurriculumPicker()
				return
			}
			if (typeof lesson.rjIdx === 'number') {
				uni.navigateTo({
					url: `/pages/literacy/lesson?rjLesson=${lesson.rjIdx}`
				})
				return
			}
			uni.navigateTo({
				url: `/pages/literacy/lesson?hint=${encodeURIComponent(lesson.hint)}`
			})
		}
	}
}
</script>

<style scoped>
.tb-page {
	min-height: 100vh;
	padding: 0 0 40rpx;
	box-sizing: border-box;
	background: var(--meng-page-bg);
}

.tb-hero {
	position: relative;
	padding: 0 20rpx 12rpx;
	box-sizing: border-box;
	overflow: hidden;
}

.tb-nav {
	position: relative;
	z-index: 3;
	margin-left: -20rpx;
	margin-right: -20rpx;
}

.tb-hero-bar {
	position: relative;
	z-index: 1;
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 12rpx;
	padding: 12rpx 4rpx 4rpx;
}

.tb-hero-meta {
	flex: 1;
	min-width: 0;
}

.tb-hero-sub {
	display: block;
	font-size: 26rpx;
	font-weight: 700;
	color: var(--meng-text, #2c2419);
	line-height: 1.3;
	word-break: break-all;
}

.tb-hero-stat {
	display: block;
	margin-top: 4rpx;
	font-size: 22rpx;
	color: var(--meng-text-muted, #8a8076);
	line-height: 1.3;
}

.tb-switch-link {
	flex-shrink: 0;
	padding: 10rpx 4rpx 10rpx 12rpx;
	font-size: 24rpx;
	font-weight: 700;
	color: #c44d6a;
	line-height: 1.2;
}

.tb-switch-link:active {
	opacity: 0.75;
}

.tb-body {
	position: relative;
	z-index: 2;
	padding: 8rpx 20rpx 0;
	box-sizing: border-box;
}

.lesson-list {
	display: flex;
	flex-direction: column;
	gap: 22rpx;
}

.lesson-unit-block {
	display: flex;
	flex-direction: column;
	gap: 10rpx;
}

.unit-head {
	padding: 8rpx 4rpx 2rpx;
}

.unit-name {
	display: block;
	font-size: 24rpx;
	font-weight: 700;
	color: var(--meng-text-muted, #8a8076);
	line-height: 1.3;
	letter-spacing: 0.02em;
}

.lesson-card {
	display: flex;
	flex-direction: row;
	align-items: center;
	padding: 18rpx 16rpx;
	background: var(--meng-card-solid, #fff);
	border-radius: 18rpx;
	border: 1rpx solid var(--meng-border, rgba(44, 36, 25, 0.08));
	box-sizing: border-box;
}

.lesson-card:active {
	opacity: 0.92;
}

.lesson-num {
	flex-shrink: 0;
	width: 48rpx;
	height: 48rpx;
	line-height: 48rpx;
	text-align: center;
	font-size: 24rpx;
	font-weight: 700;
	color: #3d6b4a;
	background: #e8f6ec;
	border-radius: 12rpx;
	margin-right: 14rpx;
}

.lesson-main {
	flex: 1;
	min-width: 0;
}

.lesson-title-row {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	gap: 10rpx;
}

.lesson-title-row .lesson-title {
	flex: 1;
	min-width: 0;
	display: block;
	font-size: 28rpx;
	font-weight: 700;
	color: var(--meng-text);
	line-height: 1.3;
	word-break: break-all;
}

.lesson-done-badge {
	flex-shrink: 0;
	padding: 2rpx 10rpx;
	font-size: 20rpx;
	font-weight: 600;
	color: #2e7d32;
	background: #e8f6ec;
	border-radius: 8rpx;
	line-height: 1.35;
}

.lesson-meta {
	display: block;
	margin-top: 4rpx;
	font-size: 22rpx;
	color: var(--meng-text-muted, #8a8076);
	font-weight: 500;
}

.lesson-arrow {
	flex-shrink: 0;
	font-size: 32rpx;
	color: rgba(44, 36, 25, 0.22);
	margin-left: 8rpx;
	font-weight: 300;
}

.empty-box {
	padding: 56rpx 24rpx;
	text-align: center;
}

.empty-title {
	display: block;
	font-size: 28rpx;
	font-weight: 700;
	color: var(--meng-text);
	margin-bottom: 8rpx;
}

.empty-desc {
	display: block;
	font-size: 24rpx;
	color: var(--meng-text-muted, #8a8076);
	line-height: 1.45;
	margin-bottom: 24rpx;
}

.empty-btn {
	border-radius: 999rpx !important;
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
