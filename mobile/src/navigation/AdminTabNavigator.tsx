import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ComponentType } from "react";
import {
  Building2,
  LayoutDashboard,
  Stethoscope,
  UsersRound,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AdminDashboardScreen } from "../screens/admin/AdminDashboardScreen";
import { AdminDoctorListScreen } from "../screens/admin/AdminDoctorListScreen";
import { AdminPharmacyListScreen } from "../screens/admin/AdminPharmacyListScreen";
import { AdminUsersScreen } from "../screens/admin/AdminUsersScreen";
import type {
  AdminTabParamList,
  RootStackParamList,
} from "../types/navigation";

type AdminTabNavigatorProps = NativeStackScreenProps<
  RootStackParamList,
  "AdminTabs"
>;

const Tab = createBottomTabNavigator<AdminTabParamList>();

const SURFACE = "#FFFFFF";
const MUTED = "#6D687B";
const BORDER = "#E4E8F2";
const ADMIN = "#6750D8";

const AdminDashboardTabScreen = AdminDashboardScreen as ComponentType<any>;

export const AdminTabNavigator = ({ route }: AdminTabNavigatorProps) => {
  const insets = useSafeAreaInsets();

  const user = route.params?.user;
  const initialScreen = route.params?.screen || "Dashboard";

  const bottomInset = Math.max(insets.bottom, 10);

  return (
    <Tab.Navigator
      initialRouteName={initialScreen}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ADMIN,
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
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={AdminDashboardTabScreen}
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
        name="Doctors"
        component={AdminDoctorListScreen}
        options={{
          title: "Doctors",
          tabBarIcon: ({ color }) => (
            <Stethoscope size={22} color={color} strokeWidth={2.5} />
          ),
        }}
      />

      <Tab.Screen
        name="Pharmacies"
        component={AdminPharmacyListScreen}
        options={{
          title: "Pharmacy",
          tabBarIcon: ({ color }) => (
            <Building2 size={22} color={color} strokeWidth={2.5} />
          ),
        }}
      />

      <Tab.Screen
        name="Users"
        component={AdminUsersScreen}
        options={{
          title: "Users",
          tabBarIcon: ({ color }) => (
            <UsersRound size={22} color={color} strokeWidth={2.5} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};