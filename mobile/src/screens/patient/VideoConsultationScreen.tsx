import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { consultationsApi } from "../../services/consultationsApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "VideoConsultation">;

const CareMateWebView = WebView as unknown as React.ComponentType<any>;

const AUTO_JOIN_HASH_PARAMS = [
  "config.prejoinConfig.enabled=false",
  "config.prejoinPageEnabled=false",
  "config.disableDeepLinking=true",
  "config.enableWelcomePage=false",
  "config.startWithAudioMuted=false",
  "config.startWithVideoMuted=false",
  "config.startAudioOnly=false",
  "config.disableInitialGUM=false",
  "config.disableAudioLevels=false",
  "config.enableNoAudioDetection=false",
  "config.enableNoisyMicDetection=false",
  "config.disableDeviceChangeNotifications=true",
  "config.disableReactions=true",
  "config.disablePolls=true",
  "config.disableInviteFunctions=true",
  "interfaceConfig.TOOLBAR_ALWAYS_VISIBLE=true",
  "interfaceConfig.DISABLE_JOIN_LEAVE_NOTIFICATIONS=true",
  "userInfo.displayName=%22CareMate%2B%20Patient%22",
];

const buildAutoJoinMeetingUrl = (url: string) => {
  if (!url) {
    return "";
  }

  const [urlBeforeHash, existingHash = ""] = url.split("#");
  const autoJoinParams = AUTO_JOIN_HASH_PARAMS.join("&");

  if (!existingHash) {
    return `${urlBeforeHash}#${autoJoinParams}`;
  }

  return `${urlBeforeHash}#${existingHash}&${autoJoinParams}`;
};

const requestAndroidMediaPermissions = async () => {
  if (Platform.OS !== "android") {
    return true;
  }

  const cameraAlreadyGranted = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.CAMERA
  );

  const audioAlreadyGranted = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
  );

  if (cameraAlreadyGranted && audioAlreadyGranted) {
    return true;
  }

  const result = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.CAMERA,
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  ]);

  const cameraGranted =
    result[PermissionsAndroid.PERMISSIONS.CAMERA] ===
    PermissionsAndroid.RESULTS.GRANTED;

  const audioGranted =
    result[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] ===
    PermissionsAndroid.RESULTS.GRANTED;

  return cameraGranted && audioGranted;
};

const WEBVIEW_MEDIA_CLEANUP_SCRIPT = `
(function () {
  try {
    function caremateStopStream(stream) {
      if (!stream || typeof stream.getTracks !== "function") {
        return;
      }

      var tracks = stream.getTracks();

      for (var i = 0; i < tracks.length; i++) {
        try {
          tracks[i].stop();
        } catch (error) {}
      }
    }

    if (window.__carematePatientMediaStream) {
      caremateStopStream(window.__carematePatientMediaStream);
      window.__carematePatientMediaStream = null;
    }

    var videos = Array.prototype.slice.call(document.querySelectorAll("video"));

    for (var j = 0; j < videos.length; j++) {
      var video = videos[j];

      try {
        if (video.srcObject) {
          caremateStopStream(video.srcObject);
          video.srcObject = null;
        }
      } catch (error) {}
    }

    var audios = Array.prototype.slice.call(document.querySelectorAll("audio"));

    for (var k = 0; k < audios.length; k++) {
      var audio = audios[k];

      try {
        if (audio.srcObject) {
          caremateStopStream(audio.srcObject);
          audio.srcObject = null;
        }
      } catch (error) {}
    }
  } catch (error) {}

  true;
})();
`;

