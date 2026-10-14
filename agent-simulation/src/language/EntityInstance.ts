import { Variables } from "./Variables.ts";

export interface EntityInstance {
	id: number;
	entityName: string;
	variables: Variables;
}