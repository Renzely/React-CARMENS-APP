import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import NetInfo from "@react-native-community/netinfo";
import { Picker } from "@react-native-picker/picker";
import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
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
  ViewStyle,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import Icon from "react-native-vector-icons/MaterialIcons";
import styles from "./Style";

interface PickerItem {
  label: string;
  value: string;
}

type ExpiryEntry = {
  month: string;
  quantity: string;
};

interface AndroidPickerProps {
  label: string;
  selectedValue: string;
  onValueChange: (value: string) => void;
  items: PickerItem[];
  enabled?: boolean;
}

const AndroidPicker: React.FC<AndroidPickerProps> = ({
  label,
  selectedValue,
  onValueChange,
  items,
  enabled = true,
}) => (
  <View>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.dropdown}>
      <Picker
        selectedValue={selectedValue}
        onValueChange={(itemValue: string) => onValueChange(itemValue)}
        mode="dialog"
        prompt={label}
        enabled={enabled}
      >
        {items.map((item) => (
          <Picker.Item
            key={item.value}
            label={item.label}
            value={item.value}
            color="#000000"
          />
        ))}
      </Picker>
    </View>
  </View>
);

const LabeledInput = ({
  label,
  value,
  onChangeText,
  keyboardType = "default",
  editable = true,
  style, // ✅ receive style here
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: "default" | "numeric";
  editable?: boolean;
  style?: ViewStyle; // ❌ remove TextStyle here
}) => (
  <View style={style}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      editable={editable}
    />
  </View>
);

type AvailabilityType = "Carried" | "Not Carried" | "Delisted";
type VersionType = "DAIRY" | "ICECREAM" | "MVP";

type GroupedInventory = {
  email: String;
  date: string;
  merchandiser: string;
  outlet: string;
  versions: {
    [key in VersionType]: {
      [key in AvailabilityType]: any[]; // You can type this more strictly later
    };
  };
};

// export interface OfflineInventoryItem {
//   data: GroupedInventory;
//   previousWeekId?: string;
//   isOffline?: boolean; // add this optional field if you want
// }

