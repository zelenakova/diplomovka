import { Lexer } from "./Lexer.ts";
import type { Token } from "./Token.ts";
import { TokenKind } from "./TokenKind.ts";
import type {
	Assignment,
	Expression,
	Program,
	Statement,
    FunctionCall,
    FilterExpression,
    TopLevelStatement,
    FunctionDeclaration,
    ReturnStatement,
    BreakStatement,
    ContinueStatement,
    PassStatement,
    ElseIfBranch,
    IfStatement,
    WhileStatement,
    ForStatement,
    AskStatement,
    EntityDeclaration,
    EntityType,
} from "./Ast.ts";

export class Parser {
	private lexer: Lexer;
	private currentToken: Token;

	constructor(input: string) {
		this.lexer = new Lexer(input);
		this.currentToken = this.lexer.scan();
	}

    public parse(): Program {
        return this.parseProgram();
    }

    private parseProgram(): Program {
        const statements: TopLevelStatement[] = [];

        while (this.currentToken.kind !== TokenKind.NOTHING) {
            statements.push(this.parseTopLevelStatement());
        }

        return {
            type: "Program",
            statements,
        };
    }

    private parseTopLevelStatement(): TopLevelStatement {
        this.check(TokenKind.WORD);

        if (
            this.currentToken.token === "agent" ||
            this.currentToken.token === "patch" ||
            this.currentToken.token === "link"
        ) {
            return this.parseEntityDeclaration();
        }

        if (this.currentToken.token === "def") {
            return this.parseFunctionDeclaration();
        }

        return this.parseAssignment();
    }

    private parseEntityDeclaration(): EntityDeclaration {
        this.check(TokenKind.WORD);

        let entityType: EntityType;

        if (
            this.currentToken.token === "agent" ||
            this.currentToken.token === "patch" ||
            this.currentToken.token === "link"
        ) {
            entityType = this.currentToken.token;
        } else {
            throw new Error(
                `Očakával sa typ entity "agent", "patch" alebo "link" ` +
                    `na riadku ${this.currentToken.line}, ` +
                    `v stĺpci ${this.currentToken.column}.`
            );
        }

        this.currentToken = this.lexer.scan();

        this.check(TokenKind.WORD);
        const name = this.currentToken.token;
        this.currentToken = this.lexer.scan();

        this.check(TokenKind.SYMBOL, ":");
        this.currentToken = this.lexer.scan();

        this.check(TokenKind.NEWLINE);
        this.currentToken = this.lexer.scan();

        this.check(TokenKind.INDENT);
        this.currentToken = this.lexer.scan();

        this.check(TokenKind.WORD, "def");

        const functions: FunctionDeclaration[] = [];
        functions.push(this.parseFunctionDeclaration());

        while (
            this.currentToken.kind === TokenKind.WORD &&
            this.currentToken.token === "def"
        ) {
            functions.push(this.parseFunctionDeclaration());
        }

        this.check(TokenKind.DEDENT);
        this.currentToken = this.lexer.scan();

        return {
            type: "EntityDeclaration",
            entityType,
            name,
            functions,
        };
    }

    private parseFunctionDeclaration(): FunctionDeclaration {
        this.check(TokenKind.WORD, "def");
        this.currentToken = this.lexer.scan();

        this.check(TokenKind.WORD);
        const name = this.currentToken.token;
        this.currentToken = this.lexer.scan();

        this.check(TokenKind.SYMBOL, "(");
        this.currentToken = this.lexer.scan();

        const parameters: string[] = [];

        if (
            this.currentToken.kind === TokenKind.WORD
        ) {
            this.check(TokenKind.WORD);
            parameters.push(this.currentToken.token);
            this.currentToken = this.lexer.scan();

            while (
                this.currentToken.kind === TokenKind.SYMBOL &&
                this.currentToken.token === ","
            ) {
                this.currentToken = this.lexer.scan();

                this.check(TokenKind.WORD);
                parameters.push(this.currentToken.token);
                this.currentToken = this.lexer.scan();
            }
        }

        this.check(TokenKind.SYMBOL, ")");
        this.currentToken = this.lexer.scan();

        this.check(TokenKind.SYMBOL, ":");
        this.currentToken = this.lexer.scan();

        const body = this.parseBlock();

        return {
            type: "FunctionDeclaration",
            name,
            parameters,
            body,
        };
    }

