import type {
	Assignment,
	Expression,
	Program,
    FunctionDeclaration,
    FunctionCall,
    Statement,
    IfStatement,
    WhileStatement,
    ForStatement,
    EntityDeclaration,
    AskStatement,
} from "./Ast.ts";

import {
	Variables,
	type RuntimeValue,
} from "./Variables.ts";

import type { EntityInstance } from "./EntityInstance.ts";

type ExecutionResult =
	| {
		type: "normal";
	}
	| {
		type: "return";
		value: RuntimeValue;
	}
	| {
		type: "break";
	}
	| {
		type: "continue";
	};

export class Interpreter {
	private globalVariables: Variables;
    private localVariablesStack: Variables[];
    private functions: Map<string, FunctionDeclaration>;
    private entityDeclarations: Map<string, EntityDeclaration>;
    private entityInstances: Map<string, EntityInstance[]>;
    private nextEntityId: number;
    private entityContextStack: EntityInstance[];
    private patchWidth: number;
    private patchHeight: number;
    private patchCellSize: number;

    constructor() {
        this.globalVariables = new Variables();
        this.localVariablesStack = [];
        this.functions = new Map();
        this.entityDeclarations = new Map();
        this.entityInstances = new Map();
        this.nextEntityId = 1;
        this.entityContextStack = [];
        this.patchWidth = 0;
        this.patchHeight = 0;
        this.patchCellSize = 0;
    }

    public run(program: Program): void {
        for (const statement of program.statements) {
            if (statement.type === "FunctionDeclaration") {
                this.functions.set(statement.name, statement);
                continue;
            }

            if (statement.type === "EntityDeclaration") {
                this.entityDeclarations.set(
                    statement.name,
                    statement
                );

                this.entityInstances.set(statement.name, []);
            }
        }

        for (const statement of program.statements) {
            if (statement.type === "Assignment") {
                this.executeAssignment(statement);
                continue;
            }

            if (statement.type === "FunctionDeclaration") {
                continue;
            }

            if (statement.type === "EntityDeclaration") {
                continue;
            }

        }
    }

    private executeAssignment(assignment: Assignment): void {
        const value = this.evaluateExpression(assignment.value);

        this.writeVariable(assignment.name, value);
    }

    private evaluateExpression(expression: Expression): RuntimeValue {
        switch (expression.type) {
            case "NumberLiteral":
                return expression.value;

            case "StringLiteral":
                return expression.value;

            case "BooleanLiteral":
                return expression.value;

            case "NoneLiteral":
                return null;

            case "Identifier":
                return this.readVariable(expression.name);

            case "UnaryExpression": {
                const operand = this.evaluateExpression(expression.operand);

                if (expression.operator === "-") {
                    if (typeof operand !== "number") {
                        throw new Error(
                            `Operátor "-" možno použiť iba s číslom.`
                        );
                    }

                    return -operand;
                }

                if (expression.operator === "not") {
                    if (typeof operand !== "boolean") {
                        throw new Error(
                            `Operátor "not" možno použiť iba s logickou hodnotou.`
                        );
                    }

                    return !operand;
                }

                throw new Error(
                    `Neznámy unárny operátor "${expression.operator}".`
                );
            }

            case "BinaryExpression": {
                if (expression.operator === "and") {
                    const left = this.evaluateExpression(expression.left);

                    if (typeof left !== "boolean") {
                        throw new Error(
                            `Ľavá strana operátora "and" musí byť logická hodnota.`
                        );
                    }

                    if (!left) {
                        return false;
                    }

                    const right = this.evaluateExpression(expression.right);

                    if (typeof right !== "boolean") {
                        throw new Error(
                            `Pravá strana operátora "and" musí byť logická hodnota.`
                        );
                    }

                    return right;
                }

                if (expression.operator === "or") {
                    const left = this.evaluateExpression(expression.left);

                    if (typeof left !== "boolean") {
                        throw new Error(
                            `Ľavá strana operátora "or" musí byť logická hodnota.`
                        );
                    }

                    if (left) {
                        return true;
                    }

                    const right = this.evaluateExpression(expression.right);

                    if (typeof right !== "boolean") {
                        throw new Error(
                            `Pravá strana operátora "or" musí byť logická hodnota.`
                        );
                    }

                    return right;
                }

                const left = this.evaluateExpression(expression.left);
                const right = this.evaluateExpression(expression.right);

                if (expression.operator === "==") {
                    return left === right;
                }

                if (expression.operator === "!=") {
                    return left !== right;
                }

                if (
                    typeof left !== "number" ||
                    typeof right !== "number"
                ) {
                    throw new Error(
                        `Operátor "${expression.operator}" možno použiť iba s číslami.`
                    );
                }

                switch (expression.operator) {
                    case "+":
                        return left + right;

                    case "-":
                        return left - right;

                    case "*":
                        return left * right;

                    case "/":
                        if (right === 0) {
                            throw new Error("Nulou nemožno deliť.");
                        }

                        return left / right;

                    case "%":
                        if (right === 0) {
                            throw new Error("Nulou nemožno deliť.");
                        }

                        return left % right;

                    case "<":
                        return left < right;

                    case "<=":
                        return left <= right;

                    case ">":
                        return left > right;

                    case ">=":
                        return left >= right;
                }

                // throw new Error(
                //     `Neznámy binárny operátor "${expression.operator}".`
                // );
            }

            case "FunctionCall":
	            return this.executeFunctionCall(expression);
            
            case "FilterExpression": {
                const source = this.readVariable(
                    expression.source
                );

                if (!Array.isArray(source)) {
                    throw new Error(
                        `Zdroj filtra "${expression.source}" ` +
                            `musí byť kolekcia entít.`
                    );
                }

                const filteredInstances: EntityInstance[] = [];

                for (const value of source) {
                    if (!this.isEntityInstance(value)) {
                        throw new Error(
                            `Filter možno použiť iba na kolekciu entít.`
                        );
                    }

                    this.localVariablesStack.push(
                        value.variables
                    );

                    this.entityContextStack.push(value);

                    try {
                        const condition = this.evaluateExpression(
                            expression.condition
                        );

                        if (typeof condition !== "boolean") {
                            throw new Error(
                                `Podmienka vo "where" musí byť logická hodnota.`
                            );
                        }

                        if (condition) {
                            filteredInstances.push(value);
                        }
                    } finally {
                        this.entityContextStack.pop();
                        this.localVariablesStack.pop();
                    }
                }

                return filteredInstances;
            }
        }
    }

