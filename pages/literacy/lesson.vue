<template>
	<view class="page">
		<view class="card">
			<text class="title">{{ hint }}</text>
			<text class="desc">本课字卡：{{ lessonChars.length }} 字</text>
		</view>
		<view v-if="lessonChars.length" class="grid">
			<view
				v-for="(row, i) in lessonChars"
				:key="row.id != null ? row.id : i"
				class="cell"
				@click="openChar(row)"
			>
				<text class="cell-char">{{ row.hanzi }}</text>
				<text class="cell-py">{{ row.pinyin || '-' }}</text>
			</view>
		</view>
	</view>
</template>
<script>
import { queryCurriculumChars } from '@/utils/curriculum-db.js'
import { getCurriculumPrefs } from '@/utils/curriculum-storage.js'

export default {
	data() {
		return {
			hint: '课次字卡',
			lessonChars: []
		}
	},
	async onLoad(query) {
		this.hint = query.hint ? decodeURIComponent(query.hint) : '课次字卡'
		const rows = await queryCurriculumChars(getCurriculumPrefs())
		this.lessonChars = rows.filter((r) => String(r.lesson_hint || '未分课次') === this.hint)
	},
	methods: {
		openChar(row) {
			const p = getCurriculumPrefs()
			uni.navigateTo({
				url: `/pages/char/detail?hanzi=${encodeURIComponent(row.hanzi || '')}&grade=${p.grade}&semester=${encodeURIComponent(p.semester)}`
			})
		}
	}
}
</script>
<style scoped>
.page { min-height: 100vh; padding: 24rpx; background: #f4f1ea; }
.card { background: #fff; border-radius: 14rpx; padding: 24rpx; margin-bottom: 16rpx; }
.title { display: block; font-size: 32rpx; font-weight: 700; color: #2c2419; margin-bottom: 10rpx; }
.desc { display: block; font-size: 25rpx; color: #6b6560; }
.grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12rpx; }
.cell { background: #fffef9; border-radius: 12rpx; padding: 16rpx 10rpx; text-align: center; }
.cell-char { display: block; font-size: 38rpx; font-weight: 700; color: #2c2419; }
.cell-py { display: block; margin-top: 4rpx; font-size: 20rpx; color: #8a8279; }
</style>
