// src/components/ui/index.js
// Portal UI kit barrel — exports only components available in this project

// Core
export { default as Button } from './Button'
export { Input } from './Input'
export { default as Surface } from './Surface'
export { default as Tabs } from './Tabs'
export { default as Dialog } from './Dialog'
export { Select, MultiSelect } from './Select'
export { default as FilterBar } from './FilterBar'
export { default as ContextMenu } from './ContextMenu'

// DataDisplay
export { default as Badge } from './DataDisplay/Badge'
export { default as Tag } from './DataDisplay/Tag'
export { default as KpiCard } from './DataDisplay/KpiCard'
export { default as Stat } from './DataDisplay/Stat'
export { default as Progress } from './DataDisplay/Progress'
export { default as ProgressRing } from './DataDisplay/ProgressRing'

// Forms
export { Textarea } from './Forms/Textarea'
export { SearchInput } from './Forms/SearchInput'
export { HeaderSearch } from './Forms/HeaderSearch'
export { default as Label } from './Forms/Label'

// Layout
export { default as Card } from './Layout/Card'
export { default as Table } from './Layout/Table'
export { default as PageHeader } from './Layout/PageHeader'
export { default as SidebarLayout } from './Layout/SidebarLayout'

// Feedback
export { default as Alert } from './Feedback/Alert'
export { default as LoadingSpinner } from './Feedback/LoadingSpinner'
export { default as EmptyState } from './Feedback/EmptyState'
export { default as Toast } from './Feedback/Toast'

// Navigation
export { default as Pagination } from './Navigation/Pagination'
export { Tooltip } from './Navigation/Tooltip'
export { Dropdown } from './Navigation/Dropdown'
export { Popover } from './Navigation/Popover'
export { default as Breadcrumb } from './Navigation/Breadcrumb'
export { default as InnerNavigation } from './Navigation/InnerNavigation'
