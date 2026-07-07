import { GanttApp } from '@/components/organisms/GanttApp/GanttApp';

/**
 * The standup Gantt board. Data loading, loading/error/empty gates, the toolbar, and the
 * timeline canvas all live inside {@link GanttApp}.
 */
export default function HomePage() {
  return <GanttApp />;
}
