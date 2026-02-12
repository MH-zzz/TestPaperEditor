import type { TagNode, TagTree, TagIndex } from '/types/tag'

export function createIdFromPath(path: string): string {
  let hash = 5381
  for (let i = 0; i < path.length; i++) {
    hash = ((hash << 5) + hash) + path.charCodeAt(i)
    hash = hash & 0xffffffff
  }
  return `t_${(hash >>> 0).toString(16)}`
}

export function ensureNodeIds(nodes: TagNode[], parentPath: string[] = []): TagNode[] {
  return nodes.map((node) => {
    const title = (node.title || '').trim()
    const path = [...parentPath, title].join('/')
    const id = node.id || createIdFromPath(path)
    const children = node.children ? ensureNodeIds(node.children, [...parentPath, title]) : undefined
    return { ...node, id, title, children }
  })
}

export function buildTagIndex(tree: TagTree): TagIndex {
  const byId: Record<string, TagNode> = {}
  const pathById: Record<string, string> = {}
  const rootById: Record<string, string> = {}

  const visit = (node: TagNode, pathParts: string[], rootTitle: string) => {
    const currentPath = [...pathParts, node.title].filter(Boolean)
    const path = currentPath.join('/')
    byId[node.id] = node
    pathById[node.id] = path
    rootById[node.id] = rootTitle
    if (node.children) {
      node.children.forEach(child => visit(child, currentPath, rootTitle))
    }
  }

  tree.forEach(node => {
    const rootTitle = node.title || ''
    visit(node, [], rootTitle)
  })
  return { byId, pathById, rootById }
}

export function addChildNode(tree: TagTree, parentId: string | null, child: TagNode): TagTree {
  if (!parentId) {
    return [...tree, child]
  }

  const visit = (nodes: TagNode[]): TagNode[] => {
    return nodes.map((node) => {
      if (node.id === parentId) {
        const children = node.children ? [...node.children, child] : [child]
        return { ...node, children }
      }
      if (!node.children) return node
      return { ...node, children: visit(node.children) }
    })
  }

  return visit(tree)
}

export function updateNodeTitle(tree: TagTree, id: string, title: string): TagTree {
  const visit = (nodes: TagNode[]): TagNode[] => {
    return nodes.map((node) => {
      if (node.id === id) {
        return { ...node, title }
      }
      if (!node.children) return node
      return { ...node, children: visit(node.children) }
    })
  }

  return visit(tree)
}

export function removeNodeById(tree: TagTree, id: string): TagTree {
  const visit = (nodes: TagNode[]): TagNode[] => {
    const filtered = nodes.filter(node => node.id !== id)
    return filtered.map((node) => {
      if (!node.children) return node
      return { ...node, children: visit(node.children) }
    })
  }

  return visit(tree)
}
