import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { EventDoc } from './events';
import type { FamilySettings, YoutubeAnswer } from './types';

function need() {
  if (!db) throw new Error('Firebase 설정이 없어요');
  return db;
}

/** families/{코드}/... 경로 */
export const path = (code: string, ...rest: string[]) => ['families', code, ...rest].join('/');

export async function familyExists(code: string): Promise<boolean> {
  const snap = await getDoc(doc(need(), path(code, 'settings', 'main')));
  return snap.exists();
}

export const saveSettings = (code: string, s: FamilySettings) =>
  setDoc(doc(need(), path(code, 'settings', 'main')), s);

/** 상태 변경: 도착 예정 시각은 초기화됩니다 (따로 지정) */
export const setStatus = (
  code: string,
  memberId: string,
  key: string,
  /** 직접 만든 장소/상태일 때만 */
  custom?: { label: string; emoji: string; eta: boolean },
) =>
  setDoc(doc(need(), path(code, 'status', memberId)), {
    key,
    since: Date.now(),
    etaAt: null,
    etaFrom: null,
    ...(custom ?? {}),
  });

export const setEta = (code: string, memberId: string, etaAt: number | null) =>
  setDoc(
    doc(need(), path(code, 'status', memberId)),
    { etaAt, etaFrom: etaAt ? Date.now() : null },
    { merge: true },
  );

export const sendMessage = (code: string, from: string, kind: 'quick' | 'youtube', key: string, to?: string) =>
  addDoc(collection(need(), path(code, 'messages')), { from, kind, key, at: Date.now(), ...(to ? { to } : {}) });

export const sendNote = (code: string, from: string, text: string) =>
  addDoc(collection(need(), path(code, 'messages')), { from, kind: 'note', key: 'note', at: Date.now(), text });

export const answerYoutube = (code: string, id: string, answer: YoutubeAnswer, by: string) =>
  updateDoc(doc(need(), path(code, 'messages', id)), { reply: { answer, at: Date.now(), by } });

export const setRoutineDone = (
  code: string,
  date: string,
  memberId: string,
  key: string,
  value: boolean,
) =>
  setDoc(
    doc(need(), path(code, 'routines', date)),
    { done: { [memberId]: { [key]: value } } },
    { merge: true },
  );

export const setDoing = (code: string, date: string, memberId: string, value: string) =>
  setDoc(doc(need(), path(code, 'routines', date)), { doing: { [memberId]: value } }, { merge: true });

/** id가 있으면 수정, 없으면 새 일정 */
export async function saveEvent(code: string, id: string | null, ev: EventDoc): Promise<void> {
  if (id) await setDoc(doc(need(), path(code, 'events', id)), ev);
  else await addDoc(collection(need(), path(code, 'events')), ev);
}

export const deleteEvent = (code: string, id: string) =>
  deleteDoc(doc(need(), path(code, 'events', id)));

/** 한 달 근무를 통째로 저장(그 달의 기존 내용은 교체) */
export const saveWorkMonth = (code: string, ym: string, days: Record<string, string>) =>
  setDoc(doc(need(), path(code, 'work', ym)), { days, updatedAt: Date.now() });

/** 하루만 수정. value가 null이면 그날 기록 삭제 */
export const setWorkDay = (code: string, ym: string, day: number, value: string | null) =>
  setDoc(
    doc(need(), path(code, 'work', ym)),
    { days: { [String(day)]: value ?? deleteField() }, updatedAt: Date.now() },
    { merge: true },
  );

/** 알림을 받는 기기 한 대 등록/수정 (가족 코드 아래 push 컬렉션) */
export const savePushDevice = (
  code: string,
  deviceId: string,
  data: {
    endpoint: string;
    p256dh: string;
    auth: string;
    memberId: string;
    prefStatus: boolean;
    prefMessage: boolean;
    prefPickup: boolean;
  },
) => setDoc(doc(need(), path(code, 'push', deviceId)), { ...data, updatedAt: Date.now() });

export const deletePushDevice = (code: string, deviceId: string) => deleteDoc(doc(need(), path(code, 'push', deviceId)));

/** 가방 챙기기: 항목 하나 체크/해제 (bag/{날짜}) */
export const setBagItem = (code: string, date: string, kidId: string, key: string, value: boolean) =>
  setDoc(doc(need(), path(code, 'bag', date)), { done: { [kidId]: { [key]: value } } }, { merge: true });

/** 다 챙긴 시각 기록/지우기 */
export const setBagDoneAt = (code: string, date: string, kidId: string, at: number | null) =>
  setDoc(doc(need(), path(code, 'bag', date)), { doneAt: { [kidId]: at ?? deleteField() } }, { merge: true });

/** "내일은 학교 안 가요" */
export const setBagSkip = (code: string, date: string, kidId: string, skip: boolean) =>
  setDoc(doc(need(), path(code, 'bag', date)), { skip: { [kidId]: skip } }, { merge: true });

/** 거실 보드 왼쪽에 보여줄 사진 (설정 문서와 따로 보관해서, 보드에서만 읽어요) */
export const saveBoardPhoto = (code: string, data: string) => setDoc(doc(need(), path(code, 'media', 'board')), { data, at: Date.now() });
export const deleteBoardPhoto = (code: string) => deleteDoc(doc(need(), path(code, 'media', 'board')));
