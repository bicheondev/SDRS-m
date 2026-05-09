# SDRS-RN login parity goal

Fix only SDRS-RN login screen visual parity against SDRS-RNW.

Do not touch DB/filter/manage/menu/toast/bottom-tab/image modal.
Do not change data logic, navigation, route flow, or copy outside login.
Preserve the currently fixed keyboard sticky behavior.

Source of truth:
- ~/SDRS-RNW/src/features/auth
- ~/SDRS-RNW/src/styles/base.css
- ~/SDRS-RNW/src/styles/tokens.css
- ~/SDRS-RNW/src/theme.js
- SDRS-RN/src/auth/RnwAuthScreen.jsx
- SDRS-RN/src/theme.js
- SDRS-RN/src/themeRuntime.js

Current login bugs:
1. RNW title is two lines:
   로그인 정보를
   입력하세요
   SDRS-RN currently renders one line with a trailing period.
2. Login input placeholder color does not visually apply. It should use slate-400 / #94a3b8 or the exact RNW token.
3. RNW title is 600 26px / 33.8px PretendardGOV-SemiBold. SDRS-RN appears as weight 400 even when the family says SemiBold.
4. Login input focus border/focus treatment color differs from RNW.

Required fixes:

A. Title copy and layout
- Render title deterministically as two lines.
- First line: 로그인 정보를
- Second line: 입력하세요
- Remove the wrong trailing period if RNW has no period.
- Do not rely on automatic wrapping.
- Match RNW style:
  fontSize 26
  lineHeight 33.8
  fontWeight 600
  letterSpacing -0.78
  PretendardGOV-SemiBold / real 600 family.
- Web/devtools must not show the title resolved as font-weight 400.

B. Placeholder color
- Use React Native TextInput placeholderTextColor prop.
- Do not rely on className, CSS custom property, or a StyleSheet placeholder key.
- Ensure placeholderTextColor receives a concrete resolved color string, e.g. #94a3b8, not "text slate-400", not an unresolved var(), and not a misspelled "placholder" key.
- If RNW changes placeholder color on focus, mirror that focused state too.

C. Font weight mapping
- Audit themeRuntime login text adaptation.
- Ensure 600 maps to the actual SemiBold family/file and does not downgrade to 400.
- Do not fake weight by changing size/color.

D. Focus state
- Match RNW focused input-shell treatment.
- Use RNW token values for focused background, border/focus color, and focus shadow/ring equivalent.
- Do not use arbitrary blue.
- Native may approximate CSS box-shadow using border/shadow/stroke, but color and visual strength must match RNW.

E. Web preflight crash
- If npx expo export --platform web --dev or npx expo start --web crashes with themeRuntime/adaptValue recursion, fix recursion safely before validating login.
- Add cycle/depth protection to CSS var resolution only if needed.
- Do not turn this into a broad theme rewrite.

Validation:
npm install
npx expo export --platform web --dev
npx expo export --platform android --dev
git diff --check

Run:
grep -rn "placeholderTextColor\|placholder\|placeholder" SDRS-RN/src/auth SDRS-RN/src/theme.js SDRS-RN/src/themeRuntime.js
grep -rn "fontWeight.*600\|PretendardGOV-SemiBold\|loginTitle\|login-title" SDRS-RN/src/auth SDRS-RN/src/theme.js SDRS-RN/src/themeRuntime.js

Acceptance:
- Login title is exactly two lines like RNW.
- No wrong period after 입력하세요 unless RNW has it.
- Title resolves to 600 / 26 / 33.8, not 400.
- Placeholder color visibly matches RNW muted placeholder color.
- Focused input border/focus treatment matches RNW.
- Keyboard sticky behavior remains fixed.
- Web and Android exports pass.

Commit and push:
git status --short --branch
git add -A
git commit -m "fix: align native login typography and input parity"
git fetch origin
git rebase origin/main
npx expo export --platform web --dev
npx expo export --platform android --dev
git diff --check
git push origin HEAD:main

Use normal git only.
Do not print/request/embed tokens.
Do not use GitHub API blob uploads.
Do not run EAS manually.
