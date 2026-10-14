import type { Token } from "./Token.ts";
import { TokenKind } from "./TokenKind.ts";

export class Lexer {
	private input: string;
	private index: number;
	private look: string;

	private line: number;
	private column: number;

    private atLineStart: boolean;
    private indentationLevel: number;
    private pendingTokens: Token[];

	constructor(input: string) {
        let normalizedInput = input
            .replace(/\r\n?/g, "\n")
            .replace(/\t/g, "    ");

        if (normalizedInput.length > 0 && !normalizedInput.endsWith("\n")) {
            normalizedInput += "\n";
        }

        this.input = normalizedInput;

		this.index = 0;
		this.look = "";

		this.line = 1;
		this.column = 1;

        this.atLineStart = true;
        this.indentationLevel = 0;
        this.pendingTokens = [];

		this.next();
	}

	private next(): void {
		if (this.look === "\n") {
			this.line++;
			this.column = 1;
		} else if (this.look !== "") {
			this.column++;
		}

		if (this.index < this.input.length) {
			this.look = this.input[this.index];
			this.index++;
		} else {
			this.look = "\0";
		}
	}

    public tokenize(): Token[] {
        const tokens: Token[] = [];
        let token: Token;

        do {
            token = this.scan();
            tokens.push(token);
        } while (token.kind !== TokenKind.NOTHING);

        return tokens;
    }

	public scan(): Token {
        //poslanie pendujucich dedentov
        if (this.pendingTokens.length > 0) {
            return this.pendingTokens.shift()!;
        }

        //naskenovanie indent/dedent
        if (this.atLineStart) {
            this.scanIndentation();

            if (this.pendingTokens.length > 0) {
                return this.pendingTokens.shift()!;
            }
        }

        //odstranenie medzier
        while (this.look === " ") {
            this.next();
        }

        //preskocenie komentara
        if (this.look === "#") {
            this.skipComment();
            return this.scan();
        }

        const startLine = this.line;
        const startColumn = this.column;

        //zrusenie odsadenia na konci vstupu
        if (this.look === "\0" && this.indentationLevel > 0) {
            for (let i = 0; i < this.indentationLevel; i++) {
                this.pendingTokens.push({
                    kind: TokenKind.DEDENT,
                    token: "",
                    line: startLine,
                    column: startColumn,
                });
            }

            this.indentationLevel = 0;

            // const pendingToken = this.pendingTokens.shift();

            // if (pendingToken !== undefined) {
            //     return pendingToken;
            // }
            return this.pendingTokens.shift()!
        }

        //koniec vstupu
		if (this.look === "\0") {
			return {
				kind: TokenKind.NOTHING,
				token: "",
				line: startLine,
				column: startColumn,
			};
		}

        //koniec riadku
        if (this.look === "\n") {
            this.next();
            this.atLineStart = true;

            return {
                kind: TokenKind.NEWLINE,
                token: "\n",
                line: startLine,
                column: startColumn,
            };
        }

        //cislo, aj desatinne
        if (this.isDigit(this.look)) {
            let token = "";

            while (this.isDigit(this.look)) {
                token += this.look;
                this.next();
            }

            if (this.look === ".") {
                token += this.look;
                this.next();

                if (!this.isDigit(this.look)) {
                    throw new Error(
                        `Za desatinnou bodkou musí nasledovať číslica ` +
                            `na riadku ${this.line}, v stĺpci ${this.column}.`
                    );
                }

                while (this.isDigit(this.look)) {
                    token += this.look;
                    this.next();
                }
            }

            return {
                kind: TokenKind.NUMBER,
                token,
                line: startLine,
                column: startColumn,
            };
        }

        //slovo
		if (this.isWordStart(this.look)) {
			let token = "";

			while (this.isWordPart(this.look)) {
				token += this.look;
				this.next();
			}

			return {
				kind: TokenKind.WORD,
				token,
				line: startLine,
				column: startColumn,
			};
		}

        //retazec
        if (this.look === '"') {
            let token = this.look;
            this.next();

            while (this.look !== '"' && this.look !== "\n" && this.look !== "\0") {
                token += this.look;
                this.next();
            }

            if (this.look !== '"') {
                throw new Error(
                    `Neukončený reťazec na riadku ${startLine}, ` +
                        `v stĺpci ${startColumn}.`
                );
            }

            token += this.look;
            this.next();

            return {
                kind: TokenKind.STRING,
                token,
                line: startLine,
                column: startColumn,
            };
        }

        //symbol
        if (this.isSymbolStart(this.look)) {
            let token = this.look;
            this.next();

            if (
                (token === "=" ||
                    token === "!" ||
                    token === "<" ||
                    token === ">") &&
                this.look === "="
            ) {
                token += this.look;
                this.next();
            }

            if (token === "!") {
                throw new Error(
                    `Neplatný symbol "!" na riadku ${startLine}, ` +
                        `v stĺpci ${startColumn}. Očakávalo sa "!=".`
                );
            }

            return {
                kind: TokenKind.SYMBOL,
                token,
                line: startLine,
                column: startColumn,
            };
        }

		throw new Error(
			`Neznámy znak "${this.look}" na riadku ${this.line}, ` +
				`v stĺpci ${this.column}.`
		);
	}

