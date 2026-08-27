export type DailyRhythm =
  | 'morning_active'
  | 'daytime_focus'
  | 'evening_important'
  | 'irregular_daily'

export type PastPattern =
  | 'solo_focus'
  | 'together_commitment'
  | 'fixed_time_place'
  | 'meaning_or_fun'
  | 'unknown'

export type ChangeArea =
  | 'sleep'
  | 'meal'
  | 'exercise'
  | 'smartphone'
  | 'study'
  | 'work'
  | 'hobby'
  | 'relationship'
  | 'rest'

export type TogetherStyle =
  | 'visible_plan'
  | 'social_commitment'
  | 'tiny_start'
  | 'frequent_adjustment'
  | 'offline_discovery'

export type ContactMethod = 'phone' | 'email' | 'messenger'

export type PreferredDay =
  | 'mon'
  | 'tue'
  | 'wed'
  | 'thu'
  | 'fri'
  | 'sat'
  | 'sun'
  | 'flexible'

export type PreferredPeriod = 'morning' | 'afternoon' | 'evening' | 'flexible'

export type ApplicationAnswers = {
  dailyRhythm?: DailyRhythm
  comfortableTime?: string
  difficultTime?: string
  pastPattern?: PastPattern
  changeAreas: ChangeArea[]
  primaryChangeArea?: ChangeArea
  togetherStyle?: TogetherStyle
}

export type ContactDetails = {
  displayName: string
  contactMethod: ContactMethod
  contactValue: string
  preferredDays: PreferredDay[]
  preferredPeriods: PreferredPeriod[]
  additionalNote: string
  privacyConsent: boolean
  website: string
}

export type View =
  | { kind: 'intro' }
  | { kind: 'question'; index: number }
  | { kind: 'contact' }
  | { kind: 'success'; requestId: string }

export type ChoiceOption<T extends string> = {
  id: T
  marker: string
  title: string
  description: string
}

export type ApiResult = {
  ok: boolean
  requestId?: string
  duplicate?: boolean
  error?: string
}
