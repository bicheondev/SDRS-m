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
const PRETENDARD_FONT_PATTERN = /Pretendard\s*GOV|PretendardGOV-/i;

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
  },
  textInput: {
    fontFamily: APP_FONT_FAMILY,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