const PATIENT_AUTO_MEDIA_SCRIPT = `
(function () {
  if (window.__carematePatientAutoMediaEnabled) {
    true;
    return;
  }

  window.__carematePatientAutoMediaEnabled = true;

  function caremateTextOfElement(element) {
    if (!element) {
      return "";
    }

    return (
      (element.getAttribute("aria-label") || "") +
      " " +
      (element.getAttribute("title") || "") +
      " " +
      (element.innerText || "") +
      " " +
      (element.textContent || "")
    ).toLowerCase();
  }

  function caremateClickButtonByLabels(labels) {
    var elements = Array.prototype.slice.call(
      document.querySelectorAll("button, div[role='button'], span[role='button']")
    );

    for (var i = 0; i < elements.length; i++) {
      var element = elements[i];
      var text = caremateTextOfElement(element);

      for (var j = 0; j < labels.length; j++) {
        if (text.indexOf(labels[j]) !== -1) {
          if (
            !element.disabled &&
            element.getAttribute("aria-disabled") !== "true"
          ) {
            element.click();
            return true;
          }
        }
      }
    }

    return false;
  }

  function caremateForceMediaOn() {
    caremateClickButtonByLabels([
      "unmute",
      "unmute microphone",
      "turn on microphone",
      "start audio",
      "join audio",
      "microphone is muted",
      "audio muted"
    ]);

    caremateClickButtonByLabels([
      "start camera",
      "start video",
      "turn on camera",
      "turn on video",
      "camera is off",
      "video is off"
    ]);
  }

  function caremateCloseDevicePopups() {
    var popupTexts = Array.prototype.slice.call(
      document.querySelectorAll("div, span")
    );

    for (var i = 0; i < popupTexts.length; i++) {
      var element = popupTexts[i];
      var text = caremateTextOfElement(element);

      var isDevicePopup =
        text.indexOf("new camera detected") !== -1 ||
        text.indexOf("new microphone detected") !== -1 ||
        text.indexOf("new audio device detected") !== -1 ||
        text.indexOf("new device detected") !== -1;

      if (!isDevicePopup) {
        continue;
      }

      var parent =
        element.closest("[role='dialog']") ||
        element.closest("[class*='notification']") ||
        element.closest("[class*='toast']") ||
        element.parentElement;

      if (!parent) {
        continue;
      }

      var closeButtons = Array.prototype.slice.call(
        parent.querySelectorAll("button, div[role='button'], span[role='button']")
      );

      for (var j = 0; j < closeButtons.length; j++) {
        var closeButton = closeButtons[j];
        var closeText = caremateTextOfElement(closeButton);
        var closeAria = (closeButton.getAttribute("aria-label") || "").toLowerCase();

        var isSafeCloseButton =
          closeText.indexOf("close") !== -1 ||
          closeText.indexOf("dismiss") !== -1 ||
          closeText.indexOf("ok") !== -1 ||
          closeText.indexOf("got it") !== -1 ||
          closeAria === "close" ||
          closeAria === "dismiss";

        var isMediaButton =
          closeText.indexOf("camera") !== -1 ||
          closeText.indexOf("microphone") !== -1 ||
          closeText.indexOf("mute") !== -1 ||
          closeText.indexOf("video") !== -1 ||
          closeText.indexOf("audio") !== -1;

        if (isSafeCloseButton && !isMediaButton) {
          closeButton.click();
          return true;
        }
      }
    }

    return false;
  }

  setTimeout(function () {
    caremateForceMediaOn();
    caremateCloseDevicePopups();
  }, 2500);

  setTimeout(function () {
    caremateForceMediaOn();
    caremateCloseDevicePopups();
  }, 5000);

  setTimeout(function () {
    caremateForceMediaOn();
    caremateCloseDevicePopups();
  }, 8000);

  var attempts = 0;
  var timer = setInterval(function () {
    attempts = attempts + 1;

    caremateForceMediaOn();
    caremateCloseDevicePopups();

    if (attempts >= 70) {
      clearInterval(timer);
    }
  }, 1000);

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) {
      setTimeout(function () {
        caremateForceMediaOn();
        caremateCloseDevicePopups();
      }, 1000);
    }
  });

  true;
})();
`;

