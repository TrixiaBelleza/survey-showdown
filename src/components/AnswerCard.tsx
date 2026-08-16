type Props = {
  index: number
  text: string
  revealed: boolean
  highlight?: boolean
}

export function AnswerCard({ index, text, revealed, highlight }: Props) {
  return (
    <div className={`card${revealed ? ' flipped' : ''}${highlight && revealed ? ' top-answer' : ''}`}>
      <div className="card-inner">
        <div className="card-face card-back">
          <span className="card-num">{String(index).padStart(2, '0')}</span>
          <span className="card-hidden">? ? ?</span>
        </div>
        <div className="card-face card-front">
          <span className="card-num">{String(index).padStart(2, '0')}</span>
          <span className="card-text">{text}</span>
        </div>
      </div>
    </div>
  )
}
