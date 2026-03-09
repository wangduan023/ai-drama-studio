import { MapPin, Edit, Trash2, Plus } from 'lucide-react'

export interface Location {
  id: string
  name: string
  type: 'indoor' | 'outdoor' | string
  description?: string
  images?: string[]
}

export interface LocationListProps {
  locations: Location[]
  onEdit?: (location: Location) => void
  onDelete?: (locationId: string) => void
  onAdd?: () => void
  editable?: boolean
}

export function LocationList({
  locations,
  onEdit,
  onDelete,
  onAdd,
  editable = false,
}: LocationListProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {locations.map((location) => (
        <LocationCard
          key={location.id}
          location={location}
          onEdit={onEdit}
          onDelete={onDelete}
          editable={editable}
        />
      ))}

      {onAdd && (
        <button
          onClick={onAdd}
          className="card border-dashed hover:border-[var(--color-primary)] min-h-[200px] flex flex-col items-center justify-center gap-2 text-[var(--color-muted-fg)] hover:text-[var(--color-primary)] transition-colors"
        >
          <Plus className="h-8 w-8" />
          <span>添加场景</span>
        </button>
      )}
    </div>
  )
}

function LocationCard({
  location,
  onEdit,
  onDelete,
  editable,
}: {
  location: Location
  onEdit?: (location: Location) => void
  onDelete?: (locationId: string) => void
  editable: boolean
}) {
  return (
    <div className="card p-4">
      <div className="aspect-video rounded-lg bg-[var(--color-secondary)] mb-4 flex items-center justify-center overflow-hidden">
        {location.images && location.images.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={location.images[0]}
            alt={location.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <MapPin className="h-12 w-12 text-[var(--color-muted-fg)]" />
        )}
      </div>
      <h3 className="font-semibold mb-1 truncate">{location.name}</h3>
      <p className="text-[var(--color-muted-fg)] text-sm mb-2">{location.type}</p>
      {location.description && (
        <p className="text-[var(--color-muted-fg)] text-sm line-clamp-2">
          {location.description}
        </p>
      )}

      {editable && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border)]">
          {onEdit && (
            <button
              onClick={() => onEdit(location)}
              className="flex-1 btn btn-secondary text-sm py-1.5"
            >
              <Edit className="h-3 w-3" />
              编辑
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(location.id)}
              className="p-1.5 rounded-lg hover:bg-[var(--color-muted)] text-[var(--color-muted-fg)] hover:text-[var(--color-error)] transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function LocationListSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="card animate-pulse">
          <div className="aspect-video rounded-lg bg-[var(--color-secondary)] mb-4" />
          <div className="h-5 bg-[var(--color-secondary)] rounded w-3/4 mb-2" />
          <div className="h-4 bg-[var(--color-secondary)] rounded w-1/2" />
        </div>
      ))}
    </div>
  )
}
