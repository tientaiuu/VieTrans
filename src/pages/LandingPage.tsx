import React from 'react';
import { Link } from 'react-router-dom';
import { MOCK_DATA } from '../data/mockData';

export const LandingPage: React.FC = () => {
  return (
    <>
      {/*  TopNavBar  */}
<nav className="fixed top-0 w-full z-50 bg-[#faf8ff]/80 backdrop-blur-xl shadow-[0_12px_40px_rgba(19,27,46,0.06)] flex justify-between items-center px-8 h-20 w-full max-w-none">
<div className="flex items-center gap-8">
<span className="text-2xl font-black text-[#00488d] tracking-tighter font-['Manrope']">IIMT Curator</span>
<div className="hidden md:flex gap-6 items-center">
<Link className="font-['Manrope'] tracking-tight font-bold text-[#00488d] border-b-2 border-[#00488d] pb-1" to="/">Home</Link>
<Link className="font-['Manrope'] tracking-tight font-bold text-[#131b2e]/60 hover:text-[#00488d] transition-all duration-300" to="/translate">Translate</Link>
<Link className="font-['Manrope'] tracking-tight font-bold text-[#131b2e]/60 hover:text-[#00488d] transition-all duration-300" to="/history">History</Link>
</div>
</div>
<div className="flex items-center gap-4">
<button className="p-2 rounded-full hover:bg-[#f2f3ff] transition-all duration-300 text-[#005FB8]">
<span className="material-symbols-outlined" data-icon="notifications">notifications</span>
</button>
<Link to="/settings" className="p-2 rounded-full hover:bg-[#f2f3ff] transition-all duration-300 text-[#005FB8]">
<span className="material-symbols-outlined" data-icon="settings">settings</span>
</Link>
<Link to="/account" className="w-10 h-10 rounded-full overflow-hidden bg-surface-container border-2 border-primary-container/20">
<img alt="User profile avatar" data-alt="close-up portrait of a professional male software engineer with glasses in a modern office environment with soft bokeh background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBTRRe2uwGaGZgwr4L0jwCX4gZ_8LdKtb-Z159LmpDC78IXrASANSy_0SH4E0JIJlw5hS_dcNDx4CwFbSXnNwoqxCVR3O0WXzojfRyQr0iK84IMFkWBgng7htZr9lgvQuIbYJcZu7Vq05femiphky9ffX4Ec38sCUcVJ4883PU5QmHnmzc7maZKwqSBU6q42PSonuFCbIEb-7gqiQWDWvIO0rW4ULmAImTD8vzGowXDIJKI0by6nQYCs89yAibeOV2sMFhHpyO_Tg"/>
</Link>
</div>
</nav>
<main className="pt-20">
{/*  Hero Section  */}
<section className="relative overflow-hidden min-h-[921px] flex items-center px-8 lg:px-20 py-24">
<div className="absolute inset-0 z-0">
<div className="absolute inset-0 bg-gradient-to-tr from-surface via-surface to-primary-fixed/30"></div>
<div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-container/10 rounded-full blur-[100px]"></div>
<div className="absolute bottom-20 left-20 w-72 h-72 bg-tertiary-fixed-dim/20 rounded-full blur-[80px]"></div>
</div>
<div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
<div className="flex flex-col space-y-8">
<div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-container-high text-primary font-label text-sm font-semibold rounded-full w-fit">
<span className="material-symbols-outlined text-sm" data-icon="auto_awesome">auto_awesome</span>
                        TRÍ TUỆ NHÂN TẠO THẾ HỆ MỚI
                    </div>
<h1 className="font-headline font-extrabold text-5xl lg:text-7xl text-on-background tracking-tighter leading-tight">
                        IIMT: Dịch Ảnh Tức Thì, <span className="text-primary italic">Độ Chính Xác Cao</span>
</h1>
<p className="text-on-surface-variant text-lg lg:text-xl max-w-xl leading-relaxed">
                        Giải pháp phục chế và dịch thuật hình ảnh hàng đầu thế giới. Chúng tôi không chỉ dịch văn bản, chúng tôi tái tạo cả linh hồn của bức ảnh.
                    </p>
<div className="flex flex-col sm:flex-row gap-4 pt-4">
<Link className="hero-gradient text-on-primary px-8 py-4 rounded-xl font-headline font-bold text-lg flex items-center justify-center gap-2 shadow-[0_12px_40px_rgba(0,72,141,0.25)] hover:scale-105 active:scale-95 transition-all" to="/translate">
                            Bắt đầu dịch ngay
                            <span className="material-symbols-outlined" data-icon="arrow_forward">arrow_forward</span>
</Link>
<Link className="bg-surface-container-low text-primary px-8 py-4 rounded-xl font-headline font-bold text-lg flex items-center justify-center gap-2 border border-outline-variant/30 hover:bg-surface-container transition-all" to="#">
                            Xem tài liệu API
                        </Link>
</div>
</div>
<div className="relative group">
<div className="absolute -inset-4 bg-primary-container/20 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-500"></div>
<div className="relative bg-surface-container-lowest rounded-2xl overflow-hidden shadow-2xl border border-white/40">
<img alt="Hero Visualization" className="w-full object-cover aspect-[4/3]" data-alt="minimalist modern workspace with a large sleek monitor displaying complex architectural blueprints and multilingual translation interface overlays" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCL1KT46O_uDGjdOkFyL1KAxB4NH39To2vSDpuo04a_M9OrQSCpZGnBzFlFJAQeKYQKbdYTagOyI8cqyejrGYtJYX40NgUyV9jATvs0tinUxcQ8vwHXv12oeMpgTfE6mSeD0tozTl6VvnPVTj_8GparM3mWW-ZBOuFDcSz1iX50a0n9XTLdeGY9k0WM1R_2BEHR3bKsJ_7E0K23Lee01QmTuO83IMBuDJ6d_-HVaa2gElTwB8b0g38O2hs7aP5uWuRkqx2b-1tOeQ"/>
<div className="absolute bottom-6 right-6 glass-panel p-6 rounded-xl border border-white/20 shadow-xl max-w-xs">
<div className="flex items-center gap-3 mb-2">
<span className="material-symbols-outlined text-primary" data-icon="verified" style={{"fontVariationSettings":"'FILL' 1"}}>verified</span>
<span className="font-headline font-bold text-on-background">99.8% Chính xác</span>
</div>
<p className="text-xs text-on-surface-variant">Thuật toán OCR nâng cao nhận diện chính xác kể cả các phông chữ viết tay phức tạp.</p>
</div>
</div>
</div>
</div>
</section>
{/*  Features Bento Grid  */}
<section className="py-32 px-8 lg:px-20 bg-surface-container-low">
<div className="max-w-7xl mx-auto">
<div className="flex flex-col items-center text-center mb-20 space-y-4">
<h2 className="font-headline font-extrabold text-4xl lg:text-5xl tracking-tighter text-on-background">Quy Trình Hoàn Hảo</h2>
<div className="h-1 w-20 bg-primary rounded-full"></div>
</div>
<div className="grid grid-cols-1 md:grid-cols-12 gap-8">
{/*  Feature 1  */}
<div className="md:col-span-8 bg-surface-container-lowest p-10 rounded-2xl flex flex-col justify-between group hover:shadow-xl transition-all duration-500">
<div className="flex flex-col space-y-6">
<div className="w-16 h-16 rounded-2xl bg-primary-container/10 flex items-center justify-center text-primary">
<span className="material-symbols-outlined text-4xl" data-icon="document_scanner">document_scanner</span>
</div>
<h3 className="font-headline font-bold text-3xl">OCR Recognition</h3>
<p className="text-on-surface-variant text-lg leading-relaxed max-w-md">Công nghệ nhận diện ký tự quang học thế hệ mới, hỗ trợ hơn 100 ngôn ngữ và định dạng phông chữ khác nhau với tốc độ xử lý phần nghìn giây.</p>
</div>
<div className="mt-12 flex gap-4">
<span className="px-3 py-1 bg-surface-container rounded-full text-xs font-bold text-primary tracking-widest uppercase">Precision</span>
<span className="px-3 py-1 bg-surface-container rounded-full text-xs font-bold text-primary tracking-widest uppercase">Neural Net</span>
</div>
</div>
{/*  Feature 2  */}
<div className="md:col-span-4 bg-primary text-on-primary p-10 rounded-2xl flex flex-col space-y-6 relative overflow-hidden group">
<div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
<span className="material-symbols-outlined text-[200px]" data-icon="translate">translate</span>
</div>
<div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
<span className="material-symbols-outlined text-4xl" data-icon="high_quality">high_quality</span>
</div>
<h3 className="font-headline font-bold text-2xl">Dịch thuật chất lượng cao</h3>
<p className="text-on-primary/80 text-sm leading-relaxed">Sử dụng mô hình ngôn ngữ lớn (LLMs) được tinh chỉnh để giữ nguyên ngữ cảnh và sắc thái văn hóa.</p>
</div>
{/*  Feature 3  */}
<div className="md:col-span-4 bg-surface-container-high p-10 rounded-2xl flex flex-col space-y-6">
<div className="w-16 h-16 rounded-2xl bg-tertiary-container/10 flex items-center justify-center text-tertiary">
<span className="material-symbols-outlined text-4xl" data-icon="brush">brush</span>
</div>
<h3 className="font-headline font-bold text-2xl">Image Reconstruction</h3>
<p className="text-on-surface-variant text-sm leading-relaxed">Tự động xóa văn bản cũ và điền vào khoảng trống bằng công nghệ In-painting, giữ nguyên nền ảnh gốc.</p>
</div>
{/*  Feature 4  */}
<div className="md:col-span-8 relative rounded-2xl overflow-hidden h-[300px]">
<img alt="Performance banner" className="w-full h-full object-cover" data-alt="abstract artistic visualization of flowing digital data streams in shades of deep blue and electric cyan with soft particles light" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBqQivppM13lraCToGBN1BJviQccwfhKDkZ8_iIz03_pTq7iEow7AQJPc1EWRxiVe6Mup_JhAnItDkIizb7gYpfTPm7nhzQijblxoK5og5bz5v-dNJgI4BGHi422MCGOzHd9l9nZNuuPRqjg71PddhQntcShGQqimBJ8PqfiIy7OGkB0qLHW0byA7eEB0hPVfg-wOFOT690CoXOZkJovUAEX_zvS4lPLcJnKRjKJ2pCI8oWrCjptp94A5Rmyvz44ojNnZQgmArfDA"/>
<div className="absolute inset-0 bg-gradient-to-r from-on-background/80 to-transparent flex items-center p-12">
<div className="text-white">
<div className="text-5xl font-extrabold mb-2">0.5s</div>
<div className="text-lg opacity-80 font-headline uppercase tracking-widest">Thời gian xử lý trung bình</div>
</div>
</div>
</div>
</div>
</div>
</section>
{/*  Interactive Demo Slider  */}
<section className="py-32 px-8 lg:px-20 bg-surface">
<div className="max-w-7xl mx-auto">
<div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
<div className="lg:col-span-4 space-y-8">
<h2 className="font-headline font-extrabold text-4xl lg:text-5xl tracking-tighter text-on-background">Trải nghiệm sức mạnh thực tế</h2>
<p className="text-on-surface-variant text-lg leading-relaxed">Kéo thanh trượt để so sánh chất lượng giữa ảnh gốc (Tiếng Anh) và ảnh đã được IIMT Curator phục chế hoàn hảo (Tiếng Việt).</p>
<ul className="space-y-4">
<li className="flex items-center gap-3 font-medium text-on-surface">
<span className="material-symbols-outlined text-primary" data-icon="check_circle" style={{"fontVariationSettings":"'FILL' 1"}}>check_circle</span>
                                Giữ nguyên phông chữ
                            </li>
<li className="flex items-center gap-3 font-medium text-on-surface">
<span className="material-symbols-outlined text-primary" data-icon="check_circle" style={{"fontVariationSettings":"'FILL' 1"}}>check_circle</span>
                                Đồng nhất màu sắc nền
                            </li>
<li className="flex items-center gap-3 font-medium text-on-surface">
<span className="material-symbols-outlined text-primary" data-icon="check_circle" style={{"fontVariationSettings":"'FILL' 1"}}>check_circle</span>
                                Tự động căn chỉnh văn bản
                            </li>
</ul>
</div>
<div className="lg:col-span-8">
<div className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-2xl border-4 border-surface-container">
{/*  After Image (Full Color, Translated)  */}
<img alt="Translated Image" className="absolute inset-0 w-full h-full object-cover" data-alt="a clean professional infographic showing complex data charts with translated Vietnamese typography in a modern sans-serif font" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDRalmJamkaW9uymYX3lbllBtHhabbESwRtMCYRrM7bfvTnRf6pzvdsaG4UAR9zN4I4TnFO4bv-kLE0gX7afcPh5lPA7PouN2nH8CtCVuPEE5FDgvZW5oEJdstmVQDPo4nApxda2FwJhJxeKvZR7Y7HCSD_1UkrSptl9pKfGWRnI1-Kn3j5biaE32TZVeHD8go1PdBpweY79iwaROQNPs1CUHUMLZUDD0F_Mea6218ZL9-bzC4EztkV2aMscyslnBDKmYKf6BGNqg"/>
{/*  Before Image (Grayscale/Overlay, Original)  */}
<div className="absolute inset-0 w-1/2 overflow-hidden border-r-2 border-white/50 z-10 group" id="slider-overlay">
<img alt="Original Image" className="absolute inset-0 w-[200%] h-full object-cover grayscale brightness-75" data-alt="a professional infographic showing complex data charts with original English typography in a corporate font style" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9mweT30c2_Inqo6i8Cm0MFz14SJvnagws3HiD_nX4RCBc9yALSyDWLKkMZrFmP3HNKfYxgkinDkWzCuuYecPpi4fdBUl9dsKzx02jFg9QdGB54QeSgGYOJNKQo6hhewdpTfHcb4dZO7mRVONlOR_CQiDqAn4yB6lVFvds3-1bAykcAeji5YB4Y72WBAamO6Y1cWm_T3jSlrSqlN_8DcQbIGceLyc79V_HP8V5beUI5IKTYtKFLXIvj36KJw6rU2xHlUBxqgOuSg"/>
</div>
{/*  Handle  */}
<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2">
<div className="w-12 h-12 rounded-full glass-panel flex items-center justify-center text-primary border border-white/40 shadow-2xl cursor-pointer hover:scale-110 transition-transform">
<span className="material-symbols-outlined" data-icon="unfold_more" style={{"transform":"rotate(90deg)"}}>unfold_more</span>
</div>
</div>
{/*  Labels  */}
<div className="absolute bottom-6 left-6 z-20 px-4 py-2 glass-panel rounded-lg text-xs font-bold uppercase tracking-widest text-on-surface">Original (EN)</div>
<div className="absolute bottom-6 right-6 z-20 px-4 py-2 bg-primary/80 backdrop-blur-md rounded-lg text-xs font-bold uppercase tracking-widest text-white">IIMT Result (VN)</div>
</div>
</div>
</div>
</div>
</section>
{/*  CTA Section  */}
<section className="py-24 px-8">
<div className="max-w-5xl mx-auto hero-gradient rounded-[2rem] p-12 lg:p-20 text-center relative overflow-hidden">
<div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
<div className="absolute -top-24 -left-24 w-96 h-96 border-4 border-white rounded-full"></div>
<div className="absolute -bottom-24 -right-24 w-64 h-64 border-4 border-white rounded-full"></div>
</div>
<div className="relative z-10 space-y-8">
<h2 className="font-headline font-extrabold text-4xl lg:text-6xl text-white tracking-tighter">Sẵn sàng để nâng tầm hình ảnh của bạn?</h2>
<p className="text-primary-fixed/80 text-xl max-w-2xl mx-auto leading-relaxed">Tham gia cùng hơn 10,000 chuyên gia đang sử dụng IIMT Curator để tự động hóa quy trình dịch thuật hàng ngày.</p>
<div className="flex flex-col sm:flex-row justify-center gap-4">
<Link className="bg-white text-primary px-10 py-5 rounded-xl font-headline font-extrabold text-xl shadow-2xl hover:bg-primary-fixed transition-all active:scale-95" to="/translate">Bắt đầu dịch ngay</Link>
<Link className="bg-primary-container text-white px-10 py-5 rounded-xl font-headline font-extrabold text-xl border border-white/20 hover:bg-primary transition-all" to="#">Liên hệ dùng thử Enterprise</Link>
</div>
</div>
</div>
</section>
</main>
{/*  Footer  */}
<footer className="bg-[#faf8ff] flex flex-col md:flex-row justify-between items-center px-12 py-8 w-full">
<div className="font-['Inter'] text-xs uppercase tracking-widest opacity-60 mb-4 md:mb-0">
            © 2024 IIMT Curator. Precision Restoration.
        </div>
<div className="flex flex-wrap justify-center gap-8">
<Link className="font-['Inter'] text-xs uppercase tracking-widest text-[#00488d] opacity-60 hover:opacity-100 transition-all duration-300" to="#">Privacy Policy</Link>
<Link className="font-['Inter'] text-xs uppercase tracking-widest text-[#00488d] opacity-60 hover:opacity-100 transition-all duration-300" to="#">Terms of Service</Link>
<Link className="font-['Inter'] text-xs uppercase tracking-widest text-[#00488d] opacity-60 hover:opacity-100 transition-all duration-300" to="#">API Documentation</Link>
<Link className="font-['Inter'] text-xs uppercase tracking-widest text-[#00488d] opacity-60 hover:opacity-100 transition-all duration-300" to="#">Support</Link>
</div>
</footer>
    </>
  );
};

export default LandingPage;
