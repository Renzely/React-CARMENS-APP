import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { useNavigation, useRoute } from "@react-navigation/native";
import moment from "moment";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Keyboard,
  Modal,
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
  DAIRY: [
    ...(prev.versions?.DAIRY?.Carried || []),
    ...(prev.versions?.DAIRY?.["Not Carried"] || []),
  ].map((sku: any) => ({
    label: sku.sku || sku.label,
    value: sku.skuCode || sku.value,
    expiry: sku.expiry || [],
    // ✅ use endingPCS from previous week as beginningPCS
    beginningPCS: sku.endingPCS?.toString() || "0",
  })),

  ICECREAM: [
    ...(prev.versions?.ICECREAM?.Carried || []),
    ...(prev.versions?.ICECREAM?.["Not Carried"] || []),
  ].map((sku: any) => ({
    label: sku.sku || sku.label,
    value: sku.skuCode || sku.value,
    expiry: sku.expiry || [],
    // ✅ use endingPCS from previous week as beginningPCS
    beginningPCS: sku.endingPCS?.toString() || "0",
  })),

  MVP: [
    ...(prev.versions?.MVP?.Carried || []),
    ...(prev.versions?.MVP?.["Not Carried"] || []),
  ].map((sku: any) => ({
    label: sku?.sku || sku?.label || "Unknown SKU",
    value: sku?.skuCode || sku?.value || Math.random().toString(),
    // ✅ now also use endingPCS from previous week as beginningPCS
    beginningPCS: sku.endingPCS?.toString() || "0",
    harvest: sku?.harvest || [],
  })),
});

