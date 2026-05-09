<template>
	<view class="page">
		<!-- 当前学什么：一眼看懂 -->
		<view class="hero">
			<text class="hero-icon">📘</text>
			<view class="hero-body">
				<view class="hero-row">
					<text class="hero-title">课本同步学</text>
					<button class="hero-refresh" type="default" @click.stop="reload">
						<text class="hero-refresh-icon">🔄</text>
					</button>
				</view>
				<text class="hero-sub">{{ summary }}</text>
			</view>
		</view>

		<!-- 体量感知 -->
		<view v-if="lessons.length" class="stat-pill">
			<text class="stat-txt">共 <text class="stat-num">{{ lessons.length }}</text> 课 · <text class="stat-num">{{ chars.length }}</text> 个生字</text>
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
			<text class="foot-msg">小朋友看点字卡听读音；换教材请到底部「识字」首页的「调整教材与进度」。</text>
		</view>
	</view>
</template>

<script>
import { getCurriculumPrefs, formatCurriculumSummary } from '@/utils/curriculum-storage.js'
import { queryCurriculumChars } from '@/utils/curriculum-db.js'

export default {
	data() {
		return {
			summary: '',
			chars: [],
			lessons: [],
			loading: false
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
				this.summary = formatCurriculumSummary(getCurriculumPrefs())
				this.chars = await queryCurriculumChars(getCurriculumPrefs())
				const map = Object.create(null)
				this.chars.forEach((row) => {
					const hint = String(row.lesson_hint || '未分课次')
					if (!map[hint]) map[hint] = { hint, count: 0 }
					map[hint].count += 1
				})
				this.lessons = Object.values(map).sort((a, b) =>
					String(a.hint).localeCompare(String(b.hint), 'zh-Hans-CN')
				)
			} catch (e) {
				console.warn('[textbook] reload', e)
				uni.showToast({ title: '加载失败，请重试', icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		goHome() {
			uni.switchTab({ url: '/pages/home/home' })
		},
		openLesson(lesson) {
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

.hero-refresh {
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

.hero-refresh::after {
	border: none !important;
}

.hero-refresh-icon {
	font-size: 32rpx;
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
</style>
