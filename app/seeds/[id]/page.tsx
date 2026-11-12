import SeedRow from "@/components/SeedRow";
import "./seed.css";

export default async function SeedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main>
      <div className="project-top">
        <SeedRow
          id={id}
          name="Seedling One"
          owner="wil"
          counter="day 12/30 · 18 to go"
          pushes={47}
        />
      </div>
      <div className="project-body">
        <div className="project-tabs">
          <span className="tab">SEED INFO</span>
        </div>
        <section className="project-panel">
          <h2>Story</h2>
          <p className="project-story">
            Placeholder story until projects are wired to Supabase.
          </p>
          <h2>Build log</h2>
          <ol className="build-log">
            <li className="build-item">
              <p className="build-item__msg">Initial commit</p>
              <p className="build-item__meta">wil · pushed on Nov 12</p>
            </li>
            <li className="build-item">
              <p className="build-item__msg">Add profiles + projects schema</p>
              <p className="build-item__meta">wil · pushed on Nov 12</p>
            </li>
          </ol>
        </section>
      </div>
    </main>
  );
}