    private getCurrentLocalVariables(): Variables | null {
        if (this.localVariablesStack.length === 0) {
            return null;
        }

        return this.localVariablesStack[
            this.localVariablesStack.length - 1
        ];
    }

    private readVariable(name: string): RuntimeValue {
        const localVariables = this.getCurrentLocalVariables();

        if (
            localVariables !== null &&
            localVariables.has(name)
        ) {
            return localVariables.get(name);
        }

        if (this.globalVariables.has(name)) {
            return this.globalVariables.get(name);
        }

        const instances = this.entityInstances.get(name);

        if (instances !== undefined) {
            return instances;
        }

        throw new Error(
            `Premenná alebo entita "${name}" neexistuje.`
        );
    }

    private writeVariable(
        name: string,
        value: RuntimeValue
    ): void {
        const localVariables = this.getCurrentLocalVariables();

        if (localVariables !== null) {
            localVariables.set(name, value);
            return;
        }

        this.globalVariables.set(name, value);
    }

    public getVariable(name: string): RuntimeValue {
        return this.globalVariables.get(name);
    }

    private getFunction(name: string): FunctionDeclaration {
        const functionDeclaration = this.functions.get(name);

        if (functionDeclaration === undefined) {
            throw new Error(`Funkcia "${name}" neexistuje.`);
        }

        return functionDeclaration;
    }

    private executeBlock(statements: Statement[]): ExecutionResult {
        for (const statement of statements) {
            const result = this.executeStatement(statement);

            if (result.type !== "normal") {
                return result;
            }
        }

        return {
            type: "normal",
        };
    }

    private executeStatement(statement: Statement): ExecutionResult {
        switch (statement.type) {
            case "Assignment":
                this.executeAssignment(statement);

                return {
                    type: "normal",
                };

            case "FunctionCall":
                this.executeFunctionCall(statement);

                return {
                    type: "normal",
                };

            case "ReturnStatement": {
                const value =
                    statement.value === null
                        ? null
                        : this.evaluateExpression(statement.value);

                return {
                    type: "return",
                    value,
                };
            }

            case "IfStatement":
	            return this.executeIfStatement(statement);
            
            case "WhileStatement":
                return this.executeWhileStatement(statement);
            
            case "ForStatement":
	            return this.executeForStatement(statement);
            
            case "AskStatement":
	            return this.executeAskStatement(statement);

            case "BreakStatement":
                return {
                    type: "break",
                };

            case "ContinueStatement":
                return {
                    type: "continue",
                };

            case "PassStatement":
                return {
                    type: "normal",
                };
        }
    }

    private executeFunctionCall(
        functionCall: FunctionCall
    ): RuntimeValue {
        if (functionCall.name === "create") {
            return this.executeCreate(functionCall);
        }

        if (functionCall.name === "move_forward") {
            return this.executeMoveForward(functionCall);
        }

        if (functionCall.name === "turn") {
            return this.executeTurn(functionCall);
        }

        if (functionCall.name === "can_move") {
            return this.executeCanMove(functionCall);
        }

        if (functionCall.name === "random") {
            return this.executeRandom(functionCall);
        }

        if (functionCall.name === "patch_value") {
            return this.executePatchValue(functionCall);
        }

        if (functionCall.name === "set_patch_value") {
            return this.executeSetPatchValue(functionCall);
        }

        if (functionCall.name === "evaporate") {
            return this.executeEvaporate(functionCall);
        }   

        if (functionCall.name === "patch_value_at_angle") {
            return this.executePatchValueAtAngle(functionCall);
        }

        if (functionCall.name === "diffuse") {
	        return this.executeDiffuse(functionCall);
        }

        if (functionCall.name === "distance_to") {
	        return this.executeDistanceTo(functionCall);
        }

        if (functionCall.name === "face") {
	        return this.executeFace(functionCall);
        }

        if (functionCall.name === "count_neighbors") {
            return this.executeCountNeighbors(functionCall);
        }

        const currentEntity = this.getCurrentEntity();

        if (currentEntity !== null) {
            const entityDeclaration =
                this.getEntityDeclaration(
                    currentEntity.entityName
                );

            const entityFunction =
                entityDeclaration.functions.find(
                    (functionDeclaration) =>
                        functionDeclaration.name ===
                        functionCall.name
                );

            if (entityFunction !== undefined) {
                return this.executeEntityFunction(
                    currentEntity,
                    entityFunction,
                    functionCall
                );
            }
        }

        const functionDeclaration = this.getFunction(
            functionCall.name
        );

        if (
            functionCall.arguments.length !==
            functionDeclaration.parameters.length
        ) {
            throw new Error(
                `Funkcia "${functionCall.name}" očakáva ` +
                    `${functionDeclaration.parameters.length} argumentov, ` +
                    `ale dostala ${functionCall.arguments.length}.`
            );
        }

        const argumentValues = functionCall.arguments.map(
            (argument) => this.evaluateExpression(argument)
        );

        const localVariables = new Variables();

        for (
            let i = 0;
            i < functionDeclaration.parameters.length;
            i++
        ) {
            const parameterName =
                functionDeclaration.parameters[i];

            const argumentValue = argumentValues[i];

            localVariables.set(parameterName, argumentValue);
        }

        this.localVariablesStack.push(localVariables);

        try {
            const result = this.executeBlock(
                functionDeclaration.body
            );

            if (result.type === "return") {
                return result.value;
            }

            if (result.type === "break") {
                throw new Error(
                    `Príkaz "break" možno použiť iba vo vnútri cyklu.`
                );
            }

            if (result.type === "continue") {
                throw new Error(
                    `Príkaz "continue" možno použiť iba vo vnútri cyklu.`
                );
            }

            return null;
        } finally {
            this.localVariablesStack.pop();
        }
    }

