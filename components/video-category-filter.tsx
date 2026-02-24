'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Badge } from '@/components/ui/badge'

type Props = {
  categories: string[]
}

export function VideoCategoryFilter({ categories }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeCategory = searchParams.get('category')

  function handleSetCategory(category: string | null) {
    const params = new URLSearchParams(searchParams)
    if (category) {
      params.set('category', category)
    } else {
      params.delete('category')
    }
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Badge
        role="button"
        variant={!activeCategory ? 'default' : 'outline'}
        onClick={() => handleSetCategory(null)}
        aria-pressed={!activeCategory}
      >
        All
      </Badge>
      {categories.map((c) => (
        <Badge
          key={c}
          role="button"
          variant={activeCategory === c ? 'default' : 'outline'}
          onClick={() => handleSetCategory(c)}
          aria-pressed={activeCategory === c}
        >
          {c}
        </Badge>
      ))}
    </div>
  )
}
