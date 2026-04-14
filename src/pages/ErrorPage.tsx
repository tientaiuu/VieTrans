import React from 'react';
import { Link } from 'react-router-dom';
import { MOCK_DATA } from '../data/mockData';

export const ErrorPage: React.FC = () => {
  return (
    <>
      {/*  TopNavBar Component  */}
<nav className="fixed top-0 w-full z-50 bg-[#faf8ff]/80 backdrop-blur-xl shadow-[0_12px_40px_rgba(19,27,46,0.06)] flex justify-between items-center px-8 h-20">
<div className="flex items-center gap-8">
<span className="text-2xl font-black text-[#00488d] tracking-tighter font-headline">IIMT Curator</span>
<div className="hidden md:flex gap-6">
<Link className="text-[#131b2e]/60 font-headline tracking-tight font-bold hover:text-[#00488d] transition-all" to="/">Home</Link>
<Link className="text-[#131b2e]/60 font-headline tracking-tight font-bold hover:text-[#00488d] transition-all" to="/translate">Translate</Link>
<Link className="text-[#131b2e]/60 font-headline tracking-tight font-bold hover:text-[#00488d] transition-all" to="/history">History</Link>
</div>
</div>
<div className="flex items-center gap-4">
<button className="p-2 text-[#131b2e]/60 hover:bg-[#f2f3ff] rounded-lg transition-all scale-95 active:scale-90">
<span className="material-symbols-outlined" data-icon="notifications">notifications</span>
</button>
<Link to="/settings" className="p-2 text-[#131b2e]/60 hover:bg-[#f2f3ff] rounded-lg transition-all scale-95 active:scale-90">
<span className="material-symbols-outlined" data-icon="settings">settings</span>
</Link>
<Link to="/account" className="w-10 h-10 rounded-full bg-surface-container overflow-hidden border-2 border-primary/10">
<img alt="User profile avatar" data-alt="professional headshot of a curator in a brightly lit modern office gallery setting with soft natural light" src="https://lh3.googleusercontent.com/aida-public/AB6AXuANAEcZKZ_MabdEp1wlsEgdzyQLZ6XCw4HNrCBFesmBzrq-9vzVQn4c7yUEX_RYwF1LuerFZt1uIJzJSTdwYkTe9l4P418lxZbvRMwfEEJ6zdcbuhZNkX5APBTV8PuYhH5YgfxBlLraRwZbQnbioVl4Yq9Xr8imdt7kuwuKMD6bThlDtzG2WJ72HE83WLE7XJ9yo73QxV4KR98iyX0Tg5oZjRme4X2CeGpL8yta_nN5mKCC3hQsnCyDalaqJWbfgwnb6Dk_l3MLZQ"/>
</Link>
</div>
</nav>
<main className="pt-32 pb-20 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
{/*  Sidebar context (Navigation)  */}

{/*  Main Content Area: Feedback Mechanisms  */}
<section className="lg:col-span-9 space-y-8">
<header>
<h1 className="text-4xl font-headline font-extrabold tracking-tight text-on-background">System Feedback</h1>
<p className="text-on-surface-variant mt-2 text-lg">Detailed logs of recent actions and processing states.</p>
</header>
{/*  Grid Layout for Notifications  */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
{/*  SUCCESS: Completed Translation  */}
<div className="bg-surface-container-lowest p-8 rounded-xl relative overflow-hidden group">
<div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
<span className="material-symbols-outlined text-7xl" style={{"fontVariationSettings":"'FILL' 1"}}>check_circle</span>
</div>
<div className="flex items-start gap-4">
<div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
<span className="material-symbols-outlined" style={{"fontVariationSettings":"'FILL' 1"}}>task_alt</span>
</div>
<div className="flex-1">
<h3 className="font-headline font-bold text-xl text-on-background">Restoration Complete</h3>
<p className="text-on-surface-variant mt-2 text-sm leading-relaxed">Manuscript #882 has been successfully translated with 99.4% precision accuracy.</p>
<div className="mt-6 flex gap-3">
<button className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-primary-container transition-colors">Download PDF</button>
<button className="bg-secondary-container text-on-secondary-container px-5 py-2 rounded-lg text-sm font-bold">View Gallery</button>
</div>
</div>
</div>
</div>
{/*  ERROR: Invalid File Type  */}
<div className="bg-surface-container-low p-8 rounded-xl border-l-4 border-error/40">
<div className="flex items-start gap-4">
<div className="w-12 h-12 bg-error/10 rounded-lg flex items-center justify-center text-error">
<span className="material-symbols-outlined">file_present</span>
</div>
<div className="flex-1">
<h3 className="font-headline font-bold text-xl text-on-background">Invalid File Type</h3>
<p className="text-on-surface-variant mt-2 text-sm leading-relaxed">The file <span className="font-mono text-xs bg-error-container text-on-error-container px-1 py-0.5 rounded">artifact_scan.exe</span> is not supported.</p>
<p className="text-xs mt-4 text-on-surface-variant/60 uppercase tracking-widest font-bold">Supported Formats: PDF, PNG, TIFF, JPG</p>
</div>
</div>
</div>
{/*  PROCESSING FAILURE: Troubleshooting  */}
<div className="md:col-span-2 bg-surface-container p-8 rounded-xl flex flex-col md:flex-row gap-8 items-center border border-outline-variant/15">
<div className="w-full md:w-1/3 aspect-video bg-on-background/5 rounded-lg flex items-center justify-center overflow-hidden grayscale">
<img alt="Failed processing visual" className="opacity-40" data-alt="close-up of a damaged historical document with blurry text and coffee stains under dim forensic lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDzUD1vatMFST9sAkw1kHAtS1UmAZ1jbOvdgcoCvc0FeB0gVN9oBYEgKj7PrOVNJa03tl-1hUWSs3azhPjBgixxYQFzacluRs-4V6yNX6xYRbSvHQUGIiC7lt-sVOsybzDyRNFKVpXrYPCvGQUcMeDxGh_j7UKyDymQzNs5KEYtAtZXA3Of3bW1eyucMV3HKobDLfkmd6uq6hnMHtnRT8EEOGljaphYNsW3qG94lZIyUvVnSzhVZamWFvWaxuVFLyKNHqsqwKG9kQ"/>
<div className="absolute">
<span className="material-symbols-outlined text-error text-5xl">running_with_errors</span>
</div>
</div>
<div className="flex-1">
<div className="inline-flex items-center gap-2 bg-error/10 text-error px-3 py-1 rounded-full text-xs font-bold mb-4">
<span className="material-symbols-outlined text-sm">warning</span> CRITICAL FAILURE
                        </div>
<h3 className="font-headline font-bold text-2xl text-on-background">Processing Failure: Low Fidelity</h3>
<p className="text-on-surface-variant mt-3 leading-relaxed">The AI engine was unable to extract legible text from the provided image due to severe chromatic aberration and noise.</p>
{/*  Gợi ý xử lý (Troubleshooting Suggestion)  */}
<div className="mt-6 p-4 bg-surface-container-highest rounded-lg border-l-4 border-tertiary">
<p className="text-tertiary-container font-headline font-extrabold text-sm flex items-center gap-2 mb-1">
<span className="material-symbols-outlined text-lg">lightbulb</span> Gợi ý xử lý:
                            </p>
<ul className="text-sm text-on-surface-variant space-y-1 list-disc list-inside">
<li>Re-scan document with a minimum resolution of 300 DPI.</li>
<li>Ensure lighting is consistent across the entire surface.</li>
<li>Flatten document to remove shadows from page folds.</li>
</ul>
</div>
</div>
</div>
</div>
{/*  Modern Toasts/Snackbars (Simulation of overlapping)  */}
<div className="pt-8 border-t border-outline-variant/20">
<h4 className="text-xs uppercase tracking-[0.2em] font-bold text-on-surface-variant/40 mb-6">Interaction Previews</h4>
<div className="flex flex-wrap gap-4">
{/*  Toast: General Info  */}
<div className="bg-inverse-surface text-inverse-on-surface flex items-center gap-4 py-3 px-5 rounded-lg shadow-2xl">
<span className="material-symbols-outlined text-primary-fixed-dim">sync</span>
<span className="text-sm font-medium">Auto-saving draft...</span>
</div>
{/*  Toast: Minimal Success  */}
<div className="bg-surface-container-highest border border-primary/10 flex items-center gap-3 py-3 px-5 rounded-full shadow-lg">
<span className="material-symbols-outlined text-primary" style={{"fontVariationSettings":"'FILL' 1"}}>check_circle</span>
<span className="text-sm font-bold text-on-surface">Link copied to clipboard</span>
</div>
{/*  Toast: Warning/Alert  */}
<div className="bg-[#7b3200] text-white flex items-center gap-3 py-3 px-5 rounded-lg shadow-xl">
<span className="material-symbols-outlined">cloud_off</span>
<span className="text-sm font-medium">Working offline. Some features limited.</span>
<button className="ml-4 text-xs font-black uppercase tracking-widest hover:underline">Retry</button>
</div>
</div>
</div>
</section>
</main>
{/*  Footer Component  */}
<footer className="bg-[#faf8ff] dark:bg-[#0f172a] flex flex-col md:flex-row justify-between items-center px-12 py-12 w-full mt-20">
<div className="mb-8 md:mb-0">
<p className="font-['Inter'] text-xs uppercase tracking-widest text-[#00488d] opacity-60">© 2024 IIMT Curator. Precision Restoration.</p>
</div>
<div className="flex flex-wrap justify-center gap-8">
<Link className="font-['Inter'] text-xs uppercase tracking-widest text-[#00488d] opacity-60 hover:opacity-100 transition-opacity" to="#">Privacy Policy</Link>
<Link className="font-['Inter'] text-xs uppercase tracking-widest text-[#00488d] opacity-60 hover:opacity-100 transition-opacity" to="#">Terms of Service</Link>
<Link className="font-['Inter'] text-xs uppercase tracking-widest text-[#00488d] opacity-60 hover:opacity-100 transition-opacity" to="#">API Documentation</Link>
<Link className="font-['Inter'] text-xs uppercase tracking-widest text-[#00488d] opacity-60 hover:opacity-100 transition-opacity" to="#">Support</Link>
</div>
</footer>
    </>
  );
};

export default ErrorPage;
