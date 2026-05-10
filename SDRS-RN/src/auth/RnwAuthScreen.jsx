import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
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
  useAnimatedKeyboard,
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
const LOGIN_FORM_KEYBOARD_LIFT = 64;
const ANDROID_BOTTOM_CHROME_FALLBACK = 24;
const IS_WEB = Platform.OS === 'web';
const ANIMATED_KEYBOARD_OPTIONS = {
  isStatusBarTranslucentAndroid: true,
  isNavigationBarTranslucentAndroid: true,
};
const WEB_LOGIN_FONT_RENDERING_STYLE = Platform.OS === 'web'
  ? { fontSynthesis: 'none' }
  : null;
const LOGIN_FONT_FEATURE_STYLE = Platform.select({
  web: {
    fontFeatureSettings: '"ss05"',
  },
  default: {
    fontVariant: ['stylistic-five'],
  },
});

function useLoginAnimatedKeyboard() {
  if (IS_WEB) {
    return { height: useSharedValue(0) };
  }

  return useAnimatedKeyboard(ANIMATED_KEYBOARD_OPTIONS);
}

export function RnwAuthScreen({
  focusedField,
  isFilled,
  loginSubmitted = false,
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
  const animatedKeyboard = useLoginAnimatedKeyboard();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const phoneScreenLayoutStyle = { width, flex: 1, minHeight: 0 };
  const topInset = Math.max(insets.top, 0);
  const bottomInset = Math.max(insets.bottom, 0);
  const androidBottomChromeInset = Platform.OS === 'android'
    ? Math.max(bottomInset, ANDROID_BOTTOM_CHROME_FALLBACK)
    : 0;
  const dockBottomInset = keyboardVisible
    ? 0
    : (Platform.OS === 'android' ? androidBottomChromeInset : bottomInset);
  const usernameFocused = focusedField === 'username';
  const passwordFocused = focusedField === 'password';
  const inputBgColor = resolveCssVariableString('var(--color-bg-input)');
  const inputFocusBgColor = resolveCssVariableString('var(--color-bg-input-focus)');
  const placeholderFocusedColor = resolveCssVariableString('var(--color-text-accent-strong)');
  const selectionColor = resolveCssVariableString('var(--color-text-accent)');
  const usernameFocusProgress = useSharedValue(usernameFocused ? 1 : 0);
  const passwordFocusProgress = useSharedValue(passwordFocused ? 1 : 0);
  const loginButtonPressProgress = useSharedValue(0);
  const shouldHideVersion = Boolean(focusedField || loginSubmitted);
  const appVersionProgress = useSharedValue(shouldHideVersion ? 0 : 1);
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
  const loginButtonDockAnimatedStyle = useAnimatedStyle(() => {
    const keyboardOffset = Math.max(0, animatedKeyboard.height.value);

    return {
      transform: [{ translateY: -keyboardOffset }],
    };
  });

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
    appVersionProgress.value = withTiming(shouldHideVersion ? 0 : 1, {
      duration: motionDurationsMs.fast,
      easing: Easing.bezier(...motionTokens.ease.ios),
    });
  }, [appVersionProgress, shouldHideVersion]);

  useEffect(() => {
    keyboardLiftProgress.value = withTiming(keyboardVisible ? 1 : 0, {
      duration: motionDurationsMs.normal,
      easing: Easing.bezier(...motionTokens.ease.ios),
    });
  }, [keyboardLiftProgress, keyboardVisible]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
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
            contentContainerStyle={[
              styles.loginScrollContent,
              { paddingBottom: 96 + dockBottomInset },
            ]}
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
            선박DB정보체계 버전 0.9 Beta
          </Animated.Text>

          <Animated.View
            style={[
              styles.loginButtonDock,
              loginButtonDockAnimatedStyle,
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
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
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
    ...LOGIN_FONT_FEATURE_STYLE,
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
    ...LOGIN_FONT_FEATURE_STYLE,
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
    ...LOGIN_FONT_FEATURE_STYLE,
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
    ...LOGIN_FONT_FEATURE_STYLE,
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
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
    elevation: 10,
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
    ...LOGIN_FONT_FEATURE_STYLE,
  },
  loginButtonTextActive: {
    color: 'var(--color-text-on-accent)',
  },
});
