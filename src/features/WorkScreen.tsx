import { useState } from 'react';
import { PinGuard } from '../components/PinGuard';
import { WorkCalendar } from '../components/WorkCalendar';
import { useFamily } from '../FamilyContext';
import { useDocData } from '../hooks/useFirestore';
import { useNow } from '../hooks/useNow';
import { path, saveSettings, saveWorkMonth, setWorkDay } from '../lib/db';
import { shiftMonth } from '../lib/events';
import { dateKey, kst } from '../lib/time';
import { WORK_CODES, parseWork, type ParsedWork, type WorkDoc } from '../lib/work';

const PROMPT =
  '이 근무표 사진에서 [우리 가족 이름] 줄만 읽어서, 아래 형식의 한 줄 텍스트로만 알려줘. 다른 사람 정보는 쓰지 마.\n형식: YYYY-MM|1=코드,2=코드,3=코드,...';

export function WorkScreen() {
  return (
    <PinGuard title="근무표는 부모 PIN이 필요해요">
      <WorkBody />
    </PinGuard>
  );
}

function WorkBody() {
  const { code, settings, members } = useFamily();
  const now = useNow(60000);
  const t = kst(now);
  const [ym, setYm] = useState(`${t.y}-${String(t.m).padStart(2, '0')}`);
  const saved = useDocData<WorkDoc>(path(code, 'work', ym));
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<{ ok: true; value: ParsedWork } | { ok: false; error: string } | null>(null);
  const [editDay, setEditDay] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const owner = members.find((m) => m.id === settings.workOwnerId);

  const [y, m] = ym.split('-').map(Number);
  const move = (d: number) => {
    const n = shiftMonth(y, m, d);
    setYm(`${n.y}-${String(n.m).padStart(2, '0')}`);
  };

  function chooseOwner(id: string) {
    void saveSettings(code, { ...settings, workOwnerId: id });
  }

  function save(p: ParsedWork) {
    const exists = p.ym === ym ? !!saved?.days && Object.keys(saved.days).length > 0 : false;
    if (exists && !confirm(`${p.ym} 근무가 이미 있어요. 새 내용으로 바꿀까요?`)) return;
    void saveWorkMonth(code, p.ym, p.days);
    setYm(p.ym);
    setText('');
    setPreview(null);
    setMsg(`${p.ym} 근무를 저장했어요 ✅`);
    setTimeout(() => setMsg(''), 2500);
  }

  if (!owner) {
    return (
      <div className="screen">
        <div className="card">
          <h2>👩‍💼 근무표를 쓰는 사람</h2>
          <p className="sub">근무표를 가져올 가족을 한 명 골라 주세요. (나중에 설정에서 바꿀 수 있어요)</p>
          <div className="picker wrap">
            {members
              .filter((mm) => mm.role === 'parent')
              .map((mm) => (
                <button key={mm.id} className="pick" onClick={() => chooseOwner(mm.id)}>
                  <span className="avatar sm">{mm.emoji}</span>
                  <span>{mm.name}</span>
                </button>
              ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="card">
        <div className="calhead">
          <button className="btn inline" onClick={() => move(-1)} aria-label="이전 달">
            ‹
          </button>
          <div className="calmonth">
            {y}년 {m}월
          </div>
          <button className="btn inline" onClick={() => move(1)} aria-label="다음 달">
            ›
          </button>
        </div>
        <div className="sub center-text">
          {owner.emoji} {owner.name} 근무 · 날짜를 누르면 고칠 수 있어요
        </div>
        {saved === undefined ? (
          <div className="sub">불러오는 중…</div>
        ) : (
          <WorkCalendar ym={ym} days={saved?.days ?? {}} todayKey={dateKey(now)} onPick={setEditDay} />
        )}
        {saved !== undefined && !saved?.days && <div className="sub center-text">이 달은 아직 가져온 근무가 없어요</div>}
        <Legend />
      </div>

      <div className="card">
        <h2>📋 근무 가져오기</h2>
        <ol className="steps">
          <li>이번 달 근무표 사진을 <b>Claude 채팅</b>에 보내요.</li>
          <li>아래 문장을 같이 보내면 우리 줄만 한 줄로 알려줘요.</li>
          <li>받은 한 줄을 아래 칸에 붙여넣고 <b>미리보기</b>를 눌러요.</li>
        </ol>
        <div className="linkbox">{PROMPT}</div>
        <button
          className="btn small"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(PROMPT);
              setMsg('문장을 복사했어요 ✅');
              setTimeout(() => setMsg(''), 2000);
            } catch {
              window.prompt('이 문장을 복사하세요', PROMPT);
            }
          }}
        >
          📋 Claude에게 보낼 문장 복사
        </button>
        <label className="field">
          <span>받은 한 줄 붙여넣기</span>
          <textarea
            rows={4}
            value={text}
            placeholder="2026-11|1=M12,2=휴,3=N,..."
            onChange={(e) => {
              setText(e.target.value);
              setPreview(null);
            }}
          />
        </label>
        <button className="btn primary" disabled={!text.trim()} onClick={() => setPreview(parseWork(text))}>
          👀 미리보기
        </button>
      </div>

      {preview && !preview.ok && <div className="card error">⚠️ {preview.error}</div>}

      {preview?.ok && (
        <div className="card ask">
          <h2>{preview.value.ym} 미리보기</h2>
          <WorkCalendar ym={preview.value.ym} days={preview.value.days} />
          <Legend />
          {preview.value.warnings.map((w) => (
            <div key={w} className="sub">
              ⚠️ {w}
            </div>
          ))}
          <button className="btn primary" onClick={() => save(preview.value)}>
            ✅ 이 달에 저장
          </button>
          <button className="btn" onClick={() => setPreview(null)}>
            취소
          </button>
        </div>
      )}

      {msg && <div className="toast">{msg}</div>}
      {editDay !== null && (
        <DayEditor
          ym={ym}
          day={editDay}
          current={saved?.days?.[String(editDay)] ?? ''}
          onClose={() => setEditDay(null)}
        />
      )}
    </div>
  );
}

function Legend() {
  return (
    <div className="legend">
      <span className="wk k-day">D</span>
      <span className="wk k-mid">M</span>
      <span className="wk k-night">N</span>
      <span className="wk k-off">휴·주휴·연차</span>
    </div>
  );
}

function DayEditor({ ym, day, current, onClose }: { ym: string; day: number; current: string; onClose: () => void }) {
  const { code } = useFamily();
  const [value, setValue] = useState(current);
  const [, m] = ym.split('-').map(Number);

  return (
    <div className="modal top">
      <div className="card sheet">
        <h2>
          {m}월 {day}일 근무
        </h2>
        <div className="chips row4">
          {WORK_CODES.map((c) => (
            <button key={c} className={value === c ? 'chip small on' : 'chip small'} onClick={() => setValue(c)}>
              {c}
            </button>
          ))}
        </div>
        <label className="field">
          <span>직접 쓰기 (예: 건강검진)</span>
          <input value={value} maxLength={20} onChange={(e) => setValue(e.target.value)} />
        </label>
        <button
          className="btn primary"
          onClick={() => {
            const v = value.trim();
            void setWorkDay(code, ym, day, v || null);
            onClose();
          }}
        >
          저장
        </button>
        {current && (
          <button
            className="btn no"
            onClick={() => {
              void setWorkDay(code, ym, day, null);
              onClose();
            }}
          >
            🗑 이 날 지우기
          </button>
        )}
        <button className="btn" onClick={onClose}>
          취소
        </button>
      </div>
    </div>
  );
}
