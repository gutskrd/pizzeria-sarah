/** The printed trifold menu as the website shows it (safe to pass to client components). */
export type PublicFolder = {
  label: string;
  panelWidth: number;
  panelHeight: number;
  /** Three panels per side, left to right as printed. */
  panels: { binnen: [string, string, string]; buiten: [string, string, string] };
  /** Small images of the folded flyer (front cover and the flap under it). */
  cover: { front: string; under: string; width: number; height: number };
  /** The full sheets, for "Vergroten". */
  sheets: { binnen: string; buiten: string };
  /** Changes whenever the folder is replaced, so the website never shows a mix. */
  version: string;
};
