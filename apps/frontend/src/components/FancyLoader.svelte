<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		size?: number;
		label?: string;
		showLabel?: boolean;
		maxLength?: number;
		class?: string;
	}

	const gridSize = 6;
	const cellCount = gridSize * gridSize;
	const moveDelay = 220;
	const initialSnakeCells = [14, 13, 12];
	const cells = Array.from({ length: cellCount }, (_, cell) => cell);

	let {
		size = 96,
		label = 'Yükleniyor',
		showLabel = false,
		maxLength = 18,
		class: className = ''
	}: Props = $props();
	let snakeCells = $state(initialSnakeCells);
	let foodCell = $state(16);

	function restart() {
		snakeCells = initialSnakeCells;
		foodCell = getNextFoodCell(initialSnakeCells);
	}

	function getRow(cell: number) {
		return Math.floor(cell / gridSize);
	}

	function getCol(cell: number) {
		return cell % gridSize;
	}

	function getDistance(from: number, to: number) {
		return Math.abs(getRow(from) - getRow(to)) + Math.abs(getCol(from) - getCol(to));
	}

	function getNeighbors(cell: number, targetCell = foodCell) {
		const row = getRow(cell);
		const col = getCol(cell);
		const neighbors: number[] = [];

		if (row > 0) neighbors.push(cell - gridSize);
		if (col < gridSize - 1) neighbors.push(cell + 1);
		if (row < gridSize - 1) neighbors.push(cell + gridSize);
		if (col > 0) neighbors.push(cell - 1);

		return neighbors.sort((a, b) => getDistance(a, targetCell) - getDistance(b, targetCell));
	}

	function findShortestPath(start: number, target: number, blockedCells: Set<number>) {
		const queue = [start];
		const visited = new Set([start]);
		const previous = new Map<number, number>();

		while (queue.length > 0) {
			const current = queue.shift();

			if (current === undefined) break;

			if (current === target) {
				const path: number[] = [current];
				let cursor = current;

				while (previous.has(cursor)) {
					cursor = previous.get(cursor)!;
					path.unshift(cursor);
				}

				return path;
			}

			for (const neighbor of getNeighbors(current, target)) {
				if (visited.has(neighbor) || blockedCells.has(neighbor)) continue;

				visited.add(neighbor);
				previous.set(neighbor, current);
				queue.push(neighbor);
			}
		}

		return null;
	}

	function getSafeFallbackMove() {
		const head = snakeCells[0];
		const blockedCells = new Set(snakeCells.slice(1));

		return getNeighbors(head).find((neighbor) => !blockedCells.has(neighbor)) ?? head;
	}

	function getNextFoodCell(nextSnakeCells: number[]) {
		const occupiedCells = new Set(nextSnakeCells);
		const openCells = cells.filter((cell) => !occupiedCells.has(cell));

		if (openCells.length === 0) return foodCell;

		const candidates = openCells.filter((cell) => cell !== foodCell);
		const pool = candidates.length > 0 ? candidates : openCells;

		return pool[Math.floor(Math.random() * pool.length)];
	}

	const tick = () => {
		const head = snakeCells[0];
		const blockedCells = new Set(snakeCells.slice(1));
		const shortestPath = findShortestPath(head, foodCell, blockedCells);
		const nextHead = shortestPath?.[1] ?? getSafeFallbackMove();
		const cappedMaxLength = Math.max(1, Math.min(maxLength, cellCount));

		if (nextHead === head) {
			restart();
			return;
		}

		const ateFood = nextHead === foodCell;
		const nextLength =
			ateFood && snakeCells.length < cappedMaxLength
				? snakeCells.length + 1
				: Math.min(snakeCells.length, cappedMaxLength);
		const nextSnakeCells = [nextHead, ...snakeCells].slice(0, nextLength);

		snakeCells = nextSnakeCells;

		if (ateFood) {
			foodCell = getNextFoodCell(nextSnakeCells);
		}
	};

	function getCellState(cell: number) {
		const segmentIndex = snakeCells.indexOf(cell);

		if (segmentIndex === 0) return 'head';
		if (segmentIndex > 0) return 'body';
		if (cell === foodCell) return 'food';

		return 'empty';
	}

	onMount(() => {
		const interval = window.setInterval(tick, moveDelay);

		return () => window.clearInterval(interval);
	});
</script>

<!-- The board is one sticker: ink outline + hard offset from `pop`, and the press
     interaction from `pop-press` (it has to sit on the button, since `:active` never
     reaches a descendant). Everything inside is flat pixels — the outline around the
     whole thing is what carries the treatment. -->
<button
	type="button"
	class={`fancy-loader pop pop-press bg-paper ${className}`}
	aria-label={`${label}. Animasyonu yeniden başlat`}
	style={`--loader-size: ${size}px;`}
	onclick={restart}>
	<div class="board" aria-hidden="true">
		{#each cells as cell, index (index)}
			<span class={`cell ${getCellState(cell)}`}></span>
		{/each}
	</div>

	{#if showLabel}
		<span class="eyebrow">{label}</span>
	{/if}
</button>

<style>
	.fancy-loader {
		appearance: none;
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		/* `--radius` (12px), the same corner the header's icon buttons take. */
		border-radius: var(--radius);
		padding: max(5px, calc(var(--loader-size) * 0.07));
		color: var(--ink);
		cursor: pointer;
	}

	.fancy-loader:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: 4px;
	}

	.board {
		display: grid;
		width: var(--loader-size);
		height: var(--loader-size);
		grid-template-columns: repeat(6, minmax(0, 1fr));
		grid-template-rows: repeat(6, minmax(0, 1fr));
		gap: max(2px, calc(var(--loader-size) * 0.04));
	}

	/* The empty cells *are* the grid, and they take `--tint` rather than a percentage of
	   ink: a translucent ink wash over paper samples as a cold grey and drains the warmth
	   out of the whole board. No radius worth the name and no transition either — the
	   snake snaps a whole cell per tick, and a tweened fade between cells reads as a
	   smear against a design with no soft edges anywhere. */
	.cell {
		border-radius: 1px;
		background: var(--tint);
	}

	.cell.body {
		background: var(--primary);
	}

	/* Head takes the ink fill for the same reason a selected chip does: state is stated
	   by the ground colour, never by an outline and never by a glow. */
	.cell.head {
		background: var(--ink);
	}

	/* Food is an ink diamond that blinks on `steps()` — hard on/off, no fade. */
	.cell.food {
		background: var(--ink);
		transform: rotate(45deg) scale(0.62);
		animation: blink-food 720ms steps(1, end) infinite;
	}

	@keyframes blink-food {
		0%,
		50% {
			opacity: 1;
		}

		50.01%,
		100% {
			opacity: 0.3;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.cell.food {
			animation: none;
		}
	}
</style>
