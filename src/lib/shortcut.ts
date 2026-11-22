/**
 * 아이폰 "단축어" 앱의 개인 자동화(도착/떠남)에서 앱의 상태를 바꾸는 요청을 만듭니다.
 * Firestore 공개 주소(REST)로 보내고, 시각은 서버가 정해 주도록 해서 아이폰 시계가 틀려도 괜찮습니다.
 */
export interface ShortcutStatus {
  key: string;
  /** 직접 만든 장소일 때만 */
  custom?: { label: string; emoji: string; eta: boolean };
}

export interface ShortcutRequest {
  /** 단축어의 "URL 내용 가져오기"에 붙여 넣을 주소 (POST) */
  url: string;
  /** 요청 내용(JSON 글자) */
  body: string;
}

export function buildShortcutRequest(o: { projectId: string; apiKey: string; code: string; memberId: string; status: ShortcutStatus }): ShortcutRequest {
  const base = `projects/${o.projectId}/databases/(default)/documents`;
  const fields: Record<string, unknown> = {
    key: { stringValue: o.status.key },
    since: { integerValue: '0' },
    etaAt: { nullValue: null },
    etaFrom: { nullValue: null },
  };
  if (o.status.custom) {
    fields.label = { stringValue: o.status.custom.label };
    fields.emoji = { stringValue: o.status.custom.emoji };
    fields.eta = { booleanValue: o.status.custom.eta };
  }
  const body = {
    writes: [
      {
        update: { name: `${base}/families/${o.code}/status/${o.memberId}`, fields },
        updateTransforms: [{ fieldPath: 'at', setToServerValue: 'REQUEST_TIME' }],
      },
    ],
  };
  return { url: `https://firestore.googleapis.com/v1/${base}:commit?key=${encodeURIComponent(o.apiKey)}`, body: JSON.stringify(body) };
}

/** 자주 쓰는 조합 (장소에 도착/떠날 때 → 바꿀 상태) */
export const SHORTCUT_PRESETS: { label: string; when: string; statusKey: string }[] = [
  { label: '학교에 도착하면', when: '도착', statusKey: 'school' },
  { label: '학교에서 떠나면', when: '떠남', statusKey: 'kid_going_home' },
  { label: '학원에 도착하면', when: '도착', statusKey: 'at_academy' },
  { label: '학원에서 떠나면', when: '떠남', statusKey: 'kid_going_home' },
  { label: '집에 도착하면', when: '도착', statusKey: 'home' },
];
