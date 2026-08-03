import React, { useCallback, useEffect, useMemo, useRef, useState, } from "react";
import { ActivityIndicator, PermissionsAndroid, Platform, Share, StatusBar, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets, } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AlertCircle, Camera, CheckCircle2, Link, Mic, PhoneOff, RefreshCw, Share2, ShieldAlert, Video, } from "lucide-react-native";
import { LocalizedText as Text } from "../../components/common/LocalizedText";
import { LocalizedAlert as Alert } from "../../utils/localizedAlert";
import { consultationsApi } from "../../services/consultationsApi";
import { doctorConsultationsApi } from "../../services/doctor/doctorConsultationsApi";
import type { RootStackParamList } from "../../types/navigation";
type Props = NativeStackScreenProps<RootStackParamList, "VideoConsultation">;
type ParticipantRole = "PATIENT" | "DOCTOR";
const CareMateWebView = WebView as unknown as React.ComponentType<any>;
const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const SOFT_PANEL = "#F7F9FF";
const PATIENT_PRIMARY = "#5B86E5";
const PATIENT_PRIMARY_DARK = "#3F6FD0";
const PATIENT_PRIMARY_LIGHT = "#EEF4FF";
const DOCTOR_PRIMARY = "#0F766E";
const DOCTOR_PRIMARY_DARK = "#134E4A";
const DOCTOR_PRIMARY_LIGHT = "#E6FFFA";
const SUCCESS = "#42B883";
const SUCCESS_DARK = "#167A58";
const SUCCESS_LIGHT = "#EAF8F2";
const DANGER = "#EF4D56";
const DANGER_DARK = "#B42318";
const DANGER_LIGHT = "#FFEDEE";
const DARK_CALL = "#050816";
const DARK_PANEL = "#111936";
const getAutoJoinHashParams = (participantRole: ParticipantRole) => {
    const displayName = participantRole === "DOCTOR"
        ? "CareMate+ Doctor"
        : "CareMate+ Patient";
    return [
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
        `userInfo.displayName=${encodeURIComponent(JSON.stringify(displayName))}`,
    ];
};
const buildAutoJoinMeetingUrl = (url: string, participantRole: ParticipantRole) => {
    if (!url) {
        return "";
    }
    const hashIndex = url.indexOf("#");
    const urlBeforeHash = hashIndex >= 0
        ? url.slice(0, hashIndex)
        : url;
    const existingHash = hashIndex >= 0
        ? url.slice(hashIndex + 1)
        : "";
    const autoJoinParams = getAutoJoinHashParams(participantRole).join("&");
    if (!existingHash) {
        return `${urlBeforeHash}#${autoJoinParams}`;
    }
    return `${urlBeforeHash}#${existingHash}&${autoJoinParams}`;
};
const requestAndroidMediaPermissions = async () => {
    if (Platform.OS !== "android") {
        return true;
    }
    const cameraAlreadyGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS
        .CAMERA);
    const audioAlreadyGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS
        .RECORD_AUDIO);
    if (cameraAlreadyGranted &&
        audioAlreadyGranted) {
        return true;
    }
    const result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid
            .PERMISSIONS.CAMERA,
        PermissionsAndroid
            .PERMISSIONS.RECORD_AUDIO,
    ]);
    const cameraGranted = result[PermissionsAndroid.PERMISSIONS
        .CAMERA] ===
        PermissionsAndroid.RESULTS
            .GRANTED;
    const audioGranted = result[PermissionsAndroid.PERMISSIONS
        .RECORD_AUDIO] ===
        PermissionsAndroid.RESULTS
            .GRANTED;
    return (cameraGranted &&
        audioGranted);
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

    if (window.__caremateMediaStream) {
      caremateStopStream(window.__caremateMediaStream);
      window.__caremateMediaStream = null;
    }

    var videos = Array.prototype.slice.call(
      document.querySelectorAll("video")
    );

    for (var j = 0; j < videos.length; j++) {
      var video = videos[j];

      try {
        if (video.srcObject) {
          caremateStopStream(video.srcObject);
          video.srcObject = null;
        }
      } catch (error) {}
    }

    var audios = Array.prototype.slice.call(
      document.querySelectorAll("audio")
    );

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
const AUTO_MEDIA_SCRIPT = `
(function () {
  if (window.__caremateAutoMediaEnabled) {
    true;
    return;
  }

  window.__caremateAutoMediaEnabled = true;

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
      document.querySelectorAll(
        "button, div[role='button'], span[role='button']"
      )
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
        parent.querySelectorAll(
          "button, div[role='button'], span[role='button']"
        )
      );

      for (var j = 0; j < closeButtons.length; j++) {
        var closeButton = closeButtons[j];
        var closeText =
          caremateTextOfElement(closeButton);

        var closeAria = (
          closeButton.getAttribute(
            "aria-label"
          ) || ""
        ).toLowerCase();

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

        if (
          isSafeCloseButton &&
          !isMediaButton
        ) {
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

  document.addEventListener(
    "visibilitychange",
    function () {
      if (!document.hidden) {
        setTimeout(function () {
          caremateForceMediaOn();
          caremateCloseDevicePopups();
        }, 1000);
      }
    }
  );

  true;
})();
`;
const VideoConsultationScreen = ({ navigation, route, }: Props) => {
    const insets = useSafeAreaInsets();
    const webViewRef = useRef<any>(null);
    const completionHandledRef = useRef(false);
    const statusPollInFlightRef = useRef(false);
    const { consultationId, consultationType, patientMeeting, doctorMeeting, patientMeetingUrl, doctorMeetingUrl, } = route.params;
    const patientUrl = patientMeetingUrl ||
        patientMeeting?.webUrl ||
        "";
    const doctorUrl = doctorMeetingUrl ||
        doctorMeeting?.webUrl ||
        "";
    const hasPatientRouteData = Boolean(patientMeeting ||
        patientMeetingUrl);
    const hasDoctorRouteData = Boolean(doctorMeeting ||
        doctorMeetingUrl);
    const participantRole = useMemo<ParticipantRole>(() => {
        if (hasDoctorRouteData &&
            !hasPatientRouteData) {
            return "DOCTOR";
        }
        return "PATIENT";
    }, [
        hasDoctorRouteData,
        hasPatientRouteData,
    ]);
    const isDoctorParticipant = participantRole === "DOCTOR";
    const initialMeetingUrl = isDoctorParticipant
        ? doctorUrl
        : patientUrl;
    const finalDoctorUrl = doctorUrl;
    const [meetingUrl, setMeetingUrl,] = useState(initialMeetingUrl);
    const [isLoadingConfig, setIsLoadingConfig,] = useState(!initialMeetingUrl);
    const [isRequestingPermission, setIsRequestingPermission,] = useState(true);
    const [hasMediaPermission, setHasMediaPermission,] = useState(false);
    const [showWebViewLoader, setShowWebViewLoader,] = useState(true);
    const [shouldRenderWebView, setShouldRenderWebView,] = useState(false);
    const [webViewSessionKey, setWebViewSessionKey,] = useState(`${consultationId}-${Date.now()}`);
    const [retryCount, setRetryCount,] = useState(0);
    const [loadError, setLoadError,] = useState("");
    const [isCompletingCall, setIsCompletingCall,] = useState(false);
    const rolePrimary = isDoctorParticipant
        ? DOCTOR_PRIMARY
        : PATIENT_PRIMARY;
    const rolePrimaryDark = isDoctorParticipant
        ? DOCTOR_PRIMARY_DARK
        : PATIENT_PRIMARY_DARK;
    const rolePrimaryLight = isDoctorParticipant
        ? DOCTOR_PRIMARY_LIGHT
        : PATIENT_PRIMARY_LIGHT;
    const participantLabel = isDoctorParticipant
        ? "Doctor"
        : "Patient";
    const title = useMemo(() => {
        if (consultationType ===
            "EMERGENCY") {
            return "Emergency Video Consultation";
        }
        return "Video Consultation";
    }, [consultationType]);
    const consultationTypeLabel = useMemo(() => {
        return consultationType ===
            "EMERGENCY"
            ? "Emergency"
            : "Manual";
    }, [consultationType]);
    const autoJoinMeetingUrl = useMemo(() => {
        return buildAutoJoinMeetingUrl(meetingUrl, participantRole);
    }, [
        meetingUrl,
        participantRole,
    ]);
    const cleanupWebViewMedia = useCallback(() => {
        try {
            webViewRef.current
                ?.injectJavaScript(WEBVIEW_MEDIA_CLEANUP_SCRIPT);
        }
        catch {
            return;
        }
    }, []);
    const fetchMeetingUrl = useCallback(async () => {
        if (isDoctorParticipant) {
            const result = await doctorConsultationsApi.getDoctorJoinConfig(consultationId);
            const nextDoctorUrl = result.doctorMeeting
                ?.webUrl;
            if (!nextDoctorUrl) {
                throw new Error("Doctor meeting link was not returned.");
            }
            return nextDoctorUrl;
        }
        const result = await consultationsApi.getPatientJoinConfig(consultationId);
        const nextPatientUrl = result.patientMeeting
            ?.webUrl;
        if (!nextPatientUrl) {
            throw new Error("Patient meeting link was not returned.");
        }
        return nextPatientUrl;
    }, [
        consultationId,
        isDoctorParticipant,
    ]);
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
                    setLoadError("Camera and microphone permission is required for the video consultation.");
                }
            }
            catch {
                if (!isMounted) {
                    return;
                }
                setHasMediaPermission(false);
                setLoadError("Unable to request camera and microphone permission.");
            }
            finally {
                if (isMounted) {
                    setIsRequestingPermission(false);
                }
            }
        };
        void preparePermissions();
        return () => {
            isMounted = false;
        };
    }, []);
    useEffect(() => {
        if (meetingUrl) {
            setIsLoadingConfig(false);
            return;
        }
        let isMounted = true;
        const loadMeetingConfig = async () => {
            try {
                setIsLoadingConfig(true);
                setLoadError("");
                const nextMeetingUrl = await fetchMeetingUrl();
                if (!isMounted) {
                    return;
                }
                setMeetingUrl(nextMeetingUrl);
            }
            catch (error) {
                if (!isMounted) {
                    return;
                }
                setLoadError(error instanceof Error
                    ? error.message
                    : "Unable to load meeting link.");
            }
            finally {
                if (isMounted) {
                    setIsLoadingConfig(false);
                }
            }
        };
        void loadMeetingConfig();
        return () => {
            isMounted = false;
        };
    }, [
        fetchMeetingUrl,
        meetingUrl,
    ]);
    useEffect(() => {
        if (!autoJoinMeetingUrl ||
            !hasMediaPermission) {
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
        }, 10000);
        return () => {
            clearTimeout(remountTimer);
            clearTimeout(loaderTimer);
        };
    }, [
        autoJoinMeetingUrl,
        consultationId,
        hasMediaPermission,
        retryCount,
    ]);
    useEffect(() => {
        if (isDoctorParticipant) {
            return;
        }
        let isMounted = true;
        const checkConsultationStatus = async () => {
            if (statusPollInFlightRef.current ||
                completionHandledRef.current) {
                return;
            }
            try {
                statusPollInFlightRef.current =
                    true;
                const consultation = await consultationsApi.getConsultationById(consultationId);
                if (!isMounted ||
                    completionHandledRef.current) {
                    return;
                }
                if (consultation.status ===
                    "COMPLETED") {
                    completionHandledRef.current =
                        true;
                    cleanupWebViewMedia();
                    setShouldRenderWebView(false);
                    navigation.replace("ConsultationEnded", {
                        consultationId,
                        consultationType,
                    });
                }
            }
            catch {
                return;
            }
            finally {
                statusPollInFlightRef.current =
                    false;
            }
        };
        void checkConsultationStatus();
        const interval = setInterval(() => {
            void checkConsultationStatus();
        }, 2000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [
        cleanupWebViewMedia,
        consultationId,
        consultationType,
        isDoctorParticipant,
        navigation,
    ]);
    const shareDoctorLink = useCallback(async () => {
        if (!finalDoctorUrl) {
            Alert.alert("Doctor link unavailable", "The doctor meeting link is not available for this consultation.");
            return;
        }
        try {
            await Share.share({
                message: `CareMate+ doctor consultation link:\n\n${finalDoctorUrl}`,
            });
        }
        catch {
            Alert.alert("Unable to share", "The doctor meeting link could not be shared.");
        }
    }, [finalDoctorUrl]);
    const leavePatientCall = useCallback(() => {
        cleanupWebViewMedia();
        setShouldRenderWebView(false);
        navigation.replace("ConsultationEnded", {
            consultationId,
            consultationType,
        });
    }, [
        cleanupWebViewMedia,
        consultationId,
        consultationType,
        navigation,
    ]);
    const completeDoctorCall = useCallback(async () => {
        if (isCompletingCall ||
            completionHandledRef.current) {
            return;
        }
        try {
            setIsCompletingCall(true);
            await doctorConsultationsApi.completeConsultation(consultationId);
            completionHandledRef.current =
                true;
            cleanupWebViewMedia();
            setShouldRenderWebView(false);
            navigation.goBack();
        }
        catch (error) {
            Alert.alert("Unable to complete consultation", error instanceof Error
                ? error.message
                : "The consultation could not be completed. Please try again.");
        }
        finally {
            setIsCompletingCall(false);
        }
    }, [
        cleanupWebViewMedia,
        consultationId,
        isCompletingCall,
        navigation,
    ]);
    const endCall = useCallback(() => {
        if (isDoctorParticipant) {
            Alert.alert("Complete consultation?", consultationType ===
                "EMERGENCY"
                ? "This will end the call, mark the consultation as completed, and resolve the linked Safety Alert."
                : "This will end the call and mark the consultation as completed.", [
                {
                    text: "Stay",
                    style: "cancel",
                },
                {
                    text: "Complete",
                    style: "destructive",
                    onPress: () => {
                        void completeDoctorCall();
                    },
                },
            ]);
            return;
        }
        Alert.alert("Leave video call?", "You will leave the video screen. The doctor can still complete the consultation from their phone.", [
            {
                text: "Stay",
                style: "cancel",
            },
            {
                text: "Leave Call",
                style: "destructive",
                onPress: leavePatientCall,
            },
        ]);
    }, [
        completeDoctorCall,
        consultationType,
        isDoctorParticipant,
        leavePatientCall,
    ]);
    const retryCall = useCallback(async () => {
        try {
            setLoadError("");
            setIsRequestingPermission(true);
            const granted = await requestAndroidMediaPermissions();
            setHasMediaPermission(granted);
            if (!granted) {
                setLoadError("Camera and microphone permission is required for the video consultation.");
                return;
            }
            if (!meetingUrl) {
                setIsLoadingConfig(true);
                const nextMeetingUrl = await fetchMeetingUrl();
                setMeetingUrl(nextMeetingUrl);
            }
            else {
                cleanupWebViewMedia();
                setShouldRenderWebView(false);
                setRetryCount((current) => current + 1);
            }
        }
        catch (error) {
            setLoadError(error instanceof Error
                ? error.message
                : "Unable to restart the video call.");
        }
        finally {
            setIsRequestingPermission(false);
            setIsLoadingConfig(false);
        }
    }, [
        cleanupWebViewMedia,
        fetchMeetingUrl,
        meetingUrl,
    ]);
    if (isLoadingConfig ||
        isRequestingPermission) {
        return (<SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={BACKGROUND}/>

        <View style={styles.loadingScreen}>
          <View style={styles.loadingCard}>
            <View style={[
                styles.loadingIconCircle,
                {
                    backgroundColor: rolePrimaryLight,
                },
            ]}>
              <Video size={34} color={rolePrimary} strokeWidth={2.7}/>
            </View>

            <ActivityIndicator size="large" color={rolePrimary}/>

            <Text style={styles.loadingTitle}>
              Preparing video call
            </Text>

            <Text style={styles.loadingText}>
              CareMate+ is joining the{" "}
              {participantLabel.toLowerCase()}{" "}
              with camera and microphone
              enabled.
            </Text>

            <View style={styles.permissionRow}>
              <View style={[
                styles.permissionChip,
                {
                    backgroundColor: rolePrimaryLight,
                },
            ]}>
                <Camera size={15} color={rolePrimaryDark} strokeWidth={2.5}/>

                <Text style={[
                styles.permissionChipText,
                {
                    color: rolePrimaryDark,
                },
            ]}>
                  Camera
                </Text>
              </View>

              <View style={[
                styles.permissionChip,
                {
                    backgroundColor: rolePrimaryLight,
                },
            ]}>
                <Mic size={15} color={rolePrimaryDark} strokeWidth={2.5}/>

                <Text style={[
                styles.permissionChipText,
                {
                    color: rolePrimaryDark,
                },
            ]}>
                  Microphone
                </Text>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>);
    }
    if (loadError ||
        !meetingUrl ||
        !hasMediaPermission) {
        const permissionMissing = !hasMediaPermission;
        return (<SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={BACKGROUND}/>

        <View style={styles.appBar}>
          <Text style={styles.appBarTitle}>
            {title}
          </Text>

          <Text style={styles.appBarSubtitle}>
            {participantLabel} call setup
          </Text>
        </View>

        <View style={styles.errorScreen}>
          <View style={styles.errorCard}>
            <View style={styles.errorIconCircle}>
              <AlertCircle size={34} color={DANGER} strokeWidth={2.7}/>
            </View>

            <Text style={styles.errorTitle}>
              Unable to open video call
            </Text>

            <Text style={styles.errorText}>
              {loadError ||
                "Meeting link was not found."}
            </Text>

            <TouchableOpacity style={[
                styles.primaryButton,
                {
                    backgroundColor: rolePrimary,
                },
            ]} activeOpacity={0.86} onPress={() => void retryCall()}>
              <RefreshCw size={19} color={SURFACE} strokeWidth={2.6}/>

              <Text style={styles.primaryButtonText}>
                {permissionMissing
                ? "Allow Camera/Mic"
                : "Retry Call"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryActionButton} activeOpacity={0.86} onPress={() => navigation.goBack()}>
              <Text style={styles.secondaryActionText}>
                Go Back
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>);
    }
    return (<SafeAreaView edges={["bottom"]} style={styles.callSafeArea}>
      <StatusBar barStyle="light-content" backgroundColor={DARK_CALL}/>

      <View style={[
            styles.callHeader,
            {
                paddingTop: Math.max(14, insets.top + 10),
            },
        ]}>
        <View style={styles.callTitleRow}>
          <View style={styles.callIconCircle}>
            {consultationType ===
            "EMERGENCY" ? (<ShieldAlert size={21} color={DANGER} strokeWidth={2.7}/>) : (<Video size={21} color={rolePrimary} strokeWidth={2.7}/>)}
          </View>

          <View style={styles.headerTextBox}>
            <Text style={styles.callTitle} numberOfLines={1}>
              {title}
            </Text>

            <View style={styles.callMetaRow}>
              <View style={styles.liveDot}/>

              <Text style={styles.callSubtitle}>
                {participantLabel} joined •{" "}
                {consultationTypeLabel}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={[
            styles.endButton,
            isCompletingCall
                ? styles.endButtonDisabled
                : undefined,
        ]} activeOpacity={0.86} onPress={endCall} disabled={isCompletingCall}>
          {isCompletingCall ? (<ActivityIndicator size="small" color={SURFACE}/>) : (<PhoneOff size={17} color={SURFACE} strokeWidth={2.7}/>)}

          <Text style={styles.endButtonText}>
            {isCompletingCall
            ? "Completing"
            : isDoctorParticipant
                ? "Complete"
                : "Leave"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionBar}>
        <View style={[
            styles.sessionStatusBox,
            !isDoctorParticipant
                ? styles.sessionStatusWithShare
                : undefined,
        ]}>
          <CheckCircle2 size={18} color={SUCCESS} strokeWidth={2.6}/>

          <Text style={styles.sessionStatusText}>
            Connected as{" "}
            {participantLabel.toLowerCase()}
          </Text>
        </View>

        {!isDoctorParticipant &&
            finalDoctorUrl ? (<TouchableOpacity style={[
                styles.shareButton,
                {
                    backgroundColor: rolePrimaryLight,
                },
            ]} activeOpacity={0.86} onPress={() => void shareDoctorLink()}>
            <Share2 size={18} color={rolePrimary} strokeWidth={2.6}/>

            <Text style={[
                styles.shareButtonText,
                {
                    color: rolePrimaryDark,
                },
            ]}>
              Doctor link
            </Text>
          </TouchableOpacity>) : null}
      </View>

      <View style={styles.webViewContainer}>
        {shouldRenderWebView ? (<CareMateWebView ref={webViewRef} key={`${autoJoinMeetingUrl}-${webViewSessionKey}`} source={{
                uri: autoJoinMeetingUrl,
            }} style={styles.webView} javaScriptEnabled domStorageEnabled allowsInlineMediaPlayback allowsFullscreenVideo mediaPlaybackRequiresUserAction={false} originWhitelist={["*"]} setSupportMultipleWindows={false} mediaCapturePermissionGrantType="grant" androidLayerType="hardware" mixedContentMode="always" thirdPartyCookiesEnabled={false} sharedCookiesEnabled={false} cacheEnabled={false} incognito startInLoadingState={false} injectedJavaScriptBeforeContentLoaded={AUTO_MEDIA_SCRIPT} injectedJavaScript={AUTO_MEDIA_SCRIPT} onLoadProgress={(event: {
                nativeEvent?: {
                    progress?: number;
                };
            }) => {
                const progress = event.nativeEvent
                    ?.progress ?? 0;
                if (progress >= 0.55) {
                    setShowWebViewLoader(false);
                }
            }} onLoadEnd={() => {
                setShowWebViewLoader(false);
            }} onError={() => {
                setShowWebViewLoader(false);
                setLoadError("Video meeting failed to load.");
            }} onHttpError={(event: {
                nativeEvent?: {
                    statusCode?: number;
                };
            }) => {
                const statusCode = event.nativeEvent
                    ?.statusCode;
                if (statusCode === 401 ||
                    statusCode === 403) {
                    setShowWebViewLoader(false);
                    setLoadError(`${participantLabel} meeting access was rejected. Please reopen the consultation and try again.`);
                }
            }}/>) : null}

        {showWebViewLoader ? (<View style={styles.webViewLoader}>
            <View style={styles.webViewLoaderCard}>
              <View style={[
                styles.loadingIconCircleSmall,
                {
                    backgroundColor: rolePrimaryLight,
                },
            ]}>
                <Link size={24} color={rolePrimary} strokeWidth={2.7}/>
              </View>

              <ActivityIndicator size="large" color={rolePrimary}/>

              <Text style={styles.webViewLoadingTitle}>
                Joining{" "}
                {participantLabel.toLowerCase()}{" "}
                video call
              </Text>

              <Text style={styles.webViewLoadingText}>
                A secure JaaS session is being
                prepared.
              </Text>
            </View>
          </View>) : null}
      </View>
    </SafeAreaView>);
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
        borderRadius: 16,
        padding: 24,
        alignItems: "center",
        elevation: 4,
        shadowColor: "#172033",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 9,
    },
    loadingIconCircle: {
        width: 72,
        height: 72,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 18,
    },
    loadingTitle: {
        marginTop: 18,
        color: TEXT,
        fontSize: 19,
        fontWeight: "700",
        textAlign: "center",
    },
    loadingText: {
        color: MUTED,
        fontSize: 14,
        fontWeight: "500",
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
        borderRadius: 10,
        paddingHorizontal: 11,
        paddingVertical: 7,
        marginHorizontal: 4,
    },
    permissionChipText: {
        fontSize: 11,
        fontWeight: "700",
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
        fontWeight: "700",
        letterSpacing: -0.4,
    },
    appBarSubtitle: {
        color: MUTED,
        fontSize: 13,
        fontWeight: "600",
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
        borderRadius: 16,
        padding: 24,
        alignItems: "center",
        elevation: 4,
        shadowColor: "#172033",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 9,
    },
    errorIconCircle: {
        width: 72,
        height: 72,
        borderRadius: 16,
        backgroundColor: DANGER_LIGHT,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    errorTitle: {
        color: DANGER_DARK,
        fontSize: 20,
        fontWeight: "700",
        textAlign: "center",
    },
    errorText: {
        color: MUTED,
        fontSize: 14,
        fontWeight: "500",
        textAlign: "center",
        lineHeight: 21,
        marginTop: 9,
    },
    primaryButton: {
        minHeight: 52,
        borderRadius: 13,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        paddingHorizontal: 18,
        marginTop: 22,
    },
    primaryButtonText: {
        color: SURFACE,
        fontSize: 15,
        fontWeight: "700",
        marginLeft: 8,
    },
    secondaryActionButton: {
        minHeight: 50,
        borderRadius: 13,
        backgroundColor: SOFT_PANEL,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 22,
        marginTop: 10,
    },
    secondaryActionText: {
        color: TEXT,
        fontSize: 15,
        fontWeight: "700",
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
        borderRadius: 13,
        backgroundColor: DARK_PANEL,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    headerTextBox: {
        flex: 1,
    },
    callTitle: {
        color: SURFACE,
        fontSize: 17,
        fontWeight: "700",
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
        fontWeight: "600",
    },
    endButton: {
        minHeight: 40,
        borderRadius: 12,
        backgroundColor: DANGER,
        paddingHorizontal: 13,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    endButtonDisabled: {
        opacity: 0.68,
    },
    endButtonText: {
        color: SURFACE,
        fontSize: 13,
        fontWeight: "700",
        marginLeft: 6,
    },
    actionBar: {
        backgroundColor: SURFACE,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
    },
    sessionStatusBox: {
        flex: 1,
        minHeight: 42,
        borderRadius: 12,
        backgroundColor: SUCCESS_LIGHT,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
    },
    sessionStatusWithShare: {
        marginRight: 10,
    },
    sessionStatusText: {
        color: SUCCESS_DARK,
        fontSize: 12,
        fontWeight: "700",
        marginLeft: 7,
    },
    shareButton: {
        minHeight: 42,
        borderRadius: 12,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
    },
    shareButtonText: {
        fontSize: 12,
        fontWeight: "700",
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
        borderRadius: 16,
        padding: 24,
        alignItems: "center",
        elevation: 4,
        shadowColor: "#172033",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 9,
    },
    loadingIconCircleSmall: {
        width: 60,
        height: 60,
        borderRadius: 15,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    webViewLoadingTitle: {
        color: TEXT,
        fontSize: 18,
        fontWeight: "700",
        marginTop: 16,
        textAlign: "center",
    },
    webViewLoadingText: {
        color: MUTED,
        fontSize: 13,
        fontWeight: "500",
        textAlign: "center",
        lineHeight: 19,
        marginTop: 7,
    },
});
