'use client'

import React from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const widgetSizes = {
  trades: { w: 2, h: 1 },
  // ... other widget sizes ...
};

export default function WidgetGrid({ children, onLayoutChange }) {
  const generateLayout = () => {
    const childrenArray = React.Children.toArray(children);
    
    return childrenArray.map(child => ({
      i: child.key,
      x: child.props['data-grid'].x || 0,
      y: child.props['data-grid'].y || 0,
      w: child.props['data-grid'].w || 12,
      h: child.props['data-grid'].h || 12,
      minW: 8,
      minH: 4,
      maxW: 12,
      autoSize: true
    }));
  };

  return (
    <div className="w-full">
      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: generateLayout() }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 }}
        rowHeight={30}
        onLayoutChange={(layout) => onLayoutChange(layout)}
        isDraggable={false}
        isResizable={false}
        margin={[16, 16]}
        containerPadding={[16, 16]}
        useCSSTransforms={true}
        verticalCompact={true}
        compactType="vertical"
      >
        {children}
      </ResponsiveGridLayout>
    </div>
  );
}