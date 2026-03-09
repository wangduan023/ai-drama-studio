import { Users, Edit, Trash2, Plus } from 'lucide-react'

export interface Character {
  id: string
  name: string
  role: string
  description?: string
  avatar?: string | null
  profileImage?: string | null
}

export interface CharacterListProps {
  characters: Character[]
  onEdit?: (character: Character) => void
  onDelete?: (characterId: string) => void
  onAdd?: () => void
  editable?: boolean
}

export function CharacterList({
  characters,
  onEdit,
  onDelete,
  onAdd,
  editable = false,
}: CharacterListProps) {
  return (
    <div className="space-y-3">
      {characters.map((character) => (
        <CharacterItem
          key={character.id}
          character={character}
          onEdit={onEdit}
          onDelete={onDelete}
          editable={editable}
        />
      ))}

      {onAdd && (
        <button
          onClick={onAdd}
          className="w-full card border-dashed hover:border-[var(--color-primary)] py-4 flex items-center justify-center gap-2 text-[var(--color-muted-fg)] hover:text-[var(--color-primary)] transition-colors"
        >
          <Plus className="h-5 w-5" />
          添加角色
        </button>
      )}
    </div>
  )
}

function CharacterItem({
  character,
  onEdit,
  onDelete,
  editable,
}: {
  character: Character
  onEdit?: (character: Character) => void
  onDelete?: (characterId: string) => void
  editable: boolean
}) {
  return (
    <div className="card flex items-center gap-4 p-4">
      <div className="w-16 h-16 rounded-lg bg-[var(--color-secondary)] flex items-center justify-center flex-shrink-0 overflow-hidden">
        {character.avatar || character.profileImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={character.avatar || character.profileImage || ''}
            alt={character.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Users className="h-8 w-8 text-[var(--color-muted-fg)]" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold truncate">{character.name}</h3>
        <p className="text-[var(--color-muted-fg)] text-sm">{character.role}</p>
        {character.description && (
          <p className="text-[var(--color-muted-fg)] text-sm line-clamp-1 mt-1">
            {character.description}
          </p>
        )}
      </div>

      {editable && (
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={() => onEdit(character)}
              className="p-2 rounded-lg hover:bg-[var(--color-muted)] text-[var(--color-muted-fg)] hover:text-[var(--foreground)] transition-colors"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(character.id)}
              className="p-2 rounded-lg hover:bg-[var(--color-muted)] text-[var(--color-muted-fg)] hover:text-[var(--color-error)] transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function CharacterListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card flex items-center gap-4 p-4 animate-pulse">
          <div className="w-16 h-16 rounded-lg bg-[var(--color-secondary)] flex-shrink-0" />
          <div className="flex-1">
            <div className="h-5 bg-[var(--color-secondary)] rounded w-32 mb-2" />
            <div className="h-4 bg-[var(--color-secondary)] rounded w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}
