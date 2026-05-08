<template>
	<view class="page">
		<view class="bar">
			<text class="bar-text">{{ summary }}</text>
		</view>
		<view class="placeholder">
			<text class="p-title">教材目录与课次</text>
			<text class="p-desc">当前共 {{ chars.length }} 字，按 lesson_hint 自动分组。</text>
			<button type="primary" size="mini" @click="goSettings">筛选条件</button>
			<button class="mt" type="default" size="mini" @click="reloadDb">刷新数据</button>
		</view>
		<view v-if="lessons.length" class="lesson-list">
			<view
				v-for="(lesson, i) in lessons"
				:key="`${lesson.hint}-${i}`"
				class="lesson-item"
				@click="openLesson(lesson)"
			>
				<text class="lesson-title">{{ lesson.hint }}</text>
				<text class="lesson-meta">共 {{ lesson.count }} 字 · 进入字卡</text>
			</view>
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
			lessons: []
		}
	},
	onShow() {
		this.summary = formatCurriculumSummary(getCurriculumPrefs())
		this.reloadDb()
	},
	methods: {
		async reloadDb() {
			this.chars = await queryCurriculumChars(getCurriculumPrefs())
			const map = Object.create(null)
			this.chars.forEach((row) => {
				const hint = String(row.lesson_hint || '未分课次')
				if (!map[hint]) {
					map[hint] = { hint, count: 0 }
				}
				map[hint].count += 1
			})
			this.lessons = Object.values(map)
		},
		openLesson(lesson) {
			uni.navigateTo({ url: `/pages/literacy/lesson?hint=${encodeURIComponent(lesson.hint)}` })
		},
		goSettings() {
			uni.navigateTo({ url: '/pages/settings/curriculum' })
		}
	}
}
</script>

<style scoped>
.page {
	min-height: 100vh;
	background: #f4f1ea;
	padding: 24rpx;
	box-sizing: border-box;
}

.bar {
	padding: 16rpx 20rpx;
	background: #fffef9;
	border-radius: 12rpx;
	margin-bottom: 24rpx;
}

.bar-text {
	font-size: 24rpx;
	color: #4a453f;
}

.placeholder {
	padding: 48rpx 32rpx;
	background: #fff;
	border-radius: 20rpx;
	display: flex;
	flex-direction: column;
	align-items: flex-start;
}

.placeholder > *:not(:first-child) {
	margin-top: 16rpx;
}

.placeholder > button + button {
	margin-top: 24rpx;
}

.p-title {
	font-size: 34rpx;
	font-weight: 700;
	color: #2c2419;
}

.p-desc {
	font-size: 26rpx;
	color: #6b6560;
	line-height: 1.5;
}

.mt {
	margin-top: 8rpx;
}

.lesson-list {
	display: flex;
	flex-direction: column;
	margin-top: 24rpx;
}

.lesson-list > .lesson-item + .lesson-item {
	margin-top: 12rpx;
}

.lesson-item {
	background: #fff;
	border-radius: 12rpx;
	padding: 18rpx 20rpx;
	box-shadow: 0 2rpx 8rpx rgba(44, 36, 25, 0.06);
}

.lesson-title {
	display: block;
	font-size: 28rpx;
	font-weight: 700;
	color: #2c2419;
}

.lesson-meta {
	display: block;
	font-size: 22rpx;
	color: #8a8279;
	margin-top: 6rpx;
}
</style>
