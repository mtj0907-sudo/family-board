import { useState } from 'react';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { Glyph, ICON_CHOICES } from '../components/Glyph';
import { PinGuard } from '../components/PinGuard';
import { DEFAULT_BAG_ITEMS, schoolKidIds } from '../lib/bag';
import { defaultKeysFor, selectableFor } from '../lib/statusSets';
import { PushSettings } from './PushSettings';
import { QrCode } from '../components/QrCode';
import { useFamily } from '../FamilyContext';
import { useDocData } from '../hooks/useFirestore';
import { deleteBoardPhoto, deletePet, path, saveBoardPhoto, saveSettings } from '../lib/db';
import { buildJoinLink } from '../lib/family';
import { hashPin, isValidPin } from '../lib/pin';
import type { CustomStatus, FamilySettings, Member, RoutineItem } from '../lib/types';
import { PhotoCropper } from '../components/PhotoCropper';
import { LOOK_LABEL, sceneLookOf, type SceneLook } from '../lib/characters';
import { loadPhoto, renderFit } from '../lib/photo';
import { TIMED_CODES } from '../lib/work';
import { PLACE_CHOICES } from '../lib/specialDay';
import { ShortcutHelper } from './ShortcutHelper';
import { PetSheet } from './PetSheet';
import type { Member as PetMember } from '../lib/types';

const DEMO_PET: PetMember = { id: 'demo-pet', name: '체험', emoji: '🐾', role: 'child' };

export function SettingsScreen() {
  return (
    <PinGuard title="설정은 부모 PIN이 필요해요">
      <SettingsBody />
    </PinGuard>
  );
}