export default function InventoryNextWeek() {
  const [showAdjustment, setShowAdjustment] = useState(false);
  const route = useRoute();
  const [loading, setLoading] = useState(false);
  const { data } = route.params as { data: string };
  const currentWeek = moment().isoWeek();
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
        const normalize = (val: any) =>
          val === "NC" || val === undefined || val === null
            ? ""
            : val.toString();

        init[v][sku.value] = {
          beginning: sku.beginningPCS === 0 ? "0" : normalize(sku.beginningPCS), // don't fallback to "0"
          delivery: "",
          rtv: "",
          ending: "",
          offtake: "",
          oos: "",
          expiry: [{ month: "", quantity: "" }],
          harvest: sku.harvest?.length
            ? sku.harvest
            : [{ date: "", quantity: "" }],
          avgOfftake: (() => {
            const skuPrev = prevWeekData?.versions?.[v]?.Carried?.find(
              (p: any) => p.skuCode === sku.value
            );
            if (!skuPrev) return "0";

            if (skuPrev.avgOfftake != null) {
              return skuPrev.avgOfftake.toString();
            }

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
  const [showCarryPrompt, setShowCarryPrompt] = useState<string | null>(null);
  const [tempCarriedSelection, setTempCarriedSelection] = useState<any>({});
  const fields = [
    { key: "beginning", label: "Beginning PCS" },
    { key: "delivery", label: "Delivery PCS" },
    { key: "rtvNo", label: "RTV No" },
    { key: "rtv", label: "RTV" }, // per SKU
    { key: "ending", label: "Ending PCS" },
    { key: "offtake", label: "Offtake" },
    { key: "oos", label: "No. of Days OOS" },
    { key: "expiry", label: "Near to Expired" },
    { key: "suggestOrder", label: "Suggest Order" },
  ];
  const handleChange = (fieldKey: string, skuKey: string, value: any) => {
    setSkuValues((prev: any) => {
      const prevSku = prev[version]?.[skuKey] || {};

      const numericFields = new Set([
        "beginningPCS",
        "deliveryPCS",
        "rtvPCS",
        "endingPCS",
        "adjustPlus",
        "adjustMinus",
      ]);

      // normalize value
      let storeValue: any = value;
      if (numericFields.has(fieldKey)) {
        if (value === "" || value === null || value === undefined) {
          storeValue = "";
        } else {
          const cleaned = String(value).replace(/\D/g, "");
          storeValue = cleaned === "" ? "" : parseInt(cleaned, 10);
        }
      }

      const merged: any = {
        ...prevSku,
        [fieldKey]: storeValue,
      };

      // recalc offtake + totals
      if (numericFields.has(fieldKey)) {
        const b = Number(merged.beginningPCS || 0);
        const d = Number(merged.deliveryPCS || 0);
        const r = Number(merged.rtvPCS || 0);
        const e = Number(merged.endingPCS || 0);
        const ap = Number(merged.adjustPlus || 0);
        const am = Number(merged.adjustMinus || 0);

        const thisOfftake = b + d - r - e + ap - am;
        merged.offtake = thisOfftake;

        const prevTotal = Number(prevSku.totalOfftake || 0);
        const denom = Number(prevWeekData?.usageCount || 1); // <-- backend usageCount

        const liveTotal =
          prevTotal - Number(prevSku.offtake || 0) + thisOfftake;
        merged.totalOfftake = liveTotal;
        merged.usageCount = denom; // mirror backend, no +1 here
        merged.avgOfftake =
          denom > 0 ? Math.round((liveTotal / denom) * 100) / 100 : 0;
      }

      return {
        ...prev,
        [version]: {
          ...prev[version],
          [skuKey]: merged,
        },
      };
    });
  };

  // For MVP Harvest
  const handleHarvestEntryChange = (
    skuKey: string,
    index: number,
    field: "date" | "quantity",
    value: string
  ) => {
    setSkuValues((prev: any) => {
      const copy = { ...prev };
      if (!copy.MVP) copy.MVP = {};
      if (!copy.MVP[skuKey]) copy.MVP[skuKey] = {};
      if (!copy.MVP[skuKey].harvest) copy.MVP[skuKey].harvest = [];

      const updated = [...copy.MVP[skuKey].harvest];
      updated[index] = { ...updated[index], [field]: value };
      copy.MVP[skuKey].harvest = updated;

      return copy;
    });
  };

  // For DAIRY/ICECREAM Expiry
  const handleExpiryEntryChange = (
    version: "DAIRY" | "ICECREAM",
    skuKey: string,
    index: number,
    field: "date" | "quantity",
    value: string
  ) => {
    setSkuValues((prev: any) => {
      const copy = { ...prev };
      if (!copy[version]) copy[version] = {};
      if (!copy[version][skuKey]) copy[version][skuKey] = {};
      if (!copy[version][skuKey].expiry) copy[version][skuKey].expiry = [];

      const updated = [...copy[version][skuKey].expiry];
      updated[index] = { ...updated[index], [field]: value };
      copy[version][skuKey].expiry = updated;

      return copy;
    });
  };

  useEffect(() => {
    if (!version) return;

    const newOfftake: any = {};

    (skuData[version] || []).forEach((skuItem: any) => {
      const sku = skuValues[version]?.[skuItem.value] || {};

      const beginning = parseFloat(sku.beginning || "0");
      const delivery = parseFloat(sku.delivery || "0");
      const rtv = parseFloat(sku.rtv || "0");
      const ending = parseFloat(sku.ending || "0");
      const adjustPlus = parseFloat(sku.adjustPlus || "0");
      const adjustMinus = parseFloat(sku.adjustMinus || "0");

      // 🧮 Calculate base + adjustments
      const calculatedOfftake =
        beginning + delivery - rtv - ending + adjustPlus - adjustMinus;

      newOfftake[skuItem.value] = calculatedOfftake;
    });

    setSkuValues((prev: any) => {
      const updated = { ...prev };

      Object.keys(newOfftake).forEach((skuKey) => {
        if (!updated[version][skuKey]) return;

        const thisOfftake = newOfftake[skuKey];

        updated[version][skuKey] = {
          ...updated[version][skuKey],
          offtake: thisOfftake.toFixed(2),
        };
      });

      return updated;
    });
  }, [version, skuData, JSON.stringify(skuValues[version])]);

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

  // const toggleAvailability = (
  //   version: string,
  //   skuCode: string,
  //   newStatus: string
  // ) => {
  //   const hasBeginning = !!skuValues[version]?.[skuCode]?.beginning;

  //   if (newStatus === "Not Carried" && hasBeginning) {
  //     Alert.alert(
  //       "Cannot mark as Not Carried",
  //       "This SKU already has beginning data."
  //     );
  //     return;
  //   }

  //   setAvailability((prev: any) => ({
  //     ...prev,
  //     [version]: {
  //       ...prev[version],
  //       [skuCode]: newStatus,
  //     },
  //   }));
  // };

  // ✅ your original carried mapper
  const mapCarried = (skuList: any[], skuValuesForCat: any, version: string) =>
    skuList.map((sku: any) => {
      const vals = skuValuesForCat[sku.value] || {};

      return {
        sku: sku.label,
        skuCode: sku.value,
        beginningPCS: Number(vals.beginning || 0),
        deliveryPCS: Number(vals.delivery || 0),
        rtvPCS: Number(vals.rtv || 0),
        endingPCS: Number(vals.ending || 0),
        offtake: Number(vals.offtake || 0),
        oos: Number(vals.oos || 0),
        avgOfftake: Number(vals.avgOfftake || 0),
        soQty: Number(vals.soInput || 0),
        suggestedOrder: Number(vals.suggestedOrder || 0),
        rtvNo: vals.rtvNo || "",
        rtvReason: vals.rtvReason || "",
        ...(version === "MVP"
          ? { harvest: vals.harvest || [] }
          : { expiry: vals.expiry || [] }),
      };
    });

  // ✅ new helper for not carried
  const prepareNotCarried = (skuList: any[]) =>
    skuList.map((sku: any) => ({
      sku: sku.label,
      skuCode: sku.value,
    }));

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

  function validateInventory(skuData: any, skuValues: any, availability: any) {
    const complete: string[] = [];
    const incomplete: string[] = [];
    const details: Record<string, Record<string, string[]>> = {};

    const isPresent = (v: any) => {
      if (v === undefined || v === null) return false;
      if (typeof v === "string") return v.trim() !== "";
      return true; // numbers (including 0) and objects/arrays considered present
    };

    const pick = (values: any, ...keys: string[]) => {
      for (const k of keys) {
        if (values?.[k] !== undefined && values?.[k] !== null) {
          return values[k];
        }
      }
      return undefined;
    };

    Object.keys(skuData).forEach((version) => {
      const versionSkus = skuData[version] || [];

      versionSkus.forEach((sku: any) => {
        const values = skuValues[version]?.[sku.value] || {};
        const currentAvailability =
          availability[version]?.[sku.value] ?? "Carried";
        const missing: string[] = [];

        // Skip validation if Not Carried or Delisted
        if (
          currentAvailability === "Not Carried" ||
          currentAvailability === "Delisted"
        ) {
          if (!complete.includes(version)) complete.push(version);
          return;
        }

        // All versions (including MVP): require beginning, delivery, ending
        const beginning = pick(values, "beginning", "beginningPCS");
        const delivery = pick(values, "delivery", "deliveryPCS");
        const ending = pick(values, "ending", "endingPCS");

        if (!isPresent(beginning)) missing.push("beginning");
        if (!isPresent(delivery)) missing.push("delivery");
        if (!isPresent(ending)) missing.push("ending");
        // harvest is now optional, so no check here

        if (missing.length > 0) {
          if (!incomplete.includes(version)) incomplete.push(version);
          details[version] = details[version] || {};
          details[version][sku.label || sku.value] = missing;
        } else {
          if (!complete.includes(version)) complete.push(version);
        }
      });
    });

    return { complete, incomplete, details };
  }

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
        return;
      }

      const currentWeek = moment().isoWeek();

      const payload = {
        email,
        merchandiser,
        outlet: selectedOutlet,
        week: currentWeek,
        date,
        versions: {
          DAIRY: {
            Carried: mapCarried(
              (skuData.DAIRY || []).filter(
                (sku: any) =>
                  (availability.DAIRY?.[sku.value] ?? "Carried") === "Carried"
              ),
              skuValues.DAIRY,
              "DAIRY"
            ),
            "Not Carried": prepareNotCarried(
              (skuData.DAIRY || []).filter(
                (sku: any) => availability.DAIRY?.[sku.value] === "Not Carried"
              )
            ),
          },
          ICECREAM: {
            Carried: mapCarried(
              (skuData.ICECREAM || []).filter(
                (sku: any) =>
                  (availability.ICECREAM?.[sku.value] ?? "Carried") ===
                  "Carried"
              ),
              skuValues.ICECREAM,
              "ICECREAM"
            ),
            "Not Carried": prepareNotCarried(
              (skuData.ICECREAM || []).filter(
                (sku: any) =>
                  availability.ICECREAM?.[sku.value] === "Not Carried"
              )
            ),
          },
          MVP: {
            Carried: mapCarried(
              (skuData.MVP || []).filter(
                (sku: any) =>
                  (availability.MVP?.[sku.value] ?? "Carried") === "Carried"
              ),
              skuValues.MVP,
              "MVP"
            ),
            "Not Carried": prepareNotCarried(
              (skuData.MVP || []).filter(
                (sku: any) => availability.MVP?.[sku.value] === "Not Carried"
              )
            ),
          },
        },
      };

      console.log("🚀 payload", payload);

      const res = await fetch("https://api-carmens-best.bmphrc.com/saveNext", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();

      if (result?.id) setPrevDocId(result.id);

      Alert.alert("Success", "Next week inventory saved!");
      navigation.goBack();
    } catch (err) {
      console.error("❌ Error saving:", err);
      Alert.alert("Error", "Could not save next week inventory");
    }
  };

  const isSkuComplete = (version: string, skuKey: string): boolean => {
    const avail = availability[version]?.[skuKey];

    // Auto complete if Not Carried / Delisted
    if (avail === "Not Carried" || avail === "Delisted") return true;

    const sku = skuValues[version]?.[skuKey] || {};

    const isPresent = (v: any) => {
      if (v === undefined || v === null) return false;
      if (typeof v === "string") return v.trim() !== "";
      return true;
    };

    const pick = (obj: any, ...keys: string[]) => {
      for (const k of keys) {
        if (obj?.[k] !== undefined && obj?.[k] !== null) return obj[k];
      }
      return undefined;
    };

    if (version === "MVP" || version === "ICECREAM" || version === "DAIRY") {
      const beginning = pick(sku, "beginning", "beginningPCS");
      const delivery = pick(sku, "delivery", "deliveryPCS");
      const ending = pick(sku, "ending", "endingPCS");

      return isPresent(beginning) && isPresent(delivery) && isPresent(ending);
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
          <Text style={styles.appBarTitleInventoryprocess}>NEXT INVENTORY</Text>
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
          <LabeledInput
            label="Week"
            value={`Week ${currentWeek}`}
            onChangeText={() => {}}
            editable={false}
          />
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

          {showCarryPrompt && (
            <Modal
              visible={!!showCarryPrompt}
              transparent
              animationType="fade"
              onRequestClose={() => setShowCarryPrompt(null)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContainerCategory}>
                  <Text style={styles.modalTitle}>
                    Select which SKUs are Carried
                  </Text>

                  <ScrollView style={{ maxHeight: 300, marginVertical: 10 }}>
                    {(skuData[showCarryPrompt] || [])
                      .filter((skuItem: any) => {
                        const key = skuItem.value;
                        const prevWeekSku = prevWeekData?.versions?.[
                          showCarryPrompt
                        ]?.Carried?.find((p: any) => p.skuCode === key);
                        // Only show those with no previous beginning
                        return (
                          !prevWeekSku ||
                          prevWeekSku.beginningPCS == null ||
                          prevWeekSku.beginningPCS === ""
                        );
                      })
                      .map((skuItem: any) => {
                        const key = skuItem.value;
                        const isSelected = tempCarriedSelection?.[key] ?? false;

                        return (
                          <TouchableOpacity
                            key={key}
                            onPress={() => {
                              setTempCarriedSelection((prev: any) => ({
                                ...prev,
                                [key]: !isSelected,
                              }));
                            }}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              marginVertical: 5,
                            }}
                          >
                            <View
                              style={{
                                width: 20,
                                height: 20,
                                borderWidth: 1,
                                borderColor: "#333",
                                marginRight: 10,
                                backgroundColor: isSelected
                                  ? "#844515"
                                  : "transparent",
                              }}
                            />
                            <Text>{skuItem.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                  </ScrollView>

                  <Button
                    title="Save Selection"
                    color="#844515"
                    onPress={() => {
                      const versionSkus = skuData[showCarryPrompt] || [];
                      const updatedAvailability = { ...availability };

                      versionSkus.forEach((skuItem: any) => {
                        const key = skuItem.value;

                        // Only set if no previous value
                        const prevWeekSku = prevWeekData?.versions?.[
                          showCarryPrompt
                        ]?.Carried?.find((p: any) => p.skuCode === key);

                        if (
                          !prevWeekSku ||
                          prevWeekSku.beginningPCS === "" ||
                          prevWeekSku.beginningPCS == null
                        ) {
                          updatedAvailability[showCarryPrompt] = {
                            ...updatedAvailability[showCarryPrompt],
                            [key]: tempCarriedSelection?.[key]
                              ? "Carried"
                              : "Not Carried",
                          };
                        }
                      });

                      setAvailability(updatedAvailability);
                      setTempCarriedSelection({});
                      setShowCarryPrompt(null);
                      setVersion(showCarryPrompt);
                    }}
                  />
                </View>
              </View>
            </Modal>
          )}

          <View style={styles.buttonRow}>
            {["DAIRY", "ICECREAM", "MVP"].map((v) => {
              const versionSkus = skuData[v] || [];
              const totalSkuCount = versionSkus.length;

              const completedSkuCount = versionSkus.filter((skuItem: any) => {
                const key = skuItem.value;
                const currentAvailability = availability[v]?.[key] ?? "Carried";

                if (
                  currentAvailability === "Not Carried" ||
                  currentAvailability === "Delisted"
                ) {
                  return true;
                }
                return isSkuComplete(v, key);
              }).length;

              return (
                <TouchableOpacity
                  key={v}
                  style={[
                    styles.versionBtn,
                    version === v && styles.selectedButton,
                  ]}
                  onPress={() => {
                    // ✅ If availability not set yet, ask first
                    const hasAnyAvailability =
                      Object.keys(availability[v] || {}).length > 0;
                    if (!hasAnyAvailability) {
                      setShowCarryPrompt(v); // <-- trigger the modal prompt you showed earlier
                    } else {
                      setVersion(v); // already has data, just switch
                    }
                  }}
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
            // ICECREAM / DAIRY flow
            fields.map((field) => {
              if (version === "MVP" && field.key === "expiry") return null;
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

              // Required fields (Beginning, Delivery, Ending )
              if (requiredFields.includes(field.key)) {
                skus.forEach((sku: any) => {
                  const values = skuValues[version][sku.value] || {};
                  const currentAvailability =
                    availability[version]?.[sku.value] ?? "Carried";

                  // ✅ If Not Carried → auto mark as complete
                  if (currentAvailability === "Not Carried") {
                    completed++;
                    return;
                  }

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
                    acc + (skuValues[version][sku.value]?.expiry?.length || 0),
                  0
                );

                skus.forEach((sku: any) => {
                  const currentAvailability =
                    availability[version]?.[sku.value] ?? "Carried";
                  const isNotCarried = currentAvailability === "Not Carried";

                  if (isNotCarried) {
                    // ✅ Auto mark as 1 completed for Not Carried
                    completed += 1;
                  } else {
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
                  }
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
                    <TouchableOpacity
                      activeOpacity={1}
                      style={{ marginTop: 10 }}
                    >
                      {field.key === "expiry" ? (
                        (skuData[version] || []).map((skuItem: any) => {
                          const currentAvailability =
                            availability?.[version]?.[skuItem.value] ??
                            "Carried";
                          const isNotCarried =
                            currentAvailability === "Not Carried";

                          const existing =
                            skuValues?.[version]?.[skuItem.value]?.expiry || [];
                          const expiryEntries = existing.concat(
                            Array.from(
                              { length: Math.max(0, 6 - existing.length) },
                              () => ({
                                date: "",
                                quantity: "",
                              })
                            )
                          );

                          return (
                            <View
                              key={skuItem.value}
                              style={{ marginBottom: 16 }}
                            >
                              {/* SKU Label */}
                              <Text
                                style={[styles.skuText, { marginBottom: 6 }]}
                              >
                                {skuItem.label}
                              </Text>

                              {expiryEntries.map(
                                (entry: any, index: number) => (
                                  <View
                                    key={`${skuItem.value}-${index}`}
                                    style={{
                                      flexDirection: "row",
                                      alignItems: "center",
                                      marginBottom: 8,
                                    }}
                                  >
                                    {/* Date Picker */}
                                    <TouchableOpacity
                                      disabled={isNotCarried}
                                      style={{
                                        flex: 3,
                                        marginHorizontal: 8,
                                        borderWidth: 1,
                                        borderColor: "#ccc",
                                        borderRadius: 4,
                                        paddingVertical: 10,
                                        paddingHorizontal: 12,
                                        backgroundColor: isNotCarried
                                          ? "#f0f0f0"
                                          : "#fff",
                                      }}
                                      onPress={() => {
                                        if (isNotCarried) return;
                                        setShowDatePicker({
                                          visible: true,
                                          skuKey: skuItem.value,
                                          idx: index,
                                        });
                                      }}
                                    >
                                      <Text
                                        style={{
                                          fontSize: 14,
                                          color: isNotCarried
                                            ? "grey"
                                            : "black",
                                        }}
                                      >
                                        {entry.date
                                          ? (() => {
                                              const d = new Date(entry.date);
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
                                      showDatePicker?.idx === index &&
                                      !isNotCarried && (
                                        <DateTimePicker
                                          value={
                                            entry.date
                                              ? new Date(entry.date)
                                              : new Date()
                                          }
                                          mode="date"
                                          display="default"
                                          onChange={(
                                            event: any,
                                            selectedDate?: Date
                                          ) => {
                                            if (
                                              event.type === "set" &&
                                              selectedDate
                                            ) {
                                              const iso = selectedDate
                                                .toISOString()
                                                .split("T")[0];
                                              handleExpiryEntryChange(
                                                version as "DAIRY" | "ICECREAM", // 👈 pass ICECREAM or DAIRY
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

                                    {/* Quantity Input */}
                                    <TextInput
                                      placeholder="Qty"
                                      placeholderTextColor="grey"
                                      style={[
                                        styles.inputBox,
                                        {
                                          flex: 2,
                                          height: 40,
                                          fontSize: 14,
                                          textAlign: "center",
                                          backgroundColor: isNotCarried
                                            ? "#f0f0f0"
                                            : entry.date
                                            ? "#fff"
                                            : "#f9f9f9",
                                          borderColor: isNotCarried
                                            ? "#ccc"
                                            : "#844515",
                                          borderWidth: 1,
                                          color: isNotCarried
                                            ? "grey"
                                            : "black",
                                        },
                                      ]}
                                      keyboardType="numeric"
                                      editable={!isNotCarried && !!entry.date}
                                      value={entry.quantity?.toString() || ""}
                                      onChangeText={(text: string) => {
                                        if (isNotCarried) return;
                                        if (!entry.date) {
                                          Alert.alert(
                                            "Please select a date first."
                                          );
                                          return;
                                        }
                                        if (/^\d*$/.test(text)) {
                                          handleExpiryEntryChange(
                                            version as "DAIRY" | "ICECREAM", // 👈 pass ICECREAM or DAIRY
                                            skuItem.value,
                                            index,
                                            "quantity",
                                            text
                                          );
                                        }
                                      }}
                                    />
                                  </View>
                                )
                              )}
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
                            const carried = skuValues[version][sku.value] || {};

                            const beginning = Number(carried?.beginning || 0);
                            const delivery = Number(carried?.delivery || 0);
                            const rtv = Number(carried?.rtv || 0);
                            const ending = Number(carried?.ending || 0);

                            // live offtake from current inputs
                            const currentOfftake =
                              beginning + delivery - rtv - ending;

                            // backend values from last week
                            const prevSku = prevWeekData?.versions?.[
                              version
                            ]?.Carried?.find(
                              (p: any) => p.skuCode === sku.value
                            );
                            const prevTotal = Number(
                              prevSku?.totalOfftake || 0
                            );
                            const prevCount = Number(
                              prevWeekData?.usageCount || 1
                            );

                            // recompute totals live
                            let newTotal = prevTotal + currentOfftake;
                            let newCount = prevCount;

                            // reset rule after 180 days
                            if (newCount > 180) {
                              newTotal = currentOfftake;
                              newCount = 1;
                            }

                            const avgOfftake =
                              newCount > 0
                                ? (newTotal / newCount).toFixed(2)
                                : "0.00";

                            const soInput = carried?.soInput?.toString() || "";

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

                                {/* Avg Offtake (auto-updating, read-only) */}
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
                        // Beginning / Delivery / Ending / Offtake / OOS / RTV
                        <View>
                          {(skuData[version] || []).map((sku: any) => {
                            const value =
                              skuValues[version][sku.value][field.key] || "";
                            const isOfftake = field.key === "offtake";
                            const currentAvailability =
                              availability[version]?.[sku.value] ?? "Carried";
                            const isNotCarried =
                              currentAvailability === "Not Carried";

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
                                        onValueChange={(option: string) =>
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

                                  {/* RTV special: Reason + Qty */}
                                  {field.key === "rtv" ? (
                                    <View
                                      style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        flex: 1,
                                        marginLeft: 8,
                                      }}
                                    >
                                      {/* RTV Reason Dropdown */}
                                      <View
                                        style={{
                                          flex: 1,
                                          borderWidth: 1,
                                          borderColor: isNotCarried
                                            ? "#ccc"
                                            : "#844515",
                                          borderRadius: 6,
                                          marginRight: 8,
                                          backgroundColor: isNotCarried
                                            ? "#f0f0f0"
                                            : "#FFFFFF",
                                        }}
                                      >
                                        <Picker
                                          enabled={!isNotCarried} // 🔒 lock if Not Carried
                                          selectedValue={
                                            skuValues[version]?.[sku.value]
                                              ?.rtvReason || ""
                                          }
                                          onValueChange={(reason) => {
                                            // Update reason in the SKU object
                                            handleChange(
                                              "rtvReason",
                                              sku.value,
                                              reason
                                            );

                                            // If reason cleared, reset RTV qty
                                            if (reason === "") {
                                              handleChange(
                                                "rtv",
                                                sku.value,
                                                ""
                                              );
                                            }
                                          }}
                                          mode="dropdown"
                                        >
                                          <Picker.Item
                                            label="Select Reason"
                                            value=""
                                            style={{
                                              fontSize: 11,
                                              color: "black",
                                            }}
                                          />
                                          <Picker.Item
                                            label="Damaged"
                                            value="Damaged"
                                            style={{
                                              fontSize: 11,
                                              color: "black",
                                            }}
                                          />
                                          <Picker.Item
                                            label="Near Expiry"
                                            value="Near Expiry"
                                            style={{
                                              fontSize: 11,
                                              color: "black",
                                            }}
                                          />
                                          <Picker.Item
                                            label="Expired"
                                            value="Expired"
                                            style={{
                                              fontSize: 11,
                                              color: "black",
                                            }}
                                          />
                                          <Picker.Item
                                            label="Discoloration"
                                            value="Discoloration"
                                            style={{
                                              fontSize: 11,
                                              color: "black",
                                            }}
                                          />
                                          <Picker.Item
                                            label="Voluntary Pullout"
                                            value="Voluntary Pullout"
                                            style={{
                                              fontSize: 11,
                                              color: "black",
                                            }}
                                          />
                                          <Picker.Item
                                            label="Delivered Near Expiry"
                                            value="Delivered Near Expiry"
                                            style={{
                                              fontSize: 11,
                                              color: "black",
                                            }}
                                          />
                                        </Picker>
                                      </View>

                                      {/* RTV Qty Input */}
                                      <TextInput
                                        style={[
                                          styles.inputBox,
                                          {
                                            width: 60,
                                            height: 40,
                                            textAlign: "center",
                                            backgroundColor:
                                              isNotCarried ||
                                              !skuValues[version]?.[sku.value]
                                                ?.rtvReason
                                                ? "#f0f0f0"
                                                : "#FFFFFF",
                                            borderColor:
                                              isNotCarried ||
                                              !skuValues[version]?.[sku.value]
                                                ?.rtvReason
                                                ? "#ccc"
                                                : "#844515",
                                            borderWidth: 1,
                                          },
                                        ]}
                                        keyboardType="numeric"
                                        value={
                                          skuValues[version]?.[
                                            sku.value
                                          ]?.rtv?.toString() || ""
                                        }
                                        onChangeText={(text) => {
                                          if (/^\d*$/.test(text)) {
                                            handleChange(
                                              "rtv",
                                              sku.value,
                                              text === ""
                                                ? ""
                                                : parseInt(text, 10)
                                            );
                                          }
                                        }}
                                        editable={
                                          !isNotCarried &&
                                          !!skuValues[version]?.[sku.value]
                                            ?.rtvReason
                                        } // 🔒 lock if Not Carried or no reason
                                      />
                                    </View>
                                  ) : (
                                    /* Other fields */
                                    <TextInput
                                      style={[
                                        styles.inputBox,
                                        {
                                          width: isOfftake ? 90 : 52,
                                          height: 40,
                                          textAlign: "center",
                                          backgroundColor: isNotCarried
                                            ? "#f0f0f0"
                                            : field.key === "beginning"
                                            ? prevWeekData?.versions?.[
                                                version
                                              ]?.Carried?.some(
                                                (p: any) =>
                                                  p.skuCode === sku.value &&
                                                  p.beginningPCS !== ""
                                              )
                                              ? "#f0f0f0"
                                              : "#FFFFFF"
                                            : field.key === "oos" &&
                                              Number(
                                                skuValues[version][sku.value]
                                                  ?.ending
                                              ) !== 0
                                            ? "#f0f0f0"
                                            : "#FFFFFF",
                                          borderColor: "#844515",
                                          borderWidth: 1,
                                          marginLeft: 8,
                                        },
                                      ]}
                                      keyboardType={
                                        [
                                          "beginning",
                                          "delivery",
                                          "ending",
                                          "offtake",
                                          "oos",
                                        ].includes(field.key)
                                          ? "numeric"
                                          : "default"
                                      }
                                      value={value}
                                      onChangeText={(text: string) => {
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

                                        handleChange(
                                          field.key,
                                          sku.value,
                                          text
                                        );
                                      }}
                                      editable={
                                        isNotCarried
                                          ? false
                                          : field.key === "beginning"
                                          ? !prevWeekData?.versions?.[
                                              version
                                            ]?.Carried?.some(
                                              (p: any) =>
                                                p.skuCode === sku.value &&
                                                p.beginningPCS !== ""
                                            )
                                          : field.key === "oos"
                                          ? Number(
                                              skuValues[version][sku.value]
                                                ?.ending
                                            ) === 0
                                          : true
                                      }
                                    />
                                  )}
                                </View>
                              </View>
                            );
                          })}

                          {field.key === "offtake" && (
                            <View style={{ marginTop: 16 }}>
                              <TouchableOpacity
                                onPress={() =>
                                  setShowAdjustment(!showAdjustment)
                                }
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  marginBottom: 8,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 14,
                                    fontWeight: "600",
                                    color: "#844515",
                                  }}
                                >
                                  Adjustment
                                </Text>
                                <Text
                                  style={{ marginLeft: 6, color: "#844515" }}
                                >
                                  {showAdjustment ? "▲" : "▼"}
                                </Text>
                              </TouchableOpacity>

                              {showAdjustment && (
                                <View style={{ paddingLeft: 8 }}>
                                  {(skuData[version] || []).map((sku: any) => {
                                    const status =
                                      availability[version]?.[sku.value] ||
                                      "Carried"; // 👈 check availability
                                    const isCarried = status === "Carried";

                                    return (
                                      <View
                                        key={sku.value}
                                        style={{
                                          flexDirection: "row",
                                          alignItems: "center",
                                          marginBottom: 10,
                                        }}
                                      >
                                        <Text
                                          style={[styles.skuText, { flex: 1 }]}
                                        >
                                          {sku.label}
                                        </Text>

                                        {/* + Adjustment */}
                                        <TextInput
                                          placeholder="+"
                                          placeholderTextColor="#000000ff"
                                          keyboardType="numeric"
                                          editable={isCarried} // 👈 disable if not carried
                                          style={[
                                            styles.inputBox,
                                            {
                                              width: 50,
                                              height: 35,
                                              textAlign: "center",
                                              borderColor: isCarried
                                                ? "#4CAF50"
                                                : "#ccc",
                                              borderWidth: 1,
                                              marginHorizontal: 4,
                                              color: isCarried
                                                ? "#000000ff"
                                                : "#999",
                                            },
                                          ]}
                                          value={
                                            skuValues[version][sku.value]
                                              ?.adjustPlus || ""
                                          }
                                          onChangeText={(text) =>
                                            isCarried &&
                                            handleChange(
                                              "adjustPlus",
                                              sku.value,
                                              text
                                            )
                                          }
                                        />

                                        {/* - Adjustment */}
                                        <TextInput
                                          placeholder="-"
                                          placeholderTextColor="#000000ff"
                                          keyboardType="numeric"
                                          editable={isCarried} // 👈 disable if not carried
                                          style={[
                                            styles.inputBox,
                                            {
                                              width: 50,
                                              height: 35,
                                              textAlign: "center",
                                              borderColor: isCarried
                                                ? "#F44336"
                                                : "#ccc",
                                              borderWidth: 1,
                                              marginHorizontal: 4,
                                              color: isCarried
                                                ? "#F44336"
                                                : "#999",
                                            },
                                          ]}
                                          value={
                                            skuValues[version][sku.value]
                                              ?.adjustMinus || ""
                                          }
                                          onChangeText={(text) =>
                                            isCarried &&
                                            handleChange(
                                              "adjustMinus",
                                              sku.value,
                                              text
                                            )
                                          }
                                        />
                                      </View>
                                    );
                                  })}
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                      )}
                    </TouchableOpacity>
                  )}

                  {/* Add Harvest section as a separate field right after offtake field for MVP version */}
                  {field.key === "offtake" && version === "MVP" && (
                    <View key="harvest" style={{ marginTop: 15 }}>
                      <TouchableOpacity
                        style={styles.expandButton}
                        onPress={() =>
                          setExpandedSection((prev: string | null) =>
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
                          <View>
                            {(skuData.MVP || []).map((skuItem: any) => {
                              const currentAvailability =
                                availability?.MVP?.[skuItem.value] ?? "Carried";
                              const isNotCarried =
                                currentAvailability === "Not Carried";

                              const existing =
                                skuValues?.MVP?.[skuItem.value]?.harvest || [];
                              const harvestEntries = existing.concat(
                                Array.from(
                                  { length: Math.max(0, 6 - existing.length) },
                                  () => ({
                                    date: "",
                                    quantity: "",
                                  })
                                )
                              );

                              return (
                                <View
                                  key={skuItem.value}
                                  style={{ marginBottom: 16 }}
                                >
                                  <Text
                                    style={[
                                      styles.skuText,
                                      { marginBottom: 6 },
                                    ]}
                                  >
                                    {skuItem.label}
                                  </Text>

                                  {harvestEntries.map(
                                    (entry: any, index: number) => (
                                      <View
                                        key={`${skuItem.value}-${index}`}
                                        style={{
                                          flexDirection: "row",
                                          alignItems: "center",
                                          marginBottom: 8,
                                        }}
                                      >
                                        {/* Date Picker */}
                                        <View
                                          style={{
                                            flex: 3,
                                            marginHorizontal: 8,
                                          }}
                                        >
                                          <TouchableOpacity
                                            activeOpacity={
                                              isNotCarried ? 1 : 0.7
                                            } // no visual feedback if disabled
                                            style={{
                                              flex: 3,
                                              marginHorizontal: 8,
                                              borderWidth: 1,
                                              borderColor: "#ccc",
                                              borderRadius: 4,
                                              paddingVertical: 10,
                                              paddingHorizontal: 12,
                                              backgroundColor: isNotCarried
                                                ? "#f0f0f0"
                                                : "#fff",
                                            }}
                                            onPress={() => {
                                              if (isNotCarried) return; // 👈 hard block
                                              setShowDatePicker({
                                                visible: true,
                                                skuKey: skuItem.value,
                                                idx: index,
                                              });
                                            }}
                                          >
                                            <Text
                                              style={{
                                                fontSize: 14,
                                                color: isNotCarried
                                                  ? "grey"
                                                  : "black",
                                              }}
                                            >
                                              {entry.date
                                                ? (() => {
                                                    const d = new Date(
                                                      entry.date
                                                    );
                                                    return `${String(
                                                      d.getMonth() + 1
                                                    ).padStart(
                                                      2,
                                                      "0"
                                                    )}-${String(
                                                      d.getDate()
                                                    ).padStart(
                                                      2,
                                                      "0"
                                                    )}-${d.getFullYear()}`;
                                                  })()
                                                : "Select Date"}
                                            </Text>
                                          </TouchableOpacity>

                                          {showDatePicker?.skuKey ===
                                            skuItem.value &&
                                            showDatePicker?.idx === index && (
                                              <DateTimePicker
                                                value={
                                                  entry.date
                                                    ? new Date(entry.date)
                                                    : new Date()
                                                }
                                                mode="date"
                                                display="default"
                                                onChange={(
                                                  event: any,
                                                  selectedDate?: Date
                                                ) => {
                                                  if (
                                                    event.type === "set" &&
                                                    selectedDate
                                                  ) {
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
                                          editable={!!entry.date} // ✅ disable until a date is picked
                                          style={[
                                            styles.inputBox,
                                            {
                                              flex: 2,
                                              height: 40,
                                              fontSize: 14,
                                              textAlign: "center",
                                              backgroundColor: entry.date
                                                ? "#fff"
                                                : "#f0f0f0", // greyed out if no date
                                              borderColor: entry.date
                                                ? "#844515"
                                                : "#ccc",
                                              borderWidth: 1,
                                              color: entry.date
                                                ? "black"
                                                : "grey", // font color changes too
                                            },
                                          ]}
                                          keyboardType="numeric"
                                          value={
                                            entry.quantity?.toString() || ""
                                          }
                                        />
                                      </View>
                                    )
                                  )}
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}

          {/* Remove the separate Harvest section that was at the bottom */}
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
