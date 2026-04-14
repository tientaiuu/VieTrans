import React from 'react';
import { Link } from 'react-router-dom';
import { MOCK_DATA } from '../data/mockData';

export const AccountPage: React.FC = () => {
  return (
    <>
      {/*  Top Navigation Bar  */}
<header className="fixed top-0 w-full z-50 bg-[#faf8ff]/80 backdrop-blur-xl flex justify-between items-center px-8 h-20 w-full max-w-none shadow-[0_12px_40px_rgba(19,27,46,0.06)]">
<div className="flex items-center gap-8">
<span className="text-2xl font-black text-[#00488d] tracking-tighter font-headline">IIMT Curator</span>
<nav className="hidden md:flex items-center gap-6">
<Link className="text-[#131b2e]/60 font-headline tracking-tight font-bold hover:text-[#00488d] transition-all duration-300" to="/">Home</Link>
<Link className="text-[#131b2e]/60 font-headline tracking-tight font-bold hover:text-[#00488d] transition-all duration-300" to="/translate">Translate</Link>
<Link className="text-[#131b2e]/60 font-headline tracking-tight font-bold hover:text-[#00488d] transition-all duration-300" to="/history">History</Link>
</nav>
</div>
<div className="flex items-center gap-4">
<button className="p-2 text-[#005FB8] hover:bg-[#f2f3ff] transition-all duration-300 rounded-lg scale-95 active:scale-90">
<span className="material-symbols-outlined">notifications</span>
</button>
<Link to="/settings" className="p-2 text-[#005FB8] hover:bg-[#f2f3ff] transition-all duration-300 rounded-lg scale-95 active:scale-90">
<span className="material-symbols-outlined">settings</span>
</Link>
<Link to="/account" className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-fixed">
<img alt="User profile avatar" className="w-full h-full object-cover" data-alt="professional studio portrait of a young male professional with short hair, wearing a neutral blazer, soft warm lighting, minimalist background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDYr21MOKV-3nHFrJikTRfHomwSKbXrVjsFVKFIGnhYBwL5sxLvJ_7_KBD-DnmSJagNMFoRL_LDQiQBRyI70mNJ3R-gmbvSDPRhIqEqregjOvkOkTJDtOHIRkeAlU7fB2loXiOrq8RS2LleQh_l4yBkTPG7Y7t4MLnN-o8ONvp1s87hsDUCd7p4AcpweE3jQpHpgDQTqx4t4fX9zUsaEawmVzmh7MEP2Op2udaNEPCU0X-AxNTe0_Cdxzgg8L7DtLLocEu7tGyyIA"/>
</Link>
</div>
</header>
<div className="flex min-h-screen pt-20">

{/*  Main Content Canvas  */}
<main className="flex-1 bg-surface-container-low p-8 lg:p-12">
<div className="max-w-5xl mx-auto space-y-12">
{/*  Header & Profile Overview  */}
<section className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
<div className="flex items-center gap-8">
<div className="relative group">
<div className="w-32 h-32 rounded-3xl overflow-hidden shadow-2xl ring-4 ring-white">
<img alt="Profile" className="w-full h-full object-cover" data-alt="high-end professional portrait of a tech worker, clean lighting, soft bokeh background, wearing modern minimal apparel" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA6wT9vRid__QhrIpoio_bV-Mmhu9QXXc2B7I5rEt2t4Y0LWi1aoTGyoylUiRbYHpwZz7zmbEFpHFl-VAEcEqRRmiZlWyeKVWn-rTRPSdt4eLJbj7Grukvo-etQWRjCRK_2nO1uKUo3gSVZcVGk6dLlMnsDYdJYTExk2BrGX35V11zmh2MHibWkgMiNZbzeu8LVBaDsTrZT3gqdW1i9Yf8okGSXplG84ZjkmndawdKVf1T28ILVwwnPk5EGk31PIicipC2gBTK9WA"/>
</div>
<button className="absolute -bottom-2 -right-2 bg-primary text-on-primary p-2 rounded-xl shadow-lg hover:scale-105 transition-transform">
<span className="material-symbols-outlined text-base">photo_camera</span>
</button>
</div>
<div className="space-y-1">
<h1 className="text-4xl font-headline font-black tracking-tighter text-on-background">Nguyễn Minh</h1>
<p className="text-on-surface-variant font-medium">minh.nguyen@curator.io</p>
<div className="flex items-center gap-4 mt-2">
<span className="px-3 py-1 bg-surface-container-highest text-primary text-xs font-bold rounded-full">PREMIUM CURATOR</span>
<span className="text-xs text-on-surface-variant/60 font-label uppercase tracking-widest">Joined Jan 2024</span>
</div>
</div>
</div>
</section>
{/*  Management Grid  */}
<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
{/*  Profile Update Section  */}
<div className="lg:col-span-7 bg-surface-container-lowest p-8 rounded-3xl shadow-[0_12px_40px_rgba(19,27,46,0.04)]">
<div className="flex items-center gap-3 mb-8">
<div className="p-2 bg-primary-fixed rounded-lg">
<span className="material-symbols-outlined text-primary">edit_square</span>
</div>
<h3 className="text-xl font-headline font-extrabold text-on-background">Cập nhật thông tin</h3>
</div>
<form className="space-y-6">
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
<div className="space-y-2">
<label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider px-1">Họ và tên</label>
<input className="w-full bg-surface-container px-4 py-3 rounded-xl border-none focus:ring-2 focus:ring-primary transition-all text-on-surface font-medium" type="text" value="Nguyễn Minh"/>
</div>
<div className="space-y-2">
<label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider px-1">Email liên hệ</label>
<input className="w-full bg-surface-container px-4 py-3 rounded-xl border-none focus:ring-2 focus:ring-primary transition-all text-on-surface font-medium" type="email" value="minh.nguyen@curator.io"/>
</div>
</div>
<div className="space-y-2">
<label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider px-1">Tiểu sử</label>
<textarea className="w-full bg-surface-container px-4 py-3 rounded-xl border-none focus:ring-2 focus:ring-primary transition-all text-on-surface font-medium" placeholder="Describe your role or workflow..." rows={3}></textarea>
</div>
<div className="flex justify-end pt-4">
<button className="px-8 py-3 bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-xl font-bold hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95" type="submit">
                                    Lưu thay đổi
                                </button>
</div>
</form>
</div>
{/*  Security & Contextual Actions  */}
<div className="lg:col-span-5 space-y-8">
{/*  Password Section  */}
<div className="bg-surface-container-highest/30 backdrop-blur-md p-8 rounded-3xl border border-white/50 shadow-sm">
<div className="flex items-center gap-3 mb-8">
<div className="p-2 bg-tertiary-fixed rounded-lg">
<span className="material-symbols-outlined text-tertiary">lock</span>
</div>
<h3 className="text-xl font-headline font-extrabold text-on-background">Đổi mật khẩu</h3>
</div>
<form className="space-y-4">
<input className="w-full bg-surface-container-lowest px-4 py-3 rounded-xl border-none focus:ring-2 focus:ring-tertiary transition-all" placeholder="Mật khẩu hiện tại" type="password"/>
<input className="w-full bg-surface-container-lowest px-4 py-3 rounded-xl border-none focus:ring-2 focus:ring-tertiary transition-all" placeholder="Mật khẩu mới" type="password"/>
<button className="w-full py-3 border-2 border-tertiary text-tertiary font-bold rounded-xl hover:bg-tertiary hover:text-on-tertiary transition-all active:scale-95" type="submit">
                                    Cập nhật mật khẩu
                                </button>
</form>
</div>
{/*  Secondary Actions  */}
<div className="bg-error-container/10 p-8 rounded-3xl border border-error/5 space-y-6">
<div>
<h4 className="text-sm font-black text-error uppercase tracking-widest mb-1">Danger Zone</h4>
<p className="text-xs text-on-surface-variant">Actions performed here cannot be reversed.</p>
</div>
<button className="w-full flex items-center justify-center gap-2 py-4 bg-error text-on-error rounded-xl font-bold shadow-lg hover:bg-error/90 transition-all active:scale-95">
<span className="material-symbols-outlined text-sm">logout</span> Đăng xuất khỏi hệ thống
                            </button>
<button className="w-full text-error/60 text-xs font-bold hover:text-error transition-all">
                                Vô hiệu hóa tài khoản
                            </button>
</div>
</div>
</div>
{/*  Usage Statistics (Visual Polish)  */}
<section className="grid grid-cols-1 md:grid-cols-3 gap-6">
<div className="bg-surface-container p-6 rounded-2xl flex items-center gap-4">
<div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
<span className="material-symbols-outlined text-primary">translate</span>
</div>
<div>
<p className="text-2xl font-black font-headline text-on-background">1,284</p>
<p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Translations Completed</p>
</div>
</div>
<div className="bg-surface-container p-6 rounded-2xl flex items-center gap-4">
<div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
<span className="material-symbols-outlined text-primary">verified</span>
</div>
<div>
<p className="text-2xl font-black font-headline text-on-background">99.8%</p>
<p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Accuracy Rating</p>
</div>
</div>
<div className="bg-surface-container p-6 rounded-2xl flex items-center gap-4">
<div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
<span className="material-symbols-outlined text-primary">storage</span>
</div>
<div>
<p className="text-2xl font-black font-headline text-on-background">4.2 GB</p>
<p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Storage Used</p>
</div>
</div>
</section>
</div>
</main>
</div>
{/*  Footer  */}
<footer className="bg-[#faf8ff] flex flex-col md:flex-row justify-between items-center px-12 py-8 w-full border-t-0 shadow-[0_-4px_20px_rgba(19,27,46,0.02)]">
<p className="font-['Inter'] text-xs uppercase tracking-widest opacity-60 text-[#00488d]">© 2024 IIMT Curator. Precision Restoration.</p>
<div className="flex gap-8 mt-4 md:mt-0">
<Link className="font-['Inter'] text-xs uppercase tracking-widest opacity-60 text-[#00488d] hover:opacity-100 transition-opacity" to="#">Privacy Policy</Link>
<Link className="font-['Inter'] text-xs uppercase tracking-widest opacity-60 text-[#00488d] hover:opacity-100 transition-opacity" to="#">Terms of Service</Link>
<Link className="font-['Inter'] text-xs uppercase tracking-widest opacity-60 text-[#00488d] hover:opacity-100 transition-opacity" to="#">Support</Link>
</div>
</footer>
{/*  Floating Assistant (Subtle Branding)  */}
<div className="fixed bottom-8 right-8 z-40">
<button className="w-14 h-14 bg-on-background text-surface rounded-2xl flex items-center justify-center shadow-2xl hover:scale-110 transition-transform active:scale-95">
<span className="material-symbols-outlined" style={{"fontVariationSettings":"'FILL' 1"}}>auto_awesome</span>
</button>
</div>
    </>
  );
};

export default AccountPage;
