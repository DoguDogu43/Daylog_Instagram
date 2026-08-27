import type {
  ChangeArea,
  ChoiceOption,
  DailyRhythm,
  PastPattern,
  PreferredDay,
  PreferredPeriod,
  TogetherStyle,
} from './types'

export const dailyRhythmOptions: ChoiceOption<DailyRhythm>[] = [
  {
    id: 'morning_active',
    marker: '06',
    title: '아침부터 움직이는 하루',
    description: '일찍 시작할 때 나의 하루 리듬과 생기가 가장 살아나요.',
  },
  {
    id: 'daytime_focus',
    marker: '12',
    title: '낮에 집중되는 하루',
    description: '해가 떠 있는 시간에 나의 몰입과 에너지가 가장 선명해요.',
  },
  {
    id: 'evening_important',
    marker: '19',
    title: '저녁이 중요한 하루',
    description: '하루 일과가 정리된 뒤에 나만의 온전한 시간이 시작돼요.',
  },
  {
    id: 'irregular_daily',
    marker: '≈',
    title: '매일 조금씩 다른 하루',
    description: '정해진 틀보다 날마다 유연하게 흐르는 리듬을 타요.',
  },
]

export const pastPatternOptions: ChoiceOption<PastPattern>[] = [
  {
    id: 'solo_focus',
    marker: '01',
    title: '혼자만의 속도로 몰입할 때 잘 이어갔어요.',
    description: '방해받지 않고 내 속도를 지킬 수 있는 환경이 힘이 됐어요.',
  },
  {
    id: 'together_commitment',
    marker: '02',
    title: '누군가와 약속을 나누었을 때 오래갔어요.',
    description: '함께 나눈 약속과 따뜻한 지지가 시작의 힘이 됐어요.',
  },
  {
    id: 'fixed_time_place',
    marker: '03',
    title: '시간과 장소의 틀이 정해졌을 때 편했어요.',
    description: '고민 없이 바로 움직일 수 있는 규칙적인 환경이 도왔어요.',
  },
  {
    id: 'meaning_or_fun',
    marker: '04',
    title: '나만의 의미나 재미를 찾았을 때 움직였어요.',
    description: '해야 하는 의무보다 스스로 즐거울 때 자연스럽게 지속했어요.',
  },
  {
    id: 'unknown',
    marker: '···',
    title: '아직 나만의 지속 방식을 찾는 중이에요.',
    description: '괜찮아요. 1:1 라이프 세션에서 나의 패턴을 함께 발견해요.',
  },
]

export const changeAreaOptions: ChoiceOption<ChangeArea>[] = [
  { id: 'sleep', marker: 'Z', title: '수면', description: '자고 깨는 하루의 시작과 끝' },
  { id: 'meal', marker: 'M', title: '식사', description: '나를 돌보는 식사 리듬' },
  { id: 'exercise', marker: 'E', title: '운동', description: '몸을 가볍게 움직이는 시간' },
  { id: 'smartphone', marker: 'P', title: '스마트폰', description: '화면을 내려놓는 밤의 여백' },
  { id: 'study', marker: 'S', title: '배움·성장', description: '나를 위해 채우는 집중의 시간' },
  { id: 'work', marker: 'W', title: '일·업무', description: '몰입과 멈춤의 건강한 균형' },
  { id: 'hobby', marker: 'H', title: '취미·창작', description: '순수한 즐거움을 되찾는 시간' },
  { id: 'relationship', marker: 'R', title: '관계·대화', description: '사람과 편안하게 이어지는 리듬' },
  { id: 'rest', marker: 'O', title: '온전한 쉼', description: '아무것도 하지 않는 나만의 여백' },
]

export const togetherStyleOptions: ChoiceOption<TogetherStyle>[] = [
  {
    id: 'visible_plan',
    marker: '▦',
    title: '계획이 눈에 보이면 든든해요.',
    description: '다이어리에 적힌 다음 행동을 눈으로 확인하고 싶어요.',
  },
  {
    id: 'social_commitment',
    marker: '↔',
    title: '코치와 약속을 나눌 때 움직여요.',
    description: '함께 정한 약속과 정기적인 대화가 시작의 힘이 돼요.',
  },
  {
    id: 'tiny_start',
    marker: '+',
    title: '아주 작게 시작하고 싶어요.',
    description: '부담 없이 오늘 1분 만에 해볼 수 있는 작은 행동이 필요해요.',
  },
  {
    id: 'frequent_adjustment',
    marker: '↻',
    title: '이야기를 나누며 유연하게 조정해요.',
    description: '직접 해본 뒤 나에게 맞게 속도와 방식을 가다듬고 싶어요.',
  },
  {
    id: 'offline_discovery',
    marker: '●',
    title: '대면 대화 속에서 해답을 찾고 싶어요.',
    description: '정형화된 표 대신 코치와의 깊은 대화 속에서 나다운 길을 찾아요.',
  },
]

