import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  changeAreaOptions,
  dailyRhythmOptions,
  labels,
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
  ContactMethod,
  DailyRhythm,
  PastPattern,
  PreferredDay,
  PreferredPeriod,
  View,
} from './types'
import './App.css'

const FORM_VERSION = '2026.08.6'
const SCHEMA_VERSION = 'daylog-life-session-v1'
const ANSWERS_STORAGE_KEY = 'daylog-life-session-answers-v6'

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
    label: '나의 리듬',
    shortTitle: '하루 리듬',
    title: '요즘 나의 하루는 어떤 리듬으로 흘러가나요?',
    description: '가장 편안하게 느껴지는 하루의 흐름을 골라주세요. 코치와 함께 펼쳐볼 나의 하루 노트 첫 장에 기록됩니다.',
    stage: 'daily_rhythm_selected',
  },
  {
    step: '02',
    label: '하루의 온도',
    shortTitle: '에너지 순간',
    title: '하루 중 내가 가장 활력 있는 순간과 지치는 순간은 언제인가요?',
    description: '에너지가 기분 좋게 차오르는 순간과, 유독 지치고 버거운 순간을 각각 자유롭게 적어주세요.',
    stage: 'energy_selected',
  },
  {
    step: '03',
    label: '지속의 조건',
    shortTitle: '지속 조건',
    title: '내가 무언가를 기분 좋게 오래 이어갔던 순간은 언제인가요?',
    description: '성취의 크기보다 나를 계속 움직이게 만들어주었던 나만의 지속 조건을 떠올려보세요.',
    stage: 'past_pattern_selected',
  },
  {
    step: '04',
    label: '돌볼 습관',
    shortTitle: '습관 영역',
    title: '지금 나의 일상에서 가장 먼저 돌보고 싶은 습관은 무엇인가요?',
    description: '1~3개를 선택한 뒤, 첫 번째 1:1 라이프 세션에서 가장 깊이 다룰 1순위 영역을 지정해주세요.',
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

function contactPlaceholder(method: ContactMethod) {
  if (method === 'email') return 'hello@example.com'
  if (method === 'messenger') return '카카오톡 ID 또는 메신저 ID'
  return '010-0000-0000'
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
    Boolean(answers.comfortableTime?.trim() && answers.difficultTime?.trim()),
    answers.pastPattern !== undefined,
    answers.primaryChangeArea !== undefined,
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
    if (index === 1 && (!answers.comfortableTime?.trim() || !answers.difficultTime?.trim())) {
      return '활력을 얻는 순간과 지치는 순간을 각각 적어주세요.'
    }
    if (index === 2 && !answers.pastPattern) return '나에게 가장 가까운 지속 방식을 골라주세요.'
    if (index === 3 && answers.changeAreas.length === 0) return '돌보고 싶은 습관 영역을 최소 1개 이상 골라주세요.'
    if (index === 3 && !answers.primaryChangeArea) return '가장 먼저 집중할 1순위 영역을 정해주세요.'
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
      goToView({ kind: 'contact' }, 'forward')
      track('application_started')
      return
    }
    goToView({ kind: 'question', index: view.index + 1 }, 'forward')
  }

  function goBack() {
    if (view.kind === 'contact') return goToView({ kind: 'question', index: questionMeta.length - 1 }, 'backward')
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
      <div className="spiral-choice-list" role="radiogroup">
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
      const quickComfortExamples = ['아침 7시 기상 직후', '오전 10시 몰입 시간', '퇴근 직후 저녁 7시', '밤 10시 조용한 시간']
      const quickDifficultExamples = ['오후 2~3시 나른할 때', '퇴근길 만원 지하철', '밤 11시 침대에서 폰 볼 때', '아침 출근 준비할 때']

      return (
        <div className="spiral-time-write-section">
          <div className="time-write-cards-container">
            {/* ☀️ 내가 활력을 얻는 순간 */}
            <div className={`time-write-card time-card--comfort ${answers.comfortableTime?.trim() ? 'is-filled' : ''}`}>
              <div className="time-write-header">
                <div className="time-write-title-wrap">
                  <span className="time-write-icon" aria-hidden="true">☀️</span>
                  <div>
                    <strong className="time-write-title">내가 가장 편안하거나 활력을 얻는 순간</strong>
                    <span className="time-write-subtitle">하루 중 에너지가 차오르고 기분 좋게 몰입되는 때를 적어주세요.</span>
                  </div>
                </div>
              </div>

              <div className="time-input-wrap">
                <input
                  type="text"
                  maxLength={100}
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
            </div>

            {/* 🌙 내가 가장 지치는 순간 */}
            <div className={`time-write-card time-card--difficult ${answers.difficultTime?.trim() ? 'is-filled' : ''}`}>
              <div className="time-write-header">
                <div className="time-write-title-wrap">
                  <span className="time-write-icon" aria-hidden="true">🌙</span>
                  <div>
                    <strong className="time-write-title">내가 가장 버겁거나 지치는 순간</strong>
                    <span className="time-write-subtitle">하루 중 에너지가 가라앉거나 일과에 지치는 때를 적어주세요.</span>
                  </div>
                </div>
              </div>

              <div className="time-input-wrap">
                <input
                  type="text"
                  maxLength={100}
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
            </div>
          </div>
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
        <div className="spiral-habit-section">
          <div className="habit-header-bar">
            <span className="habit-count-tag">
              선택한 습관 영역: <strong>{answers.changeAreas.length} / 3개</strong> (1~3개 선택 가능)
            </span>
          </div>

          <div className="habit-cards-grid">
            {changeAreaOptions.map((option) => {
              const selected = answers.changeAreas.includes(option.id)
              const isPrimary = answers.primaryChangeArea === option.id
              return (
                <label className={`habit-grid-card ${selected ? 'is-selected' : ''}`} key={option.id}>
                  <input
                    checked={selected}
                    onChange={() => toggleChangeArea(option.id)}
                    type="checkbox"
                    value={option.id}
                  />
                  <div className="habit-grid-top">
                    <span className="habit-marker-badge">{option.marker}</span>
                    <div className="habit-checkbox-indicator" aria-hidden="true">
                      <span>{selected ? '✓' : ''}</span>
                    </div>
                  </div>
                  <div className="habit-grid-body">
                    <strong className="habit-grid-title">{option.title}</strong>
                    <span className="habit-grid-desc">{option.description}</span>
                  </div>
                  {isPrimary && <span className="habit-primary-flag" aria-label="1순위 지정">1순위</span>}
                </label>
              )
            })}
          </div>

          {answers.changeAreas.length > 0 && (
            <div className="priority-select-panel scene-enter">
              <div className="priority-panel-header">
                <span className="priority-pin-emoji" aria-hidden="true">📌</span>
                <div>
                  <strong className="priority-panel-title">그중 첫 번째 세션에서 가장 먼저 돌보고 싶은 1순위는?</strong>
                  <p className="priority-panel-subtitle">선택하신 {answers.changeAreas.length}개 영역 중 가장 깊이 다루고 싶은 주제를 1개 지정해주세요.</p>
                </div>
              </div>
              <div className="priority-chips-row">
                {answers.changeAreas.map((area) => {
                  const isPrimary = answers.primaryChangeArea === area
                  return (
                    <label className={`priority-pill-chip ${isPrimary ? 'is-primary' : ''}`} key={area}>
                      <input
                        checked={isPrimary}
                        name="primary-change-area"
                        onChange={() => chooseSingle('primaryChangeArea', area)}
                        type="radio"
                      />
                      <span className="priority-dot" aria-hidden="true" />
                      <span className="priority-label">{labels.changeArea[area]}</span>
                      {isPrimary && <span className="priority-tag">1순위</span>}
                    </label>
                  )
                })}
              </div>
            </div>
          )}
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
    { id: 'contact', label: '신청', isUnlocked: filledCount >= 4 || view.kind === 'contact', targetView: { kind: 'contact' as const } },
  ]

  function isTabActive(tabId: string) {
    if (view.kind === 'intro') return tabId === 'intro'
    if (view.kind === 'question') return tabId === `q${view.index}`
    if (view.kind === 'contact') return tabId === 'contact'
    return false
  }

  return (
    <div className="desk-canvas">
      {/* Top Desk Ambient Header */}
      <header className="desk-header">
        <div className="desk-brand-group">
          <button className="desk-brand-btn" onClick={restart} type="button" aria-label="노트 표지로 이동">
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
                  완벽한 계획표가 아니어도 괜찮아요. 요즘의 리듬, 내가 편안한 순간, 가장 먼저 돌보고 싶은 생활 습관을 하나씩 짚어가며 나만의 하루 노트를 완성합니다.
                </p>
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
              VIEW: QUESTIONS 01 ~ 05 (One Step, One Focus Page)
             ========================================================================= */}
          {view.kind === 'question' && (
            <div className="notebook-page-content question-page">
              {/* Question Heading Group */}
              <div className="question-title-wrap">
                <h1 id="question-title" ref={headingRef} tabIndex={-1} className="question-heading">
                  {questionMeta[view.index].title}
                </h1>
                <p className="question-sub-desc">{questionMeta[view.index].description}</p>
              </div>

              {/* Interactive Form Component */}
              <div className="question-body-section">
                {renderQuestion(view.index)}
              </div>

              {error && (
                <p className="notebook-error-msg" role="alert" aria-live="polite">
                  ⚠️ {error}
                </p>
              )}

              {/* Bottom Navigation Buttons */}
              <div className="question-actions-bar">
                <button className="notebook-secondary-btn" onClick={goBack} type="button">
                  ← 이전
                </button>
                <button
                  className="notebook-primary-btn notebook-primary-btn--compact"
                  disabled={Boolean(validateQuestion(view.index))}
                  onClick={goNext}
                  type="button"
                >
                  <span className="btn-label-text">
                    {view.index === questionMeta.length - 1 ? '나의 하루 초안 확인하기' : '다음으로'}
                  </span>
                  <span className="btn-circle-arrow" aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          )}

          {/* =========================================================================
              VIEW: CONTACT (1:1 세션 신청서 & 예약 조율)
             ========================================================================= */}
          {view.kind === 'contact' && (
            <div className="notebook-page-content contact-page">
              <div className="contact-page-header">
                <span className="contact-step-tag">APPLICATION · 1:1 세션 신청서</span>
                <h1 id="contact-title" ref={headingRef} tabIndex={-1} className="contact-main-heading">
                  직접 만나 이야기해볼까요?
                </h1>
                <p className="contact-lead-text">
                  신청서를 남겨주시면 코치가 다이어리를 확인한 뒤 <strong>24시간 이내</strong>에 편하신 방법으로 일정 확정 연락을 드립니다.
                </p>
              </div>

              {/* Session Assurance Memo Box */}
              <div className="contact-memo-card">
                <div className="memo-fact-item">
                  <span className="memo-icon" aria-hidden="true">📍</span>
                  <div>
                    <strong>진행 공간</strong>
                    <span>서울 1:1 오프라인 전용 공간</span>
                  </div>
                </div>
                <div className="memo-fact-item">
                  <span className="memo-icon" aria-hidden="true">⏱️</span>
                  <div>
                    <strong>세션 시간</strong>
                    <span>60분 1:1 밀착 세션</span>
                  </div>
                </div>
                <div className="memo-fact-item">
                  <span className="memo-icon" aria-hidden="true">🔒</span>
                  <div>
                    <strong>안심 약속</strong>
                    <span>일정 조율과 맞춤 루틴 준비에만 안전하게 사용</span>
                  </div>
                </div>
              </div>

              <form className="contact-form-sheet" onSubmit={submitApplication} noValidate>
                {/* Field 01: Name */}
                <div className="form-group-card">
                  <div className="group-card-header">
                    <span className="group-num-pill">01</span>
                    <div>
                      <strong className="group-title">어떻게 불러드리면 될까요? <em className="star-required">*</em></strong>
                      <p className="group-sub">실명 또는 세션에서 불리고 싶은 호칭</p>
                    </div>
                  </div>
                  <input
                    autoComplete="name"
                    maxLength={50}
                    aria-describedby={contactErrorField === 'displayName' ? 'contact-error' : undefined}
                    aria-invalid={contactErrorField === 'displayName'}
                    className={`notebook-text-input ${contactErrorField === 'displayName' ? 'has-error' : ''}`}
                    onChange={(event) => updateContact({ displayName: event.target.value })}
                    placeholder="예: 원영"
                    ref={displayNameRef}
                    required
                    value={contact.displayName}
                  />
                </div>

                {/* Field 02: Contact Method & Value */}
                <div className="form-group-card">
                  <div className="group-card-header">
                    <span className="group-num-pill">02</span>
                    <div>
                      <strong className="group-title">어떤 방법으로 연락드릴까요? <em className="star-required">*</em></strong>
                      <p className="group-sub">세션 일정 조율에만 소중히 활용됩니다.</p>
                    </div>
                  </div>

                  <div className="method-tabs-row">
                    {(['phone', 'email', 'messenger'] as ContactMethod[]).map((method) => (
                      <label className={`method-tab-btn ${contact.contactMethod === method ? 'is-active' : ''}`} key={method}>
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
                    className={`notebook-text-input ${contactErrorField === 'contactValue' ? 'has-error' : ''}`}
                    onChange={(event) => updateContact({ contactValue: event.target.value })}
                    placeholder={contactPlaceholder(contact.contactMethod)}
                    ref={contactValueRef}
                    required
                    value={contact.contactValue}
                  />
                </div>

                {/* Field 03: Optional Schedule & Note Accordion */}
                <details className="form-accordion-card">
                  <summary className="accordion-header-row">
                    <div className="accordion-title-wrap">
                      <span className="accordion-icon" aria-hidden="true">🗓️</span>
                      <div>
                        <strong>희망 일정과 메모 남기기</strong>
                        <span>선택 사항 · 지금 정하지 않고 나중에 조율해도 괜찮습니다.</span>
                      </div>
                    </div>
                    <span className="accordion-chevron" aria-hidden="true">▼</span>
                  </summary>

                  <div className="accordion-content-body">
                    <div className="sub-field-box">
                      <strong className="sub-field-label">만나기 편한 요일 <i>(선택)</i></strong>
                      <div className="chips-picker-row">
                        {preferredDayOptions.map((option) => {
                          const isSelected = contact.preferredDays.includes(option.id)
                          return (
                            <label className={`choice-chip-btn ${isSelected ? 'is-selected' : ''}`} key={option.id}>
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

                    <div className="sub-field-box">
                      <strong className="sub-field-label">편한 시간대 <i>(선택)</i></strong>
                      <div className="chips-picker-row">
                        {preferredPeriodOptions.map((option) => {
                          const isSelected = contact.preferredPeriods.includes(option.id)
                          return (
                            <label className={`choice-chip-btn ${isSelected ? 'is-selected' : ''}`} key={option.id}>
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

                    <div className="sub-field-box">
                      <strong className="sub-field-label">세션 전 전하고 싶은 이야기 <i>(선택)</i></strong>
                      <div className="textarea-wrapper">
                        <textarea
                          maxLength={500}
                          className="notebook-textarea"
                          onChange={(event) => updateContact({ additionalNote: event.target.value })}
                          placeholder="궁금한 점이나 세션 전 코치에게 전하고 싶은 이야기가 있다면 편안하게 남겨주세요."
                          rows={3}
                          value={contact.additionalNote}
                        />
                        <small className="char-counter">{contact.additionalNote.length} / 500자</small>
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
                <div className={`privacy-consent-card ${contactErrorField === 'privacyConsent' ? 'has-error' : ''}`}>
                  <label className="consent-checkbox-label">
                    <input
                      checked={contact.privacyConsent}
                      aria-describedby={contactErrorField === 'privacyConsent' ? 'contact-error' : undefined}
                      aria-invalid={contactErrorField === 'privacyConsent'}
                      onChange={(event) => updateContact({ privacyConsent: event.target.checked })}
                      ref={consentRef}
                      required
                      type="checkbox"
                    />
                    <div className="consent-text-wrap">
                      <strong className="consent-title">[필수] 개인정보 수집 및 이용 동의</strong>
                      <p className="consent-body">
                        1:1 Life Session 일정 안내 및 본인 확인을 위해 이름(호칭)과 연락처를 수집합니다.
                        기록해주신 다이어리 내용은 오직 맞춤 세션 준비에만 활용되며 안전하게 보호됩니다.
                      </p>
                    </div>
                  </label>
                </div>

                {error && <p className="notebook-error-msg" id="contact-error" role="alert" aria-live="polite">⚠️ {error}</p>}

                {/* Submit Actions Bar */}
                <div className="contact-actions-bar">
                  <button className="notebook-secondary-btn" onClick={goBack} type="button">
                    ← 다이어리 요약
                  </button>
                  <button className="notebook-primary-btn" disabled={submitting} type="submit">
                    <span className="btn-label-text">{submitting ? '신청 접수하는 중…' : '1:1 Life Session 예약 완료하기'}</span>
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
                <span className="success-badge">RESERVATION CONFIRMED</span>
                <h1 id="success-title" ref={headingRef} tabIndex={-1} className="success-title">
                  이제 직접 만나<br />함께 살펴볼게요.
                </h1>
                <p className="success-sub">
                  작성해주신 하루 다이어리가 코치에게 전달되었습니다. <strong>24시간 이내</strong>에 남겨주신 연락처로 일정 확정 안내를 드리겠습니다.
                </p>
              </div>

              <div className="success-receipt-card">
                <div className="receipt-row-item">
                  <span className="receipt-item-label">예약 접수 번호</span>
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
                  <strong className="receipt-item-val">서울 1:1 오프라인 전용 공간</strong>
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