const InventoryProcess = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [date] = useState(moment().format("YYYY-MM-DD"));
  const [merchandiser, setMerchandiser] = useState("");
  const [outlet, setOutlet] = useState("");
  const [weeksCovered, setWeeksCovered] = useState("");
  const [month, setMonth] = useState("");
  const [week, setWeek] = useState("");
  const [sku, setSku] = useState("");
  const [selectedSkuCode, setSelectedSkuCode] = useState("");
  const [availability, setAvailability] = useState<{
    [version: string]: { [skuKey: string]: string };
  }>({});

  const [version, setVersion] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedOutlet, setSelectedOutlet] = useState("");
  const [outletOptions, setOutletOptions] = useState([
    { label: "Select Branch", value: "" },
  ]);
  const [weekOptions, setWeekOptions] = useState<PickerItem[]>([
    { label: "Select Week", value: "" },
  ]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [skuValues, setSkuValues] = useState<any>({
    beginning: {},
    delivery: {},
    ending: {},
    expiry: {}, // Add expiry field here
    quantity: {}, // Add quantity field here
    offtake: {},
    oos: {},
  });
  const router = useRouter();

  const handleExpiryChange = (skuKey: string, month: string) => {
    setSkuValues((prev: any) => ({
      ...prev,
      expiry: {
        ...prev.expiry,
        [skuKey]: month,
      },
    }));
  };

  const handleQuantityChange = (skuKey: string, qty: string) => {
    setSkuValues((prev: any) => ({
      ...prev,
      quantity: {
        ...prev.quantity,
        [skuKey]: qty,
      },
    }));
  };

  const [showDatePicker, setShowDatePicker] = useState<{
    skuKey: string;
    index: number;
  } | null>(null);

  const handleHarvestEntryChange = (
    skuKey: string,
    index: number,
    field: "date" | "quantity",
    value: string
  ) => {
    setSkuValues((prev: any) => {
      const updated = [...(prev.harvest?.[version]?.[skuKey] || [])];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return {
        ...prev,
        harvest: {
          ...prev.harvest,
          [version]: {
            ...(prev.harvest?.[version] || {}),
            [skuKey]: updated,
          },
        },
      };
    });
  };

  const handleExpiryEntryChange = (
    skuKey: string,
    index: number,
    field: "date" | "quantity",
    value: string
  ) => {
    setSkuValues((prev: any) => {
      const updated = [...(prev.expiry?.[version]?.[skuKey] || [])];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return {
        ...prev,
        expiry: {
          ...prev.expiry,
          [version]: {
            ...(prev.expiry?.[version] || {}),
            [skuKey]: updated,
          },
        },
      };
    });
  };

  const addExpiryEntry = (skuKey: string) => {
    setSkuValues((prev: any) => {
      const existing = prev.expiry?.[version]?.[skuKey] || [];
      const updated = [...existing, { date: "", quantity: "" }];
      return {
        ...prev,
        expiry: {
          ...prev.expiry,
          [version]: {
            ...(prev.expiry?.[version] || {}),
            [skuKey]: updated,
          },
        },
      };
    });
  };

  const deleteExpiryEntry = (skuKey: string, index: number) => {
    setSkuValues((prev: any) => {
      const existing = prev.expiry?.[version]?.[skuKey] || [];
      const updated = existing.filter(
        (_: { month: string; quantity: string | number }, i: number) =>
          i !== index
      );

      return {
        ...prev,
        expiry: {
          ...prev.expiry,
          [version]: {
            ...(prev.expiry?.[version] || {}),
            [skuKey]: updated,
          },
        },
      };
    });
  };

  const handleOOSChange = (skuKey: string, value: string) => {
    setSkuValues((prev: any) => ({
      ...prev,
      oos: {
        ...prev.oos,
        [version]: {
          ...(prev.oos?.[version] || {}),
          [skuKey]: value,
        },
      },
    }));
  };

  useEffect(() => {
    if (!version) return;

    const newOfftake: any = {};

    filteredSkuOptions.forEach((skuItem) => {
      const beginning = parseFloat(
        skuValues.beginning?.[version]?.[skuItem.value] || "0"
      );
      const delivery = parseFloat(
        skuValues.delivery?.[version]?.[skuItem.value] || "0"
      );
      const rtv = parseFloat(skuValues.rtv?.[version]?.[skuItem.value] || "0");
      const ending = parseFloat(
        skuValues.ending?.[version]?.[skuItem.value] || "0"
      );

      const calculatedOfftake = beginning + delivery - rtv - ending;
      newOfftake[skuItem.value] = calculatedOfftake.toFixed(2);
    });

    setSkuValues((prev: any) => {
      const currentOfftake = prev.offtake?.[version] || {};
      const isSame = Object.keys(newOfftake).every(
        (key) => newOfftake[key] === currentOfftake[key]
      );

      if (isSame) return prev;

      return {
        ...prev,
        offtake: {
          ...prev.offtake,
          [version]: {
            ...currentOfftake,
            ...newOfftake,
          },
        },
      };
    });
  }, [
    version,
    skuValues.beginning?.[version],
    skuValues.delivery?.[version],
    skuValues.rtv?.[version],
    skuValues.ending?.[version],
  ]);

  useEffect(() => {
    const today = moment();

    // Find last Friday:
    let lastFriday = today.clone().day(5);
    if (today.day() < 5) {
      // if today is before Friday, go back one week
      lastFriday.subtract(7, "days");
    }

    // Compute the Saturday that begins that week:
    const weekStart = lastFriday.clone().subtract(6, "days"); // Saturday
    const weekEnd = lastFriday.clone(); // Friday

    const label = `${weekStart.format("MMMDD")}-${weekEnd.format("MMMDD")}`;

    setWeekOptions([
      { label: "Select Week", value: "" },
      { label, value: label },
    ]);
  }, []);

  useEffect(() => {
    if (version && sku) {
      const code =
        skuData[version].find((item) => item.value === sku)?.code || "";
      setSelectedSkuCode(code);
    }
  }, [version, sku]);

  useEffect(() => {
    const fetchUserInfo = async () => {
      const userData = await AsyncStorage.getItem("user");
      if (userData) {
        const user = JSON.parse(userData);
        setMerchandiser(`${user.firstName} ${user.lastName}`);
      }
    };

    fetchUserInfo();
  }, []);

  useEffect(() => {
    const fetchUserEmail = async () => {
      const userEmail = await AsyncStorage.getItem("user");
      if (userEmail) {
        const Emailuser = JSON.parse(userEmail);
        setEmail(`${Emailuser.email}`);
      }
    };

    fetchUserEmail();
  }, []);

  useEffect(() => {
    if (!version) return;

    // If this version has never been initialized, set all SKUs to “Carried”
    setAvailability((prev) => {
      if (prev[version]) return prev; // already done

      const defaults = (skuData[version] || []).reduce<Record<string, string>>(
        (acc, sku) => {
          acc[sku.value] = "Carried";
          return acc;
        },
        {}
      );

      return {
        ...prev,
        [version]: defaults,
      };
    });
  }, [version]);

  useEffect(() => {
    const loadOutlets = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          console.error("No auth token found");
          return;
        }

        const response = await fetch(
          "https://api-carmens-best.bmphrc.com/user/outlets",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const outlets = await response.json();
          const options = outlets.map((outlet: string) => ({
            label: outlet,
            value: outlet,
          }));

          setOutletOptions([{ label: "Select Branch", value: "" }, ...options]);
        } else {
          console.error("Failed to fetch outlets:", await response.text());
        }
      } catch (error) {
        console.error("Failed to load outlets", error);
      }
    };

    loadOutlets();
  }, []);

  const skuData: {
    [version: string]: { label: string; value: string; code: string }[];
  } = {
    ICECREAM: [
      {
        label: "COOKIE DOUGH 115ML X 1, CUP",
        value: "COOKIE DOUGH 115ML X 1, CUP",
        code: "4806526540572",
      },
      {
        label: "STRAWBERRY 115ML X 1, CUP",
        value: "STRAWBERRY 115ML X 1, CUP",
        code: "4806526540558",
      },
      {
        label: "DARK CHOCOLATE 115ML X 1, CUP",
        value: "DARK CHOCOLATE 115ML X 1, CUP",
        code: "4806526540473",
      },
      {
        label: "EVERYONE LOVES VANILLA 115ML X 1, CUP",
        value: "EVERYONE LOVES VANILLA 115ML X 1, CUP",
        code: "4806526540602",
      },
      {
        label: "SALTED CARAMEL 115ML X 1, CUP",
        value: "SALTED CARAMEL 115ML X 1, CUP",
        code: "4806526540428",
      },
      {
        label: "COOKIES AND CREAM 115ML X 1, CUP",
        value: "COOKIES AND CREAM 115ML X 1, CUP",
        code: "4806526540565",
      },
      {
        label: "BBUTTER ALMOND BRITTLE 115ML X 1, CUP",
        value: "BBUTTER ALMOND BRITTLE 115ML X 1, CUP",
        code: "4806526540459",
      },
      {
        label: "COFFEE ALMOND FUDGE 115ML X 1, CUP",
        value: "COFFEE ALMOND FUDGE 115ML X 1, CUP",
        code: "4806526540633",
      },
      {
        label: "BRAZILLIAN COFFEE 115ML X 1, CUP",
        value: "BRAZILLIAN COFFEE 115ML X 1, CUP",
        code: "4806526540411",
      },
      {
        label: "ROCKY ROAD 115ML X 1, CUP",
        value: "ROCKY ROAD 115ML X 1, CUP",
        code: "4806526540466",
      },
      {
        label: "MALTED MILK 115ML X 1, CUP",
        value: "MALTED MILK 115ML X 1, CUP",
        code: "4806526540442",
      },
      {
        label: "HE'S NOT WORTH IT 115ML X 1, CUP",
        value: "HE'S NOT WORTH IT 115ML X 1, CUP",
        code: "4806526540725",
      },
      {
        label: "BUTTER PECAN 115ML X 1, CUP",
        value: "BUTTER PECAN 115ML X 1, CUP",
        code: "4806526540435",
      },
      {
        label: "PISTACHIO 115ML X 1, CUP",
        value: "PISTACHIO 115ML X 1, CUP",
        code: "4806526540510",
      },
      {
        label: "PISTACHIO ALMOND FUDGE 115ML X 1, CUP",
        value: "PISTACHIO ALMOND FUDGE 115ML X 1, CUP",
        code: "4806526540640",
      },
      {
        label: "JOLLY OL' EGGNOG 115ML X 1, CUP",
        value: "JOLLY OL' EGGNOG 115ML X 1, CUP",
        code: "634240230783",
      },
      {
        label: "MERRY MINT CHOCOLATE 115ML X 1, CUP",
        value: "MERRY MINT CHOCOLATE 115ML X 1, CUP",
        code: "634240230806",
      },
      {
        label: "S'MORES THE MERRIER 115ML X 1, CUP",
        value: "S'MORES THE MERRIER 115ML X 1, CUP",
        code: "634240230820",
      },
      {
        label: "LITE MANGO 115ML X 1, CUP",
        value: "LITE MANGO 115ML X 1, CUP",
        code: "634240269028",
      },
      {
        label: "LITE STRAWBERRY 115ML X 1, CUP",
        value: "LITE STRAWBERRY 115ML X 1, CUP",
        code: "634240269042",
      },
      {
        label: "LITE MIXED BERRIES 115ML X 1, CUP",
        value: "LITE MIXED BERRIES 115ML X 1, CUP",
        code: "634240269066",
      },
      {
        label: "STRAWBERRY CHEESECAKE 115ML X 1, CUP",
        value: "STRAWBERRY CHEESECAKE 115ML X 1, CUP",
        code: "634240292477",
      },
      {
        label: "COOKIE DOUGH 440ML X 1, PINT",
        value: "COOKIE DOUGH 440ML X 1, PINT",
        code: "4806526540176",
      },
      {
        label: "STRAWBERRY 440ML X 1, PINT",
        value: "STRAWBERRY 440ML X 1, PINT",
        code: "4806526540152",
      },
      {
        label: "DARK CHOCOLATE 440ML X 1, PINT",
        value: "DARK CHOCOLATE 440ML X 1, PINT",
        code: "4806526540060",
      },
      {
        label: "EVERYONE LOVES VANILLA 440ML X 1, PINT",
        value: "EVERYONE LOVES VANILLA 440ML X 1, PINT",
        code: "4806526540206",
      },
      {
        label: "SALTED CARAMEL 440ML X 1, PINT",
        value: "SALTED CARAMEL 440ML X 1, PINT",
        code: "4806526540015",
      },
      {
        label: "COOKIES AND CREAM 440ML X 1, PINT",
        value: "COOKIES AND CREAM 440ML X 1, PINT",
        code: "4806526540169",
      },
      {
        label: "BBUTTER ALMOND BRITTLE 440ML X 1, PINT",
        value: "BBUTTER ALMOND BRITTLE 440ML X 1, PINT",
        code: "4806526540046",
      },
      {
        label: "COFFEE ALMOND FUDGE 440ML X 1, PINT",
        value: "COFFEE ALMOND FUDGE 440ML X 1, PINT",
        code: "4806526540237",
      },
      {
        label: "BRAZILLIAN COFFEE 440ML X 1, PINT",
        value: "BRAZILLIAN COFFEE 440ML X 1, PINT",
        code: "4806526540008",
      },
      {
        label: "ROCKY ROAD 440ML X 1, PINT",
        value: "ROCKY ROAD 440ML X 1, PINT",
        code: "4806526540053",
      },
      {
        label: "MALTED MILK 440ML X 1, PINT",
        value: "MALTED MILK 440ML X 1, PINT",
        code: "4806526540039",
      },
      {
        label: "HE'S NOT WORTH IT 440ML X 1, PINT",
        value: "HE'S NOT WORTH IT 440ML X 1, PINT",
        code: "4806526540312",
      },
      {
        label: "BUTTER PECAN 440ML X 1, PINT",
        value: "BUTTER PECAN 440ML X 1, PINT",
        code: "4806526540022",
      },
      {
        label: "PISTACHIO 440ML X 1, PINT",
        value: "PISTACHIO 440ML X 1, PINT",
        code: "4806526540107",
      },
      {
        label: "PISTACHIO ALMOND FUDGE 440ML X 1, PINT",
        value: "PISTACHIO ALMOND FUDGE 440ML X 1, PINT",
        code: "4806526540244",
      },
      {
        label: "JOLLY OL' EGGNOG 440ML X 1, PINT",
        value: "JOLLY OL' EGGNOG 440ML X 1, PINT",
        code: "634240230790",
      },
      {
        label: "MERRY MINT CHOCOLATE 440ML X 1, PINT",
        value: "MERRY MINT CHOCOLATE 440ML X 1, PINT",
        code: "634240230813",
      },
      {
        label: "S'MORES THE MERRIER 440ML X 1, PINT",
        value: "S'MORES THE MERRIER 440ML X 1, PINT",
        code: "634240230837",
      },
      {
        label: "LITE MANGO 440ML X 1, PINT",
        value: "LITE MANGO 440ML X 1, PINT",
        code: "634240269011",
      },
      {
        label: "LITE STRAWBERRY 440ML X 1, PINT",
        value: "LITE STRAWBERRY 440ML X 1, PINT",
        code: "634240269035",
      },
      {
        label: "LITE MIXED BERRIES 440ML X 1, PINT",
        value: "LITE MIXED BERRIES 440ML X 1, PINT",
        code: "634240269059",
      },
      {
        label: "STRAWBERRY CHEESECAKE 440ML X 1, PINT",
        value: "STRAWBERRY CHEESECAKE 440ML X 1, PINT",
        code: "634240292460",
      },
    ],

    DAIRY: [
      {
        label: "PREMIUM WHOLE MILK 1L",
        value: "PREMIUM WHOLE MILK 1L",
        code: "634240292361",
      },
      // {
      //   label: "PREMIUM WHOLE MILK 300ML",
      //   value: "PREMIUM WHOLE MILK 300ML",
      //   code: "",
      // },
      // {
      //   label: "PREMIUM WHOLE MILK 200ML",
      //   value: "PREMIUM WHOLE MILK 200ML",
      //   code: "",
      // },
      // {
      //   label: "PREMIUM LOW-FAT MILK 1L",
      //   value: "PREMIUM LOW-FAT MILK 1L",
      //   code: "634240292385",
      // },
      // {
      //   label: "PREMIUM LOW-FAT MILK 300ML",
      //   value: "PREMIUM LOW-FAT MILK 300ML",
      //   code: "",
      // },
      // {
      //   label: "PREMIUM LOW-FAT MILK 200ML",
      //   value: "PREMIUM LOW-FAT MILK 200ML",
      //   code: "",
      // },
      // {
      //   label: "PREMIUM CHOCOLATE MILK 1L",
      //   value: "PREMIUM CHOCOLATE MILK 1L",
      //   code: "634240292408",
      // },
      // {
      //   label: "PREMIUM CHOCOLATE MILK 300ML",
      //   value: "PREMIUM CHOCOLATE MILK 300ML",
      //   code: "",
      // },
      // {
      //   label: "BARISTA FRESH MILK 1L",
      //   value: "BARISTA FRESH MILK 1L",
      //   code: "634240292446",
      // },
      // {
      //   label: "HOLLY'S LOW-FAT YOGHURT 1L",
      //   value: "HOLLY'S LOW-FAT YOGHURT 1L",
      //   code: "4806526460153",
      // },
      // {
      //   label: "HOLLY'S LOW-FAT YOGHURT 200ML",
      //   value: "HOLLY'S LOW-FAT YOGHURT 200ML",
      //   code: "",
      // },
      // {
      //   label: "HOLLY'S LOW-FAT YOGHURT 500ML",
      //   value: "HOLLY'S LOW-FAT YOGHURT 500ML",
      //   code: "",
      // },
      // {
      //   label: "KESONG PUTI 200G",
      //   value: "KESONG PUTI 200G",
      //   code: "634240256735",
      // },
    ],
    MVP: [
      {
        label: "CRISTAL LETTUCE",
        value: "CRISTAL LETTUCE",
        code: "",
      },
      // {
      //   label: "BUTTERHEAD LETTUCE",
      //   value: "BUTTERHEAD LETTUCE",
      //   code: "",
      // },
      // {
      //   label: "SALANOVA LETTUCE",
      //   value: "SALANOVA LETTUCE",
      //   code: "",
      // },
      // {
      //   label: "ROMAINE LETTUCE",
      //   value: "ROMAINE LETTUCE",
      //   code: "",
      // },
      // {
      //   label: "BATAVIA LETTUCE",
      //   value: "BATAVIA LETTUCE",
      //   code: "",
      // },
    ],
  };

  // Count how many SKUs are considered completed
  const getCompletedSkuCount = () => {
    let completedCount = 0;

    ["DAIRY", "ICECREAM", "MVP"].forEach((v) => {
      const versionSkus = skuData[v] || [];

      versionSkus.forEach((skuItem) => {
        const key = skuItem.value;
        const avail = availability[v]?.[key];

        if (avail === "Not Carried" || avail === "Delisted") {
          completedCount++;
        } else {
          if (v === "MVP") {
            // ✅ For MVP, check both Harvest and OOS are filled
            const harvestList = skuValues.harvest?.[v]?.[key] || [];
            const isValidHarvest = harvestList.some(
              (entry: { date?: string; quantity?: string | number }) =>
                !!entry?.date &&
                entry?.quantity !== "" &&
                !isNaN(Number(entry.quantity)) &&
                Number(entry.quantity) > 0
            );

            const oos = skuValues.oos?.[v]?.[key] || "";

            if (isValidHarvest && oos !== "") {
              completedCount++;
            }
          } else {
            // ✅ For DAIRY and ICECREAM
            const b = skuValues.beginning?.[v]?.[key] || "";
            const d = skuValues.delivery?.[v]?.[key] || "";
            const r = skuValues.rtv?.[v]?.[key] || "";
            const e = skuValues.ending?.[v]?.[key] || "";
            const o = skuValues.oos?.[v]?.[key] || "";

            if (b !== "" && d !== "" && r !== "" && e !== "" && o !== "") {
              completedCount++;
            }
          }
        }
      });
    });

    return completedCount;
  };

  useEffect(() => {
    if (!skuData[version]) return;

    setSkuValues((prev: any) => {
      const alreadyInitialized = prev.expiry?.[version];

      // ✅ Prevent infinite loop
      if (alreadyInitialized) return prev;

      const initialExpiry: any = {};
      skuData[version].forEach((skuItem: any) => {
        initialExpiry[skuItem.value] = [{ month: "1", quantity: "" }];
      });

      return {
        ...prev,
        expiry: {
          ...prev.expiry,
          [version]: initialExpiry,
        },
      };
    });
  }, [skuData, version]);

  const getTotalSkuCount = () => {
    return ["DAIRY", "ICECREAM", "MVP"].reduce(
      (sum, v) => sum + (skuData[v]?.length || 0),
      0
    );
  };

  const filteredSkuOptions =
    skuData[version]?.filter((item) => item.value !== "") || [];

  const handleConditionalSubmit = () => {
    const incompleteVersions: string[] = [];

    ["ICECREAM", "DAIRY", "MVP"].forEach((version) => {
      const skuList = skuData[version] || [];

      const isVersionComplete = skuList.every((sku) => {
        const key = sku.value;
        const status = availability[version]?.[key];

        // Not Carried or Delisted are automatically complete
        if (status === "Not Carried" || status === "Delisted") return true;

        if (version === "MVP") {
          const harvestList = skuValues.harvest?.[version]?.[key] || [];

          // Must have at least 1 fully filled entry and no blank ones
          const hasValidEntry = harvestList.some(
            (entry: { date: string; quantity: string | number }) =>
              !!entry?.date &&
              entry?.quantity !== "" &&
              !isNaN(Number(entry.quantity)) &&
              Number(entry.quantity) > 0
          );

          const hasInvalidEntry = harvestList.some(
            (entry: { date: string; quantity: string | number }) =>
              !entry?.date ||
              entry.quantity === "" ||
              isNaN(Number(entry.quantity)) ||
              Number(entry.quantity) <= 0
          );

          const oosValue = skuValues.oos?.[version]?.[key];

          const isOOSValid = oosValue !== undefined && oosValue !== "";

          return hasValidEntry && !hasInvalidEntry && isOOSValid;
        }

        // For DAIRY and ICECREAM
        const hasAllValues =
          skuValues.beginning?.[version]?.[key] !== "" &&
          skuValues.delivery?.[version]?.[key] !== "" &&
          skuValues.ending?.[version]?.[key] !== "";

        return hasAllValues;
      });

      if (!isVersionComplete) {
        incompleteVersions.push(version);
      }
    });

    if (incompleteVersions.length > 0) {
      Alert.alert(
        "Incomplete SKUs",
        `Please complete all SKUs in: ${incompleteVersions.join(", ")}`,
        [{ text: "OK" }]
      );
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!merchandiser || !selectedOutlet) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    if (!email) {
      console.error("❌ Missing userEmail!");
      Alert.alert("Error", "User email is not set. Please log in again.");
      return;
    }

    setLoading(true);

    const versions: VersionType[] = ["DAIRY", "ICECREAM", "MVP"];

    const groupedInventory: GroupedInventory = {
      email,
      date,
      merchandiser,
      outlet: selectedOutlet,
      versions: {
        DAIRY: { Carried: [], "Not Carried": [], Delisted: [] },
        ICECREAM: { Carried: [], "Not Carried": [], Delisted: [] },
        MVP: { Carried: [], "Not Carried": [], Delisted: [] },
      },
    };

    for (const v of versions) {
      const skus = skuData[v]?.filter((item) => item.value !== "") || [];

      for (const skuItem of skus) {
        const skuKey = skuItem.value;
        const status = (availability[v]?.[skuKey] ||
          "Carried") as AvailabilityType;

        const commonFields =
          v === "MVP"
            ? {
                sku: skuItem.label,
                skuCode: skuKey,
              }
            : {
                sku: skuItem.label,
                skuCode: skuKey,
                code: skuItem.code,
              };

        if (status === "Carried") {
          if (v === "MVP") {
            const harvestList = skuValues.harvest?.[v]?.[skuKey] || [];

            const validHarvest = harvestList.filter(
              (entry: { date: string; quantity: string | number }) =>
                !!entry?.date &&
                entry?.quantity !== "" &&
                !isNaN(Number(entry.quantity)) &&
                Number(entry.quantity) > 0
            );

            if (
              harvestList.length > 0 &&
              validHarvest.length !== harvestList.length
            ) {
              setLoading(false);
              Alert.alert(
                "Error",
                `Some harvest entries for SKU ${skuItem.label} are incomplete. Please fill in all fields or remove blank ones.`
              );
              return;
            }

            groupedInventory.versions[v][status].push({
              ...commonFields,
              harvest: validHarvest.map(
                (entry: { date: string; quantity: string | number }) => ({
                  date: entry.date,
                  quantity: Number(entry.quantity),
                })
              ),
              expiry: [], // MVP does not use expiry
              oos: Number(skuValues.oos?.[v]?.[skuKey] || 0),
            });
          } else if (v === "ICECREAM") {
            const expiryList = skuValues.expiry?.[v]?.[skuKey] || [];

            const validExpiry = expiryList.filter(
              (entry: { date: string; quantity: string | number }) =>
                !!entry?.date &&
                entry?.quantity !== "" &&
                !isNaN(Number(entry.quantity)) &&
                Number(entry.quantity) > 0
            );

            if (
              expiryList.length > 0 &&
              validExpiry.length !== expiryList.length
            ) {
              setLoading(false);
              Alert.alert(
                "Error",
                `Some expiry entries for SKU ${skuItem.label} are incomplete. Please fill in all fields or remove blank ones.`
              );
              return;
            }

            const beginning = Number(skuValues.beginning?.[v]?.[skuKey] || 0);
            const delivery = Number(skuValues.delivery?.[v]?.[skuKey] || 0);
            const rtv = Number(skuValues.rtv?.[v]?.[skuKey] || 0);
            const ending = Number(skuValues.ending?.[v]?.[skuKey] || 0);
            const offtake = beginning + delivery - rtv - ending;

            groupedInventory.versions[v][status].push({
              ...commonFields,
              beginningPCS: beginning,
              deliveryPCS: delivery,
              rtvPCS: rtv,
              endingPCS: ending,
              offtake,
              oos: Number(skuValues.oos?.[v]?.[skuKey] || 0),
              harvest: [], // ICECREAM does not use harvest
              expiry: validExpiry.map(
                (entry: { date: string; quantity: string | number }) => ({
                  date: entry.date,
                  quantity: Number(entry.quantity),
                })
              ),
            });
          } else {
            // DAIRY
            const beginning = Number(skuValues.beginning?.[v]?.[skuKey] || 0);
            const delivery = Number(skuValues.delivery?.[v]?.[skuKey] || 0);
            const rtv = Number(skuValues.rtv?.[v]?.[skuKey] || 0);
            const ending = Number(skuValues.ending?.[v]?.[skuKey] || 0);
            const offtake = beginning + delivery - rtv - ending;

            groupedInventory.versions[v][status].push({
              ...commonFields,
              beginningPCS: beginning,
              deliveryPCS: delivery,
              rtvPCS: rtv,
              endingPCS: ending,
              offtake,
              oos: Number(skuValues.oos?.[v]?.[skuKey] || 0),
              harvest: [],
              expiry: [],
            });
          }
        } else {
          groupedInventory.versions[v][status].push({
            ...commonFields,
            harvest: [],
            expiry: [],
          });
        }
      }
    }

    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        return;
      }

      const res = await fetch(
        "https://api-carmens-best.bmphrc.com/inventory/grouped",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(groupedInventory),
        }
      );

      if (!res.ok) throw new Error(await res.text());

      const contentType = res.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const data = await res.json();
        console.log("✅ Grouped inventory saved:", data);
        navigation.goBack();
      } else {
        console.warn("Received non-JSON response:", await res.text());
      }
    } catch (err) {
      console.error("❌ Error saving whole inventory:", err);
      Alert.alert("Error", "Failed to save inventory.");
    } finally {
      setLoading(false);
    }
  };

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
            INVENTORY PROCESS
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.containerinventory,
            { paddingBottom: 50, paddingTop: 30 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LabeledInput
            label="Date"
            value={date}
            onChangeText={() => {}}
            editable={false}
          />
          <LabeledInput
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            editable={false}
            style={{ height: 0, opacity: 0 }}
          />
          <LabeledInput
            label="Merchandiser Name"
            value={merchandiser}
            onChangeText={setMerchandiser}
            editable={false}
            style={{ height: 0, opacity: 0 }}
          />

          <DropDownPicker
            open={open}
            value={selectedOutlet}
            items={outletOptions}
            setOpen={setOpen}
            setValue={setSelectedOutlet}
            setItems={setOutletOptions}
            searchable
            placeholder="Select Branch"
            // style={{ width: 407 }}
            // dropDownContainerStyle={{ width: 407 }}
            listMode="SCROLLVIEW"
          />

          {/* <AndroidPicker
            label="Weeks Covered"
            selectedValue={weeksCovered}
            onValueChange={handleWeeksCoveredChange}
            items={weekOptions}
            enabled={false} // Use this instead of editable
          />

          <LabeledInput
            label="Month"
            value={month}
            onChangeText={setMonth}
            editable={false}
            style={{ height: 0, opacity: 0 }}
          />
          <LabeledInput
            label="Week"
            value={week}
            onChangeText={setWeek}
            editable={false}
            style={{ height: 0, opacity: 0 }}
          /> */}

          <Text style={styles.label}>Select Category</Text>
          <View style={styles.buttonRow}>
            {["DAIRY", "ICECREAM", "MVP"].map((v, index) => {
              const versionSkus = skuData[v] || [];
              let completedSkuCount = 0;
              const totalSkuCount = versionSkus.length;

              versionSkus.forEach((skuItem) => {
                const key = skuItem.value;
                const avail = availability[v]?.[key];

                if (avail === "Not Carried" || avail === "Delisted") {
                  completedSkuCount++;
                } else {
                  if (v === "MVP") {
                    const harvestList = skuValues.harvest?.[v]?.[key] || [];
                    const isValidHarvest = harvestList.some(
                      (entry: { date?: string; quantity?: string | number }) =>
                        !!entry?.date &&
                        entry?.quantity !== "" &&
                        !isNaN(Number(entry.quantity)) &&
                        Number(entry.quantity) > 0
                    );

                    const o = skuValues.oos?.[v]?.[key] || "";

                    if (isValidHarvest && o !== "") {
                      completedSkuCount++;
                    }
                  } else {
                    const b = skuValues.beginning?.[v]?.[key] || "";
                    const d = skuValues.delivery?.[v]?.[key] || "";
                    const r = skuValues.rtv?.[v]?.[key] || "";
                    const e = skuValues.ending?.[v]?.[key] || "";
                    const o = skuValues.oos?.[v]?.[key] || "";

                    if (
                      b !== "" &&
                      d !== "" &&
                      r !== "" &&
                      e !== "" &&
                      o !== "" &&
                      (v !== "ICECREAM" ||
                        (skuValues.expiry?.[v]?.[key] || []).some(
                          (entry: {
                            date?: string;
                            quantity?: string | number;
                          }) =>
                            !!entry?.date &&
                            entry?.quantity !== "" &&
                            !isNaN(Number(entry.quantity)) &&
                            Number(entry.quantity) > 0
                        ))
                    ) {
                      completedSkuCount++;
                    }
                  }
                }
              });

              const isCompleted = completedSkuCount === totalSkuCount;

              const isDisabled =
                (index === 1 && // DAIRY requires ICECREAM to be completed
                  !(
                    skuData["DAIRY"]?.length &&
                    skuData["DAIRY"].every((sku) => {
                      const key = sku.value;
                      const avail = availability["DAIRY"]?.[key];
                      const b = skuValues.beginning?.["DAIRY"]?.[key] || "";
                      const d = skuValues.delivery?.["DAIRY"]?.[key] || "";
                      const r = skuValues.rtv?.["DAIRY"]?.[key] || "";
                      const e = skuValues.ending?.["DAIRY"]?.[key] || "";
                      const o = skuValues.oos?.["DAIRY"]?.[key] || "";
                      return (
                        avail === "Not Carried" ||
                        avail === "Delisted" ||
                        (b !== "" &&
                          d !== "" &&
                          r !== "" &&
                          e !== "" &&
                          o !== "")
                      );
                    })
                  )) ||
                (index === 2 && // MVP requires DAIRY to be completed
                  !(
                    skuData["ICECREAM"]?.length &&
                    skuData["ICECREAM"].every((sku) => {
                      const key = sku.value;
                      const avail = availability["ICECREAM"]?.[key];
                      const b = skuValues.beginning?.["ICECREAM"]?.[key] || "";
                      const d = skuValues.delivery?.["ICECREAM"]?.[key] || "";
                      const r = skuValues.rtv?.["ICECREAM"]?.[key] || "";
                      const e = skuValues.ending?.["ICECREAM"]?.[key] || "";
                      const o = skuValues.oos?.["ICECREAM"]?.[key] || "";

                      return (
                        avail === "Not Carried" ||
                        avail === "Delisted" ||
                        (b !== "" &&
                          d !== "" &&
                          r !== "" &&
                          e !== "" &&
                          o !== "")
                      );
                    })
                  ));

              return (
                <TouchableOpacity
                  key={v}
                  style={[
                    styles.versionBtn,
                    version === v && styles.selectedButton,
                    isDisabled && { opacity: 0.5 },
                  ]}
                  onPress={() => {
                    if (isDisabled) return;
                    setVersion((prev) => (prev === v ? "" : v));
                    setSku("");
                    setExpandedSection(null);
                  }}
                  disabled={(version !== "" && version !== v) || isDisabled}
                >
                  <Text
                    style={[
                      styles.btnText,
                      version === v && { color: "#fff" },
                      isDisabled && { color: "#aaa" },
                    ]}
                  >
                    {completedSkuCount}/{totalSkuCount} {v}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {version === "MVP" && (
            <View style={{ marginVertical: 10 }}>
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
                  {skuData[version]?.map((skuItem) => {
                    const harvestEntries =
                      skuValues.harvest?.[version]?.[skuItem.value] || [];

                    // Ensure at least one entry is always visible
                    if (harvestEntries.length === 0) {
                      harvestEntries.push({ date: "", quantity: "" });
                    }

                    return (
                      <View key={skuItem.value} style={{ marginBottom: 16 }}>
                        <Text style={[styles.skuText, { marginBottom: 6 }]}>
                          {skuItem.label}
                        </Text>

                        {harvestEntries.map(
                          (
                            entry: { date: string; quantity: string | number },
                            index: number
                          ) => (
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
                                  onPress={() => {
                                    setShowDatePicker({
                                      skuKey: skuItem.value,
                                      index,
                                    });
                                  }}
                                >
                                  <Text style={{ fontSize: 14 }}>
                                    {entry.date
                                      ? new Date(entry.date).toLocaleDateString(
                                          "en-PH"
                                        )
                                      : "Select Date"}
                                  </Text>
                                </TouchableOpacity>

                                {showDatePicker?.skuKey === skuItem.value &&
                                  showDatePicker?.index === index && (
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
                                          handleHarvestEntryChange(
                                            skuItem.value,
                                            index,
                                            "date",
                                            selectedDate.toISOString()
                                          );
                                        }
                                        setShowDatePicker(null);
                                      }}
                                    />
                                  )}
                              </View>

                              {/* Quantity Field */}
                              <TextInput
                                placeholder="Qty"
                                placeholderTextColor={"grey"}
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
                                      ? "#2c1c5c"
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
                          )
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              {/* OOS Section */}
              <TouchableOpacity
                style={[styles.expandButton, { marginTop: 20 }]}
                onPress={() =>
                  setExpandedSection((prev) => (prev === "OOS" ? null : "OOS"))
                }
              >
                <Text style={styles.expandButtonText}>
                  {(() => {
                    const sectionKey = "oos";
                    const filledCount = (skuData[version] || []).filter(
                      (skuItem) => {
                        const val =
                          skuValues[sectionKey]?.[version]?.[skuItem.value];
                        return val !== undefined && val !== "";
                      }
                    ).length;
                    const totalSkuCount = (skuData[version] || []).length;
                    return expandedSection === "OOS"
                      ? `Hide OOS ${filledCount}/${totalSkuCount}`
                      : `Expand OOS ${filledCount}/${totalSkuCount}`;
                  })()}
                </Text>
              </TouchableOpacity>

              {expandedSection === "OOS" && (
                <View style={{ marginTop: 10 }}>
                  {skuData[version]?.map((skuItem) => (
                    <View key={skuItem.value} style={styles.skuItemRow}>
                      <Text style={styles.skuText}>{skuItem.label}</Text>

                      <TextInput
                        placeholder="OOS"
                        keyboardType="numeric"
                        style={[
                          styles.inputBox,
                          {
                            backgroundColor: "#fff",
                            borderColor: "#2c1c5c",
                            borderWidth: 1,
                            height: 40,
                            fontSize: 14,
                            marginLeft: 10,
                          },
                        ]}
                        value={
                          skuValues.oos?.[version]?.[
                            skuItem.value
                          ]?.toString() || ""
                        }
                        onChangeText={(text) => {
                          if (/^\d*$/.test(text)) {
                            handleOOSChange(skuItem.value, text);
                          }
                        }}
                      />
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {version !== "MVP" && (
            <View>
              {["Beginning", "Delivery", "RTV"].map((section) => {
                const sectionKey = section.toLowerCase();
                const filledCount = filteredSkuOptions.filter((skuItem) => {
                  const skuKey = skuItem.value;
                  const val = skuValues[sectionKey]?.[version]?.[skuKey];

                  const availStatus = availability[version]?.[skuKey];

                  // Count if value is filled or availability is Not Carried / Delisted
                  return (
                    (val !== undefined && val !== "") ||
                    availStatus === "Not Carried" ||
                    availStatus === "Delisted"
                  );
                }).length;

                const totalSkuCount = filteredSkuOptions.length;

                return (
                  <View key={section} style={{ marginVertical: 10 }}>
                    <TouchableOpacity
                      style={styles.expandButton}
                      onPress={() =>
                        setExpandedSection((prev) =>
                          prev === section ? null : section
                        )
                      }
                    >
                      <Text style={styles.expandButtonText}>
                        {expandedSection === section
                          ? `Hide ${section} ${filledCount}/${totalSkuCount}`
                          : `Expand ${section} ${filledCount}/${totalSkuCount}`}
                      </Text>
                    </TouchableOpacity>
                    {expandedSection === section && (
                      <View style={{ marginTop: 10 }}>
                        {filteredSkuOptions.map((skuItem) => {
                          const skuKey = skuItem.value;
                          const isBeginning = sectionKey === "beginning";

                          const availabilityValue =
                            availability[version]?.[skuKey] ??
                            (isBeginning ? "Carried" : "");

                          const isBeginningEditable =
                            isBeginning && availabilityValue === "Carried";
                          const isOtherSectionEditable =
                            !isBeginning &&
                            availability[version]?.[skuKey] === "Carried";
                          const isEditable = isBeginning
                            ? isBeginningEditable
                            : isOtherSectionEditable;

                          return (
                            <TouchableOpacity
                              key={skuKey}
                              activeOpacity={1} // Keep the row visible when touched
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                marginBottom: 8,
                              }}
                            >
                              {/* SKU Label */}
                              <ScrollView
                                horizontal
                                style={{ flex: 1 }}
                                contentContainerStyle={{ paddingRight: 10 }}
                                scrollEnabled={true}
                              >
                                <Text style={styles.skuText} numberOfLines={1}>
                                  {skuItem.label}
                                </Text>
                              </ScrollView>

                              {/* Availability Picker (Beginning only) */}
                              {isBeginning && (
                                <View
                                  style={{
                                    flex: 0.5,
                                    marginHorizontal: 2,
                                    borderWidth: 1,
                                    borderColor: "#ccc",
                                    borderRadius: 4,
                                    overflow: "hidden",
                                    minWidth: 20,
                                  }}
                                >
                                  <Picker
                                    selectedValue={availabilityValue}
                                    style={{
                                      height: 50,
                                      width: "100%",
                                      backgroundColor: "white",
                                    }}
                                    itemStyle={{
                                      fontSize: 11, // Adjust this value as needed
                                    }}
                                    onValueChange={(value) => {
                                      setAvailability((prev) => ({
                                        ...prev,
                                        [version]: {
                                          ...(prev[version] || {}),
                                          [skuKey]: value,
                                        },
                                      }));

                                      if (value !== "Carried") {
                                        // Clear all fields if Not Carried or Delisted
                                        setSkuValues((prev: any) => ({
                                          ...prev,
                                          beginning: {
                                            ...(prev.beginning || {}),
                                            [version]: {
                                              ...(prev.beginning?.[version] ||
                                                {}),
                                              [skuKey]: "",
                                            },
                                          },
                                          delivery: {
                                            ...(prev.delivery || {}),
                                            [version]: {
                                              ...(prev.delivery?.[version] ||
                                                {}),
                                              [skuKey]: "",
                                            },
                                          },
                                          ending: {
                                            ...(prev.ending || {}),
                                            [version]: {
                                              ...(prev.ending?.[version] || {}),
                                              [skuKey]: "",
                                            },
                                          },
                                          oos: {
                                            ...(prev.oos || {}),
                                            [version]: {
                                              ...(prev.oos?.[version] || {}),
                                              [skuKey]: "",
                                            },
                                          },
                                        }));
                                      }
                                    }}
                                    mode="dropdown"
                                  >
                                    <Picker.Item
                                      label="Carried"
                                      value="Carried"
                                      style={{ fontSize: 11, color: "black" }}
                                    />
                                    <Picker.Item
                                      label="Not Carried"
                                      value="Not Carried"
                                      style={{ fontSize: 11, color: "black" }}
                                    />
                                    {/* <Picker.Item
                                      label="Delisted"
                                      value="Delisted"
                                      style={{ fontSize: 11, color: "black" }}
                                    /> */}
                                  </Picker>
                                  <Icon
                                    name="arrow-drop-down"
                                    size={24}
                                    color="grey"
                                    style={{
                                      position: "absolute",
                                      right: 10,
                                      top: 13,
                                      pointerEvents: "none", // ensures Picker underneath still responds
                                    }}
                                  />
                                </View>
                              )}

                              {/* Quantity Input (editable only if Carried) */}
                              <TextInput
                                style={[
                                  styles.inputBox,
                                  {
                                    width: 52,
                                    height: 40,
                                    marginLeft: isBeginning ? 0 : 6,
                                    textAlign: "center",
                                    backgroundColor:
                                      availabilityValue === "Carried"
                                        ? "#FFFFFF"
                                        : "#f0f0f0",
                                    borderColor:
                                      availabilityValue === "Carried"
                                        ? "#2c1c5c"
                                        : "#ccc",
                                    borderWidth: 1,
                                  },
                                ]}
                                keyboardType="numeric"
                                value={
                                  skuValues[sectionKey]?.[version]?.[skuKey] ||
                                  ""
                                }
                                onChangeText={(text) => {
                                  if (/^\d*$/.test(text)) {
                                    setSkuValues((prev: any) => ({
                                      ...prev,
                                      [sectionKey]: {
                                        ...(prev[sectionKey] || {}),
                                        [version]: {
                                          ...(prev[sectionKey]?.[version] ||
                                            {}),
                                          [skuKey]: text,
                                        },
                                      },
                                    }));
                                  }
                                }}
                                editable={isEditable}
                              />
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}

              {/* Expandable Ending Section with count */}
              {version !== "MVP" &&
                (() => {
                  const section = "Ending";
                  const sectionKey = "ending";

                  const filledCount = filteredSkuOptions.filter((skuItem) => {
                    const skuKey = skuItem.value;
                    const val = skuValues[sectionKey]?.[version]?.[skuKey];
                    const availStatus = availability[version]?.[skuKey];

                    return (
                      (val !== undefined && val !== "") ||
                      availStatus === "Not Carried" ||
                      availStatus === "Delisted"
                    );
                  }).length;

                  const totalSkuCount = filteredSkuOptions.length;

                  return (
                    <View style={{ marginVertical: 10 }}>
                      <TouchableOpacity
                        style={styles.expandButton}
                        onPress={() =>
                          setExpandedSection((prev) =>
                            prev === section ? null : section
                          )
                        }
                      >
                        <Text style={styles.expandButtonText}>
                          {expandedSection === section
                            ? `Hide Ending ${filledCount}/${totalSkuCount}`
                            : `Expand Ending ${filledCount}/${totalSkuCount}`}
                        </Text>
                      </TouchableOpacity>

                      {expandedSection === section && (
                        <TouchableOpacity
                          style={{ marginTop: 10 }}
                          activeOpacity={1}
                          onPress={() => {}}
                        >
                          {filteredSkuOptions.map((skuItem) => {
                            const skuKey = skuItem.value;
                            const availabilityValue =
                              availability[version]?.[skuKey] || "Carried";

                            return (
                              <View key={skuKey} style={styles.skuItemRow}>
                                <Text style={styles.skuText}>
                                  {skuItem.label}
                                </Text>

                                <TextInput
                                  style={[
                                    styles.inputBox,
                                    {
                                      width: 52,
                                      height: 40,
                                      textAlign: "center",
                                      backgroundColor:
                                        availabilityValue === "Carried"
                                          ? "#FFFFFF"
                                          : "#f0f0f0",
                                      borderColor:
                                        availabilityValue === "Carried"
                                          ? "#2c1c5c"
                                          : "#ccc",
                                      borderWidth: 1,
                                    },
                                  ]}
                                  keyboardType="numeric"
                                  editable={availabilityValue === "Carried"}
                                  value={
                                    skuValues.ending?.[version]?.[skuKey] || ""
                                  }
                                  onChangeText={(text) => {
                                    if (/^\d*$/.test(text)) {
                                      setSkuValues((prev: any) => ({
                                        ...prev,
                                        ending: {
                                          ...(prev.ending || {}),
                                          [version]: {
                                            ...(prev.ending?.[version] || {}),
                                            [skuKey]: text,
                                          },
                                        },
                                      }));
                                    }
                                  }}
                                />
                              </View>
                            );
                          })}
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })()}

              <View style={{ marginVertical: 10 }}>
                <TouchableOpacity
                  style={styles.expandButton}
                  onPress={() =>
                    setExpandedSection((prev) =>
                      prev === "Offtake" ? null : "Offtake"
                    )
                  }
                >
                  <Text style={styles.expandButtonText}>
                    {expandedSection === "Offtake"
                      ? `Hide Offtake`
                      : `Expand Offtake`}
                  </Text>
                </TouchableOpacity>

                {expandedSection === "Offtake" && (
                  <TouchableOpacity
                    style={{ marginTop: 10 }}
                    activeOpacity={1}
                    onPress={() => {}}
                  >
                    {filteredSkuOptions.map((skuItem) => (
                      <View key={skuItem.value} style={styles.skuItemRow}>
                        <Text style={styles.skuText}>{skuItem.label}</Text>
                        <TextInput
                          placeholder="Offtake"
                          style={styles.inputBox}
                          editable={false}
                          value={
                            skuValues.offtake?.[version]?.[skuItem.value] || ""
                          }
                        />
                      </View>
                    ))}
                  </TouchableOpacity>
                )}
              </View>

              <View style={{ marginVertical: 10 }}>
                {/* OOS Section */}
                {(() => {
                  const section = "OOS";
                  const sectionKey = "oos";

                  const filledCount = (skuData[version] || []).filter(
                    (skuItem) => {
                      const skuKey = skuItem.value;
                      const val = skuValues[sectionKey]?.[version]?.[skuKey];
                      const availStatus = availability[version]?.[skuKey];

                      return (
                        (val !== undefined && val !== "") ||
                        availStatus === "Not Carried" ||
                        availStatus === "Delisted"
                      );
                    }
                  ).length;

                  const totalSkuCount = (skuData[version] || []).length;

                  return (
                    <>
                      <TouchableOpacity
                        style={styles.expandButton}
                        onPress={() =>
                          setExpandedSection((prev) =>
                            prev === section ? null : section
                          )
                        }
                      >
                        <Text style={styles.expandButtonText}>
                          {expandedSection === section
                            ? `Hide OOS ${filledCount}/${totalSkuCount}`
                            : `Expand OOS ${filledCount}/${totalSkuCount}`}
                        </Text>
                      </TouchableOpacity>

                      {expandedSection === section && (
                        <View style={{ marginTop: 10 }}>
                          {(skuData[version] || []).map((skuItem) => {
                            const skuKey = skuItem.value;
                            const availabilityValue =
                              availability[version]?.[skuKey] || "Carried";

                            return (
                              <View
                                key={`${version}-${skuKey}`}
                                style={styles.skuItemRow}
                              >
                                <Text style={styles.skuText}>
                                  {skuItem.label}
                                </Text>

                                <TextInput
                                  placeholderTextColor="#222021"
                                  keyboardType="numeric"
                                  style={[
                                    styles.inputBox,
                                    {
                                      backgroundColor:
                                        availabilityValue === "Carried"
                                          ? "#fff"
                                          : "#f0f0f0",
                                      borderColor:
                                        availabilityValue === "Carried"
                                          ? "#2c1c5c"
                                          : "#ccc",
                                      borderWidth: 1,
                                      height: 40,
                                      fontSize: 14,
                                      marginLeft: 10,
                                      color: "#000",
                                    },
                                  ]}
                                  editable={availabilityValue === "Carried"}
                                  value={
                                    skuValues.oos?.[version]?.[
                                      skuKey
                                    ]?.toString() || ""
                                  }
                                  onChangeText={(text) => {
                                    const onlyDigits = text.replace(
                                      /[^0-9]/g,
                                      ""
                                    );
                                    setSkuValues((prev: any) => ({
                                      ...prev,
                                      oos: {
                                        ...prev.oos,
                                        [version]: {
                                          ...prev.oos?.[version],
                                          [skuKey]: onlyDigits,
                                        },
                                      },
                                    }));
                                  }}
                                />
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </>
                  );
                })()}
              </View>
              {version === "ICECREAM" && (
                <View style={{ marginVertical: 10 }}>
                  {(() => {
                    const section = "Expiry";
                    const sectionKey = "expiry";

                    const filledCount = (skuData[version] || []).filter(
                      (skuItem) => {
                        const skuKey = skuItem.value;
                        const entries =
                          skuValues[sectionKey]?.[version]?.[skuKey] || [];
                        return entries.some(
                          (entry: {
                            date: string;
                            quantity: string | number;
                          }) => entry.date && entry.quantity
                        );
                      }
                    ).length;

                    const totalSkuCount = (skuData[version] || []).length;

                    return (
                      <>
                        <TouchableOpacity
                          style={styles.expandButton}
                          onPress={() =>
                            setExpandedSection((prev) =>
                              prev === section ? null : section
                            )
                          }
                        >
                          <Text style={styles.expandButtonText}>
                            {expandedSection === section
                              ? `Hide Expiry ${filledCount}/${totalSkuCount}`
                              : `Expand Expiry ${filledCount}/${totalSkuCount}`}
                          </Text>
                        </TouchableOpacity>

                        {expandedSection === section && (
                          <View style={{ marginTop: 10 }}>
                            {skuData[version]?.map((skuItem) => {
                              const ExpiryEntries =
                                skuValues.expiry?.[version]?.[skuItem.value] ||
                                [];

                              if (ExpiryEntries.length === 0) {
                                ExpiryEntries.push({ date: "", quantity: "" });
                              }

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

                                  {ExpiryEntries.map(
                                    (
                                      entry: {
                                        date: string;
                                        quantity: string | number;
                                      },
                                      index: number
                                    ) => (
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
                                            style={{
                                              borderWidth: 1,
                                              borderColor: "#ccc",
                                              borderRadius: 4,
                                              paddingVertical: 10,
                                              paddingHorizontal: 12,
                                            }}
                                            onPress={() => {
                                              setShowDatePicker({
                                                skuKey: skuItem.value,
                                                index,
                                              });
                                            }}
                                          >
                                            <Text style={{ fontSize: 14 }}>
                                              {entry.date
                                                ? new Date(
                                                    entry.date
                                                  ).toLocaleDateString("en-PH")
                                                : "Select Date"}
                                            </Text>
                                          </TouchableOpacity>

                                          {showDatePicker?.skuKey ===
                                            skuItem.value &&
                                            showDatePicker?.index === index && (
                                              <DateTimePicker
                                                value={
                                                  entry.date
                                                    ? new Date(entry.date)
                                                    : new Date()
                                                }
                                                mode="date"
                                                display="default"
                                                onChange={(
                                                  event,
                                                  selectedDate
                                                ) => {
                                                  if (
                                                    event.type === "set" &&
                                                    selectedDate
                                                  ) {
                                                    handleExpiryEntryChange(
                                                      skuItem.value,
                                                      index,
                                                      "date",
                                                      selectedDate.toISOString()
                                                    );
                                                  }
                                                  setShowDatePicker(null);
                                                }}
                                              />
                                            )}
                                        </View>

                                        {/* Quantity Input */}
                                        <TextInput
                                          placeholder="Qty"
                                          placeholderTextColor={"grey"}
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
                                                ? "#2c1c5c"
                                                : "#ccc",
                                              borderWidth: 1,
                                            },
                                          ]}
                                          keyboardType="numeric"
                                          value={
                                            entry.quantity?.toString() || ""
                                          }
                                          onChangeText={(text) => {
                                            if (!entry.date) {
                                              Alert.alert(
                                                "Please select a date first."
                                              );
                                              return;
                                            }

                                            if (/^\d*$/.test(text)) {
                                              handleExpiryEntryChange(
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

                                  {/* ➕ Add / 🗑️ Delete Row */}
                                  <View
                                    style={{
                                      flexDirection: "row",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      marginTop: 4,
                                      paddingHorizontal: 4,
                                    }}
                                  >
                                    <TouchableOpacity
                                      onPress={() =>
                                        addExpiryEntry(skuItem.value)
                                      }
                                      style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                      }}
                                    >
                                      <Text style={{ fontSize: 18 }}>➕</Text>
                                      <Text
                                        style={{
                                          color: "#2c1c5c",
                                          fontSize: 14,
                                          marginLeft: 4,
                                        }}
                                      >
                                        Add Entry
                                      </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                      onPress={() =>
                                        deleteExpiryEntry(skuItem.value, 0)
                                      }
                                      style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                      }}
                                    >
                                      <Text style={{ fontSize: 18 }}>🗑️</Text>
                                      <Text
                                        style={{
                                          color: "crimson",
                                          fontSize: 14,
                                          marginLeft: 4,
                                        }}
                                      >
                                        Delete Entry
                                      </Text>
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        )}
                      </>
                    );
                  })()}
                </View>
              )}
            </View>
          )}

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
              onPress={handleConditionalSubmit}
            >
              <Text style={styles.submitButtonText}>
                {loading
                  ? "Submitting..."
                  : `Submit (${getCompletedSkuCount()}/${getTotalSkuCount()})`}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default InventoryProcess;
