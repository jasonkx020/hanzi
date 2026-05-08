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
