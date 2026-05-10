import { forwardRef } from 'react';
import {
  Platform,
  StyleSheet,
  Text as ReactNativeText,
  TextInput as ReactNativeTextInput,
} from 'react-native';

import { useTheme } from '../../ThemeContext.js';
import {
  getPretendardFontFamilyForWeight,
  resolveInlineStyle,
} from '../../themeRuntime.js';
import { APP_FONT_FAMILY as THEME_APP_FONT_FAMILY } from '../../theme.js';

export const APP_FONT_FAMILY = THEME_APP_FONT_FAMILY;
const WEB_FONT_SMOOTHING_STYLE = Platform.OS === 'web'
  ? {
      fontSynthesis: 'none',
      WebkitFontSmoothing: 'antialiased',
    }
  : null;
const FONT_FEATURE_STYLE = Platform.select({
  web: {
    fontFeatureSettings: '"ss05"',
  },
  default: {
    fontVariant: ['stylistic-five'],
  },
});
const PRETENDARD_FONT_PATTERN = /Pretendard\s*GOV|PretendardGOV-/i;
const NATIVE_PRETENDARD_FONT_FAMILIES = new Set([
  'PretendardGOV-Regular',
  'PretendardGOV-Medium',
  'PretendardGOV-SemiBold',
  'PretendardGOV-Bold',
]);

function getNativePretendardWeightStyle(style) {
  if (Platform.OS === 'web') {
    return null;
  }

  let flattenedStyle;

  try {
    flattenedStyle = StyleSheet.flatten(style);
  } catch {
    return null;
  }

  if (!flattenedStyle || flattenedStyle.fontWeight == null) {
    return null;
  }

  const fontFamily = flattenedStyle.fontFamily;

  if (fontFamily != null && !PRETENDARD_FONT_PATTERN.test(String(fontFamily))) {
    return null;
  }

  if (NATIVE_PRETENDARD_FONT_FAMILIES.has(fontFamily)) {
    return {
      fontFamily,
      fontWeight: '400',
    };
  }

  return {
    fontFamily: getPretendardFontFamilyForWeight(flattenedStyle.fontWeight),
    fontWeight: '400',
  };
}

export const AppText = forwardRef(function AppText({ style, ...props }, ref) {
  useTheme();
  const resolvedStyle = resolveInlineStyle(style);
  const nativeWeightStyle = getNativePretendardWeightStyle(style);

  return (
    <ReactNativeText
      ref={ref}
      allowFontScaling={false}
      maxFontSizeMultiplier={1}
      style={[styles.text, WEB_FONT_SMOOTHING_STYLE, resolvedStyle, nativeWeightStyle]}
      {...props}
    />
  );
});

export const AppTextInput = forwardRef(function AppTextInput({ style, ...props }, ref) {
  useTheme();
  const resolvedStyle = resolveInlineStyle(style);
  const nativeWeightStyle = getNativePretendardWeightStyle(style);

  return (
    <ReactNativeTextInput
      ref={ref}
      allowFontScaling={false}
      maxFontSizeMultiplier={1}
      style={[styles.textInput, WEB_FONT_SMOOTHING_STYLE, resolvedStyle, nativeWeightStyle]}
      {...props}
    />
  );
});

const styles = StyleSheet.create({
  text: {
    fontFamily: APP_FONT_FAMILY,
    includeFontPadding: false,
    ...FONT_FEATURE_STYLE,
  },
  textInput: {
    fontFamily: APP_FONT_FAMILY,
    includeFontPadding: false,
    ...FONT_FEATURE_STYLE,
    textAlignVertical: 'center',
  },
});
