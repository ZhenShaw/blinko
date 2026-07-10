import { useEffect, useState } from 'react';
import { Button } from '@heroui/react';
import { FileIcons } from './FileIcon';
import { observer } from 'mobx-react-lite';
import { helper } from '@/lib/helper';
import { type Attachment } from '@shared/lib/types';
import { FileType } from '../Editor/type';
import { DeleteIcon, DownloadIcon } from './icons';
import { ImageRender } from './imageRender';
import { VideoThumbnailRender } from './VideoThumbnailRender';
import { HandleFileType } from '../Editor/editorUtils';
import { Icon } from '@/components/Common/Iconify/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@heroui/popover';
import { BlinkoCard } from '@/components/BlinkoCard';
import { EditorStore } from '../Editor/editorStore';
import { DraggableFileGrid } from './DraggableFileGrid';
import { AudioRender } from './audioRender';
import { downloadFromLink } from '@/lib/tauriHelper';
import { getBlinkoEndpoint } from '@/lib/blinkoEndpoint';
import { RootStore } from '@/store';
import { UserStore } from '@/store/user';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'usehooks-ts';

const INITIAL_MEDIA_COUNT = 6;
const DESKTOP_INITIAL_MEDIA_COUNT = 8;

type IProps = {
  files: FileType[]
  preview?: boolean
  columns?: number
  onReorder?: (newFiles: FileType[]) => void
}

const AttachmentsRender = observer((props: IProps) => {
  const { files, preview = false, columns = 3 } = props
  const { t } = useTranslation();
  const [showAllMedia, setShowAllMedia] = useState(false);
  const isPc = useMediaQuery('(min-width: 768px)');
  const initialMediaCount = isPc ? DESKTOP_INITIAL_MEDIA_COUNT : INITIAL_MEDIA_COUNT;

  const gridClassName = preview
    ? `grid grid-cols-${(columns - 1) < 1 ? 1 : (columns - 1)} md:grid-cols-${columns} gap-2`
    : 'flex flex-row gap-2 overflow-x-auto pb-2';

  return (
    <div className={`flex flex-col ${files.length == 0 ? 'gap-[2px]' : 'gap-[4px]'}`}>
      {/* Media fold: limit visible images and videos, with expand/collapse toggle */}
      {(() => {
        const allMedia = files.filter(f => f.previewType === 'image' || f.previewType === 'video');
        const hasMore = allMedia.length > initialMediaCount;
        const visibleCount = hasMore && !showAllMedia ? initialMediaCount : allMedia.length;
        let renderedCount = 0;

        // Images — with fold count
        const imageFiles = files.filter(f => f.previewType === 'image');
        const visibleImageCount = Math.min(
          imageFiles.length,
          Math.max(0, visibleCount - renderedCount)
        );
        const visibleImages = imageFiles.slice(0, visibleImageCount);
        renderedCount += visibleImageCount;

        // Videos — with fold count
        const videoFiles = files.filter(f => f.previewType === 'video');
        const visibleVideoCount = Math.min(
          videoFiles.length,
          Math.max(0, visibleCount - renderedCount)
        );
        const visibleVideos = videoFiles.slice(0, visibleVideoCount);
        renderedCount += visibleVideoCount;

        return (
          <div className="flex flex-col gap-2">
            {visibleImages.length > 0 && (
              <ImageRender
                files={files}
                preview={preview}
                columns={columns}
                maxCount={visibleImageCount}
                onReorder={props.onReorder}
              />
            )}

            {visibleVideos.length > 0 && (
              <div
                className={preview ? 'grid gap-2' : 'flex flex-row gap-2 overflow-x-auto pb-2'}
                style={preview ? { gridTemplateColumns: `repeat(${Math.min(isPc ? 4 : 3, Math.max(1, Math.ceil(visibleVideos.length / 2)))}, 1fr)` } : undefined}
              >
                {visibleVideos.map((file, index) => (
                  <div key={`${file.name}-${index}`} className='group relative'>
                    <VideoThumbnailRender file={file} preview={preview} />
                    {!file.uploadPromise?.loading?.value && !preview &&
                      <DeleteIcon className='absolute z-10 right-[5px] top-[5px]' files={files} file={file} />
                    }
                    {preview && <DownloadIcon className='top-[8px] right-[8px]' file={file} />}
                  </div>
                ))}
              </div>
            )}

            {hasMore && (
              <div className='w-full flex justify-center'>
                <Button
                  variant="light"
                  className="mt-1 w-fit mx-auto"
                  onPress={() => setShowAllMedia(!showAllMedia)}
                >
                  <Icon
                    icon={showAllMedia ? "ph:caret-up" : "ph:caret-down"}
                    className="mr-2"
                  />
                  {showAllMedia
                    ? t('collapse')
                    : `${t('show-all')} (${allMedia.length})`}
                </Button>
              </div>
            )}
          </div>
        );
      })()}

      {/* audio render */}
      <AudioRender files={files} preview={preview} />

      {/* other file render */}
      <DraggableFileGrid
        files={files}
        preview={preview}
        type="other"
        className={gridClassName}
        onReorder={props.onReorder}
        renderItem={(file) => (
          <div
            className={`relative mt-2 flex p-2 items-center gap-2 cursor-pointer
              bg-secondbackground hover:bg-hover !transition-all rounded-md group
              ${!preview ? 'min-w-[200px] flex-shrink-0' : 'w-full'}`}
            onClick={() => {
              if (preview) {
                downloadFromLink(getBlinkoEndpoint(file.uploadPromise.value))
              }
            }}
          >
            <FileIcons path={file.name} isLoading={file.uploadPromise?.loading?.value} />
            <div className='truncate text-xs md:text-sm font-bold'>{file.name}</div>
            {!file.uploadPromise?.loading?.value && !preview &&
              <DeleteIcon className='ml-auto group-hover:opacity-100 opacity-0' files={files} file={file} />
            }
          </div>
        )}
      />
    </div>
  )
})

