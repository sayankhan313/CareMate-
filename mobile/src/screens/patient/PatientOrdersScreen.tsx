import { Alert, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CheckCircle2,
  Circle,
  Clock3,
  PackageCheck,
  Pill,
  RefreshCcw,
  Truck,
} from "lucide-react-native";

type OrderStepStatus = "COMPLETED" | "ACTIVE" | "PENDING";

type OrderStep = {
  id: string;
  title: string;
  description: string;
  status: OrderStepStatus;
};

type RefillMedicine = {
  id: string;
  name: string;
  doctorName: string;
  remainingDays: number;
};

const orderSteps: OrderStep[] = [
  {
    id: "received",
    title: "Received",
    description: "Order confirmed by pharmacy",
    status: "COMPLETED",
  },
  {
    id: "preparing",
    title: "Preparing",
    description: "Medicine being prepared",
    status: "ACTIVE",
  },
  {
    id: "ready",
    title: "Ready for collection",
    description: "Waiting for processing",
    status: "PENDING",
  },
  {
    id: "collected",
    title: "Collected",
    description: "Order completion",
    status: "PENDING",
  },
];

const refillMedicines: RefillMedicine[] = [
  {
    id: "metformin",
    name: "Metformin 500mg",
    doctorName: "Dr. Fahad Zariwala",
    remainingDays: 3,
  },
  {
    id: "amlodipine",
    name: "Amlodipine 5mg",
    doctorName: "Dr. Fahad Zariwala",
    remainingDays: 5,
  },
];

