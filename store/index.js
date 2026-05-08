import { setAppReady } from '@/store/app-store.js'
import { refreshLearningState } from '@/store/learning-store.js'
import { getCurriculumState } from '@/store/curriculum-store.js'

export function initAppStores() {
	getCurriculumState()
	refreshLearningState()
	setAppReady(true)
}
