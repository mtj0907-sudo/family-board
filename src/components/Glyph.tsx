import {
  Backpack,
  Baby,
  Bath,
  Blocks,
  BookOpen,
  Briefcase,
  Bus,
  Cake,
  Car,
  Dumbbell,
  Drama,
  Footprints,
  Gift,
  GraduationCap,
  Heart,
  House,
  LifeBuoy,
  MonitorPlay,
  Moon,
  Music,
  Palette,
  PartyPopper,
  PencilLine,
  Phone,
  Pin,
  Plane,
  School,
  ShoppingCart,
  Smile,
  Sparkles,
  Stethoscope,
  Umbrella,
  Users,
  Utensils,
  Waves,
  type LucideIcon,
} from 'lucide-react';

/**
 * 저장된 데이터에는 이모지가 들어 있습니다(예전 버전과 호환).
 * 화면에서는 이모지를 같은 모양의 선 아이콘으로 바꿔 보여줍니다. 목록에 없는 글자는 그대로 보여줍니다.
 */
export const ICONS: Record<string, LucideIcon> = {
  '🏠': House,
  '💼': Briefcase,
  '🚗': Car,
  '🧒': Baby,
  '🛒': ShoppingCart,
  '🎒': Backpack,
  '🏫': School,
  '😴': Moon,
  '🏃': Footprints,
  '🍚': Utensils,
  '🍽': Utensils,
  '✏️': PencilLine,
  '🥺': Smile,
  '❤️': Heart,
  '🆘': LifeBuoy,
  '📞': Phone,
  '☎️': Phone,
  '📺': MonitorPlay,
  '🧸': Blocks,
  '🛁': Bath,
  '📖': BookOpen,
  '📚': BookOpen,
  '🪥': Sparkles,
  '🎂': Cake,
  '🎓': GraduationCap,
  '🎨': Palette,
  '🎭': Drama,
  '🏥': Stethoscope,
  '🦷': Smile,
  '✈️': Plane,
  '🏖': Umbrella,
  '⚽': Dumbbell,
  '🎹': Music,
  '🎉': PartyPopper,
  '👪': Users,
  '🎁': Gift,
  '🏊': Waves,
  '🚌': Bus,
  '📌': Pin,
};

/** 일정·루틴 항목에서 고를 수 있는 아이콘(대표 이모지 키) */
export const ICON_CHOICES = [
  '📌', '🎂', '🎓', '🏫', '🎨', '🎭', '🏥', '🦷',
  '✈️', '🏖', '⚽', '🎹', '📚', '🛒', '🍽', '🎉',
  '👪', '🚗', '🎒', '💼', '🎁', '🏊', '🚌', '☎️',
  '🏠', '✏️', '🍚', '🪥', '🛁', '🧸', '📺', '😴',
];

export function Glyph({ k, size = 24, className }: { k: string; size?: number; className?: string }) {
  const Icon = ICONS[k];
  if (Icon) return <Icon size={size} strokeWidth={1.75} aria-hidden className={className} />;
  return (
    <span className={className} style={{ fontSize: size * 0.9, lineHeight: 1 }} aria-hidden>
      {k}
    </span>
  );
}
