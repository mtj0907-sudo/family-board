/** 이 기기에서 3D(WebGL)를 쓸 수 있는지 */
export function canUse3D(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
