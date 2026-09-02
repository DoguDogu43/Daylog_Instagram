import type {
  ChangeArea,
  ChoiceOption,
  DailyRhythm,
  PastPattern,
  PreferredDay,
  PreferredPeriod,
} from './types'

export const dailyRhythmOptions: ChoiceOption<DailyRhythm>[] = [
  {
    id: 'morning_active',
    marker: '06',
    title: '아침에 힘이 나요',
    description: '일찍 시작할수록 활력이 생겨요.',
  },
  {
    id: 'daytime_focus',
    marker: '12',
    title: '낮에 집중이 잘돼요',
    description: '오전부터 오후 사이에 일이 잘돼요.',
  },
  {
    id: 'evening_important',
    marker: '19',
    title: '저녁에 여유가 생겨요',
    description: '할 일을 마친 뒤 내 시간을 보내기 좋아요.',
  },
  {
    id: 'irregular_daily',
    marker: '≈',
    title: '날마다 달라요',
    description: '정해진 시간보다 상황에 따라 움직여요.',
  },
]

export const pastPatternOptions: ChoiceOption<PastPattern>[] = [
  {
    id: 'solo_focus',
    marker: '01',
    title: '혼자 할 때',
    description: '방해받지 않고 내 속도로 할 때 잘 이어갔어요.',
  },
  {
    id: 'together_commitment',
    marker: '02',
    title: '누군가와 약속했을 때',
    description: '함께 하기로 정하면 시작하기 쉬웠어요.',
  },
  {
    id: 'fixed_time_place',
    marker: '03',
    title: '시간과 장소를 정했을 때',
    description: '언제 어디서 할지 정해두면 꾸준히 했어요.',
  },
  {
    id: 'meaning_or_fun',
    marker: '04',
    title: '재미나 의미가 있을 때',
    description: '내가 좋아하거나 필요하다고 느낄 때 계속했어요.',
  },
  {
    id: 'unknown',
    marker: '···',
    title: '아직 잘 모르겠어요',
    description: '만나서 어떤 방법이 맞는지 함께 찾아봐요.',
  },
]

export const changeAreaOptions: ChoiceOption<ChangeArea>[] = [
  { id: 'sleep', marker: 'Z', title: '수면', description: '자는 시간과 일어나는 시간' },
  { id: 'meal', marker: 'M', title: '식사', description: '끼니를 챙기는 시간' },
  { id: 'exercise', marker: 'E', title: '운동', description: '몸을 움직이는 시간' },
  { id: 'smartphone', marker: 'P', title: '스마트폰', description: '휴대폰을 내려놓는 시간' },
  { id: 'study', marker: 'S', title: '배움', description: '새로운 것을 배우는 시간' },
  { id: 'work', marker: 'W', title: '일', description: '집중하고 쉬는 시간' },
  { id: 'hobby', marker: 'H', title: '취미', description: '좋아하는 일을 하는 시간' },
  { id: 'relationship', marker: 'R', title: '관계', description: '사람들과 편하게 이야기하는 시간' },
  { id: 'rest', marker: 'O', title: '휴식', description: '아무것도 하지 않고 쉬는 시간' },
]

export const preferredDayOptions: Array<{ id: PreferredDay; label: string }> = [
  { id: 'mon', label: '월' },
  { id: 'tue', label: '화' },
  { id: 'wed', label: '수' },
  { id: 'thu', label: '목' },
  { id: 'fri', label: '금' },
  { id: 'sat', label: '토' },
  { id: 'sun', label: '일' },
  { id: 'flexible', label: '요일 상관없음' },
]

export const preferredPeriodOptions: Array<{ id: PreferredPeriod; label: string }> = [
  { id: 'morning', label: '오전 9시~12시' },
  { id: 'afternoon', label: '오후 12시~6시' },
  { id: 'evening', label: '저녁 6시~9시' },
  { id: 'flexible', label: '시간 상관없음' },
]

export const labels = {
  changeArea: Object.fromEntries(changeAreaOptions.map((option) => [option.id, option.title])),
} as {
  changeArea: Record<ChangeArea, string>
}