    private executeCreate(
        functionCall: FunctionCall
    ): RuntimeValue {
        if (functionCall.arguments.length !== 2) {
            throw new Error(
                `Funkcia "create" očakáva presne 2 argumenty.`
            );
        }

        const entityArgument = functionCall.arguments[0];

        if (entityArgument.type !== "Identifier") {
            throw new Error(
                `Prvý argument funkcie "create" musí byť názov entity.`
            );
        }

        const entityName = entityArgument.name;
        const entityDeclaration =
            this.getEntityDeclaration(entityName);
        
        if (entityDeclaration.entityType === "patch") {
            throw new Error(
                `Patchy sa nevytvárajú pomocou funkcie "create". ` +
                    `Vznikajú automaticky podľa rozmerov sveta.`
            );
        }

        const count = this.evaluateExpression(
            functionCall.arguments[1]
        );

        if (
            typeof count !== "number" ||
            !Number.isInteger(count) ||
            count < 0
        ) {
            throw new Error(
                `Druhý argument funkcie "create" musí byť nezáporné celé číslo.`
            );
        }

        const allInstances =
            this.entityInstances.get(entityName)!;

        const createdInstances: EntityInstance[] = [];

        for (let i = 0; i < count; i++) {
            const instance: EntityInstance = {
                id: this.nextEntityId,
                entityName,
                variables: new Variables(),
            };

            if (entityDeclaration.entityType === "agent") {
                instance.variables.set("x", 0);
                instance.variables.set("y", 0);
                instance.variables.set("direction", 0);
            }

            this.nextEntityId++;

            allInstances.push(instance);
            createdInstances.push(instance);

            this.executeSetup(
                entityDeclaration,
                instance
            );
        }

        return createdInstances;
    }

    private executeMoveForward(
        functionCall: FunctionCall
    ): RuntimeValue {
        const currentEntity = this.getCurrentEntity();

        if (currentEntity === null) {
            throw new Error(
                `Funkciu "move_forward" možno volať iba ` +
                    `v kontexte konkrétneho agenta.`
            );
        }

        const entityDeclaration =
            this.getEntityDeclaration(
                currentEntity.entityName
            );

        if (entityDeclaration.entityType !== "agent") {
            throw new Error(
                `Funkciu "move_forward" možno použiť iba ` +
                    `pre entity typu "agent".`
            );
        }

        if (functionCall.arguments.length !== 1) {
            throw new Error(
                `Funkcia "move_forward" očakáva presne 1 argument.`
            );
        }

        const distance = this.evaluateExpression(
            functionCall.arguments[0]
        );

        if (typeof distance !== "number") {
            throw new Error(
                `Argument funkcie "move_forward" musí byť číslo.`
            );
        }

        const x = currentEntity.variables.get("x");
        const y = currentEntity.variables.get("y");
        const direction =
            currentEntity.variables.get("direction");

        if (
            typeof x !== "number" ||
            typeof y !== "number" ||
            typeof direction !== "number"
        ) {
            throw new Error(
                `Agent musí mať číselné vlastnosti ` +
                    `"x", "y" a "direction".`
            );
        }

        const radians =
            direction * Math.PI / 180;

        const newX =
            x + Math.cos(radians) * distance;

        const newY =
            y + Math.sin(radians) * distance;

        currentEntity.variables.set("x", newX);
        currentEntity.variables.set("y", newY);

        return null;
    }

    private executeTurn(
        functionCall: FunctionCall
    ): RuntimeValue {
        const currentEntity = this.getCurrentEntity();

        if (currentEntity === null) {
            throw new Error(
                `Funkciu "turn" možno volať iba ` +
                    `v kontexte konkrétneho agenta.`
            );
        }

        const entityDeclaration =
            this.getEntityDeclaration(
                currentEntity.entityName
            );

        if (entityDeclaration.entityType !== "agent") {
            throw new Error(
                `Funkciu "turn" možno použiť iba ` +
                    `pre entity typu "agent".`
            );
        }

        if (functionCall.arguments.length !== 1) {
            throw new Error(
                `Funkcia "turn" očakáva presne 1 argument.`
            );
        }

        const angle = this.evaluateExpression(
            functionCall.arguments[0]
        );

        if (typeof angle !== "number") {
            throw new Error(
                `Argument funkcie "turn" musí byť číslo.`
            );
        }

        const direction =
            currentEntity.variables.get("direction");

        if (typeof direction !== "number") {
            throw new Error(
                `Vlastnosť "direction" agenta musí byť číslo.`
            );
        }

        const newDirection =
            ((direction + angle) % 360 + 360) % 360;

        currentEntity.variables.set(
            "direction",
            newDirection
        );

        return null;
    }

    private executeRandom(
        functionCall: FunctionCall
    ): RuntimeValue {
        if (
            functionCall.arguments.length !== 1 &&
            functionCall.arguments.length !== 2
        ) {
            throw new Error(
                'Funkcia "random" očakáva 1 alebo 2 argumenty.'
            );
        }

        const firstArgument =
            this.evaluateExpression(
                functionCall.arguments[0]
            );

        if (
            typeof firstArgument !== "number" ||
            !Number.isInteger(firstArgument)
        ) {
            throw new Error(
                'Argumenty funkcie "random" musia byť celé čísla.'
            );
        }

        let minimum: number;
        let maximum: number;

        if (functionCall.arguments.length === 1) {
            minimum = 0;
            maximum = firstArgument;
        } else {
            const secondArgument =
                this.evaluateExpression(
                    functionCall.arguments[1]
                );

            if (
                typeof secondArgument !== "number" ||
                !Number.isInteger(secondArgument)
            ) {
                throw new Error(
                    'Argumenty funkcie "random" musia byť celé čísla.'
                );
            }

            minimum = firstArgument;
            maximum = secondArgument;
        }

        if (maximum <= minimum) {
            throw new Error(
                'Horná hranica funkcie "random" musí byť väčšia ako dolná hranica.'
            );
        }

        return Math.floor(
            Math.random() *
                (maximum - minimum)
        ) + minimum;
    }

    private executeSetup(
        entityDeclaration: EntityDeclaration,
        instance: EntityInstance
    ): void {
        const setupFunction =
            entityDeclaration.functions.find(
                (functionDeclaration) =>
                    functionDeclaration.name === "setup"
            );

        if (setupFunction === undefined) {
            return;
        }

        if (setupFunction.parameters.length !== 0) {
            throw new Error(
                `Funkcia "setup" entity "${entityDeclaration.name}" ` +
                    `nesmie mať parametre.`
            );
        }

        this.localVariablesStack.push(
            instance.variables
        );

        this.entityContextStack.push(instance);

        try {
            const result = this.executeBlock(
                setupFunction.body
            );

            if (result.type === "break") {
                throw new Error(
                    `Príkaz "break" možno použiť iba vo vnútri cyklu.`
                );
            }

            if (result.type === "continue") {
                throw new Error(
                    `Príkaz "continue" možno použiť iba vo vnútri cyklu.`
                );
            }
        } finally {
            this.entityContextStack.pop();
            this.localVariablesStack.pop();
        }
    }

