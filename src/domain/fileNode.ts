export type FileType = 'file' | 'folder'

export interface FileNode {
  id: string
  name: string
  type: FileType
  language?: string
  content?: string
  isOpen?: boolean
  children?: FileNode[]
  parentId?: string
}

export const INITIAL_FILES: FileNode[] = [
  {
    id: 'root',
    name: 'aether-project',
    type: 'folder',
    isOpen: true,
    children: [
      {
        id: 'src',
        name: 'src',
        type: 'folder',
        isOpen: true,
        parentId: 'root',
        children: [
          {
            id: 'App.tsx',
            name: 'App.tsx',
            type: 'file',
            language: 'typescript',
            parentId: 'src',
            content: `import React from 'react';\n\nexport default function App() {\n  return (\n    <div className=\"p-4\">\n      <h1>Welcome to Aether Code</h1>\n      <p>Supercharged by AI.</p>\n    </div>\n  );\n}`
          },
          {
            id: 'main.tsx',
            name: 'main.tsx',
            type: 'file',
            language: 'typescript',
            parentId: 'src',
            content: `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\n\nReactDOM.createRoot(document.getElementById('root')!).render(<App />);`
          },
          {
            id: 'utils',
            name: 'utils',
            type: 'folder',
            parentId: 'src',
            isOpen: false,
            children: [
              {
                id: 'helpers.ts',
                name: 'helpers.ts',
                type: 'file',
                language: 'typescript',
                parentId: 'utils',
                content: '// Helper functions go here'
              }
            ]
          }
        ]
      },
      {
        id: 'package.json',
        name: 'package.json',
        type: 'file',
        language: 'json',
        parentId: 'root',
        content: `{\n  \"name\": \"aether-demo\",\n  \"version\": \"1.0.0\"\n}`
      },
      {
        id: 'readme.md',
        name: 'README.md',
        type: 'file',
        language: 'markdown',
        parentId: 'root',
        content: `# Aether Code\n\nThe future of coding is here.`
      }
    ]
  }
]
