<script>
	/* - color (string, default: "bg-primary"):
			- Tailwind class: e.g. "bg-red-500", "bg-green-400"
			- Custom CSS color: e.g. "#ff00aa", "rgb(20,200,50)"
	*/
	const { size = 8, color = 'bg-primary', class: className } = $props();
</script>

<div
	class={['rounded-full shrink-0', color.startsWith('bg-') && color, className]}
	style={`
    width:${size}px;
    height:${size}px;
    ${!color.startsWith('bg-') ? `background:${color};` : ''}
  `}>
</div>