    private executeIfStatement(
        ifStatement: IfStatement
    ): ExecutionResult {
        const condition = this.evaluateExpression(
            ifStatement.condition
        );

        if (typeof condition !== "boolean") {
            throw new Error(
                `Podmienka príkazu "if" musí byť logická hodnota.`
            );
        }

        if (condition) {
            return this.executeBlock(ifStatement.thenBody);
        }

        for (const elseIfBranch of ifStatement.elseIfBranches) {
            const elseIfCondition = this.evaluateExpression(
                elseIfBranch.condition
            );

            if (typeof elseIfCondition !== "boolean") {
                throw new Error(
                    `Podmienka príkazu "elif" musí byť logická hodnota.`
                );
            }

            if (elseIfCondition) {
                return this.executeBlock(elseIfBranch.body);
            }
        }

        if (ifStatement.elseBody !== null) {
            return this.executeBlock(ifStatement.elseBody);
        }

        return {
            type: "normal",
        };
    }

    private executeWhileStatement(
        whileStatement: WhileStatement
    ): ExecutionResult {
        while (true) {
            const condition = this.evaluateExpression(
                whileStatement.condition
            );

            if (typeof condition !== "boolean") {
                throw new Error(
                    `Podmienka cyklu "while" musí byť logická hodnota.`
                );
            }

            if (!condition) {
                return {
                    type: "normal",
                };
            }

            const result = this.executeBlock(
                whileStatement.body
            );

            if (result.type === "return") {
                return result;
            }

            if (result.type === "break") {
                return {
                    type: "normal",
                };
            }

            if (result.type === "continue") {
                continue;
            }
        }
    }

    private executeForStatement(
        forStatement: ForStatement
    ): ExecutionResult {
        const iterable = this.evaluateExpression(
            forStatement.iterable
        );

        if (!Array.isArray(iterable)) {
            throw new Error(
                `Výraz za slovom "in" musí byť kolekcia hodnôt.`
            );
        }

        for (const value of iterable) {
            this.writeVariable(forStatement.variable, value);

            const result = this.executeBlock(
                forStatement.body
            );

            if (result.type === "return") {
                return result;
            }

            if (result.type === "break") {
                return {
                    type: "normal",
                };
            }

            if (result.type === "continue") {
                continue;
            }
        }

        return {
            type: "normal",
        };
    }

    private executeAskStatement(
        askStatement: AskStatement
    ): ExecutionResult {
        const target =
            this.evaluateExpression(
                askStatement.target
            );

        let instances: EntityInstance[];

        if (Array.isArray(target)) {
            instances = [];

            for (const value of target) {
                if (!this.isEntityInstance(value)) {
                    throw new Error(
                        'Príkaz "ask" možno použiť iba na entity.'
                    );
                }

                instances.push(value);
            }
        } else if (this.isEntityInstance(target)) {
            instances = [target];
        } else {
            throw new Error(
                'Príkaz "ask" možno použiť iba na entitu ' +
                    'alebo kolekciu entít.'
            );
        }

        for (const statement of askStatement.body) {
            for (const instance of instances) {
                this.localVariablesStack.push(
                    instance.variables
                );

                this.entityContextStack.push(
                    instance
                );

                try {
                    const result =
                        this.executeStatement(
                            statement
                        );

                    if (result.type !== "normal") {
                        return result;
                    }
                } finally {
                    this.entityContextStack.pop();
                    this.localVariablesStack.pop();
                }
            }
        }

        return {
            type: "normal",
        };
    }

    private getEntityDeclaration(
        name: string
    ): EntityDeclaration {
        const entityDeclaration =
            this.entityDeclarations.get(name);

        if (entityDeclaration === undefined) {
            throw new Error(`Entita "${name}" neexistuje.`);
        }

        return entityDeclaration;
    }

    public getEntityCount(name: string): number {
        const instances = this.entityInstances.get(name);

        if (instances === undefined) {
            throw new Error(`Entita "${name}" neexistuje.`);
        }

        return instances.length;
    }

    public setGlobalVariable(
        name: string,
        value: RuntimeValue
    ): void {
        this.globalVariables.set(name, value);
    }

    private isEntityInstance(
        value: RuntimeValue
    ): value is EntityInstance {
        return (
            typeof value === "object" &&
            value !== null &&
            !Array.isArray(value) &&
            "id" in value &&
            "entityName" in value &&
            "variables" in value
        );
    }

    public getEntityVariable(
        entityName: string,
        index: number,
        variableName: string
    ): RuntimeValue {
        const instances =
            this.entityInstances.get(entityName);

        if (instances === undefined) {
            throw new Error(`Entita "${entityName}" neexistuje.`);
        }

        const instance = instances[index];

        if (instance === undefined) {
            throw new Error(
                `Entita "${entityName}" nemá inštanciu ` +
                    `na indexe ${index}.`
            );
        }

        return instance.variables.get(variableName);
    }

    private getCurrentEntity(): EntityInstance | null {
        if (this.entityContextStack.length === 0) {
            return null;
        }

        return this.entityContextStack[
            this.entityContextStack.length - 1
        ];
    }

    private executeEntityFunction(
        instance: EntityInstance,
        functionDeclaration: FunctionDeclaration,
        functionCall: FunctionCall
    ): RuntimeValue {
        if (
            functionCall.arguments.length !==
            functionDeclaration.parameters.length
        ) {
            throw new Error(
                `Funkcia "${functionCall.name}" entity ` +
                    `"${instance.entityName}" očakáva ` +
                    `${functionDeclaration.parameters.length} argumentov, ` +
                    `ale dostala ${functionCall.arguments.length}.`
            );
        }

        const argumentValues = functionCall.arguments.map(
            (argument) => this.evaluateExpression(argument)
        );

        const previousParameterValues: {
            name: string;
            existed: boolean;
            value: RuntimeValue | null;
        }[] = [];

        for (
            let i = 0;
            i < functionDeclaration.parameters.length;
            i++
        ) {
            const parameterName =
                functionDeclaration.parameters[i];

            const existed =
                instance.variables.has(parameterName);

            const previousValue = existed
                ? instance.variables.get(parameterName)
                : null;

            previousParameterValues.push({
                name: parameterName,
                existed,
                value: previousValue,
            });

            instance.variables.set(
                parameterName,
                argumentValues[i]
            );
        }

        this.localVariablesStack.push(
            instance.variables
        );
        this.entityContextStack.push(instance);

        try {
            const result = this.executeBlock(
                functionDeclaration.body
            );

            if (result.type === "return") {
                return result.value;
            }

            if (result.type === "break") {
                throw new Error(
                    `Príkaz "break" možno použiť iba vo vnútri cyklu.`
                );
            }

            if (result.type === "continue") {
                throw new Error(
                    `Príkaz "continue" možno použiť iba vo vnútri cyklu.`
                );
            }

            return null;
        } finally {
            for (const parameter of previousParameterValues) {
                if (parameter.existed) {
                    instance.variables.set(
                        parameter.name,
                        parameter.value
                    );
                } else {
                    instance.variables.delete(
                        parameter.name
                    );
                }
            }

            this.entityContextStack.pop();
            this.localVariablesStack.pop();
        }
    }

