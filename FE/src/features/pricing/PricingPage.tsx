import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Zap, Building2, GraduationCap } from 'lucide-react';

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: '0',
    unit: '/tháng',
    desc: 'Dành cho cá nhân muốn trải nghiệm VieTrans.',
    icon: <GraduationCap size={22} />,
    color: 'var(--ink3)',
    accent: 'var(--bg2)',
    cta: 'Bắt đầu miễn phí',
    ctaStyle: 'outline',
    features: [
      '20 lượt dịch ảnh / tháng',
      'Ảnh tối đa 5MB',
      'Chất lượng chuẩn',
      'Lịch sử 7 ngày',
      'Dashboard cơ bản',
    ],
    disabled: ['Batch processing', 'API access', 'Priority queue'],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '199.000₫',
    unit: '/tháng',
    desc: 'Cho nhà thiết kế, dịch giả và content creator.',
    icon: <Zap size={22} />,
    color: 'var(--blue)',
    accent: 'var(--blueG)',
    cta: 'Dùng thử 14 ngày',
    ctaStyle: 'primary',
    badge: 'Phổ biến nhất',
    features: [
      '500 lượt dịch / tháng',
      'Ảnh tối đa 20MB',
      'Chất lượng cao (4 stages)',
      'Lịch sử vô hạn',
      'Batch up to 20 ảnh',
      'API access cơ bản',
      'Priority queue',
    ],
    disabled: ['Enterprise SLA', 'Custom model fine-tuning'],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: 'Liên hệ',
    unit: '',
    desc: 'Giải pháp tùy chỉnh cho doanh nghiệp và tổ chức lớn.',
    icon: <Building2 size={22} />,
    color: '#f59e0b',
    accent: 'rgba(245,158,11,0.08)',
    cta: 'Liên hệ sales',
    ctaStyle: 'gold',
    features: [
      'Không giới hạn lượt dịch',
      'Custom model fine-tuning',
      'On-premise deployment',
      'Deployment support',
      'Dedicated support',
      'REST upload endpoint access',
      'SSO & team management',
      'Audit logs',
    ],
    disabled: [],
  },
];

