import { StyleSheet, Text, View } from "react-native";

import { colors } from "../constants/colors";

type Props = {
  size?: number;
};

export const CareMateLogo = ({ size = 88 }: Props) => {
  return (
    <View
      style={[
        styles.logoBox,
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
        },
      ]}
    >
      <Text style={[styles.heartText, { fontSize: size * 0.42 }]}>♥</Text>

      <View
        style={[
          styles.plusCircle,
          {
            width: size * 0.34,
            height: size * 0.34,
            borderRadius: size * 0.17,
            right: size * 0.16,
            bottom: size * 0.14,
          },
        ]}
      >
        <Text style={[styles.plusText, { fontSize: size * 0.22 }]}>+</Text>
      </View>

      <Text style={[styles.cText, { fontSize: size * 0.22 }]}>C</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  logoBox: {
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 6,
  },
  heartText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  plusCircle: {
    position: "absolute",
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  plusText: {
    color: "#FFFFFF",
    fontWeight: "900",
    marginTop: -2,
  },
  cText: {
    position: "absolute",
    color: "#FFFFFF",
    fontWeight: "900",
    left: 12,
    top: 8,
  },
});