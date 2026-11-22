/**
 * 아이폰 "나의 찾기" 앱을 엽니다.
 * 위치 정보는 애플이 관리하며 이 앱은 위치를 저장하거나 추적하지 않습니다. (앱을 여는 버튼만 제공)
 * 앱이 열리지 않으면(아이폰이 아니거나 막힌 경우) iCloud 웹 페이지를 대신 엽니다.
 */
export function openFindMy(): void {
  let left = false;
  const onHide = () => {
    if (document.hidden) left = true;
  };
  document.addEventListener('visibilitychange', onHide);
  window.location.href = 'findmy://';
  window.setTimeout(() => {
    document.removeEventListener('visibilitychange', onHide);
    if (!left) window.open('https://www.icloud.com/find', '_blank', 'noopener');
  }, 1800);
}
