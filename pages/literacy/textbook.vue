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
			<view class="tb-hero-sky" />
			<meng-status-bar-spacer :height-px="statusBarPx" />
			<meng-page-nav title="课本同步学" class="tb-nav" :inset-status-bar="false">
				<template #right>
					<view class="tb-circle-btn tb-circle-btn--nav" @click="reload">
						<text class="tb-circle-icon">🔄</text>
					</view>
				</template>
			</meng-page-nav>
			<view class="tb-hero-card">
				<view class="tb-hero-body">
					<view class="tb-cover-wrap" @click="openCurriculumPicker">
						<image
							class="tb-cover-img"
							:src="staticImg(heroCoverRawPath, heroCoverRawPath)"
							mode="aspectFit"
							:lazy-load="false"
							@error="onStaticImgError(heroCoverRawPath, heroCoverRawPath)"
						/>
						<text class="tb-cover-tag">换教材</text>
					</view>
					<view class="tb-hero-meta">
						<text class="tb-hero-sub">{{ summary }}</text>
						<view v-if="lessons.length" class="tb-stat-pill">
							<text class="tb-stat-txt">
								共 <text class="tb-stat-num">{{ lessons.length }}</text> 课 ·
								<text class="tb-stat-num">{{ statSlotCount }}</text> 个生字
							</text>
						</view>
					</view>
				</view>
			</view>
		</view>

		<view v-if="!curriculumPickerRequired" class="tb-sheet">
		<view v-if="textbookTexts.length" class="textbook-panel">
			<view class="textbook-panel-head">
				<text class="textbook-panel-title">人教版（部编）课文原文</text>
				<text class="textbook-panel-sub">当前册别共 {{ textbookTexts.length }} 篇，点标题可阅读</text>
			</view>
			<view
				v-for="(item, idx) in textbookTexts.slice(0, 12)"
				:key="`${idx}-${item.title}`"
				class="text-row"
				@click="openText(item, idx)"
			>
				<text class="text-row-title">{{ item.title || `第${idx + 1}篇` }}</text>
				<text class="text-row-arrow">›</text>
			</view>
		</view>

		<!-- 课次列表：大卡片，好点 -->
		<view class="section-head">
			<text class="section-title">选一课，学生字</text>
			<text class="section-hint">点课进入字卡；该课识字表生字均已标「已学」时显示绿标（无识字表数据时按本课全部生字）</text>
		</view>

		<view v-if="lessons.length" class="lesson-list">
			<view
				v-for="(lesson, i) in lessons"
				:key="`${lesson.hint}-${i}`"
				class="lesson-card"
				@click="openLesson(lesson)"
			>
				<view class="lesson-num">{{ i + 1 }}</view>
				<view class="lesson-main">
					<view class="lesson-title-row">
						<text class="lesson-title">{{ lesson.hint }}</text>
						<text v-if="lesson.doneBadgeText" class="lesson-done-badge">{{ lesson.doneBadgeText }}</text>
					</view>
					<text class="lesson-meta">{{ lesson.count }} 个字 · 去学习</text>
				</view>
				<text class="lesson-arrow">›</text>
			</view>
		</view>

		<view v-else class="empty-box">
			<text class="empty-title">暂时没有课次数据</text>
			<text class="empty-desc">请先到识字首页「当前进度」里选好教材与年级册别；若已选择仍无数据，可检查字表类型是否过滤过窄。</text>
			<button class="empty-btn" type="primary" size="mini" @click="goHome">回识字首页</button>
		</view>

		<view class="foot-tip">
			<image
				class="foot-icon-img"
				:src="staticImg('foot-logo', '/static/mengmeng/logo-icon.png')"
				mode="aspectFit"
				@error="onStaticImgError('foot-logo', '/static/mengmeng/logo-icon.png')"
			/>
			<text class="foot-msg">点一课进入字卡听读音；点封面可换年级册别。</text>
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
	filterRenjiaoTextbookSyncLessons,
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

