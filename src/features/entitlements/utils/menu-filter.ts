import type { MenuChildItem, MenuGroup, MenuItem } from '@/config/menu'

type Node = MenuItem | MenuChildItem

// Removes menu entries whose `feature` is hidden. `feature` may list several keys, in which
// case the entry stays while at least one of them is available (mirrors the backend's
// RequireAnyEntitlement). Entries without `feature` are never hidden by this filter. A parent whose children were all removed is dropped, and so is a
// group left without items. Pure: the input is not mutated.
function isFeatureHidden(
  feature: string | string[] | undefined,
  isHidden: (key: string) => boolean,
): boolean {
  if (!feature) return false
  if (typeof feature === 'string') return isHidden(feature)
  return feature.length > 0 && feature.every(isHidden)
}

function filterNode<T extends Node>(item: T, isHidden: (key: string) => boolean): T | null {
  if (isFeatureHidden(item.feature, isHidden)) return null
  if (!item.children?.length) return item

  const children = item.children
    .map((child) => filterNode(child, isHidden))
    .filter((child): child is MenuChildItem => child !== null)
  if (!children.length) return null
  return children.length === item.children.length ? item : { ...item, children }
}

export function filterMenuByEntitlement(
  groups: MenuGroup[],
  isHidden: (key: string) => boolean,
): MenuGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items
        .map((item) => filterNode(item, isHidden))
        .filter((item): item is MenuItem => item !== null),
    }))
    .filter((group) => group.items.length > 0)
}
