export interface Program {
	type: "Program";
	statements: TopLevelStatement[];
}

export type TopLevelStatement =
	| Assignment
	| FunctionDeclaration
	| EntityDeclaration;

export interface FunctionDeclaration {
	type: "FunctionDeclaration";
	name: string;
	parameters: string[];
	body: Statement[];
}

export type Statement =
	| Assignment
	| FunctionCall
	| ReturnStatement
	| PassStatement
	| BreakStatement
	| ContinueStatement
	| IfStatement
	| WhileStatement
	| ForStatement
	| AskStatement;

export interface PassStatement {
	type: "PassStatement";
}

export interface BreakStatement {
	type: "BreakStatement";
}

export interface ContinueStatement {
	type: "ContinueStatement";
}

export interface ReturnStatement {
	type: "ReturnStatement";
	value: Expression | null;
}

export interface Assignment {
	type: "Assignment";
	name: string;
	value: Expression;
}

export type Expression =
	| NumberLiteral
	| StringLiteral
	| BooleanLiteral
	| NoneLiteral
	| IdentifierExpression
	| UnaryExpression
	| BinaryExpression
	| FunctionCall
	| FilterExpression;

export interface NumberLiteral {
	type: "NumberLiteral";
	value: number;
}

export interface StringLiteral {
	type: "StringLiteral";
	value: string;
}

export interface BooleanLiteral {
	type: "BooleanLiteral";
	value: boolean;
}

export interface NoneLiteral {
	type: "NoneLiteral";
}

export interface IdentifierExpression {
	type: "Identifier";
	name: string;
}

export interface UnaryExpression {
	type: "UnaryExpression";
	operator: UnaryOperator;
	operand: Expression;
}

export type UnaryOperator =
	| "-"
	| "not";

export interface BinaryExpression {
	type: "BinaryExpression";
	operator: BinaryOperator;
	left: Expression;
	right: Expression;
}

export type BinaryOperator =
	| "+"
	| "-"
	| "*"
	| "/"
	| "%"
	| "=="
	| "!="
	| "<"
	| "<="
	| ">"
	| ">="
	| "and"
	| "or";

export interface FunctionCall {
	type: "FunctionCall";
	name: string;
	arguments: Expression[];
}

export interface FilterExpression {
	type: "FilterExpression";
	source: string;
	condition: Expression;
}

export interface IfStatement {
	type: "IfStatement";
	condition: Expression;
	thenBody: Statement[];
	elseIfBranches: ElseIfBranch[];
	elseBody: Statement[] | null;
}

export interface ElseIfBranch {
	condition: Expression;
	body: Statement[];
}

export interface WhileStatement {
	type: "WhileStatement";
	condition: Expression;
	body: Statement[];
}

export interface ForStatement {
	type: "ForStatement";
	variable: string;
	iterable: Expression;
	body: Statement[];
}

export interface AskStatement {
	type: "AskStatement";
	target: Expression;
	body: Statement[];
}

export type EntityType =
	| "agent"
	| "patch"
	| "link";

export interface EntityDeclaration {
	type: "EntityDeclaration";
	entityType: EntityType;
	name: string;
	functions: FunctionDeclaration[];
}