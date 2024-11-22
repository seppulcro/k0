import { useContext } from "preact/hooks";
import { GlobalContext } from "..";

export function Footer() {
	const globalContext = useContext(GlobalContext);
	return (
		<footer
			style={{
				display: globalContext.compact.value === true ? "none" : "block",
			}}
		>
			<small>
				<div>
					<span className="muted">
						Inspired by{" "}
						<a href="https://github.com/SecretPocketCat/layout_overlay">
							{" "}
							SecretPocketCat/layout_overlay
						</a>
					</span>
				</div>
				<div>
					<span className="muted">
						<a
							target="_blank"
							rel="noreferrer"
							href="https://iconscout.com/free-icon/shortcuts-6512429"
						>
							Tab Key{" "}
						</a>
						icon by{" "}
						<a
							target="_blank"
							rel="noreferrer"
							href="https://iconscout.com/contributors/flat-icons"
						>
							Flat-icons.com
						</a>
					</span>
				</div>
				<div>
					<span className="muted">
						Created with{" "}
						<a href="https://github.com/caksoylar/keymap-drawer">
							keymap-drawer
						</a>
					</span>
				</div>
			</small>
		</footer>
	);
}