export const preferredDayOptions: Array<{ id: PreferredDay; label: string }> = [
  { id: 'mon', label: '월' },
  { id: 'tue', label: '화' },
  { id: 'wed', label: '수' },
  { id: 'thu', label: '목' },
  { id: 'fri', label: '금' },
  { id: 'sat', label: '토' },
  { id: 'sun', label: '일' },
  { id: 'flexible', label: '상관없음' },
]

export const preferredPeriodOptions: Array<{ id: PreferredPeriod; label: string }> = [
  { id: 'morning', label: '오전' },
  { id: 'afternoon', label: '오후' },
  { id: 'evening', label: '저녁' },
  { id: 'flexible', label: '상관없음' },
]

export const sessionFactBadges = [
  { icon: '📍', label: '장소', value: '서울 1:1 오프라인' },
  { icon: '⏱️', label: '시간', value: '60분 밀착 세션' },
  { icon: '🗓️', label: '일정', value: '신청 확인 후 개별 조율' },
]

export type HourItem = {
  hour: number
  timeString: string
  label: string
  periodLabel: string
  category: 'morning' | 'afternoon' | 'evening' | 'night'
}

export const hourlyList: HourItem[] = Array.from({ length: 24 }, (_, hour) => {
  let category: HourItem['category'] = 'night'
  let periodLabel = '심야·새벽'
  let periodPrefix = '오전'
  let display12: number

  if (hour >= 6 && hour < 12) {
    category = 'morning'
    periodLabel = '아침·오전'
    periodPrefix = '오전'
    display12 = hour
  } else if (hour >= 12 && hour < 18) {
    category = 'afternoon'
    periodLabel = '낮·오후'
    periodPrefix = '오후'
    display12 = hour === 12 ? 12 : hour - 12
  } else if (hour >= 18 && hour < 24) {
    category = 'evening'
    periodLabel = '저녁·밤'
    periodPrefix = '오후'
    display12 = hour - 12
  } else {
    display12 = hour === 0 ? 12 : hour
  }

  return {
    hour,
    timeString: `${String(hour).padStart(2, '0')}:00`,
    label: `${periodPrefix} ${display12}시`,
    periodLabel,
    category,
  }
})

export const diarySentenceMap = {
  dailyRhythm: {
    morning_active: '아침부터 움직이는 하루 — 일찍 시작할 때 나의 하루 리듬과 생기가 가장 살아납니다.',
    daytime_focus: '낮에 집중되는 하루 — 해가 떠 있는 시간에 나의 몰입과 에너지가 가장 선명하게 집중됩니다.',
    evening_important: '저녁이 중요한 하루 — 하루 일과가 정리된 후 나만의 온전한 시간이 시작됩니다.',
    irregular_daily: '매일 조금씩 다른 하루 — 정해진 틀보다 날마다 유연하게 흐르는 나만의 리듬을 탑니다.',
  },
  pastPattern: {
    solo_focus: '혼자만의 속도로 몰입할 수 있는 안전한 환경에서 습관이 가장 오래 이어졌습니다.',
    together_commitment: '누군가와 나눈 따뜻한 약속과 지지가 있을 때 꾸준히 지속할 수 있었습니다.',
    fixed_time_place: '시간과 장소의 규칙적인 틀이 정해져 있을 때 망설임 없이 행동할 수 있었습니다.',
    meaning_or_fun: '해야 하는 의무보다 순수한 재미와 나만의 의미를 발견했을 때 자발적으로 움직였습니다.',
    unknown: '아직 나만의 지속 조건을 탐색 중이며, 1:1 세션에서 그 실마리를 함께 발견하고자 합니다.',
  },
  togetherStyle: {
    visible_plan: '다음 행동과 전체 여정이 한눈에 보이는 명확한 시각적 계획을 선호합니다.',
    social_commitment: '코치와 함께 나눈 약속과 따뜻한 책임감이 실행의 든든한 시작점이 됩니다.',
    tiny_start: '부담 없이 당장 오늘 1분 만에 시도할 수 있는 아주 작은 시작부터 차근차근 밟아갑니다.',
    frequent_adjustment: '실제 시도해본 결과를 나누며 유연하고 기민하게 방향을 조정해 나갑니다.',
    offline_discovery: '정형화된 표 대신 대면 대화 속에서 내게 꼭 맞는 해답을 함께 탐색합니다.',
  },
} as const

export const labels = {
  dailyRhythm: Object.fromEntries(dailyRhythmOptions.map((option) => [option.id, option.title])),
  pastPattern: Object.fromEntries(pastPatternOptions.map((option) => [option.id, option.title])),
  changeArea: Object.fromEntries(changeAreaOptions.map((option) => [option.id, option.title])),
  togetherStyle: Object.fromEntries(togetherStyleOptions.map((option) => [option.id, option.title])),
} as {
  dailyRhythm: Record<DailyRhythm, string>
  pastPattern: Record<PastPattern, string>
  changeArea: Record<ChangeArea, string>
  togetherStyle: Record<TogetherStyle, string>
}