    private parseBlock(): Statement[] {
        this.check(TokenKind.NEWLINE);
        this.currentToken = this.lexer.scan();

        this.check(TokenKind.INDENT);
        this.currentToken = this.lexer.scan();

        const statements: Statement[] = [];

        while (this.currentToken.kind !== TokenKind.DEDENT) {
            statements.push(this.parseStatement());
        }

        this.check(TokenKind.DEDENT);
        this.currentToken = this.lexer.scan();

        return statements;
    }

    private parseStatement(): Statement {
        if (
            this.currentToken.kind === TokenKind.WORD &&
            this.currentToken.token === "return"
        ) {
            return this.parseReturnStatement();
        }

        if (
            this.currentToken.kind === TokenKind.WORD &&
            this.currentToken.token === "pass"
        ) {
            return this.parsePassStatement();
        }

        if (
            this.currentToken.kind === TokenKind.WORD &&
            this.currentToken.token === "break"
        ) {
            return this.parseBreakStatement();
        }

        if (
            this.currentToken.kind === TokenKind.WORD &&
            this.currentToken.token === "continue"
        ) {
            return this.parseContinueStatement();
        }

        if (
            this.currentToken.kind === TokenKind.WORD &&
            this.currentToken.token === "if"
        ) {
            return this.parseIfStatement();
        }

        if (
            this.currentToken.kind === TokenKind.WORD &&
            this.currentToken.token === "while"
        ) {
            return this.parseWhileStatement();
        }

        if (
            this.currentToken.kind === TokenKind.WORD &&
            this.currentToken.token === "for"
        ) {
            return this.parseForStatement();
        }

        if (
            this.currentToken.kind === TokenKind.WORD &&
            this.currentToken.token === "ask"
        ) {
            return this.parseAskStatement();
        }

        this.check(TokenKind.WORD);

        const name = this.currentToken.token;
        const startLine = this.currentToken.line;
        const startColumn = this.currentToken.column;

        this.currentToken = this.lexer.scan();

        if (
            this.currentToken.kind === TokenKind.SYMBOL &&
            this.currentToken.token === "="
        ) {
            this.currentToken = this.lexer.scan();

            const value = this.parseExpression();

            this.check(TokenKind.NEWLINE);
            this.currentToken = this.lexer.scan();

            return {
                type: "Assignment",
                name,
                value,
            };
        }

        if (
            this.currentToken.kind === TokenKind.SYMBOL &&
            this.currentToken.token === "("
        ) {
            const functionCall = this.parseFunctionCall(name);

            this.check(TokenKind.NEWLINE);
            this.currentToken = this.lexer.scan();

            return functionCall;
        }

        throw new Error(
            `Za slovom "${name}" sa očakávalo "=" alebo "(" ` +
                `na riadku ${startLine}, v stĺpci ${startColumn}.`
        );
    }

    private parseReturnStatement(): ReturnStatement {
        this.check(TokenKind.WORD, "return");
        this.currentToken = this.lexer.scan();

        if (this.currentToken.kind === TokenKind.NEWLINE) {
            this.currentToken = this.lexer.scan();

            return {
                type: "ReturnStatement",
                value: null,
            };
        }

        const value = this.parseExpression();

        this.check(TokenKind.NEWLINE);
        this.currentToken = this.lexer.scan();

        return {
            type: "ReturnStatement",
            value,
        };
    }

