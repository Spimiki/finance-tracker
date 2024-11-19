'use client'

import React, { useState, useEffect, useRef } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function WidgetGrid({ children, onLayoutChange }) {
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <ResponsiveGridLayout
        className="layout"
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 6, md: 4, sm: 2, xs: 2, xxs: 1 }}
        rowHeight={190}
        isDraggable={true}
        isResizable={false}
        margin={[12, 12]}
        compactType="vertical"
        preventCollision={false}
        onLayoutChange={onLayoutChange}
        draggableCancel=".non-draggable"
        useCSSTransforms={true}
        containerPadding={[0, 0]}
        maxRows={12}
        width={containerWidth}
      >
        {children}
      </ResponsiveGridLayout>

      <style jsx global>{`
        .react-grid-layout {
          position: relative;
          transition: height 200ms ease;
        }
        .react-grid-item {
          transition: all 200ms ease;
          transition-property: left, top;
          z-index: 1;
        }
        .react-grid-item.cssTransforms {
          transition-property: transform;
        }
        .react-grid-item.react-draggable-dragging {
          transition: none;
          z-index: 9999 !important;
          will-change: transform;
        }
        .react-draggable {
          position: absolute;
        }
        /* Ensure widgets are always above container */
        .layout > div {
          z-index: 10;
        }
        /* Extra z-index for dragging state */
        .react-grid-item.react-draggable-dragging {
          z-index: 9999 !important;
          pointer-events: auto !important;
          cursor: grabbing !important;
        }
        /* Container bounds */
        .layout {
          min-height: 100%;
          width: 100%;
          position: relative;
        }
      `}</style>
    </div>
  );
} 