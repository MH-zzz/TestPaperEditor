export interface TagNode {
  id: string
  title: string
  children?: TagNode[]
}

export type TagTree = TagNode[]

export interface TagIndex {
  byId: Record<string, TagNode>
  pathById: Record<string, string>
  rootById: Record<string, string>
}

export interface TagTreeSheet {
  title: string
  root: TagNode
}

// Legacy compatibility (to be removed after TagSelector migration)
export type TagCategory = string
export const TAG_CATEGORIES: Record<string, string> = {}
export const DEFAULT_TAGS: TagNode[] = []
