import { useState, useRef, useEffect } from 'react';
import { FileType } from '../Editor/type';
import { Image, Skeleton } from '@heroui/react';
import { Icon } from '@/components/Common/Iconify/icons';
import { observer } from 'mobx-react-lite';
import { getBlinkoEndpoint } from '@/lib/blinkoEndpoint';
import { useLazyLoad } from '@/hooks/useLazyLoad';
import { useMediaQuery } from 'usehooks-ts';
import { RootStore } from '@/store';
import { UserStore } from '@/store/user';

type Props = {
  file: FileType;
  preview?: boolean;
  className?: string;
  onDelete?: () => void;
};

function formatDuration(seconds?: number): string {
  if (!seconds || !isFinite(seconds)) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

const VideoPlaceholder = ({ fileName }: { fileName: string }) => (
  <div className="flex flex-col items-center justify-center w-full h-full bg-gray-100 dark:bg-gray-800 rounded-lg min-h-[120px]">
    <Icon icon="ph:video-camera" className="w-10 h-10 text-gray-400" />
    <span className="text-xs text-gray-400 mt-1 truncate max-w-full px-2">{fileName}</span>
  </div>
);

const VideoThumbnailRender = observer(({ file, preview = false, className }: Props) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { ref: lazyRef, isVisible } = useLazyLoad();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const token = RootStore.Get(UserStore).tokenData?.value?.token;

  useEffect(() => {
    if (isPlaying && isMobile && videoRef.current) {
      const el = videoRef.current;
      if (el.requestFullscreen) {
        el.requestFullscreen();
      } else if ((el as any).webkitEnterFullscreen) {
        (el as any).webkitEnterFullscreen();
      } else if ((el as any).webkitRequestFullscreen) {
        (el as any).webkitRequestFullscreen();
      }
    }
  }, [isPlaying, isMobile]);

  const thumbnailPath = file.metadata?.thumbnailPath
    ? `${getBlinkoEndpoint(file.metadata.thumbnailPath)}?token=${token}`
    : null;

  const videoUrl = file.preview
    ? `${getBlinkoEndpoint(file.preview)}?token=${token}`
    : '';

  const imageHeight = preview
    ? 'md:h-[180px] h-[100px] w-full'
    : 'h-[160px] w-[160px]';

  if (isPlaying) {
    return (
      <div className={`relative ${imageHeight}`}>
        <video
          ref={videoRef}
          src={videoUrl}
          id="player"
          controls
          autoPlay
          className={`rounded-2xl w-full h-full object-cover ${className ?? ''}`}
        />
      </div>
    );
  }

  return (
    <div
      ref={lazyRef}
      className={`relative group ${!preview ? 'min-w-[160px] flex-shrink-0' : ''} ${imageHeight} cursor-pointer`}
      onClick={() => setIsPlaying(true)}
    >
      {!isVisible ? (
        <Skeleton className="w-full h-full rounded-lg" />
      ) : (
        <>
          {thumbnailPath ? (
            <div className="w-full h-full">
              <Image
                src={thumbnailPath}
                draggable={false}
                classNames={{ wrapper: '!max-w-full !h-full' }}
                className="object-cover w-full h-full rounded-lg"
              />
            </div>
          ) : (
            <VideoPlaceholder fileName={file.name} />
          )}

          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all rounded-lg z-10">
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 group-hover:bg-black/70 transition-colors">
              <Icon icon="ph:play-fill" className="w-6 h-6 text-white ml-0.5" />
            </div>
          </div>

          {/* Duration badge */}
          {file.metadata?.duration && (
            <span className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-medium pointer-events-none">
              {formatDuration(file.metadata.duration)}
            </span>
          )}
        </>
      )}
    </div>
  );
});

export { VideoThumbnailRender, formatDuration };