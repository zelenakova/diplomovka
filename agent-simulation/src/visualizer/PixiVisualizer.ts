import * as PIXI from "pixi.js";
import type { SimulationSnapshot } from "../shared/SimulationSnapshot";

export class PixiVisualizer {
	private app: PIXI.Application;
	private patchGraphics: PIXI.Graphics;
	private agentGraphics: PIXI.Graphics;
	private initialized = false;

	constructor() {
		this.app = new PIXI.Application();
		this.patchGraphics = new PIXI.Graphics();
		this.agentGraphics = new PIXI.Graphics();
	}

	async initialize(
		container: HTMLElement,
		width: number,
		height: number
	): Promise<void> {
		await this.app.init({
			width,
			height,
			background: "#111827",
			antialias: false,
		});

		container.appendChild(this.app.canvas);

		this.app.stage.addChild(this.patchGraphics);
		this.app.stage.addChild(this.agentGraphics);

		this.initialized = true;
	}

	render(snapshot: SimulationSnapshot): void {
		if (!this.initialized) return;

		this.renderPatches(snapshot);
		this.renderAgents(snapshot);
	}

	private renderPatches(snapshot: SimulationSnapshot): void {
		this.patchGraphics.clear();

		for (let y = 0; y < snapshot.patchHeight; y++) {
			for (let x = 0; x < snapshot.patchWidth; x++) {
				const index = y * snapshot.patchWidth + x;
				const value = snapshot.patchValues[index];

				if (value <= 0.01) continue;

				const alpha = Math.min(value, 1);

				const color =
					snapshot.patchColors[index];

				this.patchGraphics.fill({
					color,
					alpha,
				});

				this.patchGraphics.rect(
					x * snapshot.patchCellSize,
					y * snapshot.patchCellSize,
					snapshot.patchCellSize,
					snapshot.patchCellSize
				);

				this.patchGraphics.fill();
			}
		}
	}

	private renderAgents(snapshot: SimulationSnapshot): void {
		this.agentGraphics.clear();

		this.agentGraphics.fill("#38bdf8");

		for (let i = 0; i < snapshot.agentCount; i++) {
			this.agentGraphics.circle(snapshot.x[i], snapshot.y[i], 2);
		}

		this.agentGraphics.fill();
	}
}