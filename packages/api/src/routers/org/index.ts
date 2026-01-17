import { invitationRouter } from "./invitation";
import { memberRouter } from "./member";
import { organizationRouter } from "./organization";

export const orgRouter = {
	organization: organizationRouter,
	member: memberRouter,
	invitation: invitationRouter,
};
