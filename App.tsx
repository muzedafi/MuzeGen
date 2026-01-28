
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateImageFromText, editImageWithPrompt, getPromptFeedback, getSmartSuggestions, generateVideoFromPrompt, generateDialogueScript, generateJsonPrompt, analyzeImageForMovement, generateSingleImage, generateAffiliateImageFromRefs, generateProductConcept, generateImageWithMultipleRefs } from './services/geminiService';
import { authService } from './services/authService';
import { useAuth } from './hooks/useAuth';
import { ART_STYLES, COLOR_PALETTES, ASPECT_RATIOS, ENVIRONMENT_OPTIONS, RESOLUTION_OPTIONS, BLUR_OPTIONS, CAMERA_ANGLES, LIGHTING_STYLES, TIME_OPTIONS, VIDEO_STYLES, CAMERA_MOVEMENTS, VIDEO_RESOLUTIONS, VIDEO_LANGUAGES, VOICE_GENDERS, SPEAKING_STYLES, VIDEO_MOODS, MOVEMENT_OPTIONS, STRUCTURED_PROMPT_TEXTS, DIALOGUE_STYLES, DIALOGUE_TEMPOS, VIDEO_CONCEPTS, AI_MODEL_TYPES, AI_MODEL_AGES, AFFILIATE_ASPECT_RATIOS, AFFILIATE_AD_TYPES, AFFILIATE_LANGUAGES } from './constants';
import DnaInputSection from './components/DnaInputSection';
import SelectableTags from './components/SelectableTags';
import ImageDisplay from './components/ImageDisplay';
import Login from './components/Login';
import CustomSelect from './components/CustomSelect';
import ImageCropModal from './components/ImageCropModal';


/**
 * Processes a base64 image URL to fit a target aspect ratio by center-cropping it.
 * @param base64Url The original image data URL.
 * @param targetAspectRatioString The desired aspect ratio (e.g., "16:9").
 * @returns A promise that resolves with the new cropped image data URL.
 */
const processImageToAspectRatio = (
  base64Url: string,
  targetAspectRatioString: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const aspectRatioMap: { [key: string]: number } = {
      '1:1': 1 / 1, '16:9': 16 / 9, '9:16': 9 / 16, '4:3': 4 / 3, '3:4': 3 / 4,
    };
    const targetRatio = aspectRatioMap[targetAspectRatioString];

    if (!targetRatio) {
      console.warn('Invalid aspect ratio string, returning original image.');
      return resolve(base64Url);
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Failed to get canvas context.'));

      const originalWidth = img.width;
      const originalHeight = img.height;
      const originalRatio = originalWidth / originalHeight;

      let sx = 0, sy = 0, sWidth = originalWidth, sHeight = originalHeight;

      if (targetRatio > originalRatio) {
        sHeight = originalWidth / targetRatio;
        sy = (originalHeight - sHeight) / 2;
      } else if (targetRatio < originalRatio) {
        sWidth = originalHeight * targetRatio;
        sx = (originalWidth - sWidth) / 2;
      }

      canvas.width = sWidth;
      canvas.height = sHeight;
      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
      
      const mimeType = base64Url.match(/^data:(image\/.+);base64,/)?.[1] || 'image/jpeg';
      resolve(canvas.toDataURL(mimeType));
    };
    img.onerror = (err) => reject(new Error('Failed to load image for aspect ratio processing.'));
    img.src = base64Url;
  });
};

const LOGO_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAASFBMVEUAAAD/igD/igD/igD/igD/igD/igD/igD/igD/igD/igD/igD/igD/igD/igD/igD/igD/igD/igD/igD/igAojv8eAAAAGHRSTlMAAQIDBAUGBwgJCgsMDQ4PEBslQiYqAAADLklEQVR42u2c25qqMBBGJQkiCCoouHr/l/y2BBPKKDEz3czs/T9s1x5KmslMZiYAgGAY3vF4vL58Z9qthL3xYh3JPhfX/b/KfsP+jK/9yfYXT7b/pM5p234y9Zq+f6Tty1r5OwBOP9j6f7Zt/5Hif9jkv7bu/2vhfwXw/zrwv8Dwv8DwX8LwX8LwX8LwX8bwT8bwn4zw34z/L8H/l+D/S/B/IfqfBfyfBvxPBvwPBvyPBvxvAf+fBP+fBPyfBvyfBPyfBPyfBP+/BP6/BPyfBP6/hP/fkv9fkv8/Jf9/S/4/y/4/y/4/y/4/y/5/yP4/yP5/yP4/yP5/yP6/w/7/wP6/w/7/wP5/w/5/w/7/wP6/Q/9/Q/9/Q/9/Q/9/Q/9/RP9/RP9/RP9/RP9/RP9/hP9/hP9/hP9/hP9/hP9/xP9/xP9/xP9/xP9/xP8v6f/L+n/y/p/8v6f/L+n/S/p/0v6f9L+n/S/p/0v6f9P8X9f8X9f8X9f8X9f8X9f8X9f8b+v8b+v8b+v8b+v8b+v8b+v8j+v8j+v8j+v8j+v8j+v8j+v8j+v8r+v8r+v8r+v8r+v8r+v8r+v8z+v8z+v8z+v8z+v8z+v8z+v8z+v8D/f8A/f8A/f8A/f8A/f8A/f8B/f8B/f8B/f8B/f8B/f8B/f8D//8A//8A//8A//8A//8A//8A//8A/+f8n/N/zv85/+f8n/N/zv+v8H9F8L+i+B9R/I8o/kcE/yOC/xHB/4jgv8PwL8PwC8MvDL8w/MLwC8MvjH8M4x/D+Mew/DGMf4zhH8P4xzD+8X/v4/+u7/+67/96+L+m8F9T+K8p/FcV/quKf1XBv6rgv6XwX1L4Lyl8V5T+Kgp/FcG/qvi/pvBfE/ivCfxXBP4rAv+VwH8p8L+0+F8B/L8O/C/g/wt/v/59/j77x+Px+PLzBxG5Yv1H+QGgAAAAAElFTkSuQmCC';

// --- Icon Components ---
const IconDashboard: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>;
const IconImage: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>;
const IconFilm: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>;
const IconProject: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>;
const IconAssets: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>;
const IconCommunity: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
const IconSettings: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;

const MagicMenuIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 8H18" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <path d="M6 12H14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <path d="M6 16H12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 11.5L16.5 10.5L17.5 11.5L16.5 12.5L16 11.5Z" fill="#2DD4BF"/>
    <path d="M14.5 15.5L15 14.5L16 15.5L15 16.5L14.5 15.5Z" fill="#2DD4BF"/>
    <path d="M17.5 14.5L18 13.5L19 14.5L18 15.5L17.5 14.5Z" fill="#2DD4BF"/>
  </svg>
);

const UserProfileIcon: React.FC<{ email: string }> = ({ email }) => {
    const getInitials = (email: string) => {
        if (!email) return '?';
        const parts = email.split('@')[0].split('.').map(p => p[0]).join('');
        return (parts || '?').substring(0, 2).toUpperCase();
    }

    return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-teal-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
            {getInitials(email)}
        </div>
    );
};

// Icons for Affiliate Result Section
const IconEye: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
const IconDownload: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
const IconPencil: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>;
const IconSparkles: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm6 2a1 1 0 011 1v1h1a1 1 0 010 2h-1v1a1 1 0 01-2 0V8h-1a1 1 0 010-2h1V5a1 1 0 011-1zm-3 5a1 1 0 011 1v1h1a1 1 0 010 2h-1v1a1 1 0 01-2 0v-1H6a1 1 0 010-2h1v-1a1 1 0 011-1z" clipRule="evenodd" /><path d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" /></svg>;


interface AffiliateResultSectionProps {
    title: string;
    images: string[];
    isLoading: boolean;
    aspectRatio: string;
    onImageUpdate: (index: number, newImageUrl: string) => void;
    onSuggestMovement: (imageUrl: string, format: 'text' | 'json') => void;
    isApiKeySelected: boolean;
}