const FilesAttachmentRender = observer(({
  files,
  preview,
  columns,
  onReorder
}: {
  files: Attachment[],
  preview?: boolean,
  columns?: number,
  onReorder?: (newFiles: Attachment[]) => void
}) => {
  const [handledFiles, setFiles] = useState<FileType[]>([]);

  useEffect(() => {
    setFiles(HandleFileType(files));
  }, [files]);

  const handleReorder = (newFiles: FileType[]) => {
    const newAttachments = files.slice().sort((a, b) => {
      const aIndex = newFiles.findIndex(f => f.name === a.name);
      const bIndex = newFiles.findIndex(f => f.name === b.name);
      return aIndex - bIndex;
    });
    onReorder?.(newAttachments);
  };

  return (
    <AttachmentsRender
      files={handledFiles}
      preview={preview}
      columns={columns}
      onReorder={handleReorder}
    />
  );
});


const ReferenceRender = observer(({ store }: { store: EditorStore }) => {
  return <div className='grid grid-cols-2 md:grid-cols-3 gap-2'>
    {
      store?.currentReferences?.map(i => {
        return <Popover placement="bottom">
          <PopoverTrigger>
            <div className="flex items-center gap-1 blinko-tag cursor-pointer hover:opacity-80 group">
              <Icon className="min-w-[20px] max-w-[20px] !text-primary" icon="uim:arrow-up-left" width="20" height="20" />
              <div className="truncate">{i.content}</div>
              <div onClick={(e) => {
                e.stopPropagation()
                store.noteListByIds.value = store.noteListByIds.value?.filter(t => i.id !== t.id)
                store.deleteReference(i.id)
              }} className={`group-hover:opacity-100 md:opacity-0 hover:opacity-100 cursor-pointer rounded-sm transition-al ml-auto`}>
                <Icon icon="basil:cross-solid" width={20} height={20} />
              </div>
            </div>
          </PopoverTrigger>
          <PopoverContent className='max-w-[300px]'>
            <div className="px-1 py-2 max-w-[300px]" >
              <BlinkoCard blinkoItem={i} />
            </div>
          </PopoverContent>
        </Popover>
      })
    }
  </div>
})

export { AttachmentsRender, FilesAttachmentRender, ReferenceRender }

