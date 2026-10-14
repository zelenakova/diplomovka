export const TokenKind = {
	NOTHING: "NOTHING",
	NUMBER: "NUMBER",
	WORD: "WORD",
	STRING: "STRING",
	SYMBOL: "SYMBOL",
	NEWLINE: "NEWLINE",
	INDENT: "INDENT",
	DEDENT: "DEDENT",
} as const;

export type TokenKind =
	(typeof TokenKind)[keyof typeof TokenKind];