    public getEntityInstances(
        entityName: string
    ): EntityInstance[] {
        const instances =
            this.entityInstances.get(entityName);

        if (instances === undefined) {
            throw new Error(`Entita "${entityName}" neexistuje.`);
        }

        return instances;
    }

    public getEntityPositions(
        entityName: string
    ): {
        x: Float32Array;
        y: Float32Array;
    } {
        const instances =
            this.entityInstances.get(entityName);

        if (instances === undefined) {
            throw new Error(`Entita "${entityName}" neexistuje.`);
        }

        const x = new Float32Array(instances.length);
        const y = new Float32Array(instances.length);

        for (let i = 0; i < instances.length; i++) {
            const instance = instances[i];

            const positionX =
                instance.variables.get("x");

            const positionY =
                instance.variables.get("y");

            if (
                typeof positionX !== "number" ||
                typeof positionY !== "number"
            ) {
                throw new Error(
                    `Inštancia entity "${entityName}" ` +
                        `musí mať číselné vlastnosti "x" a "y".`
                );
            }

            x[i] = positionX;
            y[i] = positionY;
        }

        return {
            x,
            y,
        };
    }

    public runFunction(name: string): RuntimeValue {
        return this.executeFunctionCall({
            type: "FunctionCall",
            name,
            arguments: [],
        });
    }

    public initializePatches(
        patchWidth: number,
        patchHeight: number,
        patchCellSize: number
    ): void {
        this.patchWidth = patchWidth;
        this.patchHeight = patchHeight;
        this.patchCellSize = patchCellSize;

        this.globalVariables.set(
            "patchWidth",
            patchWidth
        );

        this.globalVariables.set(
            "patchHeight",
            patchHeight
        );

        this.globalVariables.set(
            "patchCellSize",
            patchCellSize
        );

        const entityDeclaration =
            this.getPatchDeclaration();

        const entityName =
            entityDeclaration.name;

        if (
            !Number.isInteger(patchWidth) ||
            !Number.isInteger(patchHeight) ||
            patchWidth <= 0 ||
            patchHeight <= 0
        ) {
            throw new Error(
                `Rozmery patchovej mriežky musia byť kladné celé čísla.`
            );
        }

        const instances =
            this.entityInstances.get(entityName)!;

        instances.length = 0;

        for (let patchY = 0; patchY < patchHeight; patchY++) {
            for (let patchX = 0; patchX < patchWidth; patchX++) {
                const instance: EntityInstance = {
                    id: this.nextEntityId,
                    entityName,
                    variables: new Variables(),
                };

                this.nextEntityId++;

                instance.variables.set(
                    "id",
                    instance.id
                );

                instance.variables.set(
                    "patchX",
                    patchX
                );

                instance.variables.set(
                    "patchY",
                    patchY
                );

                instance.variables.set(
                    "value",
                    0
                );

                instance.variables.set(
                    "color",
                    "black"
                );

                instances.push(instance);

                this.executeSetup(
                    entityDeclaration,
                    instance
                );
            }
        }
    }

    public getPatchValues(): Float32Array<ArrayBuffer> {
        const entityDeclaration =
            this.getPatchDeclaration();

        const entityName =
            entityDeclaration.name;

        const instances =
            this.entityInstances.get(entityName)!;

        const patchValues =
            new Float32Array(instances.length);

        for (let i = 0; i < instances.length; i++) {
            const value =
                instances[i].variables.get("value");

            if (typeof value !== "number") {
                throw new Error(
                    `Vlastnosť "value" patchu musí byť číslo.`
                );
            }

            patchValues[i] = value;
        }

        return patchValues;
    }

    public getAllAgentPositions(): {
        x: Float32Array<ArrayBuffer>;
        y: Float32Array<ArrayBuffer>;
    } {
        let agentCount = 0;

        for (
            const [entityName, entityDeclaration]
            of this.entityDeclarations
        ) {
            if (entityDeclaration.entityType !== "agent") {
                continue;
            }

            const instances =
                this.entityInstances.get(entityName)!;

            agentCount += instances.length;
        }

        const x = new Float32Array(agentCount);
        const y = new Float32Array(agentCount);

        let outputIndex = 0;

        for (
            const [entityName, entityDeclaration]
            of this.entityDeclarations
        ) {
            if (entityDeclaration.entityType !== "agent") {
                continue;
            }

            const instances =
                this.entityInstances.get(entityName)!;

            for (const instance of instances) {
                const positionX =
                    instance.variables.get("x");

                const positionY =
                    instance.variables.get("y");

                if (
                    typeof positionX !== "number" ||
                    typeof positionY !== "number"
                ) {
                    throw new Error(
                        `Agent entity "${entityName}" musí mať ` +
                            `číselné vlastnosti "x" a "y".`
                    );
                }

                x[outputIndex] = positionX;
                y[outputIndex] = positionY;

                outputIndex++;
            }
        }

        return {
            x,
            y,
        };
    }

    private getPatchDeclaration(): EntityDeclaration {
        let patchDeclaration: EntityDeclaration | null = null;

        for (
            const entityDeclaration
            of this.entityDeclarations.values()
        ) {
            if (entityDeclaration.entityType !== "patch") {
                continue;
            }

            if (patchDeclaration !== null) {
                throw new Error(
                    `Program môže obsahovať iba jednu deklaráciu typu "patch".`
                );
            }

            patchDeclaration = entityDeclaration;
        }

        if (patchDeclaration === null) {
            throw new Error(
                `Program neobsahuje deklaráciu typu "patch".`
            );
        }

        return patchDeclaration;
    }

