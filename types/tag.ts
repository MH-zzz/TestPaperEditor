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
