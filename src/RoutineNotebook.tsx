import { labels } from './data'
import type { ApplicationAnswers } from './types'

type RoutineNotebookProps = {
  answers: ApplicationAnswers
  progress: number
  summary?: boolean
}

function hour(value: number) {
  return `${String(value).padStart(2, '0')}:00`
}

export function RoutineNotebook({ answers, progress, summary = false }: RoutineNotebookProps) {
  const currentPage = Math.max(1, Math.round(progress * 5))
  const entries = [
    {
      label: '오늘의 리듬',
      value: answers.dailyRhythm ? `나의 하루는 ${labels.dailyRhythm[answers.dailyRhythm]}에 가까워요.` : '',
      page: 1,
    },
    {
      label: '편안한 시간',
      value: answers.comfortableTime === undefined ? '' : `${hour(answers.comfortableTime)}쯤 가장 편안해요.`,
      page: 2,
    },
    {
      label: '버거운 시간',
      value: answers.difficultTime === undefined ? '' : `${hour(answers.difficultTime)}쯤 가장 버거워요.`,
      page: 2,
    },
    {
      label: '계속할 수 있었던 방식',
      value: answers.pastPattern ? labels.pastPattern[answers.pastPattern] : '',
      page: 3,
    },
    {
      label: '먼저 바꾸고 싶은 곳',
      value: answers.primaryChangeArea ? `${labels.changeArea[answers.primaryChangeArea]}부터 이야기하고 싶어요.` : '',
      page: 4,
    },
    {
      label: '함께하고 싶은 방식',
      value: answers.togetherStyle ? labels.togetherStyle[answers.togetherStyle] : '',
      page: 5,
    },
  ]

  return (
    <article
      className={`routine-notebook ${summary ? 'routine-notebook--summary' : ''}`}
      aria-label={summary ? '완성된 나의 하루 노트' : '작성 중인 나의 하루 노트'}
    >
      <span className="notebook-tape" aria-hidden="true" />
      <header className="notebook-heading">
        <span>DAYLOG · LIFE NOTE</span>
        <strong>{String(currentPage).padStart(2, '0')} / 05</strong>
      </header>
      <div className="notebook-title-row">
        <p>{summary ? '나의 하루 초안' : '나만의 하루 노트'}</p>
        <span>{summary ? '첫 기록 완료' : '작성 중'}</span>
      </div>
      <dl className="notebook-entries">
        {entries.map((entry, index) => (
          <div
            className={`${entry.value ? 'is-written' : ''} ${!summary && entry.page === currentPage ? 'is-current' : ''}`.trim()}
            key={entry.label}
          >
            <dt><span aria-hidden="true">{entry.value ? '✓' : index + 1}</span>{entry.label}</dt>
            <dd>{entry.value || '선택하면 이곳에 한 줄이 적혀요.'}</dd>
          </div>
        ))}
      </dl>
      <footer className="notebook-footer">
        <span>짧게 선택하면 나의 문장으로 적힙니다.</span>
        <i aria-hidden="true" />
      </footer>
    </article>
  )
}
