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
    description: '일찍 시작할수록 리듬이 살아나요.',
  },
  {
    id: 'daytime_focus',
    marker: '12',
    title: '낮에 집중되는 하루',
    description: '해가 떠 있는 시간에 가장 나다워요.',
  },
  {
    id: 'evening_important',
    marker: '19',
    title: '저녁이 중요한 하루',
    description: '하루 일이 끝난 뒤에 내 시간이 시작돼요.',
  },
  {
    id: 'irregular_daily',
    marker: '≈',
    title: '매일 조금씩 다른 하루',
    description: '정해진 패턴보다 날마다 리듬이 달라요.',
  },
]

export const pastPatternOptions: ChoiceOption<PastPattern>[] = [
  {
    id: 'solo_focus',
    marker: '01',
    title: '혼자 집중할 때 잘 이어갔어요.',
    description: '내 속도로 몰입할 환경이 힘이 돼요.',
  },
  {
    id: 'together_commitment',
    marker: '02',
    title: '누군가와 함께할 때 오래갔어요.',
    description: '함께 정한 약속이 시작점을 만들어줘요.',
  },
  {
    id: 'fixed_time_place',
    marker: '03',
    title: '시간과 장소가 정해져 있을 때 편했어요.',
    description: '고민하지 않고 움직일 수 있는 틀이 도와줘요.',
  },
  {
    id: 'meaning_or_fun',
    marker: '04',
    title: '즐거움이나 의미가 있을 때 움직였어요.',
    description: '해야 해서보다 하고 싶은 이유가 중요해요.',
  },
  {
    id: 'unknown',
    marker: '···',
    title: '아직 잘 모르겠어요.',
    description: '괜찮아요. 첫 만남에서 함께 찾아봐요.',
  },
]

export const changeAreaOptions: ChoiceOption<ChangeArea>[] = [
  { id: 'sleep', marker: 'Z', title: '수면', description: '자고 깨는 리듬' },
  { id: 'meal', marker: 'M', title: '식사', description: '먹는 시간과 방식' },
  { id: 'exercise', marker: 'E', title: '운동', description: '몸을 움직이는 시간' },
  { id: 'smartphone', marker: 'P', title: '스마트폰', description: '화면과 멀어지는 방법' },
  { id: 'study', marker: 'S', title: '공부', description: '배우고 모으는 시간' },
  { id: 'work', marker: 'W', title: '업무', description: '집중과 멈춤의 균형' },
  { id: 'hobby', marker: 'H', title: '취미', description: '즐거움을 되찾는 시간' },
  { id: 'relationship', marker: 'R', title: '관계', description: '사람과 함께하는 리듬' },
  { id: 'rest', marker: 'O', title: '휴식', description: '아무것도 하지 않는 여백' },
]

export const togetherStyleOptions: ChoiceOption<TogetherStyle>[] = [
  {
    id: 'visible_plan',
    marker: '▦',
    title: '계획이 보이면 좋아요.',
    description: '다음 행동을 눈으로 확인하고 싶어요.',
  },
  {
    id: 'social_commitment',
    marker: '↔',
    title: '누군가와 약속하면 움직여요.',
    description: '함께 정한 시간이 시작의 힘이 돼요.',
  },
  {
    id: 'tiny_start',
    marker: '+',
    title: '아주 작게 시작하고 싶어요.',
    description: '부담 없이 당장 해볼 수 있는 행동이 필요해요.',
  },
  {
    id: 'frequent_adjustment',
    marker: '↻',
    title: '자주 이야기하며 조정하고 싶어요.',
    description: '해본 결과를 보며 빠르게 방법을 바꾸고 싶어요.',
  },
  {
    id: 'offline_discovery',
    marker: '●',
    title: '직접 만나 함께 찾아보고 싶어요.',
    description: '표로 답을 받기보다 대화 속에서 방법을 찾고 싶어요.',
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