export const PricingPage: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <>
      <style>{`
        @keyframes pr-fadeup { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .pr-visible { animation: pr-fadeup 0.55s cubic-bezier(0.22,1,0.36,1) both; }
        .pr-card { transition: transform 0.2s, box-shadow 0.2s; }
        .pr-card:hover { transform: translateY(-4px); }
      `}</style>

      <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingTop: '80px', paddingBottom: '80px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>

          {/* Header */}
          <div
            className={visible ? 'pr-visible' : ''}
            style={{ textAlign: 'center', marginBottom: '60px' }}
          >
            <span style={{
              display: 'inline-block',
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: 'var(--blue)',
              fontFamily: 'var(--mono)', marginBottom: '16px',
            }}>
              04 — Pricing
            </span>
            <h1 style={{
              fontSize: 'clamp(32px, 5vw, 52px)',
              fontWeight: 800, letterSpacing: '-0.04em',
              color: 'var(--ink)', margin: '0 0 16px',
            }}>
              Bắt đầu miễn phí.
              <br />
              <em style={{ fontStyle: 'italic', color: 'var(--blue)' }}>Scale</em> khi cần.
            </h1>
            <p style={{ fontSize: '16px', color: 'var(--ink4)', maxWidth: '480px', margin: '0 auto', lineHeight: 1.7 }}>
              Không cần thẻ tín dụng. Nâng cấp hoặc hủy bất cứ lúc nào.
            </p>
          </div>

          {/* Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px',
            alignItems: 'start',
          }}>
            {PLANS.map((plan, i) => (
              <div
                key={plan.key}
                className={`pr-card${visible ? ' pr-visible' : ''}`}
                style={{
                  borderRadius: '20px',
                  border: plan.key === 'pro'
                    ? `1.5px solid color-mix(in srgb, ${plan.color} 50%, transparent)`
                    : '1px solid var(--ln)',
                  background: plan.key === 'pro' ? plan.accent : 'var(--paper)',
                  padding: '28px',
                  position: 'relative',
                  boxShadow: plan.key === 'pro'
                    ? `0 0 40px color-mix(in srgb, ${plan.color} 12%, transparent), 0 8px 32px rgba(0,0,0,0.08)`
                    : '0 4px 16px rgba(0,0,0,0.06)',
                  animationDelay: `${i * 80}ms`,
                }}
              >
                {/* Badge */}
                {plan.badge && (
                  <div style={{
                    position: 'absolute',
                    top: '-12px', left: '50%', transform: 'translateX(-50%)',
                    background: 'var(--blue)',
                    color: '#fff',
                    fontSize: '10px', fontWeight: 700,
                    letterSpacing: '0.1em',
                    padding: '4px 14px',
                    borderRadius: '99px',
                    whiteSpace: 'nowrap',
                    fontFamily: 'var(--mono)',
                  }}>
                    {plan.badge}
                  </div>
                )}

                {/* Icon */}
                <div style={{
                  width: '48px', height: '48px',
                  borderRadius: '14px',
                  background: plan.accent,
                  border: `1px solid color-mix(in srgb, ${plan.color} 25%, transparent)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: plan.color,
                  marginBottom: '20px',
                }}>
                  {plan.icon}
                </div>

                {/* Plan name */}
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em', marginBottom: '6px' }}>
                  {plan.name}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--ink4)', lineHeight: 1.5, marginBottom: '20px' }}>
                  {plan.desc}
                </div>

                {/* Price */}
                <div style={{ marginBottom: '24px' }}>
                  <span style={{ fontSize: 'clamp(28px, 4vw, 36px)', fontWeight: 800, color: plan.color, letterSpacing: '-0.03em' }}>
                    {plan.price}
                  </span>
                  {plan.unit && (
                    <span style={{ fontSize: '13px', color: 'var(--ink4)', marginLeft: '4px' }}>
                      {plan.unit}
                    </span>
                  )}
                </div>

                {/* CTA */}
                <Link
                  to={plan.key === 'enterprise' ? '#' : '/signup'}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '13px 20px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '14px',
                    textDecoration: 'none',
                    marginBottom: '24px',
                    transition: 'all 0.15s',
                    ...(plan.ctaStyle === 'primary'
                      ? { background: 'linear-gradient(135deg, var(--blue), var(--blue2))', color: '#fff', boxShadow: '0 4px 16px rgba(34,82,228,0.28)' }
                      : plan.ctaStyle === 'gold'
                      ? { background: `rgba(245,158,11,0.12)`, color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }
                      : { background: 'var(--bg2)', color: 'var(--ink)', border: '1px solid var(--ln)' }),
                  }}
                >
                  {plan.cta}
                </Link>

                {/* Divider */}
                <div style={{ height: '1px', background: 'var(--ln)', marginBottom: '20px' }} />

                {/* Features */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {plan.features.map((f) => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Check size={15} style={{ color: plan.color, flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', color: 'var(--ink3)' }}>{f}</span>
                    </div>
                  ))}
                  {plan.disabled.map((f) => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.35 }}>
                      <div style={{ width: '15px', height: '15px', flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', color: 'var(--ink4)', textDecoration: 'line-through' }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* FAQ strip */}
          <div
            className={visible ? 'pr-visible' : ''}
            style={{
              marginTop: '64px',
              textAlign: 'center',
              animationDelay: '300ms',
            }}
          >
            <p style={{ fontSize: '15px', color: 'var(--ink4)' }}>
              Có câu hỏi? Email cho chúng tôi tại{' '}
              <a href="mailto:hello@vietrans.app" style={{ color: 'var(--blue)', textDecoration: 'none', fontWeight: 600 }}>
                hello@vietrans.app
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default PricingPage;
