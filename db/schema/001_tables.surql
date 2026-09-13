-- db/schema/001_tables.surql

-- ==============================================================================
-- 1. USER & DEVICE TABLES
-- ==============================================================================
DEFINE TABLE OVERWRITE user SCHEMAFULL
    PERMISSIONS
        FOR select WHERE $auth != NONE
        FOR create NONE
        FOR update WHERE id = $auth
        FOR delete WHERE id = $auth;    

DEFINE FIELD OVERWRITE username ON user TYPE string ASSERT string::len($value) > 0;
DEFINE FIELD OVERWRITE email ON user TYPE string ASSERT string::is_email($value);
DEFINE FIELD OVERWRITE pass ON user TYPE string
    PERMISSIONS
        FOR select NONE
        FOR update WHERE id = $auth;
DEFINE FIELD OVERWRITE created_at ON user TYPE datetime DEFAULT time::now();
DEFINE INDEX OVERWRITE unique_email ON user FIELDS email UNIQUE;

DEFINE TABLE OVERWRITE trusted_device SCHEMAFULL
    PERMISSIONS
        FOR select WHERE user = $auth
        FOR create WHERE user = $auth
        FOR update WHERE user = $auth
        FOR delete WHERE user = $auth;

DEFINE FIELD OVERWRITE user ON trusted_device TYPE record<user> DEFAULT $auth;
DEFINE FIELD OVERWRITE device_id ON trusted_device TYPE string;
DEFINE FIELD OVERWRITE trusted ON trusted_device TYPE bool DEFAULT true;
DEFINE FIELD OVERWRITE last_seen ON trusted_device TYPE datetime DEFAULT time::now();
DEFINE INDEX OVERWRITE unique_device ON trusted_device FIELDS user, device_id UNIQUE;

-- ==============================================================================
-- 2. SERVER TABLE
-- ==============================================================================
DEFINE TABLE OVERWRITE server SCHEMAFULL
    PERMISSIONS
        FOR select WHERE owner = $auth OR id IN $auth->member_of->server
        FOR create WHERE $auth != NONE
        FOR update WHERE owner = $auth
        FOR delete WHERE owner = $auth;

DEFINE FIELD OVERWRITE name ON server TYPE string ASSERT string::len($value) > 0;
DEFINE FIELD OVERWRITE icon ON server TYPE option<string>;
DEFINE FIELD OVERWRITE owner ON server TYPE record<user> DEFAULT $auth;
DEFINE FIELD OVERWRITE created_at ON server TYPE datetime DEFAULT time::now();

-- ==============================================================================
-- 3. CHANNEL & MESSAGE TABLES
-- ==============================================================================
DEFINE TABLE OVERWRITE channel SCHEMAFULL
    PERMISSIONS
        FOR select WHERE server IN $auth->member_of->server
        FOR create WHERE fn::can_manage_channels($auth, server)
        FOR update WHERE fn::can_manage_channels($auth, server)
        FOR delete WHERE fn::can_manage_channels($auth, server);

DEFINE FIELD OVERWRITE server ON channel TYPE record<server>;
DEFINE FIELD OVERWRITE name ON channel TYPE string ASSERT string::len($value) > 0;
DEFINE FIELD OVERWRITE position ON channel TYPE number DEFAULT 0;
DEFINE FIELD OVERWRITE created_at ON channel TYPE datetime DEFAULT time::now();
DEFINE INDEX OVERWRITE unique_channel_per_server ON channel FIELDS server, name UNIQUE;

DEFINE TABLE OVERWRITE message SCHEMAFULL
    PERMISSIONS
        FOR select WHERE channel.server IN $auth->member_of->server
        FOR create WHERE user = $auth AND channel.server IN $auth->member_of->server
        FOR update WHERE user = $auth
        FOR delete WHERE user = $auth OR fn::has_permission($auth, channel.server, "manage_messages");

DEFINE FIELD OVERWRITE channel ON message TYPE record<channel>;
DEFINE FIELD OVERWRITE user ON message TYPE record<user> DEFAULT $auth;
DEFINE FIELD OVERWRITE content ON message TYPE string ASSERT string::len($value) > 0;
DEFINE FIELD OVERWRITE created_at ON message TYPE datetime DEFAULT time::now();

-- ==============================================================================
-- 4. RELATION TABLES (GRAPH EDGES)
-- ==============================================================================
DEFINE TABLE OVERWRITE member_of TYPE RELATION FROM user TO server SCHEMAFULL
    PERMISSIONS 
        FOR select WHERE $auth != NONE
        FOR create WHERE in = $auth
        FOR delete WHERE in = $auth 
                      OR out.owner = $auth 
                      OR fn::can_kick_members($auth, out);

DEFINE FIELD OVERWRITE joined_at ON member_of TYPE datetime DEFAULT time::now();
DEFINE FIELD OVERWRITE nickname ON member_of TYPE option<string>;
DEFINE INDEX OVERWRITE unique_membership ON member_of FIELDS in, out UNIQUE;