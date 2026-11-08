// knm-managed: v1 version: 1
// Approved screen modules. Add a line here when a screen is added: CODE: './screens/<side>/<name>.js?v=1'
export const SCREENS = {
  S01: './screens/main/plan.js?v=1',
  S02: './screens/main/today.js?v=1',
  S03: './screens/main/shift.js?v=1'
};

export async function loadScreen(code) {
  const path = SCREENS[code];
  if (!path) throw new Error(`Unknown screen code: ${code}`);
  return import(path);
}
