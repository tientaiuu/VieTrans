import React, { useEffect, useState } from 'react';
import { listSamples, type SampleListItem, imageUrl } from '../../api';

export const DashboardPage: React.FC = () => {
  const [samples, setSamples] = useState<SampleListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listSamples(1, 12).then(res => {
      setSamples(res.samples);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="dw fup">
      <div className="page-top">
        <h1 className="page-h">Usage Statistics</h1>
        <p className="docs-p">Performance metrics and processing history for your account.</p>
      </div>

      <div className="d-body">
        <div className="kpi">
          <div className="kpi-c">
            <div className="kpi-l">Total Images</div>
            <div className="kpi-n">1,420</div>
            <div className="kpi-d">↑ 12% vs last month</div>
          </div>
          <div className="kpi-c">
            <div className="kpi-l">Avg. Latency</div>
            <div className="kpi-n">0.86s</div>
            <div className="kpi-d" style={{ color: '#1A8A4A' }}>Optimized</div>
          </div>
          <div className="kpi-c">
            <div className="kpi-l">Characters OCR</div>
            <div className="kpi-n">2.4M</div>
            <div className="kpi-d">Across 40 languages</div>
          </div>
          <div className="kpi-c">
            <div className="kpi-l">API Uptime</div>
            <div className="kpi-n">99.99%</div>
            <div className="kpi-d">SEA-West Region</div>
          </div>
        </div>

        <div className="hs-head">
          <h3 className="hs-ht">Recent Processing History</h3>
          <div className="hs-filter">
            <button className="hf-btn on">All</button>
            <button className="hf-btn">Studio</button>
            <button className="hf-btn">API</button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center opacity-50 font-mono text-xs">Loading history...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {samples.map(s => (
              <div className="h-card" key={s.id}>
                <div className="h-card-img">
                  <div className="flex-1 overflow-hidden">
                    <img src={imageUrl(`/api/images/input/${s.id}`)} className="w-full h-full object-cover" alt="Source" />
                  </div>
                  <div className="h-card-divider">
                    <div className="hcd-dot">⇄</div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <img src={imageUrl(`/api/images/fuse/${s.id}`)} className="w-full h-full object-cover" alt="Result" />
                  </div>
                </div>
                <div className="h-card-body">
                  <div className="hcb-name">{s.tit || `Job #${s.id}`}</div>
                  <div className="hcb-meta">
                    <span>2 min ago</span>
                    <span className="hcb-st ok">Processed</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="hs-head">
          <h3 className="hs-ht">Detailed Job Logs</h3>
        </div>
        <table className="hist">
          <thead>
            <tr>
              <th>Batch ID</th>
              <th>Source</th>
              <th>Language</th>
              <th>Latency</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {[
              { id: 'VT-9821', src: 'Studio', lang: 'English → Vietnamese', lat: '0.84s', status: 'ok' },
              { id: 'VT-9820', src: 'API Call', lang: 'Chinese → Vietnamese', lat: '1.12s', status: 'ok' },
              { id: 'VT-9819', src: 'Studio', lang: 'Japanese → Vietnamese', lat: '0.94s', status: 'ok' },
              { id: 'VT-9818', src: 'API Call', lang: 'Korean → Vietnamese', lat: '0.88s', status: 'er' },
            ].map(row => (
              <tr key={row.id}>
                <td className="font-mono text-[10px]">{row.id}</td>
                <td>{row.src}</td>
                <td>{row.lang}</td>
                <td>{row.lat}</td>
                <td><span className={`st ${row.status}`}>{row.status === 'ok' ? 'Success' : 'Failed'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
