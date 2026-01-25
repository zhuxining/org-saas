import { useCallback, useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface ConfirmDialogOptions {
	title: string;
	description?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	variant?: "default" | "destructive";
}

export function useConfirmDialog() {
	const [dialog, setDialog] = useState<{
		open: boolean;
		options: ConfirmDialogOptions;
		resolve: (value: boolean) => void;
	} | null>(null);

	const confirm = useCallback((options: ConfirmDialogOptions) => {
		return new Promise<boolean>((resolve) => {
			setDialog({ open: true, options, resolve });
		});
	}, []);

	const handleConfirm = () => {
		dialog?.resolve(true);
		setDialog(null);
	};

	const handleCancel = () => {
		dialog?.resolve(false);
		setDialog(null);
	};

	const ConfirmDialogComponent = dialog ? (
		<AlertDialog
			open={dialog.open}
			onOpenChange={(open) => !open && handleCancel()}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{dialog.options.title}</AlertDialogTitle>
					{dialog.options.description && (
						<AlertDialogDescription>
							{dialog.options.description}
						</AlertDialogDescription>
					)}
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>
						{dialog.options.cancelLabel || "取消"}
					</AlertDialogCancel>
					<AlertDialogAction
						variant={
							dialog.options.variant === "destructive"
								? "destructive"
								: undefined
						}
						onClick={handleConfirm}
					>
						{dialog.options.confirmLabel || "确认"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	) : null;

	return { confirm, ConfirmDialogComponent };
}
