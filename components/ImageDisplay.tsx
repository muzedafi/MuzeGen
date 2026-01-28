
import React, { useState, useRef, useEffect } from 'react';
import { CAMERA_ANGLES } from '../constants';

interface ImageDisplayProps {
  generatedImages: string[] | null;
  isLoading: boolean;
  error: string | null;
  aspectRatio: string;
  onUseForVideo: (imageUrl: string) => void;
  onEditDetail: (index: number) => void;
  onChangeAngle: (index: number, angle: string) => void;
}

const LoadingSpinner: React.FC = () => (
  <div className="flex flex-col items-center justify-center gap-4 text-gray-400">
    <svg className="animate-spin h-12 w-12 text-teal-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <p className="text-lg">Menciptakan visi Anda...</p>
  </div>
);

const ImageDisplay: React.FC<ImageDisplayProps> = ({ 
  generatedImages, 
  isLoading, 
  error, 
  aspectRatio, 
  onUseForVideo,
  onEditDetail,
  onChangeAngle
}) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [activeAngleDropdown, setActiveAngleDropdown] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveAngleDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDownload = (imageUrl: string, index: number) => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    const mimeType = imageUrl.split(';')[0].split(':')[1];
    const extension = mimeType.split('/')[1] || 'jpg';
    link.download = `MuzeGen-AI-image-${index + 1}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className={`w-full bg-black/20 rounded-lg flex items-center justify-center p-4 border-2 border-dashed border-white/10 min-h-[400px]`}>
        {isLoading && <LoadingSpinner />}
        {!isLoading && error && (
           <div className="text-center text-red-400 p-4">
              <h3 className="font-bold text-lg mb-2">Gagal Menghasilkan Gambar</h3>
              <p className="text-sm">{error}</p>
           </div>
        )}
        {!isLoading && !error && generatedImages && (
          <div className="grid grid-cols-2 gap-4 w-full h-full">
            {generatedImages.map((image, index) => (
              <div key={index} className="relative group w-full aspect-square bg-[#161324] rounded-xl overflow-hidden border border-white/5 shadow-xl">
                <img 
                  src={image} 
                  alt={`MuzeGen AI Result ${index + 1}`} 
                  className="w-full h-full object-contain"
                />

                {/* Top Left: Angle Camera Dropdown */}
                <div className="absolute top-2 left-2 z-30" ref={activeAngleDropdown === index ? dropdownRef : null}>
                   <button 
                    onClick={() => setActiveAngleDropdown(activeAngleDropdown === index ? null : index)}
                    className="p-1.5 bg-black/60 backdrop-blur-md rounded-lg text-white hover:bg-teal-500 transition-colors border border-white/10"
                    title="Ubah Angle Kamera"
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                   </button>
                   
                   {activeAngleDropdown === index && (
                     <div className="absolute top-full left-0 mt-1 w-48 bg-[#1a182e] border border-white/10 rounded-lg shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                        {CAMERA_ANGLES.map((angle) => (
                          <button
                            key={angle}
                            onClick={() => {
                              onChangeAngle(index, angle);
                              setActiveAngleDropdown(null);
                            }}
                            className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-teal-500 hover:text-white transition-colors border-b border-white/5 last:border-0"
                          >
                            {angle}
                          </button>
                        ))}
                     </div>
                   )}
                </div>

                {/* Top Right: Edit Button */}
                <div className="absolute top-2 right-2 z-30">
                  <button 
                    onClick={() => onEditDetail(index)}
                    className="p-1.5 bg-black/60 backdrop-blur-md rounded-lg text-white hover:bg-purple-500 transition-colors border border-white/10"
                    title="Edit Prompt Detail"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  </button>
                </div>

                {/* Minimalist Overlay Icons */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                  <div className="flex gap-3 scale-90 group-hover:scale-100 transition-transform duration-300">
                      <button
                          onClick={() => setPreviewImage(image)}
                          className="w-10 h-10 flex items-center justify-center bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-purple-600 transition-all border border-white/20"
                          title="Pratinjau"
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                      </button>
                      <button
                          onClick={() => handleDownload(image, index)}
                          className="w-10 h-10 flex items-center justify-center bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-teal-600 transition-all border border-white/20"
                          title="Simpan ke Perangkat"
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                      </button>
                      <button
                          onClick={() => onUseForVideo(image)}
                          className="w-10 h-10 flex items-center justify-center bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-indigo-600 transition-all border border-white/20"
                          title="Gunakan untuk Video"
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                      </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {!isLoading && !error && !generatedImages && null}
      </div>

      {previewImage && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4 cursor-pointer backdrop-blur-sm" 
          onClick={() => setPreviewImage(null)}
        >
            <div className="relative max-w-5xl w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                <img 
                  src={previewImage} 
                  alt="Full Preview" 
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                />
                <button
                    onClick={() => setPreviewImage(null)}
                    className="absolute top-4 right-4 bg-white/10 hover:bg-red-500 rounded-full p-2 text-white transition-all border border-white/20"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
      )}
    </>
  );
};

export default ImageDisplay;
