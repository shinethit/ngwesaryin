import React from 'react';
import {
  Activity,
  Ambulance,
  Anchor,
  Apple,
  Armchair,
  ArrowLeftRight,
  Baby,
  Backpack,
  Bandage,
  Banknote,
  BedDouble,
  Beer,
  Bell,
  Bike,
  Bone,
  BookOpen,
  Brain,
  Briefcase,
  Building2,
  Bus,
  CakeSlice,
  Calculator,
  Candy,
  Car,
  Carrot,
  Cat,
  ChartPie,
  ChefHat,
  Cherry,
  Clapperboard,
  Clock,
  Cloud,
  Coffee,
  Coins,
  Compass,
  Cookie,
  CreditCard,
  Croissant,
  CupSoda,
  Dices,
  Dog,
  Donut,
  Drumstick,
  Dumbbell,
  Egg,
  Eye,
  FileText,
  Film,
  Fish,
  Flag,
  Flame,
  Flower2,
  Footprints,
  Fuel,
  Gamepad2,
  Gauge,
  Gem,
  Gift,
  Glasses,
  Globe,
  GraduationCap,
  Grape,
  Guitar,
  Hammer,
  HandCoins,
  Headphones,
  Heart,
  HeartHandshake,
  HeartPulse,
  Home,
  IceCreamCone,
  KeyRound,
  Lamp,
  Landmark,
  Languages,
  Laptop,
  Library,
  Lightbulb,
  Lock,
  Luggage,
  MapPin,
  Martini,
  Medal,
  MessageCircle,
  Mic,
  Milk,
  Moon,
  MoreHorizontal,
  Mountain,
  Music,
  Palette,
  PartyPopper,
  Pencil,
  PersonStanding,
  PiggyBank,
  Pill,
  Pizza,
  Plane,
  PlusCircle,
  Presentation,
  Puzzle,
  Receipt,
  Recycle,
  Route,
  Ruler,
  Salad,
  Sandwich,
  Scale,
  School,
  ScrollText,
  Settings,
  Shield,
  Ship,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Snowflake,
  Sofa,
  Soup,
  Sparkles,
  Star,
  Stethoscope,
  Store,
  Sun,
  Syringe,
  Tag,
  Tent,
  Thermometer,
  Ticket,
  TrainFront,
  TrendingUp,
  Trophy,
  Truck,
  Tv,
  Umbrella,
  Users,
  Utensils,
  UtensilsCrossed,
  Wallet,
  Watch,
  Wifi,
  Wine,
  Wrench,
  Zap,
} from 'lucide-react';
import { pictorialIconUrl, resolvePictorialIcon } from '../utils/categoryPictures';

// [v7.6.28] Category icons, grouped so the picker can show headings.
// AVAILABLE_CATEGORY_ICONS is derived from the groups (single source
// of truth): every listed name appears in exactly one group. The
// original 36 names are all kept, in their groups, so categories
// saved earlier keep rendering. Names must be real lucide-react
// exports (verified in iconSet7628.test.ts against the installed
// package); each one has an import above and a switch case below.
export interface CategoryIconGroup {
  key: string;
  labelMy: string;
  labelEn: string;
  icons: string[];
}

