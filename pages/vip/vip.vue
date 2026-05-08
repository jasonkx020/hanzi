<template>
	<view class="page">
		<view class="hero" @longpress="debugResetVip">
			<text class="hero-badge">{{ vipActive ? '会员生效中' : '家长专享' }}</text>
			<text class="hero-title">开通会员，系统化陪伴孩子识字</text>
			<text class="hero-sub">付费说明面向监护人展示；学习内容适龄、无诱导打赏。</text>
			<view v-if="vipActive" class="hero-expire">
				<text class="expire-label">当前到期日</text>
				<text class="expire-val">{{ expireText }}</text>
			</view>
		</view>

		<view class="card notice">
			<text class="notice-title">家长须知</text>
			<text class="notice-body">
				本产品会员为虚拟权益，用于解锁字库与练习能力。请通过官方支付渠道完成购买；若涉及未成年人使用，建议由家长本人操作并保管支付密码。
			</text>
		</view>

		<view class="card">
			<text class="section-title">免费版 vs 会员版</text>
			<view class="compare-head">
				<text class="ch-label">对比项</text>
				<text class="ch-free">免费版</text>
				<text class="ch-vip">会员版</text>
			</view>
			<view v-for="(row, idx) in compareRows" :key="idx" class="compare-block">
				<text class="compare-label">{{ row.label }}</text>
				<view class="compare-row">
					<text class="compare-free">{{ row.free }}</text>
					<text class="compare-vip">{{ row.vip }}</text>
				</view>
			</view>
		</view>

		<view class="card">
			<text class="section-title">选择方案</text>
			<view class="plans">
				<view
					v-for="p in plans"
					:key="p.id"
					class="plan"
					:class="{ highlight: p.highlight }"
					@click="buy(p.id)"
				>
					<text v-if="p.tag" class="plan-tag">{{ p.tag }}</text>
					<text class="plan-name">{{ p.name }}</text>
					<text class="plan-price">¥{{ p.priceYuan }}</text>
					<text class="plan-meta">约 {{ p.durationDays }} 天权益</text>
				</view>
			</view>
			<button class="trial-btn" type="default" @click="claimTrial">
				领取一次性体验（演示 · {{ trialDays }} 天）
			</button>
		</view>

		<view class="card faq">
			<text class="section-title">常见问题</text>
			<text class="faq-q">换手机后会员还在吗？</text>
			<text class="faq-a">正式上线需登录同一账号，由云端同步订单；当前演示仅保存在本机。</text>
			<text class="faq-q">可以退款吗？</text>
			<text class="faq-a">按应用商店与支付渠道规则执行；请在付费前阅读《会员服务协议》。</text>
		</view>

		<view class="footer-hint">长按顶部「开通会员」文案区域可清除本地会员与体验记录（仅调试）</view>
	</view>
</template>

<script>
import { VIP_PLANS, VIP_COMPARE } from '@/constants/vip-products.js'
import {
	isVipActive,
	getVipExpireDateText,
	requestPurchase,
	tryClaimInstallTrialIfEligible,
	clearVipForDebug
} from '@/utils/vip.js'

export default {
	data() {
		return {
			plans: VIP_PLANS,
			compareRows: VIP_COMPARE,
			vipActive: false,
			expireText: '',
			trialDays: 7
		}
	},
	onLoad() {
		this.refresh()
	},
	onShow() {
		this.refresh()
	},
	methods: {
		refresh() {
			this.vipActive = isVipActive()
			this.expireText = getVipExpireDateText()
		},
		async buy(planId) {
			try {
				await requestPurchase(planId)
				this.refresh()
				uni.showToast({ title: '已开通（演示）', icon: 'success' })
			} catch {
				/* 用户取消 */
			}
		},
		claimTrial() {
			const r = tryClaimInstallTrialIfEligible(this.trialDays)
			if (r.ok) {
				this.refresh()
				uni.showToast({ title: `已领取${r.days}天体验`, icon: 'success' })
				return
			}
			if (r.reason === 'used') {
				uni.showToast({ title: '每台设备限领一次', icon: 'none' })
				return
			}
			if (r.reason === 'already_vip') {
				uni.showToast({ title: '您已是会员', icon: 'none' })
			}
		},
		debugResetVip() {
			clearVipForDebug()
			this.refresh()
			uni.showToast({ title: '已清除本地会员（调试）', icon: 'none' })
		}
	}
}
</script>

