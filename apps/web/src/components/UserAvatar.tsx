import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@org-sass/ui/components/avatar";

export function UserAvatar({
	name,
	image,
	size = "default",
	className,
}: {
	name: string;
	image?: string | null;
	size?: "default" | "sm" | "lg";
	className?: string;
}) {
	const initials = name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);

	return (
		<Avatar size={size} className={className}>
			{image && <AvatarImage src={image} alt={name} />}
			<AvatarFallback>{initials}</AvatarFallback>
		</Avatar>
	);
}
