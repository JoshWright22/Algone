import type { PagePayload } from "@algone/engine";

/** Everything the page script is given. It holds no queue, sources, or password. */
export interface PageBoot {
  /** Hosts this script filters. Anywhere else it does nothing. */
  hosts: string[];
  /** Compiled CSS: the base rules plus compileSiteCss. */
  css: string;
  payload: PagePayload;
}
