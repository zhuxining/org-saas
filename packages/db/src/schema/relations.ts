import { defineRelations } from "drizzle-orm";

import * as schema from "./auth";

export const relations = defineRelations(schema, (helpers) => {
  const { one, many } = helpers;
  const {
    session,
    user,
    account,
    organization,
    member,
    invitation,
    organizationRole,
    team,
    teamMember,
  } = helpers;

  return {
    user: {
      sessions: many.session(),
      accounts: many.account(),
      memberships: many.member(),
      invitationsSent: many.invitation(),
      teamMemberships: many.teamMember(),
    },
    session: {
      user: one.user({ from: session.userId, to: user.id }),
    },
    account: {
      user: one.user({ from: account.userId, to: user.id }),
    },
    organization: {
      members: many.member(),
      invitations: many.invitation(),
      roles: many.organizationRole(),
      teams: many.team(),
    },
    member: {
      user: one.user({ from: member.userId, to: user.id }),
      organization: one.organization({
        from: member.organizationId,
        to: organization.id,
      }),
    },
    invitation: {
      organization: one.organization({
        from: invitation.organizationId,
        to: organization.id,
      }),
      inviter: one.user({ from: invitation.inviterId, to: user.id }),
      team: one.team({ from: invitation.teamId, to: team.id }),
    },
    organizationRole: {
      organization: one.organization({
        from: organizationRole.organizationId,
        to: organization.id,
      }),
    },
    team: {
      organization: one.organization({
        from: team.organizationId,
        to: organization.id,
      }),
      members: many.teamMember(),
    },
    teamMember: {
      team: one.team({ from: teamMember.teamId, to: team.id }),
      user: one.user({ from: teamMember.userId, to: user.id }),
    },
  };
});
