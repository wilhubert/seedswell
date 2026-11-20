import JoinSwellButton from "@/components/JoinSwellButton";
import SeedRow from "@/components/SeedRow";
import WatchButton from "@/components/WatchButton";
import { counterLabel, counterStack } from "@/lib/board";
import { getBoardSeeds, getWatchedProjectIds } from "@/lib/seeds";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import "./landing.css";

export const dynamic = "force-dynamic";

export default async function Home() {
  const seeds = await getBoardSeeds();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const watched = user
    ? await getWatchedProjectIds(user.id)
    : new Set<string>();

  return (
    <main>
      <section className="hero">
        <div className="test">
          <h1>Fresh swell! New ideas seeded today.</h1>
          <p className="hero__sub">
            <span className="hero__sub-line">
              Launch in front of users from day one.
            </span>{" "}
            <span className="hero__sub-line">
              Be there when the next big thing pops up!
            </span>{" "}
            <span className="hero__surf" aria-hidden="true">
              🏄
            </span>
          </p>
          {/* <div > */}
          <svg
            className="decorative-beach-items"
            width="60"
            height="54"
            viewBox="0 0 60 54"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M26.1928 25.9239L6.37794 25.6908L8.9161 16.2183L26.1928 25.9239Z"
              fill="#D44949"
              stroke-width="0.5"
              stroke="#A70000"
            />
            <path
              d="M25.9266 26.22L8.95394 15.992L15.9366 9.10617L25.9266 26.22Z"
              fill="#D44949"
              stroke-width="0.5"
              stroke="#A70000"
            />
            <path
              d="M25.7154 26.2229L16.0702 8.91245L25.5515 6.40737L25.7154 26.2229Z"
              fill="#D44949"
              stroke-width="0.5"
              stroke="#A70000"
            />
            <path
              d="M24.9635 25.898L44.7783 25.6649L42.2401 16.1924L24.9635 25.898Z"
              fill="#D44949"
              stroke-width="0.5"
              stroke="#A70000"
            />
            <path
              d="M25.2306 26.194L42.2033 15.966L35.2207 9.08023L25.2306 26.194Z"
              fill="#D44949"
              stroke-width="0.5"
              stroke="#A70000"
            />
            <path
              d="M25.4418 26.197L35.0871 8.88657L25.6057 6.38149L25.4418 26.197Z"
              fill="#D44949"
              stroke-width="0.5"
              stroke="#A70000"
            />
            <path
              d="M26.1928 25.693L6.37794 25.9261L8.9161 35.3986L26.1928 25.693Z"
              fill="#D44949"
              stroke-width="0.5"
              stroke="#A70000"
            />
            <path
              d="M25.9266 25.3969L8.95394 35.6249L15.9366 42.5107L25.9266 25.3969Z"
              fill="#D44949"
              stroke-width="0.5"
              stroke="#A70000"
            />
            <path
              d="M25.7154 25.394L16.0702 42.7044L25.5515 45.2095L25.7154 25.394Z"
              fill="#D44949"
              stroke-width="0.5"
              stroke="#A70000"
            />
            <path
              d="M24.9635 25.7189L44.7783 25.9519L42.2401 35.4245L24.9635 25.7189Z"
              fill="#D44949"
              stroke-width="0.5"
              stroke="#A70000"
            />
            <path
              d="M25.2306 25.4229L42.2033 35.6509L35.2207 42.5367L25.2306 25.4229Z"
              fill="#D44949"
              stroke-width="0.5"
              stroke="#A70000"
            />
            <path
              d="M25.4418 25.4199L35.0871 42.7304L25.6057 45.2355L25.4418 25.4199Z"
              fill="#D44949"
              stroke-width="0.5"
              stroke="#A70000"
            />
            <ellipse
              cx="50.4407"
              cy="37.1197"
              rx="3.84"
              ry="16.5728"
              transform="rotate(21 50.4407 37.1197)"
              fill="#C9BC00"
            />
            <line
              x1="45.6463"
              y1="49.5421"
              x2="47.2518"
              y2="45.3597"
              stroke-width="0.448"
              stroke="black"
            />
            <line
              x1="44.4842"
              y1="52.6035"
              x2="56.3694"
              y2="21.6415"
              stroke-width="0.128"
              stroke="black"
            />
          </svg>
          {/* </div> */}
          {/* Soft launch: registering an account to watch is open to
            everyone; launching stays invite-only at /seeds/new. */}
          <JoinSwellButton />
          {/* <p className="promo">The first 100 seeds are on me!</p> */}
        </div>
      </section>
      <section className="board">
        {seeds.length === 0 ? (
          <p className="board__empty">
            Nothing launched yet — be the first seed on the board.
          </p>
        ) : (
          seeds.map((seed) => (
            <SeedRow
              key={seed.id}
              id={seed.id}
              name={seed.name}
              owner={seed.owner}
              counter={counterLabel(seed)}
              counterStack={counterStack(seed)}
              tagline={seed.tagline}
              shipped={!!seed.shippedAt}
              shipUrl={seed.shipUrl}
              pushes={seed.pushCount}
              logoUrl={seed.logoUrl}
              avatarUrl={seed.avatarUrl}
              watch={
                <WatchButton
                  seedId={seed.id}
                  watching={!!user && watched.has(seed.id)}
                  returnTo="/"
                  count={seed.watchCount}
                  disabled={!!user && seed.userId === user.id}
                  loggedIn={!!user}
                />
              }
            />
          ))
        )}
      </section>
    </main>
  );
}
