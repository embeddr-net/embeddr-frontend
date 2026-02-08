// Registry to map component names (strings) to actual React components
import React from 'react'
// import { ClockWidget } from '../components/widgets/ClockWidget'
import { SystemMetricsWidget } from '../components/widgets/SystemMetricsWidget'
import { TaskbarWidget } from '../components/widgets/TaskbarWidget'
import { ZenToggleWidget } from '../components/widgets/ZenToggleWidget'

// We can extend this type as needed
export const COMPONENT_REGISTRY: Record<string, React.ComponentType<any>> = {
  // ClockWidget: ClockWidget,
  SystemMetricsWidget: SystemMetricsWidget,
  TaskbarWidget: TaskbarWidget,
  ZenToggleWidget: ZenToggleWidget,
}
