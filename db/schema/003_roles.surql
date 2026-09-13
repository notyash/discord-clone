-- db/schema/003_roles.surql

-- 1. AUTHORIZATION & PERMISSION FUNCTIONS
DEFINE FUNCTION OVERWRITE fn::has_permission(
    $user: record<user>, 
    $server: record<server>, 
    $perm: string
) -> bool {
    -- Owner always has full bypass
    IF $server.owner = $user {
        RETURN true;
    };

    -- Fetch all roles assigned to this user in this server
    LET $user_roles = (
        SELECT out.permissions AS perms 
        FROM has_role 
        WHERE in = $user AND out.server = $server
    );

    -- Check if Administrator flag or the specific permission flag is enabled on any assigned role
    LET $is_admin = true IN $user_roles.perms.administrator;
    LET $has_flag = true IN $user_roles.perms[$perm];

    RETURN $is_admin OR $has_flag;
};

DEFINE FUNCTION OVERWRITE fn::can_manage_channels($user: record<user>, $server: record<server>) -> bool {
    RETURN fn::has_permission($user, $server, "manage_channels");
};

DEFINE FUNCTION OVERWRITE fn::can_manage_roles($user: record<user>, $server: record<server>) -> bool {
    RETURN fn::has_permission($user, $server, "manage_roles");
};

DEFINE FUNCTION OVERWRITE fn::can_kick_members($user: record<user>, $server: record<server>) -> bool {
    RETURN fn::has_permission($user, $server, "kick_members");
};

-- 2. ROLE TABLE
DEFINE TABLE OVERWRITE role SCHEMAFULL
    PERMISSIONS
        FOR select WHERE server IN $auth->member_of->server
        FOR create WHERE fn::can_manage_roles($auth, server)
        FOR update WHERE fn::can_manage_roles($auth, server)
        FOR delete WHERE fn::can_manage_roles($auth, server);

DEFINE FIELD OVERWRITE server ON role TYPE record<server>;
DEFINE FIELD OVERWRITE name ON role TYPE string ASSERT string::len($value) > 0;
DEFINE FIELD OVERWRITE color ON role TYPE option<string>;
DEFINE FIELD OVERWRITE position ON role TYPE number DEFAULT 0;

-- Granular permissions object
DEFINE FIELD OVERWRITE permissions ON role TYPE object;
DEFINE FIELD OVERWRITE permissions.administrator ON role TYPE bool DEFAULT false;
DEFINE FIELD OVERWRITE permissions.manage_channels ON role TYPE bool DEFAULT false;
DEFINE FIELD OVERWRITE permissions.manage_roles ON role TYPE bool DEFAULT false;
DEFINE FIELD OVERWRITE permissions.kick_members ON role TYPE bool DEFAULT false;
DEFINE FIELD OVERWRITE permissions.ban_members ON role TYPE bool DEFAULT false;
DEFINE FIELD OVERWRITE permissions.manage_messages ON role TYPE bool DEFAULT false;
DEFINE FIELD OVERWRITE created_at ON role TYPE datetime DEFAULT time::now();

DEFINE INDEX OVERWRITE unique_role_per_server ON role FIELDS server, name UNIQUE;

-- 3. HAS_ROLE RELATION (GRAPH EDGE: USER -> ROLE)
DEFINE TABLE OVERWRITE has_role TYPE RELATION FROM user TO role SCHEMAFULL
    PERMISSIONS
        FOR select WHERE out.server IN $auth->member_of->server
        FOR create WHERE fn::can_manage_roles($auth, out.server)
        FOR delete WHERE fn::can_manage_roles($auth, out.server);

DEFINE FIELD OVERWRITE assigned_at ON has_role TYPE datetime DEFAULT time::now();
DEFINE INDEX OVERWRITE unique_user_role ON has_role FIELDS in, out UNIQUE;

-- 4. UPDATE TABLE PERMISSIONS FOR CHANNELS, MEMBERS, AND MESSAGES TO USE ROLE FUNCTIONS
DEFINE TABLE OVERWRITE channel SCHEMAFULL
    PERMISSIONS
        FOR select WHERE server IN $auth->member_of->server
        FOR create WHERE fn::can_manage_channels($auth, server)
        FOR update WHERE fn::can_manage_channels($auth, server)
        FOR delete WHERE fn::can_manage_channels($auth, server);

DEFINE TABLE OVERWRITE member_of TYPE RELATION FROM user TO server SCHEMAFULL
    PERMISSIONS 
        FOR select WHERE $auth != NONE
        FOR create WHERE in = $auth
        FOR delete WHERE in = $auth 
                      OR out.owner = $auth 
                      OR fn::can_kick_members($auth, out);

DEFINE TABLE OVERWRITE message SCHEMAFULL
    PERMISSIONS
        FOR select WHERE channel.server IN $auth->member_of->server
        FOR create WHERE user = $auth AND channel.server IN $auth->member_of->server
        FOR update WHERE user = $auth
        FOR delete WHERE user = $auth OR fn::has_permission($auth, channel.server, "manage_messages");
