import {
  addDoc,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
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
export const setStatus = (code: string, memberId: string, key: string) =>
  setDoc(doc(need(), path(code, 'status', memberId)), {
    key,
    since: Date.now(),
    etaAt: null,
    etaFrom: null,
  });

export const setEta = (code: string, memberId: string, etaAt: number | null) =>
  setDoc(
    doc(need(), path(code, 'status', memberId)),
    { etaAt, etaFrom: etaAt ? Date.now() : null },
    { merge: true },
  );

export const sendMessage = (code: string, from: string, kind: 'quick' | 'youtube', key: string) =>
  addDoc(collection(need(), path(code, 'messages')), { from, kind, key, at: Date.now() });

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
