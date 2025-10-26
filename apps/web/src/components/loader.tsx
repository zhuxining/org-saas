import { Spin } from "antd";

export default function Loader() {
	return (
		<div
			style={{
				width: "100%",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				paddingTop: 32,
			}}
		>
			<Spin size="large" />
		</div>
	);
}
