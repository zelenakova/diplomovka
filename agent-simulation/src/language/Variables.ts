import type { EntityInstance } from "./EntityInstance.ts";

export type RuntimeValue =
	| number
	| string
	| boolean
	| null
	| EntityInstance
	| RuntimeValue[];

export class Variables {
	private values: Map<string, RuntimeValue>;

	constructor() {
		this.values = new Map();
	}

	public set(name: string, value: RuntimeValue): void {
		this.values.set(name, value);
	}

	public has(name: string): boolean {
		return this.values.has(name);
	}

	public get(name: string): RuntimeValue {
		if (!this.values.has(name)) {
			throw new Error(`Premenná "${name}" neexistuje.`);
		}

		return this.values.get(name)!;
	}

	public delete(name: string): void {
		this.values.delete(name);
	}
}