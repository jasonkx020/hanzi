<template>
	<view class="page">
		<!-- 当前学什么：一眼看懂 -->
		<view class="hero">
			<text class="hero-icon">📘</text>
			<view class="hero-body">
				<view class="hero-row">
					<text class="hero-title">课本同步学</text>
					<view class="hero-actions">
						<button class="hero-action-btn" type="default" @click.stop="openCurriculumPicker">
							<text class="hero-action-icon">📚</text>
						</button>
						<button class="hero-action-btn" type="default" @click.stop="reload">
						<text class="hero-refresh-icon">🔄</text>
					</button>
					</view>
				</view>
				<text class="hero-sub">{{ summary }}</text>
			</view>
		</view>

		<!-- 体量感知 -->
		<view v-if="lessons.length" class="stat-pill">
			<text class="stat-txt">共 <text class="stat-num">{{ lessons.length }}</text> 课 · <text class="stat-num">{{ statSlotCount }}</text> 个生字</text>
		</view>

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
			<text class="section-hint">点下面任意一课进入字卡</text>
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
					<text class="lesson-title">{{ lesson.hint }}</text>
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
			<text class="foot-icon">🐼</text>
			<text class="foot-msg">小朋友看点字卡听读音；也可以点右上角教材按钮直接切换版本与课本。</text>
		</view>

		<view v-if="showCurriculumPicker" class="picker-mask" @click="closeCurriculumPicker">
			<view class="picker-panel" @click.stop>
				<view class="picker-head">
					<text class="picker-title">选择教材</text>
					<text class="picker-close" @click="closeCurriculumPicker">×</text>
				</view>

				<view class="version-row">
					<view
						v-for="v in versionOptions"
						:key="v.value"
						class="version-chip"
						:class="{ 'version-chip-on': modalVersion === v.value }"
						@click="chooseVersion(v.value)"
					>
						<image class="version-icon" :src="v.icon" mode="aspectFill" />
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
								<image class="book-cover" :src="book.cover" mode="aspectFit" />
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
import { TEXTBOOK_VERSION_IDS } from '@/constants/curriculum-schema.js'
import { getCurriculumPrefs, setCurriculumPrefs, formatCurriculumSummary } from '@/utils/curriculum-storage.js'
import { queryCurriculumChars } from '@/utils/curriculum-db.js'
import {
	buildLessonCharRowsFromRenjiaoItem,
	filterRenjiaoTextbookSyncLessons,
	loadRenjiaoTextbookTexts
} from '@/utils/renjiao-textbook-loader.js'

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
	data() {
		return {
			summary: '',
			chars: [],
			lessons: [],
			loading: false,
			textbookTexts: [],
			showCurriculumPicker: false,
			modalVersion: '统编(人教版)',
			versionOptions: VERSION_OPTIONS
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
					cover: '/static/images/yuwen_youxiao.jpg'
				}
				return [{ grade: 0, up: book, down: null }]
			}
			const map = {}
			COVER_BOOKS.forEach((b) => {
				const book = {
					...b,
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
		this.reload()
	},
	methods: {
		async reload() {
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
						return {
							hint: String(item.title || `第${idx + 1}课`),
							count: charRows.length,
							rjIdx: idx
						}
					})
				} else {
					this.chars = await queryCurriculumChars(prefs)
					const map = Object.create(null)
					this.chars.forEach((row) => {
						const hint = String(row.lesson_hint || '未分课次')
						if (!map[hint]) map[hint] = { hint, count: 0 }
						map[hint].count += 1
					})
					this.lessons = Object.values(map).sort((a, b) =>
						String(a.hint).localeCompare(String(b.hint), 'zh-Hans-CN')
					)
				}
			} catch (e) {
				console.warn('[textbook] reload', e)
				uni.showToast({ title: '加载失败，请重试', icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		openCurriculumPicker() {
			const p = getCurriculumPrefs()
			this.modalVersion = p.textbook_version_id || TEXTBOOK_VERSION_IDS.TONGBIAN_RJ
			this.showCurriculumPicker = true
		},
		closeCurriculumPicker() {
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
			this.closeCurriculumPicker()
			await this.reload()
			uni.showToast({ title: `已切换到${book.label}`, icon: 'success' })
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
.page {
	min-height: 100vh;
	padding: 24rpx 24rpx 40rpx;
	background: #fff8e7;
	box-sizing: border-box;
}

.hero {
	display: flex;
	flex-direction: row;
	align-items: flex-start;
	padding: 28rpx 24rpx;
	background: #fff;
	border-radius: 20rpx;
	border: 1rpx solid #ffe0b2;
	box-shadow: 0 6rpx 20rpx rgba(255, 167, 38, 0.12);
	margin-bottom: 20rpx;
}

.hero-icon {
	font-size: 52rpx;
	margin-right: 18rpx;
	line-height: 1;
}

.hero-body {
	flex: 1;
	min-width: 0;
}

.hero-row {
	display: flex;
	flex-direction: row;
	align-items: center;
	margin-bottom: 10rpx;
}

.hero-title {
	flex: 1;
	min-width: 0;
	font-size: 36rpx;
	font-weight: 700;
	color: #4e4e4e;
	line-height: 1.25;
}

.hero-actions {
	display: flex;
	flex-direction: row;
	align-items: center;
}

.hero-action-btn {
	flex-shrink: 0;
	display: flex !important;
	align-items: center;
	justify-content: center;
	width: 64rpx !important;
	height: 64rpx !important;
	min-height: 64rpx !important;
	padding: 0 !important;
	margin: 0 0 0 12rpx !important;
	line-height: 1 !important;
	border-radius: 16rpx !important;
	background: #fff8ed !important;
	border: 1rpx solid #ffe0b2 !important;
	box-sizing: border-box;
}

.hero-action-btn + .hero-action-btn {
	margin-left: 10rpx !important;
}

.hero-action-btn::after {
	border: none !important;
}

.hero-refresh-icon {
	font-size: 32rpx;
	line-height: 1;
}

.hero-action-icon {
	font-size: 30rpx;
	line-height: 1;
}

.hero-sub {
	display: block;
	font-size: 24rpx;
	color: #9e9e9e;
	line-height: 1.45;
	word-break: break-all;
}

.stat-pill {
	align-self: flex-start;
	padding: 10rpx 20rpx;
	background: rgba(139, 195, 74, 0.15);
	border-radius: 999rpx;
	margin-bottom: 24rpx;
	border: 1rpx solid rgba(139, 195, 74, 0.35);
}

.stat-txt {
	font-size: 24rpx;
	color: #558b2f;
}

.stat-num {
	font-weight: 700;
	color: #33691e;
}

.textbook-panel {
	margin-bottom: 20rpx;
	background: #fff;
	border-radius: 18rpx;
	padding: 18rpx 20rpx;
	border: 1rpx solid #f0e6d4;
}

.textbook-panel-head {
	margin-bottom: 8rpx;
}

.textbook-panel-title {
	display: block;
	font-size: 28rpx;
	font-weight: 700;
	color: #2c2419;
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
	padding: 14rpx 4rpx;
	border-top: 1rpx solid #f5eee3;
}

.text-row-title {
	flex: 1;
	font-size: 25rpx;
	color: #5a534c;
	line-height: 1.45;
}

.text-row-arrow {
	font-size: 34rpx;
	color: #cfd8dc;
	margin-left: 12rpx;
}

.section-head {
	margin-bottom: 14rpx;
	padding-left: 4rpx;
}

.section-title {
	display: block;
	font-size: 30rpx;
	font-weight: 700;
	color: #4e4e4e;
	margin-bottom: 6rpx;
}

.section-hint {
	display: block;
	font-size: 22rpx;
	color: #9e9e9e;
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
	padding: 26rpx 22rpx;
	background: #fff;
	border-radius: 18rpx;
	border: 1rpx solid #f0e6d4;
	box-shadow: 0 4rpx 14rpx rgba(78, 78, 78, 0.06);
	box-sizing: border-box;
}

.lesson-num {
	flex-shrink: 0;
	width: 52rpx;
	height: 52rpx;
	line-height: 52rpx;
	text-align: center;
	font-size: 26rpx;
	font-weight: 700;
	color: #fff;
	background: linear-gradient(135deg, #ffa726 0%, #fb8c00 100%);
	border-radius: 14rpx;
	margin-right: 18rpx;
}

.lesson-main {
	flex: 1;
	min-width: 0;
}

.lesson-title {
	display: block;
	font-size: 30rpx;
	font-weight: 700;
	color: #2c2419;
	line-height: 1.35;
	word-break: break-all;
}

.lesson-meta {
	display: block;
	margin-top: 8rpx;
	font-size: 24rpx;
	color: #42a5f5;
	font-weight: 500;
}

.lesson-arrow {
	flex-shrink: 0;
	font-size: 40rpx;
	color: #cfd8dc;
	margin-left: 12rpx;
	font-weight: 300;
}

.empty-box {
	padding: 48rpx 28rpx;
	background: #fff;
	border-radius: 18rpx;
	border: 2rpx dashed #ffe0b2;
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
	margin-top: 28rpx;
	padding: 18rpx 20rpx;
	background: rgba(66, 165, 245, 0.08);
	border-radius: 14rpx;
	border: 1rpx solid rgba(66, 165, 245, 0.25);
}

.foot-icon {
	font-size: 30rpx;
	margin-right: 10rpx;
	line-height: 1.4;
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

.picker-panel {
	width: 100%;
	max-height: 78vh;
	background: #fffdf7;
	border-radius: 26rpx 26rpx 0 0;
	padding: 24rpx;
	box-sizing: border-box;
}

.picker-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 20rpx;
}

.picker-title {
	font-size: 32rpx;
	font-weight: 700;
	color: #2c2419;
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
	background: #fff;
	border: 1rpx solid #eadfcd;
	border-radius: 14rpx;
	padding: 12rpx;
	box-sizing: border-box;
}

.version-chip + .version-chip {
	margin-left: 12rpx;
}

.version-chip-on {
	background: #fff3df;
	border-color: #ffb74d;
}

.version-icon {
	width: 46rpx;
	height: 62rpx;
	border-radius: 6rpx;
	margin-right: 10rpx;
}

.version-label {
	font-size: 26rpx;
	font-weight: 600;
	color: #5a534c;
}

.book-scroll {
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

/* 竖版课本封面：等比例完整显示，不裁切 */
.book-cover-wrap {
	width: 100%;
	aspect-ratio: 3 / 4;
	border-radius: 12rpx;
	background: #f3ebe0;
	overflow: hidden;
	display: flex;
	align-items: center;
	justify-content: center;
}

.book-cover {
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
