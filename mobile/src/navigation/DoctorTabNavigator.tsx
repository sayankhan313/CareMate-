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

import { DoctorDashboardScreen } from "../screens/doctor/DoctorDashboardScreen";
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

const DOCTOR_PRIMARY = "#7C3AED";

const ComingSoonScreen = ({ title }: { title: string }) => {
  return (
    <View style={styles.placeholderScreen}>
      <View style={styles.placeholderIcon}>
        <Stethoscope size={28} color={DOCTOR_PRIMARY} strokeWidth={2.6} />
      </View>

      <Text style={styles.placeholderTitle}>{title}</Text>
      <Text style={styles.placeholderText}>
        This doctor section will connect after admin approval and patient link
        workflows are completed.
      </Text>
    </View>
  );
};

export const DoctorTabNavigator = ({ route }: DoctorTabNavigatorProps) => {
  const user = route.params?.user;

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
          height: 72,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "800",
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
          title: "Dashboard",
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
        options={{
          title: "Patients",
          tabBarIcon: ({ color }) => (
            <UsersRound size={22} color={color} strokeWidth={2.5} />
          ),
        }}
      >
        {() => <ComingSoonScreen title="Patients" />}
      </Tab.Screen>

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
    borderRadius: 26,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  placeholderTitle: {
    color: TEXT,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 8,
  },
  placeholderText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
    textAlign: "center",
  },
});