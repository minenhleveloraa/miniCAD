/** Shared MiniCAD design tokens. Screens should not redefine these values. */
export const colors = {
  canvas: "#FAF6F1",
  surface: "#FEFCF9",
  surfaceStrong: "#FFFFFF",
  ink: "#1A1A2E",
  inkSoft: "#3D3D56",
  inkMuted: "#6B6B80",
  accent: "#E8634A",
  accentLight: "#F4845F",
  amber: "#F5A623",
  border: "rgba(26, 26, 46, 0.10)",
  onDark: "#FFFFFF",
  onDarkMuted: "rgba(255, 255, 255, 0.58)",
  success: "#18794E",
  successSurface: "#ECFDF3",
  danger: "#B42318",
  dangerSurface: "#FFF1F0",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  full: 999,
} as const;

/** Font-family names registered once by the root layout. */
export const fonts = {
  sansLight: "DMSans_300Light",
  sansRegular: "DMSans_400Regular",
  sansMedium: "DMSans_500Medium",
  sansSemiBold: "DMSans_600SemiBold",
  sansBold: "DMSans_700Bold",
  serif: "DMSerifDisplay_400Regular",
} as const;

export const typography = {
  eyebrow: { fontFamily: fonts.sansBold, fontSize: 12, letterSpacing: 1.4 },
  title: { fontFamily: fonts.serif, fontSize: 38, lineHeight: 42, letterSpacing: -1.1 },
  heading: { fontFamily: fonts.sansBold, fontSize: 26, lineHeight: 32, letterSpacing: -0.6 },
  body: { fontFamily: fonts.sansRegular, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fonts.sansSemiBold, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.sansMedium, fontSize: 12, lineHeight: 18 },
} as const;

export const shadows = {
  card: "0 14px 38px rgba(26, 26, 46, 0.12)",
  button: "0 14px 28px rgba(232, 99, 74, 0.28)",
} as const;
