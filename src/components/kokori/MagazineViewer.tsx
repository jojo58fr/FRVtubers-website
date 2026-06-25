'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import HTMLFlipBook from 'react-pageflip'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChevronLeft,
  faChevronRight,
  faCompress,
  faDownload,
  faExpand,
  faMagnifyingGlass,
  faMagnifyingGlassMinus,
  faMagnifyingGlassPlus,
  faRotateRight,
} from '@fortawesome/free-solid-svg-icons'
import { Document, Page, pdfjs } from 'react-pdf'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import styles from './MagazineViewer.module.scss'

type MagazineViewerProps = {
  file: string
  title: string
}

type LayoutDimensions = {
  baseWidth: number
  baseHeight: number
  scaledWidth: number
  scaledHeight: number
  isDoubleLayout: boolean
}

type PreviewState = {
  pageNumber: number | null
  index: number
  leftPercent: number
  label: string
}

const workerSrc = '/pdf.worker.min.mjs'
const aspectRatio = 1.414
const MIN_SCALE = 0.6
const MAX_SCALE = 5
const SCALE_STEP = 0.2
const MAX_PAGE_WIDTH = 680
const FULLSCREEN_MAX_PAGE_WIDTH = 820
const DOUBLE_PAGE_BREAKPOINT = 960
const PREVIEW_WIDTH = 140
const MAX_RENDER_DEVICE_PIXEL_RATIO = 8

if (typeof window !== 'undefined') {
  if (typeof window.DOMMatrix === 'undefined') {
    window.DOMMatrix = class DOMMatrix {
      a = 1
      b = 0
      c = 0
      d = 1
      e = 0
      f = 0
      m11 = 1
      m12 = 0
      m21 = 0
      m22 = 1
      m41 = 0
      m42 = 0

      constructor() {}

      multiplySelf() {
        return this
      }

      preMultiplySelf() {
        return this
      }

      translateSelf(x = 0, y = 0) {
        this.e += x
        this.f += y
        this.m41 = this.e
        this.m42 = this.f
        return this
      }

      scaleSelf(x = 1, y?: number) {
        const scaleY = typeof y === 'number' ? y : x
        this.a *= x
        this.d *= scaleY
        this.m11 = this.a
        this.m22 = this.d
        return this
      }

      rotateSelf() {
        return this
      }

      skewXSelf() {
        return this
      }

      skewYSelf() {
        return this
      }

      invertSelf() {
        return this
      }

      toFloat32Array() {
        return new Float32Array([this.a, this.b, 0, 0, this.c, this.d, 0, 0, 0, 0, 1, 0, this.e, this.f, 0, 1])
      }

      transformPoint(point?: { x?: number; y?: number; z?: number }) {
        const px = point?.x ?? 0
        const py = point?.y ?? 0
        const pz = point?.z ?? 0

        return {
          x: this.a * px + this.c * py + this.e,
          y: this.b * px + this.d * py + this.f,
          z: pz,
          w: 1,
        }
      }
    } as any
  }

  if (pdfjs.GlobalWorkerOptions.workerSrc !== workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc
  }
}

