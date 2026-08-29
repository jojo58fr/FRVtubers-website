'use client'

import dynamic from 'next/dynamic'

const MagazineViewer = dynamic(() => import('./MagazineViewer'), {
  ssr: false,
  loading: () => <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    color: 'var(--text-secondary)',
    fontSize: '1.1rem'
  }}>Chargement du magazine...</div>
})

type MagazineViewerWrapperProps = {
  file: string
  title: string
  defaultNativeView?: boolean
}

const MagazineViewerWrapper = ({ file, title, defaultNativeView = false }: MagazineViewerWrapperProps) => {
  return <MagazineViewer file={file} title={title} defaultNativeView={defaultNativeView} />
}

export default MagazineViewerWrapper
