import type { PipelineStage } from '@/features/crm/pipelines/api/pipelines.api'

export type StageNodeState = 'done' | 'current' | 'upcoming' | 'won' | 'lost'
export interface StageNode {
  id: string
  name: string
  state: StageNodeState
}

const terminalRank = (stage: PipelineStage) => (stage.is_won ? 1 : stage.is_lost ? 2 : 0)

function ordered(stages: PipelineStage[]): PipelineStage[] {
  return [...stages].sort((a, b) => terminalRank(a) - terminalRank(b) || a.position - b.position)
}

export function startableStages(stages: PipelineStage[]): PipelineStage[] {
  return ordered(stages).filter((stage) => !stage.is_won && !stage.is_lost)
}

export function defaultStartStageId(stages: PipelineStage[]): string | null {
  return startableStages(stages)[0]?.id ?? null
}

export function buildStageTrack(
  stages: PipelineStage[],
  currentStageId: string | null,
  dealStatus: 'open' | 'won' | 'lost' = 'open',
): StageNode[] {
  const list = ordered(stages)
  const openStages = list.filter((stage) => !stage.is_won && !stage.is_lost)
  const currentIndex = openStages.findIndex((stage) => stage.id === currentStageId)
  return list.map((stage) => {
    let state: StageNodeState
    if (stage.is_won)
      state = dealStatus === 'won' || stage.id === currentStageId ? 'current' : 'won'
    else if (stage.is_lost)
      state = dealStatus === 'lost' || stage.id === currentStageId ? 'current' : 'lost'
    else if (dealStatus !== 'open') state = 'done'
    else {
      const index = openStages.indexOf(stage)
      state =
        currentIndex < 0
          ? 'upcoming'
          : index < currentIndex
            ? 'done'
            : index === currentIndex
              ? 'current'
              : 'upcoming'
    }
    return { id: stage.id, name: stage.name, state }
  })
}
