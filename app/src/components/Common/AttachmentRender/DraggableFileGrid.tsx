import React from 'react';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd-next';
import { FileType } from '../Editor/type';
import { api } from '@/lib/trpc';

type DraggableFileGridProps = {
  files: FileType[];
  preview?: boolean;
  columns?: number;
  onReorder?: (newFiles: FileType[]) => void;
  type: 'image' | 'video' | 'media' | 'other';
  className?: string;
  renderItem?: (file: FileType) => React.ReactNode;
};

const matchesType = (file: FileType, t: string) => {
  if (t === 'media') return file.previewType === 'image' || file.previewType === 'video';
  return file.previewType === t;
};

export const DraggableFileGrid = ({
  files,
  preview = false,
  onReorder,
  type,
  className,
  columns,
  renderItem
}: DraggableFileGridProps) => {
  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;
    
    const { source, destination } = result;
    const filteredFiles = files.filter(i => matchesType(i, type));
    const allFiles = Array.from(files);
    
    const [reorderedItem] = filteredFiles.splice(source.index, 1);
    if (reorderedItem) {
      filteredFiles.splice(destination.index, 0, reorderedItem);
      
      const newFiles = allFiles.map(file => {
        if (matchesType(file, type)) {
          return filteredFiles.shift() || file;
        }
        return file;
      });

      onReorder?.(newFiles);

      try {
        await api.notes.updateAttachmentsOrder.mutate({
          attachments: newFiles.map((file, index) => ({
            name: file.name,
            sortOrder: index
          }))
        });
      } catch (error) {
        console.error('Failed to update attachments order:', error);
      }
    }
  };

  const isGrid = className?.includes('grid');
  const gridStyle = isGrid && columns ? { gridTemplateColumns: `repeat(${columns}, 1fr)` } : {};

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId={type} direction={isGrid ? 'vertical' : 'horizontal'}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={isGrid ? { ...provided.droppableProps.style, display: 'grid', ...gridStyle } : { ...provided.droppableProps.style, ...gridStyle }}
            className={`${className} ${snapshot.isDraggingOver ? 'bg-hover/50' : ''}`}
          >
            {files.filter(i => matchesType(i, type)).map((file, index) => (
              <Draggable
                key={`${file.name}-${index}`}
                draggableId={`${file.name}-${index}`}
                index={index}
                isDragDisabled={preview}
              >
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={{
                      ...provided.draggableProps.style,
                      width: isGrid ? '100%' : provided.draggableProps.style?.width,
                      opacity: snapshot.isDragging ? 0.5 : 1,
                    }}
                  >
                    {renderItem?.(file)}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}; 