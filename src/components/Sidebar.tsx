import { ChevronDown, ChevronRight, File, FileCode, FileJson, Folder } from 'lucide-react'
import type { MouseEvent } from 'react'
import type { FileNode, FileType } from '../domain/fileNode'
import { useEditorStore } from '../state/editorStore'

function FileIcon({ name, type }: { name: string; type: FileType }) {
  if (type === 'folder') return <Folder size={16} className="text-blue-400" />
  if (name.endsWith('.tsx') || name.endsWith('.ts')) return <FileCode size={16} className="text-cyan-400" />
  if (name.endsWith('.json')) return <FileJson size={16} className="text-yellow-400" />
  return <File size={16} className="text-gray-400" />
}

function FileTreeItem({ node, level = 0 }: { node: FileNode; level?: number }) {
  const { toggleFolder, openFile, activeFileId } = useEditorStore()
  const isActive = activeFileId === node.id

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation()
    if (node.type === 'folder') {
      toggleFolder(node.id)
    } else {
      openFile(node.id)
    }
  }

  return (
    <div className="select-none">
      <div
        onClick={handleClick}
        className={`
          flex items-center py-1 px-2 cursor-pointer text-sm transition-colors duration-100
          ${isActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}
        `}
        style={{ paddingLeft: `${level * 12 + 12}px` }}
      >
        <span className="mr-1.5 opacity-70">
          {node.type === 'folder' && (node.isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />)}
          {node.type === 'file' && <span className="w-3" />}
        </span>
        <span className="mr-2">
          <FileIcon name={node.name} type={node.type} />
        </span>
        <span className="truncate">{node.name}</span>
      </div>
      {node.type === 'folder' && node.isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const { files, sidebarVisible } = useEditorStore()
  if (!sidebarVisible) return null

  return (
    <div className="w-64 h-full bg-[#111111] border-r border-white/5 flex flex-col shrink-0">
      <div className="h-9 flex items-center px-4 text-xs font-bold tracking-wider text-gray-500 uppercase border-b border-white/5">
        Explorer
      </div>
      <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">{files.map((node) => <FileTreeItem key={node.id} node={node} />)}</div>
    </div>
  )
}