    private getPatchUnderCurrentAgent(): EntityInstance {
        const currentEntity =
            this.getCurrentEntity();

        if (currentEntity === null) {
            throw new Error(
                `K patchu možno pristupovať iba ` +
                    `v kontexte konkrétneho agenta.`
            );
        }

        const entityDeclaration =
            this.getEntityDeclaration(
                currentEntity.entityName
            );

        if (entityDeclaration.entityType !== "agent") {
            throw new Error(
                `K patchu pod sebou môže pristupovať iba agent.`
            );
        }

        const x =
            currentEntity.variables.get("x");

        const y =
            currentEntity.variables.get("y");

        if (
            typeof x !== "number" ||
            typeof y !== "number"
        ) {
            throw new Error(
                `Agent musí mať číselné vlastnosti "x" a "y".`
            );
        }

        if (this.patchCellSize <= 0) {
            throw new Error(
                `Patchová mriežka nebola inicializovaná.`
            );
        }

        const patchX =
            Math.floor(x / this.patchCellSize);

        const patchY =
            Math.floor(y / this.patchCellSize);

        if (
            patchX < 0 ||
            patchX >= this.patchWidth ||
            patchY < 0 ||
            patchY >= this.patchHeight
        ) {
            throw new Error(
                `Agent sa nachádza mimo patchovej mriežky.`
            );
        }

        const patchDeclaration =
            this.getPatchDeclaration();

        const instances =
            this.entityInstances.get(
                patchDeclaration.name
            )!;

        const patchIndex =
            patchY * this.patchWidth + patchX;

        return instances[patchIndex];
    }

    private executePatchValue(
        functionCall: FunctionCall
    ): RuntimeValue {
        if (functionCall.arguments.length !== 1) {
            throw new Error(
                `Funkcia "patch_value" očakáva presne 1 argument.`
            );
        }

        const propertyName =
            this.evaluateExpression(
                functionCall.arguments[0]
            );

        if (typeof propertyName !== "string") {
            throw new Error(
                `Argument funkcie "patch_value" musí byť text.`
            );
        }

        const patch =
            this.getPatchUnderCurrentAgent();

        return patch.variables.get(propertyName);
    }

    private executeSetPatchValue(
        functionCall: FunctionCall
    ): RuntimeValue {
        if (functionCall.arguments.length !== 2) {
            throw new Error(
                `Funkcia "set_patch_value" očakáva presne 2 argumenty.`
            );
        }

        const propertyName =
            this.evaluateExpression(
                functionCall.arguments[0]
            );

        if (typeof propertyName !== "string") {
            throw new Error(
                `Prvý argument funkcie "set_patch_value" musí byť text.`
            );
        }

        const value =
            this.evaluateExpression(
                functionCall.arguments[1]
            );

        const patch =
            this.getPatchUnderCurrentAgent();

        patch.variables.set(
            propertyName,
            value
        );

        return null;
    }

    private executeCanMove(
        expression: FunctionCall
    ): RuntimeValue {
        if (expression.arguments.length !== 1) {
            throw new Error(
                'Funkcia "can_move" očakáva jeden argument.'
            );
        }

        const currentEntity =
            this.getCurrentEntity();

        if (currentEntity === null) {
            throw new Error(
                'Funkciu "can_move" možno volať iba pre agenta.'
            );
        }

        const distance = this.evaluateExpression(
            expression.arguments[0]
        );

        if (typeof distance !== "number") {
            throw new Error(
                'Argument funkcie "can_move" musí byť číslo.'
            );
        }

        const x = currentEntity.variables.get("x");
        const y = currentEntity.variables.get("y");
        const direction =
            currentEntity.variables.get("direction");

        if (
            typeof x !== "number" ||
            typeof y !== "number" ||
            typeof direction !== "number"
        ) {
            throw new Error(
                'Agent musí mať číselné premenné "x", "y" a "direction".'
            );
        }

        const angleInRadians =
            (direction * Math.PI) / 180;

        const newX =
            x + Math.cos(angleInRadians) * distance;

        const newY =
            y + Math.sin(angleInRadians) * distance;

        return (
            newX >= 0 &&
            newX < this.patchWidth * this.patchCellSize &&
            newY >= 0 &&
            newY < this.patchHeight * this.patchCellSize
        );
    }

    private executeEvaporate(
        functionCall: FunctionCall
    ): RuntimeValue {
        if (functionCall.arguments.length !== 2) {
            throw new Error(
                'Funkcia "evaporate" očakáva presne 2 argumenty.'
            );
        }

        const propertyName =
            this.evaluateExpression(
                functionCall.arguments[0]
            );

        const rate =
            this.evaluateExpression(
                functionCall.arguments[1]
            );

        if (typeof propertyName !== "string") {
            throw new Error(
                'Prvý argument funkcie "evaporate" musí byť text.'
            );
        }

        if (typeof rate !== "number") {
            throw new Error(
                'Druhý argument funkcie "evaporate" musí byť číslo.'
            );
        }

        if (rate < 0 || rate > 1) {
            throw new Error(
                'Miera vyparovania musí byť číslo od 0 do 1.'
            );
        }

        const patchDeclaration =
            this.getPatchDeclaration();

        const patches =
            this.entityInstances.get(
                patchDeclaration.name
            )!;

        for (const patch of patches) {
            const oldValue =
                patch.variables.get(propertyName);

            if (typeof oldValue !== "number") {
                throw new Error(
                    `Vlastnosť "${propertyName}" patchu musí byť číslo.`
                );
            }

            const newValue =
                oldValue * (1 - rate);

            patch.variables.set(
                propertyName,
                newValue
            );
        }

        return null;
    }

