
import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ImageCropModalProps {
  imageSrc: string;
  aspectRatio: string; // e.g., "16:9", "1:1"
  onCrop: (croppedBase64: string) => void;
  onCancel: () => void;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const ImageCropModal: React.FC<ImageCropModalProps> = ({ imageSrc, aspectRatio, onCrop, onCancel }) => {
  const [imgRect, setImgRect] = useState<Rect | null>(null);
  const [cropBox, setCropBox] = useState<Rect | null>(null);
  const [isDraggingBox, setIsDraggingBox] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const getRatioValue = useCallback(() => {
    const [w, h] = aspectRatio.split(':').map(Number);
    return w / h;
  }, [aspectRatio]);

  const initCrop = useCallback(() => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;

    const cw = container.offsetWidth;
    const ch = container.offsetHeight;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    // Hitung rect gambar yang pas di dalam container (dengan padding agar tidak mepet)
    const padding = 60;
    const availableW = cw - padding;
    const availableH = ch - padding;
    const scale = Math.min(availableW / iw, availableH / ih);
    
    const width = iw * scale;
    const height = ih * scale;
    const x = (cw - width) / 2;
    const y = (ch - height) / 2;
    
    const newImgRect = { x, y, width, height };
    setImgRect(newImgRect);

    // Kotak potong awal sesuai rasio default pilihan pengguna
    const ratio = getRatioValue();
    let cbWidth, cbHeight;
    if (width / height > ratio) {
      cbHeight = height * 0.85;
      cbWidth = cbHeight * ratio;
    } else {
      cbWidth = width * 0.85;
      cbHeight = cbWidth / ratio;
    }
    
    setCropBox({
      x: x + (width - cbWidth) / 2,
      y: y + (height - cbHeight) / 2,
      width: cbWidth,
      height: cbHeight
    });
  }, [getRatioValue]);

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
        initCrop();
    }
  }, [imageSrc, initCrop]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, type: string) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    if (type === 'move') {
      setIsDraggingBox(true);
    } else {
      setIsResizing(type);
    }
    setDragStart({ x: clientX, y: clientY });
    e.stopPropagation();
  };

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if ((!isDraggingBox && !isResizing) || !imgRect || !cropBox) return;

    const clientX = 'touches' in e ? (e.touches[0]?.clientX ?? 0) : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? (e.touches[0]?.clientY ?? 0) : (e as MouseEvent).clientY;
    const dx = clientX - dragStart.x;
    const dy = clientY - dragStart.y;

    setCropBox(prev => {
      if (!prev) return null;
      let { x, y, width, height } = prev;

      if (isDraggingBox) {
        // Geser seluruh kotak secara bebas
        x = Math.max(imgRect.x, Math.min(imgRect.x + imgRect.width - width, x + dx));
        y = Math.max(imgRect.y, Math.min(imgRect.y + imgRect.height - height, y + dy));
      } else if (isResizing) {
        const minSize = 30;
        
        // Logika Resizing Bebas (Non-Locked Ratio)
        if (isResizing === 'br') { // Bottom-Right
          const newW = Math.max(minSize, Math.min(imgRect.x + imgRect.width - x, width + dx));
          const newH = Math.max(minSize, Math.min(imgRect.y + imgRect.height - y, height + dy));
          width = newW;
          height = newH;
        } else if (isResizing === 'tl') { // Top-Left
          const maxW = x + width - imgRect.x;
          const maxH = y + height - imgRect.y;
          const newW = Math.max(minSize, Math.min(maxW, width - dx));
          const newH = Math.max(minSize, Math.min(maxH, height - dy));
          x = x + (width - newW);
          y = y + (height - newH);
          width = newW;
          height = newH;
        } else if (isResizing === 'tr') { // Top-Right
          const maxW = imgRect.x + imgRect.width - x;
          const maxH = y + height - imgRect.y;
          const newW = Math.max(minSize, Math.min(maxW, width + dx));
          const newH = Math.max(minSize, Math.min(maxH, height - dy));
          y = y + (height - newH);
          width = newW;
          height = newH;
        } else if (isResizing === 'bl') { // Bottom-Left
          const maxW = x + width - imgRect.x;
          const maxH = imgRect.y + imgRect.height - y;
          const newW = Math.max(minSize, Math.min(maxW, width - dx));
          const newH = Math.max(minSize, Math.min(maxH, height + dy));
          x = x + (width - newW);
          width = newW;
          height = newH;
        }
      }

      return { x, y, width, height };
    });

    setDragStart({ x: clientX, y: clientY });
  }, [isDraggingBox, isResizing, dragStart, imgRect, cropBox]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingBox(false);
    setIsResizing(null);
  }, []);

  useEffect(() => {
    if (isDraggingBox || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove);
      window.addEventListener('touchend', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDraggingBox, isResizing, handleMouseMove, handleMouseUp]);

  const handleApplyCrop = () => {
    const img = imgRef.current;
    if (!img || !imgRect || !cropBox) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = img.naturalWidth / imgRect.width;
    const sx = (cropBox.x - imgRect.x) * scale;
    const sy = (cropBox.y - imgRect.y) * scale;
    const sWidth = cropBox.width * scale;
    const sHeight = cropBox.height * scale;

    // Output target: 1024px pada sisi terpanjang untuk menjaga kualitas
    const targetLongSide = 1024;
    const currentCropRatio = cropBox.width / cropBox.height;

    if (currentCropRatio >= 1) {
        canvas.width = targetLongSide;
        canvas.height = targetLongSide / currentCropRatio;
    } else {
        canvas.height = targetLongSide;
        canvas.width = targetLongSide * currentCropRatio;
    }

    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
    onCrop(canvas.toDataURL('image/jpeg', 0.95));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-6 bg-black/95 backdrop-blur-md overflow-hidden">
      <div className="bg-[#1a182e] border border-white/20 rounded-2xl md:rounded-3xl w-full max-w-4xl h-full max-h-[95vh] md:max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-white/10 flex justify-between items-center bg-[#221f3d] shrink-0">
          <div className="flex flex-col">
            <h3 className="text-lg md:text-xl font-bold text-white leading-tight">Bebas Cropping</h3>
            <p className="text-[10px] text-teal-400 font-bold uppercase tracking-wider">Tarik sisi manapun secara bebas (Rasio Tidak Terkunci)</p>
          </div>
          <button onClick={onCancel} className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Editor Area */}
        <div 
          className="relative flex-grow bg-[#0d0c1c] overflow-hidden flex items-center justify-center min-h-0 select-none" 
          ref={containerRef}
        >
          {/* Gambar asli */}
          <img
            ref={imgRef}
            src={imageSrc}
            onLoad={initCrop}
            alt="Source"
            draggable={false}
            className={`absolute transition-opacity duration-300 ${imgRect ? 'opacity-100' : 'opacity-0'}`}
            style={imgRect ? {
              left: imgRect.x,
              top: imgRect.y,
              width: imgRect.width,
              height: imgRect.height,
              pointerEvents: 'none'
            } : { opacity: 0 }}
          />
          
          {/* Overlay Gelap */}
          {imgRect && cropBox && (
            <div className="absolute inset-0 z-10 pointer-events-none">
              <div 
                className="absolute bg-black/75" 
                style={{ left: imgRect.x, top: imgRect.y, width: imgRect.width, height: cropBox.y - imgRect.y }}
              />
              <div 
                className="absolute bg-black/75" 
                style={{ left: imgRect.x, top: cropBox.y + cropBox.height, width: imgRect.width, height: imgRect.y + imgRect.height - (cropBox.y + cropBox.height) }}
              />
              <div 
                className="absolute bg-black/75" 
                style={{ left: imgRect.x, top: cropBox.y, width: cropBox.x - imgRect.x, height: cropBox.height }}
              />
              <div 
                className="absolute bg-black/75" 
                style={{ left: cropBox.x + cropBox.width, top: cropBox.y, width: imgRect.x + imgRect.width - (cropBox.x + cropBox.width), height: cropBox.height }}
              />
            </div>
          )}

          {/* Interactive Crop Box */}
          {imgRect && cropBox && (
            <div 
              className="absolute z-20 border-2 border-teal-500 cursor-move shadow-[0_0_20px_rgba(45,212,191,0.2)]"
              style={{
                left: cropBox.x,
                top: cropBox.y,
                width: cropBox.width,
                height: cropBox.height
              }}
              onMouseDown={(e) => handleMouseDown(e, 'move')}
              onTouchStart={(e) => handleMouseDown(e, 'move')}
            >
              {/* Grid lines */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
                <div className="border-r border-b border-white"></div>
                <div className="border-r border-b border-white"></div>
                <div className="border-b border-white"></div>
                <div className="border-r border-b border-white"></div>
                <div className="border-r border-b border-white"></div>
                <div className="border-b border-white"></div>
                <div className="border-r border-white"></div>
                <div className="border-r border-white"></div>
                <div></div>
              </div>

              {/* 4 Handles di setiap sudut untuk resize bebas */}
              {/* TL */}
              <div 
                className="absolute -top-3 -left-3 w-8 h-8 flex items-center justify-center cursor-nw-resize z-30"
                onMouseDown={(e) => handleMouseDown(e, 'tl')}
                onTouchStart={(e) => handleMouseDown(e, 'tl')}
              >
                <div className="w-4 h-4 bg-white border-2 border-teal-500 rounded shadow-lg" />
              </div>
              {/* TR */}
              <div 
                className="absolute -top-3 -right-3 w-8 h-8 flex items-center justify-center cursor-ne-resize z-30"
                onMouseDown={(e) => handleMouseDown(e, 'tr')}
                onTouchStart={(e) => handleMouseDown(e, 'tr')}
              >
                <div className="w-4 h-4 bg-white border-2 border-teal-500 rounded shadow-lg" />
              </div>
              {/* BL */}
              <div 
                className="absolute -bottom-3 -left-3 w-8 h-8 flex items-center justify-center cursor-sw-resize z-30"
                onMouseDown={(e) => handleMouseDown(e, 'bl')}
                onTouchStart={(e) => handleMouseDown(e, 'bl')}
              >
                <div className="w-4 h-4 bg-white border-2 border-teal-500 rounded shadow-lg" />
              </div>
              {/* BR */}
              <div 
                className="absolute -bottom-3 -right-3 w-8 h-8 flex items-center justify-center cursor-se-resize z-30"
                onMouseDown={(e) => handleMouseDown(e, 'br')}
                onTouchStart={(e) => handleMouseDown(e, 'br')}
              >
                <div className="w-4 h-4 bg-white border-2 border-teal-500 rounded shadow-lg" />
              </div>
            </div>
          )}

          <div className="absolute bottom-4 z-30 px-4 py-2 bg-black/60 rounded-full text-white/80 text-[10px] uppercase tracking-[0.15em] font-bold pointer-events-none backdrop-blur-md border border-white/10">
            Tarik pojok manapun untuk crop bebas tanpa rasio terkunci
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 md:p-6 bg-[#221f3d] border-t border-white/10 flex gap-4 shrink-0">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 px-6 rounded-2xl bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-all font-semibold border border-white/10 text-sm md:text-base"
          >
            Batal
          </button>
          <button
            onClick={handleApplyCrop}
            className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-teal-500 text-white hover:from-purple-700 hover:to-teal-600 transition-all font-bold shadow-[0_8px_25px_rgba(45,212,191,0.25)] active:scale-95 text-sm md:text-base"
          >
            Selesai & Gunakan
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;
