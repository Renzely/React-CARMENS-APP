import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { useNavigation, useRoute } from "@react-navigation/native";
import moment from "moment";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Keyboard,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import styles from "./Style";

const LabeledInput = ({ label, value, onChangeText, keyboardType }: any) => (
  <View style={{ marginBottom: 5 }}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType || "default"}
    />
  </View>
);
const buildSkuData = (prev: any) => ({
  DAIRY: (prev.versions?.DAIRY?.Carried || []).map((sku: any) => ({
    label: sku.sku,
    value: sku.skuCode,
    expiry: sku.expiry || [],
    beginningPCS: sku.beginningPCS?.toString() || "0", // 👈 use carried-over beginning
  })),
  ICECREAM: (prev.versions?.ICECREAM?.Carried || []).map((sku: any) => ({
    label: sku.sku,
    value: sku.skuCode,
    expiry: sku.expiry || [],
    beginningPCS: sku.beginningPCS?.toString() || "0",
  })),
  MVP: (prev.versions?.MVP?.Carried || []).map((sku: any) => ({
    label: sku?.sku || sku?.label || "Unknown SKU",
    value: sku?.skuCode || sku?.value || Math.random().toString(),
    harvest: sku?.harvest || [],
  })),
});

export default function InventoryNextWeek() {
  const route = useRoute();
  const [loading, setLoading] = useState(false);
  const { data } = route.params as { data: string };
  const prevWeekData = JSON.parse(data);
  const navigation = useNavigation();
  const nextInfo = moment();
  const [date] = useState(nextInfo.format("YYYY-MM-DD"));
  const [email] = useState(prevWeekData.email || "");
  const [merchandiser] = useState(prevWeekData.merchandiser || "");
  const [selectedOutlet, setSelectedOutlet] = useState(
    prevWeekData.outlet || ""
  );
  const [availability, setAvailability] = useState<{
    [version: string]: { [skuKey: string]: string };
  }>({});
  const [prevDocId, setPrevDocId] = useState<string | null>(null);
  const [rtvNo, setRtvNo] = useState(""); // single RTV No
  const [open, setOpen] = useState(false);
  const [outletOptions, setOutletOptions] = useState([
    { label: selectedOutlet, value: selectedOutlet },
  ]);
  const [showDatePicker, setShowDatePicker] = useState<{
    visible: boolean;
    skuKey: string | null;
    idx: number | null;
  }>({
    visible: false,
    skuKey: null,
    idx: null,
  });

  const [skuData, setSkuData] = useState<any>(buildSkuData(prevWeekData));

  const [skuValues, setSkuValues] = useState<any>(() => {
    const init: any = {};
    ["DAIRY", "ICECREAM", "MVP"].forEach((v) => {
      init[v] = {};
      (skuData[v] || []).forEach((sku: any) => {
        init[v][sku.value] = {
          beginning: sku.beginningPCS || "0",
          delivery: "",
          rtv: "",
          ending: "",
          offtake: "",
          oos: "",
          expiry: [{ month: "", quantity: "" }],

          harvest: sku.harvest?.length
            ? sku.harvest
            : [{ date: "", quantity: "" }],
          // 👇 New fields
          avgOfftake: (() => {
            const skuPrev = prevWeekData?.versions?.[v]?.Carried?.find(
              (p: any) => p.skuCode === sku.value
            );
            if (!skuPrev) return "0";

            // ✅ Use the running average already computed by carryOverSkus
            if (skuPrev.avgOfftake != null) {
              return skuPrev.avgOfftake.toString();
            }

            // fallback: compute from stock movement if no avg stored yet
            const beginning = parseFloat(skuPrev.beginningPCS || "0");
            const delivery = parseFloat(skuPrev.deliveryPCS || "0");
            const rtv = parseFloat(skuPrev.rtvPCS || "0");
            const ending = parseFloat(skuPrev.endingPCS || "0");
            const calcOfftake = beginning + delivery - rtv - ending;

            return calcOfftake.toString();
          })(),

          soInput: "",
        };
      });
    });
    return init;
  });

  const [version, setVersion] = useState("");
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const fields = [
    { key: "beginning", label: "Beginning PCS" },
    { key: "delivery", label: "Delivery PCS" },
    { key: "rtvNo", label: "RTV No" },
    { key: "rtv", label: "RTV" }, // per SKU
    { key: "ending", label: "Ending PCS" },
    { key: "offtake", label: "Offtake" },
    { key: "oos", label: "No. of Days OOS" },
    { key: "expiry", label: "Expiry" },
    { key: "suggestOrder", label: "Suggest Order" },
  ];

  const handleChange = (fieldKey: string, skuKey: string, value: any) => {
    setSkuValues((prev: any) => {
      const updated = {
        ...prev,
        [version]: {
          ...prev[version],
          [skuKey]: {
            ...prev[version][skuKey],
            [fieldKey]: value,
          },
        },
      };

      if (
        ["beginningPCS", "deliveryPCS", "rtvPCS", "endingPCS"].includes(
          fieldKey
        )
      ) {
        const b = Number(updated[version][skuKey].beginningPCS || 0);
        const d = Number(updated[version][skuKey].deliveryPCS || 0);
        const r = Number(updated[version][skuKey].rtvPCS || 0);
        const e = Number(updated[version][skuKey].endingPCS || 0);

        // live offtake for THIS week
        const thisOfftake = b + d - r - e;
        updated[version][skuKey].offtake = thisOfftake;

        // pull history
        const prevSku =
          prevWeekData?.versions?.[version]?.Carried?.find(
            (p: any) => p.skuCode === skuKey
          ) || null;

        // 🔑 Use CURRENT totals if they exist, not only prevWeekData
        const prevTotal =
          Number(updated[version][skuKey].totalOfftake || 0) -
          Number(updated[version][skuKey].offtake || 0); // subtract this week's old offtake

        const prevWeeks = Number(updated[version][skuKey].weeksCount || 0) - 1; // remove this week if already counted

        // live totals with new inputs
        const liveTotal = prevTotal + thisOfftake;
        const liveWeeks = prevWeeks + 1;

        updated[version][skuKey].totalOfftake = liveTotal;
        updated[version][skuKey].weeksCount = liveWeeks;

        updated[version][skuKey].avgOfftake =
          liveWeeks > 0 ? Number((liveTotal / liveWeeks).toFixed(2)) : 0;
      }

      return updated;
    });
  };

  const handleHarvestEntryChange = (
    skuKey: string,
    idx: number,
    field: "date" | "quantity",
    value: string
  ) => {
    setSkuValues((prev: any) => {
      const copy = { ...prev };

      if (!copy.MVP) copy.MVP = {};
      if (!copy.MVP[skuKey]) copy.MVP[skuKey] = { harvest: [] };
      if (!copy.MVP[skuKey].harvest) copy.MVP[skuKey].harvest = [];

      const harvest = [...copy.MVP[skuKey].harvest];
      harvest[idx] = { ...harvest[idx], [field]: value };
      copy.MVP[skuKey].harvest = harvest;

      return copy;
    });
  };

  useEffect(() => {
    if (!version) return;

    const newOfftake: any = {};

    (skuData[version] || []).forEach((skuItem: any) => {
      const beginning = parseFloat(
        skuValues[version]?.[skuItem.value]?.beginning || "0"
      );
      const delivery = parseFloat(
        skuValues[version]?.[skuItem.value]?.delivery || "0"
      );
      const rtv = parseFloat(skuValues[version]?.[skuItem.value]?.rtv || "0");
      const ending = parseFloat(
        skuValues[version]?.[skuItem.value]?.ending || "0"
      );

      const calculatedOfftake = beginning + delivery - rtv - ending;

      newOfftake[skuItem.value] = calculatedOfftake;
    });

    setSkuValues((prev: any) => {
      const updated = { ...prev };

      Object.keys(newOfftake).forEach((skuKey) => {
        if (!updated[version][skuKey]) return;

        const thisOfftake = newOfftake[skuKey];

        updated[version][skuKey] = {
          ...updated[version][skuKey],
          offtake: thisOfftake.toFixed(2), // ✅ always overwrite
          // ❌ don’t stack avgOfftake here
        };
      });

      return updated;
    });
  }, [version, skuValues[version], skuData[version]]);

  const handleDateConfirm = (date: Date) => {
    if (showDatePicker.skuKey && showDatePicker.idx !== null) {
      const skuKey = showDatePicker.skuKey;
      const idx = showDatePicker.idx;

      // store ISO date, but display a formatted one
      const isoDate = date.toISOString().split("T")[0];
      const displayDate = formatDisplayDate(date);

      handleChange(
        "expiry",
        skuKey,
        skuValues[version][skuKey].expiry.map((e: any, i: number) =>
          i === idx ? { ...e, date: isoDate, displayDate } : e
        )
      );
    }
    setShowDatePicker({ visible: false, skuKey: null, idx: null });
  };

  const handleDateCancel = () => {
    setShowDatePicker({ visible: false, skuKey: null, idx: null });
  };

  const formatDisplayDate = (date: Date) =>
    date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const mapCarried = (skuList: any[], skuValuesForCat: any) =>
    skuList.map((sku: any) => {
      const vals = skuValuesForCat[sku.value] || {};

      return {
        sku: sku.label,
        skuCode: sku.value,

        // 🔹 map correctly to schema fields
        beginningPCS: Number(vals.beginning || 0),
        deliveryPCS: Number(vals.delivery || 0),
        rtvPCS: Number(vals.rtv || 0),
        endingPCS: Number(vals.ending || 0),

        offtake: Number(vals.offtake || 0),
        oos: Number(vals.oos || 0),
        avgOfftake: Number(vals.avgOfftake || 0),
        soQty: Number(vals.soInput || 0),
        suggestedOrder: Number(vals.suggestedOrder || 0),

        expiry: vals.expiry || [],
        harvest: vals.harvest || [],
        rtvNo: vals.rtvNo || "",
        rtvReason: vals.rtvReason || "",
      };
    });

  useEffect(() => {
    const fetchPrev = async () => {
      try {
        const res = await fetch(
          `https://api-carmens-best.bmphrc.com/getLatest?outlet=${selectedOutlet}`
        );
        const data = await res.json();
        if (data?.doc?._id) {
          setPrevDocId(data.doc._id); // ✅ store prev id
          console.log("Fetched prevDocId:", data.doc._id);
        } else {
          setPrevDocId(null); // first ever doc
        }
      } catch (err) {
        console.error("❌ Error fetching prev doc:", err);
        setPrevDocId(null);
      }
    };
    fetchPrev();
  }, [selectedOutlet]);

  const validateInventory = (
    skuData: any,
    skuValues: any,
    availability: any
  ): {
    complete: string[];
    incomplete: string[];
    details: { [version: string]: { [sku: string]: string[] } };
  } => {
    const complete: string[] = [];
    const incomplete: string[] = [];
    const details: { [version: string]: { [sku: string]: string[] } } = {};

    ["DAIRY", "ICECREAM", "MVP"].forEach((version) => {
      const skuList = skuData[version] || [];
      let versionComplete = true;

      skuList.forEach((sku: any) => {
        const key = sku.value;
        const status = availability?.[version]?.[key];

        if (status === "Not Carried" || status === "Delisted") return;

        const v = skuValues?.[version]?.[key] || {};
        const missing: string[] = [];

        // --- Required fields ---
        if (!v.beginning && v.beginning !== 0) missing.push("Beginning");
        if (!v.delivery && v.delivery !== 0) missing.push("Delivery");
        if (!v.ending && v.ending !== 0) missing.push("Ending");

        // --- Conditional: OOS required only if Ending == 0 ---
        if (Number(v.ending) === 0 && (!v.oos || v.oos === "")) {
          missing.push("No. of Days OOS");
        }

        if (missing.length > 0) {
          versionComplete = false;
          if (!details[version]) details[version] = {};
          details[version][sku.label] = missing;
        }
      });

      if (versionComplete) {
        complete.push(version);
      } else {
        incomplete.push(version);
      }
    });

    return { complete, incomplete, details };
  };

  const handleSave = async () => {
    try {
      const { complete, incomplete, details } = validateInventory(
        skuData,
        skuValues,
        availability
      );

      if (incomplete.length > 0) {
        let message = "";
        incomplete.forEach((version) => {
          message += `\n${version}:\n`;
          const versionDetails = details[version] || {};
          Object.entries(versionDetails).forEach(([sku, fields]) => {
            message += `  • ${sku} → Missing: ${fields.join(", ")}\n`;
          });
        });

        Alert.alert(
          "Incomplete SKUs",
          `You have completed: ${complete.join(", ") || "None"}\n` +
            `Please complete:\n${message}`
        );
        return; // ⛔ Stop if missing fields
      }

      // ✅ Prepare SKUs for payload
      const prepareSkus = (skus: any[]) => {
        return skus.map((sku: any) => {
          const lastOfftake = Number(sku.offtake || 0);
          const prevTotal = Number(sku.totalOfftake || 0);
          const prevCount = Number(sku.weeksCount || 0);

          const newTotal = prevTotal + lastOfftake;
          const newCount = prevCount + 1;
          const newAvg = newCount > 0 ? newTotal / newCount : 0;

          return {
            ...sku,
            code: sku.code || "",
            totalOfftake: newTotal,
            weeksCount: newCount,
            avgOfftake: newAvg,
            suggestedOrder: Math.max(0, newAvg - (sku.soQty || 0)),
          };
        });
      };

      const payload: any = {
        email,
        merchandiser,
        outlet: selectedOutlet,
        date,
        versions: {
          DAIRY: {
            Carried: prepareSkus(
              mapCarried(skuData.DAIRY || [], skuValues.DAIRY)
            ),
          },
          ICECREAM: {
            Carried: prepareSkus(
              mapCarried(skuData.ICECREAM || [], skuValues.ICECREAM)
            ),
          },
          MVP: {
            Carried: prepareSkus(mapCarried(skuData.MVP || [], skuValues.MVP)),
          },
        },
      };

      // 🔹 Save the NEXT week
      const res = await fetch("https://api-carmens-best.bmphrc.com/saveNext", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const result = await res.json();

      if (result?.id) {
        setPrevDocId(result.id); // keep track of the new doc
      }

      Alert.alert("Success", "Next week inventory saved!");
      navigation.goBack();
    } catch (err) {
      console.error("❌ Error saving:", err);
      Alert.alert("Error", "Could not save next week inventory");
    }
  };

  const isSkuComplete = (version: string, key: string): boolean => {
    const avail = availability[version]?.[key];

    // Auto complete if Not Carried / Delisted
    if (avail === "Not Carried" || avail === "Delisted") return true;

    const sku = skuValues[version]?.[key] || {};

    if (version === "MVP") {
      const harvestList = sku.harvest || [];
      const isValidHarvest = harvestList.some(
        (entry: { date?: string; quantity?: string | number }) =>
          !!entry?.date &&
          entry?.quantity !== "" &&
          !isNaN(Number(entry.quantity)) &&
          Number(entry.quantity) > 0
      );
      return isValidHarvest; // 🔑 no longer require oos
    }

    if (version === "ICECREAM") {
      return sku.beginning !== "" && sku.delivery !== "" && sku.ending !== "";
    }

    if (version === "DAIRY") {
      return sku.beginning !== "" && sku.delivery !== "" && sku.ending !== "";
    }

    return false;
  };

  const getTotalSkuCount = () => {
    let total = 0;
    for (const version in skuData) {
      total += skuData[version]?.length || 0;
    }
    return total;
  };

  const getCompletedSkuCount = () => {
    let completed = 0;
    for (const version in skuData) {
      const skus = skuData[version] || [];
      for (const sku of skus) {
        if (isSkuComplete(version, sku.value)) {
          completed++;
        }
      }
    }
    return completed;
  };

  const completed = getCompletedSkuCount();
  const total = getTotalSkuCount();
  const incomplete = total - completed;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View
        style={[
          styles.pageContainer,
          {
            paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
          },
        ]}
      >
        <View style={styles.appBarExpiry}>
          <Text style={styles.appBarTitleInventoryprocess}>
            INVENTORY NEXT WEEK
          </Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingBottom: 100,
            paddingHorizontal: 15,
            paddingTop: 30,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          {/* Header Info */}
          <LabeledInput label="Date" value={date} onChangeText={() => {}} />
          {false && (
            <>
              <LabeledInput
                label="Email Address"
                value={email}
                onChangeText={() => {}}
              />
              <LabeledInput
                label="Merchandiser Name"
                value={merchandiser}
                onChangeText={() => {}}
              />
            </>
          )}

          <DropDownPicker
            open={open}
            value={selectedOutlet}
            items={outletOptions}
            setOpen={setOpen}
            setValue={setSelectedOutlet}
            setItems={setOutletOptions}
            disabled
          />

          <View style={styles.buttonRow}>
            {["DAIRY", "ICECREAM", "MVP"].map((v) => {
              const versionSkus = skuData[v] || [];
              const totalSkuCount = versionSkus.length;

              const completedSkuCount = versionSkus.filter((skuItem: any) =>
                isSkuComplete(v, skuItem.value)
              ).length;

              return (
                <TouchableOpacity
                  key={v}
                  style={[
                    styles.versionBtn,
                    version === v && styles.selectedButton,
                  ]}
                  onPress={() => setVersion(v)}
                >
                  <Text
                    style={[styles.btnText, version === v && { color: "#fff" }]}
                  >
                    {completedSkuCount}/{totalSkuCount} {v}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Expandable Sections */}
          {version &&
            (version === "MVP" ? (
              // MVP Harvest Section Only
              <View style={{ marginTop: 20 }}>
                <TouchableOpacity
                  style={styles.expandButton}
                  onPress={() =>
                    setExpandedSection((prev) =>
                      prev === "Harvest" ? null : "Harvest"
                    )
                  }
                >
                  <Text style={styles.expandButtonText}>
                    {expandedSection === "Harvest"
                      ? `Hide Harvest`
                      : `Expand Harvest`}
                  </Text>
                </TouchableOpacity>

                {expandedSection === "Harvest" && (
                  <View style={{ marginTop: 10 }}>
                    {(skuData.MVP || []).map((skuItem: any) => {
                      const harvestEntries = skuValues?.MVP?.[skuItem.value]
                        ?.harvest || [{ date: "", quantity: "" }];

                      return (
                        <View key={skuItem.value} style={{ marginBottom: 16 }}>
                          <Text style={[styles.skuText, { marginBottom: 6 }]}>
                            {skuItem.label}
                          </Text>

                          {harvestEntries.map((entry: any, index: any) => (
                            <View
                              key={`${skuItem.value}-${index}`}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                marginBottom: 8,
                              }}
                            >
                              {/* Date Picker */}
                              <View style={{ flex: 3, marginHorizontal: 8 }}>
                                <TouchableOpacity
                                  style={{
                                    borderWidth: 1,
                                    borderColor: "#ccc",
                                    borderRadius: 4,
                                    paddingVertical: 10,
                                    paddingHorizontal: 12,
                                  }}
                                  onPress={() =>
                                    setShowDatePicker({
                                      visible: true,
                                      skuKey: skuItem.value,
                                      idx: index,
                                    })
                                  }
                                >
                                  <Text style={{ fontSize: 14 }}>
                                    {entry.date
                                      ? (() => {
                                          const d = new Date(entry.date);
                                          // format MM-DD-YYYY
                                          return `${String(
                                            d.getMonth() + 1
                                          ).padStart(2, "0")}-${String(
                                            d.getDate()
                                          ).padStart(
                                            2,
                                            "0"
                                          )}-${d.getFullYear()}`;
                                        })()
                                      : "Select Date"}
                                  </Text>
                                </TouchableOpacity>

                                {showDatePicker?.skuKey === skuItem.value &&
                                  showDatePicker?.idx === index && (
                                    <DateTimePicker
                                      value={
                                        entry.date
                                          ? new Date(entry.date)
                                          : new Date()
                                      }
                                      mode="date"
                                      display="default"
                                      onChange={(event, selectedDate) => {
                                        if (
                                          event.type === "set" &&
                                          selectedDate
                                        ) {
                                          // store ISO (safe) like "2025-08-27"
                                          const iso = selectedDate
                                            .toISOString()
                                            .split("T")[0];
                                          handleHarvestEntryChange(
                                            skuItem.value,
                                            index,
                                            "date",
                                            iso
                                          );
                                        }
                                        setShowDatePicker({
                                          visible: false,
                                          skuKey: null,
                                          idx: null,
                                        });
                                      }}
                                    />
                                  )}
                              </View>

                              {/* Quantity Field */}
                              <TextInput
                                placeholder="Qty"
                                placeholderTextColor="grey"
                                style={[
                                  styles.inputBox,
                                  {
                                    flex: 2,
                                    height: 40,
                                    fontSize: 14,
                                    backgroundColor: entry.date
                                      ? "#fff"
                                      : "#f0f0f0",
                                    borderColor: entry.date
                                      ? "#844515"
                                      : "#ccc",
                                    borderWidth: 1,
                                  },
                                ]}
                                keyboardType="numeric"
                                value={entry.quantity?.toString() || ""}
                                onChangeText={(text) => {
                                  if (!entry.date) {
                                    Alert.alert("Please select a date first.");
                                    return;
                                  }
                                  if (/^\d*$/.test(text)) {
                                    handleHarvestEntryChange(
                                      skuItem.value,
                                      index,
                                      "quantity",
                                      text
                                    );
                                  }
                                }}
                              />
                            </View>
                          ))}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            ) : (
              // ICECREAM / DAIRY flow
              fields.map((field) => {
                const skus = skuData[version] || [];
                const requiredFields = [
                  "beginning",
                  "delivery",
                  "rtv",
                  "ending",
                  "oos",
                ];

                // --- Default completed counter ---
                let completed = 0;
                let total = skus.length;

                // Required fields (Beginning, Delivery, RTV, Ending, OOS)
                if (requiredFields.includes(field.key)) {
                  skus.forEach((sku: any) => {
                    const values = skuValues[version][sku.value] || {};
                    const isComplete =
                      values[field.key] &&
                      values[field.key].toString().trim() !== "";
                    if (isComplete) completed++;
                  });
                }

                // Expiry-specific counter (count per entry, not per SKU)
                if (field.key === "expiry") {
                  completed = 0;
                  total = skus.reduce(
                    (acc: number, sku: any) =>
                      acc +
                      (skuValues[version][sku.value]?.expiry?.length || 0),
                    0
                  );

                  skus.forEach((sku: any) => {
                    const expiryList =
                      skuValues[version][sku.value]?.expiry || [];
                    expiryList.forEach((entry: any) => {
                      if (
                        entry.date &&
                        entry.quantity &&
                        entry.quantity.toString().trim() !== ""
                      ) {
                        completed++;
                      }
                    });
                  });
                }

                return (
                  <View key={field.key} style={{ marginTop: 20 }}>
                    <TouchableOpacity
                      style={styles.expandButton}
                      onPress={() =>
                        setExpandedSection((prev) =>
                          prev === field.key ? null : field.key
                        )
                      }
                    >
                      <Text style={styles.expandButtonText}>
                        {expandedSection === field.key
                          ? `Hide ${field.label}${
                              requiredFields.includes(field.key) ||
                              field.key === "expiry"
                                ? ` ${completed}/${total}`
                                : ""
                            }`
                          : `Show ${field.label}${
                              requiredFields.includes(field.key) ||
                              field.key === "expiry"
                                ? ` ${completed}/${total}`
                                : ""
                            }`}
                      </Text>
                    </TouchableOpacity>

                    {expandedSection === field.key && (
                      <View style={{ marginTop: 10 }}>
                        {field.key === "expiry" ? (
                          (skuData[version] || []).map((sku: any) => {
                            const expiryList = [
                              ...skuValues[version][sku.value].expiry,
                              ...Array(
                                6 - skuValues[version][sku.value].expiry.length
                              ).fill({
                                date: "",
                                quantity: "",
                              }),
                            ].slice(0, 6);

                            return (
                              <View
                                key={sku.value}
                                style={{
                                  flexDirection: "row", // ⬅️ put SKU name + expiry side by side
                                  alignItems: "flex-start",
                                  marginBottom: 15,
                                }}
                              >
                                {/* SKU Name (left column) */}
                                <Text
                                  style={[
                                    styles.skuText,
                                    { width: 120, marginRight: 10 },
                                  ]}
                                >
                                  {sku.label}
                                </Text>

                                {/* Expiry fields (right column) */}
                                <View style={{ flex: 1 }}>
                                  {expiryList.map((entry: any, idx: number) => (
                                    <View
                                      key={idx}
                                      style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        marginBottom: 6,
                                      }}
                                    >
                                      {/* Date Picker */}
                                      <DateTimePickerModal
                                        isVisible={entry.showPicker === true}
                                        mode="date"
                                        onConfirm={(date) => {
                                          const isoDate = date
                                            .toISOString()
                                            .split("T")[0];
                                          const updated = expiryList.map(
                                            (e: any, i: number) =>
                                              i === idx
                                                ? {
                                                    ...e,
                                                    date: isoDate,
                                                    showPicker: false,
                                                  }
                                                : e
                                          );
                                          handleChange(
                                            "expiry",
                                            sku.value,
                                            updated
                                          );
                                        }}
                                        onCancel={() => {
                                          const updated = expiryList.map(
                                            (e: any, i: number) =>
                                              i === idx
                                                ? { ...e, showPicker: false }
                                                : e
                                          );
                                          handleChange(
                                            "expiry",
                                            sku.value,
                                            updated
                                          );
                                        }}
                                      />

                                      <TouchableOpacity
                                        style={[
                                          styles.inputBox,
                                          {
                                            width: 120,
                                            height: 40,
                                            justifyContent: "center",
                                            alignItems: "center",
                                            marginRight: 6,
                                            backgroundColor: "#fff",
                                            borderColor: "#844515",
                                            borderWidth: 1,
                                          },
                                        ]}
                                        onPress={() => {
                                          const updated = expiryList.map(
                                            (e: any, i: number) =>
                                              i === idx
                                                ? { ...e, showPicker: true }
                                                : e
                                          );
                                          handleChange(
                                            "expiry",
                                            sku.value,
                                            updated
                                          );
                                        }}
                                      >
                                        <Text style={{ fontSize: 14 }}>
                                          {entry.date
                                            ? entry.date
                                            : "Select Date"}
                                        </Text>
                                      </TouchableOpacity>

                                      {/* Qty Input */}
                                      <TextInput
                                        placeholder="Qty"
                                        placeholderTextColor={"grey"}
                                        keyboardType="numeric"
                                        style={[
                                          styles.inputBox,
                                          {
                                            width: 60,
                                            height: 40,
                                            textAlign: "center",
                                            backgroundColor: "#fff",
                                            borderColor: "#844515",
                                            borderWidth: 1,
                                          },
                                        ]}
                                        value={entry.quantity?.toString() || ""}
                                        onChangeText={(text) =>
                                          handleChange(
                                            "expiry",
                                            sku.value,
                                            expiryList.map(
                                              (e: any, i: number) =>
                                                i === idx
                                                  ? {
                                                      ...e,
                                                      quantity: Number(text),
                                                    }
                                                  : e
                                            )
                                          )
                                        }
                                      />
                                    </View>
                                  ))}
                                </View>
                              </View>
                            );
                          })
                        ) : field.key === "rtvNo" ? (
                          // --- RTV No is single field ---
                          <View style={{ marginVertical: 10 }}>
                            {/* <Text
                              style={{ fontWeight: "bold", marginBottom: 5 }}
                            >
                              RTV No
                            </Text> */}
                            <TextInput
                              style={[
                                styles.input,
                                {
                                  width: "100%",
                                  height: 50,
                                  marginLeft: 6,
                                  textAlign: "center",
                                  backgroundColor: "#f0f0f0",
                                  borderRadius: 8,
                                  borderColor: "#844515",
                                  borderWidth: 1,
                                  paddingHorizontal: 15,
                                  marginBottom: 20,
                                  color: "black",
                                },
                              ]}
                              placeholder="Enter RTV No"
                              placeholderTextColor="#000000ff"
                              value={rtvNo}
                              onChangeText={setRtvNo}
                            />
                          </View>
                        ) : field.key === "suggestOrder" ? (
                          <View style={{ marginTop: 10 }}>
                            {(skuData[version] || []).map((sku: any) => {
                              const carried = skuValues[version][sku.value];

                              const beginning = Number(carried?.beginning || 0);
                              const delivery = Number(carried?.delivery || 0);
                              const rtv = Number(carried?.rtv || 0);
                              const ending = Number(carried?.ending || 0);

                              // current week's offtake
                              const currentOfftake =
                                beginning + delivery - rtv - ending;

                              // use last week's average & count
                              const prevSku = prevWeekData?.versions?.[
                                version
                              ]?.Carried?.find(
                                (p: any) => p.skuCode === sku.value
                              );
                              const prevAvg = Number(prevSku?.avgOfftake || 0);
                              const usageCount =
                                Number(prevWeekData?.usageCount || 0) + 1;

                              const avgOfftake =
                                usageCount > 0
                                  ? (
                                      (prevAvg * (usageCount - 1) +
                                        currentOfftake) /
                                      usageCount
                                    ).toFixed(2)
                                  : "0.00";

                              const soInput =
                                carried?.soInput?.toString() || "";

                              return (
                                <View
                                  key={sku.value}
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    marginBottom: 8,
                                  }}
                                >
                                  {/* SKU Name */}
                                  <ScrollView
                                    horizontal
                                    style={{ flex: 1 }}
                                    contentContainerStyle={{ paddingRight: 10 }}
                                    scrollEnabled
                                  >
                                    <Text
                                      style={styles.skuText}
                                      numberOfLines={1}
                                    >
                                      {sku.label}
                                    </Text>
                                  </ScrollView>

                                  {/* Average Offtake (read-only, output only) */}
                                  <TextInput
                                    style={[
                                      styles.inputBox,
                                      {
                                        width: 70,
                                        height: 40,
                                        marginLeft: 6,
                                        textAlign: "center",
                                        backgroundColor: "#f0f0f0",
                                        borderColor: "#aaa",
                                        borderWidth: 1,
                                      },
                                    ]}
                                    value={avgOfftake}
                                    editable={false}
                                  />

                                  {/* SO Input (editable) */}
                                  <TextInput
                                    style={[
                                      styles.inputBox,
                                      {
                                        width: 70,
                                        height: 40,
                                        marginLeft: 6,
                                        textAlign: "center",
                                        backgroundColor: "#fff",
                                        borderColor: "#844515",
                                        borderWidth: 1,
                                      },
                                    ]}
                                    keyboardType="numeric"
                                    value={soInput}
                                    onChangeText={(text) =>
                                      handleChange("soInput", sku.value, text)
                                    }
                                  />
                                </View>
                              );
                            })}
                          </View>
                        ) : (
                          // Beginning / Delivery / Ending / Offtake / OOS
                          <View>
                            {(skuData[version] || []).map((sku: any) => {
                              const value =
                                skuValues[version][sku.value][field.key] || "";
                              const isOfftake = field.key === "offtake";
                              const currentAvailability =
                                availability[version]?.[sku.value] ?? "Carried";

                              return (
                                <View
                                  key={sku.value}
                                  style={{ marginBottom: 12 }}
                                >
                                  <View
                                    style={{
                                      flexDirection: "row",
                                      alignItems: "center",
                                    }}
                                  >
                                    {/* SKU Name */}
                                    <Text style={[styles.skuText, { flex: 1 }]}>
                                      {sku.label}
                                    </Text>

                                    {/* Dropdown only for Beginning */}
                                    {field.key === "beginning" && (
                                      <View
                                        style={{
                                          borderWidth: 1,
                                          borderColor: "#844515",
                                          borderRadius: 6,
                                          marginHorizontal: 8,
                                          flex: 1,
                                        }}
                                      >
                                        <Picker
                                          selectedValue={currentAvailability}
                                          onValueChange={(option) =>
                                            setAvailability((prev) => ({
                                              ...prev,
                                              [version]: {
                                                ...prev[version],
                                                [sku.value]: option,
                                              },
                                            }))
                                          }
                                        >
                                          <Picker.Item
                                            label="Carried"
                                            value="Carried"
                                            style={{
                                              fontSize: 11,
                                              color: "black",
                                            }}
                                          />
                                          <Picker.Item
                                            label="Not Carried"
                                            value="Not Carried"
                                            style={{
                                              fontSize: 11,
                                              color: "black",
                                            }}
                                          />
                                        </Picker>
                                      </View>
                                    )}

                                    {/* Qty Input */}
                                    <TextInput
                                      style={[
                                        styles.inputBox,
                                        {
                                          width: isOfftake ? 90 : 52,
                                          height: 40,
                                          textAlign: "center",
                                          backgroundColor:
                                            field.key === "rtv"
                                              ? rtvNo
                                                ? "#FFFFFF"
                                                : "#f0f0f0"
                                              : field.key === "oos" &&
                                                Number(
                                                  skuValues[version][sku.value]
                                                    ?.ending
                                                ) !== 0
                                              ? "#f0f0f0"
                                              : field.key === "beginning"
                                              ? "#f0f0f0" // 🔒 lock Beginning visually
                                              : "#FFFFFF",
                                          borderColor:
                                            field.key === "rtv" && !rtvNo
                                              ? "#ccc"
                                              : "#844515",
                                          borderWidth: 1,
                                          marginLeft: 8,
                                        },
                                      ]}
                                      keyboardType={
                                        [
                                          "beginning",
                                          "delivery",
                                          "rtv",
                                          "ending",
                                          "offtake",
                                          "oos",
                                        ].includes(field.key)
                                          ? "numeric"
                                          : "default"
                                      }
                                      value={value}
                                      onChangeText={(text) => {
                                        if (field.key === "rtv" && !rtvNo) {
                                          Alert.alert(
                                            "Please enter RTV No first."
                                          );
                                          return;
                                        }
                                        if (
                                          field.key === "oos" &&
                                          Number(
                                            skuValues[version][sku.value]
                                              ?.ending
                                          ) !== 0
                                        ) {
                                          Alert.alert(
                                            "No. of Days OOS is only required if Ending is 0."
                                          );
                                          return;
                                        }

                                        // prevent editing beginning
                                        if (field.key === "beginning") return;

                                        handleChange(
                                          field.key,
                                          sku.value,
                                          text
                                        );
                                      }}
                                      editable={
                                        field.key === "beginning"
                                          ? false // 🔒 lock Beginning PCS
                                          : field.key === "rtv"
                                          ? !!rtvNo
                                          : field.key === "oos"
                                          ? Number(
                                              skuValues[version][sku.value]
                                                ?.ending
                                            ) === 0
                                          : true
                                      }
                                    />
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            ))}
        </ScrollView>
        <View style={[styles.buttonRow, { justifyContent: "space-between" }]}>
          <TouchableOpacity
            style={[styles.submitButtonCancel, { flex: 1, marginRight: 5 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.submitButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.submitButton,
              { flex: 1, marginLeft: 5, opacity: loading ? 0.5 : 1 },
            ]}
            disabled={loading}
            onPress={handleSave}
          >
            <Text style={styles.submitButtonText}>
              {loading
                ? "Submitting..."
                : `Submit (${getCompletedSkuCount()}/${getTotalSkuCount()})`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}