const AffiliateResultSection: React.FC<AffiliateResultSectionProps> = ({ title, images, isLoading, aspectRatio, onImageUpdate, onSuggestMovement, isApiKeySelected }) => {
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editPrompt, setEditPrompt] = useState('');
    const [isEditingLoading, setIsEditingLoading] = useState<boolean>(false);
    const [editingError, setEditingError] = useState<string | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [suggestionMenuIndex, setSuggestionMenuIndex] = useState<number | null>(null);
    const suggestionMenuRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (suggestionMenuRef.current && !suggestionMenuRef.current.contains(event.target as Node)) {
                setSuggestionMenuIndex(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const getAspectRatioClass = (ratio: string) => {
        switch (ratio) {
            case '9:16': return 'aspect-[9/16]';
            case '1:1': return 'aspect-square';
            case '16:9': return 'aspect-video';
            default: return 'aspect-square';
        }
    };
    const aspectRatioClass = getAspectRatioClass(aspectRatio);

    const handleDownload = (imageUrl: string, index: number) => {
        const link = document.createElement('a');
        link.href = imageUrl;
        // Updated filename with MuzeGen AI branding
        link.download = `MuzeGen-AI-affiliate-${title.toLowerCase().replace(/\s+/g, '-')}-${index + 1}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleEditSubmit = async () => {
        if (editingIndex === null || !editPrompt) return;
        setIsEditingLoading(true);
        setEditingError(null);
        try {
            const originalImage = images[editingIndex];
            const newImageUrl = await editImageWithPrompt(editPrompt, originalImage);
            onImageUpdate(editingIndex, newImageUrl);
            setEditingIndex(null);
            setEditPrompt('');
        } catch (error) {
            setEditingError(error instanceof Error ? error.message : 'Gagal mengedit gambar.');
        } finally {
            setIsEditingLoading(false);
        }
    };

    const renderContent = () => {
        const placeholders = isLoading ? Array(Math.max(0, 4 - images.length)).fill(0) : [];
        if (images.length === 0 && !isLoading) {
            return <div className="aspect-video mt-2 bg-white/5 rounded-lg flex items-center justify-center text-gray-500 text-sm">Pratinjau</div>;
        }
        
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                {[...images, ...placeholders].map((img, index) => {
                    if (index >= images.length) { // Render placeholders
                         return (
                            <div key={`loader-${index}`} className={`${aspectRatioClass} bg-white/5 rounded-lg flex items-center justify-center border-2 border-dashed border-white/10`}>
                                 <svg className="animate-spin h-6 w-6 text-teal-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            </div>
                        );
                    }
                    // Render actual image cards
                    return (
                        <div key={index} className="flex flex-col gap-2">
                             <div className={`relative group ${aspectRatioClass} bg-black/30 rounded-lg overflow-hidden border border-white/10`}>
                                <img src={img} alt={`${title} image ${index + 1}`} className="w-full h-full object-cover" />
                                
                                {editingIndex !== index && (
                                     <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                                        <button onClick={() => setPreviewImage(img)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"><IconEye /></button>
                                        <button onClick={() => handleDownload(img, index)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"><IconDownload /></button>
                                        <button onClick={() => { setEditingIndex(index); setEditPrompt(''); setEditingError(null); }} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"><IconPencil /></button>
                                     </div>
                                )}
                                
                                {editingIndex === index && (
                                     <div className="absolute inset-0 bg-black/80 p-3 flex flex-col justify-end gap-2">
                                        {isEditingLoading ? (
                                            <div className="flex items-center justify-center text-white"><svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg> Mengedit...</div>
                                        ) : (
                                            <>
                                                <input
                                                    type="text"
                                                    value={editPrompt}
                                                    onChange={(e) => setEditPrompt(e.target.value)}
                                                    placeholder="contoh: ubah warna baju jadi merah"
                                                    className="w-full bg-white/10 text-white text-sm rounded-md p-2 border border-white/20 focus:ring-1 focus:ring-teal-400"
                                                />
                                                {editingError && <p className="text-red-400 text-xs text-center">{editingError}</p>}
                                                <div className="flex gap-2">
                                                    <button onClick={handleEditSubmit} className="flex-1 py-1.5 px-2 text-xs font-semibold rounded-md bg-teal-500 hover:bg-teal-600 text-white transition disabled:opacity-50" disabled={!editPrompt}>Ubah</button>
                                                    <button onClick={() => setEditingIndex(null)} className="flex-1 py-1.5 px-2 text-xs font-semibold rounded-md bg-white/20 hover:bg-white/30 text-white transition">Batal</button>
                                                </div>
                                            </>
                                        )}
                                     </div>
                                )}
                            </div>
                            <div className="relative" ref={suggestionMenuIndex === index ? suggestionMenuRef : null}>
                                <button 
                                    onClick={() => setSuggestionMenuIndex(prev => prev === index ? null : index)} 
                                    disabled={!isApiKeySelected}
                                    className="w-full text-xs font-semibold text-center py-2 bg-white/10 border border-transparent rounded-lg text-white hover:bg-white/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <IconSparkles/>
                                    <span>Saran Prompt Gerakan</span>
                                </button>
                                {suggestionMenuIndex === index && (
                                    <div className="absolute bottom-full mb-1 w-full bg-[#161324]/90 backdrop-blur-md border border-white/10 rounded-lg shadow-lg z-20 py-1">
                                        <button
                                            onClick={() => {
                                                onSuggestMovement(img, 'text');
                                                setSuggestionMenuIndex(null);
                                            }}
                                            className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-white/10 transition-colors"
                                        >
                                            TEXT
                                        </button>
                                        <button
                                            onClick={() => {
                                                onSuggestMovement(img, 'json');
                                                setSuggestionMenuIndex(null);
                                            }}
                                            className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-white/10 transition-colors"
                                        >
                                            JSON
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <>
            <div className="p-4 bg-black/20 rounded-xl border border-white/10">
                <h4 className="font-semibold text-gray-300">{title}</h4>
                {renderContent()}
            </div>
             {previewImage && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setPreviewImage(null)}>
                    <img src={previewImage} alt="Pratinjau" className="max-w-full max-h-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
                </div>
            )}
        </>
    );
};


const App: React.FC = () => {
  // --- Auth State ---
  const { user, loading: authLoading } = useAuth();
  
  // --- API Key State ---
  const [isApiKeySelected, setIsApiKeySelected] = useState(false);

  // --- UI State ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<string>('dashboard');
  const [isFading, setIsFading] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  // --- IMAGE DNA States ---
  const [subject, setSubject] = useState<string>('Wanita muda Indonesia yang cantik');
  const [style, setStyle] = useState<string>('Photorealistic');
  const [environment, setEnvironment] = useState<string>('Ruangan estetis dengan lampu LED');
  const [customEnvironment, setCustomEnvironment] = useState<string>('');
  const [environmentDetails, setEnvironmentDetails] = useState<string>('');
  const [palette, setPalette] = useState<string>('Earthy Tones');
  const [details, setDetails] = useState<string>('memakai tas, dengan senyum ceria');
  const [aspectRatio, setAspectRatio] = useState<string>('9:16');
  const [resolution, setResolution] = useState<string>('8K');
  const [backgroundBlur, setBackgroundBlur] = useState<string>('Tidak ada');
  const [cameraAngle, setCameraAngle] = useState<string>('Tangkapan Sejajar Mata');
  const [lightingStyle, setLightingStyle] = useState<string>('Cahaya Latar');
  const [timeOfDay, setTimeOfDay] = useState<string>('Siang Hari');
  
  // New States for AI Generator multiple references
  const [mainProductImage, setMainProductImage] = useState<string | null>(null);
  const [supportingImages, setSupportingImages] = useState<(string | null)[]>([null, null, null]);
  const [processedMainImage, setProcessedMainImage] = useState<string | null>(null);
  const [processedSupportingImages, setProcessedSupportingImages] = useState<(string | null)[]>([null, null, null]);

  // Model States
  const [mainModelImage, setMainModelImage] = useState<string | null>(null);
  const [supportingModelImage, setSupportingModelImage] = useState<string | null>(null);
  const [processedMainModelImage, setProcessedMainModelImage] = useState<string | null>(null);
  const [processedSupportingModelImage, setProcessedSupportingModelImage] = useState<string | null>(null);

  const [uploadedImage, setUploadedImage] = useState<string | null>(null); // Still used for Simple Edit mode and Film
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [removeBackground, setRemoveBackground] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const supportInputRef1 = useRef<HTMLInputElement>(null);
  const supportInputRef2 = useRef<HTMLInputElement>(null);
  const supportInputRef3 = useRef<HTMLInputElement>(null);
  const mainModelInputRef = useRef<HTMLInputElement>(null);
  const supportModelInputRef = useRef<HTMLInputElement>(null);
  const editReferenceInputRef = useRef<HTMLInputElement>(null);

  const [artStyleFilter, setArtStyleFilter] = useState<string>('');

  // --- VIDEO DNA States ---
  const [videoUploadedImage, setVideoUploadedImage] = useState<string | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const [videoConcept, setVideoConcept] = useState<string>('Afiliasi');
  const [customVideoConcept, setCustomVideoConcept] = useState<string>('');
  const [videoSubject, setVideoSubject] = useState<string>('');
  const [videoAction, setVideoAction] = useState<string>('');
  const [videoStyle, setVideoStyle] = useState<string>('Sinematik');
  const [videoAspectRatio, setVideoAspectRatio] = useState<string>('16:9');
  const [videoResolution, setVideoResolution] = useState<string>('1080p');
  const [videoEnvironment, setVideoEnvironment] = useState<string>('Pemandangan alam pegunungan yang megah');
  const [videoTimeOfDay, setVideoTimeOfDay] = useState<string>('Golden Hour');
  const [cameraMovement, setCameraMovement] = useState<string>('Tangkapan pelacakan lambat');
  const [videoLightingStyle, setVideoLightingStyle] = useState<string>('Golden Hour');
  const [videoPalette, setVideoPalette] = useState<string>('Golden Hour Hues');
  const [videoDetails, setVideoDetails] = useState<string>('dengan sinar matahari yang menyinari sayapnya');
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(false);
  const [soundLanguage, setSoundLanguage] = useState<string>(VIDEO_LANGUAGES[0]);
  const [voiceGender, setVoiceGender] = useState<string>(VOICE_GENDERS[0]);
  const [speakingStyle, setSpeakingStyle] = useState<string>(SPEAKING_STYLES[0]);
  const [videoMood, setVideoMood] = useState<string>(VIDEO_MOODS[0]);
  const [isDialogueEnabled, setIsDialogueEnabled] = useState<boolean>(false);
  const [dialogueText, setDialogueText] = useState<string>('');
  const [isDialogueLoading, setIsDialogueLoading] = useState<boolean>(false);
  const [dialogueError, setDialogueError] = useState<string | null>(null);
  
  // --- Structured JSON Prompt States ---
  const [parsedJsonPrompt, setParsedJsonPrompt] = useState<any[] | null>(null);
  const [isJsonLoading, setIsJsonLoading] = useState<boolean>(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [copiedBlock, setCopiedBlock] = useState<number | null>(null);
  const [jsonPromptLanguage, setJsonPromptLanguage] = useState<'en' | 'id'>('en');
  
  const [hookMovement, setHookMovement] = useState<string>(MOVEMENT_OPTIONS.en[0].value);
  const [problemMovement, setProblemMovement] = useState<string>(MOVEMENT_OPTIONS.en[1].value);
  const [ctaMovement, setCtaMovement] = useState<string>(MOVEMENT_OPTIONS.en[2].value);
  
  const [customHookMovement, setCustomHookMovement] = useState<string>('');
  const [customProblemMovement, setCustomProblemMovement] = useState<string>('');
  const [customCtaMovement, setCustomCtaMovement] = useState<string>('');

  const [hookDialogue, setHookDialogue] = useState<string>('');
  const [problemDialogue, setProblemDialogue] = useState<string>('');
  const [ctaDialogue, setCtaDialogue] = useState<string>('');
  
  const [dialogueStyle, setDialogueStyle] = useState<string>('Affiliate');
  const [dialogueLanguage, setDialogueLanguage] = useState<string>(VIDEO_LANGUAGES[0]);
  const [dialogueTempo, setDialogueTempo] = useState<string>(DIALOGUE_TEMPOS.en[1].value);

  // --- Movement Analysis States ---
  const [isAnalysisLoading, setIsAnalysisLoading] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // --- States for Images Generated from JSON ---
  const [jsonGeneratedImages, setJsonGeneratedImages] = useState<string[] | null>(null);
  const [isJsonImageLoading, setIsJsonImageLoading] = useState<boolean>(false);
  const [jsonImageError, setJsonImageError] = useState<string | null>(null);


  // --- IMAGE Generation States ---
  const [finalPrompt, setFinalPrompt] = useState<string>('');
  const [generatedImages, setGeneratedImages] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // --- Individual Regenerate State ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  const [editDetailPrompt, setEditDetailPrompt] = useState('');
  const [editReferenceImage, setEditReferenceImage] = useState<string | null>(null);
  const [isIndividualLoading, setIsIndividualLoading] = useState(false);

  // --- VIDEO Generation States ---
  const [finalVideoPrompt, setFinalVideoPrompt] = useState<string>('');
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState<boolean>(false);
  const [videoLoadingMessage, setVideoLoadingMessage] = useState<string>('');
  const [videoError, setVideoError] = useState<string | null>(null);


  // AI Feedback States
  const [promptFeedback, setPromptFeedback] = useState<string | null>(null);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState<boolean>(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Smart Suggestions State
  const [smartSuggestions, setSmartSuggestions] = useState<string[] | null>(null);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState<boolean>(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

  // --- Affiliate Generator State ---
  const [mainProductPhoto, setMainProductPhoto] = useState<string | null>(null);
  const [supportingProductPhotos, setSupportingProductPhotos] = useState<{ url: string; description: string }[]>([]);
  const [modelPhotos, setModelPhotos] = useState<string[]>([]);
  const [productConcept, setProductConcept] = useState<string>('');
  const [addTextOverlay, setAddTextOverlay] = useState(false);
  const [aiModelType, setAiModelType] = useState('AUTO');
  const [aiModelAge, setAiModelAge] = useState('REMAJA');
  const [isHijabModel, setIsHijabModel] = useState(false);
  const [affiliateAspectRatio, setAffiliateAspectRatio] = useState('9:16');
  const [affiliateResultAspectRatio, setAffiliateResultAspectRatio] = useState('9:16');
  const [affiliateAdType, setAffiliateAdType] = useState('AUTO');
  const [narrationLanguage, setNarrationLanguage] = useState('INDONESIA');
  const [voiceAccent, setVoiceAccent] = useState('');
  const [affiliateBrollPhotos, setAffiliateBrollPhotos] = useState<string[]>([]);
  const [affiliateUgcPhotos, setAffiliateUgcPhotos] = useState<string[]>([]);
  const [affiliateCommercialPhotos, setAffiliateCommercialPhotos] = useState<string[]>([]);
  const [isAffiliateLoading, setIsAffiliateLoading] = useState<boolean>(false);
  const [affiliateLoadingMessage, setAffiliateLoadingMessage] = useState<string>('');
  const [affiliateError, setAffiliateError] = useState<string | null>(null);
  const [isConceptLoading, setIsConceptLoading] = useState<boolean>(false);
  const [conceptError, setConceptError] = useState<string | null>(null);

  // --- Movement Suggestion Modal State ---
  const [movementSuggestion, setMovementSuggestion] = useState<string | null>(null);
  const [isMovementSuggestionLoading, setIsMovementSuggestionLoading] = useState<boolean>(false);
  const [movementSuggestionError, setMovementSuggestionError] = useState<string | null>(null);
  const [isSuggestionCopied, setIsSuggestionCopied] = useState<boolean>(false);

  // --- Crop Modal State ---
  const [cropModalData, setCropModalData] = useState<{
    src: string;
    aspect: string;
    slot?: 'main' | number | 'model-main' | 'model-support' | 'edit-ref';
  } | null>(null);

  const mainProductPhotoRef = useRef<HTMLInputElement>(null);
  const supportingProductPhotosRef = useRef<HTMLInputElement>(null);
  const modelPhotosRef = useRef<HTMLInputElement>(null);
  const editDetailRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio && user) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsApiKeySelected(hasKey);
      }
    };
    checkApiKey();
  }, [user]);


  useEffect(() => {
    const processImg = async (url: string | null) => {
        if (url) {
            try {
                return await processImageToAspectRatio(url, aspectRatio);
            } catch (err) {
                console.error("Gagal memproses gambar:", err);
                return url;
            }
        }
        return null;
    };

    // Process old single uploaded image
    if (uploadedImage) {
        processImg(uploadedImage).then(setProcessedImage);
    } else {
        setProcessedImage(null);
    }

    // Process AI Generator images
    processImg(mainProductImage).then(setProcessedMainImage);
    Promise.all(supportingImages.map(img => processImg(img))).then(setProcessedSupportingImages);

    // Process Model images
    processImg(mainModelImage).then(setProcessedMainModelImage);
    processImg(supportingModelImage).then(setProcessedSupportingModelImage);

  }, [uploadedImage, mainProductImage, supportingImages, mainModelImage, supportingModelImage, aspectRatio]);

  useEffect(() => {
    if (activeTool !== 'gambar') return;
    const constructPrompt = () => {
      let promptBody = `Sebuah penggambaran ${style} dari ${subject}`;
      if (details) {
        promptBody += `, ${details}`;
      }
      
      let baseEnv = '';
      if (environment === 'Lingkungan Kustom...') {
          baseEnv = customEnvironment.trim();
      } else {
          baseEnv = environment.trim();
      }

      const finalEnvironment = [baseEnv, environmentDetails.trim()].filter(Boolean).join(', ');

      if (finalEnvironment) {
        promptBody += `, di ${finalEnvironment}`;
      }
      
      if (timeOfDay) {
        promptBody += ` pada ${timeOfDay}`;
      }
      if (cameraAngle) {
        promptBody += `, sudut pandang ${cameraAngle}`;
      }
      if (lightingStyle) {
          promptBody += `, diterangi oleh ${lightingStyle}`;
      }
      let blurDetails = '';
      switch (backgroundBlur) {
          case 'Rendah':
              blurDetails = 'dengan latar belakang buram intensitas 20% (bokeh ringan)';
              break;
          case 'Sedang':
              blurDetails = 'dengan latar belakang buram intensitas 75% (bokeh sedang)';
              break;
          case 'Tinggi':
              blurDetails = 'dengan latar belakang sangat buram (bokeh kuat)';
              break;
      }
      if (blurDetails) {
          promptBody += `, ${blurDetails}`;
      }
      if (palette) {
        promptBody += `, dengan palet warna ${palette}`;
      }
      if (aspectRatio && !mainProductImage && !uploadedImage) {
          promptBody += `, dalam rasio aspek ${aspectRatio}`;
      }
      let resolutionDetails = '';
      switch (resolution) {
          case 'HD':
              resolutionDetails = 'resolusi tinggi, sangat detail';
              break;
          case '4K':
              resolutionDetails = 'kualitas 4K, sangat detail, fotorealistis';
              break;
          case '8K':
              resolutionDetails = 'kualitas 8K, resolusi sangat tinggi, pencahayaan sinematik, sangat detail';
              break;
      }
      promptBody += `. ${resolutionDetails}.`;

      if ((uploadedImage || mainProductImage) && removeBackground) {
        setFinalPrompt(`Hapus total latar belakang dari gambar ini, buat menjadi transparan, dan fokus hanya pada subjek utama. Setelah itu, terapkan deskripsi berikut ke subjek: ${promptBody}`);
      } else {
        setFinalPrompt(promptBody);
      }
    };
    constructPrompt();
  }, [subject, style, environment, customEnvironment, environmentDetails, palette, details, uploadedImage, mainProductImage, resolution, backgroundBlur, cameraAngle, lightingStyle, timeOfDay, activeTool, removeBackground, aspectRatio]);

  useEffect(() => {
    if (activeTool !== 'film') return;
    const constructVideoPrompt = () => {
      let prompt = `Sebuah video ${videoStyle} dari ${videoSubject}, ${videoAction}`;

      if (videoEnvironment) {
        prompt += `, diatur dalam ${videoEnvironment}`;
      }
      if (videoTimeOfDay) {
        prompt += ` selama ${videoTimeOfDay}`;
      }
      if (cameraMovement) {
        prompt += `, difilmkan dengan ${cameraMovement}`;
      }
      if (videoLightingStyle) {
        prompt += `, dengan ${videoLightingStyle}`;
      }
      if (videoPalette) {
        prompt += `, menampilkan palet warna ${videoPalette}`;
      }
      if (videoDetails) {
        prompt += `, ${videoDetails}`;
      }
      if (isSoundEnabled) {
          prompt += `. Sertakan narasi audio dalam ${soundLanguage} dengan suara ${voiceGender} bergaya ${speakingStyle} untuk menyampaikan suasana ${videoMood}.`;
      }
      if (isDialogueEnabled && dialogueText.trim()) {
        prompt += `. Termasuk dialog berikut: "${dialogueText}"`;
      }

      prompt += ` Resolusi ${videoResolution}, rasio aspek ${videoAspectRatio}.`;
      setFinalVideoPrompt(prompt);
    };
    constructVideoPrompt();
  }, [videoSubject, videoAction, videoStyle, videoEnvironment, videoTimeOfDay, cameraMovement, videoLightingStyle, videoPalette, videoDetails, videoResolution, videoAspectRatio, activeTool, isSoundEnabled, soundLanguage, voiceGender, speakingStyle, videoMood, isDialogueEnabled, dialogueText]);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, slot?: 'main' | number | 'model-main' | 'model-support' | 'edit-ref') => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Open the crop modal instead of setting it directly
        setCropModalData({
          src: result,
          aspect: aspectRatio, // Respect user-selected global aspect ratio
          slot: slot
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyCroppedImage = (croppedBase64: string) => {
    const slot = cropModalData?.slot;
    if (slot === 'main') {
        setMainProductImage(croppedBase64);
    } else if (slot === 'model-main') {
        setMainModelImage(croppedBase64);
    } else if (slot === 'model-support') {
        setSupportingModelImage(croppedBase64);
    } else if (slot === 'edit-ref') {
        setEditReferenceImage(croppedBase64);
    } else if (typeof slot === 'number') {
        setSupportingImages(prev => {
            const newArr = [...prev];
            newArr[slot] = croppedBase64;
            return newArr;
        });
    } else {
        setUploadedImage(croppedBase64);
    }
    setCropModalData(null);
  };

  const removeUploadedImage = (slot?: 'main' | number | 'model-main' | 'model-support' | 'edit-ref') => {
    if (slot === 'main') {
        setMainProductImage(null);
        if (mainImageInputRef.current) mainImageInputRef.current.value = "";
    } else if (slot === 'model-main') {
        setMainModelImage(null);
        if (mainModelInputRef.current) mainModelInputRef.current.value = "";
    } else if (slot === 'model-support') {
        setSupportingModelImage(null);
        if (supportModelInputRef.current) supportModelInputRef.current.value = "";
    } else if (slot === 'edit-ref') {
        setEditReferenceImage(null);
        if (editReferenceInputRef.current) editReferenceInputRef.current.value = "";
    } else if (typeof slot === 'number') {
        setSupportingImages(prev => {
            const newArr = [...prev];
            newArr[slot] = null;
            return newArr;
        });
        const refs = [supportInputRef1, supportInputRef2, supportInputRef3];
        if (refs[slot]?.current) refs[slot]!.current!.value = "";
    } else {
        setUploadedImage(null);
        setRemoveBackground(false);
        if(fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleVideoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVideoUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeVideoUploadedImage = () => {
    setVideoUploadedImage(null);
    if(videoFileInputRef.current) {
        videoFileInputRef.current.value = "";
    }
  };

  const handleSelectKey = async () => {
    if (window.aistudio) {
        await window.aistudio.openSelectKey();
        setIsApiKeySelected(true);
    }
  };

  const handleApiError = (err: unknown, errorSetter: React.Dispatch<React.SetStateAction<string | null>>) => {
    const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan yang tidak diketahui.';
    if (errorMessage.includes('Requested entity was not found')) {
        errorSetter('Otorisasi gagal. Silakan pilih kembali Kunci API Anda.');
        setIsApiKeySelected(false);
    } else {
        errorSetter(errorMessage);
    }
    console.error(err);
  }

  const handleGenerateImage = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setGeneratedImages(null);
    try {
      let imageUrls: string[];
      
      // Determine if we are using the new multi-ref system or the legacy single upload
      const refs = [
          processedMainImage, 
          ...processedSupportingImages,
          processedMainModelImage,
          processedSupportingModelImage
      ].filter((img): img is string => !!img);
      const legacyRef = processedImage;
      const allRefs = refs.length > 0 ? refs : (legacyRef ? [legacyRef] : []);

      if (allRefs.length > 0) {
        const posePrompts = [
            'dalam pose berdiri seluruh badan',
            'dalam pose duduk santai',
            'dalam pose berjalan, menghadap kamera',
            'sebagai foto potret close-up'
        ];
        
        const generatedUrls: string[] = [];
        for (const pose of posePrompts) {
            const fullPrompt = `Gunakan gambar referensi yang diberikan sebagai panduan visual utama. Pertahankan konsistensi yang sangat ketat pada penampilan subjek, pakaian, detail produk, dan estetika latar belakang yang ada di gambar referensi. Terapkan prompt deskriptif berikut: "${finalPrompt}". Fokus utama perubahan hanya untuk menyesuaikan pose subjek menjadi: ${pose}. Pastikan subjek tetap terlihat sama persis dengan yang ada di gambar referensi.`;
            const imageUrl = await generateImageWithMultipleRefs(fullPrompt, allRefs);
            generatedUrls.push(imageUrl);
        }
        imageUrls = generatedUrls;

      } else {
        const posePrompts = [
            'dalam pose berdiri seluruh badan, menghadap kamera',
            'dalam pose duduk santai di elemen yang ada di lingkungan tersebut (misal: kursi, tangga, batu)',
            'diambil dari sudut rendah, menampilkan subjek secara keseluruhan dengan latar yang megah',
            'sebagai foto potret close-up, fokus pada ekspresi wajah'
        ];

        const generatedUrls: string[] = [];
        for (const pose of posePrompts) {
            const fullPrompt = `${finalPrompt}. INSTRUKSI PENTING: Latar belakang, pakaian model, dan produk apa pun yang dipegang atau ditampilkan harus TETAP SAMA di semua gambar. Jangan mengubahnya. Satu-satunya variasi yang diizinkan adalah pose subjek dan sudut kamera. Untuk gambar ini, gunakan pose berikut: ${pose}.`;
            const imageUrl = await generateSingleImage(fullPrompt, aspectRatio as any);
            generatedUrls.push(imageUrl);
        }
        imageUrls = generatedUrls;
      }
      setGeneratedImages(imageUrls);
    } catch (err) {
      handleApiError(err, setError);
    } finally {
      setIsLoading(false);
    }
  }, [finalPrompt, processedMainImage, processedSupportingImages, processedMainModelImage, processedSupportingModelImage, processedImage, aspectRatio]);

  const handleRegenerateIndividual = useCallback(async (index: number, newDetail?: string, newAngle?: string) => {
    if (!generatedImages) return;
    setIsIndividualLoading(true);
    setError(null);
    try {
      const refs = [
          processedMainImage, 
          ...processedSupportingImages,
          processedMainModelImage,
          processedSupportingModelImage,
          editReferenceImage // Add individual edit reference
      ].filter((img): img is string => !!img);
      const legacyRef = processedImage;
      const allRefs = refs.length > 0 ? refs : (legacyRef ? [legacyRef] : []);

      // Base context from existing finalPrompt but override detail or angle if provided
      let currentPromptBody = finalPrompt;
      if (newAngle) {
          currentPromptBody = currentPromptBody.replace(/sudut pandang [^,.]+/i, `sudut pandang ${newAngle}`);
          if (!currentPromptBody.includes(newAngle)) {
              currentPromptBody += `, sudut pandang ${newAngle}`;
          }
      }

      const fullPrompt = allRefs.length > 0 
        ? `Gunakan gambar referensi yang diberikan. Pertahankan konsistensi ketat. Deskripsi dasar: "${currentPromptBody}". Tambahan modifikasi detail: ${newDetail || 'pertahankan pose sebelumnya'}.`
        : `${currentPromptBody}. Modifikasi spesifik: ${newDetail || 'pertahankan estetika'}.`;

      let imageUrl: string;
      if (allRefs.length > 0) {
          imageUrl = await generateImageWithMultipleRefs(fullPrompt, allRefs);
      } else {
          imageUrl = await generateSingleImage(fullPrompt, aspectRatio as any);
      }

      setGeneratedImages(prev => {
          if (!prev) return prev;
          const next = [...prev];
          next[index] = imageUrl;
          return next;
      });
      setIsEditModalOpen(false);
    } catch (err) {
      handleApiError(err, setError);
    } finally {
      setIsIndividualLoading(false);
    }
  }, [generatedImages, finalPrompt, processedMainImage, processedSupportingImages, processedMainModelImage, processedSupportingModelImage, processedImage, editReferenceImage, aspectRatio]);


  const handleGenerateVideo = useCallback(async () => {
    setIsVideoLoading(true);
    setVideoError(null);
    setGeneratedVideo(null);
    setVideoLoadingMessage('Mempersiapkan pembuatan video...');
    try {
        const videoUrl = await generateVideoFromPrompt(
            finalVideoPrompt,
            videoAspectRatio as '16:9' | '9:16',
            videoResolution as '720p' | '1080p',
            videoUploadedImage,
            (message) => setVideoLoadingMessage(message)
        );
        setGeneratedVideo(videoUrl);
    } catch (err) {
        handleApiError(err, setVideoError);
    } finally {
        setIsVideoLoading(false);
        setVideoLoadingMessage('');
    }
  }, [finalVideoPrompt, videoAspectRatio, videoResolution, videoUploadedImage]);

  const handleGetFeedback = useCallback(async () => {
    setIsFeedbackLoading(true);
    setFeedbackError(null);
    setPromptFeedback(null);
    const currentPrompt = activeTool === 'gambar' ? finalPrompt : finalVideoPrompt;
    try {
        const feedback = await getPromptFeedback(currentPrompt);
        setPromptFeedback(feedback);
    } catch (err) {
        handleApiError(err, setFeedbackError);
    } finally {
        setIsFeedbackLoading(false);
    }
  }, [finalPrompt, finalVideoPrompt, activeTool]);

  const handleGetSmartSuggestions = useCallback(async () => {
    setIsSuggestionsLoading(true);
    setSuggestionsError(null);
    setSmartSuggestions(null);
    try {
        const suggestions = await getSmartSuggestions({ subject, style, environment });
        setSmartSuggestions(suggestions);
    } catch (err) {
        handleApiError(err, setSuggestionsError);
    } finally {
        setIsSuggestionsLoading(false);
    }
  }, [subject, style, environment]);
  
  const handleGenerateDialogue = useCallback(async (movement: string) => {
    setIsDialogueLoading(true);
    setDialogueError(null);
    try {
        const generatedDialogue = await generateDialogueScript({
            subject: videoSubject,
            action: videoAction,
            movement: movement,
        });
        setDialogueText(generatedDialogue);
    } catch (err) {
        handleApiError(err, setDialogueError);
    } finally {
        setIsDialogueLoading(false);
    }
  }, [videoSubject, videoAction]);
  
  const handleGenerateJsonPrompt = useCallback(async () => {
    setIsJsonLoading(true);
    setJsonError(null);
    setParsedJsonPrompt(null);
    setCopiedBlock(null);
    setJsonGeneratedImages(null);
    setJsonImageError(null);

    const hook = hookMovement === 'Custom' ? customHookMovement : hookMovement;
    const problem = problemMovement === 'Custom' ? customProblemMovement : problemMovement;
    const cta = ctaMovement === 'Custom' ? customCtaMovement : ctaMovement;
    const finalConcept = videoConcept === 'Kustom...' ? customVideoConcept : videoConcept;

    if ((hookMovement === 'Custom' && !customHookMovement.trim()) || 
        (problemMovement === 'Custom' && !customProblemMovement.trim()) || 
        (ctaMovement === 'Custom' && !customCtaMovement.trim()) ||
        (videoConcept === 'Kustom...' && !customVideoConcept.trim())) {
        setJsonError(STRUCTURED_PROMPT_TEXTS[jsonPromptLanguage].error);
        setIsJsonLoading(false);
        return;
    }

    try {
        const jsonString = await generateJsonPrompt({
            subject: videoSubject,
            action: videoAction,
            videoConcept: finalConcept,
            hookMovement: hook,
            problemMovement: problem,
            ctaMovement: cta,
            hookDialogue,
            problemDialogue,
            ctaDialogue,
            dialogueStyle,
            dialogueLanguage,
            dialogueTempo,
        });
        const parsedJson = JSON.parse(jsonString);
        setParsedJsonPrompt(parsedJson);

        setIsJsonImageLoading(true);
        setJsonGeneratedImages([]); // Start with an empty array for progressive loading
        try {
            const imagePrompts = parsedJson.map((sceneData: any) => {
                const character = sceneData.characters?.[0]?.appearance || videoSubject;
                const scene = sceneData.scenes?.[0];
                if (!scene) return '';
                const sceneDesc = scene.description;
                const stepsDesc = scene.steps?.map((s: any) => s.description).join(', ');
                const style = sceneData.video_style || videoStyle;
                return `A ${style} visual of ${character}. Scene description: ${sceneDesc}. Key actions: ${stepsDesc}.`;
            }).filter(Boolean);

            if (imagePrompts.length < 1) {
                throw new Error("Gagal membuat prompt gambar dari JSON yang dihasilkan.");
            }
            
            const generatedUrls: string[] = [];
            for (const prompt of imagePrompts) {
                const imageUrl = await generateSingleImage(prompt, videoAspectRatio as any);
                generatedUrls.push(imageUrl);
                setJsonGeneratedImages([...generatedUrls]); // Update UI progressively
                await new Promise(resolve => setTimeout(resolve, 1000)); // 1-second delay to avoid rate limiting
            }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan saat membuat gambar dari JSON.';
            setJsonImageError(errorMessage);
        } finally {
            setIsJsonImageLoading(false);
        }

    } catch (err) {
        handleApiError(err, setJsonError);
    } finally {
        setIsJsonLoading(false);
    }
  }, [
    videoSubject, 
    videoAction, 
    jsonPromptLanguage,
    videoConcept,
    customVideoConcept,
    hookMovement, 
    problemMovement, 
    ctaMovement, 
    customHookMovement, 
    customProblemMovement, 
    customCtaMovement,
    hookDialogue,
    problemDialogue,
    ctaDialogue,
    dialogueStyle,
    dialogueLanguage,
    dialogueTempo,
    videoStyle,
    videoAspectRatio,
  ]);
  
  const handleAnalyzeMovement = useCallback(async () => {
    if (!videoUploadedImage) return;
    setIsAnalysisLoading(true);
    setAnalysisError(null);
    try {
        const analysis = await analyzeImageForMovement(videoUploadedImage);
        setVideoAction(analysis.mainAction);
        setCameraMovement(analysis.cameraMovement);
        
        setHookMovement('Custom');
        setCustomHookMovement(analysis.hookMovement);
        
        setProblemMovement('Custom');
        setCustomProblemMovement(analysis.problemMovement);

        setCtaMovement('Custom');
        setCustomCtaMovement(analysis.ctaMovement);

    } catch (err) {
        handleApiError(err, setAnalysisError);
    } finally {
        setIsAnalysisLoading(false);
    }
  }, [videoUploadedImage]);

  const handleSuggestMovementFromImage = useCallback(async (imageUrl: string, format: 'text' | 'json' = 'text') => {
    setIsMovementSuggestionLoading(true);
    setMovementSuggestion(null);
    setMovementSuggestionError(null);
    try {
        const analysis = await analyzeImageForMovement(imageUrl);
        let suggestion: string;
        if (format === 'json') {
          suggestion = JSON.stringify(analysis, null, 2);
        } else {
          suggestion = `Berikut adalah saran gerakan dan konsep berdasarkan gambar:\n\nAksi Utama: ${analysis.mainAction}\nGerakan Kamera: ${analysis.cameraMovement}\n\nKonsep Video 3 Babak:\n- Pancingan (Hook): ${analysis.hookMovement}\n- Solusi (Problem-Solve): ${analysis.problemMovement}\n- Ajakan Bertindak (CTA): ${analysis.ctaMovement}`;
        }
        setMovementSuggestion(suggestion);
    } catch (err) {
        handleApiError(err, setMovementSuggestionError);
    } finally {
        setIsMovementSuggestionLoading(false);
    }
  }, []);

  const handleCopySuggestion = useCallback(() => {
    if (!movementSuggestion) return;
    navigator.clipboard.writeText(movementSuggestion).then(() => {
        setIsSuggestionCopied(true);
        setTimeout(() => setIsSuggestionCopied(false), 2000);
    }).catch(err => {
        console.error('Gagal menyalin teks: ', err);
    });
  }, [movementSuggestion]);

  const handleCopyBlock = (blockContent: any, blockIndex: number) => {
      const jsonString = JSON.stringify(blockContent, null, 2);
      navigator.clipboard.writeText(jsonString).then(() => {
          setCopiedBlock(blockIndex);
          setTimeout(() => setCopiedBlock(null), 2000);
      });
  };
  
  const handleUseImageForVideo = (imageUrl: string) => {
    handleToolChange('film');
    setVideoUploadedImage(imageUrl);
    window.scrollTo(0, 0);
  };

  const handleToolChange = (newTool: string) => {
    if (activeTool === newTool) {
      setIsSidebarOpen(false);
      return;
    }
    setIsFading(true);
    setIsSidebarOpen(false);
    setTimeout(() => {
      setActiveTool(newTool);
      setIsFading(false);
    }, 200);
  };

  const handleLogout = async () => {
    await authService.logout();
    setIsApiKeySelected(false);
  };

    const handleAffiliateFileChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        setter: React.Dispatch<React.SetStateAction<any>>,
        isMultiple: boolean = false,
        limit?: number
    ) => {
        const files = e.target.files;
        if (!files) return;

        const fileArray = Array.from(files);
        
        const readAndSet = (file: File) => {
            return new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve(reader.result as string);
                };
                reader.readAsDataURL(file);
            });
        };

        Promise.all(fileArray.map(readAndSet)).then(base64Files => {
            if (isMultiple) {
                setter((prev: string[]) => {
                    const newFiles = [...prev, ...base64Files];
                    return limit ? newFiles.slice(0, limit) : newFiles;
                });
            } else {
                setter(base64Files[0] || null);
            }
        });

        // Clear the input value to allow re-uploading the same file
        if(e.target) e.target.value = '';
    };

    const handleSupportingFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const fileArray = Array.from(files);

        const readAsDataURL = (file: File): Promise<string> => {
            return new Promise((resolve) => {
                // Fix: Initialize the reader before accessing its properties.
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });
        };

        Promise.all(fileArray.map(readAsDataURL)).then(base64Urls => {
            const newPhotos = base64Urls.map(url => ({ url, description: '' }));
            setSupportingProductPhotos(prev => [...prev, ...newPhotos]);
        });

        if (e.target) {
            e.target.value = '';
        }
    };

    const handleSupportingPhotoDescriptionChange = (index: number, description: string) => {
        setSupportingProductPhotos(prev => 
            prev.map((photo, i) => i === index ? { ...photo, description } : photo)
        );
    };

    const removeSupportingPhoto = (index: number) => {
        setSupportingProductPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const removeModelPhoto = (index: number) => {
        setModelPhotos(prev => prev.filter((_, i) => i !== index));
    };
    
    const handleGenerateConcept = useCallback(async () => {
        if (!mainProductPhoto) return;

        setIsConceptLoading(true);
        setConceptError(null);
        try {
          const referenceImages = [mainProductPhoto, ...supportingProductPhotos.map(p => p.url)].filter(Boolean);
          const concept = await generateProductConcept(referenceImages as string[]);
          setProductConcept(concept);
        } catch (err) {
          handleApiError(err, setConceptError);
        } finally {
          setIsConceptLoading(false);
        }
    }, [mainProductPhoto, supportingProductPhotos]);

    const handleGenerateAffiliateContent = useCallback(async () => {
        if (!mainProductPhoto) return;

        setIsAffiliateLoading(true);
        setAffiliateError(null);
        setAffiliateBrollPhotos([]);
        setAffiliateUgcPhotos([]);
        setAffiliateCommercialPhotos([]);
        setAffiliateLoadingMessage('Mempersiapkan...');

        try {
            const allReferenceImages = [
                mainProductPhoto,
                ...supportingProductPhotos.map(p => p.url),
                ...modelPhotos
            ].filter((img): img is string => !!img);

            const basePrompt = `
                Product & Concept: "${productConcept}".
                Reference images provided show the main product, supporting angles, and model (if any).
                AI Model characteristics: Type ${aiModelType}, Age ${aiModelAge}${isHijabModel ? ', wearing Hijab' : ''}.
                Aspect Ratio: ${affiliateAspectRatio}.
                Ad Type: ${affiliateAdType}.
                Language for text overlay (if any): ${narrationLanguage}.
                ${addTextOverlay ? 'The final image SHOULD include relevant text overlay.' : 'The final image should NOT include any text overlay.'}
                Voice Accent for narration context: ${voiceAccent}.
            `;

            const generateImageSet = async (style: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
                const stylePrompt = `
                Generate 4 realistic photos for an affiliate marketing campaign with a "${style}" style.
                ${basePrompt}
                For the "${style}" style, ensure the output has these qualities:
                - B-Roll: Cinematic, detailed shots, often close-ups or showing the product in a lifestyle context. Focus on aesthetics.
                - UGC (User-Generated Content): Authentic, casual, as if taken by a real customer with a smartphone. Can have minor imperfections.
                - Commercial: Polished, professional, well-lit, studio-quality, suitable for a high-end advertisement.
                `;
                
                for (let i = 0; i < 4; i++) {
                    setAffiliateLoadingMessage(`Menghasilkan gambar ${style} (${i + 1}/4)...`);
                    const imageUrl = await generateAffiliateImageFromRefs(stylePrompt, allReferenceImages);
                    const processedImageUrl = await processImageToAspectRatio(imageUrl, affiliateAspectRatio);
                    setter(prev => [...prev, processedImageUrl]);
                    await new Promise(resolve => setTimeout(resolve, 1000)); // 1-second delay to avoid rate limiting
                }
            };
            
            await generateImageSet('B-Roll', setAffiliateBrollPhotos);
            await generateImageSet('UGC', setAffiliateUgcPhotos);
            await generateImageSet('Commercial', setAffiliateCommercialPhotos);
            
            setAffiliateLoadingMessage('');

        } catch (err) {
            handleApiError(err, setAffiliateError);
        } finally {
            setIsAffiliateLoading(false);
            setAffiliateLoadingMessage('');
        }
    }, [
        mainProductPhoto, supportingProductPhotos, modelPhotos, productConcept, addTextOverlay,
        aiModelType, aiModelAge, isHijabModel, affiliateAspectRatio, affiliateAdType,
        narrationLanguage, voiceAccent
    ]);


  const JsonBlock: React.FC<{ title: string, data: any, blockIndex: number }> = ({ title, data, blockIndex }) => {
    const currentTexts = STRUCTURED_PROMPT_TEXTS[jsonPromptLanguage];
    if (!data) return null;
    return (
        <div className="mt-4 p-4 bg-black/20 rounded-lg relative">
            <h5 className="text-md font-semibold text-gray-300 mb-2">{title}</h5>
            <button
                onClick={() => handleCopyBlock(data, blockIndex)}
                className="absolute top-3 right-3 px-3 py-1 text-xs font-semibold rounded-md transition-colors duration-200 bg-white/10 text-gray-300 hover:bg-white/20"
            >
                {copiedBlock === blockIndex ? currentTexts.copiedButton : currentTexts.copyButton}
            </button>
            <pre className="text-sm text-gray-300 whitespace-pre-wrap break-words font-mono">
                <code>{JSON.stringify(data, null, 2)}</code>
            </pre>
        </div>
    );
  };

  const isEditing = !!mainProductImage || !!uploadedImage;
  const isCustomEnvironment = environment === 'Lingkungan Kustom...';

  const filteredArtStyles = ART_STYLES.filter(style => 
    style.toLowerCase().includes(artStyleFilter.toLowerCase())
  );
  
  const renderProductGenerator = () => (
    <div className="p-4 md:p-6 bg-black/20 rounded-2xl border border-white/10 backdrop-blur-xl">
      <div className="flex flex-col gap-8">
      <DnaInputSection title="Gambar Referensi" description="Unggah gambar produk utama dan pendukung untuk memandu AI.">
        <div className="flex flex-col gap-6">
            {/* Main Image Slot */}
            <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-gray-400">Foto Produk Utama</h3>
                {mainProductImage ? (
                    <div className="relative aspect-video bg-black/30 rounded-lg overflow-hidden border border-teal-500/30">
                        <img src={mainProductImage} alt="Utama" className="w-full h-full object-contain" />
                        <button onClick={() => removeUploadedImage('main')} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-red-500 transition">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                ) : (
                    <label className="w-full aspect-video flex flex-col items-center justify-center cursor-pointer bg-white/5 text-gray-400 rounded-lg border-2 border-dashed border-white/10 hover:bg-white/10 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        <span className="text-sm">Klik untuk Foto Utama</span>
                        <input type="file" ref={mainImageInputRef} accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'main')} />
                    </label>
                )}
            </div>

            {/* Supporting Images Slots */}
            <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map((idx) => (
                    <div key={idx} className="flex flex-col gap-2">
                        <h4 className="text-xs font-medium text-gray-500 text-center">Pendukung #{idx + 1}</h4>
                        {supportingImages[idx] ? (
                            <div className="relative aspect-square bg-black/30 rounded-lg overflow-hidden border border-white/10">
                                <img src={supportingImages[idx]!} alt={`Pendukung ${idx + 1}`} className="w-full h-full object-cover" />
                                <button onClick={() => removeUploadedImage(idx)} className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-red-500 transition">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        ) : (
                            <label className="aspect-square flex flex-col items-center justify-center cursor-pointer bg-white/5 text-gray-500 rounded-lg border-2 border-dashed border-white/10 hover:bg-white/10 transition">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, idx)} />
                            </label>
                        )}
                    </div>
                ))}
            </div>

            {/* Remove Background Option */}
            {(mainProductImage || uploadedImage) && (
                <div className="p-3 bg-black/20 rounded-lg flex items-center justify-between border border-white/5">
                    <label htmlFor="remove-bg-toggle" className="flex items-center gap-3 cursor-pointer text-sm text-gray-300">
                        <input
                            type="checkbox"
                            id="remove-bg-toggle"
                            checked={removeBackground}
                            onChange={(e) => setRemoveBackground(e.target.checked)}
                            className="w-4 h-4 text-teal-500 bg-white/10 border-white/20 rounded focus:ring-teal-500"
                        />
                        <span>Hapus Background Asli</span>
                    </label>
                </div>
            )}
        </div>
      </DnaInputSection>

      <DnaInputSection title="Upload Model" description="Unggah foto model utama dan pendukung untuk memandu AI.">
        <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-3">
                <h4 className="text-xs font-semibold text-gray-400">Model Utama</h4>
                {mainModelImage ? (
                    <div className="relative aspect-square bg-black/30 rounded-lg overflow-hidden border border-teal-500/30">
                        <img src={mainModelImage} alt="Model Utama" className="w-full h-full object-cover" />
                        <button onClick={() => removeUploadedImage('model-main')} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-red-500 transition">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                ) : (
                    <label className="w-full aspect-square flex flex-col items-center justify-center cursor-pointer bg-white/5 text-gray-400 rounded-lg border-2 border-dashed border-white/10 hover:bg-white/10 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        <span className="text-xs text-center">Klik Foto Model Utama</span>
                        <input type="file" ref={mainModelInputRef} accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'model-main')} />
                    </label>
                )}
            </div>
            <div className="flex flex-col gap-3">
                <h4 className="text-xs font-semibold text-gray-400">Model Pendukung</h4>
                {supportingModelImage ? (
                    <div className="relative aspect-square bg-black/30 rounded-lg overflow-hidden border border-white/10">
                        <img src={supportingModelImage} alt="Model Pendukung" className="w-full h-full object-cover" />
                        <button onClick={() => removeUploadedImage('model-support')} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-red-500 transition">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                ) : (
                    <label className="w-full aspect-square flex flex-col items-center justify-center cursor-pointer bg-white/5 text-gray-400 rounded-lg border-2 border-dashed border-white/10 hover:bg-white/10 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        <span className="text-xs text-center">Klik Foto Model Pendukung</span>
                        <input type="file" ref={supportModelInputRef} accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'model-support')} />
                    </label>
                )}
            </div>
        </div>
      </DnaInputSection>

      <DnaInputSection title="Kualitas & Dimensi" description="Tentukan tingkat detail dan rasio aspek.">
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="text-md font-medium text-gray-300 mb-2">Kualitas Resolusi</h3>
                <SelectableTags options={RESOLUTION_OPTIONS} selected={resolution} onSelect={setResolution} />
            </div>
            <div>
                <h3 className="text-md font-medium text-gray-300 mb-2">Rasio Aspek</h3>
                <SelectableTags options={ASPECT_RATIOS} selected={aspectRatio} onSelect={setAspectRatio} />
                {isEditing && (
                    <p className="text-xs text-gray-400 mt-2">
                        Gambar akan dipotong agar sesuai dengan rasio aspek.
                    </p>
                )}
            </div>
        </div>
      </DnaInputSection>

      <DnaInputSection title={isEditing ? "Apa yang Ingin Ditambah/Diubah" : "Subjek Inti"} description={isEditing ? "Jelaskan modifikasi untuk gambar." : "Karakter atau objek utama."}>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={isEditing ? "contoh: naga kecil di bahunya" : "contoh: robot krom futuristik"}
          className="w-full bg-white/5 text-white rounded-md p-3 border border-white/10 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
        />
      </DnaInputSection>

      <DnaInputSection title="Pengubah & Detail" description="Tambahkan fitur spesifik.">
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="contoh: memegang bola bercahaya"
          rows={2}
          className="w-full bg-white/5 text-white rounded-md p-3 border border-white/10 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
        />
      </DnaInputSection>

      <DnaInputSection title="Lingkungan / Latar" description="Pilih atau jelaskan latar.">
        <CustomSelect
          value={environment}
          onChange={setEnvironment}
          options={ENVIRONMENT_OPTIONS.map(opt => ({ label: opt, value: opt }))}
        />
        {isCustomEnvironment && (
            <input
                type="text"
                value={customEnvironment}
                onChange={(e) => setCustomEnvironment(e.target.value)}
                placeholder="Tulis lingkungan kustom utama di sini..."
                className="w-full mt-4 bg-white/5 text-white rounded-md p-3 border border-white/10 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
            />
        )}
        <input
          type="text"
          value={environmentDetails}
          onChange={(e) => setEnvironmentDetails(e.target.value)}
          placeholder="Detail tambahan untuk lingkungan..."
          className="w-full mt-4 bg-white/5 text-white rounded-md p-3 border border-white/10 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
        />
      </DnaInputSection>

      <DnaInputSection title="Gaya Seni" description="Tentukan estetika visual.">
        <input
          type="text"
          value={artStyleFilter}
          onChange={(e) => setArtStyleFilter(e.target.value)}
          placeholder="Filter gaya..."
          className="w-full bg-white/5 text-white rounded-md p-3 border border-white/10 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition mb-4"
        />
        <SelectableTags options={filteredArtStyles} selected={style} onSelect={setStyle} />
      </DnaInputSection>

      <DnaInputSection title="Waktu" description="Pilih waktu hari.">
          <SelectableTags options={TIME_OPTIONS} selected={timeOfDay} onSelect={setTimeOfDay} />
      </DnaInputSection>
      
      <DnaInputSection title="Pencahayaan" description="Pilih gaya pencahayaan.">
          <SelectableTags options={LIGHTING_STYLES} selected={lightingStyle} onSelect={setLightingStyle} />
      </DnaInputSection>

      <DnaInputSection title="Sudut Kamera" description="Pilih sudut pandang.">
          <input
            type="text"
            value={cameraAngle}
            onChange={(e) => setCameraAngle(e.target.value)}
            placeholder="Atau ketik sudut kustom..."
            className="w-full mb-4 bg-white/5 text-white rounded-md p-3 border border-white/10 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
          />
          <SelectableTags options={CAMERA_ANGLES} selected={cameraAngle} onSelect={setCameraAngle} />
      </DnaInputSection>
      
      <DnaInputSection title="Efek Buram" description="Tambahkan kedalaman.">
        <SelectableTags options={BLUR_OPTIONS} selected={backgroundBlur} onSelect={setBackgroundBlur} />
      </DnaInputSection>

      <DnaInputSection title="Palet Warna" description="Pilih skema warna.">
        <input
          type="text"
          value={palette}
          onChange={(e) => setPalette(e.target.value)}
          placeholder="Atau ketik palet kustom..."
          className="w-full mb-4 bg-white/5 text-white rounded-md p-3 border border-white/10 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
        />
        <SelectableTags options={COLOR_PALETTES} selected={palette} onSelect={setPalette} />
      </DnaInputSection>

      <DnaInputSection title="Prompt Cerdas" description="Dapatkan ide prompt dari AI.">
        <button
          onClick={handleGetSmartSuggestions}
          disabled={isSuggestionsLoading || !isApiKeySelected}
          className="w-full py-2 px-4 text-md font-semibold text-white rounded-lg bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md focus:outline-none focus:ring-4 focus:ring-blue-500/50"
        >
          {isSuggestionsLoading ? 'Mencari Ide...' : 'Hasilkan Prompt Cerdas'}
        </button>
        {suggestionsError && <p className="text-red-400 text-sm mt-2">{suggestionsError}</p>}
        {smartSuggestions && (
          <div className="flex flex-col gap-2 mt-2">
            {smartSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => {
                  setSubject(suggestion);
                  setDetails('');
                }}
                className="text-left p-3 bg-black/20 rounded-md text-sm text-gray-300 hover:bg-white/10 transition cursor-pointer"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </DnaInputSection>
      
       {(isFeedbackLoading || feedbackError || promptFeedback) && (
        <DnaInputSection title="Saran AI" description="Saran untuk menyempurnakan prompt.">
            {isFeedbackLoading && <p className="text-gray-400">Menganalisis...</p>}
            {feedbackError && <p className="text-red-400 text-sm">{feedbackError}</p>}
            {promptFeedback && (
                <div className="text-gray-300 bg-black/20 p-4 rounded-md text-sm whitespace-pre-wrap font-mono">
                    {promptFeedback}
                </div>
            )}
        </DnaInputSection>
      )}
      
      <div className="flex flex-col gap-2 pt-6 border-t border-white/10">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">Prompt Final</h2>
            <button
                onClick={handleGetFeedback}
                disabled={isFeedbackLoading || !finalPrompt.trim() || !isApiKeySelected}
                className="text-xs px-3 py-1 bg-indigo-600/50 text-white rounded-full hover:bg-indigo-600/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isFeedbackLoading ? 'Menganalisis...' : 'Dapatkan Saran AI'}
            </button>
        </div>
        <p className="text-sm text-gray-400">Ini adalah prompt yang dikirim ke AI.</p>
        <p className="text-gray-400 bg-black/20 p-4 rounded-md text-sm leading-relaxed min-h-[100px]">
            {finalPrompt}
        </p>
      </div>

       <button
        onClick={handleGenerateImage}
        disabled={isLoading || !finalPrompt.trim() || !isApiKeySelected}
        className="w-full py-3 px-6 text-lg font-semibold text-white rounded-xl bg-gradient-to-r from-purple-600 to-teal-500 hover:from-purple-700 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg focus:outline-none focus:ring-4 focus:ring-teal-500/50 transform hover:scale-105"
      >
        {isLoading ? (isEditing ? 'Menerapkan...' : 'Menghasilkan...') : (isEditing ? 'Hasilkan Ulang' : 'Hasilkan Gambar')}
      </button>
       {!isApiKeySelected && <p className="text-center text-yellow-400 text-xs mt-2">Pilih Kunci API di sidebar untuk mengaktifkan tombol ini.</p>}

      {(isLoading || generatedImages || error) && (
        <div className="mt-6">
          <ImageDisplay 
            generatedImages={generatedImages}
            isLoading={isLoading}
            error={error}
            aspectRatio={aspectRatio}
            onUseForVideo={handleUseImageForVideo}
            onEditDetail={(index) => {
              setEditingImageIndex(index);
              setEditDetailPrompt('');
              setEditReferenceImage(null);
              setIsEditModalOpen(true);
            }}
            onChangeAngle={(index, angle) => {
              handleRegenerateIndividual(index, undefined, angle);
            }}
          />
        </div>
      )}
      </div>
    </div>
  );

  const renderVideoGenerator = () => {
    const currentMovementOptions = MOVEMENT_OPTIONS[jsonPromptLanguage] || MOVEMENT_OPTIONS.en;
    const currentDialogueStyles = DIALOGUE_STYLES[jsonPromptLanguage] || DIALOGUE_STYLES.en;
    const currentDialogueTempos = DIALOGUE_TEMPOS[jsonPromptLanguage] || DIALOGUE_TEMPOS.en;
    const currentTexts = STRUCTURED_PROMPT_TEXTS[jsonPromptLanguage];

    const MovementSelector: React.FC<{
        label: string;
        value: string;
        onChange: (v: string) => void;
        customValue: string;
        onCustomChange: (v: string) => void;
        dialogueValue: string;
        onDialogueChange: (v: string) => void;
    }> = ({ label, value, onChange, customValue, onCustomChange, dialogueValue, onDialogueChange }) => (
        <div className="flex flex-col gap-3">
            <h4 className="text-md font-medium text-gray-300">{label}</h4>
            <CustomSelect
                value={value}
                onChange={onChange}
                options={currentMovementOptions}
            />
            {value === 'Custom' && (
                <input
                    type="text"
                    value={customValue}
                    onChange={(e) => onCustomChange(e.target.value)}
                    placeholder={currentTexts.customPlaceholder}
                    className="w-full bg-black/20 text-white rounded-md p-3 border border-white/10 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                />
            )}
            <textarea
                value={dialogueValue}
                onChange={(e) => onDialogueChange(e.target.value)}
                placeholder={currentTexts.dialoguePlaceholder}
                rows={2}
                className="w-full bg-black/20 text-white rounded-md p-3 border border-white/10 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
            />
        </div>
    );

    return (
    <div className="p-4 md:p-6 bg-black/20 rounded-2xl border border-white/10 backdrop-blur-xl">
      <div className="flex flex-col gap-8">
      <DnaInputSection title="Aset Referensi (Opsional)" description="Unggah gambar untuk memandu pembuatan video.">
        {videoUploadedImage ? (
          <div className="flex flex-col gap-4">
              <img src={videoUploadedImage} alt="Pratinjau Video yang diunggah" className="w-full max-w-2xl mx-auto rounded-lg border-2 border-white/10" />
              <div className="flex justify-between gap-4">
                  <button 
                      onClick={handleAnalyzeMovement}
                      disabled={isAnalysisLoading || !isApiKeySelected}
                      className="flex-grow px-4 py-2 bg-indigo-600/50 text-white rounded-lg hover:bg-indigo-600/80 transition disabled:opacity-50"
                  >
                      {isAnalysisLoading ? 'Menganalisis...' : 'Analisis Gambar untuk Gerakan'}
                  </button>
                  <button 
                      onClick={removeVideoUploadedImage}
                      className="px-4 py-2 bg-red-600/50 text-white rounded-lg hover:bg-red-600/80 transition"
                  >
                      Hapus
                  </button>
              </div>
              {analysisError && <p className="text-red-400 text-sm mt-2">{analysisError}</p>}
          </div>
        ) : (
          <>
            <label htmlFor="video-file-upload" className="w-full text-center cursor-pointer bg-white/5 text-white rounded-md p-3 border border-white/10 hover:bg-white/10 transition">
              Klik untuk Mengunggah Gambar
            </label>
            <input
              id="video-file-upload"
              ref={videoFileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleVideoFileChange}
              className="hidden"
            />
          </>
        )}
      </DnaInputSection>
      
      <DnaInputSection title="Konsep & Subjek Inti" description="Tentukan ide utama video Anda.">
        <input
          type="text"
          value={videoSubject}
          onChange={(e) => setVideoSubject(e.target.value)}
          placeholder="Subjek video (misal: seorang wanita menampilkan produk fashion)"
          className="w-full bg-white/5 text-white rounded-md p-3 border border-white/10 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
        />
        <textarea
          value={videoAction}
          onChange={(e) => setVideoAction(e.target.value)}
          placeholder="Aksi utama (misal: berjalan anggun sambil memegang tas tangan)"
          rows={2}
          className="w-full mt-4 bg-white/5 text-white rounded-md p-3 border border-white/10 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
        />
      </DnaInputSection>

      <div className="pt-6 border-t border-white/10" />

      <DnaInputSection 
        title={currentTexts.title} 
        description={currentTexts.description}
        titleExtra={
             <div className="flex items-center gap-2 text-xs">
                <span className={jsonPromptLanguage === 'en' ? 'text-white' : 'text-gray-400'}>EN</span>
                <label htmlFor="lang-toggle" className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="lang-toggle" className="sr-only peer"
                        checked={jsonPromptLanguage === 'id'}
                        onChange={() => setJsonPromptLanguage(lang => lang === 'en' ? 'id' : 'en')}
                    />
                    <div className="w-9 h-5 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-teal-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
                <span className={jsonPromptLanguage === 'id' ? 'text-white' : 'text-gray-400'}>ID</span>
            </div>
        }
      >
        <div className="flex flex-col gap-6 bg-black/20 p-4 rounded-lg">
            <div className="grid md:grid-cols-3 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{currentTexts.dialogueStyleLabel}</label>
                    <CustomSelect
                        value={dialogueStyle}
                        onChange={setDialogueStyle}
                        options={currentDialogueStyles}
                    />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{currentTexts.dialogueLanguageLabel}</label>
                    <CustomSelect
                        value={dialogueLanguage}
                        onChange={setDialogueLanguage}
                        options={VIDEO_LANGUAGES.map(opt => ({ label: opt, value: opt }))}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{currentTexts.dialogueTempoLabel}</label>
                    <CustomSelect
                        value={dialogueTempo}
                        onChange={setDialogueTempo}
                        options={currentDialogueTempos}
                    />
                </div>
            </div>
             <div className="flex flex-col gap-2">
                <label className="block text-sm font-medium text-gray-300">Konsep Video</label>
                <CustomSelect
                    value={videoConcept}
                    onChange={setVideoConcept}
                    options={VIDEO_CONCEPTS.map(opt => ({ label: opt, value: opt }))}
                />
                {videoConcept === 'Kustom...' && (
                     <input type="text" value={customVideoConcept} onChange={e => setCustomVideoConcept(e.target.value)} placeholder="Masukkan konsep video kustom..." className="w-full mt-2 bg-black/20 text-white rounded-md p-3 border border-white/10" />
                )}
            </div>
            
            <MovementSelector label={currentTexts.hookTitle} value={hookMovement} onChange={setHookMovement} customValue={customHookMovement} onCustomChange={setCustomHookMovement} dialogueValue={hookDialogue} onDialogueChange={setHookDialogue} />
            <MovementSelector label={currentTexts.problemTitle} value={problemMovement} onChange={setProblemMovement} customValue={customProblemMovement} onCustomChange={setCustomProblemMovement} dialogueValue={problemDialogue} onDialogueChange={setProblemDialogue} />
            <MovementSelector label={currentTexts.ctaTitle} value={ctaMovement} onChange={setCtaMovement} customValue={customCtaMovement} onCustomChange={setCustomCtaMovement} dialogueValue={ctaDialogue} onDialogueChange={setCtaDialogue} />
        </div>
        <button
          onClick={handleGenerateJsonPrompt}
          disabled={isJsonLoading || !isApiKeySelected}
          className="w-full mt-4 py-2 px-4 text-md font-semibold text-white rounded-lg bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md"
        >
          {isJsonLoading ? currentTexts.loadingButton : currentTexts.generateButton}
        </button>
        {jsonError && <p className="text-red-400 text-sm mt-2">{jsonError}</p>}
        {parsedJsonPrompt && (
            <div className="mt-4">
                <h3 className="text-lg font-semibold text-gray-200">Hasil Prompt JSON</h3>
                {parsedJsonPrompt.map((block, index) => (
                    <JsonBlock key={index} title={`Scene ${index + 1}`} data={block} blockIndex={index} />
                ))}
            </div>
        )}
      </DnaInputSection>

       {(isJsonImageLoading || jsonImageError || (jsonGeneratedImages && jsonGeneratedImages.length > 0)) && (
            <DnaInputSection title="Visual Referensi Adegan" description="Gambar yang dihasilkan AI berdasarkan setiap adegan dari prompt JSON.">
                {isJsonImageLoading && <p className="text-gray-400">Menghasilkan visual adegan...</p>}
                {jsonImageError && <p className="text-red-400 text-sm">{jsonImageError}</p>}
                {jsonGeneratedImages && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {jsonGeneratedImages.map((image, index) => (
                            <div key={index} className="aspect-video bg-black/20 rounded-lg overflow-hidden">
                                <img src={image} alt={`Visual Adegan ${index + 1}`} className="w-full h-full object-cover" />
                            </div>
                        ))}
                    </div>
                )}
            </DnaInputSection>
        )}


      <div className="pt-6 border-t border-white/10" />

      <DnaInputSection title="Prompt Video Final (Mode Sederhana)" description="Gunakan kontrol di bawah ini untuk membuat prompt video sederhana. Ini tidak menggunakan generator JSON di atas.">
        <p className="text-gray-400 bg-black/20 p-4 rounded-md text-sm leading-relaxed min-h-[100px]">
            {finalVideoPrompt}
        </p>
      </DnaInputSection>

      <button
        onClick={handleGenerateVideo}
        disabled={isVideoLoading || !finalVideoPrompt.trim() || !isApiKeySelected}
        className="w-full py-3 px-6 text-lg font-semibold text-white rounded-xl bg-gradient-to-r from-purple-600 to-teal-500 hover:from-purple-700 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg"
      >
        {isVideoLoading ? 'Menghasilkan Video...' : 'Hasilkan Video (Mode Sederhana)'}
      </button>
      {!isApiKeySelected && <p className="text-center text-yellow-400 text-xs mt-2">Pilih Kunci API di sidebar untuk mengaktifkan tombol ini.</p>}

      <div className="mt-6">
        {isVideoLoading && (
            <div className="flex flex-col items-center justify-center gap-4 text-gray-400 p-4 bg-black/20 rounded-lg border-2 border-dashed border-white/10 min-h-[200px]">
                <svg className="animate-spin h-12 w-12 text-teal-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-lg font-semibold">Video sedang dibuat...</p>
                <p className="text-sm text-center max-w-md">{videoLoadingMessage || 'Proses ini mungkin memakan waktu beberapa menit. Harap jangan tutup atau segarkan halaman ini.'}</p>
            </div>
        )}
        {videoError && (
             <div className="text-center text-red-400 p-4 bg-red-900/20 rounded-lg">
                <h3 className="font-bold text-lg mb-2">Gagal Menghasilkan Video</h3>
                <p className="text-sm">{videoError}</p>
             </div>
        )}
        {generatedVideo && (
            <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
                <video src={generatedVideo} controls autoPlay loop className="w-full h-full object-contain" />
            </div>
        )}
      </div>
      </div>
    </div>
    );
  };
  
  const renderComingSoon = (toolName: string) => (
      <div className="p-4 md:p-6 bg-black/20 rounded-2xl border border-white/10 backdrop-blur-xl">
        <div className="flex flex-col items-center justify-center text-center p-8 min-h-[400px]">
            <h2 className="text-3xl font-bold text-white mb-4">{toolName}</h2>
            <p className="text-gray-400 text-lg">Fitur ini sedang dalam pengembangan.</p>
            <p className="text-gray-500 mt-2">Nantikan pembaruan selanjutnya!</p>
        </div>
      </div>
  );
  
  const renderAffiliateGenerator = () => (
    <div>
        <div className="mb-8">
            <h2 className="text-3xl font-bold text-white">AFFILIATE Content Generator</h2>
            <p className="text-gray-400 mt-1">Buat konten affiliate bisa dengan rebahan.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 flex flex-col gap-8">
                {/* 1. Main and Supporting Product Photos */}
                <div className="p-6 bg-black/20 rounded-xl border border-white/10">
                    <h3 className="font-semibold text-lg text-white mb-1">1. Unggah Foto Produk</h3>
                    <p className="text-sm text-gray-400 mb-4">Unggah Foto Produk (Utama)</p>
                    <div className="flex items-center gap-4 mb-4">
                        <button onClick={() => mainProductPhotoRef.current?.click()} className="px-5 py-2 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-purple-600 to-teal-500 hover:from-purple-700 hover:to-teal-600 transition-all">
                            Choose file
                        </button>
                        <span className="text-sm text-gray-500">{mainProductPhoto ? '1 file chosen' : 'No file chosen'}</span>
                        <input
                            ref={mainProductPhotoRef}
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleAffiliateFileChange(e, setMainProductPhoto)}
                        />
                    </div>
                    {mainProductPhoto ? (
                        <div className="relative aspect-video bg-black/30 rounded-lg overflow-hidden">
                            <img src={mainProductPhoto} alt="Pratinjau Foto Produk" className="w-full h-full object-contain" />
                             <button onClick={() => setMainProductPhoto(null)} className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-red-500/80 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                             </button>
                        </div>
                    ) : (
                        <div className="aspect-video w-full flex items-center justify-center bg-white/5 border-2 border-dashed border-white/10 rounded-lg">
                            <p className="text-gray-500">Pratinjau Foto Produk</p>
                        </div>
                    )}

                    <div className="pt-6 mt-6 border-t border-white/10">
                        <h4 className="font-semibold text-md text-white mb-4">Foto Produk Pendukung</h4>
                        {supportingProductPhotos.length > 0 && (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                                {supportingProductPhotos.map((photo, index) => (
                                    <div key={index} className="flex flex-col gap-3 p-4 bg-black/30 rounded-lg border border-white/10">
                                        <div className="flex justify-between items-center">
                                            <h5 className="text-sm font-semibold text-white">Foto Produk Pendukung #{index + 1}</h5>
                                            <button onClick={() => removeSupportingPhoto(index)} className="text-red-500 hover:text-red-400 text-xs font-semibold flex items-center gap-1 transition-colors">
                                                <span>Hapus Foto</span>
                                                <span className="text-lg leading-none">&times;</span>
                                            </button>
                                        </div>
                                        <div className="relative aspect-video bg-black/30 rounded-lg overflow-hidden">
                                            <img src={photo.url} alt={`Pendukung ${index + 1}`} className="w-full h-full object-contain" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-400 mb-1.5">
                                                Jelaskan foto pendukung (misal: "bagian belakang baju")
                                            </label>
                                            <input
                                                type="text"
                                                value={photo.description}
                                                onChange={(e) => handleSupportingPhotoDescriptionChange(index, e.target.value)}
                                                placeholder="misal: tampak belakang"
                                                className="w-full bg-white/5 text-white rounded-md p-2.5 text-sm border border-white/10 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button onClick={() => supportingProductPhotosRef.current?.click()} className="w-full text-center py-3 bg-white/10 border border-white/10 rounded-lg text-white hover:bg-white/20 transition-colors">
                            + Tambah Foto Produk Pendukung
                        </button>
                        <input
                            ref={supportingProductPhotosRef}
                            type="file"
                            className="hidden"
                            accept="image/*"
                            multiple
                            onChange={handleSupportingFileChange}
                        />
                    </div>
                </div>

                {/* 2. Jelaskan Produk & Konsep Foto */}
                <div className="p-6 bg-black/20 rounded-xl border border-white/10">
                    <h3 className="font-semibold text-lg text-white mb-2">2. Jelaskan Produk & Konsep Foto</h3>
                    <textarea
                        value={productConcept}
                        onChange={(e) => setProductConcept(e.target.value)}
                        placeholder="Contoh: Ini adalah produk skincare serum pencerah untuk wanita usia 20-30 tahun. Konsep foto adalah aesthetic, clean, dan minimalis dengan pencahayaan alami."
                        rows={4}
                        className="w-full bg-white/5 text-white rounded-md p-3 border border-white/10 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition resize-y"
                    />
                     <button
                        onClick={handleGenerateConcept}
                        disabled={!mainProductPhoto || isConceptLoading || !isApiKeySelected}
                        className="w-full mt-3 py-2 px-4 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md flex items-center justify-center gap-2"
                    >
                         {isConceptLoading ? (
                             <>
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Menganalisis...</span>
                             </>
                         ) : (
                             <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 0 0 .951-.69l1.07-3.292z"></path></svg>
                                <span>Konsep Otomatis</span>
                             </>
                         )}
                    </button>
                    {conceptError && <p className="text-red-400 text-sm mt-2">{conceptError}</p>}
                    {(!mainProductPhoto || !isApiKeySelected) && (
                        <p className="text-yellow-400 text-xs mt-2 text-center">
                            Unggah foto produk utama & pilih Kunci API untuk mengaktifkan.
                        </p>
                    )}
                    <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-center">
                        <div>
                            <h4 className="font-semibold text-md text-white">Tambahkan Tulisan pada Hasil</h4>
                            <p className="text-sm text-gray-400">(optional)</p>
                        </div>
                        <label htmlFor="add-text-toggle" className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                id="add-text-toggle" 
                                className="sr-only peer"
                                checked={addTextOverlay}
                                onChange={(e) => setAddTextOverlay(e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-teal-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                    </div>
                </div>

                {/* 3. Model Photos & AI Characteristics */}
                <div className="p-6 bg-black/20 rounded-xl border border-white/10">
                    <h3 className="font-semibold text-lg text-white mb-1">3. Unggah Foto Model</h3>
                    <p className="text-sm text-gray-400 mb-4">(optional, maks 2)</p>
                     {modelPhotos.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            {modelPhotos.map((photo, index) => (
                                <div key={index} className="relative aspect-square group">
                                    <img src={photo} alt={`Model ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                                     <button onClick={() => removeModelPhoto(index)} className="absolute top-1 right-1 p-1.5 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 hover:bg-red-500/80 transition-all">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    {modelPhotos.length < 2 && (
                        <button onClick={() => modelPhotosRef.current?.click()} className="w-full text-center py-3 bg-white/10 border border-white/10 rounded-lg text-white hover:bg-white/20 transition-colors mb-6">
                            + Tambah Model
                        </button>
                    )}
                    <input
                        ref={modelPhotosRef}
                        type="file"
                        className="hidden"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleAffiliateFileChange(e, setModelPhotos, true, 2)}
                    />
                    <div className="flex flex-col gap-4 pt-4 border-t border-white/10">
                        <h4 className="font-semibold text-md text-white">Karakteristik Model AI</h4>
                        <CustomSelect
                            value={aiModelType}
                            onChange={setAiModelType}
                            options={AI_MODEL_TYPES}
                        />
                        <CustomSelect
                            value={aiModelAge}
                            onChange={setAiModelAge}
                            options={AI_MODEL_AGES}
                        />
                        <label htmlFor="hijab-checkbox" className="flex items-center gap-3 cursor-pointer text-sm text-gray-300">
                            <input
                                type="checkbox"
                                id="hijab-checkbox"
                                checked={isHijabModel}
                                onChange={(e) => setIsHijabModel(e.target.checked)}
                                className="w-4 h-4 text-teal-500 bg-white/10 border-white/20 rounded focus:ring-teal-500"
                            />
                            <span>Model Berjilbab?</span>
                        </label>
                    </div>
                </div>

                {/* 4. Ratio */}
                <div className="p-6 bg-black/20 rounded-xl border border-white/10">
                    <h3 className="font-semibold text-lg text-white mb-2">4. Pilih Rasio</h3>
                    <CustomSelect
                        value={affiliateAspectRatio}
                        onChange={setAffiliateAspectRatio}
                        options={AFFILIATE_ASPECT_RATIOS}
                    />
                </div>

                {/* 5. Ad Type */}
                <div className="p-6 bg-black/20 rounded-xl border border-white/10">
                    <h3 className="font-semibold text-lg text-white mb-2">5. Pilih Tipe Iklan</h3>
                    <CustomSelect
                        value={affiliateAdType}
                        onChange={setAffiliateAdType}
                        options={AFFILIATE_AD_TYPES}
                    />
                </div>

                 {/* 6. Language & Accent Settings */}
                <div className="p-6 bg-black/20 rounded-xl border border-white/10">
                    <h3 className="font-semibold text-lg text-white mb-2">6. Pengaturan Bahasa & Aksen</h3>
                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Bahasa Narasi & Caption</label>
                            <CustomSelect
                                value={narrationLanguage}
                                onChange={setNarrationLanguage}
                                options={AFFILIATE_LANGUAGES}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Aksen Suara (Opsional, untuk Narasi)</label>
                            <input
                                type="text"
                                value={voiceAccent}
                                onChange={(e) => setVoiceAccent(e.target.value)}
                                placeholder="Contoh: Jawa medok, Batak, British English"
                                className="w-full bg-white/5 text-white rounded-md p-3 border border-white/10 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                            />
                        </div>
                    </div>
                </div>

                {/* Generate Button */}
                 <button
                    onClick={handleGenerateAffiliateContent}
                    disabled={!mainProductPhoto || isAffiliateLoading || !isApiKeySelected}
                    className="w-full py-3 px-6 text-lg font-semibold text-white rounded-xl bg-gradient-to-r from-purple-600 to-teal-500 hover:from-purple-700 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg transform hover:scale-105"
                >
                    {isAffiliateLoading ? 'Menghasilkan...' : 'Generate Konten'}
                </button>


            </div>

            <div className="lg:col-span-2 flex flex-col gap-6">
                 {isAffiliateLoading && affiliateLoadingMessage && (
                     <div className="p-4 bg-black/30 rounded-xl border border-white/10 text-center">
                         <p className="font-semibold text-teal-400 animate-pulse">{affiliateLoadingMessage}</p>
                     </div>
                 )}
                 {(!isAffiliateLoading && (affiliateBrollPhotos.length > 0 || affiliateUgcPhotos.length > 0 || affiliateCommercialPhotos.length > 0)) && (
                    <div className="p-4 bg-black/30 rounded-xl border border-white/10">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Pilih Rasio Tampilan Hasil</label>
                        <CustomSelect
                            value={affiliateResultAspectRatio}
                            onChange={setAffiliateResultAspectRatio}
                            options={AFFILIATE_ASPECT_RATIOS}
                        />
                    </div>
                 )}
                 <AffiliateResultSection 
                    title="Foto B-Roll" 
                    images={affiliateBrollPhotos} 
                    isLoading={isAffiliateLoading} 
                    aspectRatio={affiliateResultAspectRatio}
                    onImageUpdate={(index, url) => setAffiliateBrollPhotos(prev => prev.map((img, i) => (i === index ? url : img)))}
                    onSuggestMovement={handleSuggestMovementFromImage}
                    isApiKeySelected={isApiKeySelected}
                 />
                 <AffiliateResultSection 
                    title="Foto UGC" 
                    images={affiliateUgcPhotos} 
                    isLoading={isAffiliateLoading} 
                    aspectRatio={affiliateResultAspectRatio}
                    onImageUpdate={(index, url) => setAffiliateUgcPhotos(prev => prev.map((img, i) => (i === index ? url : img)))}
                    onSuggestMovement={handleSuggestMovementFromImage}
                    isApiKeySelected={isApiKeySelected}
                 />
                 <AffiliateResultSection 
                    title="Foto Komersial" 
                    images={affiliateCommercialPhotos} 
                    isLoading={isAffiliateLoading} 
                    aspectRatio={affiliateResultAspectRatio}
                    onImageUpdate={(index, url) => setAffiliateCommercialPhotos(prev => prev.map((img, i) => (i === index ? url : img)))}
                    onSuggestMovement={handleSuggestMovementFromImage}
                    isApiKeySelected={isApiKeySelected}
                 />
                 {affiliateError && !isAffiliateLoading && (
                     <div className="p-4 bg-red-900/20 rounded-xl border border-red-500/30 text-center">
                         <p className="font-semibold text-red-400">Terjadi Kesalahan</p>
                         <p className="text-sm text-red-400/80 mt-1">{affiliateError}</p>
                     </div>
                 )}
            </div>
        </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="p-4 md:p-6 bg-black/20 rounded-2xl border border-white/10 backdrop-blur-xl">
        {renderAffiliateGenerator()}
    </div>
  );

  const mainContent: { [key: string]: { renderer: () => React.ReactElement, title: string, description: string } } = {
    'dashboard': {
        renderer: renderDashboard,
        title: "Dashboard",
        description: "Selamat datang di MuzeGen AI."
    },
    'gambar': {
        renderer: renderProductGenerator,
        title: "AI Generator",
        description: "Ciptakan visual menakjubkan dari imajinasi Anda."
    },
    'film': {
        renderer: renderVideoGenerator,
        title: "Prompt Studio",
        description: "Hasilkan klip video sinematik dari sebuah prompt."
    },
    'projects': { renderer: () => renderComingSoon('Projects'), title: "Projects", description: "Coming Soon." },
    'assets': { renderer: () => renderComingSoon('Assets Library'), title: "Assets Library", description: "Coming Soon." },
    'community': { renderer: () => renderComingSoon('Community Hub'), title: "Community Hub", description: "Coming Soon." },
    'settings': { renderer: () => renderComingSoon('Settings'), title: "Settings", description: "Coming Soon." },
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <IconDashboard /> },
    { id: 'gambar', label: 'AI Generator', icon: <IconImage /> },
    { id: 'film', label: 'Prompt Studio', icon: <IconFilm /> },
    { id: 'projects', label: 'Projects', icon: <IconProject /> },
    { id: 'assets', label: 'Assets Library', icon: <IconAssets /> },
    { id: 'community', label: 'Community Hub', icon: <IconCommunity /> },
  ];
  
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <svg className="animate-spin h-10 w-10 text-teal-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }
  
  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen text-gray-200 font-sans">
      <button
        className={`menu-toggle-button ${isSidebarOpen ? 'opacity-0 pointer-events-none' : ''}`}
        onClick={() => setIsSidebarOpen(true)}
        aria-label="Buka menu"
      >
        <MagicMenuIcon />
      </button>

      {isSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      <aside className={`fixed top-0 left-0 h-full w-[226px] backdrop-blur-xl z-40 flex flex-col rounded-br-2xl transition-transform duration-300 ease-in-out md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-[4.5rem] px-6 flex items-center">
          <div className="flex items-center gap-3">
            <img src={LOGO_BASE64} alt="MuzeGen AI Logo" style={{ width: 40, height: 40 }} />
            <div>
              <h2 className="text-2xl font-bold tracking-wider text-white">MuzeGen AI</h2>
              <p className="text-xs text-gray-400 mt-1">Create. Imagine. Transform.</p>
            </div>
          </div>
        </div>

        <div className="flex-grow flex flex-col p-6 overflow-y-auto">
          <nav className="flex-grow flex flex-col gap-2">
              {menuItems.map(item => (
                  <button 
                      key={item.id}
                      onClick={() => handleToolChange(item.id)}
                      className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-left text-base font-medium transition-all duration-200 group ${
                      activeTool === item.id
                          ? 'bg-gradient-to-r from-purple-600 to-teal-500 text-white shadow-lg'
                          : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      }`}
                  >
                      <span className={activeTool === item.id ? 'text-white' : 'text-gray-400 group-hover:text-white'}>{item.icon}</span>
                      <span>{item.label}</span>
                  </button>
              ))}
          </nav>

          <div className="flex flex-col gap-2 pt-4">
              <div className="w-11/12 self-center h-px bg-white/10 mb-2" />
              
              <button 
                  onClick={handleSelectKey}
                  className="w-full flex items-center justify-between gap-4 px-4 py-3 rounded-lg text-left text-base font-medium transition-all duration-200 group text-gray-400 hover:bg-white/5 hover:text-white"
              >
                  <div className="flex items-center gap-4">
                      <IconSettings />
                      <span>API Key</span>
                  </div>
                  {isApiKeySelected ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                  ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-4a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                      </svg>
                  )}
              </button>

              <div className="mt-4 p-3 bg-black/20 rounded-lg flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                      <UserProfileIcon email={user.email} />
                      <div className="flex-grow overflow-hidden">
                          <p className="font-medium text-sm text-gray-300 truncate">{user.email}</p>
                          <p className="text-xs text-gray-500">Online</p>
                      </div>
                  </div>
                  <button 
                      onClick={handleLogout}
                      className="group p-2 rounded-md hover:bg-red-500/10 transition-colors"
                      aria-label="Logout"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 group-hover:text-red-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                  </button>
              </div>
          </div>
        </div>
      </aside>


      <main className="md:pl-[226px]">
        <header className={`sticky-header px-4 md:px-6 ${isScrolled ? 'scrolled' : ''}`}>
            <div className={`w-full text-center transition-opacity duration-200 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
                <h1 className="text-2xl font-bold text-white">
                    {mainContent[activeTool]?.title || 'Loading...'}
                </h1>
                <p className="text-sm text-gray-400">
                    {mainContent[activeTool]?.description || ''}
                </p>
            </div>
        </header>
        <div className="p-4 md:p-6">
          <div className={`transition-opacity duration-200 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
            {mainContent[activeTool] ? mainContent[activeTool].renderer() : renderComingSoon(activeTool)}
          </div>
        </div>
      </main>

      {/* Edit Prompt Detail Modal */}
      {isEditModalOpen && editingImageIndex !== null && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[70] p-4 backdrop-blur-md">
          <div className="bg-[#1a182e] border border-white/20 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
             <div className="p-5 border-b border-white/10 flex justify-between items-center bg-[#221f3d]">
                <h3 className="text-xl font-bold text-white">Edit Prompt Detail</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
             </div>
             <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Ide Prompt Baru (Manual)</label>
                  <textarea 
                    value={editDetailPrompt}
                    onChange={(e) => setEditDetailPrompt(e.target.value)}
                    placeholder="Contoh: tambahkan kacamata hitam, ubah ekspresi jadi tertawa..."
                    rows={4}
                    className="w-full bg-white/5 text-white rounded-xl p-4 border border-white/10 focus:ring-2 focus:ring-teal-500 transition resize-none outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Referensi Gambar (Opsional)</label>
                  <div className="flex flex-col gap-3">
                     {editReferenceImage ? (
                        <div className="relative aspect-video w-full bg-black/30 rounded-xl overflow-hidden group">
                           <img src={editReferenceImage} alt="Referesi Edit" className="w-full h-full object-contain" />
                           <button 
                            onClick={() => removeUploadedImage('edit-ref')}
                            className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-red-500 transition"
                           >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                           </button>
                        </div>
                     ) : (
                        <button 
                          onClick={() => editReferenceInputRef.current?.click()}
                          className="w-full py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-gray-300 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          Upload Referensi
                        </button>
                     )}
                     <input 
                      ref={editReferenceInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, 'edit-ref')}
                     />
                  </div>
                </div>
             </div>
             <div className="p-6 bg-[#221f3d] border-t border-white/10 flex gap-4">
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-3 px-6 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 font-semibold transition-all border border-white/10"
                >
                  Simpan
                </button>
                <button 
                  onClick={() => handleRegenerateIndividual(editingImageIndex, editDetailPrompt)}
                  disabled={isIndividualLoading || !isApiKeySelected}
                  className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-teal-500 text-white font-bold shadow-lg hover:from-purple-700 hover:to-teal-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isIndividualLoading ? (
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                  ) : 'Regenerate'}
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Crop Modal */}
      {cropModalData && (
        <ImageCropModal
          imageSrc={cropModalData.src}
          aspectRatio={cropModalData.aspect}
          onCrop={handleApplyCroppedImage}
          onCancel={() => setCropModalData(null)}
        />
      )}

      {/* Movement Suggestion Modal */}
      {(isMovementSuggestionLoading || movementSuggestion || movementSuggestionError) && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => { setMovementSuggestion(null); setMovementSuggestionError(null); }}>
            <div className="bg-[#161324] border border-white/10 rounded-xl p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-white mb-4">Saran Prompt Gerakan</h3>
                {isMovementSuggestionLoading && (
                    <div className="flex items-center justify-center text-gray-300">
                        <svg className="animate-spin h-6 w-6 mr-3" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>
                        Menganalisis gambar...
                    </div>
                )}
                {movementSuggestionError && <p className="text-red-400 text-sm">{movementSuggestionError}</p>}
                {movementSuggestion && <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans bg-black/20 p-4 rounded-md">{movementSuggestion}</pre>}
                <div className="flex gap-2 mt-4">
                    <button 
                        onClick={() => { setMovementSuggestion(null); setMovementSuggestionError(null); }}
                        className="flex-1 py-2 px-4 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                        Tutup
                    </button>
                    {movementSuggestion && (
                        <button
                            onClick={handleCopySuggestion}
                            disabled={isSuggestionCopied}
                            className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                                isSuggestionCopied 
                                ? 'bg-green-600 text-white' 
                                : 'bg-teal-500 hover:bg-teal-600 text-white'
                            }`}
                        >
                            {isSuggestionCopied ? 'Tersalin!' : 'Salin'}
                        </button>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;