export const CATEGORY_ICON_GROUPS: CategoryIconGroup[] = [
  {
    key: 'food',
    labelMy: 'အစားအသောက်',
    labelEn: 'Food & Drink',
    icons: [
      'Utensils',
      'Coffee',
      'Pizza',
      'Croissant',
      'CakeSlice',
      'IceCreamCone',
      'Beer',
      'Wine',
      'Milk',
      'Egg',
      'Fish',
      'Apple',
      'Carrot',
      'Salad',
      'Soup',
      'Sandwich',
      'Candy',
      'Cookie',
      'CupSoda',
      'Martini',
      'ChefHat',
      'UtensilsCrossed',
      'Drumstick',
      'Cherry',
      'Grape',
      'Donut',
    ],
  },
  {
    key: 'shopping-home',
    labelMy: 'ဈေးဝယ် / အိမ်',
    labelEn: 'Shopping & Home',
    icons: [
      'ShoppingBag',
      'ShoppingCart',
      'Store',
      'Home',
      'Baby',
      'Shirt',
      'Armchair',
      'Sofa',
      'Lamp',
      'BedDouble',
      'Glasses',
      'Watch',
      'Gem',
      'Dog',
      'Cat',
      'Flower2',
      'Hammer',
      'Lightbulb',
      'KeyRound',
      'Backpack',
    ],
  },
  {
    key: 'vehicle-travel',
    labelMy: 'ယာဉ် / ခရီး',
    labelEn: 'Vehicle & Travel',
    icons: [
      'Car',
      'Bus',
      'Fuel',
      'Wrench',
      'Plane',
      'Bike',
      'TrainFront',
      'Ship',
      'Anchor',
      'MapPin',
      'Compass',
      'Gauge',
      'Truck',
      'Route',
      'Tent',
      'Mountain',
      'Luggage',
    ],
  },
  {
    key: 'health',
    labelMy: 'ကျန်းမာရေး',
    labelEn: 'Health',
    icons: [
      'HeartPulse',
      'HeartHandshake',
      'Dumbbell',
      'Stethoscope',
      'Pill',
      'Syringe',
      'Thermometer',
      'Activity',
      'Brain',
      'Eye',
      'Bandage',
      'Ambulance',
      'PersonStanding',
      'Scale',
      'Footprints',
      'Bone',
    ],
  },
  {
    key: 'money-work',
    labelMy: 'ငွေ / အလုပ်',
    labelEn: 'Money & Work',
    icons: [
      'Briefcase',
      'Laptop',
      'TrendingUp',
      'Coins',
      'Landmark',
      'Banknote',
      'CreditCard',
      'Smartphone',
      'Zap',
      'Wifi',
      'Calculator',
      'Wallet',
      'PiggyBank',
      'HandCoins',
      'Receipt',
      'ChartPie',
      'Building2',
      'Clock',
      'FileText',
      'Presentation',
    ],
  },
  {
    key: 'entertainment',
    labelMy: 'ဖျော်ဖြေရေး / အားကစား',
    labelEn: 'Entertainment & Sport',
    icons: [
      'Film',
      'Music',
      'Tv',
      'Gift',
      'Sparkles',
      'Guitar',
      'Headphones',
      'Gamepad2',
      'Trophy',
      'Medal',
      'Dices',
      'Clapperboard',
      'Palette',
      'Puzzle',
      'PartyPopper',
      'Mic',
      'Ticket',
    ],
  },
  {
    key: 'learning-people',
    labelMy: 'ပညာ / လူမှု',
    labelEn: 'Learning & People',
    icons: [
      'GraduationCap',
      'BookOpen',
      'School',
      'Pencil',
      'Ruler',
      'Globe',
      'Languages',
      'Users',
      'Heart',
      'MessageCircle',
      'Library',
      'ScrollText',
    ],
  },
  {
    key: 'other',
    labelMy: 'အခြား',
    labelEn: 'Other',
    icons: [
      'Tag',
      'Shield',
      'MoreHorizontal',
      'ArrowLeftRight',
      'Star',
      'Bell',
      'Sun',
      'Moon',
      'Cloud',
      'Umbrella',
      'Flame',
      'Snowflake',
      'Recycle',
      'Lock',
      'Flag',
      'Settings',
    ],
  },
];

export const AVAILABLE_CATEGORY_ICONS: string[] =
  CATEGORY_ICON_GROUPS.flatMap((g) => g.icons);

