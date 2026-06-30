import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Boxes, Cpu, Globe2, Github, Layers3, ExternalLink } from 'lucide-react';

export const TEAM = [
  { name: 'VieTrans Research', role: 'Core AI & Model Architecture', avatar: '🧠' },
  { name: 'Frontend Studio', role: 'UI/UX & Product Design', avatar: '🎨' },
  { name: 'Infrastructure', role: 'Backend & Deployment', avatar: '⚡' },
];

const TECH = [
  { icon: <Bot size={18} />, name: 'PyTorch', desc: 'Neural network inference' },
  { icon: <Cpu size={18} />, name: 'FastAPI', desc: 'High-performance REST API' },
  { icon: <Globe2 size={18} />, name: 'React + Vite', desc: 'Modern frontend framework' },
  { icon: <Boxes size={18} />, name: 'MongoDB', desc: 'User data & history' },
  { icon: <Layers3 size={18} />, name: 'SentencePiece', desc: 'Tokenization pipeline' },
  { icon: <Bot size={18} />, name: 'Hugging Face', desc: 'Model hosting & serving' },
];

export const AboutPage: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <>
      <style>{`
        @keyframes ab-fadeup { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .ab-visible { animation: ab-fadeup 0.55s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingTop: '80px', paddingBottom: '80px' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 24px' }}>

          {/* Hero */}
          <div className={visible ? 'ab-visible' : ''} style={{ marginBottom: '64px' }}>
            <span style={{
              display: 'inline-block',
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: 'var(--blue)',
              fontFamily: 'var(--mono)', marginBottom: '16px',
            }}>
              Về chúng tôi
            </span>
            <h1 style={{
              fontSize: 'clamp(32px, 5vw, 54px)',
              fontWeight: 800, letterSpacing: '-0.04em',
              color: 'var(--ink)', margin: '0 0 20px',
              lineHeight: 1.1,
            }}>
              Dịch không chỉ là<br />
              <em style={{ fontStyle: 'italic', color: 'var(--blue)' }}>chuyển nghĩa</em> —
              <br />mà là chuyển cả hình ảnh.
            </h1>
            <p style={{ fontSize: '17px', color: 'var(--ink4)', lineHeight: 1.75, maxWidth: '600px' }}>
              VieTrans ra đời từ bài toán thực tế: dịch văn bản trực tiếp trong ảnh mà vẫn giữ
              nguyên background gốc. Không crop, không photoshop thủ công.
            </p>
          </div>

          {/* Mission */}
          <div
            className={visible ? 'ab-visible' : ''}
            style={{
              borderRadius: '20px',
              border: '1px solid var(--ln)',
              background: 'var(--paper)',
              padding: '32px',
              marginBottom: '40px',
              animationDelay: '80ms',
            }}
          >
            <span style={{
              fontSize: '10px', fontWeight: 700, letterSpacing: '0.16em',
              textTransform: 'uppercase', color: 'var(--ink4)',
              fontFamily: 'var(--mono)',
            }}>
              Sứ mệnh
            </span>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--ink)', margin: '12px 0 16px', letterSpacing: '-0.02em' }}>
              AI thay thế công việc thủ công
            </h2>
            <p style={{ color: 'var(--ink4)', lineHeight: 1.75, margin: '0 0 12px', fontSize: '15px' }}>
              Mỗi ngày có hàng triệu ảnh cần được bản địa hóa — poster, biển hiệu, sách giáo khoa,
              giao diện sản phẩm. Quy trình truyền thống tốn hàng giờ với Photoshop và người dịch.
            </p>
            <p style={{ color: 'var(--ink4)', lineHeight: 1.75, margin: 0, fontSize: '15px' }}>
              VieTrans sử dụng pipeline 4 bước — Separation → Layout blocks Quantization →
              Neural Translation → Fusion — để tự động hóa toàn bộ quy trình trong vài giây.
            </p>
          </div>

          {/* Pipeline summary */}
          <div
            className={visible ? 'ab-visible' : ''}
            style={{
              borderRadius: '20px',
              border: '1px solid var(--ln)',
              background: 'var(--paper)',
              padding: '32px',
              marginBottom: '40px',
              animationDelay: '160ms',
            }}
          >
            <span style={{
              fontSize: '10px', fontWeight: 700, letterSpacing: '0.16em',
              textTransform: 'uppercase', color: 'var(--ink4)',
              fontFamily: 'var(--mono)',
            }}>
              Công nghệ AI
            </span>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--ink)', margin: '12px 0 24px', letterSpacing: '-0.02em' }}>
              Pipeline 4 bước
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { step: '01', icon: <Layers3 size={16} />, title: 'Text-Background Separation', desc: 'Tách văn bản ra khỏi background gốc bằng OCR/Layout analyzer model.' },
                { step: '02', icon: <Boxes size={16} />, title: 'Visual Layout blocks Quantization', desc: 'Mã hóa đặc trưng ảnh văn bản thành discrete codes để bridge visual-textual gap.' },
                { step: '03', icon: <Cpu size={16} />, title: 'Neural Code Translation', desc: 'NLLB translator dịch source codes → target codes (EN→VI) mà không cần OCR.' },
                { step: '04', icon: <Bot size={16} />, title: 'Text-Background Fusion', desc: 'Render planner compositing lớp văn bản VI đã dịch lên nền gốc.' },
              ].map((item, _i) => (
                <div
                  key={item.step}
                  style={{
                    display: 'flex',
                    gap: '16px',
                    alignItems: 'flex-start',
                    padding: '16px',
                    borderRadius: '12px',
                    background: 'var(--bg)',
                    border: '1px solid var(--ln)',
                  }}
                >
                  <div style={{
                    width: '36px', height: '36px',
                    borderRadius: '10px',
                    background: 'var(--blueG)',
                    border: '1px solid color-mix(in srgb, var(--blue) 25%, transparent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--blue)', flexShrink: 0,
                  }}>
                    {item.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--ink4)', marginBottom: '3px' }}>
                      STEP {item.step}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)', marginBottom: '4px' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--ink4)', lineHeight: 1.5 }}>
                      {item.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tech stack */}
          <div
            className={visible ? 'ab-visible' : ''}
            style={{
              borderRadius: '20px',
              border: '1px solid var(--ln)',
              background: 'var(--paper)',
              padding: '32px',
              marginBottom: '40px',
              animationDelay: '240ms',
            }}
          >
            <span style={{
              fontSize: '10px', fontWeight: 700, letterSpacing: '0.16em',
              textTransform: 'uppercase', color: 'var(--ink4)',
              fontFamily: 'var(--mono)',
            }}>
              Stack
            </span>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--ink)', margin: '12px 0 24px', letterSpacing: '-0.02em' }}>
              Công nghệ sử dụng
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              {TECH.map((t) => (
                <div key={t.name} style={{
                  display: 'flex', gap: '12px', alignItems: 'center',
                  padding: '14px',
                  borderRadius: '12px',
                  background: 'var(--bg)',
                  border: '1px solid var(--ln)',
                }}>
                  <span style={{ color: 'var(--blue)' }}>{t.icon}</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>{t.name}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--ink4)' }}>{t.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Links */}
          <div
            className={visible ? 'ab-visible' : ''}
            style={{
              display: 'flex', gap: '12px', flexWrap: 'wrap',
              animationDelay: '320ms',
            }}
          >
            <Link
              to="/studio"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '12px 24px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--blue), var(--blue2))',
                color: '#fff', fontWeight: 700, fontSize: '14px',
                textDecoration: 'none',
                boxShadow: '0 4px 16px rgba(34,82,228,0.28)',
              }}
            >
              Thử ngay Studio →
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '12px 24px',
                borderRadius: '12px',
                border: '1px solid var(--ln)',
                background: 'var(--paper)',
                color: 'var(--ink3)', fontWeight: 600, fontSize: '14px',
                textDecoration: 'none',
              }}
            >
              <Github size={16} /> GitHub <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default AboutPage;
