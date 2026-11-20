// Field rules shared by launch and edit: editing fixes story and identity
// only — the called date is set at launch and never moves.
export const NAME_MAX = 80;
export const TAGLINE_MAX = 200;

export function seedIdentityOk(
  name: string,
  tagline: string,
  logoUrl: string
): boolean {
  return (
    name.length >= 1 &&
    name.length <= NAME_MAX &&
    tagline.length <= TAGLINE_MAX &&
    (logoUrl === "" || /^https?:\/\//.test(logoUrl))
  );
}
