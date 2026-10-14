import type { TokenKind } from "./TokenKind.ts";

export interface Token {
  kind: TokenKind;
	token: string;
	line: number;
	column: number;
}