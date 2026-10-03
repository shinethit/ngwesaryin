import React from 'react';
import {
  Banknote,
  Briefcase,
  Car,
  CreditCard,
  Film,
  Gift,
  HeartHandshake,
  HeartPulse,
  Home,
  Landmark,
  Laptop,
  MoreHorizontal,
  PlusCircle,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Store,
  TrendingUp,
  Utensils,
  Wifi,
  Zap,
  Coffee,
  Fuel,
  GraduationCap,
  Plane,
  Baby,
  Dumbbell,
  BookOpen,
  Sparkles,
  Music,
  Tv,
  Coins,
  Shield,
  Tag,
  ArrowLeftRight,
  Bus,
  Wrench,
} from 'lucide-react';

export const AVAILABLE_CATEGORY_ICONS = [
  'ArrowLeftRight',
  'Utensils',
  'ShoppingBag',
  'Car',
  'Bus',
  'Wrench',
  'Home',
  'Coffee',
  'Fuel',
  'ShoppingCart',
  'HeartPulse',
  'Wifi',
  'Briefcase',
  'Store',
  'Laptop',
  'GraduationCap',
  'Plane',
  'Gift',
  'HeartHandshake',
  'Film',
  'Music',
  'Tv',
  'Dumbbell',
  'Baby',
  'BookOpen',
  'TrendingUp',
  'Coins',
  'Landmark',
  'Banknote',
  'CreditCard',
  'Smartphone',
  'Zap',
  'Sparkles',
  'Shield',
  'Tag',
  'MoreHorizontal',
];

interface CategoryIconProps {
  name?: string;
  iconName?: string;
  className?: string;
  size?: number;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, iconName, className = 'w-5 h-5', size }) => {
  const iconProps = { className, size };
  const targetName = iconName || name || 'Tag';

  switch (targetName) {
    case 'Briefcase':
      return <Briefcase {...iconProps} />;
    case 'Store':
      return <Store {...iconProps} />;
    case 'Laptop':
      return <Laptop {...iconProps} />;
    case 'Gift':
      return <Gift {...iconProps} />;
    case 'TrendingUp':
      return <TrendingUp {...iconProps} />;
    case 'PlusCircle':
      return <PlusCircle {...iconProps} />;
    case 'Utensils':
      return <Utensils {...iconProps} />;
    case 'ShoppingBag':
      return <ShoppingBag {...iconProps} />;
    case 'Car':
      return <Car {...iconProps} />;
    case 'Bus':
      return <Bus {...iconProps} />;
    case 'Wrench':
      return <Wrench {...iconProps} />;
    case 'Home':
      return <Home {...iconProps} />;
    case 'ShoppingCart':
      return <ShoppingCart {...iconProps} />;
    case 'HeartPulse':
      return <HeartPulse {...iconProps} />;
    case 'Wifi':
      return <Wifi {...iconProps} />;
    case 'HeartHandshake':
      return <HeartHandshake {...iconProps} />;
    case 'Film':
      return <Film {...iconProps} />;
    case 'Smartphone':
      return <Smartphone {...iconProps} />;
    case 'Zap':
      return <Zap {...iconProps} />;
    case 'Landmark':
      return <Landmark {...iconProps} />;
    case 'Banknote':
      return <Banknote {...iconProps} />;
    case 'CreditCard':
      return <CreditCard {...iconProps} />;
    case 'Coffee':
      return <Coffee {...iconProps} />;
    case 'Fuel':
      return <Fuel {...iconProps} />;
    case 'GraduationCap':
      return <GraduationCap {...iconProps} />;
    case 'Plane':
      return <Plane {...iconProps} />;
    case 'Baby':
      return <Baby {...iconProps} />;
    case 'Dumbbell':
      return <Dumbbell {...iconProps} />;
    case 'BookOpen':
      return <BookOpen {...iconProps} />;
    case 'Sparkles':
      return <Sparkles {...iconProps} />;
    case 'Music':
      return <Music {...iconProps} />;
    case 'Tv':
      return <Tv {...iconProps} />;
    case 'Coins':
      return <Coins {...iconProps} />;
    case 'Shield':
      return <Shield {...iconProps} />;
    case 'Tag':
      return <Tag {...iconProps} />;
    case 'ArrowLeftRight':
      return <ArrowLeftRight {...iconProps} />;
    default:
      return <MoreHorizontal {...iconProps} />;
  }
};
