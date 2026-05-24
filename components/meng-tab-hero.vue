<template>
	<view class="tab-hero">
		<image class="tab-hero-bg" :src="bgSrc" mode="aspectFill" />
		<view class="tab-hero-overlay" />
		<meng-status-bar-spacer :height-px="statusBarPx" />
		<view class="tab-hero-body">
			<view v-if="useBannerCarousel" class="tab-hero-banner-col">
				<view class="tab-hero-banner-viewport">
					<view
						class="tab-hero-banner-pane"
						:class="{ 'tab-hero-banner-pane--exit': bannerAnimating }"
					>
						<meng-avatar
							:pose="displaySlide.pose"
							:size="avatarSize"
							@error="$emit('avatar-error')"
						/>
						<view class="tab-hero-text">
							<text class="tab-hero-title">{{ title }}</text>
							<text class="tab-hero-sub">{{ displaySlide.text }}</text>
						</view>
					</view>
					<view
						v-if="bannerAnimating && incomingSlide"
						class="tab-hero-banner-pane tab-hero-banner-pane--enter"
					>
						<meng-avatar :pose="incomingSlide.pose" :size="avatarSize" />
						<view class="tab-hero-text">
							<text class="tab-hero-title">{{ title }}</text>
							<text class="tab-hero-sub">{{ incomingSlide.text }}</text>
						</view>
					</view>
				</view>
			</view>
			<template v-else>
				<meng-avatar
					:pose="avatarPose"
					:size="avatarSize"
					@error="$emit('avatar-error')"
				/>
				<view class="tab-hero-text">
					<text class="tab-hero-title">{{ title }}</text>
					<text v-if="subtitle" class="tab-hero-sub">{{ subtitle }}</text>
				</view>
			</template>
			<view v-if="$slots.actions" class="tab-hero-actions">
				<slot name="actions" />
			</view>
		</view>
		<view v-if="$slots.foot" class="tab-hero-foot">
			<slot name="foot" />
		</view>
	</view>
</template>

<script>
import MengAvatar from '@/components/meng-avatar.vue'
import MengStatusBarSpacer from '@/components/meng-status-bar-spacer.vue'
import { MENG_ASSETS } from '@/utils/mengmeng-assets.js'

const BANNER_ANIM_MS = 420

export default {
	name: 'MengTabHero',
	components: { MengAvatar, MengStatusBarSpacer },
	props: {
		title: { type: String, default: '' },
		subtitle: { type: String, default: '' },
		/** 首页等：多帧 banner，配合 bannerIndex 做横向推入动画 */
		bannerSlides: {
			type: Array,
			default: () => []
		},
		bannerIndex: { type: Number, default: 0 },
		avatarPose: { type: String, default: 'happy' },
		avatarSize: { type: String, default: 'lg' },
		heroBg: { type: String, default: () => MENG_ASSETS.heroBg },
		statusBarPx: { type: Number, default: 0 },
		bleedStyle: { type: Object, default: () => ({}) }
	},
	emits: ['avatar-error'],
	data() {
		return {
			bannerDisplayIndex: 0,
			bannerAnimating: false,
			bannerIncomingIndex: 0,
			_bannerAnimTimer: null
		}
	},
	computed: {
		bgSrc() {
			return this.heroBg || MENG_ASSETS.heroBg
		},
		normalizedBannerSlides() {
			const raw = Array.isArray(this.bannerSlides) ? this.bannerSlides : []
			return raw
				.map((item) => {
					if (item == null) return null
					if (typeof item === 'string') {
						const t = String(item).trim()
						return t ? { text: t, pose: this.avatarPose } : null
					}
					const text = String(item.text != null ? item.text : '').trim()
					if (!text) return null
					return {
						text,
						pose: String(item.pose || this.avatarPose || 'happy')
					}
				})
				.filter(Boolean)
		},
		useBannerCarousel() {
			return this.normalizedBannerSlides.length > 1
		},
		displaySlide() {
			const list = this.normalizedBannerSlides
			if (!list.length) {
				return { text: this.subtitle || '', pose: this.avatarPose }
			}
			const i = Math.max(0, Math.min(list.length - 1, this.bannerDisplayIndex))
			return list[i]
		},
		incomingSlide() {
			const list = this.normalizedBannerSlides
			if (!list.length || !this.bannerAnimating) return null
			const i = Math.max(0, Math.min(list.length - 1, this.bannerIncomingIndex))
			return list[i]
		}
	},
	watch: {
		bannerIndex: {
			immediate: true,
			handler(next) {
				this.syncBannerIndex(next)
			}
		},
		normalizedBannerSlides(list, prev) {
			if (list.length !== (prev && prev.length)) {
				this.bannerDisplayIndex = 0
				this.clearBannerAnim()
			}
		}
	},
	beforeUnmount() {
		this.clearBannerAnim()
	},
	methods: {
		clearBannerAnim() {
			if (this._bannerAnimTimer != null) {
				clearTimeout(this._bannerAnimTimer)
				this._bannerAnimTimer = null
			}
			this.bannerAnimating = false
		},
		syncBannerIndex(next) {
			const list = this.normalizedBannerSlides
			if (!list.length) return
			const target = ((Number(next) % list.length) + list.length) % list.length
			if (!this.useBannerCarousel) {
				this.bannerDisplayIndex = target
				return
			}
			if (target === this.bannerDisplayIndex && !this.bannerAnimating) return
			if (this.bannerAnimating && target === this.bannerIncomingIndex) return

			this.clearBannerAnim()
			this.bannerIncomingIndex = target
			this.bannerAnimating = true
			this._bannerAnimTimer = setTimeout(() => {
				this._bannerAnimTimer = null
				this.bannerDisplayIndex = target
				this.bannerAnimating = false
			}, BANNER_ANIM_MS)
		}
	}
}
</script>

<style scoped>
.tab-hero-banner-col {
	flex: 1;
	min-width: 0;
}

.tab-hero-banner-viewport {
	position: relative;
	overflow: hidden;
	width: 100%;
}

.tab-hero-banner-pane {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 20rpx;
	width: 100%;
	box-sizing: border-box;
	will-change: transform;
}

.tab-hero-banner-pane--exit {
	animation: tab-hero-banner-exit 0.42s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.tab-hero-banner-pane--enter {
	position: absolute;
	left: 0;
	top: 0;
	right: 0;
	animation: tab-hero-banner-enter 0.42s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes tab-hero-banner-enter {
	from {
		transform: translateX(100%);
	}
	to {
		transform: translateX(0);
	}
}

@keyframes tab-hero-banner-exit {
	from {
		transform: translateX(0);
	}
	to {
		transform: translateX(-100%);
	}
}
</style>