interface CategoryIconProps {
  name?: string;
  iconName?: string;
  /** Category id: default ids resolve to their pictorial icon. */
  categoryId?: string | null;
  className?: string;
  size?: number;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, iconName, categoryId, className = 'w-5 h-5', size }) => {
  const iconProps = { className, size };
  const targetName = iconName || name || 'Tag';

  // [v7.6.47] Pictorial icons: an explicit `pic:` value, or the
  // default-category map, renders the bundled picture instead of
  // the lucide glyph. The picture is a full circle, so it keeps
  // the caller's size and clips to round; unknown values fall
  // through to the lucide switch below (never a broken image).
  const pictorialKey = resolvePictorialIcon({ categoryId, iconName: targetName });
  if (pictorialKey) {
    return (
      <img
        src={pictorialIconUrl(pictorialKey)}
        alt=""
        draggable={false}
        className={`${className} rounded-full object-cover shrink-0`}
      />
    );
  }

  switch (targetName) {
    case 'Utensils':
      return <Utensils {...iconProps} />;
    case 'Coffee':
      return <Coffee {...iconProps} />;
    case 'Pizza':
      return <Pizza {...iconProps} />;
    case 'Croissant':
      return <Croissant {...iconProps} />;
    case 'CakeSlice':
      return <CakeSlice {...iconProps} />;
    case 'IceCreamCone':
      return <IceCreamCone {...iconProps} />;
    case 'Beer':
      return <Beer {...iconProps} />;
    case 'Wine':
      return <Wine {...iconProps} />;
    case 'Milk':
      return <Milk {...iconProps} />;
    case 'Egg':
      return <Egg {...iconProps} />;
    case 'Fish':
      return <Fish {...iconProps} />;
    case 'Apple':
      return <Apple {...iconProps} />;
    case 'Carrot':
      return <Carrot {...iconProps} />;
    case 'Salad':
      return <Salad {...iconProps} />;
    case 'Soup':
      return <Soup {...iconProps} />;
    case 'Sandwich':
      return <Sandwich {...iconProps} />;
    case 'Candy':
      return <Candy {...iconProps} />;
    case 'Cookie':
      return <Cookie {...iconProps} />;
    case 'CupSoda':
      return <CupSoda {...iconProps} />;
    case 'Martini':
      return <Martini {...iconProps} />;
    case 'ChefHat':
      return <ChefHat {...iconProps} />;
    case 'UtensilsCrossed':
      return <UtensilsCrossed {...iconProps} />;
    case 'Drumstick':
      return <Drumstick {...iconProps} />;
    case 'Cherry':
      return <Cherry {...iconProps} />;
    case 'Grape':
      return <Grape {...iconProps} />;
    case 'Donut':
      return <Donut {...iconProps} />;
    case 'ShoppingBag':
      return <ShoppingBag {...iconProps} />;
    case 'ShoppingCart':
      return <ShoppingCart {...iconProps} />;
    case 'Store':
      return <Store {...iconProps} />;
    case 'Home':
      return <Home {...iconProps} />;
    case 'Baby':
      return <Baby {...iconProps} />;
    case 'Shirt':
      return <Shirt {...iconProps} />;
    case 'Armchair':
      return <Armchair {...iconProps} />;
    case 'Sofa':
      return <Sofa {...iconProps} />;
    case 'Lamp':
      return <Lamp {...iconProps} />;
    case 'BedDouble':
      return <BedDouble {...iconProps} />;
    case 'Glasses':
      return <Glasses {...iconProps} />;
    case 'Watch':
      return <Watch {...iconProps} />;
    case 'Gem':
      return <Gem {...iconProps} />;
    case 'Dog':
      return <Dog {...iconProps} />;
    case 'Cat':
      return <Cat {...iconProps} />;
    case 'Flower2':
      return <Flower2 {...iconProps} />;
    case 'Hammer':
      return <Hammer {...iconProps} />;
    case 'Lightbulb':
      return <Lightbulb {...iconProps} />;
    case 'KeyRound':
      return <KeyRound {...iconProps} />;
    case 'Backpack':
      return <Backpack {...iconProps} />;
    case 'Car':
      return <Car {...iconProps} />;
    case 'Bus':
      return <Bus {...iconProps} />;
    case 'Fuel':
      return <Fuel {...iconProps} />;
    case 'Wrench':
      return <Wrench {...iconProps} />;
    case 'Plane':
      return <Plane {...iconProps} />;
    case 'Bike':
      return <Bike {...iconProps} />;
    case 'TrainFront':
      return <TrainFront {...iconProps} />;
    case 'Ship':
      return <Ship {...iconProps} />;
    case 'Anchor':
      return <Anchor {...iconProps} />;
    case 'MapPin':
      return <MapPin {...iconProps} />;
    case 'Compass':
      return <Compass {...iconProps} />;
    case 'Gauge':
      return <Gauge {...iconProps} />;
    case 'Truck':
      return <Truck {...iconProps} />;
    case 'Route':
      return <Route {...iconProps} />;
    case 'Tent':
      return <Tent {...iconProps} />;
    case 'Mountain':
      return <Mountain {...iconProps} />;
    case 'Luggage':
      return <Luggage {...iconProps} />;
    case 'HeartPulse':
      return <HeartPulse {...iconProps} />;
    case 'HeartHandshake':
      return <HeartHandshake {...iconProps} />;
    case 'Dumbbell':
      return <Dumbbell {...iconProps} />;
    case 'Stethoscope':
      return <Stethoscope {...iconProps} />;
    case 'Pill':
      return <Pill {...iconProps} />;
    case 'Syringe':
      return <Syringe {...iconProps} />;
    case 'Thermometer':
      return <Thermometer {...iconProps} />;
    case 'Activity':
      return <Activity {...iconProps} />;
    case 'Brain':
      return <Brain {...iconProps} />;
    case 'Eye':
      return <Eye {...iconProps} />;
    case 'Bandage':
      return <Bandage {...iconProps} />;
    case 'Ambulance':
      return <Ambulance {...iconProps} />;
    case 'PersonStanding':
      return <PersonStanding {...iconProps} />;
    case 'Scale':
      return <Scale {...iconProps} />;
    case 'Footprints':
      return <Footprints {...iconProps} />;
    case 'Bone':
      return <Bone {...iconProps} />;
    case 'Briefcase':
      return <Briefcase {...iconProps} />;
    case 'Laptop':
      return <Laptop {...iconProps} />;
    case 'TrendingUp':
      return <TrendingUp {...iconProps} />;
    case 'Coins':
      return <Coins {...iconProps} />;
    case 'Landmark':
      return <Landmark {...iconProps} />;
    case 'Banknote':
      return <Banknote {...iconProps} />;
    case 'CreditCard':
      return <CreditCard {...iconProps} />;
    case 'Smartphone':
      return <Smartphone {...iconProps} />;
    case 'Zap':
      return <Zap {...iconProps} />;
    case 'Wifi':
      return <Wifi {...iconProps} />;
    case 'Calculator':
      return <Calculator {...iconProps} />;
    case 'Wallet':
      return <Wallet {...iconProps} />;
    case 'PiggyBank':
      return <PiggyBank {...iconProps} />;
    case 'HandCoins':
      return <HandCoins {...iconProps} />;
    case 'Receipt':
      return <Receipt {...iconProps} />;
    case 'ChartPie':
      return <ChartPie {...iconProps} />;
    case 'Building2':
      return <Building2 {...iconProps} />;
    case 'Clock':
      return <Clock {...iconProps} />;
    case 'FileText':
      return <FileText {...iconProps} />;
    case 'Presentation':
      return <Presentation {...iconProps} />;
    case 'Film':
      return <Film {...iconProps} />;
    case 'Music':
      return <Music {...iconProps} />;
    case 'Tv':
      return <Tv {...iconProps} />;
    case 'Gift':
      return <Gift {...iconProps} />;
    case 'Sparkles':
      return <Sparkles {...iconProps} />;
    case 'Guitar':
      return <Guitar {...iconProps} />;
    case 'Headphones':
      return <Headphones {...iconProps} />;
    case 'Gamepad2':
      return <Gamepad2 {...iconProps} />;
    case 'Trophy':
      return <Trophy {...iconProps} />;
    case 'Medal':
      return <Medal {...iconProps} />;
    case 'Dices':
      return <Dices {...iconProps} />;
    case 'Clapperboard':
      return <Clapperboard {...iconProps} />;
    case 'Palette':
      return <Palette {...iconProps} />;
    case 'Puzzle':
      return <Puzzle {...iconProps} />;
    case 'PartyPopper':
      return <PartyPopper {...iconProps} />;
    case 'Mic':
      return <Mic {...iconProps} />;
    case 'Ticket':
      return <Ticket {...iconProps} />;
    case 'GraduationCap':
      return <GraduationCap {...iconProps} />;
    case 'BookOpen':
      return <BookOpen {...iconProps} />;
    case 'School':
      return <School {...iconProps} />;
    case 'Pencil':
      return <Pencil {...iconProps} />;
    case 'Ruler':
      return <Ruler {...iconProps} />;
    case 'Globe':
      return <Globe {...iconProps} />;
    case 'Languages':
      return <Languages {...iconProps} />;
    case 'Users':
      return <Users {...iconProps} />;
    case 'Heart':
      return <Heart {...iconProps} />;
    case 'MessageCircle':
      return <MessageCircle {...iconProps} />;
    case 'Library':
      return <Library {...iconProps} />;
    case 'ScrollText':
      return <ScrollText {...iconProps} />;
    case 'Tag':
      return <Tag {...iconProps} />;
    case 'Shield':
      return <Shield {...iconProps} />;
    case 'ArrowLeftRight':
      return <ArrowLeftRight {...iconProps} />;
    case 'Star':
      return <Star {...iconProps} />;
    case 'Bell':
      return <Bell {...iconProps} />;
    case 'Sun':
      return <Sun {...iconProps} />;
    case 'Moon':
      return <Moon {...iconProps} />;
    case 'Cloud':
      return <Cloud {...iconProps} />;
    case 'Umbrella':
      return <Umbrella {...iconProps} />;
    case 'Flame':
      return <Flame {...iconProps} />;
    case 'Snowflake':
      return <Snowflake {...iconProps} />;
    case 'Recycle':
      return <Recycle {...iconProps} />;
    case 'Lock':
      return <Lock {...iconProps} />;
    case 'Flag':
      return <Flag {...iconProps} />;
    case 'Settings':
      return <Settings {...iconProps} />;
    case 'PlusCircle':
      return <PlusCircle {...iconProps} />;
    default:
      return <MoreHorizontal {...iconProps} />;
  }
};