    private parsePassStatement(): PassStatement {
        this.check(TokenKind.WORD, "pass");
        this.currentToken = this.lexer.scan();

        this.check(TokenKind.NEWLINE);
        this.currentToken = this.lexer.scan();

        return {
            type: "PassStatement",
        };
    }

    private parseBreakStatement(): BreakStatement {
        this.check(TokenKind.WORD, "break");
        this.currentToken = this.lexer.scan();

        this.check(TokenKind.NEWLINE);
        this.currentToken = this.lexer.scan();

        return {
            type: "BreakStatement",
        };
    }

    private parseContinueStatement(): ContinueStatement {
        this.check(TokenKind.WORD, "continue");
        this.currentToken = this.lexer.scan();

        this.check(TokenKind.NEWLINE);
        this.currentToken = this.lexer.scan();

        return {
            type: "ContinueStatement",
        };
    }

    private parseIfStatement(): IfStatement {
        this.check(TokenKind.WORD, "if");
        this.currentToken = this.lexer.scan();

        const condition = this.parseExpression();

        this.check(TokenKind.SYMBOL, ":");
        this.currentToken = this.lexer.scan();

        const thenBody = this.parseBlock();
        const elseIfBranches: ElseIfBranch[] = [];

        while (
            this.currentToken.kind === TokenKind.WORD &&
            this.currentToken.token === "elif"
        ) {
            this.currentToken = this.lexer.scan();

            const elseIfCondition = this.parseExpression();

            this.check(TokenKind.SYMBOL, ":");
            this.currentToken = this.lexer.scan();

            const elseIfBody = this.parseBlock();

            elseIfBranches.push({
                condition: elseIfCondition,
                body: elseIfBody,
            });
        }

        let elseBody: Statement[] | null = null;

        if (
            this.currentToken.kind === TokenKind.WORD &&
            this.currentToken.token === "else"
        ) {
            this.currentToken = this.lexer.scan();

            this.check(TokenKind.SYMBOL, ":");
            this.currentToken = this.lexer.scan();

            elseBody = this.parseBlock();
        }

        return {
            type: "IfStatement",
            condition,
            thenBody,
            elseIfBranches,
            elseBody,
        };
    }

    private parseWhileStatement(): WhileStatement {
        this.check(TokenKind.WORD, "while");
        this.currentToken = this.lexer.scan();

        const condition = this.parseExpression();

        this.check(TokenKind.SYMBOL, ":");
        this.currentToken = this.lexer.scan();

        const body = this.parseBlock();

        return {
            type: "WhileStatement",
            condition,
            body,
        };
    }

    private parseForStatement(): ForStatement {
        this.check(TokenKind.WORD, "for");
        this.currentToken = this.lexer.scan();

        this.check(TokenKind.WORD);
        const variable = this.currentToken.token;
        this.currentToken = this.lexer.scan();

        this.check(TokenKind.WORD, "in");
        this.currentToken = this.lexer.scan();

        const iterable = this.parseExpression();

        this.check(TokenKind.SYMBOL, ":");
        this.currentToken = this.lexer.scan();

        const body = this.parseBlock();

        return {
            type: "ForStatement",
            variable,
            iterable,
            body,
        };
    }

    private parseAskStatement(): AskStatement {
        this.check(TokenKind.WORD, "ask");
        this.currentToken = this.lexer.scan();

        this.check(TokenKind.SYMBOL, "(");
        this.currentToken = this.lexer.scan();

        const target = this.parseExpression();

        this.check(TokenKind.SYMBOL, ")");
        this.currentToken = this.lexer.scan();

        this.check(TokenKind.SYMBOL, ":");
        this.currentToken = this.lexer.scan();

        const body = this.parseBlock();

        return {
            type: "AskStatement",
            target,
            body,
        };
    }

    private parseAssignment(): Assignment {
        this.check(TokenKind.WORD);

        const name = this.currentToken.token;
        this.currentToken = this.lexer.scan();

        this.check(TokenKind.SYMBOL, "=");
        this.currentToken = this.lexer.scan();

        const value = this.parseExpression();

        this.check(TokenKind.NEWLINE);
        this.currentToken = this.lexer.scan();

        return {
            type: "Assignment",
            name,
            value,
        };
    }