export const PatientOrdersScreen = () => {
  const insets = useSafeAreaInsets();

  const handleRequestFulfilment = (medicineName: string) => {
    Alert.alert(
      "Demo pharmacy request",
      `${medicineName} refill request is shown as a demo. Pharmacy backend will be connected later.`
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar backgroundColor="#2563EB" barStyle="light-content" />

      <View style={styles.screen}>
        <LinearGradient
          colors={["#3B82F6", "#2563EB"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Pharmacy Orders</Text>
          <Text style={styles.headerSubtitle}>
            Track prescriptions and request refills
          </Text>
        </LinearGradient>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: Math.max(120, insets.bottom + 110),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.orderCard}>
            <View style={styles.orderTopRow}>
              <View style={styles.orderIdRow}>
                <PackageCheck size={18} color="#64748B" strokeWidth={2.5} />
                <Text style={styles.orderId}>#ORD-1024</Text>
              </View>

              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>Preparing</Text>
              </View>
            </View>

            <View style={styles.medicineMiniCard}>
              <View style={styles.medicineIconCircle}>
                <Pill size={18} color="#2563EB" strokeWidth={2.5} />
              </View>

              <View style={styles.medicineTextBlock}>
                <Text style={styles.medicineName}>Metformin 500mg</Text>
                <Text style={styles.pharmacyName}>CareMate Demo Pharmacy</Text>
              </View>
            </View>

            <View style={styles.collectionBox}>
              <Clock3 size={16} color="#2563EB" strokeWidth={2.5} />
              <Text style={styles.collectionText}>Medicine expected after 5 PM</Text>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Order Progress</Text>

            <View style={styles.timeline}>
              {orderSteps.map((step, index) => {
                const isLast = index === orderSteps.length - 1;

                return (
                  <View key={step.id} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <StepIcon status={step.status} />
                      {!isLast ? <View style={styles.timelineLine} /> : null}
                    </View>

                    <View style={styles.timelineTextBlock}>
                      <Text
                        style={[
                          styles.timelineTitle,
                          step.status === "PENDING"
                            ? styles.timelineTitlePending
                            : undefined,
                        ]}
                      >
                        {step.title}
                      </Text>
                      <Text
                        style={[
                          styles.timelineDescription,
                          step.status === "PENDING"
                            ? styles.timelineDescriptionPending
                            : undefined,
                        ]}
                      >
                        {step.description}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.refillHeaderRow}>
            <Text style={styles.sectionHeading}>Eligible for Refill</Text>
          </View>

          <View style={styles.infoBox}>
            <RefreshCcw size={16} color="#2563EB" strokeWidth={2.4} />
            <Text style={styles.infoBoxText}>
              Only doctor-confirmed medicines can be requested.
            </Text>
          </View>

          {refillMedicines.map((medicine) => (
            <View key={medicine.id} style={styles.refillCard}>
              <View style={styles.refillTopRow}>
                <View style={styles.refillIconCircle}>
                  <Pill size={18} color="#2563EB" strokeWidth={2.5} />
                </View>

                <View style={styles.refillTextBlock}>
                  <Text style={styles.refillMedicineName}>{medicine.name}</Text>
                  <Text style={styles.refillDoctorText}>
                    Last prescribed by {medicine.doctorName}
                  </Text>

                  <View style={styles.daysRow}>
                    <Clock3 size={14} color="#F59E0B" strokeWidth={2.5} />
                    <Text style={styles.daysText}>
                      Remaining days: {medicine.remainingDays}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.requestButton}
                activeOpacity={0.87}
                onPress={() => handleRequestFulfilment(medicine.name)}
              >
                <Text style={styles.requestButtonText}>Request Fulfilment</Text>
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.demoNotice}>
            <Truck size={18} color="#64748B" strokeWidth={2.4} />
            <Text style={styles.demoNoticeText}>
              This is a demo pharmacy order screen. Real pharmacy integration can
              be added later with pharmacy accounts, stock status, and collection
              confirmation.
            </Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const StepIcon = ({ status }: { status: OrderStepStatus }) => {
  if (status === "COMPLETED") {
    return (
      <View style={[styles.stepCircle, styles.stepCompleted]}>
        <CheckCircle2 size={19} color="#FFFFFF" strokeWidth={2.7} />
      </View>
    );
  }

  if (status === "ACTIVE") {
    return (
      <View style={[styles.stepCircle, styles.stepActive]}>
        <Clock3 size={17} color="#FFFFFF" strokeWidth={2.7} />
      </View>
    );
  }

  return (
    <View style={[styles.stepCircle, styles.stepPending]}>
      <Circle size={15} color="#94A3B8" strokeWidth={2.7} />
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#2563EB",
  },
  screen: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 28,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "900",
  },
  headerSubtitle: {
    color: "#DBEAFE",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 5,
  },
  content: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },
  orderTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  orderIdRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  orderId: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 7,
  },
  statusPill: {
    backgroundColor: "#FEF3C7",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusPillText: {
    color: "#D97706",
    fontSize: 11,
    fontWeight: "900",
  },
  medicineMiniCard: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  medicineIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  medicineTextBlock: {
    flex: 1,
  },
  medicineName: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "900",
  },
  pharmacyName: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  collectionBox: {
    marginTop: 14,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 13,
    paddingVertical: 11,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  collectionText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 8,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 14,
  },
  timeline: {
    paddingBottom: 2,
  },
  timelineItem: {
    flexDirection: "row",
    minHeight: 58,
  },
  timelineLeft: {
    width: 34,
    alignItems: "center",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#E5E7EB",
    marginTop: 4,
  },
  stepCircle: {
    width: 27,
    height: 27,
    borderRadius: 13.5,
    alignItems: "center",
    justifyContent: "center",
  },
  stepCompleted: {
    backgroundColor: "#10B981",
  },
  stepActive: {
    backgroundColor: "#F59E0B",
  },
  stepPending: {
    backgroundColor: "#F1F5F9",
  },
  timelineTextBlock: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 16,
  },
  timelineTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
  },
  timelineTitlePending: {
    color: "#94A3B8",
  },
  timelineDescription: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  timelineDescriptionPending: {
    color: "#CBD5E1",
  },
  refillHeaderRow: {
    marginBottom: 10,
  },
  sectionHeading: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "900",
  },
  infoBox: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoBoxText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 8,
    flex: 1,
  },
  refillCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },
  refillTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  refillIconCircle: {
    width: 39,
    height: 39,
    borderRadius: 19.5,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  refillTextBlock: {
    flex: 1,
  },
  refillMedicineName: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
  },
  refillDoctorText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  daysRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
  },
  daysText: {
    color: "#F59E0B",
    fontSize: 12,
    fontWeight: "900",
    marginLeft: 5,
  },
  requestButton: {
    backgroundColor: "#2563EB",
    borderRadius: 13,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 14,
  },
  requestButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  demoNotice: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 4,
  },
  demoNoticeText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginLeft: 9,
    flex: 1,
  },
});