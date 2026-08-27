import { useEffect, useRef, useState, type FormEvent } from 'react'
import { RoutineNotebook } from './RoutineNotebook'
import {
  changeAreaOptions,
  dailyRhythmOptions,
  hourlyList,
  labels,
  pastPatternOptions,
  preferredDayOptions,
  preferredPeriodOptions,
  sessionFactBadges,
  togetherStyleOptions,
} from './data'
import type {
  ApiResult,
  ApplicationAnswers,
  ChangeArea,
  ChoiceOption,
  ContactDetails,
  ContactMethod,
  DailyRhythm,
  PastPattern,
  PreferredDay,
  PreferredPeriod,
  TogetherStyle,
  View,
} from './types'
import './App.css'

const FORM_VERSION = '2026.08.4'
const SCHEMA_VERSION = 'daylog-life-session-v1'
const ANSWERS_STORAGE_KEY = 'daylog-life-session-answers-v4'

const initialAnswers: ApplicationAnswers = {
  changeAreas: [],
}

const initialContact: ContactDetails = {
  displayName: '',
  contactMethod: 'phone',
  contactValue: '',
  preferredDays: [],
  preferredPeriods: [],
  additionalNote: '',
  privacyConsent: false,
  website: '',
}

const questionMeta = [
  {
    step: '01',
    label: '하루 리듬',
    shortTitle: '리듬 기록',
    title: '요즘 하루는 어떤 리듬으로 흘러가나요?',
    description: '가장 가깝게 느껴지는 하루의 패턴을 골라주세요. 다이어리의 첫 번째 항목으로 기록됩니다.',
    stage: 'daily_rhythm_selected',
  },
  {
    step: '02',
    label: '에너지 시간',
    shortTitle: '에너지 기록',
    title: '하루 중 가장 편안한 시간과 버거운 시간은 언제인가요?',
    description: '에너지가 살아나는 시간과 가라앉는 시간 두 개를 각각 선택해주세요.',
    stage: 'energy_selected',
  },
  {
    step: '03',
    label: '지속의 조건',
    shortTitle: '지속 조건',
    title: '무언가를 오래 이어가 본 적이 있나요?',
    description: '성취의 크기보다 그것을 지속하게 만들어준 조건을 떠올려보세요.',
    stage: 'past_pattern_selected',
  },
  {
    step: '04',
    label: '바꿀 습관',
    shortTitle: '습관 영역',
    title: '지금 가장 먼저 바꾸고 싶은 생활 습관은 어디인가요?',
    description: '1~3개를 선택한 뒤, 첫 번째 1:1 세션에서 집중할 1순위를 정해주세요.',
    stage: 'change_area_selected',
  },
  {
    step: '05',
    label: '동행 방식',
    shortTitle: '동행 페이스',
    title: '어떤 방식이면 조금 더 오래 이어갈 수 있을까요?',
    description: '당신에게 가장 편안하고 실질적인 동행 방식을 골라주세요.',
    stage: 'together_style_selected',
  },
] as const

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().toUpperCase()}`
}

function loadAnswers(): ApplicationAnswers {
  try {
    const stored = sessionStorage.getItem(ANSWERS_STORAGE_KEY)
    return stored ? { ...initialAnswers, ...(JSON.parse(stored) as Partial<ApplicationAnswers>) } : initialAnswers
  } catch {
    return initialAnswers
  }
}

function toggleExclusive<T extends string>(current: T[], value: T, flexible: T) {
  if (value === flexible) return current.includes(value) ? [] : [value]
  const withoutFlexible = current.filter((item) => item !== flexible)
  return withoutFlexible.includes(value)
    ? withoutFlexible.filter((item) => item !== value)
    : [...withoutFlexible, value]
}

function contactPlaceholder(method: ContactMethod) {
  if (method === 'email') return 'hello@example.com'
  if (method === 'messenger') return '카카오톡 ID 또는 메신저 ID'
  return '010-0000-0000'
}

function formatHourDisplay(value?: number) {
  if (value === undefined) return null
  const period = value < 12 ? '오전' : '오후'
  const displayHour = value === 0 ? 12 : value > 12 ? value - 12 : value
  return `${period} ${displayHour}시 (${String(value).padStart(2, '0')}:00)`
}

type ContactErrorField = 'displayName' | 'contactValue' | 'privacyConsent'

type ContactValidationError = {
  field: ContactErrorField
  message: string
}

function validateContact(contact: ContactDetails): ContactValidationError | null {
  if (!contact.displayName.trim()) {
    return { field: 'displayName', message: '이름 또는 불리고 싶은 호칭을 입력해주세요.' }
  }
  if (!contact.contactValue.trim()) {
    return { field: 'contactValue', message: '연락받으실 정보를 입력해주세요.' }
  }
  if (contact.contactMethod === 'phone' && !/^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(contact.contactValue)) {
    return { field: 'contactValue', message: '올바른 휴대전화 번호 형식을 확인해주세요.' }
  }
  if (contact.contactMethod === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.contactValue)) {
    return { field: 'contactValue', message: '올바른 이메일 주소 형식을 확인해주세요.' }
  }
  if (contact.contactMethod === 'messenger' && contact.contactValue.trim().length < 2) {
    return { field: 'contactValue', message: '메신저 ID를 2자 이상 입력해주세요.' }
  }
  if (!contact.privacyConsent) {
    return { field: 'privacyConsent', message: '원활한 세션 안내를 위해 개인정보 수집·이용에 동의해주세요.' }
  }
  return null
}

function App() {
  const [view, setView] = useState<View>({ kind: 'intro' })
  const [pageDirection, setPageDirection] = useState<'forward' | 'backward'>('forward')
  const [answers, setAnswers] = useState<ApplicationAnswers>(loadAnswers)
  const [contact, setContact] = useState<ContactDetails>(initialContact)
  const [error, setError] = useState('')
  const [contactErrorField, setContactErrorField] = useState<ContactErrorField | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [sessionId] = useState(() => createId('DAYLOG-S'))
  const [requestId] = useState(() => createId('DAYLOG'))

  const headingRef = useRef<HTMLHeadingElement>(null)
  const displayNameRef = useRef<HTMLInputElement>(null)
  const contactValueRef = useRef<HTMLInputElement>(null)
  const consentRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    sessionStorage.setItem(ANSWERS_STORAGE_KEY, JSON.stringify(answers))
  }, [answers])

  useEffect(() => {
    if (view.kind !== 'intro') headingRef.current?.focus()
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [view])

  const questionIndex = view.kind === 'question' ? view.index : -1
  const filledCount = [
    answers.dailyRhythm !== undefined,
    answers.comfortableTime !== undefined && answers.difficultTime !== undefined,
    answers.pastPattern !== undefined,
    answers.primaryChangeArea !== undefined,
    answers.togetherStyle !== undefined,
  ].filter(Boolean).length

  function goToView(nextView: View, direction: 'forward' | 'backward' = 'forward') {
    setError('')
    setPageDirection(direction)
    setView(nextView)
  }

  function updateContact(patch: Partial<ContactDetails>) {
    setContact((current) => ({ ...current, ...patch }))
    setContactErrorField(null)
    setError('')
  }

  function track(stage: string) {
    const payload = {
      action: 'track',
      eventId: `${sessionId}:${stage}`,
      sessionId,
      stage,
      source: 'daylog_web',
      formVersion: FORM_VERSION,
    }

    void fetch('/api/daylog/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => undefined)
  }

  function startExperience() {
    goToView({ kind: 'question', index: 0 }, 'forward')
    track('started')
  }

  function validateQuestion(index: number) {
    if (index === 0 && !answers.dailyRhythm) return '지금의 하루와 가장 가까운 리듬을 골라주세요.'
    if (index === 1 && (answers.comfortableTime === undefined || answers.difficultTime === undefined)) {
      return '편안한 시간과 버거운 시간을 각각 선택해주세요.'
    }
    if (index === 1 && answers.comfortableTime === answers.difficultTime) {
      return '편안한 시간과 버거운 시간은 서로 다르게 선택해주세요.'
    }
    if (index === 2 && !answers.pastPattern) return '나에게 가장 가까운 지속 방식을 골라주세요.'
    if (index === 3 && answers.changeAreas.length === 0) return '바꾸고 싶은 영역을 최소 1개 이상 골라주세요.'
    if (index === 3 && !answers.primaryChangeArea) return '가장 먼저 집중할 1순위 영역을 정해주세요.'
    if (index === 4 && !answers.togetherStyle) return '원하는 함께하기 방식을 골라주세요.'
    return ''
  }

  function goNext() {
    if (view.kind !== 'question') return
    const validationError = validateQuestion(view.index)
    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    track(questionMeta[view.index].stage)
    if (view.index === questionMeta.length - 1) {
      goToView({ kind: 'summary' }, 'forward')
      track('life_note_viewed')
      return
    }
    goToView({ kind: 'question', index: view.index + 1 }, 'forward')
  }

  function goBack() {
    if (view.kind === 'contact') return goToView({ kind: 'summary' }, 'backward')
    if (view.kind === 'summary') return goToView({ kind: 'question', index: 4 }, 'backward')
    if (view.kind === 'question' && view.index > 0) {
      return goToView({ kind: 'question', index: view.index - 1 }, 'backward')
    }
    goToView({ kind: 'intro' }, 'backward')
  }

  function chooseSingle<K extends keyof ApplicationAnswers>(key: K, value: ApplicationAnswers[K]) {
    setAnswers((current) => ({ ...current, [key]: value }))
    setError('')
  }

  function toggleChangeArea(area: ChangeArea) {
    setAnswers((current) => {
      const exists = current.changeAreas.includes(area)
      if (!exists && current.changeAreas.length >= 3) {
        setError('최대 3개까지 선택할 수 있어요.')
        return current
      }
      const next = exists
        ? current.changeAreas.filter((item) => item !== area)
        : [...current.changeAreas, area]
      const primaryChangeArea = next.includes(current.primaryChangeArea as ChangeArea)
        ? current.primaryChangeArea
        : next.length === 1
          ? next[0]
          : undefined
      return { ...current, changeAreas: next, primaryChangeArea }
    })
  }

  function openContact() {
    goToView({ kind: 'contact' }, 'forward')
    track('application_started')
  }

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationError = validateContact(contact)
    if (validationError) {
      setContactErrorField(validationError.field)
      setError(validationError.message)
      requestAnimationFrame(() => {
        if (validationError.field === 'displayName') displayNameRef.current?.focus()
        if (validationError.field === 'contactValue') contactValueRef.current?.focus()
        if (validationError.field === 'privacyConsent') consentRef.current?.focus()
      })
      return
    }

    setSubmitting(true)
    setError('')
    track('consent_accepted')

    const search = new URLSearchParams(window.location.search)
    const payload = {
      action: 'submit',
      requestId,
      sessionId,
      ...answers,
      ...contact,
      displayName: contact.displayName.trim(),
      contactValue: contact.contactValue.trim(),
      additionalNote: contact.additionalNote.trim(),
      source: 'daylog_web',
      utmSource: search.get('utm_source') ?? '',
      utmMedium: search.get('utm_medium') ?? '',
      utmCampaign: search.get('utm_campaign') ?? '',
      formVersion: FORM_VERSION,
      schemaVersion: SCHEMA_VERSION,
    }

    try {
      const response = await fetch('/api/daylog/application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json().catch(() => null) as ApiResult | null
      if (!result) throw new Error('신청 접수 서버와 연결하지 못했습니다.')
      if (!response.ok || !result.ok) throw new Error(result.error)
      sessionStorage.removeItem(ANSWERS_STORAGE_KEY)
      goToView({ kind: 'success', requestId: result.requestId ?? requestId }, 'forward')
      track('submitted')
    } catch (submitError) {
      setError(
        submitError instanceof Error && submitError.message
          ? submitError.message
          : '신청을 접수하지 못했습니다. 작성하신 다이어리 내용은 안전하게 보관되어 있으니 잠시 후 다시 시도해주세요.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  function restart() {
    sessionStorage.removeItem(ANSWERS_STORAGE_KEY)
    setAnswers(initialAnswers)
    setContact(initialContact)
    setContactErrorField(null)
    setError('')
    goToView({ kind: 'intro' }, 'backward')
  }

  function renderChoiceCards<T extends string>(
    options: ChoiceOption<T>[],
    selected: T | undefined,
    onSelect: (value: T) => void,
  ) {
    return (
      <div className="diary-choice-list" role="radiogroup">
        {options.map((option) => {
          const isSelected = selected === option.id
          return (
            <label className={`diary-choice-item ${isSelected ? 'is-selected' : ''}`} key={option.id}>
              <input
                checked={isSelected}
                name={`choice-${questionIndex}`}
                onChange={() => onSelect(option.id)}
                type="radio"
                value={option.id}
              />
              <div className="choice-checkbox-indicator" aria-hidden="true">
                <span className="checkbox-dot" />
              </div>
              <div className="choice-text-wrap">
                <strong className="choice-title-text">{option.title}</strong>
                <span className="choice-sub-text">{option.description}</span>
              </div>
              <span className="choice-marker-tab" aria-hidden="true">{option.marker}</span>
            </label>
          )
        })}
      </div>
    )
  }

  function renderQuestion(index: number) {
    if (index === 0) {
      return renderChoiceCards<DailyRhythm>(dailyRhythmOptions, answers.dailyRhythm, (value) => {
        chooseSingle('dailyRhythm', value)
      })
    }

    if (index === 1) {
      return (
        <div className="diary-time-table-section">
          <div className="time-picker-grid-2col">
            {/* 편안한 시간 선택기 */}
            <div className={`time-picker-column time-column--easy ${answers.comfortableTime !== undefined ? 'is-picked' : ''}`}>
              <div className="time-column-header">
                <div className="time-header-title-box">
                  <span className="time-header-icon" aria-hidden="true">☀️</span>
                  <div>
                    <strong className="time-header-title">가장 편안한 시간</strong>
                    <p className="time-header-desc">에너지가 차오르고 몰입하기 좋은 시간대</p>
                  </div>
                </div>
                <div className={`time-badge-pill ${answers.comfortableTime !== undefined ? 'is-filled' : ''}`}>
                  {answers.comfortableTime !== undefined
                    ? formatHourDisplay(answers.comfortableTime)
                    : '시간 선택'}
                </div>
              </div>

              <div className="time-scroll-list" role="listbox" aria-label="가장 편안한 시간 선택 목록">
                {hourlyList.map((item) => {
                  const isChosen = answers.comfortableTime === item.hour
                  const isConflict = answers.difficultTime === item.hour
                  return (
                    <button
                      type="button"
                      key={`easy-${item.hour}`}
                      role="option"
                      aria-selected={isChosen}
                      className={`time-chip-row ${isChosen ? 'is-chosen' : ''} ${isConflict ? 'is-conflict' : ''}`}
                      onClick={() => chooseSingle('comfortableTime', item.hour)}
                    >
                      <div className="time-chip-left">
                        <span className="chip-clock">{item.timeString}</span>
                        <span className="chip-label">{item.label}</span>
                      </div>
                      <div className="time-chip-right">
                        {isConflict && <span className="chip-conflict-tag">버거운 시간</span>}
                        <span className="chip-check-mark" aria-hidden="true">{isChosen ? '✓' : ''}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 버거운 시간 선택기 */}
            <div className={`time-picker-column time-column--hard ${answers.difficultTime !== undefined ? 'is-picked' : ''}`}>
              <div className="time-column-header">
                <div className="time-header-title-box">
                  <span className="time-header-icon" aria-hidden="true">🌙</span>
                  <div>
                    <strong className="time-header-title">가장 버거운 시간</strong>
                    <p className="time-header-desc">에너지가 떨어지거나 일과가 지치는 시간대</p>
                  </div>
                </div>
                <div className={`time-badge-pill ${answers.difficultTime !== undefined ? 'is-filled' : ''}`}>
                  {answers.difficultTime !== undefined
                    ? formatHourDisplay(answers.difficultTime)
                    : '시간 선택'}
                </div>
              </div>

              <div className="time-scroll-list" role="listbox" aria-label="가장 버거운 시간 선택 목록">
                {hourlyList.map((item) => {
                  const isChosen = answers.difficultTime === item.hour
                  const isConflict = answers.comfortableTime === item.hour
                  return (
                    <button
                      type="button"
                      key={`hard-${item.hour}`}
                      role="option"
                      aria-selected={isChosen}
                      className={`time-chip-row ${isChosen ? 'is-chosen' : ''} ${isConflict ? 'is-conflict' : ''}`}
                      onClick={() => chooseSingle('difficultTime', item.hour)}
                    >
                      <div className="time-chip-left">
                        <span className="chip-clock">{item.timeString}</span>
                        <span className="chip-label">{item.label}</span>
                      </div>
                      <div className="time-chip-right">
                        {isConflict && <span className="chip-conflict-tag">편안한 시간</span>}
                        <span className="chip-check-mark" aria-hidden="true">{isChosen ? '✓' : ''}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {answers.comfortableTime !== undefined && answers.difficultTime !== undefined && answers.comfortableTime === answers.difficultTime && (
            <p className="diary-alert-note" role="alert">
              ⚠️ 편안한 시간과 버거운 시간은 서로 다르게 선택해주세요.
            </p>
          )}

          <p className="diary-hint-caption">💡 하루 일과 중 나의 에너지가 가장 뚜렷하게 대비되는 두 시간을 골라주세요.</p>
        </div>
      )
    }

    if (index === 2) {
      return renderChoiceCards<PastPattern>(pastPatternOptions, answers.pastPattern, (value) => {
        chooseSingle('pastPattern', value)
      })
    }

    if (index === 3) {
      return (
        <div className="diary-habit-area-section">
          <div className="habit-selection-counter">
            <span>선택된 습관 영역: <strong>{answers.changeAreas.length}개</strong> (1~3개 선택 가능)</span>
          </div>

          <div className="habit-tiles-grid">
            {changeAreaOptions.map((option) => {
              const selected = answers.changeAreas.includes(option.id)
              const isPrimary = answers.primaryChangeArea === option.id
              return (
                <label className={`habit-tile-card ${selected ? 'is-selected' : ''}`} key={option.id}>
                  <input
                    checked={selected}
                    onChange={() => toggleChangeArea(option.id)}
                    type="checkbox"
                    value={option.id}
                  />
                  <div className="habit-tile-checkbox" aria-hidden="true">
                    <span>{selected ? '✓' : ''}</span>
                  </div>
                  <div className="habit-tile-info">
                    <strong className="habit-tile-title">{option.title}</strong>
                    <span className="habit-tile-desc">{option.description}</span>
                  </div>
                  {isPrimary && <span className="habit-primary-badge" aria-label="1순위 지정">1순위</span>}
                </label>
              )
            })}
          </div>

          {answers.changeAreas.length > 0 && (
            <div className="diary-priority-box scene-enter">
              <div className="priority-box-header">
                <span className="priority-pin-icon" aria-hidden="true">📌</span>
                <div>
                  <strong>그중 첫 번째 세션에서 가장 먼저 다룰 1순위 습관은?</strong>
                  <p>선택하신 {answers.changeAreas.length}개 영역 중 가장 깊이 다루고 싶은 주제를 1개 지정해주세요.</p>
                </div>
              </div>
              <div className="priority-chips-wrap">
                {answers.changeAreas.map((area) => {
                  const isPrimary = answers.primaryChangeArea === area
                  return (
                    <label className={`priority-choice-chip ${isPrimary ? 'is-active' : ''}`} key={area}>
                      <input
                        checked={isPrimary}
                        name="primary-change-area"
                        onChange={() => chooseSingle('primaryChangeArea', area)}
                        type="radio"
                      />
                      <span className="priority-chip-dot" aria-hidden="true" />
                      <span className="priority-chip-title">{labels.changeArea[area]}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )
    }

    return renderChoiceCards<TogetherStyle>(togetherStyleOptions, answers.togetherStyle, (value) => {
      chooseSingle('togetherStyle', value)
    })
  }

  // Navigation tabs metadata
  const indexTabs = [
    { id: 'intro', label: '표지', isUnlocked: true, targetView: { kind: 'intro' as const } },
    { id: 'q0', label: '01 리듬', isUnlocked: true, targetView: { kind: 'question' as const, index: 0 } },
    { id: 'q1', label: '02 에너지', isUnlocked: filledCount >= 1 || (view.kind === 'question' && view.index >= 1), targetView: { kind: 'question' as const, index: 1 } },
    { id: 'q2', label: '03 지속', isUnlocked: filledCount >= 2 || (view.kind === 'question' && view.index >= 2), targetView: { kind: 'question' as const, index: 2 } },
    { id: 'q3', label: '04 습관', isUnlocked: filledCount >= 3 || (view.kind === 'question' && view.index >= 3), targetView: { kind: 'question' as const, index: 3 } },
    { id: 'q4', label: '05 동행', isUnlocked: filledCount >= 4 || (view.kind === 'question' && view.index >= 4), targetView: { kind: 'question' as const, index: 4 } },
    { id: 'summary', label: '요약', isUnlocked: filledCount === 5, targetView: { kind: 'summary' as const } },
    { id: 'contact', label: '신청', isUnlocked: filledCount === 5, targetView: { kind: 'contact' as const } },
  ]

  function isCurrentTab(tabId: string) {
    if (view.kind === 'intro') return tabId === 'intro'
    if (view.kind === 'question') return tabId === `q${view.index}`
    if (view.kind === 'summary') return tabId === 'summary'
    if (view.kind === 'contact') return tabId === 'contact'
    return false
  }

  return (
    <div className="desk-environment">
      {/* Calm Desk Ambient Top Bar */}
      <header className="desk-topbar">
        <div className="topbar-left">
          <button className="topbar-logo-btn" onClick={restart} type="button" aria-label="다이어리 표지로 이동">
            DAYLOG
          </button>
          <span className="topbar-divider" aria-hidden="true">/</span>
          <span className="topbar-project-title">나의 하루 다이어리 (2026 LIFE SESSION)</span>
        </div>

        <div className="topbar-right">
          <div className="topbar-date-pill">
            <span className="topbar-dot" aria-hidden="true" />
            <span>2026. 08. 27 · 서울 1:1 오프라인</span>
          </div>
        </div>
      </header>

      {/* The Physical Diary Book Spread */}
      <main className={`diary-book-wrapper view-${view.kind}`}>
        {/* Bookmark Ribbon */}
        <div className="bookmark-ribbon" aria-hidden="true">
          <div className="ribbon-tail" />
        </div>

        {/* Side Index Bookmark Tabs */}
        <nav className="diary-index-tabs-bar" aria-label="다이어리 목차 탭">
          {indexTabs.map((tab) => {
            const active = isCurrentTab(tab.id)
            return (
              <button
                type="button"
                key={tab.id}
                className={`index-bookmark-tab ${active ? 'is-active' : ''} ${tab.isUnlocked ? 'is-unlocked' : 'is-locked'}`}
                onClick={() => {
                  if (tab.isUnlocked) {
                    goToView(tab.targetView, 'forward')
                  }
                }}
                disabled={!tab.isUnlocked}
                aria-current={active ? 'page' : undefined}
                title={tab.isUnlocked ? `${tab.label} 페이지로 이동` : '이전 항목을 먼저 기록해주세요'}
              >
                <span className="tab-label-text">{tab.label}</span>
              </button>
            )
          })}
        </nav>

        {/* 2-PAGE SPREAD CONTAINER */}
        <div className="diary-spread-book">
          {/* =========================================================================
              VIEW: INTRO (Cover & Preamble Spread)
             ========================================================================= */}
          {view.kind === 'intro' && (
            <div className={`diary-spread-layout intro-spread ${pageDirection === 'forward' ? 'page-turn-forward' : 'page-turn-backward'}`}>
              {/* Left Page: Leather / Hard Cover Presentation */}
              <div className="diary-page diary-page--left cover-page">
                <div className="cover-page-inner">
                  <div className="cover-gold-badge">
                    <span className="gold-star" aria-hidden="true">✦</span>
                    <span>DAYLOG LIFE SESSION 2026</span>
                  </div>

                  <div className="cover-main-titles">
                    <p className="cover-subtitle-korean">나에게 맞는 하루 설계</p>
                    <h1 id="intro-title" className="cover-book-title">
                      나의 하루<br />다이어리
                    </h1>
                  </div>

                  <div className="cover-session-facts">
                    {sessionFactBadges.map((badge) => (
                      <div className="fact-item-ticket" key={badge.label}>
                        <span className="fact-icon" aria-hidden="true">{badge.icon}</span>
                        <div className="fact-text">
                          <span className="fact-label">{badge.label}</span>
                          <strong className="fact-value">{badge.value}</strong>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="cover-bottom-stamp">
                    <span className="stamp-text">1:1 OFFLINE LIFE ROUTINE MAPPING</span>
                  </div>
                </div>
              </div>

              {/* Spine Gutter */}
              <div className="diary-spine" aria-hidden="true">
                <div className="spine-stitch" />
                <div className="spine-stitch" />
                <div className="spine-stitch" />
              </div>

              {/* Right Page: Preamble & Journaling Preview */}
              <div className="diary-page diary-page--right intro-preamble-page">
                <div className="preamble-page-inner">
                  <div className="preamble-header">
                    <span className="preamble-tag">PREAMBLE · 시작하며</span>
                    <h2 className="preamble-title">
                      거창한 계획보다,<br />
                      <span className="preamble-highlight">나다운 하루의 호흡</span>을 적습니다.
                    </h2>
                  </div>

                  <div className="preamble-body-text">
                    <p>
                      모두에게 정답인 시간표는 없습니다. 내가 가장 편안한 시간, 지치는 순간, 무언가를 지속하게 했던 나만의 조건을 발견할 때 비로소 무너지지 않는 루틴이 시작됩니다.
                    </p>
                    <p>
                      다이어리의 5개 질문에 가볍게 답해보세요. 적어주신 하루 기록을 바탕으로 <strong>서울 1:1 오프라인 세션(60분)</strong>에서 코치와 함께 실행 가능한 루틴 지도를 완성합니다.
                    </p>
                  </div>

                  <div className="journaling-steps-preview">
                    <div className="preview-step-row">
                      <span className="preview-step-num">01~02</span>
                      <div className="preview-step-content">
                        <strong>하루 리듬과 24시간 에너지 기록</strong>
                        <p>내가 활력을 얻는 시간과 버거운 시간대를 찾습니다.</p>
                      </div>
                    </div>
                    <div className="preview-step-row">
                      <span className="preview-step-num">03~05</span>
                      <div className="preview-step-content">
                        <strong>지속 조건과 1순위 습관 영역 탐색</strong>
                        <p>수면, 식사, 운동 등 가장 먼저 다룰 습관을 정합니다.</p>
                      </div>
                    </div>
                    <div className="preview-step-row">
                      <span className="preview-step-num">1:1</span>
                      <div className="preview-step-content">
                        <strong>완성된 하루 초안 & 세션 예약</strong>
                        <p>작성된 다이어리를 들고 첫 만남에서 코치와 만납니다.</p>
                      </div>
                    </div>
                  </div>

                  <div className="intro-cta-box">
                    <button className="diary-primary-btn" type="button" onClick={startExperience}>
                      <span className="btn-title-main">다이어리 적으며 시작하기</span>
                      <span className="btn-arrow-pill" aria-hidden="true">→</span>
                    </button>
                    <span className="intro-time-hint">⏱️ 5개 질문 · 약 3분 소요 · 회원가입 불필요</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              VIEW: QUESTION (Interactive Spread: Left Question vs Right Live Diary)
             ========================================================================= */}
          {view.kind === 'question' && (
            <div className={`diary-spread-layout question-spread ${pageDirection === 'forward' ? 'page-turn-forward' : 'page-turn-backward'}`}>
              {/* Left Page: The Habit Exploration Question */}
              <div className="diary-page diary-page--left question-prompt-page">
                {/* Step Pills & Progress */}
                <div className="page-step-nav">
                  <span className="page-section-stamp">
                    SECTION 0{view.index + 1} / 05 · {questionMeta[view.index].label}
                  </span>
                  <div className="mini-progress-track" aria-label={`5개 중 ${view.index + 1}단계`}>
                    <div className="mini-progress-bar" style={{ width: `${((view.index + 1) / 5) * 100}%` }} />
                  </div>
                </div>

                <div className="question-headline-group">
                  <h1 id="question-title" ref={headingRef} tabIndex={-1} className="question-main-heading">
                    {questionMeta[view.index].title}
                  </h1>
                  <p className="question-lead-desc">{questionMeta[view.index].description}</p>
                </div>

                <div className="question-interactive-body">
                  {renderQuestion(view.index)}
                </div>

                {error && (
                  <p className="diary-error-note" role="alert" aria-live="polite">
                    ⚠️ {error}
                  </p>
                )}

                {/* Left Page Bottom Actions */}
                <div className="page-footer-actions">
                  <button className="diary-secondary-btn" onClick={goBack} type="button">
                    ← 이전 장
                  </button>
                  <button
                    className="diary-primary-btn diary-primary-btn--compact"
                    disabled={Boolean(validateQuestion(view.index))}
                    onClick={goNext}
                    type="button"
                  >
                    <span>{view.index === 4 ? '완성된 다이어리 보기' : '다음 장으로'}</span>
                    <span className="btn-arrow-pill" aria-hidden="true">→</span>
                  </button>
                </div>
              </div>

              {/* Spine Gutter */}
              <div className="diary-spine" aria-hidden="true">
                <div className="spine-stitch" />
                <div className="spine-stitch" />
                <div className="spine-stitch" />
              </div>

              {/* Right Page: Live Life Journal (실시간으로 내 손으로 적는 다이어리) */}
              <div className="diary-page diary-page--right live-journal-page">
                <RoutineNotebook
                  answers={answers}
                  activeStepIndex={view.index}
                  onEditStep={(step) => goToView({ kind: 'question', index: step }, 'backward')}
                />
              </div>
            </div>
          )}

          {/* =========================================================================
              VIEW: SUMMARY (Completed Diary Spread)
             ========================================================================= */}
          {view.kind === 'summary' && (
            <div className={`diary-spread-layout summary-spread ${pageDirection === 'forward' ? 'page-turn-forward' : 'page-turn-backward'}`}>
              {/* Left Page: The Full 5-Entry Life Diary */}
              <div className="diary-page diary-page--left summary-diary-page">
                <RoutineNotebook
                  answers={answers}
                  summary
                  onEditStep={(step) => goToView({ kind: 'question', index: step }, 'backward')}
                />
              </div>

              {/* Spine Gutter */}
              <div className="diary-spine" aria-hidden="true">
                <div className="spine-stitch" />
                <div className="spine-stitch" />
                <div className="spine-stitch" />
              </div>

              {/* Right Page: 1:1 Session Roadmap & Next Step */}
              <div className="diary-page diary-page--right session-roadmap-page">
                <div className="roadmap-page-inner">
                  <div className="roadmap-header">
                    <span className="roadmap-badge">SESSION PREVIEW · 60MIN</span>
                    <h1 id="summary-title" ref={headingRef} tabIndex={-1} className="roadmap-title">
                      작성하신 다이어리로<br />
                      <span className="roadmap-highlight">1:1 라이프 세션</span>을 이어갑니다.
                    </h1>
                    <p className="roadmap-desc">
                      이 기록은 진단표가 아닙니다. 오프라인 공간에서 코치와 함께 나다운 하루를 완성할 <strong>이야기의 첫 장</strong>입니다.
                    </p>
                  </div>

                  <div className="session-roadmap-timeline">
                    <div className="timeline-item">
                      <span className="timeline-num">STEP 1</span>
                      <div className="timeline-body">
                        <strong>다이어리 라이프 인터뷰 (20분)</strong>
                        <p>선택하신 에너지 시간대와 과거 지속 패턴을 깊이 나누며 나만의 습관 성향을 확인합니다.</p>
                      </div>
                    </div>

                    <div className="timeline-item">
                      <span className="timeline-num">STEP 2</span>
                      <div className="timeline-body">
                        <strong>취약 시간대 완충 루틴 설계 (25분)</strong>
                        <p>버거운 시간을 방어하고, 1순위 집중 습관({answers.primaryChangeArea ? labels.changeArea[answers.primaryChangeArea] : '선택 영역'})을 일상에 무리 없이 안착시킵니다.</p>
                      </div>
                    </div>

                    <div className="timeline-item">
                      <span className="timeline-num">STEP 3</span>
                      <div className="timeline-body">
                        <strong>7일 실행 지도 & 피드백 약속 (15분)</strong>
                        <p>내일부터 당장 해볼 수 있는 작은 행동과 지속 가능한 동행 방식을 함께 확정합니다.</p>
                      </div>
                    </div>
                  </div>

                  <div className="summary-page-actions">
                    <button className="diary-secondary-btn" onClick={goBack} type="button">
                      ← 답변 다시 수정
                    </button>
                    <button className="diary-primary-btn" onClick={openContact} type="button">
                      <span className="btn-title-main">1:1 세션 신청서 작성하기</span>
                      <span className="btn-arrow-pill" aria-hidden="true">→</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              VIEW: CONTACT (Reservation & Application Sheet Spread)
             ========================================================================= */}
          {view.kind === 'contact' && (
            <div className={`diary-spread-layout contact-spread ${pageDirection === 'forward' ? 'page-turn-forward' : 'page-turn-backward'}`}>
              {/* Left Page: Reservation Summary & Coach Commitment */}
              <div className="diary-page diary-page--left contact-summary-page">
                <div className="contact-summary-inner">
                  <div className="ticket-header-badge">
                    <span className="ticket-dot" aria-hidden="true" />
                    <span>DAYLOG LIFE SESSION RESERVATION</span>
                  </div>

                  <h2 className="contact-summary-title">
                    세션 예약 안내 &<br />안심 약속
                  </h2>

                  <div className="reservation-fact-card">
                    <div className="res-fact-row">
                      <span className="res-icon" aria-hidden="true">📍</span>
                      <div>
                        <strong>진행 공간</strong>
                        <span>서울 1:1 오프라인 전용 공간</span>
                      </div>
                    </div>
                    <div className="res-fact-row">
                      <span className="res-icon" aria-hidden="true">⏱️</span>
                      <div>
                        <strong>세션 시간</strong>
                        <span>60분 1:1 밀착 세션</span>
                      </div>
                    </div>
                    <div className="res-fact-row">
                      <span className="res-icon" aria-hidden="true">🗓️</span>
                      <div>
                        <strong>일정 조율</strong>
                        <span>신청 접수 후 24시간 이내 개별 연락</span>
                      </div>
                    </div>
                  </div>

                  <div className="coach-promise-box">
                    <strong className="promise-title">🔒 데이로그의 안심 약속</strong>
                    <p>
                      입력하신 정보는 오직 1:1 세션 일정 조율과 맞춤 루틴 준비에만 소중히 사용됩니다. 마케팅 스팸이나 불필요한 연락은 일체 드리지 않습니다.
                    </p>
                  </div>

                  <div className="diary-filled-chips-preview">
                    <span className="chips-preview-label">작성된 다이어리 요약:</span>
                    <div className="chips-list">
                      {answers.dailyRhythm && <span className="summary-chip">{labels.dailyRhythm[answers.dailyRhythm]}</span>}
                      {answers.primaryChangeArea && <span className="summary-chip summary-chip--primary">1순위: {labels.changeArea[answers.primaryChangeArea]}</span>}
                      {answers.togetherStyle && <span className="summary-chip">{labels.togetherStyle[answers.togetherStyle]}</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Spine Gutter */}
              <div className="diary-spine" aria-hidden="true">
                <div className="spine-stitch" />
                <div className="spine-stitch" />
                <div className="spine-stitch" />
              </div>

              {/* Right Page: The Contact & Reservation Form Sheet */}
              <div className="diary-page diary-page--right contact-form-page">
                <div className="contact-form-inner">
                  <div className="form-header-group">
                    <span className="form-step-tag">APPLICATION · 세션 신청서</span>
                    <h1 id="contact-title" ref={headingRef} tabIndex={-1} className="form-main-heading">
                      직접 만나 이야기해볼까요?
                    </h1>
                    <p className="form-lead-desc">
                      신청서를 작성해주시면 코치가 내용을 확인한 뒤 편하신 방법으로 일정 확정 연락을 드립니다.
                    </p>
                  </div>

                  <form className="diary-booking-form" onSubmit={submitApplication} noValidate>
                    {/* Field 01: Name */}
                    <div className="form-field-card">
                      <div className="field-card-header">
                        <span className="field-num">01</span>
                        <div>
                          <strong className="field-title">어떻게 불러드리면 될까요? <em className="required-star">*</em></strong>
                          <p className="field-subtitle">실명 또는 세션에서 불리고 싶은 호칭</p>
                        </div>
                      </div>
                      <input
                        autoComplete="name"
                        maxLength={50}
                        aria-describedby={contactErrorField === 'displayName' ? 'contact-error' : undefined}
                        aria-invalid={contactErrorField === 'displayName'}
                        className={`diary-text-input ${contactErrorField === 'displayName' ? 'has-error' : ''}`}
                        onChange={(event) => updateContact({ displayName: event.target.value })}
                        placeholder="예: 원영"
                        ref={displayNameRef}
                        required
                        value={contact.displayName}
                      />
                    </div>

                    {/* Field 02: Contact Method & Value */}
                    <div className="form-field-card">
                      <div className="field-card-header">
                        <span className="field-num">02</span>
                        <div>
                          <strong className="field-title">어떤 방법으로 연락드릴까요? <em className="required-star">*</em></strong>
                          <p className="field-subtitle">세션 일정 조율에만 소중히 활용됩니다.</p>
                        </div>
                      </div>

                      <div className="contact-tabs-grid">
                        {(['phone', 'email', 'messenger'] as ContactMethod[]).map((method) => (
                          <label className={`contact-tab-pill ${contact.contactMethod === method ? 'is-active' : ''}`} key={method}>
                            <input
                              checked={contact.contactMethod === method}
                              name="contact-method"
                              onChange={() => updateContact({ contactMethod: method, contactValue: '' })}
                              type="radio"
                            />
                            <span>{method === 'phone' ? '문자·전화' : method === 'email' ? '이메일' : '메신저 (카카오톡)'}</span>
                          </label>
                        ))}
                      </div>

                      <input
                        autoComplete={contact.contactMethod === 'phone' ? 'tel' : contact.contactMethod === 'email' ? 'email' : 'off'}
                        inputMode={contact.contactMethod === 'phone' ? 'tel' : contact.contactMethod === 'email' ? 'email' : 'text'}
                        maxLength={100}
                        aria-describedby={contactErrorField === 'contactValue' ? 'contact-error' : undefined}
                        aria-invalid={contactErrorField === 'contactValue'}
                        className={`diary-text-input ${contactErrorField === 'contactValue' ? 'has-error' : ''}`}
                        onChange={(event) => updateContact({ contactValue: event.target.value })}
                        placeholder={contactPlaceholder(contact.contactMethod)}
                        ref={contactValueRef}
                        required
                        value={contact.contactValue}
                      />
                    </div>

                    {/* Field 03: Optional Preferred Days & Note */}
                    <details className="diary-accordion-card">
                      <summary className="accordion-summary-row">
                        <div className="accordion-summary-left">
                          <span className="accordion-icon" aria-hidden="true">🗓️</span>
                          <div>
                            <strong>희망 일정과 메모 남기기</strong>
                            <span>선택 사항 · 지금 정하지 않고 나중에 조율해도 괜찮습니다.</span>
                          </div>
                        </div>
                        <span className="accordion-arrow" aria-hidden="true">▼</span>
                      </summary>

                      <div className="accordion-body-wrap">
                        <div className="sub-field-group">
                          <strong className="sub-field-title">만나기 편한 요일 <i>(선택)</i></strong>
                          <div className="day-chips-row">
                            {preferredDayOptions.map((option) => {
                              const isSelected = contact.preferredDays.includes(option.id)
                              return (
                                <label className={`day-chip-btn ${isSelected ? 'is-selected' : ''}`} key={option.id}>
                                  <input
                                    checked={isSelected}
                                    onChange={() => updateContact({
                                      preferredDays: toggleExclusive<PreferredDay>(contact.preferredDays, option.id, 'flexible'),
                                    })}
                                    type="checkbox"
                                  />
                                  <span>{option.label}</span>
                                </label>
                              )
                            })}
                          </div>
                        </div>

                        <div className="sub-field-group">
                          <strong className="sub-field-title">편한 시간대 <i>(선택)</i></strong>
                          <div className="day-chips-row">
                            {preferredPeriodOptions.map((option) => {
                              const isSelected = contact.preferredPeriods.includes(option.id)
                              return (
                                <label className={`day-chip-btn ${isSelected ? 'is-selected' : ''}`} key={option.id}>
                                  <input
                                    checked={isSelected}
                                    onChange={() => updateContact({
                                      preferredPeriods: toggleExclusive<PreferredPeriod>(contact.preferredPeriods, option.id, 'flexible'),
                                    })}
                                    type="checkbox"
                                  />
                                  <span>{option.label}</span>
                                </label>
                              )
                            })}
                          </div>
                        </div>

                        <div className="sub-field-group">
                          <strong className="sub-field-title">세션 전 전하고 싶은 이야기 <i>(선택)</i></strong>
                          <div className="textarea-container">
                            <textarea
                              maxLength={500}
                              className="diary-textarea"
                              onChange={(event) => updateContact({ additionalNote: event.target.value })}
                              placeholder="궁금한 점이나 세션 전 코치에게 전하고 싶은 이야기가 있다면 편안하게 남겨주세요."
                              rows={3}
                              value={contact.additionalNote}
                            />
                            <small className="diary-char-counter">{contact.additionalNote.length} / 500자</small>
                          </div>
                        </div>
                      </div>
                    </details>

                    {/* Honeypot for bot protection */}
                    <label className="honeypot" aria-hidden="true">
                      웹사이트
                      <input
                        autoComplete="off"
                        name="website"
                        onChange={(event) => updateContact({ website: event.target.value })}
                        tabIndex={-1}
                        value={contact.website}
                      />
                    </label>

                    {/* Privacy Consent Checkbox */}
                    <div className={`diary-consent-card ${contactErrorField === 'privacyConsent' ? 'has-error' : ''}`}>
                      <label className="consent-label">
                        <input
                          checked={contact.privacyConsent}
                          aria-describedby={contactErrorField === 'privacyConsent' ? 'contact-error' : undefined}
                          aria-invalid={contactErrorField === 'privacyConsent'}
                          onChange={(event) => updateContact({ privacyConsent: event.target.checked })}
                          ref={consentRef}
                          required
                          type="checkbox"
                        />
                        <div className="consent-text-box">
                          <strong className="consent-headline">[필수] 개인정보 수집 및 이용 동의</strong>
                          <p className="consent-detail">
                            1:1 Life Session 일정 안내 및 본인 확인을 위해 이름(호칭)과 연락처를 수집합니다.
                            기록해주신 다이어리 내용은 오직 맞춤 세션 준비에만 활용되며 안전하게 보호됩니다.
                          </p>
                        </div>
                      </label>
                    </div>

                    {error && <p className="diary-error-note" id="contact-error" role="alert" aria-live="polite">⚠️ {error}</p>}

                    {/* Submit Actions Bar */}
                    <div className="form-actions-bar">
                      <button className="diary-secondary-btn" onClick={goBack} type="button">
                        ← 다이어리 요약
                      </button>
                      <button className="diary-primary-btn" disabled={submitting} type="submit">
                        <span className="btn-title-main">{submitting ? '신청 접수하는 중…' : '1:1 Life Session 예약 완료하기'}</span>
                        {!submitting && <span className="btn-arrow-pill" aria-hidden="true">→</span>}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              VIEW: SUCCESS (Completed Invitation Receipt)
             ========================================================================= */}
          {view.kind === 'success' && (
            <div className="diary-spread-layout success-spread page-turn-forward">
              {/* Left Page: Official Verified Stamp */}
              <div className="diary-page diary-page--left success-stamp-page">
                <div className="success-stamp-inner">
                  <div className="stamp-wax-seal" aria-hidden="true">
                    <span className="seal-star">✦</span>
                    <strong className="seal-text">CONFIRMED</strong>
                    <span className="seal-year">2026</span>
                  </div>
                  <h2 className="stamp-page-title">다이어리 등록 완료</h2>
                  <p className="stamp-page-desc">
                    작성해주신 나의 하루 다이어리가 코치에게 안전하게 전달되었습니다.
                  </p>
                </div>
              </div>

              {/* Spine Gutter */}
              <div className="diary-spine" aria-hidden="true">
                <div className="spine-stitch" />
                <div className="spine-stitch" />
                <div className="spine-stitch" />
              </div>

              {/* Right Page: Reservation Confirmation Receipt */}
              <div className="diary-page diary-page--right success-receipt-page">
                <div className="receipt-page-inner">
                  <span className="receipt-status-badge">RESERVATION CONFIRMED</span>
                  <h1 id="success-title" ref={headingRef} tabIndex={-1} className="receipt-headline">
                    이제 직접 만나<br />함께 살펴볼게요.
                  </h1>
                  <p className="receipt-sub-desc">
                    작성해주신 하루 다이어리를 바탕으로 <strong>24시간 이내</strong>에 남겨주신 연락처로 일정 확정 안내를 드리겠습니다.
                  </p>

                  <div className="receipt-card-box">
                    <div className="receipt-row">
                      <span className="rc-label">예약 접수 번호</span>
                      <strong className="rc-value rc-code">{view.requestId}</strong>
                    </div>
                    <div className="receipt-row">
                      <span className="rc-label">신청자 호칭</span>
                      <strong className="rc-value">{contact.displayName || '신청자'}님</strong>
                    </div>
                    <div className="receipt-row">
                      <span className="rc-label">세션 프로그램</span>
                      <strong className="rc-value">1:1 Life Session (60분 오프라인)</strong>
                    </div>
                    <div className="receipt-row">
                      <span className="rc-label">준비물</span>
                      <strong className="rc-value">가벼운 마음 (추가 준비물 없음)</strong>
                    </div>
                  </div>

                  <button className="diary-secondary-btn diary-restart-btn" onClick={restart} type="button">
                    첫 화면(다이어리 표지)으로 돌아가기
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MOBILE ONLY: Floating Live Diary Access Bar & Drawer */}
      {view.kind === 'question' && (
        <>
          <aside className="mobile-floating-diary-bar" aria-label="모바일 다이어리 바로가기">
            <button
              type="button"
              className="mobile-diary-toggle-btn"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="나의 실시간 다이어리 열기"
            >
              <span className="btn-book-icon" aria-hidden="true">📖</span>
              <span>나의 하루 다이어리 확인하기 ({filledCount}/5 완료)</span>
              <span className="btn-toggle-arrow" aria-hidden="true">▲</span>
            </button>
          </aside>

          {mobileDrawerOpen && (
            <div className="mobile-drawer-overlay" onClick={() => setMobileDrawerOpen(false)}>
              <div className="mobile-drawer-modal" onClick={(e) => e.stopPropagation()}>
                <RoutineNotebook
                  answers={answers}
                  activeStepIndex={view.index}
                  isMobileDrawer
                  onCloseDrawer={() => setMobileDrawerOpen(false)}
                  onEditStep={(step) => {
                    goToView({ kind: 'question', index: step }, 'backward')
                    setMobileDrawerOpen(false)
                  }}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default App