const MagazineViewer = ({ file, title }: MagazineViewerProps) => {
  const viewerRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const zoomMenuRef = useRef<HTMLDivElement | null>(null)
  const flipBookRef = useRef<any>(null)
  const progressRef = useRef<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = useState<number>(0)
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 })
  const [numPages, setNumPages] = useState<number>(0)
  const [scale, setScale] = useState<number>(1)
  const [zoomMenuOpen, setZoomMenuOpen] = useState<boolean>(false)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [currentEntryIndex, setCurrentEntryIndex] = useState<number>(0)
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null)
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState<boolean>(false)
  const [previewState, setPreviewState] = useState<PreviewState | null>(null)
  const [sliderDraftValue, setSliderDraftValue] = useState<number | null>(null)
  const [isSliderPointerActive, setIsSliderPointerActive] = useState<boolean>(false)

  const panStateRef = useRef<{
    pointerId: number | null
    startX: number
    startY: number
    originX: number
    originY: number
  }>({
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  })

  const pendingPageRef = useRef<number | null>(null)

  useEffect(() => {
    const element = contentRef.current
    if (!element) {
      return
    }

    const updateWidth = () => {
      const computedStyle = window.getComputedStyle(element)
      const paddingLeft = Number.parseFloat(computedStyle.paddingLeft) || 0
      const paddingRight = Number.parseFloat(computedStyle.paddingRight) || 0
      const paddingTop = Number.parseFloat(computedStyle.paddingTop) || 0
      const paddingBottom = Number.parseFloat(computedStyle.paddingBottom) || 0

      const rawWidth = Math.max(element.clientWidth - paddingLeft - paddingRight, 0)
      const rawHeight = Math.max(element.clientHeight - paddingTop - paddingBottom, 0)

      setContainerWidth(rawWidth)
      setViewportSize({
        width: rawWidth,
        height: rawHeight,
      })
    }

    updateWidth()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth)
      return () => window.removeEventListener('resize', updateWidth)
    }

    const observer = new ResizeObserver(updateWidth)
    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  const getFullscreenElement = useCallback(() => {
    if (typeof document === 'undefined') {
      return null
    }

    return (
      document.fullscreenElement ??
      (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement ??
      (document as unknown as { mozFullScreenElement?: Element }).mozFullScreenElement ??
      (document as unknown as { msFullscreenElement?: Element }).msFullscreenElement ??
      null
    )
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    const handleFullscreenChange = () => {
      setIsFullscreen(getFullscreenElement() === viewerRef.current)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange as EventListener)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange as EventListener)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange as EventListener)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange as EventListener)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange as EventListener)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange as EventListener)
    }
  }, [getFullscreenElement])

  useEffect(() => {
    if (isFullscreen) {
      setZoomMenuOpen(false)
    }
  }, [isFullscreen])

  useEffect(() => {
    if (!zoomMenuOpen) {
      return
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!zoomMenuRef.current) {
        return
      }

      if (!zoomMenuRef.current.contains(event.target as Node)) {
        setZoomMenuOpen(false)
      }
    }

    const handleKeyDownDocument = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setZoomMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDownDocument)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDownDocument)
    }
  }, [zoomMenuOpen])

  useEffect(() => {
    setCurrentEntryIndex(0)
    setPanOffset({ x: 0, y: 0 })
    setPreviewState(null)
    pendingPageRef.current = null
  }, [numPages])

  const handleDocumentLoad = (pdf: PDFDocumentProxy) => {
    setNumPages(pdf.numPages)
    setLoadError(null)
    setPdfDocument(pdf)
    setPreviewState(null)
    pendingPageRef.current = null
  }

  const handleDocumentError = useCallback((error: Error) => {
    console.error('Failed to load Kokori Mag PDF', error)
    setLoadError("Le magazine n'a pas pu etre charge. Verifiez le fichier PDF.")
    setPdfDocument(null)
    setPreviewState(null)
    pendingPageRef.current = null
  }, [])

  const toggleZoomMenu = () => {
    setZoomMenuOpen((value) => !value)
  }

  const toggleFullscreen = useCallback(() => {
    const element = viewerRef.current

    if (!element) {
      return
    }

    const fullscreenElement = getFullscreenElement()

    if (fullscreenElement) {
      const exitFullscreen =
        document.exitFullscreen ??
        (document as unknown as { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen ??
        (document as unknown as { mozCancelFullScreen?: () => Promise<void> }).mozCancelFullScreen ??
        (document as unknown as { msExitFullscreen?: () => Promise<void> }).msExitFullscreen

      exitFullscreen?.call(document)
      return
    }

    const requestFullscreen =
      element.requestFullscreen ??
      (element as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen ??
      (element as unknown as { mozRequestFullScreen?: () => Promise<void> }).mozRequestFullScreen ??
      (element as unknown as { msRequestFullscreen?: () => Promise<void> }).msRequestFullscreen

    requestFullscreen?.call(element)
  }, [getFullscreenElement])

  const documentOptions = useMemo(
    () => ({
      cMapUrl: '/pdfjs/',
      cMapPacked: true,
      wasmUrl: '/pdfjs/openjpeg.wasm/',
    }),
    [],
  )

  const pageEntries = useMemo(() => {
    if (numPages <= 0) {
      return []
    }

    const needsBlankPage = numPages % 2 !== 0
    const totalPages = needsBlankPage ? numPages + 1 : numPages

    return Array.from({ length: totalPages }, (_, index) => {
      const pageNumber = index < numPages ? index + 1 : null
      return { pageNumber, index }
    })
  }, [numPages])

  const layout = useMemo<LayoutDimensions>(() => {
    if (containerWidth <= 0 || (isFullscreen && viewportSize.height <= 0)) {
      return {
        baseWidth: 0,
        baseHeight: 0,
        scaledWidth: 0,
        scaledHeight: 0,
        isDoubleLayout: false,
      }
    }

    const isDoubleLayout = containerWidth >= DOUBLE_PAGE_BREAKPOINT
    const columns = isDoubleLayout ? 2 : 1
    const gutter = isDoubleLayout ? (isFullscreen ? 48 : 96) : isFullscreen ? 16 : 32
    const available = Math.max(containerWidth - gutter, 0)
    const rawBaseWidth = columns > 0 ? available / columns : available
    const maxPageWidth = isFullscreen ? FULLSCREEN_MAX_PAGE_WIDTH : MAX_PAGE_WIDTH
    let baseWidth = Math.min(maxPageWidth, rawBaseWidth)

    if (isFullscreen) {
      const availableHeight = Math.max(viewportSize.height, 0)
      const maxWidthFromHeight = availableHeight / aspectRatio
      baseWidth = Math.min(baseWidth, maxWidthFromHeight)

      if (rawBaseWidth >= 260 && maxWidthFromHeight >= 260) {
        baseWidth = Math.max(260, baseWidth)
      }
    } else if (rawBaseWidth >= 260) {
      baseWidth = Math.max(260, baseWidth)
    }

    if (!(baseWidth > 0)) {
      return {
        baseWidth: 0,
        baseHeight: 0,
        scaledWidth: 0,
        scaledHeight: 0,
        isDoubleLayout,
      }
    }

    const baseHeight = Math.round(baseWidth * aspectRatio)
    const scaledWidth = Math.round(baseWidth * scale)
    const scaledHeight = Math.round(baseHeight * scale)

    return { baseWidth, baseHeight, scaledWidth, scaledHeight, isDoubleLayout }
  }, [containerWidth, isFullscreen, scale, viewportSize.height])

  const pageWidth = layout.baseWidth
  const pageHeight = layout.baseHeight
  const scaledWidth = layout.scaledWidth
  const scaledHeight = layout.scaledHeight
  const isZoomedMode = scale > 1
  const isMobileLayout = containerWidth > 0 && containerWidth <= 768
  const defaultSpreadSize = layout.isDoubleLayout ? 2 : 1

  const canRenderBook =
    !loadError &&
    pageWidth > 0 &&
    pageHeight > 0 &&
    scaledWidth > 0 &&
    scaledHeight > 0 &&
    numPages > 0

  const totalEntries = pageEntries.length
  const totalPages = Math.max(numPages, 0)
  const toolbarZoomPercent = useMemo(() => {
    const ratio = (scale - MIN_SCALE) / (MAX_SCALE - MIN_SCALE)
    return `${Math.min(100, Math.max(0, ratio * 100))}%`
  }, [scale])
  const pageRenderDevicePixelRatio = useMemo(() => {
    const baseDevicePixelRatio =
      typeof window !== 'undefined' && window.devicePixelRatio > 0 ? window.devicePixelRatio : 1

    return Math.min(MAX_RENDER_DEVICE_PIXEL_RATIO, baseDevicePixelRatio)
  }, [])
  const getEntryIndexForPage = useCallback(
    (pageNumber: number) => {
      if (totalEntries === 0) {
        return 0
      }

      const safePage =
        numPages > 0 ? Math.min(Math.max(Math.round(pageNumber), 1), numPages) : 1

      const foundIndex = pageEntries.findIndex((entry) => entry.pageNumber === safePage)
      if (foundIndex >= 0) {
        return foundIndex
      }

      return totalEntries - 1
    },
    [numPages, pageEntries, totalEntries],
  )

  const getSpreadStartIndex = useCallback(
    (index: number) => {
      if (totalEntries <= 0 || numPages <= 0) {
        return 0
      }

      const maxRealPageIndex = Math.max(numPages - 1, 0)
      const clamped = Math.max(0, Math.min(index, maxRealPageIndex))
      if (!layout.isDoubleLayout) {
        return clamped
      }

      if (clamped === 0) {
        return 0
      }

      if (numPages % 2 === 0 && clamped === maxRealPageIndex) {
        return maxRealPageIndex
      }

      return clamped % 2 === 0 ? clamped - 1 : clamped
    },
    [layout.isDoubleLayout, numPages, totalEntries],
  )

  const getSpreadPageIndices = useCallback(
    (startIndex: number) => {
      if (totalEntries <= 0 || numPages <= 0) {
        return [] as number[]
      }

      const maxRealPageIndex = Math.max(numPages - 1, 0)
      const normalizedStartIndex = getSpreadStartIndex(startIndex)

      if (!layout.isDoubleLayout) {
        return [normalizedStartIndex]
      }

      if (normalizedStartIndex === 0) {
        return [0]
      }

      if (numPages % 2 === 0 && normalizedStartIndex === maxRealPageIndex) {
        return [normalizedStartIndex]
      }

      const indices = [normalizedStartIndex]
      if (normalizedStartIndex + 1 <= maxRealPageIndex) {
        indices.push(normalizedStartIndex + 1)
      }
      return indices
    },
    [getSpreadStartIndex, layout.isDoubleLayout, numPages, totalEntries],
  )

  const getAdjacentSpreadStartIndex = useCallback(
    (startIndex: number, direction: -1 | 1) => {
      if (totalEntries <= 0 || numPages <= 0) {
        return 0
      }

      const maxRealPageIndex = Math.max(numPages - 1, 0)
      const normalizedStartIndex = getSpreadStartIndex(startIndex)

      if (!layout.isDoubleLayout) {
        return Math.max(0, Math.min(normalizedStartIndex + direction, maxRealPageIndex))
      }

      if (direction > 0) {
        if (normalizedStartIndex === 0) {
          return numPages > 1 ? 1 : 0
        }

        const nextStartIndex = normalizedStartIndex + 2
        return nextStartIndex > maxRealPageIndex ? normalizedStartIndex : nextStartIndex
      }

      if (normalizedStartIndex <= 1) {
        return 0
      }

      return normalizedStartIndex - 2
    },
    [getSpreadStartIndex, layout.isDoubleLayout, numPages, totalEntries],
  )

  const currentSpreadStartIndex = getSpreadStartIndex(currentEntryIndex)

  const currentPageNumber = useMemo(() => {
    const entry = pageEntries[currentSpreadStartIndex]
    if (entry?.pageNumber) {
      return entry.pageNumber
    }
    return totalPages > 0 ? totalPages : 1
  }, [currentSpreadStartIndex, pageEntries, totalPages])
  const currentZoomEntries = useMemo(
    () => getSpreadPageIndices(currentSpreadStartIndex).map((pageIndex) => pageEntries[pageIndex]).filter(Boolean),
    [currentSpreadStartIndex, getSpreadPageIndices, pageEntries],
  )
  const currentVisibleSpreadSize = currentZoomEntries.length > 0 ? currentZoomEntries.length : defaultSpreadSize

  const baseContentWidth = useMemo(() => {
    if (isZoomedMode) {
      return layout.baseWidth * currentVisibleSpreadSize
    }

    return layout.baseWidth * defaultSpreadSize
  }, [currentVisibleSpreadSize, defaultSpreadSize, isZoomedMode, layout.baseWidth])

  const baseContentHeight = layout.baseHeight
  const scaledContentWidth = baseContentWidth * scale
  const scaledContentHeight = baseContentHeight * scale

  const progressFillPercent = useMemo(() => {
    if (totalPages <= 1) {
      return 100
    }
    const currentZeroBased = Math.max(0, Math.min(currentPageNumber - 1, totalPages - 1))
    const ratio = currentZeroBased / (totalPages - 1)
    return Math.min(100, Math.max(0, Number.isFinite(ratio) ? ratio * 100 : 0))
  }, [currentPageNumber, totalPages])
  const currentSliderValue = useMemo(
    () => Math.min(Math.max(currentPageNumber - 1, 0), Math.max(totalPages - 1, 0)),
    [currentPageNumber, totalPages],
  )
  const displayedSliderValue = sliderDraftValue ?? currentSliderValue
  const toolbarPageLabel = useMemo(() => {
    const safeCurrentPage = Math.min(Math.max(currentPageNumber, 1), Math.max(totalPages, 1))
    const safeTotalPages = Math.max(totalPages, 1)

    if (isMobileLayout) {
      return `${safeCurrentPage}/${safeTotalPages}`
    }

    return `Page ${safeCurrentPage} / ${safeTotalPages}`
  }, [currentPageNumber, isMobileLayout, totalPages])

  const clampOffset = useCallback(
    (nextX: number, nextY: number) => {
      const visibleWidth = viewportSize.width
      const visibleHeight = viewportSize.height

      if (
        visibleWidth <= 0 ||
        visibleHeight <= 0 ||
        scaledContentWidth <= 0 ||
        scaledContentHeight <= 0
      ) {
        return { x: 0, y: 0 }
      }

      const maxX = scaledContentWidth > visibleWidth ? (scaledContentWidth - visibleWidth) / 2 : 0
      const maxY = scaledContentHeight > visibleHeight ? (scaledContentHeight - visibleHeight) / 2 : 0

      const clampedX = Math.max(-maxX, Math.min(maxX, nextX))
      const clampedY = Math.max(-maxY, Math.min(maxY, nextY))

      return { x: clampedX, y: clampedY }
    },
    [scaledContentHeight, scaledContentWidth, viewportSize.height, viewportSize.width],
  )

  const panEnabled = useMemo(() => {
    if (scale <= 1 || !pdfDocument) {
      return false
    }

    const visibleWidth = viewportSize.width
    const visibleHeight = viewportSize.height

    return (
      (scaledContentWidth > visibleWidth + 1 && visibleWidth > 0) ||
      (scaledContentHeight > visibleHeight + 1 && visibleHeight > 0)
    )
  }, [pdfDocument, scale, scaledContentHeight, scaledContentWidth, viewportSize.height, viewportSize.width])

  useEffect(() => {
    setPanOffset((current) => {
      if (!panEnabled || !pdfDocument) {
        if (current.x === 0 && current.y === 0) {
          return current
        }
        return { x: 0, y: 0 }
      }

      const clamped = clampOffset(current.x, current.y)
      if (clamped.x === current.x && clamped.y === current.y) {
        return current
      }
      return clamped
    })
  }, [clampOffset, panEnabled, pdfDocument])

  useEffect(() => {
    if (scale <= 1) {
      setPanOffset((current) => {
        if (current.x === 0 && current.y === 0) {
          return current
        }
        return { x: 0, y: 0 }
      })
    }
  }, [scale])

  const navigatePageFlipTo = useCallback((targetPageZero: number) => {
    const instance = flipBookRef.current?.pageFlip?.()
    if (!instance) {
      return false
    }

    const attempts: Array<(pageIndex: number) => void> = []

    if (typeof instance.turnToPage === 'function') {
      attempts.push((pageIndex) => instance.turnToPage(pageIndex))
    }

    if (typeof instance.turnToPageIndex === 'function') {
      attempts.push((pageIndex) => instance.turnToPageIndex(pageIndex))
    }

    if (typeof instance.goToPage === 'function') {
      attempts.push((pageIndex) => instance.goToPage(pageIndex))
    }

    if (typeof instance.flip === 'function') {
      attempts.push((pageIndex) => instance.flip(pageIndex))
      attempts.push((pageIndex) => instance.flip({ page: pageIndex }))
    }

    for (const attempt of attempts) {
      try {
        attempt(targetPageZero)
        return true
      } catch {
        continue
      }
    }

    return false
  }, [])

  const stepPageFlip = useCallback((methodNames: string[]) => {
    const pageFlipInstance = flipBookRef.current?.pageFlip?.()
    if (!pageFlipInstance) {
      return false
    }

    const instance = pageFlipInstance as Record<string, unknown>

    for (const methodName of methodNames) {
      const method = instance[methodName]
      if (typeof method === 'function') {
        ;(method as (...args: unknown[]) => void).call(pageFlipInstance)
        return true
      }
    }

    return false
  }, [])

  const syncCurrentEntryWithVisiblePage = useCallback(() => {
    if (isZoomedMode || totalEntries === 0 || !pdfDocument) {
      return
    }

    const visiblePageIndex = flipBookRef.current?.pageFlip?.()?.getCurrentPageIndex?.()
    if (typeof visiblePageIndex !== 'number') {
      return
    }

    const entryIndex = getEntryIndexForPage(visiblePageIndex + 1)
    const normalizedEntryIndex = getSpreadStartIndex(entryIndex)

    setCurrentEntryIndex((current) => {
      if (current === normalizedEntryIndex) {
        return current
      }
      return normalizedEntryIndex
    })
  }, [getEntryIndexForPage, getSpreadStartIndex, isZoomedMode, pdfDocument, totalEntries])

  const handleZoomIn = useCallback(() => {
    syncCurrentEntryWithVisiblePage()
    setScale((value) => Math.min(MAX_SCALE, Math.round((value + SCALE_STEP) * 100) / 100))
  }, [syncCurrentEntryWithVisiblePage])

  const handleZoomOut = useCallback(() => {
    syncCurrentEntryWithVisiblePage()
    setScale((value) => Math.max(MIN_SCALE, Math.round((value - SCALE_STEP) * 100) / 100))
  }, [syncCurrentEntryWithVisiblePage])

  const handleZoomReset = useCallback(() => {
    syncCurrentEntryWithVisiblePage()
    setScale(1)
    setPanOffset({ x: 0, y: 0 })
  }, [syncCurrentEntryWithVisiblePage])

  const handleZoomSliderChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextScale = Number.parseFloat(event.target.value)
      if (!Number.isFinite(nextScale)) {
        return
      }

      syncCurrentEntryWithVisiblePage()
      setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(nextScale * 100) / 100)))
    },
    [syncCurrentEntryWithVisiblePage],
  )

  const goToEntryIndex = useCallback(
    (targetIndex: number) => {
      if (totalEntries === 0 || !pdfDocument) {
        pendingPageRef.current = null
        return
      }

      const clamped = Math.max(0, Math.min(targetIndex, totalEntries - 1))
      const normalizedTargetIndex = getSpreadStartIndex(clamped)
      if (normalizedTargetIndex === currentSpreadStartIndex) {
        pendingPageRef.current = null
        return
      }

      if (isZoomedMode) {
        setCurrentEntryIndex(normalizedTargetIndex)
        setPanOffset({ x: 0, y: 0 })
        setPreviewState(null)
        pendingPageRef.current = null
        return
      }

      const entry = pageEntries[normalizedTargetIndex]
      const targetPageNumber = entry?.pageNumber ?? numPages
      let targetPageZero = Math.max(
        0,
        Math.min((targetPageNumber ?? numPages) - 1, Math.max(numPages - 1, 0)),
      )

      if (layout.isDoubleLayout) {
        targetPageZero = getSpreadStartIndex(targetPageZero)
      }

      const resultingEntryIndex = getEntryIndexForPage(targetPageZero + 1)
      const normalizedResultingEntryIndex = getSpreadStartIndex(resultingEntryIndex)
      if (normalizedResultingEntryIndex === currentSpreadStartIndex) {
        pendingPageRef.current = null
        return
      }

      setCurrentEntryIndex(normalizedResultingEntryIndex)
      setPanOffset({ x: 0, y: 0 })
      setPreviewState(null)
      pendingPageRef.current = targetPageZero

      if (!navigatePageFlipTo(targetPageZero)) {
        pendingPageRef.current = null
      }
    },
    [
      currentSpreadStartIndex,
      getSpreadStartIndex,
      getEntryIndexForPage,
      isZoomedMode,
      layout.isDoubleLayout,
      navigatePageFlipTo,
      numPages,
      pageEntries,
      pdfDocument,
      totalEntries,
    ],
  )

  const goToRelativeEntry = useCallback(
    (offset: number) => {
      if (totalEntries === 0) {
        return
      }

      const direction = offset >= 0 ? 1 : -1
      let nextIndex = currentSpreadStartIndex

      for (let step = 0; step < Math.abs(offset); step += 1) {
        nextIndex = getAdjacentSpreadStartIndex(nextIndex, direction)
      }

      if (nextIndex === currentSpreadStartIndex) {
        return
      }

      goToEntryIndex(nextIndex)
    },
    [currentSpreadStartIndex, getAdjacentSpreadStartIndex, goToEntryIndex, totalEntries],
  )

  const canGoToPreviousSpread = currentSpreadStartIndex > 0
  const nextSpreadStartIndex = getAdjacentSpreadStartIndex(currentSpreadStartIndex, 1)
  const canGoToNextSpread = nextSpreadStartIndex !== currentSpreadStartIndex

  const handleGoToPrevious = useCallback(() => {
    if (isZoomedMode) {
      goToRelativeEntry(-1)
      return
    }

    stepPageFlip(['flipPrev', 'turnToPrev', 'prev'])
  }, [goToRelativeEntry, isZoomedMode, stepPageFlip])

  const handleGoToNext = useCallback(() => {
    if (isZoomedMode) {
      goToRelativeEntry(1)
      return
    }

    stepPageFlip(['flipNext', 'turnToNext', 'next'])
  }, [goToRelativeEntry, isZoomedMode, stepPageFlip])

  const updatePreviewForIndex = useCallback(
    (index: number) => {
      if (totalEntries === 0 || !pdfDocument) {
        return
      }

      const clamped = Math.max(0, Math.min(index, totalEntries - 1))
      const entry = pageEntries[clamped]
      if (!entry) {
        return
      }

      const pageNumber = entry.pageNumber ?? numPages
      const zeroBasedPage = Math.max(0, Math.min(pageNumber - 1, Math.max(numPages - 1, 0)))
      const basePercent =
        numPages > 0 ? ((zeroBasedPage + 0.5) / numPages) * 100 : 50
      const leftPercent = Math.min(97, Math.max(3, basePercent))
      const sheetLabel = `Feuillet ${clamped + 1} / ${totalEntries}`

      const label = entry.pageNumber
        ? `Page ${entry.pageNumber}${numPages > 0 ? ` / ${numPages}` : ''} - ${sheetLabel}`
        : `${clamped === totalEntries - 1 ? 'Fin du magazine' : 'Page blanche'} - ${sheetLabel}`

      setPreviewState({
        index: clamped,
        pageNumber: entry.pageNumber,
        leftPercent,
        label,
      })
    },
    [numPages, pageEntries, pdfDocument, totalEntries],
  )

  const clearPreview = useCallback(() => {
    setPreviewState(null)
  }, [])

  type DivPointerEvent = ReactPointerEvent<HTMLDivElement>

  const handlePointerDown = useCallback(
    (event: DivPointerEvent) => {
      if (!panEnabled || event.button !== 0) {
        return
      }

      const target = event.currentTarget

      try {
        target.setPointerCapture(event.pointerId)
      } catch {
        // Pointer capture may not be supported in some environments
      }

      panStateRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: panOffset.x,
        originY: panOffset.y,
      }

      viewerRef.current?.focus?.({ preventScroll: true })

      setIsPanning(true)
      event.preventDefault()
    },
    [panEnabled, panOffset.x, panOffset.y],
  )

  const handlePointerMove = useCallback(
    (event: DivPointerEvent) => {
      const state = panStateRef.current
      if (state.pointerId === null || state.pointerId !== event.pointerId) {
        return
      }

      const deltaX = event.clientX - state.startX
      const deltaY = event.clientY - state.startY

      setPanOffset((current) => {
        const clamped = clampOffset(state.originX + deltaX, state.originY + deltaY)
        if (clamped.x === current.x && clamped.y === current.y) {
          return current
        }
        return clamped
      })

      event.preventDefault()
    },
    [clampOffset],
  )

  const endPan = useCallback((event: DivPointerEvent) => {
    const target = event.currentTarget
    const state = panStateRef.current

    if (state.pointerId !== null) {
      try {
        if (target.hasPointerCapture?.(state.pointerId)) {
          target.releasePointerCapture(state.pointerId)
        }
      } catch {
        // Ignore unsupported pointer capture errors
      }
    }

    panStateRef.current = {
      pointerId: null,
      startX: 0,
      startY: 0,
      originX: 0,
      originY: 0,
    }

    setIsPanning(false)
  }, [])

  const handlePointerUp = useCallback(
    (event: DivPointerEvent) => {
      if (panStateRef.current.pointerId !== event.pointerId) {
        return
      }
      endPan(event)
    },
    [endPan],
  )

  const handlePointerCancel = useCallback(
    (event: DivPointerEvent) => {
      if (panStateRef.current.pointerId !== event.pointerId) {
        return
      }
      endPan(event)
    },
    [endPan],
  )

  const getIndexFromClientX = useCallback(
    (clientX: number) => {
      if (totalPages <= 0) {
        return null
      }
      const track = progressRef.current
      if (!track) {
        return null
      }
      const rect = track.getBoundingClientRect()
      if (rect.width <= 0) {
        return null
      }
      const ratio = (clientX - rect.left) / rect.width
      const clampedRatio = Math.min(1, Math.max(0, ratio))
      const targetPageZeroBased = Math.round(
        clampedRatio * Math.max(totalPages - 1, 0),
      )
      const targetPageNumber = targetPageZeroBased + 1
      return getEntryIndexForPage(targetPageNumber)
    },
    [getEntryIndexForPage, totalPages],
  )

  const handleNodeEnter = useCallback(
    (index: number) => {
      updatePreviewForIndex(index)
    },
    [updatePreviewForIndex],
  )

  const handleNodeLeave = useCallback(() => {
    clearPreview()
  }, [clearPreview])

  const handleSliderChange = useCallback(
    (value: number) => {
      const targetPageNumber = value + 1
      const entryIndex = getEntryIndexForPage(targetPageNumber)
      goToEntryIndex(entryIndex)
    },
    [getEntryIndexForPage, goToEntryIndex],
  )

  const updateSliderDraft = useCallback(
    (value: number) => {
      const safeValue = Math.max(0, Math.min(value, Math.max(totalPages - 1, 0)))
      setSliderDraftValue(safeValue)

      const entryIndex = getEntryIndexForPage(safeValue + 1)
      updatePreviewForIndex(entryIndex)
    },
    [getEntryIndexForPage, totalPages, updatePreviewForIndex],
  )

  const commitSliderValue = useCallback(
    (value: number) => {
      const safeValue = Math.max(0, Math.min(value, Math.max(totalPages - 1, 0)))
      setSliderDraftValue(null)
      setIsSliderPointerActive(false)
      clearPreview()
      handleSliderChange(safeValue)
    },
    [clearPreview, handleSliderChange, totalPages],
  )

  const handleSliderPointerDown = useCallback(
    () => {
      setIsSliderPointerActive(true)
    },
    [],
  )

  const handleSliderInput = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = Number.parseInt(event.currentTarget.value, 10)
      if (Number.isNaN(nextValue)) {
        return
      }

      if (isSliderPointerActive) {
        updateSliderDraft(nextValue)
        handleSliderChange(nextValue)
        return
      }

      handleSliderChange(nextValue)
    },
    [handleSliderChange, isSliderPointerActive, updateSliderDraft],
  )

  const handleSliderPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLInputElement>) => {
      if (!isSliderPointerActive) {
        return
      }

      const nextValue = Number.parseInt(event.currentTarget.value, 10)
      if (Number.isNaN(nextValue)) {
        setSliderDraftValue(null)
        setIsSliderPointerActive(false)
        clearPreview()
        return
      }

      commitSliderValue(nextValue)
    },
    [clearPreview, commitSliderValue, isSliderPointerActive],
  )

  const handleSliderPointerCancel = useCallback(() => {
    setSliderDraftValue(null)
    setIsSliderPointerActive(false)
    clearPreview()
  }, [clearPreview])

  const handleSliderBlur = useCallback(() => {
    if (sliderDraftValue !== null) {
      commitSliderValue(sliderDraftValue)
      return
    }

    clearPreview()
  }, [clearPreview, commitSliderValue, sliderDraftValue])

  const handleTrackPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!['mouse', 'pen', 'touch'].includes(event.pointerType)) {
        return
      }
      if (totalPages <= 1 || !pdfDocument) {
        return
      }
      const targetIndex = getIndexFromClientX(event.clientX)
      if (targetIndex === null) {
        return
      }
      updatePreviewForIndex(targetIndex)
    },
    [getIndexFromClientX, pdfDocument, totalPages, updatePreviewForIndex],
  )

  const handleTrackPointerLeave = useCallback(() => {
    clearPreview()
  }, [clearPreview])

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.defaultPrevented) {
        return
      }

      const target = event.target as HTMLElement | null
      if (target) {
        const tagName = target.tagName.toLowerCase()
        if (tagName === 'input' || tagName === 'textarea' || target.isContentEditable) {
          return
        }
      }

      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return
      }

      switch (event.key) {
        case 'ArrowRight':
          if (isZoomedMode) {
            goToRelativeEntry(1)
            event.preventDefault()
            break
          }
          if (stepPageFlip(['flipNext', 'turnToNext', 'next'])) {
            event.preventDefault()
          }
          break
        case 'ArrowLeft':
          if (isZoomedMode) {
            goToRelativeEntry(-1)
            event.preventDefault()
            break
          }
          if (stepPageFlip(['flipPrev', 'turnToPrev', 'prev'])) {
            event.preventDefault()
          }
          break
        case 'ArrowUp':
          if (scale < MAX_SCALE) {
            handleZoomIn()
            event.preventDefault()
          }
          break
        case 'ArrowDown':
          if (scale > MIN_SCALE) {
            handleZoomOut()
            event.preventDefault()
          }
          break
        case '0':
        case 'r':
          if (Math.abs(scale - 1) > 0.001) {
            handleZoomReset()
            event.preventDefault()
          }
          break
        default:
          break
      }
    },
    [goToRelativeEntry, handleZoomIn, handleZoomOut, handleZoomReset, isZoomedMode, scale, stepPageFlip],
  )

  const handleFlip = useCallback(
    (event: { data?: number }) => {
      const pageIndex =
        typeof event?.data === 'number'
          ? event.data
          : flipBookRef.current?.pageFlip?.()?.getCurrentPageIndex?.()

      if (typeof pageIndex !== 'number') {
        return
      }

      if (pendingPageRef.current !== null) {
        if (pageIndex === pendingPageRef.current) {
          pendingPageRef.current = null
        } else {
          return
        }
      }

      const entryIndex = getEntryIndexForPage(pageIndex + 1)
      setCurrentEntryIndex(getSpreadStartIndex(entryIndex))
    },
    [getEntryIndexForPage, getSpreadStartIndex],
  )

  const handleInit = useCallback(
    (event: { object?: { getCurrentPageIndex?: () => number } } | undefined) => {
      const initialPageIndex =
        event?.object?.getCurrentPageIndex?.() ?? flipBookRef.current?.pageFlip?.()?.getCurrentPageIndex?.() ?? 0

      pendingPageRef.current = null
      const entryIndex = getEntryIndexForPage(initialPageIndex + 1)
      setCurrentEntryIndex(getSpreadStartIndex(entryIndex))
    },
    [getEntryIndexForPage, getSpreadStartIndex],
  )

  const flipContainerStyle = useMemo<CSSProperties | undefined>(() => {
    if (baseContentWidth <= 0 || baseContentHeight <= 0) {
      return undefined
    }

    const transition = isPanning ? 'transform 0s' : 'transform 0.18s ease'

    return {
      width: `${baseContentWidth}px`,
      minWidth: `${baseContentWidth}px`,
      height: `${baseContentHeight}px`,
      minHeight: `${baseContentHeight}px`,
      transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`,
      transformOrigin: 'center center',
      transition,
    }
  }, [baseContentHeight, baseContentWidth, isPanning, panOffset.x, panOffset.y, scale])
  const zoomReaderStyle = useMemo<CSSProperties | undefined>(() => {
    if (scaledContentWidth <= 0 || scaledContentHeight <= 0) {
      return undefined
    }

    const transition = isPanning ? 'transform 0s' : 'transform 0.18s ease'

    return {
      width: `${scaledContentWidth}px`,
      minWidth: `${scaledContentWidth}px`,
      height: `${scaledContentHeight}px`,
      minHeight: `${scaledContentHeight}px`,
      transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
      transformOrigin: 'center center',
      transition,
    }
  }, [isPanning, panOffset.x, panOffset.y, scaledContentHeight, scaledContentWidth])
  const zoomPageStyle = useMemo<CSSProperties | undefined>(() => {
    if (scaledWidth <= 0 || scaledHeight <= 0) {
      return undefined
    }

    return {
      width: `${scaledWidth}px`,
      minWidth: `${scaledWidth}px`,
      height: `${scaledHeight}px`,
      minHeight: `${scaledHeight}px`,
    }
  }, [scaledHeight, scaledWidth])

  const flipContainerClassName = useMemo(() => {
    const classes = [styles.flipContainer]
    if (panEnabled) {
      classes.push(styles.flipContainerInteractive)
    }
    if (isPanning) {
      classes.push(styles.flipContainerPanning)
    }
    return classes.join(' ')
  }, [isPanning, panEnabled])

  useEffect(() => {
    if (pageWidth <= 0 || pageHeight <= 0) {
      return
    }

    const pageFlipInstance = flipBookRef.current?.pageFlip?.()

    if (pageFlipInstance && typeof pageFlipInstance.update === 'function') {
      pageFlipInstance.update({
        width: pageWidth,
        height: pageHeight,
      })
    }
  }, [pageHeight, pageWidth])

  useEffect(() => {
    if (!layout.isDoubleLayout) {
      return
    }

    const normalizedIndex = getSpreadStartIndex(currentEntryIndex)
    if (normalizedIndex === currentEntryIndex) {
      return
    }

    setCurrentEntryIndex(normalizedIndex)
  }, [currentEntryIndex, getSpreadStartIndex, layout.isDoubleLayout])

  useEffect(() => {
    if (isZoomedMode || totalEntries === 0 || !pdfDocument) {
      return
    }

    const targetPageZero = layout.isDoubleLayout
      ? currentSpreadStartIndex
      : Math.max(currentPageNumber - 1, 0)

    const currentPageZero = flipBookRef.current?.pageFlip?.()?.getCurrentPageIndex?.()
    if (typeof currentPageZero === 'number' && currentPageZero === targetPageZero) {
      return
    }

    pendingPageRef.current = targetPageZero
    if (!navigatePageFlipTo(targetPageZero)) {
      pendingPageRef.current = null
    }
  }, [currentPageNumber, currentSpreadStartIndex, isZoomedMode, layout.isDoubleLayout, navigatePageFlipTo, pdfDocument, totalEntries])

  return (
    <div
      className={`${styles.viewer} ${isFullscreen ? styles.viewerFullscreen : ''}`}
      ref={viewerRef}
      data-double-layout={layout.isDoubleLayout}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.toolbar}>
        <a className={styles.toolbarButton} href={file} download aria-label="Telecharger le PDF">
          <FontAwesomeIcon icon={faDownload} />
        </a>

        <div className={styles.toolbarDivider} />

        {isFullscreen ? (
          <div className={`${styles.toolbarGroup} ${styles.toolbarZoomControls}`}>
            <button
              type="button"
              className={styles.toolbarButton}
              onClick={handleZoomReset}
              disabled={Math.abs(scale - 1) < 0.001}
              aria-label="Reinitialiser le zoom"
            >
              <FontAwesomeIcon icon={faRotateRight} />
            </button>
          </div>
        ) : (
          <div className={`${styles.toolbarGroup} ${styles.toolbarZoomControls}`} ref={zoomMenuRef}>
            <button
              type="button"
              className={styles.toolbarButton}
              onClick={toggleZoomMenu}
              aria-haspopup="true"
              aria-expanded={zoomMenuOpen}
              aria-label="Options de zoom"
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} />
            </button>
            <span className={styles.zoomLevel}>{Math.round(scale * 100)}%</span>

            <div className={`${styles.zoomMenu} ${zoomMenuOpen ? styles.zoomMenuOpen : ''}`}>
              <button
                type="button"
                className={styles.toolbarButton}
                onClick={handleZoomOut}
                disabled={scale <= MIN_SCALE}
                aria-label="Zoom arriere"
              >
                <FontAwesomeIcon icon={faMagnifyingGlassMinus} />
              </button>
              <button
                type="button"
                className={styles.toolbarButton}
                onClick={handleZoomReset}
                disabled={Math.abs(scale - 1) < 0.001}
                aria-label="Reinitialiser le zoom"
              >
                <FontAwesomeIcon icon={faRotateRight} />
              </button>
              <button
                type="button"
                className={styles.toolbarButton}
                onClick={handleZoomIn}
                disabled={scale >= MAX_SCALE}
                aria-label="Zoom avant"
              >
                <FontAwesomeIcon icon={faMagnifyingGlassPlus} />
              </button>
            </div>
          </div>
        )}

        {isFullscreen ? (
          <div className={styles.toolbarZoomSliderGroup}>
            <input
              type="range"
              min={MIN_SCALE}
              max={MAX_SCALE}
              step={0.1}
              value={scale}
              onChange={handleZoomSliderChange}
              className={styles.toolbarZoomSlider}
              style={{ '--toolbar-progress': toolbarZoomPercent } as CSSProperties}
              aria-label="Zoom du magazine"
            />
            <span className={styles.toolbarZoomSliderValue}>{Math.round(scale * 100)}%</span>
          </div>
        ) : null}

        <div className={`${styles.toolbarGroup} ${styles.toolbarNavigationGroup}`}>
          <button
            type="button"
            className={styles.toolbarButton}
            onClick={handleGoToPrevious}
            disabled={!canGoToPreviousSpread}
            aria-label="Page precedente"
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <button
            type="button"
            className={styles.toolbarButton}
            onClick={handleGoToNext}
            disabled={!canGoToNextSpread}
            aria-label="Page suivante"
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
          <span className={styles.toolbarPageIndicator}>{toolbarPageLabel}</span>
        </div>

        <div className={styles.toolbarSpacer} />

        <button
          type="button"
          className={styles.toolbarButton}
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Quitter le plein ecran' : 'Passer en plein ecran'}
        >
          <FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} />
        </button>
      </div>

      <div className={styles.documentArea} ref={contentRef}>
        <Document
          file={file}
          onLoadSuccess={handleDocumentLoad}
          onLoadError={handleDocumentError}
          loading={<div className={styles.placeholder}>Chargement du magazine...</div>}
          error={
            <div className={styles.placeholder}>
              {loadError ?? "Impossible de lire le magazine. Verifiez le fichier PDF."}
            </div>
          }
          className={styles.document}
          options={documentOptions}
        >
          {loadError ? null : canRenderBook ? (
            isZoomedMode ? (
              <div
                className={`${flipContainerClassName} ${styles.zoomReader}`}
                style={zoomReaderStyle}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
              >
                <div className={styles.zoomSpread}>
                  {currentZoomEntries.map(({ pageNumber, index }) =>
                    pageNumber ? (
                      <div
                        key={`zoom-page-${pageNumber}`}
                        className={`${styles.flipPage} ${styles.zoomPage}`}
                        data-page={pageNumber}
                        style={zoomPageStyle}
                      >
                        <Page
                          pageNumber={pageNumber}
                          width={scaledWidth}
                          devicePixelRatio={pageRenderDevicePixelRatio}
                          loading={null}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                        />
                      </div>
                    ) : (
                      <div
                        key={`zoom-blank-${currentSpreadStartIndex + index}`}
                        className={`${styles.flipPage} ${styles.blankPage} ${styles.zoomPage}`}
                        style={zoomPageStyle}
                      />
                    ),
                  )}
                </div>
              </div>
            ) : (
              <div
                className={flipContainerClassName}
                style={flipContainerStyle}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
              >
                <HTMLFlipBook
                  ref={flipBookRef}
                  width={pageWidth}
                  height={pageHeight}
                  size="fixed"
                  startPage={currentSpreadStartIndex}
                  minWidth={0}
                  maxWidth={pageWidth}
                  minHeight={0}
                  maxHeight={pageHeight}
                  drawShadow
                  startZIndex={0}
                  autoSize
                  clickEventForward
                  useMouseEvents
                  swipeDistance={30}
                  showPageCorners
                  disableFlipByClick
                  showCover
                  className={styles.flipBook}
                  flippingTime={750}
                  maxShadowOpacity={0.4}
                  mobileScrollSupport
                  usePortrait
                  style={{}}
                  onFlip={handleFlip}
                  onInit={handleInit}
                >
                  {pageEntries.map(({ pageNumber, index }) =>
                    pageNumber ? (
                      <div key={`page-${pageNumber}`} className={styles.flipPage} data-page={pageNumber}>
                        <Page
                          pageNumber={pageNumber}
                          width={pageWidth}
                          devicePixelRatio={pageRenderDevicePixelRatio}
                          loading={null}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                        />
                      </div>
                    ) : (
                      <div key={`blank-${index}`} className={`${styles.flipPage} ${styles.blankPage}`} />
                    ),
                  )}
                </HTMLFlipBook>
              </div>
            )
          ) : (
            <div className={styles.placeholder}>Chargement du magazine...</div>
          )}
        </Document>
        {canRenderBook ? (
          <div className={styles.progressBar}>
            <div className={styles.sliderWrapper}>
              <button
                type="button"
                className={`${styles.toolbarButton} ${styles.sliderNavButton}`}
                onClick={handleGoToPrevious}
                disabled={!canGoToPreviousSpread}
                aria-label="Page precedente"
              >
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>
              <div
                className={styles.sliderTrack}
                ref={progressRef}
                onPointerMove={handleTrackPointerMove}
                onPointerLeave={handleTrackPointerLeave}
                onPointerDown={handleTrackPointerMove}
                onPointerUp={handleTrackPointerLeave}
                onPointerCancel={handleTrackPointerLeave}
              >
                <input
                  type="range"
                  min={0}
                  max={Math.max(totalPages - 1, 0)}
                  value={displayedSliderValue}
                  step={1}
                  onInput={handleSliderInput}
                  onPointerDown={handleSliderPointerDown}
                  onPointerUp={handleSliderPointerUp}
                  onPointerCancel={handleSliderPointerCancel}
                  onFocus={() => handleNodeEnter(currentEntryIndex)}
                  onBlur={handleSliderBlur}
                  className={styles.sliderInput}
                  style={{ '--progress': `${progressFillPercent}%` } as CSSProperties}
                  disabled={totalPages <= 1}
                  aria-label="Naviguer dans le magazine"
                />
                {previewState && pdfDocument && !isMobileLayout ? (
                  <div className={styles.progressPreview} style={{ left: `${previewState.leftPercent}%` }}>
                    {previewState.pageNumber ? (
                      <div className={styles.progressPreviewPage}>
                        <Page
                          pageNumber={previewState.pageNumber}
                          pdf={pdfDocument}
                          width={PREVIEW_WIDTH}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                          onLoadError={() => setPreviewState(null)}
                          onRenderError={() => setPreviewState(null)}
                        />
                      </div>
                    ) : (
                      <div className={styles.progressPreviewBlank}>Page blanche</div>
                    )}
                    <span className={styles.progressPreviewLabel}>{previewState.label}</span>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className={`${styles.toolbarButton} ${styles.sliderNavButton}`}
                onClick={handleGoToNext}
                disabled={!canGoToNextSpread}
                aria-label="Page suivante"
              >
                <FontAwesomeIcon icon={faChevronRight} />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <p className={styles.caption}>
        {title} - {numPages > 0 ? `${numPages} pages` : 'Chargement en cours'}
      </p>
    </div>
  )
}

export default MagazineViewer
