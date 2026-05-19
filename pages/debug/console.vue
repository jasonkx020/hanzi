<template>
	<view class="page">
		<text class="diag">{{ diagText }}</text>
		<view class="toolbar">
			<button class="tb-btn" size="mini" type="default" @click="refresh">刷新</button>
			<button class="tb-btn" size="mini" type="warn" @click="onClear">清空缓冲</button>
			<button class="tb-btn" size="mini" type="primary" @click="copyAll">复制全部</button>
			<button class="tb-btn" size="mini" type="default" @click="selfTest">自检写入</button>
			<button class="tb-btn" size="mini" type="primary" @click="goRecordTest">录音测试</button>
		</view>
		<text class="hint"
			>共 {{ lines.length }} 条 · 最多 {{ maxHint }} 条 · console 无法改写时仍可用「自检写入」验证列表是否可见</text
		>
		<scroll-view
			class="log-scroll"
			:style="scrollStyle"
			scroll-y
			:scroll-top="scrollTop"
			scroll-with-animation
		>
			<view v-for="(row, idx) in lines" :key="`l-${idx}-${row.ts}-${idx}`" class="log-row" :class="'lvl-' + row.level">
				<text class="log-ts">{{ row.ts }}</text>
				<text class="log-level">{{ row.level }}</text>
				<text class="log-text" selectable>{{ row.text }}</text>
			</view>
			<view v-if="!lines.length" class="empty">
				<text class="empty-t">暂无日志</text>
				<text class="empty-d">点「自检写入」或返回其它页触发 console / spellDisplayString</text>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import {
	getDebugConsoleLogs,
	clearDebugConsoleLogs,
	installDebugConsoleHook,
	appendDebugLog,
	getDebugHookDiagnostics
} from '@/utils/debug-console-hook.js'

export default {
	data() {
		return {
			lines: [],
			scrollTop: 0,
			maxHint: 1000,
			scrollPx: 420,
			diagText: ''
		}
	},
	computed: {
		scrollStyle() {
			return { height: `${this.scrollPx}px`, width: '100%' }
		}
	},
	onLoad() {
		installDebugConsoleHook()
		try {
			const sys = uni.getSystemInfoSync()
			const h = Number(sys.windowHeight || sys.screenHeight || 600)
			this.scrollPx = Math.max(280, Math.floor(h * 0.62))
		} catch (_) {
			this.scrollPx = 420
		}
	},
	onShow() {
		this.refreshDiag()
		this.refresh()
		console.log('[debug-console] 页面 onShow')
		this.$nextTick(() => {
			this.scrollTop = 999999
		})
	},
	methods: {
		refreshDiag() {
			const d = getDebugHookDiagnostics()
			this.diagText = `hook: ${d.installed ? '已装' : '否'} · 已替换方法: ${d.patchedLevels.length ? d.patchedLevels.join(',') : '无'} · 缓冲 ${d.bufferSize} 条`
		},
		refresh() {
			this.lines = getDebugConsoleLogs()
			this.refreshDiag()
			this.scrollTop = this.scrollTop === 0 ? 1 : 0
			this.$nextTick(() => {
				this.scrollTop = 999999
			})
		},
		onClear() {
			clearDebugConsoleLogs()
			this.lines = []
			this.refreshDiag()
			uni.showToast({ title: '已清空', icon: 'none' })
		},
		selfTest() {
			appendDebugLog('log', '[自检]', '若能看到本条，说明日志列表区域可见；与时间戳同时出现的还有启动时的 hook 说明。')
			this.refresh()
			uni.showToast({ title: '已写入一条', icon: 'none' })
		},
		goRecordTest() {
			uni.navigateTo({ url: '/pages/debug/record-test' })
		},
		copyAll() {
			const body = this.lines.map((r) => `[${r.ts}] [${r.level}] ${r.text}`).join('\n')
			if (!body) {
				uni.showToast({ title: '没有可复制内容', icon: 'none' })
				return
			}
			uni.setClipboardData({
				data: body,
				success: () => uni.showToast({ title: '已复制', icon: 'success' })
			})
		}
	}
}
</script>

<style scoped>
.page {
	min-height: 100vh;
	background: #1e1e1e;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	padding: 16rpx;
	padding-bottom: env(safe-area-inset-bottom);
}

.diag {
	display: block;
	font-size: 22rpx;
	color: #ce9178;
	line-height: 1.45;
	margin-bottom: 12rpx;
	word-break: break-all;
}

.toolbar {
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	margin-bottom: 12rpx;
}

.tb-btn {
	margin-right: 12rpx;
	margin-bottom: 8rpx;
}

.hint {
	display: block;
	font-size: 22rpx;
	color: #9e9e9e;
	line-height: 1.4;
	margin-bottom: 12rpx;
}

.log-scroll {
	box-sizing: border-box;
	border: 1rpx solid #333;
	border-radius: 8rpx;
	background: #252526;
}

.log-row {
	padding: 10rpx 12rpx;
	border-bottom: 1rpx solid #333;
	font-size: 22rpx;
	line-height: 1.45;
	word-break: break-all;
}

.log-ts {
	color: #858585;
	margin-right: 8rpx;
	font-family: monospace;
}

.log-level {
	display: inline-block;
	min-width: 72rpx;
	margin-right: 8rpx;
	font-weight: 600;
	color: #b5cea8;
}

.lvl-warn .log-level {
	color: #dcdcaa;
}

.lvl-error .log-level {
	color: #f48771;
}

.log-text {
	color: #d4d4d4;
	white-space: pre-wrap;
}

.empty {
	padding: 80rpx 24rpx;
	text-align: center;
}

.empty-t {
	display: block;
	font-size: 28rpx;
	color: #888;
	margin-bottom: 12rpx;
}

.empty-d {
	display: block;
	font-size: 24rpx;
	color: #666;
	line-height: 1.5;
}
</style>
