/**
 * @file curriculum-store.js
 * @module store
 * @description 状态存储源文件：curriculum-store.js
 * @software 萌萌识字移动应用软件 V1.0
 * @copyright Copyright (c) 2026 陶流昌. All Rights Reserved.
 */
import { getCurrentCurriculum, updateCurrentCurriculum } from '@/repositories/curriculum-repository.js'

const curriculumState = {
	current: getCurrentCurriculum()
}

export function getCurriculumState() {
	return curriculumState
}

export function setCurriculumState(patch) {
	curriculumState.current = updateCurrentCurriculum(patch)
	return curriculumState.current
}
