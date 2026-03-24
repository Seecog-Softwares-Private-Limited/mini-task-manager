import { Platform } from "react-native";

const explicitUrl = process.env.EXPO_PUBLIC_WEB_APP_URL?.trim();

function normalizeUrl(url: string): string {
  const hasProtocol = /^https?:\/\//i.test(url);
  return hasProtocol ? url : `https://${url}`;
}

function defaultDevUrl(): string {
  // Android emulator cannot reach host localhost directly.
  if (Platform.OS === "android") return "http://10.0.2.2:3008";
  return "http://localhost:3008";
}

export function getWebAppUrl(): string {
  const base = explicitUrl ? normalizeUrl(explicitUrl) : defaultDevUrl();
  try {
    const url = new URL(base);
    // Always start mobile app at login on fresh launch.
    url.pathname = "/login";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return `${base.replace(/\/+$/, "")}/login`;
  }
}
