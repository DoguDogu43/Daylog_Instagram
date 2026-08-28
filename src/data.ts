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
  { id: 'morning', label: '오전 9시~12시' },
  { id: 'afternoon', label: '오후 12시~6시' },
  { id: 'evening', label: '저녁 6시~9시' },
  { id: 'flexible', label: '상관없음' },
]

export const labels = {
  changeArea: Object.fromEntries(changeAreaOptions.map((option) => [option.id, option.title])),
} as {
  changeArea: Record<ChangeArea, string>
}
