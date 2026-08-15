import React, {
  useCallback,
  useEffect,
  useRef,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  Alert,
  AppState,
  StyleSheet,
  View,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { SplashScreen } from "../screens/auth/SplashScreen";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { RoleSelectionScreen } from "../screens/auth/RoleSelectionScreen";
import { PatientSignupScreen } from "../screens/auth/PatientSignupScreen";
import { DoctorSignupScreen } from "../screens/auth/DoctorSignupScreen";
import { DoctorPendingApprovalScreen } from "../screens/auth/DoctorPendingApprovalScreen";
import { EmailVerificationScreen } from "../screens/auth/EmailVerificationScreen";
import { ForgotPasswordScreen } from "../screens/auth/ForgotPasswordScreen";
import { PharmacySignupScreen } from "../screens/auth/PharmacySignupScreen";
import { PharmacyPendingApprovalScreen } from "../screens/auth/PharmacyPendingApprovalScreen";
import { WelcomeScreen } from "../screens/onboarding/WelcomeScreen";

import { AddMedicineScreen } from "../screens/patient/AddMedicineScreen";
import { ConfirmReminderScreen } from "../screens/patient/ConfirmReminderScreen";
import { ConnectedDeviceScreen } from "../screens/patient/ConnectedDeviceScreen";
import { SafetyResponseScreen } from "../screens/patient/SafetyResponseScreen";
import VideoConsultationScreen from "../screens/patient/VideoConsultationScreen";
import ConsultationEndedScreen from "../screens/patient/ConsultationEndedScreen";
import ScanMedicineScreen from "../screens/patient/ScanMedicineScreen";
import ScanMedicineResultScreen from "../screens/patient/ScanMedicineResultScreen";
import PrescriptionScanResultScreen from "../screens/patient/PrescriptionScanResultScreen";
import { ManualSafetyResponseScreen } from "../screens/patient/ManualSafetyResponseScreen";
import { PatientProfileScreen } from "../screens/patient/PatientProfileScreen";
import EditPatientProfileScreen from "../screens/patient/EditPatientProfileScreen";
import MyPharmaciesScreen from "../screens/patient/MyPharmaciesScreen";
import NotificationPreferencesScreen from "../screens/patient/NotificationPreferencesScreen";
import { SelectDoctorScreen } from "../screens/patient/SelectDoctorScreen";
import PatientActiveCallsScreen from "../screens/patient/PatientActiveCallsScreen";
import MedicineUpdatesScreen from "../screens/patient/MedicineUpdatesScreen";
import PatientReportsScreen from "../screens/patient/PatientReportsScreen";
import PatientUploadReportScreen from "../screens/patient/PatientUploadReportScreen";
import ReminderSettingsScreen from "../screens/patient/ReminderSettingsScreen";
import SafetyResponseSettingsScreen from "../screens/patient/SafetyResponseSettingsScreen";
import LanguageAccessibilityScreen from "../screens/patient/LanguageAccessibilityScreen";
import PrivacySecurityScreen from "../screens/patient/PrivacySecurityScreen";

import { DoctorPatientDetailScreen } from "../screens/doctor/DoctorPatientDetailScreen";
import DoctorAlertDetailScreen from "../screens/doctor/DoctorAlertDetailScreen";
import DoctorSelectPrescriptionPatientScreen from "../screens/doctor/DoctorSelectPrescriptionPatientScreen";
import DoctorPrescriptionScreen from "../screens/doctor/DoctorPrescriptionScreen";
import DoctorSelectNotePatientScreen from "../screens/doctor/DoctorSelectNotePatientScreen";
import DoctorAddNoteScreen from "../screens/doctor/DoctorAddNoteScreen";
import DoctorPatientReportsScreen from "../screens/doctor/DoctorPatientReportsScreen";
import DoctorReportReviewsScreen from "../screens/doctor/DoctorReportReviewsScreen";
import DoctorReportReviewScreen from "../screens/doctor/DoctorReportReviewScreen";
import DoctorAvailabilityScreen from "../screens/doctor/DoctorAvailabilityScreen";
import DoctorMedicineReviewPoolScreen from "../screens/doctor/DoctorMedicineReviewPoolScreen";
import DoctorMedicineReviewPoolDetailScreen from "../screens/doctor/DoctorMedicineReviewPoolDetailScreen";
import DoctorProfileScreen from "../screens/doctor/DoctorProfileScreen";

import { AdminDoctorVerificationDetailScreen } from "../screens/admin/AdminDoctorVerificationDetailScreen";
import { AdminPharmacyVerificationDetailScreen } from "../screens/admin/AdminPharmacyVerificationDetailScreen";
import { AdminAuditLogsScreen } from "../screens/admin/AdminAuditLogsScreen";
import { AdminAuditLogDetailScreen } from "../screens/admin/AdminAuditLogDetailScreen";
import { AdminRegisterWebViewScreen } from "../screens/admin/AdminRegisterWebViewScreen";
import AdminProfileScreen from "../screens/admin/AdminProfileScreen";

import { PharmacyDashboardScreen } from "../screens/pharmacy/PharmacyDashboardScreen";
import PharmacyOrdersScreen from "../screens/pharmacy/PharmacyOrdersScreen";
import PharmacyOrderDetailScreen from "../screens/pharmacy/PharmacyOrderDetailScreen";
import PharmacyExemptionReviewsScreen from "../screens/pharmacy/PharmacyExemptionReviewsScreen";
import PharmacyExemptionReviewScreen from "../screens/pharmacy/PharmacyExemptionReviewScreen";

import { NotificationsScreen } from "../screens/common/NotificationsScreen";
import { FCMInitializer } from "../components/common/FCMInitializer";
import { PatientTabNavigator } from "./PatientTabNavigator";
import { DoctorTabNavigator } from "./DoctorTabNavigator";
import { AdminTabNavigator } from "./AdminTabNavigator";

import type { RootStackParamList } from "../types/navigation";
import {
  HealthConnectDeviceProvider,
  useHealthConnectDevice,
} from "../context/HealthConnectDeviceContext";
import { LanguageProvider } from "../context/LanguageContext";
import { navigationRef } from "./navigationRef";
import { patientSettingsApi } from "../services/patientSettingsApi";
import { tokenStorage } from "../services/tokenStorage";
import { getRuntimeLanguage } from "../locales/localizationRuntime";
import { translateText } from "../locales";

const Stack = createNativeStackNavigator<RootStackParamList>();

const ConnectedDeviceStackScreen = ConnectedDeviceScreen as ComponentType<any>;
const AdminTabsLegacyScreen = AdminTabNavigator as ComponentType<any>;
const EditPatientProfileStackScreen = EditPatientProfileScreen as ComponentType<any>;
const MyPharmaciesStackScreen = MyPharmaciesScreen as ComponentType<any>;
const NotificationPreferencesStackScreen = NotificationPreferencesScreen as ComponentType<any>;
const SelectDoctorStackScreen = SelectDoctorScreen as ComponentType<any>;
const PatientActiveCallsStackScreen = PatientActiveCallsScreen as ComponentType<any>;
const MedicineUpdatesStackScreen = MedicineUpdatesScreen as ComponentType<any>;
const PatientReportsStackScreen = PatientReportsScreen as ComponentType<any>;
const PatientUploadReportStackScreen = PatientUploadReportScreen as ComponentType<any>;

const DoctorPatientDetailStackScreen = DoctorPatientDetailScreen as ComponentType<any>;
const DoctorAlertDetailStackScreen = DoctorAlertDetailScreen as ComponentType<any>;
const DoctorPatientReportsStackScreen = DoctorPatientReportsScreen as ComponentType<any>;
const DoctorReportReviewsStackScreen = DoctorReportReviewsScreen as ComponentType<any>;
const DoctorReportReviewStackScreen = DoctorReportReviewScreen as ComponentType<any>;
const DoctorSelectPrescriptionPatientStackScreen = DoctorSelectPrescriptionPatientScreen as ComponentType<any>;
const DoctorPrescriptionStackScreen = DoctorPrescriptionScreen as ComponentType<any>;
const DoctorSelectNotePatientStackScreen = DoctorSelectNotePatientScreen as ComponentType<any>;
const DoctorAddNoteStackScreen = DoctorAddNoteScreen as ComponentType<any>;
const DoctorAvailabilityStackScreen = DoctorAvailabilityScreen as ComponentType<any>;
const DoctorMedicineReviewPoolStackScreen = DoctorMedicineReviewPoolScreen as ComponentType<any>;
const DoctorMedicineReviewPoolDetailStackScreen = DoctorMedicineReviewPoolDetailScreen as ComponentType<any>;
const DoctorProfileStackScreen = DoctorProfileScreen as ComponentType<any>;

const PharmacyOrdersStackScreen = PharmacyOrdersScreen as ComponentType<any>;
const PharmacyOrderDetailStackScreen = PharmacyOrderDetailScreen as ComponentType<any>;
const PharmacyExemptionReviewsStackScreen = PharmacyExemptionReviewsScreen as ComponentType<any>;
const PharmacyExemptionReviewStackScreen = PharmacyExemptionReviewScreen as ComponentType<any>;

const AdminProfileStackScreen = AdminProfileScreen as ComponentType<any>;
const ReminderSettingsStackScreen = ReminderSettingsScreen as ComponentType<any>;
const SafetyResponseSettingsStackScreen = SafetyResponseSettingsScreen as ComponentType<any>;
const LanguageAccessibilityStackScreen = LanguageAccessibilityScreen as ComponentType<any>;
const PrivacySecurityStackScreen = PrivacySecurityScreen as ComponentType<any>;
const AdminAuditLogsStackScreen = AdminAuditLogsScreen as ComponentType<any>;
const AdminAuditLogDetailStackScreen = AdminAuditLogDetailScreen as ComponentType<any>;
const NotificationsStackScreen = NotificationsScreen as ComponentType<any>;
const ConsultationEndedStackScreen = ConsultationEndedScreen as ComponentType<any>;

const SESSION_CHECK_INTERVAL_MS = 15_000;
const SESSION_PREFERENCE_REFRESH_MS = 60_000;

const PATIENT_SESSION_ROUTES = new Set([
  "PatientTabs",
  "PatientProfile",
  "EditPatientProfile",
  "MyPharmacies",
  "NotificationPreferences",
  "ReminderSettings",
  "SafetyResponseSettings",
  "LanguageAccessibility",
  "PrivacySecurity",
  "SelectDoctor",
  "PatientActiveCalls",
  "MedicineUpdates",
  "PatientReports",
  "PatientUploadReport",
  "AddMedicine",
  "ConfirmReminder",
  "ScanMedicine",
  "ScanMedicineResult",
  "PrescriptionScanResult",
  "ConnectedDevice",
  "ManualSafetyResponse",
  "SafetyResponse",
  "VideoConsultation",
  "ConsultationEnded",
]);

const NON_PATIENT_SESSION_ROUTES = new Set([
  "DoctorTabs",
  "DoctorProfile",
  "DoctorPatientDetail",
  "DoctorAlertDetail",
  "DoctorPatientReports",
  "DoctorReportReviews",
  "DoctorReportReview",
  "DoctorSelectPrescriptionPatient",
  "DoctorPrescription",
  "DoctorSelectNotePatient",
  "DoctorAddNote",
  "DoctorAvailability",
  "DoctorMedicineReviewPool",
  "DoctorMedicineReviewPoolDetail",
  "AdminTabs",
  "AdminDashboard",
  "AdminProfile",
  "AdminDoctorVerificationDetail",
  "AdminPharmacyVerificationDetail",
  "AdminAuditLogs",
  "AdminAuditLogDetail",
  "AdminRegisterWebView",
  "PharmacyDashboard",
  "PharmacyOrders",
  "PharmacyOrderDetail",
  "PharmacyExemptionReviews",
  "PharmacyExemptionReview",
]);

const PatientSessionBoundary = ({ children }: { children: ReactNode }) => {
  const activeTokenRef = useRef<string | null>(null);
  const timeoutMsRef = useRef<number | null>(null);
  const lastActivityAtRef = useRef(Date.now());
  const patientSessionEnabledRef = useRef(false);
  const signingOutRef = useRef(false);

  const refreshPrivacySettings = useCallback(async (token: string | null) => {
    if (!token) {
      patientSessionEnabledRef.current = false;
      timeoutMsRef.current = null;
      return;
    }

    const currentRoute = navigationRef.isReady()
      ? navigationRef.getCurrentRoute()?.name
      : undefined;

    if (currentRoute && NON_PATIENT_SESSION_ROUTES.has(currentRoute)) {
      patientSessionEnabledRef.current = false;
      timeoutMsRef.current = null;
      return;
    }

    if ((!currentRoute || !PATIENT_SESSION_ROUTES.has(currentRoute)) && timeoutMsRef.current === null) {
      return;
    }

    try {
      const result = await patientSettingsApi.getPrivacySettings();

      if (activeTokenRef.current !== token) return;

      patientSessionEnabledRef.current = true;
      timeoutMsRef.current = result.settings.sessionTimeoutMinutes * 60_000;
    } catch {
      if (activeTokenRef.current !== token) return;

      if (timeoutMsRef.current === null) {
        patientSessionEnabledRef.current = false;
      }
    }
  }, []);

  const expirePatientSession = useCallback(async () => {
    if (
      signingOutRef.current ||
      !patientSessionEnabledRef.current ||
      !activeTokenRef.current
    ) {
      return;
    }

    signingOutRef.current = true;

    try {
      await tokenStorage.removeToken();

      if (navigationRef.isReady()) {
        navigationRef.resetRoot({
          index: 0,
          routes: [{ name: "Login" }],
        });
      }

      const language = getRuntimeLanguage();
      const title = translateText(language, "common.sessionExpired");
      const message = translateText(language, "common.pleaseLoginAgain");

      Alert.alert(title, message);
    } finally {
      signingOutRef.current = false;
    }
  }, []);

  const checkSessionExpiry = useCallback(() => {
    if (AppState.currentState !== "active") return;

    if (
      !patientSessionEnabledRef.current ||
      !timeoutMsRef.current ||
      !activeTokenRef.current
    ) {
      return;
    }

    const currentRoute = navigationRef.isReady()
      ? navigationRef.getCurrentRoute()?.name
      : undefined;

    if (
      currentRoute === "SafetyResponse" ||
      currentRoute === "VideoConsultation"
    ) {
      lastActivityAtRef.current = Date.now();
      return;
    }

    if (Date.now() - lastActivityAtRef.current >= timeoutMsRef.current) {
      void expirePatientSession();
    }
  }, [expirePatientSession]);

  const registerActivity = useCallback(() => {
    if (
      !patientSessionEnabledRef.current ||
      !activeTokenRef.current
    ) {
      return;
    }

    lastActivityAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    let mounted = true;

    const applyToken = async (token: string | null) => {
      if (!mounted) return;

      const tokenChanged = activeTokenRef.current !== token;
      activeTokenRef.current = token;

      if (!token) {
        patientSessionEnabledRef.current = false;
        timeoutMsRef.current = null;
        return;
      }

      if (tokenChanged) {
        lastActivityAtRef.current = Date.now();
      }

      await refreshPrivacySettings(token);
    };

    void tokenStorage.getToken().then(token => applyToken(token));

    const unsubscribeToken = tokenStorage.subscribe(token => {
      void applyToken(token);
    });

    const appStateSubscription = AppState.addEventListener("change", nextState => {
      if (nextState === "active" && activeTokenRef.current) {
        checkSessionExpiry();
        void refreshPrivacySettings(activeTokenRef.current);
      }
    });

    const sessionCheckTimer = setInterval(() => {
      if (activeTokenRef.current && timeoutMsRef.current === null) {
        void refreshPrivacySettings(activeTokenRef.current);
      }

      checkSessionExpiry();
    }, SESSION_CHECK_INTERVAL_MS);

    const preferenceRefreshTimer = setInterval(() => {
      if (activeTokenRef.current) {
        void refreshPrivacySettings(activeTokenRef.current);
      }
    }, SESSION_PREFERENCE_REFRESH_MS);

    return () => {
      mounted = false;
      unsubscribeToken();
      appStateSubscription.remove();
      clearInterval(sessionCheckTimer);
      clearInterval(preferenceRefreshTimer);
    };
  }, [checkSessionExpiry, refreshPrivacySettings]);

  return (
    <View style={styles.sessionBoundary} onTouchStart={registerActivity}>
      {children}
    </View>
  );
};

const CriticalVitalWatcher = () => {
  const { lastSyncedReading } = useHealthConnectDevice();
  const lastHandledReadingIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!lastSyncedReading) return;
    if (lastSyncedReading.status !== "CRITICAL") return;
    if (!lastSyncedReading.id) return;

    if (lastHandledReadingIdRef.current === lastSyncedReading.id) {
      return;
    }

    if (!navigationRef.isReady()) return;

    const currentRoute = navigationRef.getCurrentRoute();

    if (
      currentRoute?.name === "SafetyResponse" ||
      currentRoute?.name === "VideoConsultation" ||
      currentRoute?.name === "ConsultationEnded"
    ) {
      return;
    }

    lastHandledReadingIdRef.current = lastSyncedReading.id;

    navigationRef.navigate("SafetyResponse", {
      vitalReading: lastSyncedReading,
      triggerSource: "Health Connect Auto Sync",
    });
  }, [lastSyncedReading]);

  return null;
};

