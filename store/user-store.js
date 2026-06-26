/**
 * @file user-store.js
 * @module store
 * @description 状态存储源文件：user-store.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
const userState = {
	nickname: '小朋友',
	streakDays: 0
}

export function getUserState() {
	return userState
}

export function setUserProfile(patch = {}) {
	Object.assign(userState, patch)
	return userState
}
