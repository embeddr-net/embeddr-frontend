import React from 'react'
import { DynamicPluginComponent } from './DynamicLoader'

export function PluginWindowContent(props: {
  pluginId: string
  componentName: string
  api: any
  [key: string]: any
}) {
  const { pluginId, componentName, api, ...rest } = props
  return (
    <DynamicPluginComponent
      pluginId={pluginId}
      componentName={componentName}
      api={api}
      {...rest}
    />
  )
}