export const AppNavigator = () => {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <HealthConnectDeviceProvider>
          <PatientSessionBoundary>
            <NavigationContainer ref={navigationRef}>
              <FCMInitializer />
              <CriticalVitalWatcher />

              <Stack.Navigator
                initialRouteName="Splash"
                screenOptions={{ headerShown: false }}
              >
                <Stack.Screen name="Splash" component={SplashScreen} />
                <Stack.Screen name="Welcome" component={WelcomeScreen} />
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
                <Stack.Screen name="PatientSignup" component={PatientSignupScreen} />
                <Stack.Screen name="DoctorSignup" component={DoctorSignupScreen} />
                <Stack.Screen name="PharmacySignup" component={PharmacySignupScreen} />
                <Stack.Screen name="PharmacyPendingApproval" component={PharmacyPendingApprovalScreen} />
                <Stack.Screen name="DoctorPendingApproval" component={DoctorPendingApprovalScreen} />
                <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
                <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />

                <Stack.Screen name="PatientTabs" component={PatientTabNavigator} />
                <Stack.Screen name="DoctorTabs" component={DoctorTabNavigator} />

                <Stack.Screen name="DoctorProfile" component={DoctorProfileStackScreen} />
                <Stack.Screen name="DoctorPatientDetail" component={DoctorPatientDetailStackScreen} />
                <Stack.Screen name="DoctorAlertDetail" component={DoctorAlertDetailStackScreen} />
                <Stack.Screen name="DoctorPatientReports" component={DoctorPatientReportsStackScreen} />
                <Stack.Screen name="DoctorReportReviews" component={DoctorReportReviewsStackScreen} />
                <Stack.Screen name="DoctorReportReview" component={DoctorReportReviewStackScreen} />
                <Stack.Screen name="DoctorSelectPrescriptionPatient" component={DoctorSelectPrescriptionPatientStackScreen} />
                <Stack.Screen name="DoctorPrescription" component={DoctorPrescriptionStackScreen} />
                <Stack.Screen name="DoctorSelectNotePatient" component={DoctorSelectNotePatientStackScreen} />
                <Stack.Screen name="DoctorAddNote" component={DoctorAddNoteStackScreen} />
                <Stack.Screen name="DoctorAvailability" component={DoctorAvailabilityStackScreen} />
                <Stack.Screen name="DoctorMedicineReviewPool" component={DoctorMedicineReviewPoolStackScreen} />
                <Stack.Screen name="DoctorMedicineReviewPoolDetail" component={DoctorMedicineReviewPoolDetailStackScreen} />

                <Stack.Screen name="AdminTabs" component={AdminTabNavigator} />
                <Stack.Screen name="AdminProfile" component={AdminProfileStackScreen} />

                <Stack.Screen name="PharmacyDashboard" component={PharmacyDashboardScreen} />
                <Stack.Screen name="PharmacyOrders" component={PharmacyOrdersStackScreen} />
                <Stack.Screen name="PharmacyOrderDetail" component={PharmacyOrderDetailStackScreen} />
                <Stack.Screen name="PharmacyExemptionReviews" component={PharmacyExemptionReviewsStackScreen} />
                <Stack.Screen name="PharmacyExemptionReview" component={PharmacyExemptionReviewStackScreen} />

                <Stack.Screen name="Notifications" component={NotificationsStackScreen} />

                <Stack.Screen name="AdminDashboard" component={AdminTabsLegacyScreen} />
                <Stack.Screen name="AdminDoctorVerificationDetail" component={AdminDoctorVerificationDetailScreen} />
                <Stack.Screen name="AdminPharmacyVerificationDetail" component={AdminPharmacyVerificationDetailScreen} />
                <Stack.Screen name="AdminAuditLogs" component={AdminAuditLogsStackScreen} />
                <Stack.Screen name="AdminAuditLogDetail" component={AdminAuditLogDetailStackScreen} />
                <Stack.Screen name="AdminRegisterWebView" component={AdminRegisterWebViewScreen} />

                <Stack.Screen name="PatientProfile" component={PatientProfileScreen} />
                <Stack.Screen name="EditPatientProfile" component={EditPatientProfileStackScreen} />
                <Stack.Screen name="MyPharmacies" component={MyPharmaciesStackScreen} />
                <Stack.Screen name="NotificationPreferences" component={NotificationPreferencesStackScreen} />
                <Stack.Screen name="ReminderSettings" component={ReminderSettingsStackScreen} />
                <Stack.Screen name="SafetyResponseSettings" component={SafetyResponseSettingsStackScreen} />
                <Stack.Screen name="LanguageAccessibility" component={LanguageAccessibilityStackScreen} />
                <Stack.Screen name="PrivacySecurity" component={PrivacySecurityStackScreen} />
                <Stack.Screen name="SelectDoctor" component={SelectDoctorStackScreen} />
                <Stack.Screen name="PatientActiveCalls" component={PatientActiveCallsStackScreen} />
                <Stack.Screen name="MedicineUpdates" component={MedicineUpdatesStackScreen} />
                <Stack.Screen name="PatientReports" component={PatientReportsStackScreen} />
                <Stack.Screen name="PatientUploadReport" component={PatientUploadReportStackScreen} />

                <Stack.Screen name="AddMedicine" component={AddMedicineScreen} />
                <Stack.Screen name="ConfirmReminder" component={ConfirmReminderScreen} />
                <Stack.Screen name="ScanMedicine" component={ScanMedicineScreen} />
                <Stack.Screen name="ScanMedicineResult" component={ScanMedicineResultScreen} />
                <Stack.Screen name="PrescriptionScanResult" component={PrescriptionScanResultScreen} />
                <Stack.Screen name="ConnectedDevice" component={ConnectedDeviceStackScreen} />
                <Stack.Screen name="ManualSafetyResponse" component={ManualSafetyResponseScreen} />
                <Stack.Screen name="SafetyResponse" component={SafetyResponseScreen} />
                <Stack.Screen name="VideoConsultation" component={VideoConsultationScreen} />
                <Stack.Screen name="ConsultationEnded" component={ConsultationEndedStackScreen} />
              </Stack.Navigator>
            </NavigationContainer>
          </PatientSessionBoundary>
        </HealthConnectDeviceProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  sessionBoundary: {
    flex: 1,
  },
});