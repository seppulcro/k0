import { useLocation } from "preact-iso";
import { useContext } from "preact/hooks";
import { GlobalContext } from "..";
import { getVersion } from "@tauri-apps/api/app";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
const appVersion = await getVersion();

export function Header() {
	const { url } = useLocation();
	const globalContext = useContext(GlobalContext);
	return (
		<header style={{ margin: 0 }}>
			<menu
				style={{
					display: globalContext.compact.value === true ? "none" : "block",
				}}
			>
				<li>
					k0
					<menu>
						<li>Settings</li>
						<li>
							About
							<menu>
								<li>
									<a
										href="https://github.com/seppulcro"
										target={"_blank"}
										rel={"noreferrer"}
									>
										seppulcro
									</a>
								</li>
								<li className="disabled">{appVersion}</li>
							</menu>
						</li>
						<li
							onPointerUp={async (e) => {
								console.log("Hello");
								await getCurrentWebviewWindow().destroy();
							}}
						>
							Quit
						</li>
					</menu>
				</li>
				<li className={url === "/" && "selected"}>
					<a href="/">Home</a>
				</li>
			</menu>
		</header>
	);
}
