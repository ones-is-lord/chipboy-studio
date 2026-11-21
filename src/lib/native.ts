import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Share } from "@capacitor/share";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { downloadBlob } from "./wav";

export const isNative = Capacitor.isNativePlatform();
export const isAndroid = Capacitor.getPlatform() === "android";

const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file."));
    reader.readAsDataURL(blob);
  });

export async function saveBlob(blob: Blob, filename: string) {
  if (!isNative) {
    downloadBlob(blob, filename);
    return;
  }

  const path = `exports/${filename}`;
  await Filesystem.writeFile({
    path,
    data: await blobToBase64(blob),
    directory: Directory.Cache,
    recursive: true,
  });
  const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
  const canShare = await Share.canShare();
  if (canShare.value) {
    await Share.share({
      title: filename,
      url: uri,
      dialogTitle: "Save or share your Chipboy file",
    });
  }
}

export async function shareLink(url: string, title = "Chipboy Studio song") {
  if (isNative) {
    await Share.share({ title, url, dialogTitle: "Share song link" });
    return true;
  }
  if (navigator.share) {
    await navigator.share({ title, url });
    return true;
  }
  return false;
}

export async function tapHaptic() {
  if (!isNative) return;
  await Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
}

export async function initNativeShell() {
  if (!isNative) return;

  document.documentElement.classList.add("native-shell");
  await StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined);
  await StatusBar.setBackgroundColor({ color: "#e2e0d3" }).catch(() => undefined);
  await SplashScreen.hide().catch(() => undefined);

  if (isAndroid) {
    await App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) window.history.back();
      else void App.exitApp();
    });
  }
}
