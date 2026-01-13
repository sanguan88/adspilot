"use client"

import { useState } from "react"
import { Play, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface VideoPlaceholderProps {
  onPlay?: () => void
  className?: string
  videoUrl?: string
}

export function VideoPlaceholder({ onPlay, className, videoUrl }: VideoPlaceholderProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const handlePlay = () => {
    setIsPlaying(true)
    setShowModal(true)
    if (onPlay) onPlay()
  }

  const handleClose = () => {
    setIsPlaying(false)
    setShowModal(false)
  }

  return (
    <>
      <div
        className={cn(
          "relative w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5",
          className
        )}
      >
        {!isPlaying ? (
          <div className="text-center">
            <Button
              size="lg"
              className="h-20 w-20 rounded-full bg-primary hover:bg-primary/90 shadow-lg hover:scale-110 transition-transform"
              onClick={handlePlay}
            >
              <Play className="h-10 w-10 ml-1 text-primary-foreground fill-primary-foreground" />
            </Button>
            <p className="mt-4 text-sm text-muted-foreground font-medium">
              Klik untuk memutar video
            </p>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-black/50">
            <div className="text-center text-white">
              <p className="text-lg font-semibold mb-2">Video akan dimuat...</p>
              <p className="text-sm opacity-75">Tempatkan video demo SOROBOT di sini</p>
            </div>
          </div>
        )}
      </div>

      {/* Video Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={handleClose}
        >
          <div
            className="relative w-full max-w-5xl mx-4 aspect-video bg-black rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            
            {videoUrl ? (
              <iframe
                src={videoUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                <div className="text-center text-foreground p-8">
                  <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                    <Play className="h-8 w-8 text-primary ml-1" />
                  </div>
                  <p className="text-xl font-semibold mb-2">Video Demo SOROBOT</p>
                  <p className="text-sm text-muted-foreground">
                    Masukkan URL video YouTube atau Vimeo di sini
                  </p>
                  <p className="text-xs text-muted-foreground mt-4">
                    Contoh: https://www.youtube.com/embed/VIDEO_ID
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

