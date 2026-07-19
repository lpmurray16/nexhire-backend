module.exports = {
  requireOrganizationRole: function (user, roles) {
    const organization = user.getString("organization")
    const role = user.getString("role")

    if (!organization || roles.indexOf(role) === -1) {
      throw new ForbiddenError("You do not have permission to manage invitations.")
    }

    return organization
  },

  publicInvite: function (invite) {
    return {
      id: invite.id,
      role: invite.getString("role"),
      expiresAt: invite.getString("expiresAt"),
      usedAt: invite.getString("usedAt"),
      revoked: invite.getBool("revoked"),
      created: invite.getString("created"),
    }
  },
}
