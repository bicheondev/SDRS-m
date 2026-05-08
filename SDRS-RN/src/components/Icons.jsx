import { StyleSheet, Text } from 'react-native';

import { useTheme } from '../ThemeContext.js';
import { resolveCssVariableString } from '../theme.js';

const ICON_PRESETS = {
  default: {
    glyphSize: 24,
    offsetX: 0,
    offsetY: 0,
    opticalSize: 24,
    slotSize: 24,
  },
  action: {
    glyphSize: 22,
    offsetX: 0,
    offsetY: 0,
    opticalSize: 24,
    slotSize: 24,
  },
  checkbox: {
    glyphSize: 24,
    offsetX: 0,
    offsetY: 0,
    opticalSize: 24,
    slotSize: 24,
  },
  closeChip: {
    glyphSize: 20,
    offsetX: 0,
    offsetY: 0,
    opticalSize: 20,
    slotSize: 24,
  },
  disclosure: {
    glyphSize: 24,
    offsetX: 0,
    offsetY: 0,
    opticalSize: 24,
    slotSize: 24,
  },
  emptyState: {
    glyphSize: 46,
    offsetX: 0,
    offsetY: 0,
    opticalSize: 48,
    slotSize: 48,
  },
  iosArrow: {
    glyphSize: 24,
    offsetX: 0,
    offsetY: 0,
    opticalSize: 24,
    slotSize: 24,
  },
  modalClose: {
    glyphSize: 20,
    offsetX: 0,
    offsetY: 0,
    opticalSize: 24,
    slotSize: 20,
  },
  plus: {
    glyphSize: 30,
    offsetX: 0,
    offsetY: 0,
    opticalSize: 24,
    slotSize: 24,
  },
  reorder: {
    glyphSize: 18,
    offsetX: 0,
    offsetY: 0,
    opticalSize: 20,
    slotSize: 18,
  },
  search: {
    glyphSize: 24,
    offsetX: 0,
    offsetY: 0,
    opticalSize: 24,
    slotSize: 24,
  },
  statusCompact: {
    glyphSize: 24,
    offsetX: 0,
    offsetY: 0,
    opticalSize: 24,
    slotSize: 24,
  },
  statusSmall: {
    glyphSize: 24,
    offsetX: 0,
    offsetY: 0,
    opticalSize: 24,
    slotSize: 24,
  },
  tab: {
    glyphSize: 24,
    offsetX: 0,
    offsetY: 0,
    opticalSize: 24,
    slotSize: 24,
  },
  toastCheck: {
    glyphSize: 24,
    offsetX: 0,
    offsetY: 0,
    opticalSize: 24,
    slotSize: 24,
  },
  viewMode: {
    glyphSize: 24,
    offsetX: 0,
    offsetY: 0,
    opticalSize: 24,
    slotSize: 24,
  },
};

const LEGACY_CLASS_STYLES = StyleSheet.create({
  bottomTabIcon: {},
  manageChevron: {},
  menuArrow: {
    width: 24,
    height: 24,
  },
  menuSubpageCheck: {
    width: 24,
    height: 24,
  },
  manageDeleteIcon: {
    fontSize: 24,
    lineHeight: 24,
  },
  manageImportCheckboxIcon: {
    width: 24,
    height: 24,
  },
  reorderIcon: {
    width: 18,
    height: 18,
    fontSize: 18,
    lineHeight: 18,
  },
  savedToastIcon: {
    width: 24,
    height: 24,
  },
  statusIcon: {
    width: 24,
    height: 24,
    fontSize: 24,
    lineHeight: 24,
  },
  statusCompact: {
    width: 24,
    height: 24,
    fontSize: 24,
    lineHeight: 24,
  },
  statusEquipmentSmall: {
    width: 18,
    height: 18,
    fontSize: 18,
    lineHeight: 18,
  },
  vesselEmptyStateIcon: {
    width: 48,
    height: 48,
  },
});

const MATERIAL_SYMBOL_CODEPOINTS = {
  add: 0xe145,
  arrow_back_ios_new: 0xe2ea,
  arrow_forward_ios: 0xe5e1,
  cancel: 0xe5c9,
  check: 0xe5ca,
  check_circle: 0xe86c,
  check_small: 0xf88b,
  close: 0xe5cd,
  data_table: 0xe99c,
  database: 0xf20e,
  dehaze: 0xe3c7,
  delete: 0xe872,
  drag_indicator: 0xe945,
  event_list: 0xf683,
  keyboard_arrow_down: 0xe313,
  keyboard_arrow_up: 0xe316,
  search: 0xe8b6,
  sticky_note_2: 0xf1fc,
  view_stream: 0xe8f2,
};

