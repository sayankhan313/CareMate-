import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Link,
  Mic,
  PhoneOff,
  RefreshCw,
  Share2,
  ShieldAlert,
  Video,
} from "lucide-react-native";

import { consultationsApi } from "../../services/consultationsApi";
import type { RootStackParamList } from "../../types/navigation";

type Props = NativeStackScreenProps<RootStackParamList, "VideoConsultation">;

const CareMateWebView = WebView as unknown as React.ComponentType<any>;

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";
const SOFT_PANEL = "#F7F9FF";

const PRIMARY = "#5B86E5";
const PRIMARY_DARK = "#3F6FD0";
const PRIMARY_LIGHT = "#EEF4FF";

const SUCCESS = "#42B883";
const SUCCESS_LIGHT = "#EAF8F2";

const DANGER = "#EF4D56";
const DANGER_DARK = "#B42318";
const DANGER_LIGHT = "#FFEDEE";

const DARK_CALL = "#050816";
const DARK_PANEL = "#111936";

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

  const consultationTypeLabel = useMemo(() => {
    return consultationType === "EMERGENCY" ? "Emergency" : "Manual";
  }, [consultationType]);

  const autoJoinMeetingUrl = useMemo(() => {
    return buildAutoJoinMeetingUrl(meetingUrl);
  }, [meetingUrl]);

  const cleanupWebViewMedia = useCallback(() => {
    try {
      webViewRef.current?.injectJavaScript(WEBVIEW_MEDIA_CLEANUP_SCRIPT);
    } catch {
      
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
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={BACKGROUND} />

        <View style={styles.loadingScreen}>
          <View style={styles.loadingCard}>
            <View style={styles.loadingIconCircle}>
              <Video size={34} color={PRIMARY} strokeWidth={2.8} />
            </View>

            <ActivityIndicator size="large" color={PRIMARY} />

            <Text style={styles.loadingTitle}>Preparing video call</Text>
            <Text style={styles.loadingText}>
              CareMate+ is joining the patient automatically with camera and
              microphone enabled.
            </Text>

            <View style={styles.permissionRow}>
              <View style={styles.permissionChip}>
                <Camera size={15} color={PRIMARY_DARK} strokeWidth={2.5} />
                <Text style={styles.permissionChipText}>Camera</Text>
              </View>

              <View style={styles.permissionChip}>
                <Mic size={15} color={PRIMARY_DARK} strokeWidth={2.5} />
                <Text style={styles.permissionChipText}>Microphone</Text>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (loadError || !meetingUrl || !hasMediaPermission) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={BACKGROUND} />

        <View style={styles.appBar}>
          <Text style={styles.appBarTitle}>{title}</Text>
          <Text style={styles.appBarSubtitle}>
            Camera and microphone setup
          </Text>
        </View>

        <View style={styles.errorScreen}>
          <View style={styles.errorCard}>
            <View style={styles.errorIconCircle}>
              <AlertCircle size={34} color={DANGER} strokeWidth={2.8} />
            </View>

            <Text style={styles.errorTitle}>Unable to open video call</Text>
            <Text style={styles.errorText}>
              {loadError || "Meeting link was not found."}
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.86}
              onPress={retryPermissions}
            >
              <RefreshCw size={19} color={SURFACE} strokeWidth={2.6} />
              <Text style={styles.primaryButtonText}>Allow Camera/Mic</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryActionButton}
              activeOpacity={0.86}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.secondaryActionText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom"]} style={styles.callSafeArea}>
      <StatusBar barStyle="light-content" backgroundColor={DARK_CALL} />

      <View
        style={[
          styles.callHeader,
          {
            paddingTop: Math.max(14, insets.top + 10),
          },
        ]}
      >
        <View style={styles.callTitleRow}>
          <View style={styles.callIconCircle}>
            {consultationType === "EMERGENCY" ? (
              <ShieldAlert size={21} color={DANGER} strokeWidth={2.7} />
            ) : (
              <Video size={21} color={PRIMARY} strokeWidth={2.7} />
            )}
          </View>

          <View style={styles.headerTextBox}>
            <Text style={styles.callTitle}>{title}</Text>

            <View style={styles.callMetaRow}>
              <View style={styles.liveDot} />
              <Text style={styles.callSubtitle}>
                Patient auto-joined • {consultationTypeLabel}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.endButton}
          activeOpacity={0.86}
          onPress={endCall}
        >
          <PhoneOff size={17} color={SURFACE} strokeWidth={2.7} />
          <Text style={styles.endButtonText}>End</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionBar}>
        <View style={styles.sessionStatusBox}>
          <CheckCircle2 size={18} color={SUCCESS} strokeWidth={2.6} />
          <Text style={styles.sessionStatusText}>Fresh video session</Text>
        </View>

        <TouchableOpacity
          style={styles.shareButton}
          activeOpacity={0.86}
          onPress={shareDoctorLink}
        >
          <Share2 size={18} color={PRIMARY} strokeWidth={2.6} />
          <Text style={styles.shareButtonText}>Doctor link</Text>
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

        {showWebViewLoader ? (
          <View style={styles.webViewLoader}>
            <View style={styles.webViewLoaderCard}>
              <View style={styles.loadingIconCircleSmall}>
                <Link size={24} color={PRIMARY} strokeWidth={2.7} />
              </View>

              <ActivityIndicator size="large" color={PRIMARY} />

              <Text style={styles.webViewLoadingTitle}>
                Joining patient video call
              </Text>
              <Text style={styles.webViewLoadingText}>
                A fresh JaaS session is being prepared.
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

export default VideoConsultationScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  callSafeArea: {
    flex: 1,
    backgroundColor: DARK_CALL,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: BACKGROUND,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingCard: {
    width: "100%",
    backgroundColor: SURFACE,
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  loadingIconCircle: {
    width: 74,
    height: 74,
    borderRadius: 26,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  loadingTitle: {
    marginTop: 18,
    color: TEXT,
    fontSize: 19,
    fontWeight: "900",
    textAlign: "center",
  },
  loadingText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 21,
    marginTop: 8,
  },
  permissionRow: {
    flexDirection: "row",
    marginTop: 18,
  },
  permissionChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginHorizontal: 4,
  },
  permissionChipText: {
    color: PRIMARY_DARK,
    fontSize: 11,
    fontWeight: "900",
    marginLeft: 5,
  },
  appBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  appBarTitle: {
    color: TEXT,
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  appBarSubtitle: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
  },
  errorScreen: {
    flex: 1,
    backgroundColor: BACKGROUND,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  errorCard: {
    width: "100%",
    backgroundColor: SURFACE,
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  errorIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 25,
    backgroundColor: DANGER_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  errorTitle: {
    color: DANGER_DARK,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  errorText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 21,
    marginTop: 9,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 17,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: 18,
    marginTop: 22,
  },
  primaryButtonText: {
    color: SURFACE,
    fontSize: 15,
    fontWeight: "900",
    marginLeft: 8,
  },
  secondaryActionButton: {
    minHeight: 50,
    borderRadius: 17,
    backgroundColor: SOFT_PANEL,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 22,
    marginTop: 10,
  },
  secondaryActionText: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "900",
  },
  callHeader: {
    backgroundColor: DARK_CALL,
    paddingHorizontal: 14,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  callTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 10,
  },
  callIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: DARK_PANEL,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  headerTextBox: {
    flex: 1,
  },
  callTitle: {
    color: SURFACE,
    fontSize: 17,
    fontWeight: "900",
  },
  callMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: SUCCESS,
    marginRight: 6,
  },
  callSubtitle: {
    color: "#AAB4D4",
    fontSize: 11,
    fontWeight: "800",
  },
  endButton: {
    minHeight: 40,
    borderRadius: 15,
    backgroundColor: DANGER,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  endButtonText: {
    color: SURFACE,
    fontSize: 13,
    fontWeight: "900",
    marginLeft: 6,
  },
  actionBar: {
    backgroundColor: SURFACE,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
  },
  sessionStatusBox: {
    flex: 1,
    minHeight: 42,
    borderRadius: 15,
    backgroundColor: SUCCESS_LIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginRight: 10,
  },
  sessionStatusText: {
    color: "#167A58",
    fontSize: 12,
    fontWeight: "900",
    marginLeft: 7,
  },
  shareButton: {
    minHeight: 42,
    borderRadius: 15,
    backgroundColor: PRIMARY_LIGHT,
    borderWidth: 1,
    borderColor: "#C9D8FF",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  shareButtonText: {
    color: PRIMARY_DARK,
    fontSize: 12,
    fontWeight: "900",
    marginLeft: 6,
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
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  zIndex: 5,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: BACKGROUND,
  paddingHorizontal: 20,
},
  webViewLoaderCard: {
    width: "100%",
    backgroundColor: SURFACE,
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  loadingIconCircleSmall: {
    width: 60,
    height: 60,
    borderRadius: 22,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  webViewLoadingTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 16,
    textAlign: "center",
  },
  webViewLoadingText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 19,
    marginTop: 7,
  },
});