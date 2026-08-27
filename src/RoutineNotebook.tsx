import { diarySentenceMap, labels } from './data'
import type { ApplicationAnswers } from './types'

type RoutineNotebookProps = {
  answers: ApplicationAnswers
  onEditStep?: (stepIndex: number) => void
}

export function RoutineNotebook({ answers, onEditStep }: RoutineNotebookProps) {
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
      emptyHint: '어떤 시간대에 가장 나다워지는지 기록을 기다리고 있어요.',
    },
    {
      stepIndex: 1,
      stepNum: '02',
      badge: '하루의 온도',
      title: '내가 활력을 얻는 순간 & 지치는 순간',
      icon: '☀️🌙',
      isFilled: Boolean(answers.comfortableTime?.trim() || answers.difficultTime?.trim()),
      value:
        answers.comfortableTime?.trim() && answers.difficultTime?.trim()
          ? `☀️ 활력 순간: ${answers.comfortableTime.trim()} · 🌙 지치는 순간: ${answers.difficultTime.trim()}`
          : answers.comfortableTime?.trim()
            ? `☀️ 활력 순간: ${answers.comfortableTime.trim()}`
            : answers.difficultTime?.trim()
              ? `🌙 지치는 순간: ${answers.difficultTime.trim()}`
              : null,
      reflection:
        answers.comfortableTime?.trim() && answers.difficultTime?.trim()
          ? '하루의 에너지 흐름을 존중하여 활력 있는 시간에 핵심 일과를 배치하고, 지치는 취약 시간은 부드럽게 방어합니다.'
          : null,
      emptyHint: '에너지가 차오르는 순간과 가라앉는 순간을 적어주세요.',
    },
    {
      stepIndex: 2,
      stepNum: '03',
      badge: '지속의 조건',
      title: '나를 지속하게 만드는 고유한 조건',
      icon: '📎',
      isFilled: Boolean(answers.pastPattern),
      value: answers.pastPattern ? labels.pastPattern[answers.pastPattern] : null,
      reflection: answers.pastPattern ? diarySentenceMap.pastPattern[answers.pastPattern] : null,
      emptyHint: '무언가를 꾸준히 이어가게 했던 나만의 방식을 기록합니다.',
    },
    {
      stepIndex: 3,
      stepNum: '04',
      badge: '돌볼 습관',
      title: '가장 먼저 돌보고 싶은 일상의 습관',
      icon: '🎯',
      isFilled: Boolean(answers.primaryChangeArea),
      value: answers.primaryChangeArea
        ? `1순위 집중 영역: ${labels.changeArea[answers.primaryChangeArea]}`
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
        ? `가장 먼저 돌보고 싶은 '${labels.changeArea[answers.primaryChangeArea]}' 영역을 중심으로 일상에 무리 없는 1:1 맞춤 루틴을 설계합니다.`
        : null,
      emptyHint: '지금 일상에서 가장 먼저 손보고 싶은 영역을 선택해주세요.',
    },
    {
      stepIndex: 4,
      stepNum: '05',
      badge: '동행 방식',
      title: '나와 꼭 맞는 코치와의 동행 방식',
      icon: '🤝',
      isFilled: Boolean(answers.togetherStyle),
      value: answers.togetherStyle ? labels.togetherStyle[answers.togetherStyle] : null,
      reflection: answers.togetherStyle ? diarySentenceMap.togetherStyle[answers.togetherStyle] : null,
      emptyHint: '나에게 가장 편안한 루틴 형성 속도를 결정합니다.',
    },
  ]

  return (
    <div className="summary-draft-container">
      {/* Draft Header */}
      <div className="draft-note-header">
        <div className="draft-header-meta">
          <span className="draft-meta-badge">DAYLOG · LIFE NOTE</span>
          <span className="draft-meta-date">2026 · 서울 1:1 오프라인 라이프 세션</span>
        </div>
        <h2 className="draft-note-title">
          나의 하루 초안 <span className="draft-title-highlight">(Draft Note)</span>
        </h2>
        <p className="draft-note-desc">
          선택하신 답변으로 완성된 첫 번째 하루 기록입니다. 이 초안은 평가나 진단이 아니며,
          오프라인 1:1 만남에서 코치와 함께 펼쳐놓고 <strong>나다운 루틴 지도</strong>를 써내려갈 이야기의 시작점입니다.
        </p>
      </div>

      {/* Draft 5 Entries List */}
      <div className="draft-entries-list" role="region" aria-label="완성된 하루 초안 항목">
        {entries.map((entry) => (
          <article className="draft-entry-card" key={entry.stepNum}>
            <div className="draft-entry-header">
              <div className="draft-entry-tag-group">
                <span className="draft-step-num">{entry.stepNum}</span>
                <span className="draft-badge">{entry.badge}</span>
                <span className="draft-entry-icon" aria-hidden="true">{entry.icon}</span>
                <h3 className="draft-entry-heading">{entry.title}</h3>
              </div>

              {onEditStep && (
                <button
                  type="button"
                  className="draft-edit-btn"
                  onClick={() => onEditStep(entry.stepIndex)}
                  aria-label={`${entry.title} 답변 수정하기`}
                >
                  수정 ✎
                </button>
              )}
            </div>

            <div className="draft-entry-body">
              {entry.isFilled && entry.value ? (
                <>
                  <div className="draft-value-row">
                    <p className="draft-value-text">
                      <mark className="draft-highlighter">{entry.value}</mark>
                    </p>
                  </div>

                  {entry.subAreas && entry.subAreas.length > 0 && (
                    <div className="draft-sub-tags">
                      <span className="sub-tags-label">함께 살필 영역:</span>
                      <div className="sub-tags-list">
                        {entry.subAreas.map((area) => (
                          <span className="sub-tag-chip" key={area}>{area}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {entry.reflection && (
                    <p className="draft-reflection-text">{entry.reflection}</p>
                  )}
                </>
              ) : (
                <p className="draft-empty-text">{entry.emptyHint}</p>
              )}
            </div>
          </article>
        ))}
      </div>

      {/* 60-Minute 1:1 Session 3-Step Preview */}
      <div className="draft-session-preview-card">
        <div className="preview-card-header">
          <span className="preview-pin-icon" aria-hidden="true">📌</span>
          <div>
            <strong className="preview-header-title">60분 1:1 LIFE SESSION 진행 순서</strong>
            <p className="preview-header-subtitle">작성해주신 초안을 바탕으로 세션이 이렇게 진행됩니다.</p>
          </div>
        </div>

        <div className="preview-steps-grid">
          <div className="preview-step-box">
            <span className="step-time-pill">STEP 1 · 20분</span>
            <strong className="step-box-title">다이어리 라이프 인터뷰</strong>
            <p className="step-box-desc">에너지 시간대와 과거 지속 조건을 나누며 나만의 고유한 습관 패턴을 발견합니다.</p>
          </div>

          <div className="preview-step-box">
            <span className="step-time-pill">STEP 2 · 25분</span>
            <strong className="step-box-title">취약 시간 완충 루틴 설계</strong>
            <p className="step-box-desc">지치는 시간을 방어하고, 1순위 집중 습관을 일상에 무리 없이 안착시킵니다.</p>
          </div>

          <div className="preview-step-box">
            <span className="step-time-pill">STEP 3 · 15분</span>
            <strong className="step-box-title">7일 실행 지도 & 약속</strong>
            <p className="step-box-desc">내일부터 당장 해볼 수 있는 작은 행동과 지속 가능한 동행 방식을 확정합니다.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
