import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';

import { Modal, ModalContent, ModalBody } from '@heroui/react';
import { observer } from 'mobx-react-lite';
import { useMediaQuery } from 'usehooks-ts';
import { MediaPlayer, MediaProvider, Poster } from '@vidstack/react';
import { DefaultVideoLayout, defaultLayoutIcons } from '@vidstack/react/player/layouts/default';

type VideoPlayerDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  src: string;
  poster?: string | null;
};

export const VideoPlayerDialog = observer(({ isOpen, onClose, src, poster }: VideoPlayerDialogProps) => {
  const isPc = useMediaQuery('(min-width: 768px)');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={isPc ? '5xl' : 'full'}
      placement="center"
      backdrop="opaque"
      classNames={{
        backdrop: 'bg-black/80',
        base: 'bg-transparent shadow-none',
        body: 'p-0',
        closeButton: 'text-white text-2xl hover:bg-white/20 active:bg-white/20 z-[60] md:top-2 md:right-2 top-4 right-4',
      }}
    >
      <ModalContent className="bg-transparent">
        <ModalBody className={`p-0 flex items-center justify-center ${isPc ? '' : 'h-full'}`}>
          {isOpen && (
            <MediaPlayer
              className={`w-full ${isPc ? 'max-h-[85vh]' : 'max-h-full'}`}
              src={src}
              autoPlay
              playsInline
            >
              <MediaProvider>
                {poster && <Poster className="vds-poster" src={poster} alt="" />}
              </MediaProvider>
              <DefaultVideoLayout icons={defaultLayoutIcons} />
            </MediaPlayer>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
});
