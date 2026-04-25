import { useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { motionDurationsMs, motionTokens } from '../motion.js';

const APP_FONT_FAMILY =
  'Pretendard GOV Variable, Pretendard GOV, -apple-system, BlinkMacSystemFont, system-ui, Roboto, Helvetica Neue, Segoe UI, Apple SD Gothic Neo, Noto Sans KR, Malgun Gothic, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol, sans-serif';
const IOS_EASE = `cubic-bezier(${motionTokens.ease.ios.join(', ')})`;

export function RnwAuthScreen({
  focusedField,
  isFilled,
  keyboardInset,
  onFieldBlur,
  onFieldFocus,
  onPasswordChange,
  onSubmit,
  onUsernameChange,
  password,
  username,
}) {
  const passwordInputRef = useRef(null);
  const { width } = useWindowDimensions();
  const isCompactViewport = width <= 480;

  const handleSubmit = () => {
    if (isFilled) {
      onSubmit();
    }
  };

  const handleUsernameSubmit = () => {
    passwordInputRef.current?.focus();
  };

  const usernameFocused = focusedField === 'username';
  const passwordFocused = focusedField === 'password';

  return (
    <View style={[styles.appShell, isCompactViewport && styles.appShellCompact]}>
      <View style={[styles.phoneScreen, isCompactViewport && styles.phoneScreenCompact]}>
        <View style={[styles.loginHeader, isCompactViewport && styles.loginHeaderCompact]}>
          <Text style={styles.loginTitle}>
            <Text style={styles.loginTitleAccent}>로그인 정보</Text>를
            {'\n'}
            입력하세요.
          </Text>
        </View>

        <View style={styles.loginForm}>
          <View style={[styles.inputShell, usernameFocused && styles.inputShellFocused]}>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              blurOnSubmit={false}
              enterKeyHint="next"
              onBlur={onFieldBlur}
              onChangeText={onUsernameChange}
              onFocus={() => onFieldFocus('username')}
              onSubmitEditing={handleUsernameSubmit}
              placeholder="아이디"
              placeholderTextColor={
                usernameFocused
                  ? 'var(--color-text-accent-strong)'
                  : 'var(--color-text-muted)'
              }
              returnKeyType="next"
              selectionColor="var(--color-text-accent)"
              spellCheck={false}
              style={[styles.loginInput, usernameFocused && styles.loginInputFocused]}
              value={username}
            />
          </View>

          <View style={[styles.inputShell, styles.passwordShell, passwordFocused && styles.inputShellFocused]}>
            <TextInput
              ref={passwordInputRef}
              enterKeyHint="go"
              onBlur={onFieldBlur}
              onChangeText={onPasswordChange}
              onFocus={() => onFieldFocus('password')}
              onSubmitEditing={handleSubmit}
              placeholder="비밀번호"
              placeholderTextColor={
                passwordFocused
                  ? 'var(--color-text-accent-strong)'
                  : 'var(--color-text-muted)'
              }
              returnKeyType="go"
              secureTextEntry
              selectionColor="var(--color-text-accent)"
              style={[styles.loginInput, passwordFocused && styles.loginInputFocused]}
              value={password}
            />
          </View>
        </View>

        <Text style={[styles.appVersion, focusedField ? styles.appVersionHidden : null]}>
          선박DB정보체계 버전 1.0
        </Text>

        <Pressable
          accessibilityRole="button"
          disabled={!isFilled}
          onPress={handleSubmit}
          style={({ focused }) => [
            styles.loginButton,
            isFilled ? styles.loginButtonActive : styles.loginButtonInactive,
            focused ? styles.loginButtonFocused : null,
            { transform: [{ translateY: -keyboardInset }] },
          ]}
        >
          {({ pressed }) => (
            <>
              <View
                style={[
                  styles.loginButtonOverlay,
                  styles.pointerEventsNone,
                  isFilled && pressed ? styles.loginButtonOverlayPressed : null,
                ]}
              />
              <Text style={[styles.loginButtonText, isFilled && styles.loginButtonTextActive]}>
                로그인
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    width: '100%',
    height: '100%',
    minHeight: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'var(--color-bg-app)',
  },
  appShellCompact: {
    padding: 0,
  },
  phoneScreen: {
    position: 'relative',
    width: 'min(100%, var(--screen-width))',
    height: 'min(calc(100dvh - 40px), var(--screen-height))',
    minHeight: 'min(calc(100dvh - 40px), var(--screen-height))',
    overflow: 'hidden',
    backgroundColor: 'var(--color-bg-screen)',
    boxShadow: 'var(--shadow-screen)',
  },
  phoneScreenCompact: {
    width: '100%',
    height: '100dvh',
    minHeight: '100dvh',
    boxShadow: 'none',
  },
  loginHeader: {
    paddingTop: 77,
    paddingHorizontal: 18,
  },
  loginHeaderCompact: {
    minHeight: 'calc(145px + env(safe-area-inset-top, 0px))',
  },
  loginTitle: {
    margin: 0,
    color: 'var(--color-text-primary)',
    fontFamily: APP_FONT_FAMILY,
    fontSize: 26,
    lineHeight: 33.8,
    fontWeight: '600',
    letterSpacing: -0.78,
    userSelect: 'none',
    WebkitTouchCallout: 'none',
    WebkitUserSelect: 'none',
  },
  loginTitleAccent: {
    color: 'var(--color-text-accent)',
  },
  loginForm: {
    marginTop: 173,
    marginHorizontal: 18,
  },
  inputShell: {
    position: 'relative',
    zIndex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'var(--color-bg-input)',
    transitionDuration: `${motionDurationsMs.fast}ms`,
    transitionProperty: 'background-color, box-shadow, transform',
    transitionTimingFunction: IOS_EASE,
  },
  inputShellFocused: {
    backgroundColor: 'var(--color-bg-input-focus)',
    boxShadow: 'var(--shadow-focus)',
    transform: [{ translateY: -1 }],
  },
  passwordShell: {
    marginTop: 8,
  },
  loginInput: {
    width: '100%',
    height: '100%',
    margin: 0,
    padding: 0,
    borderWidth: 0,
    outlineStyle: 'none',
    backgroundColor: 'transparent',
    color: 'var(--color-text-secondary)',
    fontFamily: APP_FONT_FAMILY,
    fontSize: 18,
    lineHeight: 20,
    letterSpacing: -0.36,
  },
  loginInputFocused: {
    color: 'var(--color-text-accent)',
  },
  appVersion: {
    position: 'absolute',
    right: 0,
    bottom: 82,
    left: 0,
    margin: 0,
    color: 'var(--color-text-muted)',
    fontFamily: APP_FONT_FAMILY,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.3,
    textAlign: 'center',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    WebkitTouchCallout: 'none',
    WebkitUserSelect: 'none',
    transitionDuration: `${motionDurationsMs.fast}ms`,
    transitionProperty: 'opacity',
    transitionTimingFunction: IOS_EASE,
  },
  appVersionHidden: {
    opacity: 0,
  },
  loginButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    outlineStyle: 'none',
    WebkitTapHighlightColor: 'transparent',
    WebkitTouchCallout: 'none',
    WebkitUserSelect: 'none',
    userSelect: 'none',
    touchAction: 'manipulation',
    transitionDuration: `${motionDurationsMs.fast}ms, ${motionDurationsMs.fast}ms, ${motionDurationsMs.fast}ms, ${motionDurationsMs.fast}ms, ${motionDurationsMs.normal}ms`,
    transitionProperty: 'background-color, color, box-shadow, opacity, transform',
    transitionTimingFunction: `${IOS_EASE}, ${IOS_EASE}, ${IOS_EASE}, ${IOS_EASE}, ${IOS_EASE}`,
    willChange: 'transform',
  },
  loginButtonInactive: {
    backgroundColor: 'var(--color-bg-surface-pressed)',
    cursor: 'default',
  },
  loginButtonActive: {
    backgroundColor: 'var(--color-accent-solid)',
    cursor: 'pointer',
  },
  loginButtonFocused: {
    boxShadow: 'var(--shadow-focus)',
  },
  loginButtonOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0,
    backgroundColor: 'var(--color-state-layer-accent)',
    transitionDuration: `${motionDurationsMs.fast}ms`,
    transitionProperty: 'opacity',
    transitionTimingFunction: IOS_EASE,
  },
  pointerEventsNone: {
    pointerEvents: 'none',
  },
  loginButtonOverlayPressed: {
    opacity: 1,
  },
  loginButtonText: {
    color: 'var(--color-text-disabled)',
    fontFamily: APP_FONT_FAMILY,
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 18,
    letterSpacing: -0.36,
  },
  loginButtonTextActive: {
    color: 'var(--color-text-on-accent)',
  },
});