    private executePatchValueAtAngle(
        functionCall: FunctionCall
    ): RuntimeValue {
        if (functionCall.arguments.length !== 3) {
            throw new Error(
                'Funkcia "patch_value_at_angle" očakáva presne 3 argumenty.'
            );
        }

        const propertyName =
            this.evaluateExpression(
                functionCall.arguments[0]
            );

        const relativeAngle =
            this.evaluateExpression(
                functionCall.arguments[1]
            );

        const distance =
            this.evaluateExpression(
                functionCall.arguments[2]
            );

        if (typeof propertyName !== "string") {
            throw new Error(
                'Prvý argument funkcie "patch_value_at_angle" musí byť text.'
            );
        }

        if (typeof relativeAngle !== "number") {
            throw new Error(
                'Druhý argument funkcie "patch_value_at_angle" musí byť číslo.'
            );
        }

        if (typeof distance !== "number") {
            throw new Error(
                'Tretí argument funkcie "patch_value_at_angle" musí byť číslo.'
            );
        }

        if (distance < 0) {
            throw new Error(
                'Vzdialenosť vo funkcii "patch_value_at_angle" nesmie byť záporná.'
            );
        }

        const currentEntity =
            this.getCurrentEntity();

        if (currentEntity === null) {
            throw new Error(
                'Funkciu "patch_value_at_angle" možno volať iba v kontexte agenta.'
            );
        }

        const entityDeclaration =
            this.getEntityDeclaration(
                currentEntity.entityName
            );

        if (entityDeclaration.entityType !== "agent") {
            throw new Error(
                'Funkciu "patch_value_at_angle" možno použiť iba pre agenta.'
            );
        }

        const x =
            currentEntity.variables.get("x");

        const y =
            currentEntity.variables.get("y");

        const direction =
            currentEntity.variables.get(
                "direction"
            );

        if (
            typeof x !== "number" ||
            typeof y !== "number" ||
            typeof direction !== "number"
        ) {
            throw new Error(
                'Agent musí mať číselné vlastnosti "x", "y" a "direction".'
            );
        }

        if (this.patchCellSize <= 0) {
            throw new Error(
                "Patchová mriežka nebola inicializovaná."
            );
        }

        const absoluteAngle =
            direction + relativeAngle;

        const radians =
            absoluteAngle * Math.PI / 180;

        const distanceInPixels =
            distance * this.patchCellSize;

        const targetX =
            x + Math.cos(radians) * distanceInPixels;

        const targetY =
            y + Math.sin(radians) * distanceInPixels;

        const patchX =
            Math.floor(
                targetX / this.patchCellSize
            );

        const patchY =
            Math.floor(
                targetY / this.patchCellSize
            );

        if (
            patchX < 0 ||
            patchX >= this.patchWidth ||
            patchY < 0 ||
            patchY >= this.patchHeight
        ) {
            return 0;
        }

        const patchDeclaration =
            this.getPatchDeclaration();

        const patches =
            this.entityInstances.get(
                patchDeclaration.name
            )!;

        const patchIndex =
            patchY * this.patchWidth + patchX;

        const patch =
            patches[patchIndex];

        return patch.variables.get(
            propertyName
        );
    }

    private executeDiffuse(
        functionCall: FunctionCall
    ): RuntimeValue {
        if (functionCall.arguments.length !== 2) {
            throw new Error(
                'Funkcia "diffuse" očakáva presne 2 argumenty.'
            );
        }

        const propertyName =
            this.evaluateExpression(
                functionCall.arguments[0]
            );

        const rate =
            this.evaluateExpression(
                functionCall.arguments[1]
            );

        if (typeof propertyName !== "string") {
            throw new Error(
                'Prvý argument funkcie "diffuse" musí byť text.'
            );
        }

        if (typeof rate !== "number") {
            throw new Error(
                'Druhý argument funkcie "diffuse" musí byť číslo.'
            );
        }

        if (rate < 0 || rate > 1) {
            throw new Error(
                'Miera rozptylu musí byť číslo od 0 do 1.'
            );
        }

        const patchDeclaration =
            this.getPatchDeclaration();

        const patches =
            this.entityInstances.get(
                patchDeclaration.name
            )!;

        const oldValues: number[] = [];

        for (const patch of patches) {
            const value =
                patch.variables.get(propertyName);

            if (typeof value !== "number") {
                throw new Error(
                    `Vlastnosť "${propertyName}" patchu musí byť číslo.`
                );
            }

            oldValues.push(value);
        }

        const newValues =
            new Array<number>(
                patches.length
            ).fill(0);

        for (
            let patchY = 0;
            patchY < this.patchHeight;
            patchY++
        ) {
            for (
                let patchX = 0;
                patchX < this.patchWidth;
                patchX++
            ) {
                const patchIndex =
                    patchY * this.patchWidth +
                    patchX;

                const oldValue =
                    oldValues[patchIndex];

                const neighbours: number[] = [];

                for (
                    let offsetY = -1;
                    offsetY <= 1;
                    offsetY++
                ) {
                    for (
                        let offsetX = -1;
                        offsetX <= 1;
                        offsetX++
                    ) {
                        if (
                            offsetX === 0 &&
                            offsetY === 0
                        ) {
                            continue;
                        }

                        const neighbourX =
                            patchX + offsetX;

                        const neighbourY =
                            patchY + offsetY;

                        if (
                            neighbourX < 0 ||
                            neighbourX >=
                                this.patchWidth ||
                            neighbourY < 0 ||
                            neighbourY >=
                                this.patchHeight
                        ) {
                            continue;
                        }

                        const neighbourIndex =
                            neighbourY *
                                this.patchWidth +
                            neighbourX;

                        neighbours.push(
                            neighbourIndex
                        );
                    }
                }

                if (neighbours.length === 0) {
                    newValues[patchIndex] +=
                        oldValue;

                    continue;
                }

                const distributedValue =
                    oldValue * rate;

                const remainingValue =
                    oldValue - distributedValue;

                newValues[patchIndex] +=
                    remainingValue;

                const valueForNeighbour =
                    distributedValue /
                    neighbours.length;

                for (
                    const neighbourIndex
                    of neighbours
                ) {
                    newValues[neighbourIndex] +=
                        valueForNeighbour;
                }
            }
        }

        for (
            let i = 0;
            i < patches.length;
            i++
        ) {
            patches[i].variables.set(
                propertyName,
                newValues[i]
            );
        }

        return null;
    }

    private executeDistanceTo(
        functionCall: FunctionCall
    ): RuntimeValue {
        if (functionCall.arguments.length !== 2) {
            throw new Error(
                'Funkcia "distance_to" očakáva presne 2 argumenty.'
            );
        }

        const targetX =
            this.evaluateExpression(
                functionCall.arguments[0]
            );

        const targetY =
            this.evaluateExpression(
                functionCall.arguments[1]
            );

        if (
            typeof targetX !== "number" ||
            typeof targetY !== "number"
        ) {
            throw new Error(
                'Argumenty funkcie "distance_to" musia byť čísla.'
            );
        }

        const currentEntity =
            this.getCurrentEntity();

        if (currentEntity === null) {
            throw new Error(
                'Funkciu "distance_to" možno volať iba v kontexte entity.'
            );
        }

        const entityDeclaration =
            this.getEntityDeclaration(
                currentEntity.entityName
            );

        let x: RuntimeValue;
        let y: RuntimeValue;

        if (entityDeclaration.entityType === "agent") {
            x = currentEntity.variables.get("x");
            y = currentEntity.variables.get("y");
        } else if (
            entityDeclaration.entityType === "patch"
        ) {
            x = currentEntity.variables.get("patchX");
            y = currentEntity.variables.get("patchY");
        } else {
            throw new Error(
                'Funkciu "distance_to" možno použiť iba pre agenta alebo patch.'
            );
        }

        if (
            typeof x !== "number" ||
            typeof y !== "number"
        ) {
            throw new Error(
                "Entita nemá platné číselné súradnice."
            );
        }

        const differenceX =
            targetX - x;

        const differenceY =
            targetY - y;

        return Math.sqrt(
            differenceX * differenceX +
            differenceY * differenceY
        );
    }

