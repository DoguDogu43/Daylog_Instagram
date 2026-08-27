import { useEffect, useRef, useState, type FormEvent } from 'react'
import { RoutineNotebook } from './RoutineNotebook'
import {
  changeAreaOptions,
  dailyRhythmOptions,
  labels,
  pastPatternOptions,
  preferredDayOptions,
  preferredPeriodOptions,
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

const FORM_VERSION = '2026.08.2'
const SCHEMA_VERSION = 'daylog-life-session-v1'
const ANSWERS_STORAGE_KEY = 'daylog-life-session-answers-v2'

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
    label: '오늘의 리듬',
    title: '요즘 하루는 어떤 리듬으로 흘러가나요?',
    description: '가장 가깝게 느껴지는 하루를 골라주세요.',
    stage: 'daily_rhythm_selected',
  },
  {
    label: '하루의 온도',
    title: '하루 중 가장 편안한 시간과 가장 힘든 시간은 언제인가요?',
    description: '가장 가까운 시간 두 개를 골라주세요.',
    stage: 'energy_selected',
  },
  {
    label: '오래간 것의 이유',
    title: '오래 이어가 본 일이 있나요?',
    description: '성취의 크기보다 그것을 이어가게 한 조건을 떠올려봐요.',
    stage: 'past_pattern_selected',
  },
  {
    label: '바꾸고 싶은 한 줄',
    title: '지금 가장 먼저 바꾸고 싶은 곳은 어디인가요?',
    description: '1~3개를 고른 뒤, 그중 가장 먼저 다룰 한 가지를 정해주세요.',
    stage: 'change_area_selected',
  },
  {
    label: '함께하는 방법',
    title: '어떤 방식이면 조금 더 오래 이어갈 수 있을까요?',
    description: '당신이 원하는 도움의 방식을 골라주세요.',
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

type ContactErrorField = 'displayName' | 'contactValue' | 'privacyConsent'

type ContactValidationError = {
  field: ContactErrorField
  message: string
}

function validateContact(contact: ContactDetails): ContactValidationError | null {
  if (!contact.displayName.trim()) {
    return { field: 'displayName', message: '이름 또는 불리고 싶은 호칭을 적어주세요.' }
  }
  if (!contact.contactValue.trim()) {
    return { field: 'contactValue', message: '연락받을 정보를 적어주세요.' }
  }
  if (contact.contactMethod === 'phone' && !/^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(contact.contactValue)) {
    return { field: 'contactValue', message: '휴대전화 번호를 확인해주세요.' }
  }
  if (contact.contactMethod === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.contactValue)) {
    return { field: 'contactValue', message: '이메일 주소를 확인해주세요.' }
  }
  if (contact.contactMethod === 'messenger' && contact.contactValue.trim().length < 2) {
    return { field: 'contactValue', message: '메신저 ID를 확인해주세요.' }
  }
  if (!contact.privacyConsent) {
    return { field: 'privacyConsent', message: '신청을 위해 개인정보 수집·이용에 동의해주세요.' }
  }
  return null
}

