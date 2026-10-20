<script lang="ts">
	import { imageKitUrl } from '#ui/lib/image-kit.js';
	import { PALETTES } from '#constants/PALETTES.js';
	import * as Avatar from '#ui/primitives-new/avatar/index.js';

	const getNumber = (name: string) => {
		const charactersArray = Array.from(name);
		let charactersCodesSum = 0;

		charactersArray.forEach((charactersArrayItem) => {
			return (charactersCodesSum += charactersArrayItem.charCodeAt(0));
		});

		return charactersCodesSum;
	};

	const getDigit = (number: number, ntn: number) => {
		return Math.floor((number / Math.pow(10, ntn)) % 10);
	};

	const getBoolean = (number: number, ntn: number) => {
		return !(getDigit(number, ntn) % 2);
	};

	const getUnit = (number: number, range: number, index?: number) => {
		let value = number % range;

		if (index && getDigit(number, index) % 2 === 0) {
			return -value;
		} else return value;
	};

	const getRandomColor = (number: number, colors: string[], range: number) => {
		return colors[number % range];
	};

	interface Props {
		src?: string;
		alt: string;
		size: number;
		identifier?: string;
		variant?: 'circle' | 'rounded' | 'square';
		colors?: string[];
		class?: string;
	}

	let {
		src = undefined,
		alt,
		size,
		identifier = 'identifier',
		variant = 'circle',
		colors = PALETTES[11],
		class: className = '',
		...restProps
	}: Props = $props();

	const borderRadius = $derived(variant === 'circle' ? size / 2 : variant === 'rounded' ? 8 : 0);

	const ELEMENTS = 4;
	const SIZE = 80;

	function generateColors(identifier: string, colors: string[]) {
		const numFromName = getNumber(identifier);
		const range = colors && colors.length;

		const elementsProperties = Array.from({ length: ELEMENTS }, (_, i) => ({
			color: getRandomColor(numFromName + i, colors, range),
			translateX: getUnit(numFromName * (i + 1), SIZE / 2 - (i + 17), 1),
			translateY: getUnit(numFromName * (i + 1), SIZE / 2 - (i + 17), 2),
			rotate: getUnit(numFromName * (i + 1), 360),
			isSquare: getBoolean(numFromName, 2)
		}));

		return elementsProperties;
	}

	// Using $derived for properties that depend on reactive props
	const properties = $derived(generateColors(identifier, colors));
	// Per instance: a shared id resolves to the first mask in the document, whose corner
	// radius belongs to some other avatar's size.
	// (`$props.id()` is only valid as the whole initializer of a declaration.)
	const uid = $props.id();
	const maskId = `avatar-mask-${uid}`;
</script>

<div class="bg-card shrink-0" style={`border-radius: ${borderRadius}px`}>
	<Avatar.Root
		class={className}
		style={`height: ${size}px; width: ${size}px; border-radius: ${borderRadius}px`}
		{...restProps}>
		<!-- No photo, no `<img>`: an empty `src` asks the browser for the page itself. -->
		{#if src}
			<Avatar.Image src={imageKitUrl(src, `w-${size * 2}`)} {alt} />
		{/if}
		<Avatar.Fallback>
			<!-- Without a photo the drawing stands for the person: it carries the name. -->
			<svg
				role={alt ? 'img' : undefined}
				aria-label={alt || undefined}
				aria-hidden={alt ? undefined : true}
				viewBox={'0 0 ' + SIZE + ' ' + SIZE}
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				width={size}
				height={size}
				data-testid="avatar-bauhaus"
				style={`width: ${size}px; height: ${size}px`}>
				<mask id={maskId} maskUnits="userSpaceOnUse" x={0} y={0} width={SIZE} height={SIZE}>
					<rect width={SIZE} height={SIZE} fill="white" />
				</mask>
				<g mask="url(#{maskId})">
					<rect width={SIZE} height={SIZE} fill={properties[0].color} />
					<rect
						x={(SIZE - 60) / 2}
						y={(SIZE - 20) / 2}
						width={SIZE}
						height={properties[1].isSquare ? SIZE : SIZE / 8}
						fill={properties[1].color}
						transform={'translate(' +
							properties[1].translateX +
							' ' +
							properties[1].translateY +
							') rotate(' +
							properties[1].rotate +
							' ' +
							SIZE / 2 +
							' ' +
							SIZE / 2 +
							')'} />
					<circle
						cx={SIZE / 2}
						cy={SIZE / 2}
						fill={properties[2].color}
						r={SIZE / 5}
						transform={'translate(' +
							properties[2].translateX +
							' ' +
							properties[2].translateY +
							')'} />
					<line
						x1={0}
						y1={SIZE / 2}
						x2={SIZE}
						y2={SIZE / 2}
						stroke-width={2}
						stroke={properties[3].color}
						transform={'translate(' +
							properties[3].translateX +
							' ' +
							properties[3].translateY +
							') rotate(' +
							properties[3].rotate +
							' ' +
							SIZE / 2 +
							' ' +
							SIZE / 2 +
							')'} />
				</g>
			</svg>
		</Avatar.Fallback>
	</Avatar.Root>
</div>