/**
 * [v7.6.47] The coloured icon tile used across list rows, pickers,
 * calendars and budget views. When the category resolves to a
 * pictorial icon, the picture IS the tile (full-bleed circle, no
 * coloured background div); otherwise the classic coloured tile
 * with the white lucide glyph renders exactly as before. Size and
 * rounding are split into separate props so the pictorial branch
 * never carries a conflicting rounding class.
 */
export interface CategoryTileProps {
  categoryId?: string | null;
  icon?: string | null;
  /** Background colour of the lucide fallback tile. */
  color?: string;
  /** Tile size classes only, e.g. 'w-10 h-10 sm:w-11 sm:h-11'. */
  sizeClassName?: string;
  /** Rounding for the lucide tile only, e.g. 'rounded-2xl'. */
  roundedClassName?: string;
  /** Glyph size for the lucide fallback, e.g. 'w-5 h-5'. */
  iconClassName?: string;
  /** Extra classes (shadows, text colour) applied to both branches. */
  extraClassName?: string;
}

export const CategoryTile: React.FC<CategoryTileProps> = ({
  categoryId,
  icon,
  color,
  sizeClassName = 'w-10 h-10',
  roundedClassName = 'rounded-xl',
  iconClassName = 'w-5 h-5',
  extraClassName = '',
}) => {
  const pictorialKey = resolvePictorialIcon({ categoryId, iconName: icon });
  if (pictorialKey) {
    return (
      <img
        src={pictorialIconUrl(pictorialKey)}
        alt=""
        draggable={false}
        className={`${sizeClassName} rounded-full object-cover shrink-0 ${extraClassName}`}
      />
    );
  }
  return (
    <div
      className={`${sizeClassName} ${roundedClassName} flex items-center justify-center shrink-0 ${extraClassName}`}
      style={color ? { backgroundColor: color } : undefined}
    >
      <CategoryIcon name={icon || 'Tag'} className={iconClassName} />
    </div>
  );
};
