<template>
	<view class="tab-wrap">
		<view class="tab-inner">
			<view
				v-for="(item, index) in list"
				:key="index"
				class="tab-item"
				:class="{ 'tab-item-active': selected === index }"
				@click="switchTab(index)"
			>
				<image class="tab-icon" :src="item.iconPath" mode="aspectFit" />
				<text class="tab-text">{{ item.text }}</text>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			selected: 0,
			list: [
				{ pagePath: '/pages/home/home', iconPath: 'static/tab/home.png', text: '识字' },
				{ pagePath: '/pages/pinyin/index', iconPath: 'static/tab/learn.png', text: '拼音' },
				{ pagePath: '/pages/dictionary/index', iconPath: 'static/tab/catalog.png', text: '查字' },
				{ pagePath: '/pages/me/me', iconPath: 'static/tab/me.png', text: '我的' }
			]
		}
	},
	mounted() {
		this.syncSelectedFromRoute()
	},
	methods: {
		syncSelected(index) {
			if (index >= 0 && index < this.list.length) this.selected = index
		},
		syncSelectedFromRoute() {
			try {
				const pages = getCurrentPages()
				const cur = pages[pages.length - 1]
				const route = cur && cur.route ? String(cur.route) : ''
				const idx = this.list.findIndex((it) => {
					const p = it.pagePath.replace(/^\//, '')
					return p === route
				})
				if (idx >= 0) this.selected = idx
			} catch (_) {}
		},
		switchTab(index) {
			if (index === this.selected) return
			const url = this.list[index].pagePath
			uni.switchTab({
				url,
				fail: (err) => console.warn('[custom-tab-bar] switchTab', err)
			})
		}
	}
}
</script>

<style>
.tab-wrap {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 999;
	padding-bottom: env(safe-area-inset-bottom);
	background: #fffdf8;
	box-shadow: 0 -6rpx 28rpx rgba(44, 36, 25, 0.08);
	border-top: 1rpx solid rgba(232, 224, 214, 0.95);
	box-sizing: border-box;
}

.tab-inner {
	display: flex;
	flex-direction: row;
	align-items: stretch;
	padding: 10rpx 12rpx 14rpx;
	box-sizing: border-box;
}

.tab-item {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 10rpx 6rpx;
	margin: 0 6rpx;
	border-radius: 18rpx;
	background: transparent;
	transition: background 0.15s ease;
}

/* 未选中：弱化图标与文案 */
.tab-item:not(.tab-item-active) .tab-icon {
	opacity: 0.42;
}

.tab-item-active {
	background: linear-gradient(180deg, #e8f4ec 0%, #dcefe3 100%);
	box-shadow: inset 0 0 0 2rpx rgba(61, 107, 74, 0.35);
}

.tab-icon {
	width: 46rpx;
	height: 46rpx;
	transition: opacity 0.15s ease;
}

.tab-item-active .tab-icon {
	opacity: 1;
}

.tab-text {
	margin-top: 4rpx;
	font-size: 22rpx;
	color: #9c958c;
	line-height: 1.2;
	transition: color 0.15s ease;
}

.tab-item-active .tab-text {
	color: #3d6b4a;
	font-weight: 700;
}
</style>
