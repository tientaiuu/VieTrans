import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MOCK_DATA } from '../data/mockData';

export const TranslatePage: React.FC = () => {
    const fileRef = useRef<HTMLInputElement>(null);
    const sliderContainerRef = useRef<HTMLDivElement>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploadState, setUploadState] = useState<'empty' | 'processing' | 'done'>('empty');
    const [sliderPos, setSliderPos] = useState(50);
    const [isDragging, setIsDragging] = useState(false);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImagePreview(URL.createObjectURL(file));
            setUploadState('empty');
        }
    };

    const startTranslation = () => {
        if (!imagePreview) {
            alert('Vui lòng kéo thả hoặc chọn ảnh từ thiết bị của bạn trước!');
            return;
        }
        setUploadState('processing');
        setTimeout(() => {
            setUploadState('done');
        }, 2500);
    };

    const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging || !sliderContainerRef.current) return;
        const rect = sliderContainerRef.current.getBoundingClientRect();
        let clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        let x = clientX - rect.left;
        let percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setSliderPos(percent);
    };

    return (
        <>
            {/* Main Canvas */}
            <main className="flex-1 flex flex-col min-h-screen">
                {/* TopNavBar */}
                <header className="fixed top-0 w-full z-50 bg-[#faf8ff]/80 dark:bg-[#131b2e]/80 backdrop-blur-xl shadow-[0_12px_40px_rgba(19,27,46,0.06)] h-20 flex justify-between items-center px-8">
                    <div className="flex items-center gap-8">
                        <span className="text-2xl font-black text-[#00488d] dark:text-[#dae2fd] tracking-tighter font-['Manrope']">IIMT Curator</span>
                        <nav className="hidden md:flex gap-6 font-['Manrope'] tracking-tight font-bold">
                            <Link className="text-[#131b2e]/60 dark:text-[#dae2fd]/60 hover:text-[#00488d]" to="/">Home</Link>
                            <Link className="text-[#00488d] dark:text-[#dae2fd] border-b-2 border-[#00488d] pb-1" to="/translate">Translate</Link>
                            <Link className="text-[#131b2e]/60 dark:text-[#dae2fd]/60 hover:text-[#00488d]" to="/history">History</Link>
                        </nav>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="p-2 rounded-full hover:bg-[#f2f3ff] transition-all text-on-surface-variant">
                            <span className="material-symbols-outlined">notifications</span>
                        </button>
                        <Link to="/settings" className="p-2 rounded-full hover:bg-[#f2f3ff] transition-all text-on-surface-variant">
                            <span className="material-symbols-outlined">settings</span>
                        </Link>
                        <Link to="/account" className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center border-2 border-primary/10 overflow-hidden">
                            <img alt="User profile avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBWD5jBcqotuoGwoZRcQSzErfZ30uH7SOrRV8z52necI1flWkn9cFOF4EqHWyvjcxzk034hjC8aL0Ls4fGHMTBDsgH9Vjsh-AVhvxO102LJkbIAi4i2AQSAV3BjAoRRXcrOo0yjL51abyBtyX12XrSpK-GCLG06YEW2rkEjE3QL2ee-DfKcTXHtAourZICS_YUp6kiyzvtitl6kQn8H0WvOvHESyZfeAWTLhYWoL5NQoHDjTtABuOGRjZIpauIRFa_1Gy_mIB-2cw" />
                        </Link>
                    </div>
                </header>

                {/* Content Area */}
                <section className="mt-20 p-8 flex-1 flex flex-col gap-8 max-w-7xl mx-auto w-full">
                    {/* Hero / Workspace Header */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-4xl font-extrabold tracking-tight text-on-background">Curation Studio</h1>
                            <p className="text-on-surface-variant mt-2 text-lg">Upload visual assets for high-fidelity linguistic restoration.</p>
                        </div>
                        <div className="flex gap-3">
                            <input type="file" accept="image/*" hidden ref={fileRef} onChange={handleUpload} />
                            <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-surface-container hover:bg-surface-container-high transition-all font-semibold text-primary">
                                <span className="material-symbols-outlined">photo_camera</span> Nhập ảnh
                            </button>
                            <button onClick={startTranslation} disabled={uploadState === 'processing'} className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-container text-white font-bold shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
                                <span className="material-symbols-outlined">publish</span>
                                {uploadState === 'processing' ? 'Đang phân tích...' : 'Bắt đầu dịch'}
                            </button>
                        </div>
                    </div>

                    {/* Main Workspace Grid */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                        {/* Left: Upload & Preview Canvas */}
                        <div className="xl:col-span-8 flex flex-col gap-6">
                            <div className="relative aspect-[16/10] bg-surface-container-low rounded-2xl overflow-hidden border-2 border-dashed border-outline-variant/30 flex items-center justify-center group hover:border-primary/40 transition-colors">
                                <div className={`absolute inset-0 flex flex-col items-center justify-center p-12 text-center transition-opacity ${imagePreview ? 'opacity-0 hidden' : ''}`}>
                                    <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform cursor-pointer" onClick={() => fileRef.current?.click()}>
                                        <span className="material-symbols-outlined text-4xl text-primary">add_photo_alternate</span>
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">Drag image to curate</h3>
                                    <p className="text-on-surface-variant max-w-sm">Support for high-resolution PNG, JPG and WebP. Max file size 25MB.</p>
                                </div>
                                {uploadState === 'processing' && (
                                    <div className="absolute inset-0 bg-surface/60 backdrop-blur-md flex flex-col items-center justify-center z-10 transition-all">
                                        <div className="w-64 h-2 bg-surface-container-high rounded-full overflow-hidden">
                                            <div className="h-full bg-primary animate-pulse rounded-full" style={{ width: "65%" }}></div>
                                        </div>
                                        <p className="mt-4 font-bold text-primary tracking-widest uppercase text-xs animate-pulse">Processing Neural Restoration...</p>
                                    </div>
                                )}
                                {imagePreview && (
                                    <img src={imagePreview} className="w-full h-full object-cover rounded-xl" alt="Preview"/>
                                )}
                            </div>

                            {uploadState === 'done' && (
                                <div className="bg-surface-container rounded-2xl p-4 overflow-hidden shadow-sm mt-6 fade-in animate-in duration-500">
                                    <div className="flex justify-between mb-4 items-center">
                                        <div className="flex gap-4">
                                            <span className="px-3 py-1 bg-surface-container-highest rounded text-xs font-bold text-primary">BEFORE</span>
                                            <span className="px-3 py-1 bg-primary text-white rounded text-xs font-bold">AFTER</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button className="p-2 hover:bg-surface-container-high rounded-lg text-on-surface-variant">
                                                <span className="material-symbols-outlined">zoom_in</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div
                                        className="relative h-[400px] rounded-xl overflow-hidden cursor-crosshair select-none"
                                        ref={sliderContainerRef}
                                        onMouseDown={() => setIsDragging(true)}
                                        onMouseUp={() => setIsDragging(false)}
                                        onMouseLeave={() => setIsDragging(false)}
                                        onMouseMove={handleMouseMove}
                                        onTouchStart={() => setIsDragging(true)}
                                        onTouchEnd={() => setIsDragging(false)}
                                        onTouchMove={handleMouseMove}
                                    >
                                        <div className="absolute inset-0 pointer-events-none">
                                            <img className="w-full h-full object-cover grayscale brightness-75" src={imagePreview || ''} alt="Original" />
                                        </div>
                                        <div className="absolute inset-0 overflow-hidden border-r-4 border-white/30 pointer-events-none" style={{ width: `${sliderPos}%` }}>
                                            <img className="h-full object-cover min-w-full" style={{ width: sliderPos > 0 ? `calc(100% * (100 / ${sliderPos}))` : '100%', maxWidth: 'none' }} src="https://lh3.googleusercontent.com/aida-public/AB6AXuD2lx8h7tn5mMC8vSDL56kLwCFoZzKFhqZNCWBlBXuqNG41bIU7yPeEUgTgzdPXRUotS5-SpHVjPAQkrIbadwx3g62rtftUhnahoqfbnvigL9IL-T2Sy19KRR21WHV6uyvh93Zb4tjn23Fei9w5qEhbD-5sMz9I6LUtXez4o43sQ2swp0fZs4E-BYDIi9qKkjwLwRWynq-2NDGm1FgLlr_ERyxNe4n43oatwvHA6BlVaS-kjs3zDkARrAeRgey5qLr-NGGgc9aRjw" alt="Restored" />
                                        </div>
                                        <div style={{ left: `${sliderPos}%` }} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full glass-panel shadow-2xl flex items-center justify-center z-20 border border-white/40 pointer-events-none">
                                            <span className="material-symbols-outlined text-primary">unfold_more</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right: OCR & Translation Editor */}
                        <div className="xl:col-span-4 flex flex-col gap-6">
                            {/* OCR Section */}
                            <div className="bg-surface-container-low rounded-2xl p-6 flex flex-col gap-4 border border-outline-variant/10">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary">description</span>
                                        Original Text (OCR)
                                    </h3>
                                    <button className="text-xs font-bold text-primary hover:underline uppercase tracking-tighter">Copy All</button>
                                </div>
                                <textarea className="w-full h-40 bg-surface-container border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 resize-none font-body" placeholder="Detected text will appear here..." defaultValue="The quick brown fox jumps over the lazy dog. Scientific manuscripts require precise restoration to maintain historical integrity."></textarea>
                            </div>

                            {/* Translation Section */}
                            <div className="bg-surface-container-low rounded-2xl p-6 flex flex-col gap-4 border border-outline-variant/10">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold flex items-center gap-2">
                                        <span className="material-symbols-outlined text-tertiary">translate</span>
                                        Restoration Output
                                    </h3>
                                    <div className="flex gap-2">
                                        <button className="p-1 hover:bg-surface-container-high rounded text-on-surface-variant">
                                            <span className="material-symbols-outlined text-sm">volume_up</span>
                                        </button>
                                        <button className="p-1 hover:bg-surface-container-high rounded text-on-surface-variant">
                                            <span className="material-symbols-outlined text-sm">history</span>
                                        </button>
                                    </div>
                                </div>
                                <textarea className="w-full h-40 bg-surface-container border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 resize-none font-body text-primary" placeholder="Translated text..." defaultValue="Con cáo nâu nhanh nhẹn nhảy qua con chó lười biếng. Các bản thảo khoa học đòi hỏi sự phục hồi chính xác để duy trì tính toàn vẹn lịch sử."></textarea>
                                
                                <div className="grid grid-cols-2 gap-3 mt-2">
                                    <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest transition-all font-bold text-on-surface-variant text-sm">
                                        <span className="material-symbols-outlined text-sm">refresh</span>
                                        Retry
                                    </button>
                                    <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-md hover:opacity-90 transition-all">
                                        <span className="material-symbols-outlined text-sm">download</span>
                                        Download
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="bg-[#faf8ff] dark:bg-[#0f172a] flex flex-col md:flex-row justify-between items-center px-12 py-8 w-full mt-auto">
                    <p className="font-['Inter'] text-xs uppercase tracking-widest opacity-60">© 2024 IIMT Curator. Precision Restoration.</p>
                    <div className="flex gap-8 mt-4 md:mt-0">
                        <Link className="font-['Inter'] text-xs uppercase tracking-widest opacity-60 hover:opacity-100 hover:underline" to="#">Privacy Policy</Link>
                        <Link className="font-['Inter'] text-xs uppercase tracking-widest opacity-60 hover:opacity-100 hover:underline" to="#">Terms of Service</Link>
                        <Link className="font-['Inter'] text-xs uppercase tracking-widest opacity-60 hover:opacity-100 hover:underline" to="#">API Documentation</Link>
                        <Link className="font-['Inter'] text-xs uppercase tracking-widest opacity-60 hover:opacity-100 hover:underline" to="#">Support</Link>
                    </div>
                </footer>
            </main>
        </>
    );
};

export default TranslatePage;
