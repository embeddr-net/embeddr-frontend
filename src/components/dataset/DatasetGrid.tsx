// import React from 'react'
// import type { DatasetItem } from '@/hooks/useDatasets'
// import { PairedDatasetGrid } from './PairedDatasetGrid'
// import { RegularDatasetGrid } from './RegularDatasetGrid'

// interface DatasetGridProps {
//   isLoading: boolean
//   filteredItems: Array<DatasetItem>
//   selectedItem: DatasetItem | null
//   setSelectedItem: (item: DatasetItem) => void
//   viewMode: 'base' | 'pair'
//   datasetId?: number
//   type: 'regular' | 'image_pair'
// }

// export function DatasetGrid({
//   isLoading,
//   filteredItems,
//   selectedItem,
//   setSelectedItem,
//   viewMode,
//   datasetId,
//   type,
// }: DatasetGridProps) {
//   if (type === 'image_pair') {
//     return (
//       <PairedDatasetGrid
//         isLoading={isLoading}
//         filteredItems={filteredItems}
//         selectedItem={selectedItem}
//         setSelectedItem={setSelectedItem}
//         viewMode={viewMode}
//         datasetId={datasetId}
//       />
//     )
//   }

//   return (
//     <RegularDatasetGrid
//       isLoading={isLoading}
//       filteredItems={filteredItems}
//       selectedItem={selectedItem}
//       setSelectedItem={setSelectedItem}
//       datasetId={datasetId}
//     />
//   )
// }
