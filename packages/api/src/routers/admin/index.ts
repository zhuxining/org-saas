import { organizationRouter } from "./organization";
import { userRouter } from "./user";

export const adminRouter = {
	user: userRouter,
	organization: organizationRouter,
};
