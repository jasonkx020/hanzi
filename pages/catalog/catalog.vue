<!--
  @file catalog.vue
  @layer L1 表现层
  @description 路由页面源文件：catalog.vue
  @software 萌萌识字移动应用软件 V1.0
  @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
-->
<template>
	<meng-sub-page title="教材目录" subtitle="按课次浏览生字">
		<view class="bar">
			<text class="bar-text">{{ summary }}</text>
		</view>
		<view class="placeholder meng-card">
			<meng-avatar pose="book" size="md" />
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
	</meng-sub-page>
</template>

<script>
import MengSubPage from '@/components/meng-sub-page.vue'
import { getCurriculumPrefs, formatCurriculumSummary } from '@/utils/curriculum-storage.js'
import { queryCurriculumChars } from '@/utils/curriculum-db.js'
import MengAvatar from '@/components/meng-avatar.vue'

export default {
	components: { MengSubPage, MengAvatar },
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
.bar {
	padding: 16rpx 20rpx;
	background: var(--meng-card-solid);
	border-radius: 16rpx;
	margin-bottom: 24rpx;
	border: 1rpx solid var(--meng-border);
}

.bar-text {
	font-size: 24rpx;
	color: var(--meng-text-secondary);
}

.placeholder {
	padding: 48rpx 32rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
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
	color: var(--meng-text);
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
	color: var(--meng-text);
}

.lesson-meta {
	display: block;
	font-size: 22rpx;
	color: #8a8279;
	margin-top: 6rpx;
}
</style>
