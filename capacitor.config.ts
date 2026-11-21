import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "io.github.onesislord.chipboy",
  appName: "Chipboy Studio",
  webDir: "dist",
  backgroundColor: "#d4d7c9",
  server: {
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 900,
      backgroundColor: "#d4d7c9",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#e2e0d3",
      overlaysWebView: false,
    },
  },
};

export default config;
