'use client';

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties, HTMLAttributes } from 'react';

/** Dutch screen-reader texts for drag and drop. */
function announcements(labelOf: (id: string) => string, positionOf: (id: string) => number, total: number): Announcements {
  return {
    onDragStart: ({ active }) =>
      `${labelOf(String(active.id))} opgepakt. Gebruik de pijltjestoetsen om te verplaatsen, spatie om neer te zetten, Escape om te annuleren.`,
    onDragOver: ({ active, over }) => (over ? `${labelOf(String(active.id))} staat nu op plek ${positionOf(String(over.id))} van ${total}.` : undefined),
    onDragEnd: ({ active, over }) =>
      over ? `${labelOf(String(active.id))} neergezet op plek ${positionOf(String(over.id))} van ${total}.` : `${labelOf(String(active.id))} neergezet.`,
    onDragCancel: ({ active }) => `Verplaatsen van ${labelOf(String(active.id))} geannuleerd.`,
  };
}

export function SortableArea<T extends { id: string }>({
  items,
  onReorder,
  layout,
  labelOf,
  children,
}: {
  items: T[];
  onReorder: (items: T[]) => void;
  layout: 'grid' | 'list';
  labelOf: (item: T) => string;
  children: React.ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const byId = new Map(items.map((i, index) => [i.id, { item: i, index }]));

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = byId.get(String(active.id))?.index;
    const to = byId.get(String(over.id))?.index;
    if (from === undefined || to === undefined) return;
    onReorder(arrayMove(items, from, to));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        announcements: announcements(
          (id) => {
            const entry = byId.get(id);
            return entry ? labelOf(entry.item) : 'Onderdeel';
          },
          (id) => (byId.get(id)?.index ?? 0) + 1,
          items.length,
        ),
        screenReaderInstructions: {
          draggable:
            'Druk op spatie of Enter om op te pakken. Verplaats met de pijltjestoetsen en druk nogmaals op spatie om neer te zetten. Escape annuleert.',
        },
      }}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={layout === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

export function useSortableItem(id: string) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    position: 'relative',
  };
  const handleProps: HTMLAttributes<HTMLElement> & { ref: (el: HTMLElement | null) => void } = {
    ...attributes,
    ...listeners,
    ref: setActivatorNodeRef,
    // dnd-kit sets an English role description by default.
    'aria-roledescription': 'versleepbaar onderdeel',
  };
  return { setNodeRef, style, handleProps, isDragging };
}

/** Moves an item one place up or down; the accessible, tap-friendly alternative to dragging. */
export function moveItem<T>(items: T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  if (target < 0 || target >= items.length) return items;
  return arrayMove(items, index, target);
}