function App() {
  const [view, setView] = useState<View>({ kind: 'intro' })
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
  const progress = questionIndex >= 0 ? (questionIndex + 1) / questionMeta.length : view.kind === 'intro' ? 0 : 1

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
    setError('')
    setView({ kind: 'question', index: 0 })
    track('started')
  }

  function validateQuestion(index: number) {
    if (index === 0 && !answers.dailyRhythm) return '지금의 하루와 가장 가까운 리듬을 골라주세요.'
    if (index === 1 && (answers.comfortableTime === undefined || answers.difficultTime === undefined)) {
      return '편안한 시간과 힘든 시간을 각각 선택해주세요.'
    }
    if (index === 1 && answers.comfortableTime === answers.difficultTime) {
      return '편안한 시간과 힘든 시간을 다르게 선택해주세요.'
    }
    if (index === 2 && !answers.pastPattern) return '나에게 가장 가까운 지속 방식을 골라주세요.'
    if (index === 3 && answers.changeAreas.length === 0) return '바꾸고 싶은 영역을 하나 이상 골라주세요.'
    if (index === 3 && !answers.primaryChangeArea) return '가장 먼저 다룰 한 가지를 정해주세요.'
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
      setView({ kind: 'summary' })
      track('life_note_viewed')
      return
    }
    setView({ kind: 'question', index: view.index + 1 })
  }

  function goBack() {
    setError('')
    if (view.kind === 'contact') return setView({ kind: 'summary' })
    if (view.kind === 'summary') return setView({ kind: 'question', index: 4 })
    if (view.kind === 'question' && view.index > 0) return setView({ kind: 'question', index: view.index - 1 })
    setView({ kind: 'intro' })
  }

  function chooseSingle<K extends keyof ApplicationAnswers>(key: K, value: ApplicationAnswers[K]) {
    setAnswers((current) => ({ ...current, [key]: value }))
    setError('')
  }

  function toggleChangeArea(area: ChangeArea) {
    setAnswers((current) => {
      const exists = current.changeAreas.includes(area)
      if (!exists && current.changeAreas.length >= 3) {
        setError('최대 3개까지 고를 수 있어요.')
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
    setView({ kind: 'contact' })
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
      if (!result) throw new Error('신청 접수 서버와 연결하지 못했어요.')
      if (!response.ok || !result.ok) throw new Error(result.error)
      sessionStorage.removeItem(ANSWERS_STORAGE_KEY)
      setView({ kind: 'success', requestId: result.requestId ?? requestId })
      track('submitted')
    } catch (submitError) {
      setError(
        submitError instanceof Error && submitError.message
          ? submitError.message
          : '신청을 접수하지 못했어요. 입력한 내용은 그대로 유지했으니 잠시 후 다시 시도해주세요.',
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
    setView({ kind: 'intro' })
  }

  function renderChoiceCards<T extends string>(
    options: ChoiceOption<T>[],
    selected: T | undefined,
    onSelect: (value: T) => void,
  ) {
    return (
      <div className="choice-grid">
        {options.map((option) => (
          <label className={`choice-card ${selected === option.id ? 'is-selected' : ''}`} key={option.id}>
            <input
              checked={selected === option.id}
              name={`choice-${questionIndex}`}
              onChange={() => onSelect(option.id)}
              type="radio"
              value={option.id}
            />
            <span className="choice-marker" aria-hidden="true">{option.marker}</span>
            <span className="choice-copy">
              <strong>{option.title}</strong>
              <small>{option.description}</small>
            </span>
            <span className="choice-check" aria-hidden="true">{selected === option.id ? '✓' : ''}</span>
          </label>
        ))}
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
        <div className="time-controls">
          <label className="time-control time-control--easy">
            <strong>가장 편안한 시간</strong>
            <select
              aria-label="가장 편안한 시간"
              onChange={(event) => chooseSingle(
                'comfortableTime',
                event.target.value === '' ? undefined : Number(event.target.value),
              )}
              value={answers.comfortableTime ?? ''}
            >
              <option value="">시간 선택</option>
              {Array.from({ length: 24 }, (_, hour) => (
                <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>
              ))}
            </select>
          </label>
          <label className="time-control time-control--hard">
            <strong>가장 힘든 시간</strong>
            <select
              aria-label="가장 힘든 시간"
              onChange={(event) => chooseSingle(
                'difficultTime',
                event.target.value === '' ? undefined : Number(event.target.value),
              )}
              value={answers.difficultTime ?? ''}
            >
              <option value="">시간 선택</option>
              {Array.from({ length: 24 }, (_, hour) => (
                <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>
              ))}
            </select>
          </label>
          <p className="control-hint">정확하지 않아도 괜찮아요. 가장 가까운 시간을 골라주세요.</p>
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
        <div className="change-area-section">
          <div className="area-grid">
            {changeAreaOptions.map((option) => {
              const selected = answers.changeAreas.includes(option.id)
              return (
                <label className={`area-card ${selected ? 'is-selected' : ''}`} key={option.id}>
                  <input
                    checked={selected}
                    onChange={() => toggleChangeArea(option.id)}
                    type="checkbox"
                    value={option.id}
                  />
                  <span className="area-copy"><strong>{option.title}</strong><small>{option.description}</small></span>
                  <i aria-hidden="true">{selected ? '✓' : ''}</i>
                </label>
              )
            })}
          </div>

          {answers.changeAreas.length > 0 && (
            <fieldset className="primary-area">
              <legend>그중 가장 먼저 보고 싶은 곳은?</legend>
              <div className="chip-row">
                {answers.changeAreas.map((area) => (
                  <label className={answers.primaryChangeArea === area ? 'is-selected' : ''} key={area}>
                    <input
                      checked={answers.primaryChangeArea === area}
                      name="primary-change-area"
                      onChange={() => chooseSingle('primaryChangeArea', area)}
                      type="radio"
                    />
                    {labels.changeArea[area]}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </div>
      )
    }

    return renderChoiceCards<TogetherStyle>(togetherStyleOptions, answers.togetherStyle, (value) => {
      chooseSingle('togetherStyle', value)
    })
  }

  return (
    <main className={`experience-shell view-${view.kind}`}>
      <header className="brand-header" aria-label="데이로그">
        <button className="brand-mark" onClick={restart} type="button" aria-label="데이로그 첫 화면">
          DAYLOG
        </button>
        <div className="header-status" aria-hidden="true">
          <i /> LIFE NOTE
        </div>
      </header>

      {view.kind === 'intro' && (
        <section className="intro-scene" aria-labelledby="intro-title">
          <div className="intro-rail" aria-hidden="true">
            <span>NOTE 001</span>
            <span>WRITE YOUR DAY</span>
          </div>
          <div className="intro-copy">
            <p className="eyebrow">DAYLOG · A NOTE ABOUT MY DAY</p>
            <p className="intro-purpose">3분간 하루를 기록하고<br />60분 오프라인 LIFE SESSION을 신청합니다.</p>
            <h1 id="intro-title">
              당신의 <span>하루</span>를
              <br />
              한 장씩 적어볼게요.
            </h1>
            <p className="intro-description">
              잘 쓴 계획표가 아니어도 괜찮아요. 요즘의 리듬, 편안한 시간, 바꾸고 싶은 것을
              짧게 적으며 첫 만남에서 나눌 이야기를 준비합니다.
            </p>
            <button className="primary-action" type="button" onClick={startExperience}>
              <span>내 하루 적고 신청하기<small>5개의 짧은 선택 · 약 3분</small></span>
              <b aria-hidden="true">→</b>
            </button>
            <p className="intro-helper">긴 글 없이 선택만 하면 노트가 자동으로 완성됩니다.</p>
          </div>
          <div className="intro-notebook" aria-hidden="true">
            <span className="intro-note-tape" />
            <div className="intro-note-header"><b>MY DAY</b><i>01</i></div>
            <p>요즘 나의 하루는</p>
            <strong>어떤 모습인가요?</strong>
            <ul>
              <li><i /> 오늘의 리듬</li>
              <li><i /> 편안한 시간</li>
              <li><i /> 바꾸고 싶은 한 가지</li>
            </ul>
            <small>선택하면 한 줄씩 자동으로 적혀요.</small>
          </div>
        </section>
      )}

      {view.kind === 'question' && (
        <section className="question-scene scene-enter" aria-labelledby="question-title">
          <div className="progress-line" aria-label={`현재 ${view.index + 1}단계, 전체 5단계`}>
            <span style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="scene-copy">
            <div className="scene-heading-row">
              <p className="eyebrow">{questionMeta[view.index].label}</p>
              <p className="step-count">{String(view.index + 1).padStart(2, '0')} / 05</p>
            </div>
            <h1 id="question-title" ref={headingRef} tabIndex={-1}>{questionMeta[view.index].title}</h1>
            <p className="scene-description">{questionMeta[view.index].description}</p>
            <fieldset className="question-fieldset">
              <legend className="sr-only">{questionMeta[view.index].title}</legend>
              {renderQuestion(view.index)}
            </fieldset>
            {error && <p className="form-error" role="alert" aria-live="polite">{error}</p>}
            <div className="scene-actions">
              <button className="secondary-action" onClick={goBack} type="button">← 이전</button>
              <button
                aria-disabled={Boolean(validateQuestion(view.index))}
                className="primary-action primary-action--compact"
                disabled={Boolean(validateQuestion(view.index))}
                onClick={goNext}
                type="button"
              >
                {view.index === 4 ? '내 하루 요약 보기' : '다음'} <b aria-hidden="true">→</b>
              </button>
            </div>
          </div>
        </section>
      )}

      {view.kind === 'summary' && answers.dailyRhythm && answers.comfortableTime !== undefined && answers.difficultTime !== undefined && answers.pastPattern && answers.primaryChangeArea && answers.togetherStyle && (
        <section className="summary-scene scene-enter" aria-labelledby="summary-title">
          <div className="summary-visual">
            <p className="eyebrow">MY LIFE NOTE · FIRST DRAFT</p>
            <RoutineNotebook answers={answers} progress={1} summary />
          </div>
          <div className="summary-copy">
            <p className="eyebrow">YOUR DAY, WRITTEN DOWN</p>
            <h1 id="summary-title" ref={headingRef} tabIndex={-1}>당신의 하루가<br />한 장에 담겼어요.</h1>
            <p className="scene-description">진단 결과가 아니라, 첫 만남에서 함께 이어 쓸 당신의 하루 초안입니다.</p>
            <dl className="day-summary">
              <div><dt>나의 리듬</dt><dd>{labels.dailyRhythm[answers.dailyRhythm]}</dd></div>
              <div><dt>편안함 → 어려움</dt><dd>{String(answers.comfortableTime).padStart(2, '0')}시 → {String(answers.difficultTime).padStart(2, '0')}시</dd></div>
              <div><dt>이미 잘해온 방식</dt><dd>{labels.pastPattern[answers.pastPattern]}</dd></div>
              <div><dt>먼저 보고 싶은 곳</dt><dd>{labels.changeArea[answers.primaryChangeArea]}</dd></div>
              <div><dt>함께하는 방식</dt><dd>{labels.togetherStyle[answers.togetherStyle]}</dd></div>
            </dl>
            <p className="next-step-note">다음은 이름과 연락처를 남기는 간단한 신청 단계예요.</p>
            <div className="scene-actions">
              <button className="secondary-action" onClick={goBack} type="button">← 답변 수정</button>
              <button className="primary-action primary-action--compact" onClick={openContact} type="button">
                연락처 남기고 신청하기 <b aria-hidden="true">→</b>
              </button>
            </div>
          </div>
        </section>
      )}

      {view.kind === 'contact' && (
        <section className="contact-scene scene-enter" aria-labelledby="contact-title">
          <div className="contact-intro">
            <p className="eyebrow">LIFE SESSION · MEET IN PERSON</p>
            <h1 id="contact-title" ref={headingRef} tabIndex={-1}>이제 직접 만나<br />이야기해볼까요?</h1>
            <p>신청을 확인한 뒤 일정을 조율해드려요. 민감한 이야기는 온라인에서 묻지 않아요.</p>
            <div className="session-ticket" aria-hidden="true">
              <span>60 MIN</span>
              <strong>1:1 LIFE SESSION</strong>
              <small>MEET · DISCOVER · DESIGN</small>
            </div>
          </div>

          <form className="contact-form" onSubmit={submitApplication} noValidate>
            <div className="form-section">
              <div className="form-section-heading"><span>01</span><div><strong>어떻게 불러드리면 될까요?</strong><small>이름 또는 편한 호칭을 적어주세요.</small></div></div>
              <label className="text-field">
                <span>이름·호칭</span>
                <input
                  autoComplete="name"
                  maxLength={50}
                  aria-describedby={contactErrorField === 'displayName' ? 'contact-error' : undefined}
                  aria-invalid={contactErrorField === 'displayName'}
                  onChange={(event) => updateContact({ displayName: event.target.value })}
                  placeholder="예: 원영"
                  ref={displayNameRef}
                  required
                  value={contact.displayName}
                />
              </label>
            </div>

            <div className="form-section">
              <div className="form-section-heading"><span>02</span><div><strong>어떤 방법으로 연락드릴까요?</strong><small>일정 조율에만 사용합니다.</small></div></div>
              <fieldset className="segmented-field">
                <legend className="sr-only">연락 방법</legend>
                {(['phone', 'email', 'messenger'] as ContactMethod[]).map((method) => (
                  <label className={contact.contactMethod === method ? 'is-selected' : ''} key={method}>
                    <input
                      checked={contact.contactMethod === method}
                      name="contact-method"
                      onChange={() => updateContact({ contactMethod: method, contactValue: '' })}
                      type="radio"
                    />
                    {method === 'phone' ? '문자·전화' : method === 'email' ? '이메일' : '메신저'}
                  </label>
                ))}
              </fieldset>
              <label className="text-field">
                <span>연락처</span>
                <input
                  autoComplete={contact.contactMethod === 'phone' ? 'tel' : contact.contactMethod === 'email' ? 'email' : 'off'}
                  inputMode={contact.contactMethod === 'phone' ? 'tel' : contact.contactMethod === 'email' ? 'email' : 'text'}
                  maxLength={100}
                  aria-describedby={contactErrorField === 'contactValue' ? 'contact-error' : undefined}
                  aria-invalid={contactErrorField === 'contactValue'}
                  onChange={(event) => updateContact({ contactValue: event.target.value })}
                  placeholder={contactPlaceholder(contact.contactMethod)}
                  ref={contactValueRef}
                  required
                  value={contact.contactValue}
                />
              </label>
            </div>

            <details className="optional-details">
              <summary>
                <span>일정과 메모 추가하기</span>
                <small>선택 · 나중에 정해도 괜찮아요</small>
              </summary>

              <div className="form-section">
                <div className="form-section-heading"><span>03</span><div><strong>만나기 편한 요일은 언제인가요? <i>선택</i></strong><small>지금 정하기 어렵다면 비워두셔도 괜찮아요.</small></div></div>
                <fieldset className="chip-field">
                  <legend className="sr-only">희망 요일</legend>
                  {preferredDayOptions.map((option) => (
                    <label className={contact.preferredDays.includes(option.id) ? 'is-selected' : ''} key={option.id}>
                      <input
                        checked={contact.preferredDays.includes(option.id)}
                        onChange={() => updateContact({
                          preferredDays: toggleExclusive<PreferredDay>(contact.preferredDays, option.id, 'flexible'),
                        })}
                        type="checkbox"
                      />
                      {option.label}
                    </label>
                  ))}
                </fieldset>
              </div>

              <div className="form-section">
                <div className="form-section-heading"><span>04</span><div><strong>편한 시간대는 언제인가요? <i>선택</i></strong><small>비워두면 연락드릴 때 함께 정할게요.</small></div></div>
                <fieldset className="chip-field">
                  <legend className="sr-only">희망 시간대</legend>
                  {preferredPeriodOptions.map((option) => (
                    <label className={contact.preferredPeriods.includes(option.id) ? 'is-selected' : ''} key={option.id}>
                      <input
                        checked={contact.preferredPeriods.includes(option.id)}
                        onChange={() => updateContact({
                          preferredPeriods: toggleExclusive<PreferredPeriod>(contact.preferredPeriods, option.id, 'flexible'),
                        })}
                        type="checkbox"
                      />
                      {option.label}
                    </label>
                  ))}
                </fieldset>
              </div>

              <div className="form-section">
                <div className="form-section-heading"><span>05</span><div><strong>미리 전하고 싶은 이야기가 있나요? <i>선택</i></strong><small>비워두셔도 신청할 수 있어요.</small></div></div>
                <label className="text-field">
                  <span className="sr-only">추가 이야기</span>
                  <textarea
                    maxLength={500}
                    onChange={(event) => updateContact({ additionalNote: event.target.value })}
                    placeholder="반드시 적지 않아도 괜찮습니다."
                    rows={4}
                    value={contact.additionalNote}
                  />
                  <small className="character-count">{contact.additionalNote.length} / 500</small>
                </label>
              </div>
            </details>

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

            <label className="consent-field">
              <input
                checked={contact.privacyConsent}
                aria-describedby={contactErrorField === 'privacyConsent' ? 'contact-error' : undefined}
                aria-invalid={contactErrorField === 'privacyConsent'}
                onChange={(event) => updateContact({ privacyConsent: event.target.checked })}
                ref={consentRef}
                required
                type="checkbox"
              />
              <span><strong>[필수] 개인정보 수집·이용에 동의합니다.</strong><small>Life Session 일정 안내와 신청 확인을 위해 이름과 연락처를 수집합니다. 선택한 일정과 메모가 있다면 함께 저장합니다.</small></span>
            </label>

            <p className="form-error" id="contact-error" role="alert" aria-live="polite">{error}</p>
            <div className="scene-actions">
              <button className="secondary-action" onClick={goBack} type="button">← 하루 노트</button>
              <button className="primary-action primary-action--compact" disabled={submitting} type="submit">
                {submitting ? '접수하는 중이에요…' : 'Life Session 신청하기'}
                {!submitting && <b aria-hidden="true">→</b>}
              </button>
            </div>
          </form>
        </section>
      )}

      {view.kind === 'success' && (
        <section className="success-scene scene-enter" aria-labelledby="success-title">
          <div className="success-stamp" aria-hidden="true"><span>기록 완료</span><b>✓</b></div>
          <p className="eyebrow">NOTE SAVED · MEET YOU SOON</p>
          <h1 id="success-title" ref={headingRef} tabIndex={-1}>이제 직접 만나<br />함께 살펴볼게요.</h1>
          <p>신청 내용을 확인한 뒤 남겨주신 방법으로 연락드릴게요.</p>
          <div className="receipt"><span>접수번호</span><strong>{view.requestId}</strong></div>
          <button className="secondary-action" onClick={restart} type="button">첫 화면으로 돌아가기</button>
        </section>
      )}
    </main>
  )
}

export default App