    private executeFace(
        functionCall: FunctionCall
    ): RuntimeValue {
        if (functionCall.arguments.length !== 2) {
            throw new Error(
                'Funkcia "face" očakáva presne 2 argumenty.'
            );
        }

        const targetX =
            this.evaluateExpression(
                functionCall.arguments[0]
            );

        const targetY =
            this.evaluateExpression(
                functionCall.arguments[1]
            );

        if (
            typeof targetX !== "number" ||
            typeof targetY !== "number"
        ) {
            throw new Error(
                'Argumenty funkcie "face" musia byť čísla.'
            );
        }

        const currentEntity =
            this.getCurrentEntity();

        if (currentEntity === null) {
            throw new Error(
                'Funkciu "face" možno volať iba v kontexte agenta.'
            );
        }

        const entityDeclaration =
            this.getEntityDeclaration(
                currentEntity.entityName
            );

        if (entityDeclaration.entityType !== "agent") {
            throw new Error(
                'Funkciu "face" možno použiť iba pre agenta.'
            );
        }

        const x =
            currentEntity.variables.get("x");

        const y =
            currentEntity.variables.get("y");

        if (
            typeof x !== "number" ||
            typeof y !== "number"
        ) {
            throw new Error(
                'Agent musí mať číselné vlastnosti "x" a "y".'
            );
        }

        const differenceX =
            targetX - x;

        const differenceY =
            targetY - y;

        if (
            differenceX === 0 &&
            differenceY === 0
        ) {
            return null;
        }

        const radians =
            Math.atan2(
                differenceY,
                differenceX
            );

        let direction =
            radians * 180 / Math.PI;

        if (direction < 0) {
            direction += 360;
        }

        currentEntity.variables.set(
            "direction",
            direction
        );

        return null;
    }

    public getPatchColors(): Uint32Array<ArrayBuffer> {
        const patchDeclaration =
            this.getPatchDeclaration();

        const patches =
            this.entityInstances.get(
                patchDeclaration.name
            )!;

        const patchColors =
            new Uint32Array(patches.length);

        for (
            let i = 0;
            i < patches.length;
            i++
        ) {
            const color =
                patches[i].variables.get("color");

            if (typeof color !== "string") {
                throw new Error(
                    'Vlastnosť "color" patchu musí byť text.'
                );
            }

            switch (color) {
                case "black":
                    patchColors[i] = 0x111827;
                    break;

                case "green":
                    patchColors[i] = 0x22c55e;
                    break;

                case "violet":
                    patchColors[i] = 0xa855f7;
                    break;

                case "cyan":
                    patchColors[i] = 0x22d3ee;
                    break;

                case "sky":
                    patchColors[i] = 0x38bdf8;
                    break;

                case "blue":
                    patchColors[i] = 0x2563eb;
                    break;
                
                case "red":
                    patchColors[i] = 0xef4444;
                    break;

                default:
                    throw new Error(
                        `Neznáma farba patchu "${color}".`
                    );
            }
        }

        return patchColors;
    }

    private executeCountNeighbors(
        functionCall: FunctionCall
    ): RuntimeValue {
        if (functionCall.arguments.length !== 2) {
            throw new Error(
                'Funkcia "count_neighbors" očakáva presne 2 argumenty.'
            );
        }

        const propertyName =
            this.evaluateExpression(
                functionCall.arguments[0]
            );

        const searchedValue =
            this.evaluateExpression(
                functionCall.arguments[1]
            );

        if (typeof propertyName !== "string") {
            throw new Error(
                'Prvý argument funkcie "count_neighbors" musí byť text.'
            );
        }

        const currentEntity =
            this.getCurrentEntity();

        if (currentEntity === null) {
            throw new Error(
                'Funkciu "count_neighbors" možno volať iba v kontexte patchu.'
            );
        }

        const entityDeclaration =
            this.getEntityDeclaration(
                currentEntity.entityName
            );

        if (entityDeclaration.entityType !== "patch") {
            throw new Error(
                'Funkciu "count_neighbors" možno použiť iba pre patch.'
            );
        }

        const patchX =
            currentEntity.variables.get("patchX");

        const patchY =
            currentEntity.variables.get("patchY");

        if (
            typeof patchX !== "number" ||
            typeof patchY !== "number"
        ) {
            throw new Error(
                'Patch musí mať číselné vlastnosti "patchX" a "patchY".'
            );
        }

        const patches =
            this.entityInstances.get(
                currentEntity.entityName
            )!;

        let count = 0;

        for (
            let offsetY = -1;
            offsetY <= 1;
            offsetY++
        ) {
            for (
                let offsetX = -1;
                offsetX <= 1;
                offsetX++
            ) {
                if (
                    offsetX === 0 &&
                    offsetY === 0
                ) {
                    continue;
                }

                if (
                    Math.abs(offsetX) +
                    Math.abs(offsetY) !==
                    1
                ) {
                    continue;
                }

                const neighbourX =
                    patchX + offsetX;

                const neighbourY =
                    patchY + offsetY;

                if (
                    neighbourX < 0 ||
                    neighbourX >= this.patchWidth ||
                    neighbourY < 0 ||
                    neighbourY >= this.patchHeight
                ) {
                    continue;
                }

                const neighbourIndex =
                    neighbourY *
                        this.patchWidth +
                    neighbourX;

                const neighbour =
                    patches[neighbourIndex];

                const neighbourValue =
                    neighbour.variables.get(
                        propertyName
                    );

                if (
                    neighbourValue ===
                    searchedValue
                ) {
                    count++;
                }
            }
        }

        return count;
    }

}