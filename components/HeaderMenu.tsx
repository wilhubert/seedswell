// "use client";

// import { track } from "@vercel/analytics";
// import Link from "next/link";
// import { useState } from "react";

// type HeaderMenuProps = {
//   username: string | null;
// };

// // The hamburger on small screens: the brand is hidden there, so this menu
// // carries the brand links instead. The Login/log out pill stays in the bar.
// export default function HeaderMenu({ username }: HeaderMenuProps) {
//   const [open, setOpen] = useState(false);
//   const close = () => setOpen(false);

//   return (
//     <>
//       <button
//         type="button"
//         className="menu-btn"
//         aria-label="Menu"
//         aria-expanded={open}
//         onClick={() => setOpen(!open)}
//       >
//         <svg width="20" height="17" viewBox="0 0 20 17" fill="none">
//           <path
//             d="M1 1h18M1 8.5h18M1 16h18"
//             stroke="currentColor"
//             strokeWidth="2"
//           />
//         </svg>
//       </button>
//       {open && (
//         <nav className="menu" aria-label="Site">
//           <Link href="/" onClick={close}>
//             seed board
//           </Link>
//           <Link
//             href="/auth/register"
//             onClick={() => {
//               close();
//               track("join_the_swell");
//             }}
//           >
//             join the swell
//           </Link>
//           {username && (
//             <>
//               <Link href={`/u/${username}`} onClick={close}>
//                 @{username}
//               </Link>
//               <Link href="/watching" onClick={close}>
//                 watching
//               </Link>
//               <form action="/auth/logout" method="post">
//                 <button type="submit">log out</button>
//               </form>
//             </>
//           )}
//         </nav>
//       )}
//     </>
//   );
// }