function SettingsBody() {
  const { code, settings, leave } = useFamily();
  const [members, setMembers] = useState<Member[]>(settings.members);
  const [petDemo, setPetDemo] = useState(false);
  const [items, setItems] = useState<RoutineItem[]>(settings.routineItems);
  const [owner, setOwner] = useState(settings.workOwnerId ?? '');
  const [times, setTimes] = useState<Record<string, string>>(settings.workTimes ?? {});
  const [commute, setCommute] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(settings.commuteMinutes ?? {}).map(([k, v]) => [k, String(v)])),
  );
  const [newPin, setNewPin] = useState('');
  const [openIcon, setOpenIcon] = useState<number | null>(null);
  const [statusSets, setStatusSets] = useState<Record<string, string[]>>(settings.statusSets ?? {});
  const [statusMemberId, setStatusMemberId] = useState<string>(settings.members[0]?.id ?? '');
  const [dayPlaces, setDayPlaces] = useState<Record<string, string>>(settings.dayPlaces ?? {});
  const [bagItems, setBagItems] = useState<RoutineItem[]>(settings.bagItems?.length ? settings.bagItems : DEFAULT_BAG_ITEMS);
  const [openBagIcon, setOpenBagIcon] = useState<number | null>(null);
  const [places, setPlaces] = useState<CustomStatus[]>(settings.customStatuses ?? []);
  const [openPlaceIcon, setOpenPlaceIcon] = useState<number | null>(null);
  const [cropFor, setCropFor] = useState<{ id: string; file: File } | null>(null);
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const link = buildJoinLink(location.href, code);

  const setMember = (id: string, patch: Partial<Member>) =>
    setMembers(members.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  const setItem = (i: number, patch: Partial<RoutineItem>) =>
    setItems(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  async function save() {
    if (members.some((m) => !m.name.trim())) return setMsg('이름을 비워 둘 수 없어요');
    if (!members.some((m) => m.role === 'parent')) return setMsg('어른이 한 명 이상 있어야 해요');
    if (newPin && !isValidPin(newPin)) return setMsg('새 PIN은 숫자 4자리예요');
    const next: FamilySettings = {
      ...settings,
      members: members.map(({ photo, look, ...m }) => ({ ...m, name: m.name.trim(), ...(photo ? { photo } : {}), ...(look ? { look } : {}) })),
      routineItems: items
        .filter((i) => i.label.trim())
        .map((i, n) => ({ ...i, label: i.label.trim(), key: i.key || `c${Date.now()}${n}` })),
      pinHash: newPin ? await hashPin(newPin, code) : settings.pinHash,
      workTimes: Object.fromEntries(
        Object.entries(times)
          .map(([k, v]) => [k, v.trim()] as const)
          .filter(([, v]) => v),
      ),
    };
    next.statusSets = Object.fromEntries(
      Object.entries(statusSets).filter(([id, keys]) => members.some((m) => m.id === id) && keys.length > 0),
    );
    const dayPl = Object.fromEntries(Object.entries(dayPlaces).filter(([id]) => members.some((m) => m.id === id && m.role === 'child')));
    if (Object.keys(dayPl).length) next.dayPlaces = dayPl;
    else delete next.dayPlaces;
    next.schoolKids = schoolKidIds({ members, dayPlaces: dayPl, schoolKids: settings.schoolKids });
    next.bagItems = bagItems
      .filter((i) => i.label.trim())
      .slice(0, 12)
      .map((i, n) => ({ ...i, label: i.label.trim(), key: i.key || `b${Date.now()}${n}` }));
    next.customStatuses = places
      .filter((pl) => pl.label.trim())
      .slice(0, 10)
      .map((pl, n) => ({ ...pl, label: pl.label.trim(), key: pl.key || `c${Date.now()}${n}` }));
    next.commuteMinutes = Object.fromEntries(
      Object.entries(commute)
        .map(([k, v]) => [k, Math.round(Number(v))] as const)
        .filter(([k, n]) => members.some((m) => m.id === k && m.role === 'parent') && Number.isFinite(n) && n > 0 && n <= 300),
    );
    // Firestore는 undefined 값을 저장할 수 없어서, 선택 안 했으면 항목 자체를 뺍니다.
    if (owner) next.workOwnerId = owner;
    else delete next.workOwnerId;
    void saveSettings(code, next);
    setNewPin('');
    setMsg('저장했어요');
  }

  return (
    <div className="screen">
      <div className="card">
        <h2>가족 구성원</h2>
        {members.map((m) => (
          <div className="row" key={m.id}>
            <label className="photo-pick" aria-label={`${m.name || '구성원'} 사진 고르기`}>
              <Avatar member={m} size={44} />
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) setCropFor({ id: m.id, file: f });
                }}
              />
            </label>
            <input className="grow" value={m.name} maxLength={10} onChange={(e) => setMember(m.id, { name: e.target.value })} aria-label="이름" />
            <select value={m.role} onChange={(e) => setMember(m.id, { role: e.target.value as Member['role'] })} aria-label="역할">
              <option value="parent">어른</option>
              <option value="child">아이</option>
            </select>
            {m.photo && (
              <button className="btn inline" onClick={() => setMember(m.id, { photo: undefined })} aria-label={`${m.name} 사진 지우기`}>
                <Trash2 size={20} strokeWidth={1.75} aria-hidden />
              </button>
            )}
          </div>
        ))}
        <div className="sub">상태 그림 속 모습 (아빠·엄마·아이 상태마다 3D 그림이 나와요)</div>
        {members.map((m) => (
          <div className="row" key={m.id + 'look'}>
            <Avatar member={m} size={32} />
            <span className="wk-code">{m.name || '구성원'}</span>
            <select
              className="grow"
              value={sceneLookOf(m)}
              onChange={(e) => setMember(m.id, { look: e.target.value as SceneLook })}
              aria-label={`${m.name} 그림 속 모습`}
            >
              {(m.role === 'child' ? (['boy', 'girl'] as SceneLook[]) : (['short', 'long'] as SceneLook[])).map((l) => (
                <option key={l} value={l}>
                  {LOOK_LABEL[l]}
                </option>
              ))}
            </select>
          </div>
        ))}
        <div className="sub">동그라미를 누르면 얼굴 사진을 고를 수 있어요. 사진은 우리 가족 Firebase에만 저장되고, 아래 저장하기를 눌러야 반영돼요.</div>
      </div>
      <BoardPhotoCard code={code} />
      <ShortcutHelper />
      <div className="card">
        <h2>평일에 가는 곳</h2>
        <div className="sub">일요일 오후에 "새로운 한 주, 힘차게 시작해요! 내일은 승우 학교 · 아림 유치원"처럼 응원 메시지를 보여줘요.</div>
        {members
          .filter((m) => m.role === 'child')
          .map((m) => (
            <div className="row" key={m.id}>
              <Avatar member={m} size={40} />
              <span className="wk-code">{m.name}</span>
              <select
                className="grow"
                value={dayPlaces[m.id] ?? ((settings.schoolKids ?? []).includes(m.id) ? '학교' : '')}
                onChange={(e) => setDayPlaces({ ...dayPlaces, [m.id]: e.target.value })}
                aria-label={`${m.name} 평일에 가는 곳`}
              >
                <option value="">안 가요</option>
                {PLACE_CHOICES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          ))}
      </div>
      {cropFor && (
        <PhotoCropper
          file={cropFor.file}
          onCancel={() => setCropFor(null)}
          onDone={(data) => {
            // photo 값은 members 상태에 담기고, 저장하기를 누르면 설정과 함께 저장됩니다.
            setMembers((cur) => cur.map((m) => (m.id === cropFor.id ? { ...m, photo: data } : m)));
            setCropFor(null);
          }}
        />
      )}

      <div className="card">
        <h2>루틴 항목 (아이 공통)</h2>
        {items.map((it, i) => (
          <div key={i}>
            <div className="row">
              <button className="icon-pick" onClick={() => setOpenIcon(openIcon === i ? null : i)} aria-label="아이콘 바꾸기">
                <Glyph k={it.emoji} size={22} />
              </button>
              <input className="grow" value={it.label} maxLength={8} placeholder="항목 이름" onChange={(e) => setItem(i, { label: e.target.value })} />
              <button className="btn inline" onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label="삭제">
                <Trash2 size={20} strokeWidth={1.75} aria-hidden />
              </button>
            </div>
            {openIcon === i && (
              <div className="icon-grid" style={{ marginTop: 8 }}>
                {ICON_CHOICES.map((e) => (
                  <button
                    key={e}
                    className={e === it.emoji ? 'sel' : ''}
                    onClick={() => {
                      setItem(i, { emoji: e });
                      setOpenIcon(null);
                    }}
                  >
                    <Glyph k={e} size={22} />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {items.length < 8 && (
          <button className="btn" onClick={() => setItems([...items, { key: '', emoji: '📌', label: '' }])}>
            <Plus size={20} strokeWidth={2} aria-hidden />
            항목 추가
          </button>
        )}
      </div>

      <div className="card">
        <h2>가방 챙기기</h2>
        <div className="sub">
          위의 <b>평일에 가는 곳</b>이 <b>학교</b>인 아이에게, 밤에 스스로 가방을 챙기는 체크리스트가 루틴 탭에 생겨요. 부모는 오늘 화면과 루틴 탭에서 결과를 볼 수 있어요.
        </div>
        <div className="sub">
          지금 나오는 아이: <b>{members.filter((m) => schoolKidIds({ members, dayPlaces, schoolKids: settings.schoolKids }).includes(m.id)).map((m) => m.name).join(', ') || '없음 (평일에 가는 곳을 학교로 고르세요)'}</b>
        </div>
        <div className="sub">체크할 항목</div>
        {bagItems.map((it, i) => (
          <div key={i}>
            <div className="row">
              <button className="icon-pick" onClick={() => setOpenBagIcon(openBagIcon === i ? null : i)} aria-label="아이콘 바꾸기">
                <Glyph k={it.emoji} size={22} />
              </button>
              <input
                className="grow"
                value={it.label}
                maxLength={14}
                placeholder="예: 연필 다 깎았어요"
                onChange={(e) => setBagItems(bagItems.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
              />
              <button className="btn inline" onClick={() => setBagItems(bagItems.filter((_, j) => j !== i))} aria-label="삭제">
                <Trash2 size={20} strokeWidth={1.75} aria-hidden />
              </button>
            </div>
            {openBagIcon === i && (
              <div className="icon-grid" style={{ marginTop: 8 }}>
                {ICON_CHOICES.map((e) => (
                  <button
                    key={e}
                    className={e === it.emoji ? 'sel' : ''}
                    onClick={() => {
                      setBagItems(bagItems.map((x, j) => (j === i ? { ...x, emoji: e } : x)));
                      setOpenBagIcon(null);
                    }}
                  >
                    <Glyph k={e} size={22} />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {bagItems.length < 12 && (
          <button className="btn" onClick={() => setBagItems([...bagItems, { key: '', emoji: '🎒', label: '' }])}>
            <Plus size={20} strokeWidth={2} aria-hidden />
            항목 추가
          </button>
        )}
      </div>

      <div className="card">
        <h2>사람마다 보일 상태</h2>
        <div className="sub">
          어른과 아이는 처음부터 다른 목록이 나와요. 사람을 골라서 그 사람의 상태 화면에 보일 항목을 켜고 끄세요.
        </div>
        <div className="picker">
          {members.map((m) => (
            <button key={m.id} className={m.id === statusMemberId ? 'pick on' : 'pick'} onClick={() => setStatusMemberId(m.id)}>
              <Avatar member={m} size={38} />
              {m.name || '이름 없음'}
            </button>
          ))}
        </div>
        {(() => {
          const who = members.find((m) => m.id === statusMemberId);
          if (!who) return null;
          const options = selectableFor(who);
          const active = new Set(statusSets[who.id]?.length ? statusSets[who.id] : defaultKeysFor(who));
          const groups = Array.from(new Set(options.map((o) => o.group ?? '기타')));
          const toggle = (key: string) => {
            const next = new Set(active);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            // 목록의 순서는 항상 같은 순서(아래 표시 순서)로 저장합니다.
            setStatusSets({ ...statusSets, [who.id]: options.map((o) => o.key).filter((k) => next.has(k)) });
          };
          return (
            <>
              {groups.map((g) => (
                <div key={g} className="field">
                  <span>{g}</span>
                  <div className="chips">
                    {options
                      .filter((o) => (o.group ?? '기타') === g)
                      .map((o) => (
                        <button key={o.key} className={active.has(o.key) ? 'chip small on' : 'chip small'} aria-pressed={active.has(o.key)} onClick={() => toggle(o.key)}>
                          <Glyph k={o.emoji} size={18} />
                          {o.label}
                        </button>
                      ))}
                  </div>
                </div>
              ))}
              <button
                className="btn small"
                onClick={() => {
                  const { [who.id]: _removed, ...rest } = statusSets;
                  setStatusSets(rest);
                }}
              >
                {who.name} 기본 목록으로 되돌리기
              </button>
              <div className="sub">저장하기를 눌러야 반영돼요.</div>
            </>
          );
        })()}
      </div>

      <div className="card">
        <h2>자주 가는 곳</h2>
        <div className="sub">
          학원처럼 자주 가는 곳을 만들어 두면 상태 화면에 칩으로 나와요. 예: "피아노 학원 가는 중". 도착 시각을 정하는 곳이면 "도착 시각"을 켜 두세요.
        </div>
        {places.map((pl, i) => (
          <div key={i}>
            <div className="row">
              <button className="icon-pick" onClick={() => setOpenPlaceIcon(openPlaceIcon === i ? null : i)} aria-label="아이콘 바꾸기">
                <Glyph k={pl.emoji} size={22} />
              </button>
              <input
                className="grow"
                value={pl.label}
                maxLength={14}
                placeholder="예: 피아노 학원 가는 중"
                onChange={(e) => setPlaces(places.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
              />
              <button className="btn inline" onClick={() => setPlaces(places.filter((_, j) => j !== i))} aria-label="삭제">
                <Trash2 size={20} strokeWidth={1.75} aria-hidden />
              </button>
            </div>
            <div className="picker wrap place-who" aria-label="누가 쓰나요">
              {members.map((m) => {
                const on = !pl.members || pl.members.length === 0 || pl.members.includes(m.id);
                const all = !pl.members || pl.members.length === 0;
                return (
                  <button
                    key={m.id}
                    className={on && !all ? 'pick on' : 'pick'}
                    aria-pressed={on && !all}
                    onClick={() => {
                      const cur = pl.members ?? [];
                      const next = cur.includes(m.id) ? cur.filter((x) => x !== m.id) : [...cur, m.id];
                      setPlaces(places.map((x, j) => (j === i ? { ...x, members: next } : x)));
                    }}
                  >
                    <Avatar member={m} size={30} />
                    {m.name || '이름 없음'}
                  </button>
                );
              })}
              <span className="sub">누가 쓰나요? (고르지 않으면 모두)</span>
            </div>
            <label className="check">
              <input
                type="checkbox"
                checked={pl.eta}
                onChange={(e) => setPlaces(places.map((x, j) => (j === i ? { ...x, eta: e.target.checked } : x)))}
              />
              도착 시각 정하기
            </label>
            {openPlaceIcon === i && (
              <div className="icon-grid" style={{ marginTop: 8 }}>
                {ICON_CHOICES.map((e) => (
                  <button
                    key={e}
                    className={e === pl.emoji ? 'sel' : ''}
                    onClick={() => {
                      setPlaces(places.map((x, j) => (j === i ? { ...x, emoji: e } : x)));
                      setOpenPlaceIcon(null);
                    }}
                  >
                    <Glyph k={e} size={22} />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {places.length < 10 && (
          <button className="btn" onClick={() => setPlaces([...places, { key: '', emoji: '🎹', label: '', eta: true }])}>
            <Plus size={20} strokeWidth={2} aria-hidden />
            장소 추가
          </button>
        )}
      </div>

      <div className="card">
        <h2>근무표</h2>
        <label className="field">
          <span>근무표를 쓰는 사람</span>
          <select value={owner} onChange={(e) => setOwner(e.target.value)}>
            <option value="">선택 안 함</option>
            {members
              .filter((m) => m.role === 'parent')
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
          </select>
        </label>
        <div className="sub">코드별 근무 시간 (비워 두면 코드만 보여요. 예: 08:00~17:00)</div>
        {TIMED_CODES.map((c) => (
          <div className="row" key={c}>
            <span className="wk-code">{c}</span>
            <input
              className="grow"
              value={times[c] ?? ''}
              maxLength={15}
              placeholder="시간"
              onChange={(e) => setTimes({ ...times, [c]: e.target.value })}
            />
          </div>
        ))}
      </div>

      <div className="card">
        <h2>퇴근 후 집까지 걸리는 시간</h2>
        <div className="sub">
          "집에 가는 중"을 누르면 이 시간을 더해 도착 시각을 짐작해서 보여줘요. 위치를 읽는 것이 아니라 평소 시간 기준이에요. 비워 두면 짐작하지 않아요.
        </div>
        {members
          .filter((m) => m.role === 'parent')
          .map((m) => (
            <div className="row" key={m.id}>
              <Avatar member={m} size={40} />
              <span className="wk-code">{m.name}</span>
              <input
                className="grow"
                inputMode="numeric"
                maxLength={3}
                placeholder="분"
                value={commute[m.id] ?? ''}
                onChange={(e) => setCommute({ ...commute, [m.id]: e.target.value.replace(/\D/g, '') })}
                aria-label={`${m.name} 집까지 걸리는 시간(분)`}
              />
              <span className="sub">분</span>
            </div>
          ))}
      </div>

      <PushSettings />

      <div className="card">
        <h2>부모 PIN 바꾸기</h2>
        <input inputMode="numeric" maxLength={4} placeholder="새 PIN 4자리 (안 바꾸면 비워 두세요)" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} />
      </div>

      <button className="btn primary sticky" onClick={save}>
        저장하기
      </button>
      {msg && <div className="toast">{msg}</div>}

      <div className="card">
        <h2>펫 체험해 보기</h2>
        <p className="sub">승우·아림이 펫과 따로 있는 체험용 펫이에요. 마음껏 해 보고, 지우면 처음부터 다시 할 수 있어요.</p>
        <div className="row">
          <button className="btn primary" onClick={() => setPetDemo(true)}>
            체험 펫 열기
          </button>
          <button
            className="btn"
            onClick={() => {
              if (window.confirm('체험 펫을 지우고 처음부터 할까요? (아이들 펫은 그대로예요)')) void deletePet(code, DEMO_PET.id);
            }}
          >
            체험 펫 지우기
          </button>
        </div>
      </div>
      {petDemo && <PetSheet kid={DEMO_PET} onClose={() => setPetDemo(false)} />}

      <div className="card">
        <h2>가족 링크</h2>
        <p className="sub">다른 기기에서 이 링크를 열면 같은 가족으로 연결돼요. 가족 밖에는 공유하지 마세요.</p>
        <QrCode link={link} />
        <div className="linkbox">{link}</div>
        <button
          className="btn"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              setCopied(true);
            } catch {
              window.prompt('이 링크를 복사하세요', link);
            }
          }}
        >
          <Copy size={20} strokeWidth={1.75} aria-hidden />
          {copied ? '복사했어요' : '링크 복사'}
        </button>
        <button
          className="btn no"
          onClick={() => {
            if (confirm('이 기기의 가족 연결을 끊을까요? (가족 데이터는 지워지지 않아요)')) leave();
          }}
        >
          이 기기 연결 끊기
        </button>
      </div>
    </div>
  );
}

/** 거실 보드 왼쪽에 넣을 사진. 고르는 즉시 저장돼요. */
function BoardPhotoCard({ code }: { code: string }) {
  const photo = useDocData<{ data: string }>(path(code, 'media', 'board'));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function pick(f: File) {
    setBusy(true);
    setErr('');
    try {
      await saveBoardPhoto(code, renderFit(await loadPhoto(f)));
    } catch {
      setErr('사진을 저장하지 못했어요. 다시 해 주세요');
    }
    setBusy(false);
  }
  return (
    <div className="card">
      <h2>거실 보드 사진</h2>
      <div className="sub">보드 왼쪽 시계 아래에 크게 보여요. 세로 사진이 잘 어울려요. 우리 가족 Firebase에만 저장돼요.</div>
      {photo?.data && <img className="board-photo-prev" src={photo.data} alt="거실 보드 사진 미리보기" />}
      <div className="row">
        <label className="btn primary inline" aria-disabled={busy}>
          {busy ? '저장하는 중…' : photo?.data ? '다른 사진 고르기' : '사진 고르기'}
          <input
            type="file"
            accept="image/*"
            hidden
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void pick(f);
            }}
          />
        </label>
        {photo?.data && (
          <button className="btn inline" onClick={() => void deleteBoardPhoto(code)}>
            사진 지우기
          </button>
        )}
      </div>
      {err && <div className="sub" role="alert">{err}</div>}
    </div>
  );
}
