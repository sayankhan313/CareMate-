import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Home,
  Pill,
  Activity,
  Video,
  Package,
} from "lucide-react-native";

import { colors } from "../../constants/colors";

const ACTIVE_COLOR = colors.primary;
const INACTIVE_COLOR = "#8A94A6";

type TabIconProps = {
  routeName: string;
  focused: boolean;
};

const TabIcon = ({ routeName, focused }: TabIconProps) => {
  const iconColor = focused ? ACTIVE_COLOR : INACTIVE_COLOR;
  const iconStrokeWidth = focused ? 2.6 : 2.2;

  if (routeName === "Home") {
    return (
      <Home
        size={25}
        color={iconColor}
        strokeWidth={iconStrokeWidth}
      />
    );
  }

  if (routeName === "Medicines") {
    return (
      <Pill
        size={25}
        color={iconColor}
        strokeWidth={iconStrokeWidth}
      />
    );
  }

  if (routeName === "Vitals") {
    return (
      <Activity
        size={26}
        color={iconColor}
        strokeWidth={iconStrokeWidth}
      />
    );
  }

  if (routeName === "Consultations") {
    return (
      <Video
        size={25}
        color={iconColor}
        strokeWidth={iconStrokeWidth}
      />
    );
  }

  if (routeName === "PatientOrders") {
    return (
      <Package
        size={25}
        color={iconColor}
        strokeWidth={iconStrokeWidth}
      />
    );
  }

  return (
    <Home
      size={25}
      color={iconColor}
      strokeWidth={iconStrokeWidth}
    />
  );
};

const getTabLabel = (routeName: string) => {
  if (routeName === "Home") {
    return "Home";
  }

  if (routeName === "Medicines") {
    return "Medicines";
  }

  if (routeName === "Vitals") {
    return "Vitals";
  }

  if (routeName === "Consultations") {
    return "Consult";
  }

  if (routeName === "PatientOrders") {
    return "Orders";
  }

  return routeName;
};

export const PatientBottomTabBar = ({
  state,
  navigation,
}: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const label = getTabLabel(route.name);

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tabItem}
              onPress={onPress}
              activeOpacity={0.75}
            >
              <View style={styles.iconWrapper}>
                <TabIcon routeName={route.name} focused={isFocused} />
              </View>

              <Text
                style={[
                  styles.label,
                  isFocused ? styles.labelActive : undefined,
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  tabBar: {
    height: 66,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapper: {
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: INACTIVE_COLOR,
  },
  labelActive: {
    color: ACTIVE_COLOR,
  },
});