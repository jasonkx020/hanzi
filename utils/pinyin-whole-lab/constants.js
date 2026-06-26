/**
 * @file constants.js
 * @module utils
 * @description 基础设施工具：constants.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
export const WHOLE_LEVELS = [
	{ id: 1, key: 'ear', title: '认读耳朵', emoji: '👂', subtitle: '听一听，点对的音节' },
	{ id: 2, key: 'tip', title: '认读小贴士', emoji: '💡', subtitle: '看提示，选出整体音节' },
	{ id: 3, key: 'group', title: '同组小能手', emoji: '🤝', subtitle: '同一组里听音辨认' },
	{ id: 4, key: 'drill', title: '大闯关', emoji: '🎯', subtitle: '拼音大闯关·整体认读专练', isLink: true }
]

export const WHOLE_EAR_QUIZ_TOTAL = 8
export const WHOLE_EAR_QUIZ_PASS = 6
export const WHOLE_TIP_QUIZ_TOTAL = 8
export const WHOLE_TIP_QUIZ_PASS = 6
export const WHOLE_GROUP_QUIZ_TOTAL = 6
export const WHOLE_GROUP_QUIZ_PASS = 5

export const STORAGE_KEY_WHOLE_LAB = 'whole_lab_progress_v1'
