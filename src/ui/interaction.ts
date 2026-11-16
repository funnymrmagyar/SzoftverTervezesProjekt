import { Platform, type ViewStyle } from 'react-native';

import { colors } from './theme';

/*
 * Közös interakciós stílusok a kattintható elemekhez. Böngészőben mutató kurzor és rövid,
 * finom átmenet a színváltásokhoz (rámutatás, kijelölés); telefonon ezek nem kellenek.
 */

const web = Platform.OS === 'web';

export const pointerCursor: ViewStyle | undefined = web ? { cursor: 'pointer' } : undefined;

export const hoverTransition: ViewStyle | undefined = web
  ? ({
      transitionProperty: 'background-color, border-color, opacity, transform',
      transitionDuration: '140ms',
      transitionTimingFunction: 'ease-out',
    } as ViewStyle)
  : undefined;

/**
 * Billentyűzetes fókusz jelzése körvonallal. A keret vastagsága nem változik, így a fókusz
 * nem tolja el az elemet (korábban 1 → 2 px-es kerettel ugrott egyet).
 */
export const focusRing: ViewStyle = {
  outlineColor: colors.accent,
  outlineStyle: 'solid',
  outlineWidth: 2,
  outlineOffset: 2,
};
