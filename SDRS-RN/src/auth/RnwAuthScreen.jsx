import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
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
import { resolveCssVariableString } from '../theme.js';
import { AppShellGradient } from '../components/layout/ScreenLayout.jsx';

const LOGIN_TITLE_FONT_FAMILY = 'PretendardGOV-SemiBold';
const LOGIN_REGULAR_FONT_FAMILY = 'PretendardGOV-Regular';
const LOGIN_MEDIUM_FONT_FAMILY = 'PretendardGOV-Medium';
const LOGIN_PLACEHOLDER_COLOR = '#94a3b8';
const LOGIN_FORM_KEYBOARD_LIFT = 88;
const WEB_LOGIN_FONT_RENDERING_STYLE = Platform.OS === 'web'
  ? { fontSynthesis: 'none' }
  : null;

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
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const phoneScreenLayoutStyle = { width, flex: 1, minHeight: 0 };
  const keyboardBehavior = 'padding';
  const topInset = Math.max(insets.top, 0);
  const bottomInset = Math.max(insets.bottom, 0);
  const dockBottomInset = keyboardVisible ? 0 : bottomInset;
  const usernameFocused = focusedField === 'username';
  const passwordFocused = focusedField === 'password';
  const inputBgColor = resolveCssVariableString('var(--color-bg-input)');
  const inputFocusBgColor = resolveCssVariableString('var(--color-bg-input-focus)');
  const placeholderFocusedColor = resolveCssVariableString('var(--color-text-accent-strong)');
  const selectionColor = resolveCssVariableString('var(--color-text-accent)');
  const usernameFocusProgress = useSharedValue(usernameFocused ? 1 : 0);
  const passwordFocusProgress = useSharedValue(passwordFocused ? 1 : 0);
  const loginButtonPressProgress = useSharedValue(0);
  const appVersionProgress = useSharedValue(focusedField ? 0 : 1);
  const keyboardLiftProgress = useSharedValue(0);
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
  const usernamePlaceholderStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      usernameFocusProgress.value,
      [0, 1],
      [LOGIN_PLACEHOLDER_COLOR, placeholderFocusedColor],
    ),
  }));
  const passwordPlaceholderStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      passwordFocusProgress.value,
      [0, 1],
      [LOGIN_PLACEHOLDER_COLOR, placeholderFocusedColor],
    ),
  }));
  const loginButtonOverlayStyle = useAnimatedStyle(() => ({
    opacity: loginButtonPressProgress.value,
  }));
  const appVersionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: appVersionProgress.value,
  }));
  const loginFormKeyboardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -LOGIN_FORM_KEYBOARD_LIFT * keyboardLiftProgress.value }],
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

  useEffect(() => {
    if (!isFilled) {
      loginButtonPressProgress.value = withTiming(0, {
        duration: motionDurationsMs.fast,
        easing: Easing.bezier(...motionTokens.ease.ios),
      });
    }
  }, [isFilled, loginButtonPressProgress]);

  useEffect(() => {
    appVersionProgress.value = withTiming(focusedField ? 0 : 1, {
      duration: motionDurationsMs.fast,
      easing: Easing.bezier(...motionTokens.ease.ios),
    });
  }, [appVersionProgress, focusedField]);

  useEffect(() => {
    keyboardLiftProgress.value = withTiming(keyboardVisible ? 1 : 0, {
      duration: motionDurationsMs.normal,
      easing: Easing.bezier(...motionTokens.ease.ios),
    });
  }, [keyboardLiftProgress, keyboardVisible]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleSubmit = () => {
    if (isFilled) {
      onSubmit();
    }
  };

  const handleUsernameSubmit = () => {
    passwordInputRef.current?.focus();
  };

  const handleLoginPressIn = () => {
    if (!isFilled) {
      return;
    }

    loginButtonPressProgress.value = withTiming(1, {
      duration: motionDurationsMs.fast,
      easing: Easing.bezier(...motionTokens.ease.ios),
    });
  };

  const handleLoginPressOut = () => {
    loginButtonPressProgress.value = withTiming(0, {
      duration: motionDurationsMs.fast,
      easing: Easing.bezier(...motionTokens.ease.ios),
    });
  };

  return (
    <View style={[styles.root, WEB_LOGIN_FONT_RENDERING_STYLE]}>
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
              padding: 0,
              justifyContent: 'flex-start',
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
                <View style={styles.loginTitle}>
                  <Text style={styles.loginTitleLine}>
                    <Text style={styles.loginTitleAccent}>로그인 정보</Text>를
                  </Text>
                  <Text style={styles.loginTitleLine}>입력하세요.</Text>
                </View>
              </View>

              <Animated.View style={[styles.loginForm, loginFormKeyboardStyle]}>
                <Animated.View
                  style={[
                    styles.inputShell,
                    usernameFocused && styles.inputShellFocused,
                    usernameInputShellStyle,
                  ]}
                >
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    blurOnSubmit={false}
                    enterKeyHint="next"
                    onBlur={onFieldBlur}
                    onChangeText={onUsernameChange}
                    onFocus={() => onFieldFocus('username')}
                    onSubmitEditing={handleUsernameSubmit}
                    returnKeyType="next"
                    selectionColor={selectionColor}
                    spellCheck={false}
                    style={[styles.loginInput, usernameFocused && styles.loginInputFocused]}
                    value={username}
                  />
                  {username ? null : (
                    <View style={styles.loginPlaceholderOverlay}>
                      <Animated.Text style={[styles.loginPlaceholderText, usernamePlaceholderStyle]}>
                        아이디
                      </Animated.Text>
                    </View>
                  )}
                </Animated.View>

                <Animated.View
                  style={[
                    styles.inputShell,
                    styles.passwordShell,
                    passwordFocused && styles.inputShellFocused,
                    passwordInputShellStyle,
                  ]}
                >
                  <TextInput
                    ref={passwordInputRef}
                    enterKeyHint="go"
                    onBlur={onFieldBlur}
                    onChangeText={onPasswordChange}
                    onFocus={() => onFieldFocus('password')}
                    onSubmitEditing={handleSubmit}
                    returnKeyType="go"
                    secureTextEntry
                    selectionColor={selectionColor}
                    style={[styles.loginInput, passwordFocused && styles.loginInputFocused]}
                    value={password}
                  />
                  {password ? null : (
                    <View style={styles.loginPlaceholderOverlay}>
                      <Animated.Text style={[styles.loginPlaceholderText, passwordPlaceholderStyle]}>
                        비밀번호
                      </Animated.Text>
                    </View>
                  )}
                </Animated.View>
              </Animated.View>
            </ScrollView>

            <Animated.Text
              style={[styles.appVersion, { bottom: 82 + bottomInset }, appVersionAnimatedStyle]}
            >
              선박DB정보체계 버전 1.0
            </Animated.Text>

            <View
              style={[
                styles.loginButtonDock,
                {
                  height: 64 + dockBottomInset,
                  paddingBottom: dockBottomInset,
                },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                disabled={!isFilled}
                onPress={handleSubmit}
                onPressIn={handleLoginPressIn}
                onPressOut={handleLoginPressOut}
                style={({ focused }) => [
                  styles.loginButton,
                  isFilled ? styles.loginButtonActive : styles.loginButtonInactive,
                  focused ? styles.loginButtonFocused : null,
                ]}
              >
                {() => (
                  <>
                    <Animated.View
                      style={[
                        styles.loginButtonOverlay,
                        styles.pointerEventsNone,
                        loginButtonOverlayStyle,
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
    alignItems: 'flex-start',
  },
  loginTitleLine: {
    margin: 0,
    color: 'var(--color-text-primary)',
    fontFamily: LOGIN_TITLE_FONT_FAMILY,
    fontSize: 26,
    fontWeight: '600',
    includeFontPadding: false,
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
    fontFamily: LOGIN_REGULAR_FONT_FAMILY,
    fontSize: 18,
    includeFontPadding: false,
  },
  loginInputFocused: {
    color: 'var(--color-text-accent)',
  },
  loginPlaceholderOverlay: {
    position: 'absolute',
    top: 0,
    right: 16,
    bottom: 0,
    left: 16,
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  loginPlaceholderText: {
    color: LOGIN_PLACEHOLDER_COLOR,
    fontFamily: LOGIN_REGULAR_FONT_FAMILY,
    fontSize: 18,
    includeFontPadding: false,
  },
  appVersion: {
    position: 'absolute',
    right: 0,
    bottom: 82,
    left: 0,
    margin: 0,
    color: 'var(--color-text-muted)',
    fontFamily: LOGIN_REGULAR_FONT_FAMILY,
    fontSize: 15,
    includeFontPadding: false,
    textAlign: 'center',
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
  loginButtonText: {
    color: 'var(--color-text-disabled)',
    fontFamily: LOGIN_MEDIUM_FONT_FAMILY,
    fontSize: 18,
    fontWeight: '500',
    includeFontPadding: false,
  },
  loginButtonTextActive: {
    color: 'var(--color-text-on-accent)',
  },
});
