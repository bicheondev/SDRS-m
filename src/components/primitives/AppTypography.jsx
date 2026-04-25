import { forwardRef } from 'react';
import { StyleSheet, Text as ReactNativeText, TextInput as ReactNativeTextInput } from 'react-native';

export const APP_FONT_FAMILY =
  'Pretendard GOV Variable, Pretendard GOV, -apple-system, BlinkMacSystemFont, system-ui, Roboto, Helvetica Neue, Segoe UI, Apple SD Gothic Neo, Noto Sans KR, Malgun Gothic, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol, sans-serif';

export const AppText = forwardRef(function AppText({ style, ...props }, ref) {
  return <ReactNativeText ref={ref} style={[styles.text, style]} {...props} />;
});

export const AppTextInput = forwardRef(function AppTextInput({ style, ...props }, ref) {
  return <ReactNativeTextInput ref={ref} style={[styles.textInput, style]} {...props} />;
});

const styles = StyleSheet.create({
  text: {
    fontFamily: APP_FONT_FAMILY,
  },
  textInput: {
    fontFamily: APP_FONT_FAMILY,
  },
});
