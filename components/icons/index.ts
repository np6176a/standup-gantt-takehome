/**
 * Single icon entry point for the app. Icons come from TailGrids
 * (https://tailgrids.com/icons, `@tailgrids/icons`) — tree-shakable React SVG
 * components that stroke with `currentColor` (color them with `text-*`) and take
 * a `size` prop. Import icons from `@/components/icons` so the underlying set can
 * be swapped in one place; add curated re-exports here as the UI grows.
 */
export {
  Sun1 as SunIcon,
  MoonStar1 as MoonIcon,
  ColourPalette3 as PaletteIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ChevronDown as ChevronDownIcon,
  Calendar as CalendarIcon,
  Page as PageIcon,
  ErrorOctagon as BlockedIcon,
  InfoTriangle as OverdueIcon,
  Fire as ActiveIcon,
  Eye as EyeIcon,
  Close as CloseIcon,
  Xmark as XmarkIcon,
  ClockThree as ClockIcon,
  Check as CheckIcon,
  Minus as MinusIcon,
  Plus as PlusIcon,
  Filter as FilterIcon,
} from '@tailgrids/icons';

export { PrIcon } from '@/components/icons/PrIcon';
