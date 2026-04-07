import "./style.css";

interface Props {
	pos: number;
	x: number;
	y: number;
	tap: string;
	hold?: string;
	shifted?: string;
	pressed?: boolean;
	layerHeld?: boolean;
	onClick?: () => void;
}

function KeyText({ y, cls, label }: { y: number; cls: string; label: string }) {
	const words = label.split(" ");
	if (words.length >= 2) {
		return (
			<text x={0} y={y} class={cls}>
				<tspan x="0" dy="-0.0em">
					{words[0]}
				</tspan>
				<tspan x="0" dy="1.2em">
					{words.slice(1).join(" ")}
				</tspan>
			</text>
		);
	}
	return (
		<text x={0} y={y} class={cls}>
			{label}
		</text>
	);
}

export function KeyButton({
	pos,
	x,
	y,
	tap,
	hold,
	shifted,
	pressed,
	layerHeld,
	onClick,
}: Props) {
	const cls = [
		"key",
		`keypos-${pos}`,
		pressed && "key-pressed",
		layerHeld && "key-layer-held",
	]
		.filter(Boolean)
		.join(" ");

	return (
		<g
			transform={`translate(${x}, ${y})`}
			class={cls}
			onClick={onClick}
			style={onClick ? "cursor:pointer" : undefined}
		>
			<rect
				rx={6}
				ry={6}
				x={-26}
				y={-26}
				width={52}
				height={52}
				class="key side"
			/>
			<rect rx={4} ry={4} x={-20} y={-24} width={40} height={40} class="key" />
			{shifted && <KeyText y={-24} cls="key shifted" label={shifted} />}
			{tap && <KeyText y={-4} cls="key tap" label={tap} />}
			{hold && <KeyText y={24} cls="key hold" label={hold} />}
		</g>
	);
}
