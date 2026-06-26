import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { colors } from "../../constants/colors";

type Props = {
  navigation: any;
};

export const RoleSelectionScreen = ({ navigation }: Props) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create your account</Text>

      <Text style={styles.subtitle}>
        Select the type of account you want to create.
      </Text>

      <TouchableOpacity
        style={styles.primaryCard}
        onPress={() => navigation.navigate("PatientSignup")}
      >
        <Text style={styles.cardTitle}>Patient</Text>
        <Text style={styles.cardText}>
          Manage medicines, vitals, appointments and emergency support.
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.disabledCard}
        onPress={() =>
          Alert.alert(
            "Coming next",
            "Doctor registration will be connected after patient authentication."
          )
        }
      >
        <Text style={styles.disabledTitle}>Doctor</Text>
        <Text style={styles.disabledText}>
          Review patients and manage clinical support workflows.
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.disabledCard}
        onPress={() =>
          Alert.alert(
            "Coming next",
            "Caregiver registration will be connected after patient authentication."
          )
        }
      >
        <Text style={styles.disabledTitle}>Caregiver</Text>
        <Text style={styles.disabledText}>
          Support linked patients and receive important updates.
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.disabledCard}
        onPress={() =>
          Alert.alert(
            "Coming next",
            "Pharmacy registration will be connected after patient authentication."
          )
        }
      >
        <Text style={styles.disabledTitle}>Pharmacy Staff</Text>
        <Text style={styles.disabledText}>
          Manage prescriptions and medicine dispensing workflows.
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>Back to login</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingTop: 70,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.mutedText,
    lineHeight: 22,
    marginBottom: 26,
  },
  primaryCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
  },
  cardText: {
    color: "#EAF2FF",
    fontSize: 15,
    lineHeight: 22,
  },
  disabledCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabledTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  disabledText: {
    color: colors.mutedText,
    fontSize: 15,
    lineHeight: 22,
  },
  backText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 12,
  },
});