const VideoConsultationScreen = ({ navigation, route }: Props) => {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<any>(null);

  const {
    consultationId,
    consultationType,
    patientMeeting,
    doctorMeeting,
    patientMeetingUrl,
    doctorMeetingUrl,
  } = route.params;

  const initialMeetingUrl = patientMeetingUrl || patientMeeting?.webUrl || "";
  const finalDoctorUrl = doctorMeetingUrl || doctorMeeting?.webUrl || "";

  const [meetingUrl, setMeetingUrl] = useState(initialMeetingUrl);
  const [isLoadingConfig, setIsLoadingConfig] = useState(!initialMeetingUrl);
  const [isRequestingPermission, setIsRequestingPermission] = useState(true);
  const [hasMediaPermission, setHasMediaPermission] = useState(false);
  const [showWebViewLoader, setShowWebViewLoader] = useState(true);
  const [shouldRenderWebView, setShouldRenderWebView] = useState(false);
  const [webViewSessionKey, setWebViewSessionKey] = useState(
    `${consultationId}-${Date.now()}`
  );
  const [loadError, setLoadError] = useState("");

  const title = useMemo(() => {
    return consultationType === "EMERGENCY"
      ? "Emergency Video Consultation"
      : "Video Consultation";
  }, [consultationType]);

  const autoJoinMeetingUrl = useMemo(() => {
    return buildAutoJoinMeetingUrl(meetingUrl);
  }, [meetingUrl]);

  const cleanupWebViewMedia = useCallback(() => {
    try {
      webViewRef.current?.injectJavaScript(WEBVIEW_MEDIA_CLEANUP_SCRIPT);
    } catch {
      // WebView may already be unmounted.
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupWebViewMedia();
    };
  }, [cleanupWebViewMedia]);

  useEffect(() => {
    let isMounted = true;

    const preparePermissions = async () => {
      try {
        setIsRequestingPermission(true);
        setLoadError("");

        const granted = await requestAndroidMediaPermissions();

        if (!isMounted) {
          return;
        }

        setHasMediaPermission(granted);

        if (!granted) {
          setLoadError(
            "Camera and microphone permission is required for emergency video consultation."
          );
        }
      } catch {
        if (!isMounted) {
          return;
        }

        setHasMediaPermission(false);
        setLoadError("Unable to request camera and microphone permission.");
      } finally {
        if (isMounted) {
          setIsRequestingPermission(false);
        }
      }
    };

    preparePermissions();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadMeetingConfig = async () => {
      if (meetingUrl) {
        return;
      }

      try {
        setIsLoadingConfig(true);
        setLoadError("");

        const result = await consultationsApi.getPatientJoinConfig(
          consultationId
        );

        if (!isMounted) {
          return;
        }

        setMeetingUrl(result.patientMeeting.webUrl);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load meeting link."
        );
      } finally {
        if (isMounted) {
          setIsLoadingConfig(false);
        }
      }
    };

    loadMeetingConfig();

    return () => {
      isMounted = false;
    };
  }, [consultationId, meetingUrl]);

  useEffect(() => {
    if (!autoJoinMeetingUrl || !hasMediaPermission) {
      return;
    }

    setLoadError("");
    setShowWebViewLoader(true);
    setShouldRenderWebView(false);

    const remountTimer = setTimeout(() => {
      setWebViewSessionKey(`${consultationId}-${Date.now()}`);
      setShouldRenderWebView(true);
    }, 250);

    const loaderTimer = setTimeout(() => {
      setShowWebViewLoader(false);
    }, 9000);

    return () => {
      clearTimeout(remountTimer);
      clearTimeout(loaderTimer);
    };
  }, [autoJoinMeetingUrl, hasMediaPermission, consultationId]);

  const shareDoctorLink = useCallback(async () => {
    if (!finalDoctorUrl) {
      Alert.alert(
        "Doctor link unavailable",
        "Doctor demo link is not available for this consultation."
      );
      return;
    }

    await Share.share({
      message: `CareMate+ doctor demo consultation link:\n\n${finalDoctorUrl}`,
    });
  }, [finalDoctorUrl]);

  const endCall = useCallback(() => {
    Alert.alert(
      "End video call?",
      "This will close the consultation video screen.",
      [
        {
          text: "Stay",
          style: "cancel",
        },
        {
          text: "End Call",
          style: "destructive",
          onPress: () => {
            cleanupWebViewMedia();
            setShouldRenderWebView(false);

            setTimeout(() => {
              navigation.replace("ConsultationEnded", {
                consultationId,
                consultationType,
              });
            }, 350);
          },
        },
      ]
    );
  }, [cleanupWebViewMedia, consultationId, consultationType, navigation]);

  const retryPermissions = useCallback(async () => {
    try {
      setLoadError("");
      setIsRequestingPermission(true);

      const granted = await requestAndroidMediaPermissions();

      setHasMediaPermission(granted);

      if (!granted) {
        setLoadError(
          "Camera and microphone permission is required for emergency video consultation."
        );
      }
    } catch {
      setLoadError("Unable to request camera and microphone permission.");
    } finally {
      setIsRequestingPermission(false);
    }
  }, []);

  if (isLoadingConfig || isRequestingPermission) {
    return (
      <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#0F766E" />

        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0F766E" />
          <Text style={styles.loadingTitle}>Preparing emergency video call</Text>
          <Text style={styles.loadingText}>
            CareMate+ is joining the patient automatically with camera and
            microphone enabled.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loadError || !meetingUrl || !hasMediaPermission) {
    return (
      <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#0F766E" />

        <View
          style={[
            styles.errorHeader,
            { paddingTop: Math.max(18, insets.top + 12) },
          ]}
        >
          <Text style={styles.headerTitle}>{title}</Text>
        </View>

        <View style={styles.centerContainer}>
          <Text style={styles.errorTitle}>Unable to open video call</Text>
          <Text style={styles.errorText}>
            {loadError || "Meeting link was not found."}
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={retryPermissions}
          >
            <Text style={styles.primaryButtonText}>Allow Camera/Mic</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.secondaryActionText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0F766E" />

      <View
        style={[styles.header, { paddingTop: Math.max(14, insets.top + 10) }]}
      >
        <View style={styles.headerTextBox}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSubtitle}>
            Patient auto-joined • Fresh video session
          </Text>
        </View>

        <TouchableOpacity style={styles.endButton} onPress={endCall}>
          <Text style={styles.endButtonText}>End</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={shareDoctorLink}
        >
          <Text style={styles.secondaryButtonText}>Share Doctor Demo Link</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.webViewContainer}>
        {shouldRenderWebView ? (
          <CareMateWebView
            ref={webViewRef}
            key={`${autoJoinMeetingUrl}-${webViewSessionKey}`}
            source={{ uri: autoJoinMeetingUrl }}
            style={styles.webView}
            javaScriptEnabled
            domStorageEnabled
            allowsInlineMediaPlayback
            allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false}
            originWhitelist={["*"]}
            setSupportMultipleWindows={false}
            mediaCapturePermissionGrantType="grant"
            androidLayerType="hardware"
            mixedContentMode="always"
            thirdPartyCookiesEnabled={false}
            sharedCookiesEnabled={false}
            cacheEnabled={false}
            incognito
            startInLoadingState={false}
            injectedJavaScriptBeforeContentLoaded={PATIENT_AUTO_MEDIA_SCRIPT}
            injectedJavaScript={PATIENT_AUTO_MEDIA_SCRIPT}
            onLoadProgress={(event: {
              nativeEvent?: {
                progress?: number;
              };
            }) => {
              const progress = event.nativeEvent?.progress ?? 0;

              if (progress >= 0.55) {
                setShowWebViewLoader(false);
              }
            }}
            onLoadEnd={() => {
              setShowWebViewLoader(false);
            }}
            onError={() => {
              setShowWebViewLoader(false);
              setLoadError("Video meeting failed to load.");
            }}
          />
        ) : null}

        {showWebViewLoader && (
          <View style={styles.webViewLoader}>
            <ActivityIndicator size="large" color="#0F766E" />
            <Text style={styles.loadingText}>Joining patient video call...</Text>
            <Text style={styles.smallLoadingText}>
              A fresh video session is being prepared.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default VideoConsultationScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    backgroundColor: "#0F766E",
    paddingHorizontal: 18,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  errorHeader: {
    backgroundColor: "#0F766E",
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  headerTextBox: {
    flex: 1,
    paddingRight: 12,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: "#CCFBF1",
    fontSize: 12,
    marginTop: 3,
  },
  endButton: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
  },
  endButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  actionBar: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  secondaryButton: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#99F6E4",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#0F766E",
    fontSize: 14,
    fontWeight: "800",
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  webView: {
    flex: 1,
    backgroundColor: "#000000",
  },
  webViewLoader: {
    ...StyleSheet.absoluteFill,
    zIndex: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 24,
  },
  centerContainer: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingTitle: {
    marginTop: 18,
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
  smallLoadingText: {
    marginTop: 8,
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 18,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#DC2626",
    textAlign: "center",
  },
  errorText: {
    marginTop: 10,
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
  primaryButton: {
    marginTop: 22,
    backgroundColor: "#0F766E",
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 14,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryActionButton: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 14,
  },
  secondaryActionText: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "800",
  },
});