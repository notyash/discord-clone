-- db/schema/001_tables.surql

-- 1. USER TABLE
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

-- 2. TRUSTED DEVICE TABLE
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

-- 3. CHANNEL TABLE
DEFINE TABLE OVERWRITE channel SCHEMAFULL
    PERMISSIONS
        FOR select WHERE $auth != NONE
        FOR create NONE
        FOR update NONE
        FOR delete NONE;

DEFINE FIELD OVERWRITE name ON channel TYPE string;
DEFINE FIELD OVERWRITE created_at ON channel TYPE datetime DEFAULT time::now();

-- 4. MESSAGE TABLE
DEFINE TABLE OVERWRITE message SCHEMAFULL
    PERMISSIONS
        FOR select WHERE channel IN $auth->member_of->channel
        FOR create WHERE user = $auth AND channel IN $auth->member_of->channel
        FOR update WHERE user = $auth
        FOR delete WHERE user = $auth;

DEFINE FIELD OVERWRITE channel ON message TYPE record<channel>;
DEFINE FIELD OVERWRITE user ON message TYPE record<user> DEFAULT $auth;
DEFINE FIELD OVERWRITE content ON message TYPE string ASSERT string::len($value) > 0;
DEFINE FIELD OVERWRITE created_at ON message TYPE datetime DEFAULT time::now();

-- 5. MEMBER_OF RELATION (GRAPH EDGE)
DEFINE TABLE OVERWRITE member_of TYPE RELATION FROM user TO channel SCHEMAFULL
    PERMISSIONS 
        FOR select WHERE $auth != NONE
        FOR create WHERE in = $auth
        FOR delete WHERE in = $auth;

DEFINE FIELD OVERWRITE joined_at ON member_of TYPE datetime DEFAULT time::now();
DEFINE INDEX OVERWRITE unique_membership ON member_of FIELDS in, out UNIQUE;