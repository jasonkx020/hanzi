<template>
	<view class="page">
		<text class="title">每日一练</text>
		<text class="sub">
			{{ dateLine }}
		</text>
		<text v-if="poolSize === 0" class="empty-hint">
			当前教材与字表下暂无生字。请先在「教材与进度」中切换年级/字表，或通过「课本同步学」选课学习。
		</text>
		<template v-else>
			<text class="desc">
				共 {{ items.length }} 个字：优先复习本教材下的易错字，其余按今日推荐顺序练习。点字进入详情（笔顺、跟读等）。
			</text>
			<view class="stat-row">
				<text class="stat-chip">字表共 {{ poolSize }} 字</text>
				<text v-if="weakCount > 0" class="stat-chip stat-chip-warn">含易错 {{ weakCount }} 个</text>
			</view>
			<view class="list">
				<view
					v-for="(it, idx) in items"
					:key="it.hanzi + '-' + idx"
					class="char-row"
					@click="openChar(it)"
				>
					<text class="char-idx">{{ idx + 1 }}</text>
					<text class="char-hanzi">{{ it.hanzi }}</text>
					<view class="char-mid">
						<text class="char-py">{{ it.pinyin || '—' }}</text>
						<text v-if="it.lesson_hint" class="char-hint">{{ it.lesson_hint }}</text>
					</view>
					<text v-if="it.reason === 'weak'" class="badge">易错</text>
				</view>
			</view>
		</template>
		<view class="foot-actions">
			<button type="default" @click="bumpShuffle">换一批顺序</button>
			<button type="primary" @click="goDictionary">去查字</button>
		</view>
	</view>
</template>

<script>
import { getCurriculumPrefs } from '@/utils/curriculum-storage.js'
import { buildDailyTrainingQueue, countWeakInDailyItems } from '@/services/daily-training-service.js'

export default {
	data() {
		return {
			dateKey: '',
			poolSize: 0,
			items: [],
			weakCount: 0,
			/** 与首页一致为 0；用户点「换一批顺序」时递增，仅影响非易错字的补齐顺序 */
			shuffleSalt: 0
		}
	},
	computed: {
		dateLine() {
			if (!this.dateKey) return ''
			return `今日 ${this.dateKey} · 与当前教材偏好一致`
		}
	},
	async onShow() {
		await this.reload()
	},
	methods: {
		async reload() {
			const p = getCurriculumPrefs()
			const plan = await buildDailyTrainingQueue(p, {
				limit: 10,
				shuffleSalt: this.shuffleSalt
			})
			this.dateKey = plan.dateKey
			this.poolSize = plan.poolSize
			this.items = plan.items
			this.weakCount = countWeakInDailyItems(plan.items)
		},
		bumpShuffle() {
			this.shuffleSalt += 1
			this.reload()
		},
		openChar(it) {
			const hanzi = encodeURIComponent(it.hanzi)
			const py = it.pinyin ? encodeURIComponent(it.pinyin) : ''
			const lesson = it.lesson_hint ? encodeURIComponent(it.lesson_hint) : ''
			uni.navigateTo({
				url: `/pages/char/detail?hanzi=${hanzi}&pinyin=${py}&lesson=${lesson}`
			})
		},
		goDictionary() {
			uni.switchTab({ url: '/pages/dictionary/index' })
		}
	}
}
</script>

<style scoped>
.page {
	min-height: 100vh;
	padding: 32rpx;
	background: #f4f1ea;
	box-sizing: border-box;
	padding-bottom: 48rpx;
}
.title {
	display: block;
	font-size: 36rpx;
	font-weight: 700;
	color: #2c2419;
	margin-bottom: 10rpx;
}
.sub {
	display: block;
	font-size: 22rpx;
	color: #8a8278;
	margin-bottom: 16rpx;
}
.desc {
	display: block;
	font-size: 26rpx;
	color: #5a534c;
	line-height: 1.55;
	margin-bottom: 16rpx;
}
.empty-hint {
	display: block;
	font-size: 26rpx;
	color: #8b4513;
	line-height: 1.6;
	background: #fff4de;
	padding: 20rpx;
	border-radius: 14rpx;
	margin-bottom: 24rpx;
}
.stat-row {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
	margin-bottom: 20rpx;
}
.stat-chip {
	font-size: 22rpx;
	color: #5a6b4a;
	background: #e8f0e4;
	padding: 8rpx 14rpx;
	border-radius: 999rpx;
}
.stat-chip-warn {
	background: #ffe4d6;
	color: #a14c2a;
}
.list {
	background: #fff;
	border-radius: 16rpx;
	overflow: hidden;
	margin-bottom: 28rpx;
	box-shadow: 0 6rpx 20rpx rgba(44, 36, 25, 0.06);
}
.char-row {
	display: flex;
	align-items: center;
	padding: 22rpx 20rpx;
	border-bottom: 1rpx solid #f0ebe3;
}
.char-row:last-child {
	border-bottom: none;
}
.char-idx {
	width: 44rpx;
	font-size: 22rpx;
	color: #a8a098;
}
.char-hanzi {
	font-size: 44rpx;
	font-weight: 600;
	color: #2c2419;
	width: 88rpx;
}
.char-mid {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
}
.char-py {
	font-size: 26rpx;
	color: #3d6b4a;
	font-weight: 500;
}
.char-hint {
	font-size: 20rpx;
	color: #9a9288;
	margin-top: 4rpx;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.badge {
	font-size: 20rpx;
	color: #c45c26;
	background: #fff0e6;
	padding: 4rpx 12rpx;
	border-radius: 8rpx;
	margin-left: 8rpx;
}
.foot-actions {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}
</style>
