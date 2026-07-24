import type { ComponentType } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  CalendarDays,
  LayoutDashboard,
  Pill,
  ShieldAlert,
  UsersRound,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DoctorDashboardScreen } from "../screens/doctor/DoctorDashboardScreen";
import DoctorConsultationsScreen from "../screens/doctor/DoctorConsultationsScreen";
import DoctorAlertsScreen from "../screens/doctor/DoctorAlertsScreen";
import DoctorMedicineReviewsScreen from "../screens/doctor/DoctorMedicineReviewsScreen";
import { DoctorPatientsScreen } from "../screens/doctor/DoctorPatientsScreen";
import type {
  DoctorTabParamList,
  RootStackParamList,
} from "../types/navigation";

type DoctorTabNavigatorProps =
  NativeStackScreenProps<
    RootStackParamList,
    "DoctorTabs"
  >;

const Tab =
  createBottomTabNavigator<DoctorTabParamList>();

const DoctorDashboardTabScreen =
  DoctorDashboardScreen as ComponentType<any>;

const DoctorConsultationsTabScreen =
  DoctorConsultationsScreen as ComponentType<any>;

const DoctorAlertsTabScreen =
  DoctorAlertsScreen as ComponentType<any>;

const DoctorPatientsTabScreen =
  DoctorPatientsScreen as ComponentType<any>;

const DoctorMedicineReviewsTabScreen =
  DoctorMedicineReviewsScreen as ComponentType<any>;

const SURFACE = "#FFFFFF";
const MUTED = "#7A8194";
const BORDER = "#E4E8F2";
const DOCTOR_PRIMARY = "#0F766E";

export const DoctorTabNavigator = ({
  route,
}: DoctorTabNavigatorProps) => {
  const insets = useSafeAreaInsets();
  const user = route.params?.user;

  const bottomInset = Math.max(
    insets.bottom,
    10
  );

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:
          DOCTOR_PRIMARY,
        tabBarInactiveTintColor: MUTED,
        tabBarStyle: {
          backgroundColor: SURFACE,
          borderTopColor: BORDER,
          height: 66 + bottomInset,
          paddingTop: 8,
          paddingBottom: bottomInset,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={DoctorDashboardTabScreen}
        initialParams={{
          user,
        }}
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <LayoutDashboard
              size={21}
              color={color}
              strokeWidth={2.5}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Consultations"
        component={
          DoctorConsultationsTabScreen
        }
        options={{
          title: "Consults",
          tabBarIcon: ({ color }) => (
            <CalendarDays
              size={21}
              color={color}
              strokeWidth={2.5}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Alerts"
        component={DoctorAlertsTabScreen}
        options={{
          title: "Alerts",
          tabBarIcon: ({ color }) => (
            <ShieldAlert
              size={21}
              color={color}
              strokeWidth={2.5}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Patients"
        component={DoctorPatientsTabScreen}
        options={{
          title: "Patients",
          tabBarIcon: ({ color }) => (
            <UsersRound
              size={21}
              color={color}
              strokeWidth={2.5}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Reviews"
        component={
          DoctorMedicineReviewsTabScreen
        }
        options={{
          title: "Reviews",
          tabBarIcon: ({ color }) => (
            <Pill
              size={21}
              color={color}
              strokeWidth={2.5}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};