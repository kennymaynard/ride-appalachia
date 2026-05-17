import { AdminDashboard } from "../../components/AdminDashboard";

export default function AdminPage() {
  return (
    <main className="page">
      <section className="page-hero compact">
        <p className="eyebrow">Admin panel</p>
        <h1>Approve listings and manage featured partners.</h1>
        <p>
          MVP admin tools for pending businesses, featured placement, and basic
          marketplace oversight.
        </p>
      </section>

      <AdminDashboard />
    </main>
  );
}
