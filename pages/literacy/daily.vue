<template>
	<view class="page">
		<text class="title">每日一练</text>
		<text class="desc">按当前教材偏好加载，并优先从易错池抽取练习字。</text>
		<text class="count">当前筛选字数：{{ dbCount }}</text>
		<view class="box">
			<text class="mono">{{ debugSql }}</text>
		</view>
		<view class="actions">
			<button type="primary" @click="goDictionary">先查字</button>
			<button type="default" @click="reload">刷新练习池</button>
		</view>
	</view>
</template>

<script>
import { debugSelectSql, queryCurriculumChars } from '@/utils/curriculum-db.js'
import { getCurriculumPrefs } from '@/utils/curriculum-storage.js'
import { pickDailyChars } from '@/services/recommend-service.js'

export default {
	data() {
		return {
			debugSql: '',
			dbCount: 0
		}
	},
	async onShow() {
		await this.reload()
	},
	methods: {
		async reload() {
			const { sql, params } = debugSelectSql(getCurriculumPrefs())
			const weak = pickDailyChars(10)
			this.debugSql = `${sql}\n-- params: ${JSON.stringify(params)}\n-- weakPool: ${JSON.stringify(weak)}`
			const rows = await queryCurriculumChars(getCurriculumPrefs())
			this.dbCount = rows.length
		},
		goDictionary() {
			uni.switchTab({ url: '/pages/dictionary/index' })
		}
	}
}
</script>

<style scoped>
.page { min-height: 100vh; padding: 32rpx; background: #f4f1ea; box-sizing: border-box; }
.title { display: block; font-size: 36rpx; font-weight: 700; color: #2c2419; margin-bottom: 16rpx; }
.desc { display: block; font-size: 26rpx; color: #5a534c; line-height: 1.55; margin-bottom: 16rpx; }
.count { display: block; font-size: 26rpx; color: #3d6b4a; font-weight: 600; margin-bottom: 24rpx; }
.box { background: #fff; padding: 20rpx; border-radius: 12rpx; margin-bottom: 24rpx; }
.mono { font-size: 20rpx; color: #57606a; word-break: break-all; white-space: pre-wrap; }
.actions { display: flex; flex-direction: column; }
.actions > * + * { margin-top: 16rpx; }
</style>
