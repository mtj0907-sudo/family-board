# GitHub Pages로 배포하기 (아이폰 Safari 기준)

> GitHub 모바일 앱에는 일부 설정 메뉴가 없습니다. **Safari**로 `github.com`에 로그인해서 진행하세요.
> 메뉴가 안 보이면 주소창 왼쪽 `ぁ가` → **데스크탑 웹 사이트 요청**을 누르세요.

## 0. 먼저 확인 (공개 전 체크)
GitHub Pages 무료 플랜은 **Public 저장소**여야 합니다. Public으로 바꾸면 **코드와 변경 이력 전체**가 누구에게나 보입니다.
- 코드·문서·테스트에는 가족 이름, 근무 데이터, 가족 코드가 없습니다 (설정 화면에 입력하면 Firestore에만 저장).
- **이미 푸시된 이력에 이름이 한 번 들어간 적이 있어** 이력 정리(Claude에게 요청)가 끝난 뒤에 Public으로 바꾸세요.

## 1. 저장소를 Public으로 바꾸기
1. Safari → `github.com/<내 아이디>/family-board` 열기.
2. 오른쪽 위 **Settings** 탭 (탭이 안 보이면 `…` 또는 가로로 밀기).
3. **General** 맨 아래로 스크롤 → **Danger Zone**.
4. **Change repository visibility** → **Change visibility** → **Change to public**.
5. 경고 창에서 모두 체크/확인 후 저장소 이름(`family-board`)을 입력 → **I understand, change repository visibility**.

## 2. Pages 켜기 (GitHub Actions 방식)
1. 저장소 **Settings** → 왼쪽(또는 위쪽 ☰) **Pages**.
2. **Build and deployment → Source** 를 **GitHub Actions** 로 선택.

## 3. Firebase 설정값 넣기 (변수)
1. 저장소 **Settings** → **Secrets and variables** → **Actions**.
2. **Variables** 탭 → **New repository variable**.
3. Name: `VITE_FIREBASE_CONFIG`
4. Value: Firebase 4번에서 복사한 `{ apiKey: "...", ... }` 전체를 붙여넣기 → **Add variable**.
   (`const firebaseConfig =` 와 끝의 `;` 가 같이 붙어도 괜찮습니다.)

## 4. main으로 합치기 (PR 만들고 병합)
배포는 `main` 브랜치가 바뀔 때만 일어납니다. 작업 브랜치(`claude/family-board-webapp-tvl09t`)를 합쳐야 합니다.
1. 저장소 **Pull requests** 탭 → **New pull request**.
2. **base: `main`** ← **compare: `claude/family-board-webapp-tvl09t`** 로 맞추기.
3. **Create pull request** (제목은 그대로 두어도 됩니다) → 한 번 더 **Create pull request**.
4. 페이지 아래 초록색 **Merge pull request** → **Confirm merge**.
5. (선택) **Delete branch** 버튼은 지금은 누르지 마세요. 다음 단계 작업이 이 브랜치에서 이어집니다.

## 5. 배포 확인
1. 저장소 **Actions** 탭 → 맨 위 실행 항목이 노란색(진행) → 초록 ✔(성공)이 될 때까지 1~2분.
   빨간 ✖이면 그 항목을 눌러 오류 문장을 Claude에게 보여 주세요.
2. 주소는 `https://<내 아이디>.github.io/family-board/` 입니다. (Settings → Pages 위쪽에도 표시됩니다.)
3. 이 주소를 **Safari**로 열면 첫 화면이 나옵니다.

## 6. 폰에서 처음 사용하기
1. **새 가족 만들기** → 어른 2명·아이 2명 이름, 부모 PIN 4자리를 입력해 만들기.
2. 나온 **가족 링크**를 `📤 카톡 등으로 보내기`로 가족에게 전달. (링크 = 가족 코드이므로 가족 밖에는 공유하지 마세요.)
3. 가족 폰에서 링크를 Safari로 열면 자동으로 연결 → "이 기기는 누구 거예요?"에서 내 얼굴 선택.
4. 홈 화면에 추가: 공유 버튼 ⬆︎ → **홈 화면에 추가**.
   (링크로 연결한 뒤에 홈 화면에 추가하세요. 홈 화면 앱은 Safari와 저장공간이 분리되어, 추가 후에는 앱 안에서 링크를 다시 붙여넣어 연결해야 할 수 있어요.)
