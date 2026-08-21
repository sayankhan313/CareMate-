import type { ComponentType } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { CalendarDays, LayoutDashboard, ShieldAlert, UsersRound } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CaregiverAppointmentsScreen } from "../screens/caregiver/CaregiverAppointmentsScreen";
import { CaregiverDashboardScreen } from "../screens/caregiver/CaregiverDashboardScreen";
import { CaregiverPatientsScreen } from "../screens/caregiver/CaregiverPatientsScreen";
import { CaregiverSafetyScreen } from "../screens/caregiver/CaregiverSafetyScreen";
import type { CaregiverTabParamList, RootStackParamList } from "../types/navigation";

type CaregiverTabNavigatorProps = NativeStackScreenProps<RootStackParamList, "CaregiverTabs">;

const Tab = createBottomTabNavigator<CaregiverTabParamList>();
const DashboardScreen = CaregiverDashboardScreen as ComponentType<any>;
const PatientsScreen = CaregiverPatientsScreen as ComponentType<any>;
const SafetyScreen = CaregiverSafetyScreen as ComponentType<any>;
const AppointmentsScreen = CaregiverAppointmentsScreen as ComponentType<any>;

const SURFACE = "#FFFFFF";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";
const CAREGIVER_PRIMARY = "#0F766E";

export const CaregiverTabNavigator = ({ route }: CaregiverTabNavigatorProps) => {
  const insets = useSafeAreaInsets();
  const user = route.params?.user;
  const bottomInset = Math.max(insets.bottom, 10);

  return (
    <Tab.Navigator initialRouteName="Home" screenOptions={{ headerShown: false, tabBarActiveTintColor: CAREGIVER_PRIMARY, tabBarInactiveTintColor: MUTED, tabBarStyle: { backgroundColor: SURFACE, borderTopColor: BORDER, height: 66 + bottomInset, paddingTop: 8, paddingBottom: bottomInset }, tabBarLabelStyle: { fontSize: 10, fontWeight: "700" } }}>
      <Tab.Screen name="Home" component={DashboardScreen} initialParams={{ user }} options={{ title: "Home", tabBarIcon: ({ color }) => <LayoutDashboard size={21} color={color} strokeWidth={2.5} /> }} />
      <Tab.Screen name="Patients" component={PatientsScreen} options={{ title: "Patients", tabBarIcon: ({ color }) => <UsersRound size={21} color={color} strokeWidth={2.5} /> }} />
      <Tab.Screen name="Safety" component={SafetyScreen} options={{ title: "Safety", tabBarIcon: ({ color }) => <ShieldAlert size={21} color={color} strokeWidth={2.5} /> }} />
      <Tab.Screen name="Appointments" component={AppointmentsScreen} options={{ title: "Appointments", tabBarIcon: ({ color }) => <CalendarDays size={21} color={color} strokeWidth={2.5} /> }} />
    </Tab.Navigator>
  );
};