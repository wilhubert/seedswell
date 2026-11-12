import Link from "next/link";

export default function Header() {
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <span className="brand__mark" aria-hidden="true" />
        Seedswell
      </Link>
      <button type="button" className="btn">
        login
      </button>
    </header>
  );
}
