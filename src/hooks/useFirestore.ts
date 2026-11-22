import { useEffect, useState } from 'react';
import { collection, doc, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import type { WithId } from '../lib/types';

/** 문서 하나를 실시간 구독. undefined=불러오는 중, null=문서 없음 */
export function useDocData<T>(path: string | null): T | null | undefined {
  const [data, setData] = useState<T | null | undefined>(undefined);
  useEffect(() => {
    if (!db || !path) {
      setData(undefined);
      return;
    }
    setData(undefined);
    return onSnapshot(
      doc(db, path),
      (s) => setData(s.exists() ? (s.data() as T) : null),
      () => setData(null),
    );
  }, [path]);
  return data;
}

interface ColOpts {
  orderField?: string;
  limitN?: number;
}

/** 컬렉션을 실시간 구독. orderField를 주면 그 필드 내림차순 */
export function useColData<T>(path: string | null, opts: ColOpts = {}): WithId<T>[] {
  const [rows, setRows] = useState<WithId<T>[]>([]);
  const { orderField, limitN } = opts;
  useEffect(() => {
    if (!db || !path) {
      setRows([]);
      return;
    }
    const base = collection(db, path);
    const q =
      orderField && limitN
        ? query(base, orderBy(orderField, 'desc'), limit(limitN))
        : orderField
          ? query(base, orderBy(orderField, 'desc'))
          : base;
    return onSnapshot(
      q,
      (s) => setRows(s.docs.map((d) => ({ id: d.id, ...(d.data() as T) }))),
      () => setRows([]),
    );
  }, [path, orderField, limitN]);
  return rows;
}
