import React from 'react'
import { DynamicPluginComponent } from './DynamicLoader'
import { PluginErrorBoundary } from './PluginErrorBoundary'

export function PluginWindowContent(props: {
  pluginId: string
  componentName: string
  api: any
  [key: string]: any
}) {
  const { pluginId, componentName, api, ...rest } = props
  return (
    <PluginErrorBoundary pluginId={pluginId} componentName={componentName}>
      <DynamicPluginComponent
        pluginId={pluginId}
        componentName={componentName}
        api={api}
        {...rest}
      />
    </PluginErrorBoundary>
  )
}
