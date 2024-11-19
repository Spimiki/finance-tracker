'use client'

import { useState, useEffect } from 'react';
import Widget from './components/DraggableWidget';
import WidgetGrid from './components/WidgetGrid';
import AddWidgetModal from './components/AddWidgetModal';
import ConfirmDialog from './components/ConfirmDialog';

const sizeConfigs = {
  small: { w: 1, h: 1 },
  wide: { w: 2, h: 1 },
  tall: { w: 1, h: 2 },
  large: { w: 2, h: 2 },
}

const defaultWidgets = [
  {
    id: 'widget1',
    size: 'large',
    title: 'Large Widget (2x2)',
    x: 0,
    y: 0,
    content: 'This is a large widget content'
  }
];

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    widgetId: null,
    widgetTitle: ''
  });
  
  const [widgets, setWidgets] = useState(defaultWidgets);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('widgets');
    if (saved) {
      setWidgets(JSON.parse(saved));
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('widgets', JSON.stringify(widgets));
    }
  }, [widgets, isLoaded]);

  const handleAddWidget = (newWidget) => {
    setWidgets(prev => [...prev, newWidget]);
  };

  const handleRemoveRequest = (widgetId, widgetTitle) => {
    setConfirmDialog({
      isOpen: true,
      widgetId,
      widgetTitle
    });
  };

  const handleConfirmRemove = () => {
    if (confirmDialog.widgetId) {
      setWidgets(prev => prev.filter(w => w.id !== confirmDialog.widgetId));
    }
    setConfirmDialog({ isOpen: false, widgetId: null, widgetTitle: '' });
  };

  const handleLayoutChange = (layout) => {
    if (!isLoaded) return;
    
    const updatedWidgets = widgets.map(widget => {
      const layoutItem = layout.find(item => item.i === widget.id);
      if (layoutItem) {
        return {
          ...widget,
          x: layoutItem.x,
          y: layoutItem.y
        };
      }
      return widget;
    });
    setWidgets(updatedWidgets);
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-gray-900 py-8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm rounded-[36px] shadow-lg transition-colors border border-gray-100 dark:border-gray-700">
          <div className="p-6 min-h-[calc(100vh-4rem)]">
            <div className="relative overflow-hidden" style={{ zIndex: 1 }}>
              <WidgetGrid onLayoutChange={handleLayoutChange}>
                {widgets.map(widget => (
                  <div key={widget.id} 
                       data-grid={{ x: widget.x, y: widget.y, w: sizeConfigs[widget.size].w, h: sizeConfigs[widget.size].h, i: widget.id }}
                       className="z-10"
                  >
                    <Widget
                      id={widget.id}
                      title={widget.title}
                      onRemove={handleRemoveRequest}
                    >
                      <p className="text-gray-600 dark:text-gray-300">{widget.content}</p>
                    </Widget>
                  </div>
                ))}
              </WidgetGrid>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed right-8 bottom-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-4 shadow-lg transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      <AddWidgetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddWidget}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, widgetId: null, widgetTitle: '' })}
        onConfirm={handleConfirmRemove}
        title="Remove Widget"
        message={`Are you sure you want to remove "${confirmDialog.widgetTitle}"? This action cannot be undone.`}
      />
    </main>
  );
}