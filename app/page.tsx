import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <div className="container">
          <div className="hero-premium">
            <div className="hero-glow" />

            <span className="badge">
              {"AI\u5de5\u5177 \u00b7 \u6570\u5b57\u5546\u54c1 \u00b7 \u667a\u80fd\u4f53\u90e8\u7f72"}
            </span>

            <h1>PromptBay</h1>

            <p className="hero-subtitle">
              {"\u4e00\u4e2a\u9762\u5411 AI \u65f6\u4ee3\u7684\u6570\u5b57\u5546\u54c1\u5e02\u573a\uff0c\u6c47\u96c6\u5de5\u5177\u6743\u76ca\u3001Prompt \u8d44\u4ea7\u3001\u667a\u80fd\u4f53\u65b9\u6848\u4e0e\u4ea4\u4ed8\u670d\u52a1\u3002"}
            </p>

            <div className="hero-actions">
              <Link className="btn primary" href="/products">
                {"\u8fdb\u5165\u5e02\u573a"}
              </Link>

              <Link className="btn" href="/dashboard">
                {"\u67e5\u770b\u8ba2\u5355"}
              </Link>
            </div>

            <div className="hero-metrics">
              <div>
                <strong>AI Market</strong>
                <span>{"\u6570\u5b57\u6743\u76ca\u4ea4\u4ed8"}</span>
              </div>

              <div>
                <strong>Agent Ready</strong>
                <span>{"\u667a\u80fd\u4f53\u90e8\u7f72\u65b9\u6848"}</span>
              </div>

              <div>
                <strong>Code / URL</strong>
                <span>{"\u5361\u5bc6\u94fe\u63a5\u4e00\u952e\u590d\u5236"}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}