<style scoped>
.page {
	min-height: 100vh;
	padding: 32rpx 28rpx 80rpx;
	background: linear-gradient(180deg, #f4f1ea 0%, #efeae3 40%, #e8e4dc 100%);
	box-sizing: border-box;
}

.hero {
	margin-bottom: 24rpx;
}

.hero-badge {
	display: inline-block;
	font-size: 22rpx;
	color: #6b4f2a;
	background: rgba(212, 175, 55, 0.35);
	padding: 6rpx 16rpx;
	border-radius: 999rpx;
	margin-bottom: 12rpx;
}

.hero-title {
	display: block;
	font-size: 40rpx;
	font-weight: 700;
	color: #2c2419;
	line-height: 1.35;
	margin-bottom: 12rpx;
}

.hero-sub {
	display: block;
	font-size: 24rpx;
	color: #6b6560;
	line-height: 1.5;
}

.hero-expire {
	margin-top: 20rpx;
	padding: 16rpx 20rpx;
	background: rgba(255, 255, 255, 0.65);
	border-radius: 12rpx;
}

.expire-label {
	font-size: 22rpx;
	color: #6b6560;
	margin-right: 12rpx;
}

.expire-val {
	font-size: 28rpx;
	font-weight: 600;
	color: #3d6b4a;
}

.card {
	background: #fffef9;
	border-radius: 20rpx;
	padding: 28rpx;
	margin-bottom: 24rpx;
	box-shadow: 0 8rpx 28rpx rgba(44, 36, 25, 0.06);
}

.notice {
	border-left: 6rpx solid #c9a227;
}

.notice-title {
	display: block;
	font-size: 28rpx;
	font-weight: 600;
	color: #5c4a2e;
	margin-bottom: 10rpx;
}

.notice-body {
	font-size: 24rpx;
	color: #5a534c;
	line-height: 1.55;
}

.section-title {
	display: block;
	font-size: 30rpx;
	font-weight: 700;
	color: #2c2419;
	margin-bottom: 20rpx;
}

.compare-head {
	display: flex;
	justify-content: space-between;
	margin-bottom: 16rpx;
	padding-bottom: 10rpx;
	border-bottom: 1rpx solid #e5dfd4;
}

.ch-label {
	font-size: 22rpx;
	color: #a8a29e;
	width: 22%;
}

.ch-free,
.ch-vip {
	font-size: 22rpx;
	color: #8a8279;
	width: 36%;
	text-align: left;
}

.compare-block {
	margin-bottom: 18rpx;
}

.compare-label {
	display: block;
	font-size: 24rpx;
	font-weight: 600;
	color: #4a453f;
	margin-bottom: 8rpx;
}

.compare-row {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
}

.compare-row > .compare-free {
	margin-right: 12rpx;
}

.compare-free,
.compare-vip {
	flex: 1;
	font-size: 22rpx;
	line-height: 1.45;
	color: #4a453f;
}

.compare-vip {
	color: #2d5a3d;
	font-weight: 500;
}

.plans {
	display: flex;
	flex-direction: column;
}

.plans > .plan + .plan {
	margin-top: 16rpx;
}

.plan {
	position: relative;
	padding: 24rpx 22rpx;
	border-radius: 16rpx;
	border: 2rpx solid #e0d8ca;
	background: #fff;
}

.plan.highlight {
	border-color: #c9a227;
	background: linear-gradient(135deg, #fffdf6 0%, #fff8e8 100%);
}

.plan-tag {
	position: absolute;
	top: 12rpx;
	right: 16rpx;
	font-size: 20rpx;
	color: #8b6914;
	background: rgba(201, 162, 39, 0.25);
	padding: 4rpx 12rpx;
	border-radius: 8rpx;
}

.plan-name {
	font-size: 28rpx;
	font-weight: 600;
	color: #2c2419;
}

.plan-price {
	display: block;
	font-size: 44rpx;
	font-weight: 700;
	color: #b8860b;
	margin-top: 8rpx;
}

.plan-meta {
	font-size: 22rpx;
	color: #8a8279;
	margin-top: 4rpx;
}

.trial-btn {
	margin-top: 24rpx;
	font-size: 26rpx;
	color: #4a5568;
}

.faq-q {
	display: block;
	font-size: 26rpx;
	font-weight: 600;
	color: #3d3833;
	margin-top: 16rpx;
}

.faq-a {
	display: block;
	font-size: 24rpx;
	color: #6b6560;
	line-height: 1.5;
	margin-top: 6rpx;
}

.footer-hint {
	text-align: center;
	font-size: 20rpx;
	color: #a8a29e;
	padding: 24rpx 0;
}
</style>