	private isDigit(character: string): boolean {
		return character >= "0" && character <= "9";
	}

	private isLetter(character: string): boolean {
		return (
			(character >= "a" && character <= "z") ||
			(character >= "A" && character <= "Z")
		);
	}

	private isWordStart(character: string): boolean {
		return this.isLetter(character) || character === "_";
	}

    private isWordPart(character: string): boolean {
		return (
			this.isLetter(character) ||
			this.isDigit(character) ||
			character === "_"
		);
	}

    private isSymbolStart(character: string): boolean {
        return ":(),.=!<>+-*/%".includes(character);
    }

    private scanIndentation(): void {
        while (true) {
            const startLine = this.line;
            let numberOfSpaces = 0;

            while (this.look === " ") {
                numberOfSpaces++;
                this.next();
            }

            if (this.look === "#") {
                const characterAfterComment = this.skipComment();

	            if (characterAfterComment === "\n") {
                    this.next();
                    continue;
                }

                return;
            }

            if (this.look === "\n") {
                this.next();
                continue;
            }

            if (this.look === "\0") {
                return;
            }

            if (numberOfSpaces % 4 !== 0) {
                throw new Error(
                    `Nesprávne odsadenie na riadku ${startLine}. ` +
                        `Počet medzier musí byť násobkom 4.`
                );
            }

            const newIndentationLevel = numberOfSpaces / 4;

            if (newIndentationLevel > this.indentationLevel + 1) {
                throw new Error(
                    `Nesprávne odsadenie na riadku ${startLine}. ` +
                        `Odsadenie sa môže zvýšiť iba o jednu úroveň.`
                );
            }

            if (newIndentationLevel > this.indentationLevel) {
                this.indentationLevel = newIndentationLevel;

                this.pendingTokens.push({
                    kind: TokenKind.INDENT,
                    token: "    ",
                    line: startLine,
                    column: 1,
                });
            }

            if (newIndentationLevel < this.indentationLevel) {
                const numberOfDedents =
                    this.indentationLevel - newIndentationLevel;

                for (let i = 0; i < numberOfDedents; i++) {
                    this.pendingTokens.push({
                        kind: TokenKind.DEDENT,
                        token: "",
                        line: startLine,
                        column: 1,
                    });
                }

                this.indentationLevel = newIndentationLevel;
            }

            this.atLineStart = false;
            return;
        }
    }

    private skipComment(): string {
        while (this.look !== "\n" && this.look !== "\0") {
            this.next();
        }
        return this.look
    }
}