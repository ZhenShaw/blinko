import { NoteType } from "@shared/lib/types";
import { PromiseState } from "@/store/standard/PromiseState";

export type OnSendContentType = {
  content: string;
  files: (FileType & { uploadPath: string })[]
  noteType: NoteType;
  references: number[]
  metadata?: any;
}

export type FileType = {
  name: string
  size: number
  previewType: 'image' | 'audio' | 'video' | 'other'
  extension: string
  preview: any
  uploadPromise: PromiseState<any>
  type: string // audio/webm
  metadata?: {
    thumbnailPath?: string
    width?: number
    height?: number
    duration?: number
    audioDuration?: string
    audioDurationSeconds?: number
    isUserVoiceRecording?: boolean
  }
}
