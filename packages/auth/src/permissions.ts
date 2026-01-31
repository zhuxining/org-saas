import { createAccessControl } from "better-auth/plugins/access";
import {
	adminAc,
	defaultStatements,
} from "better-auth/plugins/organization/access";

const statement = {
	...defaultStatements,
	project: ["create", "share", "update", "delete"],
} as const;

const ac = createAccessControl(statement);

const member = ac.newRole({
	project: ["create"],
	...adminAc.statements,
});

const admin = ac.newRole({
	project: ["create", "update"],
	...adminAc.statements,
});

const owner = ac.newRole({
	project: ["create", "update", "delete"],
	...adminAc.statements,
});

const myCustomRole = ac.newRole({
	project: ["create", "update", "delete"],
	organization: ["update"],
});

export { ac };
export const roles = { owner, admin, member, myCustomRole };
