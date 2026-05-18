<template>
	<view v-if="visible" class="meng-ad-banner-wrap">
		<!-- #ifdef MP-WEIXIN -->
		<ad
			v-if="unitId && !adFailed"
			class="meng-ad-banner-ad"
			:unit-id="unitId"
			ad-type="banner"
			@load="onLoad"
			@error="onError"
		/>
		<!-- #endif -->
		<view v-if="showMock" class="meng-ad-banner-mock" @click="onMockTap">
			<text class="meng-ad-tag">推荐</text>
			<view class="meng-ad-mock-body">
				<text class="meng-ad-mock-title">{{ mockTitle }}</text>
				<text class="meng-ad-mock-sub">面向家长 · 品牌安全教育内容</text>
			</view>
		</view>
	</view>
</template>

<script>
import { shouldShowAds, getBannerAdUnitId, canUseMockBanner } from '@/utils/ad-service.js'
import { trackVipEvent } from '@/utils/vip-analytics.js'

export default {
	name: 'MengAdBanner',
	props: {
		placement: {
			type: String,
			default: 'home_banner'
		},
		mockTitle: {
			type: String,
			default: '和萌萌一起坚持识字'
		}
	},
	data() {
		return {
			unitId: '',
			adFailed: false
		}
	},
	computed: {
		visible() {
			if (!shouldShowAds()) return false
			if (this.unitId && !this.adFailed) return true
			return this.showMock
		},
		showMock() {
			return canUseMockBanner() && (!this.unitId || this.adFailed)
		}
	},
	mounted() {
		this.unitId = getBannerAdUnitId()
		if (this.visible) {
			trackVipEvent('ad_banner_show', { placement: this.placement, mock: !this.unitId })
		}
	},
	methods: {
		onLoad() {
			this.adFailed = false
		},
		onError() {
			this.adFailed = true
		},
		onMockTap() {
			trackVipEvent('ad_banner_tap', { placement: this.placement, mock: true })
		}
	}
}
</script>

<style scoped>
.meng-ad-banner-wrap {
	margin-top: 20rpx;
	border-radius: 16rpx;
	overflow: hidden;
}

.meng-ad-banner-ad {
	width: 100%;
}

.meng-ad-banner-mock {
	display: flex;
	flex-direction: row;
	align-items: center;
	padding: 20rpx 22rpx;
	background: linear-gradient(135deg, #f8f4ea 0%, #efe8d8 100%);
	border: 1rpx solid #e5dfd4;
	border-radius: 16rpx;
}

.meng-ad-tag {
	font-size: 20rpx;
	color: #6b4f2a;
	background: rgba(201, 162, 39, 0.28);
	padding: 4rpx 12rpx;
	border-radius: 8rpx;
	margin-right: 16rpx;
	flex-shrink: 0;
}

.meng-ad-mock-body {
	flex: 1;
	min-width: 0;
}

.meng-ad-mock-title {
	display: block;
	font-size: 26rpx;
	font-weight: 600;
	color: #4a453f;
}

.meng-ad-mock-sub {
	display: block;
	font-size: 22rpx;
	color: #8a8279;
	margin-top: 4rpx;
}
</style>
