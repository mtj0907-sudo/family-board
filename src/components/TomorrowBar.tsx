import type { TomorrowItem } from '../lib/tomorrow';
import { Glyph } from './Glyph';

export interface Banner {
  emoji: string;
  text: string;
  detail?: string;
}

/** "내일 일정" 한 줄(+ 위에 특별한 날·응원 문구 한 줄). 배경 없이 글씨만 떠 있어서 위쪽에 계속 두어도 답답하지 않아요. */
export function TomorrowBar({ items, variant, banner }: { items: TomorrowItem[]; variant: 'board' | 'phone'; banner?: Banner | null }) {
  const shown = items.slice(0, 2);
  const more = items.length - shown.length;
  return (
    <div className={`tomorrow-box tb-${variant}`}>
      {banner && (
        <div className="t-banner" role="status">
          <span className="t-emoji" aria-hidden>
            {banner.emoji}
          </span>
          <b>{banner.text}</b>
          {banner.detail && <span className="t-detail">{banner.detail}</span>}
        </div>
      )}
      <div className="tomorrow" aria-label="내일 일정">
        <b className="t-label">내일</b>
        {items.length === 0 ? (
          <span className="t-none">일정이 없어요</span>
        ) : (
          <>
            {shown.map((it) => (
              <span key={it.id} className="t-item">
                <Glyph k={it.emoji} size={variant === 'board' ? 20 : 17} />
                <span className="t-time">{it.time}</span>
                <span className="t-title">{it.title}</span>
                {it.who && <small>{it.who}</small>}
              </span>
            ))}
            {more > 0 && <span className="t-more">외 {more}건</span>}
          </>
        )}
      </div>
    </div>
  );
}
