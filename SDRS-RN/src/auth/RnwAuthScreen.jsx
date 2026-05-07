import { useEffect, useRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../ThemeContext.js';
import { motionDurationsMs, motionTokens } from '../motion.js';
import { APP_FONT_FAMILY, resolveCssVariableString } from '../theme.js';
import { AppShellGradient, SCREEN_HEIGHT, SCREEN_WIDTH } from '../components/layout/ScreenLayout.jsx';

export function RnwAuthScreen({
  focusedField,
  isFilled,
  onFieldBlur,
  onFieldFocus,
  onPasswordChange,
  onSubmit,
  onUsernameChange,
  password,
  username,
}) {
  useTheme();
  const passwordInputRef = useRef(null);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompactViewport = width <= 480;
  const screenWidth = Math.min(width, SCREEN_WIDTH);
  const screenHeight = isCompactViewport
    ? height
    : Math.min(Math.max(height - 40, 1), SCREEN_HEIGHT);
  const phoneScreenLayoutStyle = isCompactViewport
    ? { width: screenWidth, flex: 1, minHeight: 0 }
    : { width: screenWidth, height: screenHeight, minHeight: screenHeight };
  const keyboardBehavior = Platform.OS === 'ios' ? 'padding' : 'height';
  const topInset = Math.max(insets.top, 0);
  const bottomInset = Math.max(insets.bottom, 0);
  const usernameFocused = focusedField === 'username';
  const passwordFocused = focusedField === 'password';
  const inputBgColor = resolveCssVariableString('var(--color-bg-input)');
  const inputFocusBgColor = resolveCssVariableString('var(--color-bg-input-focus)');
  const usernameFocusProgress = useSharedValue(usernameFocused ? 1 : 0);
  const passwordFocusProgress = useSharedValue(passwordFocused ? 1 : 0);
  const usernameInputShellStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      usernameFocusProgress.value,
      [0, 1],
      [inputBgColor, inputFocusBgColor],
    ),
    transform: [{ translateY: -usernameFocusProgress.value }],
  }));
  const passwordInputShellStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      passwordFocusProgress.value,
      [0, 1],
      [inputBgColor, inputFocusBgColor],
    ),
    transform: [{ translateY: -passwordFocusProgress.value }],
  }));

  useEffect(() => {
    usernameFocusProgress.value = withTiming(usernameFocused ? 1 : 0, {
      duration: motionDurationsMs.fast,
      easing: Easing.bezier(...motionTokens.ease.ios),
    });
  }, [usernameFocusProgress, usernameFocused]);

  useEffect(() => {
    passwordFocusProgress.value = withTiming(passwordFocused ? 1 : 0, {
      duration: motionDurationsMs.fast,
      easing: Easing.bezier(...motionTokens.ease.ios),
    });
  }, [passwordFocusProgress, passwordFocused]);

  const handleSubmit = () => {
    if (isFilled) {
      onSubmit();
    }
  };

  const handleUsernameSubmit = () => {
    passwordInputRef.current?.focus();
  };

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        behavior={keyboardBehavior}
        keyboardVerticalOffset={0}
        style={styles.keyboardRoot}
      >
        <View
          style={[
            styles.appShell,
            {
              width,
              padding: isCompactViewport ? 0 : 20,
              justifyContent: isCompactViewport ? 'flex-start' : 'center',
            },
          ]}
        >
          <AppShellGradient />
          <View
            style={[
              styles.phoneScreen,
              phoneScreenLayoutStyle,
            ]}
          >
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.loginScroll}
              contentContainerStyle={styles.loginScrollContent}
            >
              <View style={[styles.loginHeader, { paddingTop: 77 + topInset }]}>
                <Text style={styles.loginTitle}>
                  <Text style={styles.loginTitleAccent}>로그인 정보</Text>를
                  {'\n'}
                  입력하세요.
                </Text>
              </View>

              <View style={styles.loginForm}>
                <Animated.View style={[styles.inputShell, usernameInputShellStyle]}>
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
                    placeholderTextColor={resolveCssVariableString(
                      usernameFocused
                        ? 'var(--color-text-accent-strong)'
                        : 'var(--color-text-muted)',
                    )}
                    returnKeyType="next"
                    selectionColor={resolveCssVariableString('var(--color-text-accent)')}
                    spellCheck={false}
                    style={[styles.loginInput, usernameFocused && styles.loginInputFocused]}
                    value={username}
                  />
                </Animated.View>

                <Animated.View style={[styles.inputShell, styles.passwordShell, passwordInputShellStyle]}>
                  <TextInput
                    ref={passwordInputRef}
                    enterKeyHint="go"
                    onBlur={onFieldBlur}
                    onChangeText={onPasswordChange}
                    onFocus={() => onFieldFocus('password')}
                    onSubmitEditing={handleSubmit}
                    placeholder="비밀번호"
                    placeholderTextColor={resolveCssVariableString(
                      passwordFocused
                        ? 'var(--color-text-accent-strong)'
                        : 'var(--color-text-muted)',
                    )}
                    returnKeyType="go"
                    secureTextEntry
                    selectionColor={resolveCssVariableString('var(--color-text-accent)')}
                    style={[styles.loginInput, passwordFocused && styles.loginInputFocused]}
                    value={password}
                  />
                </Animated.View>
              </View>
            </ScrollView>

            <Text style={[styles.appVersion, { bottom: 82 + bottomInset }, focusedField ? styles.appVersionHidden : null]}>
              선박DB정보체계 버전 1.0
            </Text>

            <View style={[styles.loginButtonDock, { height: 64 + bottomInset, paddingBottom: bottomInset }]}>
              <Pressable
                accessibilityRole="button"
                disabled={!isFilled}
                onPress={handleSubmit}
                style={({ focused }) => [
                  styles.loginButton,
                  isFilled ? styles.loginButtonActive : styles.loginButtonInactive,
                  focused ? styles.loginButtonFocused : null,
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
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
  },
  keyboardRoot: {
    flex: 1,
    width: '100%',
  },
  appShell: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    backgroundColor: 'var(--color-bg-app)',
    overflow: 'hidden',
  },
  phoneScreen: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: 'var(--color-bg-screen)',
  },
  loginScroll: {
    flex: 1,
    width: '100%',
  },
  loginScrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  loginHeader: {
    paddingHorizontal: 18,
  },
  loginTitle: {
    margin: 0,
    color: 'var(--color-text-primary)',
    fontFamily: APP_FONT_FAMILY,
    fontSize: 26,
    lineHeight: 33.8,
    fontWeight: '600',
    includeFontPadding: false,
    letterSpacing: -0.78,
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
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 14,
    backgroundColor: 'var(--color-bg-input)',
  },
  inputShellFocused: {
    backgroundColor: 'var(--color-bg-input-focus)',
    borderColor: 'var(--color-border-accent-focus)',
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
    backgroundColor: 'transparent',
    color: 'var(--color-text-secondary)',
    fontFamily: APP_FONT_FAMILY,
    fontSize: 18,
    includeFontPadding: false,
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
    includeFontPadding: false,
    lineHeight: 20,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  appVersionHidden: {
    opacity: 0,
  },
  loginButton: {
    width: '100%',
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  loginButtonDock: {
    zIndex: 10,
    elevation: 10,
    flexShrink: 0,
    width: '100%',
    height: 64,
  },
  loginButtonInactive: {
    backgroundColor: 'var(--color-bg-surface-pressed)',
  },
  loginButtonActive: {
    backgroundColor: 'var(--color-accent-solid)',
  },
  loginButtonFocused: {
    borderColor: 'var(--color-border-accent-focus)',
  },
  loginButtonOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0,
    backgroundColor: 'var(--color-state-layer-accent)',
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
    includeFontPadding: false,
    lineHeight: 18,
    letterSpacing: -0.36,
  },
  loginButtonTextActive: {
    color: 'var(--color-text-on-accent)',
  },
});