/** 与当前教材偏好对应的静态封面 web 路径 */
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
			textbookTexts: [],
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
		heroCoverRawPath() {
			return rawCoverPathForPrefs(getCurriculumPrefs())
		},
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
				this.textbookTexts = []
				if (prefs.textbook_version_id === TEXTBOOK_VERSION_IDS.TONGBIAN_RJ) {
					const raw = await loadRenjiaoTextbookTexts({
						grade: prefs.grade,
						semester: prefs.semester
					})
					const syncLessons = filterRenjiaoTextbookSyncLessons(raw)
					this.chars = []
					this.lessons = syncLessons.map((item, idx) => {
						const charRows = buildLessonCharRowsFromRenjiaoItem(item)
						const litRows = buildLiteracyOnlyCharRowsFromRenjiaoItem(item)
						const learnCheckKeys = this.collectLessonLearnCharKeys(litRows)
						return {
							hint: String(item.title || `第${idx + 1}课`),
							count: charRows.length,
							rjIdx: idx,
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
				this.textbookTexts = []
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
		openText(item, idx) {
			const title = item && item.title ? item.title : `第${idx + 1}篇`
			const raw = item && item.content ? String(item.content).trim() : ''
			uni.showModal({
				title,
				content: raw.length > 900 ? `${raw.slice(0, 900)}\n\n（内容较长，已截断）` : raw || '暂无内容',
				showCancel: false,
				confirmText: '关闭'
			})
		},
		goHome() {
			uni.switchTab({ url: '/pages/home/home' })
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

.textbook-panel {
	margin-bottom: 20rpx;
	background: #fff5f8;
	border-radius: 22rpx;
	padding: 18rpx 20rpx;
	border: 1rpx solid rgba(255, 200, 180, 0.35);
}

.textbook-panel-head {
	margin-bottom: 8rpx;
}

.textbook-panel-title {
	display: block;
	font-size: 28rpx;
	font-weight: 700;
	color: var(--meng-text);
}

.textbook-panel-sub {
	display: block;
	margin-top: 4rpx;
	font-size: 22rpx;
	color: #8a8279;
}

.text-row {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	padding: 16rpx 6rpx;
	border-top: 1rpx solid rgba(255, 220, 200, 0.45);
}

.text-row:active {
	opacity: 0.85;
}

.text-row-title {
	flex: 1;
	font-size: 26rpx;
	color: var(--meng-text-secondary, #6d5e52);
	line-height: 1.45;
	font-weight: 500;
}

.text-row-arrow {
	font-size: 34rpx;
	color: rgba(196, 77, 106, 0.4);
	margin-left: 12rpx;
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

.lesson-list {
	display: flex;
	flex-direction: column;
}

.lesson-list > .lesson-card + .lesson-card {
	margin-top: 14rpx;
}

.lesson-card {
	display: flex;
	flex-direction: row;
	align-items: center;
	padding: 24rpx 20rpx;
	background: #fff;
	border-radius: 24rpx;
	border: 2rpx solid rgba(255, 230, 210, 0.6);
	box-shadow: 0 8rpx 20rpx rgba(44, 36, 25, 0.05);
	box-sizing: border-box;
}

.lesson-card:active {
	opacity: 0.94;
	transform: scale(0.995);
}

.lesson-num {
	flex-shrink: 0;
	width: 56rpx;
	height: 56rpx;
	line-height: 56rpx;
	text-align: center;
	font-size: 26rpx;
	font-weight: 800;
	color: #fff;
	background: #7fd49a;
	border-radius: 16rpx;
	margin-right: 18rpx;
	box-shadow: 0 6rpx 14rpx rgba(90, 160, 110, 0.28);
}

.lesson-main {
	flex: 1;
	min-width: 0;
}

.lesson-title-row {
	display: flex;
	flex-direction: row;
	align-items: flex-start;
	justify-content: space-between;
}

.lesson-title-row .lesson-title {
	flex: 1;
	min-width: 0;
	display: block;
	font-size: 30rpx;
	font-weight: 700;
	color: var(--meng-text);
	line-height: 1.35;
	word-break: break-all;
}

.lesson-done-badge {
	flex-shrink: 0;
	margin-left: 12rpx;
	padding: 4rpx 14rpx;
	font-size: 22rpx;
	font-weight: 600;
	color: #fff;
	background: #43a047;
	border-radius: 999rpx;
	line-height: 1.3;
}

.lesson-meta {
	display: block;
	margin-top: 8rpx;
	font-size: 24rpx;
	color: #c44d6a;
	font-weight: 600;
}

.lesson-arrow {
	flex-shrink: 0;
	font-size: 40rpx;
	color: rgba(196, 77, 106, 0.35);
	margin-left: 12rpx;
	font-weight: 300;
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
