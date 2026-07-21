import { Text, View, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  CalendarDays,
  LayoutDashboard,
  Stethoscope,
  UserRound,
  UsersRound,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DoctorDashboardScreen } from "../screens/doctor/DoctorDashboardScreen";
import { DoctorPatientsScreen } from "../screens/doctor/DoctorPatientsScreen";
import type {
  DoctorTabParamList,
  RootStackParamList,
} from "../types/navigation";

type DoctorTabNavigatorProps = NativeStackScreenProps<
  RootStackParamList,
  "DoctorTabs"
>;

const Tab = createBottomTabNavigator<DoctorTabParamList>();

const BACKGROUND = "#EEF1FA";
const SURFACE = "#FFFFFF";
const TEXT = "#111936";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";

const DOCTOR_PRIMARY = "#0F766E";
const DOCTOR_LIGHT = "#E6FFFA";

const ComingSoonScreen = ({ title }: { title: string }) => {
  return (
    <View style={styles.placeholderScreen}>
      <View style={styles.placeholderIcon}>
        <Stethoscope size={28} color={DOCTOR_PRIMARY} strokeWidth={2.6} />
      </View>

      <Text style={styles.placeholderTitle}>{title}</Text>
      <Text style={styles.placeholderText}>
        This doctor workflow will connect to real patient data in the next
        module step.
      </Text>
    </View>
  );
};

export const DoctorTabNavigator = ({ route }: DoctorTabNavigatorProps) => {
  const insets = useSafeAreaInsets();
  const user = route.params?.user;
  const bottomInset = Math.max(insets.bottom, 10);

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: DOCTOR_PRIMARY,
        tabBarInactiveTintColor: MUTED,
        tabBarStyle: {
          backgroundColor: SURFACE,
          borderTopColor: BORDER,
          height: 66 + bottomInset,
          paddingTop: 8,
          paddingBottom: bottomInset,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={DoctorDashboardScreen}
        initialParams={{
          user,
        }}
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <LayoutDashboard size={22} color={color} strokeWidth={2.5} />
          ),
        }}
      />

      <Tab.Screen
        name="Consultations"
        options={{
          title: "Consults",
          tabBarIcon: ({ color }) => (
            <CalendarDays size={22} color={color} strokeWidth={2.5} />
          ),
        }}
      >
        {() => <ComingSoonScreen title="Consultations" />}
      </Tab.Screen>

      <Tab.Screen
        name="Patients"
        component={DoctorPatientsScreen}
        options={{
          title: "Patients",
          tabBarIcon: ({ color }) => (
            <UsersRound size={22} color={color} strokeWidth={2.5} />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <UserRound size={22} color={color} strokeWidth={2.5} />
          ),
        }}
      >
        {() => <ComingSoonScreen title="Doctor Profile" />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  placeholderScreen: {
    flex: 1,
    backgroundColor: BACKGROUND,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  placeholderIcon: {
    width: 76,
    height: 76,
    borderRadius: 18,
    backgroundColor: DOCTOR_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  placeholderTitle: {
    color: TEXT,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  placeholderText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 20,
    textAlign: "center",
  },
});