function getMaterialSymbolGlyph(name) {
  const codepoint = MATERIAL_SYMBOL_CODEPOINTS[name];

  if (Number.isInteger(codepoint)) {
    return String.fromCodePoint(codepoint);
  }

  return name;
}

function getLegacyClassStyles(className) {
  if (!className) {
    return [];
  }

  return className
    .split(/\s+/)
    .map((token) => {
      if (token === 'menu-row__arrow') {
        return LEGACY_CLASS_STYLES.menuArrow;
      }
      if (token === 'menu-subpage__check') {
        return LEGACY_CLASS_STYLES.menuSubpageCheck;
      }
      if (token === 'manage-ship-card__delete-icon') {
        return LEGACY_CLASS_STYLES.manageDeleteIcon;
      }
      if (token === 'manage-ship-import-modal__checkbox-icon') {
        return LEGACY_CLASS_STYLES.manageImportCheckboxIcon;
      }
      if (token === 'manage-home__chevron') {
        return LEGACY_CLASS_STYLES.manageChevron;
      }
      if (token === 'manage-ship-card__reorder-icon') {
        return LEGACY_CLASS_STYLES.reorderIcon;
      }
      if (token === 'manage-saved-toast__icon') {
        return LEGACY_CLASS_STYLES.savedToastIcon;
      }
      if (token === 'status-icon') {
        return LEGACY_CLASS_STYLES.statusIcon;
      }
      if (token === 'status-icon--compact') {
        return LEGACY_CLASS_STYLES.statusCompact;
      }
      if (token === 'status-icon--equipment-small') {
        return LEGACY_CLASS_STYLES.statusEquipmentSmall;
      }
      if (token === 'vessel-empty-state__icon') {
        return LEGACY_CLASS_STYLES.vesselEmptyStateIcon;
      }
      return null;
    })
    .filter(Boolean);
}

function getToneColor(tone) {
  if (tone === 'primary') return resolveCssVariableString('var(--color-text-primary)');
  if (tone === 'secondary') return resolveCssVariableString('var(--color-text-secondary)');
  if (tone === 'tertiary') return resolveCssVariableString('var(--color-text-tertiary)');
  if (tone === 'muted') return resolveCssVariableString('var(--color-text-muted)');
  if (tone === 'slate-300') return resolveCssVariableString('var(--slate-300)');
  if (tone === 'slate-400') return resolveCssVariableString('var(--slate-400)');
  if (tone === 'slate-500') return resolveCssVariableString('var(--slate-500)');
  if (tone === 'slate-700') return resolveCssVariableString('var(--slate-700)');
  if (tone === 'blue-500') return resolveCssVariableString('var(--blue-500)');
  if (tone === 'accent') return resolveCssVariableString('var(--color-accent)');
  if (tone === 'violet') return resolveCssVariableString('var(--color-text-violet)');
  if (tone === 'violet-muted') return resolveCssVariableString('var(--color-text-violet-muted)');
  if (tone === 'danger') return resolveCssVariableString('var(--color-text-danger)');
  if (tone === 'on-accent') return resolveCssVariableString('var(--color-text-on-accent)');
  return undefined;
}

export function AppIcon({
  className = '',
  glyphSize,
  label,
  name,
  offsetX,
  offsetY,
  opticalSize,
  preset = 'default',
  slotSize,
  style,
  tone = 'current',
  weight,
}) {
  useTheme();
  const basePreset = ICON_PRESETS[preset] ?? ICON_PRESETS.default;
  const resolvedSlotSize = slotSize ?? basePreset.slotSize;
  const resolvedGlyphSize = glyphSize ?? basePreset.glyphSize;
  const resolvedOffsetX = offsetX ?? basePreset.offsetX;
  const resolvedOffsetY = offsetY ?? basePreset.offsetY;

  return (
    <Text
      accessibilityLabel={label}
      accessibilityRole={label ? 'image' : undefined}
      accessible={Boolean(label)}
      className={`app-icon material-symbols-rounded app-icon--tone-${tone} ${className}`.trim()}
      style={[
        {
          color: getToneColor(tone),
          fontFamily: 'MaterialSymbolsRounded',
          fontSize: resolvedGlyphSize,
          includeFontPadding: false,
          height: resolvedSlotSize,
          lineHeight: resolvedGlyphSize,
          textAlign: 'center',
          textAlignVertical: 'center',
          width: resolvedSlotSize,
          transform: [{ translateX: resolvedOffsetX }, { translateY: resolvedOffsetY }],
        },
        ...getLegacyClassStyles(className),
        style,
      ]}
    >
      {getMaterialSymbolGlyph(name)}
    </Text>
  );
}
