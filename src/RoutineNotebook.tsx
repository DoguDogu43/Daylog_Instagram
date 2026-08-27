import { diarySentenceMap, labels } from './data'
import type { ApplicationAnswers } from './types'

type RoutineNotebookProps = {
  answers: ApplicationAnswers
  activeStepIndex?: number
  onEditStep?: (stepIndex: number) => void
  summary?: boolean
  isMobileDrawer?: boolean
  onCloseDrawer?: () => void
}

function formatHour(value: number) {
  const period = value < 12 ? '오전' : '오후'
  const displayHour = value === 0 ? 12 : value > 12 ? value - 12 : value
  return `${period} ${String(displayHour).padStart(2, '0')}:00 (${String(value).padStart(2, '0')}:00)`
}

export function RoutineNotebook({
  answers,
  activeStepIndex,
  onEditStep,
  summary = false,
  isMobileDrawer = false,
  onCloseDrawer,
}: RoutineNotebookProps) {
  const filledCount = [
    answers.dailyRhythm !== undefined,
    answers.comfortableTime !== undefined && answers.difficultTime !== undefined,
    answers.pastPattern !== undefined,
    answers.primaryChangeArea !== undefined,
    answers.togetherStyle !== undefined,
  ].filter(Boolean).length

  const entries = [
    {
      stepIndex: 0,
      stepNum: '01',
      badge: '하루 리듬',
      title: '나의 하루 리듬',
      icon: '🌅',
      isFilled: Boolean(answers.dailyRhythm),
      value: answers.dailyRhythm ? labels.dailyRhythm[answers.dailyRhythm] : null,
      reflection: answers.dailyRhythm ? diarySentenceMap.dailyRhythm[answers.dailyRhythm] : null,
      emptyHint: '어떤 시간대에 나다워지는지 기록을 기다리고 있어요.',
    },
    {
      stepIndex: 1,
      stepNum: '02',
      badge: '에너지 시간',
      title: '나의 에너지 타임테이블',
      icon: '☀️🌙',
      isFilled: answers.comfortableTime !== undefined && answers.difficultTime !== undefined,
      value:
        answers.comfortableTime !== undefined && answers.difficultTime !== undefined
          ? `편안한 시간: ${formatHour(answers.comfortableTime)} / 버거운 시간: ${formatHour(answers.difficultTime)}`
          : answers.comfortableTime !== undefined
            ? `편안한 시간: ${formatHour(answers.comfortableTime)} (버거운 시간 선택 중)`
            : answers.difficultTime !== undefined
              ? `버거운 시간: ${formatHour(answers.difficultTime)} (편안한 시간 선택 중)`
              : null,
      reflection:
        answers.comfortableTime !== undefined && answers.difficultTime !== undefined
          ? '하루의 에너지 흐름을 파악하여 가장 나다운 시간에 핵심 일과를 배치합니다.'
          : null,
      emptyHint: '에너지가 차오르는 시간과 가라앉는 시간을 적어주세요.',
    },
    {
      stepIndex: 2,
      stepNum: '03',
      badge: '지속 조건',
      title: '내가 지속할 수 있었던 이유',
      icon: '📎',
      isFilled: Boolean(answers.pastPattern),
      value: answers.pastPattern ? labels.pastPattern[answers.pastPattern] : null,
      reflection: answers.pastPattern ? diarySentenceMap.pastPattern[answers.pastPattern] : null,
      emptyHint: '무언가를 꾸준히 이어가게 했던 나만의 방식을 탐색합니다.',
    },
    {
      stepIndex: 3,
      stepNum: '04',
      badge: '바꿀 습관',
      title: '새롭게 만들고 싶은 생활 습관',
      icon: '🎯',
      isFilled: Boolean(answers.primaryChangeArea),
      value: answers.primaryChangeArea
        ? `1순위: ${labels.changeArea[answers.primaryChangeArea]}`
        : answers.changeAreas.length > 0
          ? `${answers.changeAreas.map((a) => labels.changeArea[a]).join(', ')} (1순위 선택 중)`
          : null,
      subAreas:
        answers.changeAreas.length > 1
          ? answers.changeAreas
              .filter((a) => a !== answers.primaryChangeArea)
              .map((a) => labels.changeArea[a])
          : [],
      reflection: answers.primaryChangeArea
        ? '가장 먼저 집중해서 다룰 주제를 중심으로 1:1 맞춤 루틴을 설계합니다.'
        : null,
      emptyHint: '지금 일상에서 가장 먼저 손보고 싶은 영역을 선택해주세요.',
    },
    {
      stepIndex: 4,
      stepNum: '05',
      badge: '동행 방식',
      title: '나와 맞는 페이스와 동행 방식',
      icon: '🤝',
      isFilled: Boolean(answers.togetherStyle),
      value: answers.togetherStyle ? labels.togetherStyle[answers.togetherStyle] : null,
      reflection: answers.togetherStyle ? diarySentenceMap.togetherStyle[answers.togetherStyle] : null,
      emptyHint: '나에게 가장 편안한 루틴 형성 속도를 결정합니다.',
    },
  ]

  return (
    <div className={`live-diary-container ${summary ? 'is-summary-mode' : ''} ${isMobileDrawer ? 'is-drawer' : ''}`}>
      {/* Diary Header */}
      <div className="diary-journal-header">
        <div className="journal-header-top">
          <div className="journal-date-tag">
            <span className="calendar-icon" aria-hidden="true">📅</span>
            <span className="journal-date-text">2026. 08. 27 (THU)</span>
            <span className="journal-weather-text">· 맑음 ☀️</span>
          </div>

          <div className="journal-stamp-badge">
            <span className="journal-stamp-dot" aria-hidden="true" />
            <span>DAYLOG · LIFE DIARY</span>
          </div>

          {isMobileDrawer && onCloseDrawer && (
            <button
              type="button"
              className="drawer-close-btn"
              onClick={onCloseDrawer}
              aria-label="다이어리 닫기"
            >
              ✕
            </button>
          )}
        </div>

        <div className="journal-header-title-wrap">
          <h2 className="journal-page-title">나의 하루 다이어리</h2>
          <p className="journal-page-subtitle">
            {summary
              ? '오늘 기록하신 내용을 바탕으로 60분 1:1 라이프 세션이 준비됩니다.'
              : '선택하신 답변이 실시간으로 나의 개인 다이어리에 정갈하게 기록됩니다.'}
          </p>
        </div>

        <div className="journal-progress-pill">
          <span className="progress-pill-label">기록 진행률</span>
          <div className="progress-mini-bar">
            <div className="progress-mini-fill" style={{ width: `${(filledCount / 5) * 100}%` }} />
          </div>
          <strong className="progress-pill-fraction">{filledCount}/5 완료</strong>
        </div>
      </div>

      {/* Diary Notebook Ruled Page Body */}
      <div className="diary-ruled-sheet" role="region" aria-label="실시간 라이프 다이어리 내용">
        {entries.map((entry) => {
          const isActive = activeStepIndex === entry.stepIndex
          return (
            <div
              key={entry.stepNum}
              className={`diary-entry-block ${entry.isFilled ? 'is-filled' : 'is-pending'} ${isActive ? 'is-active-step' : ''}`}
            >
              <div className="entry-gutter-marker">
                <span className="entry-number">{entry.stepNum}</span>
                <span className="entry-pin" aria-hidden="true">{isActive ? '✍️' : entry.isFilled ? '✓' : '○'}</span>
              </div>

              <div className="entry-body-content">
                <div className="entry-title-row">
                  <div className="entry-title-group">
                    <span className="entry-icon" aria-hidden="true">{entry.icon}</span>
                    <strong className="entry-title">{entry.title}</strong>
                    <span className="entry-category-badge">{entry.badge}</span>
                  </div>

                  {entry.isFilled && onEditStep && (
                    <button
                      type="button"
                      className="diary-edit-stamp-btn"
                      onClick={() => {
                        onEditStep(entry.stepIndex)
                        if (isMobileDrawer && onCloseDrawer) onCloseDrawer()
                      }}
                      aria-label={`${entry.title} 수정하기`}
                    >
                      다시 적기 ✎
                    </button>
                  )}
                </div>

                {entry.isFilled && entry.value ? (
                  <div className="entry-ink-text-wrap">
                    <p className="entry-ink-headline">{entry.value}</p>
                    {entry.subAreas && entry.subAreas.length > 0 && (
                      <div className="entry-sub-tags">
                        <span className="sub-tag-label">함께 살필 영역:</span>
                        {entry.subAreas.map((area) => (
                          <span className="sub-tag-chip" key={area}>{area}</span>
                        ))}
                      </div>
                    )}
                    {entry.reflection && <p className="entry-reflection-note">{entry.reflection}</p>}
                  </div>
                ) : (
                  <div className="entry-placeholder-wrap">
                    <p className="entry-empty-prompt">{entry.emptyHint}</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Diary Footer Note & Official Seal */}
      <div className="diary-journal-footer">
        <div className="footer-wax-seal" aria-hidden="true">
          <div className="wax-seal-inner">
            <span className="wax-seal-brand">DAYLOG</span>
            <span className="wax-seal-sub">ORIGINAL</span>
          </div>
        </div>
        <div className="footer-memo-text">
          <strong>1:1 오프라인 라이프 세션 안내</strong>
          <p>서울 오프라인 1:1 공간에서 코치와 함께 이 다이어리를 펼쳐놓고 나에게 꼭 맞는 7일 실행 루틴 지도를 완성합니다.</p>
        </div>
      </div>
    </div>
  )
}

