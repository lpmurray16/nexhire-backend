routerAdd("POST", "/api/nexhire/organizations", (e) => {
  const name = String(e.requestInfo().body.name || "").trim()

  if (e.auth.getString("organization")) {
    throw new BadRequestError("Your account already belongs to an organization.")
  }
  if (name.length < 2 || name.length > 120) {
    throw new BadRequestError("Organization name must be between 2 and 120 characters.")
  }

  let organization
  e.app.runInTransaction((txApp) => {
    const user = txApp.findRecordById("users", e.auth.id)
    if (user.getString("organization")) {
      throw new BadRequestError("Your account already belongs to an organization.")
    }

    organization = new Record(txApp.findCollectionByNameOrId("organizations"))
    organization.set("name", name)
    organization.set("owner", user.id)
    txApp.save(organization)

    user.set("organization", organization.id)
    user.set("role", "owner")
    txApp.save(user)
  })

  return e.json(201, {
    organization: organization.publicExport(),
  })
}, $apis.requireAuth("users"))

routerAdd("GET", "/api/nexhire/invites", (e) => {
  const helpers = require(`${__hooks}/lib/onboarding.js`)
  const organization = helpers.requireOrganizationRole(e.auth, ["owner", "admin"])
  const records = e.app.findRecordsByFilter(
    "organization_invites",
    "organization = {:organization}",
    "-created",
    100,
    0,
    { organization: organization },
  )

  return e.json(200, {
    items: records.map((record) => helpers.publicInvite(record)),
  })
}, $apis.requireAuth("users"))

routerAdd("POST", "/api/nexhire/invites", (e) => {
  const helpers = require(`${__hooks}/lib/onboarding.js`)
  const organization = helpers.requireOrganizationRole(e.auth, ["owner", "admin"])
  const body = e.requestInfo().body
  const role = String(body.role || "recruiter")
  const expiresInDays = Number(body.expiresInDays || 7)

  if (["admin", "recruiter", "viewer"].indexOf(role) === -1) {
    throw new BadRequestError("Invalid invitation role.")
  }
  if (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 30) {
    throw new BadRequestError("Invitation expiry must be between 1 and 30 days.")
  }

  const token = $security.randomString(48)
  const invite = new Record(e.app.findCollectionByNameOrId("organization_invites"))
  invite.set("organization", organization)
  invite.set("tokenHash", $security.sha256(token))
  invite.set("role", role)
  invite.set("expiresAt", new Date(Date.now() + expiresInDays * 86400000).toISOString())
  invite.set("revoked", false)
  invite.set("createdBy", e.auth.id)
  e.app.save(invite)

  return e.json(201, {
    invite: helpers.publicInvite(invite),
    token: token,
  })
}, $apis.requireAuth("users"))

routerAdd("DELETE", "/api/nexhire/invites/{id}", (e) => {
  const helpers = require(`${__hooks}/lib/onboarding.js`)
  const organization = helpers.requireOrganizationRole(e.auth, ["owner", "admin"])
  const invite = e.app.findRecordById("organization_invites", e.request.pathValue("id"))

  if (invite.getString("organization") !== organization) {
    throw new NotFoundError("Invitation not found.")
  }

  invite.set("revoked", true)
  e.app.save(invite)
  return e.noContent(204)
}, $apis.requireAuth("users"))

routerAdd("POST", "/api/nexhire/invites/redeem", (e) => {
  const token = String(e.requestInfo().body.token || "").trim()

  if (e.auth.getString("organization")) {
    throw new BadRequestError("Your account already belongs to an organization.")
  }
  if (!token) {
    throw new BadRequestError("Invitation code is required.")
  }

  let organization
  e.app.runInTransaction((txApp) => {
    const user = txApp.findRecordById("users", e.auth.id)
    if (user.getString("organization")) {
      throw new BadRequestError("Your account already belongs to an organization.")
    }

    let invite
    try {
      invite = txApp.findFirstRecordByData(
        "organization_invites",
        "tokenHash",
        $security.sha256(token),
      )
    } catch (_) {
      throw new BadRequestError("Invitation code is invalid or expired.")
    }

    const expiresAt = Date.parse(invite.getString("expiresAt"))
    if (invite.getBool("revoked") || invite.getString("usedAt") || !expiresAt || expiresAt <= Date.now()) {
      throw new BadRequestError("Invitation code is invalid or expired.")
    }

    organization = invite.getString("organization")
    user.set("organization", organization)
    user.set("role", invite.getString("role"))
    txApp.save(user)

    invite.set("usedAt", new Date().toISOString())
    txApp.save(invite)
  })

  return e.json(200, { organization: organization })
}, $apis.requireAuth("users"))