    private parseExpression(): Expression {
        return this.parseOrExpression();
    }

    private parseOrExpression(): Expression {
        let expression = this.parseAndExpression();

        while (
            this.currentToken.kind === TokenKind.WORD &&
            this.currentToken.token === "or"
        ) {
            const operator = this.currentToken.token;
            this.currentToken = this.lexer.scan();

            const right = this.parseAndExpression();

            expression = {
                type: "BinaryExpression",
                operator: operator,
                left: expression,
                right: right,
            };
        }

        return expression;
    }

    private parseAndExpression(): Expression {
        let expression = this.parseComparisonExpression();

        while (
            this.currentToken.kind === TokenKind.WORD &&
            this.currentToken.token === "and"
        ) {
            const operator = this.currentToken.token;
            this.currentToken = this.lexer.scan();

            const right = this.parseComparisonExpression();

            expression = {
                type: "BinaryExpression",
                operator: operator,
                left: expression,
                right: right,
            };
        }

        return expression;
    }

    private parseComparisonExpression(): Expression {
        const left = this.parseAdditiveExpression();

        if (this.currentToken.kind !== TokenKind.SYMBOL) {
            return left;
        }

        const operator = this.currentToken.token;

        if (
            operator !== "==" &&
            operator !== "!=" &&
            operator !== "<" &&
            operator !== "<=" &&
            operator !== ">" &&
            operator !== ">="
        ) {
            return left;
        }

        this.currentToken = this.lexer.scan();

        const right = this.parseAdditiveExpression();

        return {
            type: "BinaryExpression",
            operator: operator,
            left: left,
            right: right,
        };
    }

    private parseAdditiveExpression(): Expression {
        let expression = this.parseMultiplicativeExpression();

        while (true) {
            if (this.currentToken.kind !== TokenKind.SYMBOL) {
                break;
            }

            const operator = this.currentToken.token;

            if (operator !== "+" && operator !== "-") {
                break;
            }

            this.currentToken = this.lexer.scan();

            const right = this.parseMultiplicativeExpression();

            expression = {
                type: "BinaryExpression",
                operator: operator,
                left: expression,
                right: right,
            };
        }

        return expression;
    }

    private parseMultiplicativeExpression(): Expression {
        let expression = this.parseUnaryExpression();

        while (true) {
            if (this.currentToken.kind !== TokenKind.SYMBOL) {
                break;
            }

            const operator = this.currentToken.token;

            if (
                operator !== "*" &&
                operator !== "/" &&
                operator !== "%"
            ) {
                break;
            }

            this.currentToken = this.lexer.scan();

            const right = this.parseUnaryExpression();

            expression = {
                type: "BinaryExpression",
                operator: operator,
                left: expression,
                right: right,
            };
        }

        return expression;
    }

    private parseUnaryExpression(): Expression {
        const isMinus =
            this.currentToken.kind === TokenKind.SYMBOL &&
            this.currentToken.token === "-";

        const isNot =
            this.currentToken.kind === TokenKind.WORD &&
            this.currentToken.token === "not";

        if (isMinus || isNot) {
            const operator =
                this.currentToken.token === "-" ? "-" : "not";

            this.currentToken = this.lexer.scan();

            const operand = this.parseUnaryExpression();

            return {
                type: "UnaryExpression",
                operator,
                operand,
            };
        }

        return this.parsePrimaryExpression();
    }

