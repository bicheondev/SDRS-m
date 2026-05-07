import { forwardRef } from 'react';
import { StyleSheet, Text as ReactNativeText, TextInput as ReactNativeTextInput } from 'react-native';

import { useTheme } from '../../ThemeContext.js';
import { resolveInlineStyle } from '../../themeRuntime.js';
import { APP_FONT_FAMILY as THEME_APP_FONT_FAMILY } from '../../theme.js';

export const APP_FONT_FAMILY = THEME_APP_FONT_FAMILY;

export const AppText = forwardRef(function AppText({ style, ...props }, ref) {
  useTheme();
  return <ReactNativeText ref={ref} style={[styles.text, resolveInlineStyle(style)]} {...props} />;
});

export const AppTextInput = forwardRef(function AppTextInput({ style, ...props }, ref) {
  useTheme();
  return (
    <ReactNativeTextInput
      ref={ref}
      style={[styles.textInput, resolveInlineStyle(style)]}
      {...props}
    />
  );
});

const styles = StyleSheet.create({
  text: {
    fontFamily: APP_FONT_FAMILY,
  },
  textInput: {
    fontFamily: APP_FONT_FAMILY,
  },
});
