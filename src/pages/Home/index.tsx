import keymap from "@assets/keymap.svg";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { Suspense } from "preact/compat";
import "./style.css";
import keymap_config from "@assets/my_config.yaml?raw";
import { load } from "js-yaml";

const config = load(keymap_config);

export function Home() {
	const {
		key_h,
		split_gap,
		combo_h,
		inner_pad_h,
		outer_pad_h,
		small_pad,
		key_side_pars: { ry, rel_y },
	} = config.draw_config;
	const blockSize =
		key_h * ry +
		outer_pad_h +
		split_gap +
		combo_h +
		rel_y * ry +
		inner_pad_h +
		small_pad;
	return (
		<Suspense
			fallback={
				<DotLottieReact
					src="https://lottie.host/1e0c2e4b-b1df-4db8-8426-89daee71b388/dLQWtx4fIk.lottie"
					loop
					autoplay
				/>
			}
		>
			<section
				className={"flex justify-center keymap-container"}
				style={{
					maxHeight: `${blockSize}px`,
				}}
			>
				<img src={keymap} aria-label="Keymap" />
			</section>
		</Suspense>
	);
}
