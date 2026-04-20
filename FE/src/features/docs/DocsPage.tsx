import React from 'react';

export const DocsPage: React.FC = () => {
  return (
    <div className="docs-w fup">
      <aside className="docs-sb">
        <h6>Introduction</h6>
        <a href="#welcome" className="act">Welcome</a>
        <a href="#getting-started">Getting Started</a>
        <a href="#authentication">Authentication</a>

        <h6>Core Endpoints</h6>
        <a href="#upload">/api/upload</a>
        <a href="#samples">/api/samples</a>
        <a href="#health">/api/health</a>

        <h6>SDKs</h6>
        <a href="#python">Python Library</a>
        <a href="#node">Node.js Client</a>
      </aside>

      <div className="docs-ct">
        <h1 className="docs-ttl" id="welcome">API Documentation</h1>
        <p className="docs-p">
          Welcome to the VieTrans API reference. Our REST API is designed to handle high-concurrency image processing with minimal latency. 
          Use our endpoints to integrate in-image translation directly into your workflow.
        </p>

        <h3 className="docs-h3" id="authentication">Authentication</h3>
        <p className="docs-p">Authenticate your requests by including your secret key in the `X-API-Key` header.</p>
        <div className="code">
          <span className="cc"># Example request with curl</span><br />
          curl -H <span className="cs">"X-API-Key: YOUR_KEY"</span> \<br />
          &nbsp;&nbsp;https://api.vietrans.com/api/v1/upload
        </div>

        <h3 className="docs-h3" id="upload">Process Image — <span className="ep-m p">POST</span></h3>
        <p className="docs-p">The primary endpoint to submit an image for full pipeline translation.</p>
        
        <div className="ep">
          <span className="ep-m p">POST</span>
          <div>
            <div className="ep-path">/api/upload</div>
            <div className="ep-desc">Multipart Form Data · Required: `file`</div>
          </div>
        </div>

        <div className="code">
          <span className="ck">import</span> requests<br /><br />
          url = <span className="cs">"http://localhost:8000/api/upload"</span><br />
          files = {'{'}<span className="cs">'file'</span>: open(<span className="cs">'ad.png'</span>, <span className="cs">'rb'</span>){'}'}<br /><br />
          response = requests.post(url, files=files)<br />
          print(response.json())
        </div>

        <h3 className="docs-h3">Response Schema</h3>
        <div className="code">
          {'{'}<br />
          &nbsp;&nbsp;<span className="jk">"matched_id"</span>: <span className="cn">1204</span>,<br />
          &nbsp;&nbsp;<span className="jk">"match_quality"</span>: <span className="cs">"good"</span>,<br />
          &nbsp;&nbsp;<span className="jk">"stages"</span>: {'{'}<br />
          &nbsp;&nbsp;&nbsp;&nbsp;<span className="jk">"input"</span>: <span className="cs">"/api/images/input/1204"</span>,<br />
          &nbsp;&nbsp;&nbsp;&nbsp;<span className="jk">"fuse"</span>: <span className="cs">"/api/images/fuse/1204"</span><br />
          &nbsp;&nbsp;{'}'},<br />
          &nbsp;&nbsp;<span className="jk">"ocr"</span>: <span className="cs">"Example text detection..."</span><br />
          {'}'}
        </div>
      </div>
    </div>
  );
};