    private parsePrimaryExpression(): Expression {
        if (
            this.currentToken.kind === TokenKind.SYMBOL &&
            this.currentToken.token === "("
        ) {
            this.currentToken = this.lexer.scan();

            const expression = this.parseExpression();

            this.check(TokenKind.SYMBOL, ")");
            this.currentToken = this.lexer.scan();

            return expression;
        }
        if (this.currentToken.kind === TokenKind.NUMBER) {
            const value = Number(this.currentToken.token);
            this.currentToken = this.lexer.scan();

            return {
                type: "NumberLiteral",
                value,
            };
        }

        if (this.currentToken.kind === TokenKind.STRING) {
            const value = this.currentToken.token.slice(1, -1);
            this.currentToken = this.lexer.scan();

            return {
                type: "StringLiteral",
                value,
            };
        }

        if (
            this.currentToken.kind === TokenKind.WORD &&
            (this.currentToken.token === "True" ||
                this.currentToken.token === "False")
        ) {
            const value = this.currentToken.token === "True";
            this.currentToken = this.lexer.scan();

            return {
                type: "BooleanLiteral",
                value,
            };
        }

        if (
            this.currentToken.kind === TokenKind.WORD &&
            this.currentToken.token === "None"
        ) {
            this.currentToken = this.lexer.scan();

            return {
                type: "NoneLiteral",
            };
        }

        if (this.currentToken.kind === TokenKind.WORD) {
            const name = this.currentToken.token;
            this.currentToken = this.lexer.scan();

            if (
                this.currentToken.kind === TokenKind.SYMBOL &&
                this.currentToken.token === "("
            ) {
                return this.parseFunctionCall(name);
            }

            if (
                this.currentToken.kind === TokenKind.SYMBOL &&
                this.currentToken.token === "."
            ) {
                return this.parseFilterExpression(name);
            }

            return {
                type: "Identifier",
                name: name,
            };
        }

        throw new Error(
            `Na riadku ${this.currentToken.line}, v stĺpci ` +
                `${this.currentToken.column} sa očakáva výraz, ` +
                `ale našlo sa "${this.currentToken.token}".`
        );
    }

    private parseFunctionCall(name: string): FunctionCall {
        this.check(TokenKind.SYMBOL, "(");
        this.currentToken = this.lexer.scan();

        const argumentsList: Expression[] = [];

        if (
            this.currentToken.kind === TokenKind.SYMBOL &&
            this.currentToken.token === ")"
        ) {
            this.currentToken = this.lexer.scan();

            return {
                type: "FunctionCall",
                name: name,
                arguments: argumentsList,
            };
        }

        argumentsList.push(this.parseExpression());

        while (
            this.currentToken.kind === TokenKind.SYMBOL &&
            this.currentToken.token === ","
        ) {
            this.currentToken = this.lexer.scan();
            argumentsList.push(this.parseExpression());
        }

        this.check(TokenKind.SYMBOL, ")");
        this.currentToken = this.lexer.scan();

        return {
            type: "FunctionCall",
            name: name,
            arguments: argumentsList,
        };
    }

    private parseFilterExpression(source: string): FilterExpression {
        this.check(TokenKind.SYMBOL, ".");
        this.currentToken = this.lexer.scan();

        this.check(TokenKind.WORD, "where");
        this.currentToken = this.lexer.scan();

        this.check(TokenKind.SYMBOL, "(");
        this.currentToken = this.lexer.scan();

        const condition = this.parseExpression();

        this.check(TokenKind.SYMBOL, ")");
        this.currentToken = this.lexer.scan();

        return {
            type: "FilterExpression",
            source: source,
            condition: condition,
        };
    }

	private check(kind: TokenKind, token?: string): void {
		if (this.currentToken.kind !== kind) {
			throw new Error(
				`Na riadku ${this.currentToken.line}, v stĺpci ` +
					`${this.currentToken.column} sa očakáva druh ${kind}, ` +
					`ale našiel sa ${this.currentToken.kind}.`
			);
		}

		if (
			token !== undefined &&
			this.currentToken.token !== token
		) {
			throw new Error(
				`Na riadku ${this.currentToken.line}, v stĺpci ` +
					`${this.currentToken.column} sa očakáva "${token}", ` +
					`ale našlo sa "${this.currentToken.token}".`
			);
		}
	}
}