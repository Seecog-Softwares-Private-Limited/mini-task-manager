import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { getWebAppUrl } from "./src/config/web";

const APP_BRAND = "Mini Task Manager";

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const initialUrl = useMemo(() => getWebAppUrl(), []);
  const allowedHost = useMemo(() => {
    try {
      return new URL(initialUrl).host;
    } catch {
      return "";
    }
  }, [initialUrl]);

  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleNavStateChange = useCallback((state: WebViewNavigation) => {
    setCanGoBack(state.canGoBack);
  }, []);

  const handleReload = useCallback(() => {
    setError(null);
    setLoading(true);
    webViewRef.current?.reload();
  }, []);

  const handleShouldStartLoad = useCallback(
    (request: { url: string }) => {
      const { url } = request;

      if (/^(mailto:|tel:|sms:)/i.test(url)) {
        Linking.openURL(url).catch(() => undefined);
        return false;
      }

      try {
        const next = new URL(url);
        const isHttp = next.protocol === "http:" || next.protocol === "https:";
        const isInternal = next.host === allowedHost;
        if (isHttp && !isInternal) {
          Linking.openURL(url).catch(() => undefined);
          return false;
        }
      } catch {
        // Let WebView handle unknown URL parsing cases.
      }

      return true;
    },
    [allowedHost]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ExpoStatusBar style="dark" />
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.brand}>{APP_BRAND}</Text>
        <View style={styles.actions}>
          {canGoBack ? (
            <TouchableOpacity style={styles.actionButton} onPress={() => webViewRef.current?.goBack()}>
              <Text style={styles.actionText}>Back</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.actionButton} onPress={handleReload}>
            <Text style={styles.actionText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      {error ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorTitle}>Unable to load web app</Text>
          <Text style={styles.errorBody}>
            {error}
            {"\n\n"}
            Web URL: {initialUrl}
            {"\n"}
            Tip: keep backend + frontend running, and for physical devices set
            {" "}
            <Text style={styles.code}>EXPO_PUBLIC_WEB_APP_URL</Text>
            {" "}
            to your machine LAN IP.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleReload}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.webviewWrap}>
          <WebView
            ref={webViewRef}
            source={{ uri: initialUrl }}
            onNavigationStateChange={handleNavStateChange}
            onShouldStartLoadWithRequest={handleShouldStartLoad}
            onLoadStart={() => {
              setLoading(true);
              setError(null);
            }}
            onLoadEnd={() => setLoading(false)}
            onError={(evt) => {
              setLoading(false);
              setError(evt.nativeEvent.description || "Network/WebView error");
            }}
            onHttpError={(evt) => {
              setLoading(false);
              setError(`HTTP ${evt.nativeEvent.statusCode}`);
            }}
            startInLoadingState
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            allowsBackForwardNavigationGestures
            pullToRefreshEnabled={Platform.OS === "android"}
            setBuiltInZoomControls={false}
            style={styles.webview}
          />
          {loading ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color="#6366F1" />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : null}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  brand: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  webviewWrap: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingOverlay: {
    position: "absolute",
    right: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  loadingText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
  },
  errorWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
    backgroundColor: "#F8FAFC",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  errorBody: {
    textAlign: "center",
    color: "#475569",
    lineHeight: 20,
    fontSize: 13,
  },
  code: {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    color: "#334155",
    fontWeight: "600",
  },
  retryButton: {
    borderRadius: 10,
    backgroundColor: "#6366F1",
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
});
