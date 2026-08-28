import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  changeAreaOptions,
  dailyRhythmOptions,
  pastPatternOptions,
  preferredDayOptions,
  preferredPeriodOptions,
} from './data'
import type {
  ApiResult,
  ApplicationAnswers,
  ChangeArea,
  ChoiceOption,
  ContactDetails,
  DailyRhythm,
  PastPattern,
  PreferredDay,
  PreferredPeriod,
  View,
} from './types'
import './App.css'

const FORM_VERSION = '2026.08.8'
const SCHEMA_VERSION = 'daylog-life-session-v3'
const ANSWERS_STORAGE_KEY = 'daylog-life-session-answers-v8'

const initialAnswers: ApplicationAnswers = {
  changeAreas: [],
}

const initialContact: ContactDetails = {
  displayName: '',
  age: '',
  phoneNumber: '',
  nearbyStation: '',
  preferredDays: [],
  preferredPeriods: [],
  privacyConsent: false,
  website: '',
}

const questionMeta = [
  {
    title: '요즘 나의 하루는 어떤 리듬으로 흘러가나요?',
    description: '가장 편안하게 느껴지는 하루의 흐름을 골라주세요. 코치와 함께 펼쳐볼 나의 하루 노트 첫 장에 기록됩니다.',
    stage: 'daily_rhythm_selected',
  },
  {
    title: '하루 중 내가 가장 활력 있는 순간과 지치는 순간은 언제인가요?',
    description: '에너지가 기분 좋게 차오르는 순간과, 유독 지치고 버거운 순간을 각각 자유롭게 적어주세요.',
    stage: 'energy_selected',
  },
  {
    title: '내가 무언가를 기분 좋게 오래 이어갔던 순간은 언제인가요?',
    description: '성취의 크기보다 나를 계속 움직이게 만들어주었던 나만의 지속 조건을 떠올려보세요.',
    stage: 'past_pattern_selected',
  },
  {
    title: '지금 나의 일상에서 가장 먼저 돌보고 싶은 습관은 무엇인가요?',
    description: '중요한 순서대로 눌러주세요. 선택한 순서가 그대로 1·2·3순위가 됩니다.',
    stage: 'change_area_selected',
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

type ContactErrorField = 'displayName' | 'age' | 'phoneNumber' | 'nearbyStation' | 'preferredDays' | 'preferredPeriods' | 'privacyConsent'

type ContactValidationError = {
  field: ContactErrorField
  message: string
}

function validateContact(contact: ContactDetails): ContactValidationError | null {
  if (!contact.displayName.trim()) {
    return { field: 'displayName', message: '이름을 입력해주세요.' }
  }
  const age = Number(contact.age)
  if (!/^\d{1,3}$/.test(contact.age) || !Number.isInteger(age) || age < 1 || age > 120) {
    return { field: 'age', message: '나이를 숫자로 정확히 입력해주세요.' }
  }
  if (!/^010-\d{4}-\d{4}$/.test(contact.phoneNumber)) {
    return { field: 'phoneNumber', message: '전화번호를 010-0000-0000 형식으로 입력해주세요.' }
  }
  if (!contact.nearbyStation.trim()) {
    return { field: 'nearbyStation', message: '거주지 주변 역을 입력해주세요.' }
  }
  if (contact.preferredDays.length === 0) {
    return { field: 'preferredDays', message: '인터뷰 가능한 요일을 하나 이상 선택해주세요.' }
  }
  if (contact.preferredPeriods.length === 0) {
    return { field: 'preferredPeriods', message: '인터뷰 가능한 시간대를 하나 이상 선택해주세요.' }
  }
  if (!contact.privacyConsent) {
    return { field: 'privacyConsent', message: '원활한 세션 안내를 위해 개인정보 수집·이용에 동의해주세요.' }
  }
  return null
}

function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

function App() {
  const [view, setView] = useState<View>({ kind: 'intro' })
  const [pageDirection, setPageDirection] = useState<'forward' | 'backward'>('forward')
  const [answers, setAnswers] = useState<ApplicationAnswers>(loadAnswers)
  const [contact, setContact] = useState<ContactDetails>(initialContact)
  const [error, setError] = useState('')
  const [contactErrorField, setContactErrorField] = useState<ContactErrorField | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sessionId, setSessionId] = useState(() => createId('DAYLOG-S'))
  const [requestId, setRequestId] = useState(() => createId('DAYLOG'))
  const [applicationUnlocked, setApplicationUnlocked] = useState(false)

  const headingRef = useRef<HTMLHeadingElement>(null)
  const displayNameRef = useRef<HTMLInputElement>(null)
  const ageRef = useRef<HTMLInputElement>(null)
  const phoneNumberRef = useRef<HTMLInputElement>(null)
  const nearbyStationRef = useRef<HTMLInputElement>(null)
  const preferredDaysRef = useRef<HTMLInputElement>(null)
  const preferredPeriodsRef = useRef<HTMLInputElement>(null)
  const consentRef = useRef<HTMLInputElement>(null)
  const questionErrorRef = useRef<HTMLParagraphElement>(null)
  const activeTabRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    sessionStorage.setItem(ANSWERS_STORAGE_KEY, JSON.stringify(answers))
  }, [answers])

  useEffect(() => {
    if (view.kind !== 'intro') headingRef.current?.focus()
    window.scrollTo({ top: 0, behavior: 'instant' })
    activeTabRef.current?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'auto' })
  }, [view])

  const questionIndex = view.kind === 'question' ? view.index : -1
  const filledCount = [
    answers.dailyRhythm !== undefined,
    Boolean(answers.comfortableTime?.trim() && answers.difficultTime?.trim()),
    answers.pastPattern !== undefined,
    answers.changeAreas.length > 0,
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
      schemaVersion: SCHEMA_VERSION,
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
    if (index === 1 && (!answers.comfortableTime?.trim() || !answers.difficultTime?.trim())) {
      return '활력을 얻는 순간과 지치는 순간을 각각 적어주세요.'
    }
    if (index === 2 && !answers.pastPattern) return '나에게 가장 가까운 지속 방식을 골라주세요.'
    if (index === 3 && answers.changeAreas.length === 0) return '돌보고 싶은 습관 영역을 최소 1개 이상 골라주세요.'
    return ''
  }

  function goNext() {
    if (view.kind !== 'question') return
    const validationError = validateQuestion(view.index)
    if (validationError) {
      setError(validationError)
      requestAnimationFrame(() => questionErrorRef.current?.focus())
      return
    }

    setError('')
    track(questionMeta[view.index].stage)
    if (view.index === questionMeta.length - 1) {
      goToView({ kind: 'session-info' }, 'forward')
      track('session_info_viewed')
      return
    }
    goToView({ kind: 'question', index: view.index + 1 }, 'forward')
  }

  function goBack() {
    if (view.kind === 'contact') return goToView({ kind: 'session-info' }, 'backward')
    if (view.kind === 'session-info') return goToView({ kind: 'question', index: questionMeta.length - 1 }, 'backward')
    if (view.kind === 'question' && view.index > 0) {
      return goToView({ kind: 'question', index: view.index - 1 }, 'backward')
    }
    goToView({ kind: 'intro' }, 'backward')
  }

  function beginApplication() {
    setApplicationUnlocked(true)
    goToView({ kind: 'contact' }, 'forward')
    track('application_started')
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
      return { ...current, changeAreas: next }
    })
  }

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationError = validateContact(contact)
    if (validationError) {
      setContactErrorField(validationError.field)
      setError(validationError.message)
      requestAnimationFrame(() => {
        if (validationError.field === 'displayName') displayNameRef.current?.focus()
        if (validationError.field === 'age') ageRef.current?.focus()
        if (validationError.field === 'phoneNumber') phoneNumberRef.current?.focus()
        if (validationError.field === 'nearbyStation') nearbyStationRef.current?.focus()
        if (validationError.field === 'preferredDays') preferredDaysRef.current?.focus()
        if (validationError.field === 'preferredPeriods') preferredPeriodsRef.current?.focus()
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
      age: Number(contact.age),
      nearbyStation: contact.nearbyStation.trim(),
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
    setAnswers({ ...initialAnswers })
    setContact({ ...initialContact })
    setSessionId(createId('DAYLOG-S'))
    setRequestId(createId('DAYLOG'))
    setApplicationUnlocked(false)
    setContactErrorField(null)
    setError('')
    goToView({ kind: 'intro' }, 'backward')
  }

  function goToCover() {
    goToView({ kind: 'intro' }, 'backward')
  }

  function renderChoiceCards<T extends string>(
    options: ChoiceOption<T>[],
    selected: T | undefined,
    onSelect: (value: T) => void,
    legend: string,
  ) {
    return (
      <fieldset className="question-fieldset spiral-choice-list" aria-describedby="question-description question-error">
        <legend className="sr-only">{legend}</legend>
        {options.map((option) => {
          const isSelected = selected === option.id
          return (
            <label className={`spiral-choice-card ${isSelected ? 'is-selected' : ''}`} key={option.id}>
              <input
                checked={isSelected}
                name={`choice-${questionIndex}`}
                onChange={() => onSelect(option.id)}
                type="radio"
                value={option.id}
              />
              <div className="spiral-radio-circle" aria-hidden="true">
                <span className="spiral-radio-dot" />
              </div>
              <div className="spiral-choice-content">
                <strong className="spiral-choice-title">{option.title}</strong>
                <span className="spiral-choice-desc">{option.description}</span>
              </div>
              <span className="spiral-choice-tag" aria-hidden="true">{option.marker}</span>
            </label>
          )
        })}
      </fieldset>
    )
  }

  function renderQuestion(index: number) {
    if (index === 0) {
      return renderChoiceCards<DailyRhythm>(
        dailyRhythmOptions,
        answers.dailyRhythm,
        (value) => chooseSingle('dailyRhythm', value),
        '지금의 하루와 가장 가까운 리듬 한 가지를 선택해주세요.',
      )
    }

    if (index === 1) {
      const quickComfortExamples = ['아침 7시 기상 직후', '오전 10시 몰입 시간', '퇴근 직후 저녁 7시', '밤 10시 조용한 시간']
      const quickDifficultExamples = ['오후 2~3시 나른할 때', '퇴근길 만원 지하철', '밤 11시 침대에서 폰 볼 때', '아침 출근 준비할 때']

      return (
        <div className="spiral-time-write-section">
          <div className="time-write-cards-container">
            {/* ☀️ 내가 활력을 얻는 순간 */}
            <fieldset className={`time-write-card time-card--comfort ${answers.comfortableTime?.trim() ? 'is-filled' : ''}`}>
              <legend className="time-write-title">
                <span className="time-write-icon" aria-hidden="true">☀️</span>
                내가 가장 편안하거나 활력을 얻는 순간
              </legend>
              <p className="time-write-subtitle" id="comfortable-time-hint">하루 중 에너지가 차오르고 기분 좋게 몰입되는 때를 적어주세요.</p>

              <div className="time-input-wrap">
                <label className="sr-only" htmlFor="comfortable-time">편안하거나 활력을 얻는 순간</label>
                <input
                  id="comfortable-time"
                  type="text"
                  maxLength={100}
                  aria-describedby="comfortable-time-hint question-error"
                  aria-invalid={Boolean(error && !answers.comfortableTime?.trim())}
                  aria-required="true"
                  className="clean-time-text-input"
                  placeholder="예: 아침 7시 기상 후 30분, 오전 10시 집중할 때 등"
                  value={answers.comfortableTime || ''}
                  onChange={(e) => chooseSingle('comfortableTime', e.target.value)}
                />
              </div>

              <div className="quick-example-chips">
                <span className="chips-hint-label">빠른 입력 힌트:</span>
                {quickComfortExamples.map((example) => (
                  <button
                    type="button"
                    key={example}
                    className="quick-chip-btn"
                    onClick={() => chooseSingle('comfortableTime', example)}
                  >
                    + {example}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* 🌙 내가 가장 지치는 순간 */}
            <fieldset className={`time-write-card time-card--difficult ${answers.difficultTime?.trim() ? 'is-filled' : ''}`}>
              <legend className="time-write-title">
                <span className="time-write-icon" aria-hidden="true">🌙</span>
                내가 가장 버겁거나 지치는 순간
              </legend>
              <p className="time-write-subtitle" id="difficult-time-hint">하루 중 에너지가 가라앉거나 일과에 지치는 때를 적어주세요.</p>

              <div className="time-input-wrap">
                <label className="sr-only" htmlFor="difficult-time">버겁거나 지치는 순간</label>
                <input
                  id="difficult-time"
                  type="text"
                  maxLength={100}
                  aria-describedby="difficult-time-hint question-error"
                  aria-invalid={Boolean(error && !answers.difficultTime?.trim())}
                  aria-required="true"
                  className="clean-time-text-input"
                  placeholder="예: 오후 3시 회의 끝난 뒤, 밤 11시 침대에서 폰 볼 때 등"
                  value={answers.difficultTime || ''}
                  onChange={(e) => chooseSingle('difficultTime', e.target.value)}
                />
              </div>

              <div className="quick-example-chips">
                <span className="chips-hint-label">빠른 입력 힌트:</span>
                {quickDifficultExamples.map((example) => (
                  <button
                    type="button"
                    key={example}
                    className="quick-chip-btn"
                    onClick={() => chooseSingle('difficultTime', example)}
                  >
                    + {example}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </div>
      )
    }

    if (index === 2) {
      return renderChoiceCards<PastPattern>(
        pastPatternOptions,
        answers.pastPattern,
        (value) => chooseSingle('pastPattern', value),
        '나에게 가장 가까운 지속 방식 한 가지를 선택해주세요.',
      )
    }

    if (index === 3) {
      return (
        <div className="spiral-habit-section">
          <fieldset className="question-fieldset habit-area-fieldset" aria-describedby="habit-selection-status question-error">
            <legend className="sr-only">돌보고 싶은 습관 영역을 한 개에서 세 개까지 선택해주세요.</legend>
            <div className="habit-header-bar" id="habit-selection-status" aria-live="polite">
              <span className="habit-count-tag">
                선택한 영역 <strong>{answers.changeAreas.length} / 3</strong>
              </span>
              <span className="habit-count-help">1~3개 선택</span>
            </div>

            <div className="habit-cards-grid">
              {changeAreaOptions.map((option) => {
                const selected = answers.changeAreas.includes(option.id)
                const rank = answers.changeAreas.indexOf(option.id) + 1
                return (
                  <label className={`habit-grid-card ${selected ? 'is-selected' : ''}`} key={option.id}>
                    <input
                      checked={selected}
                      onChange={() => toggleChangeArea(option.id)}
                      type="checkbox"
                      value={option.id}
                    />
                    <div className="habit-grid-top">
                      <span className="habit-marker-badge" aria-hidden="true">{option.marker}</span>
                      <div className="habit-checkbox-indicator" aria-hidden="true">
                        <span>{selected ? rank : ''}</span>
                      </div>
                    </div>
                    <div className="habit-grid-body">
                      <strong className="habit-grid-title">{option.title}</strong>
                      <span className="habit-grid-desc">{option.description}</span>
                    </div>
                    {selected && <span className="habit-primary-flag">{rank}순위</span>}
                  </label>
                )
              })}
            </div>
          </fieldset>
          <p className="ranking-help-note" aria-live="polite">
            {answers.changeAreas.length === 0
              ? '가장 바꾸고 싶은 영역부터 눌러주세요.'
              : `${answers.changeAreas.length}순위까지 정했습니다. 선택을 취소하면 뒤 순위가 자동으로 당겨집니다.`}
          </p>
        </div>
      )
    }

  }

  // Spiral ring coils for authentic notebook top header
  const spiralCoilCount = 14
  const spiralCoils = Array.from({ length: spiralCoilCount })

  // Index step tabs for clean notebook navigation
  const navTabs = [
    { id: 'intro', label: '표지', isUnlocked: true, targetView: { kind: 'intro' as const } },
    { id: 'q0', label: '01 리듬', isUnlocked: true, targetView: { kind: 'question' as const, index: 0 } },
    { id: 'q1', label: '02 온도', isUnlocked: filledCount >= 1 || (view.kind === 'question' && view.index >= 1), targetView: { kind: 'question' as const, index: 1 } },
    { id: 'q2', label: '03 지속', isUnlocked: filledCount >= 2 || (view.kind === 'question' && view.index >= 2), targetView: { kind: 'question' as const, index: 2 } },
    { id: 'q3', label: '04 습관', isUnlocked: filledCount >= 3 || (view.kind === 'question' && view.index >= 3), targetView: { kind: 'question' as const, index: 3 } },
    { id: 'session-info', label: '05 안내', isUnlocked: filledCount >= 4 || view.kind === 'session-info' || applicationUnlocked, targetView: { kind: 'session-info' as const } },
    { id: 'contact', label: '06 신청', isUnlocked: applicationUnlocked || view.kind === 'contact', targetView: { kind: 'contact' as const } },
  ]

  function isTabActive(tabId: string) {
    if (view.kind === 'intro') return tabId === 'intro'
    if (view.kind === 'question') return tabId === `q${view.index}`
    if (view.kind === 'session-info') return tabId === 'session-info'
    if (view.kind === 'contact') return tabId === 'contact'
    return false
  }

  return (
    <div className="desk-canvas">
      {/* Top Desk Ambient Header */}
      <header className="desk-header">
        <div className="desk-brand-group">
          <button className="desk-brand-btn" onClick={goToCover} type="button" aria-label="작성 내용을 유지하고 노트 표지로 이동">
            DAYLOG
          </button>
          <span className="desk-brand-sep" aria-hidden="true">/</span>
          <span className="desk-brand-title">LIFE NOTE</span>
        </div>

        <div className="desk-session-tag">
          <span className="tag-dot" aria-hidden="true" />
          <span>나만의 하루 설계</span>
        </div>
      </header>

      {/* Step Navigation Index Tabs */}
      <nav className="spiral-nav-tabs" aria-label="노트 페이지 이동">
        {navTabs.map((tab) => {
          const active = isTabActive(tab.id)
          return (
            <button
              type="button"
              key={tab.id}
              ref={active ? activeTabRef : undefined}
              className={`spiral-nav-tab ${active ? 'is-active' : ''} ${tab.isUnlocked ? 'is-unlocked' : 'is-locked'}`}
              onClick={() => {
                if (tab.isUnlocked) {
                  goToView(tab.targetView, 'forward')
                }
              }}
              disabled={!tab.isUnlocked}
              aria-current={active ? 'page' : undefined}
            >
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {/* THE SPIRAL NOTEBOOK CONTAINER */}
      <main className={`spiral-notebook-container view-${view.kind}`}>
        {/* Top Wire-O Spiral Binding Bar */}
        <div className="spiral-binding-bar" aria-hidden="true">
          <div className="spiral-binding-inner">
            {spiralCoils.map((_, idx) => (
              <div className="spiral-ring-unit" key={idx}>
                <div className="spiral-hole" />
                <div className="spiral-metal-ring" />
              </div>
            ))}
          </div>
        </div>

        {/* Main Notebook Paper Sheet */}
        <div className={`spiral-page-sheet ${pageDirection === 'forward' ? 'page-turn-forward' : 'page-turn-backward'}`}>
          {/* Vertical Red Margin Gutter Line */}
          <div className="notebook-red-margin" aria-hidden="true" />

          {/* =========================================================================
              VIEW: INTRO (Cover & Introduction Page)
             ========================================================================= */}
          {view.kind === 'intro' && (
            <div className="notebook-page-content intro-page">
              <div className="intro-header-badge">
                <span className="gold-star-icon" aria-hidden="true">✦</span>
                <span>DAYLOG LIFE NOTE</span>
              </div>

              <div className="intro-headline-section">
                <h1 id="intro-title" className="intro-main-title">
                  나에게 맞는<br />
                  <mark className="highlighter-text">하루를 설계해볼게요.</mark>
                </h1>
                <p className="intro-sub-lead">
                  완벽한 계획표가 아니어도 괜찮아요. 요즘의 리듬과 에너지, 가장 먼저 돌보고 싶은 생활 습관을 네 번의 짧은 질문으로 함께 짚어봅니다.
                </p>
                <p className="intro-flow-note">4개 질문 · 약 3분 · 답변 후 바로 연락 신청</p>
              </div>

              {/* Intro CTA */}
              <div className="intro-cta-section">
                <button className="notebook-primary-btn" type="button" onClick={startExperience}>
                  <span className="btn-label-text">노트 작성하고 신청하기</span>
                  <span className="btn-circle-arrow" aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          )}

          {/* =========================================================================
              VIEW: QUESTIONS 01 ~ 04 (One Step, One Focus Page)
             ========================================================================= */}
          {view.kind === 'question' && (
            <div className="notebook-page-content question-page">
              {/* Question Heading Group */}
              <div className="question-title-wrap">
                <h1 id="question-title" ref={headingRef} tabIndex={-1} className="question-heading">
                  {questionMeta[view.index].title}
                </h1>
                <p className="question-sub-desc" id="question-description">{questionMeta[view.index].description}</p>
              </div>

              {/* Interactive Form Component */}
              <div className="question-body-section">
                {renderQuestion(view.index)}
              </div>

              <p
                className={error ? 'notebook-error-msg' : 'sr-only'}
                id="question-error"
                ref={questionErrorRef}
                role={error ? 'alert' : undefined}
                aria-live="assertive"
                tabIndex={error ? -1 : undefined}
              >
                {error ? `⚠️ ${error}` : '현재 입력 오류가 없습니다.'}
              </p>

              {/* Bottom Navigation Buttons */}
              <div className="question-actions-bar">
                <button className="notebook-secondary-btn" onClick={goBack} type="button">
                  ← 이전
                </button>
                <button
                  className="notebook-primary-btn notebook-primary-btn--compact"
                  onClick={goNext}
                  type="button"
                >
                  <span className="btn-label-text">
                    {view.index === questionMeta.length - 1 ? '프로그램 안내 보기' : '다음 질문으로'}
                  </span>
                  <span className="btn-circle-arrow" aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          )}

          {/* =========================================================================
              VIEW: SESSION INFO (Program Description)
             ========================================================================= */}
          {view.kind === 'session-info' && (
            <div className="notebook-page-content session-info-page">
              <div className="session-info-header">
                <span className="contact-step-tag">05 · EXPERIENCE PROGRAM</span>
                <p className="session-info-kicker">체험 프로그램</p>
                <h1 id="session-info-title" ref={headingRef} tabIndex={-1} className="session-info-title">
                  “당신의 하루를 들려주세요.”
                </h1>
                <p className="session-info-summary">60분 오프라인 1:1 LIFE SESSION</p>
                <p className="session-info-principle">처음부터 루틴을 판매하지 않습니다.<br />한 사람과 한 시간 동안 이야기를 나눕니다.</p>
              </div>

              <ol className="session-timeline" aria-label="LIFE SESSION 진행 순서">
                {[
                  ['10분', '나의 하루', '요즘 어떻게 살고 있는지 이야기합니다.'],
                  ['15분', '나의 이야기', '성격 · 경험 · 좋아하는 것 · 싫어하는 것 · 가치관'],
                  ['15분', '내가 원하는 변화', '꿈 · 목표 · 바꾸고 싶은 것'],
                  ['10분', '생활 패턴 발견', '반복되는 행동과 방해 요인을 함께 찾습니다.'],
                  ['10분', '첫 번째 루틴', '당장 시작할 수 있는 행동 1~3개를 함께 정합니다.'],
                ].map(([time, title, description]) => (
                  <li className="session-timeline-item" key={title}>
                    <span className="session-time-badge">{time}</span>
                    <div>
                      <strong>{title}</strong>
                      <p>{description}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <p className="session-followup-note">그리고 일주일 후 다시 만납니다.</p>

              <div className="question-actions-bar">
                <button className="notebook-secondary-btn" onClick={goBack} type="button">← 습관 순위로</button>
                <button className="notebook-primary-btn notebook-primary-btn--compact" onClick={beginApplication} type="button">
                  <span className="btn-label-text">신청 정보 입력하기</span>
                  <span className="btn-circle-arrow" aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          )}

          {/* =========================================================================
              VIEW: CONTACT (Required application details)
             ========================================================================= */}
          {view.kind === 'contact' && (
            <div className="notebook-page-content contact-page">
              <div className="contact-page-header">
                <span className="contact-step-tag">06 · APPLICATION</span>
                <h1 id="contact-title" ref={headingRef} tabIndex={-1} className="contact-main-heading">
                  LIFE SESSION을 신청해주세요.
                </h1>
                <p className="contact-lead-text">
                  남겨주신 정보를 확인한 뒤 전화 또는 문자로 인터뷰 일정을 조율합니다.
                </p>
              </div>

              <div className="contact-memo-card">
                <div className="memo-fact-item">
                  <span className="memo-icon" aria-hidden="true">📍</span>
                  <div>
                    <strong>오프라인 1:1</strong>
                    <span>장소는 거주지 주변 역을 참고해 조율</span>
                  </div>
                </div>
                <div className="memo-fact-item">
                  <span className="memo-icon" aria-hidden="true">⏱️</span>
                  <div>
                    <strong>60분 인터뷰</strong>
                    <span>하루와 변화에 관한 대화</span>
                  </div>
                </div>
                <div className="memo-fact-item">
                  <span className="memo-icon" aria-hidden="true">🔒</span>
                  <div>
                    <strong>3개월 보관</strong>
                    <span>신청 확인과 인터뷰 안내 목적으로만 사용</span>
                  </div>
                </div>
              </div>

              <form className="contact-form-sheet" onSubmit={submitApplication} noValidate>
                <div className="form-group-card">
                  <div className="group-card-header">
                    <span className="group-num-pill">01</span>
                    <div>
                      <strong className="group-title">이름 <em className="star-required">*</em></strong>
                      <p className="group-sub">신청자 확인에 사용할 이름을 적어주세요.</p>
                    </div>
                  </div>
                  <label className="sr-only" htmlFor="display-name">이름</label>
                  <input
                    id="display-name"
                    autoComplete="name"
                    maxLength={50}
                    aria-describedby={contactErrorField === 'displayName' ? 'contact-error' : undefined}
                    aria-invalid={contactErrorField === 'displayName'}
                    className={`notebook-text-input ${contactErrorField === 'displayName' ? 'has-error' : ''}`}
                    onChange={(event) => updateContact({ displayName: event.target.value })}
                    placeholder="예: 김데이"
                    ref={displayNameRef}
                    required
                    value={contact.displayName}
                  />
                </div>

                <div className="contact-fields-grid">
                  <div className="form-group-card">
                    <div className="group-card-header">
                      <span className="group-num-pill">02</span>
                      <div>
                        <strong className="group-title">나이 <em className="star-required">*</em></strong>
                        <p className="group-sub">현재 나이를 숫자로 입력해주세요.</p>
                      </div>
                    </div>
                    <label className="sr-only" htmlFor="age">나이</label>
                    <input
                      id="age"
                      aria-describedby={contactErrorField === 'age' ? 'contact-error' : undefined}
                      aria-invalid={contactErrorField === 'age'}
                      className={`notebook-text-input ${contactErrorField === 'age' ? 'has-error' : ''}`}
                      inputMode="numeric"
                      maxLength={3}
                      onChange={(event) => updateContact({ age: event.target.value.replace(/\D/g, '').slice(0, 3) })}
                      placeholder="예: 29"
                      ref={ageRef}
                      required
                      value={contact.age}
                    />
                  </div>

                  <div className="form-group-card">
                    <div className="group-card-header">
                      <span className="group-num-pill">03</span>
                      <div>
                        <strong className="group-title">전화번호 <em className="star-required">*</em></strong>
                        <p className="group-sub">전화 또는 문자로 일정 안내를 드립니다.</p>
                      </div>
                    </div>
                    <label className="sr-only" htmlFor="phone-number">전화번호</label>
                    <input
                      id="phone-number"
                      autoComplete="tel"
                      aria-describedby={contactErrorField === 'phoneNumber' ? 'contact-error' : 'phone-format-help'}
                      aria-invalid={contactErrorField === 'phoneNumber'}
                      className={`notebook-text-input ${contactErrorField === 'phoneNumber' ? 'has-error' : ''}`}
                      inputMode="tel"
                      maxLength={13}
                      onChange={(event) => updateContact({ phoneNumber: formatPhoneNumber(event.target.value) })}
                      placeholder="010-0000-0000"
                      ref={phoneNumberRef}
                      required
                      value={contact.phoneNumber}
                    />
                    <small className="field-format-help" id="phone-format-help">숫자를 입력하면 하이픈이 자동으로 들어갑니다.</small>
                  </div>
                </div>

                <div className="form-group-card">
                  <div className="group-card-header">
                    <span className="group-num-pill">04</span>
                    <div>
                      <strong className="group-title">거주지 주변 역 <em className="star-required">*</em></strong>
                      <p className="group-sub">상세 주소가 아닌 만나기 편한 지하철역만 알려주세요.</p>
                    </div>
                  </div>
                  <label className="sr-only" htmlFor="nearby-station">거주지 주변 역</label>
                  <input
                    id="nearby-station"
                    maxLength={50}
                    aria-describedby={contactErrorField === 'nearbyStation' ? 'contact-error' : undefined}
                    aria-invalid={contactErrorField === 'nearbyStation'}
                    className={`notebook-text-input ${contactErrorField === 'nearbyStation' ? 'has-error' : ''}`}
                    onChange={(event) => updateContact({ nearbyStation: event.target.value })}
                    placeholder="예: 2호선 성수역"
                    ref={nearbyStationRef}
                    required
                    value={contact.nearbyStation}
                  />
                </div>

                <fieldset className={`form-group-card schedule-group ${contactErrorField === 'preferredDays' || contactErrorField === 'preferredPeriods' ? 'has-error' : ''}`}>
                  <legend className="sr-only">인터뷰 가능한 요일과 시간대</legend>
                  <div className="group-card-header">
                    <span className="group-num-pill">05</span>
                    <div>
                      <strong className="group-title">인터뷰 가능 요일 및 시간대 <em className="star-required">*</em></strong>
                      <p className="group-sub">가능한 항목을 모두 선택해주세요. ‘상관없음’은 단독 선택됩니다.</p>
                    </div>
                  </div>

                  <div className="schedule-picker-section">
                    <strong className="sub-field-label">가능 요일</strong>
                    <div className="chips-picker-row">
                      {preferredDayOptions.map((option, index) => {
                        const isSelected = contact.preferredDays.includes(option.id)
                        return (
                          <label className={`choice-chip-btn ${isSelected ? 'is-selected' : ''}`} key={option.id}>
                            <input
                              checked={isSelected}
                              onChange={() => updateContact({
                                preferredDays: toggleExclusive<PreferredDay>(contact.preferredDays, option.id, 'flexible'),
                              })}
                              ref={index === 0 ? preferredDaysRef : undefined}
                              type="checkbox"
                            />
                            <span>{option.label}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  <div className="schedule-picker-section">
                    <strong className="sub-field-label">가능 시간대</strong>
                    <div className="chips-picker-row">
                      {preferredPeriodOptions.map((option, index) => {
                        const isSelected = contact.preferredPeriods.includes(option.id)
                        return (
                          <label className={`choice-chip-btn ${isSelected ? 'is-selected' : ''}`} key={option.id}>
                            <input
                              checked={isSelected}
                              onChange={() => updateContact({
                                preferredPeriods: toggleExclusive<PreferredPeriod>(contact.preferredPeriods, option.id, 'flexible'),
                              })}
                              ref={index === 0 ? preferredPeriodsRef : undefined}
                              type="checkbox"
                            />
                            <span>{option.label}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </fieldset>

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

                <div className={`privacy-consent-card ${contactErrorField === 'privacyConsent' ? 'has-error' : ''}`}>
                  <div className="privacy-policy-copy">
                    <strong className="consent-title">개인정보 수집 및 이용 안내</strong>
                    <dl className="privacy-policy-list">
                      <div>
                        <dt>수집 항목</dt>
                        <dd>이름, 나이, 전화번호, 거주지 주변 역, 인터뷰 가능 요일 및 시간대, LIFE NOTE 응답</dd>
                      </div>
                      <div>
                        <dt>수집 목적</dt>
                        <dd>체험 프로그램 신청 접수, 참여자 확인, 인터뷰 일정 안내 및 세션 준비</dd>
                      </div>
                      <div>
                        <dt>보유 기간</dt>
                        <dd>신청일로부터 3개월 후 파기</dd>
                      </div>
                    </dl>
                  </div>
                  <label className="consent-checkbox-label consent-checkbox-label--boxed">
                    <input
                      checked={contact.privacyConsent}
                      aria-describedby={contactErrorField === 'privacyConsent' ? 'contact-error' : undefined}
                      aria-invalid={contactErrorField === 'privacyConsent'}
                      onChange={(event) => updateContact({ privacyConsent: event.target.checked })}
                      ref={consentRef}
                      required
                      type="checkbox"
                    />
                    <span className="consent-title">[필수] 위 개인정보 수집 및 이용에 동의합니다.</span>
                  </label>
                </div>

                {error && <p className="notebook-error-msg" id="contact-error" role="alert" aria-live="polite">⚠️ {error}</p>}

                <div className="contact-actions-bar">
                  <button className="notebook-secondary-btn" onClick={goBack} type="button">
                    ← 프로그램 안내로
                  </button>
                  <button className="notebook-primary-btn" disabled={submitting} type="submit">
                    <span className="btn-label-text">{submitting ? '신청 접수하는 중…' : 'LIFE SESSION 신청하기'}</span>
                    {!submitting && <span className="btn-circle-arrow" aria-hidden="true">→</span>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* =========================================================================
              VIEW: SUCCESS (Completed Invitation Receipt)
             ========================================================================= */}
          {view.kind === 'success' && (
            <div className="notebook-page-content success-page">
              <div className="success-stamp-seal" aria-hidden="true">
                <div className="seal-ring">
                  <span className="seal-star">✦</span>
                  <strong className="seal-txt">기록 완료</strong>
                  <span className="seal-brand">DAYLOG 2026</span>
                </div>
              </div>

              <div className="success-headline-wrap">
                <span className="success-badge">APPLICATION RECEIVED</span>
                <h1 id="success-title" ref={headingRef} tabIndex={-1} className="success-title">
                  이제 직접 만나<br />함께 살펴볼게요.
                </h1>
                <p className="success-sub">
                  작성해주신 답변이 코치에게 전달되었습니다. 남겨주신 연락처로 확인 후 일정 조율 안내를 드리겠습니다.
                </p>
              </div>

              <div className="success-receipt-card">
                <div className="receipt-row-item">
                  <span className="receipt-item-label">신청 접수 번호</span>
                  <strong className="receipt-item-val receipt-code">{view.requestId}</strong>
                </div>
                <div className="receipt-row-item">
                  <span className="receipt-item-label">신청자 호칭</span>
                  <strong className="receipt-item-val">{contact.displayName || '신청자'}님</strong>
                </div>
                <div className="receipt-row-item">
                  <span className="receipt-item-label">세션 프로그램</span>
                  <strong className="receipt-item-val">1:1 Life Session (60분 오프라인)</strong>
                </div>
                <div className="receipt-row-item">
                  <span className="receipt-item-label">진행 장소</span>
                  <strong className="receipt-item-val">상세 장소 개별 안내</strong>
                </div>
                <div className="receipt-row-item">
                  <span className="receipt-item-label">준비물</span>
                  <strong className="receipt-item-val">가벼운 마음 (추가 준비물 없음)</strong>
                </div>
              </div>

              <div className="success-bottom-bar">
                <button className="notebook-secondary-btn" onClick={restart} type="button">
                  첫 화면(다이어리 표지)으로 돌아가기
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
