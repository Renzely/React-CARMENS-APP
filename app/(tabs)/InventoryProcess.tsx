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
  week: number;
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
  const currentWeek = moment().isoWeek();
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [showCarryPrompt, setShowCarryPrompt] = useState<string | null>(null);
  const [tempCarriedSelection, setTempCarriedSelection] = useState<any>({});
  const [availability, setAvailability] = useState<{
    [version: string]: { [skuKey: string]: string };
  }>({});

  const [rtvReason, setRtvReason] = useState<{
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

  const openCategoryForm = (category: any) => {
    setExpandedCategory(category);
    // any other setup code you had before
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

  const handleAdjustment = (
    type: "adjustPlus" | "adjustMinus",
    skuKey: string,
    value: string
  ) => {
    setSkuValues((prev: any) => {
      const copy = { ...prev };
      if (!copy[version]) copy[version] = {};
      if (!copy[version][skuKey]) copy[version][skuKey] = {};

      // normalize numeric
      let storeValue: any = value;
      if (value === "" || value === null || value === undefined) {
        storeValue = ""; // keep empty when cleared
      } else {
        const cleaned = String(value).replace(/\D/g, "");
        storeValue = cleaned === "" ? "" : parseInt(cleaned, 10);
      }

      copy[version][skuKey] = {
        ...copy[version][skuKey],
        [type]: storeValue,
      };

      // recalc offtake live (same as next inventory)
      const b = Number(copy.beginning?.[version]?.[skuKey] || 0);
      const d = Number(copy.delivery?.[version]?.[skuKey] || 0);
      const r = Number(copy.rtv?.[version]?.[skuKey] || 0);
      const e = Number(copy.ending?.[version]?.[skuKey] || 0);

      const ap = Number(copy[version][skuKey].adjustPlus || 0);
      const am = Number(copy[version][skuKey].adjustMinus || 0);

      const thisOfftake = b + d - r - e + ap - am;

      if (!copy.offtake) copy.offtake = {};
      if (!copy.offtake[version]) copy.offtake[version] = {};

      copy.offtake[version][skuKey] = thisOfftake;

      return copy;
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

      // 🟢 adjustments — handle "" properly
      const rawPlus = skuValues[version]?.[skuItem.value]?.adjustPlus;
      const rawMinus = skuValues[version]?.[skuItem.value]?.adjustMinus;

      const adjustPlus =
        rawPlus === "" || rawPlus === undefined || rawPlus === null
          ? 0
          : parseFloat(rawPlus);

      const adjustMinus =
        rawMinus === "" || rawMinus === undefined || rawMinus === null
          ? 0
          : parseFloat(rawMinus);

      const calculatedOfftake =
        beginning + delivery - rtv - ending + adjustPlus - adjustMinus;

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
    skuValues[version], // watches adjustments too
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

  const mvpOnlyBranches = [
    "S&R ALABANG",
    "S&R ASEANA",
    "S&R BACOOR",
    "S&R BALIUAG",
    "S&R CIRCUIT MAKATI",
    "S&R COMMONWEALTH",
    "S&R CONGRESSIONAL",
    "S&R DAU MABALACAT",
    "S&R IMUS",
    "S&R KAWIT",
    "S&R LIBIS BAGUMBAYAN",
    "S&R LIPA BATANGAS",
    "S&R MARIKINA",
    "S&R NEW MANILA",
    "S&R NUVALI",
    "S&R PARANAQUE",
    "S&R SAN FERNANDO",
    "S&R SHAW",
    "S&R STO TOMAS",
    "S&R SUCAT",
    "S&R THE FORT",
  ];

  const skuData: {
    [version: string]: { label: string; value: string; code: string }[];
  } = {
    ICECREAM: [
      {
        label: "BBUTTER ALMOND BRITTLE 115ML X 1, CUP",
        value: "BBUTTER ALMOND BRITTLE 115ML X 1, CUP",
        code: "4806526540459",
      },
      {
        label: "BBUTTER ALMOND BRITTLE 440ML X 1, PINT",
        value: "BBUTTER ALMOND BRITTLE 440ML X 1, PINT",
        code: "4806526540046",
      },
      {
        label: "BRAZILLIAN COFFEE 115ML X 1, CUP",
        value: "BRAZILLIAN COFFEE 115ML X 1, CUP",
        code: "4806526540411",
      },
      {
        label: "BRAZILLIAN COFFEE 440ML X 1, PINT",
        value: "BRAZILLIAN COFFEE 440ML X 1, PINT",
        code: "4806526540008",
      },
      {
        label: "BUTTER PECAN 115ML X 1, CUP",
        value: "BUTTER PECAN 115ML X 1, CUP",
        code: "4806526540435",
      },
      {
        label: "BUTTER PECAN 440ML X 1, PINT",
        value: "BUTTER PECAN 440ML X 1, PINT",
        code: "4806526540022",
      },
      {
        label: "COFFEE ALMOND FUDGE 115ML X 1, CUP",
        value: "COFFEE ALMOND FUDGE 115ML X 1, CUP",
        code: "4806526540633",
      },
      {
        label: "COFFEE ALMOND FUDGE 440ML X 1, PINT",
        value: "COFFEE ALMOND FUDGE 440ML X 1, PINT",
        code: "4806526540237",
      },
      {
        label: "COOKIE DOUGH 115ML X 1, CUP",
        value: "COOKIE DOUGH 115ML X 1, CUP",
        code: "4806526540572",
      },
      {
        label: "COOKIE DOUGH 440ML X 1, PINT",
        value: "COOKIE DOUGH 440ML X 1, PINT",
        code: "4806526540176",
      },
      {
        label: "COOKIES AND CREAM 115ML X 1, CUP",
        value: "COOKIES AND CREAM 115ML X 1, CUP",
        code: "4806526540565",
      },
      {
        label: "COOKIES AND CREAM 440ML X 1, PINT",
        value: "COOKIES AND CREAM 440ML X 1, PINT",
        code: "4806526540169",
      },
      {
        label: "DARK CHOCOLATE 115ML X 1, CUP",
        value: "DARK CHOCOLATE 115ML X 1, CUP",
        code: "4806526540473",
      },
      {
        label: "DARK CHOCOLATE 440ML X 1, PINT",
        value: "DARK CHOCOLATE 440ML X 1, PINT",
        code: "4806526540060",
      },
      {
        label: "EVERYONE LOVES VANILLA 115ML X 1, CUP",
        value: "EVERYONE LOVES VANILLA 115ML X 1, CUP",
        code: "4806526540602",
      },
      {
        label: "EVERYONE LOVES VANILLA 440ML X 1, PINT",
        value: "EVERYONE LOVES VANILLA 440ML X 1, PINT",
        code: "4806526540206",
      },
      {
        label: "HE'S NOT WORTH IT 115ML X 1, CUP",
        value: "HE'S NOT WORTH IT 115ML X 1, CUP",
        code: "4806526540725",
      },
      {
        label: "HE'S NOT WORTH IT 440ML X 1, PINT",
        value: "HE'S NOT WORTH IT 440ML X 1, PINT",
        code: "4806526540312",
      },
      {
        label: "JOLLY OL' EGGNOG 115ML X 1, CUP",
        value: "JOLLY OL' EGGNOG 115ML X 1, CUP",
        code: "634240230783",
      },
      {
        label: "JOLLY OL' EGGNOG 440ML X 1, PINT",
        value: "JOLLY OL' EGGNOG 440ML X 1, PINT",
        code: "634240230790",
      },
      {
        label: "LITE MANGO 115ML X 1, CUP",
        value: "LITE MANGO 115ML X 1, CUP",
        code: "634240269028",
      },
      {
        label: "LITE MANGO 440ML X 1, PINT",
        value: "LITE MANGO 440ML X 1, PINT",
        code: "634240269011",
      },
      {
        label: "LITE MIXED BERRIES 115ML X 1, CUP",
        value: "LITE MIXED BERRIES 115ML X 1, CUP",
        code: "634240269066",
      },
      {
        label: "LITE MIXED BERRIES 440ML X 1, PINT",
        value: "LITE MIXED BERRIES 440ML X 1, PINT",
        code: "634240269059",
      },
      {
        label: "LITE STRAWBERRY 115ML X 1, CUP",
        value: "LITE STRAWBERRY 115ML X 1, CUP",
        code: "634240269042",
      },
      {
        label: "LITE STRAWBERRY 440ML X 1, PINT",
        value: "LITE STRAWBERRY 440ML X 1, PINT",
        code: "634240269035",
      },
      {
        label: "MALTED MILK 115ML X 1, CUP",
        value: "MALTED MILK 115ML X 1, CUP",
        code: "4806526540442",
      },
      {
        label: "MALTED MILK 440ML X 1, PINT",
        value: "MALTED MILK 440ML X 1, PINT",
        code: "4806526540039",
      },
      {
        label: "MERRY MINT CHOCOLATE 115ML X 1, CUP",
        value: "MERRY MINT CHOCOLATE 115ML X 1, CUP",
        code: "634240230806",
      },
      {
        label: "MERRY MINT CHOCOLATE 440ML X 1, PINT",
        value: "MERRY MINT CHOCOLATE 440ML X 1, PINT",
        code: "634240230813",
      },
      {
        label: "PISTACHIO 115ML X 1, CUP",
        value: "PISTACHIO 115ML X 1, CUP",
        code: "4806526540510",
      },
      {
        label: "PISTACHIO 440ML X 1, PINT",
        value: "PISTACHIO 440ML X 1, PINT",
        code: "4806526540107",
      },
      {
        label: "PISTACHIO ALMOND FUDGE 115ML X 1, CUP",
        value: "PISTACHIO ALMOND FUDGE 115ML X 1, CUP",
        code: "4806526540640",
      },
      {
        label: "PISTACHIO ALMOND FUDGE 440ML X 1, PINT",
        value: "PISTACHIO ALMOND FUDGE 440ML X 1, PINT",
        code: "4806526540244",
      },
      {
        label: "ROCKY ROAD 115ML X 1, CUP",
        value: "ROCKY ROAD 115ML X 1, CUP",
        code: "4806526540466",
      },
      {
        label: "ROCKY ROAD 440ML X 1, PINT",
        value: "ROCKY ROAD 440ML X 1, PINT",
        code: "4806526540053",
      },
      {
        label: "S'MORES THE MERRIER 115ML X 1, CUP",
        value: "S'MORES THE MERRIER 115ML X 1, CUP",
        code: "634240230820",
      },
      {
        label: "S'MORES THE MERRIER 440ML X 1, PINT",
        value: "S'MORES THE MERRIER 440ML X 1, PINT",
        code: "634240230837",
      },
      {
        label: "SALTED CARAMEL 115ML X 1, CUP",
        value: "SALTED CARAMEL 115ML X 1, CUP",
        code: "4806526540428",
      },
      {
        label: "SALTED CARAMEL 440ML X 1, PINT",
        value: "SALTED CARAMEL 440ML X 1, PINT",
        code: "4806526540015",
      },
      {
        label: "STRAWBERRY 115ML X 1, CUP",
        value: "STRAWBERRY 115ML X 1, CUP",
        code: "4806526540558",
      },
      {
        label: "STRAWBERRY 440ML X 1, PINT",
        value: "STRAWBERRY 440ML X 1, PINT",
        code: "4806526540152",
      },
      {
        label: "STRAWBERRY CHEESECAKE 115ML X 1, CUP",
        value: "STRAWBERRY CHEESECAKE 115ML X 1, CUP",
        code: "634240292477",
      },
      {
        label: "STRAWBERRY CHEESECAKE 440ML X 1, PINT",
        value: "STRAWBERRY CHEESECAKE 440ML X 1, PINT",
        code: "634240292460",
      },
    ],

    DAIRY: [
      {
        label: "BARISTA FRESH MILK 1L",
        value: "BARISTA FRESH MILK 1L",
        code: "634240292446",
      },
      {
        label: "HOLLY'S LOW-FAT YOGHURT 1L",
        value: "HOLLY'S LOW-FAT YOGHURT 1L",
        code: "4806526460153",
      },
      {
        label: "HOLLY'S LOW-FAT YOGHURT 200ML",
        value: "HOLLY'S LOW-FAT YOGHURT 200ML",
        code: "",
      },
      {
        label: "HOLLY'S LOW-FAT YOGHURT 500ML",
        value: "HOLLY'S LOW-FAT YOGHURT 500ML",
        code: "",
      },
      {
        label: "KESONG PUTI 200G",
        value: "KESONG PUTI 200G",
        code: "634240256735",
      },
      {
        label: "PREMIUM CHOCOLATE MILK 1L",
        value: "PREMIUM CHOCOLATE MILK 1L",
        code: "634240292408",
      },
      {
        label: "PREMIUM CHOCOLATE MILK 300ML",
        value: "PREMIUM CHOCOLATE MILK 300ML",
        code: "",
      },
      {
        label: "PREMIUM LOW-FAT MILK 1L",
        value: "PREMIUM LOW-FAT MILK 1L",
        code: "634240292385",
      },
      {
        label: "PREMIUM LOW-FAT MILK 200ML",
        value: "PREMIUM LOW-FAT MILK 200ML",
        code: "",
      },
      {
        label: "PREMIUM LOW-FAT MILK 300ML",
        value: "PREMIUM LOW-FAT MILK 300ML",
        code: "",
      },
      {
        label: "PREMIUM WHOLE MILK 1L",
        value: "PREMIUM WHOLE MILK 1L",
        code: "634240292361",
      },
      {
        label: "PREMIUM WHOLE MILK 200ML",
        value: "PREMIUM WHOLE MILK 200ML",
        code: "",
      },
      {
        label: "PREMIUM WHOLE MILK 300ML",
        value: "PREMIUM WHOLE MILK 300ML",
        code: "",
      },
    ],

    MVP: [
      {
        label: "BATAVIA LETTUCE",
        value: "BATAVIA LETTUCE",
        code: "",
      },
      {
        label: "BUTTERHEAD LETTUCE",
        value: "BUTTERHEAD LETTUCE",
        code: "",
      },
      {
        label: "CRISTAL LETTUCE",
        value: "CRISTAL LETTUCE",
        code: "",
      },
      {
        label: "ROMAINE LETTUCE",
        value: "ROMAINE LETTUCE",
        code: "",
      },
      {
        label: "SALANOVA LETTUCE",
        value: "SALANOVA LETTUCE",
        code: "",
      },
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
          // ✅ MVP, DAIRY, ICECREAM: All require Beginning + Delivery + Ending
          const b = skuValues.beginning?.[v]?.[key] || "";
          const d = skuValues.delivery?.[v]?.[key] || "";
          const e = skuValues.ending?.[v]?.[key] || "";

          if (b !== "" && d !== "" && e !== "") {
            completedCount++; // ✅ Count once per SKU
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
    const completedVersions: string[] = [];

    ["DAIRY", "ICECREAM", "MVP"].forEach((version) => {
      const skuList = skuData[version] || [];

      const isVersionComplete = skuList.every((sku) => {
        const key = sku.value;
        const status = availability[version]?.[key];

        if (status === "Not Carried" || status === "Delisted") return true;

        // ✅ MVP and ICECREAM: Beginning + Delivery + Ending are required
        if (version === "MVP" || version === "ICECREAM") {
          const b = skuValues.beginning?.[version]?.[key] || "";
          const d = skuValues.delivery?.[version]?.[key] || "";
          const e = skuValues.ending?.[version]?.[key] || "";

          return b !== "" && d !== "" && e !== "";
        }

        // ✅ DAIRY: Beginning + Delivery are required
        if (version === "DAIRY") {
          const b = skuValues.beginning?.[version]?.[key] || "";
          const d = skuValues.delivery?.[version]?.[key] || "";

          return b !== "" && d !== "";
        }

        return false;
      });

      if (isVersionComplete) {
        completedVersions.push(version);
      } else {
        incompleteVersions.push(version);
      }
    });

    if (incompleteVersions.length > 0) {
      Alert.alert(
        "Incomplete SKUs",
        `You have completed: ${
          completedVersions.join(", ") || "None"
        }\nPlease complete: ${incompleteVersions.join(", ")}`,
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

    const currentWeek = moment().isoWeek();

    const versions: VersionType[] = ["DAIRY", "ICECREAM", "MVP"];

    const groupedInventory: GroupedInventory = {
      email,
      week: currentWeek,
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

        const commonFields = {
          sku: skuItem.label,
          ...(skuKey ? { skuCode: skuKey } : {}),
          ...(skuItem.code ? { code: skuItem.code } : {}),
        };

        if (status === "Carried") {
          const beginning = Number(skuValues.beginning?.[v]?.[skuKey] || 0);
          const delivery = Number(skuValues.delivery?.[v]?.[skuKey] || 0);
          const rtvNo = skuValues.rtvNo?.[v] || "";
          const rtv = Number(skuValues.rtv?.[v]?.[skuKey] || 0);
          const rtvReason = skuValues.rtvReason?.[v]?.[skuKey] || "";
          const ending = Number(skuValues.ending?.[v]?.[skuKey] || 0);

          const adjustPlus = Number(skuValues[v]?.[skuKey]?.adjustPlus || 0);
          const adjustMinus = Number(skuValues[v]?.[skuKey]?.adjustMinus || 0);

          const offtake =
            beginning + delivery - rtv - ending + adjustPlus - adjustMinus;

          groupedInventory.versions[v][status].push({
            ...commonFields,
            beginningPCS: beginning,
            deliveryPCS: delivery,
            rtvNo,
            rtvPCS: rtv,
            rtvReason,
            endingPCS: ending,
            offtake,
            adjustPlus, // 👈 added
            adjustMinus,
            oos: Number(skuValues.oos?.[v]?.[skuKey] || 0),

            harvest: (skuValues.harvest?.[v]?.[skuKey] || [])
              .filter(
                (entry: { date?: string; quantity?: string | number }) =>
                  !!entry?.date &&
                  entry?.quantity !== "" &&
                  !isNaN(Number(entry.quantity)) &&
                  Number(entry.quantity) > 0
              )
              .map((entry: { date: string; quantity: string | number }) => ({
                date: entry.date,
                quantity: Number(entry.quantity),
              })),

            expiry: (skuValues.expiry?.[v]?.[skuKey] || [])
              .filter(
                (entry: { date?: string; quantity?: string | number }) =>
                  !!entry?.date &&
                  entry?.quantity !== "" &&
                  !isNaN(Number(entry.quantity)) &&
                  Number(entry.quantity) > 0
              )
              .map((entry: { date: string; quantity: string | number }) => ({
                date: entry.date,
                quantity: Number(entry.quantity),
              })),

            totalOfftake: offtake,
            usageCount: 0,
            avgOfftake: offtake,
          });
        }

        // 👇 Add this for Not Carried
        else if (status === "Not Carried") {
          groupedInventory.versions[v][status].push({
            sku: skuItem.label,
            ...(skuKey ? { skuCode: skuKey } : {}),
          });
        }
      }
    }

    // ✅ Negative offtake check
    let negativeByCategory: Record<string, string[]> = {};
    for (const v of versions) {
      const skus = skuData[v]?.filter((item) => item.value !== "") || [];
      for (const skuItem of skus) {
        const skuKey = skuItem.value;
        const beginning = Number(skuValues.beginning?.[v]?.[skuKey] || 0);
        const delivery = Number(skuValues.delivery?.[v]?.[skuKey] || 0);
        const rtv = Number(skuValues.rtv?.[v]?.[skuKey] || 0);
        const ending = Number(skuValues.ending?.[v]?.[skuKey] || 0);
        const offtake = beginning + delivery - rtv - ending;

        if (offtake < 0) {
          if (!negativeByCategory[v]) negativeByCategory[v] = [];
          negativeByCategory[v].push(skuItem.label);
        }
      }
    }

    if (Object.keys(negativeByCategory).length > 0) {
      setLoading(false);
      let message = "Negative offtake detected:\n\n";
      for (const [category, skus] of Object.entries(negativeByCategory)) {
        message += `📦 ${category}:\n  - ${skus.join("\n  - ")}\n\n`;
      }
      message += "Please review and adjust their values.";
      Alert.alert("Error", message);
      return;
    }

    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) return;

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
            INITIAL INVENTORY PROCESS
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
            label="Week"
            value={`Week ${currentWeek}`}
            onChangeText={() => {}}
            editable={false}
          />
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
            setValue={(callbackOrValue) => {
              const newValue =
                typeof callbackOrValue === "function"
                  ? callbackOrValue(selectedOutlet)
                  : callbackOrValue;

              // Change outlet
              setSelectedOutlet(newValue);

              // Clear all inputs
              setSkuValues({
                beginning: {},
                delivery: {},
                rtv: {},
                rtvReason: {},
                ending: {},
                oos: {},
                expiry: {},
                harvest: {},
              });
              setAvailability({});
              setVersion("");
              setSku("");
              setExpandedSection(null);
            }}
            setItems={setOutletOptions}
            searchable
            placeholder="Select Branch"
            listMode="SCROLLVIEW"
          />

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
                  return;
                }

                if (v === "MVP" || v === "ICECREAM" || v === "DAIRY") {
                  const b = skuValues.beginning?.[v]?.[key] || "";
                  const d = skuValues.delivery?.[v]?.[key] || "";
                  const e = skuValues.ending?.[v]?.[key] || "";

                  if (b !== "" && d !== "" && e !== "") {
                    completedSkuCount++;
                  }
                }
              });

              const isMvpOnlyBranch = mvpOnlyBranches.includes(selectedOutlet);

              let isDisabled;
              if (isMvpOnlyBranch) {
                isDisabled = v !== "MVP";
              } else {
                isDisabled =
                  (index === 1 &&
                    !(
                      skuData["DAIRY"]?.length &&
                      skuData["DAIRY"].every((sku) => {
                        const key = sku.value;
                        const avail = availability["DAIRY"]?.[key];
                        const b = skuValues.beginning?.["DAIRY"]?.[key] || "";
                        const d = skuValues.delivery?.["DAIRY"]?.[key] || "";
                        const e = skuValues.ending?.["DAIRY"]?.[key] || "";

                        return (
                          avail === "Not Carried" ||
                          avail === "Delisted" ||
                          (b !== "" && d !== "" && e !== "")
                        );
                      })
                    )) ||
                  (index === 2 &&
                    !(
                      skuData["ICECREAM"]?.length &&
                      skuData["ICECREAM"].every((sku) => {
                        const key = sku.value;
                        const avail = availability["ICECREAM"]?.[key];
                        const b =
                          skuValues.beginning?.["ICECREAM"]?.[key] || "";
                        const d = skuValues.delivery?.["ICECREAM"]?.[key] || "";
                        const e = skuValues.ending?.["ICECREAM"]?.[key] || "";

                        return (
                          avail === "Not Carried" ||
                          avail === "Delisted" ||
                          (b !== "" && d !== "" && e !== "")
                        );
                      })
                    ));
              }

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
                    setShowCarryPrompt(v); // ✅ always open the new SKU modal
                  }}
                  disabled={isDisabled}
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

            {/* Carry Prompt Modal/Inline */}
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
                      {(skuData[showCarryPrompt] || []).map((skuItem: any) => {
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
                          updatedAvailability[showCarryPrompt] = {
                            ...updatedAvailability[showCarryPrompt],
                            [key]: tempCarriedSelection?.[key]
                              ? "Carried"
                              : "Not Carried",
                          };
                        });

                        setAvailability(updatedAvailability);
                        setTempCarriedSelection({});
                        setShowCarryPrompt(null);
                        setVersion(showCarryPrompt);
                        setSku("");
                        setExpandedSection(null);
                        openCategoryForm(showCarryPrompt); // ✅ keep your existing logic
                      }}
                    />
                  </View>
                </View>
              </Modal>
            )}
          </View>

          {/* {version !== "MVP" && ( */}
          <View>
            {["Beginning", "Delivery", "RTV No.", "RTV"].map((section) => {
              const sectionKey = section.toLowerCase();

              if (section === "RTV No.") {
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
                          ? `Hide ${section}`
                          : `Expand ${section}`}
                      </Text>
                    </TouchableOpacity>

                    {expandedSection === section && (
                      <View
                        style={{
                          marginTop: 10,
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        {/* Left Label */}
                        <Text style={{ flex: 1, fontSize: 11 }}>
                          RTV NUMBER
                        </Text>

                        {/* Right Input */}
                        <TextInput
                          style={[
                            styles.inputBox,
                            {
                              flex: 1,
                              height: 40,
                              textAlign: "center",
                              borderColor: "#844515",
                              borderWidth: 1,
                              backgroundColor: "#FFFFFF",
                            },
                          ]}
                          placeholder="Enter RTV Number"
                          placeholderTextColor="#000000ff"
                          value={skuValues.rtvNo?.[version] || ""}
                          onChangeText={(text) => {
                            setSkuValues((prev: any) => ({
                              ...prev,
                              rtvNo: {
                                ...(prev.rtvNo || {}),
                                [version]: text,
                              },
                            }));
                          }}
                        />
                      </View>
                    )}
                  </View>
                );
              }

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
                    style={[
                      styles.expandButton,
                      sectionKey === "rtv" &&
                        !Object.values(skuValues?.rtvNo?.[version] || {}).some(
                          (val) => !!val
                        ) && {
                          opacity: 0.5, // visually indicate disabled
                        },
                    ]}
                    disabled={
                      sectionKey === "rtv" &&
                      !Object.values(skuValues?.rtvNo?.[version] || {}).some(
                        (val) => !!val
                      )
                    }
                    onPress={() => {
                      setExpandedSection((prev) =>
                        prev === section ? null : section
                      );
                    }}
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
                        const isRTV = sectionKey === "rtv";

                        const availabilityValue =
                          availability[version]?.[skuKey] ??
                          (isBeginning || isRTV ? "Carried" : "");

                        const isBeginningEditable =
                          isBeginning && availabilityValue === "Carried";
                        const isOtherSectionEditable =
                          !isBeginning &&
                          !isRTV &&
                          availability[version]?.[skuKey] === "Carried";

                        // Extra checks for RTV
                        const hasRTVReason = !!rtvReason?.[version]?.[skuKey];

                        const isEditable = isBeginning
                          ? isBeginningEditable
                          : isRTV
                          ? availabilityValue === "Carried" && hasRTVReason
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
                            {(isBeginning || isRTV) && (
                              <View
                                style={{
                                  flex: isBeginning || isRTV ? 0.5 : 1,
                                  marginHorizontal: 2,
                                  borderWidth: 1,
                                  borderColor: "#ccc",
                                  borderRadius: 4,
                                  overflow: "hidden",
                                  minWidth: isBeginning || isRTV ? 80 : 80,
                                  height: 50,
                                }}
                              >
                                {isBeginning ? (
                                  <>
                                    <Picker
                                      selectedValue={availabilityValue}
                                      style={{
                                        height: 50,
                                        width: "100%",
                                        backgroundColor: "white",
                                      }}
                                      itemStyle={{
                                        fontSize: 11,
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
                                                ...(prev.ending?.[version] ||
                                                  {}),
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
                                    <Icon
                                      name="arrow-drop-down"
                                      size={24}
                                      color="grey"
                                      style={{
                                        position: "absolute",
                                        right: 10,
                                        top: 13,
                                        pointerEvents: "none",
                                      }}
                                    />
                                  </>
                                ) : isRTV ? (
                                  <>
                                    <Picker
                                      selectedValue={
                                        rtvReason[version]?.[skuKey] || ""
                                      }
                                      style={{
                                        height: 50,
                                        width: "100%",
                                        backgroundColor: "white",
                                      }}
                                      itemStyle={{
                                        fontSize: 11,
                                      }}
                                      onValueChange={(value) => {
                                        setRtvReason((prev) => ({
                                          ...prev,
                                          [version]: {
                                            ...(prev[version] || {}),
                                            [skuKey]: value,
                                          },
                                        }));

                                        setSkuValues((prev: any) => ({
                                          ...prev,
                                          rtvReason: {
                                            ...(prev.rtvReason || {}),
                                            [version]: {
                                              ...(prev.rtvReason?.[version] ||
                                                {}),
                                              [skuKey]: value,
                                            },
                                          },
                                        }));

                                        if (value === "") {
                                          setSkuValues((prev: any) => ({
                                            ...prev,
                                            rtv: {
                                              ...(prev.rtv || {}),
                                              [version]: {
                                                ...(prev.rtv?.[version] || {}),
                                                [skuKey]: "",
                                              },
                                            },
                                          }));
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
                                    <Icon
                                      name="arrow-drop-down"
                                      size={24}
                                      color="grey"
                                      style={{
                                        position: "absolute",
                                        right: 10,
                                        top: 13,
                                        pointerEvents: "none",
                                      }}
                                    />
                                  </>
                                ) : null}
                              </View>
                            )}

                            {/* Quantity Input (editable only if Carried or RTV reason is selected) */}
                            <TextInput
                              style={[
                                styles.inputBox,
                                {
                                  width: 52,
                                  height: 40,
                                  marginLeft: isBeginning || isRTV ? 0 : 6,
                                  textAlign: "center",
                                  backgroundColor: isEditable
                                    ? "#FFFFFF"
                                    : "#f0f0f0",
                                  borderColor: isEditable ? "#844515" : "#ccc",
                                  borderWidth: 1,
                                },
                              ]}
                              keyboardType="numeric"
                              value={
                                skuValues[sectionKey]?.[version]?.[skuKey] || ""
                              }
                              onChangeText={(text) => {
                                if (/^\d*$/.test(text)) {
                                  setSkuValues((prev: any) => ({
                                    ...prev,
                                    [sectionKey]: {
                                      ...(prev[sectionKey] || {}),
                                      [version]: {
                                        ...(prev[sectionKey]?.[version] || {}),
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
            {(() => {
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
                            <Text style={styles.skuText}>{skuItem.label}</Text>

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
                                      ? "#844515"
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
                <View style={{ marginTop: 10 }}>
                  {/* Offtake Display */}
                  {filteredSkuOptions.map((skuItem) => {
                    const value = Number(
                      skuValues.offtake?.[version]?.[skuItem.value] || 0
                    );
                    const isNegative = value < 0;

                    return (
                      <TouchableOpacity
                        activeOpacity={1}
                        key={skuItem.value}
                        style={styles.skuItemRow}
                      >
                        <Text style={styles.skuText}>{skuItem.label}</Text>
                        <TextInput
                          placeholder="Offtake"
                          placeholderTextColor="grey"
                          style={[
                            styles.inputBox,
                            isNegative && {
                              borderColor: "red",
                              borderWidth: 2,
                              color: "red",
                            },
                          ]}
                          editable={false}
                          value={value === 0 ? "" : value.toFixed(2)}
                        />
                      </TouchableOpacity>
                    );
                  })}

                  {/* Adjustment Section */}
                  <View style={{ marginTop: 16 }}>
                    <TouchableOpacity
                      onPress={() => setShowAdjustment(!showAdjustment)}
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
                      <Text style={{ marginLeft: 6, color: "#844515" }}>
                        {showAdjustment ? "▲" : "▼"}
                      </Text>
                    </TouchableOpacity>

                    {showAdjustment && (
                      <TouchableOpacity
                        activeOpacity={1}
                        style={{ paddingLeft: 8 }}
                      >
                        {(filteredSkuOptions || []).map((sku: any) => {
                          const status =
                            availability[version]?.[sku.value] || "Carried"; // 👈 lookup
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
                              <Text style={[styles.skuText, { flex: 1 }]}>
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
                                    borderColor: isCarried ? "#4CAF50" : "#ccc",
                                    borderWidth: 1,
                                    marginHorizontal: 4,
                                    color: isCarried ? "#000000ff" : "#999",
                                  },
                                ]}
                                value={
                                  skuValues[version]?.[sku.value]?.adjustPlus ||
                                  ""
                                }
                                onChangeText={(text) =>
                                  isCarried &&
                                  handleAdjustment(
                                    "adjustPlus",
                                    sku.value,
                                    text
                                  )
                                }
                              />

                              {/* - Adjustment */}
                              <TextInput
                                placeholder="-"
                                placeholderTextColor="black"
                                keyboardType="numeric"
                                editable={isCarried} // 👈 disable if not carried
                                style={[
                                  styles.inputBox,
                                  {
                                    width: 50,
                                    height: 35,
                                    textAlign: "center",
                                    borderColor: isCarried ? "#F44336" : "#ccc",
                                    borderWidth: 1,
                                    marginHorizontal: 4,
                                    color: isCarried ? "#000000ff" : "#999",
                                  },
                                ]}
                                value={
                                  skuValues[version]?.[sku.value]
                                    ?.adjustMinus || ""
                                }
                                onChangeText={(text) =>
                                  isCarried &&
                                  handleAdjustment(
                                    "adjustMinus",
                                    sku.value,
                                    text
                                  )
                                }
                              />
                            </View>
                          );
                        })}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>

            <View style={{ marginVertical: 10 }}>
              {/* OOS Section */}
              {(() => {
                const section = "No. of Days OOS";
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
                          ? `Hide No. of Days OOS ${filledCount}/${totalSkuCount}`
                          : `Expand No. of Days OOS ${filledCount}/${totalSkuCount}`}
                      </Text>
                    </TouchableOpacity>

                    {expandedSection === section && (
                      <TouchableOpacity
                        activeOpacity={1}
                        style={{ marginTop: 10 }}
                      >
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
                                        ? "#844515"
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
                      </TouchableOpacity>
                    )}
                  </>
                );
              })()}
            </View>

            {version === "MVP" && (
              <TouchableOpacity
                activeOpacity={1}
                style={{ marginVertical: 10 }}
              >
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
                      let harvestEntries =
                        skuValues.harvest?.[version]?.[skuItem.value] || [];

                      // 🟢 Ensure there are always 6 rows
                      if (harvestEntries.length < 6) {
                        harvestEntries = [
                          ...harvestEntries,
                          ...Array.from(
                            { length: 6 - harvestEntries.length },
                            () => ({
                              date: "",
                              quantity: "",
                            })
                          ),
                        ];
                      }

                      return (
                        <View key={skuItem.value} style={{ marginBottom: 20 }}>
                          <Text style={[styles.skuText, { marginBottom: 6 }]}>
                            {skuItem.label}
                          </Text>

                          {(() => {
                            const skuKey = skuItem.value;
                            const availabilityValue =
                              availability[version]?.[skuKey] || "Carried"; // 🟢 Add this line

                            return harvestEntries.map(
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
                                    style={{ flex: 3, marginHorizontal: 8 }}
                                  >
                                    <TouchableOpacity
                                      style={{
                                        borderWidth: 1,
                                        borderColor:
                                          availabilityValue === "Carried"
                                            ? "#844515"
                                            : "#ccc",
                                        borderRadius: 4,
                                        paddingVertical: 10,
                                        paddingHorizontal: 12,
                                        backgroundColor:
                                          availabilityValue === "Carried"
                                            ? "#fff"
                                            : "#f0f0f0",
                                      }}
                                      onPress={() => {
                                        if (availabilityValue === "Carried") {
                                          setShowDatePicker({
                                            skuKey: skuItem.value,
                                            index,
                                          });
                                        }
                                      }}
                                      disabled={availabilityValue !== "Carried"}
                                    >
                                      <Text
                                        style={{
                                          fontSize: 14,
                                          color:
                                            availabilityValue === "Carried"
                                              ? "#000"
                                              : "#888",
                                        }}
                                      >
                                        {entry.date
                                          ? new Date(
                                              entry.date
                                            ).toLocaleDateString("en-PH")
                                          : "Select Expiry Date"}
                                      </Text>
                                    </TouchableOpacity>

                                    {showDatePicker?.skuKey === skuItem.value &&
                                      showDatePicker?.index === index &&
                                      availabilityValue === "Carried" && (
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
                                    editable={availabilityValue === "Carried"}
                                    style={[
                                      styles.inputBox,
                                      {
                                        flex: 2,
                                        height: 40,
                                        fontSize: 14,
                                        backgroundColor:
                                          availabilityValue === "Carried"
                                            ? "#fff"
                                            : "#f0f0f0",
                                        borderColor:
                                          availabilityValue === "Carried"
                                            ? "#844515"
                                            : "#ccc",
                                        borderWidth: 1,
                                        color:
                                          availabilityValue === "Carried"
                                            ? "#000"
                                            : "#888",
                                        marginLeft: 10,
                                      },
                                    ]}
                                    keyboardType="numeric"
                                    value={entry.quantity?.toString() || ""}
                                    onChangeText={(text) => {
                                      if (!entry.date) {
                                        Alert.alert(
                                          "Please select a date first."
                                        );
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
                            );
                          })()}
                        </View>
                      );
                    })}
                  </View>
                )}
              </TouchableOpacity>
            )}

            {(version === "DAIRY" || version === "ICECREAM") && (
              <TouchableOpacity
                activeOpacity={1}
                style={{ marginVertical: 10 }}
              >
                {(() => {
                  const section = "Expiry";
                  const sectionKey = "expiry";

                  const filledCount = (skuData[version] || []).filter(
                    (skuItem) => {
                      const skuKey = skuItem.value;
                      const entries =
                        skuValues[sectionKey]?.[version]?.[skuKey] || [];
                      const availStatus = availability[version]?.[skuKey];

                      return (
                        entries.some(
                          (entry: {
                            date: string;
                            quantity: string | number;
                          }) => entry.date && entry.quantity
                        ) ||
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
                            ? `Hide Near to Expired ${filledCount}/${totalSkuCount}`
                            : `Expand Near to Expired ${filledCount}/${totalSkuCount}`}
                        </Text>
                      </TouchableOpacity>

                      {expandedSection === section && (
                        <View style={{ marginTop: 10 }}>
                          {skuData[version]?.map((skuItem) => {
                            const skuKey = skuItem.value;
                            const availabilityValue =
                              availability[version]?.[skuKey] || "Carried";

                            let expiryEntries =
                              skuValues.expiry?.[version]?.[skuKey] || [];

                            // 🟢 Always enforce 6 rows
                            if (expiryEntries.length < 6) {
                              expiryEntries = [
                                ...expiryEntries,
                                ...Array.from(
                                  { length: 6 - expiryEntries.length },
                                  () => ({
                                    date: "",
                                    quantity: "",
                                  })
                                ),
                              ];
                            }

                            return (
                              <View
                                key={skuItem.value}
                                style={{ marginBottom: 20 }}
                              >
                                <Text
                                  style={[styles.skuText, { marginBottom: 6 }]}
                                >
                                  {skuItem.label}
                                </Text>

                                {expiryEntries.map(
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
                                        style={{ flex: 3, marginHorizontal: 8 }}
                                      >
                                        <TouchableOpacity
                                          style={{
                                            borderWidth: 1,
                                            borderColor:
                                              availabilityValue === "Carried"
                                                ? "#844515"
                                                : "#ccc",
                                            borderRadius: 4,
                                            paddingVertical: 10,
                                            paddingHorizontal: 12,
                                            backgroundColor:
                                              availabilityValue === "Carried"
                                                ? "#fff"
                                                : "#f0f0f0",
                                          }}
                                          onPress={() => {
                                            if (
                                              availabilityValue === "Carried"
                                            ) {
                                              setShowDatePicker({
                                                skuKey: skuItem.value,
                                                index,
                                              });
                                            }
                                          }}
                                          disabled={
                                            availabilityValue !== "Carried"
                                          }
                                        >
                                          <Text
                                            style={{
                                              fontSize: 14,
                                              color:
                                                availabilityValue === "Carried"
                                                  ? "#000"
                                                  : "#888",
                                            }}
                                          >
                                            {entry.date
                                              ? new Date(
                                                  entry.date
                                                ).toLocaleDateString("en-PH")
                                              : "Select Expiry Date"}
                                          </Text>
                                        </TouchableOpacity>

                                        {showDatePicker?.skuKey ===
                                          skuItem.value &&
                                          showDatePicker?.index === index &&
                                          availabilityValue === "Carried" && (
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
                                        editable={
                                          availabilityValue === "Carried"
                                        }
                                        style={[
                                          styles.inputBox,
                                          {
                                            flex: 2,
                                            height: 40,
                                            fontSize: 14,
                                            marginLeft: 10,
                                            backgroundColor:
                                              availabilityValue === "Carried"
                                                ? "#fff"
                                                : "#f0f0f0",
                                            borderColor:
                                              availabilityValue === "Carried"
                                                ? "#844515"
                                                : "#ccc",
                                            borderWidth: 1,
                                            color:
                                              availabilityValue === "Carried"
                                                ? "#000"
                                                : "#888",
                                          },
                                        ]}
                                        keyboardType="numeric"
                                        value={entry.quantity?.toString() || ""}
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
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </>
                  );
                })()}
              </TouchableOpacity>
            )}
          </View>

          {/* )} */}

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
